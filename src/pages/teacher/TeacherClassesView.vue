<template>
  <div id="page-classes">
    <header class="t-page-head">
      <div class="t-page-title">
        <h1>班级管理</h1>
        <p>成员和教学洞察均来自当前班级的真实数据。</p>
      </div>
      <select v-if="classes.length" v-model="selectedClassId" class="t-input" style="min-width: 220px;" @change="loadClassData">
        <option v-for="item in classes" :key="item.id" :value="item.id">{{ item.name }}</option>
      </select>
    </header>

    <div v-if="error" class="t-card" style="color: var(--t-red); margin-bottom: 16px;">{{ error }}</div>
    <div v-if="loading" class="t-card">正在加载班级真实数据…</div>
    <div v-else-if="!classes.length" class="t-card">
      <h2 style="margin-top: 0;">还没有任教班级</h2>
      <p class="t-muted">请先创建班级或等待管理员完成任课关系配置。</p>
    </div>

    <template v-else>
      <div class="t-metric-strip" style="margin-bottom: 16px;">
        <div class="t-metric"><div class="v">{{ currentClass?.name || '—' }}</div><div class="k">当前班级</div></div>
        <div class="t-metric"><div class="v">{{ students.length }}</div><div class="k">已确认学生</div></div>
        <div class="t-metric"><div class="v">{{ pendingMembers.length }}</div><div class="k">待确认成员</div></div>
        <div class="t-metric"><div class="v" style="color: var(--t-amber);">{{ insights.length }}</div><div class="k">可行动洞察</div></div>
      </div>

      <div class="t-g2 t-grid" style="margin-bottom: 16px;">
        <section class="t-card">
          <div class="t-section-title">
            <div><h2>班级成员</h2><div class="sub">共 {{ members.length }} 人</div></div>
          </div>
          <div v-if="members.length" class="t-task-list">
            <div v-for="member in members" :key="member.userId" class="t-task-item">
              <div class="t-task-icon" aria-hidden="true">{{ member.memberRole === 'teacher' ? '师' : '生' }}</div>
              <div class="t-task-main">
                <div class="t">{{ member.nicknameInClass || member.nickname || '未命名成员' }}</div>
                <div class="m">{{ member.memberRole === 'teacher' ? '教师' : '学生' }} · {{ member.confirmed ? '已确认' : '待确认' }}</div>
              </div>
              <span class="t-tag" :class="member.confirmed ? 'green' : 'amber'">{{ member.confirmed ? '在班' : '待确认' }}</span>
            </div>
          </div>
          <p v-else class="t-muted">当前班级暂无成员数据。</p>
        </section>

        <section class="t-card">
          <div class="t-section-title">
            <div><h2>需要关注</h2><div class="sub">基于已确认作答聚合</div></div>
          </div>
          <div v-if="insights.length">
            <div v-for="insight in insights" :key="insight.insight_id" class="t-attention">
              <div class="aicon" aria-hidden="true">!</div>
              <div class="body">
                <b>{{ insight.summary }}</b>
                <p>{{ evidenceText(insight.evidence) }}</p>
                <p v-if="insight.recommended_actions?.length" class="t-small t-muted">建议：{{ insight.recommended_actions.join('；') }}</p>
              </div>
            </div>
          </div>
          <p v-else class="t-muted">当前数据不足，尚未形成可行动洞察。</p>
        </section>
      </div>

      <div class="t-card">
        <div class="t-section-title">
          <div><h2>基于本班继续教学</h2><div class="sub">班级上下文会带入后续操作</div></div>
        </div>
        <div class="t-row" style="flex-wrap: wrap;">
          <button class="t-btn primary" type="button" @click="go('/teacher/prep')">为本班备课并制作 PPT</button>
          <button class="t-btn" type="button" @click="go('/teacher/assign')">为本班出题并发布</button>
          <button class="t-btn" type="button" @click="go('/teacher/grading')">批改本班作答</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { classApi } from '@/api'
import { classesApi } from '@/api/teacher/classes'
import { useTeacherContextStore } from '@/stores/teacher/context'
import type { ActionableInsight } from '@/types/teacher'

interface ClassItem { id: string; name: string; myRole?: string; confirmed?: boolean }
interface ClassMember {
  userId: string
  nickname?: string
  nicknameInClass?: string
  memberRole: string
  confirmed: boolean
}

const router = useRouter()
const context = useTeacherContextStore()
const classes = ref<ClassItem[]>([])
const members = ref<ClassMember[]>([])
const insights = ref<ActionableInsight[]>([])
const selectedClassId = ref('')
const loading = ref(false)
const error = ref('')

const currentClass = computed(() => classes.value.find((item) => item.id === selectedClassId.value))
const students = computed(() => members.value.filter((item) => item.memberRole === 'student' && item.confirmed))
const pendingMembers = computed(() => members.value.filter((item) => !item.confirmed))

async function loadClassData() {
  const cls = currentClass.value
  if (!cls) return
  context.setClass(cls.id, cls.name)
  loading.value = true
  error.value = ''
  try {
    const [memberData, insightData] = await Promise.all([
      classApi.members(cls.id),
      classesApi.insights(cls.id, true),
    ])
    members.value = memberData?.items || []
    insights.value = insightData
  } catch (cause: any) {
    error.value = cause?.message || '班级数据加载失败'
    members.value = []
    insights.value = []
  } finally {
    loading.value = false
  }
}

function evidenceText(value: unknown) {
  if (typeof value === 'string') return value
  if (!value) return '暂无更多证据'
  try { return JSON.stringify(value) } catch { return '证据格式无法展示' }
}

function go(path: string) {
  const cls = currentClass.value
  if (cls) context.setClass(cls.id, cls.name)
  router.push(path)
}

onMounted(async () => {
  loading.value = true
  try {
    const data = await classApi.mine()
    classes.value = data?.items || []
    selectedClassId.value = classes.value.some((item) => item.id === context.classId)
      ? context.classId || ''
      : classes.value[0]?.id || ''
    if (selectedClassId.value) await loadClassData()
  } catch (cause: any) {
    error.value = cause?.message || '班级列表加载失败'
  } finally {
    loading.value = false
  }
})
</script>
