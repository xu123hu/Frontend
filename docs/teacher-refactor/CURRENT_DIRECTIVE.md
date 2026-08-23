# CURRENT_DIRECTIVE — Round 05

> ⭐ **本文件是工程 Agent（DeepSeek V4）的最高优先级施工指令。每轮施工从阅读本文件开始。**
> 版本：R05 · 发布：2026-08-23 · 发布人：Principal Product Architect
> 依据：ARCHITECT_REVIEW.md（Round 04，基于浏览器实测 + 源码亲读）
> 配套：ACCEPTANCE.md（红线）· GOLDEN_PATH.md（验收主线）· modules/*.md（模块 spec）· BUSINESS_OBJECTS.md §3（数据 SSOT）
> 本文件自包含，无需聊天上下文即可执行。

---

## Round 05 中期核查（Architect 亲测 · 2026-08-23 深夜，证据在 artifacts/teacher-refactor/round-05-arch/）

V4 已交付 RC-05-1/2/4 与 RC-05-3 主体。我逐项亲测结果：

| 项 | 判定 | 亲测证据 |
|---|---|---|
| RC-05-1 契约 | ✅ Verified | diff 亲读（teacherServer 返 `{queue}`）；亲跑 vitest：教师套件含新增 mockContract.test.ts 全过 |
| RC-05-2 数据世界 | ✅ Verified | 浏览器亲证：李老师 / 徽标与任务均 21 / hero「10:10 · 高二（3）班 · 46 人」 |
| RC-05-3 组卷 | 🔶 主体通，余 2 缺口 | ✅ 生成出 6 题卡+四件套（编辑/换一题/重新生成/找相似题）；✅ **换一题单题隔离实测通过**（第1题不变、第2题变化、总数不变）。❌ D1：设定 8 题实际渲染 6 题（mock `Math.min(count,6)` cap 残留于 teacherData，静默减题破坏蓝图一致性）；❌ D2：生成后 URL 无 `?artifact_id=`，刷新丢草稿 |
| RC-05-4 批改 URL | ✅ Verified | `?submission_item_id=si-3` 直接打开精确定位且保持；队列 21 条；页面零 `%`（confidence 已清）；Enter 推进与 Today 深链代码亲读 |

**测试基线（我亲跑）**：vitest 76 passed / 2 failed——2 失败均在 `test/auth/securityPages.test.ts`（AdminNav.vue:8 测试环境未挂 router，存量债，非教师域非 V4 造成）；typecheck 错误仅 3 个科研端文件（存量债，教师域 0 错）。

**Round 05 收尾清单（V4 继续做，做完才算 A1–A5 全绿）**：
1. **D1 题量诚实**：mock 供题按请求数给足；若题库真实不足，前端明示「题库实际供题 N（< 请求数 M）」业务提示并与发布门联动——禁止静默减题。
2. **D2 草稿寻址**：生成成功后 `history.replaceState` 写 `?artifact_id=`；进入页面读 query 恢复草稿（我将以刷新实测验收）。
3. **发布门证据**：构造题数/总分不一致态，截图【确认并发布】disabled；补【预览学生端】实测截图。
4. P1（RC-05-5 RD-1 / RC-05-6 Butler）仍未开工，按原指令执行。
5. 存量债裁决（Architect）：auth 2 测试失败 + 科研端 3 文件 typecheck **不属本轮、不阻塞验收**，但必须在 IMPLEMENTATION_STATUS.md Known Issues 显式记录，禁止 V4 顺手大改科研端。

---

## 原指令正文（Round 05）

### 在整体路线图中的位置
R05 解堵核心环（本轮）→ R06 闭环右半环（讲评回流/学情动作/结构化环节）→ R07 课堂 Session
→ R08 资源与效果验证 → R09 Golden Path 全链验收 → R10 真后端 Docker 联调

**本轮未完成前，禁止启动 R06+ 任何内容。**

## Current Goal（本轮唯一目标）

**解除 Round 04 三个 Blocker（B1 契约断裂 / B2 死按钮 / B3 数据世界矛盾），让 Golden Path GP-1 → GP-10 在 mock 模式下完整真实可走**：

> Today 洞察 → 备课 → 组卷（每题可编辑）→ 确认发布 → 批改队列 → 逐份确认

全程无死按钮、无契约断裂、无数据世界矛盾、关键对象 URL 可寻址。

## Priority

**P0（必须完成，严格按序）**
1. RC-05-1 Mock 契约同构（B1）
2. RC-05-2 统一数据世界（B3）
3. RC-05-3 组卷真实链路（B2）
4. RC-05-4 批改 URL 寻址 + 红线清除

**P1（P0 全绿后才可开始）**
5. RC-05-5 RD-1 教案环节结构化字段（schema 见 modules/lesson-artifact.md）
6. RC-05-6 Butler 上下文冒烟

**P2（本轮明确不做）**
Today 快捷入口收编、视觉打磨、lint 脚本建设。

## Required Changes

### RC-05-1 Mock 契约同构（B1）〔约 0.5h〕

Architect 亲测事实：
- `src/mock/teacherServer.ts:157`：`GET /teacher/grading/queue` 返回**裸数组**；真实后端返回 `{queue:[...]}`。
- `src/api/teacher/grading.ts:7-12`：按 `res.data?.queue ?? []` 解包 → mock 模式下页面静默显示空态，console 零报错。

修改：
1. mock 改为与真实后端同形：`ok(res, { queue: gradingItems })`。
2. 新增 vitest **契约测试**：mock 教师端点响应形状 == `src/types/teacher.ts`（至少覆盖 grading/queue、today、artifacts、quizzes/generate）。
3. mock 数据只允许来自 `teacherData.ts` 单一来源。

### RC-05-2 统一数据世界（B3）〔约 1h〕

SSOT = `docs/teacher-refactor/BUSINESS_OBJECTS.md` §3，逐字对齐：

| 项 | 目标值 | 当前错误值 |
|---|---|---|
| 教师身份 | **李老师** | 王老师（`src/config/mockIdentity.ts`） |
| 班级 | 高二（3）班 **46 人** | 无人数 |
| 下一节课 | **10:10–10:55 固定课表** | now+2h12m 动态时间 |
| 备课进度 | 70%，缺"边界反例、Exit Ticket" | 已正确（保持） |
| a=0 边界 | **17/46 失分，7 人重复** | 已正确（保持） |
| 待批 | **21 份**（队列与 Today 徽标一致） | 队列 5 条、徽标 5 |
| 干预效果 | 54% → 81% | 未落 |

约束：`teacherData.ts` 是唯一实现处；页面组件与 e2e **禁止出现第二份数字**。

### RC-05-3 组卷真实链路（B2）〔约 2.5–3h，本轮最大项〕

Architect 亲测事实：两次点击"✨生成试卷"（含先选"20分钟小测"），performance API 显示**从未发出 POST /teacher/quizzes/generate**——按钮是无反馈 no-op。

修改（验收 = GP-6/7/8 走通，spec 见 `modules/assignment-builder.md`）：
1. 点击必须发出 POST（网络面板可见）；generating 态真实（按钮 loading、防双发）。
2. 结果渲染为**结构化题卡**：题型分组；每题 stem（LaTeX 正确渲染）/知识点/难度/分值/来源；禁止 markdown 整卷。
3. 每题操作四件套：**编辑**（内联表单）/ **换一题**（仅该题变化，同知识点同难度）/ **重新生成**（单题）/ **锁定**。禁止整卷重跑冒充单题操作。
4. 蓝图一致性实时联动：实际题数 == 设定；Σ分值 == 总分；任何不一致**禁用发布按钮**。
5. 覆盖检查 + 【预览学生端】（学生视角整卷）→【确认并发布】（校验全过才可点）→ published；`?artifact_id=` 写入 URL，**刷新恢复同一草稿**。
6. 失败态：生成失败显示业务语言错误 + 重试，不白屏不静默。

### RC-05-4 批改 URL 寻址 + 红线清除〔约 1–1.5h〕

1. `?submission_item_id=` 三件套：进入时读取定位（含直接粘贴 URL 打开）；切换时 `history.replaceState` 同步；确认后自动推进下一份并同步 URL。
2. **刷新必须回到同一份**（Architect 将亲测此项）。
3. 移除 confidence 百分比上屏（`TeacherGradingView.vue` 的 `confidenceText`）；保留"建议依据/需复核"业务语言。`type=rule` 等工程字段零出现。
4. Enter 键 = 确认并下一份。
5. Today【去批改】深链**直达首个未确认份**（URL 带其 id），不是列表页。

### RC-05-5 RD-1 教案结构化字段（P1）

按 `modules/lesson-artifact.md` 的 RD-1 裁决执行：字段 additive/optional；不动 artifact lifecycle；**不动后端**；旧 payload（仅 description）必须继续可渲染；Prep 内联编辑升级为结构化抽屉（目标/师生活动/核心问题/素材/检查理解/时长）。

### RC-05-6 Butler 冒烟（P1）

Prep 页打开助手：上下文显示"高二（3）班 · 导数与函数单调性"；至少 1 个动作落 artifact 或导航；不以裸文本回复收尾。

## Acceptance Criteria（逐条 Pass/Fail，禁止"基本完成/接近完成/视觉类似"）

- **A1 契约**：mock 全教师端点响应形状 == types 定义；新增契约测试全部通过。
- **A2 数据世界**：全站数字逐字 == SSOT（李老师/46/17/46/7/21/70%/10:10–10:55/54%→81%）；Today 批改徽标 == 队列实际条数。
- **A3 组卷**：GP-6/7/8 浏览器实走通过；网络面板可见 generate POST；换一题后其余题 token 不变；构造不一致态验证发布按钮真实禁用；刷新 `?artifact_id=` 恢复。
- **A4 批改**：直接打开 `?submission_item_id=<第N份>` 精确定位；刷新回同一份；确认后 URL 推进；模板中 confidence 零引用（rg 证明）。
- **A5 通用**：console 无 error；`npm run typecheck` / `npm run build` / `npm run test` 全过；截图存 `artifacts/teacher-refactor/round-05/`（每 RC ≥2 张：成功态 + 边界/失败态）。
- **A6 证据**：`IMPLEMENTATION_STATUS.md` 每项 RC 标 Pass/Fail + 截图路径 + 网络请求证据。**Architect 将亲自浏览器复验；未过项自动滚入 R06 Blocker。**

## Do Not Change（保护区，违者整轮回退）

1. 全局导航 7 项与顺序、班级上下文切换器。
2. Today 页已 Accepted 结构（hero / 任务时间线 / 洞察三段式）。
3. **后端 `D:\math-arena` 一律不改**：前端问题禁止通过改后端绕过；契约疑问写 `ARCHITECT_REVIEW_REQUEST.md` 上报，不得私改后端语义。
4. Artifact 生命周期 `draft→confirmed→published→archived` 与既有能力适配层接口。
5. mock 切换机制（Bearer `mock-token-teacher-preview`）。
6. SSOT 数字本身。
7. 本轮禁止启动 Classroom / Analytics / Resources / 效果验证（属 R06+ 范围）。

## 施工前置（Step 0，必做）

前端仓库当前有未提交改动（Round 03/04 遗留）+ 未跟踪的 `docs/`、`research-repos/`。**施工前先提交当前基线**（`research-repos/` 与 `xzs.zip` 加入 .gitignore 不入库），避免新旧改动混行无法归因。

## 证据提交要求（V4 每轮）

- `IMPLEMENTATION_STATUS.md` 增量更新（本轮 RC 状态表 + Mock/Real API 状态 + Known Issues）
- 截图 + 关键代码 diff 摘要 + 网络请求证据
- 禁用词自查输出：`rg "window\.prompt|window\.alert|alert\(|confidence" src/`
