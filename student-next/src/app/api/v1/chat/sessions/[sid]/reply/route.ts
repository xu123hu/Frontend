import { sseResponse, sleep } from "../../../../_sse";
import { store } from "../../../../_store";

/** POST /api/v1/chat/sessions/{sid}/reply（B1-1）：BACKEND_PROXY=1 时直通管道 B1，否则 mock。 */
const B1_BASE = process.env.B1_BASE ?? "http://localhost:8011";

async function proxyReply(req: Request, sid: string): Promise<Response> {
  const upstreamCtrl = new AbortController();
  req.signal.addEventListener("abort", () => upstreamCtrl.abort(), { once: true });
  const headers: Record<string, string> = {
    "Content-Type": req.headers.get("content-type") ?? "application/json",
    Accept: "text/event-stream",
  };
  const lastEventId = req.headers.get("last-event-id");
  if (lastEventId) headers["Last-Event-ID"] = lastEventId;
  const upstream = await fetch(`${B1_BASE}/api/v1/chat/sessions/${sid}/reply`, {
    method: "POST",
    headers,
    body: await req.text(),
    signal: upstreamCtrl.signal,
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ sid: string }> }) {
  const { sid } = await params;
  if (process.env.BACKEND_PROXY === "1") return proxyReply(req, sid);
  return mockReply(req, sid);
}

async function mockReply(req: Request, sid: string) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const reply = (body.reply ?? {}) as { question_id?: string; kind?: string; value?: string };
  const value = String(reply.value ?? "");

  return sseResponse(async (send) => {
    const turn = `t-${Date.now().toString(36)}`;
    let seq = store.chatSeq.get(sid) ?? 0;
    const env = (type: string, payload: object = {}) => {
      seq += 1;
      store.chatSeq.set(sid, seq);
      return { type, seq, session_id: sid, turn_id: turn, capability: "guided_solve", ts: Date.now() / 1000, ...payload };
    };

    send("session", env("session"));
    await sleep(400);
    const correct = /√3|1\.73|根号3/.test(value);
    if (correct) {
      const chunks = [
        `答对了，c = √3！👍\n\n`,
        "继续第二步：由第一定义 |PF₁| + |PF₂| = 2a。\n\n",
        "代入 P(2,1)：|PF₁| = √6+√2，|PF₂| = √6−√2，所以 2a = 2√6，a² = 6，b² = 3。\n\n",
        "最终答案：x²/6 + y²/3 = 1。要不要再来一道同类变式？",
      ];
      for (const c of chunks) {
        await sleep(320);
        send("delta", env("delta", { delta: c, call_kind: "answer" }));
      }
      send("done", env("done", { status: "completed" }));
    } else {
      const chunks = [
        `你写的是「${value || "（空）"}」——再想想：焦点是 (±√3, 0)，c² 等于多少？\n\n`,
        "提示：c² = 3，所以 c = √3（正数）。\n\n",
      ];
      for (const c of chunks) {
        await sleep(300);
        send("delta", env("delta", { delta: c, call_kind: "answer" }));
      }
      send("wait_for_input", env("wait_for_input", {
        questions: [{ id: "q-1", prompt: "再试一次：c = ？", kind: "text" }],
      }));
      send("done", env("done", { status: "waiting_input" }));
    }
  });
}
