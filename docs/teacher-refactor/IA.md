# IA — 智学数研教师端信息架构

> 状态：**ACCEPTED**（2026-08-23，Product Architect）
> 全局导航一级结构为 FROZEN；本文件定义全局 IA、上下文层级与 URL 寻址规范。

---

## 1. 全局导航（FROZEN，7 项，禁止增删）

```
今天 Today ─ 备课 Prep ─ 作业测验 Assign ─ 批改 Grading(badge) ─ 课堂 Classroom ─ 班级 Classes ─ 资源 Resources
```

- 顺序即教学循环顺序（Today 起于洞察，Resources 服务备课），不是字母序或功能分类序。
- 批改 badge 显示待确认份数；为 0 时不显示 badge。
- 全局 AI 教学助手（Butler）以悬浮面板存在，**不占一级导航位**——它是入口的入口，不是业务模块。

## 2. 上下文层级（Context Model）

系统内存在 6 个上下文层级，页面必须让教师始终知道自己在哪一层：

```
Global（教师是谁，教什么）
  └─ Course（哪门课/教材进度）
      └─ Class（哪个班 ← 最重要的业务 context root）
          └─ Lesson（哪节课）
              └─ Assignment / Artifact（哪份作业/产物）
                  └─ Student / Question（哪个学生/哪道题）
```

规则：

1. **Class 是贯穿所有 Artifact 的 context root**。班级切换器（class context switcher）在导航区常驻，切换后所有页面数据随之切换。
2. 页面上下文通过 **面包屑 + 页头对象标题** 双重表达，例如：
   `高二（3）班 · 导数与函数单调性 · 例题2 批改（第 12/46 份）`
3. 任何页面不允许出现"不知道当前在处理哪个对象"的状态（空白 + 无标题 + 无面包屑）。

## 3. URL 寻址规范（业务对象必须可寻址）

| 路由 | 语义 | 关键 query/param | 刷新行为 |
|---|---|---|---|
| `/teacher/today` | 行动中心 | — | 重新聚合 |
| `/teacher/prep` | 备课工作台 | `?lesson_id=` 当前课时；`?focus=segment-3` 高亮某环节；`?from=insight:{id}` 从洞察带入 | 回到同一课时 |
| `/teacher/assign` | 作业/组卷 | `?artifact_id=` 当前试卷草稿；`?mode=quiz\|homework\|exam` | 回到同一草稿 |
| `/teacher/grading` | 批改工作台 | `?submission_item_id=` 当前份；`?question_id=` 按题模式 | **必须回到同一份** |
| `/teacher/classroom` | 课堂 Session | `?session_id=`；无 session 时显示"开始/选择一节课" | 回到同一 session |
| `/teacher/classes` | 班级与学情 | `?class_id=`；`?tab=roster\|insights\|trends` | 回到同一班同一 tab |
| `/teacher/resources` | 资源库 | `?kp=` 知识点；`?type=`；`?q=` 搜索词 | 保留筛选 |

规则：

1. query 名与后端字段同名（`submission_item_id`、`lesson_id`、`artifact_id`），禁止自造驼峰别名。
2. 状态写入用 `history.replaceState`（不产生历史噪音），教师显式导航才 push。
3. 直接访问带 query 的 URL 必须恢复完整上下文，不允许回退到队首/列表页。
4. URL 缺 query 时的回退行为必须定义（见各模块 spec 的 Empty State）。

## 4. 模块页面职责（每页一句话）

| 页面 | 职责（唯一） | Primary CTA |
|---|---|---|
| Today | 告诉老师"现在最值得做什么"并直达 | 【继续备课】 |
| Prep | 把"这节课"从材料变成可上课的 Lesson Artifact | 【确认本节课】 |
| Assign | 生成→逐题审校→覆盖检查→发布一份可信试卷 | 【确认并发布】 |
| Grading | 按题连续批阅，AI 建议+教师终审 | 【确认并下一份】(Enter) |
| Classroom | 正在上的这节课的实时控制面 | 由当前活动决定（发题/展示/结束） |
| Classes | 班级学情 → 干预动作（不是 BI 大屏） | 洞察行内动作（布置练习/加入下节课） |
| Resources | 教学资产围绕"课对象"复用 | 资源卡行内【加入这节课】等 |

## 5. 页面间流转（IA 级跳转合同）

- Today → Prep：带 `lesson_id` + `from=insight:{id}`，备课页必须高亮目标环节。
- Today → Grading：直达队列首个未确认份（URL 带其 id）。
- Today/Classes → Assign：带 `kp=`（薄弱知识点）与 `class_id`，作为出题默认范围。
- Prep → Assign：从"生成当堂练习"进入，蓝图预填本课知识点。
- Grading 完成 → Classes/Today：批改汇总洞察回流（"最值得讲的 3 题"），可一键加入下节课讲评。
- Classroom 课后 → Prep(下节课)/Classes：session 复盘结论进入学情。

**禁止**：任何页面提供"回到首页看看"之外的无业务语义跳转；禁止模块间用全局菜单做中转（应通过行内动作直达）。

## 6. 布局差异化（反 Frankenstein / 反模板复制）

每个模块的布局必须由其任务形态决定，禁止"sidebar+KPI+四卡片"模板复制：

- **Today**：单列任务流（hero + 任务清单 + 洞察），无表格。
- **Prep**：左 2/3 时间线工作区 + 右 1/3 建议与产物栏。
- **Assign**：左 1/3 配置蓝图 + 右 2/3 真试卷（题型分组逐题卡片）。
- **Grading**：左 65% 作答区 + 右 35% 评分建议；顶部进度条。
- **Classroom**：顶部课上下文 + 中部当前活动/实时分布 + 底部下一步动作。
- **Classes**：左班级/学生列表 + 右洞察→动作；图表只在能回答问题时出现。
- **Resources**：筛选栏 + 卡片流；卡片 CTA 是"用"，不是"下载"。
