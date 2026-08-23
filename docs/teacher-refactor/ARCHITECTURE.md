# ARCHITECTURE — 智学数研教师端系统架构

> 状态：**ACCEPTED**（2026-08-23，Product Architect）
> 前端 `D:\frontend`（Vue3 + Vite + Pinia + TS），后端 `D:\math-arena`（FastAPI，M3 teacher 域，`M3_ENABLE_TEACHER` 门控，挂载 `/api/teacher/*`）。
> 本文约束两端边界与契约；实现细节归工程 Agent。

---

## 1. 总体分层

```
┌─ Teacher UI (Vue pages, 7 模块)            ← 只认业务对象，不认 AI 内部
├─ Stores (Pinia, 按域拆分)                  ← 页面状态 + URL 同步
├─ API service 层 (src/api/teacher/*.ts)      ← 类型化契约, 唯一后端出口
├─ Mock server (src/mock/teacherServer.ts)    ← 与真实 API 同构(路由/字段/时序)
│    切换: Bearer token = mock-token-teacher-preview
└─ M3 Backend (/api/teacher/*)
     ├─ require_verified_teacher (统一认证+approved binding)
     ├─ Artifact lifecycle: draft→confirmed→published→archived
     ├─ Capability Gateway: 7 能力 (Xingchen workflow → local fallback)
     ├─ Butler Runtime: 只开放 READ + LEARNING_ACTION 工具
     └─ 写操作: 显式 confirm/publish 端点 + TeacherAction 幂等审计
```

**职责铁律**：UI 不知道"Xingchen/Dify/LangGraph"存在；mock 不知道 UI 长什么样；两端只通过 typed contract 对话。

## 2. 前端目录契约

| 层 | 位置 | 规则 |
|---|---|---|
| 页面 | `src/pages/teacher/*View.vue` | 只做布局与编排；业务逻辑进 store/composable |
| 组件 | `src/components/teacher/*` | 无 prop drilling 超过 2 层；不直接调 api |
| Store | 按域：today/prep/assign/grading/classes/classroom/resources | 持有页面数据 + URL query 同步（watch 双向） |
| API | `src/api/teacher/<域>.ts` | 每端点一个函数；类型来自 `src/types/teacher.ts`；禁止页面内 fetch |
| Mock | `src/mock/teacherServer.ts` + `teacherData.ts` | 数据世界 SSOT 在此实现；路由与真实 API 一一对应 |
| 禁区 | — | 组件内写死 mock 数据 / 写死业务数字 |

**类型 SSOT**：`src/types/teacher.ts` 与后端 response schema 逐字段对齐；后端加字段→前端类型同步；前端禁止自造后端不存在的字段参与渲染。

## 3. 关键后端契约（已存在，前端必须按此消费）

### 3.1 统一响应包
`{ code, message, data, request_id }`；错误为 HTTPException + `{code, message}`。前端 service 层解包，`request_id` 不上 UI。

### 3.2 Artifact 端点（产物生命周期）
```
GET  /teacher/artifacts/{id}              # 读
PUT  /teacher/artifacts/{id}              # 教师编辑 → 新 version
POST /teacher/artifacts/{id}/confirm      # draft → confirmed (教师显式)
POST /teacher/artifacts/{id}/publish      # confirmed → published
POST /teacher/artifacts/{id}/archive
```
前端规则：产物状态必须可视（页面有 draft/confirmed 标记）；编辑保存调 PUT；确认永远独立按钮。

### 3.3 能力端点（AI 生成，一律返回 draft artifact）
```
POST /teacher/lessons/adapt               # 备课(adapt_lesson)
POST /teacher/lessons/{id}/slides         # PPT(slide_deck)
POST /teacher/quizzes/generate            # 组卷(quiz_set)
POST /teacher/grading/{item}/suggest      # 批改建议(grading_suggestion)
POST /teacher/lessons/{id}/apply-insight  # 洞察→课时修改
GET/POST /teacher/tasks/{id}[/cancel]     # 异步任务状态/取消
```
前端规则：这些调用必须有 generating → preview(结果即 artifact) → 教师动作 三段呈现；`engine`/`degraded` 字段不渲染（降级只在失败提示中以业务语言出现）。

### 3.4 教学闭环端点
```
POST /teacher/assignments                 # 从 confirmed quiz_set 建 assignment
POST /teacher/assignments/{id}/publish    # 发布
GET  /teacher/grading/queue               # 队列(status: unprocessed|low_confidence|confirmed)
POST /teacher/grading/{item}/confirm      # 教师终审
GET  /teacher/classes/{id}/insights       # 洞察(evidence+recommended_actions)
GET/POST /teacher/classes/{id}/classroom-mode  # 课堂模式
```

### 3.5 助手端点
```
POST /teacher/butler/chat                 # 返回 {intent, message, artifact, actions[], confirmation_required}
```
前端规则：`artifact` 非空→渲染产物卡（可跳转编辑）；`actions[]`→渲染动作按钮；`message` 只是解说。禁止把 chat 当业务结果终点。

## 4. AI 交互模型（全站统一）

```
教师任务上下文 (class/lesson/assignment/student)
   ↓ 触发：具体业务按钮（不是自由 prompt）
Capability（7 个：adapt_lesson/create_slides/create_quiz/suggest_grade/
              explain_problem/preprocess_course/understand_document）
   ↓ 后端: Xingchen workflow 或 local fallback（前端无感）
draft Artifact（version 1）
   ↓ 教师动作: Preview / Edit / Regenerate(局部) / Undo / Accept
Confirmation Gate
   ↓ 显式确认
confirmed / published 正式业务对象 → 进入下一模块
```

**局部再生成原则**：换一题=只换该题；改一页=只重生成该页；采纳建议=只插目标环节。任何"局部动作引发全局重算"都是架构违规。

**Butler 定位**：Intent Router + Action Composer。它识别意图→取上下文→调上述 capability→产出 artifact/diff→带教师去业务页。它自己没有业务。

## 5. Mock / Real 切换架构

- 切换机制：Bearer token（`mock-token-teacher-preview`）→ `teacherServer.ts` 拦截，已有实现保持。
- Mock 必须**同构**：相同路由、相同响应包、相同时序语义（含任务状态迁移、乐观锁 version 冲突）。
- Mock 数据 = BUSINESS_OBJECTS.md §3 的唯一实现处；页面/e2e 禁止第二数据源。
- 真实后端不可用时 mock 承载 Golden Path 演示；但当轮接真实 API 的端点必须在 mock 与 real 双通过。

## 6. 状态管理规范

- URL 是第一等状态：可寻址对象（submission_item_id/lesson_id/artifact_id/class_id）在 store ↔ route query 双向同步（`replaceState`）。
- 服务端数据不重复缓存到多个 store；跨页共享数据走 store 单例。
- 写操作带 `client_request_id`（幂等），409/版本冲突呈现"内容已被更新，请刷新查看最新版本"类业务提示。

## 7. 权限与失败模型

- 教师身份失败（40301/40302）：页面级"无权访问该班级"提示 + 返回可访问上下文入口，不白屏。
- 能力降级（后端 degraded）：UI 不渲染 degraded 标记；若能力失败，展示"本次未能自动生成，可手动…"+重试，保 G8/G10。
- 网络/服务器错误：统一错误组件（重试 + 保留上下文），禁止 alert。

## 8. 与 M2 学生端的联动边界

- 学生提交（SubmissionItem）是教师批改的数据源；教师端只读消费，不写学生域。
- 课堂 classroom-mode 影响学生端独立作答行为；教师端是控制方，学生端是执行方（teaching-state 端点）。
- 教师确认成绩 → MasteryRecord 更新（后端 best-effort）→ 反哺 insight。前端不直接写 mastery。

## 9. 明确不做（架构级）

- 不引入新的重型依赖（实时通信/复杂编排/图表全家桶）按需最小化。
- 不把 LangGraph/Dify/Xingchen 任何内部概念（节点/run/graph）暴露到 UI。
- 不做 SSR/微前端/monorepo 重构；保持当前 Vue SPA + 独立仓库结构。
