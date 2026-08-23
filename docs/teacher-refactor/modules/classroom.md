# Module Spec — Classroom（课堂）

> 状态：**ACCEPTED**（2026-08-23，Product Architect）
> 定位：正在上的这节课的**控制面**（Mission Control），不是课堂工具陈列页。

## User Job
"上课时我知道这 46 个人此刻跟没跟上：发起即时检测 → 看分布 → 决定讲哪题/推变式；课后这节课的数据自动变成学情。"（J6）

## Primary Reference
SchoolAI Mission Control（谁在参与、谁卡住、现在该介入谁）；Secondary：希沃 AI 授课助手。结构佐证：webwork2 GatewayQuiz（版本化测验 session / 次数 / 时间闸门，见 reference-map）。

## Objects
- `ClassroomSession`：session_id / class_id / lesson_id / status(not_started→live→ended→reviewed) / connected(如 44/46) / 当前环节（联动 LessonSegment.id）/ 当前活动（teaching|quiz|qa|wrap）/ 事件流。
- `LiveQuiz`（当堂检测）：quiz_set artifact（2–3 题，来自本课环节或 a=0 类洞察）；实时聚合：已答数 / 正确数 / 选项分布 / 提交者名单。
- `ClassroomMode`（后端已有）：开启 = 学生端进入独立作答模式；关闭 = 恢复。**有效期秒数等工程表达禁止上 UI**。

## Layout
- 页头：班级·课题·起止时间·连接数·课堂模式开关（状态用业务语言：开启中/未开启）。
- 中部：当前活动区——teaching 时显示当前环节要点+计时；quiz 时显示题目+实时分布柱状+已答/未答名单；qa 时显示收集的问题。
- 底部：下一步动作条（展示分布 / 讲这道 / 推一个变式 / 下一环节 / 结束本节课）。

## Primary CTA
live 时由当前活动决定（发起检测 / 结束本节课）；not_started 时为【开始这节课】（选择 lesson 进入 live）。

## AI Actions
- 发起检测题（基于当前环节，2–3 题，学生端作答）。
- 错误模式提醒："选项 B 的 12 人和昨天作业 a=0 的错误模式一致"（带依据链接）。
- 推一个变式（讲完错题后即时给同类变式，落入 quiz artifact，可再发）。

## Confirmation Gate
课堂节奏类动作（发题/展示/推变式）即时执行不需确认（实时教学场景）；**写入学情/教案的动作**（"把这题加入明天讲评"）仍走确认。

## States
loading / not_started（引导开始或选择课）/ live(teaching|quiz|qa|wrap) / ended（复盘摘要+去向）/ error（连接失败重试）。
ended 复盘：出勤连接、检测正确率、错误模式 top、去向（加入明天备课 / 布置巩固 / 查看学情）。

## Empty State
无今日课：显示"今天没有排课"，提供去 Prep 备课/查看班级去向。

## Acceptance Test
Given live session fixture（44/46 在线）：1) 发起检测后 10 秒内出现分布区并实时更新至 44 已答；2) 分布异常时 AI 提醒含证据链接；3)【推一个变式】产生新题卡片可再发；4) 开启/关闭课堂模式有业务语言状态反馈且学生端行为变化（联动验证）；5) 结束本节课进入复盘摘要且数据可追溯到本节环节；6) 全程无"有效期/秒数/degraded"字样。
