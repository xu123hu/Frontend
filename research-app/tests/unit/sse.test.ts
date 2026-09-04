/**
 * SSE RunEvent 客户端单测：增量解析、去重、顺序检查、Last-Event-ID、错误语义。
 * 提示词要求：SSE 解码 RunEvent，支持 Last-Event-ID 重连、去重和顺序检查。
 */
import { describe, expect, it, vi } from 'vitest';
import { consumeRunEventStream, createSseParseState, parseSseChunk, type RunEventView } from '@shared/lib/sse';

function frame(event: Partial<RunEventView> & { event_id: string; sequence: number }): string {
  const full: RunEventView = {
    event_type: 'step.progress',
    run_id: 'run-1',
    occurred_at: new Date().toISOString(),
    step_id: 'parse',
    error: null,
    progress: null,
    artifact_ids: [],
    ...event,
  };
  return `id: ${full.event_id}\nevent: message\ndata: ${JSON.stringify(full)}\n\n`;
}

describe('parseSseChunk', () => {
  it('跨块半行缓冲：分两次投递仍解析出完整事件', () => {
    const state = createSseParseState();
    const payload = frame({ event_id: 'e1', sequence: 1 });
    const mid = Math.floor(payload.length / 2);
    const first = parseSseChunk(state, payload.slice(0, mid));
    expect(first.events).toHaveLength(0);
    const second = parseSseChunk(state, payload.slice(mid));
    expect(second.events).toHaveLength(1);
    expect(JSON.parse(second.events[0]).event_id).toBe('e1');
  });

  it('Last-Event-ID 更新可观察', () => {
    const state = createSseParseState();
    const { hasLastEventIdUpdate } = parseSseChunk(state, frame({ event_id: 'e9', sequence: 9 }));
    expect(hasLastEventIdUpdate).toBe(true);
    expect(state.lastEventId).toBe('e9');
  });

  it('注释心跳行不产生事件', () => {
    const state = createSseParseState();
    const { events } = parseSseChunk(state, ': heartbeat\n\n');
    expect(events).toHaveLength(0);
  });

  it('CRLF 行尾兼容', () => {
    const state = createSseParseState();
    const payload = frame({ event_id: 'e2', sequence: 2 }).replace(/\n/g, '\r\n');
    const { events } = parseSseChunk(state, payload);
    expect(events).toHaveLength(1);
  });
});

function mockFetchResponse(chunks: string[], ok = true, status = 200): typeof fetch {
  const encoder = new TextEncoder();
  let index = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index++]));
      } else {
        controller.close();
      }
    },
  });
  return vi.fn().mockResolvedValue(new Response(body, { status: ok ? 200 : status })) as unknown as typeof fetch;
}

describe('consumeRunEventStream', () => {
  it('解析事件并按序回调', async () => {
    const events: RunEventView[] = [];
    const fetchImpl = mockFetchResponse([frame({ event_id: 'a', sequence: 1 }), frame({ event_id: 'b', sequence: 2 })]);
    const signal = new AbortController().signal;
    await consumeRunEventStream({ eventsUrl: 'http://t/events', signal, fetchImpl }, { onEvent: (e) => events.push(e), onError: vi.fn() });
    expect(events.map((e) => e.event_id)).toEqual(['a', 'b']);
  });

  it('重复 event_id 去重', async () => {
    const events: RunEventView[] = [];
    const fetchImpl = mockFetchResponse([frame({ event_id: 'a', sequence: 1 }), frame({ event_id: 'a', sequence: 1 })]);
    const signal = new AbortController().signal;
    await consumeRunEventStream({ eventsUrl: 'http://t/events', signal, fetchImpl }, { onEvent: (e) => events.push(e), onError: vi.fn() });
    expect(events).toHaveLength(1);
  });

  it('sequence 倒序 → sequence 错误（可观察），事件丢弃', async () => {
    const events: RunEventView[] = [];
    const onError = vi.fn();
    const fetchImpl = mockFetchResponse([frame({ event_id: 'a', sequence: 5 }), frame({ event_id: 'b', sequence: 4 })]);
    const signal = new AbortController().signal;
    await consumeRunEventStream({ eventsUrl: 'http://t/events', signal, fetchImpl }, { onEvent: (e) => events.push(e), onError });
    expect(events).toHaveLength(1);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'sequence', retryable: true }));
  });

  it('非法 JSON → protocol 错误，不断流', async () => {
    const events: RunEventView[] = [];
    const onError = vi.fn();
    const good = frame({ event_id: 'a', sequence: 1 });
    const fetchImpl = mockFetchResponse([`data: {broken json\n\n`, good]);
    const signal = new AbortController().signal;
    await consumeRunEventStream({ eventsUrl: 'http://t/events', signal, fetchImpl }, { onEvent: (e) => events.push(e), onError });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'protocol' }));
    expect(events).toHaveLength(1);
  });

  it('HTTP 500 → network 错误且可重试', async () => {
    const onError = vi.fn();
    const fetchImpl = mockFetchResponse([], false, 500);
    const signal = new AbortController().signal;
    await consumeRunEventStream({ eventsUrl: 'http://t/events', signal, fetchImpl }, { onEvent: vi.fn(), onError });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'network', retryable: true }));
  });

  it('携带 Last-Event-ID 请求头（断线续传）', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(new ReadableStream({ start: (c) => c.close() }), { status: 200 }));
    const signal = new AbortController().signal;
    await consumeRunEventStream({ eventsUrl: 'http://t/events', lastEventId: 'evt-42', signal, fetchImpl: fetchImpl as unknown as typeof fetch }, { onEvent: vi.fn(), onError: vi.fn() });
    expect(fetchImpl).toHaveBeenCalledWith('http://t/events', expect.objectContaining({ headers: expect.objectContaining({ 'Last-Event-ID': 'evt-42' }) }));
  });
});
