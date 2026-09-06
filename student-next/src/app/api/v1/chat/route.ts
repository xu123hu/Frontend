import { sseResponse, sleep } from "../_sse";
import { store } from "../_store";

/**
 * Mock：POST /api/v1/chat（B1-1，SSE）
 * 事件序列对齐 event-contracts §3：session → stage_start/end → message(quiz_item) → delta* → wait_for_input → done{waiting_input}
 * ?delay=3000 模拟慢首包；?fail=network 模拟可重试错误
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const message = String(body.message ?? "");
  const sessionId = (body.session_id as string | null) ?? null;
  const url = new URL(req.url);
  const delay = Number(url.searchParams.get("delay") ?? 0);
  const fail = url.searchParams.get("fail");

  return sseResponse(async (send) => {
    const sid = sessionId ?? `c-${Date.now().toString(36)}`;
    const turn = `t-${Date.now().toString(36)}`;
    const capability = "guided_solve";
    // 会话内单调 seq（跨 turn 不清零，mock 存 globalThis）
    let seq = store.chatSeq.get(sid) ?? 0;
    const env = (type: string, payload: object = {}) => {
      seq += 1;
      store.chatSeq.set(sid, seq);
      return { type, seq, session_id: sid, turn_id: turn, capability, ts: Date.now() / 1000, ...payload };
    };

    send("session", env("session"));
    if (delay > 0) await sleep(delay);
    if (fail) {
      send("error", env("error", { code: fail, message: "AI 服务暂时不可用（mock 演示），请重试", retryable: true }));
      send("done", env("done", { status: "failed" }));
      return;
    }

    const wantsVariant = /类似|举一反三|再来|变式/.test(message);

    send("stage_start", env("stage_start", { stage: "route" }));
    await sleep(350);
    send("stage_end", env("stage_end", { stage: "route" }));
    send("progress", env("progress", { task_id: turn, phase: "retrieve", percent: 30, message: wantsVariant ? "从题库检索同类变式" : "检索知识库" }));
    await sleep(500);

    if (wantsVariant) {
      send("message", env("message", {
        message_id: `m-${seq}`,
        content: "",
        blocks: [{
          kind: "quiz_item",
          stem_text: "举一反三 · 已知抛物线 C：y²=2px（p>0）经过点 P(2, 2√2)。（1）求 C 的方程及焦点 F；（2）过 F 的直线交 C 于 A、B，若 |AF|=2|BF|，求 |AB|。",
          stem_images: [{ url: "/mock-assets/q-parabola.svg", page_no: 1 }],
          options: { A: "3/2", B: "3", C: "9/2", D: "6" },
          answer: "A",
          explanation: "x_A = p/2·(代入得 2)，由 |AF|=x_A+p/2… 得 |BF|=3/2。",
          kp_codes: ["kp.conic.parabola"],
          difficulty: "medium",
        }],
      }));
      await sleep(350);
      const chunks = ["给你出了一道同类变式，见图：\n\n", "提示一：先把已知点代入 y²=2px，求出 p；\n\n", "提示二：焦点 F(p/2, 0)，弦长记得用焦半径公式。\n\n", "做完把解答拍照发我，我来批改。"];
      for (const c of chunks) {
        await sleep(280);
        send("delta", env("delta", { delta: c, call_kind: "answer" }));
      }
      send("done", env("done", { status: "completed" }));
      return;
    }

    // 引导式解题（Socratic）：题目卡 → 分步引导 → 追问等待输入
    send("message", env("message", {
      message_id: `m-${seq}`,
      content: "",
      blocks: [{
        kind: "quiz_item",
        stem_text: "已知椭圆 C：x²/a²+y²/b²=1（a>b>0）的左、右焦点分别为 F₁(−√3,0)、F₂(√3,0)，且椭圆经过点 P(2,1)。求椭圆 C 的标准方程。",
        stem_images: [{ url: "/mock-assets/q-conic.svg", page_no: 1 }],
        options: null,
        kp_codes: ["kp.conic.ellipse"],
        difficulty: "medium",
      }],
    }));
    send("tool_call", env("tool_call", { tool: "analyze_knowledge_point", args: { result: "椭圆的标准方程与焦点" } }));
    await sleep(400);
    send("tool_result", env("tool_result", { tool: "analyze_knowledge_point", summary: "定位考点：椭圆定义 + 标准方程（a²=b²+c²）" }));
    send("progress", env("progress", { task_id: turn, phase: "generate", percent: 60, message: "生成引导步骤" }));
    const paragraphs = [
      "这道题考查椭圆的标准方程，我们一步步来，不直接给答案：\n\n",
      "第一步：由图可见焦点在 x 轴上，所以可设 x²/a² + y²/b² = 1（a > b > 0）。\n\n",
      "第二步：由两焦点坐标可得 c² = 3，所以 a² = b² + 3。\n\n",
      "由第一定义 |PF₁| + |PF₂| = 2a，代入 P(2,1) 即可求出 a。\n\n",
    ];
    for (const p of paragraphs) {
      await sleep(320);
      send("delta", env("delta", { delta: p, call_kind: "answer" }));
    }
    send("wait_for_input", env("wait_for_input", {
      questions: [{ id: "q-1", prompt: "现在轮到你了：c 应该等于多少？", kind: "text" }],
    }));
    send("done", env("done", { status: "waiting_input" }));
  });
}
