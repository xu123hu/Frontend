<template>
  <div class="view">
    <div class="greeting">
      <div class="hello">课堂任务中心 · <span style="color:var(--err);">{{ todoCount }} 项</span> 待完成</div>
      <div class="sub">老师下发的作业/试卷/挑战，以及系统自适应推荐。</div>
    </div>

    <div class="task-tabs">
      <button
        v-for="t in tabs" :key="t.key"
        :class="{ active: activeTab === t.key }"
        @click="activeTab = t.key"
      >{{ t.label }} <span class="num">{{ t.count }}</span></button>
    </div>

    <div v-if="loading" class="empty-state">
      <div class="es-icon">⏳</div>
      <div class="es-text">任务加载中…</div>
    </div>
    <div v-else-if="errorMsg" class="empty-state">
      <div class="es-icon">⚠️</div>
      <div class="es-text">{{ errorMsg }}</div>
    </div>
    <div v-else class="task-list">
      <div v-for="t in shownTasks" :key="t.id" class="task-item" :class="[t.cls, { done: t.done }]" @click="t.done && toast.info('已完成的作业：' + t.tt)">
        <div class="type-ic" :class="t.iconCls">{{ t.icon }}</div>
        <div class="body">
          <div class="tt">{{ t.tt }}</div>
          <div class="meta">
            <span>{{ t.teacher }}</span>
            <span :class="{ deadline: t.deadlineCls }">{{ t.deadline }}</span>
            <span v-if="t.kp">📍 关联 {{ t.kp }}</span>
          </div>
          <div v-if="t.progress !== undefined" class="progress"><div class="f" :style="{ width: t.progress + '%' }"></div></div>
          <div v-if="t.progressText" class="progress-text">{{ t.progressText }}</div>
          <div v-else-if="t.doneText" style="font-size:11.5px;color:var(--ok-deep);font-weight:700;">{{ t.doneText }}</div>
        </div>
        <div class="right">
          <button v-if="t.primary" class="primary" @click.stop="startTask(t)">{{ t.primary }}</button>
          <button v-for="b in t.extraBtns || []" :key="b" @click.stop="viewDetail(t, b)">{{ b }}</button>
        </div>
      </div>
      <div v-if="!shownTasks.length" class="empty-state">
        <div class="es-icon">🎉</div>
        <div class="es-text">{{ emptyText }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '@/api/client'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
const router = useRouter()
const activeTab = ref('todo')

/* ---------- 任务列表（GET /api/student/assignments?status=all，客户端分类） ---------- */
const tasks = ref([])
const loading = ref(true)
const errorMsg = ref('')

const TYPE_MAP = {
  quiz: { icon: '📝', iconCls: 'quiz', action: '▶ 开始' },
  watch: { icon: '🎬', iconCls: 'video', action: '▶ 观看' },
}

function isDone(it) {
  const p = it.progress || { done: 0, total: 0 }
  return p.total > 0 && p.done >= p.total
}

function pad(n) { return String(n).padStart(2, '0') }
function fmtDeadline(iso, overdue) {
  if (!iso) return { text: '', cls: false }
  const d = new Date(iso)
  if (isNaN(d)) return { text: '', cls: false }
  const txt = `截止 ${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  return overdue
    ? { text: `⏰ 已逾期 · ${txt}`, cls: true }
    : { text: `⏰ ${txt}`, cls: true }
}

function mapTask(it) {
  const done = isDone(it)
  const p = it.progress || { done: 0, total: 0 }
  const tm = TYPE_MAP[it.type] || { icon: '📋', iconCls: 'quiz', action: '▶ 开始' }
  const dl = fmtDeadline(it.deadline, it.overdue && !done)
  const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0
  return {
    id: it.assignment_id,
    cls: it.overdue && !done ? 'urgent' : 'normal',
    icon: tm.icon,
    iconCls: tm.iconCls,
    tt: it.title,
    teacher: '👨🏫 老师下发',
    deadline: dl.text,
    deadlineCls: dl.cls,
    kp: '',
    progress: done ? undefined : pct,
    progressText: done ? '' : (p.done > 0 ? `已完成 ${p.done}/${p.total}` : `未开始 · 共 ${p.total} 项`),
    doneText: done ? '✓ 已完成' : '',
    done,
    status: it.overdue && !done ? 'overdue' : done ? 'done' : 'todo',
    primary: done ? '' : tm.action,
    extraBtns: [],
  }
}

async function loadTasks() {
  loading.value = true
  errorMsg.value = ''
  try {
    const data = await api.get('/student/assignments', { status: 'all' })
    tasks.value = (data?.items || []).map(mapTask)
  } catch (e) {
    errorMsg.value = e instanceof ApiError ? e.message : '任务加载失败'
  } finally {
    loading.value = false
  }
}

const tabs = computed(() => [
  { key: 'todo', label: '待完成', count: tasks.value.filter((t) => t.status === 'todo').length },
  { key: 'overdue', label: '已逾期', count: tasks.value.filter((t) => t.status === 'overdue').length },
  { key: 'done', label: '已完成', count: tasks.value.filter((t) => t.status === 'done').length },
  { key: 'all', label: '全部', count: tasks.value.length },
])

const todoCount = computed(() => tasks.value.filter((t) => t.status === 'todo' || t.status === 'overdue').length)

const shownTasks = computed(() => {
  if (activeTab.value === 'all') return tasks.value
  return tasks.value.filter((t) => t.status === activeTab.value)
})

const emptyText = computed(() => {
  if (!tasks.value.length) return '暂无任务，老师还没有下发作业'
  return '这个分类下没有任务'
})

function startTask(t) {
  router.push(`/tasks/${t.id}`)
}
function viewDetail(t, btn) {
  toast.info(`${btn}：${t.tt}`)
}

onMounted(loadTasks)
</script>
