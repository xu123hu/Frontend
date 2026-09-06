import { NextResponse } from "next/server";

/** Mock：GET /api/v1/student/practice/kp-catalog 知识点目录（含掌握度） */
export async function GET() {
  const items = [
    { kp_code: "G11.conic.ellipse", name: "椭圆及其标准方程", mastery: 0.42 },
    { kp_code: "G11.conic.parabola", name: "抛物线与焦点弦", mastery: 0.63 },
    { kp_code: "G11.conic.hyperbola", name: "双曲线与渐近线", mastery: 0.55 },
    { kp_code: "G11.deriv.tangent", name: "导数 · 切线方程", mastery: 0.35 },
    { kp_code: "G11.solid.vector", name: "立体几何 · 空间向量", mastery: 0.71 },
    { kp_code: "G11.triangle.sine", name: "解三角形 · 正弦定理", mastery: 0.58 },
  ];
  return NextResponse.json({ items });
}
