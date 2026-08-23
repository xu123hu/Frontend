# ACCEPTANCE — 全局验收标准

> 状态：**ACCEPTED**（2026-08-23，Product Architect）
> 本文件是所有模块共同的验收合同。任何一条 Gate Fail，不得宣称页面/模块完成。
> 与模块 spec 的关系：本文件管全局红线；模块 spec 管模块内验收（Acceptance Test）。

---

## 1. 十条 UX Gate（每页每轮全查，Pass/Fail）

| # | Gate | 判据 |
|---|---|---|
| G1 | 10 秒可理解 | 第一次进入的人 10 秒内知道"我现在在处理什么对象、要完成什么" |
| G2 | 首屏有主动作 | 首屏存在一个明确 Primary CTA，不需要教师自己探索 |
| G3 | 不写 Prompt 完成主任务 | 主路径全部通过业务按钮完成；输入框不是必需品 |
| G4 | 上下文可见 | 页头明确 班级/课/作业/学生/题目 中的相关对象（面包屑+标题） |
| G5 | AI 有依据 | 涉及学情的建议都能查看数据依据（evidence 可达） |
| G6 | AI 变 Artifact | AI 生成后进入可编辑对象（artifact_id/版本），不是一段消息 |
| G7 | 无工程泄露 | UI 不出现 raw JSON、enum、confidence、workflow、timeout 秒数、内部 ID 语义化缺失 |
| G8 | 空态有用 | 无数据时告诉教师如何产生数据或走人工流程，不放"暂无数据"死胡同 |
| G9 | 最终权在老师 | 发布/成绩/正式课件必须教师显式确认；AI 永远是建议 |
| G10 | 闭环有下一步 | 完成当前任务后至少提供一个符合教学流程的下一步动作 |

## 2. 硬红线（一票否决，出现即 FAIL）

### R1 禁止交互原语
- `window.prompt` / `window.alert` / `alert()` / `prompt()` / `confirm()`（原生）
- `console.log("TODO")` / 空回调按钮 `onClick={() => {}}`
- 假 toast 冒充业务流程成功

### R2 禁止工程字段上屏
用户可见文本中出现以下任一即 FAIL：
`count=`、`recent_count`、`previous_count`、`confidence`、`置信度`、`type=rule`、`wf_`、`workflow`、`request_id`、`degraded=true`、`engine: local`、`有效期 NNNN 秒`、裸 JSON、裸枚举值、裸 `$`（LaTeX 未渲染）。

### R3 业务一致性不变量
- 试卷：实际题数 == 蓝图题数；`sum(score) == 总分`；难度分布合计 100%；任何题 validation failed 时【发布】禁用。
- 批改：确认前不写 `teacher_final_score`；确认后状态持久化。
- 数据世界：全站数字与 BUSINESS_OBJECTS.md §3 逐字一致（17/46、21 份、46 人、54%→81%）。
- URL：批改当前份、备课当前课时刷新后必须恢复。

### R4 AI 行为不变量
- AI 输出一律 draft Artifact（可 Preview/Edit/Regenerate/Undo）。
- 任何写入正式业务数据的动作有 Confirmation Gate。
- AI 失败时（mock degraded fixture）核心业务仍可人工完成。
- 助手返回"重复请求已忽略"之类内部错误文案 = FAIL。

### R5 状态完整性
每页必须实现并真实可达：loading / empty / error；AI 流程另有 generating / failed / cancelled / needs_confirmation。禁止只有 happy path；禁止假 loading（点按钮 → setTimeout → 无变化）。

## 3. 自动化验收要求（每轮工程交付必须随附）

1. `npm run typecheck` 通过；`npm run build` 通过。
2. Vitest 单测：mock 层数据一致性（数字 SSOT）+ URL 寻址逻辑。
3. Playwright/E2E：至少覆盖当轮模块 Acceptance Test 的 Given/When/Then。
4. 禁止词扫描：对 `src/` 运行 R1/R2 禁止词静态检查（`window.prompt`、`window.alert`、`confidence` 上屏模板引用等）。
5. 截图证据：当轮模块每状态至少 1 张（含 empty/error 态），存 `artifacts/teacher-refactor/`。
6. 浏览器实操记录：Golden Path 当轮覆盖步骤的执行记录（通过/失败 + console/network 检查结论）。

## 4. 模块 Definition of Done（复制到每轮交付清单）

- [ ] 路由正确、URL 可寻址、刷新恢复
- [ ] Primary CTA 有效且达成业务状态变化
- [ ] fixture 使用统一数据世界（数字逐字一致）
- [ ] loading / empty / error 真实实现
- [ ] 无 console error / network 404 / 警告
- [ ] typecheck + build 通过
- [ ] 浏览器完整测试（点击/导航/输入/dialog/refresh/back）
- [ ] 截图存档并自查（密度/对齐/层级/溢出/噪音）
- [ ] 与 Primary Reference 对照过（结构借鉴点可指认）
- [ ] 无 R1/R2 红线项
- [ ] 与上下游模块衔接动作真实可达（G10）

## 5. 视觉验收基线（只管影响理解的，不做像素点评）

- Desktop 1440×900 首屏完整呈现核心工作区；1366×768 不纵向滚动即见"作答+rubric+主操作"（批改）或"配置+试卷"（组卷）。
- 层级来自 typography/spacing/border/surface，禁止渐变横幅、玻璃卡片、emoji 标题、满屏圆角卡。
- Dense but readable：教师工作台允许高信息密度，但不允许无分组堆砌。

## 6. 验收角色规则

- 工程 Agent 不得给自己的产出打"通过"；验收依据是本文件 + GOLDEN_PATH + 模块 spec 的客观判据。
- 架构 Review（ARCHITECT_REVIEW.md）基于浏览器实操与代码事实，不接受仅凭工程总结的"已完成"。
