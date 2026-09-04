# F3 Code Review Report（自审）

> 09 §3 自审模式｜日期：2026-09-04｜智能体：Agent 1（前端与体验）
> 范围：F3 全部变更（新增 src/entities/{writing,translation}、src/features/{writing,translation}、src/shared/{latex,lib/citation-key}、src/widgets/{LatexEditor,WritingFileTree,DiffPanel,CitationInsertDialog,CompileTimeline,FidelityReport,TranslationPane}、src/mocks/{writing-db,writing-handlers}、src/types/citation-js.d.ts、tests/{e2e/golden-path-3,golden-path-4,unit/diff-utils,citation-key,latex-completions}；修改 src/mocks/{db,handlers,literature-handlers,run-simulator}、src/pages/research/{Writing,Reading,Login}.vue、playwright.config.ts、package.json），只读审查后产出

---

## 1. 自审范围

- `src/**`：新增 16 个 .ts/.vue + 修改 6 个，逐文件只读审查
- `tests/**`：新增 5 个测试文件 + 2 个 E2E spec
- 配置：`playwright.config.ts`（workers=3 沿用 F2）、`package.json`（@codemirror/language-data、@codemirror/legacy-modes、@citation-js/core、@citation-js/plugin-bibtex）

## 2. 通用自审清单

| 类别 | 检查项 | 结果 | 证据 |
|---|---|---|---|
| 重复实现 | 同一能力多套代码 | 无 | 编辑器仅 LatexEditor 一处；引用生成仅 citation-key.ts；SSE/队列复用 F2 shared/lib；envelope 助手复用 http-helpers |
| 巨大文件 | > 200 行单文件 | 记录为 P3 | Writing.vue 648 / TranslationPane.vue 200+ / CompileTimeline 190（SFC 脚本+模板+样式同文件惯例） |
| 深层嵌套 | > 4 层 | 无 | eslint 0 警告 |
| 跨层调用 | pages 直取 app/api | 无 | 页面仅依赖 features/widgets/shared |
| 循环依赖 | 双向 import | 有（已解决） | writing-handlers → literature-handlers（literatureOf/minimalPdf）为单向往返；literature-handlers → writing-db（register*）——已核验无环：writing-db 不 import 任何 handler |
| 吞异常 | 空 catch | 无 | 所有 catch 均有可观察处理；cslToBibtex catch 降级为手写模板（可观察注释） |
| 隐式 fallback | `?? demoData` | 无 | 引用候选仅已核验；译文仅在翻译成功后展示（无静态假内容） |
| 硬编码 URL | 业务 URL 字符串 | 无 | 全部经 config.apiBaseUrl；pdfUrl/compiledPdfUrl 由契约端点拼接 |
| `any` / `@ts-ignore` | 类型逃逸 | 无 | 各 0 命中；vue-tsc 0 error（citation-js 以 d.ts 最小声明补全） |
| mock 进入生产 | 草案代码进 bundle | 无 | `__USE_MOCK__` 剔除；MSW bundle 不存在（复测） |
| 死代码 | 未使用变量/分支 | 无 | lint 0/0；F3 期间清理（unused apiUpload/CompileAccepted/insertMutation 等） |

## 3. Vue/前端附加清单

| 类别 | 检查项 | 结果 | 证据 |
|---|---|---|---|
| 服务端状态重复 | Pinia 复制 Query 事实 | 无 | 文稿/文件/建议/引用/编译/翻译全走 vue-query；本地 ref 仅暂态（activePath/content） |
| listener/timer 泄漏 | 未注销 | 无 | LatexEditor view.destroy；Writing.vue saveTimer 在 onBeforeUnmount 清理 |
| AbortController | fetch 可取消 | 有 | 查询 signal 透传（F2 client 复用）；Skeleton/query 取消由 TanStack 处理 |
| 死路由 | router↔page 不一致 | 无 | writing/writing-detail/reading 路由 + 三入口回归通过 |
| 划选/编辑定位 | bbox/行号数学 | 有 | focusLine 行号钳制（越界不崩）；diff hunk 行号聚合 |
| CodeMirror 资源 | 实例销毁/装饰无重复 | 有 | compartment 单次初始化（修复记录 #5 后）；view.destroy 清理 |
| 公式渲染安全 | v-html XSS | 有 | KaTeX renderToString(throwOnError:false) 转义 + 局部 eslint-disable 注释声明风险受控（latex 来自 DocumentIR 受信内容） |
| 进度真实性 | 假进度红线 | 有 | 编译/翻译进度由 GET /runs/:id 从 SSE 事件脚本推导，非静态 |

## 4. P0/P1/P2/P3 分类

| 级别 | 数量 | 说明 |
|---|---|---|
| P0 | 0 | 引用自由生成、静默假成功、XSS 注入、越权：均无（引用仅已核验、公式 KaTeX 转义、租户隔离） |
| P1 | 0 | 黄金链路三/四 13 用例 × 3 视口全通过；引用/编译/diff 持久化语义符合草案声明 |
| P2 | 0 | 发现 5 项缺陷（含 P1 级 MSW 拦截模块 404、compartment 崩溃）全部修复并回归，见 §5 |
| P3 | 2 | ① Writing.vue 等 SFC 单文件 > 200 行（脚本逻辑内聚，拆分破坏工作台完整性，接受）② CodeMirror 编辑器懒加载体积 113KB gzip（路由级懒加载已隔离，首包不受影响，接受） |

## 5. 修复记录（本阶段自检发现并全部修复）

1. **MSW `*/runs/:runId` 误拦截 Vite 模块（P1 级）**：裸 `*/runs/:runId` 通配符把 `/src/features/runs/use-runs.ts` 也匹配（`:runId=use-runs.ts`），MSW 返回 404 → Home.vue 动态 import 失败 → 登录回跳抛非 ApiError「登录失败」。定位：探针捕获 404 URL + 控制台。修复：run 详情/保真报告 handler 限定 `*/api/research/v1/runs/:runId`。回归：登录链路恢复（probe final url=/research/home）。
2. **登录竞态（P2，测试基建）**：OTP POST 含 300ms 延迟，E2E 立即登录时服务端 passwordless 未落库 → 「登录失败」。修复：login helper `waitForResponse` OTP 完成后再登录；同步加固 golden-path-1/2/3/4。
3. **引用候选空（TC-F04-03）**：用户未先访问文献页时 `tenant.literature` 未初始化 → 候选为空。修复：writing-handlers 引入 `literatureOf()` 懒初始化（并导出该函数）。
4. **编译错误定位断言失败**：模板 `<template v-if>` 产生 `main.tex :1`（冒号前空格）不匹配 `/main\.tex:1/`。修复：单插值 `{{ e.file }}{{ e.line ? ':'+e.line : '' }}`。
5. **CodeMirror compartment 重复使用崩溃（P1 级）**：decorateLines 返回 `decorationCompartment.of(...)` 后又在 reconfigure 再次调用 → `RangeError: Duplicate use of compartment` → 编辑器区渲染崩溃 → 编译错误/AI diff 状态全不更新。修复：decorateLines 返回普通扩展（EditorView.decorations.of），reconfigure 只包一次；加注释防止回归。
6. **CodeMirror 补全签名**：CompletionSource 应为 CompletionContext（非 EditorState）→ 修正。
7. **writing-handlers 循环依赖风险**：register* 下沉到 writing-db.ts，writing-handlers 只读 db；打破 literature↔writing 双向引用。
8. **登录诊断代码清理**：临时 console.error 已移除。

## 6. 书面接受（如有）

- P3-①②如上表，接受理由已记录，不阻塞 R1。
- 编译失败演练（missing_resource/unsafe_command）经 `mock_scenario` 钩子，非契约端点（注释声明，与 F2 simulate_unavailable 同性质）。
- KaTeX `v-html` 局部 eslint-disable：公式源来自 DocumentIR 受信内容 + KaTeX throwOnError:false 转义，风险受控并记录。

## 7. 自审通过

- P0 = 0、P1 = 0、P2 = 0（修复后回归 138/138 通过）、P3 = 2（书面接受）。
- 六层状态表见 acceptance-matrix.md，全部 DONE。
