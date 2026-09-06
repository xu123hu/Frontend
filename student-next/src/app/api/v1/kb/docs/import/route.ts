import { sseResponse, sleep } from "../../../_sse";

/**
 * Mock：POST /api/v1/kb/docs/import（SSE 进度）
 * body: { filename } → upload → parse → chunk → embed → done
 */
export async function POST(req: Request) {
  const { filename = "未命名文档.pdf" } = await req.json().catch(() => ({ filename: "" }));
  return sseResponse(async (send) => {
    const doc_id = "d-" + Date.now().toString(36);
    const stages: [string, number, number, string][] = [
      ["upload", 15, 500, "上传中"],
      ["upload", 45, 450, "上传中"],
      ["upload", 90, 350, "上传完成"],
      ["parse", 25, 700, "解析 PDF 版面与图片"],
      ["parse", 70, 700, "解析公式区域"],
      ["chunk", 40, 600, "按语义切片"],
      ["chunk", 85, 450, "切片完成"],
      ["embed", 35, 700, "向量化（知识库检索索引）"],
      ["embed", 80, 650, "向量化"],
    ];
    for (const [stage, pct, ms, label] of stages) {
      await sleep(ms);
      send("progress", { doc_id, stage, pct, label, filename });
    }
    await sleep(400);
    send("done", { doc_id, filename, chunks: 30 + Math.floor(Math.random() * 60), status: "ready" });
  });
}
