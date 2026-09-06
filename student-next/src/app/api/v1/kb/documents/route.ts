import { NextResponse } from "next/server";
import { store } from "../../_store";

/** Mock：GET /api/v1/kb/documents（B2-1，FE 轮询进度；按 elapsed 推进状态） */
export async function GET() {
  const now = Date.now();
  const items = [];
  for (const d of store.kbDocs.values()) {
    if (d.status !== "ready" && d.status !== "failed") {
      const elapsed = (now - d.created_at) / 1000;
      const pct = Math.min(100, Math.round((elapsed / 9) * 100));
      d.progress = pct;
      d.status = pct >= 100 ? "ready" : pct >= 70 ? "embedding" : pct >= 25 ? "parsing" : "pending";
      if (d.status === "ready") d.page_count = 8 + (d.id.length % 40);
    }
    items.push({ ...d });
  }
  items.sort((a, b) => b.created_at - a.created_at);
  return NextResponse.json({ items, total: items.length });
}
