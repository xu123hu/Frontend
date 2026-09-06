import { NextResponse } from "next/server";

/** Mock：POST /api/v1/student/practice/submit 判分 */
export async function POST(req: Request) {
  const { question_id, answer } = await req.json().catch(() => ({ question_id: "", answer: "" }));
  // mock 判定：选 A 或 B 算对（便于演示对/错两种反馈）
  const correct = answer === "A" || answer === "B";
  return NextResponse.json({
    question_id,
    answer,
    correct,
    standard_answer: "A",
    analysis_image: "/mock-assets/ana-conic.svg",
    comment: correct ? "思路正确，注意书写规范。" : "提示：先定焦点位置，再定分母大小。",
  });
}
