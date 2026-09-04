# F4 Test Report

> 执行日期：2026-09-04｜执行环境：Windows / Node 20 / Playwright 1.45 / Vitest 1.6
> 全部结果为验收当日重新执行的一手输出（非转述）。

## 1. 执行汇总

| 套件 | 命令 | 结果 | 耗时 |
|---|---|---|---|
| 类型检查 | `vue-tsc --noEmit` | ✅ 0 error（exit 0） | — |
| 静态检查 | `eslint . --max-warnings 0` | ✅ 0 error 0 warning（exit 0） | — |
| 单元 + 契约 | `vitest run` | ✅ **14 files / 132 tests passed** | 7.97s |
| 构建 | `vite build` | ✅ 成功（10.01s） | — |
| E2E（3 视口） | `playwright test` | ✅ **189 passed / 0 failed** | 4.0m |

> 过程记录：首轮门禁发现 1 处 TS6133（EvidenceSupportList.vue 未使用 props 变量），修复后复跑全绿；E2E 首轮因 5173 端口残留 dev server 失败，终止残留进程（PID 26980）后复跑通过。

## 2. 单元 + 契约明细（132）

```
✓ tests/unit/plan-derive.test.ts        (18)  ← F4 新增：步骤/计划状态派生（决策>脚本终态>进行态>种子；partial 语义）
✓ tests/unit/lean-overall.test.ts        (9)  ← F4 新增：Lean 三状态综合判定矩阵（红线样例全覆盖）
✓ tests/unit/diff-utils.test.ts          (8)
✓ tests/unit/import-queue.test.ts       (16)
✓ tests/unit/sse.test.ts                (10)
✓ tests/unit/api-client.test.ts         (12)
✓ tests/unit/async-state.test.ts        (12)
✓ tests/unit/async-data.test.ts         (11)
✓ tests/unit/citation-key.test.ts        (5)
✓ tests/unit/degraded-messages.test.ts   (4)
✓ tests/unit/use-session.test.ts        (10)
✓ tests/unit/latex-completions.test.ts   (4)
✓ tests/unit/components.test.ts          (5)
✓ tests/contract/contract-draft.test.ts  (8)  ← M0/M4 契约对齐 + 认证/租户隔离回归
```

F4 净增 27 例（105 → 132）；F0-F3 105 例回归全部通过。

## 3. E2E 明细（189 = F4 新增 51 + 回归 138）

### 3.1 F4 新增（golden-path-5：8 例 × 3 视口 = 24）

| 测试 | 覆盖用例 |
|---|---|
| 双视图切换（TC-F05-01） | 作者可见建议块；评委视图不渲染该字段 |
| 主张提取与修正（TC-F05-02） | 类型/前提/原文引用；修正保存 |
| 分层验证 L0-L4（TC-F05-03） | 五能力独立；L4 反例卡代入值/前提检查/复算 |
| Lean 三状态（TC-F05-04/05 红线样例） | partial+succeeded+partial → partial_supported；不显示论文正确 |
| 修订与复核（TC-F05-06） | diff + 复核状态；评委复核 pending 修订 |
| 三视口截图 ×3（TC-X05-01） | review-list / review-author / review-reviewer |

### 3.2 F4 新增（golden-path-6：9 例 × 3 视口 = 27）

| 测试 | 覆盖用例 |
|---|---|
| 研究循环计划时间线（TC-F06-01/02 + TC-F06-05） | 研究问题/严谨模式/预算/hypothesis 标记/步骤状态；产物含限制声明+人工决定 |
| 发起研究循环（TC-F06-01） | 新计划出现且假设标记 hypothesis |
| 拒绝步骤保留证据 + 替代路径（TC-F06-04） | rejected + 替代路径；计划 partial 而非 failed |
| 高风险审批 · 哈希绑定 + 批准（TC-F06-03） | 参数哈希绑定；批准 → 球体解除 waiting |
| 高风险审批 · 参数变更失效（TC-F06-03） | 决策后原审批 cancelled + 失效文案 |
| ProjectDetail 研究问题—假设—证据面板 | 假设列表 + 证据支持度 + 评审入口 |
| 三视口截图 ×3（TC-X06-01/03） | steward-tasks / steward-approval / project-evidence |

### 3.3 回归（138 = F1 21×3 + F2 12×3 + F3 13×3 + app-shell）

app-shell、golden-path-1/2/3/4 全部通过——F4 未破坏既有黄金链路。

## 4. 截图归档（18 张，目检通过）

`artifacts/acceptance/f4/`：6 场景（review-list、review-author、review-reviewer、steward-tasks、steward-approval、project-evidence）× 3 视口（1366/1440/390）。

目检记录（Agent 1，验收当日）：
- review-author：建议块 + 主张修正 + L1-L4 独立卡 + L4 反例红卡（代入值/前提检查/复算）+ 修订时间线真实内容渲染；
- review-reviewer：无建议块、无修正编辑器、复核按钮可见（权限裁剪语义正确）；
- steward-approval：高风险卡（run_lean_kernel/目标文件/timeout/哈希 sha256:def456）+ 批准/拒绝/模拟参数变更 + 计划 partial 完成态（预算 8.60/50.00 · 420/3600s）；
- project-evidence：研究阶段时间线 + 候选假设（hypothesis chips）+ 主张证据支持度四态 + 评审入口链接；
- 移动端 390：抽屉全宽、无布局破损。

## 5. 性能门禁（08 §性能）

| 项 | 门限 | 实测 | 结论 |
|---|---|---|---|
| 初始 JS gzip | ≤ 500KB | **64.9KB**（index 5.6 + icons 4.2 + tanstack 18.1 + vue 38.5，Node zlib 实测） | ✅ |
| 重依赖懒加载 | 编辑器/公式/PDF 不进首屏 | codemirror 113KB / katex 77KB / pdf 98KB 均路由级 chunk | ✅ |
| MSW 不进产物 | 无 msw 运行时 | 产物检索 `setupWorker|onUnhandledRequest` 0 命中（"MSW" 仅数据源徽标文案） | ✅ |
| CWV（LCP/INP/CLS） | F5 统一测量 | — | ⏳ F5 |
