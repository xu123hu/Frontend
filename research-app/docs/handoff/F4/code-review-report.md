# F4 Code Review Report（自审）

> 审查人：Agent 1（自审）｜日期：2026-09-04
> 范围：F4 全部新增/改造文件（git status 中 F4 相关 30 个源文件 + 2 个测试文件）
> 方法：逐文件阅读关键逻辑（handlers 派生层、plan-derive、lean-overall、双视图页面）+ 全量 lint/type 门禁 + E2E 行为验证；红线专项检查（见 §3）

## 1. 结论

| 级别 | 数量 | 说明 |
|---|---|---|
| P0（阻断：红线/正确性/安全） | **0** | — |
| P1（高：功能缺陷/契约违背） | **0** | — |
| P2（中：可维护性/一致性） | **0** | — |
| P3（低：书面接受） | **3** | 见 §4，均为 mock 草案层已声明边界 |

## 2. 门禁证据（验收当日执行）

- `vue-tsc --noEmit` → 0 error（exit 0）
- `eslint . --max-warnings 0` → 0 error 0 warning（exit 0）
- 过程中发现 1 处 `TS6133 props unused`（EvidenceSupportList.vue），当场修复后复检通过——该问题未进入本报告计数（提交前已消除）

## 3. 红线专项检查（全部通过）

| 红线 | 检查方式 | 结果 |
|---|---|---|
| Lean 通过 ≠ 论文正确 | lean-overall.ts 判定：support=partial → partial_supported；仅 faithful+succeeded+full → supported，且 UI 文案明示「仅『该主张被支持』，不等于论文正确」；E2E 断言不出现论文正确 | ✅ |
| 三状态严格分离（翻译≠内核≠结论支持） | LeanThreeStates 三列独立渲染，无合并计算；综合状态横幅与三列并存 | ✅ |
| L0-L4 不合并总分 | VerifyLayerList 五卡独立，无加权/总分字段；E2E 断言五卡 tool/version 独立 | ✅ |
| 假设 ≠ 事实（hypothesis 标记） | 种子与实时计划的 hypotheses 一律 `marked: 'hypothesis'`；E2E 断言发起的新计划假设带「假设」chip | ✅ |
| 拒绝步骤不丢失已完成证据 | plan-derive：rejected 仅作用于该步骤；计划综合 partial 而非 failed；st-4 证据保留（E2E） | ✅ |
| 参数变更 → 旧审批失效 | 决策端点 params_changed=true → cancelled + 409 语义（重复决策 conflict）；哈希绑定展示 | ✅ |
| 权限由后端裁剪，前端仅渲染可见字段 | Review.vue 注释+实现：评委视图不渲染建议字段（渲染层裁剪，非伪造数据） | ✅ |
| 无.imaginary 需求/数据 | 所有 CR-F4 端点为草案徽标标注（draft badge），数据来自种子+事件派生，无占位图/假图 | ✅ |

## 4. P3 发现（书面接受，均已声明或属草案边界）

### P3-1 实时研究循环的 cycle-result 由事件脚本综合（steward-handlers.ts:143-182）
- **现象**：对未播种 `results` 的实时 run，产物端点从事件脚本综合 claims/verification/limitations（hypotheses 取自 hypothesis 步骤 payload，fallback 到 plan）。
- **接受理由**：CR-F4-05 为草案端点；真实产物由后端 Agent 2 生成；E2E TC-F06-05 断言基于种子与综合路径均通过。后端实现时以本 handler 为契约草案对齐。

### P3-2 deriveApprovalFromScript 合成默认字段（steward-handlers.ts:25-46）
- **现象**：从 `approval.requested` payload 派生的审批卡，`reason`/`data_scope`/`estimated_cost_minor_units` 使用合成默认值（payload 未携带时）。
- **接受理由**：ApprovalRequest 冻结结构中这些字段本就允许 null/由后端填充；草案层不做虚构数据扩写。

### P3-3 step.failed 事件与审批拒绝的双重拒绝语义（plan-derive.ts）
- **现象**：`deriveStepStatus` 中决策 rejected 与 `step.failed` 事件均映射为 rejected——两者在真实后端可能语义不同（用户拒绝 vs 工具失败）。
- **接受理由**：前端展示层两者 UX 一致（保留证据 + 替代路径）；区分属后端状态机职责，已写入 plan-derive 注释。

## 5. 复用与最小侵入检查

- 复用：AgentDrawer 4-Tab 骨架、AssistantOrb 6 态、sse.ts（F2）、apiRequest/envelope（F1）、use-dialog-a11y/键盘约定（F1）——未重复实现。
- 改造面：Review.vue/ProjectDetail.vue/AgentDrawer.vue/Education.vue 为增量改造；未触碰 F0-F3 冻结契约（M0 runs/翻译/写作/文献 handler 回归通过）。
- 新增模块均标注来源（entities/review·steward 类型推导自 M4 §8.3/8.4/8.6 + 02 §5.6/5.9 冻结结构）。
