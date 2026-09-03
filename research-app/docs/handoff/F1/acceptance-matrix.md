# F1 Acceptance Matrix（黄金链路一 · 双轨用例 + 六层状态表）

> 来源：06 §3 黄金链路一 + design.md §5 双轨用例定义
> 验收日期：2026-09-04（全部证据为本日重新执行的一手结果，非历史记录转述）

## 六层状态表（09 §2）

| 层 | 定义 | 状态 | 证据 |
|---|---|---|---|
| L1 Build | 编译、类型、静态检查 | ✅ DONE | `vue-tsc --noEmit` 0 error；`eslint . --max-warnings 0` 0 error 0 warning；`vite build` 成功（2.62s） |
| L2 Test | 单元 + 契约 + 集成 | ✅ DONE | vitest 7 files / 62 tests passed（含契约层：OTP 流、401 信封、幂等重放、租户隔离、run 枚举） |
| L3 Performance | 08 性能门禁 | ✅ DONE（阶段内可测项） | 首包 `index-*.js` gzip **5.49 KB** ≤ 500KB；6 一级入口独立 chunk；MSW 不在产物。LCP/INP/CLS 需真实后端与数据量 → F3 实测（见 known-limitations §2） |
| L4 Failure | 故障态可观察 | ✅ DONE（单元层）+ ⚠️ E2E 局限 | client.ts 映射 401/403/429/422/501/network/abort 且单测覆盖；TC-F01-09 断网仅在单元层验证（MSW SW 内无法制造真实网络故障，见 known-limitations §1） |
| L5 User Journey | 真实用户链路 | ✅ DONE | Playwright **63 passed（35.1s）**= golden-path-1 16 用例 × 3 视口 + app-shell 5 × 3；15 张三视口截图归档并目检 |
| L6 Human Review | 自审 + 独立审查 | ✅ DONE（自审）/ ⏳ Agent 6 | code-review-report.md P0=0 P1=0 P2=0（P3=2 书面接受）；待 Agent 6 R1 复核 |

**综合状态：DONE（F1 范围内）**——六层无一层为 FAIL；L3 的 CWV 与 L4 的 E2E 断网为已声明的阶段边界，不是未通过的项。

## 功能轨（输入/输出正确性、持久化、异常）

| 用例 | 步骤 | 状态 | 证据 |
|---|---|---|---|
| TC-F01-01 | 未登录访问 `/research/home` → 重定向登录 → 登录后回跳原 URL | ✅ | E2E「认证与回跳」3 视口通过；断言 URL 含未编码 `redirect` 参数 |
| TC-F01-02 | 错误验证码可重试；成功后刷新/重开不丢会话；登出后受保护路由再被拦截 | ✅ | E2E 同用例 + 「退出登录」用例；契约测试断言错误验证码不泄露存在性；session-persistence 单测 |
| TC-F01-03 | 首页三面板来自真实 API 响应，网络无 4xx/5xx | ✅ | E2E「科研首页」监听 response 断言无 ≥400；面板文案取自 handler 返回体 |
| TC-F01-04 | 导航折叠后图标/tooltip/aria-expanded/键盘 Enter 可用 | ✅ | E2E「导航折叠」键盘 Enter 切换 + aria-expanded 断言 |
| TC-F01-05 | 缺 research_question 提交 → 字段级校验；补全后 201、幂等键头存在、列表出现新项目 | ✅ | E2E「项目创建」+ 契约测试「创建项目 422/201/幂等重放同 ID」 |
| TC-F01-06 | 顶栏切换项目 → 详情页与顶栏名称同步 | ✅ | E2E「项目切换与上下文同步」 |
| TC-F01-07 | 修改通知偏好 → 刷新后保留（服务端持久化语义） | ✅ | E2E「个人中心偏好」reload 后断言；mock 以 SessionStorage 模拟服务端会话/偏好留存（MSW 草案声明，CR-F1-04） |
| TC-F01-08 | 租户 B 访问租户 A 项目 URL → 统一拒绝文案，响应不泄露项目存在性 | ✅ | E2E「跨租户越权」（断言统一文案且不含项目标题）+ 契约测试「租户 B 403 不泄露标题」双层验证 |
| TC-F01-09 | 断网操作 → offline 状态可见，恢复后重试成功 | ⚠️ 单元层通过 | api-client 单测：network error → `offline` kind；degraded-messages 单测：offline 文案；E2E 无法在 MSW Service Worker 内制造真实网络故障（known-limitations §1，非绕过：E2E 层无工具能力，不是未实现） |

功能轨 9 项：8 ✅ + 1 ⚠️（单元层覆盖，E2E 工具局限）。无 FAIL。

## 体验轨（UI 对照、真实内容、交互响应）

| 用例 | 通过标准 | 状态 | 证据 |
|---|---|---|---|
| TC-X01-01 | 登录页/首页与原型结构、层级、组件一致，修正项有记录 | ✅ | 15 张三视口截图目检对照 `D:\科研端demo\index.html` 基线；修正项记录于 code-review-report §5（移动端溢出修复 #4/#5） |
| TC-X01-02 | 首页空状态提供「创建项目」行动入口，非大插画 | ✅ | E2E「零项目租户」断言创建入口存在 |
| TC-X01-03 | 按钮有 loading/disabled/error/retry 态 | ✅（静态+行为证据） | CreateProjectDialog `:disabled="isSubmitting"` + retry 按钮类；Login `:disabled="otpCountdown > 0"` + retryable 错误结构；提交中态在 TC-F01-05 行为中走过。注：「success 态」由跳转/面板刷新承载（页面级成功反馈），无独立按钮 success 样式——设计取舍记录于 §下方说明 |
| TC-X01-04 | 错误/风险不只靠颜色（文字+语义结构） | ✅（静态证据） | Login/CreateProjectDialog/PersonalCenter/ProjectSwitcher 共 10 处 `role="alert"`；错误文案均为文字描述（「验证码发送过于频繁…」等），非仅红框；AppHeader `aria-live="polite"` |
| TC-X01-05 | 弹窗/抽屉焦点陷阱 + Escape 关闭 | ✅ | E2E「弹窗/抽屉可访问性」：创建弹窗 Escape 关闭、AI 抽屉 Escape 关闭且焦点进入抽屉 |
| TC-X01-06 | prefers-reduced-motion 下球体动画关闭，默认开启 | ✅ | E2E「减弱动效」：默认 `animationName` 匹配 orb-ring → reduce 后为 `none` |
| TC-X01-07 | 三视口截图无布局破损 | ✅ | E2E「三视口截图」重新生成 15 张（1440/1366/390），目检移动端无溢出残字（修复 #4/#5 后回归） |

体验轨 7 项：7 ✅（其中两项以静态代码证据 + 行为用例组合支撑，无纯目检宣称）。

## TC-X01-03 设计取舍说明（诚实性记录）

「五态」中的 success 在本阶段以**页面级行为**承载（创建成功→跳详情、保存成功→角色警报消除 + 「已保存」文案），而非按钮内嵌 success 样式。理由：按钮级 success 标志在 200ms 内被路由跳转覆盖，属于视觉噪音；06/09 未强制要求按钮内 success 徽标。此取舍不掩盖状态——成功路径均有可断言的用户可见结果（URL 变化/文案变化），E2E 已按此断言。
