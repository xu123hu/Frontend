# BUSINESS_OBJECTS — 核心业务对象与关系

> 状态：**ACCEPTED**（2026-08-23，Product Architect）
> 本文件是前端与后端共同的对象 SSOT。后端实现以 `D:\math-arena\services\api\app\models\teacher.py`（TeachingArtifact 等）与 `models/coursework.py`（Assignment/Quiz/Submission）为准；前端类型不得自造与后端冲突的字段语义。

---

## 1. 对象总图

```
Teacher(用户, verified)
  └─ Class(班级, context root)──┬─ Student(46人)
                                ├─ ActionableInsight(学情洞察)
                                └─ ClassroomSession(课堂)
Lesson(课时) ──1:N── LessonSegment(环节)
Assignment(作业) ──1:N── QuizItem(题) ──submit──> SubmissionItem(学生逐题作答)
Artifact(教学产物, 统一载体) ── type: lesson_plan | slide_deck | quiz_set | grading_suggestion | explanation | preprocess | document
TeacherTask(异步任务) ──> Artifact
TeacherAction(审计动作, 幂等)
Resource(教学资源) ──attach──> LessonSegment / QuizItem / Artifact
```

## 2. 核心对象定义

### 2.1 Teacher（教师）
- 来源：统一认证 + approved `role_bindings`（后端 `require_verified_teacher`，五重校验）。
- 前端不缓存教师身份之外的任何派生权限；一切以 API 40301/40302 为准。

### 2.2 Class（班级）— context root
| 字段 | 语义 |
|---|---|
| `class_id` | 稳定 ID |
| `class_name` | 如"高二（3）班" |
| `student_count` | 如 46（展示"17/46"类证据必须用同源数字） |

- 所有页面数据查询都带 class 上下文；班级切换 = 全站上下文切换。

### 2.3 Lesson（课时）与 LessonSegment（环节）
- Lesson = 一节 45 分钟的真实课：`lesson_id` / `class_id` / `topic` / `starts_at` / `location` / `prep_completion` / `missing_items[]`。
- LessonSegment 结构化字段见 `modules/lesson-artifact.md`（RD-1 裁决）。
- Lesson 状态机：`draft → confirmed → published(课件等产物就绪) / archived`。

### 2.4 Artifact（教学产物）— 统一产物载体（对齐后端 TeachingArtifact）

| 字段 | 语义 |
|---|---|
| `artifact_id` | UUID，前端一切"AI 结果"的落点 |
| `artifact_type` | lesson_plan / slide_deck / quiz_set / grading_suggestion / explanation / preprocess / document |
| `status` | **draft → confirmed → published → archived**（FROZEN，与后端一致） |
| `version` | 整数版本；教师编辑产生新 version |
| `content` | 按 type 分 schema 的 JSONB（见各模块 spec） |
| `source_refs[]` | 证据引用（作答/洞察/资源 id），支撑"AI 有依据" |
| `validation` | 校验结果（题数/总分/覆盖检查等） |
| `warnings[]` | 面向教师的**业务语言**警告（禁止 error code 直出） |
| `engine` / `degraded` | local / xingchen；**degraded 不上 UI 首层**，只在异常提示中出现 |

**规则：AI 一切生成物首先是 draft Artifact。发布/确认/成绩写入必须走教师显式确认端点。**

### 2.5 Assignment / QuizItem / SubmissionItem（作业闭环）
- `Assignment`：`assignment_id` / `class_id` / `status: draft→published→closed→archived` / `source_artifact_id`（来自 confirmed quiz_set）。
- `QuizItem`（题，结构化实体，禁止整卷 markdown）：
  `item_no / q_type(choice|blank|text) / difficulty(easy|medium|hard) / kp_code / kp_name / question_text / options / answer / answer_analysis / score / source_type / validation_status`
- `SubmissionItem`（学生逐题作答）：
  `submission_item_id / student_label(作答 #NNN) / status(unprocessed|low_confidence|confirmed) / suggestion_score / teacher_final_score / teacher_feedback`
- **不变量（invariants）**：
  - `assignment` 发布前其 quiz_set 必须 confirmed 且 validation 全过。
  - `sum(QuizItem.score) == 试卷总分`；`实际题数 == 蓝图题数`。
  - `teacher_final_score` 只能由 confirm 端点写入；suggestion 永远是 draft。

### 2.6 ActionableInsight（学情洞察）— 差异化核心对象
| 字段 | 语义 |
|---|---|
| `insight_id` / `class_id` / `kind` | review_backlog / low_mastery / submission_trend / error_cluster / prep_gap |
| `summary` | 一句话结论（"17/46 人连续两次在参数边界 a=0 失分"） |
| `evidence` | 结构化证据：涉及作业数、作答数、人数、班级总数、可跳转原始作答 |
| `recommended_actions[]` | 至少 1 个可执行动作（label + 目标路由 + 参数） |
| `applied` | 是否已被采纳进教学 |

**规则：没有 evidence 或没有 action 的洞察不允许出现在 UI。** 后端 `confidence` 字段存在但**前端禁止渲染**。

### 2.7 ClassroomSession（课堂）— 见 modules/classroom.md
- `session_id` / `class_id` / `lesson_id` / 当前环节 / 当前活动 / 参与人数 / 事件流。
- 状态机：`not_started → live(activity: teaching|quiz|qa|wrap) → ended → reviewed`。

### 2.8 Resource（教学资源）
- 资源不是文件，是"可进入教学的资产"：`resource_id / name / type / kp[] / chapter / source / processing_status / preview / last_used_at`。
- `processing_status` 只允许出现在详情页/异常提示，不进卡片首层。

### 2.9 TeacherTask / TeacherAction
- TeacherTask：AI 异步任务（`status: queued→running→completed|failed|cancelled`，progress 0-100）。前端必须真实呈现状态迁移，禁止假 loading。
- TeacherAction：写操作审计 + 幂等键（后端已实现），前端对写操作带 `client_request_id`。

## 3. 统一 Demo 数据世界（SSOT fixture）

全站页面引用同一事实源（mock 层与 e2e 共用），**数字必须逐字一致**：

| 事实 | 值 |
|---|---|
| 教师 | **李老师**，高二数学 |
| 主班级 | 高二（3）班，**46 人** |
| 下一节课 | 8 月 24 日 10:10–10:55，《导数与函数单调性》，高二（3）班教室 |
| 备课进度 | 70%，缺"边界反例"和"Exit Ticket" |
| 核心学情 | 参数边界 a=0：两次任务 17/46 人失分，其中 7 人重复 |
| 待批 | 《导数周测》**21 份**主观题 |
| 视频任务 | 7 人未完成；"分类讨论"片段被 23 人回看 |
| 干预效果 | 补讲后相似题正确率 54% → 81% |

**验收红线**：任何页面出现与上表矛盾的数字（如批改队列 5 份、教师"王老师"、无班级人数）即 FAIL。

## 4. 对象关系不变量汇总

1. Artifact 的 `class_id` 必须能回溯到教师所属班级（class scope）。
2. lesson_plan confirmed 之后才允许生成 slide_deck / 当堂 quiz_set（来源 `parent_artifact_id`）。
3. grading_suggestion 永远挂 SubmissionItem，不直接挂学生身份。
4. Insight 的 apply 动作产生新的 lesson_plan draft version（不覆盖 confirmed 版本）。
5. 教师编辑永远产生新 version；confirmed/published 版本不可变（后端乐观锁 version 字段）。
