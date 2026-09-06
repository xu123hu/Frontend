import { NextResponse } from "next/server";

const E = (src: string, dst: string, edge_type: string, weight = 1) => ({ src, dst, edge_type, weight, source: "mock", evidence: null });
const EDGES = [
  E("conic", "curve.def", "prerequisite"),
  E("conic", "conic.ellipse", "composed_of"),
  E("conic", "conic.hyperbola", "composed_of"),
  E("conic", "conic.parabola", "composed_of"),
  E("conic", "conic.line", "related"),
  E("conic", "conic.trajectory", "related"),
  E("conic.ellipse", "conic.ellipse.ecc", "related"),
  E("conic.ellipse", "conic.ellipse.focus", "related"),
  E("conic.hyperbola", "conic.hyperbola.asym", "related"),
  E("conic.parabola", "conic.parabola.focus", "related"),
  E("conic.parabola", "conic.parabola.dir", "related"),
  E("conic.line", "conic.chord", "related"),
  E("conic.trajectory", "curve.def", "prerequisite"),
  E("conic.trajectory", "method.coeff", "prerequisite"),
  E("conic.line", "tool.vector", "prerequisite"),
  E("conic.ellipse.focus", "conic.line", "related"),
  E("conic.parabola.focus", "conic.line", "related"),
  E("conic.hyperbola.asym", "conic.line", "related"),
  E("conic.ellipse", "method.coeff", "prerequisite"),
  E("conic.hyperbola", "method.coeff", "prerequisite"),
  E("conic.parabola", "method.coeff", "prerequisite"),
  E("conic.chord", "conic.ellipse", "related"),
  E("conic.chord", "conic.hyperbola", "related"),
];

/** Mock：GET /api/v1/knowledge-graph/edges（B2-2；node_code 可选过滤） */
export async function GET(req: Request) {
  const nodeCode = new URL(req.url).searchParams.get("node_code");
  const items = nodeCode ? EDGES.filter((e) => e.src === nodeCode || e.dst === nodeCode) : EDGES;
  return NextResponse.json({ items, total: EDGES.length });
}
