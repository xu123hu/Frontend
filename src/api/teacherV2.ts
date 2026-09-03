/**
 * 教师工作台 V2 API（/teacher-v2/*）
 * 契约：DESIGN-V2.md §四；信封由 api.raw 解包，teacherGet 返回 { data, status }
 */
import { fetchEventSource } from '@microsoft/fetch-event-source'
import { authHeaders } from '@/api/client'
import { teacherGet, teacherPost, teacherRequest } from './teacher/client'
import type {
  V2Assignment, V2CandidateQuestion, V2ClassroomSession, V2ComposeParams, V2InsightOverview, V2KpDetail, V2KpNode,
  V2LessonPlan, V2Paper, V2Question, V2ResourceItem, V2ReviewPack, V2SlideDeck, V2SlideTemplate, V2Submission,
  V2TodayData,
} from '@/types/teacherV2'
import type { TeacherTask } from '@/types/teacher'

export const v2Api = {
  today: (signal?: AbortSignal) => teacherGet<V2TodayData>('/teacher-v2/today', undefined, signal),

  /* 教案 */
  plans: () => teacherGet<{ items: V2LessonPlan[] }>('/teacher-v2/lesson-plans'),
  plan: (id: string, signal?: AbortSignal) => teacherGet<V2LessonPlan>(`/teacher-v2/lesson-plans/${id}`, undefined, signal),
  patchPlan: (id: string, version: number, patch: Partial<V2LessonPlan>) =>
    teacherRequest<V2LessonPlan>('PATCH', `/teacher-v2/lesson-plans/${id}`, { body: { version, patch } }),
  confirmPlan: (id: string) => teacherPost<V2LessonPlan>(`/teacher-v2/lesson-plans/${id}/confirm`),
  /** SSE：meta → outline → section(逐环节) → done */
  generatePlan: (body: { topic: string; class_id: string }, onEvent: (event: string, data: any) => void, signal?: AbortSignal) =>
    v2Sse('POST', '/teacher-v2/lesson-plans/generate', body, onEvent, signal),

  /* 课件 */
  templates: () => teacherGet<{ items: V2SlideTemplate[] }>('/teacher-v2/slides/templates'),
  decks: () => teacherGet<{ items: { deck_id: string; title: string; class_name: string; template_id: string; slide_count: number; version: number }[] }>('/teacher-v2/slides'),
  deck: (id: string, signal?: AbortSignal) => teacherGet<V2SlideDeck>(`/teacher-v2/slides/${id}`, undefined, signal),
  patchDeck: (id: string, body: { template_id?: string; page_id?: string; elements?: V2SlideDeck['slides'][number]['elements'] }) =>
    teacherRequest<V2SlideDeck>('PATCH', `/teacher-v2/slides/${id}`, { body }),
  addSlide: (deckId: string, body: { kind: V2SlideDeck['slides'][number]['kind']; title?: string; after_page_id?: string }) =>
    teacherPost<{ slide: V2SlideDeck['slides'][number]; deck: V2SlideDeck }>(`/teacher-v2/slides/${deckId}/pages`, body),
  deleteSlide: (deckId: string, pageId: string) =>
    teacherRequest<{ removed: string; deck: V2SlideDeck }>('DELETE', `/teacher-v2/slides/${deckId}/pages/${pageId}`),
  patchSlide: (deckId: string, pageId: string, body: { kind?: V2SlideDeck['slides'][number]['kind']; title?: string }) =>
    teacherRequest<V2SlideDeck>('PATCH', `/teacher-v2/slides/${deckId}/pages/${pageId}`, { body }),
  regenerateSlide: (deckId: string, pageId: string) =>
    teacherPost<{ slide: V2SlideDeck['slides'][number]; deck: V2SlideDeck }>(`/teacher-v2/slides/${deckId}/pages/${pageId}/regenerate`),
  exportDeck: (deckId: string, format: 'pptx' | 'pdf') =>
    teacherPost<{ task_id: string }>(`/teacher-v2/slides/${deckId}/export`, { format }),
  /** SSE：meta → outline → page(逐页) → done */
  generateDeck: (body: { plan_id: string; template_id?: string }, onEvent: (event: string, data: any) => void, signal?: AbortSignal) =>
    v2Sse('POST', '/teacher-v2/slides/generate', body, onEvent, signal),

  /* 组卷 */
  kpTree: (signal?: AbortSignal) => teacherGet<{ tree: V2KpNode[] }>('/teacher-v2/quiz/kp-tree', undefined, signal),
  questions: (query: { kp_code?: string; difficulty?: string; q_type?: string; q?: string }, signal?: AbortSignal) =>
    teacherGet<{ items: V2Question[]; total: number }>('/teacher-v2/quiz/questions', query as Record<string, unknown>, signal),
  compose: (params: V2ComposeParams) => teacherPost<V2Paper>('/teacher-v2/quiz/compose', params),
  paper: (id: string, signal?: AbortSignal) => teacherGet<V2Paper>(`/teacher-v2/quiz/papers/${id}`, undefined, signal),
  swapItem: (paperId: string, seq: number) => teacherPost<{ item: V2Paper['items'][number] }>(`/teacher-v2/quiz/papers/${paperId}/items/${seq}/swap`),

  /* 作业与批改 */
  assignments: () => teacherGet<{ items: V2Assignment[] }>('/teacher-v2/assignments'),
  createAssignment: (body: Partial<V2Assignment> & { tiers?: V2Assignment['tiers'] }) => teacherPost<V2Assignment>('/teacher-v2/assignments', body),
  submissions: (assignId: string, filter?: string, signal?: AbortSignal) =>
    teacherGet<{ items: V2Submission[]; context: { assignment: V2Assignment } }>(`/teacher-v2/assignments/${assignId}/submissions`, filter ? { filter } : undefined, signal),
  grade: (submissionId: string, body: { final_score?: number; teacher_feedback?: string; error_tags?: string[]; kp_code?: string; kp_name?: string }) =>
    teacherPost<V2Submission>(`/teacher-v2/submissions/${submissionId}/grade`, body),
  reviewPack: (assignId: string) => teacherPost<{ pack: V2ReviewPack; wrong_count: number }>(`/teacher-v2/assignments/${assignId}/review-pack`),

  /* 课堂 */
  openSession: (body: { class_id: string; topic: string }) => teacherPost<V2ClassroomSession>('/teacher-v2/classroom/sessions', body),
  session: (id: string, signal?: AbortSignal) => teacherGet<V2ClassroomSession>(`/teacher-v2/classroom/sessions/${id}`, undefined, signal),
  sendQuestion: (sessionId: string, questionId: string) => teacherPost<V2ClassroomSession>(`/teacher-v2/classroom/sessions/${sessionId}/questions`, { question_id: questionId }),
  closeQuestion: (sessionId: string, questionId?: string) => teacherPost<V2ClassroomSession>(`/teacher-v2/classroom/sessions/${sessionId}/close-question`, questionId ? { question_id: questionId } : {}),
  closeSession: (sessionId: string) => teacherPost<V2ClassroomSession>(`/teacher-v2/classroom/sessions/${sessionId}/close`),
  pick: (sessionId: string) => teacherPost<{ student: { user_id: string; name: string } | null; remaining: number; reset?: boolean }>(`/teacher-v2/classroom/sessions/${sessionId}/pick`),

  /* 学情 */
  insights: (classId: string, signal?: AbortSignal) => teacherGet<V2InsightOverview>('/teacher-v2/insights/overview', { class_id: classId }, signal),
  kpDetail: (code: string, classId: string, signal?: AbortSignal) => teacherGet<V2KpDetail>(`/teacher-v2/insights/kp/${code}`, { class_id: classId }, signal),

  /* 资源 */
  resources: (signal?: AbortSignal) => teacherGet<{ tree: unknown[]; items: V2ResourceItem[] }>('/teacher-v2/resources', undefined, signal),
  uploadResource: (fileName: string) => teacherPost<{ task_id: string }>('/teacher-v2/resources/upload', { file_name: fileName }),
  candidates: (signal?: AbortSignal) => teacherGet<{ items: V2CandidateQuestion[] }>('/teacher-v2/resources/candidates', undefined, signal),
  reviewCandidate: (id: string, action: 'approve' | 'reject') => teacherPost<V2CandidateQuestion>(`/teacher-v2/resources/candidates/${id}/${action}`),

  /* 任务中心 */
  tasks: (signal?: AbortSignal) => teacherGet<{ items: TeacherTask[]; running: number }>('/teacher-v2/tasks', undefined, signal),
  task: (id: string, signal?: AbortSignal) => teacherGet<TeacherTask>(`/teacher-v2/tasks/${id}`, undefined, signal),

  /** SSE：meta → token → card → done */
  butlerChat: (body: { message: string; scene?: string }, onEvent: (event: string, data: any) => void, signal?: AbortSignal) =>
    v2Sse('POST', '/teacher-v2/butler/chat', body, onEvent, signal),
}

/** 课堂实时统计 SSE：stats* → done */
export function streamSessionStats(sessionId: string, questionId: string, onEvent: (event: string, data: any) => void, signal?: AbortSignal) {
  return v2Sse('GET', `/teacher-v2/classroom/sessions/${sessionId}/stats?question_id=${encodeURIComponent(questionId)}`, undefined, onEvent, signal)
}

/** V2 SSE 通用通道：POST JSON / GET，事件回调 onEvent(event, data) */
export function v2Sse(method: 'GET' | 'POST', path: string, body?: unknown, onEvent?: (event: string, data: any) => void, signal?: AbortSignal) {
  const ctrl = new AbortController()
  if (signal) {
    if (signal.aborted) ctrl.abort()
    else signal.addEventListener('abort', () => ctrl.abort(), { once: true })
  }
  const finished = fetchEventSource(`/api${path}`, {
    method,
    headers: {
      ...authHeaders(),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      Accept: 'text/event-stream',
    } as Record<string, string>,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: ctrl.signal,
    openWhenHidden: true,
    async onopen(res: Response) {
      if (!res.ok || !(res.headers.get('content-type') || '').includes('text/event-stream')) {
        let detail = `HTTP ${res.status}`
        try { const j = await res.json(); detail = (j as any).message || detail } catch { /* ignore */ }
        throw new Error(detail)
      }
    },
    onmessage(ev: any) {
      if (!ev.event) return
      let data: any
      try { data = JSON.parse(ev.data) } catch { data = { raw: ev.data } }
      onEvent?.(ev.event, data)
    },
    onerror(err: unknown) { throw err },
  })
  return {
    abort: () => ctrl.abort(),
    finished: finished.catch((err: unknown) => {
      if (ctrl.signal.aborted) return { aborted: true } as const
      throw err
    }),
  }
}
