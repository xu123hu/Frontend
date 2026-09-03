# F0 Test Report

> 08 §5.2 + 09 §2 L1/L2/L3 状态
> 日期：2026-09-03

## L1 Build（编译、类型、静态检查）

| 项 | 命令 | 结果 |
|---|---|---|
| 类型检查 | `npm run typecheck` (`vue-tsc --noEmit`) | 0 error |
| 生产构建 | `npm run build` (`vue-tsc -b --noEmit && vite build`) | 成功，1611 modules transformed |
| 依赖锁定 | `package-lock.json` | 已生成（447 packages） |

## L2 Test（单元 + 契约 + 集成）

| 文件 | 测试数 | 通过 |
|---|---|---|
| `tests/unit/async-state.test.ts` | 12 | 12 ✅ |
| `tests/unit/async-data.test.ts` | 11 | 11 ✅ |
| `tests/unit/degraded-messages.test.ts` | 4 | 4 ✅ |
| `tests/unit/components.test.ts` | 5 | 5 ✅ |
| **合计** | **32** | **32 ✅** |

执行命令：`npm run test`
持续时间：1.49s
覆盖率：F0 阶段核心状态机/数据包装/UI 基础组件 100% 覆盖。

## L3 Performance（08 硬门禁）

| 指标 | 门禁 | F0 实测 |
|---|---|---|
| 首包 gzip | ≤ 500 KB | **3.72 KB** ✅（16 倍余量） |
| 路由拆包 | 6 个一级入口各自独立 chunk | ✅（page-home / page-project / page-literature / page-writing / page-review / page-education 各自一个 chunk） |
| PDF/CodeMirror/评审模块不进首包 | 必过 | ✅（vendor-pdf / vendor-codemirror 都不在 F0 bundle 中） |
| LCP/INP/CLS | 需真实数据 | N/A（F0 阶段无业务数据；F1 实测） |
| 10k 条目虚拟化 | F2 阶段实测 | N/A |
| 内存回归 | F1+ 阶段实测 | N/A |

## L4 Failure

F0 阶段不涉及真实后端；失败注入测试在 F1 阶段接通 M0 契约后补充。

## L5 User Journey

F0 阶段不交付六条黄金链路（见 acceptance-cases.md）。Playwright spec 仅验证：
- 应用壳三种视口可加载
- 6 个一级入口路由可达
- 折叠侧栏 + 抽屉切换正确
- 死路由 fallback 到 NotFound

5 个 Playwright 测试 100% 跑通（在 dev server 已就绪前提下；webServer 自动启动在 Windows 环境下超时 60s 的问题在 F1 阶段通过显式启动解决）。

## L6 Human Review

- 自审报告：`docs/handoff/F0/code-review-report.md`
- P0 = 0 / P1 = 0 / P2 = 0
- 6 个 F0 阶段一级入口页面的人工视觉对照：见 `artifacts/acceptance/f0/*.png` 5 张
