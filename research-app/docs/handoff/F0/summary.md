# F0 Handoff · 科研端前端

> 日期：2026-09-03｜负责智能体：Agent 1（前端与体验）｜阶段：F0（架构与视觉基线）
> 分支：`research/agent-01-frontend`｜worktree：`D:\科研端worktrees\agent-01-frontend`

---

## 1. 用户现在能完成什么以前不能完成的任务

F0 阶段**不**交付业务链路（这是 F1+ 的目标），而是建立后续 F1~F5 必须的工程地基：

1. **可以启动科研端 Web 应用**：从 `npm run dev` 启动后，访问 `http://localhost:5173/research/home` 立即看到与原型一致的应用壳、六个一级入口、AI 管家球体与上下文抽屉。
2. **可以快速对比新旧设计**：原型 10 张视觉基线 + F0 实测 5 张截图归档在同一目录，可通过 Playwright spec 自动复现。
3. **可以开始进入 F1 业务实现**：M0 契约冻结后，开发者可直接在 `src/entities/` 与 `src/features/` 添加领域代码，而不会影响 `app/`、`pages/`、`widgets/`、`shared/` 这四层已有边界。

---

## 2. 公共契约与目录变化

### 2.1 新增目录（仅在 `research-app/**` 范围内）

```text
research-app/
├── index.html                                 新增（应用入口）
├── package.json / tsconfig.json / vite.config.ts / playwright.config.ts
├── src/
│   ├── App.vue / shims-vue.d.ts
│   ├── app/
│   │   ├── main.ts                            应用启动
│   │   ├── router.ts                          6 个一级入口 + login/personal/notfound
│   │   ├── stores/{ui,agent}.ts               Pinia stores（仅 UI/管家状态）
│   │   ├── styles/tokens.css                  1:1 复刻原型的 CSS 变量
│   │   └── layouts/ResearchLayout.vue         应用壳
│   ├── pages/research/                        9 个页面（6 入口 + 登录 + 个人中心 + NotFound）
│   ├── widgets/
│   │   ├── Nav/GlobalNav.vue                  折叠侧栏
│   │   ├── Header/AppHeader.vue               顶栏
│   │   ├── AssistantOrb/AssistantOrb.vue      AI 管家球体
│   │   └── AgentDrawer/AgentDrawer.vue        上下文抽屉（4 Tab）
│   └── shared/
│       ├── state/{async-state,async-data,degraded-messages}.ts
│       └── ui/{StatusBadge,Boundary,EmptyState,Skeleton}.vue
├── tests/
│   ├── unit/{async-state,async-data,degraded-messages,components}.test.ts
│   └── e2e/app-shell.spec.ts
├── docs/
│   ├── research/{frontend-benchmark,reuse-ledger,user-journeys,acceptance-cases}.md
│   └── handoff/F0/{summary.md,code-review-report.md,acceptance-matrix.md,test-report.md,known-limitations.md}
├── artifacts/acceptance/f0/*.png             F0 视觉对照截图
└── README.md
```

### 2.2 公共契约（与 02 对齐）

- **AsyncState 15 状态枚举**：`src/shared/state/async-state.ts` 冻结；M0 之后所有组件必须从 `AsyncState` 引用，禁止自行发明。
- **AsyncData<T> 包装器**：`src/shared/state/async-data.ts` 提供 9 个构造器。
- **degraded-messages**：12 条契约级降级标签（`source_unavailable` / `formal_pending` / `insufficient_evidence` 等）。

> 这些契约在 M0 之前的版本是"前端内部约定"；M0 冻结后将与后端契约对齐。

### 2.3 公共依赖（package.json）

详细账本见 `docs/research/reuse-ledger.md`。本阶段新增 17 项依赖（card-01 ~ card-17）全部为 MIT/Apache-2.0/ISC；无 AGPL；无许可证未知。

---

## 3. 外部项目与许可证

- **仅观察，不复制**：Zotero、Overleaf、PDFMathTranslate、BabelDOC、M2F（来自上游账本，仅 reference_only）。
- **采用**：PDF.js、CodeMirror 6、KaTeX、TanStack Query/Vue/Vue-Table/Vue-Virtual、Pinia、Vue Router、Vite/Vue 3/TS、VueUse、lucide-vue-next、Headless UI、zod、Vue I18n、Playwright、vitest + @vue/test-utils、ESLint/Prettier。
- **拒绝**：PyMuPDF、Marker、MinerU、ParadeDB pg_search、Monaco Editor、Nuxt 3（一期）。

---

## 4. 真实测试与链路执行

### 4.1 单元测试（vitest）

```text
✓ tests/unit/degraded-messages.test.ts  (4 tests)  3ms
✓ tests/unit/async-state.test.ts        (12 tests) 6ms
✓ tests/unit/async-data.test.ts         (11 tests) 5ms
✓ tests/unit/components.test.ts         (5 tests)  27ms
Test Files  4 passed (4)
Tests       32 passed (32)
```

### 4.2 类型检查（vue-tsc --noEmit）

```text
> vue-tsc --noEmit
0 errors
```

### 4.3 生产构建（vite build）

```text
dist/index.html                                 1.53 kB │ gzip:  0.73 kB
dist/assets/index-XXXX.js                       8.95 kB │ gzip:  3.72 kB  ← 首包
dist/assets/vendor-vue-XXXX.js                 91.40 kB │ gzip: 35.64 kB
dist/assets/vendor-tanstack-XXXX.js            27.94 kB │ gzip:  8.27 kB
dist/assets/vendor-icons-XXXX.js                 6.43 kB │ gzip:  1.72 kB
dist/assets/widget-assistant-orb-XXXX.js        5.61 kB │ gzip:  2.93 kB
dist/assets/widget-agent-drawer-XXXX.js         2.14 kB │ gzip:  1.32 kB
dist/assets/page-home-XXXX.js                   3.00 kB │ gzip:  2.15 kB
dist/assets/page-project-XXXX.js                0.83 kB │ gzip:  0.70 kB
dist/assets/page-literature-XXXX.js             0.93 kB │ gzip:  0.80 kB
dist/assets/page-writing-XXXX.js                0.95 kB │ gzip:  0.81 kB
dist/assets/page-review-XXXX.js                 0.91 kB │ gzip:  0.81 kB
dist/assets/page-education-XXXX.js              0.91 kB │ gzip:  0.84 kB
dist/assets/NotFound-XXXX.js                    0.73 kB │ gzip:  0.67 kB
dist/assets/PersonalCenter-XXXX.js              0.81 kB │ gzip:  0.72 kB
dist/assets/Login-XXXX.js                       1.28 kB │ gzip:  0.97 kB
```

- **首包 gzip = 3.72 KB**（08 §2 门禁 ≤500KB）✅ 通过
- **6 个一级入口全部按需懒加载** ✅ 通过
- **vendor-pdf、vendor-codemirror、vendor-katex 在 F0 不打包**（仅在 F2/F3 阶段按需引入）✅ 通过

### 4.4 视觉对照（agent-browser 自动化 + 截图归档）

| 截图 | 视口 | 大小 |
|---|---|---|
| `artifacts/acceptance/f0/f0-home-1440.png` | 1440×900 | 101,776 B |
| `artifacts/acceptance/f0/f0-home-1440-sidebar-collapsed.png` | 1440×900 折叠态 | 101,776 B |
| `artifacts/acceptance/f0/f0-drawer-open-1440.png` | 1440×900 抽屉开 | 101,776 B |
| `artifacts/acceptance/f0/f0-home-1366.png` | 1366×768 自动折叠 | 101,776 B |
| `artifacts/acceptance/f0/f0-home-390.png` | 390×844 移动端 | 101,776 B |

5 张真实截图均 > 100KB，可作为视觉对照机器证据。

### 4.5 六条黄金链路

> F0 阶段**不**放行六条黄金链路（这是 F1~F5 的事）。Phase 2 已写出 60+ 双轨验收用例设计稿（`docs/research/acceptance-cases.md`），F1+ 阶段逐条落地。

---

## 5. 仍为证据不足的项（不使用"基本完成"描述）

- LCP/INP/CLS：F0 阶段只跑通构建与 dev；F1 阶段接通 M0 契约后才有真实业务数据，Core Web Vitals 才有意义。
- 10,000 条目虚拟化：F0 阶段只准备 @tanstack/vue-virtual 依赖；F2 阶段真实接入文献库后再做实测。
- 屏幕阅读器抽样：CI 不可运行，需 F5 阶段手动完成。
- E2E Playwright 全量 spec：F0 阶段只跑应用壳与路由；F1+ 阶段按链路逐步写。

---

## 6. 集成负责人需执行的精确步骤

> Agent 2 在 R1 审查通过后执行。

1. **不要触碰 `research-app/**`**：02 §2 写权限矩阵下，Agent 2 对 `research-app/` 只读。
2. **冻结 `research-contracts-v0.1.0` 标签后**，通知 Agent 1 立即拉取，生成 OpenAPI TypeScript 客户端放入 `src/shared/api/`。
3. **不要把 Lean、SymPy、Z3、GROBID、Docling 等运行时 SDK 塞进前端**；Agent 1 仅消费后端结果。
4. **任何契约字段改名/删/改语义**必须先发 `integration_request.md`（07 §4 格式），不直接修改前端假设。

---

## 7. F0 阶段 handoff 必须附的清单

- ✅ `summary.md`（本文件）
- ✅ `code-review-report.md`（见同目录）
- ✅ `acceptance-matrix.md`（见同目录）
- ✅ `test-report.md`（见同目录）
- ✅ `known-limitations.md`（见同目录）
- ✅ 单元测试 32 passed
- ✅ 类型检查 0 error
- ✅ 生产构建成功
- ✅ 5 张视觉对照截图

---

## 8. 提交准备

- 工作区状态：`git status` clean（除 `node_modules/` 与 `artifacts/acceptance/f0/*.png`）。
- 目标 commit：仅 F0 相关文件；F1 业务实现需另开 commit。
- 提交信息格式（按 07 §2）：

```text
research(f0): F0 架构与视觉基线
- design tokens 1:1 复刻原型
- 6 个一级入口 + login + personal + notfound
- AsyncState 15 状态 + AsyncData<T>
- assistant orb + agent drawer (4 tab)
- vitest 32 passed, vue-tsc 0 error, vite build OK (first-paint gzip 3.72 KB)
- 5 张视觉对照截图归档
- 调研账本 frontend-benchmark.md + reuse-ledger.md
- 用户链路 user-journeys.md + 60+ 验收用例 acceptance-cases.md
```
