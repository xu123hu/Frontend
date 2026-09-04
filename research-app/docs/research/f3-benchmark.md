# F3 专项调研基线：论文阅读翻译与 LaTeX 写作

> 编写日期：2026-09-04｜负责智能体：Agent 1（前端与体验）
> 前置：F0 `frontend-benchmark.md`（总体竞品 + Tier A：PDF.js/CodeMirror 6/KaTeX）与 F2 handoff
> 范围：F3 里程碑（黄金链路三翻译 + 黄金链路四写作）的前端专项调研，仅补充 F0 未覆盖的领域

---

## 0. 阅读清单与冲突处理

本报告在 F3 产品代码前完成，依据 `agents/01_前端与体验智能体提示词.md` F3 里程碑、`06` §5/§6 黄金链路三/四、`02` §5 规范契约、`M4` §8.5/§9.5 与 `reuse-ledger.md`。冲突优先级：本提示词与已批准总体架构 > 本报告。

F0 已冻结的 Tier A 决定（不在本报告重复比较）：PDF.js 阅读器（F2 已落地）、CodeMirror 6 LaTeX 编辑器、KaTeX 公式渲染（默认）+ MathJax 3（兜底）。

---

## 1. 翻译专项竞品（≥4 直接 + 3 间接）

> 每项给出核心架构、关键交互、公式保护策略、复用边界。许可证以项目仓库为准；AGPL 一律 reference_only。

### 1.1 直接竞品

| # | 产品 | 许可证 | 核心架构 | 公式保护策略 | 关键交互 | 复用边界 |
|---|---|---|---|---|---|---|
| 1 | **PDFMathTranslate / pdf2zh** | AGPL-3.0 | "先排版后翻译"：DocLayout-YOLO 定位公式/图表/表格区域 → 只翻译文本 → 写回原坐标；文本流/公式组双通道并行 | `vflag()` 双判定：字体名正则（CM*/MS.M/TeX- 等）+ Unicode 数学字符分类（Lm/Mn/Sk/Sm、0x370-0x3FF）；公式组只保格式不翻译 | CLI/GUI/Docker/Zotero 插件；输出 mono（单语）/dual（双语对照）两版；`-p` 只翻指定页；翻译缓存去重 | reference_only（AGPL）。思想复用：区域分离翻译 + 公式字体/字符双判定 |
| 2 | **BabelDOC**（arXiv 2605.10845） | 开源（仓库 funstory-ai/BabelDOC） | **IR 中间表示**：解耦视觉布局与语义内容 → 翻译阶段把公式等不可译片段 **masking 为占位符** → 自适应排版引擎高保真重建（Nested Structure / CTM Reconstruction）；支持术语一致性、跨页上下文、脚注翻译 | 公式/非可译结构化片段 → placeholder → 翻译后按 IR 重建；保真评估含 layout fidelity/visual aesthetics/terminology consistency | 双语对照；公式与文本混合布局智能处理；多栏/表格识别；与沉浸式翻译 Zotero 插件集成 | reference_only。思想复用：**稳定 ID 屏蔽-恢复 + 数量/顺序/哈希/结构比较**（与 02 §5.8 一致） |
| 3 | **沉浸式翻译 Immersive Translate** | 开源（浏览器插件），PDF Pro 商业 | 网页双栏对照 + PDF 翻译（本地/在线）；AI 重排版（多栏转单栏）；逐段上下对照 | AI 公式识别精确保留 | 双语对照；逐段对照高亮；术语库强制统一；PDF/Epub/网页多格式 | 交互 reference。思想复用：段落级上下对照排版、术语一致性 |
| 4 | **Paper Translator v2**（LuneZhang） | 需核验（GitHub） | **Vue 3 + PDF.js + Express + Gemini**：左原 PDF（canvas+textLayer）右译文，段落级对照高亮 + 同步滚动；公式保护用正则标记 `<formula>` 占位符 → 只翻译纯文本 → 还原 | 正则占位符方案：`$$...$$`/`\[...\]`/`\begin{equation}` 行间、`$...$`/`\(...\)` 行内、独立数学符号、变量单位、化学式、参考文献编号 `[1]`、图表编号均保护 | 拖入即翻译；视口优先（先翻可见页）；流式逐段渲染；暂停/继续省配额；上下文注入（标题/摘要作为翻译上下文） | **架构 reference（技术栈与本项目一致：Vue3+PDF.js+textLayer）**。思想复用：段落级对照高亮 + 同步滚动 + 视口优先翻译 |

### 1.2 间接竞品

| # | 产品 | 借鉴点 | 不复制的 |
|---|---|---|---|
| 5 | DeepL Doc / Google 文档翻译 | 整文档翻译、双语导出 | 无公式保真（对照表：formula processing ✗），不能作为学术基线 |
| 6 | Zotero 翻译插件（immersive-translate/zotero-immersivetranslate） | 阅读器内触发翻译、批注与翻译共存 | AGPL 生态代码 |
| 7 | 知云文献翻译 / 彩云小译 | 论文阅读场景定位 | 界面陈旧、无公式保护（paper-translator-v2 竞品表） |

### 1.3 公式保真翻译的通用技术基线（多来源收敛）

1. **区域/片段分离**：布局层先识别"可翻译文本"与"不可译结构"（公式、图表、引用编号、label/ref、脚注）。
2. **稳定占位符屏蔽**：不可译片段替换为 `<formula-1>`/`{FORMULA0}` 类占位符后只送纯文本给翻译引擎（02 §5.8 "稳定 ID 屏蔽并恢复"）——本报告与 BabelDOC/paper-translator-v2 收敛于此。
3. **保真比较**：恢复后比较**数量、顺序、哈希、可解析结构**（02 §5.8 明文要求）；BabelDOC 扩展为 layout fidelity + terminology consistency。
4. **失败不整篇成功**：单块恢复冲突 → 该块标记 `partially_translated` 保留原公式（06 §5 步骤 6 / GJ3-02-F），禁止"整篇翻译成功"总标记。

### 1.4 翻译前端交互决策（Tier A 三候选）

| 候选 | 布局 | 同步机制 | 公式呈现 | 移动端 | 决定 |
|---|---|---|---|---|---|
| **A：双栏对照（左原 PDF 右译文卡片）** | 左 PDF.js 渲染 + 右译文段落卡片流（对应 block_id） | 视口同步（active page 对齐）+ 点击段落高亮对侧 | 译文卡片内 KaTeX 渲染（formula 原文保留） | 侧栏模式（≤1080px 上下/抽屉） | **采用** |
| B：单页叠加（沉浸式逐段上下对照） | 译文插在原文块下方 | 同页 DOM 对齐 | 同上 | 好 | 备选（PDF 文本层内插 DOM 复杂，易破坏 F2 划选 bbox 数学） |
| C：整文档翻译导出（PDFMathTranslate 式） | 生成译文 PDF | 无同步 | 排版保真 | 好 | 拒绝（无同步定位，不满足 06 §5 步骤 5 回链需求；属后端能力） |

**采用 A**：与 F2 Reading.vue 的 PDF 渲染/批注/证据跳转完全复用；译文按 DocumentIR block 组织（block_id 天然回链原文块）；KaTeX 渲染公式保持与写作一致。这是"从文献条目进入阅读与翻译，而非孤立工具页"（06 §5 步骤 1）的最短路径。

---

## 2. AI diff 交互调研（黄金链路四步骤 2：AI 生成内容只能作为差异修订）

> 来源：Provenance UI_RESEARCH.md（30+ 工具综合）、QCoder 文档、Tiptap AI Toolkit、VS Code Copilot。

### 2.1 成熟交互模式汇总

| 模式 | 代表产品 | 关键特征 | 本产品采纳点 |
|---|---|---|---|
| Inline diff with track-changes styling | Cursor Cmd+K、VS Code | 编辑区内绿/红叠加，Tab 接受 Esc 拒绝 | 编辑器内建议：CodeMirror 6 Decoration（绿色新增/红色删除/黄色替换） |
| Hunk-level accept/reject | QCoder、GitHub PR | 每个连续变更块独立 接受/拒绝；顶部 Accept All / Reject All | **采纳**：AI 改写建议按 hunk 拆分，逐块决策 |
| Suggestion card with reason/risk | Google Docs Gemini、Grammarly、Tiptap | 卡片含 原文/建议/理由/风险；Refine 循环 | **采纳**：四要素卡片（与 GJ4-03-F 对齐）|
| Preview vs Review 双模式 | Tiptap AI Toolkit | preview（改动前预览）/ review（改动后审阅，可撤销） | 采用 review 模式（diff 先应用后逐项接受/拒绝，可逆） |
| 拒绝写入审计 | 本项目红线 | 每条决策写入 `HumanDecision`（M4 §8.5 "润色逐条显示原文/建议/理由/风险，不提供全文一键重写"） | **强制**：接受/拒绝均审计，拒绝项不写入源文件 |

### 2.2 AI diff 前端架构决策（Tier A 三候选）

| 候选 | 实现 | 优点 | 风险 | 决定 |
|---|---|---|---|---|
| **A：diff 面板 + 编辑器内 Decoration 定位** | 右侧 diff 列表（每条：原文/建议/理由/风险 + 接受/拒绝）；点击定位编辑器对应行并高亮 | 与编辑器解耦、审计清晰、键盘可达 | 双处状态需同步 | **采用** |
| B：纯编辑器内嵌（suggestion ghost text） | CodeMirror Decoration 直接展示替换 | 所见即所得 | 多条建议并存时状态管理复杂；理由/风险展示空间不足 | 备选 |
| C：纯外部面板 | 只在侧栏显示 diff | 简单 | 无法定位到正文 | 拒绝 |

**采用 A**：diff 面板为主决策面（满足"原文/建议/理由/风险"四要素 + 逐项接受/拒绝 + 审计），编辑器内仅做定位高亮（点击 diff 项 scrollIntoView + 短暂高亮行）。

---

## 3. LaTeX 编辑技术基线（CodeMirror 6）

> F0 已定 CodeMirror 6。本报告核验 language pack 现状（证据：npmjs/GitHub 2026-08 检索）。

### 3.1 候选比较

| 候选 | 许可证 | 关键事实 | 风险 | 决定 |
|---|---|---|---|---|
| **codemirror-lang-latex（TeXlyre）** | **AGPL-3.0**（2026 从 MIT 切换，因基于 Overleaf lezer-latex grammar） | 功能最全：补全/折叠/环境自动闭合/lint（missing doc env、unmatched env、missing ref、duplicate label、cite without bib、math-only commands） | **AGPL 红线：不得进入产品代码**（03 §6） | **拒绝**（记录至 reuse-ledger 拒绝清单） |
| **@codemirror/language-data + legacy-modes/stex** | MIT | 官方包，基于 CodeMirror 5 的 sTeX mode；基础语法高亮、块结构 | 无补全/lint/环境感知 | **采用为高亮基础** |
| 自研轻量 LaTeX language pack（基于 @codemirror/language StreamLanguage/Lezer） | 自研（MIT 语义） | 补全 `\cite{key}`（引用 key 来自已核验 CitationRecord）、`\ref{label}`、常用命令/环境 snippet、环境自动闭合 | 维护成本 | **采用**（F0 benchmark §6.2 已定"自研 LaTeX language pack"；范围收窄为"stex 高亮 + 引用/命令补全 + 环境自动闭合"，不做完整 lint） |

**决策**：`@codemirror/language-data` stex（高亮） + 自研补全扩展（引用 key / 命令 / 环境 snippet / 自动闭合）。lint 层做最小子集（未闭合环境），完整 LaTeX 错误检查由后端 Tectonic 编译日志承担（编译错误定位在 06 §6 步骤 6）。

### 3.2 引用管理基线

| 候选 | 许可证 | 关键事实 | 决定 |
|---|---|---|---|
| **Citation.js（@citation-js/core + plugin-bibtex）** | MIT | BibTeX/BibLaTeX/Bib.TXT 双向解析与输出；CSL 格式化；浏览器 ~100kB；M4 §66 行已列为参考 | **采用**：.bib 解析/生成、引用格式化（F3 引用插入 + F5 导出） |
| 自研 BibTeX 字符串拼接 | 自研 | .bib 简单结构可控 | 备选（格式边缘情况易错） |

**决策**：引用插入 = CitationRecord（已核验，来自 F2 文献库）→ 前端生成/追加 `.bib` 条目（`@citation-js/plugin-bibtex` 输出）+ 编辑器插入 `\cite{key}` + 冲突 key 前缀处理（M4 §8.5 "冲突 key 写入前处理"）。

---

## 4. 编译时间线与错误定位（黄金链路四步骤 4-6）

- 前端消费 `run_type=writing`（02 §5.1 枚举）的 SSE 事件流（F2 `shared/lib/sse.ts` 直接复用）：`run.created → step.started(compile) → step.progress → artifact.created(compiled_pdf) → run.completed/failed`。
- 编译成功展示：PDF 预览（iframe/object）+ 日志 + 引擎版本 + 输入哈希（`Artifact.sha256`）。
- 编译失败：结构化错误（文件/行/命令）→ 编辑器内行级定位（GJ4-05-F）；**上一次成功 PDF 不丢失**（Artifact 不可变：新 run 生成新 artifact，旧 artifact 保持可下载——02 §9.2 "重试生成新 run，历史不覆盖"）。
- 编译日志解析：不做完整 TeX 日志 AST 解析；解析 `! LaTeX Error:` / `Undefined control sequence` / `File ... not found` 行 + 行列上下文，映射到文件:行。

---

## 5. 结论与复用边界（含基线样例来源）

### 5.1 工程决策汇总

| 项 | 决定 | 依据 |
|---|---|---|
| 翻译工作区 | 双栏对照（左 PDF 右译文卡片，block_id 回链） | §1.4 候选 A |
| 翻译发起 | 阅读页内选择章节/页 → `POST /runs`（run_type=translation，冻结契约）→ SSE 进度+预算 | 02 §5.1；06 §5 步骤 3 |
| 公式保真 | 稳定 ID 屏蔽-恢复 + 数量/顺序/哈希/结构比较；失败块标记部分翻译保留原公式 | 02 §5.8；BabelDOC 论文 |
| AI diff | diff 面板（四要素卡片 + hunk 级接受/拒绝 + 审计）+ 编辑器定位 | §2.2 候选 A |
| LaTeX 语言包 | stex 高亮（MIT）+ 自研补全（引用 key/命令/snippet/环境闭合） | §3.1 |
| 引用管理 | Citation.js（MIT）+ CitationRecord 驱动 + 冲突 key 处理 | §3.2 |
| 编译时间线 | F2 sse.ts 复用 + artifact 不可变 + 错误行级定位 | §4 |

### 5.2 公式保真基线样例（Phase 2 内容资产，来源）

5 个高质量真实行业样例（翻译前后公式数量/顺序/哈希/结构对比，标注优秀原因）：

1. **BabelDOC 论文定性案例（§5）**：脑电信号分析论文双语对照，公式与表格结构完整（术语一致性 + 布局保真）。
2. **PDFMathTranslate 效果演示（EMNLP 2025 Demo）**：含 `a_{i,j}^{k+1}` 上下标层级、`\sqrt{\frac{x^2+y^2}{z}}` 分式根号嵌套、多行等号对齐方程组——翻译后保持排版逻辑。
3. **沉浸式翻译 PDF Pro 公式识别页**：数学与科学公式精确识别示例。
4. **arXiv 双语论文对照**（真实数学预印本英文原文 + 人工中文译文，标注"人工基准"）。
5. **自建破坏性样例**：故意制造公式恢复冲突（如将 `\beta_{0j}` 替换为 `β_0j`）→ 界面标记具体块 + 保留原公式 + 不输出整篇成功（对应 06 §5 步骤 6）。

### 5.3 测试内容资产（F3 实施前就绪）

| 资产 | 来源/状态 |
|---|---|
| 测试 LaTeX 模板（自研，数学建模论文，含公式/引用/图表） | F3 阶段自研，不复制 Overleaf |
| 真实样例引用 .bib（来自 F2 文献种子 12 条目） | F3 用 Citation.js 从 CitationRecord 生成 |
| 测试中文译文样例（翻译输出基线） | 基于 §5.2 样例 |
| 参考截图 | `D:\科研端demo\reference-screenshots\baseline-1440-writing.png`（写作三栏：文件树+LaTeX+PDF 预览）+ 本阶段采集翻译/写作页基线 |

---

## 6. 本报告自身证据

- 真实外部证据：PDFMathTranslate（AGPL/EMNLP 2025，vflag 双判定源码）、BabelDOC（arXiv 2605.10845，IR masking-重建）、沉浸式翻译（官方文档）、paper-translator-v2（Vue3+PDF.js 技术栈）、codemirror-lang-latex（AGPL 切换记录）、Citation.js（MIT，npm）、Provenance UI_RESEARCH（30+ 工具 AI diff 综合）、QCoder/Tiptap/VS Code（diff 交互文档）。
- 真实内部约束：02 §5.1 run_type/§5.8 翻译规范、M4 §8.5/§9.5、06 §5/§6、F2 handoff 复用边界（sse.ts、Reading.vue、literature 域）。
- 待核验假设：paper-translator-v2 许可证未最终确认（仅作架构 reference，不引入依赖）；沉浸式 PDF Pro 为商业功能（不影响交互借鉴）。
