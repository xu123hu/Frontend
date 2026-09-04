# F4 Acceptance Matrix（黄金链路五 · 数学评审 + 黄金链路六 · AI 管家科研循环）

> 来源：06 §7/§8 黄金链路五/六 + design.md §6 双轨用例定义
> 验收日期：2026-09-04（全部证据为本日重新执行的一手结果，非历史记录转述）

## 六层状态表（09 §2）

| 层 | 定义 | 状态 | 证据 |
|---|---|---|---|
| L1 Build | 编译、类型、静态检查 | ✅ DONE | `vue-tsc --noEmit` 0 error；`eslint . --max-warnings 0` 0 error 0 warning；`vite build` 成功（10.01s），初始 JS gzip 合计 64.9KB（index 5.6KB），MSW 运行时代码不在产物（`setupWorker|onUnhandledRequest` 产物全文检索 0 命中，"MSW" 字符串仅为数据源徽标 UI 文案） |
| L2 Test | 单元 + 契约 + 集成 | ✅ DONE | vitest 14 files / 132 tests passed（新增 plan-derive 18 + lean-overall 9；F0-F3 回归未破坏） |
| L3 Performance | 08 性能门禁 | ✅ DONE（阶段内可测项） | 初始 JS gzip 66,480B ≈ 64.9KB ≤ 500KB（index 5,595B + icons 4,208B + tanstack 18,148B + vue 38,529B，Node zlib 实测）；katex 77KB / pdf 98KB / codemirror 113KB 维持路由级懒加载；评审页/管家抽屉均为按路由分包 chunk。CWV → F5 |
| L4 Failure | 故障态可观察 | ✅ DONE（单元+E2E 可测项） | Lean 综合状态非 supported 时 role=alert 横幅（LeanThreeStates.vue）；审批失效 409 conflict 文案区分「参数变更失效」与「已决策/过期」（steward-handlers.ts）；研究循环产物未就绪 → 409 not_ready retryable；计划拒绝步骤 → partial 而非 failed（plan-derive 18 单测）。断网 E2E 受 MSW SW 限制（known-limitations §1） |
| L5 User Journey | 真实用户链路 | ✅ DONE | Playwright **189 passed（4.0m）** = F1-F3 回归 138 + golden-path-5 8×3 + golden-path-6 9×3；18 张三视口截图归档 `artifacts/acceptance/f4/` 并目检（review-list/author/reviewer、steward-tasks/approval、project-evidence × 1366/1440/390） |
| L6 Human Review | 自审 + 独立审查 | ✅ DONE（自审）/ ⏳ Agent 6 | code-review-report.md P0=0 P1=0 P2=0（P3=3 书面接受）；待 Agent 6 R1 复核 |

**综合状态：DONE（F4 范围内）**——六层无一层为 FAIL；L3 的 CWV、L4 的 E2E 断网为已声明阶段边界（与 F1-F3 一致）。

## 功能轨（黄金链路五 · 数学评审）

| 用例 | 步骤 | 状态 | 证据 |
|---|---|---|---|
| TC-F05-01 | 作者/评委双视图切换（权限裁剪语义） | ✅ | E2E「双视图切换」×3 视口：作者视图可见「评审建议（仅作者可见）」块；评委视图不渲染该字段且无修正编辑器；mode 持久化到 query（?mode=reviewer 深链）。截图目检：review-author vs review-reviewer（1440）字段差异与设计一致 |
| TC-F05-02 | 主张提取 + 用户修正 | ✅ | E2E「主张提取与修正」：待审主张含类型 chip（公式/定理/前提）+ 状态 chip（证据支持/部分支持/证据冲突/未验证）+ 原文引用（第 4/5/6/7 页）；作者修正表述（textarea 预填 corrected_statement）→ 保存成功。HumanDecision 审计语义（PATCH /claims/:id 草案端点） |
| TC-F05-03 | 分层验证 L0-L4 独立分项 | ✅ | E2E「分层验证 L0-L4」：L0 语法/L1 定义域/L2 符号/L3 数值/L4 反例五卡独立，各含 tool+version（lyra·0.5.1 / sympy·1.12 / numeric·numpy 1.26）与状态（通过/未通过）；L4 反例卡 details 展开显示代入值（w=0.5）/前提约束检查（assumption：sigma^2>0）/复算（residuals ≠ 0），不合并总分 |
| TC-F05-04 | Lean 三状态分项 | ✅ | E2E「Lean 三状态（红线样例）」：三列独立——形式化翻译（断言强度降低，partial）/ 内核状态（内核接受，无 sorry/admit，succeeded）/ 科研结论支持度（部分支持，partial）；每列图标+文字；跳过 Lean 入口在主张卡 |
| TC-F05-05 | 通过 Lean 但不支持完整结论 → partial_supported | ✅ | 同上 E2E 断言综合状态=partial_supported 且「不显示论文正确」；横幅 role=alert 文案「综合状态：部分支持（partial_supported）」；单测 lean-overall.test.ts 9 例覆盖全判定矩阵（unsupported→rejected、翻译 diverged→partial_supported、not_run→pending 等） |
| TC-F05-06 | 作者修订 → 评委复核 | ✅ | E2E「修订与复核」：修订时间线 v1（待复核）/v2（复核通过）；每条含 diff 行（“表 4 增加健壮性 SE 列”等）+ 策略说明 + 原问题引用；评委视图复核备注输入 + 复核通过/要求继续修改按钮，决策后状态迁移 |

功能轨（数学评审）6 项：6 ✅。无 FAIL。

## 功能轨（黄金链路六 · AI 管家科研循环）

| 用例 | 步骤 | 状态 | 证据 |
|---|---|---|---|
| TC-F06-01 | 研究循环发起（假设标记 hypothesis） | ✅ | E2E「发起研究循环」：抽屉输入研究问题 →「发起研究循环（严谨模式）」→ 新计划出现（run.live-*），假设两条均标记「假设」chip（非 fact）。种子计划 run-cycle-seed-1 同构 |
| TC-F06-02 | 任务时间线（计划/步骤/预算/审批） | ✅ | E2E「研究循环计划时间线」：研究问题 + 严谨模式徽标 + 预算（8.60/50.00 元 · 420/3600 秒）+ 步骤状态（已完成/进行中/待审批/已拒绝）+ 产物清单（研究循环产物：限制声明 + 人工决定可见，TC-F06-05 断言同卡完成）；进度来自 run 事件脚本派生（plan-derive） |
| TC-F06-03 | 高风险审批卡（参数哈希绑定 + 失效重审） | ✅ | E2E「审批卡：参数哈希绑定 + 批准决策」：卡含动作（run_lean_kernel）+ 高风险徽标 + 理由 + 参数摘要（target/timeout_seconds）+ 参数哈希绑定 sha256:def456 + 批准/拒绝；批准后决策端点 200、球体 waiting 解除联动。E2E「参数变更演练」：模拟参数变更 → 原审批 cancelled + 失效文案（哈希不匹配需重审）；重复决策 → 409 conflict |
| TC-F06-04 | 拒绝步骤保留证据 + 替代路径 | ✅ | E2E「拒绝步骤保留证据 + 替代路径」：st-3 数值复算显示 rejected + 替代路径两条（改用已核验文献中的数值结果 / 仅保留符号验证）；st-4 符号验证已完成证据保留；计划综合状态 partial（红条「含被拒绝步骤，已完成证据保留」）而非 failed |
| TC-F06-05 | 研究循环产物完整清单 | ✅ | E2E 内嵌于计划时间线断言：研究问题/候选假设（hypothesis 标记）/主张（partial 支持）/验证（文献证据链 passed + 数值复算 rejected_by_user）/限制声明/人工决定 全部可见（golden-path-6.spec.ts:72-76） |

功能轨（科研循环）5 项：5 ✅。无 FAIL。

## 范围切分声明用例（design §5 教育研究）

| 项 | 状态 | 证据 |
|---|---|---|
| 教育研究降级为静态边界声明 | ⚠️ 声明式交付 | Education.vue 交付「隐私预检流程 + k<20 拒绝」静态说明与草案徽标；真实教育数据流（dws 隐私红线）由 Agent 2 端到端、F5 收口（design.md §5 切分说明 + known-limitations §5） |

## 体验轨

| 用例 | 通过标准 | 状态 | 证据 |
|---|---|---|---|
| TC-X05-01 | 评审双视图与原型一致；主张/验证/Lean 层级清晰 | ✅ | 18 张三视口截图目检：批次列表 → 工作区（建议块 → 待审主张 → 分层验证 → Lean → 修订时间线）层级顺序与 baseline-1440-review.png 一致 |
| TC-X05-02 | 分层/Lean 状态不只靠颜色 | ✅ | 每层状态=图标+文字（通过/未通过/部分）；Lean 非 supported 横幅 role=alert；L4 反例卡「未通过」红色文字+图标（截图目检 + E2E 断言文字存在） |
| TC-X06-01 | 抽屉任务 Tab 时间线信息可见 | ✅ | 步骤徽标（已完成/进行中/待审批/已拒绝）/进度条（progressbar role）/预算行/审批卡全可见（steward-tasks 截图目检 + E2E 断言） |
| TC-X06-02 | 审批卡键盘可达 + 球体联动 | ✅ | 批准/拒绝/模拟参数变更为真实 button（Tab+Enter 可达）；批准后球体 waiting→running 联动（E2E 断言）；焦点管理沿用全局键盘约定（F1 组件） |
| TC-X06-03 | 三视口截图无布局破损；移动端抽屉占满 | ✅ | 18 张截图目检：390 视口抽屉全宽、1440/1366 双栏正常；无横向滚动/截断 |

体验轨 5 项：5 ✅。无 FAIL。

## 综合结论

- 功能轨 11 项：11 ✅ + 1 项范围切分声明（教育研究，设计文档明示降级）。
- 体验轨 5 项：5 ✅。
- 六层状态：L1-L6 无 FAIL；待 Agent 6 独立复核（L6）。
- **F4 验收结论：PASS（F4 范围内）**。
