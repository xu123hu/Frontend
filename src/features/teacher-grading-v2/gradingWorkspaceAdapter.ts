import type {
  AvailableWorkspaceContext,
  GradingWorkspace,
  RubricStatus,
  SubmissionQueueEntry,
  WorkspaceContext,
  WorkspaceQueueState,
  WorkspaceSelection,
} from './contracts'

type UnknownRecord = Record<string, unknown>

function invalid(): never { throw new Error('批改工作台数据不完整') }
function record(value: unknown): UnknownRecord { if (!value || typeof value !== 'object' || Array.isArray(value)) invalid(); return value as UnknownRecord }
function array(value: unknown): unknown[] { if (!Array.isArray(value)) invalid(); return value }
function string(value: unknown): string { if (typeof value !== 'string') invalid(); return value }
function nullableString(value: unknown): string | null { if (value === null || value === undefined) return null; return string(value) }
function number(value: unknown): number { if (typeof value !== 'number' || !Number.isFinite(value)) invalid(); return value }
function nullableNumber(value: unknown): number | null { if (value === null || value === undefined) return null; return number(value) }
function boolean(value: unknown): boolean { if (typeof value !== 'boolean') invalid(); return value }

function queueState(value: unknown): Exclude<WorkspaceQueueState, 'all'> {
  if (value === 'ungraded' || value === 'review' || value === 'confirmed') return value
  return invalid()
}

function filter(value: unknown): WorkspaceContext['filter'] {
  if (value === 'all' || value === 'ungraded' || value === 'review' || value === 'confirmed') return value
  return invalid()
}

function parseContext(value: unknown): WorkspaceContext {
  const source = record(value)
  const classSource = source.class === null ? null : record(source.class)
  const assignmentSource = source.assignment === null ? null : record(source.assignment)
  const questionSource = source.question === null ? null : record(source.question)
  const filters = record(source.filters)
  const progress = record(source.progress)
  return {
    class: classSource ? { classId: string(classSource.class_id), label: string(classSource.label) } : null,
    assignment: assignmentSource ? { assignmentId: string(assignmentSource.assignment_id), title: string(assignmentSource.title) } : null,
    question: questionSource ? {
      itemNo: number(questionSource.item_no),
      questionText: string(questionSource.question_text),
      questionType: string(questionSource.q_type),
      options: questionSource.options === null || questionSource.options === undefined ? null : array(questionSource.options).map(string),
      maxScore: nullableNumber(questionSource.max_score),
    } : null,
    filter: filter(filters.status),
    progress: { total: number(progress.total), confirmed: number(progress.confirmed), remaining: number(progress.remaining) },
  }
}

function parseAvailableContext(value: unknown): AvailableWorkspaceContext {
  const source = record(value)
  return {
    assignments: array(source.assignments).map((item) => {
      const row = record(item)
      return { assignmentId: string(row.assignment_id), title: string(row.title) }
    }),
    questions: array(source.questions).map((item) => {
      const row = record(item)
      return { itemNo: number(row.item_no), label: string(row.label), questionText: string(row.question_text) }
    }),
  }
}

function parseQueue(value: unknown): SubmissionQueueEntry[] {
  return array(value).map((item) => {
    const row = record(item)
    return {
      submissionItemId: string(row.submission_item_id),
      anonymousLabel: string(row.anonymous_label),
      state: queueState(row.state),
      manualReview: boolean(row.manual_review),
    }
  })
}

function parseSelection(value: unknown): WorkspaceSelection | null {
  if (value === null) return null
  const source = record(value)
  const work = record(source.work)
  const scoring = record(source.scoring)
  const rawRubricStatus = scoring.rubric_status
  if (rawRubricStatus !== 'ready' && rawRubricStatus !== 'missing') invalid()
  const rubricStatus: RubricStatus = rawRubricStatus
  const rubricItems = array(scoring.rubric_items).map((item) => {
    const row = record(item)
    return { id: string(row.id), criterion: string(row.criterion), points: number(row.points), evidenceHint: string(row.evidence_hint) }
  })
  const maxScore = nullableNumber(scoring.max_score)
  if (rubricStatus === 'ready' && (maxScore === null || rubricItems.length === 0)) invalid()
  const suggestionSource = source.suggestion === null ? null : record(source.suggestion)
  const confirmedSource = source.confirmed_decision === null ? null : record(source.confirmed_decision)
  return {
    submissionItemId: string(source.submission_item_id),
    work: { originalAnswer: nullableString(work.original_answer), fileId: nullableString(work.file_id) },
    scoring: {
      maxScore,
      rubricStatus,
      rubricItems,
      standardAnswer: nullableString(scoring.standard_answer),
      answerAnalysis: nullableString(scoring.answer_analysis),
      fallbackStandard: nullableString(scoring.fallback_standard),
    },
    suggestion: suggestionSource ? {
      suggestionId: nullableString(suggestionSource.suggestion_id),
      version: nullableNumber(suggestionSource.version),
      proposedScore: nullableNumber(suggestionSource.proposed_score),
      reviewNeeded: boolean(suggestionSource.review_needed),
      evidence: array(suggestionSource.evidence).map((item) => {
        const row = record(item)
        return { kind: string(row.kind), text: string(row.text) }
      }),
    } : null,
    confirmedDecision: confirmedSource ? {
      finalScore: nullableNumber(confirmedSource.final_score),
      feedback: nullableString(confirmedSource.feedback),
      decision: nullableString(confirmedSource.decision),
    } : null,
    fixtureId: nullableString(source.fixture_id),
    sourceRef: nullableString(source.source_ref),
  }
}

export function toGradingWorkspace(response: { data: unknown }): GradingWorkspace {
  const payload = record(response.data)
  const navigation = record(payload.navigation)
  return {
    context: parseContext(payload.context),
    availableContext: parseAvailableContext(payload.available_context),
    queue: parseQueue(payload.queue),
    selected: parseSelection(payload.selected),
    navigation: {
      previousId: nullableString(navigation.previous_id),
      nextUngradedId: nullableString(navigation.next_ungraded_id),
    },
  }
}
