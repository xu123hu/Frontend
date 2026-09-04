# F3 设计文档：论文阅读翻译（链路三）与 LaTeX 写作（链路四）

> 阶段：F3｜负责智能体：Agent 1（前端与体验）｜日期：2026-09-04
> 前置：F2 已提交（`c427aa4`）；M0 契约 research-contracts v0.1.0 已冻结；F3 专项调研 `docs/research/f3-benchmark.md`
> 参考基线截图：`D:\科研端demo\reference-screenshots\baseline-1440-writing.png`（写作三栏）

## 1. 范围（来自提示词 F3 里程碑 + 06 §5/§6 黄金链路三/四）

| 交付项 | 来源 | F3 状态 |
|---|---|---|
| 双栏翻译（左原 PDF 右译文，同步滚动） | 06 §5 步骤 2 | 阅读页内"阅读与翻译"入口 + 双栏视图 |
| 选择章节/页发起翻译（后台 + 预算） | 06 §5 步骤 3 | `POST /runs` run_type=translation（冻结）+ SSE 进度/预算 |
| display/inline 公式原样保留，引用/label/ref 不丢失 | 06 §5 步骤 4 | 稳定 ID 屏蔽-恢复 + 数量/顺序/哈希/结构比较（02 §5.8） |
| 点击译文段落定位原文块；点击公式查看保真检查 | 06 §5 步骤 5 | block_id 回链 + 保真检查入口 |
| 公式恢复冲突标记具体块并保留原公式，不显示整篇成功 | 06 §5 步骤 6 | 块级 `partially_translated` 标记 + role=alert |
| 导出译文附带来源和保真报告 | 06 §5 步骤 7 | 导出入口（草案：provenance 视图 + 报告下载） |
| 项目内创建/导入 LaTeX 文稿 | 06 §6 步骤 1 | 写作工作台：文件树 + 创建文稿 |
| AI 生成内容只能作为差异修订，逐项接受/拒绝 | 06 §6 步骤 2 | AI diff 面板：四要素卡片 + hunk 级接受/拒绝 + 审计 |
| 从项目文献库插入引用（已核验 CitationRecord） | 06 §6 步骤 3 | 引用插入弹窗 → `\cite{key}` + `.bib` 更新（Citation.js） |
| 编译任务进入后台，关闭页面后继续 | 06 §6 步骤 4 | run_type=writing + SSE（F2 sse.ts 复用）；刷新恢复按 F2 声明边界 |
| 编译成功显示 PDF、日志、引擎版本和输入哈希 | 06 §6 步骤 5 | 编译时间线 + PDF 预览 + Artifact.sha256 |
| 制造缺失资源和不安全命令，错误精确定位且旧 PDF 不丢 | 06 §6 步骤 6 | 错误行级定位 + Artifact 不可变（历史不覆盖） |
| 从文稿主张打开证据检查，找无证据句并请求补证或降级措辞 | 06 §6 步骤 7 | 证据检查入口（F4 收口 AI 管家回答侧） |

**范围切分声明（诚实性）**：翻译与编译的**后端执行**（LLM 翻译、Tectonic 编译）由 Agent 2+ 承担；前端 F3 交付双栏/编辑器/时间线/diff/引用 UI + run 编排 + 草案 mock 数据源。AI 管家回答侧（证据检查的生成）属 F4；F3 交付其前置 UI（diff 面板、保真报告、编译日志、证据检查入口）。步骤 8/10 的回答生成侧在 F4 收口时跑链路三/四全量回归。

**不在 F3 范围**：多人协同编辑、SyncTeX 双向定位后端（草案层用 block 级定位代替）、完整 LaTeX lint（由后端编译日志承担）、实时协作。

## 2. 契约现状与差距分析（设计前提）

### 2.1 M0 冻结契约可直接复用（不发明、不走草案徽标）

| 冻结资产 | F3 用途 |
|---|---|
| `POST /runs`（202 + run_id + events_url）+ SSE | 翻译 run（run_type=translation）+ 编译 run（run_type=writing）：进度/预算/产物 |
| `RunEvent.step.progress` | 逐段翻译/逐文件编译进度；预算（ResearchRun.budget/spent）展示 |
| `Artifact`（translation/latex_source/compiled_pdf、storage_uri、sha256） | 译文/源码/编译 PDF 产物 + 输入哈希（编译成功展示） |
| `DocumentIR.blocks`（block_id/type/latex/label/references/content_hash） | 译文按 block 组织回链；公式保真比较对象 |
| `VerificationRecord`（method: formula_fidelity/latex_compile、status） | 公式保真报告 + 编译验证状态 |
| `CitationRecord`（verified_sources、csl_json、version_status） | 引用插入候选（仅已核验）+ .bib 生成 |
| `ResearchRun.budget/spent` | 翻译/编译预算展示 |

### 2.2 缺失端点 → 契约请求单（CR-F3-xx，MSW 契约草案 + 徽标）

文稿 CRUD、AI diff、.bib 管理、翻译产物端点、保真报告端点在 M0 中不存在。字段推导依据：02 §4 通用字段 + M4 §8.5/§9.5 + DocumentIR/VerificationRecord 冻结结构。详见 §6。

## 3. 架构级决定（08 §8 Tier A 三候选，详见 f3-benchmark.md §1.4/§2.2/§3）

| 维度 | 采用 | 备选（拒绝理由） |
|---|---|---|
| 翻译工作区 | **双栏对照**：左 PDF.js（复用 Reading）+ 右译文卡片流（block_id 回链 + KaTeX 渲染） | 单页叠加（破坏 F2 划选 bbox 数学）；整文档导出（无同步定位） |
| AI diff | **diff 面板 + 编辑器定位**：四要素卡片（原文/建议/理由/风险）+ hunk 级接受/拒绝 + HumanDecision 审计 | 纯编辑器内嵌（多建议状态复杂）；纯外部面板（无法定位） |
| LaTeX 语言包 | **@codemirror/language-data stex 高亮 + 自研补全**（引用 key/命令/环境 snippet/自动闭合） | codemirror-lang-latex（AGPL 拒绝）；Monaco（包体超限） |
| 引用管理 | **Citation.js**（MIT，.bib 解析/生成 + CSL 格式化） | 自研字符串拼接（格式边缘易错） |
| 编译时间线 | **F2 sse.ts 复用** + artifact 不可变（历史不覆盖）+ 错误行级定位 | 轮询（浪费、不及时） |

## 4. 页面架构与状态矩阵

### 4.1 新增/改造清单（feature-sliced，最小侵入）

```text
src/
├── entities/
│   ├── writing/types.ts            # Manuscript/LaTeXFile/CompileRun/AiSuggestion/DiffHunk（CR-F3 推导）
│   └── translation/types.ts        # TranslationUnit/FidelityReport（引用 DocumentIR/VerificationRecord）
├── features/
│   ├── writing/
│   │   ├── api.ts                  # manuscripts/files/compile run/AI diff/citations（CR-F3-xx）
│   │   └── queries.ts              # 文稿列表/详情/编译时间线/AI diff/引用（vue-query）
│   ├── translation/
│   │   ├── api.ts                  # 翻译 run 发起/产物/保真报告（CR-F3-xx）
│   │   └── queries.ts              # 翻译状态/译文单元/保真报告（vue-query）
│   └── citations/
│       └── use-citations.ts        # CitationRecord → .bib 生成（Citation.js）+ 插入
├── shared/
│   ├── latex/completions.ts        # CodeMirror 补全扩展（引用 key/命令/环境 snippet）【纯函数可单测】
│   └── latex/diff-utils.ts         # hunk 切分/四要素建议类型（纯函数可单测）
├── widgets/
│   ├── LatexEditor/                # CodeMirror 6 封装（stex + 补全 + Decoration 定位）
│   ├── WritingFileTree/            # 文稿文件树（新建/切换）
│   ├── DiffPanel/                  # AI diff 四要素卡片 + 接受/拒绝 + 审计
│   ├── CitationInsertDialog/       # 引用插入弹窗（已核验候选 → \cite + .bib）
│   ├── CompileTimeline/            # 编译时间线 + 日志 + PDF 预览 + 错误定位
│   ├── TranslationPane/            # 双栏译文卡片流 + 保真报告
│   └── FidelityReport/             # 公式保真检查（数量/顺序/哈希/结构 + 失败块标记）
└── pages/research/
    ├── Writing.vue                 # 重构：文件树 + 编辑器 + 编译/日志/PDF + diff 面板
    └── Reading.vue                 # 加"阅读与翻译"双栏视图（复用 PDF 渲染/证据跳转）
```

### 4.2 状态矩阵（15 态适用性）

| 页面/功能 | 适用状态与触发 | 明确不适用的状态（理由） |
|---|---|---|
| 文稿列表/详情 | loading(骨架)/empty(引导新建)/succeeded/failed+retryable/not_found(文稿删除)/offline | queued/running（静态查询） |
| LaTeX 编辑器 | loading(源码加载)/succeeded/offline(允许本地编辑不伪装保存)/failed+retryable | queued/running |
| 翻译发起 | initial/queued/running(SSE 进度+预算)/partial(部分段失败他段成功)/succeeded/failed+retryable/cancelled(用户取消)/offline | waiting_for_approval（翻译无审批点） |
| 公式保真报告 | loading/succeeded/partial(失败块标记)/insufficient（数据不足不伪装） | — |
| AI diff 面板 | loading/empty(无建议)/succeeded(逐项可接受/拒绝)/failed+retryable | queued/running（diff 为同步建议） |
| 编译时间线 | queued/running(progress)/succeeded(显示 PDF/日志/哈希)/failed+retryable(错误定位+旧 PDF 保留)/cancelled/offline | waiting_for_approval（编译无审批点） |
| 引用插入 | loading/empty(无已核验引用→引导)/succeeded(插入+ .bib 更新)/duplicate_key(冲突 key 提示) | running（同步操作） |

## 5. 黄金链路三/四 → 双轨验收用例

### 5.1 功能轨

| 用例 | 步骤 | 通过标准 |
|---|---|---|
| TC-F03-01 | 文献条目 → 阅读与翻译 | 从阅读页进入双栏视图，非孤立工具页；左 PDF 右译文 |
| TC-F03-02 | 发起翻译（章节/页） | POST /runs（run_type=translation）202；SSE 进度与预算展示；无静态假进度 |
| TC-F03-03 | 公式保真 | 译文公式数量/顺序/哈希/结构与原文一致（保真报告逐项列出）；公式原样保留 |
| TC-F03-04 | 公式恢复冲突 | 制造冲突 → 具体块标记 partially_translated + 原公式保留 + 不显示整篇成功 |
| TC-F03-05 | 译文段落回链 | 点击译文段落 → 定位原文块（block_id）|
| TC-F03-06 | 导出译文 | 导出含译文 + 保真报告 + provenance（parser/模型版本/源文档/敏感性）|
| TC-F04-01 | 创建/导入 LaTeX 文稿 | 项目内创建文稿 → 文件树 + 编辑器加载真实 tex |
| TC-F04-02 | AI 生成内容为 diff | AI 建议仅显示为 diff（原文/建议/理由/风险），非直接覆盖；逐项接受/拒绝；拒绝项不写入源文件；决策审计 |
| TC-F04-03 | 引用插入 | 候选仅已核验 CitationRecord；插入 `\cite{key}` + `.bib` 更新；冲突 key 前缀处理 |
| TC-F04-04 | 编译时间线 | POST /runs（run_type=writing）→ SSE 进度 → 成功显示 PDF/日志/引擎版本/输入哈希 |
| TC-F04-05 | 编译失败定位 | 制造缺失资源/不安全命令 → 错误精确定位文件/行/命令 + 上次成功 PDF 不丢失 |
| TC-F04-06 | 证据检查入口 | 从文稿主张打开证据检查 → 列出无证据句 → 请求补证或降级措辞（F4 收口生成侧）|

### 5.2 体验轨

| 用例 | 通过标准 |
|---|---|
| TC-X03-01 | 翻译双栏与原型/调研交互一致（对照 baseline + f3-benchmark §1.4）；移动端 ≤1080px 单栏/抽屉 |
| TC-X03-02 | 保真失败不只靠颜色（文字+role=alert 标记失败块）|
| TC-X03-03 | 编译时间线卡片：阶段徽标/进度/预算/产物哈希可见 |
| TC-X04-01 | 写作三栏（文件树/编辑器/编译预览）与基线截图一致；可调整宽度 |
| TC-X04-02 | AI diff 卡片四要素齐全 + 键盘可达（接受/拒绝按钮可 Tab+Enter）|
| TC-X04-03 | 引用插入弹窗焦点陷阱 + Escape 关闭（复用 use-dialog-a11y）|
| TC-X04-04 | 三视口截图无布局破损；编辑器 390px 可用 |
| TC-X04-05 | 编辑器减少动画；公式/代码等宽字体排版优先级 |

## 6. 契约请求单（需 Agent 2 冻结）

| ID | 请求 | 推导依据 | 前端临时策略 |
|---|---|---|---|
| CR-F3-01 | `GET/POST /manuscripts`、`GET/PATCH/DELETE /manuscripts/{id}/files/{path}` | M4 §8.5 文件树；02 §4 通用字段 | MSW 草案：文稿/文件 CRUD |
| CR-F3-02 | `POST /runs`（run_type=writing）+ SSE | M0 冻结（复用 F2 链路） | 走冻结契约 + run 模拟器扩展 |
| CR-F3-03 | AI diff：`POST /manuscripts/{id}/suggestions`（run_type=writing 产物） | M4 §8.5 润色逐条 | 草案：返回 DiffHunk 列表（原文/建议/理由/风险）+ 决策审计端点 |
| CR-F3-04 | 引用插入：`GET /manuscripts/{id}/citations`（已核验）+ `.bib` 读写 | M4 §8.5；CitationRecord 冻结 | 草案 + 前端 Citation.js 生成 |
| CR-F3-05 | 翻译：`POST /runs`（run_type=translation）+ 产物/保真报告端点 | M0 冻结 + VerificationRecord.method=formula_fidelity | 走冻结契约 + run 模拟器 + 草案保真报告端点 |
| CR-F3-06 | 编译日志解析：`GET /runs/{id}/artifacts/{id}`（log）→ 结构化错误映射 | 02 §5.3 Artifact；M4 §8.5 错误定位 | 草案：日志文本 + 前端行级解析映射 |

## 7. 降级与诚实性设计（08 §6 红线）

- 文稿/引用/diff/保真报告端点运行在 MSW 契约草案：常驻「契约草案数据源」徽标（F1 组件复用）。
- runs/SSE/Artifact/DocumentIR/VerificationRecord/CitationRecord 走冻结契约：真实 schema。
- 翻译进度永远来自 SSE；无事件不显示百分比（F2 约定延续）。
- 公式恢复冲突：标记具体块 + 保留原公式，绝不输出整篇成功。
- 引用插入候选仅已核验 CitationRecord：未核验条目不出现（不能自由生成 `\cite` key）。
- 编译失败：错误结构化定位 + 上次成功 PDF 不丢失（Artifact 不可变）；不允许不安全命令执行（后端沙箱职责，前端只展示）。
- AI diff 拒绝项不写入源文件；每次决策写入 HumanDecision 审计（草案端点）。

## 8. 实施顺序（金路径优先）

1. entities（writing/translation）+ 契约推导类型 + MSW handlers 扩展（含 translation/writing run 事件模拟器）
2. shared/latex（diff-utils 纯函数 + CodeMirror 补全扩展，单测优先）
3. **金路径 = 写作工作区**（TC-F04 全链路）：
   - WritingFileTree + LatexEditor（CodeMirror 6 + stex + 补全）
   - 引用插入（Citation.js + CitationRecord → .bib + \cite）
   - CompileTimeline（run_type=writing + SSE + 日志解析 + PDF 预览 + 错误定位）
   - DiffPanel（AI diff 四要素 + 接受/拒绝 + 审计）
4. 翻译工作区（TC-F03）：Reading 双栏 + 翻译 run + 保真报告 + 冲突标记 + 导出
5. 测试：单测/契约/E2E golden-path-3（写作）+ golden-path-4（翻译）+ 三视口截图
6. code-review 自审（P0/P1=0）+ handoff + 提交

## 9. 内容资产清单（Phase 2 要求，实施前就绪）

| 资产 | 来源/状态 |
|---|---|
| 测试 LaTeX 模板（自研数学建模论文，含公式/引用/图表/节） | F3 自研（不复制 Overleaf）→ 种子文稿 |
| 真实样例 .bib（12 条目，来自 F2 文献种子） | Citation.js 从 CitationRecord 生成 |
| 公式保真基线样例（5 份） | f3-benchmark.md §5.2：BabelDOC 案例/PDFMathTranslate 演示/沉浸式样例/arXiv 双语/自建破坏样例 → 存本地基线库 |
| AI diff 样例（3 份，含建议/理由/风险） | 种子 suggestions（演示逐项接受/拒绝） |
| 参考截图 | baseline-1440-writing.png（写作三栏）+ 本阶段采集翻译双栏基线 |
| 编译样例 | 成功（含哈希）/ 失败-缺失资源 / 失败-不安全命令 三类脚本 |
