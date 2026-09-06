import { sseResponse, sleep } from "../../_sse";

/**
 * Mock：POST /api/v1/classroom/start 双师课堂（讲解 SSE + 结构化画布指令）
 * 画布坐标系：归一化 [0,1]，客户端映射到 SVG 视窗。
 */

// y = x²/2 在 x∈[-2.2, 2.2] 的归一化点列（v 向下为正，翻转 y）
const parabola: [number, number][] = Array.from({ length: 33 }, (_, i) => {
  const x = -2.2 + (4.4 * i) / 32;
  const y = (x * x) / 2;
  const u = (x + 2.4) / 4.8;
  const v = 1 - (y + 0.3) / 3.0;
  return [Number(u.toFixed(3)), Number(v.toFixed(3))] as [number, number];
});

export async function POST(req: Request) {
  await req.json().catch(() => ({}));
  return sseResponse(async (send) => {
    send("session", { session_id: "cls-" + Date.now().toString(36), lesson: "抛物线的焦点与准线" });
    await sleep(400);
    send("delta", { text: "同学们好，这一讲我们搞定抛物线的焦点与准线。\n\n" });
    await sleep(500);
    send("message", { type: "canvas_op", op: { op: "axes" } });
    send("progress", { stage: "建立坐标系", pct: 20 });
    await sleep(900);
    send("delta", { text: "先看定义：平面内与定点 F 和定直线 l 距离相等的点的集合，叫抛物线。\n\n" });
    send("message", { type: "canvas_op", op: { op: "draw", points: parabola, color: "#4f46e5" } });
    send("progress", { stage: "绘制抛物线", pct: 50 });
    await sleep(1400);
    send("delta", { text: "看画布：动点 P 满足 |PF| = d(P, l)，这就是它的几何本质，不需要死记方程。\n\n" });
    send("message", { type: "canvas_op", op: { op: "label", label: "F", at: [0.545, 0.44], color: "#dc2626" } });
    send("message", { type: "canvas_op", op: { op: "label", label: "l", at: [0.315, 0.44], color: "#0891b2" } });
    send("progress", { stage: "标注焦点与准线", pct: 80 });
    await sleep(900);
    send("delta", { text: "现在试一试：当 p = 2 时，焦点 F 的坐标是什么？在下方输入你的答案，我即时反馈。\n\n" });
    send("done", { message_id: "cls-" + Date.now().toString(36) });
  });
}
