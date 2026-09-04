# F4 Known Limitations（阶段边界与诚实性声明）

> 日期：2026-09-04｜与 F0-F3 已声明边界保持一致，新增项以 §4-§7 标注。

## 1. 断网 E2E 局限（继承 F1-F3）
离线/弱网故障态在单测（degraded-messages）与组件态矩阵中覆盖；Playwright E2E 无法在 MSW Service Worker 拦截层可靠模拟网络断开，断网体验轨留待 F5 真实后端环境验证。

## 2. Lean/SymPy/Z3 真实执行由 Agent 2+ 承担（design §1 范围切分）
前端交付：分层验证结果 UI（L0-L4）、Lean 三状态 UI、run 编排与事件派生、mock 事件脚本演练。翻译/内核/反例的真实计算结果结构以 M0 VerificationRecord 冻结契约为准；后端接入时前端无需改动（apiRequest + SSE 已就绪）。

## 3. 评审权限裁剪为渲染层语义（design §3）
真实系统的字段裁剪必须由后端执行（评委请求不返回作者建议字段）。前端 mock 中两个视图共享数据源、按 mode 渲染可见字段——这是「前端仅渲染可见字段」约定的演示，不构成安全边界。

## 4. 实时研究循环产物为事件脚本综合（CR-F4-05 草案）
对未播种结果的实时 run，`GET /runs/:id/cycle-result` 从事件脚本综合产物（P3-1）。种子 run 使用完整产物。真实产物由后端生成，本 handler 即契约草案。

## 5. 教育研究为静态边界声明（design §5）
隐私预检流程 + k<20 拒绝在 Education.vue 为静态展示（草案徽标）。真实教育数据流、dws 隐私红线执行、图表导出由 Agent 2 端到端、F5 收口。前端在 mock 环境无法验证真实隐私规则——此切分已在 design.md §5 与 acceptance-matrix 标注。

## 6. Temporal Worker 重启恢复为展示语义（design §1）
`paused → resumed` 状态语义与不重复 toast 已在球体/抽屉实现；真实的 Worker 恢复、幂等去重由后端 Temporal 承担。

## 7. 审批执行权限在后端（design §1）
审批卡 UI、参数哈希绑定展示、决策端点（approved/rejected/params_changed）为前端可验证范围；批准后工具的真实放行在后端。重复决策 409、参数变更 cancelled 已在 mock 层实现一致语义。

## 8. F0-F3 截图字节差异
本轮全量 E2E 回归重跑刷新了 `artifacts/acceptance/f0-f3` 截图的字节（时间戳/渲染抖动），内容与既有验收结论一致，随 F4 一并提交。
