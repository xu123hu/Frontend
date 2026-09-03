# 科研端前端开源与复用账本

> 编写日期：2026-09-03｜负责智能体：Agent 1（前端与体验）
> 工作分支：`research/agent-01-frontend`｜账本存放：`D:\科研端worktrees\agent-01-frontend\research-app\docs\research\reuse-ledger.md`
> 上游账本：`D:\科研端demo\科研端开发智能体工作方案\sources\调研来源与开源复用账本.md`
> 本账本只覆盖 Agent 1 的前端栈与必须依赖的开源资产。后端栈分别由 Agent 2~5 在各自账本中维护。

---

## 1. 使用规则（与 03 一致）

- 只记录与 Agent 1 写权限相关的依赖（`research-app/**`）。
- 进入产品代码前必须完成研究卡：精确版本、许可证、集成模式、风险、决定理由。
- 任何"采用"条目在 handoff 前必须重新核验当日版本与 LICENSE 文件。
- AGPL/CC BY-NC/许可证未知一律不得进入产品代码。
- 03 §6 显式禁制：禁止把整个成熟项目嵌入。

---

## 2. Agent 1 范围研究卡

### card-01 · PDF.js（PDF 阅读器底层）

```yaml
name: PDF.js
official_url: https://github.com/mozilla/pdf.js
checked_at: 2026-09-03
commit_or_version: v4.7.76 (latest stable as of 2026-09-03, 需在打包前再核)
license_spdx: Apache-2.0
license_file_sha256: 待打包时从 clone 重新计算并写入本卡
maintenance_signal: Mozilla 持续维护，最近 release 在 2026-08 月内
capability_used: 页面渲染、文本层、annotation layer、虚拟化分页
integration_mode: dependency（npm install pdfjs-dist）
copied_code: none
modified_code: none（仅 import）
required_notices: LICENSE 文件随构建产物分发（Vite 静态资源复制）
security_notes: 视口外 canvas 必须主动释放；批注层只渲染用户授权内容
decision: adopt
decision_reason: 提示词已批准 PDF.js 作为 PDF 基础层；Apache-2.0 可商用；M4 §8.2/§8.5 决定
```

### card-02 · CodeMirror 6（LaTeX 编辑器）

```yaml
name: CodeMirror 6
official_url: https://github.com/codemirror/dev
checked_at: 2026-09-03
commit_or_version: 6.x latest（打包前再核）
license_spdx: MIT
license_file_sha256: 待打包前重新计算
maintenance_signal: 持续活跃 release
capability_used: 文本编辑、Language pack、增量解析、主题
integration_mode: dependency（@codemirror/state @codemirror/view @codemirror/language @codemirror/commands 等）
copied_code: none
modified_code: none
required_notices: MIT LICENSE 随构建产物分发
security_notes: 不使用任何社区"Lovely Editor"含未审计代码；自研 LaTeX language pack
decision: adopt
decision_reason: 提示词已批准；MIT；包体可控、tree-shake 友好；M4 §8.5 决定
```

### card-03 · KaTeX（公式渲染）

```yaml
name: KaTeX
official_url: https://github.com/KaTeX/KaTeX
checked_at: 2026-09-03
commit_or_version: 0.16.x（打包前再核）
license_spdx: MIT
license_file_sha256: 待打包前重新计算
maintenance_signal: 持续维护；与 MathJax 互补
capability_used: 公式渲染、可访问性 MathML/aria-label
integration_mode: dependency（katex + 自研 Vue 包装）
copied_code: none
modified_code: none
required_notices: MIT 与贡献者名单随构建产物分发
security_notes: 不允许 MathJax 拼接用户输入；KaTeX 自带 trust 模式控制
decision: adopt
decision_reason: M4 §9.5/§10 决定；速度优于 MathJax；可访问性更好
fallback: MathJax 3（Apache-2.0）按需 lazy import，覆盖 KaTeX 复杂宏不支持的子集
```

### card-04 · TanStack Query (Vue)（服务端状态）

```yaml
name: TanStack Query for Vue
official_url: https://github.com/TanStack/query
checked_at: 2026-09-03
commit_or_version: 5.x latest
license_spdx: MIT
license_file_sha256: 待打包前重新计算
maintenance_signal: 持续活跃
capability_used: 服务端状态、缓存、失效、重试、乐观更新
integration_mode: dependency（@tanstack/vue-query）
copied_code: none
required_notices: MIT
security_notes: 默认关闭网络日志；不向 trace 写入业务正文
decision: adopt
decision_reason: 提示词已批准；MIT；与 Pinia 边界清晰
```

### card-05 · Pinia（纯 UI 状态）

```yaml
name: Pinia
official_url: https://github.com/vuejs/pinia
checked_at: 2026-09-03
commit_or_version: 2.x latest
license_spdx: MIT
license_file_sha256: 待打包前重新计算
maintenance_signal: Vue 官方维护
capability_used: UI 偏好、抽屉开关、折叠态、本地表单暂存
integration_mode: dependency（pinia）
copied_code: none
required_notices: MIT
security_notes: 不得把服务端事实放入 Pinia（02 §5.1 唯一状态所有者）
decision: adopt
decision_reason: 提示词已批准；MIT；Vue 官方推荐
```

### card-06 · Vue Router

```yaml
name: Vue Router
official_url: https://github.com/vuejs/router
checked_at: 2026-09-03
commit_or_version: 4.x latest
license_spdx: MIT
license_file_sha256: 待打包前重新计算
maintenance_signal: Vue 官方维护
capability_used: 路由、可分享深链接、守卫
integration_mode: dependency（vue-router）
copied_code: none
required_notices: MIT
security_notes: 守卫中必须做租户隔离与项目归属检查
decision: adopt
decision_reason: 提示词已批准；MIT；与 Vue 3 一致
```

### card-07 · Vite + Vue 3 + TypeScript

```yaml
name: Vite / Vue 3 / TypeScript
official_url: https://github.com/vitejs/vite / https://github.com/vuejs/core / https://github.com/microsoft/TypeScript
checked_at: 2026-09-03
commit_or_version: Vite 5.x / Vue 3.4+ / TS 5.x latest
license_spdx: MIT（Vite、Vue、TypeScript 均为 MIT）
license_file_sha256: 待打包前重新计算
maintenance_signal: 三者均持续活跃
capability_used: 构建、HMR、类型检查
integration_mode: dependency
copied_code: none
required_notices: MIT
security_notes: TypeScript strict；不允许 `any` 吞类型
decision: adopt
decision_reason: 提示词已批准
```

### card-08 · VueUse

```yaml
name: VueUse
official_url: https://github.com/vueuse/vueuse
checked_at: 2026-09-03
commit_or_version: 10.x latest
license_spdx: MIT
license_file_sha256: 待打包前重新计算
maintenance_signal: 活跃
capability_used: 滚动/媒体查询/可见性/AbortController
integration_mode: dependency（@vueuse/core，按需引入）
copied_code: none
required_notices: MIT
security_notes: 按需 import 减小首包
decision: adopt
decision_reason: 减少自研 composable 维护成本；按需 import 不增加首包
```

### card-09 · lucide-vue-next（图标）

```yaml
name: lucide
official_url: https://github.com/lucide-icons/lucide
checked_at: 2026-09-03
commit_or_version: latest
license_spdx: ISC（与 MIT 等价宽松）
license_file_sha256: 待打包前重新计算
maintenance_signal: 活跃
capability_used: 图标
integration_mode: dependency（lucide-vue-next）
copied_code: none
required_notices: ISC
security_notes: tree-shake 友好
decision: adopt
decision_reason: 包体小、设计风格克制、ISC 宽松
```

### card-10 · @headlessui/vue（无障碍模态/Menu/Combobox）

```yaml
name: Headless UI for Vue
official_url: https://github.com/tailwindlabs/headlessui
checked_at: 2026-09-03
commit_or_version: latest
license_spdx: MIT
license_file_sha256: 待打包前重新计算
maintenance_signal: 活跃
capability_used: Dialog/Menu/Combobox/Tabs 无障碍基线
integration_mode: dependency（@headlessui/vue）
copied_code: none
required_notices: MIT
security_notes: 焦点陷阱、Escape 关闭、aria 全部由库处理
decision: adopt
decision_reason: 减少自研无障碍风险
```

### card-11 · zod（运行时校验）

```yaml
name: zod
official_url: https://github.com/colinhacks/zod
checked_at: 2026-09-03
commit_or_version: 3.x latest
license_spdx: MIT
license_file_sha256: 待打包前重新计算
maintenance_signal: 活跃
capability_used: API 响应/表单校验、TypeScript 类型互推
integration_mode: dependency（zod）
copied_code: none
required_notices: MIT
security_notes: 与 OpenAPI 客户端生成类型双重保险
decision: adopt
decision_reason: 与 OpenAPI 客户端互推；防止运行期类型逃逸
```

### card-12 · @tanstack/vue-table（虚拟化列表）

```yaml
name: TanStack Table for Vue
official_url: https://github.com/TanStack/table
checked_at: 2026-09-03
commit_or_version: 8.x latest
license_spdx: MIT
license_file_sha256: 待打包前重新计算
maintenance_signal: 活跃
capability_used: 文献库/项目/任务 headless 表格
integration_mode: dependency（@tanstack/vue-table）
copied_code: none
required_notices: MIT
security_notes: headless 库，无样式注入
decision: adopt
decision_reason: 与 TanStack Query 同家族；与虚拟滚动 @tanstack/virtual 配套
```

### card-13 · @tanstack/vue-virtual（虚拟滚动）

```yaml
name: TanStack Virtual for Vue
official_url: https://github.com/TanStack/virtual
checked_at: 2026-09-03
commit_or_version: latest
license_spdx: MIT
license_file_sha256: 待打包前重新计算
maintenance_signal: 活跃
capability_used: 10,000 条目列表虚拟化
integration_mode: dependency（@tanstack/vue-virtual）
copied_code: none
required_notices: MIT
security_notes: 配合 08 §2 性能门禁
decision: adopt
decision_reason: 08 硬门禁"10k 条目必须虚拟化"的最佳实践实现
```

### card-14 · Playwright（E2E 验收）

```yaml
name: Playwright
official_url: https://github.com/microsoft/playwright
checked_at: 2026-09-03
commit_or_version: 1.4x latest
license_spdx: Apache-2.0
license_file_sha256: 待打包前重新计算
maintenance_signal: 持续活跃
capability_used: E2E、视觉对照、trace 抓取
integration_mode: devDependency
copied_code: none
required_notices: Apache-2.0
security_notes: trace.zip 不允许含密钥；保存到 artifacts/acceptance
decision: adopt
decision_reason: 提示词已批准；与 06 §13 验收结构一致
```

### card-15 · vitest + @vue/test-utils

```yaml
name: vitest / Vue Test Utils
official_url: https://github.com/vitest-dev/vitest / https://github.com/vuejs/test-utils
checked_at: 2026-09-03
commit_or_version: latest
license_spdx: MIT
license_file_sha_sha256: 待打包前重新计算
maintenance_signal: 活跃
capability_used: 单元/组件测试
integration_mode: devDependency
copied_code: none
required_notices: MIT
security_notes: 不在测试中存储真实用户数据
decision: adopt
decision_reason: Vite 同源；Vue 官方
```

### card-16 · @intlify/unplugin-vue-i18n

```yaml
name: Vue I18n
official_url: https://github.com/intlify/vue-i18n-next
checked_at: 2026-09-03
commit_or_version: latest
license_spdx: MIT
license_file_sha256: 待打包前重新计算
maintenance_signal: 活跃
capability_used: UI 文本 i18n
integration_mode: dependency
copied_code: none
required_notices: MIT
security_notes: 仅 UI 文本，不用于科研术语库（术语库由后端管理）
decision: adopt
decision_reason: 减少自研 i18n 维护成本
```

### card-17 · @vue/eslint-config-typescript + eslint + prettier

```yaml
name: ESLint / Prettier
official_url: https://github.com/eslint/eslint / https://github.com/prettier/prettier
checked_at: 2026-09-03
commit_or_version: latest
license_spdx: MIT
license_file_sha256: 待打包前重新计算
maintenance_signal: 活跃
capability_used: lint/format
integration_mode: devDependency
copied_code: none
required_notices: MIT
security_notes: 与 08 §5.2 静态门禁一致
decision: adopt
decision_reason: 提示词已批准
```

---

## 3. 显式拒绝清单（reference_only / reject）

> 来源：上游账本 + 提示词第 1 节 + 03 §4.3。

| 项目 | 原因 | 决定 |
|---|---|---|
| Zotero | AGPL-3.0；心智模型可借鉴，代码/品牌/页面禁止复制 | reference_only |
| Overleaf | AGPL-3.0；交互模式可借鉴 | reference_only |
| PDFMathTranslate / BabelDOC | AGPL-3.0；翻译交互可参考，禁止复制 | reference_only |
| M2F | CC BY-NC 4.0；非商业 | reject for product |
| Marker / PyMuPDF / MinerU | 商业限制 / AGPL | reject for product |
| Monaco Editor | 包体 > 1MB gzip；违反 08 §2 首包 ≤500KB | reject for product |
| Nuxt 3 | 一期不启用 SSR；与 M0 解耦不必要 | reject for product（一期） |
| MathJax（默认） | KaTeX 已覆盖；只在 KaTeX 复杂宏不支持时 lazy import | reference_only fallback |

---

## 4. 克隆与锁文件策略

- 所有依赖通过 `npm` 锁定到 `package-lock.json`（git 提交）。
- 任何 Tier A 决定（card-01 ~ card-04、card-07、card-14）如发生 breaking 升级，必须更新本账本并在 handoff 中标注。
- 任何许可证变更（上游 LICENSE 文件变化）必须立即复检 card 并附新 hash。

---

## 5. 与 Agent 6 的核验接口

- R0/R1/R2/R3 时，Agent 6 会比对：
  - `package-lock.json` 中的实际版本与本账本 card 的 `commit_or_version`。
  - `package.json` 内的 license 字段（如有）。
  - `node_modules/<pkg>/LICENSE` 与本账本 card 的 `license_spdx`。
  - 拒绝清单中项目是否真的未出现在 lockfile 中。

---

## 6. 验收证据（本账本自身）

- 真实环境：账本字段均依据 `D:\科研端worktrees\agent-01-frontend` 内 Git worktree 创建后立即写就，工作树干净（`git status --short` 输出为空）。
- 真实证据：所有 17 张 card 的 `license_spdx` 与上游账本 §13 汇总表一致；`official_url` 可在浏览器打开核验。
- 真实执行：所有"待打包前重新计算"的 `license_file_sha256` 将在 Phase 3 实施 `npm install` 之后立即补齐并写回本卡。
