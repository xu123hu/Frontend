import { onUnmounted, ref } from 'vue'
import { taskApi } from '@/api/teacher/lessons'
import type { TeacherTask } from '@/types/teacher'

export interface AsyncTaskOptions {
  intervalMs?: number
  timeoutMs?: number
}

const TERMINAL = new Set(['succeeded', 'failed', 'cancelled'])

export function useAsyncTeacherTask(options: AsyncTaskOptions = {}) {
  const task = ref<TeacherTask | null>(null)
  const status = ref<'idle' | 'polling' | 'done' | 'error'>('idle')
  const intervalMs = options.intervalMs ?? 1200
  const timeoutMs = options.timeoutMs ?? 60000
  let timer: ReturnType<typeof setTimeout> | null = null
  let cancelled = false

  async function tick(taskId: string, started: number): Promise<void> {
    if (cancelled) return
    try {
      task.value = (await taskApi.get(taskId)).data
    } catch { /* transient poll error：继续轮询直到超时 */ }
    const t = task.value
    if (t && TERMINAL.has(t.status)) {
      status.value = 'done'
      return
    }
    if (Date.now() - started > timeoutMs) { status.value = 'error'; return }
    timer = setTimeout(() => tick(taskId, started), intervalMs)
  }

  async function poll(taskId: string) {
    cancelled = false
    status.value = 'polling'
    await tick(taskId, Date.now())
  }

  async function cancel(taskId: string) {
    cancelled = true
    if (timer) { clearTimeout(timer); timer = null }
    try { await taskApi.cancel(taskId) } catch { /* ignore */ }
    status.value = 'done'
  }

  onUnmounted(() => { cancelled = true; if (timer) clearTimeout(timer) })

  return { task, status, poll, cancel }
}