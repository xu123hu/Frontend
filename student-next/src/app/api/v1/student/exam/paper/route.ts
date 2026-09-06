import { NextResponse } from "next/server";

/** Mock：GET /api/v1/student/exam/paper?id=p-01 试卷详情（题目图片直出） */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "p-01";
  const titles: Record<string, string> = {
    "p-01": "圆锥曲线单元测试（一）",
    "p-02": "函数与导数周测（第 3 周）",
    "p-03": "期中模拟卷（理科数学）",
  };
  const questions = [
    {
      question_id: id + "-q1",
      stem_image: "/mock-assets/q-conic.svg",
      options: [
        { key: "A", text: "x²/16 + y²/9 = 1" },
        { key: "B", text: "x²/9 + y²/16 = 1" },
        { key: "C", text: "x²/25 + y²/16 = 1" },
        { key: "D", text: "x²/16 − y²/9 = 1" },
      ],
    },
    {
      question_id: id + "-q2",
      stem_image: "/mock-assets/q-parabola.svg",
      options: [
        { key: "A", text: "(1, 0)" },
        { key: "B", text: "(2, 0)" },
        { key: "C", text: "(0, 1)" },
        { key: "D", text: "(1/2, 0)" },
      ],
    },
    {
      question_id: id + "-q3",
      stem_image: "/mock-assets/q-function.svg",
      options: [
        { key: "A", text: "单调递增" },
        { key: "B", text: "单调递减" },
        { key: "C", text: "先增后减" },
        { key: "D", text: "先减后增" },
      ],
    },
    {
      question_id: id + "-q4",
      stem_image: "/mock-assets/q-triangle.svg",
      options: [
        { key: "A", text: "√6/3" },
        { key: "B", text: "√3/2" },
        { key: "C", text: "√6/6" },
        { key: "D", text: "1/2" },
      ],
    },
  ];
  return NextResponse.json({
    paper_id: id,
    title: titles[id] ?? "试卷",
    duration_min: 60,
    question_count: questions.length,
    questions,
  });
}
