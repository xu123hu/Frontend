# F4 Summary：数学评审 / Lean 三状态 / AI 管家可恢复科研循环

> 阶段：F4｜智能体：Agent 1｜完成日期：2026-09-04｜前置：F3（`ebc7d30`）

## 1. 交付了什么

黄金链路五（数学验证 + 评审）与黄金链路六（科研循环 + AI 管家）的前端全链路，11 项功能用例 + 5 项体验用例全部通过（详见 acceptance-matrix.md）。

| 交付项 | 位置 |
|---|---|
| 评审双视图（作者/评委，mode 持久化 query） | pages/research/Review.vue + widgets/ReviewWorkspace |
| 主张提取/修正 + 修订时间线与评委复核 | widgets/ClaimReviewList、RevisionTimeline |
| 分层验证 L0-L4 五能力独立卡（含 L4 反例三要素） | widgets/VerifyLayerList |
| Lean 三状态（翻译/内核/结论支持度三列 + partial_supported 综合） | widgets/LeanThreeStates + features/review/lean-overall.ts |
| 管家任务时间线（计划/步骤/预算/审批/拒绝/产物） | widgets/StewardTaskTimeline + features/steward/plan-derive.ts |
| 高风险审批卡（哈希绑定/批准/拒绝/参数变更失效） | widgets/ApprovalCard + steward-handlers 决策端点 |
| 研究问题—假设—证据—验证面板 | pages/research/ProjectDetail.vue + widgets/EvidenceSupportList |
| MSW 草案：review/steward 域 + math_verification/research_cycle 事件脚本 | mocks/review-*、steward-*、run-simulator.ts |

## 2. 关键决定（与 design.md 对应）

1. **状态一律派生，不造假**：计划/步骤/审批状态由 run 事件脚本 + 用户决策派生（决策 > 脚本终态 > 脚本进行态 > 种子），拒绝步骤仅影响该步骤、计划综合 partial。
2. **Lean 三状态红线**：翻译 ≠ 内核 ≠ 结论支持度严格分列；任何 partial → partial_supported；结论 unsupported → rejected；UI 明示「Lean 通过 ≠ 论文正确」。
3. **权限裁剪语义**：前端仅渲染可见字段，真实裁剪归后端（known-limitations §3）。
4. **教育研究降级声明**：静态边界展示，真实数据流 F5 收口（known-limitations §5）。

## 3. 验收结果（一手证据）

- vue-tsc 0 error / eslint 0 warning / vitest **132 passed**（新增 27）/ build 成功 / Playwright **189 passed**（新增 51，回归 138 全过）
- 18 张三视口截图归档并目检；性能门禁：初始 JS gzip 64.9KB（门限 500KB），MSW 不在产物
- code-review 自审 P0=0 P1=0 P2=0（P3=3 书面接受）

## 4. 移交事项（给 Agent 2 / Agent 6 / F5）

- **契约请求单 CR-F4-01..06**（design §7）：评审/主张/修订/管家计划端点为 MSW 草案，后端实现以 handler 语义为准，前端切换真实 API 零改动（apiRequest/SSE 已就绪）。
- **真实验证引擎接入**：Lean/SymPy/Z3 结果结构见 mocks/review-db 种子与 run-simulator 脚本（payload method/result 约定）。
- **待办**：Agent 6 R1 独立复核（L6）；F5 承接 CWV 实测、断网体验、教育研究真实数据流。

## 5. 提交

- 分支：`refactor/agent-01-frontend`（worktree agent-01-frontend）
- 提交信息：`feat(f4): math review dual-view, Lean three-states, AI steward research cycle (golden paths 5-6)`
