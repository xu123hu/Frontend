# TODO — 后端（教师端作业/组卷）

## 1. 单题替换 / 重新生成 真实端点（当前为本地 fallback）
前端 `TeacherAssignView.vue` 的「换一题 / 重新生成 / 找相似题」当前调用确定性的本地候选题库
`src/mock/questionBank.ts`（按知识点 kp_code + 难度 + 题干去重过滤），语义真实但为 Fixture 层。

需要后端提供真实端点，届时将 `bankCandidatesFor(q)` 切换为该 adapter，去掉本地库依赖：

- `POST /api/teacher/quizzes/replace`
  - 请求：`{ artifact_id: string, item_no: number, seed?: string }`
  - 响应：`{ item: QuestionItem<新题>, artifact_version: number }`
  - 语义：基于同知识点同难度替换单题，**禁止整卷重生成伪装成单题替换**；返回新 artifact 版本。
- `POST /api/teacher/quizzes/regenerate`
  - 请求：`{ artifact_id: string, item_no: number }`
  - 响应：同上；语义：同知识点重生成该题（可保持难度）。
- `GET /api/teacher/quizzes/similar?artifact_id=&item_no=&limit=3`
  - 响应：`{ candidates: QuestionItem[] }`；语义：同知识点相似题候选（基于题干/知识点相似度）。

新增端点需满足既有约定：tool/B 端确认门、幂等、返回新版本号触发前端乐观刷新，且不得违反
Butler / lean 相关工具注册约束（与组卷无关）。

## 2. lesson 产物既有字段（无后端改动）
Prep 页 `applyArtifact` 现兼容 `content.sections`（title/duration_minutes/activities）与历史
`content.timeline`。后端 M3 lesson artifact 维持 `sections`，无需改动。若需新增备课结构化字段
（教学目的/师生活动/核心问题/检查理解/依据），属架构师决策（触碰 Do Not Change 数据模型），待 AC。