# Module Spec — Lesson Planning（备课工作台）

> 状态：**ACCEPTED**（2026-08-23）
> 本 spec 与 `lesson-artifact.md`（RD-1 裁决）配套：本文件管工作台交互，那边管数据模型。

## User Job
"沿用已有材料（上次类似课/我的PPT/教材章节/同事共享/空白新建），把高二（3）班容易错的地方补进这节课，其他不动，最后形成可直接上课的产物。" 备课是 workspace，不是表单页。

## Primary Reference
Brisk Lesson Plan（复用已有材料+调整为主路径）。Secondary：希沃 AI 教学空间（备—授—评一体化上下文）。

## Objects
- `Lesson`：lesson_id / class_id / topic / starts_at / prep_completion / missing_items[]。
- `LessonSegment`（RD-1 结构化字段，见 lesson-artifact.md）。
- `LessonSuggestion`：AI 局部建议（目标环节/依据 insight/预计时长/diff）。
- 产物：slide_deck / 当堂 quiz_set / 板书提纲（均挂 lesson，parent_artifact_id）。

## States
loading / empty(无课选择) / draft(编辑中) / generating(AI 生成中) / suggestion-pending(待采纳) / confirmed / published / error。

## Layout
- 页头：面包屑（班级·课时）+ 备课完成度 + 状态标记（draft/confirmed）。
- 左 2/3：45 分钟时间线，每环节卡片（标题/时长/目标摘要/素材计数/AI 标记）；点击展开结构化编辑抽屉；采纳建议后 diff 高亮。
- 右 1/3：教学建议（每条=结论+依据+【采纳】【换一个】【看依据】）+ 产物区（PPT/当堂练习/板书按钮 + 已生成产物版本列表）。
- 入口五方式：上次类似课 / 我的 Word/PPT / 教材章节 / 同事共享 / 空白新建。

## Primary CTA
【确认本节课】——仅当时间线总时长 ≤45min 且各环节有学习目标时可用；确认后 draft→confirmed。

## Secondary Actions
逐环节：编辑 / 加材料 / 调时长 / 删除 / AI 助讲（换一种讲法/按本班调整）；时间线级：加环节 / 重排；产物级：重新生成单产物 / 导出。

## AI Actions
- 建议采纳：**只插入目标环节**，实时重平衡总时长；超 45min 提示压缩建议。
- 换一种讲法：仅当前选中环节重写，保留原版本可 Undo。
- 按本班调整：以班级 insight 为依据的局部修改建议（1-2 条，禁止整课重写）。

## Confirmation Gate
AI 建议 → 采纳（改 draft）→ 教师逐环节终审 → 【确认本节课】。confirmed 后改动需另存新版本（后端 version）。

## Empty State
无课时：五入口引导。素材库为空：引导去资源库并带跳转。

## Error State
生成失败：该建议卡显示失败+重试，时间线不动；版本冲突提示刷新。

## Acceptance Test
Given a=0 洞察 fixture：1) 从 Today【加入下节课】进入后目标环节高亮；2) 采纳后时间线插入 4 分钟反例且总时长仍 45min；3) 编辑环节打开结构化抽屉（无 window.prompt）；4) 【确认本节课】后状态变 confirmed 且产物按钮激活；5) 刷新 `?lesson_id=` 恢复同一课时。
