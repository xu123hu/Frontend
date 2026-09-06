/**
 * V3.4 · 二次备课共备桌 —— 演示种子数据与确定性建议（PROTOTYPE-ONLY，IFC-V34-a）
 *
 * 诚实边界：
 *  - 以下课例 / 教材页 / 班情 / 共案 / 资源候选均为「演示数据」，用于前端原型走查，不代表真实班级、
 *    不代表已获教材授权（教材页为演示材料，非内置正版全文），不代表真实题库/推荐服务。
 *  - 建议为本地确定性规则生成（本机 Mock），不调用真实模型；所有数学结论均标「需教师核验」。
 *  - 资源候选 ≤3 条，含 available / stale（来源失效） / unverified（外部未核验）三种可用状态。
 */
import type { DeskLesson, DeskSuggestion, DeskBlock, DeskSourceRef } from './prepDesk'
import { DESK_BLOCK_LABELS } from './prepDesk'

/* ==================== 演示来源 ==================== */

const SRC_OLD: DeskSourceRef = {
  id: 'src-old-lesson', kind: 'old-lesson', name: '去年《椭圆及其标准方程（第1课时）》教案',
  sourceLabel: '我的旧课', locator: '我的文档 · 2025-09-18 最后修改', status: 'ok',
  pages: [
    { id: 'pg-old-1', label: '第 1 页 · 教案首页', body: '课题：椭圆及其标准方程（第1课时）\n班级：高二(5)班 · 45 分钟\n主线：定义 → 标准方程 → 判别。教具：细绳、图钉、小黑板。' },
    { id: 'pg-old-2', label: '第 2 页 · 例题页', body: '例 1：焦点在 $x$ 轴、$a=5$、$b=3$，求椭圆的标准方程。\n板书分三步：① 定位（焦点在哪轴）② 定参（$b^2=a^2-c^2$）③ 写方程。\n例 1 后有学生追问：为什么必须 $2a>2c$？（当时口头带过）' },
    { id: 'pg-old-3', label: '第 3 页 · 课后记', body: '细绳实验用时超出预案 3 分钟；定义环节"距离之和"仍有学生理解不稳。下届考虑：把实验前移到预习，或先做对比情境再实验。' },
  ],
}

const SRC_PLAN: DeskSourceRef = {
  id: 'src-common-plan', kind: 'common-plan', name: '备课组共案 · 椭圆（主备：王老师）',
  sourceLabel: '备课组共案', locator: '共案 v3 · §2.2', status: 'ok',
  pages: [
    { id: 'pg-plan-1', label: '第 1 页 · 引入与问题链', body: '共案引入：出示"圆的定义改一个字"对比情境，三问递进：\n① 把"到定点距离等于定长"改成"到两个定点的距离之和等于定长"，轨迹还是圆吗？\n② 这个"和"可以任意小吗？和恰好等于两定点间距离时轨迹是什么？\n③ 你能画出一个大概的形状吗？\n（共案比去年教案多了第②问的约束讨论。）' },
    { id: 'pg-plan-2', label: '第 2 页 · 例题与分层', body: '共案例题：教材例 1 + 一道焦点在 $y$ 轴的变式；\n分层：基础（直接代 $a,b$）、巩固（先判焦轴）、挑战（与圆对照说理）。' },
  ],
}

/* 演示教材页配图（SVG，教学示意风格；真实能力为授权教材整页图，IFC） */
const FIG_ELLIPSE_FOCI = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 220"><ellipse cx="180" cy="110" rx="150" ry="88" fill="rgba(15,71,135,0.06)" stroke="#0f4787" stroke-width="2"/><circle cx="60" cy="110" r="4.5" fill="#c99735"/><circle cx="300" cy="110" r="4.5" fill="#c99735"/><line x1="60" y1="110" x2="230" y2="38" stroke="#c99735" stroke-width="1.4" stroke-dasharray="5 4"/><line x1="300" y1="110" x2="230" y2="38" stroke="#c99735" stroke-width="1.4" stroke-dasharray="5 4"/><circle cx="230" cy="38" r="4" fill="#0f4787"/><text x="52" y="132" font-size="15" fill="#8a6d1d">F1</text><text x="294" y="132" font-size="15" fill="#8a6d1d">F2</text><text x="238" y="34" font-size="15" fill="#0f4787">M</text><text x="150" y="204" font-size="13" fill="#64748b">|MF1|+|MF2| = 2a</text><line x1="60" y1="110" x2="300" y2="110" stroke="#94a3b8" stroke-width="1"/><text x="168" y="104" font-size="12" fill="#64748b">2c</text></svg>'
const FIG_ELLIPSE_AB = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 200"><ellipse cx="180" cy="100" rx="150" ry="86" fill="none" stroke="#0f4787" stroke-width="2"/><line x1="30" y1="100" x2="330" y2="100" stroke="#94a3b8" stroke-width="1"/><line x1="180" y1="6" x2="180" y2="194" stroke="#94a3b8" stroke-width="1"/><text x="172" y="90" font-size="13" fill="#64748b">O</text><text x="22" y="88" font-size="13" fill="#0f4787">A1</text><text x="322" y="88" font-size="13" fill="#0f4787">A2</text><text x="166" y="14" font-size="13" fill="#0f4787">B2</text><text x="166" y="188" font-size="13" fill="#0f4787">B1</text><text x="52" y="196" font-size="13" fill="#64748b">|OA1| = a</text></svg>'

const SRC_TB: DeskSourceRef = {
  id: 'src-textbook-demo', kind: 'textbook-demo', name: '人教A版选择性必修一 · §2.2 椭圆',
  sourceLabel: '演示教材页（非内置正版全文）', locator: 'P38–41', status: 'ok',
  note: '演示材料：按整页版式重排的教学示意（含配图与完整解答），非正版教材扫描件；正式能力需取得授权（IFC）。',
  pages: [
    {
      id: 'pg-tb-38', label: 'P38 · 椭圆的定义',
      body: '【演示教材页 · 按整页版式重排】\n定义：平面内与两个定点 $F_1$、$F_2$ 的距离的和等于常数（大于 $|F_1F_2|$）的点的轨迹叫做椭圆。\n两个定点叫做椭圆的焦点，两焦点间的距离叫做椭圆的焦距。\n（旁注：为什么必须"大于 $|F_1F_2|$"？——"和"恰好等于 $|F_1F_2|$ 时轨迹退化为线段，更小则不存在。见 P40 思考。）',
      figure: FIG_ELLIPSE_FOCI,
    },
    {
      id: 'pg-tb-39', label: 'P39 · 例 1（含解答）',
      body: '【演示教材页 · 按整页版式重排】\n例 1：已知椭圆的两个焦点坐标分别是 $(-3,0)$、$(3,0)$，并且椭圆经过点 $(5,0)$，求它的标准方程。\n解：因为两焦点在 $x$ 轴上，设标准方程为 $\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1\\;(a>b>0)$。\n由焦距 $2c=6$，得 $c=3$；由经过点 $(5,0)$，得 $a=5$。\n所以 $b^2=a^2-c^2=25-9=16$。\n所求标准方程为 $\\frac{x^2}{25}+\\frac{y^2}{16}=1$。',
      figure: FIG_ELLIPSE_AB,
    },
    {
      id: 'pg-tb-40', label: 'P40 · 思考',
      body: '【演示教材页 · 按整页版式重排】\n思考：当 $2a=2c$ 时，轨迹是什么？（线段 $F_1F_2$）当 $2a<2c$ 呢？（轨迹不存在）\n（提示：从细绳实验的极端情形想——绳长恰好等于两钉距离时，笔尖只能画到线段；更短则绷不出图形。）',
    },
    {
      id: 'pg-tb-41', label: 'P41 · 习题 2.2',
      body: '【演示教材页 · 按整页版式重排】\n习题 2.2（节选）\n1. 根据下列条件求椭圆的标准方程：① $a=4$、$c=\\sqrt{7}$，焦点在 $x$ 轴；② 焦点为 $(0,-2)$、$(0,2)$，且经过点 $(1,\\frac{3\\sqrt{2}}{2})$。\n2. 判断下列椭圆焦点的位置，并说明理由：$\\frac{x^2}{9}+\\frac{y^2}{16}=1$；$\\;4x^2+9y^2=36$。',
    },
  ],
}

const SRC_PPT: DeskSourceRef = {
  id: 'src-old-ppt', kind: 'old-lesson', name: '去年课件 · 椭圆第1课时 PPT',
  sourceLabel: '我的旧课 · 上传件', locator: '未上传', status: 'missing',
  note: '文件上传为待接入能力（IFC）——上传后可在来源桌对照翻阅。',
}

const SRC_EXT: DeskSourceRef = {
  id: 'src-ext-example', kind: 'external', name: '「名师课堂」椭圆公开课课例',
  sourceLabel: '外部引用', locator: '网址未核验', status: 'unverified',
  note: '未核验（演示条目）：无法加载正文，不做"全网优秀/已验证"之类承诺。',
}

/* ==================== 演示班情备注 ==================== */

export const DEMO_CLASS_NOTE = '本班班情（演示备注）：学生容易混淆 $a$、$b$、$c$ 三个量；"距离之和为定值"的定义含义不稳定，宜先做细绳实验再符号化。'

/* ==================== 去年同课种子（共备稿从旧课出发） ==================== */

function blk(id: string, type: DeskBlock['type'], text: string, extra: Partial<DeskBlock> = {}): DeskBlock {
  return { id, type, text, origin: 'manual', ...extra }
}

export function seedLessons(): DeskLesson[] {
  const ellipse: DeskLesson = {
    id: 'desk-ellipse-2025',
    topic: '椭圆及其标准方程（第1课时）',
    classId: 'c2-05', className: '高二(5)班',
    textbookVersion: '人教A版（2019）',
    chapter: '选择性必修一 ▸ 圆锥曲线 ▸ 椭圆 ▸ 椭圆及其标准方程',
    lessonType: '新授课', durationMin: 45,
    originLabel: '去年课例（高二(5)班）· 演示数据',
    updatedAt: '2025-09-18 21:04',
    lastStop: '例题 · 例 1（去年停留点）',
    classNote: DEMO_CLASS_NOTE,
    blocks: [
      blk('blk-e-note', 'text', '去年班级：高二(5)班。主线：定义 → 标准方程 → 判别。去年课后记：细绳实验超时 3 分钟，"为什么 2a>2c"没来得及展开——今年要留时间。'),
      blk('blk-e-q1', 'core-question', '核心问题：把圆的定义改成"到两个定点的距离之和为定值"，轨迹会变成什么？这个"和"可以任意小吗？'),
      blk('blk-e-concept', 'concept', '概念形成：细绳实验（图钉 + 细绳画椭圆）→ 板书定义 $|MF_1|+|MF_2|=2a\\;(2a>2c)$ → 建系推导 $\\sqrt{(x+c)^2+y^2}+\\sqrt{(x-c)^2+y^2}=2a$，两次平方化简得 $\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1$。'),
      blk('blk-e-ex1', 'example', '例 1：焦点在 $x$ 轴、$a=5$、$b=3$，求椭圆的标准方程。（答案：$\\frac{x^2}{25}+\\frac{y^2}{9}=1$）板书分三步：定位 → 定参 → 写方程。'),
      blk('blk-e-pit', 'pitfall', '学生可能反应 / 易错点：混淆 $a$、$b$、$c$；忘记检验 $2a>2c$；焦点在 $y$ 轴时照搬"x 分母大"的结论。'),
      blk('blk-e-check', 'checkpoint', '课堂检查点：已知 $a=6$、$c=4$，求标准方程（焦轴自判），2 分钟限时，同桌互批。'),
      blk('blk-e-board', 'board-split', '板书 / PPT 分工：板书留定义与推导主线；PPT 放行星轨道动画与例题对答案。'),
    ],
    sources: [SRC_OLD, SRC_PLAN, SRC_TB, SRC_PPT, SRC_EXT],
    pageNotes: {},
    suggestions: [],
    projections: null,
  }

  const blank: DeskLesson = {
    id: 'desk-blank-template',
    topic: '未命名课时（待补充）',
    classId: 'c2-05', className: '高二(5)班',
    textbookVersion: '人教A版（2019）',
    chapter: '选择性必修一 ▸ 圆锥曲线 ▸ 椭圆 ▸ 椭圆及其标准方程',
    lessonType: '新授课', durationMin: 45,
    originLabel: '空白共备稿（演示教材页）',
    updatedAt: '', lastStop: '',
    classNote: DEMO_CLASS_NOTE,
    blocks: [],
    sources: [SRC_TB, SRC_PLAN],
    pageNotes: {},
    suggestions: [],
    projections: null,
  }

  return [ellipse, blank]
}

/* ==================== 确定性建议（本机 Mock，非真实模型） ==================== */

export function buildSuggestionsFor(block: DeskBlock, lesson: DeskLesson): DeskSuggestion[] {
  const out: DeskSuggestion[] = []
  const basisNote = '依据：本班备注（演示）＋旧课原文；本机 Mock 生成'

  if (block.type === 'core-question') {
    out.push({
      id: `sg-chain-${block.id}`, targetBlockId: block.id, action: 'split-chain', actionLabel: '把核心问题拆成问题链',
      title: `把「${DESK_BLOCK_LABELS[block.type]}」拆成三步问题链`,
      reason: `${basisNote}：单问直给定义，学生缺少"和为什么不能任意小"的冲突体验。`,
      basis: 'ai-demo', before: block.text,
      after: '三步问题链：\n① （保持原问）圆的定义改一个字，轨迹会变成什么？\n② 这个"和"有没有下限？和恰好等于 $|F_1F_2|$ 时轨迹是什么？\n③ 若"和"小于 $|F_1F_2|$ 还有轨迹吗？——第②③问针对本班"定义含义不稳定"设计。',
      needVerify: true, status: 'pending',
    })
  }
  if (block.type === 'example') {
    out.push({
      id: `sg-swap-${block.id}`, targetBlockId: block.id, action: 'swap-example', actionLabel: '建议替换例题',
      title: '把例 1 换成"先判焦轴"的变式',
      reason: `${basisNote}：去年例 1 正确率高（边际价值低），本班混淆 $a,b,c$ 集中，换成必须先判焦轴再定参的变式。`,
      basis: 'class-demo',
      before: block.text,
      after: '变式（对准本班 a、b、c 混淆）：焦点在 $y$ 轴、$c=4$、$2a=10$，先判断焦点位置并写出判别依据，再求标准方程。（答案：$\\frac{y^2}{25}+\\frac{x^2}{16}=1$）',
      needVerify: true, status: 'pending',
    })
  }
  if (block.type === 'concept') {
    out.push({
      id: `sg-board-${block.id}`, targetBlockId: block.id, action: 'board-hint', actionLabel: '整理为板书提示',
      title: '把概念形成整理成板书布局提示',
      reason: `${basisNote}：推导内容多，建议主板书分区，避免学生抄不过来。`,
      basis: 'ai-demo', before: '', after: '板书提示：左侧画"两定一动"图并标注 $2a$；中间留推导主线（两次平方）；右侧写判别对照表（焦点在 x 轴 / y 轴）。', needVerify: false, status: 'pending',
    })
    out.push({
      id: `sg-path-${block.id}`, targetBlockId: block.id, action: 'path-candidate', actionLabel: '提出教学路径候选',
      title: '这个定义可以怎样让学生自己发现？——三条可选路径',
      reason: '依据：已显示的演示教材页 P38 定义 + 备课组共案问题链（本机 Mock，非真实检索）',
      basis: 'ai-demo', before: '', after: '', needVerify: false, status: 'pending',
      pathOptions: [
        { id: 'p-rope', title: '拉绳实验路径', fit: '动手型班级 · 演示教材页 P38 定义前', minutes: 8, keyQuestions: ['绳长固定、两钉固定，笔尖能画出什么？', '把两钉移远一点，图形怎么变？', '绳长比两钉距离小会怎样？'] },
        { id: 'p-analogy', title: '圆的定义类比路径', fit: '基础较弱班级 · 时间紧时', minutes: 5, keyQuestions: ['圆的定义改一个字会怎样？', '"和"能等于两定点距离吗？', '画一画你猜的形状'] },
        { id: 'p-locus', title: '轨迹问题先行路径', fit: '程度较好的班级', minutes: 7, keyQuestions: ['到两定点距离之和为 10、两定点相距 6 的点集是什么？', '把 10 改成 6 呢？', '如何用坐标把这件事写出来？'] },
      ],
      chosenPathId: 'p-rope',
    })
    // 先把默认选中的路径填充进 after
    const first = out[out.length - 1]
    const p = first.pathOptions![0]
    first.after = `问题链（${p.title}，约 ${p.minutes} 分钟）：\n${p.keyQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
  }
  if (block.type === 'pitfall') {
    out.push({
      id: `sg-check-${block.id}`, targetBlockId: block.id, action: 'add-checkpoint', actionLabel: '补一个检查理解的证据',
      title: '易错点后补一个当堂检查点',
      reason: `${basisNote}：当前片段只列出易错点，缺少"学生做一道才知道有没有懂"的检查证据。`,
      basis: 'ai-demo', before: '',
      after: '检查点：出示错例"$\\frac{x^2}{9}+\\frac{y^2}{16}=1$，所以焦点在 $x$ 轴"，让学生先判断对错、再说判别依据（针对 $a,b,c$ 混淆）。',
      needVerify: true, status: 'pending',
    })
  }
  return out
}

/* ==================== 伴随资源候选（≤3 条，确定性池） ==================== */

export interface DeskResourceCandidate {
  id: string
  name: string
  layerLabel: string            // 来源类别
  locator: string               // 对应教材版本 / 页码 / 主题
  why: string                   // 为什么推荐
  availability: 'available' | 'stale' | 'unverified'
  availabilityLabel: string
  note?: string
  preview: string
  takeLabel: string             // 只取这一段 / 这一题 / 这两问
  takeType: DeskBlock['type']
  takeText: string
  /** 取用后在共备稿中关联的来源桌条目（外部未核验来源无此字段，靠引用卡自述） */
  sourceRefId?: string
}

const POOL: Record<string, DeskResourceCandidate[]> = {
  'core-question': [
    {
      id: 'res-chain-plan', name: '备课组共案 · 「改变条件」三问问题链', layerLabel: '备课组共案', locator: '共案 v3 · P2 · §2.2 椭圆',
      why: '共案比你的核心问题多了"和的下限"这一问，直接暴露定义约束',
      availability: 'available', availabilityLabel: '可用',
      preview: '① 轨迹还是圆吗？② "和"可以任意小吗？和等于两定点距离时是什么？③ 画出你猜的形状。',
      takeLabel: '只取这两问', takeType: 'core-question', sourceRefId: 'src-common-plan',
      takeText: '问题链（取自备课组共案，共案 v3 · P2）：\n② 这个"和"可以任意小吗？和恰好等于 $|F_1F_2|$ 时轨迹是什么？\n③ 画出你猜的大概形状，再用细绳实验验证。',
    },
    {
      id: 'res-q-lastyear', name: '去年当堂检测 · 定义三连问', layerLabel: '我的旧课', locator: '去年教案 · 检测页（2025-09）',
      why: '三道直查小题去年当堂 2 分钟可完成，可挪作今年引入后的快检',
      availability: 'available', availabilityLabel: '可用',
      preview: '① 定义里哪个量是定值？② $2a$ 与 $|F_1F_2|$ 谁大？③ 焦点坐标怎么读？',
      takeLabel: '只取这一段', takeType: 'checkpoint', sourceRefId: 'src-old-lesson',
      takeText: '快检（取自去年检测 · 2025-09）：① 定义里哪个量是定值？② $2a$ 与 $|F_1F_2|$ 谁大？③ 焦点坐标怎么读？（1 分钟，同桌互批）',
    },
    {
      id: 'res-ext-qs', name: '外部 · "椭圆引入"问题串', layerLabel: '外部引用', locator: '网址未核验 · 主题：椭圆引入',
      why: '思路与共案类似，可作对照（但来源未核验，谨慎取用）',
      availability: 'unverified', availabilityLabel: '未核验',
      note: '外部来源未核验：无法确认作者、版本与适用性，取用将带"未核验"标记',
      preview: '（未核验来源，正文不可加载）',
      takeLabel: '仅作引用卡', takeType: 'quote',
      takeText: '【外部引用 · 未核验】"椭圆引入"问题串（来源待核验，正文不可加载）——仅作线索，不进正文。',
    },
  ],
  example: [
    {
      id: 'res-tb-ex2', name: '教材例 2 · 已知焦点求标准方程', layerLabel: '演示教材页（非内置正版全文）', locator: '演示教材页 P39–40 · 人教A版选择性必修一',
      why: '教材例题与定义推导无缝衔接，比旧例 1 多一步"由焦点定参"',
      availability: 'available', availabilityLabel: '可用',
      preview: '【演示教材页 · 节选】已知两个焦点坐标 $(-3,0)$、$(3,0)$，且经过点 $(5,0)$，求标准方程。',
      takeLabel: '只取这一题', takeType: 'example', sourceRefId: 'src-textbook-demo',
      takeText: '例 2（演示教材页 P39 · 人教A版选择性必修一）：已知两个焦点坐标 $(-3,0)$、$(3,0)$，且经过点 $(5,0)$，求椭圆的标准方程。（需教师核验答案：$\\frac{x^2}{25}+\\frac{y^2}{16}=1$）',
    },
    {
      id: 'res-school-y', name: '校本 · 焦点在 y 轴的判别变式', layerLabel: '校本题库', locator: '校本题库 · 椭圆标准方程（用 11 次）',
      why: '强制先判焦轴，正对准本班 $a,b,c$ 混淆',
      availability: 'available', availabilityLabel: '可用',
      preview: '焦点在 $y$ 轴，$a=5$，$c=3$，求椭圆标准方程，并说明判别依据。',
      takeLabel: '只取这一题', takeType: 'example',
      takeText: '变式（校本题库 · 椭圆标准方程）：焦点在 $y$ 轴，$a=5$，$c=3$，求椭圆标准方程，并写出判别依据。（答案：$\\frac{y^2}{25}+\\frac{x^2}{16}=1$，需教师核验）',
    },
    {
      id: 'res-old-ppt-fig', name: '去年课件里的例 1 配图', layerLabel: '我的旧课 · 上传件', locator: '去年课件 PPT · 第 4 页',
      why: '配图可直接沿用——但原 PPT 尚未上传',
      availability: 'stale', availabilityLabel: '来源失效',
      note: '来源失效（演示）：文件未上传，取用不可用；可先上传（待接入能力）或继续手写',
      preview: '（文件缺失，无法预览）',
      takeLabel: '取用（不可用）', takeType: 'quote', takeText: '',
    },
  ],
  pitfall: [
    {
      id: 'res-plan-pit', name: '备课组共案 · 易错辨析两条', layerLabel: '备课组共案', locator: '共案 v3 · P3 · 易错辨析',
      why: '共案多一条"$2a=2c$ 退化"的极端情形，可补你的易错点清单',
      availability: 'available', availabilityLabel: '可用',
      preview: '① 混淆判别方式；② $2a=2c$ 时轨迹退化为线段（让学生画一画）。',
      takeLabel: '只取这一段', takeType: 'pitfall', sourceRefId: 'src-common-plan',
      takeText: '补一条（取自备课组共案 v3 · P3）：$2a=2c$ 时轨迹退化为线段——让学生动手画，先猜再验证。',
    },
    {
      id: 'res-tb-think', name: '演示教材页 · P40「思考」', layerLabel: '演示教材页（非内置正版全文）', locator: '演示教材页 P40 · 思考栏',
      why: '教材思考题即极端情形讨论，与共案互相印证',
      availability: 'available', availabilityLabel: '可用',
      preview: '【演示教材页 · 节选】思考：当 $2a=2c$ 时，轨迹是什么？当 $2a<2c$ 呢？',
      takeLabel: '只取这一段', takeType: 'quote', sourceRefId: 'src-textbook-demo',
      takeText: '教材思考题（演示教材页 P40）：当 $2a=2c$ 时，轨迹是什么？当 $2a<2c$ 呢？（提示：从细绳实验的极端情形想。）',
    },
    {
      id: 'res-ext-pit', name: '外部 · "椭圆易错合集"', layerLabel: '外部引用', locator: '网址未核验 · 主题：椭圆易错',
      why: '标题相关，但未核验',
      availability: 'unverified', availabilityLabel: '未核验',
      note: '外部来源未核验：不展示伪装正文',
      preview: '（未核验来源，正文不可加载）',
      takeLabel: '仅作引用卡', takeType: 'quote',
      takeText: '【外部引用 · 未核验】"椭圆易错合集"（来源待核验，正文不可加载）。',
    },
  ],
}

/** 资源候选：≤3 条；无匹配返回空数组（界面给"继续手写 / 手动插入"路径） */
export function buildResourcesFor(block: DeskBlock): DeskResourceCandidate[] {
  return (POOL[block.type] || []).slice(0, 3)
}
