<template>
  <div data-testid="tv3-today">
    <div class="tv3-hero" style="margin-bottom: 18px">
      <div style="display: flex; gap: 24px; align-items: flex-start">
        <div style="flex: 1">
          <div class="tv3-hero__title">{{ greeting }}，{{ today?.teacher.name || '李老师' }} <span class="tv3-hero__gold">∫</span></div>
          <div class="tv3-hero__sub">{{ today?.teacher.grade_group || '高二年级' }} · {{ today?.teacher.subject || '高中数学' }} · 今天 {{ schedule.length }} 节课 · {{ todos.length }} 项待办</div>
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end">
          <router-link to="/teacher-v3/slides" class="tv3-btn tv3-btn--gold" data-testid="tv3-today-photo">📷 拍照出课件</router-link>
          <router-link to="/teacher-v3/prep" class="tv3-btn tv3-btn--ghost-ai">✦ 起草教案</router-link>
          <router-link to="/teacher-v3/assign" class="tv3-btn">批改作业</router-link>
        </div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1.25fr 1fr; gap: 14px">
      <!-- 课表 -->
      <div class="tv3-card">
        <div class="tv3-card__head">
          <span class="tv3-card__title">今日课表</span>
          <span class="tv3-card__sub">缺项一目了然</span>
        </div>
        <div class="tv3-card__body" style="display: flex; flex-direction: column; gap: 10px">
          <div v-for="(s, i) in schedule" :key="i" class="tv3-sch" :data-status="s.status">
            <div class="tv3-sch__time">{{ s.time }}</div>
            <div class="tv3-sch__main">
              <div class="tv3-sch__topic">{{ s.topic }}</div>
              <div class="tv3-sch__class">{{ s.class_name }}</div>
              <div v-if="s.missing?.length" class="tv3-sch__missing" :data-testid="`tv3-missing-${i}`">
                <span v-for="m in s.missing" :key="m" class="tv3-tag tv3-tag--warn">⚠ {{ m }}</span>
                <router-link v-if="s.missing.some((m) => m.includes('课件'))" to="/teacher-v3/slides" class="tv3-btn tv3-btn--sm" style="margin-left: 4px">去补</router-link>
                <router-link v-if="s.missing.some((m) => m.includes('题'))" to="/teacher-v3/quiz" class="tv3-btn tv3-btn--sm" style="margin-left: 4px">去组卷</router-link>
              </div>
            </div>
            <span class="tv3-tag" :class="s.status === 'done' ? 'tv3-tag--ok' : s.status === 'next' ? 'tv3-tag--gold' : ''">
              {{ s.status === 'done' ? '已完成' : s.status === 'next' ? '下一节' : '待上' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 待办 -->
      <div class="tv3-card">
        <div class="tv3-card__head">
          <span class="tv3-card__title">待办</span>
          <span class="tv3-card__sub">{{ todos.length }} 项</span>
        </div>
        <div class="tv3-card__body" style="display: flex; flex-direction: column; gap: 4px">
          <div v-for="t in todos" :key="t.id" class="tv3-todo">
            <span class="tv3-todo__icon" :data-kind="t.kind">{{ kindIcon(t.kind) }}</span>
            <div style="flex: 1">
              <div class="tv3-todo__text">{{ t.text }}</div>
            </div>
            <span class="tv3-todo__time">{{ t.time }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 班级速览 -->
    <div class="tv3-card" style="margin-top: 14px">
      <div class="tv3-card__head">
        <span class="tv3-card__title">班级速览</span>
        <span class="tv3-card__sub">点击进入学情洞察</span>
      </div>
      <div class="tv3-card__body" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 12px">
        <router-link v-for="c in today?.class_brief || []" :key="c.class_id" to="/teacher-v3/insights" class="tv3-brief">
          <div class="tv3-brief__name">{{ c.name }}</div>
          <div class="tv3-brief__avg">
            <span class="tv3-brief__num">{{ c.avg }}</span>
            <span class="tv3-brief__unit">均分</span>
          </div>
          <svg class="tv3-brief__spark" viewBox="0 0 100 32" preserveAspectRatio="none">
            <polyline :points="spark(c.trend)" fill="none" stroke="var(--tv3-gold)" stroke-width="2" />
          </svg>
          <div class="tv3-brief__meta">
            <span class="tv3-tag tv3-tag--primary">提交 {{ Math.round(c.submit_rate * 100) }}%</span>
            <span class="tv3-tag tv3-tag--danger">薄弱：{{ c.weak_kp }}</span>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * TodayView —— 今日工作台
 * 课表（缺项预警 + 一键去补）· 待办 · 班级速览（sparkline）
 */
import { computed, onMounted, ref } from 'vue'
import { v3Api } from '@/api/teacherV3'
import type { V3TodayData } from '@/types/teacherV3'

const today = ref<V3TodayData | null>(null)
const schedule = computed(() => today.value?.schedule ?? [])
const todos = computed(() => today.value?.todos ?? [])
const greeting = computed(() => (new Date().getHours() < 12 ? '上午好' : new Date().getHours() < 18 ? '下午好' : '晚上好'))

onMounted(async () => {
  try {
    const r = await v3Api.catalog.today()
    today.value = r.data
  } catch { /* mock */ }
})

const kindIcon = (k: string) => ({ grade: '✎', prep: '✦', review: '◈', meeting: '👥' } as Record<string, string>)[k] || '•'

function spark(trend: number[]) {
  if (!trend.length) return ''
  const min = Math.min(...trend)
  const max = Math.max(...trend)
  const span = max - min || 1
  return trend.map((v, i) => `${(i / (trend.length - 1)) * 100},${30 - ((v - min) / span) * 28}`).join(' ')
}
</script>

<style scoped>
.tv3-sch { display: flex; align-items: flex-start; gap: 12px; padding: 12px; border-radius: 12px; border: 1px solid var(--tv3-line); }
.tv3-sch[data-status='next'] { border-color: var(--tv3-gold-border); background: linear-gradient(90deg, var(--tv3-gold-soft), transparent 55%); }
.tv3-sch[data-status='done'] { opacity: 0.62; }
.tv3-sch__time { font-family: var(--tv3-font-num); font-size: 14px; font-weight: 700; color: var(--tv3-primary); width: 48px; flex-shrink: 0; padding-top: 2px; }
.tv3-sch__main { flex: 1; min-width: 0; }
.tv3-sch__topic { font-size: 13.5px; font-weight: 600; }
.tv3-sch__class { font-size: 11.5px; color: var(--tv3-ink3); margin-top: 1px; }
.tv3-sch__missing { display: flex; align-items: center; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
.tv3-todo { display: flex; align-items: center; gap: 10px; padding: 8px 6px; border-radius: 10px; }
.tv3-todo:hover { background: var(--tv3-bg2); }
.tv3-todo__icon {
  width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center;
  font-size: 14px; flex-shrink: 0;
}
.tv3-todo__icon[data-kind='grade'] { background: var(--tv3-rose-soft); color: var(--tv3-rose); }
.tv3-todo__icon[data-kind='prep'] { background: var(--tv3-ai-soft); color: var(--tv3-ai); }
.tv3-todo__icon[data-kind='review'] { background: var(--tv3-gold-soft); color: var(--tv3-gold-deep); }
.tv3-todo__icon[data-kind='meeting'] { background: var(--tv3-slate-soft); color: var(--tv3-slate); }
.tv3-todo__text { font-size: 13px; }
.tv3-todo__time { font-family: var(--tv3-font-num); font-size: 11.5px; color: var(--tv3-ink3); }
.tv3-brief {
  display: grid; grid-template-columns: auto 1fr auto; grid-template-rows: auto auto auto; gap: 2px 10px;
  padding: 14px; border: 1px solid var(--tv3-line); border-radius: 14px; text-decoration: none; color: inherit;
  transition: all 0.15s ease; background: #fff;
}
.tv3-brief:hover { border-color: var(--tv3-gold); box-shadow: var(--tv3-shadow-gold); }
.tv3-brief__name { font-size: 14.5px; font-weight: 700; grid-column: 1 / -1; }
.tv3-brief__avg { display: flex; align-items: baseline; gap: 3px; }
.tv3-brief__num { font-family: var(--tv3-font-num); font-size: 24px; font-weight: 800; color: var(--tv3-primary); }
.tv3-brief__unit { font-size: 11px; color: var(--tv3-ink3); }
.tv3-brief__spark { width: 100px; height: 30px; align-self: center; }
.tv3-brief__meta { grid-column: 1 / -1; display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
</style>
