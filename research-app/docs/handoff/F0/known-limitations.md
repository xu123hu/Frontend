# F0 Known Limitations

> 真实记录"未做"与"为什么未做"——不使用"基本完成"等模糊词。
> 日期：2026-09-03

## 1. 未实现的业务功能（F1+ 阶段才做）

- **登录真实接入**：F0 仅占位 form。F1 阶段实现 OIDC + 短期 access token + HttpOnly cookie refresh token。
- **首页真实数据**：F0 显示"演示项目"占位。F1 阶段通过 `GET /api/research/v1/projects?limit=20` 接入。
- **项目列表/详情**：F0 占位。F1 阶段实现。
- **文献库检索与阅读**：F0 占位。F2 阶段实现 PDF.js + OpenAlex/Crossref/arXiv 检索。
- **LaTeX 写作**：F0 占位。F3 阶段实现 CodeMirror 6 + Tectonic 编译对接。
- **评审与数学验证**：F0 占位。F4 阶段实现 L0–L4 分层 + Lean 三状态。
- **AI 管家长任务**：F0 仅占位 store。F1+ 阶段通过 RunEvent SSE 接入 Temporal。

## 2. 未做的工程优化

- **Bundle 报告自动生成**：F0 阶段手工列出；F1 阶段接入 rollup-plugin-visualizer 与 size-limit。
- **CI/CD 流水线**：F0 阶段本地命令；F1 阶段接入 GitHub Actions。
- **i18n 真实翻译文案**：F0 仅引入依赖；F1 阶段补 zh-CN/en-US 文案。
- **Storybook / Histoire**：F0 未引入；F1 阶段视情况。
- **E2E 跨浏览器**：F0 Playwright 仅 chromium；F1 阶段按 06 §2 加 Firefox。

## 3. 未做的性能实测

- LCP/INP/CLS：需 F1 阶段接通真实后端数据。
- 10,000 条目虚拟化：F2 阶段。
- 内存回归：F1 阶段。
- SSE 重连：F4 阶段。

## 4. 已知约束

- **M0 契约未冻结**：F0 阶段没有业务 API 客户端；TypeScript 严格模式开启导致 0 error，代价是 F1 阶段接入 OpenAPI 后可能需要微调类型。
- **Playwright webServer 在 Windows 启动 60s 超时**：已用 `npm run dev` 显式启动 + 浏览器自动化截图代替；F1 阶段改用 `reuseExistingServer: true` 并在 CI 路径中显式启动。
- **路由级 SFC 命名与提示词不完全一致**（如 `Literature.vue` vs "文献库"）：F0 阶段文件名沿用目录命名规则（PascalCase 单数），F1+ 不影响业务。

## 5. 不在 F0 范围

- 任何"通用聊天"或"AI 自主写论文"能力（提示词 §不得做的事）。
- 任何模型品牌展示（M4 §5.3）。
- 任何"论文正确率"或"AI 评分"展示（M4 §5.3）。
- 浏览器内 Lean4 全量构建（M4 §5.3/§10）。
- 任何 AGPL/CC BY-NC/许可证未知代码进入产品代码（03 §4.2）。

## 6. 状态机冻结带来的限制

- `AsyncState` 15 个值是契约级枚举；后续 F1+ 阶段若发现不足，必须先更新本文件并写 handoff，不允许"在组件里临时加一个"。
- `AsyncData<T>` 9 个构造器覆盖 9 种基本场景；F1+ 阶段如有新增需求，按"先扩 shared/state，再扩组件"顺序。
