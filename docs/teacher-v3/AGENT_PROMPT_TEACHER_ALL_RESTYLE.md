# 智能体执行提示词：教师端全站换新设计 + 备课中心 1:1 重构（总指令）

> 本文档是给编码智能体的**总执行指令**。从头到尾顺序阅读后开工，不要跳读。
> 改造范围两层：**Layer 1 教师端全站换肤**（保留功能，只换视觉）+ **Layer 2 备课中心 1:1 重构**（按设计稿全面重做）。
> 学生端 / 管理端 / 教研端**一律不动**。

---

## 0. 输入文件清单（开工前必须完整读取）

设计基准（视觉唯一真相，禁止自由发挥、禁止"优化"设计稿）：

```
ai-lesson-planning/colors_and_type.css              ← 设计令牌（--ailp-* 全量）
ai-lesson-planning/pages/home.html                  ← AI 对话首页
ai-lesson-planning/pages/textbook-select.html       ← 从教材开始
ai-lesson-planning/pages/upload-materials.html      ← 上传资料备课
ai-lesson-planning/pages/template-library.html      ← 教案模板库
ai-lesson-planning/pages/ai-generating.html         ← AI 生成与大纲确认
ai-lesson-planning/pages/editor.html                ← 备课编辑器
ai-lesson-planning/pages/editor-resources.html      ← 资源推荐抽屉展开态
```

执行文档：

```
docs/teacher-v3/AGENT_PROMPT_PREP_REDESIGN.md       ← 备课中心逐页改造指令（必读，Layer 2 严格按它执行）
```

需先勘察的现有实现（换肤对象）：

```
src/styles/tokens.css                               ← v4 全局令牌（琥珀主题，本模块要覆盖它）
src/styles/teacher-v3.css                           ← 教师端现有组件样式
src/styles/base.css
src/layouts/TeacherV3Layout.vue                     ← 教师端布局壳（侧边栏 + 顶栏）
src/pages/teacher-v3/*.vue                          ← 全部教师端页面
src/components/teacherV3/*.vue                      ← 教师端组件（含旧备课组件）
src/components/butler/FloatingButler.vue            ← 其他模块的悬浮球
src/router/index.js                                 ← 教师端路由
```

---

## 1. 改造总策略

| 层 | 范围 | 改什么 | 不改什么 |
|---|---|---|---|
| **Layer 1 全站换肤** | 教师端全部模块：今日教学、题库、组卷、作业与批改、课堂互动、学情洞察、资源中心、课件、布局壳（侧边栏/顶栏/悬浮球） | 配色令牌、卡片/按钮/标签/表单等组件样式、图表配色、图标颜色、动效 | 页面结构、业务逻辑、API 调用、路由、store、测试断言的业务语义 |
| **Layer 2 备课中心重构** | 备课全链路 7 页（见 AGENT_PROMPT_PREP_REDESIGN.md 第 2 节映射表） | 按设计稿 1:1 重做布局与交互，抛弃旧表单向导/来源桌/伴侣坞 | 悬浮球四工具、AI 对话、文件上传等核心逻辑（只换壳） |

**换肤隔离机制（最重要）**：v4 的 `tokens.css` 是全局共享的（学生端也在用琥珀主题）。所有新令牌必须挂在作用域类上，**不允许直接改 `:root` 的值**：

- 在 `TeacherV3Layout.vue` 的根容器加类 `theme-teacher`；
- 在 `tokens.css` 末尾新增 `.theme-teacher { ... }` 块（见第 2 节的完整映射）；
- 教师端所有页面的视觉随之自动切换；学生端/管理端零变化。

> 注：AGENT_PROMPT_PREP_REDESIGN.md 中写的 `.theme-prep` 作用域**升级为 `.theme-teacher`**（备课页面也在 TeacherV3Layout 内，共用同一套），其余内容照旧执行。

---

## 2. Layer 1：全局换肤规范

### 2.1 令牌映射（写入 `.theme-teacher`，完整可执行）

在 `src/styles/tokens.css` 末尾追加（把 v4 旧琥珀令牌在教师端作用域内覆盖为新值）：

```css
/* ==========================================================
   教师端主题作用域 · 新设计语言（靛蓝 + 青色）
   仅在 TeacherV3Layout 根容器 .theme-teacher 内生效
   ========================================================== */
.theme-teacher {
  /* 品牌：琥珀 → 靛蓝主色 + 青色辅助 */
  --brand: #4f46e5;
  --brand2: #06b6d4;
  --brand-deep: #4338ca;
  --brand-soft: #e0e7ff;
  --brand-faint: #eef2ff;

  --peach: #0891b2;            /* 装饰性次强调 → 青色 */
  --peach-soft: #cffafe;

  --purple: #6366f1;
  --purple-soft: #eef2ff;
  --purple-border: #c7d2fe;

  /* --indigo / --cyan 保持原值（与新主色天然一致） */

  /* 别名层（原前端兼容映射）同步覆盖 */
  --primary: #4f46e5;
  --primary-hover: #4338ca;
  --primary-active: #3730a3;
  --primary-subtle: #eef2ff;
  --primary-border: #c7d2fe;

  /* 阴影：琥珀光晕 → 靛蓝光晕；静态阴影压浅 */
  --shadow: 0 1px 2px rgba(15, 23, 42, 0.05), 0 4px 16px rgba(15, 23, 42, 0.04);
  --shadow-lg: 0 10px 30px rgba(99, 102, 241, 0.22);
  --shadow-glow: 0 0 30px rgba(99, 102, 241, 0.25);

  /* 圆角对齐新设计（6/10/14/20 阶） */
  --radius: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;

  /* 备课组件用的 ailp 令牌一并声明（备课中心直接可用） */
  --ailp-primary: #4f46e5;
  --ailp-primary-foreground: #ffffff;
  --ailp-accent: #06b6d4;
  --ailp-background: #f8fafc;
  --ailp-card: #ffffff;
  --ailp-foreground: #0f172a;
  --ailp-muted: #f1f5f9;
  --ailp-muted-foreground: #64748b;
  --ailp-border: #e2e8f0;
  --ailp-radius-sm: 6px;
  --ailp-radius-md: 10px;
  --ailp-radius-lg: 14px;
  --ailp-shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.05);
  --ailp-shadow-md: 0 4px 12px rgba(15, 23, 42, 0.08);
  --ailp-shadow-glow: 0 0 30px rgba(99, 102, 241, 0.25);
  --ailp-font-math: "Cambria Math", "Latin Modern Math", "STIX Two Math", Georgia, serif;
}
```

**语义色不动**：`--ok / --warn / --err` 三族（绿/琥珀/红）是状态语义，保持原值。注意 `--warn-bg: #fffbeb` 与旧 brand-faint 同值属巧合，不要误伤。

### 2.2 品牌渐变规范

所有"主 CTA / Logo / 悬浮球 / 强调横幅"统一使用：

```css
background: linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%);
```

普通主按钮用纯色 `#4f46e5`，hover `#4338ca`；渐变只给最重要的一个主按钮每屏最多一处，禁止满屏渐变。

### 2.3 布局壳换肤（TeacherV3Layout）

1. **侧边栏**：保留 DOM 结构与交互，只换视觉——
   - 若现为深色：底色改为深靛蓝系（`#1e1b4b → #312e81` 渐变或纯 `#312e81`），激活项 = 左侧 3px 圆角青色指示条（`#06b6d4`）+ 背景 `rgba(99,102,241,.18)` + 图标/文字白；
   - 若现为浅色：白底，激活项 = `--brand-faint` 背景 + `--brand` 文字 + 同款指示条；
   - Logo 区加渐变（2.2 规范）。
2. **顶栏**：白底 + `--ailp-border` 底边；搜索框/图标按钮 hover 用 `--ailp-muted`。
3. **悬浮球**：教师端内所有 FloatingButler / ButlerFab 视觉统一为新设计（紫青渐变 + AI 图标 + 呼吸光晕，动效见 2.6）；备课路由按 Layer 2 换成新的 PrepFab（主球 + 4 子按钮）。

### 2.4 组件级换肤（teacher-v3.css 逐类更新）

| 组件 | 新样式 |
|---|---|
| 卡片 | 白底、`--radius-lg`(14px)、`--ailp-shadow-sm`，hover 上浮 2px + `--ailp-shadow-md` |
| 主/次按钮 | 见 2.2；次按钮白底 + `--ailp-border` + hover `--ailp-muted` |
| 标签/徽章 | 默认 `--brand-faint` 底 + `--brand` 字；成功/警示/危险用语义色浅底 |
| 表单输入 | `--ailp-border` 边框、focus 时 `ring: rgba(99,102,241,.3)` |
| 表格/列表 | 斑马纹用 `--ailp-muted`；hover 行 `--brand-faint` |
| 分页/步骤条/Tab | 激活态 `--brand`（Tab 下划线 2px），步骤指示器仿 textbook-select.html 顶部样式 |
| 空状态 | 插画占位 + 靛蓝渐变图标 + 引导按钮 |
| 对话气泡 | AI 侧用 `.ai-bubble-gradient`（渐变浅底 + 靛蓝细边），用户侧纯 `--brand` |

### 2.5 图表配色（ECharts）

全局新建 `src/utils/chartPalette.ts` 导出统一色板，替换教师端所有 ECharts option 中的 `color` 数组：

```ts
export const TEACHER_CHART_COLORS = [
  '#4f46e5', '#06b6d4', '#818cf8', '#22d3ee',
  '#4338ca', '#67e8f9', '#a5b4fc', '#155e75',
];
```

同时检查 series 内硬编码色（`itemStyle.color`、`areaStyle` 等）替换为色板取值。**只改教师端引用到的图表**，学生端图表不动。

### 2.6 动效规范（全站统一，来自设计稿 CSS）

- AI 光晕呼吸：`ai-glow::after`（blur 12px，opacity 0.6）——悬浮球、AI 入口；
- 进入动画：`fade-in-up`（translateY 16px→0 + opacity，stagger 80-120ms）用于页面主区块；
- 悬浮：卡片 hover `translateY(-2px)` + 阴影升级；
- keyframes 统一放 `src/styles/prep-center.css`（新建，同 Layer 2 共用），前缀 `prep-`；
- 遵循 `prefers-reduced-motion` 降级。

### 2.7 图标策略

- 备课中心新页面：Lucide（`lucide-vue-next`），与设计稿 `data-lucide` 图标名一一对应；
- 换肤模块：保留现有 `@vicons/ionicons5` 图标组件**不改名不换库**，仅通过 CSS 统一颜色/线宽观感；
- 共享壳（侧边栏/顶栏/悬浮球）可选迁移到 Lucide，属于加分项非必须。

---

## 3. Layer 2：备课中心 1:1 重构

**严格按照 `docs/teacher-v3/AGENT_PROMPT_PREP_REDESIGN.md` 执行**，该文档包含：页面映射表（7 页 ↔ 新 Vue 页面 ↔ 替换的旧页面）、保留换壳清单（悬浮球/绘图/公式/拍照/上传解析/AI 对话）、抛弃清单（PrepView 表单向导、PrepDeskWorkspace 来源桌、TeacherCompanionDock 伴侣坞、备课场景左侧边栏）、逐页结构指令、实施 Phase 与验收标准。

执行时注意与本总指令的两处对齐：

1. **令牌作用域**：用本文件的 `.theme-teacher` 替代原文件的 `.theme-prep`；`prep-center.css` 里的工具类（`.ai-glow` / `.gradient-text` / `.ai-bubble-gradient` / `.math-display` / `.math-inline`）从 `colors_and_type.css` 移植；
2. **布局禁令**：编辑器与模板库的双栏布局必须用 flex 双栏 + 各自 `overflow-y:auto`，禁止 fixed + calc 百分比 padding（已验证会导致白屏）。

**备课链路沉淀的资产可复用到其他模块**（仅样式层）：
- PrepFab 悬浮球结构、资源卡片样式、AI 面板三 Tab 布局、步骤指示器、空状态；
- 其他模块想引入时只允许套皮，不允许改变该模块既有功能行为。

---

## 4. 各模块换肤细则（Layer 1 逐页走查表）

> 每个模块：先读现有实现确认结构与逻辑，再按 2.3/2.4/2.5 换肤。**结构性改动一律不做**。

| 模块 | 页面 | 换肤要点 |
|---|---|---|
| 今日教学 | `TodayView.vue` | 日程/课表卡、快捷入口卡按新卡片规范；今日重点数字用 `--brand` |
| 题库 | `BankView.vue` | 章节树/筛选器/题目卡换肤；题目难度标签用新标签规范；拍照导题入口按钮换渐变 |
| 组卷 | `QuizView.vue` | 组卷表单、试卷预览卡换肤；题型分布饼图接 2.5 色板 |
| 作业与批改 | `AssignView.vue` | 作业列表卡、批改状态徽章换肤；批改进度条用靛蓝→青渐变 |
| 课堂互动 | `ClassroomView.vue` | 互动工具卡、实时反馈面板换肤；大屏授课态保持可读性优先 |
| 学情洞察 | `InsightsView.vue` | 全部图表接 2.5 色板；薄弱点卡片、掌握度进度条换肤 |
| 资源中心 | `ResourcesView.vue` | 资源卡对齐备课资源抽屉的卡片样式（类型角标+操作按钮），形成全站一致的资源卡语言 |
| 课件 | `SlidesView.vue` | 课件卡与预览壳换肤 |
| 全局壳 | `TeacherV3Layout.vue` | 2.3 全部三项 |

---

## 5. 实施顺序（严格按 Phase 提交）

1. **Phase 1 主题基建**：`.theme-teacher` 作用域令牌 + `prep-center.css`（工具类/动效）+ ECharts 色板工具 + TeacherV3Layout 根容器挂类。验收：教师端全站变色、`npm run typecheck` 通过、学生端/管理端截图对比零变化。
2. **Phase 2 布局壳换肤**：侧边栏/顶栏/悬浮球（按 2.3）。
3. **Phase 3 备课中心重构**：按 AGENT_PROMPT_PREP_REDESIGN.md 的 Phase 2-5（首页 → 三入口链路 → 生成页 → 编辑器+资源抽屉），抛弃旧备课 UI。
4. **Phase 4 各模块换肤走查**：按第 4 节逐模块过，每模块一小节提交。
5. **Phase 5 清理与回归**：清理琥珀残留（见验收第 4 条 grep）、跑全量测试、修复换肤引起的测试失效。

---

## 6. 验收标准

1. **备课中心**：7 页与设计稿逐屏对比一致；全链路（首页→三入口任一→生成→编辑器→资源抽屉→插入资源）可走通。
2. **其他模块功能零回退**：`npm run test` 全绿；各页面操作流程与重构前一致。
3. **视觉一致性**：教师端任意两页的卡片/按钮/标签/圆角/阴影/动效观感统一；与设计稿并排对比不违和。
4. **琥珀清零**：在教师端作用域文件内执行 `grep -rn "f59e0b\|fb923c\|b45309\|fef3c7" src/`，除 `--warn` 语义族与注释外应为 0 命中。
5. **隔离验证**：学生端/管理端/教研端截图与改造前对比，像素级无变化（`.theme-teacher` 未泄漏）。
6. **工程质量**：`npm run typecheck` 0 错误；`npm run build` 成功；控制台无报错。

---

## 7. 禁止事项

1. 禁止改学生端/管理端/教研端的任何文件与令牌。
2. 禁止直接修改 `:root` 下的 v4 令牌值——只能通过 `.theme-teacher` 作用域覆盖。
3. 禁止在换肤模块重构业务逻辑、改路由结构、改 store、改 API 层。
4. 禁止在备课中心引入琥珀色；禁止恢复左侧边栏/右侧多 Tab 伴侣坞/来源桌/表单式起草向导。
5. 禁止引入 Tailwind CDN 或 tailwindcss 依赖——设计稿样式一律翻译为 scoped CSS + 令牌。
6. 禁止重写 DrawBoard/MathField/useFileUpload/Butler 对话等保留组件的核心逻辑，只允许换外壳样式与挂载方式。
7. 禁止用 emoji 作功能图标（设计稿文案中的 🎉 属内容，可保留）。
8. 禁止 fixed + calc 百分比 padding 的双栏布局（会白屏）。
9. 禁止每屏多处渐变滥用；渐变只给品牌 CTA/Logo/悬浮球。
