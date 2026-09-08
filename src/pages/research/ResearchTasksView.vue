<template>
  <div class="re-scroll">
    <div style="max-width: 1120px; margin: 0 auto; padding: 24px 40px 60px">
      <div class="re-flow-head">
        <div>
          <h1>任务中心</h1>
          <p>解析、编译、导出在后台继续，切换页面不中断；进度来自后端持久状态。</p>
        </div>
        <button class="re-btn" @click="load()">⟳ 刷新</button>
      </div>

      <div class="re-source-tabs" style="margin-bottom:16px">
        <button v-for="t in statusTabs" :key="t.value" class="re-source-tab" :class="{ active: status === t.value }" @click="status = t.value" @change="load">{{ t.label }}</button>
      </div>

      <div v-if="loading" class="re-loading">加载中…</div>
      <div v-else-if="error" class="re-error">{{ error }}<div class="re-error-actions"><button class="re-btn sm" @click="load()">重试</button></div></div>

      <div v-else-if="!items.length" class="re-empty">
        <div class="re-empty-icon">🗂️</div>
        <p>暂无{{ statusLabel }}任务。上传 PDF 会创建解析任务，写作页「编译 PDF」会创建编译任务。</p>
      </div>

      <div v-else class="re-tasks">
        <div v-for="t in items" :key="t.id" class="re-task-card" data-testid="rs-task-card">
          <div class="re-task-top">
            <strong>{{ taskTypeLabel(t.task_type) }}</strong>
            <span class="re-badge" :class="statusClass(t.status)">{{ statusText(t.status) }}</span>
          </div>
          <p>{{ taskSummary(t) }}</p>
          <div class="re-progress"><i :style="{ width: (t.status === 'completed' ? 100 : t.progress || 0) + '%' }"></i></div>
          <div style="display:flex;gap:10px;font-size:10px;color:#8a99ae;flex-wrap:wrap">
            <span>进度 {{ t.status === 'completed' ? 100 : t.progress || 0 }}%</span>
            <span v-if="t.created_at">创建 {{ relTime(t.created_at) }}</span>
            <span v-if="t.completed_at">完成 {{ relTime(t.completed_at) }}</span>
          </div>
          <div v-if="t.error_message" class="re-error" style="margin-top:8px">{{ t.error_message }}</div>
          <div class="re-actions" style="margin-top:10px">
            <button v-if="['pending','queued','running'].includes(t.status)" class="re-btn sm" @click="cancel(t.id)">取消</button>
            <button v-if="['failed','cancelled'].includes(t.status)" class="re-btn sm" @click="retry(t.id)">重试</button>
            <button class="re-btn sm" @click="toggleLog(t.id)">{{ logOpen.has(t.id) ? '收起日志' : '查看日志' }}</button>
            <button class="re-btn sm danger" @click="remove(t.id)">删除记录</button>
          </div>
          <pre v-if="logOpen.has(t.id) && t.log" class="re-task-log">{{ t.log }}</pre>
        </div>
      </div>

      <div v-if="total > pageSize" class="re-pagination" style="display:flex;justify-content:center;gap:12px;margin-top:18px;align-items:center">
        <button class="re-btn sm" :disabled="page <= 1" @click="page -= 1;;load()">‹</button>
        <span style="font-size:12px;color:#8a99ae">第 {{ page }} 页 · 共 {{ total }} 条</span>
        <button class="re-btn sm" :disabled="page >= Math.ceil(total / pageSize)" @click="page += 1;;load()">›</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { researchTasksApi } from '@/api/researchEnd'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
const items = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const status = ref('')
const loading = ref(false)
const error = ref('')
const logOpen = ref(new Set())
let pollTimer = null

const statusTabs = [
  { value: '', label: '全部' },
  { value: 'running', label: '运行中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
  { value: 'cancelled', label: '已取消' },
]

async function load() {
  loading.value = true; error.value = ''
  try {
    const d = await researchTasksApi.list({ task_type: undefined, status: status.value || undefined, page: page.value, page_size: pageSize.value })
    items.value = d.items || []
    total.value = d.total || 0
  } catch (e) { error.value = e.message } finally { loading.value = false }
}
async function cancel(id) { await researchTasksApi.cancel(id); toast.info('取消请求已发出'); load() }
async function retry(id) { await researchTasksApi.retry(id); toast.success('任务已重新排队'); load() }
async function remove(id) {
  if (!confirm('删除该任务记录？')) return
  await researchTasksApi.remove(id); load()
}
function toggleLog(id) { const s = new Set(logOpen.value); s.has(id) ? s.delete(id) : s.add(id); logOpen.value = s }

const statusLabel = computed(() => ({ running: '运行中', completed: '已完成', failed: '失败', cancelled: '已取消' })[status.value] || '')
function taskTypeLabel(t) { return ({ pdf_parse: 'PDF 解析', compile: 'LaTeX 编译', export: '导出', llm: 'AI 任务' })[t] || t }
function statusText(s) { return ({ pending: '排队', queued: '排队', running: '运行中', completed: '成功', failed: '失败', cancelled: '已取消' })[s] || s }
function statusClass(s) { return s === 'completed' ? 'green' : s === 'failed' ? 'red' : s === 'running' ? 'orange' : 'blue' }
function taskSummary(t) {
  const p = t.payload || {}
  if (t.task_type === 'pdf_parse') return `论文 ${(p.paper_id || '').slice(0, 8)}… 解析入库${t.result ? ` · 分块 ${t.result.chunks ?? 0} / 对象 ${t.result.math_objects ?? 0}` : ''}`
  if (t.task_type === 'compile') {
    if (t.result?.compiled === false) return '编译（本机未配置编译器 RESEARCH_COMPILE_BIN）'
    return `文稿 ${(p.manuscript_id || '').slice(0, 8)}… 编译`
  }
  return JSON.stringify(p || {}).slice(0, 80)
}
function relTime(iso) {
  if (!iso) return ''
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
}

watch(status, () => { page.value = 1; load() })

onMounted(() => { load(); pollTimer = setInterval(load, 3000) })
onBeforeUnmount(() => clearInterval(pollTimer))
</script>

<style scoped>
.re-tasks { display: grid; grid-template-columns: 1fr; }
</style>