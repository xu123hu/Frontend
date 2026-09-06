import { NextResponse } from "next/server";
import { store } from "../../_store";

/** Mock：POST /api/v1/practice/submit（B4-2：判分；错题自动入错题本） */
export async function POST(req: Request) {
  const { question_id, answer } = await req.json().catch(() => ({}) as Record<string, unknown>);
  const q = store.questions.find((x) => x.question_id === question_id);
  if (!q) return NextResponse.json({ code: "not_found", message: "题目不存在", retryable: false }, { status: 404 });
  const verdict = String(answer).trim() === q.answer ? "right" : "wrong";
  if (verdict === "wrong") {
    store.errors.unshift({
      error_id: `e-${Date.now().toString(36)}`,
      question_text: q.stem_text,
      original_image_url: q.stem_image_url,
      enhanced_image_url: q.stem_image_url,
      kp_code: q.kp_codes[0] ?? "kp.general",
      error_type: null,
      source_channel: "auto_judge",
      created_at: new Date().toISOString().slice(0, 10),
      error_cause: `练习答错（选了 ${answer}），正确答案：${q.answer}。`,
    });
    return NextResponse.json({ verdict, error_id: store.errors[0].error_id });
  }
  return NextResponse.json({ verdict });
}
