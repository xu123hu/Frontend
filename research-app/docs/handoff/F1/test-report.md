# F1 Test Report

> 08 §5.2 + 09 §2 L1/L2/L3 状态｜执行日期：2026-09-04（handoff 定稿当日全量重跑）
> 环境：Windows 11 / Node 22（nvm4w）/ chromium only / dev server 127.0.0.1:5173（MSW 契约草案模式）

## L1 Build（编译、类型、静态检查）

| 项 | 命令 | 结果 |
|---|---|---|
| 类型检查 | `npm run typecheck`（vue-tsc --noEmit） | **0 error** |
| 静态检查 | `npm run lint`（eslint . --ext .ts,.vue,.js --max-warnings 0） | **0 error, 0 warning** |
| 生产构建 | `npm run build` | 成功，2.62s，26 modules 输出清单见下 |

构建产物关键项（本次实测）：

| 产物 | gzip | 说明 |
|---|---|---|
| `index-*.js` | **5.49 KB** | 首包 ≤ 500KB 门禁 ✅（91 倍余量） |
| `page-home / page-project / page-literature / page-writing / page-review / page-education` | 0.83–5.41 KB | 6 个一级入口独立 chunk ✅ |
| `vendor-vue / vendor-tanstack / vendor-icons` | 1.96–37.01 KB | 框架层分包 |
| MSW bundle | **不存在** | `__USE_MOCK__` 编译期常量剔除（design §7 红线，修复记录 #6 复测通过） |

## L2 Test（单元 + 契约）

`npm run test`（vitest）：**7 files / 62 tests, all passed**（8.87s）

| 文件 | 覆盖 |
|---|---|
| `tests/unit/api-client.test.ts` | Envelope 解码、401/403/429/422/501 映射、network→offline、abort 不算失败、幂等键头 |
| `tests/unit/use-session.test.ts` | 探测单飞、登录成功/失败不伪装、登出清理 |
| `tests/contract/contract-draft.test.ts` | OTP 流、错误验证码不泄露存在性、创建项目 422/201/幂等重放同 ID、租户 B 403 不泄露标题、run status 枚举落在 M0 集合内 |
| 其余 4 个 F0 文件 | async-state 12 + async-data 11 + degraded-messages 4 + components 5（回归未破坏） |

## L3 Performance（08 硬门禁 · F1 阶段可测项）

| 指标 | 门禁 | F1 实测 | 测量条件 |
|---|---|---|---|
| 首包 gzip | ≤ 500 KB | **5.49 KB** ✅ | `vite build` 本地产物，vite 报告 gzip |
| 路由拆包 | 6 入口独立 chunk | ✅ | 同上 |
| 重模块不进首包 | PDF/CodeMirror/KaTeX 不在 F1 产物 | ✅ | 产物清单无 vendor-pdf/codemirror/katex |
| LCP / INP / CLS | LCP≤2.5s / INP≤200ms / CLS≤0.1 | **N/A→F3** | 需真实后端延迟与真实数据量；MSW 本地 0 延迟下测出的 CWV 无证据价值（诚实性：不伪造） |
| 10k 列表虚拟化 | F2 项 | N/A→F2 | — |
| 内存回归 | F1+ 项 | N/A→F3 | F1 无长会话重数据场景 |

## L4 Failure（故障态证据）

| 故障 | 覆盖层 | 证据 |
|---|---|---|
| 401 会话失效 | 单测 + 守为行为 | api-client 映射 + 登出后受保护路由拦截（E2E） |
| 403 跨租户 | 契约 + E2E | 统一文案不泄露存在性（双层） |
| 429 验证码限频 | 单测 + 页面 | retryable 错误 + 倒计时 disabled |
| 422 字段校验 | 契约 + E2E | 字段级错误 role="alert" |
| 501 not_wired | 单测 | run 卡片降级文案（M0 honest 501） |
| network 断网 | 单测 | error kind=offline + degraded 文案；**E2E 层未覆盖**（MSW SW 内无法注入真实网络故障）→ known-limitations §1 |
| abort/超时 | 单测 | aborted 不计失败、不重试 |

## L5 User Journey（真实链路）

`npx playwright test`（$env:CI='' 以复用已启动 dev server）：**63 passed (35.1s)**

- golden-path-1.spec.ts：16 用例 × 3 视口（1440/1366/390）
- app-shell.spec.ts：5 用例 × 3 视口（F0 回归未破坏）
- 截图：`artifacts/acceptance/f1/*.png` 15 张（本次运行重新生成）
- 注：trace.zip 未开启（trace 仅 `--trace on` 时生成）；失败时 reporter 自动保留 trace。F5 收尾阶段按 06 §2 补全量 trace 归档。

## L6 Human Review

- 自审：`code-review-report.md`（09 §3 只读自审模式产出）P0=0 / P1=0 / P2=0 / P3=2（书面接受）
- 人工走查：黄金链路一从登录起点完整操作（浏览器实测，非组件快照）
- 独立审查：待 Agent 6 R1 复核（本报告为其提供复现命令清单）
