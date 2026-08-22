<template>
  <div id="page-classroom">
    <header class="t-page-head">
      <div class="t-page-title">
        <h1>课堂控制</h1>
        <p>课堂模式会真实同步到班级学生端；视频洞察只展示已采集事件。</p>
      </div>
      <select v-if="classes.length" v-model="selectedClass" class="t-selectish" @change="loadClassroom">
        <option v-for="item in classes" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
    </header>

    <div v-if="store.error || error" class="t-card" style="color: var(--t-red); margin-bottom: 16px;">
      {{ store.error || error }}
    </div>
    <div v-if="loading" class="t-card">正在加载课堂状态…</div>
    <div v-else-if="!classes.length" class="t-card">
      <h2 style="margin-top: 0;">还没有可控制的班级</h2>
      <p class="t-muted">创建班级并建立任课关系后即可使用课堂模式。</p>
    </div>

    <template v-else>
      <div class="t-card" style="margin-bottom: 16px;">
        <div class="t-tabs" role="tablist">
          <button class="t-tab" :class="{ on: activeTab === 'control' }" type="button" @click="activeTab = 'control'">上课控制</button>
          <button class="t-tab" :class="{ on: activeTab === 'video' }" type="button" @click="showVideo">视频学习</button>
          <button class="t-tab" :class="{ on: activeTab === 'review' }" type="button" @click="activeTab = 'review'">课后复盘</button>
        </div>

        <div class="t-tab-pane" :class="{ on: activeTab === 'control' }">
          <div class="t-g2 t-grid">
            <div class="t-control-card">
              <div>
                <h4>独立作答课堂模式</h4>
                <p>开启后，学生端读取同一持久化状态并进入“只提示不代答”的独立作答模式。</p>
              </div>
              <button class="t-toggle" :class="{ on: modeEnabled }" type="button" :disabled="store.loading" :aria-pressed="modeEnabled" @click="setMode(!modeEnabled)">
                <span></span>
              </button>
            </div>
            <div class="t-card soft">
              <div class="t-section-title"><h2>当前状态</h2></div>
              <div class="t-task-list">
                <div class="t-task-item">
                  <div class="t-task-icon" aria-hidden="true">课</div>
                  <div class="t-task-main">
                    <div class="t">{{ modeEnabled ? '课堂模式已开启' : '课堂模式未开启' }}</div>
                    <div class="m">{{ modeEnabled ? `有效期 ${store.mode?.ttl_seconds || 0} 秒` : '学生端保持普通学习模式' }}</div>
                  </div>
                  <span class="t-tag" :class="modeEnabled ? 'green' : ''">{{ modeEnabled ? '生效中' : '已关闭' }}</span>
                </div>
              </div>
              <p v-if="store.mode?.updated_at" class="t-small t-muted">最近更新：{{ formatDateTime(store.mode.updated_at) }}</p>
            </div>
          </div>
        </div>

        <div class="t-tab-pane" :class="{ on: activeTab === 'video' }">
          <div v-if="store.loading">正在汇总视频事件…</div>
          <template v-else-if="store.insights?.segments?.length">
            <div class="t-section-title">
              <h2>视频事件片段</h2>
              <span class="sub">整体参与度 {{ engagementText }}</span>
            </div>
            <div v-for="segment in store.insights.segments" :key="`${segment.time}-${segment.event}`" class="t-hotspot">
              <div class="time">{{ formatDuration(segment.time) }}</div>
              <div><h4>{{ segment.event }}</h4><p>{{ segment.summary || '已采集到该时间点的学习事件' }}</p></div>
            </div>
          </template>
          <p v-else class="t-muted">当前班级尚未采集到视频观看事件，因此没有可展示的热点。</p>
        </div>

        <div class="t-tab-pane" :class="{ on: activeTab === 'review' }">
          <div v-if="store.insights?.actions?.length" class="t-g3 t-grid">
            <div v-for="action in store.insights.actions" :key="action.insight_id" class="t-card soft">
              <div class="t-eyebrow">{{ action.kind }}</div>
              <h3>{{ action.summary }}</h3>
              <p class="t-small t-muted">{{ evidenceText(action.evidence) }}</p>
              <button v-if="action.recommended_actions?.length" class="t-btn sm primary" type="button" @click="goPrep">带入下次备课</button>
            </div>
          </div>
          <p v-else class="t-muted">尚无足够的课堂或视频数据形成课后复盘。</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { classApi } from '@/api'
import { useClassroomStore } from '@/stores/teacher/classroom'
import { useTeacherContextStore } from '@/stores/teacher/context'

interface ClassItem { id: string; name: string }

const router = useRouter()
const store = useClassroomStore()
const context = useTeacherContextStore()
const showToast = inject<(message: string) => void>('showToast', () => {})
const activeTab = ref<'control' | 'video' | 'review'>('control')
const classes = ref<ClassItem[]>([])
const selectedClass = ref('')
const loading = ref(false)
const error = ref('')

const modeEnabled = computed(() => Boolean(store.mode?.enabled))
const engagementText = computed(() => store.insights?.aggregate_engagement == null ? '暂无' : `${Math.round(store.insights.aggregate_engagement * 100)}%`)

async function loadClassroom() {
  const cls = classes.value.find((item) => item.id === selectedClass.value)
  if (!cls) return
  context.setClass(cls.id, cls.name)
  await store.fetchState(cls.id)
}

async function setMode(enabled: boolean) {
  if (!selectedClass.value) return
  try {
    await store.setMode(selectedClass.value, enabled)
    showToast(enabled ? '课堂模式已开启并同步学生端' : '课堂模式已关闭并同步学生端')
  } catch (cause: any) {
    showToast(cause?.message || '课堂模式更新失败')
  }
}

async function showVideo() {
  activeTab.value = 'video'
  if (selectedClass.value) await store.fetchVideoInsights(selectedClass.value)
}

function goPrep() {
  router.push('/teacher/prep')
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN')
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

function evidenceText(value: unknown) {
  if (typeof value === 'string') return value
  try { return value ? JSON.stringify(value) : '暂无更多证据' } catch { return '暂无更多证据' }
}

onMounted(async () => {
  loading.value = true
  try {
    const data = await classApi.mine()
    classes.value = data?.items || []
    selectedClass.value = classes.value.some((item) => item.id === context.classId)
      ? context.classId || ''
      : classes.value[0]?.id || ''
    if (selectedClass.value) await loadClassroom()
  } catch (cause: any) {
    error.value = cause?.message || '课堂数据加载失败'
  } finally {
    loading.value = false
  }
})
</script>
