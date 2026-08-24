export const serverWorkspaceFixture = {
  data: {
    context: {
      class: { class_id: 'c1', label: '高二（3）班 · 46 人' },
      assignment: { assignment_id: 'a1', title: '函数的单调性' },
      question: {
        item_no: 1,
        question_text: '已知 f(x)=x^3-3x，讨论函数的单调性。',
        q_type: 'solution',
        options: null,
        max_score: 10,
      },
      filters: { status: 'all' },
      progress: { total: 3, confirmed: 0, remaining: 3 },
    },
    available_context: {
      assignments: [{ assignment_id: 'a1', title: '函数的单调性' }],
      questions: [{ item_no: 1, label: '第 1 题', question_text: '已知 f(x)=x^3-3x，讨论函数的单调性。' }],
    },
    queue: [
      { submission_item_id: 'si-1', anonymous_label: '作答 #001', state: 'ungraded', manual_review: false },
      { submission_item_id: 'si-2', anonymous_label: '作答 #002', state: 'review', manual_review: true },
      { submission_item_id: 'si-3', anonymous_label: '作答 #003', state: 'ungraded', manual_review: false },
    ],
    selected: {
      submission_item_id: 'si-2',
      work: { original_answer: 'f′(x)=3x²−3，x=-1,1 是分界点。', file_id: null },
      scoring: {
        max_score: 10,
        rubric_status: 'ready',
        rubric_items: [
          { id: 'derivative', criterion: '正确求导', points: 3, evidence_hint: '写出 f′(x)=3x²−3' },
          { id: 'critical', criterion: '确定分界点', points: 3, evidence_hint: 'x=-1,1' },
          { id: 'interval', criterion: '写出单调区间', points: 4, evidence_hint: '给出增减区间' },
        ],
        standard_answer: 'f′(x)=3x²−3；由导数符号判断函数的增减区间。',
        answer_analysis: '先求导，确定临界点，再判断每个区间的导数符号。',
        fallback_standard: '正确求导（3 分）、找到分界点（3 分）、写出单调区间（4 分）。',
      },
      suggestion: {
        suggestion_id: 'sug-si-2', version: 1, proposed_score: 6, review_needed: true,
        evidence: [{ kind: 'grading_evidence', text: '缺少单调区间的完整表述。' }], confidence: 0.42,
      },
      confirmed_decision: null,
      fixture_id: 'derivative-solution',
      source_ref: 'docs/teacher-v2/references/grading/TEST_INPUT_CORPUS.md',
    },
    navigation: { previous_id: 'si-1', next_ungraded_id: 'si-3' },
  },
  status: 200,
}
