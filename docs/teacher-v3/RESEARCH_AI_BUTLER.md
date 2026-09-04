# AI 管家（AI Butler）· 头脑风暴与调研报告

> 状态：头脑风暴稿（待拍板） · 日期：2026-09-04
> 关联：REQUIREMENTS_SPEC.md（R1-R14 红线）、BACKEND_GUIDE.md（四域 API）
> 结论先行：AI 管家不是"又一个聊天窗"，而是**会操作平台的教师助理**——对话与动作双形态，底层是 Agent 编排层，把后端全部领域 API 注册为工具集。

---

## 一、调研发现汇总

### 1.1 语音转公式（用户记忆中的 GitHub 项目）

**结论：存在多个同类项目，但全部不支持中文数学口语；中文需要走"通用 ASR + LLM 解析"自建路线。**

| 项目 | 地址 | 技术路线 | 语言 | 成熟度 | 对我们的价值 |
|---|---|---|---|---|---|
| speech2latex (dkorzh10) | github.com/dkorzh10/speech2latex | Whisper-Large v3 转录 + Qwen2.5 微调纠错；另有端到端 Audio LLM（SALMONN-13B 等） | 英/俄 | ICLR 2026 论文级，2026-04 仍在更新 | **首选参考**：验证了"ASR 后纠错"与"端到端"两条路线；SALMONN CER 17.5% |
| MathSpeech (hyeonsieun) | github.com/hyeonsieun/MathSpeech | Whisper + 120M 小语言模型纠错 | 英 | AAAI 2025 论文 | 证明小模型纠错管线可行（CER 0.390→0.298），可低成本部署 |
| speech-to-latex (Thomas-McKanna) | github.com/Thomas-McKanna/speech-to-latex | 浏览器端全链路：Whisper Web → WebLLM → MathJax | 英 | Demo/产品级，MIT | **最接近用户描述的形态**：纯浏览器、无需服务器、实时转换；可作为降级路径参考 |
| TalkTex (mathehertogh) | github.com/mathehertogh/talktex | 纯规则语法解析（C++），口语指令→LaTeX | - | 2021 停更 | 其"语音指令语法文档"是中文术语映射表的范本 |
| EquaScribe (ANIMANxd) | github.com/ANIMANxd/equa-scribe | Whisper → Gemini → LaTeX | 多语言 | Demo | 证明"ASR + 通用 LLM"组合可用（无需微调） |

**关键缺口**：所有开源项目均无中文数学口语数据集（"根号下""x 平方""x 分之 y"）。讯飞/百度有强大的中文 ASR 和公式 OCR，但**均无"语音→公式"API**（讯飞的 LaTeX 公式识别是图片输入；星火的 LaTeX→TTS 是反向）。

**中文技术路线判断**：
- 路线 A（端到端语音→LaTeX 模型）：需自建中文数学口语数据集，成本高，前期不碰。
- 路线 B（通用中文 ASR → 数学口语文本 → LLM 解析为 LaTeX）：**推荐**。中文数学口语表达模式稳定（见 §5.2 术语表），Whisper/讯飞中文 ASR 成熟，Qwen/DeepSeek 类 LLM 做"口语→LaTeX"转换是弱任务（相当于带术语表的翻译），加 KaTeX 编译验证兜底即可。EquaScribe 已证明 Whisper+通用 LLM 无微调可用。

### 1.2 AI 悬浮球/侧边栏交互模式（业界产品）

| 产品 | 入口形态 | 对话→动作的流转 | 结果落地 | 借鉴点 |
|---|---|---|---|---|
| **Notion AI** | 右下角悬浮球 + 侧边栏 + 划词"询问AI" + 快捷键 | 文本操作直接作用于选中内容；Agent 多步任务生成页面 | 保存为页面/区块，**不主动替换内容** | 悬浮球位置、上下文感知（知道当前页面）、结果须用户确认落地 |
| **飞书 AI 助手** | 右下角组件（固定/粘性位置），点开侧边栏 | 识别需求→匹配模式（数据分析/搭建工作流） | 侧边栏内**步骤进度可视化 + 撤销** | 动作执行过程的透明化、可撤销 |
| **豆包 PC** | 屏幕边缘悬浮球 | "工作任务"模式：左对话右产物同屏 | 侧边工作台承载生成的报告/PPT，边对话边编辑 | 对话与产物同屏，产物可继续用对话迭代 |
| **WPS 灵犀** | 文档内悬浮按钮 + 划词工具栏 + 侧边栏 | 生成后消息末尾出现"生成文档"按钮 | 点击进入创作模式编辑 | **"落地按钮"模式**：对话结果不停留在聊天窗，一键进入编辑界面 |
| **ClassIn X** | 课堂 AI 语音助手 | 自然语言指令触达 **43 种授课工具** | 直接调用课堂工具执行 | 教育界最相关：指令→工具调用的完整形态；教师掌握 AI 开放边界 |
| **GitHub Copilot Web** | 可最小化聊天面板 | 斜杠命令（/new /doc）；对话可转 Agent 会话 | 自动附加当前 PR/Issue 上下文 | **自动上下文附加**：用户走到哪，AI 知道哪 |
| **Gamma** | 网页创作入口 | 一句话/大纲/文档 → 结构化生成工作流 | 导出 PPTX/PDF；生成后进入自然语言编辑阶段 | "一句话进入工作流"而非纯对话 |

**综合结论（五种模式择优组合）**：
1. 入口 = **右下角悬浮球**（Notion/飞书模式）→ 展开为 380-420px 侧边栏（不遮挡画布主区）。
2. 上下文 = **Copilot 式自动附加**（当前路由/当前 deck/当前选中元素），教师不用复述"我在哪"。
3. 动作 = **WPS 灵犀式落地按钮 + 飞书式进度可视化**：AI 产出"动作卡片"，教师点"执行/去处理"才发生跳转或写操作。
4. 对话产物 = **豆包式同屏迭代**：生成的公式/图形卡片就地产出，可拖拽、可编辑，不强制跳页。

### 1.3 Chat-to-Action 架构底座

**Function Calling 现状（2026）**：OpenAI/Anthropic/Gemini 均支持并行工具调用，但请求格式与返回语义互不兼容，需在后端统一封装 tool 接口层。

**MCP（Model Context Protocol）**：适合"把后端能力标准化暴露给外部 AI 客户端"，2026-07 规范已无状态化。**不建议作为本平台 chat-to-action 的唯一方案**——我们的核心场景是"AI 操作自家 Web 应用 + 前端执行动作"，用前端 Action Registry 更直接；MCP 可作为 Phase 3 对外开放工具的标准层。

**前端动作注册表模式（业界叫法：frontend tools / client-side tools / headless tools）**：
- Vercel AI SDK：`onToolCall` + client-side tools，支持"需用户确认的工具"（确认对话框）——与我们"写操作必须教师确认"的红线天然吻合。
- LangChain Headless Tools：schema 在后端、执行在前端（浏览器 API）。
- WebMCP（github.com/chetan25/web-mcp-app）：`navigator.modelContext.registerTool('navigateToProduct')` → 前端直接 `router.push`。

**意图路由**：业界混合方案（规则 → 小模型分类器 → 大模型 FC）可把 80% 明确请求拦在低成本低延迟层，仅 6-20% 边界情况升级到大模型。有实测案例：$13,000/月 → $400/月，延迟 1.2s → 180ms。

**RAG 底座**：MinerU（PDF/Word/PPT→结构化 Markdown/JSON，保留 LaTeX 公式，Top-1 召回 +25%）+ pgvector（教师个人库规模下部署最简、可复用 Postgres）。知识库三层：个人库（user_id 过滤）/ 教研组库 / 全局库。

---

## 二、AI 管家定位与能力地图

**一句话定位**：随叫随到、知道你在哪、能动手但不动你确认过的东西。

```
┌─────────────────────────────────────────────────────┐
│ L4 主动服务（P2+）：今日待办摘要 / 备课缺口提醒 / 讲评建议     │
├─────────────────────────────────────────────────────┤
│ L3 应用内动作（chat-to-action，本管家的灵魂）              │
│   · 导航跳转：「我要做个PPT」→ 课件工坊+预填参数            │
│   · 直接入库：题目图片+「存入题库」→ 走 scan-import 工具     │
│   · 结果插入：语音公式卡片 → 拖拽进画布                    │
│   · 触发生成：一句话 → 拉起教案/课件生成工作流              │
├─────────────────────────────────────────────────────┤
│ L2 输入能力：语音（含语音公式）/ 图片 / 文件（PDF/PPT/Word） │
├─────────────────────────────────────────────────────┤
│ L1 信息获取：联网搜索（带引用）/ 教师个人知识库 RAG 检索      │
├─────────────────────────────────────────────────────┤
│ L0 基础对话：数学对话（KaTeX 渲染）/ 解题讲解 / 公式解释     │
└─────────────────────────────────────────────────────┘
```

**红线对齐（来自 REQUIREMENTS_SPEC R1-R14）**：
- 所有识别/生成结果进编辑器由教师校对，**绝不直接落库或定稿** → 动作卡片确认制。
- AI 只能改指定元素，不得覆写 teacher_confirmed → 工具执行带 scope 校验。
- LaTeX/boardJson/records 是唯一事实源 → 公式卡片携带结构化 latex，非截图。

---

## 三、交互设计：悬浮球 + 侧边栏

### 3.1 形态

- **收缩态**：右下角 56px 悬浮球（学术蓝主题，∫ 徽标变体），可拖动换边、贴边隐藏半身；带未读红点（任务完成通知）。
- **展开态**：从右侧滑出 400px 侧边栏（画布区自适应压缩，属性面板 264px 不变——遵守既有约束）；Esc/点击球收回。
- **快捷键**：Ctrl/Cmd+K 唤起，与画布操作不冲突。

### 3.2 侧边栏三区结构

```
┌────────────────────────────────────┐
│ 上下文条：「正在课件工坊 · 第3页」 ▾   │ ← 自动附加，可展开查看发给了AI什么
├────────────────────────────────────┤
│                                    │
│  对话流                             │
│  · 文本气泡（数学用 KaTeX 渲染）      │
│  · 公式卡片 [√(b²-4ac)] 可编辑可拖拽  │
│  · 图形卡片 [函数图] 可拖拽          │
│  · 动作卡片「存入题库→函数章节」[执行] │
│  · 搜索引用条 [1][2][3] 可点开       │
│                                    │
├────────────────────────────────────┤
│ 输入区                              │
│ [文本框........] [🎤语音] [📎图片/文件]│
│ [🌐联网开关] [📚知识库开关]  [发送]    │
└────────────────────────────────────┘
```

### 3.3 五类结果卡片（拖拽的关键）

| 卡片 | 内容 | 可执行操作 |
|---|---|---|
| formula | latex + confidence + 预渲染 | **拖拽进画布**（→ V3Element type:'formula'）；点开 MathLive 编辑 |
| figure | preset/expr 参数化结构 | 拖拽进画布（→ geometry/functionPlot 元素） |
| action | 动作描述 + 参数摘要 | 「执行」按钮（写操作必须确认）「取消」 |
| link | 目标页面 + 预填参数 | 「去处理」→ router.push({path, query}) |
| file/source | 文件解析结果 / 搜索引用 | 预览、插入引用 |

**拖拽实现**：卡片 `draggable` + `dragstart` 写入 `dataTransfer.setData('application/x-v3-element', JSON.stringify(element))`；SlideCanvasV3 监听 `drop`，按落点坐标创建 V3Element（1280×720 逻辑坐标换算）。落布后元素处于未确认态，走既有选中→编辑→确认流。

### 3.4 典型剧本（用户提的两个场景）

**剧本 A：「我要做一个PPT」**
1. 教师在任意页对管家说"帮我做一个《椭圆及其标准方程》的课件"。
2. 管家不直接长篇大论，而是回复理解摘要 + 动作卡片：
   `将前往课件工坊，预填：主题"椭圆及其标准方程"· 班级 高二(3)班 · 模板 学术蓝（可改）` [去处理]
3. 教师点击 → `router.push('/teacher-v3/slides?topic=...&class=...&template=...')`，SlidesView 读取 query 预填生成表单（**进入既有生成工作流**，模板选择/大纲确认等教师控制点全部保留）。
4. 若教师追问"大概几页"，纯对话回答（不触发跳转）。

**剧本 B：题目图片 +「存入题库」**
1. 教师拖图片进侧边栏（或粘贴截图），说"存入题库，圆锥曲线那章"。
2. 管家先调**已有的** photo 识别链路（VLM 解读题干），返回识别预览卡：题干、选项、知识点建议（`KP: 椭圆的定义`）。
3. 教师在卡片内**可改**（改题干文字、换知识点节点）。
4. 点「存入」→ 前端调既有 `POST /teacher-v3/quiz/questions`（或 scan-import），成功后返回链接卡「已在题库 · 函数章节 → 查看」。
5. 全程原图保留（R 红线），识别结果**教师确认后才入库**。

---

## 四、架构设计：AI 管家与底座的关系

**回答"这跟架构底座有关吗"——是，而且是强耦合**：AI 管家的本质是把后端**全部领域 API 重新包装成工具集**再暴露给 LLM。后端四个域（catalog/recognition/generation/grading）的 API 设计质量直接决定管家的能力上限。这也是为什么后端开发期就要按"tool-friendly"设计：**每个写接口都有稳定的 JSON Schema 入参**（OpenAPI 描述），Agent 编排层才能零胶水注册。

```
┌──────────────────── 前端 Vue3 ────────────────────┐
│  悬浮球/侧边栏组件（新增 ButlerFab + ButlerPanel）   │
│  · 上下文采集器（route/deck/slide/selection）        │
│  · 卡片渲染器（formula/figure/action/link）          │
│  · 拖拽管道（dataTransfer → V3Element）             │
│  · 前端 Action Registry：                          │
│      navigate   → router.push + 预填 query         │
│      prefill    → 目标页表单预填事件                  │
│      insert     → 当前画布插入元素                   │
│      confirmApi → 教师点击确认后调后端 API            │
└──────────────┬────────────────────────────────────┘
               │ SSE（复用 v3Sse 通道）
┌──────────────┴────────────────────────────────────┐
│  后端 /api/teacher-v3/butler/*                     │
│  ┌─────────────── Agent 编排层 ─────────────────┐  │
│  │ 意图路由（三层）：                             │  │
│  │   L1 规则/关键词（快，免费）                    │  │
│  │   L2 小模型分类（15-20 类意图，<100ms）         │  │
│  │   L3 大模型 Function Calling（复杂/多步）       │  │
│  │ 会话管理 + 上下文窗口（页面上下文/选中元素/历史）  │  │
│  │ Tool Registry（后端工具注册表）：                │  │
│  │   read 工具：search_web / kb_search /          │  │
│  │     get_deck / get_question_bank...（可直接执行）│  │
│  │   write 工具：quiz_import / deck_create /      │  │
│  │     plan_generate...（返回确认卡，教师点后执行）  │  │
│  │   frontend 工具：navigate / prefill / insert   │  │
│  │     （SSE 下发 action 事件，前端 Registry 执行） │  │
│  └──────────────────────────────────────────────┘  │
│  ┌─────────────── 能力层 ───────────────────────┐  │
│  │ 数学对话 LLM ｜ 联网搜索 API ｜ ASR（讯飞/Whisper）│  │
│  │ 语音→LaTeX 解析（术语规则表 + LLM + KaTeX验证）   │  │
│  │ MinerU 文档解析 ｜ pgvector RAG（个人/组/全局）   │  │
│  └──────────────────────────────────────────────┘  │
│  既有四域领域 API（catalog/recognition/generation/grading）│
└───────────────────────────────────────────────────┘
```

### 4.1 关键设计决策

**D1 工具分三档权限（红线落地机制）**
- `read`（搜索/读 deck/读题库）：AI 直接执行，结果流式展示。
- `write`（入库/建 deck/改 plan）：AI 只能生成**确认卡片**，教师点「执行」才真正调用——执行仍走前端发起（与教师手动操作同一 API、同一鉴权、同一审计日志），后端不提供"AI 直写"旁路。
- `frontend`（navigate/prefill/insert）：后端下发结构化 action，前端 Registry 执行；跳转类低风险可直接执行，插页/改元素类先出确认卡。

**D2 意图路由三层，P0 先做 L1+L3**
P0 阶段流量小，规则层（关键词命中"做课件/存题库/帮我跳"）+ 大模型 FC 兜底即可上线；L2 小模型分类器是 P2 降本手段，不阻塞。

**D3 为什么不用纯 MCP**
MCP 解决"AI 客户端 ↔ 外部工具"标准化，适合 Phase 3 把教研组工具/第三方资源开放给其他 AI 客户端时再引入；当下场景（自家 SPA 内动作 + 前端执行 + 确认制）用 Action Registry 一层就够，少一个协议层运维成本。

**D4 上下文协议**
每次请求携带 `context: { route, deck_id?, slide_id?, selection?: V3Element, class_id? }`，由前端自动采集、上下文条可视化（教师可展开看"AI 知道了什么"），后端注入 system prompt。对齐 Copilot 自动上下文附加模式。

### 4.2 SSE 事件协议（复用 v3Sse）

```
event: meta      data: { session_id, intent, mode }        // 会话开始
event: thinking  data: { text }                            // 思路摘要（可折叠展示）
event: token     data: { text }                            // 流式正文
event: tool_call data: { tool, args }                      // 「正在搜索…/正在识别图片…」
event: tool_result data: { tool, ok, summary }             // 工具结果摘要
event: card      data: { type: 'formula'|'figure'|'action'|'link', ... }
event: action    data: { action: 'navigate'|'prefill'|'insert', params }  // 前端执行
event: citation  data: { sources: [...] }                  // 联网搜索引用
event: done      data: { finish_reason }
```

语音公式专用链路（`POST /butler/voice-formula`）：
```
asr_partial（实时转写"负b加减根号下…"）→ asr_final →
latex_candidate { latex, confidence, alternatives[] } → done
```

---

## 五、语音公式输入：完整链路设计（用户最兴奋的点）

### 5.1 场景剧本

老师在任意页面打开侧边栏，按住 🎤 说：**"负b加减根号下b平方减4ac，除以2a"**
1. 侧边栏实时显示转写文本（教师能看见 AI 听到了什么）。
2. 出现公式卡片：`x = (-b ± √(b²-4ac)) / 2a`（KaTeX 渲染 + confidence）。
3. 教师点卡片 → MathLive 就地编辑（听错的地方手改）。
4. **按住卡片拖到画布**目标位置松手 → 画布出现该公式元素（未确认态，金色选框可继续调）。
5. 整个过程零"手写公式再识别"，但保留了"教师校对后才落地"的红线。

### 5.2 中文数学口语术语映射表（规则层核心资产，渐进积累）

| 口语 | LaTeX | | 口语 | LaTeX |
|---|---|---|---|---|
| 根号下 X | `\sqrt{X}` | | x 分之 y | `\frac{y}{x}` |
| X 的 n 次方 | `X^{n}` | | X 的算术平方根 | `\sqrt{X}` |
| 加减 | `\pm` | | 乘以/除以 | `\times` `\div` |
| 绝对值 X | `\left\|X\right\|` | | X 的阶乘 | `X!` |
| 正弦/余弦/正切 x | `\sin x` 等 | | ln x / log 以 a 为底 | `\ln x` `\log_a x` |
| e 的 x 次方 | `e^{x}` | | 无穷大 | `\infty` |
| 求和从 i 等于 1 到 n | `\sum_{i=1}^{n}` | | 极限 x 趋于 0 | `\lim_{x \to 0}` |
| 垂直于/平行于 | `\perp` `\parallel` | | 全等/相似 | `\cong` `\sim` |
| 向量 a | `\vec{a}` | | X 的导数 | `X'` 或 `\frac{dX}{dx}` |

### 5.3 三层解析架构（对齐 MathSpeech/speech2latex 的学界结论）

```
语音 → [ASR: 讯飞中文增强 或 Whisper large-v3] → 口语文本
     → L1 术语规则引擎（词典+括号配对栈，覆盖高频结构，快且可解释）
     → 未命中/编译失败 → L2 LLM 解析（few-shot 术语表，Qwen/DeepSeek，<1s）
     → L3 KaTeX/MathLive 编译验证：编译通过才出卡片；失败带错误回 L2 重试一次
     → formula 卡片（latex + alternatives + confidence）
```

- **ASR 选型**：讯飞中文数学场景转写准确率更稳（"b平方"不会丢"平方"）；Whisper 自部署可离线、零调用费。P0 用讯飞 API 快速验证，P1 评估 Whisper 自部署降成本。
- **浏览器端降级路径**（参考 Thomas-McKanna/speech-to-latex）：Web Speech API + 前端规则引擎做纯离线兜底，断网/弱网时可用。
- **数据资产**：每次教师校对（听写→修正后的 latex）都是训练数据，入库积累后 P2 可微调小模型（MathSpeech 路线），把术语解析成本压到近零。

### 5.4 拖拽落地实现要点

- 公式卡片 `dragstart`：`dataTransfer.setData('application/x-v3-element', JSON.stringify({ type:'formula', latex, font_size: 28, ...占位几何 }))`，同时设置自定义 drag image（KaTeX 截图）。
- SlideCanvasV3 `dragover`（校验 MIME）+ `drop`：按 `getBoundingClientRect` 换算 1280×720 逻辑坐标，`createElement()` 进当前 slide，`teacher_confirmed: false`。
- 桌面端叠加 HTML5 DnD；触屏设备降级为「插入到当前选中位置」按钮。

---

## 六、与现有 V3 契约的整合（开发任务拆解）

### 6.1 前端（原型阶段可全部 mock）

| 文件 | 改动 |
|---|---|
| `src/types/teacherV3.ts` | 新增 butler 节：`V3ButlerMessage / V3ButlerCard(V3ButlerFormulaCard\|ActionCard\|LinkCard\|FigureCard) / V3ButlerAction / V3ButlerContext / V3ButlerSession` |
| `src/api/teacherV3.ts` | 新增 `butler.chat(body, onEvent, signal)`（SSE）、`butler.voiceFormula(...)`（SSE）、`butler.confirm(actionId)` |
| `src/mock/teacherV3Server.ts` | mock butler SSE 深链路（含 tool_call→card→action 事件序列、语音公式 asr_partial 流） |
| `src/components/teacherV3/ButlerFab.vue` | 悬浮球（右下角、可拖动贴边） |
| `src/components/teacherV3/ButlerPanel.vue` | 侧边栏三区 + 卡片渲染 + 拖拽源 |
| `src/layouts/TeacherV3Layout.vue` | 挂载 Fab + Panel（侧栏展开时压缩 tv3-main，画布区自适应） |
| `src/components/teacherV3/SlideCanvasV3.vue` | drop 目标：接收 `application/x-v3-element` 落布 |
| `src/pages/teacher-v3/SlidesView.vue` | 支持 query 预填（topic/class/template）——剧本 A 落点 |
| `test/teacher/v3Butler.test.ts` | 组件 + 拖拽 dataTransfer + action Registry 测试 |
| `test/teacher/v3MockContract.test.ts` | 扩展 butler 契约（后端四智能体同构对接面） |

### 6.2 后端（BACKEND_GUIDE 新增第五域：butler）

```
POST /api/teacher-v3/butler/chat            SSE  主对话（意图路由→工具编排→事件流）
POST /api/teacher-v3/butler/voice-formula   SSE  语音公式专用链
GET  /api/teacher-v3/butler/sessions        会话列表（历史）
POST /api/teacher-v3/butler/actions/:id/confirm  确认执行（内部转发对应领域 API，带审计日志）
GET  /api/teacher-v3/butler/tools           工具目录（调试/文档用）
```

后端工具注册表示例（写工具声明为 confirm-required）：
```json
{
  "name": "quiz_import_question",
  "description": "将识别/编辑后的题目结构化入库",
  "confirm_required": true,
  "parameters": { "$ref": "#/schemas/V3QuizQuestion" },
  "api": "POST /teacher-v3/quiz/questions"
}
```

---

## 七、排期建议

| 阶段 | 内容 | 价值锚点 |
|---|---|---|
| **P0** | 悬浮球+侧边栏壳、数学对话（KaTeX）、上下文条、导航跳转（剧本A）、图片存题库（剧本B）、动作确认卡 | chat-to-action 闭环成立，"AI 管家"心智立住 |
| **P1** | 语音公式（ASR+三层解析+可拖拽卡片）、联网搜索（带引用）、文件上传解读（复用 MinerU 链路） | 教师高频输入方式的替代："说公式"比"写公式再识别"快一个数量级 |
| **P2** | 个人知识库 RAG（MinerU+pgvector，个人/教研组/全局三层）、意图路由 L2 小模型降本、语音数据积累与微调 | 差异化护城河：越用越懂这位老师 |
| **P3** | MCP 标准化工具层、主动服务（L4：今日摘要/备课提醒）、跨端悬浮球 | 生态与留存 |

## 八、待拍板决策点

1. **ASR 供应商**：讯飞 API（快、中文数学更稳、按量付费）vs Whisper 自部署（离线、零边际成本、需 GPU 运维）。建议 P0 讯飞、P1 评估自部署。
2. **联网搜索供应商**：博查/博查 API、Tavily、SearXNG 自建。建议 P0 接博查（中文质量）。
3. **确认策略边界**：跳转类 action 是否需要确认卡（建议：同页面 prefill 直接执行，跨页跳转出轻量确认；写操作一律确认）。
4. **悬浮球范围**：仅教师端 V3，还是学生端/科研端共用一套（建议 P0 仅教师端，组件层预留全局挂载）。
5. **数学对话模型**：与既有 generation 域共用同一 LLM 供应商，还是对话走更便宜的模型（建议：对话小模型+生成大模型双轨）。
6. **语音公式 P0 是否进原型**：建议原型阶段用"文本模拟语音输入"（直接打"根号下x加一"走解析链路），真 ASR 挂后端时再接——解析层（L1 规则+L2 LLM+L3 验证）可以先全部用 mock 验证交互。

---

## 附：本报告引用的开源项目与资料

**语音转公式**
- github.com/dkorzh10/speech2latex（ICLR 2026，ASR 纠错 + 端到端双路线，英/俄）
- github.com/hyeonsieun/MathSpeech（AAAI 2025，Whisper + 小语言模型）
- github.com/Thomas-McKanna/speech-to-latex（浏览器端全链路，MIT）
- github.com/mathehertogh/talktex（规则语法范本）
- github.com/ANIMANxd/equa-scribe（Whisper+Gemini 多语言）
- HuggingFace 数据集：marsianin500/Speech2Latex

**交互模式**
- Notion AI（右下角悬浮球+划词+上下文感知）
- 飞书 AI 助手组件（右下角组件+侧边栏+进度可视化+撤销）
- 豆包 PC 工作任务模式（对话与产物同屏）
- WPS 灵犀（落地按钮模式）
- ClassIn X（自然语言指令触达 43 种授课工具）
- GitHub Copilot Web（自动上下文附加、可转 Agent 会话）
- Gamma（一句话进入结构化生成工作流）

**架构**
- Vercel AI SDK client-side tools / onToolCall（ai-sdk.dev）
- LangChain Headless Tools（docs.langchain.com）
- WebMCP 示例（github.com/chetan25/web-mcp-app）
- MCP 规范 2025-11-25 / 2026-07-28（modelcontextprotocol.io）
- MinerU（mineru.net）：公式保留的结构化文档解析
- pgvector：教师级知识库向量存储首选
