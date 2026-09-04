/**
 * 批量导入队列状态机（纯函数 reducer，可单测）。
 *
 * 阶段语义（06 §4 步骤 4-5 / 提示词 F2）：
 *   initial → queued → uploading → parsing → chunking → completed
 *                                ↘ failed(retryable) ↘ failed(不可重试)
 * - 进度百分比只能来自 SSE RunEvent（真实事件流），禁止静态假进度。
 * - 失败原因四类：非法、超限、Zip Bomb、类型不支持（+解析失败），保持可见。
 * - 断网暂停队列（offline），恢复后可重试。
 */
import type { ImportRejectionReason, IngestOptions } from '@entities/literature/types';

export type ImportStage = 'initial' | 'queued' | 'uploading' | 'parsing' | 'chunking' | 'completed' | 'failed' | 'removed';

export interface ImportFileState {
  id: string;
  name: string;
  sizeBytes: number;
  mime: string;
  stage: ImportStage;
  /** 0-100；仅在上传阶段本地可知，解析/切分阶段必须来自 SSE。 */
  progressPercent: number | null;
  /** 进度是否由服务端事件驱动（解析/切分阶段为 true）。 */
  serverDrivenProgress: boolean;
  stageMessage: string | null;
  runId: string | null;
  artifactId: string | null;
  itemId: string | null;
  failure: { reason: ImportRejectionReason; message: string; retryable: boolean } | null;
}

export interface ImportQueueState {
  files: ImportFileState[];
  offline: boolean;
  options: IngestOptions;
}

export const IMPORT_MAX_FILE_BYTES = 200 * 1024 * 1024; // 200MB（契约请求单 CR-F2-01 建议值）

/** 上传前校验：类型/大小本地可判；Zip Bomb/损坏 PDF 由服务端判定后映射。 */
export function validateImportFile(name: string, sizeBytes: number, mime: string): ImportRejectionReason | null {
  const isPdf = mime === 'application/pdf' || name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return 'invalid_type';
  if (sizeBytes > IMPORT_MAX_FILE_BYTES) return 'too_large';
  return null;
}

export function createImportQueueState(options: IngestOptions): ImportQueueState {
  return { files: [], offline: false, options };
}

export type ImportQueueAction =
  | { type: 'enqueue'; files: { id: string; name: string; sizeBytes: number; mime: string }[] }
  | { type: 'precheck-failed'; id: string; reason: ImportRejectionReason; message: string }
  | { type: 'upload-start'; id: string }
  | { type: 'upload-progress'; id: string; percent: number }
  | { type: 'run-created'; id: string; runId: string }
  | { type: 'server-stage'; id: string; stage: 'parsing' | 'chunking'; message: string | null; percent: number | null }
  | { type: 'server-progress'; id: string; current: number; total: number; unit: string | null; message: string | null }
  | { type: 'completed'; id: string; itemId: string; artifactId: string | null }
  | { type: 'failed'; id: string; reason: ImportRejectionReason; message: string; retryable: boolean }
  | { type: 'retry'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'offline'; offline: boolean };

function patchFile(state: ImportQueueState, id: string, patch: Partial<ImportFileState>): ImportQueueState {
  return { ...state, files: state.files.map((f) => (f.id === id ? { ...f, ...patch } : f)) };
}

export function importQueueReducer(state: ImportQueueState, action: ImportQueueAction): ImportQueueState {
  switch (action.type) {
    case 'enqueue':
      return {
        ...state,
        files: [
          ...state.files,
          ...action.files.map((f) => ({
            ...f,
            stage: 'queued' as const,
            progressPercent: null,
            serverDrivenProgress: false,
            stageMessage: null,
            runId: null,
            artifactId: null,
            itemId: null,
            failure: null,
          })),
        ],
      };
    case 'precheck-failed':
      return patchFile(state, action.id, { stage: 'failed', failure: { reason: action.reason, message: action.message, retryable: false } });
    case 'upload-start':
      return patchFile(state, action.id, { stage: 'uploading', progressPercent: 0 });
    case 'upload-progress':
      return patchFile(state, action.id, { stage: 'uploading', progressPercent: Math.min(100, Math.max(0, action.percent)) });
    case 'run-created':
      return patchFile(state, action.id, { runId: action.runId, stage: 'parsing', serverDrivenProgress: true, progressPercent: null, stageMessage: '等待服务端事件' });
    case 'server-stage':
      return patchFile(state, action.id, { stage: action.stage, stageMessage: action.message ?? '等待服务端事件', progressPercent: action.percent });
    case 'server-progress': {
      // 进度只来自 RunEvent.step.progress（current/total）；unit 透传展示。
      const percent = action.total > 0 ? Math.round((action.current / action.total) * 100) : null;
      return patchFile(state, action.id, {
        stage: 'parsing',
        progressPercent: percent,
        stageMessage: action.message ?? (action.unit ? `${action.current}/${action.total} ${action.unit}` : `${action.current}/${action.total}`),
      });
    }
    case 'completed':
      return patchFile(state, action.id, { stage: 'completed', progressPercent: 100, stageMessage: '解析与切分完成', itemId: action.itemId, artifactId: action.artifactId });
    case 'failed':
      return patchFile(state, action.id, { stage: 'failed', failure: { reason: action.reason, message: action.message, retryable: action.retryable } });
    case 'retry':
      return patchFile(state, action.id, { stage: 'queued', failure: null, progressPercent: null, serverDrivenProgress: false, stageMessage: null, runId: null, itemId: null });
    case 'remove':
      return patchFile(state, action.id, { stage: 'removed' });
    case 'offline':
      return {
        ...state,
        offline: action.offline,
        files: action.offline
          ? state.files.map((f) => (f.stage === 'uploading' || f.stage === 'parsing' || f.stage === 'chunking' ? { ...f, stageMessage: '网络已断开，队列暂停' } : f))
          : state.files.map((f) => (f.stageMessage === '网络已断开，队列暂停' ? { ...f, stageMessage: null } : f)),
      };
    default:
      return state;
  }
}

/** 队列可见文件（removed 不展示）。 */
export function visibleFiles(state: ImportQueueState): ImportFileState[] {
  return state.files.filter((f) => f.stage !== 'removed');
}

/** Map<RunEvent.event_type, 队列动作>：document_parse 事件流 → 队列迁移。 */
export function runEventToQueueAction(fileId: string, event: { event_type: string; error: { code: string; message: string; retryable: boolean } | null; progress: { current: number | null; total: number | null; unit: string | null; message: string | null } | null; artifact_ids: string[]; payload?: Record<string, unknown> }): ImportQueueAction | null {
  switch (event.event_type) {
    case 'run.started':
      return { type: 'server-stage', id: fileId, stage: 'parsing', message: '解析中（GROBID/Docling）', percent: null };
    case 'step.progress':
      if (event.progress && event.progress.current !== null && event.progress.total !== null) {
        return { type: 'server-progress', id: fileId, current: event.progress.current, total: event.progress.total, unit: event.progress.unit, message: event.progress.message };
      }
      return null;
    case 'step.started': {
      const step = String(event.payload?.['step'] ?? '');
      if (step === 'chunking') return { type: 'server-stage', id: fileId, stage: 'chunking', message: '切分中（按章节/段落）', percent: null };
      return null;
    }
    case 'artifact.created':
      // parsed_document artifact = 切分完成信号（M0 §5.3 Artifact artifact_type）
      return { type: 'server-stage', id: fileId, stage: 'chunking', message: '切分完成，等待入库确认', percent: 95 };
    case 'run.completed':
      return { type: 'completed', id: fileId, itemId: String(event.payload?.['item_id'] ?? ''), artifactId: event.artifact_ids[0] ?? null };
    case 'run.failed': {
      const code = event.error?.code ?? 'parse_failed';
      const reasonMap: Record<string, ImportRejectionReason> = {
        zip_bomb: 'zip_bomb',
        corrupted_pdf: 'corrupted_pdf',
        unsupported_type: 'invalid_type',
        too_large: 'too_large',
      };
      return {
        type: 'failed',
        id: fileId,
        reason: reasonMap[code] ?? 'parse_failed',
        message: event.error?.message ?? '解析失败',
        retryable: event.error?.retryable ?? true,
      };
    }
    default:
      return null;
  }
}
