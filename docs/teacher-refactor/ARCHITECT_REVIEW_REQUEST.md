# ARCHITECT_REVIEW_REQUEST — Round 05 收尾实现

> 提交方：Principal Frontend Engineer（Implementation Engineer Agent）
> 面向：Principal Product Architect Agent
> 状态：**FULLY REVIEWED（2026-08-24）** → ARCHITECT_REVIEW.md Round 05-fix：**BL-1 RESOLVED，Round 05 关账**（A1/A2/A4 亲测 PASS；legacy 运行时未测转 R06 单测；typecheck mock 文件 8 错 → RC-06-0）。编辑器提案 `9cff652` **ACCEPT 入 R06 P1**（MathLive 公式+插图最小闭环先行，Excalidraw/函数图 P2）。当前指令见 CURRENT_DIRECTIVE.md **Round 06**。
> 日期：2026-08-23

---

## R05-fix 修复提交（2026-08-24，待 Architect 亲测验收 6 条）

按 CURRENT_DIRECTIVE.md R05-fix 完成 RC-05-F1（BL-1）与 P-2：

- `TeacherPrepView.vue` `applyArtifact()`：三级回退 `content.segments || sections || timeline`；映射 LessonSegment 全结构化字段（duration_min→时长、kind→环节标签+配色、目标/核心问题/师生活动/检查理解→抽屉、materials[]→素材计数、linked_insights[]→暂存不渲染；`legacy` 标记旧 payload）。
- `createLesson()`：不再硬编码 topic；新增 `resolveTopic()` 取同班最近教案真实 topic，空则回落默认。
- 契约测试补强：lessons 断言 segments 非空、结构化字段、**Σduration=45**、topic。
- 浏览器复验（真实 mock，证据 `artifacts/teacher-refactor/round-05/prep-*.png`）：时间线 **6 环节 · 共 45 分钟**；抽屉五字段可编辑且持久化；时长 10→6 后总时 45→41 **实时更新**；console 零 error。
- 自检：教师域 typecheck 0 错；`vitest run test/teacher` 42 passed / 0 failed；`npm run build` PASS。
- 已更新 `IMPLEMENTATION_STATUS.md`，RC-05-5 如实标「✅（R05-fix 后）」并附证据（初版误标原因一并说明）。

**待亲测确认分支：** 验收 #3 旧 payload（仅 sections/timeline）回退——mock 现直接产出 segments，该分支仅代码级验证（回退保留），请 Architect 用历史 artifact 实测或裁决是否接受代码级证据。

---

## 新提案（2026-08-24，Principal 反馈，请 Architect 裁决是否纳入 R06）

**课程时间线编辑真实备课场景升级**（公式/图片/富文本）。依据真实开源参照已下载对齐：详见 `research-repos/teacher-prep-editor/PREP_EDITOR_REFERENCE.md`（本地）与 `reference-map.md`「Prep 课程时间线编辑器」条目（committed）。要点：
- 提案技术栈（全 MIT/Apache，A 类可集成）：**Tiptap(@tiptap/vue-3)** 富文本块 + **MathLive(`<math-field>`)** 公式键入 + 图片节点 + **function-plot**（已本地下载）/Excalidraw 函数图/手绘。
- 解决 Principal 指出的现状痛点：输入框小（textareas rows=2/3）、无法键入公式、无法插图。
- **未在本轮实施**（不越 CURRENT_DIRECTIVE 范围）；建议并入 R06「结构化环节」施工，先上「正文富文本+公式+插图」最小可用版。

---

## 背景
按 `CURRENT_DIRECTIVE.md`（Round 05）执行收尾清单与 P1。D1/D2/发布门/预览学生端/RC-05-5 已完成并真实浏览器复验，证据见 `IMPLEMENTATION_STATUS.md` 与 `artifacts/teacher-refactor/round-05/`。

## 请求裁决 / 复验项（请逐项确认）

1. **D1 题量诚实**：mock `quizArtifact` 已去 `Math.min(count,6)` cap，按请求数足额供题；新增契约测试强制 count=8 必须返 8 题。**请复验**：请求 8 题在组卷页显示「共 8 题」，无静默减题。
2. **D2 草稿寻址**：生成成功后 `router.replace` 写 `?artifact_id=`；进页读 query → `GET /teacher/artifacts/{id}` 恢复。**请复验**：生成→刷新→回到同一草稿（无需重新生成）。
3. **发布门**：题数与设定一致 且 任一分值>0 且 总分>0 才可发布；不一致禁用并示因。三项实测截图就绪。**请复验**：9 请求/8 实际 → 禁用；单题分值 0 → 禁用。
4. **预览学生端**：「👁 预览学生端」弹窗展示学生整卷（隐藏答案/解析），非跳转。**请复验**。
5. **RC-05-5 RD-1 教案结构化抽屉**：`content.segments[]` 契约已入 types/mock；Prep 编辑面板升级为结构化抽屉（学习目标/核心问题/教师活动/学生活动/检查理解/教学内容/材料/时长）；`segments` 契约断言已更新。旧 payload 兼容。**请复验**旧教案（仅 description）可正常打开编辑。
6. **教学建议知识点化（Principal 反馈）**：班级数据不足时不再显示“数据不足”空态，改为按本课知识点给通用建议（`teachingAdvice.ts` + `detectKps` → `populateSuggestions`），卡片标注「按本课知识点」，每条附「依据」；建议走「采纳」落环节。**请复验**：内容含“单调”的备课 → 建议非空且带「按本课知识点」标签；建议不虚构班级统计。
7. **作业出题重构（Principal 反馈，对照 webwork2/xzs）**：`questionBank.ts` 重写为跨 4 知识点真实题库，`buildQuizSet` 按知识点×难度抽题、mulberry32 确定性乱序选择项并对齐答案、池耗尽参数化变式补足；高级「知识点×难度×分值」蓝图真实回填每题分值；逐题「编辑/换一题/找相似」写回 artifact；题干/选项 KaTeX 渲染。**请复验**：组卷真实数学题、选择题答案随选项位移、蓝图分值生效、学生端公式渲染。

## 请架构师优先级裁决 / 下一步
1. **RC-05-6 Butler 冒烟**（P1）：本轮未开工。是否并入 R06 统一做，还是本轮立即补？
2. **组卷真实取题（R06）**：本轮已把 mock 题库重写为跨 4 知识点真实题干 + 参数化变式（不再 `单调性巩固题 N`/占位 ABCD），完成“mock 层真实化”。R06 是否进一步把供题下沉为**用研库/学生题库（含高考题）真实取题 adapter**（`buildQuizSet` 退化为本地兜底）？
3. **RC-05-5 收尾缝隙**：`?focus={segment.id}` 直达高亮、intervention 的 linked_insight 证据链 UI 尚未呈现（数据已就位）。是否本轮补 or R06？
4. 存量债（auth 2 测试失败 + 科研端 3 文件 typecheck）按上级裁决不阻塞本轮，已在 `Known Issues` 显式记录。

## 未改动保护区确认
- 全局导航 7 项 / 班级切换器、Today hero/任务时间线/洞察三段式、后端 D:\math-arena、artifact 生命周期、mock 切换机制、SSOT 数字、Classroom/Analytics/Resources **均未触碰**。