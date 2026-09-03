# 教师端 V3 需求规格说明书（定稿）

> 版本：V3 FINAL · 2026-09-03
> 前序：本文件取代 `d:\teacher-v2-agents\artifacts\02-prototype-v21\SPEC.md` 作为教师端高中数学教学平台唯一施工蓝图。V2.1 中的数学编辑内核、课件工坊、拍照链路、批改三竖直接继承并落地；另按 P1/P2/P3/P4 四批迭代补齐「绘图工作台」「编辑器拍照三选项」「教案十板块重构」「题库改造」，本文件是在**全部原型修改完成后**的收口重写。
> 读者：前端执行智能体、后端执行智能体（后端务必另读 `docs/teacher-v3/BACKEND_GUIDE.md`）、人类评审。
> 冲突裁决：数据契约以 `src/types/teacherV3.ts` 为唯一类型来源；设计红线以本文件 §1 为准；后端实现方式、参考项目、验收口径以 `docs/teacher-v3/BACKEND_GUIDE.md` 为准。

***

## 0. 阅读次序（执行智能体必读）

1. 先看 §1 设计红线——方案与红线冲突时，红线不让。
2. §4 信息架构定页面；§5–§12 定每页交互规格。
3. §13 数据契约指向 `src/types/teacherV3.ts`，禁止各页面私造平行结构。
4. 后端智能体先读 `docs/teacher-v3/BACKEND_GUIDE.md`，再回读本合同 §13 取字段口径。
5. 完成度口径见 §14（原型现状）与 §15（全局验收 G0）。

***

## 1. 设计红线（宪法，违反任何一条 = 返工）

| #   | 红线                 | 含义                                                                                                                                                  |
| --- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | **一切数学元素必须是可编辑对象** | 公式 = MathLive 实例（存 LaTeX）；图形 = JSXGraph 实例（存 board JSON + 参数）；自由画布 = 结构化笔迹配方 `V3DrawRecipe`。严禁以位图/截图作为**最终形态**进入课件/教案/试卷/批改界面。唯一豁免：拍照链路「原图锚定层」（R8）。 |
| R2  | **识别结果也必须可编辑**     | 拍照/手写识别产出的是「载入编辑器的草稿」，不是终稿。错误在编辑器里修正后才落稿，链路绝不「识别即定死」。                                                                                               |
| R3  | **零 LaTeX 心智负担**   | 教师默认不接触 LaTeX 源码。点按插入、拖拽入位、框选包裹、退格删结构。LaTeX 视图仅作高级教师可选项收起。                                                                                          |
| R4  | **生成前先看见**         | 教案/课件生成前必须先展示模板库与真渲染小样，教师选完再生成；模式选择必须可视化（文字标签 + 真渲染小样）。禁止「一句话黑盒出全稿」。                                                                                |
| R5  | **辅助而非替代**         | AI 只出元素级草稿（可 diff、逐块采纳），教师终审定稿；AI 改稿只动被指定元素，不得覆写已 `teacher_confirmed` 的元素。                                                                          |
| R6  | **导出不降级为死图**       | 导出 .pptx 公式转 OMML 对象（PPT 内可再编辑）；图形转矢量并把参数 JSON 写入页备注，可回导再编辑。                                                                                        |
| R7  | **拖拽优先**           | 高频动作全部支持拖拽：拖公式结构入编辑器、拖图形入画布、拖题目入试卷。点按是退化路径。                                                                                                         |
| R8  | **原图永远在场**         | 凡识别/重建场景，原始照片必须与 AI 产物并排显示，作为信任锚点；AI 对不对一眼可判（批改用 `photo_region`、课件用 `anchorPhoto`）。                                                                 |
| R9  | **宁加页，不变形**        | 分页引擎公式与图形内部永不截断，字号下限 20pt，永不缩放挤压；放不下新增页。                                                                                                            |
| R10 | **AI 生图不碰内容页**     | AI 生图只允许用于模板封面风格概念图，严禁用于任何含中文/数学公式的实际内容页。                                                                                                           |
| R11 | **自由画布选择工具置顶**     | 点选元素 → 金色包围框 → 拖动移动 → Delete 删除 → Esc 取消；选中元素右上角浮动红色 × 删除（原图锚定元素除外）。                                                                                |
| R12 | **属性面板固定宽度 264px** | 画布缩放只缩放中间画布区，属性面板宽度不随画布变化；属性面板支持滑杆实时调参、改色改线宽，不破坏结构化存储。                                                                                              |
| R13 | **教案反套话**          | 教案板块若命中空话短语，须给出「反套话」预警，并支持一键围绕课题重写；AI 生成的教案必须自检套话。                                                                                                  |
| R14 | **扫描入库即题库永久资产**    | 拍照/扫描入库的题立即进入题库（含图片题型），归属分类树知识点，可进试卷，来源标记「拍照入库」。                                                                                                    |

***

## 2. 用户画像（一切交互的裁判）

**主角：45 岁左右的高中数学教师（以「老教师不会画图、不会写 LaTeX」为设计下限）**

- 会 Word 公式编辑器按钮，不会写 LaTeX；会在 PPT 插图，不会用形状画圆锥曲线，立体几何画不了。

- 备一节公开课课件平均 3–6 小时，画图和排公式占一半以上。

- 教材、教辅、往年课件是素材源；**拍照是他们最自然的数字化动作**。

- 对「全交给 AI」不信任——逐字检查推导，出错丢脸的是自己。

**交互准则：**

- 任何输入框预期含数学，就挂公式键盘（ƒ 按钮）。

- 任何图形，先给模板库挑 → 参数滑杆调 → 最后才暴露自由构造。

- 任何「选择」，给图不给字（VisualChoiceCard）。

- 所有 AI 产出逐块可采纳/拒绝；教师改过的块有「已手工确认」标记。

- 复杂图形不要求人人会画——构造配方共享让「组里有一人会画」即可。

***

## 3. 技术选型定案（前端）

| 领域         | 定案                                               | 备份                   |
| ---------- | ------------------------------------------------ | -------------------- |
| 公式编辑器      | **MathLive**（`arnog/mathlive`，MIT）               | MathQuill            |
| 图形引擎       | **JSXGraph**（jsxgraph，MIT/LGPL）                  | function-plot        |
| 多面体截面/立体几何 | **自研斜二测 2D 投影算法**（教材标准画法，`mathx/solids.ts`）      | three.js+CSG（仅视觉演示层） |
| Deck 编辑器   | **自研 PPTist 式**（DOM 绝对定位 + 元素组件树）                | —                    |
| 静态公式渲染     | **KaTeX + DOMPurify**（`mathx/latex.ts`，渲染富文本/题干） | —                    |
| 扫描增强       | **Canvas 像素级**（亮/对比/去阴影，`mathx/scanEnhance.ts`）  | 后端 OpenCV 服务端增强      |
| PPT 导出     | pptxgenjs + LaTeX→OMML                           | 先 PDF+矢量             |
| 手写公式识别交互   | 前端采集笔迹（勾/叉/拉出 LaTeX 草稿）→ 后端识别 → MathField 审查（R2） | —                    |

> 识别、VLM 读题重建、Manim 动图渲染、图片智能增强均为**后端服务**，前端只调 API。

***

## 4. 全局信息架构（8 页面 + 1 独立模块）

```
教师端 V3
├── /teacher-v3/today       今日工作台 TodayView       内脏结构继承
├── /teacher-v3/prep        备课中心 PrepView           ★ 十板块重构（§6）
├── /teacher-v3/slides      课件工坊 SlidesView         五区编辑器（§5）
├── /teacher-v3/quiz        组卷中心 QuizView           ★ 题库改造（§7）
├── /teacher-v3/assign      作业与批改 AssignView       批改三视图（§10）
├── /teacher-v3/classroom   课堂互动 ClassroomView      继承 + 复用 mathx 组件
├── /teacher-v3/insights    学情洞察 InsightsView       继承（数据消费方）
├── /teacher-v3/resources   资源中心 ResourcesView       继承 + 配方/图形库管理
└── 绘图工作台 DrawBoard    独立模块（经课件工坊工具栏「✏ 绘图」进入）（§5.7）
```

共享组件层 `src/components/mathx/`：
`MathField.vue`（MathLive 封装）、`GeoFigure.vue`（JSXGraph 封装，17 首发 preset）、`MathKeyboard.vue`、`FormulaPicker.vue`、`FigureDock.vue`、`VisualChoiceCard.vue`、`PhotoInsertPanel.vue`（拍照三选项）、`scanEnhance.ts`（扫描增强）、`cliche.ts`（反套话检测/重写）、`drawCore.ts`（自由画布核心）、`solids.ts`（斜二测立体）、`presets.ts`（图形 preset 注册表）、`latex.ts`（KaTeX 渲染）。

***

## 5. 课件工坊 SlidesView —— 五区编辑器

### 5.1 生成入口

| 入口     | 说明                                                                           |
| ------ | ---------------------------------------------------------------------------- |
| A 主题生成 | 填课题 → 选模板（VisualChoiceCard，生成前）→ AI 元素级草稿（SSE `generation/deck`）→ 逐页 diff 采纳 |
| B 拍照生成 | 拍照 → 选拍什么/生成模式/模板 → 识别 + 分页（SSE `recognition/photo-ingest`）→ 双轨确认            |
| C 教案直通 | 备课已确认教案 → 推送为课件草稿页（`plans/pushToDeck`）                                       |
| 独立入口   | 工具栏「✏ 绘图」→ 独立绘图工作台 DrawBoard（§5.7）                                           |

### 5.2 五区布局

```
顶栏：课件名 · 保存状态 │ AI 助手 · 预览 · 导出 PPTX/PDF
├──  页面大纲（左）
│    16:9 画布：DOM 绝对定位元素树 + 对齐参考线/吸附 + 元素级撤销栈
│    属性面板（右，固定 264px，随选中元素切换）
──  插入坞（底）：公式键盘 │ 图形库（分类） │ 拍照插入 │ AI 改稿
```

### 5.3 元素数据模型

见 `src/types/teacherV3.ts` `V3Element`：`text / formula / geometry / functionPlot / dynamicDemo / image / anchorPhoto / pageNo`，均带 `teacher_confirmed` 标记（R5 防覆写）。

### 5.4 编辑器拍照插入（P2，核心新增）

入口：编辑器顶栏「📷 拍照插入」（`PhotoInsertPanel.vue`）。

1. **扫描增强先行**：选择/拖入照片后，`scanEnhance` 对原图做 亮度+对比度+去阴影 增强，预览显示增强效果（对标「扫描全能王」），教师可调强度。
2. **三选一处理方式（R2/R8）**：

   - **A 图片素材**（`mxd-photo-material`）：用**增强后**的图作为 `image` 元素插入；

   - **B 识别为公式**（`mxd-photo-formula`）：调 `recognition/photo-to-formula` → 识别 latex + 置信度 → **必须载入 MathField 审查**，教师在「识别结果 · 审查后插入」区修改 → 点「确认插入公式」才落稿为 `formula` 元素（中途任何时刻未落稿）；

   - **C 手写原样**（`mxd-photo-original`）：用**压缩/裁剪原图**作 `anchorPhoto` 插入，作为对照锚点。
3. 原图在增强链路中始终保留；识别结果编辑性由 `editable` 与「审查区」共同保证。

### 5.5 拍照生成课件链路（继承 V2.1 §5.10/§5.11）

- 生成前配置：拍什么（题干 / 题干+解答 / 题干+要点）、生成模式（A 留白板书 / B 完整解答 / C 要点讲解，VisualChoiceCard）、挑模板。

- **图形双轨**：P0 原图保留（`anchorPhoto` 贴页）+ P1 升级（图形库近模板 `rebuild` VLM 读题重建 + 构造校验门 `passed_validation=false 不上屏` + 一转动图）。

- **分页引擎（R9）**：块切分 → 版心高度装填 → 安全断点（步骤边界>小问>段落；公式图内永不截断、字号≥20pt）→ 大图随首次引用步骤 → 新页顶部锚条 `anchor_bar` → 填充率色条 → 教师手动调三档字号/推拉步骤。

- SSE 事件序列：`meta → photo(张数) → block×n → paginate → done`。

### 5.6 图形与公式组件规格（继承 V2.1 §5.5/§5.6）

- `MathField.vue` 六大行为：双击就地编辑 / 点按插入 / 拖拽入位（拖 √ 到 3 → √3）/ 框选包裹 / 退格删结构 / LaTeX 高级视图。

- `GeoFigure.vue` 三态：`render / edit（滑杆调参）/ construct（可拖构造，拖完序列化 boardJson）`。

- 首发 **17 个 JSXGraph preset**（`mathx/presets.ts`），覆盖 solid/conic/function/plane/stat 五类；`FunctionPlotElement` 支持表达式生成 + `live_sliders`（放映时滑杆直接可拖）。

- 立体几何：**斜二测 2D 投影**（教材标准画法 `solids.ts`）保证清晰可读，不做真实 3D 渲染。

### 5.7 绘图工作台 DrawBoard（P1，核心新增）

独立模块，经课件工坊画布工具栏「✏ 绘图」进入。三类模式：

| 模式       | 能力                               | 说明                                 |
| -------- | -------------------------------- | ---------------------------------- |
| ① 函数绘图   | 参数滑杆实时出图（y=a·sin(bx+c)+d）        | 90% 基建就绪                           |
| ② 自由画布   | 选择置顶 / 画笔 / 形状模板（R11）            | 70% 基建 + 本次补齐                      |
| ③ 手写公式识别 | 笔迹 → LaTeX 草稿 → MathField 审查（R2） | 前端交互就绪，走 `draw/hand-recognize` SSE |

**自由画布关键交互（R11/R12）：**

- 选择工具置顶；点选元素 → 金色包围框 → 拖动移动 → Delete 删除 → Esc 取消；原图锚定元素禁删。

- 选中元素右上角浮动红色 × 删除。

- **11 类立体图形 chips**：正方体/长方体/正 n 棱柱/正 n 棱锥（参数化 3–8 边）/正四面体/圆柱/圆锥/圆台/球/正方体截面/正方体展开图。

- 选中后**属性面板固定 264px**，滑杆调参/改色/改线宽，全部写在 `V3DrawRecipe.records`（结构化，可整体重开编辑）。

- 撤销/重做按元素入栈。

- **图形库**：结果可存为 `V3FigureLibraryItem`（个人 + 教研组共享），全员复用；`figure 顶点斜二测` 与 `visual 滑杆` 均结构化保存。

***

## 6. 备课中心 PrepView —— 十板块重构（P3，核心新增）

### 6.1 十板块框架（取代扁平环节列表）

`V3_TEN_BOARDS`（`mock/teacherV3Data.ts`）定义十大板块顺序与默认时长，可挂例题标记：

| 板块      | 默认时长 | 可挂例题 |
| ------- | ---- | ---- |
| 课标与学情   | 2    | ✗    |
| 教学目标    | 0    | ✗    |
| 复习引入    | 4    | ✓    |
| 新知探究    | 12   | ✓    |
| 例题精讲    | 14   | ✓    |
| 变式训练    | 8    | ✓    |
| 易错辨析    | 5    | ✓    |
| 课堂小结与检测 | 3    | ✓    |
| 分层作业    | 0    | ✓    |
| 教学反思与板书 | 0    | ✗    |

每板块保留 `teacher_activity / student_activity / design_intent` 三栏（允许内联 `$..$` 公式），新增：

- **挂例题** **`examples`**：结构化数学题 `V3AttachedExample`（label/q\_type/difficulty/stem\_latex/options/answer/source），可一键从题库挂入对应板块，可移除；挂在课件/教案可复用、可进试卷（R1）。

- **反套话** **`cliche? / cliche_hits?`**：以 `cliche.ts`（正则规则库）检测空话短语（如「激发学习兴趣」「培养核心素养」「突出重点难点」）。命中 → 板块显示「反套话」危险标签 + 命中明细；「一键去套话」围绕课题标题把三栏改写成**可检验、可操作**的具体表述（如把「激发兴趣」重写为「能用定义说清 / 给出 3 个可检验目标」），改写后实时候重算、预警消失。

### 6.2 教案 → 课件直通

已确认教案（`plans/confirm`）→ 每个板块可「推送为课件页」`plans/pushToDeck` → 产物进课件工坊待确认草稿（R5）。

***

## 7. 组卷中心 QuizView —— 题库改造（P4，核心新增）

### 7.1 知识点分类树筛选

- 左侧「分类树」三级树（模块 → 章 → 知识点），数据来自 `catalog/quizKpTree`（`V3KpTreeNode`）。

- 叶节点挂 `kp_codes`；选择模块/章时聚合其下全部 `kp_code` 归并过滤；选中后题面只显示归属题目，统计数实时更新。「全部知识点」恢复。

- 题目模型新增 `kp_path: string[]`（分类树定位路径）供按路径筛。

### 7.2 扫描入库（R14）

「＋ 扫描入库」弹层：拖/选图（或「用示例题图」）→ **入库方式**二选一：

- **图片题型原样入库**（`as_image=true`）：保留扫描原图作题干图 `stem_image`，`q_type='image'`，不强制识别；

- **识别成结构题**（`as_image=false`）：走识别链路进可编辑题干。

→ 归属知识点下拉 → 「确认入库」`catalog/quizScanImport` → 题目即时进入题库列表（来源标「拍照入库」）。

### 7.3 图片题型

- `q_type='image'`：`stem_latex` 为说明文字（caption，不送 KaTeX），`stem_image` 为题干扫描图；列表与试卷预览均渲染原题图。

- 图片题照常可选入试卷（分数按解答题口径），来源标「拍照入库」+「图片题」标签。

### 7.4 组卷与 A4 预览（继承）

题库（分类/难度筛）→ 点 ＋ 进试卷 → 右侧 A4 版式实时排版 → 导出 PDF（mock）。

***

## 8. 今日工作台 TodayView

继承 V2。任务优先时间线：下一节课榜（时间/班级/课题/倒计时/备课完成度/缺失项）+ 待处理任务清单（带动作）+ 班级简报（均分/提交率/趋势/薄弱知识点）。数据 `catalog/today`。

***

## 9. 课堂互动 ClassroomView

继承 V2，复用 mathx：出题用 MathField；「学生上台画图」渲染 GeoFigure construct 态。

***

## 10. 作业与批改 AssignView —— 批改三视图

继承 V2.1 §7。三视图：按题聚类（默认，每题正确率环 + 错因分布 + 同类错因一键同批）/ 按人 / 分层（A/B/C）。每题「生成讲评课件」→ SSE `grading/review-pack`（meta → slide → done）。

- 批改数据模型 `V3GradingAssignment`：`questions[].clusters[]`（correct/partial/wrong/blank），sample 内含 `photo_region`（原图 → 左）+ `recognized_steps[]`（识别作答 → 右，可修正，R2/R8）。

- 聚类反馈：AI 起草 → 教师审定 `grading/confirmCluster`（`feedback` 字符串）。

- `V3ErrorTag`：计算错误/概念混淆/步骤缺失/审题错误/方法选择/表达不规范。

***

## 11. 学情洞察 InsightsView

继承，不动（数据消费方）。`catalog/insights`：班级均分/趋势、知识点掌握热力（含薄弱项、delta）、错因标签分布、需关注名单。

***

## 12. 资源中心 ResourcesView

继承 + 配方/图形库管理：统计类 deck/plan/figure-recipe/photo-bank 资源；构造配方共享库（`catalog/recipes`）与绘图图形库（`draw/library`）管理。数据 `catalog/resources`。

***

## 13. 数据契约

唯一类型来源：**`src/types/teacherV3.ts`**。API 面：**`src/api/teacherV3.ts`**（域名分节，见下表）。Mock：**`src/mock/teacherV3Server.ts`** + **`teacherV3Data.ts`**（响应形状与契约严格一致，后端以此为准）。

| 后端域              | 端点（前缀 `/api/teacher-v3`）                                                                                                                      | 前端方法                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| catalog 基础目录     | GET today/classes/tasks/deck-templates/lesson-templates/recipes/quiz/questions/quiz/kp-tree/insights/overview/resources；POST quiz/scan-import | `v3Api.catalog.*`     |
| decks 课件数据面      | GET/PATCH /decks/:id；POST /decks/:id/slides；DELETE /decks/:id/slides/:sid；PATCH /decks/:id/slides/:sid；POST /decks/:id/export                 | `v3Api.decks.*`       |
| plans 教案         | GET/PATCH /plans/:id；POST /plans/:id/confirm、/plans/:id/push-to-deck                                                                          | `v3Api.plans.*`       |
| recognition 识别   | POST photo-ingest（SSE）、rebuild、photo-to-formula                                                                                               | `v3Api.recognition.*` |
| generation AI 生成 | POST generation/deck（SSE）、generation/plan（SSE）、generation/decks/:id/ai-element（SSE）                                                           | `v3Api.generation.*`  |
| figures 图形       | GET figures/presets；POST figures/recipes                                                                                                      | `v3Api.figures.*`     |
| draw 绘图工作台       | GET/POST draw/library；POST draw/hand-recognize（SSE）                                                                                           | `v3Api.draw.*`        |
| grading 批改       | GET grading/assignments、/assignments/:id；POST /assignments/:id/clusters/:cid/confirm、/assignments/:id/review-pack（SSE）                        | `v3Api.grading.*`     |

角色门禁：所有端点仅在 `authorization` 含 `mock-token-teacher-preview` 时放行，否则 403 `role_denied`（后端需以真实 RBAC 对应）。

***

## 14. 原型现状（本次四批迭代全部完成）

| 批次 | 内容                                     | 成交付                                                                            |
| -- | -------------------------------------- | ------------------------------------------------------------------------------ |
| P1 | 绘图工作台（函数绘图/自由画布/手写识别 + 11 立体图形 + 图形库）  | `DrawBoard`、`mathx/drawCore.ts / solids.ts / presets.ts` 扩展、`SlideCanvasV3` 集成 |
| P2 | 编辑器拍照三选项（图片素材/公式识别/手写原样 + Canvas 扫描增强） | `PhotoInsertPanel.vue`、`mathx/scanEnhance.ts`、`SlidesView`「📷 拍照插入」            |
| P3 | 教案十板块 + 挂例题 + 反套话                      | `PrepView` 重构、`mathx/cliche.ts`、`V3_TEN_BOARDS`、`V3AttachedExample`            |
| P4 | 题库分类树 + 扫描入库 + 图片题型                    | `QuizView` 重构、`V3KpTreeNode`、`V3_QUIZ_KP_TREE`、`catalog/quizScanImport`        |

工程状态：全量单测 339 通过（47 文件）；`vue-tsc` 0 错误；路由懒加载 30s；含 SSE 深链路契约测试（photo-ingest/generation deck/generation plan/ai-element/review-pack）与批量交互测试（绘图/拍照/教案/组卷/批改/学情）。

***

## 15. 全局验收（G0）

1. 不识 LaTeX 的教师全程不碰 LaTeX，能产出含 ≥3 公式 + ≥2 图形（含 1 立体几何：正方体斜截截面，斜二测投影）的课件。
2. 拍一道练习册圆锥曲线大题 → 30s 内得到题目页 + 自动分页解答页；题干公式可编辑；图形为原图带升级入口。
3. 编辑器拍照：上传 → 扫描增强预览 → 三选一；「识别为公式」必须先进审查区（R2）、确认才落稿；「手写原样」出 anchorPhoto（R8）。
4. 教案十板块可见「反套话」预警并可一键去套话；可从题库「挂例题」进板块。
5. 组卷中心可按分类树筛选；「扫描入库」把图片/结构题即时入库并可选入试卷。
6. 批改按题聚类下，45 人作业讲评准备 ≤20 分钟；原图始终在场。
7. `vitest` 全量绿 + `vue-tsc` 0 error；后端按 `BACKEND_GUIDE.md` 实现后四域契约测试全绿。

***

## 16. 明确不做（防跑偏）

- 不做 GeoGebra 嵌入/集成（商用授权风险）；不引入 OnlyOffice/Univer 重型编辑器。

- 不做通用 PPT 编辑器（动画时间轴等 PPTist 全量）——只做高中数学课件子集。

- 不做教师端 LaTeX 源码主编辑界面。

- 不做「AI 一键全自动出稿不给人看」任何形态。

- 不做几何照片「像素级识别还原」（全行业无成熟方案）——一律「原图保留 + 读题重建」双轨。

- 识别、VLM 重建、Manim、服务端图片增强全部走后端 API，不塞前端依赖。

- 不用 AI 生图做任何内容页/预览图（R10）。

