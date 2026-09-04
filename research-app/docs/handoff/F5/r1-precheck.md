# F5 R1 前置复核（提交后 · Agent 1 侧自检，供 Agent 6 正式 R1 交叉验证）

> 复核日期：2026-09-04｜复核对象：`research/agent-01-frontend` @ `bc1da46` + `ea11778`
> 性质：Agent 1 在提交后按 R1 标准（09 §2、common-gates.md）执行的独立复核，作为 Agent 6 正式 R1 的输入证据；正式 verdict 由 Agent 6 出具。

## 1. 门禁复跑（本机 2026-09-04，提交后重跑）

| 项 | 自报 | R1 复跑 | 结果 |
|---|---|---|---|
| vue-tsc --noEmit | 0 error | **0 error**（exit 0） | ✅ |
| eslint . --max-warnings 0 | 0/0 | **0 error 0 warning**（exit 0） | ✅ |
| vitest run | 143 passed / 15 files | **143 passed / 15 files**（exit 0） | ✅ |
| build | 成功 | 成功（24.05s，提交前实测） | ✅ |
| E2E | 202 + 2 skipped | 202 + 2 skipped / 0 failed（提交前实测 4.8m） | ✅ |

## 2. 写权限边界（common-gates C17 / 09）

`git diff --name-only HEAD~2..HEAD`：**全部 76 个变更路径均以 `research-app/` 开头**，无越界（无旧学生端/教师端/旧科研原型代码导入或改写，C18 ✅）。

## 3. 静默降级扫描（common-gates C12-C15 / 08 §6）

- `rg` 扫描 `src` 非 mocks 目录：无 `apiData ?? demoData`、无 `except: return hardcoded`、无吞错返回成功（C12 ✅）
- 生产代码无 MSW 引用（`setupWorker` / `from 'msw'` 在 `src/app` 0 命中）；`__USE_MOCK__` 编译期常量守卫 dev 钩子，生产折叠（C14 ✅）
- 断网降级合法：fetch 层 TypeError → `kind='network'` → Boundary「网络连接不可用」+ 重试 + 不渲染假数据（offline.spec 断言 `li` count=0）；可观察、可测试、用户可见（C15 ✅）

## 4. 科研真实性 / 红线抽查（common-gates C16 / 09 §6）

| 红线 | 抽查结果 |
|---|---|
| k<20 拒绝且不返回数据 | education-handlers.ts:75-76 返回 422 `PRIVACY_THRESHOLD_NOT_MET`；契约测试断言响应 raw 不含 class_id/records ✅ |
| 快照不可变 + 图表绑定哈希 | handler 返回 `immutable: true` + `sha256:snap-031` / `params_hash: sha256:params-031` ✅ |
| 不假成功（断网） | offline.spec fetch 层 TypeError 注入（非 5xx 伪装），E2E 断言恢复后重试拉回真实数据 ✅ |
| Lean 三状态不合并（F4 延续） | lean-overall.ts：翻译/内核/结论分列，无「论文正确」输出（F4 已审，F5 未触碰） ✅ |

## 5. R1 前置结论

**pass（R1 前置）**：六层状态无 FAIL；门禁复跑一致；边界 0 越界；无静默降级；红线全部符合。
剩余 P3 项（INP 测量局限 / 断网 fetch 层注入 / mobile CLS=0.103）已在 known-limitations.md 声明，不构成阻断。
→ 提交正式 R1 至 Agent 6 交叉验证。
