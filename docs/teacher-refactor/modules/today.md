# Module Spec — Teacher Today（任务优先时间线）

## User Job
真实高中数学教师打开系统，10 秒内知道「我现在在准备什么、上课前最值得先做完的三件事、下一步该点哪里」。不是看数据大屏。

## Primary Reference
Brisk Next（Prepare/Engage/Assess 下一步生成器）+ Khanmigo Recommended Assignments「洞察→当场执行」；科大讯飞星光「打开即今日待办」。

## Objects
- `nextLesson`：class(topic/class_name/starts_at) + 派生：倒计时、备课完成度、缺失项。
- `tasks`：上课前最值得处理的 1..N 件（每件带 count + 动作）。
- `actionable_insights`：summary + evidence + 可执行 actions（label + target 页面）。

## States
loading / empty / error / ready；每 action 按钮保持可点状态。

## Layout（任务优先，非 KPI 卡）
1. 问候（一句话，不含内部字段）。
2. **下一节课 hero**：班级 · 课题 · 时间 · 距上课 X 时 X 分 · 备课完成度 · 还缺 X / Y ·【继续备课】主 CTA。
3. **上课前任务清单**：「预留补课」「批 N 份周测」「看视频未完成名单」…每项解释一句 + 动作按钮。
4. **教学行动建议**：每个 insight = 一句话结论 + 依据 + 行动按钮。
5. 页面保持 dense、去装饰，信息层级来自 typography/spacing，非渐变/大横幅。

## Primary CTA
【继续备课】（下节课 hero）—— uncertain fallback 进入备课；在 Today 顶部始终可见的下一个业务动作。

## Secondary Actions
- 每任务项的深入动作（去批改 / 出巩固题 / 加入下节课 / 看依据 / 看名单）。
- 快捷入口保留（备课与PPT / 出题并发布）但降为次级，不占首屏重心。

## AI Actions
每个 action 是**具体、有目标页面**的业务动作，禁止"告诉 AI 做什么"的自由 prompt。
- 加入下节课 → 备课
- 出巩固题 → 布置作业
- 看依据 → 现实：确定性展示证据文本/最近作答

## Empty State
无下一节课时：给出「今天暂无已登记课程」，提供「开始备课」进入真实流程。
无待办时：明确"当前没有待处理事项"。

## Error State
聚合失败不伪造：显示错误 + 重试；数据不足的洞察不生成虚构结论。

## Acceptance Test
Given 高二(3)班/导数/46 人 fixture：首屏必须出现 1) 下一节课(含 班级·课题·时间·倒计时·完成度·缺失项)；2) 至少 3 项任务且每项可点进对应页面；3) 每个洞察有依据文本 + 至少 1 个动作。任何页面不得出现 `count=`/`recent_count=`/`confidence` 等内部字段。