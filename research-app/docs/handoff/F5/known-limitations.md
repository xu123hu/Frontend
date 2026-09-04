# F5 Known Limitations（终期 · 诚实性声明）

> 日期：2026-09-04｜承接 F0-F4 已声明边界，F5 新增 §1-§4。

## 1. INP 测量局限（新增）
本环境（headless Chromium + MSW SW + 本地 dev server）下 `PerformanceEventTiming` 缓冲为空（eventEntries=0/5），INP 记 0ms，形式上过门禁（≤200ms）但非真实响应性证据。交互响应性已由真实点击实时完成（导航+渲染）验证。**真实 INP 需 field（CrUX/Lighthouse lab）测量**；接入真实后端后重测。

## 2. 断网模拟为 fetch 层注入（新增）
MSW(browser worker) 在页面内拦截请求，真实网络层断网（Playwright setOffline / route.abort / CDP emulateNetworkConditions 三种均实测被 SW 屏蔽，fetch 仍返回 200）。故断网 E2E 采用 `window.fetch` 层注入 TypeError（addInitScript + sessionStorage，位于 SW 之上），覆盖 API 客户端 fetch 降级路径（Boundary + 重试 + 不假成功）。**SSE(EventSource)/XHR 上传的断网**由 sse.ts 单测（Last-Event-ID 重连，10 例）与 degraded-messages 覆盖；真实网络断网需真实后端环境（Agent 2 集成后）验证。

## 3. 教育成果回流审批为演示语义（新增）
「模拟管理员审批」为 HumanDecision 演示闭环（前端状态翻转）。真实审批执行、双签（指导教师 + 数据管理员）、L2 去标识个体数据的用途/伦理承诺/时效/水印/审计由后端 Agent 2 承担（M4 §8.7）。前端以 pending_approval 状态为契约边界，接入后端零改动。

## 4. mobile-390 CLS=0.103（新增，P3）
窄屏（390px）堆叠布局加载时产生少量位移，CLS P75=0.103 略超门禁 0.1（08 §2 门禁在标准 1440×900 视口测量）。记录为待优化项：为骨架/头部预留空间以降位移。不影响桌面门禁结论。

## 5. 继承边界（F0-F4，摘要）
- 教育研究 F4 静态占位已在 F5 收口（替换）。
- Lean/SymPy/Z3 真实执行由 Agent 2+ 承担（前端交付 UI + 事件派生）。
- 评审权限裁剪为渲染层语义（真实裁剪归后端）。
- 实时研究循环产物由事件脚本综合（CR-F4-05 草案，后端接入时以 handler 语义对齐）。
- F0-F3 截图字节差异：全量 E2E 回归重跑刷新，内容与既有结论一致。
