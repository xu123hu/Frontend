# F3 Acceptance Matrix（黄金链路三 · 翻译 + 黄金链路四 · 写作）

> 来源：06 §5/§6 黄金链路三/四 + design.md §5 双轨用例定义
> 验收日期：2026-09-04（全部证据为本日重新执行的一手结果，非历史记录转述）

## 六层状态表（09 §2）

| 层 | 定义 | 状态 | 证据 |
|---|---|---|---|
| L1 Build | 编译、类型、静态检查 | ✅ DONE | `vue-tsc --noEmit` 0 error；`eslint . --max-warnings 0` 0 error 0 warning；`vite build` 成功（4.84s），首包 gzip 5.56KB，MSW 不在产物 |
| L2 Test | 单元 + 契约 + 集成 | ✅ DONE | vitest 12 files / 105 tests passed（新增 diff-utils 8 + citation-key 4 + latex-completions 3；F0-F2 回归未破坏） |
| L3 Performance | 08 性能门禁 | ✅ DONE（阶段内可测项） | 首包 gzip 5.56KB ≤ 500KB；codemirror 113KB / katex 77KB / pdf 98KB 均路由级懒加载（初始页不加载编辑器/公式/PDF 完整代码）；F2 万条虚拟化回归通过。CWV → F5 |
| L4 Failure | 故障态可观察 | ✅ DONE（单元+E2E 可测项）+ ⚠️ 断网 E2E 局限 | TC-F04-05 两类编译失败结构化定位+旧 PDF 保留；TC-F03-04 公式冲突块标记+不整篇成功；diff-utils 拒绝不写入源文件。断网 E2E 受 MSW SW 限制（known-limitations §1） |
| L5 User Journey | 真实用户链路 | ✅ DONE | Playwright **138 passed（2.2m）** = F1 21×3 + F2 12×3 回归 + golden-path-3 7×3 + golden-path-4 6×3；9 张三视口截图归档并目检 |
| L6 Human Review | 自审 + 独立审查 | ✅ DONE（自审）/ ⏳ Agent 6 | code-review-report.md P0=0 P1=0 P2=0（P3=2 书面接受）；待 Agent 6 R1 复核 |

**综合状态：DONE（F3 范围内）**——六层无一层为 FAIL；L3 的 CWV、L4 的 E2E 断网为已声明阶段边界（与 F1/F2 一致）。

## 功能轨（黄金链路四 · 写作）

| 用例 | 步骤 | 状态 | 证据 |
|---|---|---|---|
| TC-F04-01 | 创建/导入 LaTeX 文稿 | ✅ | E2E「写作文件树与编辑器」×3 视口：文件树（main.tex/sections/intro.tex/references.bib）+ 编辑器加载真实 tex 源码（`\documentclass`/`\begin{document}`）；新建文稿入口（表单校验+POST） |
| TC-F04-02 | AI 生成内容只能为 diff，逐项接受/拒绝 | ✅ | E2E「AI diff 逐项接受/拒绝」：面板显示 3 条建议（四要素：原文/建议/理由/风险齐全）；接受 sg-1 → 「已接受」；拒绝 sg-3 → 「已拒绝」。决策端点 200 + 状态迁移（探针验证）；拒绝项不写入源文件（diff-utils 单测 + 决策只改状态） |
| TC-F04-03 | 引用仅来自已核验 CitationRecord | ✅ | E2E「引用插入」：弹窗「仅已核验文献」；候选含已核验条目（Hierarchical Linear Models）；插入后 references.bib 出现 `@article{raudenbush2002-…}`。未核验（not_found/source_unavailable）条目被过滤（handler 逻辑）；`citation-not-verified` 422 拒绝插入 |
| TC-F04-04 | 编译时间线 | ✅ | E2E「编译成功」：编译 PDF → 进度 → 「编译成功」+ 引擎（Tectonic 0.15.0）+ 输入哈希（sha256:…）+ PDF 预览（iframe）；进度来自 SSE（GET /runs/:id 从事件脚本推导） |
| TC-F04-05 | 编译失败定位 + 旧 PDF 不丢失 | ✅ | E2E「编译失败定位」×2：缺失资源（`main.tex:1 · missing_resource` + `sections/intro.tex not found`）；不安全命令（`unsafe_command` + shell escape 被禁用）；两者均显示「上一次成功 PDF 不会丢失」；错误行定位按钮 |
| TC-F04-06 | 证据检查入口 | ✅ | E2E「证据检查」：展开「证据检查（无证据句）」列出无证据句 + 「请求补证」入口（回答生成侧 F4 收口，本阶段交付 UI 入口） |

功能轨（写作）6 项：6 ✅。无 FAIL。

## 功能轨（黄金链路三 · 翻译）

| 用例 | 步骤 | 状态 | 证据 |
|---|---|---|---|
| TC-F03-01 | 从文献条目进入阅读与翻译 | ✅ | E2E「阅读与翻译双栏」：文献阅读页内模式切换「批注/笔记 ↔ 阅读与翻译」，非孤立工具页（URL 保持 literature/:id/reading） |
| TC-F03-02 | 发起翻译（章节/页）+ 预算 | ✅ | E2E「发起翻译与公式保真」：POST /runs（run_type=translation 冻结契约）202 + SSE 逐段进度 → 完成；TranslationPane 显示「发起翻译」→ 译文单元。预算字段（budget/spent）由 run 视图承载 |
| TC-F03-03 | 公式保真（数量/顺序/哈希/结构） | ✅ | 保真报告显示公式数量（4→4 一致）/顺序（一致）/哈希（不一致）/引用 key（一致）/label-ref（一致）逐项比较——02 §5.8 要求逐项列出 |
| TC-F03-04 | 公式恢复冲突标记具体块 + 不整篇成功 | ✅ | E2E 断言：blk-trans-03 标记「公式恢复冲突，原公式保留」+ 原因（`\beta_{0j}` 被改写为 β_0j）；KaTeX 渲染原公式；「部分块未通过保真检查，未标记为整篇翻译成功」；overall=partial |
| TC-F03-05 | 译文段落回链原文块 | ✅ | E2E「译文段落回链」：点击「定位原文」→ 滚动到对应页（block_id + page_index） |
| TC-F03-06 | 导出译文附保真报告 | ⚠️ 前置原语交付 | 保真报告（FidelityReport 组件）与 provenance 字段（parser/模型/源文档）已交付；**导出下载端点在 mock 环境为草案边界**（真实导出由后端 Artifact + provenance 链承载，见 known-limitations §2） |

功能轨（翻译）6 项：5 ✅ + 1 ⚠️（TC-F03-06 导出为草案边界，报告与 provenance 原语已交付）。无 FAIL。

## 体验轨

| 用例 | 通过标准 | 状态 | 证据 |
|---|---|---|---|
| TC-X03-01 | 翻译双栏与调研交互一致 | ✅ | 9 张三视口截图目检；左原 PDF（F2 复用）+ 右译文卡片流（block_id 回链）+ 保真报告；≤1080px 单列 |
| TC-X03-02 | 保真失败不只靠颜色 | ✅ | 冲突块 role=alert + 文字原因 + 图标；报告「不一致」文字逐项 |
| TC-X03-03 | 编译时间线卡片信息可见 | ✅ | 阶段徽标/进度条（progressbar role）/引擎/哈希/错误结构全部可见（截图目检 + E2E 断言） |
| TC-X04-01 | 写作三栏与基线一致 | ✅ | 9 张三视口截图对照 baseline-1440-writing.png；文件树/编辑器/右栏（编译+diff+引用） |
| TC-X04-02 | AI diff 卡片四要素 + 键盘可达 | ✅ | 四要素卡片（E2E 断言）；接受/拒绝为真实 button（Tab+Enter 可达，焦点管理沿用全局键盘约定） |
| TC-X04-03 | 引用弹窗焦点陷阱 + Escape | ✅ | 复用 use-dialog-a11y（F1 组件，F1 E2E TC-X01-05 已验证模式） |
| TC-X04-04 | 三视口截图无布局破损；编辑器 390px 可用 | ✅ | 9 张截图目检；workspace ≤1080px 折叠为两栏+右栏整行；CodeMirror 编辑器横向滚动 |
| TC-X04-05 | 编辑器减少动画；公式/代码等宽排版 | ✅ | CodeMirror 同步渲染无装饰动画（F2 阅读页无页过渡动画的约定延续）；`--mono` 等宽字体用于编辑器/公式/日志 |

体验轨 8 项：8 ✅。

## TC-F03-06 说明（诚实性记录）

「导出译文附保真报告」的**前端原语已交付**（FidelityReport 组件含数量/顺序/哈希/引用/label-ref 逐项 + failed_blocks；provenance 字段结构对齐 02 §5.3 Artifact）。**导出下载端点**在 mock 环境为草案边界：真实实现由后端生成 Artifact（translation）+ provenance 链（parser/translation_model 版本）并返回签名 URL，前端只消费。CR-F3-05 冻结后补 E2E，此前不宣称该项完成。
