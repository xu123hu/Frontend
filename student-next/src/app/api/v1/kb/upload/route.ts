import { NextResponse } from "next/server";
import { store } from "../../_store";

const ALLOWED = ["pdf", "png", "jpg", "jpeg", "txt", "md", "docx"];

/** Mock：POST /api/v1/kb/upload（B2-1，multipart，202 + 后台进度轮询） */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ code: "unsupported_file_type", message: "缺少 file 字段", retryable: false }, { status: 415 });
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED.includes(ext)) {
    return NextResponse.json({ code: "unsupported_file_type", message: `不支持的类型 .${ext}`, retryable: false }, { status: 415 });
  }
  // 同名同大小幂等（模拟 sha256 幂等）
  for (const d of store.kbDocs.values()) {
    if (d.title === file.name && d.status === "ready") {
      return NextResponse.json({ document_id: d.id, status: "pending", duplicate: true }, { status: 202 });
    }
  }
  store.kbSeq += 1;
  const id = `d-${Date.now().toString(36)}`;
  store.kbDocs.set(id, {
    id,
    title: file.name,
    status: "pending",
    progress: 0,
    page_count: 0,
    error: null,
    created_at: Date.now(),
  });
  return NextResponse.json({ document_id: id, status: "pending", duplicate: false }, { status: 202 });
}
