# F0 视觉证据说明

> 对应 `D:\科研端worktrees\agent-01-frontend\research-app\artifacts/acceptance/f0/`
> 真实截图均通过 agent-browser 自动化在 Vite dev server (`http://localhost:5173`) 下采集，截图大小均 > 100 KB。

| 截图 | 视口 | 状态 | 用途 |
|---|---|---|---|
| `f0-home-1440.png` | 1440×900 | 默认展开侧栏 | 视觉对照 1：F0 应用壳 vs 原型 `baseline-1440-home.png` |
| `f0-home-1440-sidebar-collapsed.png` | 1440×900 | 折叠态 | 视觉对照 2：折叠侧栏交互 |
| `f0-drawer-open-1440.png` | 1440×900 | AI 管家抽屉打开 | 视觉对照 3：抽屉 4 Tab 切换 |
| `f0-home-1366.png` | 1366×768 | 1280px 断点 | 视觉对照 4：1280px 自动折叠 |
| `f0-home-390.png` | 390×844 | 移动端 | 视觉对照 5：移动端堆叠布局 |

## 与原型的差异（仅外观/层级）

1. **内容占位**：F0 阶段所有页面是 Boundary 占位，提示"M0 契约冻结后接入"；原型是 demo 数据。
2. **路径导航**：F0 阶段路由可达，但页面不展示 demo 内容。
3. **顶栏项目名**：F0 显示"演示项目"占位；原型显示真实项目名。

## 关键层级与样式一致性

- 主色 `#3157d5`、文字 `#172b4d`、边框 `#dfe5ee`、状态色（success/warning/danger/info）均 1:1 复刻原型。
- 字号阶梯 11/12/14/15/18/21/24、行高 1.55、字体 Inter+Noto Sans SC+Microsoft YaHei、圆角 10px、阴影 0 8px 20px rgba(23,43,77,.08)。
- 侧栏 224px 展开 / 64px 折叠、断点 1100/1279/760 像素与原型一致。
- 抽屉 430px 宽、4 Tab（证据/批注/引用/任务）、`prefers-reduced-motion` 关闭球体动画。

## 数据声明

所有截图均来自真实 Vite dev server 在本机运行（端口 5173），无任何 mock 数据或预置 localStorage。
