import { NextResponse } from "next/server";
import { store } from "../_store";

/** Mock：GET /api/v1/errors（B4-1 列表：双图 URL + 来源 + 错型） */
export async function GET(req: Request) {
  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 50);
  return NextResponse.json({ items: store.errors.slice(0, limit), total: store.errors.length });
}
