# F2 Acceptance Matrix（黄金链路二 · 双轨用例 + 六层状态表）

> 来源：06 §4 黄金链路二 + design.md §5 双轨用例定义
> 验收日期：2026-09-04（全部证据为本日重新执行的一手结果，非历史记录转述）

## 六层状态表（09 §2）

| 层 | 定义 | 状态 | 证据 |
|---|---|---|---|
| L1 Build | 编译、类型、静态检查 | ✅ DONE | `vue-tsc --noEmit` 0 error；`eslint . --max-warnings 0` 0 error 0 warning；`vite build` 成功（3.56s），首包 gzip 5.56KB，MSW 不在产物 |
| L2 Test | 单元 + 契约 + 集成 | ✅ DONE | vitest 9 files / 88 tests passed（新增 import-queue 16 + sse 10；契约层 8 回归未破坏） |
| L3 Performance | 08 性能门禁 | ✅ DONE（阶段内可测项） | 首包 gzip 5.56KB ≤ 500KB；vendor-pdf 懒加载 chunk（98KB gzip）仅阅读路由触发；E2E 证 10k 条目虚拟化（DOM < 200 行）。CWV → F3 |
| L4 Failure | 故障态可观察 | ✅ DONE（单元+E2E 可测项）+ ⚠️ 断网 E2E 局限 | sse 四类错误可观察、import-queue 离线暂停、失败原因可见；TC-F02-05 重试 E2E、TC-F02-12 无全文降级 E2E。断网 E2E 受 MSW SW 限制（known-limitations §1） |
| L5 User Journey | 真实用户链路 | ✅ DONE | Playwright **99 passed（1.8m）** = golden-path-1 21×3 回归 + golden-path-2 12×3；9 张三视口截图归档并目检 |
| L6 Human Review | 自审 + 独立审查 | ✅ DONE（自审）/ ⏳ Agent 6 | code-review-report.md P0=0 P1=0 P2=0（P3=2 书面接受）；待 Agent 6 R1 复核 |

**综合状态：DONE（F2 范围内）**——六层无一层为 FAIL；L3 的 CWV、L4 的 E2E 断网为已声明的阶段边界（与 F1 一致），不是未通过的项。

## 功能轨（输入/输出正确性、持久化、异常）

| 用例 | 步骤 | 状态 | 证据 |
|---|---|---|---|
| TC-F02-01 | 检索 DOI/题名/作者 | ✅ | E2E「三源检索与导入」×3 视口：检索 multilevel → 命中含来源徽标（openalex/crossref）与全文可得性标识；检索端点区分元数据来源 |
| TC-F02-02 | 检索结果导入；重复 DOI 去重提示 | ✅ | E2E 同用例：导入新条目 → 库内「全部条目」出现；searchCatalog 种子含 `already_in_library: true` 命中（Florida 条目）展示已在库；POST /items 409 duplicate_item 不吞（handler + api 原样抛） |
| TC-F02-03 | 拖入 3 个 PDF（1 个损坏） | ✅ | E2E「批量导入」：损坏文件立即标失败+原因（不静默）；2 个合法进入上传→run 创建 |
| TC-F02-04 | 预处理进度（真实 SSE 事件） | ✅ | E2E 同用例：合法文件 queued→解析→切分→完成，进度来自 SSE 事件流；run-created 后显示「等待服务端事件」（单测断言 percent=null，禁止假进度） |
| TC-F02-05 | 失败重试 | ✅ | E2E「失败重试」：timeout 文件首次 run.failed(parse_failed, retryable) → 失败原因「解析服务超时」可见 + 单条重试按钮 → 重试后走完 SSE → 完成 |
| TC-F02-06 | 刷新恢复队列 | ⚠️ 单元层 + 组件代码 | use-import-queue.restore()：sessionStorage 持久化文件态 → 有 runId 的恢复 run-created + SSE Last-Event-ID 续传；sse 单测覆盖 Last-Event-ID 请求头。**E2E 完整恢复被 mock 限制**：run 事件脚本存于内存库，刷新后 runId 404 → 文件诚实标为「可重试失败」（不伪造进度）。真实后端由 GET /runs + SSE 重放（CR-F2 冻结后补 E2E，见 known-limitations §2） |
| TC-F02-07 | Chunk 确认 | ✅ | E2E「切分确认」：详情切分列表（5 块）展示块类型（公式块）/页码/LaTeX/哈希/完整性可疑；逐条确认 → 「未确认→已入库」翻转 |
| TC-F02-08 | 证据跳转 + bbox 高亮 | ✅ | E2E「证据跳转」：`?page=2&bbox=72,660,540,690` → 高亮框 visible 且 `top: 924px`（660 × SCALE 1.4）；阅读页 scrollIntoView |
| TC-F02-09 | 批注/笔记持久化 + 锚点失效警示 | ✅ | E2E「阅读」：文本层划选 → 新建批注（引文原文回显）→ 保存 → 笔记保存 → **刷新后两者保留**（批注（3）、E2E 划选批注验证、E2E 笔记持久化验证）；种子批注 anno-2 `needs_reanchor` 展示「锚点已失效」警示（角色 alert） |
| TC-F02-10 | 10,000 条目可交互 | ✅ | E2E「列表虚拟化」：dev/seed-stress 播种 10k → 库内检索命中压测条目；`.virtual-row` DOM 数 < 200（虚拟化生效，非全量渲染） |
| TC-F02-11 | 批量操作撤销 | ✅ | E2E「批量操作撤销」：勾选 2 条 → 打标签「重点」→ 撤销条出现 → 撤销 → 标签移除、撤销条消失 |
| TC-F02-12 | 无全文权利条目 | ✅ | E2E「无全文诚实降级」：metadata_only 条目 → 「无全文可读」原因 + 不渲染 canvas（假页面红线）+ 三源检索引导 |

功能轨 12 项：11 ✅ + 1 ⚠️（TC-F02-06 单元层覆盖，E2E 受 mock 限制已声明）。无 FAIL。

## 体验轨（UI 对照、真实内容、交互响应）

| 用例 | 通过标准 | 状态 | 证据 |
|---|---|---|---|
| TC-X02-01 | 文献三栏与原型结构/层级一致，修正项有记录 | ✅ | 9 张三视口截图目检（集合|列表|详情三栏 → ≤1080px 折叠两栏+详情整行）；修正项记录于 code-review-report §5（虚拟化首行丢失 #1、移动端视口撑破 #4） |
| TC-X02-02 | 导入队列卡：文件名/大小/类型徽标/阶段进度/失败原因全部可见 | ✅ | E2E 断言文件行（文件名、失败原因）+ 阶段徽标（排队/解析/切分/完成/失败 + 图标）；截图目检 |
| TC-X02-03 | 按钮五态齐备（上传/重试/确认入库） | ✅ | 上传（拖拽/点击选择）、重试（仅 failed+retryable 显示，E2E 断言）、确认入库（切分「确认」+「全部确认入库」）；提交中态 `:disabled="isPending"`（静态证据） |
| TC-X02-04 | 失败/风险不只靠颜色 | ✅（静态证据） | 导入失败 `role="alert"` + 文字原因；批注锚点失效 `role="alert"` 警示条；搜索 partial `Boundary tone=warning` + 文字说明具体哪源不可用；完整性可疑带文字 chip |
| TC-X02-05 | 拖拽区键盘可达 | ✅（静态证据） | ImportDialog dropzone `tabindex="0"` + `@keydown.enter/space` → fileInput.click()（非仅 pointer 事件） |
| TC-X02-06 | 三视口截图无布局破损；阅读器 390px 可用 | ✅ | 9 张截图（1440/1366/390）目检；`.reader-grid` `minmax(0,1fr)` 修复 857px PDF 页撑破 390px 布局视口（修复记录 #4）后移动端阅读/批注 E2E 通过 |
| TC-X02-07 | 阅读器减少动画 | ✅ | 页过渡动画关闭；仅证据跳转使用 `scrollIntoView`（用户意图驱动的定位，非装饰性动画）；Skeleton 替代 loading 动画 |

体验轨 7 项：7 ✅（两项以静态代码证据 + 行为用例组合支撑，无纯目检宣称）。

## TC-F02-06 说明（诚实性记录）

刷新恢复（TC-F02-06）的**状态机与续传协议**已由单测覆盖（Last-Event-ID 头、恢复入队、不伪造进度），但**端到端恢复走查**在 mock 环境不可完成：run 事件脚本存于 MSW 进程内内存库，页面整刷后 `GET /runs/{id}/events` 返回 404，前端据此诚实显示「事件流中断，请重试」（可重试失败），而非伪造已恢复的进度。此缺口源于 mock 无持久化 run 状态（真实后端由 GET /runs + SSE 重放，属 CR-F2 冻结后职责）。详见 known-limitations §2。不以「恢复 E2E 通过」宣称该项。
