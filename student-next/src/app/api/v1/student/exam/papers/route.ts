import { NextResponse } from "next/server";

/** Mock：GET /api/v1/student/exam/papers 试卷列表 */
export async function GET() {
  const items = [
    { paper_id: "p-01", title: "圆锥曲线单元测试（一）", question_count: 8, duration_min: 60 },
    { paper_id: "p-02", title: "函数与导数周测（第 3 周）", question_count: 6, duration_min: 45 },
    { paper_id: "p-03", title: "期中模拟卷（理科数学）", question_count: 12, duration_min: 90 },
  ];
  return NextResponse.json({ items });
}
