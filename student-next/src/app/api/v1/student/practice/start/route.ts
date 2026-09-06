import { NextResponse } from "next/server";

/** Mock：POST /api/v1/student/practice/start 返回一组题目（题干图片直出） */
export async function POST(req: Request) {
  const { kp_code } = await req.json().catch(() => ({ kp_code: "" }));
  const byKp: Record<string, string> = {
    "G11.conic.parabola": "/mock-assets/q-parabola.svg",
    "G11.deriv.tangent": "/mock-assets/q-derivative.svg",
    "G11.solid.vector": "/mock-assets/q-triangle.svg",
    "G11.triangle.sine": "/mock-assets/q-triangle.svg",
    "G11.conic.hyperbola": "/mock-assets/q-conic.svg",
  };
  const stem = byKp[kp_code] ?? "/mock-assets/q-conic.svg";
  const questions = [
    {
      question_id: "q-1",
      stem_image: stem,
      stem_image_hires: stem,
      options: [
        { key: "A", text: "x²/16 + y²/9 = 1" },
        { key: "B", text: "x²/9 + y²/16 = 1" },
        { key: "C", text: "x²/25 + y²/16 = 1" },
        { key: "D", text: "x²/16 − y²/9 = 1" },
      ],
      answer: "A",
      analysis_image: "/mock-assets/ana-conic.svg",
    },
    {
      question_id: "q-2",
      stem_image: "/mock-assets/q-function.svg",
      stem_image_hires: "/mock-assets/q-function.svg",
      options: [
        { key: "A", text: "(0, 2)" },
        { key: "B", text: "(1, 3)" },
        { key: "C", text: "(−1, 1)" },
        { key: "D", text: "(2, 6)" },
      ],
      answer: "B",
      analysis_image: "/mock-assets/ana-conic.svg",
    },
    {
      question_id: "q-3",
      stem_image: stem,
      stem_image_hires: stem,
      options: [
        { key: "A", text: "y = ±√3x" },
        { key: "B", text: "y = ±(√3/3)x" },
        { key: "C", text: "y = ±2x" },
        { key: "D", text: "y = ±(1/2)x" },
      ],
      answer: "B",
      analysis_image: "/mock-assets/ana-conic.svg",
    },
  ];
  return NextResponse.json({ kp_code, questions });
}
