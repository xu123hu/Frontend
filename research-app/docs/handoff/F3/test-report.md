# F3 Test Report

> 08 §5.2 + 09 §2 L1/L2/L3 状态｜执行日期：2026-09-04（handoff 定稿当日全量重跑）
> 环境：Windows 11 / Node 22 / chromium only / dev server 127.0.0.1:5173（MSW 契约草案模式）

## L1 Build（编译、类型、静态检查）

| 项 | 命令 | 结果 |
|---|---|---|
| 类型检查 | `npm run typecheck`（vue-tsc --noEmit） | **0 error** |
| 静态检查 | `npm run lint`（eslint . --ext .ts,.vue,.js --max-warnings 0） | **0 error, 0 warning** |
| 生产构建 | `npm run build` | 成功，4.84s |

构建产物关键项（本次实测）：

| 产物 | gzip | 说明 |
|---|---|---|
| `index-*.js` | **5.56 KB** | 首包 ≤ 500KB 门禁 ✅（90 倍余量） |
| `page-writing-*.js` | **8.75 KB** | 写作工作台独立 chunk（文件树+编辑器+diff+编译时间线） |
| `vendor-codemirror-*.js` | **113.39 KB** | CodeMirror 6 懒加载 chunk（仅写作路由触发） |
| `vendor-katex-*.js` | **77.54 KB** | KaTeX 懒加载 chunk（阅读页翻译模式 + 后续公式渲染） |
| `vendor-pdf-*.js` | 98.14 KB | F2 已建懒加载（阅读路由） |
| 其余 page-home/literature/project 等 | 0.82–14.65 KB | 一级入口独立 chunk ✅ |
| MSW bundle | **不存在** | `__USE_MOCK__` 编译期常量剔除（持续复测） |

> 新增的 CodeMirror/KaTeX 均为路由级懒加载，首包不受影响。F3 拆包验证：初始页面不加载编辑器/PDF 解析器/公式渲染完整代码（06 §10）。

## L2 Test（单元 + 契约）

`npm run test`（vitest）：**12 files / 105 tests, all passed**（8.73s）

| 文件 | 覆盖 |
|---|---|
| `tests/unit/diff-utils.test.ts`（新增，8 tests） | 行 LCS diff、hunk 聚合（连续合并/多处拆分）、建议应用（接受写入/拒绝返回 null/越界不破坏）——红线：拒绝不写入源文件 |
| `tests/unit/citation-key.test.ts`（新增，4 tests） | 作者姓-年份-标题首词、无作者/无年份兜底、重音归一化、冲突 key 数字后缀 |
| `tests/unit/latex-completions.test.ts`（新增，3 tests） | 环境自动闭合、label 提取 |
| `tests/unit/{import-queue,sse}.test.ts` | F2 回归（16+10）未破坏 |
| 其余 F0/F1/F2 文件 | 64 tests 回归未破坏 |

## L3 Performance（08 硬门禁 · F3 阶段可测项）

| 指标 | 门禁 | F3 实测 | 测量条件 |
|---|---|---|---|
| 首包 gzip | ≤ 500 KB | **5.56 KB** ✅ | `vite build` 本地产物 |
| 路由拆包 | 初始页不加载编辑器/PDF/公式 | ✅ 写作→codemirror 113KB、阅读→pdf 98KB、翻译→katex 77KB 均懒加载 | vite 产物清单 |
| 万条列表交互 | 虚拟化生效 | ✅ F2 回归（golden-path-2）| E2E 复跑 |
| MSW 排除 | 生产产物无 mock | ✅ 无 msw bundle | `__USE_MOCK__` 剔除 |

> LCP/INP/CLS 需真实后端与数据量 → F5 实测（与 F1/F2 声明一致）。

## L5 User Journey（E2E，三视口 1440/1366/390）

`npx playwright test`：**138 passed（2.2m）** = golden-path-1 21×3 + golden-path-2 12×3 + **golden-path-3 7×3 + golden-path-4 6×3**（F1/F2 全量回归 + F3 新增）。

golden-path-3（写作，TC-F04）覆盖：F04-01 文件树/编辑器、F04-04 编译成功（引擎/哈希/PDF 预览）、F04-05 编译失败定位（缺失资源/不安全命令 + 旧 PDF 不丢失）、F04-02 AI diff 四要素+接受/拒绝、F04-03 引用插入（仅已核验 + .bib 更新）、F04-06 证据检查入口。

golden-path-4（翻译，TC-F03）覆盖：F03-01 双栏入口（非孤立工具页）、F03-02/03/04 发起翻译→译文单元+保真报告（冲突块保留原公式不整篇成功）、F03-05 译文段落回链原文、TC-X03 三视口截图。

> 说明：`playwright.config.ts` workers=3 沿用 F2 决策（本机 20 逻辑核，实测避免 F2 并行超时轮换），F3 全部用例稳定通过。

## L4 Failure（故障态）

- 单元层：diff-utils 覆盖建议拒绝/越界；sse/import-queue F2 回归。
- E2E 层：TC-F04-05 两类编译失败（缺失资源/不安全命令）结构化定位 + 旧 PDF 保留；TC-F03-04 公式恢复冲突标记具体块 + 不输出整篇成功。
- 断网 E2E 仍受 MSW SW 限制（同 F1/F2），见 known-limitations §1。

## 视觉证据

`artifacts/acceptance/f3/`：writing / writing-compile / reading-translate × 1440/1366/390 共 **9 张**，均由本轮 E2E 生成并目检（写作三栏、编译成功态、翻译双栏对照）。
