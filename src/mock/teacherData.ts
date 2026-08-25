import { buildQuizSet, type QuizBuildParams } from './questionBank'
import type {
ActionableInsight, GradingQueueItem, LessonSegment, SourceRef, TeacherArtifact, TeacherResource, TeacherTodayData, VideoInsight, GradingDetail
} from '@/types/teacher'

export const iso = (d: Date = new Date()) => d.toISOString()

export const TEACHER_CLASSES = [
  { id: 'c1', name: '高二（3）班' },
  { id: 'c2', name: '高二（4）班' },
]

export function todayData(): TeacherTodayData {
  // SSOT（BUSINESS_OBJECTS §3）：下一节课 = 10:10–10:55 固定课表，不随运行时刻漂移
  const now = Date.now()
  const lessonStarts = new Date()
  lessonStarts.setHours(10, 10, 0, 0)
  if (lessonStarts.getTime() < now) lessonStarts.setDate(lessonStarts.getDate() + 1) // 已过 10:10 则指向次日，保证课表面向"今天/下一次"
  return {
    next_lesson: {
      class_id: 'c1', topic: '导数与函数单调性', class_name: '高二（3）班 · 46 人',
      starts_at: iso(lessonStarts), prep_completion: 70, missing_items: ['边界反例', 'Exit Ticket'], duration_minutes: 45,
    },
    // 数量与批改队列保持一致（见 gradingQueue()，SSOT=21 份）
    grading_queue: { count: gradingQueue().length, action: 'open_grading' },
    deadlines: [
      { id: 'd1', kind: 'assignment', title: '导数巩固练习', due_at: iso(new Date(now + 86400e3)) },
      { id: 'd2', kind: 'video', title: '参数分类讨论片段 · 7 人未完成', due_at: iso(new Date(now + 86400e3)) },
      { id: 'd3', kind: 'grade_review', title: '成绩复核 1 条', due_at: iso(new Date(now + 86400e3)) },
    ],
    actionable_insights: [
      {
        insight_id: 'ins-1', kind: 'mastery_drop',
        summary: '17/46 人连续两次在参数边界 a=0 失分',
        evidence: '昨晚作业 11 人、本周周测 13 人出现同类错误，其中 7 人重复出现；明天第 3 节正好讲导数分类讨论。',
        data_window: { from: iso(new Date(now - 7 * 86400e3)), to: iso() },
        recommended_actions: ['加入下节课', '出巩固题', '看典型作答'],
      },
      {
        insight_id: 'ins-2', kind: 'queue_pressure',
        summary: '导数周测待确认作答需要按题集中批阅',
        evidence: '主观题需要逐份核对评分点；按题分批预计更快。',
        data_window: { from: iso(new Date(now - 2 * 86400e3)), to: iso() },
        recommended_actions: ['去批改'],
      },
    ],
    degraded: false,
  }
}

export function classInsights(classId: string): ActionableInsight[] {
  const now = Date.now()
  return [
    {
      insight_id: `ins-${classId}-1`, kind: 'mastery_drop',
      summary: '本班导数与单调性正确率下滑',
      evidence: '平均正确率 74%，低于年级 81%。',
      data_window: { from: iso(new Date(now - 7 * 86400e3)), to: iso() },
      recommended_actions: ['生成巩固题'],
      confidence: 0.8,
    },
    {
      insight_id: `ins-${classId}-2`, kind: 'queue_pressure',
      summary: '存在较多低置信度待批项',
      evidence: '建议优先人工复核、按题批改。',
      data_window: { from: iso(new Date(now - 3 * 86400e3)), to: iso() },
      recommended_actions: ['去批改'],
      confidence: 0.9,
    },
  ]
}

export function lessonArtifact(classId: string, topic: string, requirements: string): TeacherArtifact {
  const refs: SourceRef[] = [{ kind: 'kb', ref: 'kb://resource/301', title: '教材示例', page: 12, snippet: '函数单调性定义与判定' }]
  // 结构化环节：参照真实教案「环节 ×(教师活动|学生活动|分钟|设计意图|教学评价)」环节表（teacher-ground-truth/LESSON_REAL_WORLD.md）
  const segments: LessonSegment[] = [
    {
      id: 'seg-1', title: '复习导入（认知冲突）', duration_min: 5, kind: 'import',
      learning_objective: '回顾导数的几何意义与单调性定义，引出判定三次函数单调性的困难，形成认知冲突。',
      teacher_action: '提问 y=x² 的单调性可用图像法/定义法判定，再抛出三次函数定义法繁琐、画不出图像，引发认知冲突。',
      student_action: '独立判定二次函数单调性；尝试三次函数后遇到困难。',
      core_question: '三次函数无法简便判定单调性，能否用导数解决？',
      content: '复习导数的几何意义；从二次函数判定入手，引出三次函数判定的认知冲突。',
      assessment_check: '观察学生能否说出"导数几何意义=切线斜率"。',
      source: 'adapted', locked: false,
    },
    {
      id: 'seg-2', title: '新知探究：导函数正负与单调性', duration_min: 10, kind: 'concept',
      learning_objective: '通过具体函数图像，归纳出区间内 f\'(x)>0 单调递增、f\'(x)<0 单调递减、f\'(x)=0 常函数。',
      teacher_action: '展示 4 个具体函数图像，引导学生从特殊到一般归纳；补充 f\'(x)=0 为常函数。',
      student_action: '观察图像，小组讨论，猜想单调性与导数正负的关系。',
      core_question: '单调性与导函数正负有何关系？该规律是否具有一般性？',
      content: '通过 4 个函数图像观察导函数正负与单调性关系，归纳一般性结论。',
      materials: [{ resource_id: 'r2', name: '函数单调性.pdf', usage: '课堂投影片 4 幅函数图像' }],
      assessment_check: '随堂口头提问：f\'(x)>0 是否一定单调递增。',
      source: 'adapted', locked: false,
    },
    {
      id: 'seg-3', title: '理解新知：几何意义验证', duration_min: 5, kind: 'concept',
      learning_objective: '用导数的几何意义（切线斜率方向）验证一般性结论。',
      teacher_action: '用切线"左下右上/左上右下"方向演示验证结论。',
      student_action: '在学案标注切线方向与单调性对应。',
      core_question: '为什么切线斜率为正时函数递增？',
      content: '用切线斜率方向验证单调性结论。',
      assessment_check: '课堂练习 1（基础判定）。',
      source: 'adapted', locked: false,
    },
    {
      id: 'seg-4', title: '例题 1：求单调区间', duration_min: 10, kind: 'example',
      learning_objective: '掌握"求定义域→求导→解f\'(x)>0/<0→写单调区间"的标准步骤。',
      teacher_action: '示范例 1（由导函数符号画大致图像）；板书典型"漏定义域"错误，组织学生辨析。',
      student_action: '独立完成例 1，对照标准步骤核对。',
      core_question: '求单调区间时遗漏定义域会怎样？',
      content: '例1（导函数符号画图像）、例2（求单调区间）；强调定义域是每步前提。',
      materials: [{ resource_id: 'r1', name: '导数教案.docx', usage: '例题编号对照' }],
      assessment_check: '随堂 2 题限时练。',
      source: 'adapted', locked: false,
    },
    {
      id: 'seg-5', title: '例题 2：参数边界分类讨论（本班痛点）', duration_min: 12, kind: 'intervention',
      learning_objective: '掌握含参时对参数 a 分类讨论（a=0 边界），回应本班 17/46 人连续两次失分。',
      teacher_action: '讲例 3（含参数求单调区间）时演示三段分类依据：二次项系数含参、驻点是否在定义域内、根的大小与分布；重点辨析 a=0。',
      student_action: '7 名重复出错学生重点演板；全班核对 a=0 边界情况。',
      core_question: '参数 a 为何要分 a=0 与 a≠0？',
      content: '含参函数单调区间讨论：二次项系数是否为 0 → 判别式 → 两根大小。',
      assessment_check: '限时 3 分钟独立完成一道含参题。',
      linked_insights: ['ins-1'], // 依据 a=0 失分洞察（teacher-ground-truth/GRADING_REAL_WORLD.md 采分点映射）
      source: 'ai_suggested', locked: false,
    },
    {
      id: 'seg-6', title: '课堂小结', duration_min: 3, kind: 'summary',
      learning_objective: '总结"求单调区间四步法"与"数形结合/从特殊到一般"思想方法。',
      teacher_action: '师生共同总结算法步骤与方法思想。',
      student_action: '各自复述四步法并修正笔记。',
      core_question: '今天你学到了哪四步？',
      content: '知识总结（四步法）+ 方法总结（数形结合）。',
      assessment_check: '口头复述。',
      source: 'template', locked: false,
    },
  ]
  return {
    artifact_id: 'art-lesson-1', artifact_type: 'lesson_plan', scene: 'teacher.prep', class_id: classId,
    owner_id: 't1', status: 'draft', version: 1, engine: 'local',
    content: {
      topic,
      objectives: ['理解函数单调性的概念', '掌握单调性判定方法', '会用导数求单调区间并讨论含参情形'],
      segments,
      materials: ['函数单调性.pdf', '导数教案.docx'], assignment: '完成巩固练习 3 题（基础 2 + 提升含参 1）',
    },
    source_refs: refs, warnings: requirements ? [] : ['未填写改编要求'], degraded: !requirements, created_at: iso(), updated_at: iso(),
  }
}

export function quizArtifact(kps: string[], count: number, opts: Partial<QuizBuildParams> = {}): TeacherArtifact {
  // D1 题量诚实（RC-05-3）：buildQuizSet 按请求数足额抽取，池耗尽用参数化变式补足，禁止静默减题；
  // 同时走出“巩固题 N”占位：返回真实题干 + 选项乱序，跨知识点×难度分布。
  const requests: QuizBuildParams = { ...opts, count, knowledge_points: kps.length ? kps : opts?.knowledge_points }
  const drawn = buildQuizSet(requests)
  const items = drawn.map((q, i) => ({
    item_no: i + 1,
    q_type: q.q_type,
    difficulty: q.difficulty,
    kp_code: q.kp_code,
    kp_name: q.kp_name,
    question_text: q.question_text,
    options: q.options ? [...q.options] : undefined,
    answer: q.answer,
    answer_analysis: q.answer_analysis,

  }))
  return {
    artifact_id: 'art-quiz-1', artifact_type: 'quiz_set', scene: 'teacher.assessment', class_id: 'c1',
    owner_id: 't1', status: 'draft', version: 1, engine: 'local',
    content: { knowledge_points: kps, count: items.length, difficulty: { easy: 0.4, medium: 0.4, hard: 0.2 }, items, duplicated: 0, insufficient: false },
    source_refs: [], warnings: [], degraded: false, created_at: iso(), updated_at: iso(),

  }
}

// SSOT = 21 份待批（BUSINESS_OBJECTS §3）；Today 徽标与批改队列共用此单一数据源。

// 确定性学生名单前 21：前 16 名未确认（含若干 low_confidence），后 5 名已确认（作为"已处理"锚点）
const QUEUE_NAMES = [
  '李昊', '王雨桐', '张子墨', '陈思睿', '刘一鸣', '赵欣怡', '孙可', '周宇航',
  '吴欣然', '郑皓宇', '冯若彤', '蒋明轩', '韩露', '杨子航', '何静怡', '高天',
  '林晓', '罗宇轩', '梁雪', '宋斌', '唐心怡',
]

export function gradingQueue(): GradingQueueItem[] {
  const confirmedIdx = [16, 17, 18, 19, 20]
  return QUEUE_NAMES.map((name, i) => {
    const confirmed = confirmedIdx.includes(i)
    // 未确认份确定性分布：easy 高分 / 参数边界 a=0（与 a=0 洞察呼应）进入 low_confidence
    const isLow = !confirmed && [1, 6, 9, 12, 14].includes(i)
    return {
      submission_item_id: `si-${i + 1}`,
      student_label: name,
      status: confirmed ? 'confirmed' : isLow ? 'low_confidence' : 'unprocessed',
      confidence: confirmed ? 0.85 : isLow ? 0.42 : 0.92,
      suggestion_score: confirmed ? [7, 8, 6, 9, 5][i % 5] : isLow ? 2 : [8, 9, 7, 10][i % 4],
      teacher_final_score: confirmed ? [7, 8, 6, 9, 5][i % 5] : null,
    }
  })
}

export function gradingDetail(item: GradingQueueItem): GradingDetail & { suggestion: NonNullable<GradingDetail['suggestion']> } {
  return {
    ...item,
    assignment_title: '函数的单调性巩固练习',
    question_text: '已知函数 f(x)=x³−3x，求其单调递增区间。',
    question_type: 'choice',
    options: {
      A: '(-∞, -1) ∪ (1, +∞)',
      B: '(-1, 1)',
      C: '(-∞, 1)',
      D: '(-1, +∞)',
    },
    standard_answer: '(-∞, -1) ∪ (1, +∞)',
    answer_analysis: '求导得到 f′(x)=3x²−3，并按临界点 -1、1 判断符号。',
    original_answer: `$f(x)=x^3-3x$ 的单调性：$f'(x)=3x^2-3$，令其为零得 $x=\\pm 1$，故在 $(-\\infty,-1)\\cup(1,+\\infty)$ 单调增，$(-1,1)$ 单调减。`,

    scoring_standard: '正确求导（3 分）、找到分界点（3 分）、写出单调区间（4 分）。',
    suggestion: {
      suggestion_id: `sug-${item.submission_item_id}`, submission_item_id: item.submission_item_id,
      version: 1,
      student_label: item.student_label, original_answer: '', scoring_standard: '',
      suggestion_score: item.suggestion_score, confidence: item.confidence,
      evidence: '按评分标准分步核对。', review_needed: item.confidence < 0.6,
      teacher_final_score: item.teacher_final_score, teacher_feedback: null,
      decision: item.status === 'confirmed' ? 'accepted' : 'draft',
    },
  }
}

export function videoInsights(classId: string): VideoInsight {
  return {
    aggregate_engagement: 0.72,
    segments: [{ time: 120, event: 'active_quiz', summary: '随堂检测 24 人参与' }],
    actions: [{ insight_id: `vid-${classId}-1`, kind: 'engagement', summary: '本课检测题通过率 78%', evidence: '18/23 通过。', data_window: { from: iso(), to: iso() }, recommended_actions: ['巩固讲解'] }],
    degraded: false,
  }
}

export function seedResources(): TeacherResource[] {
  return [
    { resource_id: 'r1', name: '导数教案.docx', file_type: 'docx', size_bytes: 120034, status: 'ready', created_at: iso() },
    { resource_id: 'r2', name: '函数单调性.pdf', file_type: 'pdf', size_bytes: 512003, status: 'ready', pages: [{ page: 1 }, { page: 2 }], created_at: iso() },
  ]
}


