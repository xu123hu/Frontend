# Module Spec — Grading Workstation（URL 寻址）

## User Job
教师连续批改同一道题的多份作答时，尽可能少切鼠标、少重复读评分标准；当前批到哪一份，刷新 / 直接打开 URL / 分享链接都能回到同一份，而非跳回队首。

## Primary Reference
Gradescope「按题连续批阅 + rubric + Next Ungraded」；Canvas SpeedGrader「作答区 + 评分联动」。本 RC 只做「当前份可寻址」这一环。

## Objects
- `submission_item_id`：当前批改对象的稳定 ID，进入 URL query（key 与类型字段同名）。
- `GradingDetail`：original_answer / scoring_standard / suggestion / status / score。

## States
loading / empty(queue 空引导) / ready / confirming / overridden / error；随 `selectedId` 变化整页上下文切换。

## Layout
保持现有 left 作答区 / right rubric+AI 建议。顶部保留进度「第 N/N 份」。

## Primary CTA
【确认并下一份】（Enter 同理）——确认后推进到下一未确认份，并同步 URL。

## Secondary Actions
改分确认、稍后复看、切份（select 或队列）。

## AI Actions
- 建议分 + 评分点解释永远仅作建议，最终权在教师。
- 不暴露 confidence / type=rule / workflow。

## Empty State
无待批时引导去发布试卷。

## Error State
加载失败/版本冲突（乐观锁）给出可恢复提示+重试。

## Acceptance Test
派发 3 份：进入 `/teacher/grading?submission_item_id=X2` → 立即渲染第 2 份；确认后 URL 变为下一个未确认 id；刷新 URL 仍回到该份；直接访问无 query 时回退到队首（不崩溃）。