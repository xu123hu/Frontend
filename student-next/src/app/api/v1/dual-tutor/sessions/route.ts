import { NextResponse } from "next/server";
import { store } from "../../_store";

/** Mock：POST /api/v1/dual-tutor/sessions（B4-5：Idempotency-Key + 202 pending；cached 语义保留） */
export async function POST(req: Request) {
  const idem = req.headers.get("Idempotency-Key") ?? "";
  if (!idem) {
    return NextResponse.json({ code: "bad_request", message: "缺少 Idempotency-Key 头", retryable: false }, { status: 400 });
  }
  // topic/slide_count/with_figures 在 mock 中不消费（真实实现按 body 生成讲义）
  await req.json().catch(() => null);
  const session_id = `cls-${idem.slice(0, 8) || Date.now().toString(36)}`;
  store.dualSeq.set(session_id, 0);
  // 同键重复请求 → cached
  return NextResponse.json(
    { session_id, task_id: session_id, status: "pending", cached: store.dualSeq.has(session_id) && store.dualSeq.get(session_id)! > 0 },
    { status: 202 },
  );
}
