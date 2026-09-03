# F0 Acceptance Matrix（前置验收）

> 来源：06 §13 + acceptance-cases.md §8（F0 阶段必过的"前置验收" P-F0-01 ~ P-F0-10）
> 日期：2026-09-03

| 编号 | 验收项 | 状态 | 证据 |
|---|---|---|---|
| P-F0-01 | 应用壳三种视口截图 | ✅ | `artifacts/acceptance/f0/f0-home-{1440,1366,390}.png` 5 张 |
| P-F0-02 | 路由图覆盖 6 个一级入口 | ✅ | `src/app/router.ts` 6 个 children path；`tests/e2e/app-shell.spec.ts` 遍历通过 |
| P-F0-03 | 设计令牌 1:1 复刻原型 | ✅ | `src/app/styles/tokens.css` 与原型 `index.html` :root 变量逐一对比；颜色/字号/圆角/阴影完全一致 |
| P-F0-04 | 状态矩阵 15 种状态均有组件 | ✅ | `src/shared/state/async-state.ts` 15 个值；`tests/unit/async-state.test.ts` 12 项覆盖；AsyncData 11 项；StatusBadge 接受所有 15 状态 |
| P-F0-05 | 测试骨架就位 | ✅ | vitest + @vue/test-utils（4 个单元测试文件）+ Playwright config（3 个视口项目）|
| P-F0-06 | 视觉基线归档 | ✅ | `artifacts/acceptance/f0/*.png` 5 张；`D:\科研端demo\reference-screenshots\baseline-*.png` 10 张原型基线 |
| P-F0-07 | 死链检查 | ✅ | `vue-tsc --noEmit` 0 error；ESLint 0 error（最大警告 0）；Playwright 死路由 fallback 测试通过 |
| P-F0-08 | bundle 报告 | ✅ | `dist/assets/index-XXX.js` gzip 3.72 KB（≤500KB 门禁）；6 个路由各自独立 chunk |
| P-F0-09 | 依赖许可账本 | ✅ | `docs/research/reuse-ledger.md` 17 张 card + 显式拒绝清单；无 AGPL/CC BY-NC/未知许可 |
| P-F0-10 | 旧端代码无 import | ✅ | `grep "from .*src/.*student\|from .*src/.*teacher\|from .*src/.*research"` 在 src 与 tests 下 0 命中 |

> 10/10 通过。
