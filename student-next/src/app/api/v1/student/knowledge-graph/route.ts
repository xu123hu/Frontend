import { NextResponse } from "next/server";

/** Mock：GET /api/v1/student/knowledge-graph 圆锥曲线章节图谱（cytoscape 渲染） */
export async function GET() {
  const nodes = [
    { kp_code: "conic", name: "圆锥曲线", mastery: 0.55 },
    { kp_code: "ellipse", name: "椭圆标准方程", mastery: 0.42 },
    { kp_code: "ellipse-ecc", name: "椭圆离心率", mastery: 0.38 },
    { kp_code: "ellipse-focus", name: "椭圆焦点三角形", mastery: 0.47 },
    { kp_code: "hyperbola", name: "双曲线标准方程", mastery: 0.55 },
    { kp_code: "hyperbola-asym", name: "双曲线渐近线", mastery: 0.51 },
    { kp_code: "hyperbola-ecc", name: "双曲线离心率", mastery: 0.44 },
    { kp_code: "parabola", name: "抛物线标准方程", mastery: 0.63 },
    { kp_code: "parabola-focus", name: "抛物线焦点弦", mastery: 0.57 },
    { kp_code: "parabola-dir", name: "抛物线准线", mastery: 0.6 },
    { kp_code: "line-conic", name: "直线与圆锥曲线", mastery: 0.36 },
    { kp_code: "chord-mid", name: "中点弦问题", mastery: 0.4 },
    { kp_code: "trajectory", name: "轨迹方程", mastery: 0.49 },
    { kp_code: "def-1", name: "曲线与方程定义", mastery: 0.72 },
    { kp_code: "vec-tool", name: "向量工具", mastery: 0.78 },
    { kp_code: "solve-support", name: "待定系数法", mastery: 0.69 },
  ];
  const E = (source: string, target: string, relation: string) => ({ source, target, relation });
  const edges = [
    E("conic", "def-1", "前置"),
    E("conic", "ellipse", "包含"),
    E("conic", "hyperbola", "包含"),
    E("conic", "parabola", "包含"),
    E("conic", "line-conic", "综合"),
    E("conic", "trajectory", "综合"),
    E("ellipse", "ellipse-ecc", "延伸"),
    E("ellipse", "ellipse-focus", "延伸"),
    E("hyperbola", "hyperbola-asym", "延伸"),
    E("hyperbola", "hyperbola-ecc", "延伸"),
    E("parabola", "parabola-focus", "延伸"),
    E("parabola", "parabola-dir", "延伸"),
    E("line-conic", "chord-mid", "延伸"),
    E("trajectory", "def-1", "依赖"),
    E("trajectory", "solve-support", "依赖"),
    E("line-conic", "vec-tool", "依赖"),
    E("ellipse-focus", "line-conic", "关联"),
    E("parabola-focus", "line-conic", "关联"),
    E("hyperbola-asym", "line-conic", "关联"),
    E("ellipse", "solve-support", "依赖"),
    E("hyperbola", "solve-support", "依赖"),
    E("parabola", "solve-support", "依赖"),
    E("chord-mid", "ellipse", "关联"),
    E("chord-mid", "hyperbola", "关联"),
  ];
  return NextResponse.json({ chapter: "圆锥曲线", nodes, edges });
}
