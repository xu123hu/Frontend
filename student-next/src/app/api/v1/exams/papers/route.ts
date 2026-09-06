import { NextResponse } from "next/server";

/** Mock：GET /api/v1/exams/papers（B4-3 卷库列表） */
export async function GET() {
  const items = [
    { paper_id: "p-seed1", title: "圆锥曲线单元测试（一）", year: 2026, question_count: 4, source_import_id: null },
    { paper_id: "p-seed2", title: "函数与导数周测（第 3 周）", year: 2026, question_count: 3, source_import_id: null },
    { paper_id: "p-seed3", title: "期中模拟卷（理科数学）", year: 2025, question_count: 4, source_import_id: "imp-01" },
  ];
  return NextResponse.json({ items });
}
