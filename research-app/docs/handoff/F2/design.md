# F2 设计文档：文献库、可视化批量导入与 PDF 阅读

> 阶段：F2｜负责智能体：Agent 1（前端与体验）｜日期：2026-09-04
> 前置：F1 已提交（`f8cafce`）；M0 契约 research-contracts v0.1.0 已冻结。

## 1. 范围（来自提示词 F2 里程碑 + 06 §4 黄金链路二）

| 交付项 | 来源 | F2 状态 |
|---|---|---|
| Zotero 式文献关系 | 提示词 F2；M4 §8.2 | 条目/集合/标签/附件/笔记/批注；条目可属多集合；批量操作确认+可撤销 |
| 可视化批量导入 | 提示词 F2；06 §4 步骤 4-5 | 多文件拖拽队列、类型/大小校验、逐文件进度、`queued→parsing→chunking→completed/failed`、失败可见原因+单条重试 |
| 切分与入库确认 | 06 §4 步骤 5 | Chunk 列表逐条展示（源哈希/解析器版本/权限继承），公式/代码/表格/引用块完整性标记 |
| 三源检索与核验状态 | M4 §8.2；06 §4 步骤 1-3 | Crossref/OpenAlex/arXiv 聚合检索；元数据来源与全文可用性区分；DOI 去重；纳入/排除记录理由 |
| PDF 阅读与证据定位 | 提示词 F2；06 §4 步骤 9 | PDF.js 阅读器（懒加载 vendor-pdf）、页码/bbox 证据跳转、批注与笔记 |
| 10,000 条目可交互 | F2 放行标准 | @tanstack/vue-virtual 虚拟化（F0 账本 card-13），万条滚动+筛选可交互 |

**范围切分声明（诚实性）**：黄金链路二步骤 1-7、9 在 F2 完整交付；**步骤 8（AI 管家回答带支持状态）与步骤 10 的回答生成侧属 F4**（AI 管家在 F4 才接真实运行），F2 交付其前置原语（EvidenceRecord 证据卡 + `insufficient_evidence` 支持状态展示）。F4 收口时跑链路二全量回归。此切分在 acceptance-matrix 逐条标注，不宣称链路二整体 DONE。

**不在 F2 范围**：翻译/公式保真（F3）、LaTeX、评审、Lean（F3/F4）、管家长任务审批（F4）。

## 2. 契约现状与差距分析（设计前提）

### 2.1 M0 冻结契约可直接复用（不发明、不走草案徽标）

| 冻结资产 | F2 用途 |
|---|---|
| `POST /runs`（202 + run_id + events_url） | 批量导入每个文件触发一个 `run_type=document_parse` 任务 |
| `GET /runs/{id}/events`（SSE，Last-Event-ID 续传） | 预处理进度：`run.started→step.progress(current/total/unit)→artifact.created→run.completed/failed`，天然覆盖 queued/running/progress/completed/failed |
| `RunEvent.step.progress` | 逐文件百分比与阶段消息，**进度来自真实事件流，不是静态假进度**（06 §4 步骤 4 红线） |
| `Artifact`（source_pdf/parsed_document、storage_uri、sha256、rights_status） | PDF 二进制经 storage_uri（02 §6：短期签名 URL 下载，API 不代理大文件）；解析产物哈希展示 |
| `DocumentIR`/`DocumentBlock`（block_id、type、page_index、bbox、latex、content_hash） | 切分结果：Chunk = DocumentBlock 视图，公式/代码/表格/引用块完整性直接由 BlockType 判定 |
| `EvidenceRecord`（quoted_text、quoted_text_sha256、Locator: page_index/bbox/char_start/char_end/section_path） | 证据锚定与跳转目标 |
| `CitationRecord`（verified_source、version_status: current/updated/retracted/expression_of_concern/unknown） | 检索结果核验状态与撤稿/版本冲突负向展示（06 §4 证据要求） |
| `ResearchRun`/`RunStatus` | 刷新后从服务端恢复运行状态（06 §4 步骤 7）：`GET /runs` 列表 + SSE 重放 |

### 2.2 缺失端点 → 契约请求单（CR-F2-xx，MSW 契约草案 + 徽标）

文献 CRUD、集合、标签、检索、上传端点在 M0 与 02 §5 规范契约中**均不存在**（02 §5 仅定义 Run/Evidence/Claim/Verification/Citation/DocumentIR 等 11 类核心对象）。字段推导依据：M4 §8.2 + 02 §4 通用字段（uuidv7/tenant_id/version/RFC 3339）+ 02 §6 API 约定（游标分页、Idempotency-Key、If-Match/version、签名 URL）。详见 §6。

## 3. 架构级决定（08 §8 Tier A 三候选）

### 3.1 批量导入进度架构

| 维度 | 候选 A：每文件一个 M0 run + SSE | 候选 B：单聚合 run + REST 轮询 | 候选 C：自研 WebSocket 通道 |
|---|---|---|---|
| 契约符合性 | **完全走 M0 冻结契约**，零发明 | 需发明聚合进度端点（CR+草案） | 需发明通道协议（重） |
| 逐文件进度粒度 | 天然逐 run；step.progress.current/total 对应页码/块数 | 聚合流需自行拆分归属 | 自定义 |
| 断线恢复 | **Last-Event-ID 续传已冻结**；刷新后 GET /runs 恢复 | 轮询状态机自建 | 断线重连自建 |
| 失败语义 | run.failed + RunEventError(retryable) 结构化 | 自定义 | 自定义 |
| 成本 | N 文件 N 个 run（服务端编排由 Agent 2 承担，M4 §9.2 统一 Run 模型本就如此设计） | 1 个 run 但进度拆分复杂 | 双通道维护 |

**采用 A**。前端上传 = `POST /ingest/uploads`（CR-F2-01，拿 artifact/upload_id）→ `POST /runs {run_type:"document_parse", input_artifact_ids:[...]}`（冻结契约）→ SSE 消费。文件队列状态机在前端（shared/lib/import-queue），run 事实只进 vue-query 缓存，Pinia 不复制服务端事实。

### 3.2 批注与证据锚定策略（证据原生核心）

| 维度 | 候选 A：纯 bbox 矩形锚 | 候选 B：char offset + 引文哈希（Hypothesis 式） | 候选 C：bbox 主锚 + 引文哈希校验兜底 |
|---|---|---|---|
| 与冻结 schema 对齐 | Locator.bbox/page_index | Locator.char_start/char_end + quoted_text_sha256 | **两者都对齐（Locator 本就同时含）** |
| 版式重排后存活性 | 低（页码漂移即失效） | 高（文本匹配可重定位） | 高（bbox 失效→文本重锚） |
| 实现成本 | 低 | 中（需文本层索引） | 中偏高 |
| 误导风险 | 锚点失效后仍画在错误位置→**证据误导** | 无 bbox 视觉 | 失效显式标记「锚点待重定位」，不静默错画 |

**采用 C**：新建批注存 bbox+char+quoted_text_sha256（与 EvidenceRecord 同构）；渲染时 bbox 命中直接画，未命中则按文本层重锚，重锚失败显示 `anchored:false` 警示态——锚点永不静默错位（红线：每个验证状态不误导用户）。研究依据：F0 benchmark §3 Hypothesis 稳定锚点思想（fuzzy match + 权威 quote 校验），不复制其代码（BSD-2，仅思想）。

### 3.3 大列表虚拟化

F0 已定（reuse-ledger card-13 `@tanstack/vue-virtual`，MIT）：条目列表与 Chunk 列表均虚拟化，10,000 条滚动/筛选/批量选择可交互。不再重复比较。

## 4. 页面架构与 15 态矩阵

### 4.1 新增/改造清单（feature-sliced）

```text
src/
├── entities/
│   ├── literature/types.ts        # LitItem/Collections/Tag/Note/Annotation/Chunk（CR-F2 推导）
│   └── literature/search.ts       # SearchHit/CitationRecord 视图（M0 冻结字段）
├── features/
│   ├── literature/
│   │   ├── api.ts                 # items/collections/tags/notes/annotations CRUD
│   │   ├── use-items.ts           # 列表(游标分页+虚拟化)/详情/批量操作（vue-query）
│   │   ├── use-collections.ts     # 集合树/多集合归属
│   │   └── use-search.ts          # 三源检索/导入（外部源状态区分）
│   ├── ingest/
│   │   ├── api.ts                 # 上传登记（CR-F2-01）+ POST /runs（冻结）
│   │   ├── use-import-queue.ts    # 队列状态机：校验→上传→run 创建→SSE 消费→终态
│   │   └── use-run-events.ts      # SSE 解码/Last-Event-ID/去重/顺序检查（提示词技术架构要求）
│   └── annotations/
│       ├── api.ts                 # 批注/笔记 CRUD（CR-F2-05）
│       └── use-anchors.ts         # 锚定解析（bbox→文本层重锚→anchored:false 显式态）
├── shared/
│   ├── lib/import-queue.ts        # 纯函数队列 reducer（可单测）
│   ├── lib/sse.ts                 # RunEvent SSE 客户端（纯函数解码可单测）
│   └── pdf/                       # 懒加载 PDF.js 封装（vendor-pdf chunk；离屏 canvas 释放）
├── widgets/
│   ├── CollectionTree/            # 集合树（多集合归属/拖拽入集合）
│   ├── LiteratureList/            # 虚拟化条目列表（批量选择/撤销条）
│   ├── ImportDropzone/            # 拖拽上传区+逐文件队列卡
│   ├── ChunkList/                 # 切分结果确认列表
│   ├── EvidenceCard/              # 证据卡（quoted_text+支持状态+跳转）
│   └── PdfReader/                 # PDF.js 阅读器（文本层/批注层/证据跳转/页同步）
└── pages/research/
    ├── Literature.vue             # 三栏桌面（集合|列表|详情）+导入抽屉+检索面板
    └── LiteratureReader.vue       # 阅读器路由页（literature/:id/reading，懒加载）
```

### 4.2 状态矩阵（15 态适用性）

| 页面/功能 | 适用状态与触发 | 明确不适用的状态（理由） |
|---|---|---|
| 文献列表 | loading(骨架)/empty(零条目→引导导入/检索)/succeeded/failed+retryable/offline/not_found(集合删除)/partial(分页中途失败) | queued/running/waiting_for_approval（列表是静态查询，无长任务） |
| 检索面板 | loading/succeeded/empty/failed+retryable/rate_limited(外部源 429 分源提示)/partial(单源失败他源成功→标注哪源不可用)/forbidden(无权限源)/offline | queued/running（检索为同步聚合查询） |
| 导入队列（每文件） | initial/queued/running(上传+解析并行视图)/partial(解析部分块失败)/succeeded/failed+retryable(可重试)/failed 不可重试(类型非法/超限/Zip Bomb/损坏 PDF，给原因)/cancelled(用户移除)/offline(断网暂停队列)/rate_limited(服务端 429 排队) | waiting_for_approval（document_parse 无审批点；审批属 F4 管家流程） |
| Chunk 确认列表 | loading/empty/succeeded/partial(部分块校验失败标红)/failed+retryable | 其余同上 |
| PDF 阅读器 | loading(页渲染)/succeeded/failed+retryable(损坏/签名 URL 过期→re-fetch)/offline/rights 限制态(metadata_only/restricted→显示原因不给假页面) | queued/running（渲染为本地即时） |
| 批注/笔记 | loading/saving/succeeded/save_failed+retryable/empty(锚点失效警示) | — |
| 证据卡 | succeeded/insufficient_evidence(明确「证据不足」展示)/anchored:false(重锚失败) | — |

## 5. 黄金链路二 → 双轨验收用例

### 功能轨

| 用例 | 步骤 | 通过标准 |
|---|---|---|
| TC-F02-01 | 检索 DOI/题名/作者 | 命中区分元数据来源与全文可用性；核验状态展示（含 retracted 负向样例） |
| TC-F02-02 | 检索结果导入 | 条目进库、可属多集合；重复 DOI 导入被去重并提示 |
| TC-F02-03 | 拖入 3 个 PDF（1 个非法文件） | 非法文件立即标失败+原因、不静默；合法 2 个进入上传→run 创建 |
| TC-F02-04 | 预处理进度 | queued→parsing→chunking→completed 逐文件来自真实 SSE 事件；进度百分比与 step.progress 一致 |
| TC-F02-05 | 失败重试 | 1 个文件 run.failed(retryable)→单条重试→成功；失败原因可见（非静默丢弃） |
| TC-F02-06 | 刷新恢复 | 队列运行中刷新页面→运行状态从 GET /runs + SSE 重放恢复，不重置不丢 |
| TC-F02-07 | Chunk 确认 | 切分列表展示 block 类型/页码/哈希；公式块标记 latex 完整性；逐条可确认入库 |
| TC-F02-08 | 证据跳转 | 证据卡点击→阅读器打开对应页并高亮 bbox |
| TC-F02-09 | 批注持久化 | 画框批注+笔记→刷新后保留；锚点失效显示警示态 |
| TC-F02-10 | 10,000 条目 | 预置万条列表滚动/筛选/批量选择无卡死（虚拟化生效） |
| TC-F02-11 | 批量操作撤销 | 批量打标签/移动集合→撤销条可恢复 |
| TC-F02-12 | 无全文权利条目 | metadata_only/restricted 显示原因，不渲染假页面 |

### 体验轨

| 用例 | 通过标准 |
|---|---|
| TC-X02-01 | 文献三栏与原型结构/层级一致；修正项有记录 |
| TC-X02-02 | 导入队列卡：文件名/大小/类型徽标/阶段进度/失败原因全部可见 |
| TC-X02-03 | 按钮五态齐备（上传/重试/确认入库） |
| TC-X02-04 | 失败/风险不只靠颜色（图标+文字+role=alert） |
| TC-X02-05 | 拖拽区键盘可达（Enter 触发文件选择，非仅 pointer 事件） |
| TC-X02-06 | 三视口截图无布局破损；阅读器 390px 可用（缩放+滚动） |
| TC-X02-07 | 阅读器减少动画（页过渡关闭） |

## 6. 契约请求单（需 Agent 2 冻结）

| ID | 请求 | 推导依据 | 前端临时策略 |
|---|---|---|---|
| CR-F2-01 | `POST /ingest/uploads`（multipart→Artifact 草稿 id）+ `GET /ingest/uploads/{id}` | 02 §6 签名 URL/大文件不经 API 代理；Artifact 冻结 schema | MSW 草案：返回推导 Artifact 字段 |
| CR-F2-02 | `GET /projects/{id}/items?cursor=&collection_id=&tag=&q=`（游标分页） | 02 §6 游标分页红线；M4 §8.2 BM25/标签 | 草案分页 + 排序字段推导 |
| CR-F2-03 | `POST /items`（含 source_identifier 去重语义）+ `GET/PATCH/DELETE /items/{id}` | M4 §8.2 DOI 优先去重；02 §4 通用字段 | 草案；重复导入 409+Problem Details |
| CR-F2-04 | 集合与归属：`GET/POST /collections`、`PUT/DELETE /collections/{id}/items/{itemId}` | Zotero 心智（条目属多集合）+ M4 §7 文献桌面 | 草案 |
| CR-F2-05 | 批注/笔记：`GET/POST /items/{id}/annotations|notes`、`PATCH/DELETE .../{id}` | M4 §8.2 PDF 标注；锚定字段对齐 EvidenceRecord/Locator 冻结 schema | 草案（结构引用冻结类型） |
| CR-F2-06 | Chunk 确认：`GET /items/{id}/chunks`、`POST /items/{id}/chunks/confirm` | 06 §4 步骤 5；Chunk 字段=DocumentBlock+入库状态（引用冻结 BlockType） | 草案 |
| CR-F2-07 | 三源检索：`GET /search/literature?q=&sources=crossref,openalex,arxiv` | M4 §8.2 聚合 Crossref/OpenAlex/S2；CitationRecord 核验状态冻结 | 草案返回 CitationRecord 视图 |
| CR-F2-08 | 批量操作：`POST /items/batch`（tag/move/delete，Idempotency-Key） | 06 §4 批量可撤销；02 §6 幂等 | 草案 + 前端撤销栈 |

## 7. 降级与诚实性设计（08 §6 红线）

- CRUD/检索/上传端点运行在 MSW 契约草案：页面常驻「契约草案数据源」徽标（F1 组件复用），构建产物不含 MSW。
- runs/SSE/DocumentIR/Evidence 走**冻结契约**：这部分是真实 schema，不因草案徽标而被质疑——handoff 明确区分两类来源。
- 单源检索失败：partial 态标注具体哪源失败（「OpenAlex 暂不可用，其余来源已返回」），不静默吞掉。
- 无全文权利：显示 `metadata_only/restricted` 原因卡，绝不渲染占位假 PDF。
- 锚点重锚失败：批注显示「原文位置已变化，待重定位」警示，不画在猜测位置。
- 进度永远来自 SSE 事件流；无事件时不显示百分比（显示「等待服务端事件」），禁止静态假进度。

## 8. 实施顺序（金路径优先）

1. entities + 契约请求推导类型 + MSW handlers 扩展（含 document_parse run SSE 模拟器，走冻结 RunEvent 结构）
2. shared/lib/sse.ts（解码/Last-Event-ID/去重/顺序检查）+ use-run-events（单测优先）
3. import-queue reducer + use-import-queue（单测：校验/重试/暂停恢复）
4. Literature 三栏桌面：集合树 + 虚拟化列表 + 详情（10k 场景）
5. ImportDropzone 导入流（金路径：拖入→上传→run→SSE 进度→Chunk 确认）
6. 检索面板（三源+核验状态+导入去重）
7. shared/pdf + PdfReader 阅读器（证据跳转+批注层）+ LiteratureReader 路由
8. 测试：单测/契约/E2E golden-path-2 + 10k 性能场景 + 三视口截图
9. code-review 自审（P0/P1=0）+ handoff + 提交
