# F0 Final Audit

> 09 §2 完成定义六层 + 06 §13 验收证据包 + 07 §12 四问
> 智能体：Agent 1（前端与体验）｜日期：2026-09-03｜阶段：F0（架构与视觉基线）

---

## 1. 六层完成状态表

| 层 | 内容 | 状态 | 证据 |
|---|---|---|---|
| L1 Build | 编译、类型、静态检查 | ✅ 通过 | `vue-tsc --noEmit` 0 error；`vite build` 成功，1611 modules；`npm install` 447 packages 锁定 |
| L2 Test | 单元 + 契约 + 集成 | ✅ 通过 | vitest 32/32 passed（4 文件，1.49s） |
| L3 Performance | 08 性能与质量门禁 | ✅ 通过（F0 范围） | 首包 gzip 3.72 KB（≤500 KB）；6 个一级入口各自独立 chunk；PDF/CodeMirror/评审模块不进首包 |
| L4 Failure | 故障注入 | ⏳ deferred | F0 阶段未接入后端；F1 阶段接通 M0 契约后补充 |
| L5 User Journey | 真实用户链路 | ⏳ deferred | F0 阶段明确不交付六条黄金链路（设计稿已在 `docs/research/user-journeys.md` + `acceptance-cases.md`）；F1+ 阶段逐条落地 |
| L6 Human Review | 视觉、架构、科研真实性 | ✅ 通过 | 自审报告 P0=0/P1=0/P2=0；5 张视觉对照截图归档 |

> F0 阶段按里程碑规则（09 §2）允许 L4/L5 标 deferred，但必须写明目标里程碑。L4 → F1，L5 → F1~F5。

---

## 2. 证据索引

```text
docs/
├── research/
│   ├── frontend-benchmark.md          Phase 0 调研（5+3 竞品、3 用户画像、5 个架构级三候选、12 项 Tier B 简卡）
│   ├── reuse-ledger.md                Phase 0 开源账本（17 张 card + 显式拒绝清单）
│   ├── user-journeys.md               Phase 1 6 条黄金链路 + 黄金路径
│   └── acceptance-cases.md            Phase 2 60+ 双轨验收用例 + 内容资产清单
├── handoff/F0/
│   ├── summary.md                     F0 handoff 总结
│   ├── code-review-report.md          09 §3 自审清单（自审报告 P0=0/P1=0/P2=0）
│   ├── acceptance-matrix.md           F0 前置验收 10/10 通过
│   ├── test-report.md                 六层完成状态
│   └── known-limitations.md           真实"未做"清单
└── ../artifacts/acceptance/f0/        F0 视觉对照 5 张 PNG

D:\科研端demo\reference-screenshots/  原型视觉基线 10 张 PNG
```

---

## 3. 07 §12 四问（仅 F0 范围）

| 问题 | F0 阶段答案 | 证据 |
|---|---|---|
| 1. 新用户能否从登录开始完成六条黄金链路？ | ❌ F0 阶段不交付（设计稿已有） | `docs/research/user-journeys.md` 6 条链路设计；`docs/research/acceptance-cases.md` 60+ 用例 |
| 2. 关键主张/公式/引用/工具结果能否追溯到来源和版本？ | N/A（F0 阶段无业务） | F1+ 阶段由 M0 契约保证 |
| 3. 页面关闭/Worker/API 重启/外部服务短暂失败后任务与产物是否安全？ | N/A（F0 阶段无后端） | F4 阶段由 Temporal + SSE 重连 + Last-Event-ID 保证 |
| 4. 是否存在任何"测试通过但研究者会被误导"的状态？ | ✅ 否 | `degraded-messages.ts` 12 条降级标签；`Boundary.vue` 必填显式状态；15 个状态枚举无歧义 |

> F0 阶段仅问题 4 可以在当前阶段完整回答（"否"）。其他 3 题 F1+ 阶段逐步证明。

---

## 4. 剩余问题分类清单

| 级别 | 数量 | 说明 |
|---|---|---|
| P0 | 0 | — |
| P1 | 0 | — |
| P2 | 0 | — |
| P3 | 0 | — |

F0 阶段**无未解决 P0/P1**。所有未做项均归入 F1+ 阶段的 known-limitations。

---

## 5. 06 §13 验收证据包结构（F0 阶段）

```text
artifacts/acceptance/f0/
├── f0-home-1440.png                    应用壳 1440×900
├── f0-home-1440-sidebar-collapsed.png  折叠态
├── f0-drawer-open-1440.png             AI 管家抽屉
├── f0-home-1366.png                    1280px 断点
├── f0-home-390.png                     移动端
└── README.md                           F0 阶段 visual evidence 说明
```

> 缺 `code-review/`（Agent 1 自审报告已在 `docs/handoff/F0/code-review-report.md`；Agent 6 R1 报告待 R1 触发时补充）。
> 缺 `final-audit.md` 的发布版（R3 才需要，F0 阶段无需）。

---

## 6. 提交流程建议

1. 提交 F0 commit 到 `research/agent-01-frontend` 分支（不直接合入 `D:\frontend\research-app`，按 07 §2 由 Agent 2 滚动集成）。
2. 通知 Agent 6 触发 R1 里程碑审查（09 §5）。
3. 等待 M0 契约冻结（research-contracts-v0.1.0 标签）后，进入 F1 阶段。

---

## 7. 严禁声明

- **不可**："F0 阶段已经可以做项目创建/文献检索/LaTeX 写作"——这是 F1~F5 的范围。
- **不可**："已经接入 M0 契约"——M0 仍由 Agent 2 起草与冻结中。
- **不可**："已经通过 R1 审查"——R1 触发权归 Agent 6。
- **不可**："可以发布"——F0 不是发布候选，是 M0 之后 F1~F5 的工程地基。
