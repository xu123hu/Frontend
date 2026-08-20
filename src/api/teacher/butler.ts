import { teacherPost } from './client'
import type { ButlerSceneInput } from '@/types/teacher'

export interface ButlerChatResult {
  artifact?: unknown
  message?: string
  degraded?: boolean
  confirmation_required?: boolean
}

export const butlerApi = {
  chat: (input: ButlerSceneInput, signal?: AbortSignal) =>
    teacherPost<ButlerChatResult>('/teacher/butler/chat', input, undefined, signal),
}