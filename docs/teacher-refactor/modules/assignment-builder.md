# Module Spec — Assignment / Quiz Builder（每题级编辑）

## User Job
教师配置任务类型/班级/范围/题量/时长/难度后，AI 生成一整套试卷对象；生成后教师在**每题**上编辑、换题、重生成、锁定，最终覆盖检查通过、预览学生端后发布。发布前的编辑权在教师，不在 AI 自由发挥。

## Primary Reference
Wayground AI「Generate → Review 每题 → Publish」；Formative AI「逐题 accept/decline/edit + similar/simpler/harder」。
GitHub: `openwebwork/webwork2`（题目/组卷结构参考）。

## Objects
- `Question`：item_no / q_type / difficulty / kp_code / kp_name / question_text / options / answer / answer_analysis / score，含稳定 token（可寻址）。
- `QuizArtifact`：knowledge_points / count / difficulty / items / duplicated / insufficient，总分、预计时长、知识点覆盖随编辑实时联动。

## States
configuring / generating(loading) / review-ready / editing(per question) / publishing / published / empty / error。

## Layout
左栏快速配置（保留现有）；右栏=**真正的试卷对象**：题型分组（选择/填空/解答），每题显示 stem、来源、知识点、难度、分值，带动作行：
【编辑】【换一题】【重新生成】【锁定/解锁】【找相似题】。
顶部汇总：题数 / 预计时长 / 总分 / 知识点覆盖；底部【预览学生端】【确认并发布】。

## Primary CTA
【确认并发布】（发布前须覆盖检查通过 + 可预览学生端）。

## Secondary Actions
- 每题的编辑 / 换一题 / 重新生成 / 锁定 / 找相似题。
- 保存草稿（先生成→保存→再发布）。

## AI Actions
- 换一题：**只替换该题**（从候选集确定性取与该题同知识点/同难度的另一题），更新分值/总时长。
- 重新生成：仅对该题调一次生成。
- 找相似题：定位同类题供挑选。
- 严禁：点「换一题」却整卷重生成。

## Empty State
题未生成时的引导。

## Error State
该题替换/重生成失败：仅该题显示失败+重试，不动其余题。

## Acceptance Test
生成 5 题后：编辑第 2 题题干/答案→预览文字变化且总分/覆盖同步；换一题→仅第 2 题变化，其余 4 题不变；重新生成→仅该题；锁定后该题不再被批量操作影响。覆盖检查列出的知识点与各题 kp 一致。