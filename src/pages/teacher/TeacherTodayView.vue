<template>
  <section class="tdr-ws" :aria-label="'今日'">
    <header class="tdr-ws-head">
      <h1>今日工作台</h1>
      <p class="tdr-ws-desc">下一节课、待批、截止事项与可直接执行的动作。</p>
    </header>

    <div v-if="store.loading" class="tdr-ws-grid">
      <div v-for="i in 3" :key="i" class="tdr-skeleton" style="height: 120px"></div>
    </div>

    <template v-else>
      <div v-if="store.error" class="tdr-banner err">{{ store.error }}</div>

      <div class="tdr-ws-grid">
        <div class="tdr-card tcard">
          <h3 class="tcard-title">下一节课</h3>
          <p v-if="store.data?.next_lesson" class="tcard-big">{{ store.data.next_lesson.topic }}</p>
          <p v-else class="tcard-empty muted">今天暂无排课</p>
        </div>
        <div class="tdr-card tcard">
          <h3 class="tcard-title">待批</h3>
          <p class="tcard-big">{{ store.data?.grading_queue.count ?? 0 }} 份</p>
          <button v-if="store.data?.grading_queue.count" class="tdr-btn" type="button" @click="router.push('/teacher/grading')">去批改</button>
          <p v-else class="tcard-empty muted">当前没有待批</p>
        </div>
        <div class="tdr-card tcard">
          <h3 class="tcard-title">截止事项</h3>
          <ul v-if="store.data?.deadlines.length" class="tdl">
            <li v-for="d in store.data.deadlines" :key="d.id">{{ d.title }}<span class="muted"> · {{ d.due_at }}</span></li>
          </ul>
          <p v-else class="tcard-empty muted">暂无截止事项</p>
        </div>
      </div>

      <div class="tdr-ws-block mt">
        <div class="tdr-ws-h-row">
          <h3 class="tdr-ws-h">可行动洞察</h3>
          <span v-if="store.data?.degraded" class="tdr-badge degraded">数据源降级</span>
        </div>
        <div v-if="!store.data?.actionable_insights.length" class="tdr-card">
          <p class="tcard-empty muted">暂无新的可行动洞察（空数据不伪造成“全部完成”）。</p>
        </div>
        <div v-else class="tdr-ws-actions">
          <ActionableInsightCard
            v-for="ins in store.data.actionable_insights" :key="ins.insight_id"
            :insight="ins" @view="onView" @apply="onApply"
          />
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTeacherTodayStore } from '@/stores/teacher/today'
import ActionableInsightCard from '@/components/teacher/ActionableInsightCard.vue'
import type { ActionableInsight } from '@/types/teacher'

const router = useRouter()
const store = useTeacherTodayStore()

onMounted(() => { store.fetch() })

function onApply(_ins: ActionableInsight, action: string) {
  if (action.includes('教案') || action.includes('备课')) router.push('/teacher/prep')
  else if (action.includes('巩固题') || action.includes('出题')) router.push('/teacher/assign')
  else router.push('/teacher/grading')
}
function onView(_ins: ActionableInsight) { router.push('/teacher/classes') }
</script>