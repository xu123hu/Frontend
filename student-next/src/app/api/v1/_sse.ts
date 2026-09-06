/** 服务端 SSE 响应助手（mock 用）：producer 通过 send 推事件，结束后自动关流。 */
export type SseSend = (event: string, data: unknown) => void;

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function sseResponse(producer: (send: SseSend) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      let closed = false;
      const send: SseSend = (event, data) => {
        if (closed) return;
        ctrl.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        await producer(send);
      } finally {
        closed = true;
        try {
          ctrl.close();
        } catch {
          /* 已被客户端中断 */
        }
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
