import { NextResponse } from "next/server";

/** Mock：GET /api/v1/ai/healthz（B1-1 健康探针） */
export async function GET() {
  return NextResponse.json({
    ok: true,
    provider: "mock",
    model: "mock-tutor",
    pools: { chat: { limit: 50, in_flight: 0 } },
    llm_probe: { ok: true, latency_ms: 12, checked_at: new Date().toISOString() },
  });
}
