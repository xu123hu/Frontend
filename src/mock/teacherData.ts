import type {
  ActionableInsight, GradingQueueItem, SourceRef, TeacherArtifact, TeacherResource, TeacherTodayData, VideoInsight,
} from '@/types/teacher'

export const iso = (d: Date = new Date()) => d.toISOString()

export const TEACHER_CLASSES = [
  { id: 'c1', name: '高二（3）班' },
  { id: 'c2', name: '高二（4）班' },
]

export function todayData(): TeacherTodayData {
  const now = Date.now()
  return {
    next_lesson: { class_id: 'c1', topic: '函数的单调性', class_name: '高二（3）班', starts_at: iso(new Date(now + 2 * 3600e3)) },
    grading_queue: { count: 5, action: 'open_grading' },
    deadlines: [{ id: 'd1', kind: 'assignment', title: '导数巩固练习', due_at: iso(new Date(now + 86400e3)) }],
    actionable_insights: [
      {
        insight_id: 'ins-1', kind: 'mastery_drop',
        summary: '高二（3）班函数单调性掌握度下降 8%',
        evidence: '本周 23 次作答，正确率由 82% 降至 74%。',
        data_window: { from: iso(new Date(now - 7 * 86400e3)), to: iso() },
        recommended_actions: ['应用到教案', '生成巩固题'],
      },
      {
        insight_id: 'ins-2', kind: 'queue_pressure',
        summary: '待批队列低置信度题目需人工复核',
        evidence: '低置信度占比 2/5，OCR 与主观题建议需教师确认。',
        data_window: { from: iso(new Date(now - 3 * 86400e3)), to: iso() },
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
  return {
    artifact_id: 'art-lesson-1', artifact_type: 'lesson_plan', scene: 'teacher.prep', class_id: classId,
    owner_id: 't1', status: 'draft', version: 1, engine: 'local',
    content: {
      topic,
      objectives: ['理解函数单调性的概念', '掌握单调性判定方法'],
      sections: [
        { title: '导入', duration_minutes: 5, activities: ['回顾二次函数图像', '提出增减趋势问题'] },
        { title: '定义与判定', duration_minutes: 20, activities: ['讲解定义', '例题 1 单调性判定'] },
        { title: '形成性检查', duration_minutes: 10, activities: ['随堂 2 题', '小组互评'] },
        { title: '小结', duration_minutes: 10, activities: ['总结判定步骤', '布置作业'] },
      ],
      materials: [], assignment: '完成巩固练习 3 题',
    },
    source_refs: refs, warnings: requirements ? [] : ['未填写改编要求'], degraded: !requirements, created_at: iso(), updated_at: iso(),
  }
}

export function quizArtifact(kps: string[], count: number): TeacherArtifact {
  const items = Array.from({ length: Math.min(count, 6) }, (_, i) => ({
    item_no: i + 1,
    q_type: (['choice', 'blank', 'text'] as const)[i % 3],
    difficulty: (['easy', 'medium', 'hard'] as const)[i % 3],
    kp_code: 'DR-02', kp_name: kps[0] || '函数单调性',
    question_text: `单调性巩固题 ${i + 1}：判断 f(x)=$x^3-3x$ 在 $[-2,2]$ 的单调区间？`,
    options: ['A', 'B', 'C', 'D'],
    answer: 'B', answer_analysis: '令 f\'(x)=0 求分界点后列表判断。',
  }))
  return {
    artifact_id: 'art-quiz-1', artifact_type: 'quiz_set', scene: 'teacher.assessment', class_id: 'c1',
    owner_id: 't1', status: 'draft', version: 1, engine: 'local',
    content: { knowledge_points: kps, count: items.length, difficulty: { easy: 0.25, medium: 0.5, hard: 0.25 }, items, duplicated: 1, insufficient: items.length < count },
    source_refs: [], warnings: [], degraded: false, created_at: iso(), updated_at: iso(),
  }
}

export function gradingQueue(): GradingQueueItem[] {
  return [
    { submission_item_id: 'si-1', student_label: '同学 A', status: 'unprocessed', confidence: 0.95, suggestion_score: 8, teacher_final_score: null },
    { submission_item_id: 'si-2', student_label: '同学 B', status: 'low_confidence', confidence: 0.45, suggestion_score: 3, teacher_final_score: null },
    { submission_item_id: 'si-3', student_label: '同学 C', status: 'unprocessed', confidence: 0.9, suggestion_score: 3, teacher_final_score: null },
    { submission_item_id: 'si-4', student_label: '同学 D', status: 'low_confidence', confidence: 0.4, suggestion_score: 1, teacher_final_score: null },
    { submission_item_id: 'si-5', student_label: '同学 E', status: 'confirmed', confidence: 0.85, suggestion_score: 7, teacher_final_score: 7 },
  ]
}

export function gradingDetail(item: GradingQueueItem) {
  return {
    ...item,
    original_answer: `$f(x)=x^3-3x$ 的单调性：$f'(x)=3x^2-3$，令其为零得 $x=\\pm 1$，故在 $(-\\infty,-1)\\cup(1,+\\infty)$ 单调增，$(-1,1)$ 单调减。`,
    scoring_standard: '正确求导（3 分）、找到分界点（3 分）、写出单调区间（4 分）。',
    suggestion: {
      suggestion_id: `sug-${item.submission_item_id}`, submission_item_id: item.submission_item_id,
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