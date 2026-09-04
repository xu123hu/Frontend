/**
 * 批量导入队列 composable：reducer（纯函数）↔ 副作用桥。
 *
 * 副作用清单（全部可观察，禁静默）：
 * - 本地预检：类型/大小（validateImportFile）→ 非法立即 failed+原因。
 * - 上传：apiUpload 真实字节进度 → run-created。
 * - SSE：consumeRunEventStream + runEventToQueueAction 映射；断线指数退避重连（Last-Event-ID 续传）。
 * - 离线：online/offline 事件 → 队列暂停/恢复。
 * - 刷新恢复（TC-F02-06）：文件态持久化 sessionStorage；有 runId 的恢复 SSE 续传，
 *   未起 run 的标记「刷新中断，可重试」，不伪造进度。
 */
import { computed, ref, onScopeDispose } from 'vue';
import {
  createImportQueueState,
  importQueueReducer,
  runEventToQueueAction,
  validateImportFile,
  visibleFiles,
  type ImportQueueState,
} from '@shared/lib/import-queue';
import { consumeRunEventStream, type RunEventView } from '@shared/lib/sse';
import { config } from '@app/config';
import { createDocumentParseRun, uploadPdf } from './api';

const PERSIST_KEY = 'research.import-queue.v1';

interface PersistedFile {
  id: string;
  name: string;
  sizeBytes: number;
  mime: string;
  runId: string | null;
  lastEventId: string | null;
  /** 已完成/失败终态也持久化，用户手动清除。 */
  stage: ImportQueueState['files'][number]['stage'];
  itemId: string | null;
  failure: ImportQueueState['files'][number]['failure'];
}

function persist(state: ImportQueueState, lastEventIds: Map<string, string>): void {
  const files: PersistedFile[] = state.files
    .filter((f) => f.stage !== 'removed')
    .map((f) => ({
      id: f.id,
      name: f.name,
      sizeBytes: f.sizeBytes,
      mime: f.mime,
      runId: f.runId,
      lastEventId: lastEventIds.get(f.id) ?? null,
      stage: f.stage,
      itemId: f.itemId,
      failure: f.failure,
    }));
  try {
    sessionStorage.setItem(PERSIST_KEY, JSON.stringify(files));
  } catch {
    // 存储满/隐私模式：恢复能力降级，不影响当前会话（恢复时为空即为可观察事实）。
  }
}

function loadPersisted(): PersistedFile[] {
  try {
    const raw = sessionStorage.getItem(PERSIST_KEY);
    return raw ? (JSON.parse(raw) as PersistedFile[]) : [];
  } catch {
    return [];
  }
}

export interface UseImportQueueOptions {
  /** 完成回调（用于失效文献列表缓存）。 */
  onItemImported?: (itemId: string) => void;
}

export function useImportQueue(options: UseImportQueueOptions = {}) {
  const state = ref<ImportQueueState>(
    createImportQueueState({ chunk_granularity: 'section', chunk_by_section: true, chunk_overlap: 0 }),
  );

  const lastEventIds = new Map<string, string>();
  const controllers = new Map<string, AbortController>();
  const processing = new Set<string>();
  const rawFiles = new Map<string, File>();
  /** 上传需要原始 File 对象（reducer 状态不保存 File，不可序列化）。 */

  function dispatch(action: Parameters<typeof importQueueReducer>[1]): void {
    state.value = importQueueReducer(state.value, action);
    persist(state.value, lastEventIds);
  }

  // ---------- SSE 订阅（带指数退避重连 + Last-Event-ID 续传） ----------
  let generation = 0; // 作用域销毁后停止重连
  async function streamEvents(fileId: string, eventsUrl: string, lastEventId?: string): Promise<void> {
    const gen = generation;
    const controller = new AbortController();
    controllers.set(fileId, controller);
    let cursorId = lastEventId;
    let backoff = 800;
    while (!controller.signal.aborted && gen === generation) {
      const errState = { retryable: false, occurred: false };
      await consumeRunEventStream(
        { eventsUrl, lastEventId: cursorId, signal: controller.signal },
        {
          onEvent: (event: RunEventView) => {
            cursorId = event.event_id;
            lastEventIds.set(fileId, event.event_id);
            const action = runEventToQueueAction(fileId, event);
            if (action) dispatch(action);
            const current = state.value.files.find((f) => f.id === fileId);
            if (current && (current.stage === 'completed' || current.stage === 'failed')) {
              if (current.stage === 'completed' && current.itemId) options.onItemImported?.(current.itemId);
              void controllers.get(fileId)?.abort();
            }
          },
          onError: (err) => {
            if (err.kind === 'aborted') return;
            // 顺序/协议错误：事件可观察地丢弃，流本身可继续（M0 容忍）。
            if (err.kind === 'sequence' || err.kind === 'protocol') return;
            errState.occurred = true;
            errState.retryable = err.retryable;
          },
        },
      );
      if (controller.signal.aborted || gen !== generation) return;
      const file = state.value.files.find((f) => f.id === fileId);
      if (file && (file.stage === 'completed' || file.stage === 'failed')) return;
      if (!errState.occurred || !errState.retryable) {
        dispatch({ type: 'failed', id: fileId, reason: 'parse_failed', message: '事件流中断，请重试。', retryable: true });
        return;
      }
      await new Promise((r) => setTimeout(r, backoff));
      backoff = Math.min(backoff * 2, 8000);
    }
  }

  // ---------- 单文件：上传 + 起 run + 订阅事件 ----------
  async function processFile(fileId: string): Promise<void> {
    const raw = rawFiles.get(fileId);
    if (!raw) {
      dispatch({ type: 'failed', id: fileId, reason: 'parse_failed', message: '上传会话已失效，请重试。', retryable: false });
      return;
    }
    try {
      const upload = await uploadPdf({
        file: raw,
        onProgress: (percent) => dispatch({ type: 'upload-progress', id: fileId, percent }),
      });
      dispatch({ type: 'upload-progress', id: fileId, percent: 100 });
      const run = await createDocumentParseRun(upload.upload_id, crypto.randomUUID());
      dispatch({ type: 'run-created', id: fileId, runId: run.run_id });
      void streamEvents(fileId, run.events_url);
    } catch (err) {
      const message = err instanceof Error ? err.message : '上传失败。';
      dispatch({ type: 'failed', id: fileId, reason: 'parse_failed', message, retryable: true });
    }
  }

  async function pump(): Promise<void> {
    if (state.value.offline) return;
    // 并发上限 2：避免同时上传打满连接。
    const active = state.value.files.filter((f) => f.stage === 'uploading').length;
    const next = state.value.files.find((f) => f.stage === 'queued' && !processing.has(f.id));
    if (!next || active >= 2) return;
    processing.add(next.id);
    try {
      await processFile(next.id);
    } finally {
      processing.delete(next.id);
    }
    void pump();
  }

  function enqueue(files: File[]): void {
    const accepted: { id: string; name: string; sizeBytes: number; mime: string }[] = [];
    for (const f of files) {
      const reason = validateImportFile(f.name, f.size, f.type);
      const id = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
      dispatch({ type: 'enqueue', files: [{ id, name: f.name, sizeBytes: f.size, mime: f.type }] });
      if (reason) {
        dispatch({
          type: 'precheck-failed',
          id,
          reason,
          message:
            reason === 'invalid_type'
              ? '仅支持 PDF 文件。'
              : reason === 'too_large'
                ? '超过 200MB 大小上限。'
                : '文件未通过预检。',
        });
        continue;
      }
      rawFiles.set(id, f);
      accepted.push({ id, name: f.name, sizeBytes: f.size, mime: f.type });
    }
    if (accepted.length > 0) void pump();
  }

  function retry(id: string): void {
    dispatch({ type: 'retry', id });
    void pump();
  }

  function remove(id: string): void {
    void controllers.get(id)?.abort();
    controllers.delete(id);
    rawFiles.delete(id);
    dispatch({ type: 'remove', id });
  }

  function clearFinished(): void {
    for (const f of state.value.files) {
      if (f.stage === 'completed' || f.stage === 'failed' || f.stage === 'removed') {
        void controllers.get(f.id)?.abort();
        controllers.delete(f.id);
        rawFiles.delete(f.id);
      }
    }
    state.value = {
      ...state.value,
      files: state.value.files.filter((f) => !['completed', 'failed', 'removed'].includes(f.stage)),
    };
    persist(state.value, lastEventIds);
  }

  // ---------- 离线感知 ----------
  function goOffline(): void {
    dispatch({ type: 'offline', offline: true });
  }
  function goOnline(): void {
    dispatch({ type: 'offline', offline: false });
    void pump();
  }
  window.addEventListener('offline', goOffline);
  window.addEventListener('online', goOnline);
  onScopeDispose(() => {
    generation += 1;
    for (const c of controllers.values()) c.abort();
    window.removeEventListener('offline', goOffline);
    window.removeEventListener('online', goOnline);
  });

  // ---------- 刷新恢复（TC-F02-06） ----------
  function restore(): void {
    for (const pf of loadPersisted()) {
      dispatch({ type: 'enqueue', files: [{ id: pf.id, name: pf.name, sizeBytes: pf.sizeBytes, mime: pf.mime }] });
      if (pf.stage === 'completed') {
        dispatch({ type: 'completed', id: pf.id, itemId: pf.itemId ?? '', artifactId: null });
      } else if (pf.stage === 'failed' && pf.failure) {
        dispatch({ type: 'failed', id: pf.id, reason: pf.failure.reason, message: pf.failure.message, retryable: pf.failure.retryable });
      } else if (pf.runId) {
        // 运行中：恢复为服务端驱动并重连续传（Last-Event-ID）。
        dispatch({ type: 'run-created', id: pf.id, runId: pf.runId });
        void streamEvents(pf.id, `${config.apiBaseUrl}/runs/${pf.runId}/events`, pf.lastEventId ?? undefined);
      } else {
        // 已入队未起 run：原始 File 已丢失，诚实标记可重试，不伪造进度。
        dispatch({ type: 'failed', id: pf.id, reason: 'parse_failed', message: '页面刷新中断上传，请重试。', retryable: true });
      }
    }
  }
  restore();

  return {
    offline: computed(() => state.value.offline),
    files: computed(() => visibleFiles(state.value)),
    enqueue,
    retry,
    remove,
    clearFinished,
    hasActive: computed(() => state.value.files.some((f) => ['queued', 'uploading', 'parsing', 'chunking'].includes(f.stage))),
  };
}
