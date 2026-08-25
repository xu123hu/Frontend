import { useRoute } from 'vue-router'
import { newIdempotencyKey } from '@/api/idempotency'
import { useTeacherContextStore } from '@/stores/teacher/context'
import type { ButlerSceneInput, TeacherScene } from '@/types/teacher'



/**
 * 组装 Butler 场景输入：前端只提交业务上下文，不提交 tool name / workflow / Provider / 模型。
 * 对话是逐条新请求：clientRequestId 必须每条消息独立生成。
 * 若按「场景+对象」缓存复用，后端 AgentRun 幂等判重会把第二条起的消息
 * 全部判为重复（"重复请求已忽略"），管家不再回话。
 */
export function useButlerScene() {
  const route = useRoute()
  const context = useTeacherContextStore()
  function submit(payload: { classId?: string; artifactId?: string; userMessage: string }): ButlerSceneInput {
    const scene = (route.meta.scene as TeacherScene) || 'teacher.today'
    return {
      scene,
      classId: payload.classId || context.classId || undefined,
      artifactId: payload.artifactId,
      userMessage: payload.userMessage,
      clientRequestId: newIdempotencyKey(),
    }
  }
  return { submit }
}
