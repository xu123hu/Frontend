# 智能体执行提示词：备课中心 UI 1:1 重构（AI 原生版）

> 本文档是给编码智能体的完整执行指令。请从头到尾顺序阅读后开工，不要跳读。
> 视觉基准已冻结：一切以 `ai-lesson-planning/pages/` 下的 7 个设计稿 HTML 为准，禁止自由发挥、禁止"优化"设计稿。

---

## 0. 执行须知（最高优先级）

1. **视觉基准 = 设计稿 HTML**。开工前必须完整读取以下 8 个文件，理解全部布局、配色、间距、动效后再动手：
   - `ai-lesson-planning/colors_and_type.css`（设计令牌）
   - `ai-lesson-planning/pages/home.html`（AI 对话首页）
   - `ai-lesson-planning/pages/textbook-select.html`（从教材开始）
   - `ai-lesson-planning/pages/upload-materials.html`（上传资料备课）
   - `ai-lesson-planning/pages/template-library.html`(教案模板库)
   - `ai-lesson-planning/pages/ai-generating.html`（AI 生成与大纲确认）
   - `ai-lesson-planning/pages/editor.html`（备课编辑器）
   - `ai-lesson-planning/pages/editor-resources.html`（资源推荐展开态）
2. **技术栈差异处理**：本项目是 Vue 3 + Vite + Naive UI + 自定义 CSS 令牌（`src/styles/tokens.css`），**没有 Tailwind 运行时**。设计稿中的 Tailwind 工具类必须**逐类翻译为 Vue SFC 的 scoped CSS**，使用 `--ailp-*` 令牌变量。1:1 的含义是"渲染结果 1:1"，不是"类名 1:1"。
3. **逻辑换壳，不重写**：悬浮球四大工具（资源推荐/绘图/公式/拍照）、AI 对话、文件上传等已有成熟实现，只换 UI 外壳和挂载位置，**禁止重写其核心逻辑**。详见第 4 节。
4. **该删就删**：旧的表单式备课流程、来源桌、右侧多 Tab 伴侣坞全部下线，不做兼容层、不留死代码。详见第 5 节。

---

## 1. 目标

把现有"备课中心"（教师端 V3 的 Prep 相关页面）整体替换为 AI 原生的备课工作台：

- 打开即 AI 对话首页，一句话启动备课（不再是功能导航页）
- 三条备课入口链路：从教材开始 / 上传资料 / 选择模板
- AI 生成后先出大纲确认，再进入文档式编辑器（不是表单、不是共备稿）
- 所有辅助能力（资源、绘图、公式、拍照、AI 建议）收进右下角悬浮球
- 备课场景内**取消左侧边栏**，编辑器只有"顶栏 + 主编辑区 + 可折叠右侧 AI 面板"

---

## 2. 页面映射总表

| # | 设计稿（视觉基准） | 新建/改造 Vue 页面 | 替换的旧页面/组件 | 建议路由 |
|---|---|---|---|---|
| 1 | `pages/home.html` | `pages/teacher-v3/PrepHome.vue`（新建） | `PrepDeskHome.vue`、`PrepView.vue` 入口部分 | `/teacher/prep` |
| 2 | `pages/textbook-select.html` | `pages/teacher-v3/PrepTextbookSelect.vue`（新建） | 无（新增能力） | `/teacher/prep/textbook` |
| 3 | `pages/upload-materials.html` | `pages/teacher-v3/PrepUploadMaterials.vue`（新建） | PrepView.vue 中的上传环节 | `/teacher/prep/upload` |
| 4 | `pages/template-library.html` | `pages/teacher-v3/PrepTemplateLibrary.vue`（新建） | `VisualChoiceCard.vue` 的模板选择场景 | `/teacher/prep/templates` |
| 5 | `pages/ai-generating.html` | `pages/teacher-v3/PrepGenerating.vue`（新建） | PrepView.vue 的"AI 起草教案"表单 + 环节卡页 | `/teacher/prep/generating` |
| 6 | `pages/editor.html` | `pages/teacher-v3/PrepEditor.vue`（新建） | `PrepDeskWorkspace.vue`（连接共备稿三栏） | `/teacher/prep/editor/:id` |
| 7 | `pages/editor-resources.html` | PrepEditor 的资源抽屉状态（同页状态，非独立路由） | `ResourceCompanionPanel.vue` 场景 | — |

说明：
- 设计稿中的 `editor-resources.html` 是编辑器点击悬浮球"资源推荐"后的抽屉展开态，实现为 PrepEditor 内的一个抽屉组件（如 `PrepResourceDrawer.vue`），不单开路由。
- 路由名可与现有 router 对齐后微调，但入口结构必须按上表落地。

---

## 3. 设计令牌迁移

### 3.1 引入 `--ailp-*` 令牌

把 `ai-lesson-planning/colors_and_type.css` 中 `:root` 的全部令牌追加进 `src/styles/tokens.css`，**加作用域前缀类 `.theme-prep`**（挂在备课中心路由的根容器上），避免污染其他模块的琥珀色主题：

```css
/* 追加到 src/styles/tokens.css 末尾 */
.theme-prep {
  --ailp-primary: #4f46e5;
  --ailp-primary-foreground: #ffffff;
  --ailp-accent: #06b6d4;
  --ailp-background: #f8fafc;
  --ailp-card: #ffffff;
  --ailp-foreground: #0f172a;
  --ailp-muted: #f1f5f9;
  --ailp-muted-foreground: #64748b;
  --ailp-border: #e2e8f0;
  --ailp-radius-sm: 6px;
  --ailp-radius-md: 10px;
  --ailp-radius-lg: 14px;
  --ailp-shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.05);
  --ailp-shadow-md: 0 4px 12px rgba(15, 23, 42, 0.08);
  --ailp-shadow-lg: 0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.05);
  --ailp-shadow-glow: 0 0 30px rgba(99, 102, 241, 0.25);
  --ailp-font-math: "Cambria Math", "Latin Modern Math", "STIX Two Math", Georgia, serif;
  /* 其余 --ailp-* 变量按 colors_and_type.css 全量补齐 */
}
```

同时在 `colors_and_type.css` 里还有 `.ai-glow`、`.gradient-text`、`.ai-bubble-gradient`、`.math-display`、`.math-inline` 五个工具类，一并移植到 `src/styles/prep-center.css`（新建），仅在备课路由引入。

### 3.2 硬性视觉规则

- 主色 `#4f46e5`（靛蓝）+ 辅助 `#06b6d4`（青），渐变统一 `linear-gradient(135deg, #4f46e5, #06b6d4)` 方向；**禁止**把旧主题的琥珀 `#f59e0b` 带进备课中心。
- 图标用 **Lucide**（项目可引入 `lucide-vue-next`，或用现有 `UiIcon.vue` 封装同名图标）。设计稿中 `i data-lucide="xxx"` 的图标名一一对应。
- 数学公式渲染用项目已有的 **KaTeX**（`LatexText.vue` 已有封装），`math-display`/`math-inline` 类对应设计稿中的数学字体样式。
- 圆角、阴影、间距全部取自令牌，不手写魔法数。

---

## 4. 保留并"换壳"的能力清单（禁止重写逻辑）

| 能力 | 现有实现（保留逻辑） | 新 UI 挂载点 | 换壳要求 |
|---|---|---|---|
| AI 对话 | `components/teacherV3/ButlerPanel.vue` + `components/chat/*`（ChatInput、MessageBubble、useChat） | ① 首页中央大输入框；② 编辑器右侧 AI 面板 | 对话消息区按 `editor.html` 右栏样式重做：AI 头像"备小研"+ 在线状态 + 快捷操作胶囊（调整难度/补充例题/增加互动/生成课件）+ 底部输入框；消息气泡用 `.ai-bubble-gradient` |
| 悬浮球 | `components/teacherV3/ButlerFab.vue` | 备课全部页面右下角 | 按设计稿重做为"主球 + 4 子按钮"展开结构：主球紫青渐变 + AI 图标 + 呼吸光晕；子按钮从下到上：资源推荐 / 绘图工具 / 公式编辑 / 拍照上传，各带 tooltip |
| 资源推荐 | `components/teacherV3/ResourceCompanionPanel.vue` 的资源数据与推荐逻辑 | 悬浮球"资源推荐"→ 右侧抽屉（`editor-resources.html` 样式） | 抽屉 360-420px，含分类 Tab（全部/例题/习题/教案/课件/视频）、难度与来源筛选、资源卡片（标签+内容+预览/插入按钮+拖拽手柄）、底部"查看更多资源"与"告诉 AI 你需要什么"；资源卡支持拖入编辑区插入 |
| 绘图工作台 | `components/mathx/draw/DrawBoard.vue`（含 FxMode/GeomMode/HandMode/FreeMode） | 悬浮球"绘图工具"→ 弹层/分屏 | 弹层壳按新 UI 风格重做（圆角 xl、`--ailp-shadow-xl`、顶部标题栏带关闭按钮），画布逻辑原样保留；绘制完成后插入教案 |
| 公式编辑 | `components/mathx/MathField.vue` + `FormulaTextEditor.vue`（mathlive） | 悬浮球"公式编辑"→ 弹窗 + 行内编辑 | 弹窗壳换新 UI 皮肤；编辑器内嵌到教案文本流中时可复用 `editor.html` 中的行内公式卡片样式 |
| 拍照上传 | `components/mathx/PhotoInsertPanel.vue` / `MathCaptureDock.vue` + `components/chat/useFileUpload.js`（sha256 秒传 + 六状态机） | 悬浮球"拍照上传" | 上传状态 UI 按 `upload-materials.html` 的文件卡样式重做（图标+文件名+大小+页数+状态对勾/失败原因+删除） |
| 文件解析预览 | `useFileUpload.js` 的 purpose 型解析 | 上传资料页右栏 | 解析进度四步（识别版面→提取公式→分析结构→生成大纲）+ 三个预览 Tab（内容结构树/知识点置信度/例题卡片），内容数据可先用 `mock/teacherV3Data.ts` 扩展 |
| 教案模板数据 | `mock/teacherV3Data.ts` 中的模板结构（id/name/style_tag/sections/recommended_for/quality_report） | 模板库页 | 卡片升级为"真实封面 + 时间轴预览 + 我的模板 + 资源库引用"结构（见第 6 节第 4 页） |

**AI 建议与学情**：`editor.html` 右侧面板有"AI助手 / 学情 / 建议"三个 Tab。学情数据可接 `companionData.ts` / 已有 companion store；"建议"Tab 内容按设计稿的"学情建议 + 💡建议"卡片样式呈现。

---

## 5. 抛弃清单（删除，不做兼容）

以下旧 UI 在备课链路中整体下线，相关路由指向新页面，组件文件删除或移出构建：

1. **`pages/teacher-v3/PrepView.vue`** — 表单式"AI 起草教案"（课题/教材/课时下拉表单 + 教案模板库三卡选择 + 环节卡时长调整页）。其"模板选择"语义由新模板库页承接，"环节调整"语义由新大纲确认页承接。
2. **`pages/teacher-v3/PrepDeskWorkspace.vue`** — "来源桌 + 连接共备稿 + 右侧六 Tab"三栏工作区。由新 PrepEditor 承接。
3. **`components/teacherV3/TeacherCompanionDock.vue`** — 右侧"建议/资源/插镜/搜课/课件/检查"多 Tab 伴侣坞。AI 建议收敛进编辑器右侧 AI 面板的三个 Tab。
4. **`components/teacherV3/ResourceCompanionPanel.vue`** — 左侧"来源桌"面板。资源能力收敛进悬浮球抽屉。
5. **`components/teacherV3/BriefComposer.vue`、`SlideCanvasV3.vue`** — 旧简报/幻灯画布在备课主链路中的引用（若课件生成有独立入口且不在本次范围，仅解除备课路由内的引用）。
6. **备课场景内的左侧边栏** — `TeacherV3Layout.vue` 在备课路由下不渲染侧边栏（可在路由 meta 里加 `chrome: 'bare'` 控制布局变体，不影响其他页面）。
7. 清理第 1-5 项对应的 **失效 import、路由记录、mock 分支**，并同步更新以下测试文件（删除失效用例、为新页面补冒烟用例）：
   `test/teacher/v3PrepFlow.test.ts`、`v3PrepDesk.test.ts`、`v3PrepBoard.test.ts`、`v3PrepDiff.test.ts`、`v3Components.test.ts`、`v3Butler.test.ts`。
8. `e2e/m3-teacher.spec.ts` 中涉及旧备课流程的选择器/断言同步更新。

> 注意：`butler/FloatingButler.vue` 与 `teacherV3/ButlerFab.vue` 是两条悬浮球实现。本次统一收敛为**一个**新悬浮球组件（如 `components/teacherV3/PrepFab.vue`），备课路由只用它；旧的两个组件从备课路由移除（其他模块若在用 FloatingButler，保持不动）。

---

## 6. 逐页改造指令

### 6.1 首页 `PrepHome.vue`（基准：home.html）

- 结构：顶部导航（Logo"备小研 AI 备课"渐变 + 右侧铃铛/设置/头像）→ 居中欢迎区（问候 + 渐变大标题 + 副标题）→ 大输入框（左附件按钮 + 右发送按钮 + AI 光晕边框 + 下方"支持语音输入 · 拖拽文件上传 · 选择教材章节"）→ 4 张快捷卡（从教材开始/上传资料/选择模板/继续备课）→ 最近备课列表（课题 + 班级/课型标签 + 状态 + 时间）→ 右下角悬浮球（收起态）。
- 交互：输入框发送后携带用户文本跳转 `/teacher/prep/generating`（AI 直接生成）；4 张卡分别跳 textbook-select / upload-materials / template-library / 最近草稿的编辑器。
- 数据：最近备课列表接 `mock/teacherV3Data.ts` 已有教案数据（取 3 条）。
- 验收：首屏无滚动即可见输入框与 4 卡；光晕有缓慢呼吸动画；卡片 hover 有上浮 + 阴影。

### 6.2 从教材开始 `PrepTextbookSelect.vue`（基准：textbook-select.html）

- 结构：顶栏（返回 + 标题 + 右侧三步指示器"选择教材→选择课时→确认生成"，第 1 步高亮）→ 左栏教材版本卡片 2×2（人教A版默认选中：紫边框 + 对勾角标 + 发光；北师大/苏教/人教B）+ 底部"上传自己的教材"虚线入口 → 右栏章节树（顶部搜索框；树：章→节→课时，默认展开"第二章 圆锥曲线与方程 → 2.1 椭圆"，课时"椭圆及其标准方程（第1课时）"选中态）+ 右侧课时预览卡（难度/建议课型/3 条目标预览 + "开始备课，AI 生成教案"主按钮）。
- 数据：教材目录数据放 `mock/teacherV3Data.ts`（新增教材树结构）；"上传自己的教材"入口预留 `useFileUpload.js` 调用（purpose: textbook_rebuild）。
- 验收：选中课时后预览卡内容联动；点击"开始备课"跳 generating 页并带上课时参数。

### 6.3 上传资料 `PrepUploadMaterials.vue`（基准：upload-materials.html）

- 结构：顶栏（返回 + 标题 + 三步指示器，第 2 步"AI 解析"高亮带辉光）→ 左栏已上传文件卡列表（PDF/Word 图标 + 名称 + 大小 + 页数 + 已解析对勾 + 删除；下方"继续添加文件"小拖拽区，标注"PDF, Word, PPT, 图片 (≤20MB)"）→ 右栏解析预览（三个 Tab：内容结构树（教案目标/重难点/6 环节可展开）/ 知识点提取（名称 + 置信度进度条 + "部分识别"警示态）/ 题目例题（题型 + 难度标签 + 题干 + 来源页码））→ 底部操作条（左：用途切换"作为参考资料使用 / 提炼为我的模板"；右：重新解析 + "确认并生成教案"主按钮）。
- 逻辑：上传走 `useFileUpload.js`（sha256 + 六状态机），解析进度四步文案按设计稿；解析结果先用 mock 驱动三个 Tab 展示。
- 验收：删除文件、继续添加、Tab 切换均可用；确认后跳 generating 页。

### 6.4 模板库 `PrepTemplateLibrary.vue`（基准：template-library.html）

- 结构：顶栏（返回 + 标题 + 小搜索框 + "上传教案提炼模板"渐变按钮 + 头像）→ 一级 Tab（全部/我的模板(角标4)/优质课蓝本/内置标准/资源库引用(NEW)）→ 筛选行（课型胶囊组 + 排序）→ **我的模板概览条**（"你已提炼 4 份个人模板 · 累计使用 28 次" + 提炼新模板）→ 模板卡片 3 列网格：每卡上半部为**真实教案封面**（顶部色带 + 模板名 + "高中数学·选择性必修一"副标题 + 灰色内容行 + "共 8 页"角标 + 纸张微倾斜阴影），下半部为名称 + 标签行 + 使用次数/上次使用 + 预览/更多 → **资源库引用专区**（横向大卡：文件夹图标 + "从资源库历史教案中引用" + 描述 + 查看全部）+ 2 列历史教案卡（文件图标 + 文件名 + 时间/大小 + 「引用为模板」「预览」）→ 优质课蓝本横滚区（4 张：椭圆·全国一等奖·人大附中 / 导数·省优课·华师大二附中 / 单调性·部级优课·北京四中 / 空间向量·市优课·上海中学）→ **右侧预览抽屉**（42% 宽，min 560px）：关闭栏 + A4 封面大图 + 4 宫格信息（课型/教学法/环节数/来源）+ 可折叠目录（目标/重难点展开，6 环节带时长，板书/作业/反思折叠）+ 内容预览片段（含 `|MF₁|+|MF₂|=2a (2a>|F₁F₂|)` KaTeX）+ 使用数据（12 次/35% 修改率/96% 好评）+ 底部"编辑模板结构" + "使用此模板备课"主按钮。
- 布局关键：**双栏 flex，各栏独立滚动**（外层 `display:flex; height:100vh; overflow:hidden`；左栏 header/Tab/筛选固定、内容区 `overflow-y:auto`；右抽屉 `flex-shrink:0; width:42%; min-width:560px`）。**禁止**用 fixed 抽屉 + calc padding 腾位（已验证会白屏）。
- 数据：个人模板/资源库历史教案/优质课蓝本用 mock 数据扩展 `teacherV3Data.ts`；"引用为模板"点击后走提炼流程（复用现有上传提炼逻辑或 mock）。
- 验收：Tab/筛选可切换；抽屉预览内容可滚动且与左列表联动；悬浮球位于左栏右下（`right: calc(42% + 24px)`）。

### 6.5 AI 生成 `PrepGenerating.vue`（基准：ai-generating.html）

- 结构：生成中态——中央 AI 图标（锥形渐变光环旋转 + 双层脉冲 + sparkle 呼吸）+ "AI 正在为你生成教案..." + 6 步进度卡（分析教材✓/匹配模板✓/生成目标重难点✓/设计教学过程●进行中带 shimmer/选配例题○/板书作业○）+ "预计还需 8 秒"；完成态——大对勾（紫渐变 + 双层光晕 + 弹性入场）+ "教案大纲已生成 🎉" + 课题副标题 + 大纲预览卡（教学目标 3 条 / 重点难点双栏 / 教学过程 6 环节（色带区分 + 时长 + 摘要）/ 板书主副板书 / 作业三层）+ 快捷调整胶囊 5 枚（调整难度/增加例题/增加互动环节/针对本班学情/增加高考真题）+ 底部"重新生成"次按钮 + "继续编辑"主按钮。
- 逻辑：生成流程接现有备课生成 API/SSE（`api/teacherV3.ts`、`api/sse.js` 已有通道）；若后端未就绪，用 mock 定时推进 6 步（每步 1-2s）后出大纲。快捷调整胶囊点击后在输入区追加对应指令重新局部生成（先 mock）。
- 验收：两态切换流畅；"继续编辑"跳编辑器并带教案 id。

### 6.6 编辑器 `PrepEditor.vue`（基准：editor.html）

- 结构：顶栏（← 返回 + 课题"椭圆及其标准方程（第1课时）" + 标签组"高二(5)班/新授课/人教A版" + "已自动保存 · 2分钟前" + 导出 + ⋯）→ 左侧极窄章节锚点（5 圆点）→ 主编辑区（白卡片，5 大区块：教学目标/重点难点/教学过程（6 环节：情境引入、概念形成（SVG 椭圆示意 + `|MF₁|+|MF₂|=2a`、`(x+c)²+y²=(x-c)²+y²=2a²` 推导）/例题精讲（2 道带"例题"标签与解答步骤）/课堂练习（3 题）/课堂小结/作业布置，每区块标题右侧 [AI 优化] 按钮；教学过程标题带总时长 45 分钟 + [添加环节]）/ 板书设计（主/副两栏）/ 作业布置（基础/提升/拓展三层））→ 右侧 AI 面板 380px（Tab：AI助手/学情/建议；AI 消息气泡 + 快捷操作 4 胶囊 + 底部输入框；学情 Tab：薄弱点"a,b,c 关系混淆 正确率 62%" + 建议）→ 右下角悬浮球展开态（主球 + 资源推荐/绘图工具/公式编辑/拍照上传 4 子按钮 + tooltip）。
- 区块标题右侧的 [AI 优化]：点击把该区块内容发给 AI 重写（走 AI 对话通道），结果 diff 后回填。
- 自动保存：接现有 `stores/teacherContext.ts` / artifactState 机制；顶栏保存状态随保存动作更新。
- 验收：所有区块可直接编辑（contenteditable/受控组件均可）；公式用 KaTeX 渲染；右侧面板可折叠；悬浮球四个子按钮分别打开资源抽屉/DrawBoard 弹层/公式弹窗/拍照面板。

### 6.7 资源抽屉 `PrepResourceDrawer.vue`（基准：editor-resources.html，PrepEditor 内状态）

- 结构：从编辑区右侧滑出 360-420px 抽屉：头部（标题"资源推荐"+ 副标题"为「椭圆及其标准方程」推荐" + 搜索 + 关闭）→ 分类 Tab（全部激活/例题/习题/教案/课件/视频）→ 筛选（难度：全部/基础/中档/拔高；来源：教材/高考真题/模拟题/名校资源）→ 资源卡片列表 6-8 张（例题卡：类型/难度/来源标签 + 题干（KaTeX）+ 预览/插入教案 + 拖拽手柄；教案卡：人大附中教案 + 预览/引用参考；视频卡：渐变封面 + B站·李永乐·8:32 + 预览播放/插入链接；课件卡：PPT 图标 + 25 页 + 预览/下载）→ 底部（"查看更多资源 →" + "没找到想要的？告诉 AI 你需要什么"）。抽屉打开时编辑区"例题精讲"处显示虚线"拖放至此处插入"投放区；悬浮球"资源推荐"子按钮激活发光。
- 数据：资源推荐先接 `mock/teacherV3Data.ts` 扩展（按当前课题过滤）；"插入教案"与拖拽都把资源注入编辑区当前锚点。
- 验收：筛选可用；插入/拖拽后编辑区出现资源块；关闭抽屉恢复布局。

---

## 7. 动效规范（从设计稿 CSS 原样搬运）

- **AI 光晕呼吸**：`ai-glow::after`（blur 12px 双色渐变，opacity 0.6）用于主输入框、悬浮球、生成中图标。
- **悬浮球浮动**：`translateY` 上下 6px 循环 + `shadow-glow` 脉冲。
- **进入动画**：区块 `fade-in-up`（translateY(16px)→0 + opacity 0→1，4-6 级 stagger 延迟 80-120ms）。
- **生成中 shimmer**：进度条高光从左到右循环。
- **对勾弹性入场**：`scale(0.6)→1.05→1`。
- 全部动效放 `src/styles/prep-center.css`，keyframes 命名加 `prep-` 前缀。

---

## 8. 实施顺序（严格按 Phase 提交）

1. **Phase 1 基建**：tokens 迁移（.theme-prep 作用域）+ `prep-center.css` 工具类/动效 + Lucide 接入 + 路由骨架（bare 布局 meta）。验收：typecheck 通过，其他模块视觉零变化。
2. **Phase 2 首页**：PrepHome.vue + 悬浮球收起态。替换备课中心入口路由。
3. **Phase 3 三条入口链路**：textbook-select → upload-materials → template-library（含抽屉）。上传页接 useFileUpload.js。
4. **Phase 4 生成页**：PrepGenerating.vue（mock 先行，API 后补）。
5. **Phase 5 编辑器**：PrepEditor.vue + PrepResourceDrawer.vue + 悬浮球四工具换壳挂载（DrawBoard/MathField/PhotoInsertPanel 嵌入新弹层壳）。
6. **Phase 6 清理**：按第 5 节删除旧组件与路由引用，更新 vitest 与 e2e，跑全量测试。

---

## 9. 验收标准

1. **视觉走查**：7 页与设计稿逐屏对比，布局结构、配色、字号、间距、圆角、阴影一致；设计稿中的每个区块都能在实现中找到。
2. **链路走查**：首页 →（三入口任一）→ 生成页 → 编辑器 → 悬浮球资源抽屉 → 插入资源到教案，全链路可走通（mock 数据允许）。
3. **功能不回退**：悬浮球四工具的绘图/公式/拍照/上传能力与重构前行为一致；AI 对话可收发消息。
4. **工程质量**：`npm run typecheck` 0 错误；`npm run test` 全绿（含更新的备课用例）；无控制台报错；`npm run build` 成功。
5. **回归隔离**：非备课模块（student/research/admin）视觉与功能零变化（.theme-prep 作用域隔离验证）。

---

## 10. 禁止事项

1. 禁止在备课中心引入琥珀色/旧 brand 变量。
2. 禁止恢复左侧边栏、右侧多 Tab 伴侣坞、来源桌、表单式起草向导中的任何一种。
3. 禁止把 Tailwind CDN 或 tailwindcss 依赖加进项目——所有样式翻译为 scoped CSS + 令牌。
4. 禁止重写 DrawBoard/MathField/useFileUpload 等保留组件的核心逻辑，只允许改外壳样式与挂载方式。
5. 禁止用 fixed + calc 百分比 padding 实现编辑器/模板库的双栏布局（会白屏），必须用 flex 双栏 + 各自 overflow-y:auto。
6. 禁止使用 emoji 作为功能图标（设计稿中的 🎉 属于文案内容，可保留）。
7. 禁止在设计稿未覆盖处自行发明新交互；确需补充时保持与新 UI 同风格并在 PR 描述中说明。
