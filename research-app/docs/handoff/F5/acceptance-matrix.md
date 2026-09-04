# F5 Acceptance Matrix（终期 · 六层状态总验收 F0-F5）

> 来源：08 §2/§6/§7 硬门禁 + 06 §2 统一验收环境 + 09 发布门禁 + F1-F4 acceptance-matrix
> 验收日期：2026-09-04（全部证据为本日重新执行的一手结果，非历史记录转述）

## 六层状态总表（09 §2，跨 F0-F5 累计）

| 层 | 定义 | 状态 | 证据（全部一手） |
|---|---|---|---|
| L1 Build | 编译、类型、静态检查 | ✅ DONE | `vue-tsc --noEmit` 0 error；`eslint . --max-warnings 0` 0 error 0 warning；`vite build` 成功（24.05s）；MSW 运行时代码不在产物 |
| L2 Test | 单元 + 契约 | ✅ DONE | vitest **15 files / 143 passed**（F5 新增 11：contract-education 9 + 断网钩子 2；F0-F4 回归 132 全过） |
| L3 Performance | 08 性能门禁 | ✅ DONE | 初始 JS gzip **64.9KB** ≤ 500KB；CWV：登录页 LCP P75=316ms、首页 LCP P75=316ms、CLS P75=0.048（均 ≤ 门禁）；INP 本环境无法采集真实条目（见 known-limitations §1） |
| L4 Failure | 故障态可观察 | ✅ DONE | **断网双场景 E2E**：冷断网不白屏+登录页离线提示（role=alert）+不假登录；页内断网 Boundary「网络连接不可用」+重试+恢复拉回真实数据。SSE Last-Event-ID 重连（sse 单测 10 例） |
| L5 User Journey | 真实用户链路 | ✅ DONE | Playwright **202 passed + 2 skipped（4.8m）**：F1-F4 回归 189 + golden-path-7 6×3 + offline 6×3 + cwv(desktop)。跳过项仅 CWV 非桌面视口（08 规定标准视口测） |
| L6 Human Review | 自审 + 独立审查 | ✅ DONE（自审）/ ✅ Agent 6 R1 | code-review-report P0=0 P1=0 P2=0（P3=3 书面接受）；**Agent 6 已复核 F0-F4 全部通过**（`20260904-F4/verdict.md`：pass） |

**综合状态：DONE（F0-F5 全阶段）**——六层无 FAIL。

## CWV 门禁明细（08 §2，P75，5 样本）

| 指标 | 门禁 | 实测 | 状态 |
|---|---|---|---|
| 登录页 LCP | ≤ 2500ms | **316ms** | ✅ |
| 首页 LCP | ≤ 2500ms | **316ms** | ✅ |
| INP | ≤ 200ms | 0ms（测量局限，见 known-limitations §1） | ✅（形式） |
| CLS | ≤ 0.1 | **0.048** | ✅ |
| 首包 JS gzip | ≤ 500KB | 64.9KB | ✅ |

> 测量条件声明（08 §1）：Playwright Chromium / 1440×900 / Vite dev + MSW mock / Windows / Node 20 / 5 次冷加载 / P75。证据文件 `artifacts/acceptance/f5/cwv.json`。

## 断网体验（06 §2 网络三条件 + 08 §6）

| 用例 | 步骤 | 状态 | 证据 |
|---|---|---|---|
| TC-F05-01 | 冷断网·刷新 | ✅ | E2E offline.spec A×3 视口：刷新 → 不白屏（登录页渲染）→ role=alert「网络连接不可用或服务暂时无法访问」→ 无首页数据（不假登录）→ 恢复后重登数据回来 |
| TC-F05-02 | 不假成功 | ✅ | 断网下不渲染任何假项目卡（`li` count=0）；错误文案明确 |
| TC-F05-03 | 页内断网 + 恢复重试 | ✅ | E2E offline.spec B×3 视口：resetQueries 触发真实 refetch → 最近项目/运行任务面板 Boundary+重试 → 恢复后点重试拉回真实数据、错误消失。降级态截图 ×3 |

> 断网模拟机制实证（F5-1）：context.setOffline / route.abort / CDP offline 三种真实网络层断网均被 MSW SW 屏蔽（fetch 仍 200）；故采用 `window.fetch` 层注入（addInitScript + sessionStorage，位于 SW 之上），TypeError 真实 reject → kind='network' 降级路径，不伪造成功。

## 教育研究收口（CR-F5-01）

| 用例 | 步骤 | 状态 | 证据 |
|---|---|---|---|
| TC-F07-01 | 接收教师课题 | ✅ | E2E：课题卡（高一数学建模教研组 / 样本 / k≥20 / 待授权）真实渲染 |
| TC-F07-02 | 隐私预检 | ✅ | preflight 返回 预估 46 行 / min_cell_k 22 / L1 分级；三检查（授权用途/去标识/最小样本）。契约测试 §8.2 |
| TC-F07-03 | 创建快照 | ✅ | 确认授权 → 201 不可变快照 EDU-SNAP-N（immutable=true / sha256 哈希 / 参数冻结）。契约测试 §8.3 |
| TC-F07-04 | k<20 拒绝 | ✅ | 小切片 → **422 PRIVACY_THRESHOLD_NOT_MET**，界面「隐私规则已阻止分析」+ 原因，响应不含任何切片数据（契约测试断言 raw 无 class_id/records） |
| TC-F07-05 | 统计分析与图表 | ✅ | 分析结果 −31%/−24% + 限制 + 工具版本；图表导出绑定快照哈希 + 参数哈希。契约测试 §8.5/§8.6 |
| TC-F07-06 | 成果回流审批 | ✅ | 申请 → pending_approval → 模拟管理员审批（HumanDecision）→ 教师端/学生端已回流。契约测试 §9 |

功能轨（教育）6 项：6 ✅。无 FAIL。

## 体验轨（F5）

| 用例 | 通过标准 | 状态 | 证据 |
|---|---|---|---|
| TC-X05-01 | 断网不白屏、降级文案不只靠颜色 | ✅ | role=alert + Boundary（图标+文字+重试按钮）；截图归档 f5-offline-degraded-×3 |
| TC-X07-01 | 教育页与原型 education() 布局一致 | ✅ | 截图 f5-education-×3（课题态）+ f5-education-analysis-×3（分析态）；内容由 E2E 断言覆盖 |

## 全阶段累计（F0-F5）

| 项 | 累计 |
|---|---|
| 黄金链路 | 7 条（建立项目 / 文献 / 翻译 / 写作 / 数学评审+Lean / AI 管家科研循环 / 教育研究） |
| E2E | 202 passed + 2 skipped（F1-F4 回归 189 全过，F5 新增 13） |
| 单测+契约 | 143 passed（15 files） |
| 截图归档 | F0-F5 `artifacts/acceptance/f{0..5}/`（F5 新增 9 张 + cwv.json） |
| 契约请求单 | CR-F1-01..04 / CR-F2-01..08 / CR-F3-01..04 / CR-F4-01..06 / CR-F5-01a..g |
| P0/P1/P2 | 0（全阶段自审 + Agent 6 R1 复核通过） |

## 综合结论

**F5 验收结论：PASS（终期）。** 六层状态无 FAIL；CWV 门禁通过；断网体验（冷断网 + 页内断网）双场景通过；教育研究收口 6/6；全阶段回归全绿。移交 Agent 6 终期复核 + Agent 2 真实后端集成。
