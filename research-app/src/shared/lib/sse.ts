/**
 * RunEvent SSE 客户端（M0 冻结契约：GET /runs/{id}/events）。
 *
 * 提示词技术架构要求：SSE 解码 RunEvent，支持 Last-Event-ID 重连、去重和顺序检查。
 *
 * 为什么不用 EventSource：需要自定义请求头（Idempotency/认证/Last-Event-ID 显式控制）
 * 与 AbortController 取消；fetch + ReadableStream 手动解析且纯函数可单测。
 * 08 §6：任何解析异常都必须可观察（onError），禁止静默吞掉。
 */

/** M0 冻结 RunEvent（frontend 侧最小视图，字段与 m0-schema.gen.d.ts 对齐）。 */
export interface RunEventView {
  event_id: string;
  event_type: string;
  run_id: string;
  sequence: number;
  occurred_at: string;
  step_id: string | null;
  error: { code: string; message: string; retryable: boolean } | null;
  progress: { current: number | null; total: number | null; unit: string | null; message: string | null } | null;
  artifact_ids: string[];
  payload?: Record<string, unknown>;
}

export interface SseParseState {
  buffer: string;
  /** 当前事件字段累积。 */
  eventName: string;
  dataLines: string[];
  lastEventId: string;
}

export function createSseParseState(): SseParseState {
  return { buffer: '', eventName: 'message', dataLines: [], lastEventId: '' };
}

/**
 * 增量解析 SSE 文本块，返回解析出的事件（data JSON 字符串数组）。
 * 遵循 WHATWG SSE 规范：\r\n|\r|\n 行分隔；冒号开头为注释；空行派发事件。
 */
export function parseSseChunk(state: SseParseState, chunk: string): { events: string[]; hasLastEventIdUpdate: boolean } {
  state.buffer += chunk;
  const events: string[] = [];
  let hasLastEventIdUpdate = false;

  // 规范允许 \r\n / \r / \n；统一按行切分，最后一段可能是半行，保留在 buffer。
  const normalized = state.buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  state.buffer = lines.pop() ?? '';

  for (const line of lines) {
    if (line === '') {
      // 空行 = 事件派发
      if (state.dataLines.length > 0) {
        events.push(state.dataLines.join('\n'));
        state.dataLines = [];
        state.eventName = 'message';
      }
      continue;
    }
    if (line.startsWith(':')) continue; // 注释/心跳
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);

    if (field === 'data') state.dataLines.push(value);
    else if (field === 'event') state.eventName = value;
    else if (field === 'id') {
      state.lastEventId = value;
      hasLastEventIdUpdate = true;
    }
    // retry 字段：重连间隔建议，本实现手动重连，忽略
  }
  return { events, hasLastEventIdUpdate };
}

// run-simulator push 用的载荷类型（sequence 由脚本生成器分配）。
export type RunEventDraft = Omit<RunEventView, 'run_id' | 'actor_id' | 'actor_type' | 'trace_id' | 'sequence'>;

export interface RunEventStreamCallbacks {
  onEvent: (event: RunEventView) => void;
  onError: (error: { kind: 'network' | 'protocol' | 'sequence' | 'aborted'; message: string; retryable: boolean }) => void;
  onLastEventId?: (id: string) => void;
}

export interface RunEventStreamOptions {
  eventsUrl: string;
  lastEventId?: string;
  signal: AbortSignal;
  fetchImpl?: typeof fetch;
  /** 顺序校验：期望的最小 sequence（收到的 sequence 必须严格递增）。 */
  minSequence?: number;
}

/**
 * 消费一次事件流（到流结束或 abort）。
 * 去重：event_id 相同的事件丢弃；顺序：sequence 非严格递增 → protocol 级错误（可观察，不静默）。
 */
export async function consumeRunEventStream(options: RunEventStreamOptions, callbacks: RunEventStreamCallbacks): Promise<void> {
  const doFetch = options.fetchImpl ?? fetch;
  const headers: Record<string, string> = { Accept: 'text/event-stream' };
  if (options.lastEventId) headers['Last-Event-ID'] = options.lastEventId;

  let response: Response;
  try {
    response = await doFetch(options.eventsUrl, { headers, signal: options.signal });
  } catch (err) {
    if (options.signal.aborted) {
      callbacks.onError({ kind: 'aborted', message: '事件流已取消', retryable: false });
      return;
    }
    callbacks.onError({ kind: 'network', message: err instanceof Error ? err.message : '事件流连接失败', retryable: true });
    return;
  }

  if (!response.ok || !response.body) {
    callbacks.onError({ kind: 'network', message: `事件流 HTTP ${response.status}`, retryable: response.status >= 500 || response.status === 429 });
    return;
  }

  const state = createSseParseState();
  if (options.lastEventId) state.lastEventId = options.lastEventId;
  const seenEventIds = new Set<string>();
  let lastSequence = options.minSequence ?? -1;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const { events, hasLastEventIdUpdate } = parseSseChunk(state, decoder.decode(value, { stream: true }));
      if (hasLastEventIdUpdate && state.lastEventId) callbacks.onLastEventId?.(state.lastEventId);

      for (const data of events) {
        let parsed: RunEventView;
        try {
          parsed = JSON.parse(data) as RunEventView;
        } catch {
          callbacks.onError({ kind: 'protocol', message: '事件 data 不是合法 JSON', retryable: false });
          continue;
        }
        if (typeof parsed.sequence !== 'number' || typeof parsed.event_id !== 'string') {
          callbacks.onError({ kind: 'protocol', message: '事件缺少 sequence/event_id（违反 M0 RunEvent 契约）', retryable: false });
          continue;
        }
        if (seenEventIds.has(parsed.event_id)) continue; // 去重
        seenEventIds.add(parsed.event_id);
        if (parsed.sequence <= lastSequence) {
          callbacks.onError({ kind: 'sequence', message: `事件顺序异常：sequence ${parsed.sequence} ≤ 已处理 ${lastSequence}，已丢弃`, retryable: true });
          continue;
        }
        lastSequence = parsed.sequence;
        callbacks.onEvent(parsed);
      }
    }
  } catch (err) {
    if (options.signal.aborted) {
      callbacks.onError({ kind: 'aborted', message: '事件流已取消', retryable: false });
      return;
    }
    callbacks.onError({ kind: 'network', message: err instanceof Error ? err.message : '事件流读取中断', retryable: true });
  }
}
