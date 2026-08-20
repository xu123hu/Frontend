import { ref } from 'vue'
import { createIdempotencyTracker } from '@/api/idempotency'

const idem = createIdempotencyTracker()

/**
 * 一次用户写动作的重试必须复用同一幂等键；run(actionId) 生成该动作的固定键并传给 API。
 */
export function useArtifactMutation() {
  const busy = ref(false)
  const error = ref<string | null>(null)

  async function run<T>(actionId: string, fn: (key: string) => Promise<T>): Promise<T | null> {
    busy.value = true
    error.value = null
    try {
      return await fn(idem.keyFor(actionId))
    } catch (e: any) {
      error.value = e?.message || '操作失败'
      return null
    } finally {
      busy.value = false
    }
  }

  return { busy, error, run }
}