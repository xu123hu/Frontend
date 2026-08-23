# Module Spec — Resources（教学资源）

> 状态：**ACCEPTED**（2026-08-23，Product Architect）
> 定位：围绕"课对象"复用的教学资产库，不是文件浏览器。

## User Job
"我上次用的那个课件/试卷/素材，能直接进明天的课。"（J8）

## Primary Reference
Brisk（当前材料直接改造成课/题/活动）；Secondary：Khanmigo My Documents。

## Objects
- `Resource`（SSOT 见 BUSINESS_OBJECTS §2.8）：resource_id / name / type(document|slides|worksheet|media|question_set) / kp[] / chapter / source(upload|artifact衍生物|共享) / processing_status / preview / last_used_at / used_in[]。
- 资源的两种来源：教师上传（后端 upload→preprocess→understand 链路）与**系统产物回收**（confirmed/published artifact 自动入库可复用——闭环的关键）。

## Layout
- 顶部：搜索 + 筛选（类型/知识点/章节/来源）。
- 主体：卡片流（预览缩略 + 名称 + 知识点标签 + 最近使用 + 使用处计数）。
- 卡片主 CTA：**用起来**（加入某节课 / 从此生成练习 / 打开预览），不是"下载"。

## Primary CTA
卡片行内【加入这节课】（选择目标 lesson/环节，回 Prep 验证出现）；次级【生成练习】→Assign 预填。

## AI Actions
- 预处理/理解（后端已有 preprocess/understand 能力，异步任务，真实状态）。
- "从这份材料出一节课/一套题"：落 draft artifact 走各自确认门。

## States
loading / empty（引导上传或从已完成作业导入）/ processing（真实任务状态：解析中/已完成，进度真实，不假 loading）/ error（失败可重试，材料保留）。
processing_status 只出现在卡片角标或详情，不占首层信息位。

## 与闭环的衔接（G10）
- Prep 环节素材引用 resource_id（lesson-artifact schema 的 materials[]）。
- Assign 可从 question_set 类资源直接导入为蓝图候选。
- 资源详情显示 used_in[]（被哪些课用过），支撑复用心智。

## Acceptance Test
1) 资源卡【加入这节课】后，Prep 对应环节 materials 出现该资源（GP SP-1）；2) 上传文件后 processing 状态真实迁移并可重试；3) 确认过的作业/课件出现在资源库（产物回收）；4) 空库时引导路径可达上传/去布置作业；5) 卡片无原始文件元数据/Markdown 原文堆砌。
