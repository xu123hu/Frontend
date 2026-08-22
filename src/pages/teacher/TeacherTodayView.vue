<template>
  <div id="page-today">
    <div class="t-hello">
      <h1>{{ greeting }}，{{ teacherName }}老师</h1>
      <p v-if="store.loading">正在汇总真实教学数据…</p>
      <p v-else>当前有 {{ gradingCount }} 份待批作答、{{ deadlines.length }} 项截止事项。</p>
    </div>

    <div v-if="store.error" class="t-card" style="color: var(--t-red); margin-bottom: 16px;">{{ store.error }}</div>

    <div class="t-today-layout">
      <div class="t-col-left" style="display: flex; flex-direction: column; gap: 16px; min-width: 0;">
        <div v-if="nextLesson" class="t-card hero t-next-lesson">
          <div class="t-lesson-top">
            <div>
              <div class="t-lesson-time">下一节课 · {{ formatTime(nextLesson.starts_at) }}</div>
              <div class="t-lesson-name">{{ nextLesson.topic }}</div>
              <div class="t-lesson-meta">{{ nextLesson.class_name || '当前班级' }}</div>
            </div>
            <span class="t-tag amber">待准备</span>
          </div>
          <div class="t-lesson-actions">
            <button class="t-btn primary lg" type="button" @click="goPrep(nextLesson.class_id, nextLesson.class_name)">继续备课</button>
            <button class="t-btn lg" type="button" @click="goAssign(nextLesson.class_id, nextLesson.class_name)">布置试卷</button>
          </div>
        </div>
        <div v-else class="t-card">
          <h2 style="margin-top: 0;">今天暂无已登记课程</h2>
          <p class="t-muted">你仍可以进入备课中心创建教案和课件。</p>
          <button class="t-btn primary" type="button" @click="goPrep()">开始备课</button>
        </div>

        <div class="t-card">
          <div class="t-section-title">
            <h3>需要处理</h3>
            <span class="sub">来自当前数据库</span>
          </div>
          <div class="t-task-list">
            <div v-if="gradingCount" class="t-task-item">
              <div class="t-task-icon" aria-hidden="true">✎</div>
              <div class="t-task-main">
                <div class="t">待确认作答</div>
                <div class="m">预批改建议不会自动计入成绩，需要教师逐份确认</div>
              </div>
              <span class="t-task-count">{{ gradingCount }}</span>
              <button class="t-btn sm primary" type="button" @click="router.push('/teacher/grading')">去批改</button>
            </div>
            <div v-for="deadline in deadlines" :key="deadline.id" class="t-task-item">
              <div class="t-task-icon" aria-hidden="true">⏱</div>
              <div class="t-task-main">
                <div class="t">{{ deadline.title }}</div>
                <div class="m">{{ deadline.kind }} · {{ formatDateTime(deadline.due_at) }}</div>
              </div>
            </div>
            <p v-if="!gradingCount && !deadlines.length" class="t-muted">当前没有待处理事项。</p>
          </div>
        </div>
      </div>

      <div class="t-col-right" style="display: flex; flex-direction: column; gap: 16px; min-width: 0;">
        <div class="t-card hero t-butler-brief">
          <div class="t-row" style="gap: 12px;">
            <div class="t-butler-orb" aria-hidden="true">✦</div>
            <div>
              <h3>教学行动建议</h3>
              <p>建议由班级数据确定性聚合产生；数据不足时不会生成虚构结论。</p>
            </div>
          </div>
          <div v-if="insights.length" class="t-brief-list">
            <div v-for="(insight, index) in insights" :key="insight.insight_id" class="t-brief-item">
              <b class="t-spark">{{ index + 1 }}</b>
              <span><b>{{ insight.summary }}</b><br>{{ insight.evidence }}</span>
            </div>
          </div>
          <p v-else style="margin-bottom: 0;">暂无足够数据形成教学洞察。</p>
        </div>

        <div class="t-card">
          <div class="t-section-title"><h3>快捷工作入口</h3></div>
          <div class="t-grade-buttons">
            <button class="t-btn primary" type="button" @click="router.push('/teacher/prep')">备课与 PPT</button>
            <button class="t-btn" type="button" @click="router.push('/teacher/assign')">出题并发布</button>
            <button class="t-btn" type="button" @click="router.push('/teacher/resources')">教学资源</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTeacherTodayStore } from '@/stores/teacher/today'
import { useTeacherContextStore } from '@/stores/teacher/context'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const store = useTeacherTodayStore()
const context = useTeacherContextStore()
const auth = useAuthStore()

const hour = new Date().getHours()
const greeting = computed(() => hour < 11 ? '早上好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好')
const teacherName = computed(() => auth.nickname || '教师')
const nextLesson = computed(() => store.data?.next_lesson || null)
const gradingCount = computed(() => store.data?.grading_queue?.count || 0)
const deadlines = computed(() => store.data?.deadlines || [])
const insights = computed(() => store.data?.actionable_insights || [])

function formatTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function selectClass(classId?: string, className?: string) {
  if (classId) context.setClass(classId, className || null)
}

function goPrep(classId?: string, className?: string) {
  selectClass(classId, className)
  router.push('/teacher/prep')
}

function goAssign(classId?: string, className?: string) {
  selectClass(classId, className)
  router.push('/teacher/assign')
}

onMounted(() => store.fetch())
</script>
