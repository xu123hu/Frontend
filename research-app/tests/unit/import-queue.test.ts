/**
 * 导入队列状态机单测：校验、阶段迁移、SSE 事件映射、离线暂停、失败重试。
 * 红线：进度只来自服务端事件；失败原因保持可见；不静默丢弃。
 */
import { describe, expect, it } from 'vitest';
import {
  IMPORT_MAX_FILE_BYTES,
  createImportQueueState,
  importQueueReducer,
  runEventToQueueAction,
  validateImportFile,
  visibleFiles,
  type ImportQueueState,
} from '@shared/lib/import-queue';

const OPTIONS = { chunk_granularity: 'section', chunk_by_section: true, chunk_overlap: 200 } as const;

function withFile(id = 'f1'): ImportQueueState {
  return importQueueReducer(createImportQueueState(OPTIONS), {
    type: 'enqueue',
    files: [{ id, name: 'paper.pdf', sizeBytes: 1024, mime: 'application/pdf' }],
  });
}

describe('validateImportFile', () => {
  it('非 PDF 类型拒绝', () => {
    expect(validateImportFile('notes.txt', 10, 'text/plain')).toBe('invalid_type');
    expect(validateImportFile('image.png', 10, 'image/png')).toBe('invalid_type');
  });
  it('PDF 按扩展名识别（mime 为空时）', () => {
    expect(validateImportFile('paper.pdf', 10, '')).toBeNull();
  });
  it('超过大小上限拒绝', () => {
    expect(validateImportFile('big.pdf', IMPORT_MAX_FILE_BYTES + 1, 'application/pdf')).toBe('too_large');
  });
});

describe('importQueueReducer', () => {
  it('入队 → queued；移除后不可见（不静默删除：状态保留 removed）', () => {
    const state = withFile();
    expect(state.files[0]!.stage).toBe('queued');
    const removed = importQueueReducer(state, { type: 'remove', id: 'f1' });
    expect(removed.files[0]!.stage).toBe('removed');
    expect(visibleFiles(removed)).toHaveLength(0);
  });

  it('预检失败 → failed 且不可重试、原因可见', () => {
    const state = withFile();
    const failed = importQueueReducer(state, { type: 'precheck-failed', id: 'f1', reason: 'invalid_type', message: '类型不支持' });
    expect(failed.files[0].stage).toBe('failed');
    expect(failed.files[0].failure).toEqual({ reason: 'invalid_type', message: '类型不支持', retryable: false });
  });

  it('run.created 后进度转为服务端驱动、无事件时显示等待（禁止假进度）', () => {
    const state = withFile();
    const running = importQueueReducer(state, { type: 'run-created', id: 'f1', runId: 'run-1' });
    expect(running.files[0].stage).toBe('parsing');
    expect(running.files[0].serverDrivenProgress).toBe(true);
    expect(running.files[0].progressPercent).toBeNull();
    expect(running.files[0].stageMessage).toBe('等待服务端事件');
  });

  it('SSE 进度映射为百分比与消息', () => {
    let state = withFile();
    state = importQueueReducer(state, { type: 'run-created', id: 'f1', runId: 'run-1' });
    state = importQueueReducer(state, { type: 'server-progress', id: 'f1', current: 3, total: 8, unit: '页', message: null });
    expect(state.files[0].progressPercent).toBe(38);
    expect(state.files[0].stageMessage).toContain('3/8');
  });

  it('完成/失败终态；失败可重试回 queued', () => {
    let state = withFile();
    state = importQueueReducer(state, { type: 'run-created', id: 'f1', runId: 'run-1' });
    const done = importQueueReducer(state, { type: 'completed', id: 'f1', itemId: 'item-9', artifactId: 'art-1' });
    expect(done.files[0].stage).toBe('completed');
    expect(done.files[0].itemId).toBe('item-9');

    let failed = importQueueReducer(state, { type: 'failed', id: 'f1', reason: 'parse_failed', message: '解析服务超时', retryable: true });
    failed = importQueueReducer(failed, { type: 'retry', id: 'f1' });
    expect(failed.files[0].stage).toBe('queued');
    expect(failed.files[0].failure).toBeNull();
  });

  it('断网暂停运行中的文件；恢复清除暂停提示', () => {
    let state = withFile();
    state = importQueueReducer(state, { type: 'run-created', id: 'f1', runId: 'run-1' });
    const offline = importQueueReducer(state, { type: 'offline', offline: true });
    expect(offline.offline).toBe(true);
    expect(offline.files[0].stageMessage).toContain('网络已断开');
    const back = importQueueReducer(offline, { type: 'offline', offline: false });
    expect(back.files[0].stageMessage).toBeNull();
  });
});

describe('runEventToQueueAction', () => {
  const base = { error: null, progress: null, artifact_ids: [] as string[] };

  it('run.started → parsing', () => {
    expect(runEventToQueueAction('f1', { ...base, event_type: 'run.started' })).toMatchObject({ type: 'server-stage', stage: 'parsing' });
  });

  it('step.progress（current/total）→ server-progress', () => {
    expect(
      runEventToQueueAction('f1', { ...base, event_type: 'step.progress', progress: { current: 2, total: 4, unit: '页', message: null } }),
    ).toMatchObject({ type: 'server-progress', current: 2, total: 4 });
  });

  it('step.started(chunking) → chunking 阶段', () => {
    expect(runEventToQueueAction('f1', { ...base, event_type: 'step.started', payload: { step: 'chunking' } })).toMatchObject({ stage: 'chunking' });
  });

  it('artifact.created → 切分完成（95%）', () => {
    expect(runEventToQueueAction('f1', { ...base, event_type: 'artifact.created', artifact_ids: ['art-1'] })).toMatchObject({ type: 'server-stage', percent: 95 });
  });

  it('run.completed → completed + itemId', () => {
    expect(runEventToQueueAction('f1', { ...base, event_type: 'run.completed', payload: { item_id: 'item-9' } })).toMatchObject({ type: 'completed', itemId: 'item-9' });
  });

  it('run.failed(zip_bomb) → 不可重试失败', () => {
    expect(
      runEventToQueueAction('f1', { ...base, event_type: 'run.failed', error: { code: 'zip_bomb', message: '压缩率异常', retryable: false } }),
    ).toMatchObject({ type: 'failed', reason: 'zip_bomb', retryable: false });
  });

  it('无关事件 → null', () => {
    expect(runEventToQueueAction('f1', { ...base, event_type: 'approval.requested' })).toBeNull();
  });
});
