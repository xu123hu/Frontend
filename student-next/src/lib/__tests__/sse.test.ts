import { afterEach, describe, expect, it, vi } from "vitest";
import { FirstTokenTimeoutError, StreamAbortedError, streamSse } from "../sse";

/** 构造 SSE Response；frames 为完整帧文本（含 \n\n） */
function sseResponseOf(frames: string[], status = 200): Response {
  const stream = new ReadableStream({
    start(c) {
      const enc = new TextEncoder();
      for (const f of frames) c.enqueue(enc.encode(f));
      c.close();
    },
  });
  return new Response(stream, { status, headers: { "Content-Type": "text/event-stream" } });
}

/** 挂起的流：把内部 controller 暴露出来，abort 时 error pending read（模拟 undici 中止行为） */
function hungResponse(): { response: Response; fail: (err: unknown) => void } {
  let ctrl!: ReadableStreamDefaultController;
  const stream = new ReadableStream({ start(c) { ctrl = c; } });
  const response = new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
  return { response, fail: (err) => ctrl.error(err) };
}

/** 周期发帧的流：返回 fail 用于模拟 fetch 中止时 reject pending read */
function periodicResponse(frame: string, intervalMs: number): { response: Response; fail: (err: unknown) => void } {
  let ctrl!: ReadableStreamDefaultController;
  let timer: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream({
    start(c) {
      ctrl = c;
      const enc = new TextEncoder();
      timer = setInterval(() => c.enqueue(enc.encode(frame)), intervalMs);
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });
  const response = new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
  return { response, fail: (err) => ctrl.error(err) };
}

describe("streamSse 帧解析", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("解析 id/event/data 并按序分发", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      sseResponseOf([
        'id: 1\nevent: session\ndata: {"type":"session","seq":1,"session_id":"c-1"}\n\n',
        'id: 2\nevent: delta\ndata: {"type":"delta","delta":"你好","call_kind":"answer"}\n\n',
        'id: 3\nevent: done\ndata: {"type":"done","status":"completed"}\n\n',
      ]),
    ));
    const events: { type: string; id: string | null; data: Record<string, unknown> }[] = [];
    await streamSse("http://test/chat", {
      body: { message: "hi" },
      onEvent: (type, data, id) => events.push({ type, id, data: data as Record<string, unknown> }),
    });
    expect(events.map((e) => e.type)).toEqual(["session", "delta", "done"]);
    expect(events[0].id).toBe("1");
    expect(events[1].data.delta).toBe("你好");
    expect(events[2].data.status).toBe("completed");
  });

  it("跳过心跳注释帧，多行 data 合并解析", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      sseResponseOf([': ping\n\n', 'id: 1\nevent: delta\ndata: {"text":\ndata: "多行"}\n\n']),
    ));
    const events: { type: string; data: unknown }[] = [];
    await streamSse("http://test/chat", { onEvent: (type, data) => events.push({ type, data }) });
    expect(events).toHaveLength(1); // 心跳帧不计
    expect(events[0].type).toBe("delta");
    expect(events[0].data).toEqual({ text: "多行" });
  });

  it("透传 Last-Event-ID 头（断线续传）", async () => {
    const seen: (string | null)[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string | URL, init?: RequestInit) => {
      seen.push(((init?.headers ?? {}) as Record<string, string>)["Last-Event-ID"] ?? null);
      return sseResponseOf(['id: 1\nevent: done\ndata: {"status":"completed"}\n\n']);
    }));
    await streamSse("http://test/chat", {
      body: {},
      headers: { "Last-Event-ID": "7" },
      onEvent: () => undefined,
    });
    expect(seen[0]).toBe("7");
  });

  it("HTTP 500 时抛出含状态码的错误", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sseResponseOf([], 500)));
    await expect(
      streamSse("http://test/chat", { onEvent: () => undefined }),
    ).rejects.toThrow(/HTTP 500/);
  });
});

describe("streamSse 中止与看门狗", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("首包超时：看门狗打断挂起流并抛 FirstTokenTimeoutError", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_url: string | URL, init?: RequestInit) => {
      const { response, fail } = hungResponse();
      // 桥接：streamSse 传入的 internal.signal 被 abort 时，error 掉挂起的 read（模拟真实 fetch 中止）
      (init as { signal?: AbortSignal }).signal?.addEventListener(
        "abort",
        () => fail((init as { signal?: AbortSignal }).signal?.reason),
        { once: true },
      );
      return response;
    }));
    await expect(
      streamSse("http://test/chat", { onEvent: () => undefined, firstEventTimeoutMs: 60 }),
    ).rejects.toBeInstanceOf(FirstTokenTimeoutError);
  });

  it("外部 abort 中止持续流并抛 StreamAbortedError", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_url: string | URL, init?: RequestInit) => {
      const { response, fail } = periodicResponse('id: 1\nevent: delta\ndata: {"type":"delta"}\n\n', 40);
      // 桥接：signal abort → reject pending read（模拟真实 fetch 中止）
      (init as { signal?: AbortSignal }).signal?.addEventListener(
        "abort",
        () => fail(new DOMException("aborted", "AbortError")),
        { once: true },
      );
      return response;
    }));
    const ac = new AbortController();
    const p = streamSse("http://test/chat", {
      body: {},
      signal: ac.signal,
      onEvent: () => undefined,
    });
    await new Promise((r) => setTimeout(r, 150));
    ac.abort();
    await expect(p).rejects.toBeInstanceOf(StreamAbortedError);
  });
});
