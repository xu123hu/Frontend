# Reference Map — 智学数研教师端

> 本文档记录每个模块的 PRIMARY / SECONDARY 产品参考、借鉴内容与不借鉴内容、现状与目标。
> 遵循 Shared Project Constitution「One Module, One Primary Reference」：禁止把多个产品随机混合成 Frankenstein UI。
> 许可证：只借鉴 IA / 交互 / 流程 / 数据思想，不复制 Logo / 商标 / 品牌视觉。

## 0. 本轮施工边界（严格执行 Review Round 03 Required Changes）

| Required Change | 模块 | 状态 |
|---|---|---|
| 1. Today 改为任务优先时间线（非 KPI 卡片） | Teacher Home | 施行中 |
| 2. 组卷每题 Edit / Replace / Regenerate | Assignment / Quiz | 施行中 |
| 3. 批改当前 submission id 持久化到 URL | Grading | 施行中 |

Accepted（禁改）：全局导航、班级上下文切换器。
Do Not Change（禁改）：导航架构、既有能力适配层接口。
**修正（RD-1，2026-08-23）**：原"Do Not Change 教案产物数据模型"已被裁决部分重开——仅允许 additive 结构化字段进 lesson content schema，lifecycle/后端模型/迁移仍禁改（详见 modules/lesson-artifact.md）。

---

## Teacher Home / Today（RC-1）

- **Primary reference**: Brisk Next「Prepare / Engage / Assess 下一步行动生成器」+ Khanmigo 教师 Dashboard（Class Snapshot + Recommended Assignments）之「洞察 → 推荐动作 → 当场执行」。
- **Secondary reference**: 科大讯飞「星光」——打开即视频今日待办；SchoolAI Mission Control——"谁卡住、下一步能做什么"合放。
- **What we borrow**: 任务优先信息层级；首屏固定「下一节课(时间/班级/课题/倒计时/备课完成度/缺失项)」+ 一组上课前最值得处理的任务（每项带深入动作按钮）；洞察必须表达为「发生了什么→证据→老师一键能做什么」，且每个 insight 带可执行动作。
- **What we do NOT borrow**: 不显示 `count=5` / `recent_count=1` 等内部字段；不做"系统有哪些模块"的入口集合页；不过度视觉装饰。
- **Current implementation**: 卡片式仪表盘（下一节课卡 + 待处理列表 + 快捷入口 + 行动建议），洞察无动作按钮，信息层级 KPI 优先。
- **Target implementation**: Teacher Action Center —— 下一节课榜（带倒计时/完成度/缺失项）+ 上课前任务清单（带动作）+ 行动建议（带【加入下节课】【出巩固题】【看依据】）。

## Lesson Planning / 备课

- **Primary reference**: Brisk Lesson Plan「复用已有材料 + 调整」为主路径；PenguinCoder 代表 Mat 说 45 分钟结构化课堂对象。
- **Secondary reference**: 希沃 AI 教学空间「备—授—评」一体化上下文。
- **Borrow**: 从已有课/教材/空白进入；环节结构化（目标/教师活动/学生活动/核心问题/素材/检查理解/时长/依据）；AI 建议「采纳后时间线真实变化」。
- **Not borrow**: 不把建议做成只改标签的假动作。
- **Note**: 备课数据模型已由 Architect **RD-1 裁决 REOPENED→有条件 ACCEPT**（见 modules/lesson-artifact.md）：LessonSegment 结构化字段纳入 artifact content schema（additive/optional、不动 lifecycle、不动数据库）。施工须按该裁决执行，并必修 Identity #13 禁止项：移除 `window.prompt()`。

## Assignment / Quiz Builder（RC-3）

- **Primary reference**: Wayground AI「Generate → Review 每题 → Publish」；Formative AI Questions「逐题 accept/decline/edit + similar/easier/harder」。
- **GitHub repo**: `openwebwork/webwork2`（shallow clone 至 research-repos/）——**已完成 STEP 1–6 真实 Trace（2026-08-23，Architect 亲测）**：
  - **许可证（STEP 2 已核实）**：GPL-2.0 **或** Artistic 1.0 双许可 → 定级 B（结构与交互参考，禁复制代码/PG 文件进本项目）。
  - `Instructor/SetMaker.pm`（题库→组卷工作台）：工作流 = 搜索题库目录/DB → `next_prob_group/prev_prob_group` 候选题**分组翻页浏览** → `add_selected` 显式加入 set → `read_set_def` 导入既有 set 复用。→ 借鉴：候选池分组浏览 + 显式"加入"语义 + 从已有卷导入（对应我们五入口之"上次类似课"）。
  - `Instructor/ProblemSetDetail.pm`（set 内逐题配置）：每题 value(分值)/attempts/顺序/增删。→ 佐证 RC-3 每题编辑/分值/排序。
  - `Instructor/ProblemGrader.pm`（人工批改，L121–147 已读源码）：教师按 (student, version) 改分（score/100 写 problem status）；**comment 写入最近一次作答记录 past_answer->comment_string**；仅 score 变化或有 comment 才写库（天然幂等）。→ 佐证：反馈绑定具体作答记录（=teacher_feedback 挂 SubmissionItem）、确认即写题状态。
  - `GatewayQuiz.pm`（测验 session）：attempts_per_version / 版本化 set / answer_date 时间闸门 / version_last_attempt_time。→ 借鉴 session 版本与次数语义（Classroom 检测题）。
  - `Scoring.pm / Stats.pm / StudentProgress.pm`：成绩册聚合与按题/按生统计。→ 佐证 Analytics「按题聚合→洞察」。
- **Borrow**: 生成后进入可逐题编辑的 `quiz_artifact`；每题提供【编辑】【换一题】【重新生成(单题)】【锁定/解锁】【找相似题】；总时长/分值/知识点覆盖随编辑实时联动；发布前可"预览学生端"。
- **Not borrow**: 不把"换一题"实现成整卷重生成；不直接发布 black-box 生成结果；不复制 PG 题目源码（B 类许可）。
- **Current**: 每题仅一个假的"换一题"（内部整卷重跑），无编辑/锁定/相似题。
- **Target**: 真单题替换、内联编辑、单题重生成、锁定、覆盖检查。

## Grading Workstation（RC-2）

- **Primary reference**: Gradescope「按题连续批阅 + rubric + Next Ungraded + 相似答案分组」；Canvas SpeedGrader「同一工作区内评分/批注/联动 gradebook」。
- **Borrow**: 左作答区 / 右 rubric+AI建议；顶部「第 N/N 份 + 进度」；确认并下一份；当前份状态可寻址。
- **Borrow (this RC)**: 当前批改对象必须可寻址——`submission_item_id` 进入 URL query，刷新 / 分享 / 直接打开 URL 回到同一份。
- **Not borrow**: 不把学生下拉框当主要导航；不暴露 confidence / type=rule。
- **Current**: 用本地 `select` 下拉切份，`selectedId` 未入 URL，刷新回到队首。
- **Target**: 进入时读 `?submission_item_id=`，`watch(selectedId)` 同步 URL，确认后推进 URL。

## Classroom / 课堂

- **Primary reference**: SchoolAI Mission Control「谁在参与、谁卡住、现在该介入谁」；希沃 AI 授课助手。
- **Borrow**: Live Session 语义（当前课 + 连接人数 + 当前活动 + 实时作答分布 + 快捷动作）。
- **Not borrow**: 不做后端 feature flag 展示页（有效期秒数等工程表达禁止上 UI）。
- **Note**: 本轮不入 React 化施工清单，保持现状稳定。

## Analytics / 班级学情

- **Primary reference**: Wayground「技能薄弱 → 直接给出练习资源并分配」；Khanmigo Class Snapshot。
- **Borrow**: 洞察强制「发生了什么→证据→为什么→一键动作」公式。
- **Not borrow**: 堆砌无动作的 BI 图表。

## Resources / 教学资源

- **Primary reference**: Brisk「当前材料直接改造成课/题/活动」；Khanmigo My Documents「复用/编辑/导出」。
- **Borrow**: 以"课对象"为中心的资源库（搜索/筛选/预览/加入某节课/用于生成），解析/OCR 状态退到详情页。
- **Not borrow**: 把对象存储浏览器 / 原始文件元数据 / Markdown 原文铺在卡片上。

## AI Copilot / 教学管家

- **Primary reference**: Formative Luna「聊天能编辑正式 Artifact，缺信息会追问」；Khanmigo 页面内预置能力。
- **Borrow**: AI 助手 = Intent Router + Action Composer：识别意图→获取当前对象上下文→生成/修改 Artifact→展示 diff→教师确认。输出落成可编辑业务对象，不落成聊天消息。
- **Not borrow**: 万能悬浮聊天框；把"重复请求已忽略"这类后端去重细节暴露给教师。

---

## 许可证情况（STEP 2 记录）

- 借鉴对象多为闭源 Web 产品（Gradescope / Brisk / Khanmigo / Wayground / Formative / 希沃 / 科大讯飞）——只借鉴交互与 IA 模式，不复制品牌与代码。
- `webwork2`：**已核实 LICENSE 文件** = GPL-2.0 或 Artistic 1.0 双许可。定级 B：仅结构/交互/数据思想参考，禁复制源码与 PG 题目。
- `xzs`（mindskip/xzs，中国考试系统）：以 zip 源码包方式获取（git clone 网络中断），Trace 进行中——完成后在此补许可证与结构结论；**未完成 Trace 前不声明"已参考"**。
- `langgraph`（MIT 许可，clone HEAD f09cfe8）：**已完成 STEP 1–6 轻量 Trace（2026-08-23）**。源级证据：`libs/langgraph/langgraph/types.py:851 def interrupt(value)` —— 抛 `GraphInterrupt`（errors.py:102）暂停执行、把上下文带给客户端；客户端以 `Command(resume=...)` 显式恢复；**必须启用 checkpointer（持久化状态）**。→ 映射：`interrupt` ≈ 我们的 `needs_confirmation`；`Command(resume)` ≈ 教师确认端点（confirm/publish）；checkpointer ≈ draft Artifact 持久化。佐证 ARCHITECTURE.md 的 AI 交互模型，不引入其内核（后端审计决定维持）。
- Moodle / Canvas / BigBlueButton / RAGFlow（研究报告列示的重型仓库）：**显式延后**，理由：本轮 RC 决策点不依赖其结构细节，且均为 GPL/AGPL 大仓，仅按"模型思想参考"使用（后端审计结论：Moodle/edX 价值在模型不在复杂度）。任何后续模块若需声明参考，必须先补完整 STEP 1–10。

## GitHub 协议执行台账（Architect 自查 2026-08-23）

| 仓库 | STEP1 clone | STEP2 license | STEP3 发现 | STEP4 Trace | STEP5 结构 | STEP6 工作流 | STEP7 mapping | 声明资格 |
|---|---|---|---|---|---|---|---|---|
| webwork2 | ✅ shallow | ✅ GPL-2.0/Artistic | ✅ Instructor/CG 模块清单 | ✅ SetMaker/ProblemGrader 源级 | ✅ 上文记录 | ✅ 组卷/批改工作流 | ✅ 见各模块节 | **可声明已参考** |
| xzs | 🔄 zip 下载中 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 不可声明 |
| langgraph | ✅ HEAD f09cfe8 | ✅ MIT | ✅ libs/docs 结构 | ✅ types.py:851 源级 | ✅ | ✅ interrupt→Command(resume)→checkpointer | ✅ AI 交互模型映射 | **可声明已参考（轻量）** |