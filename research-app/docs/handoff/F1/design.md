# F1 设计文档：登录、首页、项目和个人中心

> 阶段：F1｜负责智能体：Agent 1（前端与体验）｜日期：2026-09-04
> 前置：F0 已提交（`81c2d24`）；M0 契约 research-contracts v0.1.0 已冻结。

## 1. 范围（来自提示词 F1 里程碑）

| 交付项 | 来源 | F1 状态 |
|---|---|---|
| 真实认证接入 | 提示词 F1 | 前端完整认证态机 + 会话 API 层；端到端真实 issuer 依赖 Agent 2（见 §6 契约请求） |
| 科研首页 | 提示词 F1 | 接线 projects（M4 v2.0）+ runs（M0 v0.1.0），空/加载/错误态齐备 |
| 项目创建/切换 | 提示词 F1 | 基于 M4 v2.0 `POST /projects`（ProjectCreate：title、research_question、domain、stage、visibility） |
| 个人中心 | 提示词 F1 | 语言/通知偏好读写；preferences 端点缺失 → 契约请求 + 本地草稿类型 |
| 左侧折叠导航 | 提示词 F1 | F0 已交付；F1 补齐键盘走查与项目切换器接线 |
| AI 管家空壳状态 | 提示词 F1 | F0 已交付球体/抽屉；F1 接入 M0 `GET /runs` 真实任务列表 |

**不在 F1 范围**：文献导入、PDF、翻译、LaTeX、评审、Lean（F2–F4）；不做巨型图可视化（项目工作区用列表 + 状态时间线）。

## 2. 契约现状与差距分析（设计前提）

| 契约 | 版本 | 状态 | F1 可用端点 |
|---|---|---|---|
| research-contracts（Agent 2 M0 冻结） | 0.1.0 | **已冻结** | `GET /runs`、`GET /runs/{id}/events`(SSE)、`/health/live`、`/health/ready` |
| M4 OpenAPI（需求级字段契约，M4 需求分析 §1 指定为字段级事实源） | 2.0.0 | 需求冻结 | `GET/POST /projects`、`GET /projects/{id}`（ProjectCreate：title*/research_question*/domain*/stage/visibility） |
| 认证端点 | — | **缺失** | 无 `/auth/*`，两份契约均未定义 |
| 偏好端点 | — | **缺失** | 无 `/me/preferences` |

决定：**不发明已冻结契约之外的字段语义**。项目实体字段全部取自 M4 ProjectCreate + 02 §4 通用字段（UUIDv7、`version` 乐观锁、`tenant_id`、RFC 3339、SHA-256 哈希）；auth/preferences 以推导类型写入契约请求单（§6），请 Agent 2 冻结后如有差异按契约调整。M0 冻结端点用 `openapi-typescript` 从 `openapi.json` 生成类型，走「生成客户端」正路。

## 3. 架构级决定：认证方案三候选比较（08 §8 分级要求）

| 维度 | 候选 A：`oidc-client-ts` | 候选 B：`oauth4webapi` 自组装 | 候选 C：自研 PKCE fetch 客户端 |
|---|---|---|---|
| 成熟度 | Ory 维护，广泛生产使用 | Auth0 维护，偏底层 | 无 |
| 功能完整 | silent renew、userStore、事件回调齐备 | 仅原语，session/事件自理 | 全部自理 |
| 页面密度/研发成本 | 最低（~1 天接线） | 中（~2-3 天） | 高（>5 天，安全风险自担） |
| 体积 | ~30KB gzip，可按路由懒加载 | ~8KB | 0 |
| 许可证 | MIT（ reusable，记 reuse-ledger 简卡） | MIT | — |
| 与 M4 安全门禁（OIDC、短期 token）匹配 | 完全 | 完全但费劲 | 完全但易错 |

**采用 A**。但注意：M4 原型登录交互是手机号 + OTP（F0 Login.vue 1:1 还原对象），与 OIDC 授权码流程需后端 OTP → OIDC 桥接。决定：**交互层保持原型（手机号+OTP）；协议层实现会话令牌模型（POST /auth/session、GET /auth/me、DELETE /auth/session），并预留 OIDC 升级路径**——`features/auth` 暴露统一 `useSession()` 接口，若 Agent 2 契约请求单裁决走 OIDC 网关，仅替换 `authClient` 实现，UI 与路由守卫零改动。此为 F1 内可逆的最小决定。

## 4. 页面架构与 15 态矩阵

### 4.1 新增/改造清单（feature-sliced 边界）

```text
src/
├── app/
│   ├── api/client.ts            # fetch 封装：Envelope 解码、Problem Details、401/403 映射、AbortController
│   ├── api/m0-types.gen.ts      # openapi-typescript 从 M0 openapi.json 生成（冻结契约）
│   ├── providers/query.ts       # TanStack Query provider
│   ├── router.ts                # + meta.requiresAuth + 全局守卫
│   └── stores/session.ts        # 认证态（token/账户/状态），纯前端事实不含服务端列表
├── features/
│   ├── auth/use-session.ts      # 会话探测/登录/登出用例
│   └── projects/use-projects.ts # 列表/创建/切换用例（vue-query）
├── entities/
│   ├── project/types.ts         # Project（M4 ProjectCreate + 02 §4 通用字段推导）
│   └── run/types.ts             # Run（M0 契约）
├── widgets/
│   ├── CreateProjectDialog/     # 新建项目弹窗（必填校验、幂等键、提交状态）
│   └── ProjectSwitcher/         # 顶栏项目切换
└── pages/research/
    ├── Login.vue                # F0 骨架 → 接线真实登录
    ├── Home.vue                 # F0 占位 → 数据接线
    ├── Projects.vue             # F0 占位 → 列表+创建+切换
    └── PersonalCenter.vue       # → 偏好读写
```

### 4.2 状态矩阵（每异步功能 ≥ 提示词要求的 15 态）

| 页面/功能 | 适用状态与触发 |
|---|---|
| 登录 | `initial`→`loading`(提交)→`succeeded`；`failed+retryable`(验证码错误/网络)；`forbidden`(账户封禁，文案不泄露存在性)；`offline`(探测失败)；`rate_limited`(并入 failed+retryable，倒计时) |
| 会话探测 | `loading`→`succeeded`(进入应用)/`failed`(跳登录)；401→`initial` |
| 首页聚合 | `loading`(骨架)→`succeeded`；`empty`(零项目→引导创建)；`failed+retryable`(局部模块错误，Boundary 隔离不整页崩)；`offline` |
| 项目列表 | 同上 + `forbidden`(403)；空状态引导创建项目 |
| 创建项目 | `loading`(提交)→`succeeded`(跳转)；校验错误(字段级)；`failed+retryable`；重复提交禁止 |
| 项目详情/上下文 | `loading`→`succeeded`；404→`not_found` 态；403→`forbidden` 态（**不泄露项目存在性**） |
| 个人中心偏好 | `loading`→`succeeded`→`saving`→`saved`/`save_failed+retryable`；刷新持久化由服务端保证 |
| AI 管家任务列表 | `loading`→`succeeded`(M0 runs)；`empty`；SSE 断线→`offline`+重连 |

不适用状态的省略必须在 code-review 中逐条给出理由（例如登录页无 `queued`）。

## 5. 黄金链路一 → 双轨验收用例

依据 06 §3 六步 + 09 视觉/交互门禁。

### 功能轨（输入/输出正确性、持久化、异常）

| 用例 | 步骤 | 通过标准 |
|---|---|---|
| TC-F01-01 | 未登录访问 `/research/home` | 重定向 `/research/login`，登录后回跳原 URL |
| TC-F01-02 | 手机号+OTP 登录（错误验证码 1 次） | 字段级错误、可重试；成功后 token 存储且刷新不丢 |
| TC-F01-03 | 登录进入首页 | 最近项目/运行任务/评审摘要来自真实 API 响应；网络面板无 4xx/5xx |
| TC-F01-04 | 导航折叠 | 折叠后图标、tooltip、aria-expanded、键盘 Tab/Enter 全可用 |
| TC-F01-05 | 创建项目（缺 research_question 提交） | 字段级校验错误；补全后 201，幂等键头存在，列表出现新项目 |
| TC-F01-06 | 顶栏切换项目 | 当前项目名、AI 管家抽屉上下文同步更新 |
| TC-F01-07 | 个人中心改语言/通知偏好 → 刷新 | 偏好仍保留（服务端持久化） |
| TC-F01-08 | 租户 B 用户访问项目 A URL | 403 页面，文案与响应不泄露项目 A 存在性（Problem Details） |
| TC-F01-09 | 断网操作 | `offline` 状态可见，恢复后重试成功 |

### 体验轨（UI 对照、真实内容、交互响应）

| 用例 | 通过标准 |
|---|---|
| TC-X01-01 | 登录页/首页与原型截图对照：结构、层级、组件一致；修正项有记录 |
| TC-X01-02 | 首页空状态提供「创建项目/导入文献」行动入口，非大插画 |
| TC-X01-03 | 所有按钮有 loading/success/error/disabled/retry 五态 |
| TC-X01-04 | 错误/风险不是仅靠颜色（文字+图标语义） |
| TC-X01-05 | 弹窗/抽屉焦点陷阱 + Escape 关闭 |
| TC-X01-06 | `prefers-reduced-motion` 下球体动画关闭 |
| TC-X01-07 | 三视口（1440/1366/390）截图无布局破损 |

## 6. 契约请求单（需 Agent 2 冻结）

| ID | 请求 | 推导依据 | 前端临时策略 |
|---|---|---|---|
| CR-F1-01 | `POST /auth/session`（手机号+OTP → access/refresh） | M4 §11 安全门禁 + 原型 OTP 交互 | 契约草案类型 + MSW 可观察标记 |
| CR-F1-02 | `GET /auth/me`（会话探测、账户、租户） | 02 §4 tenant_id | 同上 |
| CR-F1-03 | `DELETE /auth/session`（登出） | 对称性 | 同上 |
| CR-F1-04 | `GET/PATCH /me/preferences`（语言、通知、时区） | 06 §3 步骤 5 | 同上 |
| CR-F1-05 | `GET /projects` 响应 data 字段冻结（分页 cursor） | M4 v2.0 /projects | 按 ProjectCreate+通用字段推导 |
| CR-F1-06 | `/runs` 响应 data 确认（M0 openapi data 为空 schema） | M0 v0.1.0 | 生成类型 + 手动 Run 接口对齐 |

## 7. 降级与诚实性设计（08 §6 红线）

- 无真实后端可对接的端点（auth/preferences）：dev/test 用 MSW 实现**契约草案**，UI 顶部常驻「契约草案数据源」徽标，构建产物不含 MSW；**不伪造成功假象**。
- M0 `/runs` 若返回 501（M0 描述明示 honest 501）：任务卡片显示 `not_wired` 降级态与原因，不显示假数据。
- 所有 fallback 可观察、可测试：`degraded-messages.ts` 扩展 F1 文案。

## 8. 实施顺序（金路径优先）

1. API 层（envelope/Problem Details/错误映射）+ MSW 契约草案 server
2. 认证态机 + 登录页接线 + 路由守卫（金路径起点）
3. 项目列表/创建/切换
4. 首页接线 + 个人中心
5. 单测/契约测试/E2E（TC-F01-01..09, TC-X01-01..07）+ 三视口截图
6. code-review 自审（P0/P1=0）+ handoff
