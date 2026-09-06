import { NextResponse } from "next/server";

/** Mock：GET /api/v1/kb/docs 知识库文档列表 */
export async function GET() {
  const items = [
    { doc_id: "d-01", filename: "人教A版选修一·第2章 圆锥曲线.pdf", status: "ready", progress: 100, chunks: 86, size_hint: "12.4 MB" },
    { doc_id: "d-02", filename: "高一函数笔记（自整理）.pdf", status: "ready", progress: 100, chunks: 42, size_hint: "3.1 MB" },
    { doc_id: "d-03", filename: "立体几何典型错题汇编.pdf", status: "ready", progress: 100, chunks: 57, size_hint: "8.8 MB" },
    { doc_id: "d-04", filename: "导数压轴题专题.docx", status: "failed", progress: 35, size_hint: "1.2 MB" },
  ];
  return NextResponse.json({ items });
}
