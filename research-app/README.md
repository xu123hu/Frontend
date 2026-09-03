# 智学数研 · 科研端前端（research-app）

> Evidence-Native Research OS · 面向数学科研的证据原生智能科研操作系统
> 负责人：Agent 1（前端与体验智能体）｜分支：`research/agent-01-frontend`｜工作区：worktree

## 状态

**F0 阶段（架构与视觉基线）** —— 等待 Agent 2 的 M0 共享契约（OpenAPI + RunEvent SSE + 模块注册协议）冻结后进入 F1（登录、首页、项目、个人中心）。

F0 阶段已完成：

- 设计令牌（与原型 `D:\科研端demo\index.html` 1:1 对齐的 CSS 变量）
- 应用壳（侧栏 + 顶栏 + AI 管家球体 + 上下文抽屉）
- 路由表（六个一级入口 + 登录 + 个人中心 + NotFound）
- 状态矩阵（15 个强制状态 + 转移规则 + AsyncData 包装器）
- UI primitives（StatusBadge / Boundary / EmptyState / Skeleton）
- 单元测试骨架（vitest + @vue/test-utils）
- E2E 视觉对照（Playwright 三种视口）
- 调研账本（`docs/research/frontend-benchmark.md` + `reuse-ledger.md`）

## 严格禁止

- 在 M0 冻结前为业务类型手写类型或伪造 payload
- 复制旧学生端、教师端或旧科研端业务组件
- `apiData ?? demoData` 静默降级
- 在评审中显示"论文正确率"或模型品牌
- 在浏览器内执行 Lean4 全量构建
- 引入 AGPL/CC BY-NC/许可证未知代码

## 命令

```bash
# 安装依赖
npm install

# 开发
npm run dev

# 类型检查
npm run typecheck

# 单元测试
npm run test

# E2E（需要先启动 dev server 或依赖 webServer 自动启动）
npm run test:e2e

# 生产构建
npm run build

# Bundle 报告
npm run bundle-report
```

## 目录结构

```text
src/
  app/                    # 应用启动、路由、布局、Pinia store
  pages/research/          # 路由页面（Home / Projects / Literature / Writing / Review / Education / Login / PersonalCenter / NotFound）
  widgets/                # 页面级复合区块（Nav / Header / AssistantOrb / AgentDrawer）
  features/               # 用户动作（占位，F1+ 落地）
  entities/               # 领域实体展示（占位，F1+ 落地）
  shared/
    state/                # AsyncState / AsyncData / degraded-messages
    ui/                   # StatusBadge / Boundary / EmptyState / Skeleton

tests/
  unit/                   # vitest
  e2e/                    # Playwright

docs/
  research/               # 调研、用户链路、验收用例
  handoff/F0/             # F0 阶段 handoff
artifacts/
  acceptance/f0/          # F0 视觉对照截图
```

## 关键门禁

| 项 | 来源 | 状态 |
|---|---|---|
| 死路由 | 08 §5.2 | ✅ NotFound 兜底 |
| 首包 ≤ 500KB gzip | 08 §2 | F0 阶段路由全部按需加载，待 F1 实测 |
| 路由拆包 | 08 §2 | ✅ vite.config.ts manualChunks 区分六个一级入口与 vendor |
| 10k 条目虚拟化 | 08 §2 | F2 阶段 |
| PDF canvas 释放 | 08 §2 | F2 阶段 |
| `any` 禁止 | 08 §5.2 | ✅ tsconfig strict + ESLint |
| `apiData ?? demoData` | 08 §6 P0 | ✅ 无任何此类模式 |
| 6 个一级入口 | 提示词 | ✅ 冻结 |
| 不复制旧端代码 | 02 写权限 | ✅ 全部新写 |
| 视觉基线 1:1 | F0 放行条件 | ✅ tokens.css 与原型一致；E2E 截图归档 |
