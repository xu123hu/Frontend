# 科研端用户操作链路（Phase 1）

> 编写日期：2026-09-03｜负责智能体：Agent 1（前端与体验）
> 工作分支：`research/agent-01-frontend`｜文档位置：`docs/research/user-journeys.md`
> 状态：F0 阶段链路设计稿，与 Phase 0 调研基线对齐

---

## 1. 链路总体设计原则

- 每条链路从"新用户起点"出发，不预置任何浏览器 localStorage、Pinia 状态或后端会话。
- 链路必须能完成"创建项目 → 一项工作 → 留下可恢复产物"的全闭环，不能停在中间状态。
- 链路网络无死链：每个动作要么能前进到下一视图，要么显式失败并提示恢复路径。
- 链路中每个 AI 触点都遵循 04 §3.4 提示注入防护：模型不能直接覆盖文稿、不能跳过审批、不能把假设写成事实。
- 链路中"机器失败"必须显示降级标签（`unavailable` / `local_engine` / `browser_local` / `formal_pending`），与 M4 §10 一致。

---

## 2. 六条黄金链路（来源：06 §3–§8）

### 2.1 黄金链路 1：新用户建立科研项目

**用户目标**：首次登录后建立课题，进入与项目关联的科研工作区，并理解 AI 管家当前拥有哪些上下文与权限。

| 步骤 | 用户动作 | 前端状态 | 证据/后端写入 |
|---|---|---|---|
| 1.1 | 打开 `/research/login`，输入手机号 + 验证码 | auth.otp.loading → success | OIDC 颁发短期 access token（HttpOnly cookie 持有 refresh token） |
| 1.2 | 跳转 `/research/home` | home.loading → loaded | `GET /api/research/v1/projects?limit=20`；`GET /api/research/v1/runs?status=active` |
| 1.3 | 点击"新建科研项目" | modal.open | — |
| 1.4 | 填写：项目名、类型、研究问题、学科、语言、引用格式、严谨度 | form.dirty | `POST /api/research/v1/projects` 携带 `Idempotency-Key` |
| 1.5 | 创建成功，跳转 `/research/projects/:id` | project.loading → loaded | 写入 `Project` 行 + `ResearchQuestion`；AI 管家球体状态由 `idle` 变为 `idle(项目上下文已装配)` |
| 1.6 | 打开个人中心，修改"界面语言"和"通知偏好" | preferences.dirty → saved | `PATCH /api/research/v1/users/me/preferences` |
| 1.7 | 切换到另一个租户用户访问该 URL | forbidden.tenant | `403 Problem Details`，响应不泄露项目存在性 |
| 1.8 | 刷新页面 | state.rehydrate | TanStack Query 自动重新拉取；项目状态保持 |

**断点/恢复**：

- 创建过程中网络失败 → 表单保持输入，按钮变 retry；不再发新请求前显示 `network_error`，绝不静默回退到 fake 成功。
- 切换租户访问 → 显示"项目不存在或无权访问"且不区分两种情况。
- 浏览器关闭后重开 → 短期 token 仍在有效期；refresh token 自动续期。

### 2.2 黄金链路 2：检索、导入、阅读与证据定位

**用户目标**：从真实学术元数据源检索论文，导入项目文献库，阅读 PDF，并能从 AI 回答中的主张回到原文位置。

| 步骤 | 用户动作 | 前端状态 | 证据/后端写入 |
|---|---|---|---|
| 2.1 | 在文献库输入标题/作者/DOI | search.loading | `GET /api/research/v1/references/search?q=...&source=openalex,crossref,arxiv` |
| 2.2 | 查看结果列表 | list.loaded | 区分元数据源；显示开放状态（OA / restricted / metadata_only） |
| 2.3 | 打开条目详情 | detail.loaded | 显示作者、版本、verified_sources、撤稿状态 |
| 2.4 | 导入到项目文献库 | import.queued | `POST /api/research/v1/items` 触发后台解析；返回 `run_id` |
| 2.5 | 后台解析运行 | run.running | SSE 推 `RunEvent`，列表显示 `progress: 0-100%` |
| 2.6 | 关闭并重新打开页面 | run.rehydrate | `GET /api/research/v1/runs/:id` 服务端补发；TanStack Query 缓存恢复 |
| 2.7 | 与 AI 管家对话问"这篇论文的核心定理是什么" | agent.thinking → answered | 答复中每个 `ClaimRecord` 带 `support_status` 与证据卡 |
| 2.8 | 点击引用/证据卡 | reader.locate | PDF 阅读器跳转至 `page_index + bbox`，批注高亮 |
| 2.9 | 输入一个原文不支持的问题 | agent.refuse | 返回 `support_status=insufficient_evidence` + 检索边界 |
| 2.10 | 故意输入错误 DOI | search.failed | 标记 `not_found` 且不静默替换为近似结果 |

**断点/恢复**：

- 解析失败 → 任务状态 `failed`，不删除已成功识别的引用与元数据。
- SSE 断线 → `Last-Event-ID` 重连，服务端按 `sequence` 补发，不重复扣费。
- 错误 DOI 检索 → 标记 `not_found`，不与"未找到全文"混淆。

### 2.3 黄金链路 3：论文阅读与公式保真翻译

**用户目标**：在同一工作区对照原文和中文译文，公式、引用和图表锚点保持稳定。

| 步骤 | 用户动作 | 前端状态 | 证据/后端写入 |
|---|---|---|---|
| 3.1 | 从文献条目进入"阅读与翻译" | reading.loaded | 进入 `/research/literature/:id/reading` |
| 3.2 | 选择章节发起翻译 | translation.queued | `POST /api/research/v1/runs` with `run_type=translation` |
| 3.3 | 后台翻译运行 | run.running(progress) | SSE 推送；UI 显示预算 |
| 3.4 | 公式保留与对比 | formulas.passed/failed | 翻译返回后 `GET /runs/:id/artifacts` 拿保真报告 |
| 3.5 | 点击公式/引用跳回原文 | reader.locate | 通过 `block_id` 定位 |
| 3.6 | 制造一个公式恢复冲突 | formulas.partial | 段落标记 `partially_translated`，原公式保留并附失败原因 |
| 3.7 | 导出译文 | export.succeeded | `Artifact` + provenance 链，含原始 DocumentIR 与翻译模型版本 |

**断点/恢复**：

- 公式保真失败 → 不输出"翻译成功"总标记；导出文件附"翻译保真报告.pdf"。
- 公式识别不确定 → 同时显示多个候选 + 原始区域截图，不静默选一。
- 翻译过程 Worker 重启 → Temporal 从上次 checkpoint 继续，UI 显示 `paused → resumed`。

### 2.4 黄金链路 4：引用可靠的 LaTeX 写作

**用户目标**：把证据支持的内容和文献引用插入 LaTeX 文稿，完成可重现编译，并理解错误。

| 步骤 | 用户动作 | 前端状态 | 证据/后端写入 |
|---|---|---|---|
| 4.1 | 在项目内创建/导入 LaTeX 文稿 | editor.loaded | 进入 `/research/projects/:id/writing/:manuscriptId` |
| 4.2 | AI 给出排版建议 | suggestion.diff | 显示为 diff；用户逐项接受/拒绝 |
| 4.3 | 从项目文献库插入引用 | insert.citation | 引用来自已核验 `CitationRecord`；插入 `\cite{key}` 并更新 `references.bib` |
| 4.4 | 启动编译 | compile.queued | `POST /api/research/v1/runs` with `run_type=latex_build` |
| 4.5 | 关闭页面 | continue.background | Temporal 继续运行；UI 重连后恢复 |
| 4.6 | 编译成功 | compile.succeeded | 显示 PDF、日志、引擎版本、输入哈希 |
| 4.7 | 制造缺失资源/不安全命令 | compile.failed | 精确定位文件/行/命令；上次成功 PDF 不丢失 |
| 4.8 | 从文稿主张打开证据检查 | claim.audit | 列出无证据句 → 用户选择"补证"或"降级措辞" |

**断点/恢复**：

- Worker 重启 → Temporal 从最近 successful compile 之后的步骤继续，PDF 文件可重下。
- AI diff 中用户拒绝某条 → 写入 `HumanDecision` 审计，不影响其他 diff。
- 公式/引用错误 → 在 PDF 上叠加橙色标记，附原 LaTeX 行号。

### 2.5 黄金链路 5：数学评审与内置 Lean

**用户目标**：作者或评审者检查论文中的关键数学陈述，看到分层验证结果，但不会被误导为整篇论文已被证明正确。

| 步骤 | 用户动作 | 前端状态 | 证据/后端写入 |
|---|---|---|---|
| 5.1 | 进入评审 → 选择"作者视图"或"评委视图" | review.mode-selected | 权限由后端裁剪，前端仅渲染可见字段 |
| 5.2 | 系统提取待审公式/定理 | extraction.review | 用户可修正提取结果 |
| 5.3 | 查看分层验证结果 | verify.layers | L0 语法 / L1 定义域 / L2 符号 / L3 数值 / L4 反例 / L5 Lean |
| 5.4 | 适用时启动 Lean | lean.queued | 必须用户先确认 statement；状态 `awaiting_statement_confirm` |
| 5.5 | Lean 三状态分项展示 | lean.three-states | (1) 形式化翻译忠实度 (2) Lean 内核状态 (3) 科研结论支持度 |
| 5.6 | 通过 Lean 但论文结论不全成立 | claim.partial | 综合状态显示 `partial_supported`，不显示"论文正确" |
| 5.7 | 作者提交修订 | revision.created | 评审者视图可看 diff、原问题、证据、复核结果 |

**断点/恢复**：

- Lean 取消 → P95 ≤ 10s 清进程树，UI 立即 `cancelled`。
- 评审权限不足 → API 拒绝 403；前端显示"该身份下不可见"，不暴露越权字段。
- 形式化翻译失败 → 显示具体不匹配位置，不自动降低 statement 难度。

### 2.6 黄金链路 6：AI 管家运行可恢复科研循环

**用户目标**：提交一个研究问题，AI 管家在预算内形成假设、证据和验证记录，遇到高风险操作请求批准，服务重启后继续执行。

| 步骤 | 用户动作 | 前端状态 | 证据/后端写入 |
|---|---|---|---|
| 6.1 | 球体入口打开抽屉 → 输入研究问题 | agent.compose | 抽屉默认 "tasks" Tab |
| 6.2 | 选择"严谨"模式 + 来源上限 + 时间预算 | agent.budget | 写入 `AgentContext` 与 `ReasoningPolicy=rigorous` |
| 6.3 | AI 展示计划 | agent.planned | plan-step 列表；每步带预期能力 |
| 6.4 | 用户确认后创建多个候选假设 | hypothesis.generated | 全部明确标记 `claim_kind=hypothesis`，不得升级为 fact |
| 6.5 | 独立文献分片并行检索 | run.parallel | SSE 多 `RunEvent`，每个事件带 `step_id` |
| 6.6 | Worker 重启 | run.recover | Temporal 从已有状态继续，不重复扣费 |
| 6.7 | 高风险工具触发 | approval.requested | 抽屉顶部 `ApprovalRequest` 卡片，参数哈希绑定 |
| 6.8 | 修改参数后旧审批失效 | approval.invalidated | UI 自动重新请求审批 |
| 6.9 | 用户拒绝某步 | step.rejected | 保留已完成证据；显示可选替代路径 |
| 6.10 | 任务完成 | run.completed | 抽屉显示：研究问题、候选假设、主张、支持/冲突证据、验证、限制、人工决定 |

**断点/恢复**：

- SSE 断线 → 抽屉 `Last-Event-ID` 自动重连；不重复 toast 或进度倒退。
- 球体状态 → 始终至少 6 种（idle/running/waiting/complete/failed/offline）。
- 模式只显示"快速/标准/严谨"，不显示模型品牌。
- 预算耗尽 → run 状态 `budget_exhausted`，UI 提示"升级预算或缩小范围"。

---

## 3. 黄金路径（本期优先级最高的一条）

按 06 §3–§8 与 M4 §6 任务流综合判断，**黄金路径 = 链路 2.1 → 链路 2.2 → 链路 2.4**：

> **新用户登录 → 建立科研项目 → 检索导入文献 → 编辑 LaTeX 论文 → 编译 PDF → 投稿前自检**

理由：
1. 链路 2.1 验证登录、租户隔离、个人中心、AI 管家空壳（F1 即可完成）。
2. 链路 2.2 验证文献库、检索、PDF 阅读、证据定位（SSE 接入 + 后端契约最复杂的一段，F2 完成）。
3. 链路 2.4 验证 LaTeX 写作、引用插入、编译时间线、AI diff、修订审计（F3 完成）。

这三条串联即可向项目负责人演示"研究者从登录到投稿前自检"的最小可走通闭环。其他三条（翻译、数学评审、AI 管家长任务）作为 F3/F4 阶段并行完善。

---

## 4. 链路网络与断链检查

> 任何路由跳转、抽屉状态、AI 球体事件都必须在某个链路内可解释。

| 触发点 | 归属链路 | 失败时行为 |
|---|---|---|
| 球体 → 任务 Tab → 新建任务 | 链路 6 | 抽屉打开；展示计划；高风险工具进审批 |
| 项目页 → 切换标签 | 链路 1 | 标签切换只重载 outline + 主画布；状态保持 |
| 文献条目 → 插入论文 | 链路 2+4 | 跳转写作页并预填光标位置；显示审批 |
| 写作页 → 触发编译 | 链路 4 | 编译进入 Temporal；离开页面后继续；UI 重连恢复 |
| 写作页 → 翻译按钮 | 链路 3 | 与文献条目分离；带 `source_document_id` 引用 |
| 评审页 → 切换作者/评委 | 链路 5 | 整页重新加载；后端裁剪权限 |
| 教育研究 → k<20 测试 | 链路 1（教育子） | 拒绝并显示原因，不静默改用聚合 |
| 个人中心 → 修改偏好 | 链路 1 | 立即保存；下次刷新仍生效 |
| 顶栏搜索 | 全部 | 全局命令面板（F5 阶段实现） |

---

## 5. 强制状态枚举（与 M0 契约对齐）

> 每个异步功能至少实现以下状态。每个 UI 组件的状态映射在 F0 实施时落到 `src/widgets/loading-states.ts`。

| 状态 | 视觉 | 行为 |
|---|---|---|
| initial | 控件可点 | 触发请求 |
| empty | 空状态 + 引导下一步 | 给出动作 |
| loading | skeleton | 不可点 |
| queued | badge `已排队 #N` | 可取消 |
| running | progress 0–100% | 可暂停/取消 |
| partial | 进度条 + 部分结果 | 显示已完成部分 |
| waiting_for_approval | 黄边 + 审批卡 | 阻塞 |
| paused | 灰显 | 可恢复 |
| succeeded | 绿色徽章 | 显示产物 |
| failed | 红边 + 原因 | 可重试（若可重试） |
| retryable | 失败 + 重试按钮 | 显式 retry 入口 |
| not_retryable | 失败 + 不可重试 | 引导换工具或放弃 |
| cancelled | 灰 + "已取消" | 不自动重试 |
| forbidden | 红边 + 无权限 | 不显示存在性 |
| offline | 黄边 + 离线 | 允许本地编辑；外部核验不伪装成功 |

> 这 15 个状态在原型中只有部分已实现，F0 阶段统一抽象为 `AsyncState<T>` 类型，F1+ 按链路落地。

---

## 6. 链路 → 组件矩阵（首批）

| 链路 | 复用组件 | 新建组件 |
|---|---|---|
| 1 | `ResearchLayout` / `AppHeader` / `Nav` | `LoginView` / `PersonalCenterPanel` |
| 2 | `ReferenceRow` / `SearchBar` / `EvidenceCard` | `ReferenceDetail` / `ImportStatus` / `EvidenceLocator` |
| 3 | `DocumentIRRenderer` | `ReadingTranslation`（双栏） / `FormulaFidelityReport` |
| 4 | `CodeMirrorEditor`（F3） | `LatexFileTree` / `CompileTimeline` / `DiffViewer` / `CitationInsertButton` |
| 5 | `EvidenceCard` | `VerifyLayerList` / `LeanThreeStates` / `AuthorReviewView` / `ReviewerBatchView` |
| 6 | `AssistantOrb` / `AgentDrawer` | `TaskCard` / `ApprovalRequestCard` / `RunTimeline` / `BudgetMeter` |

---

## 7. 链路自身验收证据（本设计稿的输出）

- 真实来源：链路 2.1~2.6 全部来自 `06_完整用户链路与验收门禁.md` §3–§8，未自行发明。
- 真实约束：每条链路的"证据/后端写入"列严格对应 `02_目录边界与共享契约.md` §5 的契约实体。
- 真实差距：15 个状态在原型 index.html 中尚未统一抽象；这是 F0 阶段必须填补的工程债。
- 真实画像：链路 1+2+4 对应画像 A、C；链路 5 对应画像 A；链路 6 对应 A、B、C 全部。
