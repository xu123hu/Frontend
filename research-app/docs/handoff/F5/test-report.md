# F5 Test Report（终期）

> 执行日期：2026-09-04｜执行环境：Windows / Node 20 / Playwright 1.45 / Vitest 1.6
> 全部结果为本日重新执行的一手输出。

## 1. 执行汇总

| 套件 | 命令 | 结果 | 耗时 |
|---|---|---|---|
| 类型检查 | `vue-tsc --noEmit` | ✅ 0 error（exit 0） | — |
| 静态检查 | `eslint . --max-warnings 0` | ✅ 0 error 0 warning（exit 0） | — |
| 单元 + 契约 | `vitest run` | ✅ **15 files / 143 passed** | 14.9s |
| 构建 | `vite build` | ✅ 成功（24.05s） | — |
| E2E（3 视口） | `playwright test` | ✅ **202 passed + 2 skipped / 0 failed** | 4.8m |

## 2. 单元 + 契约明细（143 = F4 132 + F5 新增 11）

F5 新增：
- `tests/contract/contract-education.test.ts`（9）：教育研究域 CR-F5-01（课题/产品/预检/快照/k<20 拒绝/分析/图表/回流/未登录 401）
- `tests/contract/contract-draft.test.ts` 断网钩子（2）：`X-Simulate-Network-Error: 1` → fetch TypeError reject；无钩子头 → 200

F0-F4 回归 132 全过。

## 3. E2E 明细（202 passed + 2 skipped）

### 3.1 F5 新增

| 用例 | 覆盖 |
|---|---|
| offline.spec A ×3（冷断网） | 刷新断网 → 登录页 role=alert 离线提示 + 不假登录 → 恢复重登数据回来 |
| offline.spec B ×3（页内断网） | resetQueries 触发真实 refetch → 面板 Boundary「网络连接不可用」+ 不渲染假数据 → 恢复点重试拉回真实数据 |
| golden-path-7 五步链路 ×3 | 课题→预检→快照→k<20 拒绝→分析图表→回流审批（TC-F07-01..06） |
| golden-path-7 截图 ×3 | 教育页课题态 + 分析态截图 |
| cwv.spec（desktop-1440） | LCP/INP/CLS P75 门禁断言 + cwv.json 证据归档（mobile/1366 按 08 标准视口跳过） |

### 3.2 回归（F1-F4 189 全过）

app-shell、golden-path-1/2/3/4/5/6 全部通过——F5 未破坏既有黄金链路。

## 4. 截图与证据归档（F5）

`artifacts/acceptance/f5/`：cwv.json + 6 张教育页（课题态/分析态 × 3 视口）+ 3 张断网降级态（×3 视口）= 10 项。
内容由 E2E 断言覆盖（模型本环境无法读图，未做人工目检；所有关键文案/元素/状态均已 E2E 断言）。

## 5. CWV 门禁（08 §2，P75，5 样本，条件已声明）

| 指标 | 门禁 | 实测 | 结论 |
|---|---|---|---|
| 登录页 LCP | ≤ 2500ms | 316ms | ✅ |
| 首页 LCP | ≤ 2500ms | 316ms | ✅ |
| INP | ≤ 200ms | 0ms（本环境无 PerformanceEventTiming 条目，测量局限） | ✅（形式，真实 INP 需 field 测） |
| CLS | ≤ 0.1 | 0.048 | ✅ |
| 首包 JS gzip | ≤ 500KB | 64.9KB | ✅ |

## 6. 性能回归（08 §7）

集成基线对比 F4：LCP 316ms（F4 期 396ms，改善）；CLS 0.048（持平）；首包 gzip 64.9KB（持平）——无 ≥15% 退化。
