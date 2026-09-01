import { teacherGet } from './client'
import type { GradingReviewInsights } from '@/types/teacher'

/**
 * 批改链 API（V2 workspace 之外的补充端点）。
 * V1 队列族端点已随 V1 store 收敛删除（队列/单项/建议/确认/批量确认）；
 * 后端 V1 queue 保留兼容期（契约记录 2026-09-01），前端零调用。
 */
export const gradingApi = {
  /** 批后讲评建议：最近一份已批作业最值得讲的 Top 题（调研版） */
  insights: async (classId: string, signal?: AbortSignal): Promise<GradingReviewInsights> => {
    const res = await teacherGet<GradingReviewInsights>('/teacher/grading/insights', { class_id: classId }, signal)
    return res.data ?? { assignment_id: null, title: '', review_rate: 0, top_questions: [] }
  },
}
