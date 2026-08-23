# Implementation Status — 智学数研教师端

## Current Phase
Phase 2–3 纵深施工（Review Round 03 Required Changes）：Teacher Today（任务优先）→ Assign（每题级编辑/替换/重生成）→ Grading（URL 持久化）→ Prep（去 prompt + 时间线修线）。核心改动已落地并通过构建 / 类型检查。

## Completed（本轮实际完成）
- 工作区建立：分支 `refactor/teacher-os`；`docs/teacher-refactor/` 骨架 + `reference-map.md`；`research-repos/` + `artifacts/teacher-refactor/`。
- **RC-1 Today → 任务优先时间线**：重构为「下一节课 hero（时间/班级/课题/倒计时/备课准备度/缺失项）→ 上课前最值得做的N件事 → 教学行动建议（带依据+可执行动作）」。已接入 `useTeacherTodayStore`（/teacher/today）；mock `todayData()` 提供确定性数据。
- **RC-2 Grading submission id 入 URL**：`watch(selectedId)` 同步 `?submission_item_id=<id>`，刷新后回到当前批改项；`normalizeQueryId` 兼容只读。已接入真实批改队列 store。
- **RC-3 Assign 每题 Edit / Replace / Regenerate**：每题提供 编辑 / 换一题 / 重新生成 / 找相似题 / 锁定；新增内联编辑表单（题干/选项/答案/难度/分值/解析）+ 相似题候选挑选；锁定后禁止批量改动；修复总分计算不一致。
- **Prep 去 `window.prompt()`**（Identity #13）：教学内容 / 添加材料 / 调时长三处均改为内联编辑面板（textarea + number + 保存/取消），`stepDuration` / `recalculateRanges` 复用课时区间。
- **Bug 修复 A — Assign 换一题无效**：根因是 mock 生成的题目 `kp_code='DR-02'`，与本地候选题库 kp_code（MATH-10x）不匹配，`replacementCandidates` 恒为空。修复：`bankCandidatesFor()` 先按知识点精匹配，无匹配时按难度回退，保证换一题/重生成/找相似总有候选题。浏览器实测：`单调性巩固题 1：判断 f(x)=$x^3-3x$...` → `导数与单调性：下列函数中，在 (0,+∞) 上单调递增的是？`（PASS）。
- **Bug 修复 B — Prep 时间线为空**：根因是 mock/后端 lesson artifact 返回 `content.sections`（title/duration_minutes/activities），而 `applyArtifact` 只读 `content.timeline` → 恒 0 环节。修复：`applyArtifact` 优先读 `sections`、兼容 `timeline`，映射为可编辑 LessonStep。
- **工程清理 — research-repos 污染 Vite**：`research-repos/`（77MB 克隆仓库）位于前端根目录，被 Vite 监听触发持续 full-reload，导致 dev 会话不稳。修复：`vite.config.js` 加 `server.watch.ignored: ['**/research-repos/**','**/dist/**']`；`.gitignore` 排除 `research-repos/`。

## Browser Test & Screenshot Evidence（以 agent 报告为准）
真实浏览器（mock 模式 VITE_USE_MOCK=1 + ma_mock_role=teacher）：
- **Today**：渲染任务优先 hero + 备课准备度进度条 + 任务清单 + 教学行动建议（agent 报告 PASS）。
- **Assign**：渲染场景卡 + 快速设置 + 题目列表 + 5 个每题动作按钮；**换一题实测改变题干**（见 Bug 修复 A，PASS）。
- **Prep**：渲染「从哪里开始」+ 课堂时间线 + 教学建议侧栏（PASS）；时间线此前 0 环节（Bug B 已修）。
- **Grading**：渲染批改区，空队列空态正常（PASS）。
- 截图落盘：`artifacts/teacher-refactor/{today,prep,rc3-assign,grading}/*.png`。

## Known Issues / Limitation
- **浏览器 harness 的 mock cookie 未持久**：curl 直测 mock 已证实 `ma_mock_role=teacher` → `mock-token-teacher-preview` → `/auth/me` 返回王老师（teacher 角色）正确；但 browser_use 子代理每次 reload 后 `fetch('/api/auth/token/refresh')` 仍返回 student token，疑似其浏览器上下文 cookie 未随 reload 保留。故 **Prep 内联编辑的点击交互暂未能在真实浏览器重验**（代码已类型检查通过，逻辑为纯客户端 v-if/openEdit/saveStep）。后续可用 `server.watch.ignored` 修复后的稳定会话或真实后端重验。
- prep 截图中 `today.png` 实为 Prep 页（0 环节态），命名被子代理混淆，作为 Bug B 佐证保留。

## Tests
- `npm run build`：PASS（teacher 各 chunk 正常产出）。
- `npm run typecheck`：teacher 相关文件 0 错误；`src/pages/research/*` 存在 master 基线债务（ResearchEducation/ResearchVerify/ResearchWriting），与本轮无关、未处理。

## Real API / Local Fallback
- 后端 M3 已有 `/teacher/today`、`/teacher/grading/*`、`/teacher/quizzes/generate`。本轮在真实契约上推进。
- 单题替换 / 找相似题当前走确定性本地候选集（`src/mock/questionBank.ts`，按 kp/难度/去重过滤），语义真实；待后端提供单题替换端点后切换为 adapter（见 TODO_BACKEND.md）。

## Next
- 用稳定会话重验 Prep 内联编辑（截图）并补 today 页正确截图。
- 提交本轮检查点至 `refactor/teacher-os`；更新 `REFACTOR_REPORT.md`。
- 待架构师确认：备课结构化字段是否纳入教案产物数据模型（触碰 Do Not Change，需复批）。