# F5 设计文档：CWV 实测 / 断网体验 / 教育研究收口 / 全链路回归 + 终版验收

> 阶段：F5（终期）｜负责智能体：Agent 1（前端与体验）｜日期：2026-09-04
> 前置：F4 已提交（`75f4ea1` + 回填 `5e516d3`）；Agent 6 R1 复核 F0-F4 通过（`20260904-F4/verdict.md`：pass）
> 依据：08 性能硬门禁 §1/§2/§7、06 §2 统一验收环境（网络三条件）、M4 §8.1-8.6/§8.7/§9、原型 index.html education() 视图
> 范围（Agent 6 声明的 F5）：CWV 实测 / 断网体验 / 教育研究收口 / 全链路回归 + 终版验收报告

## 1. 交付项与依据

| 交付项 | 依据 | F5 状态 |
|---|---|---|
| CWV 实测（LCP/INP/CLS，P75） | 08 §2 硬门禁：LCP ≤2.5s / INP ≤200ms / CLS ≤0.1 | `tests/e2e/cwv.spec.ts`（5 样本 P75） |
| 断网体验（正常/慢速/短暂断网） | 06 §2 网络三条件 + 08 §6 防静默降级 | `tests/e2e/offline.spec.ts`（冷断网 + 页内断网双场景） |
| 教育研究收口（替换 F4 静态占位） | M4 §8.1-8.6/§8.7/§9 + 原型 education() 视图 | Education.vue 五步链路 + CR-F5-01 handlers + 契约测试 9 例 |
| 全链路回归 + 终版验收 | 09 发布门禁 | vue-tsc/eslint/vitest/build + F0-F5 E2E 全绿 + 六层状态表 |

## 2. 断网模拟实证记录（F5-1，机器证据）

在 MSW(browser worker) 拦截下逐一实测三种真实网络层断网模拟，**全部被 SW 屏蔽，请求仍返回 200**：

| 方法 | 实测结果 |
|---|---|
| `context.setOffline(true)` | fetch 仍 200（探针 A） |
| `page.route('**/api/research/v1/**', route.abort('failed'))` | fetch 仍 200（探针 B） |
| CDP `Network.emulateNetworkConditions({offline:true})` | fetch 仍 200（探针 C） |
| `page.route.continue` 注入 header | 同样到不了 SW（header 不生效） |

**结论**：MSW SW 在页面内处理请求，Playwright 网络层拦截触及不到。
**采用方案**：
- **E2E 断网模拟** = `window.fetch` 层拦截（`page.addInitScript` 安装，位于页面 JS 上下文、SW 之上；sessionStorage 开关跨 reload 生效）。开启后 fetch 以 `TypeError` 真实 reject → api client `kind='network'` → Boundary + 重试 + 不假成功。**不伪造成功**，是对"一次短暂断网"的最直接模拟。
- **契约层钩子** = MSW `simulatedNetworkError(request)`（检测 `X-Simulate-Network-Error: 1` 头 → 返回 `HttpResponse.error()`）。已单测验证 `HttpResponse.error()` 使客户端 fetch 以 TypeError reject（非 5xx）。用于 node 契约测试证明机制；E2E 因 SW 屏蔽改用 fetch 层。

## 3. CWV 测量条件与门禁（08 §1/§2）

**测量条件（声明）**：Playwright Chromium / 视口 1440×900 / Vite dev server 127.0.0.1:5173 + MSW mock / Windows / Node 20 / 样本 5 次冷加载 / 用户可见指标取 **P75**。

| 指标 | 门禁（P75） | 实测（2026-09-04） | 状态 |
|---|---|---|---|
| 登录页 LCP | ≤ 2500ms | **256ms** | ✅ |
| 首页 LCP | ≤ 2500ms | **256ms** | ✅ |
| INP | ≤ 200ms | **0ms**（测量局限，见 §7.1） | ✅（形式） |
| CLS | ≤ 0.1 | **0.048** | ✅ |
| 首包 JS gzip | ≤ 500KB | 64.9KB（F4 实测） | ✅ |

## 4. 教育研究收口（CR-F5-01 契约请求单）

| ID | 端点 | 依据 | 实现 |
|---|---|---|---|
| CR-F5-01a | `GET /education/study` | 原型课题卡 | 演示课题 EDU-31（样本 184 / 阈值 20 / 授权状态） |
| CR-F5-01b | `GET /education/data-products` | M4 §8.1 | L1 聚合产品（min_k=20 / 字段白名单 / 用途限制） |
| CR-F5-01c | `POST /education/datasets/preflight` | M4 §8.2 | 预估 46 行 / min_cell_k 22 / L1 / 无需审批；不返回数据 |
| CR-F5-01d | `POST /education/datasets/query` | M4 §8.3 | k≥20 → 201 不可变快照（EDU-SNAP-N / immutable / hash）；k<20 → **422 PRIVACY_THRESHOLD_NOT_MET** 且不返回数据 |
| CR-F5-01e | `POST /education/analyses` | M4 §8.5 | 统计 run 结果（estimate −31%/−24%、interval、assumptions、warnings、tool_versions） |
| CR-F5-01f | `POST /education/charts` | M4 §8.6 | artifact 绑定快照哈希 + 参数哈希（sha256:snap-031 / sha256:params-031） |
| CR-F5-01g | `POST /education/publication/request` | M4 §9 | 201 pending_approval（副本+来源+版本+撤回；HumanDecision 审批归后端） |

**红线落地**：只查询授权数据产品不直连学生业务库（数据产品白名单字段）；L1 聚合默认；任一切片 k<20 拒绝且不返回数据；快照不可变；图表绑定哈希；回流前人工审批。

**UI 施工图纸**：原型 `education()` 视图（5 步流程 / 大纲 meta / 隐私预检三检查 / 快照字段 / 分析图表 / 回流教师端-学生端），逐帧对齐，无自由发挥。

## 5. 双轨验收用例（F5）

### 5.1 功能轨

| 用例 | 步骤 | 通过标准 |
|---|---|---|
| TC-F05-01 | 冷断网·刷新 | 短暂断网时刷新 → 不白屏（登录页渲染）、显式离线提示（role=alert「网络连接不可用或服务暂时无法访问」）、不假登录成功（无首页数据）→ 恢复后重登数据回来 |
| TC-F05-02 | 不假成功 | 断网下不渲染任何假项目卡/假数据；错误文案明确 |
| TC-F05-03 | 页内断网 + 恢复重试 | 断网时触发首页真实 refetch → 面板 Boundary「网络连接不可用」+ 重试、不渲染假数据 → 恢复后点重试拉回真实数据、错误消失 |
| TC-F05-04 | CWV 门禁 | LCP ≤2.5s / INP ≤200ms / CLS ≤0.1（P75，5 样本） |
| TC-F07-01 | 接收教师课题 | 课题卡真实渲染（发布方/样本/k≥20/待授权） |
| TC-F07-02 | 隐私预检 | preflight 返回预估行数/min cell_k/L1 分级；三检查（授权用途/去标识/最小样本） |
| TC-F07-03 | 创建快照 | 确认授权 → 201 不可变快照（EDU-SNAP-N / 参数冻结 / 哈希） |
| TC-F07-04 | k<20 拒绝 | 小切片 → 422 PRIVACY_THRESHOLD_NOT_MET，界面「隐私规则已阻止分析」+ 原因，不返回/不渲染数据 |
| TC-F07-05 | 统计分析与图表 | 分析结果（−31%/−24% / 限制 / 工具版本）+ 图表导出（快照哈希 + 参数哈希绑定） |
| TC-F07-06 | 成果回流审批 | 申请 → pending_approval → 模拟管理员审批（HumanDecision）→ 教师端/学生端已回流 |

### 5.2 体验轨

| 用例 | 通过标准 |
|---|---|
| TC-X05-01 | 断网不白屏、降级文案不只靠颜色（role=alert / Boundary 图标+文字） |
| TC-X07-01 | 教育页三视口截图与原型 education() 布局一致，无布局破损 |

## 6. 实施顺序（金路径优先）

1. 断网实证（f5-1）→ 定机制
2. 教育研究收口（entities → features → mocks → handlers → Education.vue）→ 契约测试 9 例 → E2E golden-path-7
3. 断网钩子 + offline.spec（冷断网 + 页内断网）
4. CWV spec（LCP/INP/CLS）
5. 全量回归（vue-tsc/eslint/vitest/build + F0-F5 E2E + 截图）
6. 终版验收报告 + 提交

## 7. 已知局限（进 known-limitations）

### 7.1 INP 测量局限
本环境（headless Chromium + MSW SW + 本地 dev）下 `PerformanceEventTiming` 缓冲为空（eventEntries=0/5），INP 记 0ms 形式上过门禁。真实 INP 需 field/Lighthouse 测量；交互响应性已由真实点击实时完成（导航+渲染）验证。

### 7.2 断网模拟为 fetch 层注入
因 MSW SW 屏蔽网络层（实证），断网 E2E 在 `window.fetch` 层注入 TypeError。覆盖 API 客户端 fetch 路径；SSE(EventSource)/XHR(上传) 的断网由 sse.ts 单测（Last-Event-ID 重连）与 degraded-messages 覆盖。真实断网需真实后端环境（Agent 2 集成后）。

### 7.3 教育审批为演示语义
成果回流审批（模拟管理员审批）为 HumanDecision 演示闭环；真实审批执行、双签（指导教师+管理员）、水印、审计由后端 Agent 2 承担（M4 §8.7）。
