# Implementation Status — 智学数研教师端

> 主入/出协议：工程 Agent 每轮增量更新本文件；架构 Agent 依此复验。当前进度：**Round 05（CURRENT_DIRECTIVE.md）**。

## Current Phase
Round 05（解堵核心环）收尾清单与 P1 执行中。RC-05-1/2/3/4 已绿；收尾清单 D1(题量诚实)/D2(草稿寻址)/发布门/预览学生端已完成并通过真实浏览器复验；RC-05-5(RD-1 教案结构化抽屉)已完成；RC-05-6(Butler)待下轮。

---

## Round 05 状态逐项诚实标记

| RC / 清单项 | 状态 | 证据 |
|---|---|---|
| RC-05-1 Mock 契约同构（B1） | ✅ | `teacherServer.ts` 批改队列返 `{queue}`；契约测试新增并通过（41 passed） |
| RC-05-2 统一数据世界（B3） | ✅ | 李老师 / 高二（3）班 ·46 人 / 21 份待批 / 10:10–10:55 固定课表（`mockIdentity`+`server.js`+`teacherData`） |
| RC-05-3 组卷真实链路（B2） | ✅ | 生成 POST 必发；每题四件套；换一题单题隔离实测通过 |
| RC-05-3 **D1 题量诚实** | ✅ | 去掉 `Math.min(count,6)` 静默减题 cap（teacherData）；新增契约测试「count=8 必须足额 8 题」；前端不足态警示 + 发布门禁用 |
| RC-05-3 **D2 草稿寻址** | ✅ | 生成成功 `router.replace` 写 `?artifact_id=`；进页读 query 经 `GET /teacher/artifacts/{id}` 恢复；浏览器刷新实测回到同一草稿 |
| RC-05-3 **发布门证据** | ✅ | 浏览器三项实测：8/8 启用、9 请求/8 实际→禁用+“题库供题不足”警示、单题分值 0→禁用+“存在分值为 0”提示 |
| RC-05-3 **预览学生端** | ✅ | 「👁 预览学生端」弹窗展示学生整卷（隐藏答案/解析），浏览器实测 PASS |
| RC-05-4 批改 URL 寻址 + 红线清除 | ✅ | `?submission_item_id=` 入/读/推进；刷新回同一份；gallery 零 confidence 百分比；Enter=确认并推进；Today 深链直达首个未确认份 |
| RC-05-5 RD-1 教案结构化抽屉 | ✅（R05-fix 后） | 初版误标完成被 Architect 复验纠正（时间线 0 环节，`applyArtifact` 仅读 sections）。已按 R05-fix 修复：`segments||sections||timeline` 三级回退接通；补浏览器证据 `prep-timeline-6segments-45min.png` 等三张。Architect 将亲测验收 |
| RC-05-6 Butler 上下文冒烟 | ⏳ 未开工 | 架构师裁决并入 R06 P0；本轮明确不做 |

## Changed Files（Round 05 收尾增量）
- `src/mock/teacherData.ts`：`quizArtifact` 去掉 `Math.min(count,6)` → 按请求数足额供题（D1）。
- `src/pages/teacher/TeacherPrepView.vue`（R05-fix）：`applyArtifact()` 三级回退 `segments||sections||timeline` 并映射 LessonSegment 全部结构化字段（duration_min→时长、kind→环节标签/配色、目标/核心问题/师生活动/检查理解→抽屉、materials→素材计数、linked_insights 暂存不渲染）；`createLesson()` 不再硬编码 topic（新增 `resolveTopic()` 取同班最近教案真实 topic，空则回落默认）。
- `test/teacher/mockContract.test.ts`：lessons 契约断言补强化（Σsegments.duration_min=45、topic 断言、结构化字段）。
- `src/pages/teacher/TeacherPrepView.vue`：RC-05-5 结构化抽屉模板（学习目标/核心问题/教师活动/学生活动/检查理解）。
- `test/teacher/mockContract.test.ts`：新增 D1 题量诚实契约测试；lessons 契约断言升级为 RD-1 `segments` schema。
- （RC-05-1/2/3 主体验证为上一轮所交，本文件一并纳账。）

## Browser Test & Screenshot Evidence（真实 mock 浏览器）
证据落盘：`artifacts/teacher-refactor/round-05/`
- `prep-timeline-6segments-45min.png`（R05-fix）：备课时间线 **6 环节 · 共 45 分钟**（5+10+5+10+12+3）。
- `prep-drawer-open.png`（R05-fix）：结构化抽屉打开态，五字段可见可编辑。
- `prep-duration-update.png`（R05-fix）：第 2 环节时长 10→6 后，顶部总时 45→41 **实时更新**。
- `assign-d1-count8.png`：请求 8 题 → 预览显示 **共 8 题**（无静默减题）。
- `assign-d2-refresh-restored.png`：刷新后 `?artifact_id=art-quiz-*` 仍保留，草稿回到同一 8 题。
- `assign-gate-count-mismatch-disabled.png`：题量改 9 请求 → 共 8 题 +「题库供题不足」警示 + 发布按钮 disabled。
- `assign-gate-score-zero-disabled.png`：单题分值 0 →「存在分值为 0 或未设置的题目」+ 发布按钮 disabled。
- `assign-preview-student-modal.png`：学生端预览弹窗（整卷、隐藏答案/解析）。
- `assign-publish-enabled.png`：一致态下「确认并发布给学生」可用对照。
- 网络证据：`POST /api/teacher/quizzes/generate`（生成）、`GET /api/teacher/artifacts/{id}`（刷新恢复）均已捕获。

## Tests
- `npm run test`（教师套件）：**41 passed / 0 failed**（9 文件，含新契约测试）。全仓基线 2 失败系 `test/auth/securityPages.test.ts`（AdminNav 测试环境未挂 router，架构师已裁决存量债、非本轮）。
- `npm run typecheck`：教师域文件 **0 错误**；`src/pages/research/*` 存在 master 基线债务（ResearchEducation/ResearchVerify/ResearchWriting），非本轮、未改。
- `npm run build`：PASS。
- 禁用词自查 `rg "window\.prompt|window\.alert|alert\(|confidence" src/pages/teacher src/components/teacher`：仅注释提及 window.prompt（无真实调用）；grading 无 confidence 百分比上屏；Today 洞察卡「可信度 %」为业务语言（非批改域）。

## Real API / Mock 状态
- Mock：全教师端点响应形状与 `src/types/teacher.ts` 同构（契约测试保障）；供题已足额。
- Real API：`/teacher/quizzes/generate`、`/teacher/artifacts/{id}`、`/teacher/today`、`/teacher/grading/*` 契约沿用既有告警；D2 刷新恢复依赖后端按 id 取回完整 artifact content（JSONB 直读，无新后端改动，符合 Do Not Change）。

## Known Issues / Remaining（依优先级）
1. **RC-05-6 Butler 冒烟**：架构师裁决并入 R06 P0，本轮不做。
2. **assign / 组卷 mock 题干内容雷同**：架构师已裁决 R06 P0（同题 f(x)=x³-3x、选项 ABCD 占位，交互对但内容不可信）→ 用研库/学生题库（含高考题）真实取题 + 单题替换 adapter。见 TODO_BACKEND.md。
3. **saveDraft 二次保存形态**：`saveDraft` 把时间线写回 `content.timeline`（保留原 segments），因 applyArtifact 优先 segments，二次保存对结构化字段的编辑不会经 timeline 回流。属雕刻级缝隙，非本轮 BL-1 范围（BL-1 仅"接线断裂致 0 环节"），已记录待 R06 随结构化归档一起规整。
4. **旧 payload（仅 sections/timeline）兼容**：`applyArtifact` 已含 `|| sections || timeline` 回退（代码级验证，additive）；因 mock 现直接产出 segments，需 Architect 用历史 artifact 亲测该回退分支。
5. **RC-05-5 收尾缝隙**（R06）：`?focus={segment.id}` 直达高亮、intervention 的 linked_insights 证据链 UI（数据已暂存于 lessonSteps，未渲染）。
6. 存量债（`test/auth/securityPages.test.ts` 2 失败 + 科研端 3 文件 typecheck）按架构师裁决不阻塞本轮（A5 基线）。

## Next
- 提交 R05-fix 修复（BL-1 + P-2）至 `refactor/teacher-os`。
- 请 Architect 亲测 R05-fix 验收 6 条（含旧 payload 回退分支）与组卷 mock 题库/Butler 的 R06 排期。经 Architect 复验通过后 Round 05 关账，进入 R06。

---

## Principal 反馈增量（2026-08-24）：教学建议知识点化 + 作业出题重构

**需求来源（Principal 直接反馈）**：①“教学建议怎么会写出班级数据不足，人不够时就按知识点给建议”；②“作业检测出题太老套麻烦，先 clone 优秀项目再对照全部重构”。已 clone 并 Trace 的 `webwork2`（GPL-2.0/Artistic，B 类）已在 reference-map 全量记录；本轮据此落地。

### 1. 教学建议：班级数据不足 → 按本课知识点生成通用建议（不再是空态）
- 新增 `src/mock/teachingAdvice.ts`：知识点→建议池（含 依据=课标/教法，绝不虚构班级统计），并为未知知识点提供通用兜底建议。
- `TeacherPrepView.vue`：`populateSuggestions()` 按本课话题/环节内容 `detectKps()` 提取知识点 → `suggestionsForKnowledgePoints()` 生成建议；卡片头部加「按本课知识点」标签；删除“当前班级数据不足，暂无可采纳的学情建议”空态文案（`suggestions` 原从未被填充、恒空 → 实为产品缺陷）。建议仍走「采纳建议」落进环节。
- 契约测试：知识点命中返回非空 + 未知知识点回落兜底 + 每条必有依据。

### 2. 作业出题重构（走出“单调性巩固题 N / 答案恒 B / 占位 ABCD”）
- `src/mock/questionBank.ts`：重写为跨 4 知识点（单调性/奇偶性/基本性质/集合）真实题库 + `SCOPE_TO_KP` + `buildQuizSet()`：按知识点×难度分布抽题、mulberry32 确定性乱序选择项并对齐答案字母、池耗尽用参数化变式补足（D1 足额不静默减题）。
- `teacherData.quizArtifact()` / `teacherServer.ts`：forward 请求体（knowledge_points/difficulty）→ buildQuizSet；保留契约字段 item_no/q_type/difficulty/kp/options/answer/analysis。
- `TeacherAssignView.vue`：
  - 范围统一走 `SCOPE_TO_KP`（删双份 SCOPE_KP）；小题量题型分配防越界；
  - 高级「知识点×难度×分值」蓝图真实参与：打开高级设置时按行回填每题分值（`applyBlueprintScores()`，蓝图像不再只是展示）；
  - 逐题「编辑/换一题/找相似」结果写回 artifact（`syncToArtifact()`），不再一次性发布才落盘，`applyCandidate` 去掉“导数与单调性：”强制前缀；
  - 题干/选项渲染交 KaTeX（`LatexText` 组件），替换伪 `<i>` 斜体，公式与选项不再显式 `$...$` 源码。
- 契约测试：buildQuizSet 足额 + 题干互不相同 + 选择题乱序且答案对齐（大样本跨知识点） + quizArtifact 完整契约。

### 证据与验证
- 契约测试：`test/teacher/refactorContract.test.ts`（6 项）通过；教师套件 **47 passed / 0 failed**（10 文件）。
- typecheck：教师域文件 0 错误；`src/pages/research/*` master 存量债未涉。
- build：PASS。
- 真实 mock 浏览器（VITE_USE_MOCK=1, localhost:5177）：备课页建议非空、带「按本课知识点」标签与「依据」；组卷生成 8 道真实数学题、公式 KaTeX 渲染、选择题已乱序（正确答案随选项位移）。证据：`artifacts/teacher-refactor/round-05/prep-suggestions.png`、`assign-generated.png`、`assign-student-preview.png`。

### 待 Architect 复验
- 备课页「按本课知识点」建议在真实班级数据不足时的表现与「采纳建议」落环节。
- 组卷高级蓝图分值回填、单题替换/编辑写回、学生端公式渲染。
- RC-06 排期：教学建议「班级数据≥门槛时切回真实学情驱动（class 模式）」+ 组卷用研库/学生题库真实取题 adapter。