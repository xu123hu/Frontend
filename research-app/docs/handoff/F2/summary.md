# F2 Handoff · 科研端前端

> 日期：2026-09-04｜负责智能体：Agent 1（前端与体验）｜阶段：F2（文献库、可视化批量导入与 PDF 阅读）
> 分支：`research/agent-01-frontend`｜worktree：`D:\科研端worktrees\agent-01-frontend`｜前置：F1（`f8cafce`）

## 六层状态表（09 §2，本日全量重跑取证）

| 层 | 状态 | 关键证据 |
|---|---|---|
| L1 Build | ✅ DONE | vue-tsc 0 error；eslint 0/0；build 3.56s，首包 gzip 5.56KB，MSW 不在产物，vendor-pdf 懒加载 98KB |
| L2 Test | ✅ DONE | vitest 9 files / 88 tests passed（新增 import-queue 16 + sse 10） |
| L3 Performance | ✅ DONE（阶段内可测项） | 首包 ≤500KB、6 入口独立 chunk、PDF 按需加载；E2E 证 10k 条目虚拟化（DOM<200 行）；CWV→F3 |
| L4 Failure | ✅ 单元+E2E 可测项 / ⚠️ 断网与刷新恢复 E2E 局限 | sse 四类错误可观察、离线暂停、失败原因可见、TC-F02-05 重试 E2E、TC-F02-12 无全文降级 E2E |
| L5 User Journey | ✅ DONE | Playwright 99 passed（1.8m）= golden-path-1 21×3 回归 + golden-path-2 12×3；9 张截图归档目检 |
| L6 Human Review | ✅ 自审 DONE / ⏳ Agent 6 | code-review-report P0=0 P1=0 P2=0（P3=2 书面接受） |

综合：**DONE（F2 范围内）**。详见 `acceptance-matrix.md`。

---

## 1. 用户现在能完成什么以前不能完成的任务

黄金链路二（06 §4）端到端可走通（步骤 1-7、9；步骤 8/10 的回答生成侧属 F4）：

1. **三源检索与导入**：Crossref/OpenAlex/arXiv 聚合检索（区分元数据来源与全文可得性；撤稿/编辑关注/已在库负向提示）；检索命中一键入库，重复 DOI 不吞（409 + 已在库标记）。
2. **可视化批量导入**：拖拽/多选入队，非法文件立即失败+原因；逐文件真实进度（上传字节 + SSE 事件驱动的解析/切分进度）；失败可单条重试；断网暂停；刷新不伪造恢复。
3. **切分与入库确认**：Chunk 列表逐条展示块类型/页码/LaTeX/哈希/完整性，可逐条或全部确认入库。
4. **文献库三栏桌面**：集合树（多集合归属）+ 虚拟化条目列表（10,000 条可滚动/筛选/批量）+ 详情（元数据/核验/切分/加入集合）。
5. **PDF 阅读与证据定位**：pdf.js 阅读器（懒加载）、证据 query 跳转页 + bbox 高亮、文本层划选批注（携带引文原文 + bbox + 锚定状态）、独立笔记；**刷新后批注/笔记保留**（TC-F02-09）；无全文条目诚实降级不渲染假页面（TC-F02-12）。
6. **批量操作可撤销**：批量打标签/移集合 → 撤销条 8s 内可恢复。

> 诚实性声明：文献域端点（CR-F2-01..08）后端未冻结，运行在 MSW 契约草案（UI 常驻「契约草案数据源」徽标）；`runs/SSE/DocumentIR/Evidence` 走 M0 冻结契约真实 schema。生产构建不含 MSW。TC-F02-06 刷新恢复端到端受 mock 无持久化 run 状态限制（见 known-limitations §2）。

## 2. 公共契约与目录变化

### 2.1 F2 新增/改造（feature-sliced 边界，与 design.md §4.1 一致）

```text
research-app/
├── playwright.config.ts                    # workers 10→3（并行竞争实测依据，见 code-review §5 #6）
├── src/
│   ├── entities/literature/types.ts        # LitItem/Collection/Note/Annotation/Chunk/SearchHit（CR-F2 推导）
│   ├── features/literature/
│   │   ├── api.ts                          # items/collections/annotations/notes/chunks/search/ingest CRUD（CR-F2-01..08）
│   │   ├── queries.ts                      # vue-query 键层级 + useInvalidateLiterature（域根 key 失效）+ 无限查询
│   │   └── use-import-queue.ts             # 队列副作用桥：校验→上传→POST /runs→SSE→终态；离线；刷新恢复
│   ├── shared/lib/
│   │   ├── import-queue.ts                 # 纯函数队列 reducer（可单测；禁止假进度）
│   │   └── sse.ts                          # RunEvent SSE 客户端：解析/去重/顺序检查/Last-Event-ID
│   ├── mocks/
│   │   ├── http-helpers.ts                 # envelope/errorEnvelope/readSession（F1/F2 共用）
│   │   ├── literature-db.ts                # 种子：12 条目/4 集合/批注/笔记/切分/检索目录/压测生成
│   │   ├── literature-handlers.ts          # CR-F2 草案端点 + POST /runs 202 + SSE 流（冻结结构）
│   │   ├── run-simulator.ts                # document_parse 事件脚本（run.created→…→completed/failed）
│   │   └── lit-persistence.ts              # 批注/笔记 sessionStorage 持久化（TC-F02-09）
│   ├── widgets/
│   │   ├── LiteratureBrowser/              # 三栏：集合树 + 虚拟化列表 + 详情/切分/批量撤销
│   │   ├── ImportDialog/                   # 拖拽队列卡（键盘可达/阶段徽标/失败原因/单条重试）
│   │   └── LiteratureSearchDialog/         # 三源检索（partial 降级/撤稿负向/导入去重）
│   └── pages/research/Reading.vue          # PDF 阅读器（pdf.js TextLayer/划选批注/证据跳转/笔记/无全文降级）
├── tests/
│   ├── unit/{import-queue,sse}.test.ts     # 队列状态机 16 + SSE 客户端 10
│   └── e2e/golden-path-2.spec.ts           # 黄金链路二 12 用例 × 3 视口
└── artifacts/acceptance/f2/*.png           # 3 页面 × 3 视口 = 9 张截图
```

### 2.2 对既有核心的修改（最小侵入，F1 接口零破坏）

- `app/api/client.ts`：补 `apiUpload`（真实字节进度）。
- `app/router.ts`：新增 `reading` 路由（懒加载 Reading.vue）。
- `mocks/db.ts` / `mocks/handlers.ts`：注册文献 handlers（复用 session 读取/envelope）。
- `pages/research/Literature.vue`：页面入口接入 LiteratureBrowser + 两个弹窗。
- `playwright.config.ts`：workers 收拢 + 注释（修复记录 #6）。

## 3. 外部项目与许可证

- **新增采用**：`pdfjs-dist`（Apache-2.0，PDF 渲染/文本层，vendor-pdf 懒加载）；`pdf-lib`（MIT，仅 mock 生成测试 PDF，dev/test，不进生产产物）。
- **沿用 F0 账本**：TanStack Query（无限查询/虚拟化配套）、TanStack Vue Virtual（card-13，MIT）、lucide、MSW、pdf-lib 等，无未记许可变更。
- **不引入自研 PDF 渲染/虚拟化/SSE 库**：复用成熟实现（pdf.js/虚拟化），SSE 客户端为协议薄封装（纯函数可单测），非自研重型组件。

## 4. 真实测试与链路执行

### 4.1 单元 + 契约测试（vitest）

```text
Test Files  9 passed (9)
Tests       88 passed (88)   （7.81s）
```

新增：import-queue 16（校验/阶段迁移/SSE 映射/重试/离线/禁假进度）+ sse 10（解析/去重/顺序/Last-Event-ID/错误语义）；契约层与 F0/F1 单测回归未破坏。

### 4.2 类型检查与 Lint

```text
vue-tsc --noEmit        → 0 errors
eslint --max-warnings 0 → 0 errors, 0 warnings
```

### 4.3 E2E（Playwright，三视口 1440/1366/390）

```text
99 passed (1.8m)
= golden-path-1 21 用例 × 3（F1 回归）+ golden-path-2 12 用例 × 3（F2）
```

golden-path-2 覆盖 TC-F02-01..05/07..12、TC-X02-02/06（TC-F02-06 见 known-limitations §2）。

### 4.4 生产构建与 MSW 排除

```text
npm run build → ✓ built in 3.56s
首包 dist/assets/index-*.js      gzip 5.56 KB（08 §2 门禁 ≤500KB）✅
vendor-pdf-*.js                  gzip 98.14 KB（懒加载，仅阅读路由触发）
MSW browser bundle              不在产物中（__USE_MOCK__ 剔除）✅
```

### 4.5 视觉证据

`artifacts/acceptance/f2/`：literature / reading / import-dialog × 1440/1366/390 共 9 张，均经目检（移动端确认三栏折叠、阅读器 390px 无撑破）。

## 5. 本阶段自检发现并修复的缺陷（完整记录见 code-review-report.md §5）

1. **虚拟化首行丢失（P1）**：virtual-core 3.17.8 偏移漂移 → scroll 事件重同步（resyncVirtualizerOffset）。
2. **桌面端列表全量渲染**：.browser 高度约束缺失 → 补 `calc(100dvh - 250px)`。
3. **批注/笔记刷新丢失（P1）**：批注/笔记写操作缺持久化 → saveLitDelta。
4. **移动端阅读视口撑破**：PDF 857px 撑破 390px → `minmax(0,1fr)` 栅格。
5. **PDF 文本层划选失效**：显式 textLayer 类 + --scale-factor。
6. **E2E 并行超时轮换失败**：workers 10→3 + 文件级 120s + 断言显式 15s。
7. **死代码（P2）**：Reading.vue 无用 `void w` 删除。
8. **导入条目列表不刷新**：域根 key 整体失效。
9. **切分确认后列表不刷新**：失效 key 收敛。

## 6. 仍为证据不足的项（不使用「基本完成」描述）

- TC-F02-06（刷新恢复）E2E 受 mock 无持久化 run 状态限制（unit 覆盖状态机 + Last-Event-ID，真实恢复依赖后端）。
- Core Web Vitals：F3 接真实后端与数据量后测量。
- 三源检索为草案种子数据，真实第三方 API 依赖 CR-F2-07 冻结。
- 断网 E2E、屏幕阅读器抽样、trace 全量归档：F5 收口（同 F1 声明）。

## 7. 集成负责人需执行的精确步骤

1. 审阅 `docs/handoff/F2/design.md §6` 契约请求单（CR-F2-01..08）并在 R1 裁决文献域端点路径/字段。
2. 冻结后通知 Agent 1 拉取新 openapi.json 重新生成类型并按真实契约替换 MSW handlers——前端 UI 与用例零改动（isomorphic 约束）。
3. F4 收口时按 design.md §1 范围切分跑黄金链路二全量回归（步骤 8/10 回答生成侧接 AI 管家）。

## 8. Handoff 清单

- ✅ `summary.md`（本文件，首屏含六层状态表）
- ✅ `design.md`（范围/三候选比较/15 态矩阵/契约请求单/范围切分声明）
- ✅ `code-review-report.md`（P0=0、P1=0、P2=0，P3=2 书面接受）
- ✅ `acceptance-matrix.md`（双轨用例逐条证据 + 六层状态表）
- ✅ `test-report.md`（2026-09-04 全量重跑：vitest 88、Playwright 99、build 5.56KB）
- ✅ `known-limitations.md`（真实缺口/外部裁决依赖/设计取舍分节）
- ✅ 9 张三视口截图（本轮 E2E 重新生成并目检）
- ⏳ trace.zip 全量归档→F5；CWV 实测→F3（理由见 known-limitations）

## 9. 提交记录

- **本阶段提交：`<commit-hash>`**（research(f2): 黄金链路二——文献库/批量导入/PDF 阅读，2026-09-04）
- 前置：F1 `f8cafce`（含回填提交 `84952cd`）
- 合并目标位置：`D:\frontend\research-app`（由集成负责人执行）
