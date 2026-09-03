<template>
  <div id="tv2-today" class="tv2-today">
    <!-- 头部问候 -->
    <header class="tv2-today__hero tv2-fade-up">
      <div>
        <h1 class="tv2-today__title">{{ data?.teacher.greeting }}，{{ data?.teacher.name }}老师</h1>
        <p class="tv2-today__sub">{{ data?.date_label }} · 今天 {{ data?.schedule.length }} 节课 · {{ pendingTodos }} 件待办待处理</p>
      </div>
      <div class="tv2-today__hero-actions">
        <button class="tv2-btn tv2-btn--primary" type="button" @click="$router.push('/teacher-v2/prep')">开始备课</button>
        <button class="tv2-btn tv2-btn--ghost-ai" type="button" @click="askButler">问 AI 管家</button>
      </div>
    </header>

    <div v-if="error" class="tv2-error" role="alert">{{ error }} <button class="tv2-btn tv2-btn--sm" type="button" @click="fetchData">重试</button></div>

    <!-- 骨架屏 -->
    <div v-if="loading" class="tv2-today__grid">
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="tv2-skeleton-block" style="height: 180px" />
        <div class="tv2-skeleton-block" style="height: 320px" />
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="tv2-skeleton-block" style="height: 220px" />
        <div class="tv2-skeleton-block" style="height: 160px" />
      </div>
    </div>

    <div v-else-if="data" class="tv2-today__grid">
      <!-- 左主栏 -->
      <div class="tv2-today__main">
        <!-- 课表横条 -->
        <section class="tv2-card">
          <div class="tv2-card__head">
            <div class="tv2-card__title">今日课表</div>
            <div class="tv2-card__sub">共 {{ data.schedule.length }} 节 · 点击课次直达备课</div>
          </div>
          <div class="tv2-card__body tv2-today__slots">
            <div v-for="s in data.schedule" :key="s.slot_no" class="tv2-slot" :class="{ 'is-next': s === nextLesson }" @click="goLesson(s)">
              <div class="tv2-slot__time">
                <span class="tv2-slot__no">第 {{ s.slot_no }} 节</span>
                <span class="tv2-slot__range">{{ s.time_range }}</span>
              </div>
              <div class="tv2-slot__body">
                <div class="tv2-slot__topic">{{ s.topic }}</div>
                <div class="tv2-slot__class">{{ s.class_name }} · {{ lessonTypeLabel(s.lesson_type) }}</div>
              </div>
              <div class="tv2-slot__prep">
                <div class="tv2-slot__prep-num" :class="prepClass(s.prep_completion)">{{ s.prep_completion }}%</div>
                <div class="tv2-progress" style="width: 74px">
                  <div class="tv2-progress__bar" :class="prepClass(s.prep_completion)" :style="{ width: s.prep_completion + '%' }" />
                </div>
                <div v-if="s.missing_items.length" class="tv2-slot__missing">缺 {{ s.missing_items.join('、') }}</div>
                <div v-else class="tv2-slot__missing is-ok">已就绪</div>
              </div>
              <span v-if="s === nextLesson" class="tv2-tag tv2-tag--warn tv2-pulse-dot">下一节</span>
            </div>
          </div>
        </section>

        <!-- 时间轴待办 -->
        <section class="tv2-card">
          <div class="tv2-card__head">
            <div class="tv2-card__title">今日待办</div>
            <div class="tv2-card__sub">按截止时间排序 · 每条带处理理由</div>
          </div>
          <div class="tv2-card__body">
            <div class="tv2-timeline">
              <div v-for="t in data.todos" :key="t.id" class="tv2-tl-item" :class="'is-' + t.priority">
                <div class="tv2-tl-item__rail"><span class="tv2-tl-item__dot" /></div>
                <div class="tv2-tl-item__body">
                  <div class="tv2-tl-item__head">
                    <span class="tv2-tl-item__title">{{ t.title }}</span>
                    <span v-if="t.count" class="tv2-tag tv2-tag--err">{{ t.count }} 份待复核</span>
                    <span class="tv2-tl-item__due">截止 {{ t.due_at }}</span>
                  </div>
                  <p class="tv2-tl-item__reason">{{ t.reason }}</p>
                  <button class="tv2-btn tv2-btn--sm tv2-btn--primary" type="button" @click="$router.push(t.route)">{{ t.route_label }} →</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- 右副栏 -->
      <div class="tv2-today__side">
        <!-- 班级速览 -->
        <section class="tv2-card" v-for="c in data.classes" :key="c.class_id">
          <div class="tv2-card__head">
            <div class="tv2-card__title">{{ c.class_name }}</div>
            <div class="tv2-card__sub">{{ c.student_count }} 人</div>
          </div>
          <div class="tv2-card__body">
            <div class="tv2-brief__row">
              <div class="tv2-brief__metric">
                <div class="tv2-brief__num">{{ c.avg_score }}</div>
                <div class="tv2-brief__label">近期均分</div>
              </div>
              <div class="tv2-brief__metric">
                <div class="tv2-brief__num">{{ Math.round(c.submission_rate) }}%</div>
                <div class="tv2-brief__label">提交率</div>
              </div>
              <div class="tv2-brief__metric">
                <div class="tv2-brief__sparkline">
                  <span v-for="(v, i) in c.trend" :key="i" :style="{ height: ((v - 66) * 3.2) + 'px' }" />
                </div>
                <div class="tv2-brief__label">6 次趋势</div>
              </div>
            </div>
            <div class="tv2-brief__hot" @click="$router.push('/teacher-v2/insights')">
              <span class="tv2-tag tv2-tag--err">薄弱 Top1</span>
              <span class="tv2-brief__hot-kp">{{ c.hot_kp.name }}</span>
              <span class="tv2-brief__hot-rate">错误率 {{ Math.round(c.hot_kp.error_rate * 100) }}%</span>
            </div>
          </div>
        </section>

        <!-- 快捷发起 -->
        <section class="tv2-card">
          <div class="tv2-card__head"><div class="tv2-card__title">快捷发起</div></div>
          <div class="tv2-card__body tv2-quick">
            <button class="tv2-quick__item" type="button" @click="$router.push('/teacher-v2/prep')">
              <span class="tv2-quick__icon" style="background: var(--tv2-primary-soft); color: var(--tv2-primary)">备</span>
              <span>新教案</span>
            </button>
            <button class="tv2-quick__item" type="button" @click="$router.push('/teacher-v2/quiz')">
              <span class="tv2-quick__icon" style="background: var(--tv2-teal-soft); color: var(--tv2-teal)">卷</span>
              <span>智能组卷</span>
            </button>
            <button class="tv2-quick__item" type="button" @click="$router.push('/teacher-v2/assign')">
              <span class="tv2-quick__icon" style="background: var(--tv2-amber-soft); color: var(--tv2-amber)">作</span>
              <span>布置作业</span>
            </button>
            <button class="tv2-quick__item" type="button" @click="$router.push('/teacher-v2/classroom')">
              <span class="tv2-quick__icon" style="background: var(--tv2-ai-soft); color: var(--tv2-ai)">课</span>
              <span>开一堂课</span>
            </button>
          </div>
        </section>

        <!-- 明日预告 -->
        <section class="tv2-card" v-if="data.tomorrow_preview">
          <div class="tv2-card__head"><div class="tv2-card__title">明日首课</div></div>
          <div class="tv2-card__body">
            <div class="tv2-tomorrow">
              <div class="tv2-tomorrow__time">{{ data.tomorrow_preview.time_range }}</div>
              <div class="tv2-tomorrow__topic">{{ data.tomorrow_preview.topic }}</div>
              <div class="tv2-tomorrow__class">{{ data.tomorrow_preview.class_name }}</div>
              <button class="tv2-btn tv2-btn--sm" type="button" @click="$router.push('/teacher-v2/prep')">今晚提前备好 →</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { v2Api } from '@/api/teacherV2'
import type { V2ScheduleSlot, V2TodayData } from '@/types/teacherV2'

const router = useRouter()
const data = ref<V2TodayData | null>(null)
const loading = ref(true)
const error = ref('')

const fetchData = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await v2Api.today()
    data.value = res.data
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

const nextLesson = computed(() => data.value?.schedule.find((s) => s.prep_completion < 100) || data.value?.schedule[1] || null)
const pendingTodos = computed(() => data.value?.todos.filter((t) => t.priority !== 'low').length || 0)

const lessonTypeLabel = (t: V2ScheduleSlot['lesson_type']) => ({ new: '新授课', review: '复习课', exercise: '习题课', talk: '讲评课' }[t])
const prepClass = (p: number) => (p >= 100 ? 'is-ok' : p >= 60 ? 'is-mid' : 'is-low')
const goLesson = (s: V2ScheduleSlot) => router.push(s.prep_completion >= 100 ? '/teacher-v2/classroom' : '/teacher-v2/prep')

const butler = inject<{ open: () => void }>('tv2Butler')
const askButler = () => butler?.open()

onMounted(fetchData)
</script>

<style scoped>
.tv2-today__hero { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 18px; }
.tv2-today__title { font-size: 22px; font-weight: 800; margin: 0 0 4px; letter-spacing: 0.2px; }
.tv2-today__sub { font-size: 13px; color: var(--tv2-ink3); margin: 0; }
.tv2-today__hero-actions { display: flex; gap: 9px; }
.tv2-today__grid { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; align-items: start; }
.tv2-today__main, .tv2-today__side { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

.tv2-today__slots { display: flex; flex-direction: column; gap: 9px; }
.tv2-slot {
  display: flex; align-items: center; gap: 16px; padding: 13px 16px;
  border: 1px solid var(--tv2-line); border-radius: var(--tv2-radius); cursor: pointer;
  transition: all 0.15s ease; position: relative;
}
.tv2-slot:hover { border-color: var(--tv2-primary-border); background: var(--tv2-primary-soft); }
.tv2-slot.is-next { border-color: var(--tv2-primary); box-shadow: 0 0 0 3px var(--tv2-primary-soft); }
.tv2-slot__time { display: flex; flex-direction: column; gap: 2px; width: 96px; flex-shrink: 0; }
.tv2-slot__no { font-size: 11px; color: var(--tv2-ink3); }
.tv2-slot__range { font-size: 13.5px; font-weight: 700; font-family: var(--tv2-font-num); }
.tv2-slot__body { flex: 1; min-width: 0; }
.tv2-slot__topic { font-size: 14px; font-weight: 600; }
.tv2-slot__class { font-size: 12px; color: var(--tv2-ink3); margin-top: 3px; }
.tv2-slot__prep { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; width: 110px; flex-shrink: 0; }
.tv2-slot__prep-num { font-size: 16px; font-weight: 800; font-family: var(--tv2-font-num); }
.tv2-slot__prep-num.is-ok { color: var(--tv2-teal); }
.tv2-slot__prep-num.is-mid { color: var(--tv2-amber); }
.tv2-slot__prep-num.is-low { color: var(--tv2-rose); }
.tv2-progress__bar.is-ok { background: var(--tv2-teal); }
.tv2-progress__bar.is-mid { background: var(--tv2-amber); }
.tv2-progress__bar.is-low { background: var(--tv2-rose); }
.tv2-slot__missing { font-size: 11px; color: var(--tv2-rose); }
.tv2-slot__missing.is-ok { color: var(--tv2-teal); }

.tv2-timeline { display: flex; flex-direction: column; }
.tv2-tl-item { display: flex; gap: 13px; position: relative; padding-bottom: 18px; }
.tv2-tl-item:last-child { padding-bottom: 0; }
.tv2-tl-item__rail { display: flex; flex-direction: column; align-items: center; width: 12px; flex-shrink: 0; }
.tv2-tl-item__dot { width: 11px; height: 11px; border-radius: 50%; border: 2.5px solid var(--tv2-line); background: var(--tv2-card); margin-top: 4px; }
.tv2-tl-item.is-high .tv2-tl-item__dot { border-color: var(--tv2-rose); }
.tv2-tl-item.is-mid .tv2-tl-item__dot { border-color: var(--tv2-amber); }
.tv2-tl-item.is-low .tv2-tl-item__dot { border-color: var(--tv2-line); }
.tv2-tl-item:not(:last-child) .tv2-tl-item__rail::after { content: ''; flex: 1; width: 1.5px; background: var(--tv2-line); margin-top: 4px; }
.tv2-tl-item__body { flex: 1; min-width: 0; }
.tv2-tl-item__head { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.tv2-tl-item__title { font-size: 13.5px; font-weight: 600; }
.tv2-tl-item__due { font-size: 11.5px; color: var(--tv2-ink3); font-family: var(--tv2-font-num); }
.tv2-tl-item__reason { font-size: 12.5px; color: var(--tv2-ink2); line-height: 1.6; margin: 5px 0 8px; }

.tv2-brief__row { display: flex; gap: 12px; }
.tv2-brief__metric { flex: 1; text-align: center; }
.tv2-brief__num { font-size: 21px; font-weight: 800; font-family: var(--tv2-font-num); color: var(--tv2-ink); }
.tv2-brief__label { font-size: 11px; color: var(--tv2-ink3); margin-top: 2px; }
.tv2-brief__sparkline { display: flex; align-items: flex-end; gap: 3px; height: 40px; justify-content: center; }
.tv2-brief__sparkline span { width: 7px; border-radius: 2px 2px 0 0; background: linear-gradient(180deg, #2f6fd8, #7fa8e8); }
.tv2-brief__hot {
  display: flex; align-items: center; gap: 8px; margin-top: 13px; padding: 9px 11px;
  background: var(--tv2-rose-soft); border: 1px solid var(--tv2-rose-border); border-radius: 9px; cursor: pointer;
}
.tv2-brief__hot:hover { filter: brightness(0.98); }
.tv2-brief__hot-kp { font-size: 12.5px; font-weight: 600; color: var(--tv2-ink); flex: 1; }
.tv2-brief__hot-rate { font-size: 11.5px; color: var(--tv2-rose); font-weight: 700; font-family: var(--tv2-font-num); }

.tv2-quick { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.tv2-quick__item {
  display: flex; align-items: center; gap: 10px; border: 1px solid var(--tv2-line); border-radius: 10px;
  padding: 11px 13px; background: var(--tv2-card); cursor: pointer; font-size: 13px; font-weight: 600;
  transition: all 0.15s;
}
.tv2-quick__item:hover { border-color: var(--tv2-primary); color: var(--tv2-primary); transform: translateY(-1px); }
.tv2-quick__icon { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; font-size: 14px; font-weight: 700; }

.tv2-tomorrow__time { font-size: 12px; color: var(--tv2-ink3); font-family: var(--tv2-font-num); }
.tv2-tomorrow__topic { font-size: 14.5px; font-weight: 700; margin: 5px 0 3px; }
.tv2-tomorrow__class { font-size: 12.5px; color: var(--tv2-ink2); margin-bottom: 11px; }
</style>
