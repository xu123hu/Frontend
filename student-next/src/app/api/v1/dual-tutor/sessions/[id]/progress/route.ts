import { NextResponse } from "next/server";
import { store } from "../../../../_store";

/** Mock：PATCH /api/v1/dual-tutor/sessions/{id}/progress（B4-5 进度写回） */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  store.dualSeq.set(`${id}:cur`, Number(body.cur_index ?? 0));
  return NextResponse.json({ ok: true, cur_index: Number(body.cur_index ?? 0) });
}
