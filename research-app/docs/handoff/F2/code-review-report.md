# F2 Code Review Report（自审）

> 09 §3 自审模式｜日期：2026-09-04｜智能体：Agent 1（前端与体验）
> 范围：F2 全部变更（git status：新增 src/entities/literature、src/features/literature、src/mocks/literature-*、src/shared/lib/{import-queue,sse}.ts、src/widgets/{ImportDialog,LiteratureBrowser,LiteratureSearchDialog}、src/pages/research/Reading.vue、tests/{e2e/golden-path-2,unit/import-queue,sse}.test.*；修改 app/api/client.ts、router.ts、mocks/db.ts、mocks/handlers.ts、pages/research/Literature.vue、playwright.config.ts），只读审查后产出

---

## 1. 自审范围

- `src/**`：新增 14 个 .ts/.vue 文件 + 修改 5 个，逐文件只读审查
- `tests/**`：新增 import-queue/sse 单测 + golden-path-2 E2E（12 用例 × 3 视口）
- 配置：`playwright.config.ts`（workers 收拢）、`package.json`（pdfjs-dist/pdf-lib 依赖）

## 2. 通用自审清单

| 类别 | 检查项 | 结果 | 证据 |
|---|---|---|---|
| 重复实现 | 同一能力多套代码 | 无 | SSE 解码/队列 reducer/CRUD 各仅一处（shared/lib + features/literature）；envelope 助手收口在 mocks/http-helpers.ts 供 F1/F2 复用 |
| 巨大文件 | > 200 行单文件 | 记录为 P3 | LiteratureBrowser.vue 1297 / LiteratureSearchDialog.vue 508 / ImportDialog.vue 494（见 §4 P3-①） |
| 深层嵌套 | > 4 层 | 无 | eslint no-nested-ternary 0 警告 |
| 跨层调用 | pages 直取 app/api | 无 | 页面仅依赖 features/widgets/shared；api 客户端仅被 features 引用 |
| 循环依赖 | 双向 import | 无 | vite build 通过；依赖单向（mocks→entities、features→entities） |
| 吞异常 | 空 catch | 无 | 所有 catch 均有可观察处理（错误文案 / role=alert）；lit-persistence 的 catch 带注释（存储降级可观察） |
| 隐式 fallback | `?? demoData` | 无 | 0 命中；降级一律显式（noFullText 原因卡、anchored:false 警示、partial 提示） |
| 硬编码 URL | 业务 URL 字符串 | 无 | pdfUrl/events_url 由契约端点拼接，无 http(s) 直写（`rg "https?://"` 仅 sse 单测假 URL） |
| `any` / `@ts-ignore` | 类型逃逸 | 无 | 各 0 命中；vue-tsc 0 error |
| mock 进入生产 | 草案代码进 bundle | 无 | `__USE_MOCK__` 剔除；pdf-lib 仅在 mock 动态 import |

## 3. Vue/前端附加清单

| 类别 | 检查项 | 结果 | 证据 |
|---|---|---|---|
| 服务端状态重复 | Pinia 复制 Query 事实 | 无 | 文献数据全走 vue-query；队列用本地 ref（会话态）+ sessionStorage 持久化 |
| listener/timer 泄漏 | 未注销 | 无 | Reading.vue document mouseup + pdfDoc.destroy + cleanupFns 在 onBeforeUnmount 清理；use-import-queue 作用域销毁 abort controllers + 移除 offline/online 监听 |
| AbortController | fetch 可取消 | 有 | sse 流 signal 透传；上传/查询 signal 透传；aborted 不算失败（单测覆盖） |
| 死路由 | router↔page 不一致 | 无 | reading 路由懒加载 + 三入口回归通过 |
| 划选坐标归一 | bbox 数学 | 有 | 归一到 SCALE=1 视口坐标（÷SCALE），展示反向 ×SCALE；E2E 断言 top:924px（660×1.4） |
| 锚点诚实性 | 失效不静默错画 | 有 | needs_reanchor 种子 + role=alert 警示；无全文不渲染假 canvas（TC-F02-12 E2E） |
| 进度真实性 | 假进度红线 | 有 | run-created 后 percent=null + 「等待服务端事件」；单测断言（禁止静态假进度） |

## 4. P0/P1/P2/P3 分类

| 级别 | 数量 | 说明 |
|---|---|---|
| P0 | 0 | 错误科研结论、越权、数据泄露：均无（批注/笔记/条目按 tenant 隔离） |
| P1 | 0 | 黄金链路二 12 用例 × 3 视口全通过；批注/笔记/集合/切分持久化语义符合草案声明 |
| P2 | 0 | 发现 9 项缺陷（含 P1 级批注持久化缺失、移动端视口撑破、虚拟化首行丢失）全部修复并回归，见 §5 |
| P3 | 2 | ① LiteratureBrowser/ImportDialog/LiteratureSearchDialog 单文件超 200 行（SFC 样式同文件惯例，脚本逻辑内聚，拆分破坏组件完整性，接受）② MSW 浏览器模式读 document.cookie（F1 已接受并沿用，node 契约测试走真实请求头） |

## 5. 修复记录（本阶段自检发现并全部修复）

1. **虚拟化首行丢失（TC-F02-10，P1 级）**：virtual-core 3.17.8 初始 ResizeObserver 测量批次级联触发 applyScrollAdjustment（每行 correction +84），内部 scrollOffset 漂移到 ~totalSize 而真实 scrollTop=0 → index 0 永久不渲染（desktop 复现）。该库 `shouldAdjustScrollPositionOnItemSizeChange` 选项在 d.ts 声明、resizeItem 中按 this.* 读取，但构造器/setOptions 均未赋值，传入形同虚设 → 外部双 rAF 后派发 scroll 事件让 observeElementOffset 重读真实 scrollTop（`resyncVirtualizerOffset`）。修复后 TC-F02-10 E2E 通过。
2. **桌面端列表全量渲染**：`.browser` 缺高度约束，`.list-scroll` 随内容撑开永不溢出 → 虚拟滚动退化为全量渲染（万条红线）。→ `.browser { height: calc(100dvh - 250px) }`。
3. **批注/笔记刷新丢失（TC-F02-09，P1 级）**：MSW 内存库整刷即失，批注 POST/PATCH/DELETE 与笔记 POST 缺持久化 → 补 `saveLitDelta`（sessionStorage 按 tenant 落盘，重播种回放）。E2E 刷新后批注/笔记保留通过。
4. **移动端布局视口撑破（TC-F02-08 阅读）**：857px 宽 PDF 页把 390px 布局视口撑破 → 点击坐标错位。→ `.reader-grid` 改 `minmax(0,1fr)` + ≤1080px 单列。修复后移动端阅读/批注 E2E 通过。
5. **PDF 文本层划选失效**：pdf.js v4 的 TextLayer 不负责给容器加 `textLayer` 类 → 显式加类 + 宿主宽高与 `--scale-factor` 对齐，保证划选 bbox 归一数学与展示一致。
6. **E2E 并行超时轮换失败（测试基建）**：本机 20 逻辑核默认 workers=10，10 个并发 chromium + 单 vite dev server，F2 重用例（PDF 双次渲染、万条种子、SSE 流）轮换触顶 30s 测试级/5s 断言超时（实测「Test timeout of 30000ms exceeded」与默认 5s 断言）。→ `playwright.config.ts` workers=3（每项目串行、项目间并行）+ golden-path-2 文件级 `test.setTimeout(120s)` + 网络相关断言显式 15s。修复后 99/99 稳定。
7. **死代码（P2）**：Reading.vue `const w = host.clientWidth || viewport.width; …; void w;` 为无用变量 → 删除。
8. **导入条目列表不刷新**：`useInvalidateLiterature` 前缀失效按元素相等比较，'items' 与 'items-inf' 仅差一个 key 元素 → 必须用 domain 根 key `literatureKeys.all` 整体失效（注释记录原因）。修复后导入完成条目立即入列（E2E 断言）。
9. **切分确认后列表不刷新**：useConfirmChunks 失效 key 未收敛 → 补精确失效。

## 6. 书面接受（如有）

- P3-①②如上表，接受理由已记录，不阻塞 R1。
- mock 演练钩子（search `simulate_unavailable`、import `timeout` 文件首次解析失败）为 dev/test 专用，与冻结/草案端点分离，注释声明非契约语义。

## 7. 自审通过

- P0 = 0、P1 = 0、P2 = 0（修复后回归 99/99 通过）、P3 = 2（书面接受）。
- 六层状态表见 acceptance-matrix.md，全部 DONE。
