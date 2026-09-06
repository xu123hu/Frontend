import { sseResponse, sleep } from "../../_sse";

/**
 * Mock：POST /api/v1/agent/chat（SSE）
 * ?delay=3000 模拟慢首 token（验收骨架屏/看门狗）
 * ?fail=network 模拟可重试错误（验收 error 事件路径）
 */
export async function POST(req: Request) {
  const { message = "" } = await req.json().catch(() => ({ message: "" }));
  const url = new URL(req.url);
  const delay = Number(url.searchParams.get("delay") ?? 0);
  const fail = url.searchParams.get("fail");

  return sseResponse(async (send) => {
    send("session", { session_id: "s-" + Date.now().toString(36) });
    if (delay > 0) await sleep(delay);
    if (fail) {
      await sleep(300);
      send("error", { code: fail, message: "AI 服务暂时不可用（mock 演示），请重试", retryable: true });
      return;
    }

    const wantsVariant = /类似|举一反三|再来|变式/.test(message);

    if (wantsVariant) {
      send("progress", { stage: "从题库检索同类变式题", pct: 25 });
      await sleep(600);
      send("message", {
        type: "question_image",
        image: {
          image_url: "/mock-assets/q-parabola.svg",
          hires_url: "/mock-assets/q-parabola.svg",
          caption: "举一反三 · 变式题（图片直出）",
          width: 640,
          height: 400,
        },
      });
      await sleep(350);
      const chunks = [
        "给你出了一道同类变式，见图：\n\n",
        "提示一：先把已知点代入 y² = 2px，求出 p；\n\n",
        "提示二：焦点 F(p/2, 0)，弦长记得用焦半径公式。\n\n",
        "做完把解答拍照发我，我来批改。",
      ];
      for (const c of chunks) {
        await sleep(280);
        send("delta", { text: c });
      }
      send("done", { message_id: "m-" + Date.now().toString(36) });
      return;
    }

    // 引导式解题剧本（不直接给答案，分步引导）
    send("progress", { stage: "识别题目与图形", pct: 15 });
    await sleep(650);
    send("message", {
      type: "question_image",
      image: {
        image_url: "/mock-assets/q-conic.svg",
        hires_url: "/mock-assets/q-conic.svg",
        caption: "题目原图（图片直出，不转文字）",
        width: 640,
        height: 420,
      },
    });
    send("tool_call", { name: "analyze_knowledge_point", args: { result: "椭圆的标准方程与焦点" } });
    await sleep(450);
    send("progress", { stage: "规划引导步骤", pct: 60 });
    await sleep(450);
    const paragraphs = [
      "这道题考查椭圆的标准方程，我们一步步来，不直接给答案：\n\n",
      "第一步：由图可见焦点在 x 轴上，所以可设 x²/a² + y²/b² = 1（a > b > 0）。\n\n",
      "第二步：题目给了两个条件——两个焦点的坐标，以及曲线经过的点。先由焦点写出 c。\n\n",
      "现在轮到你了：c 应该等于多少？把你的答案发给我，我再带你定 a 和 b。",
    ];
    for (const p of paragraphs) {
      await sleep(340);
      send("delta", { text: p });
    }
    send("done", { message_id: "m-" + Date.now().toString(36) });
  });
}
