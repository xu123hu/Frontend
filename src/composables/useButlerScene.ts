import { useRoute } from 'vue-router'
import { createIdempotencyTracker } from '@/api/idempotency'
import type { ButlerSceneInput, TeacherScene } from '@/types/teacher'

const idem = createIdempotencyTracker()

/**
 * 组装 Butler 场景输入：前端只提交业务上下文，不提交 tool name / workflow / Provider / 模型。
 * clientRequestId 在同一个 场景+对象 下复用，避免重复提交同一诉求生成新 request id。
 */
export function useButlerScene() {
  const route = useRoute()
  function submit(payload: { classId?: string; artifactId?: string; userMessage: string }): ButlerSceneInput {
    const scene = (route.meta.scene as TeacherScene) || 'teacher.today'
    return {
      scene,
      classId: payload.classId,
      artifactId: payload.artifactId,
      userMessage: payload.userMessage,
      clientRequestId: idem.keyFor(`butler:${scene}:${payload.artifactId || payload.classId || 'global'}`),
    }
  }
  return { submit }
}