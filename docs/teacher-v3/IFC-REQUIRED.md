# IFC-REQUIRED 清单（教师端 V3 原型整改期间持续维护）

> 规则：前端原型允许用"本地 view model + 诚实 fixture"先行（不伪造后端完成度）；凡涉及共享 types/API/持久化/跨工件状态的变化，在此登记，原型验证通过后走正式 IFC 流程合并进 IFC-PRODUCT-01/02/03。
> 状态：`PROTOTYPE-ONLY`（当前仅前端本地） / `待批`（建议进入下一轮 IFC 评审）。

| 编号 | 内容 | 触及批次 | 当前状态 | 正式化路径 |
|---|---|---|---|---|
| IFC-PRODUCT-01 | Lesson Work Item / 课时上下文（lessonId、class、chapter、topic、产物指针；跨 Today/Prep/Slides/Quiz/Classroom/Insights） | B0-B2（当前用页面内 view model + URL query 过渡） | PROTOTYPE-ONLY | 字段映射表已交（阶段 A 补充报告 §7.3），随 B3 批准升 `待批` |
| IFC-PRODUCT-01a | deck/plan 生成输入扩展：textbook/chapter/duration/source_refs/outline_confirmed | B0（mock 内部按课题路由，未改请求签名） | PROTOTYPE-ONLY | 与 LessonWorkItem 同包评审 |
| IFC-PRODUCT-02 | Butler 上下文与动作：resource_id/plan_id/assignment_id/真实 slide_index、insert/prefill 动作、ArtifactReceipt、幂等 requestId | B0（插入请求暂以诚实回退实现） | PROTOTYPE-ONLY | B6 实施时出最小契约草案 |
| IFC-B6-a | **页面上下文总线**：`teacherContext`（deck/plan/slide/selection/class 的实时写入），view-model 本地 reactive；正式化为 V3ButlerContext 扩展字段（deck_title/slide_count/class_id/topic） | B6 | PROTOTYPE-ONLY | 随 PRODUCT-02 评审 |
| IFC-PRODUCT-03 | 作业生命周期：发布/截止/答案策略/提交扫描/状态机；批改 standard_answer/rubric/evidence/confidence/individual override | B4 待实施 | 未开工 | Quiz→Assign 接通时出草案 |
| IFC-B2-a | **教学意图追踪的目标-工件关联**：objective_id、目标↔环节/例题/检测/作业/课件的稳定引用与版本；当前 `intentTrace.ts` 为本地启发式（词表匹配，无持久化） | B2 | PROTOTYPE-ONLY | 启发式原型通过教师测试后，将 objective_id + coverage 记录纳入 PRODUCT-01 |
| IFC-B2-b | **旧课二备的跨课引用与版本**：old_plan_id 引用、diff 记录（接受/拒绝/依据）持久化、"恢复原版"的版本快照；当前为前端内存克隆 + 同 id 写回（保存前可恢复，保存后原版被覆盖——已在 UI 注明） | B2 | PROTOTYPE-ONLY | 作为 PRODUCT-01 的 plan 版本字段扩展提案 |
| IFC-C1-a | **AI 备课台输入扩展与接地上下文**：deck-outline / generation-deck 请求新增 `chapter`（内容源锚定）/ `course_type`（环节语义大纲结构：习题/讲评/复习各有环节链）/ `material_name`；`V3Deck` 新增可选 `brief_context`（课型/章节/材料回显）；新增 `V3BriefPayload` 前端 view model。文档材料原型不解析仅记录（解析属后端 M2） | C1 | PROTOTYPE-ONLY | 并入 IFC-PRODUCT-01a 同包评审（chapter/course_type 即 01a 已列的 textbook/chapter 字段的落地形态） |
| IFC-C2-a | **全局伴随工具层**：companion 状态仓（覆盖层互斥 / 插入回执+撤销 / 绘图暂存 localStorage）；`tv3-companion-insert / -inserted / -locate` 窗口事件插入总线（reqId 命名空间 draw-* / res-*）；`V3ButlerCard` 新增 `tool` 卡（resource/draw，AI 调用工具而非聊天丢题）；DrawBoard 新增 `contextLabel` prop 与 `stash` emit；PrepView 新增"伴随资源素材条"。候选与推荐理由均为确定性 mock（真实推荐与题库供给需商务授权或自建） | C2 | PROTOTYPE-ONLY | Butler 动作并入 IFC-PRODUCT-02；资源语义（来源层/授权/跨工件引用/暂存持久化）随资源域契约评审 |
| IFC-P-a | **备课中心整链路重建（新 PrepCenterView 替换路由挂载，旧 PrepView.vue 文件保留未删仅摘路由）**：`/generation/plan/outline` 响应新增富模块 `objectives / keypoints / blackboard / homework / difficulty` 与 `requirements[]` 词表回应（notes 记录）；新增 `/teacher-v3/prep-templates` 路由（模板库：我的模板/内置标准/优质课蓝本【虚构示范数据】/资源库引用）；ailp 设计令牌 scoped 于 `.ailp-root`；prepChain 链路状态仓；上传解析结果为演示样例（置信度带标注，红线 DEF-09 遵守）；编辑器自动保存/导出为演示文案，AI 优化为后端能力诚实提示 | P | PROTOTYPE-ONLY | 富大纲模块并入 IFC-PRODUCT-01a；模板库/优质课蓝本的真实供给与版权需单独决策 |
| IFC-CANDIDATE-InkRecognition | 手写真实轨迹（Mathpix strokes 形态）+ 候选 + 局部置信度 + 拒识四态 | B1 诚实化（当前固定样例池+演示标注） | PROTOTYPE-ONLY | 评测集冻结后评审 |
| IFC-CANDIDATE-VoiceMath | 真语音：audio/session 契约 + 候选结构 + 消歧 | B1（P0 文本模拟已标注） | PROTOTYPE-ONLY | — |
| IFC-CANDIDATE-GeometryConstruction | 几何构造依赖图（对象引用/约束/求交/虚实线） | Batch 7 待实施 | 未开工 | 独立实验页通过后评审 |
| IFC-GEOM-01 | **立体几何构造文档契约**：`V3DrawRecord` 新增 `{ kind:'geomdoc'; doc }` 变体（doc=GeomDoc 快照：objects[]（点带 free/sum/onEdge/midpoint/ratio/intersect 依赖定义 + segment/vector/section/solid）+ camera）。落库路径：deck 元素 `draw_recipe.records[0]`、图形库 records（mock 直通）。真实后端需：records JSON 透传持久化 + 图形库缩略图存储；渲染在前端（doc→SVG），后端不理解 doc 内部结构 | draw-reality 阶段 C（GeomMode/DrawBoard 立体几何 tab/SlidesView 重开分支） | PROTOTYPE-ONLY | 并入原 CANDIDATE-GeometryConstruction 评审；正式化时 doc schema 定稿为版本化 JSON（当前无 version 字段，兼容策略=前端自带解析器） |
| IFC-GEOM-02 | **构造描述→算子接口（AI 构图预留）**：`applyConstruction(doc, text) → { applied[], uncovered[] }`，当前为确定性词表解析；Mode 3（LLM）实现时仅替换解析器为 LLM→同一算子集（建骨架/中点/比例点/交点/连接/虚实/截面/向量），uncovered 语义保留（未采纳要求必须披露）。对齐 GeoBuildBench（arXiv:2605.13167）DSL 方向 | draw-reality 阶段 C | PROTOTYPE-ONLY | LLM 接入时与 Butler 域（PRODUCT-02）同评：prompt/上下文/回执结构 |
| IFC-WS-a | **课件工坊备小研链路改版**：①生成链路重排为 需求→大纲确认（可编辑卡片+分钟数+NL调整条）→选择模板（画廊+实时预览+应用范围/字号档/边注）→生成（SSE）；②deck-outline 响应新增 `outline[].minutes`（kind→分钟确定性映射）；③新端点 `POST /recognition/preview`（fixture 演示识别，可编辑文本仅预览校对，正式识别仍以 photo-ingest 为准）；④模板 catalog 新增 `tpl-warm-orange`；⑤教案直通改走「环节→页数映射→大纲确认→统一 generation.deck」（plans.pushToDeck 在此链路不再使用，端点保留）；⑥WorkshopFlow.vue 为纯展示层（ws 控制器注入），旧 BriefComposer/tv3-new 旧版向导模板被替换（BriefComposer.vue 文件保留未引用）。类型层 generation.deck 仍 as any（随 PRODUCT-01a 评审） | WS 改版（WorkshopFlow + SlidesView 接入 + mock 增量 + v3Workshop.test） | PROTOTYPE-ONLY | 正式化时：outline minutes/preview 进 OpenAPI；模板 catalog 后端化；材料解析（docs）接后端 M2 后材料路由自动生效 |
| IFC-V34-a | **二次备课共备桌原型状态层**：`src/pages/teacher-v3/prepDesk.ts` 定义 WorkspaceLesson/WorkspaceBlock/SourceReference/SuggestionPatch/ProjectionSnapshot/UndoRecord 六个原型对象；版本化 localStorage 命名空间 `tv3-prep-desk/v1`（损坏/版本不兼容→备份 `*.corrupt-backup` + 重新开始路径）；撤销为文档快照栈（随刷新恢复，切换课例清空以防跨课污染）；演示建议/资源候选为本地确定性规则（本机 Mock，非真实模型/检索）。不进 teacherV3.ts 共享类型、不进生产 API。正式化需：块级稳定 ID 与版本、建议 diff 持久化契约、真实建议服务与置信度、来源引用的资源 ID（resource_id/asset_id） | V3.4 | PROTOTYPE-ONLY | 作为 PRODUCT-01（Lesson Work Item）的块级扩展提案同包评审 |
| IFC-CANDIDATE-LessonDocument | 教案三字符串 → 富文档节点（内联公式/题目卡原生存储） | 暂缓（B1 双态编辑器已绕开：存储仍为 `$..$` 字符串） | 暂缓 | 双模式被教师接受后再议 |

## 冻结面遵守声明（截至 B2）

- `src/types/teacherV3.ts` 既有字段与 `src/api/teacherV3.ts` 既有签名：**未修改**。
- mock（teacherV3Server/Data）内的行为修复与内容源新增：属原型事实层，已按"真实性止血"授权执行，未伪造任何真实能力。
- 用户未提交改动（docs/teacher-optimize 删除等）：未触碰。
