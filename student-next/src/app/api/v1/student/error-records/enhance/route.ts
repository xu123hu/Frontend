import { sseResponse, sleep } from "../../../_sse";

/**
 * Mock：POST /api/v1/student/error-records/enhance（SSE 三段增强进度）
 * body: { filename } → upload → enhance → ocr → done（返回新错题记录）
 */
export async function POST(req: Request) {
  const { filename = "photo.jpg" } = await req.json().catch(() => ({ filename: "" }));
  return sseResponse(async (send) => {
    const record_id = "e-" + Date.now().toString(36);
    const stages: [string, number, number, string][] = [
      ["upload", 20, 500, "上传照片"],
      ["upload", 60, 450, "上传照片"],
      ["enhance", 15, 600, "扫描级增亮 · 去阴影"],
      ["enhance", 55, 650, "扫描级增亮 · 锐化笔迹"],
      ["enhance", 90, 500, "增强完成"],
      ["ocr", 40, 650, "识别题目结构与知识点"],
      ["ocr", 85, 500, "匹配知识点：圆锥曲线"],
    ];
    for (const [stage, pct, ms, label] of stages) {
      await sleep(ms);
      send("progress", { record_id, stage, pct, label, filename });
    }
    await sleep(350);
    send("done", {
      record: {
        record_id,
        image_url: "/mock-assets/err-new.svg",
        hires_url: "/mock-assets/err-new.svg",
        kp: "圆锥曲线 · 轨迹问题",
        created_at: new Date().toISOString().slice(0, 10),
        diagnosis: "轨迹方程化简时漏掉 x 的取值范围。",
      },
    });
  });
}
