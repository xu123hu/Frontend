import { NextResponse } from "next/server";
import { store } from "../../../_store";

/** Mock：GET /api/v1/kb/documents/{id}（B2-1 详情 + chunk/image 计数） */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = store.kbDocs.get(id);
  if (!doc) return NextResponse.json({ code: "not_found", message: "文档不存在", retryable: false }, { status: 404 });
  const ready = doc.status === "ready";
  return NextResponse.json({
    ...doc,
    chunk_count: ready ? 30 + (id.length * 7) % 60 : 0,
    image_count: ready ? (id.length % 6) + 1 : 0,
  });
}
