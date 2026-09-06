import { NextResponse } from "next/server";

/** Mock：GET /api/v1/agent/sessions 会话列表 */
export async function GET() {
  const now = Date.now();
  const items = [
    { session_id: "s-01", title: "椭圆的标准方程 · 引导解题", updated_at: now - 3600_000 },
    { session_id: "s-02", title: "举一反三：抛物线变式 3 道", updated_at: now - 7200_000 },
    { session_id: "s-03", title: "空间向量建系技巧", updated_at: now - 86_400_000 },
    { session_id: "s-04", title: "错题重练：导数切线问题", updated_at: now - 2 * 86_400_000 },
    { session_id: "s-05", title: "三角恒等变换公式串讲", updated_at: now - 3 * 86_400_000 },
  ];
  return NextResponse.json({ items });
}
