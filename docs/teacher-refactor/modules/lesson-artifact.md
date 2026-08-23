# Module Spec — Lesson Artifact（教案产物数据模型）

> 状态：**ACCEPTED**（2026-08-23）
> 本文是对 IMPLEMENTATION_STATUS.md「Architect Review Needed」挂起问题的**正式裁决（RD-1）**。

---

## RD-1 裁决：LessonSegment 结构化字段纳入教案产物数据模型

**问题**：备课环节此前仅有自由文本 description；诊断报告与身份提示词要求每环节具备结构化教学语义。Round 03 曾将"教案产物数据模型"列入 Do Not Change，工程 Agent 据此挂起，请求架构师确认。

**裁决**：**REOPENED → 有条件 ACCEPT**。结构化字段**纳入** lesson_plan artifact 的 segment content schema。

理由（新证据充分）：
1. 深度诊断报告（截图三分析）明确：备课页缺的不是骨架而是"教学环节是什么业务对象"。
2. 总控提示词 §14 要求环节至少含目标/师活动/生活动/核心问题/素材/检查理解/时长。
3. v2.1 SSOT 的差异化主张（AI 只改最相关的环节）依赖结构化字段才能定位"例题2之后插入反例"。

**条件（保护 Round 03 的原始意图——防止随意重构）**：
1. **Additive & Optional**：新字段全部可选；旧 payload（仅 description）必须继续可渲染，禁止迁移破坏。
2. **不动 artifact lifecycle**：draft→confirmed→published→archived 与 version 机制不变。
3. **不动后端模型**：后端 TeachingArtifact.payload 本就是 JSONB，schema 演进发生在 content 内部；**不新增数据库列、不写 Alembic 迁移**（符合项目硬约束）。
4. mock 与真实 API 的 lesson content schema 同步更新；`src/types/teacher.ts` 同步。

## LessonSegment Schema（lesson_plan artifact 的 content.segments[] 元素）

| 字段 | 类型 | 语义 |
|---|---|---|
| `id` | string | 环节稳定 token（URL `?focus=` 寻址） |
| `title` | string | 如"例题2：参数分类讨论" |
| `duration_min` | number | 该环节时长；编辑后由前端实时重平衡 Σ≤45 |
| `kind` | enum | import / concept / example / practice / check / summary / intervention |
| `learning_objective` | string? | 本环节学习目标 |
| `teacher_action` | string? | 教师活动（讲授/提问/演示） |
| `student_action` | string? | 学生活动（独立作答/讨论/演板） |
| `core_question` | string? | 核心问题（一句话） |
| `content` | string | 主内容（富文本，含 LaTeX；description 旧字段映射于此，读旧写新） |
| `materials[]` | {resource_id, name, usage}[] | 素材引用（可跳资源库） |
| `assessment_check` | string? | 检查理解方式 |
| `linked_insights[]` | string[] | 依据的 insight_id（支撑"AI 有依据"） |
| `source` | enum | template / adapted / ai_suggested / teacher_edited |
| `locked` | boolean? | AI 批量建议不得触碰（同 PPT 锁页语义） |

**派生不变量**（前端维护，发布前校验）：
- `Σ duration_min ≤ 45`；超限时【确认本节课】禁用并给出压缩建议。
- `intervention` 环节必须非空 `linked_insights`（证据链）。

## Slide Deck（slide_deck artifact，content schema 摘要）

- `outline[]` → `pages[]`：每页 `{slide_id, section_ref(环节id), layout, title, blocks[], speaker_notes, math latex, locked, generation_status}`。
- 规则：单页重生成不触碰其他页；locked 页任何批量操作跳过；导出走后端 PPTX download，失败走确定性降级提示（业务语言）。

## 板书提纲 / 当堂练习
- 板书提纲 = explanation artifact，按环节组织要点。
- 当堂练习 = quiz_set artifact，`parent_artifact_id = lesson`，蓝图预填本课知识点（衔接 Assign 模块）。

## Acceptance Test
1) 旧格式 lesson（仅 description）打开不报错、可正常确认；2) 新建/采纳建议产生的环节具备结构化字段；3) 修改任一环节 duration 后总时长与各段占比实时更新；4) `?focus={segment.id}` 直达并高亮该环节；5) intervention 环节显示其 linked_insight 依据并可跳转证据。
