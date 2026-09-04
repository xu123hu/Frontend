# F3 Known Limitations

> 真实记录「未做」与「为什么未做」——不使用「基本完成」等模糊词。
> 日期：2026-09-04

## 1. 验证覆盖的真实缺口（不是通过项）

- **TC-F03-06 导出译文无 E2E**：导出下载端点在 mock 环境为草案边界。前端原语（FidelityReport 组件含逐项比较 + failed_blocks；provenance 字段结构对齐 02 §5.3 Artifact）已交付，但**真实导出**由后端生成 Artifact（translation）+ provenance 链（parser/translation_model 版本/源文档哈希）并返回签名 URL——CR-F3-05 冻结后补 E2E，此前不宣称该项完成。
- **编译/翻译的真实后端执行**：Tectonic 编译与 LLM 翻译均由 Agent 2+ 承担；前端交付 UI + run 编排 + mock 演练。真实编译产物（PDF/日志/引擎版本）在接后端后由 Artifact 承载。
- **断网无 E2E 覆盖**（同 F1/F2）：MSW Service Worker 拦截 fetch，Playwright `setOffline(true)` 无法制造 SW 内真实网络故障。F5 接真实后端后补。
- **Core Web Vitals 未测量**（同 F1/F2）：MSW 本地 0 延迟下无证据价值，F5 实测。
- **E2E 浏览器仅 chromium**（F0 遗留）：Firefox 要求 F5 收口。
- **屏幕阅读器对 CodeMirror 编辑器**：编辑器为富文本 DOM（CodeMirror 有 contenteditable 语义），真实 NVDA/VoiceOver 朗读抽样未做（F5 手动完成）。

## 2. 依赖外部裁决的项（阻塞在 Agent 2 / R1）

- **写作/翻译域端点（CR-F3-01..06）未冻结**：manuscripts/files/suggestions/citations/translation-units/fidelity-report 均运行在 MSW 契约草案，UI 常驻「契约草案数据源」徽标；runs/SSE/Artifact/DocumentIR/VerificationRecord/CitationRecord 走 M0 冻结契约。冻结后按真实契约替换 handlers——UI 与用例零改动（isomorphic 约束）。
- **AI diff 的生成侧**：`POST /suggestions`（AI 改写建议生成）为草案端点，种子 3 条建议演示四要素；真实生成由 run_type=writing 工作流产出（F4 管家接真实运行后收口）。
- **证据检查回答生成**：TC-F04-06 的「请求补证」UI 入口已交付，生成侧（AI 管家回答带支持状态）属 F4。

## 3. 有意的设计取舍（记录在案，非遗漏）

- **编译失败演练钩子（mock_scenario）**：missing_resource/unsafe_command 为 dev/test 专用，非契约端点（与 F2 simulate_unavailable 同性质）；用于覆盖 06 §6 步骤 6 两类失败路径，断言结构化错误定位 + 旧 PDF 保留。
- **KaTeX v-html**：公式渲染经 `renderToString(throwOnError:false)` 转义；latex 源来自 DocumentIR（受信文档内容）而非任意用户输入；局部 eslint-disable + 注释声明风险受控。替代方案（自定义 Vue 渲染器包装 KaTeX DOM）成本高于收益。
- **CodeMirror 高亮用 legacy-modes stex**（MIT）：不采用 AGPL 的 codemirror-lang-latex（f3-benchmark §3.1 决策）；补全/环境闭合自研（引用 key 来自已核验 CitationRecord）。
- **编译进度由 GET /runs/:id 轮询（1.2s）**：run 详情端点从 SSE 事件脚本推导状态（进度来自事件流非静态）；真实实现应消费 SSE 事件流（F2 模式）或后端补发。轮询为草案端点妥协，事件脚本与前端解耦。
- **SFC 单文件 > 200 行**（Writing.vue 648）：脚本逻辑（项目/文稿/文件/保存/引用/diff/编译/证据）内聚，拆分破坏工作台完整性。P3 书面接受。

## 4. F0/F1/F2 遗留且 F3 未处理的项（滚动至后续阶段）

- bundle 报告自动生成、CI/CD、i18n 真实文案、Storybook：维持 F0 声明，F5 收口。
- TC-F02-06 刷新恢复 E2E（mock 无持久化 run 状态）：F2 声明，待 CR-F2 冻结后补。
- 万条压测整页滚动性能画像：F2 声明，F5 统一。

## 5. 明确不在 F3 范围（design.md §1 范围切分声明）

- 黄金链路三/四步骤 8/10（AI 管家回答带支持状态、回答生成侧）属 F4：F3 交付前置原语（diff 面板、保真报告、证据检查入口）；F4 收口时跑链路三/四全量回归。
- 多人协同编辑、真实 SyncTeX 双向定位（草案层用 block/行级定位代替）、完整 LaTeX lint（由后端编译日志承担）。

## 6. 不做的事（红线，永久）

- 不渲染未核验引用为可插入候选；不自由生成 `\cite` key。
- 不输出「整篇翻译成功」总标记除非全部保真一致（公式冲突块标记 + 保留原公式）。
- 不静默丢弃 AI 建议：拒绝项显式状态 + 不写入源文件（HumanDecision 审计语义）。
- 不显示静态假进度：编译/翻译进度来自 run 状态推导（事件脚本）。
- 不引入静默降级：断网/未冻结端点/失败均显式呈现（role=alert / Boundary / 数据源徽标）。
- 不在无证据时宣称性能/可访问性/链路通过（09 §2）。
