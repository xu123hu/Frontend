import { NextResponse } from "next/server";
import { store } from "../../_store";

/** Mock：GET /api/v1/errors/{id}（B4-1 详情：题面文本、双图、kp、错因） */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rec = store.errors.find((e) => e.error_id === id);
  if (!rec) return NextResponse.json({ code: "not_found", message: "错题不存在", retryable: false }, { status: 404 });
  return NextResponse.json(rec);
}
