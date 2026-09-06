import { NextResponse } from "next/server";

const NODES = [
  { id: "conic", code: "conic", name: "圆锥曲线", path: "高中数学/圆锥曲线", source: "mock" },
  { id: "conic.ellipse", code: "conic.ellipse", name: "椭圆标准方程", path: "高中数学/圆锥曲线/椭圆", source: "mock" },
  { id: "conic.ellipse.ecc", code: "conic.ellipse.ecc", name: "椭圆离心率", path: "高中数学/圆锥曲线/椭圆/离心率", source: "mock" },
  { id: "conic.ellipse.focus", code: "conic.ellipse.focus", name: "椭圆焦点三角形", path: "高中数学/圆锥曲线/椭圆", source: "mock" },
  { id: "conic.hyperbola", code: "conic.hyperbola", name: "双曲线标准方程", path: "高中数学/圆锥曲线/双曲线", source: "mock" },
  { id: "conic.hyperbola.asym", code: "conic.hyperbola.asym", name: "双曲线渐近线", path: "高中数学/圆锥曲线/双曲线", source: "mock" },
  { id: "conic.parabola", code: "conic.parabola", name: "抛物线标准方程", path: "高中数学/圆锥曲线/抛物线", source: "mock" },
  { id: "conic.parabola.focus", code: "conic.parabola.focus", name: "抛物线焦点弦", path: "高中数学/圆锥曲线/抛物线", source: "mock" },
  { id: "conic.parabola.dir", code: "conic.parabola.dir", name: "抛物线准线", path: "高中数学/圆锥曲线/抛物线", source: "mock" },
  { id: "conic.line", code: "conic.line", name: "直线与圆锥曲线", path: "高中数学/圆锥曲线", source: "mock" },
  { id: "conic.chord", code: "conic.chord", name: "中点弦问题", path: "高中数学/圆锥曲线", source: "mock" },
  { id: "conic.trajectory", code: "conic.trajectory", name: "轨迹方程", path: "高中数学/圆锥曲线", source: "mock" },
  { id: "curve.def", code: "curve.def", name: "曲线与方程定义", path: "高中数学/解析几何", source: "mock" },
  { id: "tool.vector", code: "tool.vector", name: "向量工具", path: "高中数学/工具", source: "mock" },
  { id: "method.coeff", code: "method.coeff", name: "待定系数法", path: "高中数学/方法", source: "mock" },
];

/** Mock：GET /api/v1/knowledge-graph/nodes（B2-2；code_prefix/q/limit） */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const prefix = sp.get("code_prefix") ?? "";
  const q = sp.get("q") ?? "";
  const limit = Number(sp.get("limit") ?? 50);
  const items = NODES.filter(
    (n) => (!prefix || n.code.startsWith(prefix)) && (!q || n.name.includes(q)),
  ).slice(0, limit);
  return NextResponse.json({ items, total: NODES.length });
}
