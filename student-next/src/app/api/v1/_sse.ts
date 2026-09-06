/** 服务端 SSE 助手（mock 用）：自动维护 `id:` 行（连接内单调递增），帧格式对齐 event-contracts §1。 */
export type SseSend = (event: string, data: unknown) => void;

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function sseResponse(producer: (send: SseSend) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      let closed = false;
      let seq = 0;
      const send: SseSend = (event, data) => {
        if (closed) return;
        seq += 1;
        ctrl.enqueue(encoder.encode(`id: ${seq}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        await producer(send);
      } finally {
        closed = true;
        try {
          ctrl.close();
        } catch {
          /* 客户端已中断 */
        }
      }
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
