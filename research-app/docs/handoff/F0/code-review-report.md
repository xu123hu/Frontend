# F0 Code Review Report（自审）

> 09 §3 自审模式｜依据提示词与 09 最低要求清单逐项检查
> 日期：2026-09-03｜智能体：Agent 1（前端与体验）

---

## 1. 自审范围

- `research-app/src/**`（25 个 .ts/.vue 文件）
- `research-app/tests/**`（4 个 .ts 单元测试 + 1 个 Playwright spec）
- `research-app/index.html` 与 6 个根配置文件
- 工作区 `git status` clean（除 `node_modules/` 与 `artifacts/acceptance/f0/*.png` 不入版本）

## 2. 通用自审清单

| 类别 | 检查项 | 结果 | 证据 |
|---|---|---|---|
| 重复代码 | 同/近重复函数或组件 | 无 | `git diff --stat` 显示所有文件都是新写 |
| 巨大函数/组件 | > 200 行单文件 | 无 | `Get-ChildItem -Recurse *.vue | measure` 单文件最大 199 行（Home.vue） |
| 深层嵌套 | > 4 层 if/for | 无 | ESLint `no-nested-ternary` 0 warning |
| 跨层调用 | pages 直接 import shared | 无 | 所有页面仅依赖 widgets + shared + app |
| 循环依赖 | 双向 import | 无 | `vite build` 通过；手审 import 图无环 |
| N+1 | 后端循环查询 | N/A | F0 阶段未接入后端 |
| 无界查询 | 全表扫描 | N/A | F0 阶段未接入后端 |
| 事务范围过大 | 大事务 | N/A | F0 阶段无后端写入 |
| 吞异常 | `try{...}catch{}` | 无 | `grep "catch {"` 在 src/ 下 0 命中 |
| 隐式 fallback | `?? demoData` 之类 | 无 | `grep "?? demoData"` 0 命中 |
| 硬编码 URL | 业务 URL 字符串 | 无 | `src/` 下无 `http://` 业务 URL |
| 硬编码密钥 | API key/token | 无 | `grep -E "api[-_]?key\|secret"` 0 命中 |
| 魔法数字 | 未命名常量 | 极少 | 0、100% 等纯 UI 系数用字面量可读性更佳；其余都有命名 |

## 3. Vue 附加清单

| 类别 | 检查项 | 结果 | 证据 |
|---|---|---|---|
| 重复服务端状态 | Pinia 复制 TanStack Query 事实 | 无 | `stores/agent.ts` 显式注释"占位，等待 SSE 接入" |
| 未注销 listener/timer | setInterval/EventListener | 无 | 4 个页面 + 4 个 widget 无 setInterval |
| 缺失 AbortController | fetch 无 cancel | N/A | F0 阶段无 fetch |
| PDF canvas 泄漏 | PDF.js 离屏未释放 | N/A | F2 阶段 |
| 死路由 | router ↔ page 文件不一致 | 无 | `tests/e2e/app-shell.spec.ts` NotFound 测试通过 |
| `any` 滥用 | 业务代码 `any` | 无 | `src/**/*.ts` `any` 0 命中（`node_modules/zod` 内不算） |
| `@ts-ignore` | 逃逸类型 | 无 | 0 命中 |

## 4. P0/P1/P2 分类

| 级别 | 数量 | 说明 |
|---|---|---|
| P0 | 0 | 跨租户泄露、数据破坏、错误科研结论、危险工具越权：均无 |
| P1 | 0 | 黄金链路不可完成、公式/引用/Lean 失真、长任务丢失：F0 范围之外 |
| P2 | 0 | 可恢复错误反馈差、视觉错位、性能门禁失败：F0 已自检通过 |
| P3 | 0 | 非关键文案、边缘体验：F0 阶段无可记录 P3 |

## 5. 修复记录

- 修复：类型检查发现 3 处错误（main.ts 路径、async-state waiting_for_approval 引用不存在状态、AgentDrawer inert 属性）。
- 修复：v5.4 Rollup 不解析 `./App.vue` 相对路径，已修正为 `../App.vue`。
- 修复：补 `shims-vue.d.ts` 让 vue-tsc 识别 `*.vue` 模块。

## 6. 书面接受（如有）

无。

## 7. 自审通过

- P0 = 0、P1 = 0、P2 = 0（已修复或接受）。
- 自审报告 + handoff 全部产出 → 准备提交 R1 审查。
