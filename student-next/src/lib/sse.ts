/**
 * SSE 消费器（fetch + ReadableStream）。
 * 契约：`event: <type>\ndata: <json>\n\n`（contracts/README.md 统一基线）。
 * 不用 EventSource：需要 POST + 鉴权头 + 请求体 + 主动取消。
 */

export type SseListener = (event: string, data: unknown) => void;

export interface StreamOptions {
  body?: unknown;
  signal?: AbortSignal;
  onEvent: SseListener;
  /** 首事件到达回调（用于关闭"连接中"骨架） */
  onFirstEvent?: () => void;
  /** 首事件超时毫秒数（默认 8000） */
  firstEventTimeoutMs?: number;
}

export class FirstTokenTimeoutError extends Error {
  constructor() {
    super("等待 AI 首个响应超时，请重试");
    this.name = "FirstTokenTimeoutError";
  }
}

export class StreamAbortedError extends Error {
  constructor() {
    super("已停止生成");
    this.name = "StreamAbortedError";
  }
}

export async function streamSse(url: string, opts: StreamOptions): Promise<void> {
  const { body, signal, onEvent, onFirstEvent, firstEventTimeoutMs = 8000 } = opts;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body ?? {}),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`后端连接失败（HTTP ${res.status}）`);
  }

  // 首 token 看门狗：超时中断并抛出，UI 层给出可重试提示
  let gotFirst = false;
  const watchdog = setTimeout(() => {
    if (!gotFirst) controller.abort(new FirstTokenTimeoutError());
  }, firstEventTimeoutMs);

  const controller = new AbortController();
  const onOuterAbort = () => controller.abort(new StreamAbortedError());
  signal?.addEventListener("abort", onOuterAbort, { once: true });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // 帧以空行分隔
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) >= 0) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        let type = "message";
        const dataLines: string[] = [];
        for (const line of frame.split("\n")) {
          if (line.startsWith("event:")) type = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
        }
        if (dataLines.length === 0) continue;
        let payload: unknown = null;
        try {
          payload = JSON.parse(dataLines.join("\n"));
        } catch {
          payload = dataLines.join("\n");
        }
        if (!gotFirst) {
          gotFirst = true;
          clearTimeout(watchdog);
          onFirstEvent?.();
        }
        onEvent(type, payload);
      }
    }
  } catch (err) {
    if (signal?.aborted) {
      if (signal.reason instanceof FirstTokenTimeoutError) throw signal.reason;
      throw new StreamAbortedError();
    }
    if (controller.signal.aborted && controller.signal.reason instanceof FirstTokenTimeoutError) {
      throw controller.signal.reason;
    }
    throw err;
  } finally {
    clearTimeout(watchdog);
    signal?.removeEventListener("abort", onOuterAbort);
    reader.releaseLock();
  }
}
