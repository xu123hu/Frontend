# student-next · 学生端重构前端（FE）

数学学生端全新前端：**Next.js 16.3.4 + React 19.2.8 + Tailwind v4 + cytoscape**，零旧代码继承（重构红线）。
所属分支 `feat/student-fe`（工作树 `D:\codex-worktrees\frontend-student-fe`）；契约与验收文档在 `D:\math-arena\deliverables\student-refactor\`（PROMPT-FE / contracts / fe\）。

## 快速开始

```bash
npm install
npm run dev        # http://localhost:3000 —— 默认 mock 模式（内置假后端，全功能可演示）
```

| 模式 | 启动命令 | 说明 |
|---|---|---|
| mock（默认） | `npm run dev` | 本应用内 mock handlers 顶替后端：SSE 剧本（含 `?delay=`/`?fail=` 演示超时/错误）、kb 轮询、判分、双师讲义流，全链路离线可跑 |
| 真实联调 | `BACKEND_PROXY=1 npm run dev` | 服务端代理：`/api/v1/kb/*`、`/api/v1/knowledge-graph/*` → B2（`B2_BASE`，默认 :8010）；其余 `/api/v1/*` 与 `/files/*` → student-api（`BACKEND_BASE`，默认 :8100）。浏览器同源零 CORS |
| 质检 | `npm test` ／ `npm run lint` ／ `npx tsc --noEmit` | vitest 10 用例（sse/打字机）／eslint／类型检查 |

## 7 个界面（App Router）

`/` 首页=AI 对话（Socratic 引导、举一反三、题目图片卡）· `/kb` 知识库（上传→解析/切片/向量化轮询）· `/errors` 错题本（拍照增强→入本→AI 诊断）· `/practice` 练题（按知识点，判分错题自动入错题本）· `/graph` 知识图谱（cytoscape）· `/classroom` 双师课堂（B4-5 slide 事件流+图形直出）· `/exam` 模拟试卷。

## 目录结构

```
src/
  app/                  页面 + mock API（api/v1/** 对齐契约形状，_store/_sse 为 mock 基建）
  components/           shell（导航壳）/ chat（气泡、题目图片卡、流式文本）/ ui（骨架、进度、灯箱）
  features/chat/        ChatSessionProvider——SSE 生命周期收口（事件分派、wait_for_input→reply、
                        Last-Event-ID 断线重连、首包看门狗）
  lib/                  sse.ts（SSE 消费器）、useSmoothStream.ts（rAF 打字机）、api.ts（切换点）、types.ts（契约类型）
public/mock-assets/     题目/错题/讲义 SVG（图片直出验收素材）
```

## 硬约束（验收红线）

1. **题目/公式一律图片直出**（骨架→`<img>`→点击放大原图），禁止转可编辑文字；KaTeX 只允许用于 AI 新生成的文本流（当前未启用）。
2. 所有图片字段一律 URL，出现 base64 视为契约违例。
3. mock 与真实后端共用同一 `/api/v1` 路径与形状——切换只有环境变量，无代码改动。

## 与契约的关系

- 消费面：`contracts/api-contracts.md`（B1-1 chat/reply、B2-1 kb、B2-2 图谱、B4-1/2/3/5）与 `contracts/event-contracts.md`（13 种 SSE 事件），FE 已在两文件标注"FE 已确认 + 增补需求"。
- FE 增补待落实：图谱节点 mastery（薄弱配色）、判分解析回显、双师学生提问端点。
- mock 缺口与真实后端差异以 `../fe/联调证据/`、`../fe/FE-自动推进看板.md` 运行日志为准。

## 已知边界

- B1 未挂载 :8100（`/api/v1/ai/healthz` 404）：chat 真联调待 B1 就绪，当前 chat 走 mock 剧本。
- 相机实拍需真机（自动化环境用页面上标注的"示例文件"按钮驱动上传链路）。
- 移动端已过 390×844 逐页验收（证据 `../fe/移动端证据/`）；桌面为主视口，平板未专项验收。
