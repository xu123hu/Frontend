# F4 设计文档：数学评审 / Lean 三状态 / AI 管家可恢复科研循环

> 阶段：F4｜负责智能体：Agent 1（前端与体验）｜日期：2026-09-04
> 前置：F3 已提交（`ebc7d30`）；M0 契约 research-contracts v0.1.0 已冻结
> 复用资产：AgentDrawer 4-Tab 空壳、AssistantOrb 6 态、agent store、sse.ts（F2）、CompileTimeline/DiffPanel（F3）

## 1. 范围（提示词 F4 里程碑 + 06 §7/§8 黄金链路五/六）

| 交付项 | 来源 | F4 状态 |
|---|---|---|
| 作者视图 / 评审者视图（权限不同） | 06 §7 步骤 1 | 评审页双视图切换（后端裁剪语义，前端仅渲染可见字段） |
| 提取待审公式/定理/前提 → 用户可修正 | 06 §7 步骤 2 | 主张提取列表 + 修正（HumanDecision 审计语义） |
| 分层验证 L0–L4 独立显示 | 06 §7 步骤 3；M4 §8.3 | L0 语法/L1 定义域/L2 符号/L3 数值/L4 反例五能力分项 |
| Lean 三状态分项（形式化翻译/内核/科研结论） | 06 §7 步骤 5；M4 §8.4 | 评审区内 Lean 面板；禁止「Lean 通过=论文正确」 |
| 通过 Lean 但不支持完整结论 → partial_supported | 06 §7 步骤 6 | 综合状态 partial_supported（红线样例） |
| 作者提交修订 → 评委查看差异/原问题/证据/复核 | 06 §7 步骤 7 | 修订时间线 + diff + 复核 |
| 研究问题—假设—证据—验证—修订视图 | 提示词 §项目工作区 | ProjectDetail 接入（F4 完成原占位） |
| AI 管家球体 6 态 + 上下文抽屉任务时间线 | 06 §8 步骤 1-2 | 抽屉任务 Tab 填充：计划/步骤/预算/审批 |
| 高风险工具审批（参数哈希绑定、修改后失效） | 06 §8 步骤 6 | ApprovalRequest 卡片 + 参数 diff + 失效重审 |
| 用户拒绝某步 → 保留证据 + 替代路径 | 06 §8 步骤 7 | 拒绝状态 + 已完成证据 + 替代路径按钮 |
| 研究循环 run（research_cycle）产物 | 06 §8 步骤 8 | 计划→假设→证据→验证→限制→人工决定 时间线 |

**范围切分声明（诚实性）**：Lean/SymPy/Z3 真实执行由 Agent 2+ 承担；前端交付分层结果 UI + run 编排 + mock 演练。Temporal Worker 重启恢复为后端职责（前端展示 `paused→resumed` 状态语义 + 不重复 toast）。审批的实际执行权限在后端，前端交付审批卡 UI + 参数绑定展示 + 决策端点。

**不在 F4 范围**：教育研究（F4 提示词交付含教育，但本仓库教育页为 F0 占位——见 §5 切分说明）、真实 Lean 内核执行、多人实时协同。

## 2. 契约现状与差距分析

### 2.1 M0 冻结契约可直接复用

| 冻结资产 | F4 用途 |
|---|---|
| `POST /runs`（run_type=math_verification / research_cycle / review）+ SSE | 分层验证 / 研究循环 / 评审 run |
| `VerificationRecord`（target_type=claim/formula、method=lean_translation/lean_kernel、status 四态+not_run） | 分层验证结果 + Lean 三状态 |
| `ApprovalRequest`（risk_tier、arguments_redacted、status 五态、expires_at） | 审批卡 |
| `RunEvent.approval.requested/resolved`、`step.failed` | 审批流 + 步骤拒绝 |
| `ResearchRun.budget/spent` | 预算展示 |
| `EvidenceRecord`（support_status） | 主张证据支持度 |

### 2.2 缺失端点 → 契约请求单（CR-F4-xx，MSW 草案 + 徽标）

评审批次/主张提取/修订、管家研究循环状态端点不存在。推导依据：M4 §8.3/§8.4/§8.6 + 02 §4 通用字段 + VerificationRecord/ApprovalRequest 冻结结构。

## 3. 架构级决定（08 §8 Tier A 三候选，简卡级）

| 维度 | 采用 | 理由 |
|---|---|---|
| 评审双视图 | 页面级 mode 切换（author/reviewer），字段按 mode 渲染 | 06 §7 步骤 1「权限由后端裁剪，前端仅渲染可见字段」；复用 Review.vue 现有路由（review/review:paperId） |
| 分层验证 | 独立五能力卡（L0-L4）+ 每卡 tool/version/status，不合并为总分 | M4 §8.3 五能力独立执行 + 02 §5.6 VerificationRecord |
| Lean 三状态 | 三列独立（形式化翻译/内核状态/科研结论支持度）+ 综合 partial_supported | 02 §5.6「禁止合并为论文正确」；06 §7 步骤 6 |
| 管家任务时间线 | AgentDrawer 任务 Tab：步骤卡片（计划/执行/审批/拒绝）+ 预算 | F0 user-journeys 链路 6 + 球体 6 态联动 |
| 审批卡 | ApprovalRequest 卡片：动作/理由/参数摘要/风险级/批准-拒绝-参数已变失效 | 02 §5.9 ApprovalRequest 冻结结构 |
| 研究问题—假设—证据视图 | ProjectDetail 新增面板（列表+状态，不做巨型图） | 提示词 §项目工作区「一期用列表」 |

## 4. 页面架构与状态矩阵

### 4.1 新增/改造清单（feature-sliced，最小侵入）

```text
src/
├── entities/
│   ├── review/types.ts             # ReviewPaper/ClaimItem/VerificationLayer/LeanThreeStates/Revision（CR-F4 推导）
│   └── steward/types.ts            # StewardPlan/PlanStep/ApprovalView/ResearchCycleResult（CR-F4 推导）
├── features/
│   ├── review/{api,queries}.ts     # 批次/主张/分层验证/Lean/修订（vue-query）
│   ├── steward/{api,queries}.ts    # 管家计划/步骤/审批/研究循环（vue-query + SSE 消费）
├── widgets/
│   ├── ReviewWorkspace/            # 作者/评委双视图 + 主张提取修正 + 分层验证 + Lean 三状态 + 修订
│   ├── VerifyLayerList/            # L0-L4 五能力分项卡
│   ├── LeanThreeStates/            # 形式化翻译/内核/科研结论 三列 + partial_supported
│   ├── StewardTaskTimeline/        # 计划→步骤→审批→拒绝→产物 时间线（抽屉任务 Tab）
│   ├── ApprovalCard/               # 审批卡（参数摘要/风险级/决策）
│   └── EvidenceSupportList/        # 主张证据支持度列表（supported/partial/insufficient/...）
├── pages/research/
│   ├── Review.vue                  # 重构：双视图 + 主张 + 分层验证 + Lean + 修订
│   ├── ProjectDetail.vue           # 加「研究问题—假设—证据—验证」面板（完成 F3 占位）
│   └── AgentDrawer.vue             # 任务 Tab 填充 StewardTaskTimeline + ApprovalCard
└── mocks/
    ├── review-db.ts / review-handlers.ts
    ├── steward-db.ts / steward-handlers.ts
    └── run-simulator.ts            # 加 math_verification / research_cycle 事件脚本
```

### 4.2 状态矩阵（15 态适用性）

| 页面/功能 | 适用状态 | 不适用的状态（理由） |
|---|---|---|
| 评审双视图 | loading/empty/author/reviewer/succeeded/failed+retryable/forbidden(权限裁剪) | queued/running（静态） |
| 分层验证（每层） | not_run/loading/running/passed/failed/partial/inconclusive | waiting_for_approval（验证无审批点） |
| Lean 三状态 | awaiting_statement_confirm/queued/running/succeeded/failed/timed_out/cancelled/formal_pending | — |
| 主张提取修正 | loading/empty/succeeded/failed+retryable | running（同步） |
| 管家计划 | queued/running(每步)/waiting_for_approval(审批)/paused(重启恢复)/partial(拒绝后保留证据)/succeeded/failed/cancelled/budget_exhausted | — |
| 审批卡 | pending/approved/rejected/expired/cancelled(参数变更失效) | — |
| 研究问题—假设—证据 | loading/empty/succeeded/insufficient_evidence/conflicting | — |

## 5. 范围切分补充说明（教育研究）

提示词 F4 里程碑含「教育研究」交付（隐私预检/k<20 拒绝/图表导出）。本仓库 `Education.vue` 为 F0 占位；F4 将教育研究**降级为明确边界声明**（dws 隐私红线 + k<20 拒绝是后端数据侧职责，前端在 mock 环境无法验证真实隐私规则），仅在 Education.vue 交付静态的「隐私预检流程 + k<20 拒绝说明」展示并标注为草案边界——真实教育数据流由 Agent 2 端到端，F5 收口。此切分在 acceptance-matrix 逐条标注。

## 6. 黄金链路五/六 → 双轨验收用例

### 6.1 功能轨

| 用例 | 步骤 | 通过标准 |
|---|---|---|
| TC-F05-01 | 评审作者/评委视图切换 | 字段按 mode 渲染（作者可见建议，评委不下发建议字段——草案语义）；权限裁剪由后端，前端仅渲染可见字段 |
| TC-F05-02 | 主张提取 + 用户修正 | 提取待审公式/定理列表（含前提/证据）；用户可修正并保存（HumanDecision 审计） |
| TC-F05-03 | 分层验证 L0-L4 | 五能力独立分项（语法/定义域/符号/数值/反例），各含 tool/version/status；不合并总分 |
| TC-F05-04 | Lean 三状态分项 | 形式化翻译/内核状态/科研结论支持度三列独立；任一 partial → 综合 partial_supported；不显示「论文正确」 |
| TC-F05-05 | 通过 Lean 但不支持完整结论 | 综合状态 partial_supported（红线样例） |
| TC-F05-06 | 作者修订 → 评委复核 | 修订时间线 + diff + 原问题 + 证据 + 复核结果 |
| TC-F06-01 | 管家研究循环发起 | 输入研究问题 + 严谨模式 + 预算 → 计划（假设标记 hypothesis，非 fact） |
| TC-F06-02 | 任务时间线 | 计划→步骤→审批→拒绝→产物 时间线；SSE 进度 + 预算（budget/spent） |
| TC-F06-03 | 高风险审批卡 | ApprovalRequest 卡（动作/理由/参数摘要/风险级）；批准/拒绝决策；参数变更后旧审批失效 |
| TC-F06-04 | 拒绝步骤保留证据 + 替代路径 | 拒绝后已完成证据保留 + 替代路径按钮 + 不进入 failed（partial） |
| TC-F06-05 | 研究循环产物 | 研究问题/候选假设/主张/支持-冲突证据/验证/限制/人工决定 完整清单 |

### 6.2 体验轨

| 用例 | 通过标准 |
|---|---|
| TC-X05-01 | 评审双视图与原型一致；主张/验证/Lean 层级清晰 |
| TC-X05-02 | 分层/Lean 状态不只靠颜色（文字+图标+role=alert） |
| TC-X06-01 | 抽屉任务 Tab 时间线信息可见（步骤徽标/进度/预算/审批卡） |
| TC-X06-02 | 审批卡键盘可达 + 焦点管理；球体状态与抽屉联动 |
| TC-X06-03 | 三视口截图无布局破损；移动端抽屉占满 |

## 7. 契约请求单（CR-F4-xx）

| ID | 请求 | 推导依据 | 前端临时策略 |
|---|---|---|---|
| CR-F4-01 | `GET/POST /reviews`、`GET /reviews/{id}/claims`、`PATCH /claims/{id}` | M4 §8.6；02 §4 通用字段 | MSW 草案：评审批次/主张 |
| CR-F4-02 | 分层验证 `POST /runs`（math_verification）+ 结果端点 | M0 冻结 + VerificationRecord | 冻结契约 + 模拟器 |
| CR-F4-03 | Lean `POST /runs`（math_verification method=lean_*）+ 三状态端点 | M0 冻结 + 02 §5.6 | 冻结契约 + 模拟器（no sorry/admit 检查展示） |
| CR-F4-04 | 修订 `GET/POST /reviews/{id}/revisions` | 06 §7 步骤 7 | 草案 |
| CR-F4-05 | 管家 `POST /runs`（research_cycle）+ 计划/步骤/审批端点 | M0 冻结 + 02 §5.9 ApprovalRequest | 冻结契约 + 模拟器 + 草案计划端点 |
| CR-F4-06 | 教育研究数据流（隐私/k<20） | M4 §8.7 | 草案边界：静态展示 + 明确声明 |

## 8. 实施顺序（金路径优先）

1. entities（review/steward）+ MSW（review-db/steward-db + run-simulator math_verification/research_cycle 事件脚本）
2. **金路径 = 评审工作区（TC-F05 全链路）**：ReviewWorkspace 双视图 + 主张提取 + VerifyLayerList + LeanThreeStates + 修订
3. 管家（TC-F06）：AgentDrawer 任务 Tab 填充 StewardTaskTimeline + ApprovalCard + 球体联动 + ProjectDetail 研究问题—假设—证据视图
4. 测试：单测（分层/审批纯函数）+ E2E golden-path-5/6 + 三视口截图
5. code-review 自审（P0/P1=0）+ handoff + 提交

## 9. 内容资产清单

| 资产 | 来源/状态 |
|---|---|
| 评审样例主张（含前提/证据，1 条反例 + 1 条通过） | review-db 种子 |
| Lean 样例（形式化翻译 partial + 内核 succeeded + 科研结论 partial） | review-db 种子（红线样例） |
| 管家研究循环计划样例（假设/步骤/审批/拒绝） | steward-db 种子 |
| 审批卡样例（参数绑定 + 变更失效） | steward-db 种子 |
| 参考截图 | baseline-1440-review.png（作者/评委双视图选择 + 模式面板） |
