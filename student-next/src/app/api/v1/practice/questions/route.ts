import { NextResponse } from "next/server";
import { store } from "../../_store";

/** Mock：GET /api/v1/practice/questions（B4-2：mode=daily|retry|special，三级降级链 mock 为 bank 优先） */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "daily";
  const kpCodes = (url.searchParams.get("kp_codes") ?? "").split(",").filter(Boolean);
  const count = Number(url.searchParams.get("count") ?? 5);

  let pool = [...store.questions];
  if (mode === "retry") {
    const errKps = new Set(store.errors.map((e) => e.kp_code));
    const matched = pool.filter((q) => q.kp_codes.some((k) => errKps.has(k)));
    pool = matched.length > 0 ? matched : pool;
  } else if (mode === "special" && kpCodes.length > 0) {
    const matched = pool.filter((q) => q.kp_codes.some((k) => kpCodes.includes(k)));
    pool = matched.length > 0 ? matched : pool;
  }
  const items = pool.slice(0, count).map((q) => ({
    question_id: q.question_id,
    source: q.source,
    stem_text: q.stem_text,
    stem_image_url: q.stem_image_url,
    images: q.images,
    options: q.options,
    kp_codes: q.kp_codes,
    difficulty: q.difficulty,
    ai_mock: q.source === "ai",
  }));
  return NextResponse.json({ items });
}
