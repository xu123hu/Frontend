# ARCHITECT_REVIEW — Round 04

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
