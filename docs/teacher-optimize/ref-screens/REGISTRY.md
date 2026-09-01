# UI 施工图纸 · 参照截图登记表（阶段 2）

> 规则（提示词 §3.3）：教师端每个核心页面绑定 1 张参照截图；UI 验收 = 实现页与参照图**并排对比**，不接受形容词化设计要求。参照点清单逐项写明对标什么（布局/密度/配色/组件形态）。
> 图片来源：阶段 0 竞品实拍（`../stage0-screens/`）、既有参照证据（`docs/teacher-v2/references/grading/`）、本次补拍（SchoolAI）。Brisk/Wayground 实拍因截图表面超时未获取，以 reference-map 代码级参照（`D:\teacher-v2-reference-repos\`）替代——见偏差说明。

| 编号 | 参照图（本目录） | 绑定页面 | 参照点清单 |
|---|---|---|---|
| REF-L1 | `REF-L1-khan-teachers-dashboard.png`（Khan Academy for Teachers） | `/teacher/today` | 布局：单列叙事流（hero → 三步法 → 班级预览卡），无 KPI 网格；密度：卡片留白 >20px、每屏 1 个主 CTA；组件形态：任务=横条卡+右侧动作按钮，洞察=可展开证据卡。**对标点：Today hero/任务清单/洞察卡的叙事顺序与动作右置** |
| REF-L2 | `REF-L2-seewo-easinote-editor.png`（希沃白板5） | `/teacher/prep` | 布局：左资源/大纲列表 + 右编辑画布双栏；密度：环节卡紧凑（标题+时长+操作一行）；组件形态：云文件列表行（图标/名/时间/大小）、编辑器顶部工具条。**对标点：时间线环节行密度与"列表→画布"主从结构** |
| REF-L3 | `REF-L3-zujuan-bank-nav.png`（组卷网） | `/teacher/assign` | 布局：选题方式导航（章节/知识点/试卷/智能）+ 右侧题库动态面板；密度：信息高密（题量/更新数直接展示）；组件形态：学科-学段级联选择器、考试月历。**对标点：知识点选择器形态与"题量守卫"的显性化**（我方题量不足守卫对标其"题库不足"提示） |
| REF-L4 | `REF-L4-gradescope-workspace.png`（Gradescope，闭源仅文档证据） | `/teacher/grading` | 布局：左 submissions 队列 + 右作答/评分双栏（V2 Region A-E 已按 RECONSTRUCTION_SPEC 重建）；密度：评分点列表逐行 ✓/!；组件形态：给分输入+确认键右下角、导航上一份/下一份固定。**对标点：题目聚焦工作台三栏与评分点逐条 evidence**（相似度硬门与三方判定已在 `teacher-v2/references/grading/` 在案） |
| REF-L4b | `REF-L4b-zhixue-mobile-grading.png`（智学网移动阅卷） | `/teacher/grading`（次参照） | 布局：单份作答全屏 + 给分键盘；形态：进度感知"第17题（已阅17/46）"。**对标点：批改进度可感知文案**（我方进度条/队列计数对标） |
| REF-L5 | `REF-L5-khan-class-overview.png`（Khan 班级 Overview/Reports） | `/teacher/classes` | 布局：班级选择器 + Overview/Assignments/Students/Reports 页签；密度：指标卡+名单行混合；组件形态：洞察=标题+说明+动作链接行。**对标点：每洞察必挂动作（GP-12）、名单入口** |
| REF-L6 | `REF-L6-schoolai-home.png`（SchoolAI，Mission Control 对标） | `/teacher/classroom` | 布局：实时监控面板（学生状态墙）；密度：状态卡小而密；组件形态：实时刷新的分布/提醒卡。**对标点：会话头+实时分布区+AI 提醒卡三段结构**（reference-map: Classroom=SchoolAI Mission Control） |
| REF-L7 | `REF-L7-xkw-resource-portal.png`（学科网） | `/teacher/resources` | 布局：分类导航+资源卡网格+右侧动态；密度：卡内 4 行信息（题/卷/更新时间/操作）；组件形态：资源卡 CTA、筛选器组。**对标点：资源卡"加入这节课"CTA 与筛选密度**（V2 参照 Paper LMS CommonsCard 为代码级主参照） |
| REF-L8 | `REF-L8-magicschool-ai.png`（MagicSchool AI） | Butler 面板 | 布局：工具箱网格+对话式助手；密度：工具卡 2 行文案；组件形态：场景化引导 chips。**对标点：场景引导 chips 与"动作落 artifact"标准**（SP-2） |

## 并排对比验收方式（体验轨执行口径）
1. 同分辨率（1440×900 为主，1366×768 必须可用）左右并排截图，逐项过"参照点清单"；
2. 每页输出《对照记录》：布局结构/信息密度/组件形态/文案口吻 四项，各标 达标/偏差（偏差须注明有意取舍理由，如无障碍/真实数据限制）；
3. 配色不逐像素对标（我方有暖琥珀 Token 体系，`teacher-design-showcase.design/` 为配色基准），布局与密度必须对标；
4. Legacy 页（Today/Prep/Classroom）按"清零后对照"验收：阶段 3 改造完成即触发对照走查。

## 偏差申报
- Brisk Teaching（L1/L2 代码级主参照）与 Wayground（L3）官网实拍失败（IAB 截图表面超时）；以其克隆仓代码（`D:\teacher-v2-reference-repos\mrbubbles-teacherbuddy` 等，MIT、pinned commit）作为代码级参照继续有效，市场级参照以 Khan/组卷网替代。
