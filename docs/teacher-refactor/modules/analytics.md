# Module Spec — Analytics / Classes（班级学情）

> 状态：**ACCEPTED**（2026-08-23，Product Architect）
> 定位：学情的出口与干预的入口——"哪里弱 → 证据 → 下一步动作"，不是 BI 大屏。

## User Job
"哪个班/哪个知识点/哪些学生需要我干预？这次干预有没有用？"（J7）

## Primary Reference
Wayground（技能薄弱→直接给练习资源并分配）；Secondary：Khanmigo Class Snapshot。结构佐证：webwork2 `Stats.pm / StudentProgress.pm`（按题/按生聚合，见 reference-map）。

## Objects
- `ActionableInsight`（SSOT 定义见 BUSINESS_OBJECTS §2.6）：kind / summary / evidence / recommended_actions[] / applied / data_window。
- `StudentMasteryView`（按生）：学生 × 知识点掌握度 + 最近作答；薄弱名单（如 a=0 边界 7 人重复失分名单）。
- `EffectivenessRecord`（干预效果）：干预前 54% → 干预后 81%（补讲前后同类题正确率对比）。

## Layout
- 左：班级/学生列表（人数、最近作业完成度）；学生点击展开个人掌握面。
- 右：洞察流（每条=结论一句话 + 证据（人数/作业/时间窗）+ 动作按钮组 + applied 状态）。
- 图表纪律：只在能回答具体问题时出现（选项分布/正确率趋势），每图必须能下钻到作答明细。

## Primary CTA
洞察行内动作（不是页面级单一 CTA）：【布置针对性练习】→ Assign（预填 kp）；【加入下节课】→ Prep（from=insight）；【查看名单】→ 学生列表过滤。

## AI Actions
- 洞察生成（后端已有 5 kind：review_backlog / low_mastery / submission_trend / error_cluster / prep_gap）。
- 干预建议（针对名单自动起草练习/复习方案，落 draft artifact 待确认）。
- 效果复盘（对比干预前后，形成"有效/需再干预"结论）。

## Confirmation Gate
洞察查看只读；**布置练习/修改教案/创建复习**走各自模块的确认门。applied 状态在动作完成后回写。

## States
loading / empty（无足够作答数据 → 引导布置首份作业）/ error。**禁止**：无数据时伪造洞察（后端已遵守空数据不伪造，前端同样）。

## Evidence 下钻（G5 强制）
每条洞察的"看依据"必须能到达：涉及的作业/题目列表 → 具体学生作答（批改页可寻址）。证据链断=验收失败。

## Acceptance Test
Given 数据世界：1) a=0 边界洞察位于顶部且数字=17/46、7 人重复；2)【查看名单】显示 7 人并可点入个人面；3)【布置针对性练习】跳 Assign 且蓝图预填该知识点；4) 干预效果卡显示 54%→81% 对比；5) evidence 下钻可达原始作答；6) 无任何无动作洞察卡。
