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
