# F1 Handoff · 科研端前端

> 日期：2026-09-04｜负责智能体：Agent 1（前端与体验）｜阶段：F1（认证、首页、项目、个人中心）
> 分支：`research/agent-01-frontend`｜worktree：`D:\科研端worktrees\agent-01-frontend`｜前置：F0（`81c2d24`）

## 六层状态表（09 §2，本日全量重跑取证）

| 层 | 状态 | 关键证据 |
|---|---|---|
| L1 Build | ✅ DONE | vue-tsc 0 error；eslint 0/0；build 成功，首包 gzip 5.49KB，MSW 不在产物 |
| L2 Test | ✅ DONE | vitest 7 files / 62 tests passed（含契约层租户隔离/幂等/枚举断言） |
| L3 Performance | ✅ DONE（阶段内可测项） | 首包 ≤500KB、6 入口独立 chunk；CWV→F3（MSW 0 延迟下测量无证据价值） |
| L4 Failure | ✅ 单元层 / ⚠️ E2E 断网工具局限 | 401/403/429/422/501/network/abort 全映射且有单测；TC-F01-09 见 known-limitations §1 |
| L5 User Journey | ✅ DONE | Playwright 63 passed（35.1s）×3 视口；15 张截图归档目检 |
| L6 Human Review | ✅ 自审 DONE / ⏳ Agent 6 | code-review-report P0=0 P1=0 P2=0（P3=2 书面接受） |

综合：**DONE（F1 范围内）**。详见 `acceptance-matrix.md`。

---

## 1. 用户现在能完成什么以前不能完成的任务

黄金链路一（06 §3 前四步）端到端可走通：

1. **登录**：手机号 + 验证码登录（未登录访问受保护路由被重定向并回跳；错误验证码可重试；刷新/重开会话不丢；可退出登录）。
2. **科研首页**：最近项目、正在运行任务、待处理评审三个面板来自真实 API 响应；零项目租户得到创建引导而非大插画。
3. **项目创建/进入/切换**：字段级校验（标题/研究问题/学科领域，与 M4 ProjectCreate 冻结契约一致）、幂等键提交、创建后进入详情；顶栏切换器全局同步当前项目上下文。
4. **个人中心**：通知偏好读写，刷新后保留；账户信息来自 `/auth/me`。
5. **跨租户保护**：租户 B 访问租户 A 项目 URL 得到统一拒绝文案，不泄露项目存在性。

> 诚实性声明：auth/preferences 端点后端尚未冻结（契约请求单 CR-F1-01..04），当前运行在 MSW 契约草案上，UI 常驻「契约草案数据源」徽标；`/runs` 为 M0 冻结契约真实 schema。生产构建不含 MSW（见 §4.4）。

## 2. 公共契约与目录变化

### 2.1 F1 新增/改造（feature-sliced 边界，与 design.md §4.1 一致）

```text
research-app/
├── .env.development / .env.production       # VITE_USE_MOCK：dev=true / build=false
├── public/mockServiceWorker.js              # MSW worker（仅 dev/test 生效）
├── vite.config.ts                           # __USE_MOCK__ 编译期常量；生产产物剔除 msw
├── src/
│   ├── app/
│   │   ├── api/client.ts                    # fetch 封装：Envelope 解码、Problem Details、
│   │   │                                    #   401/403/429/422/501/network/abort 错误映射
│   │   ├── api/m0-schema.gen.d.ts           # openapi-typescript 生成（M0 v0.1.0 冻结契约）
│   │   ├── api/m4-schema.gen.d.ts           # openapi-typescript 生成（M4 v2.0 字段契约）
│   │   ├── config.ts                        # 运行配置唯一读取点
│   │   ├── stores/session.ts                # 认证态（probing/authenticated/anonymous）
│   │   └── router.ts                        # + meta.requiresAuth + 全局守卫 + redirect 回跳
│   ├── entities/{project,run}/types.ts      # Project（M4+02§4 推导）、Run（M0）
│   ├── features/
│   │   ├── auth/use-session.ts              # probe 单飞/登录/登出（失败不伪装成功）
│   │   └── projects/use-projects.ts         # 列表/详情/创建（创建成功失效列表缓存）
│   ├── mocks/                               # MSW 契约草案（db/handlers/session-persistence）
│   ├── shared/lib/use-dialog-a11y.ts        # 弹窗/抽屉焦点陷阱 + Escape 层栈（TC-X01-05）
│   ├── shared/ui/DataSourceBadge.vue        # 「契约草案数据源」常驻徽标（08 §6 可观察降级）
│   ├── widgets/CreateProjectDialog/         # 新建项目弹窗（校验/幂等键/提交态）
│   ├── widgets/ProjectSwitcher/             # 顶栏项目切换器
│   └── pages/research/ProjectDetail.vue     # 项目详情（阶段时间线/403/404 态）
├── tests/
│   ├── unit/{api-client,use-session}.test.ts
│   ├── contract/contract-draft.test.ts      # MSW 契约草案与冻结契约的静态+行为断言
│   └── e2e/golden-path-1.spec.ts            # 黄金链路一 16 用例 × 3 视口
└── artifacts/acceptance/f1/*.png            # 5 页面 × 3 视口 = 15 张截图
```

### 2.2 对既有核心的修改（最小侵入）

- `GlobalNav.vue`：移除 RouterLink 上的 `role="listitem"`（恢复 link 语义）；≤1279px 隐藏文字标签与 64px 栅格列对齐。
- `AppHeader.vue`：科研智能体文案包一层 span；≤760px 隐藏状态文案/智能体文案/账户名（修复布局视口溢出，见 §5 修复记录）。
- `AgentDrawer.vue`：接入 use-dialog-a11y。
- `router.ts`：新增 `meta.requiresAuth` 与登录回跳；六个一级入口与 F0 完全一致，未破坏任何接口。

## 3. 外部项目与许可证

- **新增采用**：`msw`（MIT，browser+node 双模式契约草案）；`openapi-typescript`（MIT，仅 devDependency 生成类型）。
- **沿用 F0 账本**：TanStack Query、Pinia、Vue Router、lucide-vue-next 等，无变更。
- **OIDC 决策**（design.md §3）：采用 `oidc-client-ts` 为升级路径但 F1 未引入依赖——当前实现会话令牌模型（POST/DELETE /auth/session + GET /auth/me），协议实现隔离在 `features/auth` 的 authClient 后，Agent 2 裁决后可单点替换。reuse-ledger 简卡待实际引入时补记。

## 4. 真实测试与链路执行

### 4.1 单元 + 契约测试（vitest）

```text
Test Files  7 passed (7)
Tests       62 passed (62)
```

含契约层断言：OTP 登录流、401 信封、错误验证码不泄露存在性、创建项目 422/201/幂等重放同 ID、租户 B 403 不泄露标题、run status 枚举落在 M0 内。

### 4.2 类型检查与 Lint

```text
vue-tsc --noEmit        → 0 errors
eslint --max-warnings 0 → 0 errors, 0 warnings
```

### 4.3 E2E（Playwright，三视口 1440/1366/390）

```text
63 passed (36.8s)
= golden-path-1.spec.ts 16 用例 × 3 视口 + F0 app-shell 5 用例 × 3 视口
```

覆盖 TC-F01-01..08、TC-X01-02/05/06/07（TC-F01-09 见 known-limitations.md §1）。

### 4.4 生产构建与 MSW 排除

```text
npm run build → ✓ built in 2.71s
首包 dist/assets/index-*.js   gzip 5.49 KB（08 §2 门禁 ≤500KB）✅
MSW browser bundle            不在产物中（__USE_MOCK__ 编译期常量剔除，修复记录 #6）✅
六个一级入口                   各自独立 chunk ✅
```

### 4.5 视觉证据

`artifacts/acceptance/f1/`：login/home/projects/project-detail/personal × 1440/1366/390 共 15 张，均经目检（移动端截图确认顶栏/导航无溢出残字，见修复记录 #4/#5）。

## 5. 本阶段自检发现并修复的缺陷（完整记录见 code-review-report.md §5）

1. 导航链接被强制 `role="listitem"`，屏幕阅读器无法识别为链接（a11y 缺陷）。
2. 数据源徽标可访问名与可见文本不一致。
3. 创建弹窗未接焦点陷阱/Escape（TC-X01-05 未实现）。
4. **移动端顶栏溢出把布局视口撑到 504px**，Chrome 移动端整页缩放导致命中坐标错位——真实手机上表现为整页缩小发虚、按钮点不中。
5. ≤1279px 导航标签在 64px 列中被裁成残字（布局破损）。
6. MSW 292KB 误入生产构建（违反 design §7 红线）。
7. ESLint 对生成/压缩产物误报（ignorePatterns 补齐）。
8. TC-X01-06（reduced-motion）无自动化覆盖 → 补 E2E。

## 6. 仍为证据不足的项（不使用「基本完成」描述）

- TC-F01-09（断网）仅在单元层覆盖（network → offline/degraded 文案），E2E 无法对 Service Worker 内部拦截制造真实网络故障。
- Core Web Vitals（LCP/INP/CLS）：需真实后端与真实数据量才有意义，F3 阶段测量。
- 屏幕阅读器抽样：F5 阶段手动完成。
- OIDC 真实 issuer 端到端：依赖 Agent 2 冻结 CR-F1-01..04。

## 7. 集成负责人需执行的精确步骤

1. 审阅 `docs/handoff/F1/design.md §6` 契约请求单（CR-F1-01..06）并在 R1 裁决：auth/preferences 端点路径与字段；`/runs` data 字段确认。
2. 冻结后通知 Agent 1 拉取新 openapi.json，重新生成 `*.gen.d.ts` 并按真实契约替换 MSW handlers——前端 UI 与用例零改动（isomorphic 约束）。
3. 若裁决走 OIDC 网关：仅替换 `features/auth` 内 authClient 实现（oidc-client-ts），路由守卫与登录页零改动。

## 8. Handoff 清单

- ✅ `summary.md`（本文件，首屏含六层状态表）
- ✅ `design.md`（范围/三候选比较/15 态矩阵/契约请求单）
- ✅ `code-review-report.md`（P0=0、P1=0、P2=0，P3=2 书面接受）
- ✅ `acceptance-matrix.md`（双轨用例逐条证据 + 六层状态表）
- ✅ `test-report.md`（2026-09-04 全量重跑：vitest 62、Playwright 63、build 5.49KB）
- ✅ `known-limitations.md`（真实缺口/外部裁决依赖/设计取舍分节）
- ✅ 15 张三视口截图（本轮 E2E 重新生成并目检）
- ⏳ trace.zip 全量归档→F5；CWV 实测→F3（理由见 known-limitations）

## 9. 提交准备

```text
research(f1): 黄金链路一——认证/首页/项目/个人中心
- 会话令牌认证 + 路由守卫 + 401/403 不泄露存在性（CR-F1-01..04 契约草案 + MSW）
- M4 /projects 列表/创建（幂等键）/切换；M0 /runs 首页任务面板
- 个人中心偏好读写；契约草案数据源常驻徽标（可观察降级）
- 弹窗/抽屉焦点陷阱 + Escape 层栈；移动端视口溢出修复（布局视口 504→393）
- __USE_MOCK__ 编译期常量：生产构建剔除 MSW（首包 gzip 5.49KB）
- vitest 62 passed, vue-tsc 0 error, eslint 0/0, Playwright 63 passed (3 视口)
- 15 张三视口截图归档 artifacts/acceptance/f1/
```
