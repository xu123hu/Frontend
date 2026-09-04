# F3 Handoff · 科研端前端

> 日期：2026-09-04｜负责智能体：Agent 1（前端与体验）｜阶段：F3（翻译双栏 + LaTeX 写作）
> 分支：`research/agent-01-frontend`｜worktree：`D:\科研端worktrees\agent-01-frontend`｜前置：F2（`c427aa4`）

## 六层状态表（09 §2，本日全量重跑取证）

| 层 | 状态 | 关键证据 |
|---|---|---|
| L1 Build | ✅ DONE | vue-tsc 0 error；eslint 0/0；build 4.84s，首包 gzip 5.56KB，MSW 不在产物，codemirror/katex/pdf 路由级懒加载 |
| L2 Test | ✅ DONE | vitest 12 files / 105 tests passed（新增 diff-utils 8 + citation-key 4 + latex-completions 3） |
| L3 Performance | ✅ DONE（阶段内可测项） | 首包 ≤500KB；初始页不加载编辑器/公式/PDF 完整代码；万条虚拟化回归；CWV→F5 |
| L4 Failure | ✅ 单元+E2E 可测项 / ⚠️ 断网与导出 E2E 局限 | 两类编译失败结构化定位+旧 PDF 保留；公式冲突块标记不整篇成功；diff 拒绝不写入源文件 |
| L5 User Journey | ✅ DONE | Playwright 138 passed（2.2m）= F1 21×3 + F2 12×3 回归 + golden-path-3 7×3 + golden-path-4 6×3；9 张截图归档目检 |
| L6 Human Review | ✅ 自审 DONE / ⏳ Agent 6 | code-review-report P0=0 P1=0 P2=0（P3=2 书面接受） |

综合：**DONE（F3 范围内）**。详见 `acceptance-matrix.md`。

---

## 1. 用户现在能完成什么以前不能完成的任务

黄金链路四（写作）与黄金链路三（翻译）端到端可走通：

1. **LaTeX 写作工作台**：项目内创建/打开文稿 → 文件树 + CodeMirror 6 编辑器（stex 高亮 + `\cite`/`\ref`/命令补全）→ 自动保存（乐观锁）→ 编译（SSE 进度 → PDF/引擎/输入哈希）→ 失败精确定位 + 上次成功 PDF 不丢失。
2. **引用可靠插入**：仅已核验 CitationRecord 为候选 → `\cite{key}` + references.bib 自动更新（Citation.js 生成），冲突 key 去重；未核验引用不可插入。
3. **AI 生成内容只能作为 diff**：四要素卡片（原文/建议/理由/风险）+ 逐项接受/拒绝；拒绝项不写入源文件；决策审计（HumanDecision 语义）；编辑器内建议行高亮 + 定位。
4. **阅读与翻译双栏**：文献阅读页内切换「批注/笔记 ↔ 阅读与翻译」（非孤立工具页）→ 发起翻译（run_type=translation，SSE 逐段进度）→ 译文单元卡片流 + 公式 KaTeX 渲染 + block_id 回链原文。
5. **公式保真诚实性**：数量/顺序/哈希/引用 key/label-ref 逐项比较；公式恢复冲突标记具体块 + 保留原公式 + **不输出整篇成功**（06 §5 步骤 6 红线）。

> 诚实性声明：写作/翻译域端点（CR-F3-01..06）后端未冻结，运行在 MSW 契约草案（UI 常驻「契约草案数据源」徽标）；runs/SSE/Artifact/DocumentIR/VerificationRecord/CitationRecord 走 M0 冻结契约。编译与翻译真实执行（Tectonic/LLM）由 Agent 2+ 承担；导出译文下载端点为草案边界（TC-F03-06，见 known-limitations §2）。

## 2. 公共契约与目录变化

### 2.1 F3 新增/改造（feature-sliced 边界，与 design.md §4.1 一致）

```text
research-app/
├── src/
│   ├── entities/
│   │   ├── writing/types.ts        # Manuscript/ManuscriptFile/CompileRun/CompileError/AiSuggestion/CitationCandidate
│   │   └── translation/types.ts    # TranslationUnit/FidelityReport（引用 DocumentIR/VerificationRecord）
│   ├── features/
│   │   ├── writing/{api,queries}.ts        # 文稿/文件/建议/引用 CRUD + 编译 run（vue-query）
│   │   └── translation/{api,queries}.ts    # 翻译 run 发起/轮询 + 译文单元 + 保真报告
│   ├── shared/
│   │   ├── latex/diff-utils.ts     # 行 LCS diff + hunk 聚合 + 建议应用（纯函数，单测）
│   │   ├── latex/completions.ts    # CodeMirror 补全（\cite/\ref/命令 snippet/环境闭合）
│   │   └── lib/citation-key.ts     # 引用 key 生成 + 冲突去重（纯函数，单测）
│   ├── types/citation-js.d.ts      # Citation.js 最小声明（消除 TS7016）
│   ├── mocks/
│   │   ├── writing-db.ts           # 自研 LaTeX 模板种子（main.tex/sections/bib）+ 建议 + run 状态
│   │   └── writing-handlers.ts     # CR-F3-01..06 草案端点 + run 详情（SSE 推导）+ compiled-pdf
│   ├── widgets/
│   │   ├── LatexEditor/            # CodeMirror 6（stex + 补全 + diff 行 Decoration + insertAtCursor/focusLine）
│   │   ├── WritingFileTree/        # 文件树
│   │   ├── DiffPanel/              # AI diff 四要素卡片 + 接受/拒绝 + 定位
│   │   ├── CitationInsertDialog/   # 引用插入（焦点陷阱 + Escape，仅已核验）
│   │   ├── CompileTimeline/        # 编译时间线 + PDF 预览 + 错误定位
│   │   ├── FidelityReport/         # 公式保真逐项比较 + 失败块
│   │   └── TranslationPane/        # 翻译发起 + 译文卡片流 + 保真
│   └── pages/research/
│       ├── Writing.vue             # 重构：三栏工作台（文件树/编辑器/右栏）
│       └── Reading.vue             # 加「阅读与翻译」模式（复用 PDF 渲染/证据跳转）
├── tests/
│   ├── unit/{diff-utils,citation-key,latex-completions}.test.ts
│   └── e2e/golden-path-3.spec.ts   # 黄金链路四 7 用例 × 3 视口
│   └── e2e/golden-path-4.spec.ts   # 黄金链路三 6 用例 × 3 视口
└── artifacts/acceptance/f3/*.png   # 3 页面 × 3 视口 = 9 张截图
```

### 2.2 对既有核心的修改（最小侵入，F1/F2 接口零破坏）

- `mocks/db.ts`：TenantRecord 加 `writing?` 懒初始化字段。
- `mocks/handlers.ts`：注册 writingHandlers。
- `mocks/literature-handlers.ts`：POST /runs 分派 writing/translation；导出 `literatureOf`/`minimalPdf`；run 详情端点限定 API 前缀。
- `mocks/run-simulator.ts`：新增 `buildTranslationEvents`/`buildCompileEvents`（M0 冻结 RunEvent 结构）。
- `pages/research/Login.vue`：无功能变更（F3 期间临时诊断已移除，净零 diff 除登录竞态加固于 E2E 层）。
- `playwright.config.ts`：workers=3 沿用 F2 决策（注释依据）。

## 3. 外部项目与许可证

- **新增采用**：`@codemirror/language-data`（MIT，stex 高亮基底）；`@codemirror/legacy-modes`（MIT，stex mode）；`@citation-js/core` + `@citation-js/plugin-bibtex`（MIT，.bib 解析/生成）。均记入 reuse-ledger card-18/19。
- **显式拒绝**：`codemirror-lang-latex`（AGPL-3.0，2026 由 MIT 切换）——reuse-ledger 拒绝清单；自研轻量补全替代（f3-benchmark §3.1）。
- **沿用 F0 账本**：CodeMirror 6（F0 已定）、KaTeX、TanStack、MSW 等，无未记许可变更。

## 4. 真实测试与链路执行

### 4.1 单元 + 契约测试（vitest）

```text
Test Files  12 passed (12)
Tests       105 passed (105)   （8.73s）
```

新增：diff-utils 8（行 diff/hunk/接受拒绝）、citation-key 4、latex-completions 3；F0-F2 全量回归未破坏。

### 4.2 类型检查与 Lint

```text
vue-tsc --noEmit        → 0 errors
eslint --max-warnings 0 → 0 errors, 0 warnings
```

### 4.3 E2E（Playwright，三视口 1440/1366/390）

```text
138 passed (2.2m)
= golden-path-1 21×3 + golden-path-2 12×3（F1/F2 回归）+ golden-path-3 7×3（写作）+ golden-path-4 6×3（翻译）
```

golden-path-3 覆盖 TC-F04-01..06、TC-X04-02/04；golden-path-4 覆盖 TC-F03-01..05、TC-X03（TC-F03-06 见 known-limitations §2）。

### 4.4 生产构建与 MSW 排除

```text
npm run build → ✓ built in 4.84s
首包 dist/assets/index-*.js       gzip 5.56 KB（08 §2 门禁 ≤500KB）✅
page-writing-*.js                 gzip 8.75 KB（写作工作台独立 chunk）
vendor-codemirror-*.js            gzip 113.39 KB（懒加载，仅写作路由）
vendor-katex-*.js                 gzip 77.54 KB（懒加载，翻译/公式）
vendor-pdf-*.js                   gzip 98.14 KB（F2，懒加载）
MSW browser bundle                不在产物中（__USE_MOCK__ 剔除）✅
```

### 4.5 视觉证据

`artifacts/acceptance/f3/`：writing / writing-compile / reading-translate × 1440/1366/390 共 9 张，均经目检（写作三栏、编译成功态、翻译双栏对照；移动端右栏整行）。

## 5. 本阶段自检发现并修复的缺陷（完整记录见 code-review-report.md §5）

1. **MSW `*/runs/:runId` 误拦截 Vite 模块（P1）**：导致 Home.vue 动态 import 404 → 登录回跳失败 → 限定 API 前缀修复。
2. **登录竞态（测试基建）**：OTP 300ms 延迟下 E2E 立即登录失败 → login helper waitForResponse。
3. **引用候选空**：文献域未懒初始化 → 引入 literatureOf。
4. **编译错误定位断言**：模板空格致 `/main\.tex:1/` 不匹配 → 单插值。
5. **CodeMirror compartment 重复崩溃（P1）**：Duplicate use of compartment → 返回普通扩展。
6. **补全签名**：CompletionSource 用 CompletionContext。
7. **循环依赖**：register* 下沉 writing-db.ts。
8. **诊断代码清理**：临时 console.error 移除。

## 6. 仍为证据不足的项（不使用「基本完成」描述）

- TC-F03-06 导出译文：mock 环境草案边界（前端原语交付，导出后端承载）。
- Core Web Vitals：F5 接真实后端与数据量后测量。
- 断网 E2E、屏幕阅读器对 CodeMirror 抽样、trace 全量归档：F5 收口（同 F1/F2 声明）。

## 7. 集成负责人需执行的精确步骤

1. 审阅 `docs/handoff/F3/design.md §6` 契约请求单（CR-F3-01..06）并在 R1 裁决写作/翻译域端点路径/字段。
2. 冻结后通知 Agent 1 拉取新 openapi.json 重新生成类型并按真实契约替换 MSW handlers——前端 UI 与用例零改动（isomorphic 约束）。
3. F4 收口时按 design.md §1 范围切分跑黄金链路三/四全量回归（AI 管家回答带支持状态、证据检查生成侧）。

## 8. Handoff 清单

- ✅ `summary.md`（本文件，首屏含六层状态表）
- ✅ `design.md`（范围/三候选比较/15 态矩阵/契约请求单/范围切分声明）
- ✅ `code-review-report.md`（P0=0、P1=0、P2=0，P3=2 书面接受）
- ✅ `acceptance-matrix.md`（双轨用例逐条证据 + 六层状态表）
- ✅ `test-report.md`（2026-09-04 全量重跑：vitest 105、Playwright 138、build 5.56KB）
- ✅ `known-limitations.md`（真实缺口/外部裁决依赖/设计取舍分节）
- ✅ 9 张三视口截图（本轮 E2E 生成并目检）
- ⏳ trace.zip 全量归档→F5；CWV 实测→F5（理由见 known-limitations）

## 9. 提交记录

- **本阶段提交：`<commit-hash>`**（research(f3): 黄金链路三/四——公式保真翻译与 LaTeX 写作，2026-09-04）
- 前置：F2 `c427aa4`（含回填提交 `ea77ae5`）
- 合并目标位置：`D:\frontend\research-app`（由集成负责人执行）
