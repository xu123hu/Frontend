/**
 * 教师工作台 V2 · 任务进度中心 store
 * 轮询 /teacher-v2/tasks（2.5s），任务 succeeded 时 toast 提醒（一次性）
 */
import { defineStore } from 'pinia'
import { v2Api } from '@/api/teacherV2'
import { useToastStore } from '@/stores/toast'
import type { TeacherTask } from '@/types/teacher'

const taskLabel: Record<string, string> = {
  'slides.generate': '课件生成',
  'slides.export': '课件导出',
  'resources.ingest': '资源摄取',
}

export const useTaskCenterStore = defineStore('teacherV2Tasks', {
  state: () => ({
    items: [] as TeacherTask[],
    running: 0,
    polling: false,
    _timer: null as ReturnType<typeof setInterval> | null,
    _notified: new Set<string>(),
  }),
  actions: {
    async refresh() {
      try {
        const res = await v2Api.tasks()
        this.items = res.data.items
        this.running = res.data.running
        const toast = useToastStore()
        for (const t of this.items) {
          if (t.status === 'succeeded' && !this._notified.has(t.task_id)) {
            this._notified.add(t.task_id)
            toast.success(`${taskLabel[t.capability] || t.capability}已完成：${t.stage || ''}`)
          }
        }
      } catch { /* 轮询失败静默，下次重试 */ }
    },
    startPolling() {
      if (this.polling) return
      this.polling = true
      this.refresh()
      this._timer = setInterval(() => this.refresh(), 2500)
    },
    stopPolling() {
      if (this._timer) clearInterval(this._timer)
      this._timer = null
      this.polling = false
    },
  },
})
