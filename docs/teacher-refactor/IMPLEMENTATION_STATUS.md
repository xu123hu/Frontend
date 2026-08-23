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
| RC-05-5 RD-1 教案结构化抽屉 | ✅ | `content.segments[]`（LessonSegment schema）同步 types/mock；Prep 编辑面板升级为结构化抽屉（学习目标/核心问题/教师活动/学生活动/检查理解/教学内容/材料/时长）；旧 payload 兼容 |
| RC-05-6 Butler 上下文冒烟 | ⏳ 未开工 | P1；下轮随 R06 执行 |

## Changed Files（Round 05 收尾增量）
- `src/mock/teacherData.ts`：`quizArtifact` 去掉 `Math.min(count,6)` → 按请求数足额供题（D1）。
- `src/pages/teacher/TeacherAssignView.vue`：D2 草稿寻址（generate 写 `?artifact_id=` + 进页恢复）；发布一致性门（题数一致 + 每题分值>0 + 总分>0）；「预览学生端」弹窗；题库不足业务警示。
- `src/pages/teacher/TeacherPrepView.vue`：RC-05-5 结构化抽屉模板（学习目标/核心问题/教师活动/学生活动/检查理解）。
- `test/teacher/mockContract.test.ts`：新增 D1 题量诚实契约测试；lessons 契约断言升级为 RD-1 `segments` schema。
- （RC-05-1/2/3 主体验证为上一轮所交，本文件一并纳账。）

## Browser Test & Screenshot Evidence（真实 mock 浏览器）
证据落盘：`artifacts/teacher-refactor/round-05/`
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
1. **RC-05-6 Butler 冒烟**：未开工（P1 -> R06）。
2. **assign / 组卷 mock 题干内容雷同**：mock 生成题为确定性占位（`单调性巩固题 N`，选项仅 ABCD），交互已验证、但题目内容品质仍"demo 感"。待 R06 用 student 题库（含高考题）真实取题 + 单题替换 adapter（见 TODO_BACKEND.md）。
3. **RC-05-5 收尾缝隙**：`?focus={segment.id}` 直达高亮、intervention 的 linked_insight 证据链展示尚未在 UI 呈现（契约数据已就位）。
4. `test/auth/securityPages.test.ts` 2 失败 + 科研端 3 文件 typecheck：存量债，架构师裁决不阻塞本轮（A5 基线以此为准）。
5. 浏览器 harness mock cookie 持久化问题已因 `VITE_USE_MOCK=1 VITE_MOCK_ROLE=teacher` 启动规避（无需手动 cookie）。

## Next
- 向架构师提交 `ARCHITECT_REVIEW_REQUEST.md`，并列：D1/D2/发布门/预览学生端/RC-05-5 已交证据；RC-05-6 与 mock 题干品质请裁决优先级。
- 提交当前工作区至 `refactor/teacher-os`。
- 待 R06：Butler 上下文冒烟、结构化环节聚焦/依据链 UI、mock 真实取题。