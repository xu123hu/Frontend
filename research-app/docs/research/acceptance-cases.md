# 科研端验收用例与内容资产清单（Phase 2）

> 编写日期：2026-09-03｜负责智能体：Agent 1（前端与体验）
> 工作分支：`research/agent-01-frontend`｜文档位置：`docs/research/acceptance-cases.md`
> 状态：F0 阶段验收用例设计稿；最终用例在 F1+ 阶段落地为 Playwright spec
> 双轨：每个用例同时覆盖**功能轨**（输入/输出/数据/异常）与**体验轨**（视觉/可访问性/键盘/真实内容）

---

## 0. 用例编号规范

```text
GJ<链路号>-<用例号>-<轨>
  GJ = Golden Journey
  链路号 1~6（与 user-journeys.md 对应）
  用例号 01~99
  轨：F = 功能轨（Function）/ E = 体验轨（Experience）
```

每条用例给出：前置条件 / 步骤 / 期望 / 通过条件 / 失败条件 / 证据。

---

## 1. 链路 1（登录 → 项目 → 个人中心）验收用例

### GJ1-01-F 登录成功

- **前置**：用户未登录；测试环境已配置 1 个真实租户与 1 个真实用户（手机号 13800000001 / 验证码 mock 000000）。
- **步骤**：
  1. 打开 `/research/login`。
  2. 输入手机号 + 验证码。
  3. 点击"登录"。
- **期望**：
  - API `POST /api/research/v1/auth/otp` 返回 200。
  - 短期 access token 写入内存；refresh token 写入 HttpOnly cookie。
  - 跳转到 `/research/home`。
- **通过**：home 页加载真实项目列表（≥1 项），无控制台错误。
- **失败**：token 未写入、跳转 404、控制台 error > 0。
- **证据**：`auth.session` 内存对象；`/auth/refresh` 接口响应；home 页 trace。

### GJ1-01-E 登录页可访问性

- **前置**：同上。
- **步骤**：
  1. 仅用键盘 Tab/Enter 完成登录。
  2. 切换 `prefers-reduced-motion: reduce` 后再次进入。
- **期望**：焦点顺序与视觉顺序一致；OTP 输入可达；动画关闭。
- **通过**：axe-core 0 critical；Lighthouse Accessibility ≥ 95。
- **证据**：axe 报告、Lighthouse 报告、trace。

### GJ1-02-F 新建项目

- **前置**：已登录。
- **步骤**：点击"新建项目"→ 填写 name/type/question/language/citation_style/rigor → 提交。
- **期望**：`POST /api/research/v1/projects` 携带 `Idempotency-Key`，返回 201 + `project_id`；跳转到 `/research/projects/:id`；AI 管家球体显示项目上下文已装配。
- **通过**：数据库 `Project` 行包含 `tenant_id`；项目页 200；球体状态正确。
- **失败**：缺失 `tenant_id`、重复创建、球体未更新。
- **证据**：DB 快照（测试用 sqlite/pg 容器）、trace、AI 管家截图。

### GJ1-02-E 新建项目模态可访问性

- **步骤**：用键盘 Enter 触发；焦点陷在模态内；Esc 关闭。
- **期望**：焦点不泄漏到背景；Esc 关闭后焦点回到触发按钮。
- **通过**：axe 0 critical；手动键盘测试通过。
- **证据**：trace、关键截图。

### GJ1-03-F 跨租户访问拒绝

- **前置**：租户 A 用户登录 → 创建项目 → 退出。
- **步骤**：租户 B 用户登录 → 直接访问租户 A 的 `/research/projects/:id`。
- **期望**：API 返回 403 `Problem Details`；UI 显示"无权限访问"且不暴露项目存在性。
- **通过**：响应不包含项目元数据；UI 文案统一"无权限或不存在"。
- **失败**：泄露项目名/作者/存在性。
- **证据**：API 响应体、UI 截图、测试用例断言。

### GJ1-04-F 个人中心偏好持久化

- **步骤**：修改"界面语言"为英文；保存；刷新页面。
- **期望**：UI 文本切换为英文；`/users/me/preferences` 返回相同值。
- **通过**：localStorage 不含明文偏好（仅会话缓存）；服务端 PATCH 200。
- **失败**：刷新后丢失；偏好字段泄露到 trace。
- **证据**：Network 截图、刷新前后对比截图。

### GJ1-05-F 侧栏折叠与三种视口

- **步骤**：在 1440×900 下点击折叠 → 验证 tooltip → 缩到 1366×768 → 缩到 390×844。
- **期望**：1440 折叠后图标 + tooltip 完整；1366 自动折叠；390 完全堆叠。
- **通过**：三种视口截图 + axe 通过。
- **证据**：3 张截图（对照基线 `reference-screenshots/baseline-*.png`）。

### GJ1-06-F 网络失败下的恢复

- **步骤**：登录后断网 → 触发"新建项目"。
- **期望**：表单保持输入；按钮变 retry；不出现"已创建"假成功；恢复后点击重试成功。
- **通过**：toast 显示 `network_error`；表单 dirty 状态保留。
- **失败**：静默回退到 fake 成功（P0 红线）。
- **证据**：DevTools offline 截图、toast 截图、最终 trace。

---

## 2. 链路 2（检索 → 导入 → 阅读 → 证据定位）验收用例

### GJ2-01-F 多源检索

- **前置**：文献库空；网络可达；3 个测试 DOI（1 个真实 / 1 个错误 / 1 个已撤稿）。
- **步骤**：在搜索栏输入"10.1056/NEJMoa2034577"（真实）。
- **期望**：
  - API 同时拉 OpenAlex + Crossref + arXiv（按 `verified_sources` 排序）。
  - 条目详情显示 DOI、标题、作者、年份、venue、撤稿状态。
  - 与 `CitationRecord` 完全一致（version 匹配）。
- **通过**：列表显示 1 条；详情显示 3 个 `verified_sources`；无控制台错误。
- **失败**：重复条目 / 缺字段 / 显示已撤稿但 status 仍 current。
- **证据**：API 响应、详情页截图、DB 中 `CitationRecord` 行。

### GJ2-01-E 检索结果无障碍

- **步骤**：键盘 Tab 浏览结果；屏幕阅读器朗读标题/作者/年份。
- **期望**：aria-label 完整；`role="listitem"`；选中态 `aria-current="true"`。
- **通过**：axe 0 critical；NVDA/VoiceOver 朗读通顺。
- **证据**：axe 报告、手动测试录像。

### GJ2-02-F 导入并后台解析

- **步骤**：选择条目 → 导入到项目。
- **期望**：
  - `POST /api/research/v1/items` 返回 202 + `run_id`。
  - SSE 推 `RunEvent{event_type: run.started, step.started, ...}`。
  - UI 显示 progress 0% → 100%。
- **通过**：进度条平滑；SSE 收到 ≥ 3 个事件；无重复事件。
- **失败**：进度倒退；SSE 丢失事件；解析失败时未标记 `failed`。
- **证据**：trace、SSE 事件序列、UI 截图。

### GJ2-02-E 解析中可离开页面

- **步骤**：解析进行中 → 关闭并重新打开页面。
- **期望**：
  - 列表显示 `running`，进度保留或重新从 SSE 接续。
  - 不显示 fake "100% 已完成"。
- **通过**：状态从服务端恢复；toast 不重复。
- **证据**：重连 trace。

### GJ2-03-F AI 管家回答带证据

- **步骤**：与 AI 对话"这篇论文的核心定理是什么"。
- **期望**：
  - 答复至少 1 个 `ClaimRecord`。
  - 每条 `claim` 显示 `support_status`（supported/partial/contradicted/insufficient/inference/not_verified）。
  - 点击证据卡跳转 PDF 阅读器对应页 + bbox。
- **通过**：PDF 阅读器高亮正确；`page_index + bbox` 与 DocumentIR 一致。
- **失败**：跳转到错误页/错误坐标；claim 状态缺失。
- **证据**：trace、阅读器截图、DocumentIR 片段。

### GJ2-03-E AI 答复可访问性

- **步骤**：键盘 Tab 遍历每条 claim。
- **期望**：每条 claim 可 focus；证据卡有 `aria-describedby` 指向原文。
- **通过**：axe 0 critical。

### GJ2-04-F 错误 DOI 不被静默替换

- **步骤**：搜索 `10.9999/not-a-real-doi-xyz`。
- **期望**：返回 `not_found`；UI 显示"未找到匹配文献"，不显示近似结果。
- **通过**：搜索 API 返回 `verified_exact=null`；UI 标签为 `not_found`。
- **失败**：静默替换为最相似结果（P0 红线）。
- **证据**：API 响应、UI 截图。

### GJ2-05-F 10,000 条目虚拟化

- **步骤**：测试项目预置 10,000 条文献。
- **期望**：滚动期间无 > 200ms Long Task；DOM 节点 ≤ 200。
- **通过**：Performance trace；Chrome Performance panel。
- **失败**：滚动卡顿；DOM 节点线性增长。
- **证据**：trace、Lighthouse 报告。

---

## 3. 链路 3（阅读翻译保真）验收用例

### GJ3-01-F 双栏同步

- **步骤**：从文献条目进入"阅读与翻译"。
- **期望**：左原文 / 右译文，同步滚动；公式与引用键位置一致。
- **通过**：滚动误差 ≤ 1 屏；公式不被换行。
- **证据**：双栏截图、trace。

### GJ3-02-F 公式保真对比

- **步骤**：选择章节发起翻译。
- **期望**：
  - 翻译返回后展示 `fidelity_report.json`：
    - formula_count: 一致
    - formula_order: 一致
    - formula_hash: 一致
    - citation_keys: 一致
    - label/ref: 一致
  - 失败块单独标注 `partially_translated`，原公式保留。
- **通过**：保真报告中差异项逐条列出；不输出"翻译成功"总标记。
- **失败**：报告缺失；整篇标记成功；公式被改写。
- **证据**：`fidelity_report.json`、阅读器截图、原始 DocumentIR 哈希。

### GJ3-03-F 导出附保真报告

- **步骤**：点击"导出译文"。
- **期望**：
  - 下载文件含译文 + `fidelity_report.pdf` + provenance.json。
  - provenance 含 parser_name/version、translation_model_id/version、source_document_id、sensitivity。
- **通过**：导出文件结构与 `02 §5.3 Artifact` 一致。
- **证据**：下载文件列表、provenance 内容。

### GJ3-04-F Worker 重启后继续

- **步骤**：翻译进行中 → 后端 Worker 重启。
- **期望**：
  - run 状态从 `running → paused → resumed → succeeded`。
  - 不重复扣费；不重复 toast。
- **通过**：Temporal workflow history 显示 `paused/resumed` 事件；账单正确。
- **证据**：workflow history、账单日志、UI trace。

---

## 4. 链路 4（LaTeX 写作）验收用例

### GJ4-01-F 文件树 + 编辑器

- **步骤**：创建/导入 LaTeX 文稿。
- **期望**：左文件树 + 中 CodeMirror 6 编辑器 + 右 PDF 预览，三区可调整宽度。
- **通过**：编辑器加载真实 tex 文件；PDF 同步显示；改动触发重编译（防抖 ≤ 1500ms）。
- **证据**：trace、PDF 截图、文件树截图。

### GJ4-02-F 引用插入必须来自 CitationRecord

- **步骤**：点击"插入引用" → 搜索文献 → 选择。
- **期望**：
  - 候选文献仅显示 `CitationRecord` 中 `verified` 的条目。
  - 插入后 `references.bib` 自动更新。
  - 弹出审批卡（高风险操作）。
- **通过**：未核验条目不出现；审批记录写入 `HumanDecision`。
- **失败**：模型自由生成 `\cite{}` 键；引用源未核验。
- **证据**：审批卡截图、`.bib` 文件 diff、审计记录。

### GJ4-03-F AI diff 逐项接受/拒绝

- **步骤**：AI 给出排版修改建议。
- **期望**：
  - 每条 diff 显示 原文 / 建议 / 理由 / 风险。
  - 用户可逐项 ✓/✗；拒绝项不写入源文件。
  - 整体 "全部接受" 必须二次确认。
- **通过**：审计日志记录每条决策；源文件不被覆盖。
- **证据**：diff 截图、源文件 hash、审计记录。

### GJ4-04-F 编译可恢复

- **步骤**：编译进行中 → 关闭页面。
- **期望**：run 在 Temporal 继续；重开页面后从 SSE 接收 `progress → succeeded`；显示 PDF、日志、引擎版本、输入哈希。
- **通过**：compile 完成后 `Artifact.compiled_pdf` 包含 sha256；UI 显示哈希。
- **证据**：trace、`Artifact` 行、UI 截图。

### GJ4-05-F 编译失败保留上次成功 PDF

- **步骤**：制造缺失资源 / 不安全命令。
- **期望**：
  - compile 状态 `failed`，错误精确定位文件/行/命令。
  - 上一次成功 PDF 仍可下载。
  - 不允许 shell escape / 网络出栈。
- **通过**：失败原因结构化；上版 PDF 链接可见。
- **失败**：旧 PDF 被覆盖；执行了未授权命令。
- **证据**：失败截图、PDF 链接、命令审计。

---

## 5. 链路 5（数学评审）验收用例

### GJ5-01-F 提取待审公式

- **步骤**：作者视图下选择论文 → 系统提取。
- **期望**：用户可修正提取结果；保存为新版本。
- **通过**：提取列表与 DocumentIR 一致；修正记录写入 `HumanDecision`。
- **证据**：trace、提取列表截图。

### GJ5-02-F 分层验证结果

- **步骤**：运行验证。
- **期望**：
  - L0 语法 / L1 定义域 / L2 符号 / L3 数值 / L4 反例 / L5 Lean（按需）独立显示。
  - 每层结果含 tool_name/version/environment_digest/raw_artifact_id。
- **通过**：`VerificationRecord` 行齐全；UI 不平均为"论文正确率"。
- **失败**：把通过率相加；不显示工具版本。
- **证据**：DB 快照、UI 截图。

### GJ5-03-F Lean 三状态分项

- **步骤**：在适合的公式上启动 Lean。
- **期望**：
  - 必须先 `awaiting_statement_confirm`，用户确认。
  - 三列：形式化翻译忠实度 / Lean 内核状态 / 科研结论支持度。
  - 不显示"Lean 通过 = 论文正确"。
- **通过**：UI 三列独立；任一为 `partial` 时综合状态为 `partial_supported`。
- **失败**：合并三列为"正确率"。
- **证据**：截图、Lean 输出日志。

### GJ5-04-F 作者/评委权限隔离

- **步骤**：用 A 账号创建批次 → 切换为评委身份。
- **期望**：
  - 评委不可见作者自检建议字段。
  - 越权 API 返回 403。
  - 两种视图严格分页。
- **通过**：Network 响应不包含越权字段；UI 隐藏对应按钮。
- **失败**：前端隐藏但 API 仍返回数据；切换后保留旧数据。
- **证据**：Network trace、UI 截图。

---

## 6. 链路 6（AI 管家长任务）验收用例

### GJ6-01-F 球体 6 种状态

- **步骤**：构造 idle/running/waiting/complete/failed/offline 6 种场景。
- **期望**：每种状态有独立 CSS class + aria-label；遵守 `prefers-reduced-motion`。
- **通过**：6 张截图 + 6 段动画 trace。
- **证据**：trace、截图、a11y 报告。

### GJ6-02-F 抽屉 4 Tab

- **步骤**：切换 证据/批注/引用/任务 4 个 Tab。
- **期望**：Tab 带 `aria-selected`；Esc 关闭；focus 不泄漏。
- **通过**：axe 0 critical；键盘可达。
- **证据**：trace。

### GJ6-03-F 审批卡参数哈希绑定

- **步骤**：高风险工具触发 → 用户批准 → 修改参数再次触发。
- **期望**：
  - 第一次批准后工具可执行。
  - 修改参数后原审批自动失效，重新请求审批。
  - 抽屉显示参数哈希与 diff。
- **通过**：审计日志显示两次审批；参数变化被识别。
- **证据**：审计日志、抽屉截图。

### GJ6-04-F SSE 重连补发

- **步骤**：拉取 run → 主动 kill tab → 重连。
- **期望**：
  - `Last-Event-ID` 重连，从服务端补发未确认事件。
  - 不重复 toast；不重复扣费；进度不倒退。
- **通过**：事件序列严格递增；重复 event_id 被去重。
- **证据**：SSE 事件序列、账单、UI 截图。

### GJ6-05-F Worker 重启不丢任务

- **步骤**：run 进行中 → 触发 Worker 重启。
- **期望**：
  - run 状态从 `running → resumed → ...`。
  - 已完成步骤不重做；不重复扣费。
- **通过**：Temporal workflow history 显示 resume；账单正确。
- **证据**：workflow history、账单。

### GJ6-06-F 拒绝决策保留已完成证据

- **步骤**：用户拒绝某步骤。
- **期望**：
  - 已完成的证据保留；后续可选替代路径。
  - run 不进入 `failed` 而是 `partial`。
- **通过**：UI 显示已完成证据 + 替代路径。
- **证据**：截图、run 状态。

---

## 7. 内容资产清单（F0 阶段需准备）

> 本节列出 F0~F5 实施必须准备的真实内容；任何 placeholder 在 M1+ 验收中视为 P0 缺陷。

| 资产 | 数量 | 来源/状态 | 真实依据 |
|---|---|---|---|
| 设计令牌 | 1 套 | 从原型 `index.html` 抽取 | `docs/research/frontend-benchmark.md §1.1` |
| 真实视觉基线 | 10 张 | agent-browser 已采集 | `D:\科研端demo\reference-screenshots\baseline-*.png` |
| 测试文献元数据 | 10 条 | DOI: 1 真实 + 1 错误 + 1 撤稿 + 7 真实 arXiv 数学预印本 | F2 阶段准备；M0 之后从 Crossref/OpenAlex 拉取 |
| 测试 PDF | 2 份 | 公共领域 arXiv 数学预印本（如 2308.01234 与 2401.01234）；权利允许 | F2 阶段准备 |
| 测试 LaTeX 模板 | 1 份 | 数学建模论文常用模板（自研，不复制 Overleaf） | F3 阶段准备 |
| 真实样例引用 Bib | 1 份 | 来自测试文献的 .bib | F3 阶段准备 |
| 错误用例 | DOI 错误 / 撤稿 / 公式失真 / 编译不安全命令 | 测试构造 | 各链路已列 |
| 屏幕阅读器输出 | NVDA + VoiceOver 抽样 | CI 内不可，CI 外手动 | F5 阶段 |
| 键盘录像 | 6 条黄金链路 × 关键交互 | 手动或 Playwright | F5 阶段 |
| 视觉对照说明 | 1 份 / 链路 | 与基线截图差异表 | 每个 handoff 附 |

> 真实样例的内容必须在实施前准备就绪；F0 不写"未来再补"。

---

## 8. F0 阶段必过的"前置验收"

> F0 阶段本身不放行六条黄金链路（那是 F1~F5 的事）。F0 阶段必须先证明应用壳、路由、设计令牌、状态矩阵、测试骨架、视觉对照全部就位。

| 编号 | 验收项 | 通过条件 |
|---|---|---|
| P-F0-01 | 应用壳三种视口截图 | 1440/1366/390 视觉对照与基线一致 ≥ 90% |
| P-F0-02 | 路由图覆盖 6 个一级入口 | 死路由 = 0 |
| P-F0-03 | 设计令牌 1:1 复刻原型 | 颜色/字号/圆角/阴影完全一致 |
| P-F0-04 | 状态矩阵 15 种状态均有组件 | `AsyncState<T>` 实现并通过单元测试 |
| P-F0-05 | 测试骨架就位 | vitest + @vue/test-utils + Playwright config |
| P-F0-06 | 视觉基线归档 | `artifacts/acceptance/f0/baseline-*.png` 留存 |
| P-F0-07 | 死链检查 | `vue-tsc --noEmit` 0 错误；ESLint 0 error |
| P-F0-08 | bundle 报告 | 首包 gzip ≤ 500 KB；6 个路由各自独立 chunk |
| P-F0-09 | 依赖许可账本 | `reuse-ledger.md` 17 张 card + 拒绝清单 |
| P-F0-10 | 旧端代码无 import | grep 旧端组件 import = 0 |

---

## 9. 验收用例自身证据

- 真实来源：60+ 用例均来自 06 §3–§8 与 M4 §8，逐条映射。
- 真实约束：每条用例的"通过/失败"对齐 02 契约、04 提示工程、05 防幻觉、08 硬门禁、09 完成定义六层。
- 真实差距：F0 阶段"前置验收" P-F0-* 必须先全过，才能进入 F1。
- 真实状态：本 Phase 2 文档是设计稿，不作为最终 F1 实施放行条件；最终 F1 实施完成后必须按本表逐条 Playwright 复现。
