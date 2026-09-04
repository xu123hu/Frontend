/**
 * document_parse run 事件脚本模拟器（M0 冻结 RunEvent 结构）。
 *
 * POST /runs {run_type:"document_parse", input_artifact_ids:[uploadId]} 后，
 * 按上传记录的 failureCode 生成事件脚本：
 * - 正常路径：run.created → run.started → step.progress(解析页数) ×N →
 *   step.started(chunking) → artifact.created(parsed_document) → run.completed
 * - 失败路径：… → run.failed（zip_bomb/corrupted_pdf 不可重试；parse_failed 可重试）
 *
 * 这条链路走的是 M0 冻结契约（非草案）：字段名/枚举与 m0-schema.gen.d.ts 严格对齐。
 */
import type { RunEventDraft, RunEventView } from '@shared/lib/sse';

export interface EventFrame {
  frame: RunEventView & { __delayMs: number };
}

export function buildDocumentParseEvents(runId: string, upload: { name: string; failureCode: string | null; itemId: string | null; sizeBytes: number }): { frame: RunEventView; delayMs: number }[] {
  const seqBase = { run_id: runId, actor_id: 'svc-document', actor_type: 'service' as const, trace_id: `trace-${runId.slice(0, 8)}` };
  let seq = 1;
  const now = Date.now();
  const at = (offset: number) => new Date(now + offset).toISOString();

  const frames: { frame: RunEventView; delayMs: number }[] = [];
  const push = (frame: RunEventDraft, delayMs: number) => {
    frames.push({ frame: { ...seqBase, ...frame, sequence: seq++ }, delayMs });
  };
  const eid = () => `evt-${crypto.randomUUID().slice(0, 12)}`;

  push({ event_id: eid(), event_type: 'run.created', occurred_at: at(0), step_id: null, error: null, progress: null, artifact_ids: [] }, 80);
  push({ event_id: eid(), event_type: 'run.started', occurred_at: at(100), step_id: 'parse', error: null, progress: null, artifact_ids: [] }, 120);

  if (upload.failureCode) {
    const nonRetryable = upload.failureCode === 'zip_bomb' || upload.failureCode === 'corrupted_pdf';
    const messages: Record<string, string> = {
      zip_bomb: '检测到解压炸弹特征（压缩率异常），已终止处理。',
      corrupted_pdf: 'PDF 结构损坏（xref 表无法恢复），无法解析。',
      parse_failed: '解析服务超时，请重试。',
    };
    push({ event_id: eid(), event_type: 'run.failed', occurred_at: at(400), step_id: 'parse', error: { code: upload.failureCode, message: messages[upload.failureCode] ?? '解析失败', retryable: !nonRetryable }, progress: null, artifact_ids: [] }, 150);
    return frames;
  }

  const pageCount = Math.max(3, Math.min(24, Math.round(upload.sizeBytes / 400_000) || 8));
  for (let page = 1; page <= pageCount; page++) {
    push(
      {
        event_id: eid(),
        event_type: 'step.progress',
        occurred_at: at(400 + page * 60),
        step_id: 'parse',
        error: null,
        progress: { current: page, total: pageCount, unit: '页', message: `解析第 ${page}/${pageCount} 页` },
        artifact_ids: [],
      },
      Math.max(60, 900 / pageCount),
    );
  }
  push({ event_id: eid(), event_type: 'step.started', occurred_at: at(600), step_id: 'chunking', error: null, progress: null, artifact_ids: [], payload: { step: 'chunking' } }, 140);
  push({ event_id: eid(), event_type: 'artifact.created', occurred_at: at(800), step_id: 'chunking', error: null, progress: null, artifact_ids: [`art-parsed-${runId.slice(0, 8)}`], payload: { artifact_type: 'parsed_document' } }, 120);
  push({ event_id: eid(), event_type: 'run.completed', occurred_at: at(950), step_id: null, error: null, progress: null, artifact_ids: [`art-parsed-${runId.slice(0, 8)}`], payload: { item_id: upload.itemId ?? '' } }, 100);
  return frames;
}

/** 服务端已完成的运行（刷新恢复场景）：直接给完整成功脚本。 */
export function buildCompletedRunEvents(runId: string, itemId: string): { frame: RunEventView; delayMs: number }[] {
  return buildDocumentParseEvents(runId, { name: 'seed.pdf', failureCode: null, itemId, sizeBytes: 3_200_000 });
}

/** 翻译 run 事件脚本（run_type=translation，06 §5：进度+预算、公式屏蔽恢复、保真）。
 * 事件 payload 携带 artifact_id（translation 产物）与 item_id。 */
export function buildTranslationEvents(runId: string, input: { itemId: string; unitCount: number }): { frame: RunEventView; delayMs: number }[] {
  const seqBase = { run_id: runId, actor_id: 'svc-translation', actor_type: 'service' as const, trace_id: `trace-${runId.slice(0, 8)}` };
  let seq = 1;
  const now = Date.now();
  const at = (offset: number) => new Date(now + offset).toISOString();
  const frames: { frame: RunEventView; delayMs: number }[] = [];
  const push = (frame: RunEventDraft, delayMs: number) => {
    frames.push({ frame: { ...seqBase, ...frame, sequence: seq++ }, delayMs });
  };
  const eid = () => `evt-${crypto.randomUUID().slice(0, 12)}`;

  push({ event_id: eid(), event_type: 'run.created', occurred_at: at(0), step_id: null, error: null, progress: null, artifact_ids: [] }, 80);
  push({ event_id: eid(), event_type: 'run.started', occurred_at: at(100), step_id: 'translate', error: null, progress: null, artifact_ids: [] }, 120);
  const total = Math.max(3, input.unitCount);
  for (let u = 1; u <= total; u++) {
    push(
      {
        event_id: eid(),
        event_type: 'step.progress',
        occurred_at: at(200 + u * 60),
        step_id: 'translate',
        error: null,
        progress: { current: u, total, unit: '段', message: `翻译第 ${u}/${total} 段` },
        artifact_ids: [],
      },
      Math.max(60, 900 / total),
    );
  }
  push({ event_id: eid(), event_type: 'artifact.created', occurred_at: at(800), step_id: 'translate', error: null, progress: null, artifact_ids: [`art-trans-${runId.slice(0, 8)}`], payload: { artifact_type: 'translation' } }, 120);
  push({ event_id: eid(), event_type: 'run.completed', occurred_at: at(950), step_id: null, error: null, progress: null, artifact_ids: [`art-trans-${runId.slice(0, 8)}`], payload: { item_id: input.itemId } }, 100);
  return frames;
}

/** 编译 run 事件脚本（run_type=writing，06 §6：Tectonic 编译时间线）。
 * scenario: success | missing_resource | unsafe_command（06 §6 步骤 6 两类失败）。 */
export function buildCompileEvents(
  runId: string,
  input: { manuscriptId: string; scenario: 'success' | 'missing_resource' | 'unsafe_command' },
): { frame: RunEventView; delayMs: number }[] {
  const seqBase = { run_id: runId, actor_id: 'svc-latex', actor_type: 'service' as const, trace_id: `trace-${runId.slice(0, 8)}` };
  let seq = 1;
  const now = Date.now();
  const at = (offset: number) => new Date(now + offset).toISOString();
  const frames: { frame: RunEventView; delayMs: number }[] = [];
  const push = (frame: RunEventDraft, delayMs: number) => {
    frames.push({ frame: { ...seqBase, ...frame, sequence: seq++ }, delayMs });
  };
  const eid = () => `evt-${crypto.randomUUID().slice(0, 12)}`;

  push({ event_id: eid(), event_type: 'run.created', occurred_at: at(0), step_id: null, error: null, progress: null, artifact_ids: [] }, 80);
  push({ event_id: eid(), event_type: 'run.started', occurred_at: at(100), step_id: 'compile', error: null, progress: null, artifact_ids: [] }, 120);
  for (let s = 1; s <= 3; s++) {
    push(
      {
        event_id: eid(),
        event_type: 'step.progress',
        occurred_at: at(200 + s * 70),
        step_id: 'compile',
        error: null,
        progress: { current: s, total: 3, unit: '步', message: ['XeLaTeX 引擎启动', '文档编译', 'SyncTeX 生成'][s - 1] ?? '编译中' },
        artifact_ids: [],
      },
      Math.max(70, 800 / 3),
    );
  }
  if (input.scenario === 'success') {
    push({ event_id: eid(), event_type: 'artifact.created', occurred_at: at(700), step_id: 'compile', error: null, progress: null, artifact_ids: [`art-pdf-${runId.slice(0, 8)}`], payload: { artifact_type: 'compiled_pdf' } }, 120);
    push({ event_id: eid(), event_type: 'run.completed', occurred_at: at(850), step_id: null, error: null, progress: null, artifact_ids: [`art-pdf-${runId.slice(0, 8)}`], payload: { manuscript_id: input.manuscriptId } }, 100);
    return frames;
  }
  const fail = input.scenario === 'unsafe_command'
    ? { code: 'unsafe_command', message: '检测到 \\write18（shell escape）被禁用，命令已拒绝。', retryable: false }
    : { code: 'missing_resource', message: '找不到文件 sections/intro.tex。', retryable: true };
  const payload = input.scenario === 'unsafe_command'
    ? { manuscript_id: input.manuscriptId, error: { file: 'main.tex', line: 3, kind: 'unsafe_command', message: 'shell escape 被禁用' } }
    : { manuscript_id: input.manuscriptId, error: { file: 'main.tex', line: 1, kind: 'missing_resource', message: 'File sections/intro.tex not found' } };
  push({ event_id: eid(), event_type: 'run.failed', occurred_at: at(600), step_id: 'compile', error: fail, progress: null, artifact_ids: [], payload }, 100);
  return frames;
}
