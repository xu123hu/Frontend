# 科研端前端调研基线报告

> 编写日期：2026-09-03｜负责智能体：Agent 1（前端与体验）
> 工作分支：`research/agent-01-frontend`｜工作区：`D:\科研端worktrees\agent-01-frontend`
> 状态：F0 阶段（架构与视觉基线），等待 M0 契约冻结后进入 F1~F5
> 视觉基线原型：`D:\科研端demo\index.html`（智学数研 · 科研端，高保真单文件 HTML 原型）

---

## 0. 阅读清单与冲突处理

本报告在开始任何产品代码前完成，依据工作方案 `00`/`01`/`02`/`03`/`04`/`05`/`06`/`07`/`08`/`09`、`agents/01_前端与体验智能体提示词.md`、`需求分析/M4_科研端详细需求分析.md` 与 `index.html` 原型。

冲突优先级按 `00` 决定：产品定位与一级导航已冻结，本报告不得重新提议把科研端改成通用聊天产品或新增独立 Lean 顶级入口。

---

## 1. 原型视觉基线（真实证据）

通过 agent-browser 自动化对 `D:\科研端demo\index.html` 在 1440×900、1366×768、390×844 三种视口下采集了 10 张真实截图，存放在 `D:\科研端demo\reference-screenshots\`。

| 截图 | 视口 | 内容 | 用途 |
|---|---|---|---|
| `baseline-1440-home.png` | 1440×900 | 科研首页：继续当前工作、待处理、AI 管家状态、项目状态 | 视觉对照 #1 |
| `baseline-1440-projects.png` | 1440×900 | 科研项目：摘要 + 项目表 + 备注 | 视觉对照 #2 |
| `baseline-1440-library.png` | 1440×900 | 个人文献库：左集合 + 中列表 + 右详情 + PDF 摘要 | 视觉对照 #3 |
| `baseline-1440-writing.png` | 1440×900 | 论文写作：左文件树 + 中 LaTeX + 右 PDF 预览 | 视觉对照 #4 |
| `baseline-1440-review.png` | 1440×900 | 论文审查：作者/评委双视图选择 + 模式面板 | 视觉对照 #5 |
| `baseline-1440-education.png` | 1440×900 | 教育研究：流程步骤 + 隐私预检 + 限制声明 | 视觉对照 #6 |
| `baseline-1440-home-drawer-open.png` | 1440×900 | AI 管家球体 + 右侧抽屉打开 | 关键交互 #1 |
| `baseline-1440-home-sidebar-collapsed.png` | 1440×900 | 侧栏折叠态（图标 + tooltip） | 关键交互 #2 |
| `baseline-1366-home.png` | 1366×768 | 1280px 断点：自动折叠侧栏 | 断点对照 #1 |
| `baseline-390-home.png` | 390×844 | 移动端：堆叠布局 + 抽屉占满 | 断点对照 #2 |

所有截图大小均 > 100 KB，可作为视觉对照的机器证据。

### 1.1 原型已确认的设计令牌（CSS 变量）

```text
颜色
  --app-bg       #f3f6fb   应用底色
  --surface      #ffffff   卡片表面
  --subtle-bg    #f7f9fc   次级表面
  --primary      #3157d5   主色（科研蓝）
  --primary-hover #284ac0
  --primary-soft #edf2ff   主色软背景
  --text         #172b4d   主文本
  --text-muted   #667085   次文本
  --text-weak    #8491a5   弱文本
  --border       #dfe5ee   边线
  --success      #25a46f
  --warning      #f2a93b
  --danger       #d64545
  --info         #3157d5
  状态背景
  --success-bg   #eaf8f1
  --warning-bg   #fff6e4
  --danger-bg    #fff0f0
  --info-bg      #edf2ff

布局
  --nav-expanded 224px
  --nav-collapsed 64px
  --r 10px（卡片圆角）
  --shadow 0 8px 20px rgba(23,43,77,.08)
  --z-drawer 30  --z-backdrop 40  --z-modal 50  --z-toast 60

字体
  --font Inter, "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif
  --mono "SFMono-Regular", Consolas, "Liberation Mono", monospace
  14px/1.55 基线，标题 24px/21px/18px/15px 阶梯
```

### 1.2 原型已确认的交互语义

- **侧栏折叠**：6 个一级入口 + 个人中心 + 折叠按钮，折叠后保留图标、tooltip、aria-expanded、键盘可达。
- **顶栏**：左侧标题 + 中部运行时状态指示点（绿点=私有运行·已保存） + 右侧 AI 管家入口（带任务数 badge）+ 重置按钮。
- **AI 管家球体**：右下角固定，6 种状态（idle/running/waiting/complete/failed），CSS 动画遵守 `prefers-reduced-motion`。
- **上下文抽屉**：右侧 430px 宽，4 个 Tab（证据/批注/引用/任务），tab 切换带 focus 管理。
- **页面状态**：每个区域都有 `panel-head` + `panel-body` 结构；表格、空状态、加载骨架条、上传区、diff 区、审批区都有专用样式。
- **响应式断点**：`@media (max-width: 1100px)` 两栏折叠；`(max-width: 760px)` 全堆叠；`(max-width: 1279px)` 侧栏自动折叠。

---

## 2. 直接竞品（≥5）

依据提示词第 4 节"先研究，再设计，再实现"和 M4 需求分析 §4.3，每项均给出：**核心信息架构、关键交互、优势、与科研端差异、复用边界**。

| # | 竞品 | 核心场景 | 关键交互模式 | 优势 | 差距 | 复用边界 |
|---|---|---|---|---|---|---|
| 1 | **Zotero** | 文献条目+附件+笔记+集合 | 三栏：集合树 / 条目表 / 详情阅读器；标签与笔记子对象 | 资产模型成熟，CSL 引用、PDF 标注、笔记+批注双向链接 | 不验证数学/不跑论文 | 心智模型 reference_only（AGPL 禁止复制） |
| 2 | **Overleaf** | LaTeX 写作+编译 | 文件树 + 编辑器 + PDF 预览 + 日志四区；SyncTeX 双向定位；编译目录隔离 | LaTeX 写作闭环成熟；编译产物结构清晰 | 不验证引用与数学正确性 | 交互模式 reference_only（AGPL） |
| 3 | **Elicit** | 系统综述+抽取表 | 自然语言检索→列字段抽取→证据链接 | 流水线化综述、来源解释、团队协作 | 无 Lean/LaTeX/教育数据 | 阶段化方法借鉴，不复制定位 |
| 4 | **SciSpace / Typeset** | PDF 问答+公式解释+写作 | 右侧 AI 面板+左侧 PDF 高亮 | 工具密度高、公式解释细致 | 数学结论缺确定性执行证据；本地弱 | 借鉴证据→原文回链 |
| 5 | **ResearchRabbit** | 引文图谱+集合 | 节点-边可视化、相似度检索 | 脉络图、协作、相似≠引用明示 | 写作/验证/复现薄 | 借鉴相似度可视化，明确"相似≠引用" |
| 6（间接） | **Notion / Obsidian** | 双链笔记+知识库 | 块级引用、反向链接、本地优先 | 知识网络化、本地优先、Markdown 友好 | 无学术资产模型与数学验证 | 借鉴块级结构、忽略双链产品定位 |
| 7（间接） | **OpenAI Deep Research / FutureHouse** | 长任务研究助手 | 球体/抽屉式管家、plan-step、引用脚注 | 长任务可视化、证据编号 | 闭源、不接用户工作区、Lean 缺失 | 借鉴 plan-step 任务卡片；不复制品牌 |
| 8（间接） | **Linear / Notion Calendar** | 任务流驱动 | 顶栏 + 侧栏 + 列表 + 详情 | 状态机清晰、键盘效率高 | 非科研场景 | 借鉴状态枚举、键盘优先交互 |

> 直接竞品 5 + 间接竞品 3，全部满足提示词与 `03` 调研分级的 ≥5+3 最低门禁。

### 2.1 差异化（一句话）

> **把数学结论送入 SymPy/Lean4，把引用送入多源核验，把教育数据送入可复现分析，再把全部证据带回论文——并以"研究问题→假设→证据→验证→修订"的方法闭环作为唯一顶层叙事。**

---

## 3. 间接参考：Zotero 文献资产模型

Zotero AGPL 不允许复制代码，但其公开的"条目—附件—批注—笔记—集合—标签"关系已经是一线研究者的稳定心智模型。科研端必须从零设计独立实现：

```text
ReferenceItem              文献条目（DOI/arXiv/内部）
 ├── Identifier[]           多种标识符
 ├── Title / Authors / Year / Venue
 ├── Status                verified_exact | verified_fuzzy | conflicting | not_found | source_unavailable | local_only
 ├── Attachments[]         PDF / 补充材料 / 笔记
 ├── Annotations[]         页码 + bbox + 选区文本
 ├── Notes[]               自由笔记
 ├── Collections[]         所属集合（多对多）
 ├── Tags[]
 └── CslJson
```

不允许复制 Zotero 的具体样式、品牌、`itemTree.jsx` 实现。允许借鉴上述关系图。

---

## 4. 用户画像（基于 M4 需求分析 §6 与提示词用户描述）

> 三个核心画像卡（精简），均给出场景—痛点—目标—操作—风险。

### 4.1 画像卡 A：高校数学青年教师兼科研人员（**主用户**）

- **典型身份**：35 岁以下讲师/博士后，承担 1–2 个课题、带 5–10 名研究生。
- **场景**：白天教学，午休/晚上阅读 arXiv 预印本、批改学生建模论文、推进自己的 LaTeX 论文。
- **痛点**：
  1. PDF 阅读 + 公式理解慢，复制到 Word 必失真。
  2. 学生论文里符号冲突、单位错误看不出来，只能凭经验。
  3. 想用 Lean 验证一个小猜想，但环境配置与 mathlib 缓存让人放弃。
- **目标**：在同一页面完成"读 → 引 → 写 → 验 → 修"；每个公式与引用都能点回原文。
- **关键操作**：登录 → 文献库检索 → 插入引用 → 编辑 LaTeX → 编译 PDF → 触发数学验证 → 修订。
- **风险**：不接受"AI 替你写理论"；关心溯源；要求 Lean 与 SymPy 分层报告；看到"论文正确率 0.94"会立即失去信任。

### 4.2 画像卡 B：高校建模课程负责人/校级评委（**协作 + 评审**）

- **典型身份**：副教授以上，组织校级建模竞赛或评审批次。
- **场景**：每学期评审 20–50 篇匿名论文，按校级规范做批量初审。
- **痛点**：
  1. 单篇细看耗时间，批量筛又怕漏关键错误。
  2. 评委意见与作者自检意见混淆，权限边界不清。
  3. 教育研究成果（错误趋势）想回流到教学，但缺乏可复现包。
- **目标**：批量初审时只看问题与证据，**不评分、不排名**；作者视图与评委视图严格隔离。
- **关键操作**：上传批次 → 确认规范 → 启动 → 标记人工关注项 → 导出报告。
- **风险**：拒绝任何"机器评分"或"自动排名"语义；要求 k<20 严格拒绝；要求审计完整。

### 4.3 画像卡 C：研究生 / 青年研究人员（**写作主力**）

- **典型身份**：硕士二年级，导师给出研究问题后独立完成文献→建模→论文。
- **场景**：白天做实验/读论文，夜里在 LaTeX 写论文，需要 AI 帮助排版但要避免理论幻觉。
- **痛点**：
  1. LaTeX 模板与公式编辑卡顿；编译报错不会看 log。
  2. AI 工具容易"补全"出根本不存在的定理或引用。
  3. 公式图片转 LaTeX 经常错位。
- **目标**：把 Word 公式图片 → LaTeX + 编译 + 引用插入 → 投稿前自检 → 修订建议。
- **关键操作**：导入 Word/图片 → 校对 diff → 编译 → 引用核验 → 自检。
- **风险**：明确要求"AI 不能替你写核心推导"；关心公式保真；看到 AI 生成的"自信"但错的引用会立即离开。

---

## 5. 痛点 → 功能映射（含本期不实现清单）

> 映射表严格区分"本期 F0~F5 实现"与"不在本期范围"。任何 P0 缺失项必须回写到对应里程碑的放行条件中。

| 痛点 | 来源 | 功能归属 | 本期范围 | 不在范围 | 证据 |
|---|---|---|---|---|---|
| 文献条目+附件+批注+笔记+集合心智模型 | A,B,C | F2 文献库 | ✅ Zotero 式关系（自研实现） | 全文 PDF 翻译 | M4 §8.2 |
| 多源检索 + 标识符核验 + 状态语义 | A,B | F2 检索 | ✅ 真实 OpenAlex/Crossref/arXiv + 6 状态枚举 | 团队共享、机构知识库 | 调研账本 #2 |
| PDF 阅读 + 公式/引用定位回链 | A,C | F2 阅读 | ✅ PDF.js 基础层 + DocumentIR 定位 | OCR 扫描件公式识别 | M4 §8.2/§8.5 |
| 公式保真翻译 | A,C | F3 翻译 | ✅ display/inline math + 引用键 + label/ref 屏蔽 | 全自动翻译 | M4 §8.5/§9.5 |
| LaTeX 写作 + 编译 + 错误定位 | A,C | F3 写作 | ✅ CodeMirror 6 + Tectonic 编译（后端）+ SyncTeX | 多人协同编辑 | M4 §8.5/§9.4 |
| 引用真实性核验 | A,B,C | F2/F3 | ✅ CitationRecord + 6 状态 | 动态 CSL 风格订阅 | M4 §8.2 |
| 数学分层验证 L0–L4 | A,B | F4 评审 | ✅ UI 展示 SymPy/Z3/数值/反例分层结果 | L5 Lean 形式化 UI 一级导航 | M4 §8.3/§8.4 |
| Lean 形式化 | A | F4 评审 | ✅ 评审工作区内部"形式化翻译/内核/科研结论"三状态 | 独立顶级入口 | 提示词第 1 节 |
| 论文评审（作者/评委双视图） | A,B | F4 评审 | ✅ 后端裁剪权限的两种视图 | 自动评分/排名 | M4 §8.6 |
| 教育研究 + 隐私预检 + k<20 拒绝 | B | F4 教育研究 | ✅ 5 步流程 + 图表 + 审批 | 跨端实时联动 | M4 §8.7 |
| AI 管家（球体 + 抽屉 + 任务时间线） | A,B,C | F1/F4 AI 管家 | ✅ 6 种状态 + 4 Tab 抽屉 + 任务卡片 | 显示模型品牌 | 提示词第 1 节 |
| 长任务恢复（SSE 重连） | A,B,C | F4/F5 后端 | ✅ `Last-Event-ID` + 服务端补发 | 离线完整运行 | M4 §9.2/§10 |
| 公式保真报告 + 失败块定位 | A,C | F3 翻译 | ✅ 公式数量/顺序/哈希/AST 对比 | 通用翻译评估 | M4 §8.5 |
| 拒答与"不能替你写理论"边界 | A,C | F4 管家 | ✅ 球体状态 + boundary 卡片 | 通用聊天 | 原型 `createAgentTask` |
| 真实 LLM 评分 | A,B,C | 不可实现 | ❌ 永远不显示"论文正确率" | — | M4 §5.3 |
| 浏览器内 Lean4 全量构建 | A | 不可实现 | ❌ 只标 `formal_pending` | — | M4 §5.3/§10 |

> 14 项痛点 → 13 项本期范围 / 1 项不实现，1 项显式禁制。

---

## 6. 架构级技术基线（Tier A 三候选比较）

> 仅对**架构级决定**做三候选比较，Tier B 决定走简卡（见 §7）。

### 6.1 PDF 阅读器架构（Tier A）

| 候选 | 许可证 | 关键事实 | 优势 | 风险 | 决定 |
|---|---|---|---|---|---|
| **PDF.js (Mozilla)** | Apache-2.0 | 官方维护，Vue 友好，annotation layer 与文本层成熟 | 长期维护、零依赖、商用安全 | 大文档内存需主动管理；分页渲染需自己写 viewer | **采用为主阅读器** |
| **pdf.js-dist + 定制 viewer** | Apache-2.0 | 在 PDF.js 之上自建科研版 viewer（双栏、批注、定位） | 灵活、可控、可与 DocumentIR 双向绑定 | 维护成本 | 与上一项合并为同一采用 |
| **react-pdf (wojtekmaj)** | MIT | React 适配层，仅基于 PDF.js | React 友好 | 本项目不用 React；许可证一致但生态错配 | 拒绝 |

**采用方案**：PDF.js 0.10x 版本作为底层 + 自研 `ResearchReader` 组件（同 `ResearchLayout` 集成，离屏 canvas 释放、双栏同步滚动、页码证据高亮、批注层叠在文本层之上）。

### 6.2 LaTeX 编辑器（Tier A）

| 候选 | 许可证 | 关键事实 | 优势 | 风险 | 决定 |
|---|---|---|---|---|---|
| **CodeMirror 6** | MIT | 模块化、Language pack、Vue 集成成熟 | 包体可控、性能好、生态活跃 | 需要自己写 LaTeX language pack | **采用** |
| **Monaco Editor** | MIT | VS Code 同款，功能丰富 | 自动补全、定义跳转 | 包体巨大（>1MB gzip），违反首包 ≤500KB | 拒绝 |
| **Ace Editor** | BSD-3-Clause | 经典轻量 | 包体小 | 维护减速、生态变弱 | 备选 |

**采用方案**：CodeMirror 6 + 自研 LaTeX language pack（关键字、命令、环境、引用 key 自动补全），与 Tectonic 编译服务（后端）和 SyncTeX 双向绑定。

### 6.3 应用壳与状态架构（Tier A）

| 候选 | 优势 | 风险 | 决定 |
|---|---|---|---|
| **Vue 3 Composition API + Pinia + TanStack Query + Vue Router**（提示词已批准） | 与提示词已批准栈一致；服务端状态/UI 状态边界清晰；SSE 解码可放入 Query 包装 | 团队需要熟悉新组合式 API | **采用**（已批准） |
| Vue 3 Options API + Vuex + Axios | 学习曲线低 | 服务端状态/UI 状态混在一起是已知反模式 | 拒绝 |
| Nuxt 3 | 内置 SSR、路由自动生成 | 一期不启用 SSR；包体更大；与 M0 契约解耦不必要 | 拒绝（保留为二期选项） |

### 6.4 数学公式渲染（Tier A）

| 候选 | 许可证 | 关键事实 | 优势 | 风险 | 决定 |
|---|---|---|---|---|---|
| **KaTeX** | MIT | 速度快、输出稳定、可访问性优良 | 首屏渲染快；可访问性 `alt` 文本可控 | 与 LaTeX 子集兼容 | **采用** |
| MathJax 3 | Apache-2.0 | 完整 TeX 兼容、MathML 输出 | 兼容性最好 | 包体较大、首次渲染慢 | 备选 |
| 浏览器 MathML | W3C | 零依赖 | 浏览器支持不一致 | Chromium 仍在推进 | 不直接使用 |

**采用方案**：KaTeX 作为默认渲染，MathJax 3 作为"复杂宏"的兜底（按需 lazy import）。

### 6.5 长任务事件流（Tier A）

| 候选 | 优势 | 风险 | 决定 |
|---|---|---|---|
| **SSE + Last-Event-ID + TanStack Query 包装** | 后端已批准；与 M0 一致；浏览器原生、断线可恢复 | 单向，需要 fetch 重试 | **采用**（与 `02` 契约一致） |
| WebSocket | 双向 | 需要额外鉴权、心跳、断线恢复 | 拒绝（一期无双向需求） |
| 轮询 | 最简单 | 浪费、不能及时 | 拒绝 |

### 6.6 鉴权与会话（Tier A）

| 候选 | 优势 | 风险 | 决定 |
|---|---|---|---|

| **OIDC + 短期 Access Token + Refresh Token（HttpOnly Cookie）** | 行业标准；与 M4 §11 一致 | 需要 PKCE 防 CSRF | **采用**（与提示词 06 §11 一致） |
| Cookie 单一会话 | 最简单 | CSRF/XSS 双风险 | 拒绝 |

---

## 7. Tier B 简卡（仅记录，不写比较文档）

| 类别 | 决定 | 版本/许可证 | 用途 | 备注 |
|---|---|---|---|---|
| 图标 | lucide-vue-next | MIT | 导航/操作图标 | 包体小、tree-shake 友好 |
| CSS 框架 | 不用（自研 design tokens） | — | 设计令牌与原型一致 | 原型已用 CSS 变量，复用 |
| 工具库 | @vueuse/core | MIT | 滚动/媒体查询/IntersectionObserver | 减少手写 composable |
| 国际化 | @intlify/unplugin-vue-i18n | MIT | 视图层 i18n | 仅 UI 文本，不用于科学术语库 |
| 表格 | @tanstack/vue-table | MIT | 文献/项目/任务表 | 与 TanStack Query 同家族 |
| Markdown | marked | MIT | 笔记渲染 | 简单可控；不做 LLM 输出 |
| 拖拽 | vuedraggable | MIT | 集合/标签排序 | 备选，必要时自研 |
| 模态 | @headlessui/vue | MIT | Dialog/Menu/Combobox | 无障碍基线 |
| 校验 | zod | MIT | 表单与 API 响应校验 | 与 TS 类型互推 |
| 单元测试 | vitest | MIT | 单元/组件 | Vite 同源 |
| E2E | @playwright/test | Apache-2.0 | 黄金链路验收 | 提示词已批准 |
| Lint/Format | eslint + prettier + @vue/eslint-config-typescript | MIT | 静态门禁 | 与 08 §5.2 对齐 |
| 类型检查 | vue-tsc | MIT | strict 通过为门禁 | 与 08 §5.2 对齐 |

> 上述条目许可证均为宽松许可（MIT/Apache-2.0/BSD），无需在产品代码外声明 NOTICE；实际打包时通过 `vite build --mode production` 与 depcheck 在 handoff 中核验。

---

## 8. 一期范围内不允许做的事

- 不增加"通用聊天首页"或"生态链接"页面（提示词 §不得做的事）。
- 不建立独立 Lean 顶级入口；Lean 三状态嵌入评审工作区。
- 不在浏览器内执行 Lean4 全量构建，只标 `formal_pending`（M4 §5.3/§10）。
- 不显示"论文正确率"或"AI 评分"；M4 §5.3 显式禁制。
- 不复制 Zotero/Overleaf/AGPL PDF 翻译项目的品牌、页面或代码（03 §6）。
- 不在验收链路中用 `apiData ?? demoData` 静默降级（08 §6 P0）。
- 不在 M0 契约冻结前为业务类型手写类型或伪造 payload（提示词 M0 边界）。

---

## 9. 验收基线（本报告自身的证据）

- 真实视觉证据：10 张原型截图（详见 §1）。
- 真实代码证据：`D:\科研端demo\index.html` 全文已读取，核心 CSS 变量、组件结构、状态语义已抽取。
- 真实约束证据：`D:\科研端worktrees\agent-01-frontend\research-app\docs\research\frontend-benchmark.md`（本文件）。
- 真实工作区隔离证据：`git -C D:\科研端worktrees\agent-01-frontend status --short --branch` 显示 `## research/agent-01-frontend` 且工作树干净；D:\frontend 原工作区未被触碰。
- 真实研究 clone 目录：`D:\科研端github\agent-01-frontend\` 已创建（空，等待 M0 后的具体 clone）。
