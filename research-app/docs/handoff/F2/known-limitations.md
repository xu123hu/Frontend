# F2 Known Limitations

> 真实记录「未做」与「为什么未做」——不使用「基本完成」等模糊词。
> 日期：2026-09-04

## 1. 验证覆盖的真实缺口（不是通过项）

- **TC-F02-06 刷新恢复无 E2E**：run 事件脚本存于 MSW 进程内内存库，页面整刷后 `GET /runs/{id}/events` 返回 404，前端据实显示「事件流中断，请重试」（可重试失败）——**不伪造恢复进度**。状态机（恢复入队 + Last-Event-ID 续传 + 不伪造进度）由 sse/import-queue 单测覆盖；端到端恢复依赖真实后端重放（CR-F2 冻结后补 E2E）。在此之前不宣称「恢复链路 E2E 通过」。
- **TC-F02-01/02 三源检索为草案数据**：Crossref/OpenAlex/arXiv 聚合走 CR-F2-07 草案，返回 searchCatalog 种子；无真实第三方 API 调用（真实检索在 Agent 2 冻结端点后接入）。retracted/expression_of_concern/已在库 负向样例在草案层可演练。
- **断网无 E2E 覆盖**（同 F1）：MSW Service Worker 拦截 fetch，Playwright `setOffline(true)` 无法制造 SW 内真实网络故障。当前证据到单元层（network→offline 映射 + 队列暂停）。F5 接真实后端后补。
- **Core Web Vitals 未测量**（同 F1）：MSW 本地 0 延迟下无证据价值，F3 接真实后端与数据量后实测。
- **E2E 浏览器仅 chromium**（F0 遗留）：Firefox 要求 F5 收口。

## 2. 依赖外部裁决的项（阻塞在 Agent 2 / R1）

- **文献域全部端点（CR-F2-01..08）未冻结**：items/collections/annotations/notes/chunks/search/ingest/uploads 均运行在 MSW 契约草案，UI 常驻「契约草案数据源」徽标；runs/SSE/DocumentIR/Evidence 走 M0 冻结契约（design.md §7 明确两类来源）。冻结后需重新生成类型并按真实契约替换 handlers——UI 与用例零改动（isomorphic 约束）。
- **TC-F02-06 真实恢复依赖后端 run 持久化**：刷新后从 GET /runs + SSE 重放属后端职责（M0 已有 ResearchRun 模型）；前端 restore() 已按 persisted runId 接好 Last-Event-ID 续传。
- **证据跳转跨页 bbox**：evidence 高亮仅支持单页 bbox 跳转；跨页多证据的页内坐标对齐待 F4 证据卡接入时复核。

## 3. 有意的设计取舍（记录在案，非遗漏）

- **批注/笔记持久化用 sessionStorage 模拟「服务端留存」**（lit-persistence）：支撑 TC-F02-09 刷新走查与 E2E；真实持久化由后端保证（CR-F2-05）。标签页关闭即失效与真实后端行为一致（会话本可过期）。仅在 MSW 模式生效，Node 测试自动跳过。
- **run 事件模拟器用 setTimeout 推帧**：SSE 流按脚本逐帧推送（含 step.progress 逐页），延迟随页数均摊，走的是 M0 冻结 RunEvent 结构（字段与 m0-schema.gen.d.ts 对齐）——非草案。
- **mock 演练钩子**：search `simulate_unavailable`（单源熔断）、import `timeout` 文件名（首次解析失败可重试、重试后成功）为 dev/test 专用，注释声明非契约语义；用于覆盖 partial 降级与 TC-F02-05 全流程。
- **pdf.js 文本层固定 v4 API**：`TextLayer` 类是 v4 唯一文本层 API（renderTextLayer 已移除），不做不可达的 legacy 兜底（删除死代码，修复记录 #7）。
- **SFC 单文件 > 200 行**（LiteratureBrowser 1297 / SearchDialog 508 / ImportDialog 494）：脚本+模板+样式同文件惯例，逻辑内聚，拆分破坏组件完整性。P3 书面接受。

## 4. F0/F1 遗留且 F2 未处理的项（滚动至后续阶段）

- bundle 报告自动生成、CI/CD、i18n 真实文案、Storybook：维持 F0 声明，F5 收口。
- Playwright webServer 在 CI 预设下 reuseExistingServer 失效：F1 记录在案，CI 接入时统一解决。
- 万条压测的滚动/筛选交互走 E2E 抽样（DOM 行数 < 200 + 检索命中），未做 10k 行的整页滚动性能画像（需真实后端数据才有意义）。

## 5. 明确不在 F2 范围（design.md §1 范围切分声明）

- **黄金链路二步骤 8 与步骤 10（AI 管家回答带支持状态、回答生成侧）属 F4**：F2 交付前置原语（EvidenceRecord 证据卡 + insufficient_evidence 支持状态展示语义）；F4 收口时跑链路二全量回归。
- 翻译/公式保真（F3）、LaTeX、评审、Lean（F3/F4）、管家长任务审批（F4）。

## 6. 不做的事（红线，永久）

- 不渲染 metadata_only/restricted 的占位假 PDF（TC-F02-12 E2E 断言 canvas 数 0）。
- 不显示静态假进度：无 SSE 事件时不显示百分比（单测断言 percent=null）。
- 不静默错画锚点：重锚失败显示 anchored:false 警示态。
- 不引入静默降级：partial 源不可用、无全文、锚点失效均显式呈现（role=alert / Boundary）。
- 不在无证据时宣称性能/可访问性/链路通过（09 §2）。
