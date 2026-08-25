export type WorkspaceQueueState = 'ungraded' | 'review' | 'confirmed'
export type WorkspaceFilter = 'all' | WorkspaceQueueState
export type RubricStatus = 'ready' | 'missing'

export interface GradingWorkspaceQuery {
  classId?: string
  assignmentId?: string
  itemNo?: number
  status?: WorkspaceFilter
  submissionItemId?: string
}

export interface WorkspaceContext {
  class: { classId: string; label: string } | null
  assignment: { assignmentId: string; title: string } | null
  question: {
    itemNo: number
    questionText: string
    questionType: string
    options: string[] | null
    maxScore: number | null
  } | null
  filter: WorkspaceFilter
  progress: { total: number; confirmed: number; remaining: number }
}

export interface AvailableWorkspaceContext {
  assignments: Array<{ assignmentId: string; title: string }>
  questions: Array<{ itemNo: number; label: string; questionText: string }>
}

export interface SubmissionQueueEntry {
  submissionItemId: string
  anonymousLabel: string
  state: Exclude<WorkspaceQueueState, 'all'>
  manualReview: boolean
}

export interface WorkspaceRubricItem {
  id: string
  criterion: string
  points: number
  evidenceHint: string
}

export interface WorkspaceSelection {
  submissionItemId: string
  work: { originalAnswer: string | null; fileId: string | null }
  scoring: {
    maxScore: number | null
    rubricStatus: RubricStatus
    rubricItems: WorkspaceRubricItem[]
    standardAnswer: string | null
    answerAnalysis: string | null
    fallbackStandard: string | null
  }
  suggestion: {
    suggestionId: string | null
    version: number | null
    proposedScore: number | null
    reviewNeeded: boolean
    evidence: Array<{ kind: string; text: string }>
  } | null
  confirmedDecision: { finalScore: number | null; feedback: string | null; decision: string | null } | null
  fixtureId: string | null
  sourceRef: string | null
}

export interface GradingWorkspace {
  context: WorkspaceContext
  availableContext: AvailableWorkspaceContext
  queue: SubmissionQueueEntry[]
  selected: WorkspaceSelection | null
  navigation: { previousId: string | null; nextUngradedId: string | null }
}

export interface ConfirmWorkspaceDecision {
  decision: 'accept' | 'override'
  finalScore: number | null
  feedback: string
}

export interface SetWorkspaceReview {
  state: 'pending' | 'cleared'
  note?: string | null
  clientRequestId: string
}
