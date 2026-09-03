# F1 Known Limitations

> 真实记录「未做」与「为什么未做」——不使用「基本完成」等模糊词。
> 日期：2026-09-04

## 1. 验证覆盖的真实缺口（不是通过项）

- **TC-F01-09 断网无 E2E 覆盖**：MSW 的 Service Worker 在浏览器内拦截 fetch，Playwright 的 `context.setOffline(true)` 只切断页面与 SW 之间的网络，SW 内 handler 仍返回 mock 响应——因此「真实网络故障」无法在 mock 模式下注入。当前证据仅到单元层（api-client network→offline 映射 + degraded 文案单测）。**收口计划**：F5 阶段接真实后端（或 `page.routeAbort` 直连模式）后补 E2E；在此之前不宣称「断网链路 E2E 通过」。
- **Core Web Vitals 未测量**：MSW 本地 0 延迟下测 LCP/INP/CLS 无证据价值。F3 阶段接真实后端与真实数据量后实测。
- **屏幕阅读器抽样未做**：F5 阶段按 06 §2 完成键盘/读屏审查。F1 已有 role="alert"×10、aria-live、焦点陷阱、reduced-motion 等结构化基础，但未用真实读屏验证。
- **Playwright trace.zip 未归档**：本阶段 trace 仅失败时保留（无失败用例故无 trace 产物）；F5 收尾统一归档全量 trace。
- **E2E 浏览器仅 chromium**：06 §2 的 Firefox 要求 F1 未扩展（F0 已声明的遗留项，F5 收口）。

## 2. 依赖外部裁决的项（阻塞在 Agent 2 / R1）

- **auth/preferences 契约未冻结**（CR-F1-01..04）：当前运行在 MSW 契约草案上，UI 常驻「契约草案数据源」徽标。冻结后需重新生成类型并按真实契约替换 handlers——UI 与用例零改动。
- **OIDC 端到端未接真实 issuer**：认证协议层为会话令牌模型（POST/DELETE /auth/session + GET /auth/me），oidc-client-ts 为预留路径未引入依赖。Agent 2 裁决走 OIDC 网关后仅替换 `features/auth` 内 authClient。
- **`/runs` data 字段 schema 为空**（CR-F1-06）：Run 类型由前端按 M0 枚举对齐，Agent 2 确认 data 字段后收敛生成类型。

## 3. 有意的设计取舍（记录在案，非遗漏）

- **TC-X01-03 按钮「五态」中 success 由页面级行为承载**（创建成功→跳详情、保存成功→文案反馈），无按钮内嵌 success 样式——按钮级 success 会被 200ms 内的路由跳转覆盖，属视觉噪音。详见 acceptance-matrix.md 末尾说明。
- **MSW 浏览器模式直接读 `document.cookie`** 而非依赖请求 Cookie 头：SW 转发丢失 Cookie 为 MSW 2.15 实测行为；语义等价于服务端读会话，node 契约测试走真实请求头。P3 书面接受（code-review §4）。
- **单文件超 200 行**（CreateProjectDialog 430 / Home 376 / Login 373）：SFC 样式同文件惯例，脚本逻辑各约 100 行且内聚，拆分破坏对话框/页面完整性。P3 书面接受。
- **mock 会话/偏好持久化用 SessionStorage**：模拟「服务端留存」语义以支撑刷新场景验收；真实持久化由服务端保证（CR-F1-04）。标签页关闭即失效与真实后端行为一致（会话本来就可过期）。

## 4. F0 遗留且 F1 未处理的项（滚动至后续阶段）

- bundle 报告自动生成（rollup-plugin-visualizer / size-limit）：仍未接入，F1 手工列出产物清单。→ F5 收口。
- CI/CD 流水线、i18n 真实翻译文案、Storybook：仍未做，维持 F0 声明。
- Playwright webServer 在 CI 环境变量预设下 `reuseExistingServer` 失效（本次实测 `CI=true` 预设导致复用失败，需 `$env:CI=''` 显式清空）：本地记录在案，CI 接入时统一解决。

## 5. 明确不在 F1 范围（提示词 F2–F5 里程碑）

文献库/导入/PDF（F2）、翻译/LaTeX/编译（F3）、评审/Lean/管家长任务 SSE（F4）、视觉回归/CWV/读屏收尾（F5）。项目工作区的「研究问题—假设—证据—验证」视图按 design §1 决策为列表 + 状态时间线，巨型图可视化不做。

## 6. 不做的事（红线，永久）

- 不做「论文正确率」「AI 评分」展示；不展示模型供应商名称；不做生态链接导航（M4 §5.3）。
- 不引入静默降级：任何 fallback 必须带 DataSourceBadge / degraded 文案（08 §6）。
- 不在无证据时宣称性能/可访问性/链路通过（09 §2：任何一层未通过即 NOT DONE）。
