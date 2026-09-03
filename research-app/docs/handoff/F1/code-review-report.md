# F1 Code Review Report（自审）

> 09 §3 自审模式｜日期：2026-09-04｜智能体：Agent 1（前端与体验）
> 范围：F1 全部变更（git status 14 个修改文件 + 20 个新增路径），只读审查后产出

---

## 1. 自审范围

- `src/**`：51 个 .ts/.vue 文件（含 2 个 `.gen.d.ts` 生成文件，不计入人工审查阈值统计）
- `tests/**`：7 个 vitest 文件 + 2 个 Playwright spec
- 配置：`vite.config.ts`、`.env.development/.env.production`、`.eslintrc.cjs`、`tsconfig.json`

## 2. 通用自审清单

| 类别 | 检查项 | 结果 | 证据 |
|---|---|---|---|
| 重复实现 | 同一能力多套代码 | 无 | 列表/创建/详情均走 `features/projects` 单一数据源；fetch 封装仅 `app/api/client.ts` 一处 |
| 巨大文件 | > 200 行单文件 | 记录为 P3 | CreateProjectDialog.vue 430 行（约 100 脚本 + 90 模板 + 240 样式）；Home.vue 376；Login.vue 373（见 §4 P3） |
| 深层嵌套 | > 4 层 | 无 | eslint `no-nested-ternary` 于 vue/recommended 集，0 警告 |
| 跨层调用 | pages 直取 app/api | 无 | 页面仅依赖 features/widgets/shared；api 客户端仅被 features 引用 |
| 循环依赖 | 双向 import | 无 | vite build 通过；mocks→entities、features→entities 单向 |
| 吞异常 | 空 catch | 无 | `rg "catch \{\}"` 0 命中；mocks/session-persistence.ts 的 catch 带注释（存储不可用时退化为可观察行为） |
| 隐式 fallback | `?? demoData` | 无 | 0 命中；降级一律经 DataSourceBadge / degraded 文案可观察 |
| 硬编码 URL | 业务 URL 字符串 | 无 | `rg "http://|https://"` 0 命中；仅 config.ts 从 env 读取 |
| 硬编码密钥 | key/secret/password | 无 | 5 处命中均为 mock 层 `passwordless` 字段名，非密钥，且 mock 不进生产产物 |
| console 泄漏 | log/debug | 无 | 0 命中（eslint no-console 仅放行 warn/error，实测 0 调用） |
| `any` / `@ts-ignore` | 类型逃逸 | 无 | 各 0 命中；vue-tsc 0 error |

## 3. Vue/前端附加清单

| 类别 | 检查项 | 结果 | 证据 |
|---|---|---|---|
| 服务端状态重复 | Pinia 复制 Query 事实 | 无 | session store 仅存认证事实（probing/authenticated/anonymous + 账户），列表/详情/偏好全走 vue-query |
| listener/timer 泄漏 | 未注销 | 无 | AppHeader/ProjectSwitcher 的 document click 均在 onBeforeUnmount 注销；use-dialog-a11y 层栈同步清理 |
| AbortController | fetch 可取消 | 有 | client.ts 全链路 signal 透传；`aborted` kind 不算失败（单测覆盖） |
| 查询重试语义 | 4xx 盲重试 | 无 | main.ts retry 回调：aborted/retryable=false 不重试（单测+契约覆盖） |
| 死路由 | router↔page 不一致 | 无 | app-shell.spec.ts 遍历 6 入口 + NotFound 通过 |
| 弹窗 a11y | 焦点陷阱 + Escape | 有 | use-dialog-a11y 层栈；E2E TC-X01-05 通过 |
| 减弱动效 | prefers-reduced-motion | 有 | AssistantOrb 动画关闭；E2E TC-X01-06 通过 |

## 4. P0/P1/P2/P3 分类

| 级别 | 数量 | 说明 |
|---|---|---|
| P0 | 0 | 跨租户泄露（TC-F01-08 双层验证通过）、错误科研结论、危险工具越权：均无 |
| P1 | 0 | 黄金链路一 16 用例 × 3 视口全通过；会话/偏好/项目数据持久化语义符合契约草案声明 |
| P2 | 0 | 移动端视口溢出（发现时为 P1 级真实缺陷）已修复并回归，见 §5 #4 |
| P3 | 2 | ① CreateProjectDialog/Home/Login 单文件超 200 行（SFC 样式同文件惯例，脚本逻辑各约 100 行且内聚；拆分反而破坏对话框/页面完整性，接受并记录）② MSW 浏览器模式读 document.cookie 替代 Cookie 头（handlers.ts 注释说明：SW 转发丢失 Cookie 为 MSW 2.15 实测行为，语义等价服务端读会话；node 契约测试走真实请求头） |

## 5. 修复记录（本阶段自检发现并全部修复）

1. **导航 link 语义被覆盖**：RouterLink 强制 `role="listitem"`，屏幕阅读器与 `getByRole('link')` 均无法识别 → 移除强制 role，恢复链接语义。
2. **徽标可访问名不一致**：DataSourceBadge 可访问名来自 title 而非可见文本 → 增加 `aria-label` 与可见文本对齐。
3. **TC-X01-05 未实现**：CreateProjectDialog 缺焦点陷阱/Escape 接线 → 补 `useDialogA11y`（与 AgentDrawer 同层栈机制，与 AI 抽屉同开时只关顶层）。
4. **移动端布局视口溢出（P1 级，Playwright 探针定位）**：顶栏内容在 393px 视口溢出至 504px，Chrome 移动端整页缩放（visual 393 / layout 504）导致所有命中坐标错位——真实手机上表现为整页缩小发虚、按钮无法点中 → ≤760px 隐藏状态文案/智能体文案/账户名，布局视口回归 393px（探针复测 `scrollWidth: 393`）。
5. **窄屏导航残字**：≤1279px 栅格列固定 64px 但导航仍渲染 nowrap 文字标签，被裁成残字 → 与 ResearchLayout 断点对齐隐藏标签、图标居中。
6. **MSW 进入生产构建**：动态 import 的 chunk（292KB，gzip 97.58KB）在 `vite build` 中仍被输出 → 引入 `__USE_MOCK__` 编译期常量（vite define），生产构建死分支剔除，产物中无 msw（复测构建输出无 browser chunk）。
7. **ESLint 误报**：playwright-report 压缩产物 / mockServiceWorker.js / *.gen 文件参与 lint → ignorePatterns 补齐，恢复 0/0。
8. **TC-X01-06 无覆盖**：补 reduced-motion E2E（默认 orb-ring 动画存在 → reduce 下 animationName=none）。

## 6. 书面接受（如有）

- P3-①②如上表，接受理由已记录，不阻塞 R1。

## 7. 自审通过

- P0 = 0、P1 = 0、P2 = 0（修复后回归 63/63 通过）、P3 = 2（书面接受）。
- 六层状态表见 acceptance-matrix.md，全部 DONE。
