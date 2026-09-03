# 教师端 V3 · 后端开发指南（含逐功能参考项目）

> 版本：V3 · 2026-09-03
> 读者：四名后端执行智能体（对应 `d:\teacher-v2-agents\` 的 A2–A5 分工：AI 运行时 / 知识图谱 / 平台数据 / 功能域）与后端评审。
> 目标：让后端拿到前端原型后**有完整上下文**——每个功能参照哪个 GitHub 项目或平台、借鉴什么、不借鉴什么、后端该怎么高质量实现、如何与前端契约对齐、如何验收。
> 前置必读：先读 `docs/teacher-v3/REQUIREMENTS_SPEC.md`（需求与红线）与 `src/types/teacherV3.ts`（**唯一字段口径**）、`src/api/teacherV3.ts`（**唯一端点面**）。
> 冲突裁决：字段以 `teacherV3.ts` 为准；端点与 SSE 事件名以 `teacherV3.ts` + `mock/teacherV3Server.ts` 为准；实现策略以本文档为准。

***

## 0. 你（后端）要交付什么

一个与前端原型**契约同构**的后端实现：每个 `v3Api.*` 调用的端点、请求/响应形状、SSE 事件序列，都必须等价于 `src/mock/teacherV3Server.ts` 当前行为，同时把「mock 硬编码」替换为真实业务逻辑（DB 持久化、AI 服务编排、对象存储、任务队列、RBAC）。

**对齐底线（验收第一门）**：`test/teacher/v3MockContract.test.ts` 与 `v3Pages.test.ts` 等前端测试所断言的契约（响应 `{code,message,data}` 壳、SSE 事件名、枚举值、role 门禁）不能被破坏。前端不改一行即可对接你的真实 API。

***

## 1. 后端域划分与并行边界

按下表切分，四个域可并行（改同一文件注意合并）：

| 域           | 对应前端方法组                                          | 负责智能体（参考分工）         | 承担的功能                                    |
| ----------- | ------------------------------------------------ | ------------------- | ---------------------------------------- |
| catalog     | `v3Api.catalog.*`                                | A4 平台数据             | 今日工作台、班级、任务队列、模板库、题库（分类树/扫描入库/图片题）、学情、资源 |
| contents    | `v3Api.decks.*`、`v3Api.plans.*`                  | A4 平台数据             | 课件/教案 CRUD、直通、导出任务、教案十板块+挂例题+反套话落库       |
| recognition | `v3Api.recognition.*`、`v3Api.draw.handRecognize` | A2 AI 运行时 + A3 知识图谱 | 拍照出课件（SSE）、公式识别、图形重建、手写识别                |
| generation  | `v3Api.generation.*`                             | A2 AI 运行时           | AI 元素级草稿（SSE）：课件/教案/元素建议                 |
| figures     | `v3Api.figures.*`                                | A3 知识图谱             | 图形 preset 元数据、构造配方                       |
| draw        | `v3Api.draw.*`（library/保存）                       | A3 知识图谱             | 绘图工作台图形库                                 |
| grading     | `v3Api.grading.*`                                | A5 功能域              | 批改三视图、聚类反馈确认、讲评生成（SSE）                   |

> 前端把这些端点都挂在 `/api/teacher-v3/*`。若你按域拆微服务，前端已读取设备用网关按前缀路由（`/api/teacher-v3/` → 各域网关），不必改前端。

***

## 2. 通用工程规范（所有域必须遵守）

### 2.1 响应壳与错误码

- 成功：`HTTP 200` + `{ code: 0, message: 'ok', data }`（data 形状严格按表 §4+ §5+ … 与类型文件对齐）。

- 失败：`{ code, message, data: null }` + 对应 HTTP。已有约定错误码（如角色门禁 `40301 role_denied`）；新增错误码集中登记，不要散落。

- 列表一律包 `{ items: [], total }` **非裸数组**（前端与契约测试都这样断言）。

### 2.2 认证与权限

- 原型用 token `mock-token-teacher-preview`。生产用真实 RBAC/租户隔离；所有查询按 `teacher_id + class_id` 作用域过滤，禁止越权读他人班级/学生数据（学情洞察是学生数据，尤其要隔离）。

### 2.3 持久化口径（数学对象不乱存）

| 数据    | 持久化建议                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------- |
| 公式    | **LaTeX 为唯一事实来源**，存 TEXT/JSON 字段；OMML/MathML 推导值缓存或导出时现算，不作为主存储                                         |
| 图形    | `preset_id + params/topples + boardJson?/draw_recipe` 存 JSONB；`boardJson` 用于 construct 态重开，这是 R1「再编辑」的根 |
| 原图    | 对象存储（S3/MinIO/本地盘+CDN），DB 只存 key；`photo_region` 存归一化坐标                                                  |
| 手写笔迹  | `V3DrawRecipe.records` 存 JSONB（结构化配方，可整体重开）                                                             |
| AI 产稿 | 「草稿 + 确认」分离存储：`teacher_confirmed=false` 的草稿不覆写已确认内容（R5）；写库用**版本号乐观锁**避免并发覆盖                             |

### 2.4 AI 服务编排与 SSE

- 前端 SSE 通道见 `v3Api.v3Sse`：用 `fetchEventSource`，`Accept: text/event-stream`，事件以 `event: <name>` + `data: <json>` 逐帧推送；前端 `abort()` 会断连。

- **后端必须支持中途断开/重试**（任务队列里编排，非同步长连接）——生成是分钟级任务，前端 abort 或刷新后应能从任务中心恢复。

- 事件名与载荷严格对照下表（缺一个或改名都会挂前端联调）：

| 功能        | SSE 路径                                      | 事件序列                                                                               |
| --------- | ------------------------------------------- | ---------------------------------------------------------------------------------- |
| 拍照出课件     | POST `/recognition/photo-ingest`            | `meta` → `photo`（每张）→ `block`×n → `paginate` → `done`（返回 `{deck, blocks_by_page}`） |
| 主题生成课件    | POST `/generation/deck`                     | `meta` → `outline` → `slide`（逐页草稿）→ `done`                                         |
| 教案生成      | POST `/generation/plan`                     | `meta` → `outline` → `section`（逐板块，十板块）→ `done`                                    |
| 元素级 AI 建议 | POST `/generation/decks/:id/ai-element`     | `suggest` → `diff`（元素级，不落库）→ `done`                                                |
| 手写识别      | POST `/draw/hand-recognize`                 | `meta` → `recognizing` → `result`（`{latex, confidence}`）→ `done`                   |
| 讲评生成      | POST `/grading/assignments/:id/review-pack` | `meta` → `slide` → `done`                                                          |

### 2.5 幂等与并发

- 生成/入库类 POST 需幂等键（前端可重试）；`confirm`、`confirmCluster`、`pushToDeck` 等确认类写操作要可重入。

- `teacher_confirmed`、`cliche` 等状态位更新用条件更新，避免覆盖教师实时编辑。

***

## 3. 逐功能后端实现 + 参照项目/平台

> 每条给：**功能 → 参照对象（仓库/平台+许可）→ 借鉴什么 → 不借鉴什么 → 后端落地要点**。
> 许可定级沿用 Reference Map 约定：A=可集成（MIT/Apache BSD）、B=结构参考禁复制代码（GPL）、C=仅概念参考（AGPL 最严）。

### 3.1 公式处理（formula）——全域共享

**功能**：LaTeX 存储/渲染/导出；识别产出的 LaTeX 需与只读渲染、MathLive 可编辑、导出 OMML 三方对齐。
**参照**：**MathLive** `arnog/mathlive`（A，MIT）——前端已集成；**MathQuill** `mathquill/mathquill`（A，MIT）兜底。导出链路见 **PptxGenJS**与 **MML2OMML**。
**借鉴**：`insert()` 点按/拖拽语义、LaTeX↔MathML↔ASCII 三角转换已被前端承担；后端只需把 LaTeX 当 opaque 字符串正确存取，不做语义解析。
**不借鉴**：不要把 LaTeX 当 HTML/常做解析渲染（渲染已由前端 KaTeX/MathLive）。
**后端要点**：① DB 存 `latex` 字符串（utf8）；② 提供导出转换服务：`latex → MathML（mathlive/mathjax-node 都行）→ OMML（MML2OMML.XSL）→ pptx 原生公式节点`；③ 长文/题目题干里 `$..$` 内联公式在后端只当纯文本保留，别拆结构。
**验收**：白盒/黑盒往返一致——`latex` 存进去、读出来渲染等价。

### 3.2 公式/手写识别（recognition）——AI 运行时

**功能**：`photo-to-formula`（印刷与手写公式照片 → LaTeX + 置信度）、`hand-recognize`（笔迹 → LaTeX 草稿）。
**参照**：

- **pix2tex / LaTeX-OCR** `lukas-blecher/LaTeX-OCR`（A，MIT）——单行印刷/手写公式图像→LaTeX，视觉编码器 + transformer 解码器，可自训练（合成数据 IM2LATEX）。

- **UniMERNet** `opendatalab/UniMERNet`（参考，研究许可证/开源推进中）——通用数学表达式识别（含印刷+手写+长式合并），中文数学场景领先。

- **Uni-MuMER**（参考研究）——手写数学识别多模态。

- **MyScript**（闭源 SDK，商用授权）——行业级手写数学，可作高标准对标，不集成。

- 基准 **CROHME**（手写公式评测）、**IM2LATEX-100K**、**UniMERDataset**。
  **借鉴**：识别结果带 `confidence`；前端据此决定是否需要 MathField 人审（R2）。
  **不借鉴**：不把识别做成「可信终稿」——识别错率高场景一律交人审（红线 R2 要求识别绝不落定）。
  **后端要点**：① 服务化部署单行模型 + 批量接口；② 输出 `latex + confidence`；③ **印刷公式、手写公式分别路由模型**（印刷可用 pix2tex，手写用 UniMuMER 类）；④ 识别返回的 LaTeX 可能含识别噪声，前端已用 MathField 给人审，后端不要做「纠错性后处理」（错误的医生是教师）。
  **验收**：给一组高中题（印刷/手写/照片）→ 返回合法 LaTeX；对含中文污染的返回 `confidence` 低值以便前端切人审。

### 3.3 版面切分 / 拍照出课件（photo-ingest）——AI 运行时

**功能**：整页拍照 → 切成 `stem/sub/figure/solution-step` 块 → 装配成 deck → 自动分页（R9）→ SSE 下发。
**参照**：

- **MinerU** `opendatalab/MinerU`（A/IAP，开源 PDF 解析）——版面还原、图表定位、公式与文本模块切分。

- **IBM docling** `docling-project/docling`（A，MIT）——文档→结构化块（含表格/图表/段落边界），支持版面模型。

- **PaddleOCR** `PaddlePaddle/PaddleOCR`（A，Apache-2.0）——中文/公式 OCR + 版面分析（PP-Structure），工程接入成熟。

- **Tesseract** `tesseract-ocr/tesseract`（A，Apache-2.0）——轻量兜底。

- 分页引擎规格见 `REQUIREMENTS_SPEC.md §5.5`（块切分→装填→安全断点→锚条→填充率）。
  **借鉴**：版面为「块序列 + 每块边界 bbox + 类型」，与 `V3RecognizeBlock` 对齐。
  **不借鉴**：不把 MinerU/docling 的整本文档对象模型搬进来；不做「按题自动切分学号/手写区域」这类超高难（原型只要求题干+图+解答步骤块）。
  **后端要点**：① 版面模型输出块序列（type/bbox/confidence），映射到 `V3RecognizeBlock`；② 图块 `image_region` 用**归一化坐标**裁剪原图后给前贴为 anchorPhoto；③ `editable=true`（R2 语义）；④ **分页引擎是一个纯函数服务**：输入块序列+模板版式槽位预算+字号档位，输出多页 `slide[]`，**单元测试可离线验证**（安全断点/20pt 下限/锚条/填充率）。
  **验收**：一道圆锥曲线大题照片 → 返回题干块 + 解答步骤块 + 分页页组（<span data>零截断、≥20pt）。

### 3.4 图形重建 / 立体几何（rebuild / solids）——AI 运行时 + 知识图谱

**功能**：原图区域 → 图形重建候选（`rebuild`）；`preset_id+params` 构造；多面体截面；构造校验门 `passed_validation`。
**参照**：

- **JSXGraph**（A，MIT/LGPL）——后端不做渲染，但 **board JSON / 参数化图元结构以 JSXGraph 语义为准**（前端用它重建）。

- **VLM 读题重建**（研究的活路，替代「像素识别还原」）：

  - **MathemaTikZ**（研究，73.9%）“从题目文本生成 TikZ 几何图代码”，是「读题→参数化构造」范式的标杆证据；

  - **GeoTikzBridge**（CVPR26）/ **CircleNet**（CVPR25，圆相切构造）——从题干文字生成几何构造代码；

  - **ChatGGB**——聊天生成 GeoGebra 构造。

- **GeoGebra**（闭源，商用需授权）——只借鉴构造交互语义（取点/建面/交线），**不集成、不嵌入**。

- 多面体截面算法：自研（经典计算几何：棱×平面求交→连截面多边形），后端可预先把标准体（正方体/柱锥台球）的顶点棱边几何数据化供校验。
  **借鉴**：`rebuild` 输出 `candidates[]`，每个带 `preset_id? + params + passed_validation + match_note`；**校验门**：候选必须通过「自动渲染 + 程序化拖点测试」才 `passed_validation=true`，否则不上屏（R 语，永不把崩图给老师）。
  **不借鉴**：不做照片→矢量的像素级还原（全行业无解）；不直接用 GeoGebra 运行时。
  **后端要点**：① VLM 服务读题→产出参数化构造或匹配 preset；② **校验服务**：在后端用 JSXGraph/node 或轻量几何管线回放构造、移动一个关键 point/glider 检验是否顶点越界/自交；失败 → `passed_validation=false` 并返回重试信号；③ 优先检索并套用本校 `recipes`（配方命中即质量飙升）。
  **验收**：给定题干 + 锚图 → ≥1 个 `passed_validation=true` 候选；用「斜二测投影」规则输出标准体构造。

### 3.5 教案十板块 + 挂例题 + 反套话（plans）——平台数据 + AI

**功能**：十板块教案（生成 SSE + CRUD + confirm + 直通课件）、挂结构化例题、反套话检测与一键去套话。
**参照（交互/产品）**：

- **Brisk Lesson Plan**（闭源）——「复用材料 + 结构化环节 + AI 建议采纳后真实生效」。

- **Khanmigo / Khan Academy**（教师工具，闭源）——课堂目标与学情驱动。

- **希沃 AI 教学空间 / 学科网**（闭源）——备—授—评一体、教案模板标准。
  **参照（结构化教案与「反套话」）**：开源教案/教育标准模型多为内容型，**反套话建议自研规则库 + LLM 判别双保险**：

- 规则层：`cliche.ts` 已在前端定 regex 词表（激发兴趣/核心素养/突出重点难点…）；后端应维护**服务端规则库**（更大词库 + 行业黑话清单）。

- LLM 层：对规则未覆盖的教书空话用判别模型/提示词二检。
  **借鉴**：`reply` 一栏模板围绕课题把空话改写为可检验目标。
  **后端要点**：① DB 存 `V3PlanSection[]`（含 `examples[]`、`cliche?/cliche_hits[]` 可选字段，兼容旧行）；② `section/confirm` 后置 `teacher_confirmed`；③ **反套话**：生成时即检测（AI 生成器内建约束，少产空话）+ 落库前后都能重算；④ **挂例题**：`examples` 是结构化 `V3AttachedExample[]`，与题库 `quizQuestions` 可互相引用（`source` 标记来源），删除不动题库。
  **验收**：生成十板块教案 → 套话板块被检出并在前端标红；一键去套话返回围绕课题的具体措辞。

### 3.6 题库：分类树 + 扫描入库 + 图片题型（quiz）——平台数据

**功能**：`quiz/questions`、`quiz/kp-tree`、`quiz/scan-import`；题模型含 `kp_path`、`q_type:image`、`stem_image`。
**参照（题库/组卷工作流，Open Source）**：

- **openwebwork/webwork2**（B，GPL-2.0/Artistic）——`Instructor/SetMaker.pm`：题库目录搜索→候选题分组浏览→显式「加入」→从既有卷导入。借鉴「候选池浏览 + 显式加入 + 复用」语义；**禁复制代码/PG 题目**。

- **mindskip/xzs（学之思考试系统）**（C，AGPL-3.0）——`Question`：题型/难度/分值/标准答案结构化；`ExamPaper` 蓝图不变量（总分/题数/时长/时间窗）；`ExamPaperAnswer`：systemScore 与 teacherScore 分离。借鉴「题目结构化」「蓝图不变量」「自动分与学生分分离」；**AGPL 传染，任何源码/SQL 禁复制**。

- **Moodle 题库**（B/C，GPL）——emoji 按知识点分类树组织题目的成熟形态（分类树 + 每节点题目数）。

- 平台参考（闭源，交互）: **菁优网/学科网/组卷网/好分数**——知识点筛选树 + 逐题加入 + 试卷排版。
  **借鉴**：分类树三级「模块→章→知识点」，叶节点挂 `kp_codes` + 每节点 `count` 题量聚合；题归属 `kp_path`。`quiz/scan-import` 与 3.2/3.3 识别打通，`as_image` 决定题型。
  **不借鉴**：不引入巨量题目库；不做试卷智能排版引擎（前端 A4 排版已定）。
  **后端要点**：① 分类树持久化为分层表（parent\_id + kp\_code + sort），`count` 由 `quizQuestions` 按 `kp_code in (子树)` 聚合查询给出；② 图片题型存储：`stem_image` 存对象存储 key，`stem_latex` 存 caption 文字；③ 扫插入库是**事务**：识别/裁剪成功 + 归类 + 计数更新原子提交；④ `kp_tree` 与 `questions` 口径一致，叶节点筛选用「该叶及其昆中子树 kp\_code 集合」归并。
  **验收**：扫一张手写/试卷图 → `quizScanImport` 成功 → `quiz/questions` 立即多一条（图片题或结构题）→ 分类树该节点 `count+1`。

### 3.7 批改三视图 + 聚类 + 讲评（grading）——功能域

**功能**：`assignments`、`/assignments/:id`（题目聚类/原图/识别步骤）、`confirmCluster`、`review-pack`（SSE）。
**参照**：

- **Gradescope**（闭源）——按题连续批阅 + rubric + 相似答案分组；「逐题看、一眼下一份」工作流。

- **Canvas SpeedGrader**（闭源）——同一工作区评分+批注+联动成绩册。

- **openwebwork2** **`ProblemGrader.pm`**（B，GPL）——教师按 (student, version) 改分，**feedback 绑定到具体作答记录**（= 我们的 `recognized_steps[].feedback`），且**仅 score/comment 变化才写库（天然幂等）**（= `confirmCluster` 幂等写入）。

- **xzs**（C，AGPL）——`systemScore / userScore` 分离 ≈ `suggestion_score / teacher_final_score`，佐证「AI 起草分 + 教师终审分」模型。

- 中文手写识别/原图：同 3.2/3.3 OCR。
  **借鉴**：按题聚类（答案相似度分组）+ 原图 `photo_region` 锚定 + 识别步骤可修正 + 聚类整体给反馈。
  **后端要点**：① 三视图是**同一份数据的不同投影**：`questions[].clusters[]`（correct/partial/wrong/blank + tag + count + sample）作为题库/批改的稳定中间结构；「按人」「分层」由它聚合，不另造表；② 聚类用 embedding 相似度（作答文本/识别 latex）分组，同错因归一组；③ `confirmCluster` 幂等（同 cluster 只写一次 feedback 到位）；④ `review-pack` 选错误率≥30% 题，生成讲评页组（经编辑校验再落为 deck 草稿，R5）。
  **验收**：45 人作业 → 按题聚类视图返回正确率 + 错因分布 + 相似答案簇；讲评生成为草稿页组。

### 3.8 绘图工作台 / 图形库（draw / figures）——知识图谱

**功能**：`draw/library`（个人+教研组共享图形库）、`draw/hand-recognize`（SSE，见 3.2）、`figures/presets`、`figures/recipes`（构造配方）。
**参照（白板交互模式，决定 R11/R12 由前端落地，但后端要存对结构）**：

- **Excalidraw** `excalidraw/excalidraw`（A，MIT）——自由画布对象模型、选择/拖动/删除/属性面板、元素 JSON 序列化（直接对应我们的 `V3DrawRecord[]`）。

- **tldraw** `tldraw/tldraw`（A，MIT/Apache）——手势套件、形状系统、选择吸附、联合 Lua'白板状态可持久化。

- **希沃白板 EasiNote**（闭源）——中文课堂白板交互参考。

- **GeoGebra / Desmos** ——滑杆调参与函数图像实时联动的交互范式（对应 `live_sliders`、函数绘图滑杆）。

- **JSXGraph**（A）——图形 preset 语义。
  **借鉴**：结构化笔迹配方 `V3DrawRecipe.records`（pen/line/circle/polygon/point/text/preset），可整体重开再编辑（这是 R1 在白板区的落地）；库条目 `thumb`（SVG 快照）+ `records/expr` 双份（预览用快照、编辑用结构化）。
  **不借鉴**：不把画布坐标系统的实时事件流当存储（存元素，不存操作日志）；不做多人实时协同（原型单教师）。
  **后端要点**：① `saveLibrary` 存 `records`JSON + `thumb`（SVG 可直接存文本/对象存储）+ `shared`；列表返回分页 + 按个人/教研组过滤；② `figures/recipes` 是「带参数构造配方」，`params` 供前端滑杆；③ 图形库条目可挂到 `image` 元素的 `draw_recipe`（课件里嵌白板图）。
  **验收**：白板画一个正方体截面 → 存库 → 另一账号列表可见并可点击重开编辑（参数可调）。

### 3.9 图片扫描增强（scanEnhance 服务端化）——平台通用

**功能**：前端 `scanEnhance` 已做 Canvas 亮/对比/去阴影（对标「扫描全能王」）；后端提供服务端增强接口供批量/识别前预处理。
**参照**：**OpenCV** `opencv/opencv`（A，Apache-2.0）——自适应阈值 `adaptiveThreshold`、背景去除、透视纠正（`getPerspectiveTransform`）、二值化；**CamScanner 扫描全能王**（闭源产品，算法参考：提亮+高对比+去阴影+自动裁剪）。
**借鉴**：前端已有参数语义 `ScanParams{brightness, contrast, whiten, strength}`；后端镜像同语义，供识别前置增强。
**后端要点**：① POST 图片 → 返回增强图（同参即可）；② 增强参数建议对 **识别前置**用一套保守默认（别过度拉白把浅草稿吃没）；③ 大图先降采样再增强再推理，控成本。
**验收**：给一张暗光/阴影手写纸照片 → 增强后识别置信度不降或提升；肉眼可读。

### 3.10 AI 交互编排（SSE + 草稿/确认 + diff）——AI 运行时

**功能**：`generation/*` SSE + 元素级 diff（不自动落库，`suggest→diff→done`）+ 确认类写操作。
**参照**：

- **langchain-ai/langgraph**（A，MIT）——`interrupt(value)` 抛起暂停把上下文带给客户端、客户端 `Command(resume)` 显式恢复、`checkpointer` 持久化状态。**精确映射**：`interrupt ≈ needs_confirmation`；`Command(resume) ≈ confirm/pushToDeck/confirmCluster`；`checkpointer ≈ 草稿 Artifact 持久化`。**借鉴状态机，不引入其内核**。

- **PPTAgent**（研究）——两阶段：先解析模板版式槽位 → 再按教学环节逐页「填槽」生成。借鉴「版式感知逐槽位生成」降低纯文字堆叠（每条 AI 课件草稿尽量含公式/图形槽位）。

- **Formative Luna / Brisk / Wayground**（闭源）——聊天能改正式 Artifact、产出 diff 由教师确认。
  **借鉴**：AI 只出草稿 diff；写操作都要教师确认端点；`teacher_confirmed` 元素不进 diff 候选（别覆写）。
  **后端要点**：① 生成入任务队列 + 状态表（`V3Task.status/progress/stage` 与 `catalog/tasks` 打通）；② 元素级 diff 落 DB 为「pending 变更」，教师确认才并入 deck/plan 主文档；③ 教案生成器**内建反套话约束 + 十板块骨架**（别让模型自由发挥成扁平段落）。
  **验收**：断开重连后任务中心能恢复生成；教师确认前主流文档不被 AI 改动。

### 3.11 导出链路（export）——平台通用

**功能**：`decks/:id/export`（pptx/pdf）。公式→OMML、图形→矢量 SVG→EMF、参数 JSON 写页备注（回导重建），规格 `REQUIREMENTS_SPEC §5.12`。
**参照**：**PptxGenJS** `gitbrent/PptxGenJS`（A，MIT）——生成 pptx 节点；公式转 OMML 用 MML2OMML.XSL（Office 内置 XSL）；**Manim** `3b1b/manim`（A，MIT）——服务端把动态演示渲染为 GIF/视频（P2 可评估）。**LilyPond**/mathjax-node 为 LaTeX→MathML 备选。
**后端要点**：导出是异步任务（先回 `task_id`）；公式转 OMML 需在服务端把 LaTeX→MathML→OMML；SVG→EMF 用 libreoffice/inkscape 管线（只读，不把用户内容泄漏给外部服务）。
**验收**：导出的 pptx 里公式在 PowerPoint 可双击编辑（OMML 节点）；图形为矢量；页备注含 params JSON。

***

## 4. 参考项目速查表（逐功能→参照对象→许可）

| 功能         | 参照对象（仓库/平台）                                                                         | 许可定级           | 借鉴点 / 注意                             |
| ---------- | ----------------------------------------------------------------------------------- | -------------- | ------------------------------------ |
| 公式编辑器交互    | `arnog/mathlive`                                                                    | A MIT          | 点按/拖拽/框选包裹语义已在前端；后端存 LaTeX           |
| 公式编辑器兜底    | `mathquill/mathquill`                                                               | A MIT          | —                                    |
| 公式识别       | `lukas-blecher/LaTeX-OCR`(pix2tex) / `UniMERNet` / `Uni-MuMER`                      | A / 研究         | 印刷/手写分流；带 confidence                 |
| 手写识别基准     | **CROHME / IM2LATEX / UniMERDataset**                                               | 数据             | 评测对表                                 |
| 版面切分       | `opendatalab/MinerU`、`docling-project/docling`、`PaddlePaddle/PaddleOCR`、`tesseract` | A              | 块序列→`V3RecognizeBlock`               |
| 分页引擎       | 自研（规格 §5.5）                                                                         | —              | 纯函数可单测                               |
| 图形重建       | **MathemaTikZ / GeoTikzBridge / CircleNet / ChatGGB**                               | 研究             | VLM 读题→参数化构造                         |
| 图形引擎语义     | `jsxgraph/jsxgraph`                                                                 | A MIT/LGPL     | board JSON 语义                        |
| 立体截面       | 自研（经典几何 + 斜二测）                                                                      | —              | GeoGebra 仅借鉴交互，不集成                   |
| Deck 编辑器架构 | `pipipi-pikachu/PPTist`                                                             | A MIT          | 前端架构参考                               |
| PPT 导出     | `gitbrent/PptxGenJS`、MML2OMML.XSL                                                   | A              | OMML + 备注 JSON                       |
| 动图渲染       | `3b1b/manim`                                                                        | A MIT          | 服务端 GIF（P2 评估）                       |
| 白板对象模型     | `excalidraw/excalidraw`、`tldraw/tldraw`                                             | A MIT/Apache   | `V3DrawRecipe` 结构化                   |
| 白板产品参考     | 希沃白板、GeoGebra、Desmos                                                                | 闭源             | 交互模式                                 |
| 组卷工作流      | `openwebwork/webwork2`                                                              | B GPL/Artistic | 候选池+显式加入+复用；禁复制代码                    |
| 考试系统       | `mindskip/xzs`                                                                      | C AGPL         | 题目结构化/自动分/学生分分离；禁复制任何源码              |
| 题库分类树      | Moodle/question bank、菁优/学科网/组卷网                                                     | B/C            | 分类树+节点题数聚合                           |
| 批改         | Gradescope、Canvas SpeedGrader、`webwork2 ProblemGrader`                              | 闭源 / B         | 绑定作答记录、幂等反馈                          |
| AI 交互编排    | `langchain-ai/langgraph`                                                            | A MIT          | interrupt→confirm→checkpointer 状态机映射 |
| AI 课件生成    | **PPTAgent**（研究）、Brisk、Wayground、Formative                                          | 研究/闭源          | 版式感知逐槽位、diff 采纳                      |
| 教案/反套话     | Brisk、Khanmigo、学科网；规则库自研                                                            | 闭源/自研          | 规则+LLM 双保险                           |
| 图片扫描增强     | `opencv/opencv`、CamScanner                                                          | A / 闭源         | 自适应阈值/去阴影/透视纠正                       |
| AI 24h 运行时 | langgraph / 自研 job 队列                                                               | A              | SSE + 任务中心恢复                         |

> 许可口径（依 Reference Map）：借鉴 IA/交互/结构/数据思想，不复制品牌、Logo、代码、题目源码。AGPL（xzs）尤其严格——连 SQL 表结构都只借鉴概念。

***

## 5. 施工建议与验收准则

### 5.1 施工顺序（降低前置依赖）

1. **catalog + contents（A4 平台数据）**：纯 CRUD，无 AI 依赖，先把契约面打实。
2. **grading + figures + draw（功能域/知识图谱）**：依赖 OCR/结构数据，但可先用 mock 聚类/存配方。
3. **recognition + generation（AI 运行时）**：依赖前两者 + 模型服务，异步任务队列先行。

### 5.2 每域验收门（对前端契约）

- `catalog`：`today/classes/tasks/templates/quiz/kp-tree` 返回形状与 `v3MockContract.test.ts` 断言一致（非裸数组、枚举合法含 `image` 题型）；`scan-import` 原子入库。

- `recipes/plans/decks`：CRUD + `confirm/pushToDeck` 幂等；教案十板块 + `examples + cliche` 字段可落可查；`confirm` 后 `teacher_confirmed` 生效。

- `recognition/generation/grading`：SSE 事件名与序列逐一匹配 §2.4 表；断连可恢复；`ai-element` 只回 diff 不落主文档。

- 全量：`npm run test`（前端 339 条约 47 文件）绿 + `vue-tsc` 0 error 前提下，前端切到真实 API 全绿。

### 5.3 高质量底线（评审清单）

- 数学对象：LaTeX/boardJson/records 为唯一事实来源，不为预览降级存死图（R1）。

- 识别均人审兜底，绝不「识别即定死」（R2）。

- AI 只改被指定元素，绝不覆写 `teacher_confirmed`（R5）。

- 生成/导入类 POST 幂等；确认类写操作可重入。

- 学生数据按 `class_id` 作用域严格隔离。

- 原图对象存储 + `photo_region` 归一化坐标长期可回溯（R8）。

