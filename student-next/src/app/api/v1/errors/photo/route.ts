import { NextResponse } from "next/server";
import { store } from "../../_store";

/** Mock：POST /api/v1/errors/photo（B4-1，multipart：增强在请求内完成，202 返回双图） */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ code: "bad_request", message: "缺少 file 字段", retryable: false }, { status: 400 });
  }
  const note = String(form?.get("note") ?? "");
  // 模拟 OpenCV 增强（请求内同步完成）
  await new Promise((r) => setTimeout(r, 2200));
  store.errors.unshift({
    error_id: `e-${Date.now().toString(36)}`,
    question_text: null,
    original_image_url: "/mock-assets/err-raw.svg",
    enhanced_image_url: "/mock-assets/err-new.svg",
    kp_code: "kp.conic.trajectory",
    error_type: null,
    source_channel: "manual",
    created_at: new Date().toISOString().slice(0, 10),
    error_cause: note || "轨迹方程化简时漏掉 x 的取值范围。",
  });
  const rec = store.errors[0];
  return NextResponse.json(
    { error_id: rec.error_id, original_image_url: rec.original_image_url, enhanced_image_url: rec.enhanced_image_url, kp_code: rec.kp_code },
    { status: 202 },
  );
}
