# F5 Summary（终期）：CWV 实测 / 断网体验 / 教育研究收口 / 全链路回归 + 终版验收

> 阶段：F5（终期）｜智能体：Agent 1｜完成日期：2026-09-04
> 前置：F4（`75f4ea1` + `5e516d3`）；Agent 6 R1 复核 F0-F4 通过（pass）

## 1. 交付了什么

| 交付项 | 位置 |
|---|---|
| CWV 实测（LCP/INP/CLS，P75 门禁断言 + cwv.json 证据） | tests/e2e/cwv.spec.ts |
| 断网体验双场景（冷断网 + 页内断网，fetch 层 TypeError → kind='network' 降级） | tests/e2e/offline.spec.ts + mocks/http-helpers.ts(simulatedNetworkError) |
| 教育研究收口（五步链路：课题→隐私预检→k<20 拒绝→快照→分析图表→回流审批） | pages/research/Education.vue + entities/features/education + mocks/education-* |
| 教育契约测试 9 例 + 断网钩子契约 2 例 | tests/contract/contract-education.test.ts + contract-draft.test.ts |
| 教育黄金链路 E2E（TC-F07-01..06 + 截图） | tests/e2e/golden-path-7.spec.ts |
| main.ts dev 钩子（__USE_MOCK__ 守卫，测试触发真实 refetch） | src/app/main.ts |
| F5 handoff 文档 | docs/handoff/F5/（design/acceptance-matrix/code-review/test-report/known-limitations/summary） |

## 2. 关键决定

1. **断网机制实证优先**：三种真实网络层断网（setOffline/route.abort/CDP）均被 MSW SW 屏蔽 → 断网 E2E 用 `window.fetch` 层注入（不伪造成功，TypeError → kind='network' 降级路径）；契约层另提供 `simulatedNetworkError` 钩子（HttpResponse.error()，单测验证 fetch 真实 reject）。
2. **CWV 标准视口测量**（08 §2）：仅 desktop-1440；mobile CLS=0.103 记录为 P3 待优化。
3. **教育收口严守红线**：k<20 → 422 PRIVACY_THRESHOLD_NOT_MET 且不返回数据；快照不可变；图表绑定哈希；回流前人工审批。
4. **快照以本地事实持有**：k<20 演练的失败 mutation 不清除已创建快照展示（E2E 发现并修复）。

## 3. 验收结果（一手证据）

- vue-tsc 0 error / eslint 0 warning / vitest **143 passed**（+11）/ build 成功 / Playwright **202 passed + 2 skipped**（F5 新增 13）
- CWV：登录页 LCP P75=316ms / 首页 LCP 316ms / CLS 0.048（均过门禁）；INP 测量局限（known-limitations §1）
- 断网：冷断网不白屏+离线提示+不假登录；页内断网 Boundary+重试+恢复
- 教育：6/6 用例 + 契约 9/9；截图 9 张 + cwv.json 归档
- code-review P0=0 P1=0 P2=0（P3=3 书面接受）

## 4. 移交事项（Agent 2 / Agent 6）

- **契约请求单 CR-F5-01a..g**（design.md §4）：教育研究端点以 handler 语义为草案，后端实现后前端零改动（apiRequest/vue-query 已就绪）。
- **断网/INP 真实测量**：Agent 2 集成真实后端后，断网 E2E 改真实网络层、INP 改 field/Lighthouse。
- **终期复核**：Agent 6 R1 终期复核（L6）。

## 5. 提交

- 分支：`research/agent-01-frontend`（worktree agent-01-frontend）
- 提交：`bc1da46`（research(f5): 终期——CWV 实测/断网体验/教育研究收口/全链路回归，76 files / +2170）
