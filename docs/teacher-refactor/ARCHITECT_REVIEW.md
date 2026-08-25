# ARCHITECT_REVIEW

---

# a7c2553 增量复验（2026-08-24，Round 06 前置）

> 评审人：Principal Product Architect · 对象：`a7c2553`（教学建议知识点化 + 作业出题重构）
> 方法：浏览器亲测（证据 `round-05-arch/` 09–11 三张）+ vitest/typecheck 亲跑 + 源码亲读 + **刷新持久化测试**。

## Verdict

**ACCEPT WITH REQUIRED CHANGES** —— 申报的两大缺陷（建议空态、出题老套）确已修复且质量高；但"编辑落盘"申报不实（仅内存同步），另发现选择题卡不显示选项的 UX 缺陷。

## 亲测通过项

| 申报 | 判定 | 证据 |
|---|---|---|
| 建议按知识点兜底 | ✅ | 4 张建议卡、每卡带「依据」、头部「按本课知识点」标签、空态文案已删；「采纳建议」→ toast 已采纳落环节（截图 09） |
| 出题真实化 | ✅ | 生成 8 题题干两两互异（亲测 unique=8/dup=0）、真实数学内容、KaTeX 渲染（截图 10）；难度分布 基础4/提升3/挑战1 符合蓝图；题型 选择/填空/解答混合 |
| 选项乱序+答案对齐 | ✅ | 预览态亲证：题库答案 A(x²) 位移到 C（截图 11）；mulberry32 确定性乱序真实生效 |
| 契约测试 | ✅ | 47/47 亲跑通过（+6 新增）；typecheck 教师域含 mock **真实 0 错**（上轮 8 错已随 questionBank 重写清除，科研端 3 文件存量债未涉） |
| 预览不泄答案 | ✅ | 我正则误报（匹配副标题"答案与解析不可见"），截图亲核无泄漏 |

## 新发现缺陷（本轮裁决必改）

- **D-1（Major UX）**：题卡主视图只渲染题干+元数据（模板 L212-218），选择题选项仅在编辑态（L225）/预览态（L305）可见——教师不看选项就无法做「保留/换题/锁定」决策，审题工作流断裂。
- **D-2（Major，涉申报不实）**：`syncToArtifact()`（L536-542）只写内存 store，**从未调用任何 API**；刷新后教师手改全部丢失（亲测：改题干→保存→刷新→手改消失）。申报"逐题编辑结果写回 artifact，不再一次性发布才落盘"中"落盘"不实。mock 的 `PUT /teacher/artifacts/:id` 端点已存在（teacherServer.ts L124/129）但前端零调用。

## 裁决（V4 三个待决问题）

1. **教学建议 class 模式**（班级数据≥门槛切真实学情驱动）：**ACCEPT 入 R06 P1**。门槛建议 = 已确认提交数 ≥ 8 份；学情驱动建议必须引用真实班级统计（错误率/典型错因），与 mock 建议池同结构可切换。
2. **组卷真实取题 adapter**：**ACCEPT 入 R06 P0（接口）/ R10（真源）**。本轮 mock 题库重写已解决 mock 真实性；R06 按 Constitution 第 9 条以 repository/adapter 隔离出 `QuestionSource` 接口（mock 实现挂后），真源（研库/学生题库）在 R10 联调时接——**不在 R06 里直连后端**。
3. **D-1/D-2 修复**：并入 R06 Phase B P0（见 CURRENT_DIRECTIVE 更新）。

---

# Round 05-fix 复验（2026-08-24）

> 评审人：Principal Product Architect · 对象：提交 `65699e9`（BL-1 修复 + P-2）与 `9cff652`（编辑器调研）
> 方法：浏览器全流程亲测（证据 `round-05-arch/` 06–08 三张）+ 教师套件亲跑 + typecheck 亲跑。

## Verdict

**BL-1 RESOLVED** ✅ —— Round 05 主体关账，遗留一个 15 分钟尾巴（mock 文件 8 个类型错误）并入 R06 首项。

## 亲测记录（验收 6 条对照）

| 验收项 | 结果 | 证据 |
|---|---|---|
| 1. 时间线 6 环节 · Σ45min | ✅ PASS | 「共 45 分钟 · 6 个教学环节」，环节标签（复习导入/新知探究/例题精讲/当堂练习/课堂小结）+ 素材注记「函数单调性.pdf」均渲染（截图 06） |
| 2. 结构化抽屉五字段 | ✅ PASS | 编辑面板打开，学习目标/核心问题/教师活动/学生活动/检查理解全部可见可编辑 + 保存按钮（截图 07） |
| 3. 旧 payload 兼容 | 🔶 代码级 PASS | 三级回退 `segments||sections||timeline` diff 亲读正确；但 mock 无旧格式教案，**运行时未测**——契约测试未覆盖 legacy 路径，R06 补一条单测 |
| 4. 时长编辑实时联动 | ✅ PASS | 环节时长 10→15，总时长 45→50（精确） |
| 5. console / 测试 / typecheck | 🔶 2/3 PASS | console 零错误 ✅；vitest 41/41 亲跑 ✅；**typecheck FAIL：`questionBank.ts` 6 个 TS18048 + `teacherData.ts` 1 个 TS2741**（V4 状态文档第 48 行"教师域 0 错误"不实） |
| 6. 证据截图 | ✅ | V4 补齐 3 张 prep 截图（上轮"无证据标完成"教训已生效） |

## V4 工程质量评价

- 修复正确且克制：不重写组件，只做回退接线 + KIND 标签映射。
- 状态文档诚实度显著提升：初版误标自我纠正、saveDraft/timeline 回流缝隙主动申报（Known Issue #3，裁定 R06 规整）、focus/linked_insight 未渲染如实记录。
- **唯一不实申报**：typecheck"教师域 0 错误"（实为 8 错，全在 mock 文件）。

## 裁决：Prep 时间线富文本编辑器（V4 PROPOSED `9cff652`）

**ACCEPT 入 R06，定级 P1**。理由：
1. 真实备课痛点成立（教师需要公式、函数图像、插图），是 Golden Path「形成 PPT/课堂材料」的地基。
2. 许可证已亲核：Tiptap(@tiptap/vue-3 MIT) / MathLive(MIT) / function-plot(MIT) 全 A 类可集成；JSXGraph LGPL 列为可选——合规。
3. **不升 P0 的原因**：R06 P0 已满（真实取题、Butler、结构化持久化规整）；编辑器先做「公式键入 + 图片插入」最小闭环，Excalidraw 手绘与函数图 P2。

## Required Changes（滚入 R06）

| # | 内容 | 定级 |
|---|---|---|
| RC-06-0 | 修 mock 文件 8 个类型错误（TS18048 加 `?? 默认值` / TS2741 补 count 字段）；修正状态文档第 48 行不实申报 | **P0（15min，R06 第一件事）** |
| RC-06-1 | 组卷真实取题（题库去重 + 选项真实内容） | P0 |
| RC-06-2 | Butler 上下文冒烟（依赖链已通，可以做了） | P0 |
| RC-06-3 | saveDraft/timeline 回流规整 + legacy 兼容单测 | P0 |
| RC-06-4 | `?focus` 高亮 + linked_insights 证据链 UI | P1 |
| RC-06-5 | 时间线编辑器最小闭环（MathLive 公式 + 图片插入） | P1 |

## Do Not Change（Round 05 全部成果转为保护区）

D1 题量诚实 / D2 artifact 寻址 / 发布三重门 / 预览学生端 / 批改 URL 寻址与 confidence 清除 / 数据世界 SSOT / 时间线三级回退 + 五字段结构化抽屉（本轮新入）。

---

# Round 05 — 收尾实现复验（2026-08-24）

> 评审人：Principal Product Architect
> 对象：提交 `346799d`（feat(teacher R05): D1/D2/发布门/预览学生端 + RC-05-5）
> 方法：**全部亲测**——浏览器逐项实操（证据 `artifacts/teacher-refactor/round-05-arch/`，5 张）+ 教师测试套件亲跑（41/41）+ 源码亲读。不接受 IMPLEMENTATION_STATUS 文字结论。

## Verdict

**PASS WITH REQUIRED CHANGES** —— 5 项复验 4 项 PASS，1 项 FAIL（RC-05-5 接线断裂）。另裁决 R06 优先级。

## Accepted（本轮新增强保护区）

1. **D1 题量诚实** ✅ 亲测：请求 8 题 → 渲染 8 张题卡，「共 8 题 · 50 分」，无静默减题；契约测试强制 count=8→8 题（我亲跑 41/41 含此项）。
2. **D2 草稿寻址** ✅ 亲测：生成后 URL `?artifact_id=art-quiz-1`；直接打开该 URL 完整恢复同一草稿（8 题，无需重新生成）。
3. **发布一致性门** ✅ 亲测（真实 UI 操作）：题量 8→9 后【确认并发布】**DISABLED**，title 示因「设定 9 题，实际 8 题，请补齐后发布」+ 顶部「题库供题不足」横幅给出两条出路。门逻辑（totalMismatch/hasZeroScoreQ/sumScoreMismatch）代码亲读正确。
4. **预览学生端** ✅ 亲测：弹窗（非跳转）渲染整卷、答案与解析隐藏、数学公式经 KaTeX 正确渲染（截图 04 亲核）。
5. 批改 URL 寻址 / confidence 清除 / 数据世界 SSOT（Round 05 中期已 Verified，本轮保持）。

## Blockers（R05-fix，修完 Round 05 才算关账）

**BL-1｜RC-05-5 接线断裂：sections/segments 契约错位（FAIL）**
- 亲测事实：点击「上次类似课」→ `/teacher/lessons/adapt` **真实发出**且返回 **6 个 segments**（"复习导入（认知冲突）"等，fetch 亲证），console 零错误——但时间线仍显示「共 0 分钟 · 0 个教学环节」。
- 根因（代码亲读）：`TeacherPrepView.vue:452` `applyArtifact()` 只读 `content.sections || content.timeline`，而 RD-1 契约（types/mock/契约测试已迁移）返回 `content.segments`。**结构化抽屉代码已存在（L70-82 五字段 + L247）但永远不可达。**
- 修复：`applyArtifact()` 改为 `content.segments || content.sections || content.timeline` 三级回退，并按 LessonSegment schema 映射（duration_min/kind/learning_objective 等）。
- 验收（我将亲测）：① 上次类似课 → 时间线出现 6 环节且 Σ时长=45；② 点编辑打开结构化抽屉（五字段可见）；③ 旧 payload（仅 sections/timeline）仍可渲染（兼容）；④ 修改时长后总时长实时更新。

## Major Product / UX Problems

- **P-1｜组卷内容 demo 感（V4 自报，我截图亲证）**：8 题为同一道题的重复（全部 f(x)=x³-3x 在 [-2,2]），选择题选项是「A/B/C/D」占位无真实内容。交互全对但内容不可信——违反 PRODUCT_VISION「教师能完成真实任务」的底线。**裁决：R06 P0**（方向同意 V4 提议：从研库/学生题库真实取题；xzs 的 Question 结构化实体 + webwork2 候选池语义已入 reference-map 可参考，注意 AGPL 只借概念）。
- P-2「上次类似课」入口硬编码 topic「函数的单调性」（代码亲读 L475），与页面宣称的「基于同课题改编」语义不符——R06 随 BL-1 修复一并处理。

## Required Changes

| # | 内容 | 负责 | 时点 |
|---|---|---|---|
| RC-05-F1 | BL-1 segments 接线修复 + 三级回退 + 浏览器验收 4 条 | V4 | **立即（本轮关账前）** |
| RC-05-F2 | `?focus={segment.id}` 直达高亮、intervention linked_insight 证据链 UI | V4 | R06（裁决：不塞本轮） |
| RC-05-6 Butler 冒烟 | **裁决：并入 R06 P0**。理由：Butler 依赖课上下文链路，而该链路正被 BL-1 断着——先修通备课，再测助手，否则冒烟无意义 | V4 | R06 |
| xzs Trace | **已由 Architect 完成**（AGPL-3.0 C 类，台账已闭环），V4 无需投入 | Architect | 已完成 ✅ |

## Do Not Change（新增保护）

- 发布门的三个条件与示因文案（亲测通过，禁弱化）。
- 预览学生端弹窗形态（渲染/答案隐藏已达标）。
- D1/D2 的行为契约（题量足额、artifact_id 寻址）。
- Round 04/05 已 Accepted 全部条目继续有效。

## Reopened Decisions

无新增。RD-1 裁决维持（本次 BL-1 恰是裁决执行不彻底所致，非裁决本身问题）。

---

# Round 04（历史存档，2026-08-23）

> 评审人：Product Architect Agent
> 日期：2026-08-23
> 评审方法：本轮评审基于 **亲测**，不接受仅凭工程总结的"已完成"——
> ① 前端 dev server（VITE_USE_MOCK=1, teacher 模式, localhost:5177）浏览器实测 + 截图（artifacts/teacher-refactor/round-04/，共 6 张）；
> ② 后端源码抽查（grading.py / assessment.py / capability_gateway.py 亲读）；
> ③ 后端既有 3 份审计文档交叉核对；
> ④ GitHub 参考仓库真实 clone + LICENSE 核实 + 源码 Trace（台账见 reference-map.md）。
>
> 本轮同时产出架构层 SSOT 文档（PRODUCT_VISION / IA / BUSINESS_OBJECTS / GOLDEN_PATH / ACCEPTANCE / ARCHITECTURE + 5 份缺失模块 spec + RD-1 裁决），下轮工程实现的依据以这些文档为准。

---

## Accepted（保护区，下一轮禁普通重构）

1. **RC-1 Today 页已达产品结构**（截图 01）：hero（下一节课 + 倒计时 + 备课准备度 70% + 缺失项"边界反例、Exit Ticket"）、任务优先时间线（"上课前最值得做的 4 件事"，按优先级 + 行内动作）、洞察卡（17/46 + 证据细节 11/13/7 + 三个动作按钮）、"数据不足时不生成虚构结论"的诚实声明。无工程字段泄露。
2. **window.prompt 全部移除**：TeacherPrepView 已改为内联编辑面板（代码亲查：仅存"替代 window.prompt"注释；全局 rg 无命中）。
3. **后端 M3 信任模型与 P0 修复**（亲查源码，非听信总结）：
   - 跨班隔离：assessment.py / grading.py 均有 `assert_teacher_in_class`；
   - 组卷真实性：`supply_questions(..., strict_kp_subtree=True, relax_difficulty=False, publishable_only=True)`，不再跨考点静默补齐；
   - 客观题判分：`_objective_score`（grading.py:287-308）fail-closed——缺持久化标准答案一律转人工复核，有答案才比对，证据文案为业务语言；
   - 教师准入双层失败关闭（网关 40300 + scope 40301）。
4. **后端教学闭环真实性**：2026-08-22 全栈审计有逐项浏览器实测记录（登录→备课→发布→学生作答→批改→反馈→课堂→资源，含真实持久化与降级边界），可信。
5. 全局导航 7 项、班级上下文、Artifact 生命周期（draft→confirmed→published→archived）、能力适配层接口——继续 FROZEN。

## Blockers（Round 05 必须先修，修前其他施工让路）

**B1｜Mock 与真实 API 契约断裂：批改队列**
- 事实：mock `GET /teacher/grading/queue` 返回裸数组（teacherServer.ts:157 `ok(res, gradingItems)`），前端按真实后端契约解包 `res.data?.queue ?? []`（grading.ts:7-12）→ 页面渲染"当前没有待批作答"，而 mock 实际有 5 条待批（fetch 亲证）。
- 危害：零 console 报错的**静默失败**；RC-2（URL 寻址）在 mock 模式下根本无法验证；违反 ARCHITECTURE.md §5 mock 同构原则。
- 修复：mock 改为 `{queue:[...]}`；并补 vitest 契约测试（mock 响应形状 == src/types 定义）防回归。

**B2｜"✨生成试卷"是无反馈 no-op**
- 事实：实测两次点击（含先选题型"20分钟小测"），performance API 证明 **从未发出 POST /teacher/quizzes/generate**，仅 auth/me 与 classes/mine；预览区停在"试卷预览/可按题编辑"空占位（截图 05/06）。
- 危害：R1 级红线边缘（dead button / 无 loading 无校验无报错）；Golden Path GP-6..8 整段被堵。
- 修复：定位未发请求原因（校验缺反馈/条件分支/WIP 未接线），并满足 generating 状态 + 结构化题卡渲染 + `?artifact_id=` 入 URL。

**B3｜统一数据世界未落地（BUSINESS_OBJECTS.md §3 已为 SSOT）**
- 事实（截图/快照亲证）：mock 身份"王老师"≠李老师；批改队列 5 条≠21 份；Today 待办徽标"5"≠21；下一节课时间为动态 now+2h12m（00:22）≠固定课表 10:10–10:55。
- 危害：跨页数字矛盾是诊断报告点名的"AI Demo 感"来源；G4/R3 红线。
- 修复：mockIdentity + teacherData 全面对齐 SSOT（李老师/46 人/17/46/7 人/21 份/70%/54%→81%/10:10）。

## Major Product / UX Problems

- **P1**：批改页 URL 寻址（RC-2）仍未实现（selectedId 本地 ref，代码事实）——B1 修复后必须完成 `?submission_item_id=` 三件套（进入读取 / watch 同步 / 确认推进），刷新回同一份。
- **P2**：批改页渲染 `confidence` 百分比（confidenceText，代码事实）——R2 红线，B1 修复后即可视验证，必须移除；建议保留"建议依据/需复核"语义。
- **P3**：Today 页"快捷入口"区（备课与PPT/出题并发布/批改/教学资源）是轻度功能陈列残留——本轮容忍（次要位置），Round 06 评估收编为洞察动作或删除。
- **P4**：教学助手（Butler）mock 降级态 + 上下文传递未验证（后端审计 P1 遗留）——Round 05 需实测其在 Prep 页带课上下文工作。

## Business Flow Gaps

- **F1**：GP-6..8（生成→逐题审校→发布）因 B2 不通；GP-9..10（批改）因 B1 不可测。
- **F2**：GP-11 批改完成后"最值得讲的 3 题→加入明天讲评"完全缺失（讲评回流是差异化主线，Round 06 必做）。
- **F3**：Today→Grading 深链应直达首个未确认份（带 id），当前只到列表。

## AI Interaction Gaps

- **A1**：组卷产物未落 artifact 语义（无 artifact_id 寻址、无版本/确认状态展示）——修 B2 时按 ARCHITECTURE.md §3.3 执行。
- **A2**：换一题=整卷重跑的旧问题是否已改（Explore 报告为陈旧证据，B2 修复后重测）；单题替换/锁定/覆盖检查按 modules/assignment-builder 执行。

## Required Changes（Round 05 施工清单，按序）

1. **RC-05-1**：修 B1 mock 契约 + mock 契约单测；顺带修 B3 数据世界（一次改 teacherData.ts / mockIdentity.ts）。
2. **RC-05-2**：修 B2 组卷生成链路至 GP-6/7/8 可过（每题 Edit/Replace 单题/Regenerate 单题/Lock + 覆盖检查 + 预览学生端 + 确认并发布门）。
3. **RC-05-3**：完成 RC-2 批改 URL 寻址 + 移除 confidence% 上屏 + 证据文案业务语言（P1/P2 一并清）。
4. **RC-05-4**：按 RD-1 裁决为 LessonSegment 增加结构化字段（additive/optional，见 modules/lesson-artifact.md schema），Prep 内联编辑面板升级为结构化抽屉（目标/师生活动/核心问题/素材/检查理解/时长）。
5. **RC-05-5**：Butler 实测一轮：Prep 页上下文传递 + 动作落 artifact（不落纯文本回复）。

## Do Not Change（保护区，Round 05 生效）

- 全局导航 7 项与顺序；班级上下文切换器。
- Today 页已 Accepted 结构（hero/任务时间线/洞察动作三段式）。
- 后端 M3 全部端点契约与 Artifact 生命周期（前端只消费不重定义；发现契约问题报 ARCHITECT_REVIEW_REQUEST.md，不私改后端语义）。
- 统一数据世界数字（17/46、7、21、46、70%、54%→81%、10:10）。
- 既有能力适配层接口与 mock 切换机制（Bearer token）。
- demo 数据 SSOT 定位：mock 是 BUSINESS_OBJECTS.md §3 的唯一实现处，页面/e2e 不得自造数字。

---

## 用户真实痛点（本轮所有判断的出发点）

1. **备课时间被 AI 拉长而非缩短**：AI 生成整页内容，教师仍要自己改成"能上课"的产物——缺的是结构化可编辑对象与局部采纳，不是更多生成。
2. **批改 21 份主观题的体力负担 + 对 AI 建议的不信任**：建议无依据、无评分点对照时，教师宁可全人工；confidence 数字只会加重不信任。
3. **从"学生错了"到"下节课怎么办"的断层**：错误数据存在，但拼接成教学行动靠教师脑内完成——这是差异化主线（洞察→动作→产物→效果）要消灭的断层。
4. **"像 demo"的直接来源**：数字对不上（5 vs 21）、按钮无反馈（生成试卷 no-op）、刷新丢状态——教师因此不敢把真实教学托付进来。

## 技术风险

| 风险 | 说明 | 对策 |
|---|---|---|
| 契约漂移无防护 | B1 类 mock/real 断裂零报错静默失败，会反复发生 | RC-05-1 强制 mock 契约测试（形状 == types） |
| 无 lint 脚本 | package.json 无 lint/format，红线只能人工 rg | R06 增加禁用词扫描脚本入 CI（本轮 P2） |
| 旧 e2e 失效 | 与页面结构脱节，不能作验收依据（后端审计已证） | 每轮以浏览器实操 + 截图为唯一验收 |
| 后端 P1 债务错位 | insights 证据展示、Butler 上下文在后端仍粗糙；前端按理想模型先行会联调返工 | 前端按后端现有契约消费，理想模型差异上报 ARCHITECT_REVIEW_REQUEST.md |
| 双仓未提交改动混行 | 前端 3 modified + docs/research-repos 未跟踪 | V4 施工前先提交基线（今晚计划 Step 0） |
| dev 端口漂移 | 5176 被占自动跳 5177，验收脚本需固定 | 验收命令统一 `--port 5177 --strictPort` |

## 附：评审过程自查（对本轮"严格按提示词"的诚实记录）

1. **纠错 1（后端评价）**：我最初依据单次子代理只读报告称后端"相当成熟"——被用户质疑后，改为亲读后端审计文档 + 源码抽查，结论修正为："信任模型成熟、08-22 审计所列 P0 均已修复（亲证 4 项）、闭环经浏览器实测；P1/P2 债务仍在（insights 证据展示、Butler 上下文、异步任务真实性）"。**教训已记入 .learnings**。
2. **纠错 2（陈旧证据）**：子代理报告称备课页有 3 处 window.prompt——亲查发现工程未提交改动已全部替换为内联编辑。**凡结论必须当日亲测。**
3. **GitHub 协议**：webwork2（GPL-2.0/Artistic 双许可）与 langgraph（MIT）已完成 clone+LICENSE+源码 Trace，映射写入 reference-map；xzs 以 zip 获取中，未完成前不声明"已参考"；Moodle/Canvas/BBB/RAGFlow 显式延后并记录理由。台账见 reference-map.md。
4. **本轮评审产物**：6 张浏览器截图（round-04/01..06）+ 2 份源码亲读记录 + 后端 3 份审计交叉核对。
