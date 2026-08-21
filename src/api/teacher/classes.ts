import { teacherGet } from './client'
import type { ActionableInsight } from '@/types/teacher'

export const classesApi = {
  /** 后端返回 data:{insights:[...]}，此处解包数组（审计 I-08 对齐） */
  insights: async (
    classId: string,
    actionable?: boolean,
    signal?: AbortSignal,
  ): Promise<ActionableInsight[]> => {
    const res = await teacherGet<{ insights: ActionableInsight[] }>(
      `/teacher/classes/${classId}/insights`,
      actionable === undefined ? undefined : { actionable },
      signal,
    )
    return res.data?.insights ?? []
  },
}
