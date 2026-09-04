# F2 Test Report

> 08 §5.2 + 09 §2 L1/L2/L3 状态｜执行日期：2026-09-04（handoff 定稿当日全量重跑）
> 环境：Windows 11 / Node 22 / chromium only / dev server 127.0.0.1:5173（MSW 契约草案模式）

## L1 Build（编译、类型、静态检查）

| 项 | 命令 | 结果 |
|---|---|---|
| 类型检查 | `npm run typecheck`（vue-tsc --noEmit） | **0 error** |
| 静态检查 | `npm run lint`（eslint . --ext .ts,.vue,.js --max-warnings 0） | **0 error, 0 warning** |
| 生产构建 | `npm run build` | 成功，3.56s |

构建产物关键项（本次实测）：

| 产物 | gzip | 说明 |
|---|---|---|
| `index-*.js` | **5.56 KB** | 首包 ≤ 500KB 门禁 ✅（90 倍余量） |
| `vendor-pdf-*.js` | **98.14 KB** | pdf.js 独立懒加载 chunk：仅阅读路由触发加载（333 KB raw） |
| `page-literature-*.js` | 14.65 KB | 文献页独立 chunk（三栏浏览器 + 两个弹窗） |
| `Reading-*.js` | 4.27 KB | 阅读器路由独立 chunk |
| 其余 page-home/project/writing/review/education | 0.82–5.82 KB | 一级入口独立 chunk ✅ |
| MSW bundle | **不存在** | `__USE_MOCK__` 编译期常量剔除（F1 修复记录 #6 持续复测通过） |

## L2 Test（单元 + 契约）

`npm run test`（vitest）：**9 files / 88 tests, all passed**（7.81s）

| 文件 | 覆盖 |
|---|---|
| `tests/unit/import-queue.test.ts`（新增，16 tests） | 文件校验（类型/超限/扩展名兜底）、阶段迁移（queued→uploading→parsing→chunking→completed/failed）、SSE 事件→动作映射（含 zip_bomb 不可重试）、失败原因可见、单条重试、断网暂停/恢复、进度只来自服务端事件（run-created 后 percent=null、等待文案） |
| `tests/unit/sse.test.ts`（新增，10 tests） | 增量解析（半行缓冲）、Last-Event-ID 更新、注释心跳、CRLF、事件按序回调、event_id 去重、sequence 倒序→protocol 级错误可观察、非法 JSON 不断流、HTTP 500→network 可重试、Last-Event-ID 请求头 |
| `tests/contract/contract-draft.test.ts` | OTP 流、401 信封、错误验证码不泄露存在性、创建项目 422/201/幂等重放、租户 B 403、run status 枚举落在 M0 内（F1 回归 + F2 检索/批注 422 语义） |
| 其余 6 个 F0/F1 文件 | async-state 12 + async-data 11 + api-client 12 + use-session 10 + degraded-messages 4 + components 5（回归未破坏） |

## L3 Performance（08 硬门禁 · F2 阶段可测项）

| 指标 | 门禁 | F2 实测 | 测量条件 |
|---|---|---|---|
| 首包 gzip | ≤ 500 KB | **5.56 KB** ✅ | `vite build` 本地产物 |
| 路由拆包 | 一级入口独立 chunk | ✅ 6 入口独立 + 文献/阅读器独立 | 同上 |
| PDF 按需加载 | 不随首包 | ✅ `vendor-pdf` 懒加载 chunk（98.14 KB gzip） | 仅阅读路由 import |
| 万条列表交互 | 虚拟化生效 | ✅ E2E：10k 种子后 `.virtual-row` DOM < 200 行 | golden-path-2 TC-F02-10 |
| MSW 排除 | 生产产物无 mock | ✅ 无 msw bundle | `__USE_MOCK__` 编译期常量 |

> LCP/INP/CLS 需真实后端与数据量 → F3 实测（与 F1 声明一致，见 known-limitations §1）。

## L5 User Journey（E2E，三视口 1440/1366/390）

`npx playwright test`：**99 passed（1.8m）** = golden-path-1 21 用例 × 3 + golden-path-2 **12 用例 × 3**（F1 全量回归 + F2 新增）。

golden-path-2 覆盖：TC-F02-01/02（三源检索+导入）、03/04（批量导入+SSE 进度）、05（失败重试）、07（切分确认）、08/09（证据跳转+批注/笔记持久化）、10（万条虚拟化）、11（批量撤销）、12（无全文诚实降级）、TC-X02-02（队列卡信息）、TC-X02-06（三视口截图）。

> 说明：`playwright.config.ts` workers 由默认 10 收拢为 3——本机 20 逻辑核默认 10 个并发 chromium 实例 + 单 vite dev server，F2 重用例（PDF.js 双次渲染、万条种子、SSE 流）实测轮换触顶 30s 测试级/5s 断言超时。收拢后 99/99 稳定通过（记录见 code-review-report §5 修复 #6）。

## L4 Failure（故障态）

- 单元层：sse 10 用例覆盖 protocol/sequence/network/aborted 四类错误与 retryable 语义；import-queue 覆盖离线暂停、不可重试失败。
- E2E 层：TC-F02-05 失败→原因可见→重试→完成；TC-F02-12 无全文不给假页面；搜索 partial 单源熔断（simulate_unavailable 演练）在检索用例中走查。
- 断网 E2E 仍受 MSW SW 限制（同 F1），见 known-limitations §1。

## 视觉证据

`artifacts/acceptance/f2/`：literature / reading / import-dialog × 1440/1366/390 共 **9 张**，均由本轮 E2E 重新生成并目检（移动端确认三栏折叠为两栏、详情整行、阅读器无视口撑破）。
