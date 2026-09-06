import { NextResponse } from "next/server";

/** Mock：GET /api/v1/student/error-records 错题列表（封面图直出） */
export async function GET() {
  const items = [
    {
      record_id: "e-01",
      image_url: "/mock-assets/err-conic.svg",
      hires_url: "/mock-assets/err-conic.svg",
      kp: "椭圆 · 离心率",
      created_at: "2026-09-06",
      diagnosis: "把 a² 与 b² 的位置弄反，先判断焦点所在轴。",
    },
    {
      record_id: "e-02",
      image_url: "/mock-assets/err-parabola.svg",
      hires_url: "/mock-assets/err-parabola.svg",
      kp: "抛物线 · 焦点弦",
      created_at: "2026-09-05",
      diagnosis: "焦点弦长公式 |PF| = x + p/2 记混。",
    },
    {
      record_id: "e-03",
      image_url: "/mock-assets/err-vector.svg",
      hires_url: "/mock-assets/err-vector.svg",
      kp: "立体几何 · 空间向量",
      created_at: "2026-09-04",
      diagnosis: "法向量求出后忘记验证方向。",
    },
    {
      record_id: "e-04",
      image_url: "/mock-assets/err-derivative.svg",
      hires_url: "/mock-assets/err-derivative.svg",
      kp: "导数 · 切线方程",
      created_at: "2026-09-02",
      diagnosis: "把“在点 P 处的切线”与“过点 P 的切线”混淆。",
    },
    {
      record_id: "e-05",
      image_url: "/mock-assets/err-triangle.svg",
      hires_url: "/mock-assets/err-triangle.svg",
      kp: "解三角形 · 正弦定理",
      created_at: "2026-08-30",
      diagnosis: "大边对大角判断缺失导致增根。",
    },
    {
      record_id: "e-06",
      image_url: "/mock-assets/err-conic.svg",
      hires_url: "/mock-assets/err-conic.svg",
      kp: "双曲线 · 渐近线",
      created_at: "2026-08-28",
      diagnosis: "渐近线斜率与焦点位置关系记反。",
    },
  ];
  return NextResponse.json({ items });
}
