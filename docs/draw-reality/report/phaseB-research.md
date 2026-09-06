# 阶段 B 调研报告（2026-09-06，独立调研代理核实，全部结论带来源）

## 路线矩阵

| 路线 | 许可证(商用) | 满足需求程度 | 关键缺口 | 集成成本 | 维护状态 |
|---|---|---|---|---|---|
| JSXGraph | MIT OR LGPL-3.0 双许可，商用可选 MIT | 6/10 | 3D 线段交点、截面、遮挡虚线、官方 SVG 导出均无 | 低（核心 ≈1MB） | 活跃 v1.13.2（2026-08-17） |
| GeoGebra | 非商业免费；**商用需付费 License Agreement** | 9/10 | 许可证不可接受（收费教师平台=典型商用） | 中 | 活跃 |
| CindyJS | Apache-2.0 | 3/10 | cindy3d 是绘制型，无依赖式 3D 构造/截面/隐藏线 | 中 | 低速 v0.8.46 |
| Three.js/Babylon | MIT / Apache-2.0 | 2/10 | 约束依赖图、HLR、矢量导出、精确拾取全自建 ≈重写动态几何引擎 | 高 | 极活跃 |
| Desmos | 专有，生产 key 申请制，无 3D API | 2/10 | 闭源不自主 | 低但不自主 | SaaS |
| 网络画板/几何画板 | 商业 SaaS / 桌面软件 | 0-1/10 | 无可嵌入开源引擎 | — | 商业运营 |

## 关键事实

1. **JSXGraph 3D（view3d）**：元素齐全（point3d/line3d/polygon3d/plane3d/polyhedron3d…），point3d 第 4 个 parent 可做棱上 glider；但 `intersectionline3d` 只支持面∩面，**无 3D 两线段交点**；无截面元素；遮挡只有画家算法，**没有"被遮挡变虚线"语义**；screenshot 明确"board 含文本会失败"，无官方导出 SVG API。→ 我方四项核心需求恰好全是它的空白。
   来源：jsxgraph.org/docs/symbols/View3D.html、Point3D.html、IntersectionLine3D.html、JXG.Board.html
2. **GeoGebra 许可证原文**："Any use of GeoGebra for a commercial purpose … requires a special license"，按用途判定，收费平台嵌入算商用。功能虽全（Intersect(Plane,Polyhedron) 截面、Midpoint、exportSVG），法律上不可用。
   来源：geogebra.org/license、geogebra.github.io/docs（Apps API / App Parameters / 命令手册）
3. **Three.js SVGRenderer**：画家算法三角形导出器，无 HLR（官方仓库 "hidden line removal" 0 issue）、无文本。Line raycast 拾取已知不准（issue #23313）。
4. **NL→构图先例**：
   - GeoBuildBench（arXiv:2605.13167）：489 道中文教材几何题 → LLM 生成可执行 DSL 构造程序（与本工作台同构，DSL 设计可参考）
   - tiwe0/GeoChat（Apache-2.0，TS，2026-07 活跃）：对话式生成 GeoGebra 构图
   - Draw it like Euclid（arXiv:2601.09428）：构造步骤序列生成范式
   - arXiv "GeoGebra"+"LLM" 全文 0 篇主流产品落地 → **"一句话→可编辑构造步骤"是品类空位**
5. **中文生态**：网络画板=申请制 SaaS API；几何画板=桌面软件。均不可作为引擎集成。

## 决策

**自建"结构化 3D 几何模型（依赖 DAG）+ 正交轴测 SVG 投影渲染器 + 确定性构造 DSL"**（对应提示词路线 C，渲染层不依赖任何 3D 引擎）：

- 满足全部失败点：任意平行六面体/棱锥/棱柱（顶点命名+依赖变形）、棱上比例点/中点（onEdge/midpoint/ratio def）、两线段交点（参数化解+共面校验）、截面（平面截凸体）、虚线语义（凸体朝向自动 + 手动覆盖）、视角旋转（遮挡实时翻转）、干净带标签 SVG 导出（无网格、标签是 `<text>`）、撤销/级联删除。
- JSXGraph 保留现有 2D 自由画布职责不变（MIT 无碍）；不引入 GeoGebra（许可证）；不引入 Three.js（自建成本相同却多一层依赖）。
- DSL 与 GeoBuildBench 的方向一致；Mode 3（LLM 出计划）时替换确定性解析器为 LLM→同一算子集，接口已留好（IFC-GEOM-02）。
