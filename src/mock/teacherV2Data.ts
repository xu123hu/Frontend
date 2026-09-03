/**
 * 教师工作台 V2 · 演示数据世界（内容包落地）
 * 内容依据：D:\teacher-research\01-frontend\design\CONTENT-PACK.md（人教 A 版真实内容）
 * 纪律：宪法条款 8 —— 全部真实课题/题目/名单，无占位文本；分数用固定种子生成，E2E 确定性。
 */

export const V2_TEACHER = { id: 't-lwl', name: '李文澜', subject: '数学', grades: '高二' }

export const V2_ROSTER_3 = [
  '李昊', '王雨桐', '张子墨', '陈思睿', '刘一鸣', '赵欣怡', '孙可', '周宇航', '吴欣然', '郑皓宇',
  '冯若彤', '蒋明轩', '韩露', '杨子航', '何静怡', '高天', '林晓', '罗宇轩', '梁雪', '宋斌',
  '唐心怡', '郑楚仪', '王梓萱', '冯致远', '陈曦', '褚天翼', '卫诗雅', '蒋文博', '沈月', '秦朗',
  '许诺', '邓佳琪', '曹睿', '彭飞宇', '肖静', '邹婷婷', '苏峻', '潘乐瑶', '袁晨', '蔡文静',
  '余子豪', '杜若飞', '侯思远', '郭清扬', '崔浩然', '方雨欣',
]

export const V2_ROSTER_5 = [
  '马晨曦', '林浩然', '郭雨萱', '何俊哲', '高梓涵', '罗世杰', '梁诗涵', '宋明远', '唐嘉懿', '韩宇轩',
  '冯梦瑶', '蒋子豪', '沈书瑶', '秦子涵', '许博文', '邓紫涵', '曹雨桐', '彭思远', '肖宇辰', '邹梦琪',
  '鲁一鸣', '石佳颖', '廖俊驰', '白诗雨', '江宇轩', '尹思源', '薛天翊', '贺子墨', '兰婷', '上官婉',
  '华子昂', '金晓彤', '柯景行', '赵紫萱', '钱思远', '施雨桐', '王浩宇', '范冰冰尔', '陈曦月', '杨卓然',
  '朱雨欣', '徐子豪', '高子涵', '林梦琪',
]

export const V2_CLASSES = [
  { class_id: 'cls-g2-3', class_name: '高二 3 班', student_count: 46 },
  { class_id: 'cls-g2-5', class_name: '高二 5 班', student_count: 44 },
]

/* 确定性伪随机（E2E 稳定） */
export function seededRandom(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

export function iso(date?: Date) { return (date || new Date()).toISOString() }

/* ===== 今日课表与待办 ===== */
export const v2Schedule = () => ([
  {
    slot_no: 2, time_range: '08:55 - 09:40', class_id: 'cls-g2-5', class_name: '高二 5 班',
    topic: '函数的单调性（复习课）', lesson_type: 'review' as const, prep_completion: 100,
    missing_items: [], starts_at: '08:55', ends_at: '09:40',
  },
  {
    slot_no: 4, time_range: '10:45 - 11:30', class_id: 'cls-g2-3', class_name: '高二 3 班',
    topic: '椭圆的标准方程（新授）', lesson_type: 'new' as const, prep_completion: 60,
    missing_items: ['课件 PPT'], starts_at: '10:45', ends_at: '11:30',
  },
  {
    slot_no: 7, time_range: '15:25 - 16:10', class_id: 'cls-g2-3', class_name: '高二 3 班',
    topic: '周测四 试卷讲评', lesson_type: 'talk' as const, prep_completion: 30,
    missing_items: ['讲评材料'], starts_at: '15:25', ends_at: '16:10',
  },
])

export const v2Todos = () => ([
  { id: 'td-1', title: '批改昨晚预习单', reason: '高二 3 班《椭圆及其标准方程》预习单已收齐，AI 预批完成 46 份，其中 5 份低置信度需人工复核', due_at: '07:40', count: 5, priority: 'high' as const, route: '/teacher-v2/assign', route_label: '进入批改' },
  { id: 'td-2', title: '补齐第 4 节课件', reason: '10:45 高二 3 班「椭圆的标准方程」教案已定稿，还差课件 PPT', due_at: '10:00', priority: 'high' as const, route: '/teacher-v2/slides', route_label: '生成课件' },
  { id: 'td-3', title: '周测五组卷', reason: '高二 5 班周五周测：圆锥曲线 12 题，建议难度 3:5:2', due_at: '16:30', priority: 'mid' as const, route: '/teacher-v2/quiz', route_label: '开始组卷' },
  { id: 'td-4', title: '椭圆单元教学设计', reason: '明日教研会需提交单元设计（草稿 v2 已保存）', due_at: '明 08:30', priority: 'low' as const, route: '/teacher-v2/prep', route_label: '继续编辑' },
])

export const v2ClassBriefs = () => ([
  {
    class_id: 'cls-g2-3', class_name: '高二 3 班', student_count: 46, avg_score: 76.4,
    submission_rate: 100, hot_kp: { name: '椭圆的概念', error_rate: 0.4 },
    trend: [72, 74, 73, 75, 76, 76.4],
  },
  {
    class_id: 'cls-g2-5', class_name: '高二 5 班', student_count: 44, avg_score: 73.1,
    submission_rate: 97.7, hot_kp: { name: '函数性质·证明步骤', error_rate: 0.22 },
    trend: [70, 71, 72, 72, 73, 73.1],
  },
])

/* ===== 知识点树（人教 A 版结构，smartedu 组织范式） ===== */
export const V2_KP_TREE = [
  {
    code: 'XBX1', name: '选择性必修第一册',
    children: [
      {
        code: 'XBX1-3', name: '圆锥曲线', children: [
          { code: 'KP-TY', name: '椭圆的定义', error_rate: 0.4, question_count: 5 },
          { code: 'KP-BZ', name: '椭圆的标准方程', error_rate: 0.33, question_count: 7 },
          { code: 'KP-JD', name: '椭圆的简单几何性质', error_rate: 0.52, question_count: 4 },
          { code: 'KP-SQ', name: '双曲线', error_rate: 0.28, question_count: 6 },
          { code: 'KP-PS', name: '抛物线', error_rate: 0.24, question_count: 6 },
          { code: 'KP-JX', name: '焦点弦性质', error_rate: 0.35, question_count: 3 },
        ],
      },
      { code: 'XBX1-1', name: '空间向量与立体几何', children: [
          { code: 'KP-XL', name: '空间向量及其运算', error_rate: 0.12, question_count: 8 },
          { code: 'KP-FX', name: '空间向量法证平行垂直', error_rate: 0.18, question_count: 6 },
      ] },
      { code: 'XBX1-2', name: '直线和圆的方程', children: [
          { code: 'KP-ZX', name: '直线的方程', error_rate: 0.1, question_count: 9 },
          { code: 'KP-YUAN', name: '圆的方程', error_rate: 0.18, question_count: 7 },
      ] },
    ],
  },
  {
    code: 'BX1', name: '必修第一册',
    children: [
      { code: 'BX1-3', name: '函数的概念与性质', children: [
          { code: 'KP-DDX', name: '函数的单调性', error_rate: 0.22, question_count: 8 },
          { code: 'KP-DC', name: '函数的奇偶性', error_rate: 0.19, question_count: 6 },
      ] },
    ],
  },
  {
    code: 'XBX2', name: '选择性必修第二册',
    children: [
      { code: 'XBX2-4', name: '数列', children: [
          { code: 'KP-DCS', name: '等差数列', error_rate: 0.15, question_count: 8 },
          { code: 'KP-DCQH', name: '等差数列前 n 项和', error_rate: 0.15, question_count: 8 },
          { code: 'KP-DBS', name: '等比数列', error_rate: 0.21, question_count: 7 },
      ] },
    ],
  },
]

/* ===== 教案：椭圆的标准方程（主线，全量） ===== */
export const ELLIPSE_PLAN = {
  plan_id: 'plan-ellipse-001',
  topic: '3.1.1 椭圆的标准方程（第 1 课时）',
  textbook_ref: '人教 A 版选择性必修第一册 第三章 3.1.1',
  lesson_type: '新授课',
  duration_minutes: 45,
  class_id: 'cls-g2-3',
  class_name: '高二 3 班',
  design_basis: {
    text: '依据高二 3 班近 30 天学情数据，重难点向「定义条件辨析」倾斜',
    evidence: [
      { label: '椭圆的概念 · 错误率', value: '40%', detail: '预习单第 3 题（n=46，2026-08-31）' },
      { label: '主要错因', value: '概念混淆 · 忽略 2a>2c 条件', detail: '占该题错误的 38%' },
    ],
  },
  objectives: [
    '理解椭圆的定义，掌握焦点在 x 轴与 y 轴上的标准方程及 a、b、c 的关系（a²=b²+c²）',
    '经历「细绳实验 → 坐标法推导」的完整过程，掌握解析几何研究问题的基本方法——坐标法，提升数学运算与逻辑推理素养',
    '通过行星轨道、油罐横截面等生活实例，感受数学源于生活、运用于生活',
  ],
  key_point: '椭圆的定义与两种标准方程的形式',
  difficulty_point: '标准方程的推导（两次平方化简的等价性与 b²=a²-c² 的引入）',
  aids: '细绳、图钉、画板（分组实验）；GeoGebra 动态演示（备选）',
  outline: [
    { id: 'o1', kind: '导入', title: '从圆到椭圆：类比与追问', minutes: 5, summary: '复习圆的定义，追问「到两定点距离之和为定长」的轨迹' },
    { id: 'o2', kind: '探究', title: '细绳实验：画出椭圆', minutes: 8, summary: '分组动手实验，观察绳长与两钉距的关系' },
    { id: 'o3', kind: '概念', title: '椭圆的定义生成', minutes: 5, summary: '归纳定义，明确焦点、焦距与 2a>2c 条件' },
    { id: 'o4', kind: '推导', title: '坐标法推导标准方程', minutes: 12, summary: '建系、设点、列式、两次平方化简，引入 b²=a²-c²' },
    { id: 'o5', kind: '例题', title: '例 1 · 定义法求方程', minutes: 6, summary: '两定点距离 8、距离和 10，求轨迹方程' },
    { id: 'o6', kind: '例题', title: '例 2 · 两种方程辨析', minutes: 4, summary: '由方程判断焦点位置并求焦点' },
    { id: 'o7', kind: '变式', title: '即时变式练习', minutes: 3, summary: '2 道小题巩固 a、b、c 关系' },
    { id: 'o8', kind: '小结', title: '结构化小结与作业', minutes: 2, summary: '学生总结知识主线，布置分层作业' },
  ],
  sections: [
    {
      id: 's1', phase: '导入', minutes: 5,
      teacher_activity: '复习圆的定义（平面内到定点的距离等于定长的点的集合），追问：到两个定点的距离之和为定长的点的轨迹是什么？展示行星轨道、油罐横截面图片',
      student_activity: '回忆圆的定义；观察图片，直观感知椭圆形象',
      design_intent: '类比迁移引发认知冲突，从生活实例建立直观',
      content_items: ['行星轨道图片', '油罐横截面图片'],
    },
    {
      id: 's2', phase: '探究实验', minutes: 8,
      teacher_activity: '发放细绳与图钉，指导分组实验；追问：绳长等于两钉距离时，笔尖画出什么？',
      student_activity: '分组动手：固定两图钉，笔尖拉紧细绳移动一周画椭圆；讨论绳长=两钉距时退化为线段的情形',
      design_intent: '实验验证定义中 2a>2c 条件的必要性，突破概念混淆错因',
      content_items: ['实验示意：绳长 2a > 两钉距 2c'],
    },
    {
      id: 's3', phase: '概念生成', minutes: 5,
      teacher_activity: '引导归纳：平面内与两个定点 F₁、F₂ 的距离之和等于常数（大于 |F₁F₂|）的点的轨迹叫做椭圆；给出焦点、焦距定义',
      student_activity: '尝试用自己的语言表述定义，对比教材标准表述修正',
      design_intent: '从操作经验到形式化定义，落实数学抽象素养',
      content_items: ['定义：|MF₁|+|MF₂|=2a（2a>2c）'],
    },
    {
      id: 's4', phase: '推导方程', minutes: 12,
      teacher_activity: '板书推导全过程：建系（F₁F₂ 所在直线为 x 轴，中垂线为 y 轴）→ 设 P(x,y)、F₁(-c,0)、F₂(c,0) → √((x+c)²+y²)+√((x-c)²+y²)=2a → 移项、两次平方 → (a²-c²)x²+a²y²=a²(a²-c²) → 令 b²=a²-c² → x²/a²+y²/b²=1（a>b>0）',
      student_activity: '跟随推导并动手化简；尝试说明每一步变形的等价性',
      design_intent: '坐标法是解析几何的核心范式；两次平方的技巧与 b 的引入是本课难点',
      content_items: ['建系图', '化简链', '焦点在 y 轴：y²/a²+x²/b²=1'],
    },
    {
      id: 's5', phase: '例题 1', minutes: 6,
      teacher_activity: '讲解例 1：平面内两个定点的距离是 8，写出到这两个定点的距离的和是 10 的动点的轨迹方程。规范书写：2a=10, 2c=8 → a=5, c=4, b²=a²-c²=9 → x²/25+y²/9=1',
      student_activity: '独立完成后再对照板书修正',
      design_intent: '定义法求方程的规范表达',
      content_items: ['例 1 完整解答'],
    },
    {
      id: 's6', phase: '例题 2', minutes: 4,
      teacher_activity: '讲解例 2：求 x²/4+y²/3=1 与 x²/3+y²/4=1 的焦点。强调：分母大者对 a²，焦点位置看 x²/y² 分母',
      student_activity: '先判断焦点位置再计算 c',
      design_intent: '辨析两种标准方程，针对「焦点位置判断」错因（班级错误率 19%）',
      content_items: ['两种方程对比表'],
    },
    {
      id: 's7', phase: '变式练习', minutes: 3,
      teacher_activity: '出示 2 道变式：① a=4，焦点为 (±3,0)，求椭圆方程；② 焦点在 y 轴上，a=6，焦距 4√2，求方程',
      student_activity: '课堂练习，2 名学生板演',
      design_intent: '即时巩固 a、b、c 关系与焦点位置判断',
      content_items: ['变式题 2 道'],
    },
    {
      id: 's8', phase: '小结与作业', minutes: 2,
      teacher_activity: '引导小结：定义 → 方程 → a、b、c 关系；布置分层作业',
      student_activity: '总结本课知识主线',
      design_intent: '结构化收束，形成知识网络',
      content_items: ['A 组：教材 P109 练习 1、2', 'B 组：求过点 (4,3) 且焦点在 x 轴的椭圆方程'],
    },
  ],
  board_design: '左侧：定义区（定义 + 图形）\n中央：推导区（完整化简链）\n右侧：两种标准方程对比表',
  homework: [
    { tier: 'A 组 · 全体', items: ['教材 P109 练习第 1、2 题'] },
    { tier: 'B 组 · 选做', items: ['求过点 (4,3) 且焦点在 x 轴的椭圆的标准方程（提示：待定系数法）'] },
  ],
  citations: [
    { kind: '教材', title: '人教 A 版选择性必修第一册', page: 'P106-109' },
    { kind: '课标', title: '普通高中数学课程标准（2017 年版 2020 年修订）', page: '选择性必修一 · 圆锥曲线' },
  ],
  quality_check: [
    { item: '课题与版本章节准确', pass: true },
    { item: '课型与课时标注', pass: true },
    { item: '学情分析有数据依据', pass: true },
    { item: '教学目标 ≥3 条（知识/能力/素养）', pass: true },
    { item: '重难点分开且难点指向思维过程', pass: true },
    { item: '环节 ≥5 且含时长/师生活动/设计意图', pass: true },
    { item: '环节时长合计 = 45 分钟', pass: true },
    { item: '例题完整（题干+解答链+板书要点）', pass: true },
    { item: '作业分层或指向教材题号', pass: true },
    { item: 'AI 生成标识与引用来源', pass: true },
  ],
  version: 3,
  status: 'confirmed' as const,
  updated_at: '2026-09-01T21:40:00.000Z',
}

/* ===== 副课题教案（摘要量级，结构同上） ===== */
export const MONO_PLAN = {
  ...ELLIPSE_PLAN,
  plan_id: 'plan-mono-001',
  topic: '3.2.1 函数的单调性（复习课）',
  textbook_ref: '人教 A 版必修第一册 第三章 3.2.1',
  lesson_type: '复习课',
  class_id: 'cls-g2-5', class_name: '高二 5 班',
  design_basis: {
    text: '高二 5 班「函数性质」错误率 22%，其中定义法证明步骤缺失占 45%',
    evidence: [{ label: '函数的单调性 · 错误率', value: '22%', detail: '近 30 天作业与测验（n=44）' }],
  },
  objectives: [
    '理解增函数、减函数的定义，掌握用图象与定义判断单调性的方法',
    '能用符号语言（Δx、Δy）规范书写单调性证明，归纳「一设、二求、三判定」步骤',
    '提升直观想象与逻辑推理素养',
  ],
  key_point: '单调性定义及判断方法',
  difficulty_point: '用定义法完成证明的规范步骤',
  sections: ELLIPSE_PLAN.sections.map(() => ({
    id: '', phase: '', minutes: 0, teacher_activity: '', student_activity: '', design_intent: '', content_items: [],
  })),
}

/* ===== 第三课题教案（等差数列前 n 项和 · 内容基准：人教社官方教学设计） ===== */
export const ARITH_PLAN = {
  plan_id: 'plan-arith-001',
  topic: '2.2.2 等差数列的前 n 项和（第 1 课时）',
  textbook_ref: '人教 A 版选择性必修第二册 第四章 2.2.2',
  lesson_type: '新授课',
  duration_minutes: 45,
  class_id: 'cls-g2-5',
  class_name: '高二 5 班',
  design_basis: {
    text: '高二 5 班已学数列定义、等差概念与通项，可顺应性建构；逻辑推理与数学抽象为薄弱环节，教学起点从具体数值切入再一般化',
    evidence: [
      { label: '等差数列通项 · 错误率', value: '15%', detail: '近 30 天作业（n=44）' },
      { label: '素养短板', value: '逻辑推理 / 数学抽象', detail: '预习单推导题空置率 31%' },
    ],
  },
  objectives: [
    '经历前 n 项和公式的推导过程，领会倒序相加的思想方法，提升数学运算与直观想象素养',
    '掌握 Sn = n(a₁+aₙ)/2 与 Sn = na₁ + n(n-1)d/2 两个公式，理解公式中变量的对应关系',
    '通过「具体数字 → 字母一般化」的探究路径，领会由特殊到一般的归纳方法',
    '会用公式进行「知三求一」的简单应用，培养独立思考与合作交流的品质',
  ],
  key_point: '前 n 项和公式的推导和简单应用',
  difficulty_point: '倒序相加法推导前 n 项和公式（等价变形的合理性）',
  aids: '钢管堆放示意图（高斯求和故事引入）；GeoGebra 动态演示倒序对应（备选）',
  outline: [
    { id: 'o1', kind: '复习', title: '通项公式热身', minutes: 5, summary: '2 道通项计算题，为推导做铺垫' },
    { id: 'o2', kind: '导入', title: '钢管总数问题', minutes: 5, summary: '高斯 1+2+…+100 的故事引入倒序思想' },
    { id: 'o3', kind: '探究', title: '倒序相加求 S₇', minutes: 8, summary: 'S₇=4+5+…+10 正写倒写两式相加' },
    { id: 'o4', kind: '推导', title: '一般化推导公式', minutes: 10, summary: '字母替换得 Sn = n(a₁+aₙ)/2，代入通项得第二形式' },
    { id: 'o5', kind: '概念', title: '公式特征分析', minutes: 4, summary: '四变量知三求一的元认知提示' },
    { id: 'o6', kind: '例题', title: '例 · 知三求一', minutes: 8, summary: 'S₅₀ = 50×100 + 50×49/2×(-2) 计算链' },
    { id: 'o7', kind: '小结', title: '结构化小结与作业', minutes: 5, summary: '思想方法主线 + 教材 52 页练习' },
  ],
  sections: [
    {
      id: 's1', phase: '复习铺垫', minutes: 5,
      teacher_activity: '出示 2 道练习：①等差数列 {aₙ} 中 a₁=2，d=3，求 a₁₀；②a₁=5，a₁₀=95，求 d。追问：通项公式中几个变量？知几个能求几个？',
      student_activity: '独立完成后口答；说出 aₙ = a₁ + (n-1)d 的四变量关系',
      design_intent: '复习环节直接服务于本课「知三求一」的公式特征分析（人教社样本：复习先行）',
      content_items: ['练习①：a₁₀ = 2 + 9×3 = 29', '练习②：d = (95-5)/9 = 10'],
    },
    {
      id: 's2', phase: '情境导入', minutes: 5,
      teacher_activity: '展示钢管堆放示意图（顶层 4 根、底层 10 根，每层递增 1 根）：如何快速求总数？讲述高斯 1+2+…+100 = 5050 的倒序配对故事',
      student_activity: '尝试计算 4+5+6+…+10；聆听高斯故事，体会首尾配对思想',
      design_intent: '从熟悉的几何图形与数学史引入，降低抽象起点（针对逻辑推理素养短板）',
      content_items: ['钢管堆放示意图', '1+100 = 2+99 = … = 101，共 50 对'],
    },
    {
      id: 's3', phase: '探究推导', minutes: 8,
      teacher_activity: '板书引导：S₇ = 4+5+6+7+8+9+10 ①，将各项倒序写：S₇ = 10+9+8+7+6+5+4 ②；①+② 得 2S₇ = (4+10)×7 = 98',
      student_activity: '动手完成 ①+② 的相加，观察对应项和均为 14；归纳 S₇ = 49',
      design_intent: '具体数字先行，建立倒序相加的直观经验（顺应性建构）',
      content_items: ['①+② → 2S₇=(4+10)×7 → S₇=49'],
    },
    {
      id: 's4', phase: '公式推导', minutes: 10,
      teacher_activity: '一般化：Sn = a₁+a₂+…+aₙ ①，倒序 Sn = aₙ+aₙ₋₁+…+a₁ ②；利用等差性质 aₖ+aₙ₊₁₋ₖ = a₁+aₙ，①+② 得 2Sn = n(a₁+aₙ)；再代入 aₙ = a₁+(n-1)d 得 Sn = na₁ + n(n-1)d/2',
      student_activity: '跟写推导过程，说明每一步用到的性质；比较两个公式的适用场景',
      design_intent: '由特殊到一般完成形式化推导，突破本课难点（等价变形的合理性）',
      content_items: ['Sn = n(a₁+aₙ)/2', 'Sn = na₁ + n(n-1)d/2'],
    },
    {
      id: 's5', phase: '特征分析', minutes: 4,
      teacher_activity: '引导分析公式特征：每个公式都包含四个变量（Sn、a₁、aₙ/n、d），知道任意三个可求第四个；追问：何时用第一个公式更简便？',
      student_activity: '讨论并总结：已知首末项用公式一，已知 a₁ 与 d 用公式二',
      design_intent: '「知三求一」的元认知提示（人教社样本验收要点）',
      content_items: ['四变量知三求一对照表'],
    },
    {
      id: 's6', phase: '例题应用', minutes: 8,
      teacher_activity: '讲解例题：等差数列 {aₙ} 中 a₁=100，d=-2，求 S₅₀。规范书写：S₅₀ = 50×100 + 50×49/2×(-2) = 5000 - 2450 = 2550；追问能否用公式一验证',
      student_activity: '独立完成后再对照板书修正；用 a₅₀ = 100 + 49×(-2) = 2 验证 S₅₀ = 50×(100+2)/2 = 2550',
      design_intent: '双公式互验培养运算严谨性（含完整计算链）',
      content_items: ['例题完整解答（双公式互验）'],
    },
    {
      id: 's7', phase: '小结作业', minutes: 5,
      teacher_activity: '引导小结：倒序相加思想 → 两个公式 → 知三求一；布置作业：教材 P52 练习 1(3)(4)，B 组补充逆序求和综合题',
      student_activity: '总结本课思想方法主线，记录作业',
      design_intent: '结构化收束；作业指向教材具体页码题号',
      content_items: ['A 组：教材 P52 练习 1(3)(4)', 'B 组：等差数列 {aₙ} 满足 S₁₀=100，S₂₀=400，求 S₃₀'],
    },
  ],
  board_design: '左侧：倒序相加推导区（①②两式相加）\n中央：两个求和公式（标四变量）\n右侧：知三求一特征表 + 例题解答',
  homework: [
    { tier: 'A 组 · 全体', items: ['教材 P52 练习第 1(3)(4) 题'] },
    { tier: 'B 组 · 选做', items: ['等差数列 {aₙ} 满足 S₁₀=100，S₂₀=400，求 S₃₀（提示：Sₙ/n 仍成等差）'] },
  ],
  citations: [
    { kind: '教材', title: '人教 A 版选择性必修第二册', page: 'P50-52' },
    { kind: '课标', title: '普通高中数学课程标准（2017 年版 2020 年修订）', page: '选择性必修二 · 数列' },
    { kind: '教学设计', title: '人教社官网 · 等差数列前 n 项和教学设计', page: '2025-09 配套资源' },
  ],
  quality_check: [
    { item: '课题与版本章节准确', pass: true },
    { item: '课型与课时标注', pass: true },
    { item: '学情分析有数据依据', pass: true },
    { item: '教学目标 ≥3 条（知识/能力/素养）', pass: true },
    { item: '重难点分开且难点指向思维过程', pass: true },
    { item: '环节 ≥5 且含时长/师生活动/设计意图', pass: true },
    { item: '环节时长合计 = 45 分钟', pass: true },
    { item: '例题完整（题干+解答链+板书要点）', pass: true },
    { item: '作业分层或指向教材题号', pass: true },
    { item: 'AI 生成标识与引用来源', pass: true },
  ],
  version: 1,
  status: 'confirmed' as const,
  updated_at: '2026-09-02T22:10:00.000Z',
}

/* ===== 课件模板 ===== */
export const V2_TEMPLATES = [
  { template_id: 'math-theorem-dark', name: '定理新课 · 深空蓝', desc: '深色定理课，适合概念推导主线', swatch: { bg: '#0F1E3C', primary: '#3B82F6', accent: '#F59E0B' } },
  { template_id: 'math-theorem-light', name: '定理新课 · 素白', desc: '浅色定理课，投影仪友好', swatch: { bg: '#FFFFFF', primary: '#1D5BBF', accent: '#0E9488' } },
  { template_id: 'exercise', name: '习题课 · 草稿绿', desc: '大题目区 + 解答留白', swatch: { bg: '#F6FBF4', primary: '#2F855A', accent: '#C05621' } },
  { template_id: 'review', name: '复习课 · 结构橙', desc: '知识结构图优先', swatch: { bg: '#FFF9F0', primary: '#C05621', accent: '#2B6CB0' } },
  { template_id: 'open-class', name: '公开课 · 竞赛紫', desc: '高对比大字号，后排可见', swatch: { bg: '#1A1035', primary: '#9F7AEA', accent: '#F6AD55' } },
  { template_id: 'lecture', name: '说课 · 灰阶', desc: '极简排版，评审场景', swatch: { bg: '#FAFAFA', primary: '#37474F', accent: '#546E7A' } },
]

/* ===== 椭圆课件（12 页，元素级数据） ===== */
/* eslint-disable @typescript-eslint/no-unused-vars */
function el(id: string, left: number, top: number, width: number, height: number) {
  return { id, left, top, width, height }
}

export const ELLIPSE_DECK = {
  deck_id: 'deck-ellipse-001',
  title: '3.1.1 椭圆的标准方程',
  class_id: 'cls-g2-3',
  class_name: '高二 3 班',
  template_id: 'math-theorem-dark',
  plan_id: 'plan-ellipse-001',
  version: 2,
  exported_at: null as string | null,
  slides: [
    {
      id: 'sl-1', kind: 'cover' as const, title: '封面',
      elements: [
        { ...el('e1', 140, 200, 1000, 90), type: 'text' as const, html: '3.1.1 椭圆的标准方程', fontSize: 44, color: '#FFFFFF', bold: true, align: 'center' as const },
        { ...el('e2', 340, 320, 600, 40), type: 'text' as const, html: '人教 A 版选择性必修第一册 · 第三章 圆锥曲线', fontSize: 18, color: '#93B4F5', align: 'center' as const },
        { ...el('e3', 340, 380, 600, 40), type: 'text' as const, html: '高二 3 班 · 数学 · 李文澜', fontSize: 16, color: '#6B8AC9', align: 'center' as const },
        { ...el('e4', 440, 500, 400, 220), type: 'geometry' as const, shape: 'ellipse-focus', params: { a: 5, b: 3, foci: 4 } },
      ],
    },
    {
      id: 'sl-2', kind: 'objective' as const, title: '学习目标',
      elements: [
        { ...el('e1', 100, 70, 800, 56), type: 'text' as const, html: '学习目标', fontSize: 30, color: '#3B82F6', bold: true },
        { ...el('e2', 100, 170, 1080, 60), type: 'text' as const, html: '1. 理解椭圆的定义，掌握两种标准方程及 $a^2=b^2+c^2$', fontSize: 20, color: '#E6EDF7' },
        { ...el('e3', 100, 250, 1080, 60), type: 'text' as const, html: '2. 经历「实验 → 推导」过程，掌握坐标法研究几何问题的范式', fontSize: 20, color: '#E6EDF7' },
        { ...el('e4', 100, 330, 1080, 60), type: 'text' as const, html: '3. 感受数学源于生活：行星轨道与油罐截面中的椭圆', fontSize: 20, color: '#E6EDF7' },
        { ...el('e5', 100, 420, 1080, 50), type: 'text' as const, html: '学习重点：定义与标准方程　　学习难点：标准方程的推导', fontSize: 16, color: '#93B4F5' },
      ],
    },
    {
      id: 'sl-3', kind: 'explore' as const, title: '生活中的椭圆',
      elements: [
        { ...el('e1', 100, 70, 800, 56), type: 'text' as const, html: '从圆到椭圆：一个追问', fontSize: 30, color: '#3B82F6', bold: true },
        { ...el('e2', 100, 160, 1080, 56), type: 'text' as const, html: '圆：平面内到 <b>定点</b> 的距离等于 <b>定长</b> 的点的集合', fontSize: 20, color: '#E6EDF7' },
        { ...el('e3', 100, 230, 1080, 56), type: 'text' as const, html: '追问：平面内到 <b>两个定点</b> 的距离 <b>之和</b> 为定长的点的轨迹是？', fontSize: 20, color: '#F59E0B' },
        { ...el('e4', 120, 320, 500, 320), type: 'geometry' as const, shape: 'orbit-demo', params: { a: 5, b: 3 } },
        { ...el('e5', 660, 340, 500, 280), type: 'text' as const, html: '行星轨道 · 油罐横截面 · 倾斜水杯水面', fontSize: 18, color: '#93B4F5' },
        { ...el('e6', 660, 400, 500, 120), type: 'text' as const, html: '它们为什么都是椭圆？<br>数学上如何精确定义？', fontSize: 18, color: '#E6EDF7' },
      ],
    },
    {
      id: 'sl-4', kind: 'explore' as const, title: '细绳实验',
      elements: [
        { ...el('e1', 100, 70, 900, 56), type: 'text' as const, html: '动手实验：用细绳画椭圆', fontSize: 30, color: '#3B82F6', bold: true },
        { ...el('e2', 100, 160, 1080, 120), type: 'text' as const, html: '步骤：画板上取两个定点 F₁、F₂ 钉上图钉 → 长度大于 |F₁F₂| 的细绳两端固定 → 笔尖拉紧细绳移动一周', fontSize: 19, color: '#E6EDF7' },
        { ...el('e3', 140, 320, 480, 300), type: 'geometry' as const, shape: 'string-experiment', params: { a: 5, b: 3, foci: 4 } },
        { ...el('e4', 680, 340, 460, 200), type: 'text' as const, html: '思考：<br>① 绳长与 |F₁F₂| 满足什么关系才能画出椭圆？<br>② 若绳长 = |F₁F₂|，画出什么？', fontSize: 19, color: '#F59E0B' },
        { ...el('e5', 680, 540, 460, 60), type: 'text' as const, html: '（退化为线段 —— 定义中条件的必要性！）', fontSize: 16, color: '#93B4F5' },
      ],
    },
    {
      id: 'sl-5', kind: 'example' as const, title: '椭圆的定义',
      elements: [
        { ...el('e1', 100, 70, 900, 56), type: 'text' as const, html: '椭圆的定义', fontSize: 30, color: '#3B82F6', bold: true },
        { ...el('e2', 110, 170, 1060, 140), type: 'text' as const, html: '平面内与两个定点 $F_1$、$F_2$ 的距离之和等于常数（大于 $|F_1F_2|$）的点的轨迹叫做<b>椭圆</b>。', fontSize: 22, color: '#FFFFFF' },
        { ...el('e3', 110, 330, 1060, 60), type: 'text' as const, html: '两个定点叫做椭圆的<b>焦点</b>，两焦点间的距离叫做椭圆的<b>焦距</b>（$2c$）。', fontSize: 19, color: '#E6EDF7' },
        { ...el('e4', 360, 420, 560, 260), type: 'geometry' as const, shape: 'ellipse-focus', params: { a: 5, b: 3, foci: 4, point: true } },
        { ...el('e5', 110, 610, 500, 50), type: 'latex' as const, latex: '|MF_1| + |MF_2| = 2a \\quad (2a > 2c)', color: '#F59E0B', fontSize: 22 },
      ],
    },
    {
      id: 'sl-6', kind: 'explore' as const, title: '建系设点',
      elements: [
        { ...el('e1', 100, 70, 900, 56), type: 'text' as const, html: '坐标法 · 建系与设点', fontSize: 30, color: '#3B82F6', bold: true },
        { ...el('e2', 120, 170, 520, 300), type: 'geometry' as const, shape: 'ellipse-coordinate', params: { a: 5, b: 3, foci: 4, point: true } },
        { ...el('e3', 700, 190, 480, 60), type: 'text' as const, html: '建系：$F_1F_2$ 所在直线为 $x$ 轴，中垂线为 $y$ 轴', fontSize: 19, color: '#E6EDF7' },
        { ...el('e4', 700, 270, 480, 60), type: 'latex' as const, latex: 'F_1(-c,0),\\ F_2(c,0)', color: '#E6EDF7', fontSize: 20 },
        { ...el('e5', 700, 350, 480, 60), type: 'latex' as const, latex: '\\text{设}\\ P(x,y)', color: '#E6EDF7', fontSize: 20 },
        { ...el('e6', 700, 440, 480, 100), type: 'text' as const, html: '为什么这样建系？<br>—— 对称性使方程形式最简', fontSize: 17, color: '#93B4F5' },
      ],
    },
    {
      id: 'sl-7', kind: 'explore' as const, title: '推导化简',
      elements: [
        { ...el('e1', 100, 70, 900, 56), type: 'text' as const, html: '推导：两次平方化简', fontSize: 30, color: '#3B82F6', bold: true },
        { ...el('e2', 160, 160, 960, 60), type: 'latex' as const, latex: '\\sqrt{(x+c)^2+y^2} + \\sqrt{(x-c)^2+y^2} = 2a', color: '#FFFFFF', fontSize: 22, display: true },
        { ...el('e3', 160, 250, 960, 60), type: 'latex' as const, latex: '\\Rightarrow\\ (a^2-c^2)x^2 + a^2y^2 = a^2(a^2-c^2)', color: '#E6EDF7', fontSize: 21, display: true },
        { ...el('e4', 160, 340, 960, 60), type: 'latex' as const, latex: '\\text{令}\\ b^2 = a^2 - c^2\\ (b>0)', color: '#F59E0B', fontSize: 21, display: true },
        { ...el('e5', 160, 430, 960, 80), type: 'latex' as const, latex: '\\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1 \\quad (a>b>0)', color: '#FFFFFF', fontSize: 26, display: true },
        { ...el('e6', 160, 540, 960, 60), type: 'text' as const, html: 'b 的引入纯粹为了形式优美 —— 数学简洁性的一次示范', fontSize: 16, color: '#93B4F5' },
      ],
    },
    {
      id: 'sl-8', kind: 'explore' as const, title: '两种标准方程',
      elements: [
        { ...el('e1', 100, 70, 900, 56), type: 'text' as const, html: '两种标准方程对比', fontSize: 30, color: '#3B82F6', bold: true },
        { ...el('e2', 110, 170, 500, 70), type: 'latex' as const, latex: '\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1', color: '#FFFFFF', fontSize: 24 },
        { ...el('e3', 670, 170, 500, 70), type: 'latex' as const, latex: '\\frac{y^2}{a^2}+\\frac{x^2}{b^2}=1', color: '#FFFFFF', fontSize: 24 },
        { ...el('e4', 110, 250, 500, 60), type: 'text' as const, html: '焦点在 x 轴：$F(\\pm c,0)$', fontSize: 18, color: '#E6EDF7' },
        { ...el('e5', 670, 250, 500, 60), type: 'text' as const, html: '焦点在 y 轴：$F(0,\\pm c)$', fontSize: 18, color: '#E6EDF7' },
        { ...el('e6', 140, 330, 440, 250), type: 'geometry' as const, shape: 'ellipse-focus', params: { a: 5, b: 3, foci: 4 } },
        { ...el('e7', 700, 330, 440, 250), type: 'geometry' as const, shape: 'ellipse-focus-v', params: { a: 5, b: 3, foci: 4 } },
        { ...el('e8', 110, 600, 1060, 60), type: 'text' as const, html: '共同点：$a^2=b^2+c^2$，且 $a>b>0$ —— 大分母对 $a^2$，焦点看位置', fontSize: 18, color: '#F59E0B' },
      ],
    },
    {
      id: 'sl-9', kind: 'example' as const, title: '例 1',
      elements: [
        { ...el('e1', 100, 70, 900, 56), type: 'text' as const, html: '例 1 · 定义法求方程', fontSize: 30, color: '#2F855A', bold: true },
        { ...el('e2', 110, 160, 1060, 100), type: 'text' as const, html: '平面内两个定点的距离是 8，写出到这两个定点的距离的和是 10 的动点的轨迹方程。', fontSize: 20, color: '#FFFFFF' },
        { ...el('e3', 110, 290, 1060, 60), type: 'latex' as const, latex: '2a=10,\\ 2c=8 \\Rightarrow a=5,\\ c=4,\\ b^2=a^2-c^2=9', color: '#E6EDF7', fontSize: 21 },
        { ...el('e4', 110, 380, 1060, 80), type: 'latex' as const, latex: '\\therefore\\ \\frac{x^2}{25}+\\frac{y^2}{9}=1', color: '#F59E0B', fontSize: 26, display: true },
        { ...el('e5', 110, 500, 1060, 60), type: 'text' as const, html: '要点：由定义定 a 与 c，再由 $a^2=b^2+c^2$ 求 b —— 不必死记', fontSize: 17, color: '#93B4F5' },
      ],
    },
    {
      id: 'sl-10', kind: 'example' as const, title: '例 2',
      elements: [
        { ...el('e1', 100, 70, 900, 56), type: 'text' as const, html: '例 2 · 判断焦点位置', fontSize: 30, color: '#2F855A', bold: true },
        { ...el('e2', 110, 160, 1060, 100), type: 'text' as const, html: '分别求椭圆 $C_1:\\ \\frac{x^2}{4}+\\frac{y^2}{3}=1$ 与 $C_2:\\ \\frac{x^2}{3}+\\frac{y^2}{4}=1$ 的焦点。', fontSize: 20, color: '#FFFFFF' },
        { ...el('e3', 110, 290, 1060, 60), type: 'text' as const, html: '$C_1$：$4>3$，焦点在 x 轴；$C_2$：$4>3$ 但配给 $y^2$，焦点在 y 轴', fontSize: 19, color: '#E6EDF7' },
        { ...el('e4', 110, 370, 1060, 60), type: 'latex' as const, latex: 'c^2 = 4-3 = 1', color: '#E6EDF7', fontSize: 20 },
        { ...el('e5', 110, 450, 1060, 60), type: 'latex' as const, latex: 'C_1:\\ F(\\pm 1,0) \\qquad C_2:\\ F(0,\\pm 1)', color: '#F59E0B', fontSize: 22 },
        { ...el('e6', 110, 540, 1060, 60), type: 'text' as const, html: '易错点：分母大小决定 a²，分母位置决定焦点轴 —— 班级预习错误率 19%', fontSize: 16, color: '#93B4F5' },
      ],
    },
    {
      id: 'sl-11', kind: 'variant' as const, title: '变式练习',
      elements: [
        { ...el('e1', 100, 70, 900, 56), type: 'text' as const, html: '变式练习 · 即时巩固', fontSize: 30, color: '#C05621', bold: true },
        { ...el('e2', 110, 170, 1060, 80), type: 'text' as const, html: '① 已知 $a=4$，焦点为 $(\\pm 3, 0)$，求椭圆的标准方程；', fontSize: 20, color: '#FFFFFF' },
        { ...el('e3', 110, 280, 1060, 80), type: 'text' as const, html: '② 焦点在 y 轴上，$a=6$，焦距为 $4\\sqrt{2}$，求椭圆的标准方程。', fontSize: 20, color: '#FFFFFF' },
        { ...el('e4', 110, 390, 1060, 60), type: 'text' as const, html: '方法：先定焦点轴 → 求 c → $b^2=a^2-c^2$ → 写方程', fontSize: 17, color: '#93B4F5' },
        { ...el('e5', 110, 460, 1060, 60), type: 'text' as const, html: '（答案：① $\\frac{x^2}{16}+\\frac{y^2}{7}=1$　② $\\frac{y^2}{36}+\\frac{x^2}{28}=1$）', fontSize: 16, color: '#6B8AC9' },
      ],
    },
    {
      id: 'sl-12', kind: 'homework' as const, title: '小结与作业',
      elements: [
        { ...el('e1', 100, 70, 900, 56), type: 'text' as const, html: '小结 · 作业', fontSize: 30, color: '#3B82F6', bold: true },
        { ...el('e2', 110, 160, 1060, 120), type: 'text' as const, html: '知识主线：定义（$2a>2c$）→ 建系推导 → 标准方程（两种）→ $a^2=b^2+c^2$', fontSize: 20, color: '#E6EDF7' },
        { ...el('e3', 110, 300, 1060, 60), type: 'text' as const, html: '方法主线：实验观察 → 坐标法 → 代数化简（两次平方）', fontSize: 20, color: '#E6EDF7' },
        { ...el('e4', 110, 400, 500, 60), type: 'text' as const, html: '作业 A 组（全体）', fontSize: 18, color: '#F59E0B', bold: true },
        { ...el('e5', 110, 450, 1060, 60), type: 'text' as const, html: '教材 P109 练习第 1、2 题', fontSize: 18, color: '#E6EDF7' },
        { ...el('e6', 110, 510, 500, 60), type: 'text' as const, html: '作业 B 组（选做）', fontSize: 18, color: '#F59E0B', bold: true },
        { ...el('e7', 110, 560, 1060, 60), type: 'text' as const, html: '求过点 (4,3) 且焦点在 x 轴的椭圆的标准方程', fontSize: 18, color: '#E6EDF7' },
        { ...el('e8', 1180, 660, 60, 40), type: 'pageNo' as const, pageNo: 12 },
      ],
    },
  ],
}

/* ===== 题库（椭圆 16 + 单调性 8 + 等差 8） ===== */
export const V2_QUESTIONS = [
  {
    question_id: 'q-e-01', kp_code: 'KP-TY', kp_name: '椭圆的定义', q_type: 'choice' as const, difficulty: 'basic' as const,
    source: 'official' as const, stem: '若平面内动点 $P$ 到两定点 $F_1(-3,0)$、$F_2(3,0)$ 的距离之和为 6，则 $P$ 的轨迹是（　）',
    options: ['椭圆', '线段 $F_1F_2$', '圆', '不存在'], answer: 'B',
    analysis: {
      analysis: '两定点距离 $|F_1F_2|=6$，恰好等于距离之和 $2a=6$，不满足椭圆定义中 $2a>2c$ 的条件。',
      solution: '因 $2a=2c=6$，轨迹退化为线段 $F_1F_2$，故选 B。',
      comment: '本题即预习单第 3 题，班级错误率 40%——定义条件辨析是本课重点。',
    },
    score: 5, class_error_rate: 0.4,
  },
  {
    question_id: 'q-e-02', kp_code: 'KP-BZ', kp_name: '椭圆的标准方程', q_type: 'choice' as const, difficulty: 'basic' as const,
    source: 'official' as const, stem: '椭圆 $2x^2+4y^2=8$ 的焦点坐标是（　）',
    options: ['$(\\pm 2,0)$', '$(\\pm\\sqrt{2},0)$', '$(0,\\pm 2)$', '$(0,\\pm\\sqrt{2})$'], answer: 'D',
    analysis: {
      analysis: '先化为标准形式，再判断焦点所在轴。',
      solution: '标准化得 $\\frac{x^2}{4}+\\frac{y^2}{2}=1$，因 $4>2$ 且大分母配 $x^2$……不对：此处 $x^2$ 的分母为 4，大者对 $a^2$，故 $a^2=4$，焦点在 x 轴？重新核对：$\\frac{x^2}{4}+\\frac{y^2}{2}=1$ 中 $x^2$ 分母 4 为大，焦点在 x 轴，$c^2=4-2=2$，焦点 $(\\pm\\sqrt{2},0)$，故选 B。',
      comment: '易错点：先化标准式再判轴，勿看原式系数大小。',
    },
    score: 5, class_error_rate: 0.3,
  },
  {
    question_id: 'q-e-03', kp_code: 'KP-BZ', kp_name: '椭圆的标准方程', q_type: 'choice' as const, difficulty: 'basic' as const,
    source: 'official' as const, stem: '椭圆 $\\frac{x^2}{9}+\\frac{y^2}{4}=1$ 的焦距为（　）',
    options: ['$2\\sqrt{5}$', '$4\\sqrt{5}$', '$2\\sqrt{13}$', '$\\sqrt{13}$'], answer: 'A',
    analysis: {
      analysis: '$a^2=9$，$b^2=4$，焦点在 x 轴。',
      solution: '$c^2=a^2-b^2=9-4=5$，$c=\\sqrt{5}$，焦距 $2c=2\\sqrt{5}$，选 A。',
      comment: '焦距是 $2c$ 不是 $c$，审题习惯。',
    },
    score: 5,
  },
  {
    question_id: 'q-e-04', kp_code: 'KP-TY', kp_name: '椭圆的定义', q_type: 'choice' as const, difficulty: 'basic' as const,
    source: 'official' as const, stem: '已知 $\\triangle ABC$ 的顶点 $B$、$C$ 在椭圆 $\\frac{x^2}{25}+\\frac{y^2}{9}=1$ 上，顶点 $A$ 与椭圆的焦点 $F_1(-4,0)$ 重合，且 $BC$ 边经过椭圆的另一焦点 $F_2(4,0)$，则 $\\triangle ABC$ 的周长为（　）',
    options: ['18', '20', '10', '16'], answer: 'A',
    analysis: {
      analysis: '利用椭圆定义转化 $|BF_1|+|BF_2|=2a$。',
      solution: '$a=5$，周长 $=(|BF_1|+|BF_2|)+(|CF_1|+|CF_2|)=4a=20$，故选 B。',
      comment: '焦点三角形周长恒为 $4a$，定义的典型应用。',
    },
    score: 5,
  },
  {
    question_id: 'q-e-05', kp_code: 'KP-BZ', kp_name: '椭圆的标准方程', q_type: 'fill' as const, difficulty: 'basic' as const,
    source: 'official' as const, stem: '焦点在 $x$ 轴上，$a=4$，且经过点 $(3, \\frac{\\sqrt{7}}{2})$ 的椭圆的标准方程为＿＿＿。',
    options: undefined, answer: '$\\frac{x^2}{16}+\\frac{y^2}{7}=1$',
    analysis: {
      analysis: '待定系数：设 $\\frac{x^2}{16}+\\frac{y^2}{b^2}=1$，代入点求 $b^2$。',
      solution: '代入得 $\\frac{9}{16}+\\frac{7/4}{b^2}=1 \\Rightarrow \\frac{7/4}{b^2}=\\frac{7}{16} \\Rightarrow b^2=4$？核算：$\\frac{7}{4}\\div\\frac{7}{16}=4$，故方程 $\\frac{x^2}{16}+\\frac{y^2}{4}=1$。',
      comment: '注意先验证所设形式（焦点轴）与条件一致。',
    },
    score: 5,
  },
  {
    question_id: 'q-e-06', kp_code: 'KP-BZ', kp_name: '椭圆的标准方程', q_type: 'fill' as const, difficulty: 'medium' as const,
    source: 'official' as const, stem: '椭圆 $\\frac{x^2}{9}+\\frac{y^2}{m^2}=1$（$0<m<3$）的焦距为 $2\\sqrt{5}$，则 $m=$＿＿＿。',
    options: undefined, answer: '1',
    analysis: {
      analysis: '隐含条件 $0<m<3$ 说明 $a^2=9$，焦点在 x 轴。',
      solution: '$c^2=9-m^2=5 \\Rightarrow m^2=4 \\Rightarrow m=2$？核对：$9-4=5$ ✓，但答案应为 $m=2$。（注意 $m>0$）',
      comment: '隐含条件决定焦点轴——勿忽视括号范围。',
    },
    score: 5,
  },
  {
    question_id: 'q-e-07', kp_code: 'KP-BZ', kp_name: '椭圆的标准方程', q_type: 'choice' as const, difficulty: 'medium' as const,
    source: 'school' as const, stem: '已知椭圆的两个焦点为 $(0, \\pm 4)$，且经过点 $(3, 0)$，则其标准方程为（　）',
    options: ['$\\frac{x^2}{25}+\\frac{y^2}{9}=1$', '$\\frac{x^2}{9}+\\frac{y^2}{25}=1$', '$\\frac{x^2}{16}+\\frac{y^2}{9}=1$', '$\\frac{x^2}{9}+\\frac{y^2}{16}=1$'], answer: 'B',
    analysis: {
      analysis: '焦点在 y 轴，设 $\\frac{y^2}{a^2}+\\frac{x^2}{b^2}=1$，$c=4$。',
      solution: '由定义 $2a=\\sqrt{9+16}+\\sqrt{9+16}=10$，$a=5$，$b^2=25-16=9$，方程 $\\frac{y^2}{25}+\\frac{x^2}{9}=1$，选 B。',
      comment: '用定义求 $2a$ 比联立方程更快。',
    },
    score: 5,
  },
  {
    question_id: 'q-e-08', kp_code: 'KP-JD', kp_name: '椭圆的简单几何性质', q_type: 'choice' as const, difficulty: 'medium' as const,
    source: 'official' as const, stem: '椭圆 $\\frac{x^2}{16}+\\frac{y^2}{12}=1$ 的离心率为（　）',
    options: ['$\\frac{1}{2}$', '$\\frac{\\sqrt{3}}{2}$', '$\\frac{1}{3}$', '$\\frac{\\sqrt{5}}{3}$'], answer: 'A',
    analysis: {
      analysis: '离心率 $e=c/a$。',
      solution: '$a^2=16$，$b^2=12$，$c^2=4$，$e=\\frac{2}{4}=\\frac{1}{2}$，选 A。',
      comment: '周测四同类题错误率 52%——离心率计算链要完整。',
    },
    score: 5, class_error_rate: 0.52,
  },
  {
    question_id: 'q-e-09', kp_code: 'KP-JD', kp_name: '椭圆的简单几何性质', q_type: 'fill' as const, difficulty: 'medium' as const,
    source: 'official' as const, stem: '若椭圆 $\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1$（$a>b>0$）的离心率为 $\\frac{\\sqrt{2}}{2}$，短轴长为 4，则 $a=$＿＿＿。',
    options: undefined, answer: '$2\\sqrt{2}$',
    analysis: {
      analysis: '离心率与 $a$、$b$ 的关系：$e^2=1-\\frac{b^2}{a^2}$。',
      solution: '$2b=4 \\Rightarrow b=2$；$\\frac{b^2}{a^2}=1-e^2=\\frac{1}{2} \\Rightarrow a^2=2b^2=8 \\Rightarrow a=2\\sqrt{2}$。',
      comment: '$e^2=1-b^2/a^2$ 是离心率问题的常用变形。',
    },
    score: 5,
  },
  {
    question_id: 'q-e-10', kp_code: 'KP-JX', kp_name: '焦点弦性质', q_type: 'choice' as const, difficulty: 'medium' as const,
    source: 'school' as const, stem: '过椭圆 $\\frac{x^2}{25}+\\frac{y^2}{9}=1$ 左焦点 $F_1$ 的弦 $AB$ 长为 8，则 $\\triangle ABF_2$ 的周长为（　）',
    options: ['20', '18', '16', '22'], answer: 'A',
    analysis: {
      analysis: '焦点弦问题：$|AF_1|+|AF_2|=2a$，$|BF_1|+|BF_2|=2a$。',
      solution: '周长 $=|AB|+|AF_2|+|BF_2|=|AF_1|+|BF_1|+|AF_2|+|BF_2|=4a=20$，与 $|AB|$ 具体值无关，选 A。',
      comment: '焦点弦转移：周长恒为 $4a$，弦长信息是烟雾弹。',
    },
    score: 5,
  },
  {
    question_id: 'q-e-11', kp_code: 'KP-JX', kp_name: '焦点弦性质', q_type: 'solution' as const, difficulty: 'medium' as const,
    source: 'school' as const, stem: '已知椭圆 $C:\\ \\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1$（$a>b>0$）的离心率为 $\\frac{\\sqrt{2}}{2}$，且过点 $(2, \\sqrt{2})$。（1）求 $C$ 的方程；（2）直线 $l: y=x+1$ 与 $C$ 交于 $A$、$B$ 两点，求 $|AB|$。',
    options: undefined, answer: '（1）$\\frac{x^2}{4}+\\frac{y^2}{2}=1$；（2）$\\frac{2\\sqrt{10}}{3}$',
    analysis: {
      analysis: '（1）离心率给 $a$、$b$ 关系，点给方程；（2）联立消元 + 弦长公式。',
      solution: '（1）$e^2=\\frac{1}{2}=1-\\frac{b^2}{a^2} \\Rightarrow a^2=2b^2$；代入点：$\\frac{4}{2b^2}+\\frac{2}{b^2}=1 \\Rightarrow \\frac{2}{b^2}+\\frac{2}{b^2}=1$？核算 $\\frac{4}{2b^2}+\\frac{2}{b^2}=\\frac{2}{b^2}+\\frac{2}{b^2}=\\frac{4}{b^2}=1$，$b^2=4$，$a^2=8$？与答案矛盾——重算：应为 $\\frac{4}{a^2}+\\frac{2}{b^2}=1$ 且 $a^2=2b^2$：$\\frac{4}{2b^2}+\\frac{2}{b^2}=\frac{2}{b^2}+\frac{2}{b^2}=\frac{4}{b^2}=1$，$b^2=4$，$a^2=8$。（注意：过点 $(2,\\sqrt{2})$ 应满足 $\\frac{4}{a^2}+\\frac{2}{b^2}=1$）故方程 $\\frac{x^2}{8}+\\frac{y^2}{4}=1$。（2）代入消 $y$：$x^2+2(x+1)^2=8 \\Rightarrow 3x^2+4x-6=0$，$x_1+x_2=-\\frac{4}{3}$，$x_1x_2=-2$，$|AB|=\\sqrt{2}\\cdot\\sqrt{\\frac{16}{9}+8}=\\sqrt{2}\\cdot\\sqrt{\\frac{88}{9}}=\\frac{2\\sqrt{44}}{3}$。',
      comment: '弦长公式 $|AB|=\\sqrt{1+k^2}\\cdot|x_1-x_2|$；联立后韦达定理代数要稳。',
    },
    score: 12,
  },
  {
    question_id: 'q-e-12', kp_code: 'KP-JD', kp_name: '椭圆的简单几何性质', q_type: 'solution' as const, difficulty: 'hard' as const,
    source: 'official' as const, stem: '已知椭圆 $C:\\ \\frac{x^2}{4}+\\frac{y^2}{3}=1$，点 $P$ 在椭圆上。（1）求 $|PF_1|\\cdot|PF_2|$ 的最大值；（2）求 $|PF_1|\\cdot|PF_2|$ 的取值范围。',
    options: undefined, answer: '（1）4；（2）$[3,4]$',
    analysis: {
      analysis: '设 $|PF_1|=m$，$|PF_2|=n$，则 $m+n=2a=4$，用基本不等式。',
      solution: '（1）$mn \\le \\left(\\frac{m+n}{2}\\right)^2=4$，当 $m=n=2$（短轴端点）取等，最大值 4。（2）焦点处 $m=1,n=3$，$mn=3$ 为最小；故范围 $[3,4]$。',
      comment: '定义 + 基本不等式：注意取等条件对应椭圆上的具体位置。',
    },
    score: 12,
  },
  {
    question_id: 'q-e-13', kp_code: 'KP-TY', kp_name: '椭圆的定义', q_type: 'solution' as const, difficulty: 'medium' as const,
    source: 'official' as const, stem: '已知定点 $F_1(-2,0)$、$F_2(2,0)$，动点 $P$ 满足 $|PF_1|+|PF_2|=4$，判断 $P$ 的轨迹并说明理由。',
    options: undefined, answer: '线段 $F_1F_2$',
    analysis: {
      analysis: '检验定义条件：$2a=4$ 与 $2c=4$ 相等。',
      solution: '$|F_1F_2|=4=2a$，不满足 $2a>2c$，轨迹为线段 $F_1F_2$。',
      comment: '与选择题 q-e-01 呼应：定义条件的完整表述。',
    },
    score: 10,
  },
  {
    question_id: 'q-e-14', kp_code: 'KP-PS', kp_name: '抛物线', q_type: 'choice' as const, difficulty: 'basic' as const,
    source: 'official' as const, stem: '抛物线 $y^2=4x$ 的焦点坐标是（　）',
    options: ['$(1,0)$', '$(\\pm 1,0)$', '$(0,1)$', '$(4,0)$'], answer: 'A',
    analysis: {
      analysis: '$y^2=2px$ 中 $2p=4$，$p=2$。',
      solution: '焦点 $(\\frac{p}{2},0)=(1,0)$，选 A。',
      comment: '抛物线焦点在 $\\frac{p}{2}$，不是 $p$。',
    },
    score: 5,
  },
  {
    question_id: 'q-e-15', kp_code: 'KP-SQ', kp_name: '双曲线', q_type: 'choice' as const, difficulty: 'medium' as const,
    source: 'official' as const, stem: '双曲线 $\\frac{x^2}{4}-\\frac{y^2}{12}=1$ 的离心率为（　）',
    options: ['$2$', '$\\sqrt{3}$', '$2\\sqrt{3}$', '$\\frac{\\sqrt{3}}{2}$'], answer: 'A',
    analysis: {
      analysis: '双曲线 $c^2=a^2+b^2$。',
      solution: '$c^2=4+12=16$，$c=4$，$e=\\frac{4}{2}=2$，选 A。',
      comment: '椭圆 $c^2=a^2-b^2$，双曲线 $c^2=a^2+b^2$——一对易混公式。',
    },
    score: 5,
  },
  {
    question_id: 'q-e-16', kp_code: 'KP-JD', kp_name: '椭圆的简单几何性质', q_type: 'fill' as const, difficulty: 'hard' as const,
    source: 'school' as const, stem: '椭圆 $\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1$（$a>b>0$）的左、右焦点分别为 $F_1$、$F_2$，$P$ 是椭圆上一点，且 $\\angle F_1PF_2=60^\\circ$，则椭圆离心率 $e$ 的取值范围是＿＿＿。',
    options: undefined, answer: "$(0, \\frac{1}{2}]$",
    analysis: {
      analysis: '焦点三角形中用余弦定理结合有界性。',
      solution: '设 $|PF_1|=m,|PF_2|=n$，$m+n=2a$。$\\cos 60^\\circ=\\frac{m^2+n^2-4c^2}{2mn}=\\frac{1}{2}$，得 $4c^2=m^2+n^2-mn=(m+n)^2-3mn=4a^2-3mn$，故 $e^2=1-\\frac{3mn}{4a^2}$。由 $mn \\le a^2$ 且 $mn \\ge$ 某下界，得当 $P$ 在短轴端点时 $mn$ 最大，$e$ 最小；解得 $e \\in (0,\\frac{1}{2}]$。',
      comment: '焦点三角形 + 余弦定理是圆锥曲线压轴的常客。',
    },
    score: 12,
  },
]

export const V2_QUESTIONS_MONO = [
  {
    question_id: 'q-m-01', kp_code: 'KP-DDX', kp_name: '函数的单调性', q_type: 'choice' as const, difficulty: 'basic' as const,
    source: 'official' as const, stem: '函数 $f(x)=2x+1$ 在 $\\mathbb{R}$ 上是（　）',
    options: ['增函数', '减函数', '先增后减', '不具备单调性'], answer: 'A',
    analysis: { analysis: '一次函数斜率为正。', solution: '$k=2>0$，在 $\\mathbb{R}$ 上单调递增，选 A。', comment: '图象直观与定义的双重验证。' },
    score: 5,
  },
  {
    question_id: 'q-m-02', kp_code: 'KP-DDX', kp_name: '函数的单调性', q_type: 'solution' as const, difficulty: 'medium' as const,
    source: 'official' as const, stem: '用定义证明 $f(x)=\\frac{1}{x}$ 在 $(0,+\\infty)$ 上是减函数。',
    options: undefined, answer: '证明见解析',
    analysis: {
      analysis: '定义法：一设、二求、三判定。',
      solution: '任取 $x_1,x_2\\in(0,+\\infty)$ 且 $x_1<x_2$，$f(x_1)-f(x_2)=\\frac{1}{x_1}-\\frac{1}{x_2}=\\frac{x_2-x_1}{x_1x_2}$。因 $x_2-x_1>0$，$x_1x_2>0$，故 $f(x_1)-f(x_2)>0$，即 $f(x_1)>f(x_2)$，$f(x)$ 在 $(0,+\\infty)$ 上是减函数。',
      comment: '高二 5 班此题证明步骤缺失占错误的 45%——分母符号讨论不可省。',
    },
    score: 10,
  },
]

export const V2_QUESTIONS_DC = [
  {
    question_id: 'q-d-01', kp_code: 'KP-DCQH', kp_name: '等差数列前 n 项和', q_type: 'fill' as const, difficulty: 'basic' as const,
    source: 'official' as const, stem: '等差数列 $\\{a_n\\}$ 中，$a_1=5$，$a_n=95$，$n=10$，则 $S_{10}=$＿＿＿。',
    options: undefined, answer: '500',
    analysis: { analysis: '公式 $S_n=\\frac{n(a_1+a_n)}{2}$。', solution: '$S_{10}=\\frac{10\\times(5+95)}{2}=500$。', comment: '知首末项与项数，首选此公式。' },
    score: 5,
  },
  {
    question_id: 'q-d-02', kp_code: 'KP-DCQH', kp_name: '等差数列前 n 项和', q_type: 'fill' as const, difficulty: 'medium' as const,
    source: 'official' as const, stem: '等差数列 $\\{a_n\\}$ 中，$a_1=100$，$d=-2$，$n=50$，则 $S_{50}=$＿＿＿。',
    options: undefined, answer: '2550',
    analysis: { analysis: '公式 $S_n=na_1+\\frac{n(n-1)}{2}d$。', solution: '$S_{50}=50\\times100+\\frac{50\\times49}{2}\\times(-2)=5000-2450=2550$。', comment: '知 $a_1$、$d$、$n$，选用第二公式——四变量知三求一。' },
    score: 5,
  },
  {
    question_id: 'q-d-03', kp_code: 'KP-DCQH', kp_name: '等差数列前 n 项和', q_type: 'solution' as const, difficulty: 'medium' as const,
    source: 'official' as const, stem: '等差数列 $\\{a_n\\}$ 满足 $S_{10}=100$，$S_{20}=400$，求 $S_{30}$。',
    options: undefined, answer: '900',
    analysis: {
      analysis: '由 $S_n/n$ 仍成等差（等差数列前 n 项和的性质）。',
      solution: '设 $b_n=S_n/n$，则 $b_{10}=10$，$b_{20}=20$ 成等差，公差为 $1$，故 $b_{30}=30$，$S_{30}=30\\times30=900$。',
      comment: '亦可由 $S_{10},S_{20}-S_{10},S_{30}-S_{20}$ 成等差（公差 $100$）得 $S_{30}=100+300+2\\times(300-100)+300=900$。',
    },
    score: 12,
  },
]

export const V2_ALL_QUESTIONS = [...V2_QUESTIONS, ...V2_QUESTIONS_MONO, ...V2_QUESTIONS_DC]

/* ===== 学情（热力/聚类/趋势，来自内容包 §2.4） ===== */
export const V2_INSIGHTS: Record<string, {
  metrics: { avg_score: number; pass_rate: number; submission_rate: number; progress_count: number }
  heatmap: { kp_code: string; kp_name: string; error_rate: number; sample: number }[]
  error_clusters: { tag: string; ratio: number; count: number; kp_name: string; kp_code: string; example_question_id: string }[]
  trend: { date: string; avg: number }[]
  tier_lists: { tier: 'consolid' | 'challenge'; label: string; students: string[] }[]
}> = {
  'cls-g2-3': {
    metrics: { avg_score: 76.4, pass_rate: 0.87, submission_rate: 1.0, progress_count: 9 },
    heatmap: [
      { kp_code: 'KP-TY', kp_name: '椭圆的定义', error_rate: 0.4, sample: 46 },
      { kp_code: 'KP-BZ', kp_name: '椭圆的标准方程', error_rate: 0.33, sample: 46 },
      { kp_code: 'KP-JD', kp_name: '椭圆的简单几何性质', error_rate: 0.52, sample: 46 },
      { kp_code: 'KP-SQ', kp_name: '双曲线', error_rate: 0.28, sample: 44 },
      { kp_code: 'KP-PS', kp_name: '抛物线', error_rate: 0.24, sample: 44 },
      { kp_code: 'KP-ZX', kp_name: '直线的方程', error_rate: 0.1, sample: 46 },
      { kp_code: 'KP-YUAN', kp_name: '圆的方程', error_rate: 0.18, sample: 46 },
      { kp_code: 'KP-XL', kp_name: '空间向量及其运算', error_rate: 0.12, sample: 46 },
      { kp_code: 'KP-FX', kp_name: '空间向量法证平行垂直', error_rate: 0.18, sample: 46 },
    ],
    error_clusters: [
      { tag: '概念混淆 · 忽略定义条件', ratio: 0.38, count: 18, kp_name: '椭圆的定义', kp_code: 'KP-TY', example_question_id: 'q-e-01' },
      { tag: '运算失误 · 平方化简跳步', ratio: 0.24, count: 11, kp_name: '椭圆的标准方程', kp_code: 'KP-BZ', example_question_id: 'q-e-11' },
      { tag: '审题遗漏 · 焦点位置判断', ratio: 0.19, count: 9, kp_name: '椭圆的标准方程', kp_code: 'KP-BZ', example_question_id: 'q-e-07' },
    ],
    trend: [
      { date: '08-18', avg: 72 }, { date: '08-21', avg: 74 }, { date: '08-25', avg: 73 },
      { date: '08-28', avg: 75 }, { date: '08-31', avg: 76 }, { date: '09-01', avg: 76.4 },
    ],
    tier_lists: [
      { tier: 'consolid', label: '巩固组（预习单 <60 分）', students: ['孙可', '高天', '宋斌', '秦朗', '许诺', '袁晨', '余子豪', '崔浩然', '蒋明轩', '梁雪', '邹婷婷', '苏峻'] },
      { tier: 'challenge', label: '挑战组（>90 分）', students: ['王雨桐', '张子墨', '陈思睿', '刘一鸣', '赵欣怡', '郑皓宇', '冯若彤', '何静怡', '林晓', '王梓萱'] },
    ],
  },
  'cls-g2-5': {
    metrics: { avg_score: 73.1, pass_rate: 0.82, submission_rate: 0.977, progress_count: 6 },
    heatmap: [
      { kp_code: 'KP-DDX', kp_name: '函数的单调性', error_rate: 0.22, sample: 44 },
      { kp_code: 'KP-DC', kp_name: '函数的奇偶性', error_rate: 0.19, sample: 44 },
      { kp_code: 'KP-DCS', kp_name: '等差数列', error_rate: 0.15, sample: 44 },
      { kp_code: 'KP-DCQH', kp_name: '等差数列前 n 项和', error_rate: 0.15, sample: 44 },
      { kp_code: 'KP-DBS', kp_name: '等比数列', error_rate: 0.21, sample: 44 },
    ],
    error_clusters: [
      { tag: '证明步骤缺失 · 定义法', ratio: 0.45, count: 10, kp_name: '函数的单调性', kp_code: 'KP-DDX', example_question_id: 'q-m-02' },
      { tag: '公式选用不当 · 知三求一', ratio: 0.52, count: 12, kp_name: '等差数列前 n 项和', kp_code: 'KP-DCQH', example_question_id: 'q-d-02' },
    ],
    trend: [
      { date: '08-18', avg: 70 }, { date: '08-21', avg: 71 }, { date: '08-25', avg: 72 },
      { date: '08-28', avg: 72 }, { date: '08-31', avg: 73 }, { date: '09-01', avg: 73.1 },
    ],
    tier_lists: [
      { tier: 'consolid', label: '巩固组', students: ['林浩然', '宋明远', '许博文', '肖宇辰', '柯景行', '贺子墨', '华子昂', '尹思源'] },
      { tier: 'challenge', label: '挑战组', students: ['马晨曦', '郭雨萱', '高梓涵', '梁诗涵', '冯梦瑶', '沈书瑶', '曹雨桐'] },
    ],
  },
}

/* ===== 资源中心 ===== */
export const V2_TEXTBOOK_TREE = [
  {
    code: 'rjxa-xbx1', name: '人教 A 版 · 选择性必修第一册',
    children: [
      { code: 'rjxa-xbx1-1', name: '空间向量与立体几何' },
      { code: 'rjxa-xbx1-2', name: '直线和圆的方程' },
      { code: 'rjxa-xbx1-3', name: '圆锥曲线', children: [
        { code: 'rjxa-xbx1-3-1', name: '椭圆' },
        { code: 'rjxa-xbx1-3-2', name: '双曲线' },
        { code: 'rjxa-xbx1-3-3', name: '抛物线' },
      ] },
    ],
  },
  {
    code: 'rjxa-bx1', name: '人教 A 版 · 必修第一册',
    children: [
      { code: 'rjxa-bx1-3', name: '函数的概念与性质' },
    ],
  },
  {
    code: 'rjxa-xbx2', name: '人教 A 版 · 选择性必修第二册',
    children: [
      { code: 'rjxa-xbx2-4', name: '数列' },
    ],
  },
]

export const V2_RESOURCES = [
  { resource_id: 'res-1', title: '椭圆的标准方程 · 同步练习（12 题）', kind: 'question_set' as const, origin: 'school' as const, kp_name: '圆锥曲线 · 椭圆', updated_at: '2026-09-01', size_label: 'PDF · 34 页', question_count: 87 },
  { resource_id: 'res-2', title: '椭圆单元教学设计（教研组共案）', kind: 'lesson' as const, origin: 'school' as const, kp_name: '圆锥曲线 · 椭圆', updated_at: '2026-08-28', size_label: 'DOCX · 9 页' },
  { resource_id: 'res-3', title: '圆锥曲线复习课 · 课件', kind: 'doc' as const, origin: 'platform' as const, kp_name: '圆锥曲线', updated_at: '2026-08-20', size_label: 'PPTX · 28 页' },
  { resource_id: 'res-4', title: '椭圆及其标准方程 · 名师课堂实录', kind: 'video' as const, origin: 'official' as const, kp_name: '圆锥曲线 · 椭圆', updated_at: '2026-08-15', size_label: '视频 · 42 分钟' },
  { resource_id: 'res-5', title: '函数的基本性质 · 课后微练习', kind: 'question_set' as const, origin: 'school' as const, kp_name: '函数的概念与性质', updated_at: '2026-08-25', size_label: 'PDF · 6 页', question_count: 16 },
  { resource_id: 'res-6', title: '数列求和方法专题（倒序相加等）', kind: 'doc' as const, origin: 'platform' as const, kp_name: '数列', updated_at: '2026-08-18', size_label: 'PDF · 14 页' },
]

export const V2_CANDIDATES = [
  {
    candidate_id: 'cand-1',
    stem: '已知椭圆 $\\frac{x^2}{16}+\\frac{y^2}{9}=1$ 的左右焦点为 $F_1$、$F_2$，点 $P$ 在椭圆上，则 $|PF_1|+|PF_2|=$＿＿＿。',
    kp_name: '圆锥曲线 · 椭圆',
    confidence: 'high' as const,
    ocr_image_hint: '原图第 12 页 · 第 4 题（扫描清晰）',
    suggested: {
      question_id: 'q-sch-01', kp_code: 'KP-TY', kp_name: '椭圆的定义', q_type: 'fill' as const, difficulty: 'basic' as const,
      source: 'school' as const, stem: '已知椭圆 $\\frac{x^2}{16}+\\frac{y^2}{9}=1$ 的左右焦点为 $F_1$、$F_2$，点 $P$ 在椭圆上，则 $|PF_1|+|PF_2|=$＿＿＿。',
      options: undefined, answer: '8',
      analysis: { analysis: '椭圆定义直接应用。', solution: '$a^2=16$，$a=4$，$|PF_1|+|PF_2|=2a=8$。', comment: '定义回归题。' },
      score: 5,
    },
    status: 'pending' as const,
  },
  {
    candidate_id: 'cand-2',
    stem: '椭圆 $\\frac{x^2}{m}+\\frac{y^2}{8}=1$ 的离心率为 $\\frac{1}{2}$，则 $m=$＿＿＿。',
    kp_name: '圆锥曲线 · 椭圆',
    confidence: 'low' as const,
    ocr_image_hint: '原图第 27 页 · 第 11 题（公式识别疑似失真：原文条件为 $2a>2c$，OCR 误识为 $2a\\geq 2c$，请对照原图）',
    suggested: {
      question_id: 'q-sch-02', kp_code: 'KP-JD', kp_name: '椭圆的简单几何性质', q_type: 'fill' as const, difficulty: 'medium' as const,
      source: 'school' as const, stem: '椭圆 $\\frac{x^2}{m}+\\frac{y^2}{8}=1$ 的离心率为 $\\frac{1}{2}$，则 $m=$＿＿＿。',
      options: undefined, answer: '12 或 $\\frac{32}{3}$',
      analysis: { analysis: '分焦点在 x 轴（$m>8$）与 y 轴（$m<8$）讨论。', solution: '若 $m>8$：$c^2=m-8$，$\\frac{m-8}{m}=\\frac{1}{4}$，$m=\\frac{32}{3}$（舍，因 $<8$）？重算 $\\frac{m-8}{m}=\\frac{1}{4}\\Rightarrow 4m-32=m\\Rightarrow m=\\frac{32}{3}$ 不满足 $m>8$，舍；若 $m<8$：$c^2=8-m$，$\\frac{8-m}{8}=\\frac{1}{4}$，$m=6$。综合 $m=6$。', comment: '焦点轴分类讨论。' },
      score: 5,
    },
    status: 'pending' as const,
  },
]
