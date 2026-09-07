/**
 * SSE 消费器（fetch + ReadableStream），对齐 event-contracts v1.0-rc1：
 * - 帧含 `id: <seq>` 行（断线续传键）→ 通过 onEvent 第三参上报
 * - 心跳为注释帧 `: ping` → 忽略
 * - data 为 JSON 信封（type/seq/session_id/turn_id/...）
 * 不用 EventSource：需要 POST + 鉴权头 + 请求体 + 主动取消。
 */

export type SseListener = (event: string, data: unknown, id: string | null) => void;

export interface StreamOptions {
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
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
  const { body, signal, headers, onEvent, onFirstEvent, firstEventTimeoutMs = 8000 } = opts;

  // 内部 controller 统一承载中止源：外部 signal 转发 + 首包看门狗，二者都能打断 fetch/reader
  const internal = new AbortController();
  const onOuterAbort = () => internal.abort(new StreamAbortedError());
  signal?.addEventListener("abort", onOuterAbort, { once: true });

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream", ...headers },
      body: JSON.stringify(body ?? {}),
      signal: internal.signal,
    });
  } catch (err) {
    signal?.removeEventListener("abort", onOuterAbort);
    if (signal?.aborted) throw new StreamAbortedError();
    if (internal.signal.reason instanceof FirstTokenTimeoutError) throw internal.signal.reason;
    throw err;
  }
  if (!res.ok || !res.body) {
    signal?.removeEventListener("abort", onOuterAbort);
    let code = "";
    try {
      code = ((await res.json()) as { code?: string }).code ?? "";
    } catch {
      /* 非 JSON 错误体 */
    }
    throw new Error(`后端连接失败（HTTP ${res.status}${code ? ` ${code}` : ""}）`);
  }

  // 首 token 看门狗（abort internal.signal → fetch/reader 立刻失败）
  let gotFirst = false;
  const watchdog = setTimeout(() => {
    if (!gotFirst) internal.abort(new FirstTokenTimeoutError());
  }, firstEventTimeoutMs);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) >= 0) {
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        let type = "message";
        let id: string | null = null;
        const dataLines: string[] = [];
        for (const line of frame.split("\n")) {
          if (line.startsWith(":")) continue; // 心跳注释帧
          if (line.startsWith("id:")) id = line.slice(3).trim();
          else if (line.startsWith("event:")) type = line.slice(6).trim();
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
        onEvent(type, payload, id);
      }
    }
  } catch (err) {
    if (signal?.aborted) {
      if (signal.reason instanceof FirstTokenTimeoutError) throw signal.reason;
      throw new StreamAbortedError();
    }
    if (internal.signal.aborted && internal.signal.reason instanceof FirstTokenTimeoutError) {
      throw internal.signal.reason;
    }
    throw err;
  } finally {
    clearTimeout(watchdog);
    signal?.removeEventListener("abort", onOuterAbort);
    reader.releaseLock();
  }
}
