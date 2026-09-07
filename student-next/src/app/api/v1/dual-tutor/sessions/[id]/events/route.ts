import { sseResponse, sleep } from "../../../../_sse";
import { store } from "../../../../_store";

const B4_BASE = process.env.BACKEND_BASE ?? "http://localhost:8100";

async function proxyEvents(req: Request, id: string): Promise<Response> {
  const upstreamCtrl = new AbortController();
  req.signal.addEventListener("abort", () => upstreamCtrl.abort(), { once: true });
  const headers: Record<string, string> = { Accept: "text/event-stream" };
  const lastEventId = req.headers.get("last-event-id");
  if (lastEventId) headers["Last-Event-ID"] = lastEventId;
  const upstream = await fetch(`${B4_BASE}/api/v1/dual-tutor/sessions/${id}/events`, {
    method: "POST",
    headers,
    body: await req.text().catch(() => "{}"),
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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (process.env.BACKEND_PROXY === "1") return proxyEvents(req, id);
  return mockEvents(req, id);
}

/**
 * Mock：POST /api/v1/dual-tutor/sessions/{id}/events（B4-5 SSE）
 * 事件序列：session → progress* → slide*（blocks: text/latex/example/figure_ref）→ done{total}
 * 支持 Last-Event-ID 语义（按 seq 跳过已发 slide）
 */
const SLIDES = [
  {
    index: 0,
    kp_path: ["圆锥曲线", "抛物线"],
    blocks: [
      { kind: "text", content: "同学们好，这一讲我们搞定抛物线的焦点与准线。" },
      { kind: "latex", content: "y^2 = 2px \\quad (p > 0)" },
      { kind: "text", content: "先看定义：平面内与定点 F 和定直线 l 距离相等的点的集合，叫抛物线。" },
      { kind: "figure_ref", artifact_url: "/mock-assets/fig-parabola.svg", artifact_type: "svg", expr: "y^2=2px" },
    ],
  },
  {
    index: 1,
    kp_path: ["圆锥曲线", "抛物线", "焦点与准线"],
    blocks: [
      { kind: "text", content: "看图：动点 P 满足 |PF| = d(P, l)，这就是它的几何本质，不需要死记方程。" },
      { kind: "example", content: "例：p = 2 时的抛物线", analysis: ["第一步：由 y²=4x 得 2p=4，p=2；", "第二步：焦点 F(1, 0)，准线 x = −1；", "第三步：验证——任取抛物线上一点到 F 与到 l 的距离相等。"] },
    ],
  },
  {
    index: 2,
    kp_path: ["圆锥曲线", "抛物线", "焦点与准线"],
    blocks: [
      { kind: "text", content: "小结：焦点 F(p/2, 0)、准线 x = −p/2，一对孪生兄弟记牢。" },
      { kind: "text", content: "课堂练习：当 p = 2 时，焦点 F 的坐标是什么？在左侧输入你的答案。" },
    ],
  },
];

async function mockEvents(req: Request, id: string) {
  const lastEventId = Number(req.headers.get("Last-Event-ID") ?? 0);
  return sseResponse(async (send) => {
    let seq = store.dualSeq.get(id) ?? 0;
    const env = (type: string, payload: object = {}) => {
      seq += 1;
      store.dualSeq.set(id, seq);
      return { type, seq, session_id: id, ts: Date.now() / 1000, ...payload };
    };
    send("session", env("session", { stage: "prepare" }));
    const startIdx = lastEventId > 0 ? Math.min(SLIDES.length, lastEventId) : 0;
    if (startIdx === 0) {
      send("progress", env("progress", { task_id: id, seq, stage: "生成讲义", percent: 10 }));
      await sleep(900);
    }
    for (let i = startIdx; i < SLIDES.length; i++) {
      send("slide", env("slide", { ...SLIDES[i], total: SLIDES.length }));
      await sleep(1100);
      send("progress", env("progress", { task_id: id, seq, stage: "讲义生成中", percent: Math.round(((i + 1) / SLIDES.length) * 100) }));
      await sleep(500);
    }
    send("done", env("done", { total: SLIDES.length }));
  });
}
