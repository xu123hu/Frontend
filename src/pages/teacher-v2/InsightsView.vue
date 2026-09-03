<template>
  <div id="tv2-insights" class="tv2-insights">
    <!-- 顶栏：班级切换 + 指标卡 -->
    <div class="tv2-card tv2-insights__topbar">
      <div class="tv2-card__body">
        <div class="tv2-insights__topbar-row">
          <div>
            <b class="tv2-insights__title">学情洞察</b>
            <span class="tv2-card__sub">{{ data?.class_name }} · {{ data?.student_count }} 名学生 · 数据截至最近一次测练</span>
          </div>
          <div class="tv2-insights__classes">
            <button
              v-for="c in classes" :key="c.class_id"
              class="tv2-insights__classbtn" :class="{ 'is-on': classId === c.class_id }"
              type="button" @click="switchClass(c.class_id)"
            >{{ c.class_name }}</button>
          </div>
        </div>
        <div class="tv2-insights__metrics">
          <div class="tv2-insights__metric">
            <span>班级平均分</span>
            <b>{{ data?.metrics.avg_score ?? '—' }}<i>分</i></b>
          </div>
          <div class="tv2-insights__metric">
            <span>及格率</span>
            <b>{{ data ? Math.round(data.metrics.pass_rate * 100) : '—' }}<i>%</i></b>
          </div>
          <div class="tv2-insights__metric">
            <span>作业提交率</span>
            <b>{{ data ? Math.round(data.metrics.submission_rate * 100) : '—' }}<i>%</i></b>
          </div>
          <div class="tv2-insights__metric is-up">
            <span>较上次进步</span>
            <b>{{ data?.metrics.progress_count ?? 0 }}<i>人</i></b>
          </div>
        </div>
      </div>
    </div>

    <div v-if="error" class="tv2-error" role="alert">{{ error }} <button class="tv2-btn tv2-btn--sm" type="button" @click="init">重试</button></div>
    <div v-if="loading" class="tv2-insights__loading">正在汇总学情数据…</div>

    <div v-if="data" class="tv2-insights__body">
      <!-- 主栏 -->
      <main class="tv2-insights__main">
        <!-- 知识点掌握热力 -->
        <section class="tv2-card">
          <div class="tv2-card__head">
            <div class="tv2-card__title">知识点掌握热力</div>
            <div class="tv2-card__sub">按错误率排序 · 点击查看知识点诊断</div>
          </div>
          <div class="tv2-card__body tv2-insights__heat">
            <button
              v-for="h in sortedHeat" :key="h.kp_code"
              class="tv2-insights__heatrow" :class="{ 'is-on': detail?.kp_code === h.kp_code }"
              type="button" :data-testid="`tv2-heat-${h.kp_code}`" @click="loadDetail(h.kp_code)"
            >
              <span class="tv2-insights__heat-name">{{ h.kp_name }}</span>
              <div class="tv2-insights__heat-bar">
                <div class="tv2-insights__heat-fill" :style="heatStyle(h.error_rate, h.error_rate / maxErr)" />
              </div>
              <span class="tv2-insights__heat-num">{{ Math.round(h.error_rate * 100) }}%</span>
              <span class="tv2-insights__heat-sample">n={{ h.sample }}</span>
            </button>
          </div>
        </section>

        <!-- 知识点诊断详情 -->
        <section v-if="detail" class="tv2-card tv2-insights__detail">
          <div class="tv2-card__head">
            <div class="tv2-card__title">{{ detail.kp_name }} · 诊断</div>
            <div class="tv2-card__sub">错误率 {{ Math.round(detail.error_rate * 100) }}% · {{ detail.wrong_students_sample.length }} 人出错样本</div>
            <button class="tv2-btn tv2-btn--sm" style="margin-left: auto" type="button" @click="detail = null">收起</button>
          </div>
          <div class="tv2-card__body tv2-insights__detail-body">
            <div class="tv2-insights__detail-left">
              <div class="tv2-insights__sub-label">错误率走势</div>
              <div ref="kpTrendEl" class="tv2-insights__chart tv2-insights__chart--sm" />
              <div class="tv2-insights__sub-label">错因分解</div>
              <div class="tv2-insights__breakdown">
                <div v-for="b in detail.error_breakdown" :key="b.tag" class="tv2-insights__bd-row">
                  <span class="tv2-insights__bd-tag">{{ b.tag }}</span>
                  <div class="tv2-insights__bd-bar"><div :style="{ width: (b.count / maxBreakdown * 100) + '%' }" /></div>
                  <span class="tv2-insights__bd-num">{{ b.count }} 人次</span>
                </div>
              </div>
              <div class="tv2-insights__sub-label">出错学生（样本）</div>
              <div class="tv2-insights__stu-cloud">
                <span v-for="n in detail.wrong_students_sample" :key="n" class="tv2-insights__stu-chip">{{ n }}</span>
              </div>
              <RouterLink :to="{ path: '/teacher-v2/quiz', query: { kp: detail.kp_code } }" class="tv2-btn tv2-btn--ai" style="margin-top: 12px" data-testid="tv2-detail-compose">
                ✦ 针对本知识点组卷
              </RouterLink>
            </div>
            <div class="tv2-insights__detail-right">
              <div class="tv2-insights__sub-label">典型错题</div>
              <QuestionCard :question="detail.typical_question" compact :show-answer="true" :show-analysis="true" />
            </div>
          </div>
        </section>

        <!-- 成绩趋势 -->
        <section class="tv2-card">
          <div class="tv2-card__head">
            <div class="tv2-card__title">班级均分趋势</div>
            <div class="tv2-card__sub">近 {{ data.trend.length }} 次测练</div>
          </div>
          <div class="tv2-card__body">
            <div ref="trendEl" class="tv2-insights__chart" />
          </div>
        </section>
      </main>

      <!-- 副栏 -->
      <aside class="tv2-insights__side">
        <!-- 错因聚类 -->
        <section class="tv2-card">
          <div class="tv2-card__head">
            <div class="tv2-card__title"><span class="tv2-ai-badge tv2-ai-badge--sm">✦</span>错因聚类</div>
            <div class="tv2-card__sub">含教师批改标签</div>
          </div>
          <div class="tv2-card__body">
            <div v-for="c in data.error_clusters" :key="c.tag" class="tv2-insights__cluster">
              <div class="tv2-insights__cluster-head">
                <b>{{ c.tag }}</b>
                <span class="tv2-insights__cluster-num">{{ c.count }} 人次</span>
              </div>
              <div class="tv2-insights__cluster-meta">
                <span class="tv2-tag tv2-tag--err">{{ Math.round(c.ratio * 100) }}% 占比</span>
                <span class="tv2-insights__cluster-kp">{{ c.kp_name }}</span>
              </div>
              <RouterLink :to="{ path: '/teacher-v2/quiz', query: { kp: c.kp_code } }" class="tv2-insights__cluster-action" data-testid="tv2-cluster-compose">
                生成变式训练卷 →
              </RouterLink>
            </div>
            <p class="tv2-insights__cluster-note">批改作业时打的错因标签会自动并入此处聚类。</p>
          </div>
        </section>

        <!-- 分层名单 -->
        <section class="tv2-card">
          <div class="tv2-card__head">
            <div class="tv2-card__title">分层名单</div>
            <div class="tv2-card__sub">最近测练定层</div>
          </div>
          <div class="tv2-card__body">
            <div v-for="t in data.tier_lists" :key="t.tier" class="tv2-insights__tier" :class="'t-' + t.tier">
              <div class="tv2-insights__tier-head">
                <b>{{ t.label }}</b>
                <span>{{ t.students.length }} 人</span>
              </div>
              <div class="tv2-insights__stu-cloud">
                <span v-for="n in t.students" :key="n" class="tv2-insights__stu-chip">{{ n }}</span>
              </div>
              <RouterLink to="/teacher-v2/assign" class="tv2-insights__tier-action">
                {{ t.tier === 'consolid' ? '布置巩固作业' : '布置挑战作业' }} →
              </RouterLink>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import QuestionCard from '@/components/teacherV2/QuestionCard.vue'
import { v2Api } from '@/api/teacherV2'
import type { V2InsightOverview, V2KpDetail } from '@/types/teacherV2'

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

const classes = [
  { class_id: 'cls-g2-3', class_name: '高二 3 班' },
  { class_id: 'cls-g2-5', class_name: '高二 5 班' },
]

const classId = ref('cls-g2-3')
const data = ref<V2InsightOverview | null>(null)
const detail = ref<V2KpDetail | null>(null)
const loading = ref(false)
const error = ref('')

const trendEl = ref<HTMLElement>()
const kpTrendEl = ref<HTMLElement>()
let trendChart: echarts.ECharts | null = null
let kpTrendChart: echarts.ECharts | null = null

const sortedHeat = computed(() => data.value ? [...data.value.heatmap].sort((a, b) => b.error_rate - a.error_rate) : [])
const maxErr = computed(() => sortedHeat.value[0]?.error_rate || 1)
const maxBreakdown = computed(() => detail.value ? Math.max(1, ...detail.value.error_breakdown.map((b) => b.count)) : 1)

function heatStyle(rate: number, ratio: number) {
  const hue = 150 - rate * 150
  return { width: `${Math.max(6, ratio * 100)}%`, background: `hsl(${hue}, 74%, 52%)` }
}

async function init() {
  loading.value = true
  error.value = ''
  detail.value = null
  try {
    const res = await v2Api.insights(classId.value)
    data.value = res.data
    await nextTick()
    renderTrend()
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function switchClass(id: string) {
  if (classId.value === id) return
  classId.value = id
  init()
}

async function loadDetail(kpCode: string) {
  if (detail.value?.kp_code === kpCode) { detail.value = null; return }
  try {
    const res = await v2Api.kpDetail(kpCode, classId.value)
    detail.value = res.data
    await nextTick()
    renderKpTrend()
  } catch (e: any) {
    error.value = e?.message || '知识点诊断加载失败'
  }
}

function renderTrend() {
  if (!trendEl.value || !data.value) return
  trendChart = trendChart || echarts.init(trendEl.value)
  const t = data.value.trend
  trendChart.setOption({
    grid: { left: 42, right: 18, top: 26, bottom: 28 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: t.map((x) => x.date), axisLine: { lineStyle: { color: '#c3cad6' } }, axisLabel: { color: '#8b95a7', fontSize: 11 } },
    yAxis: { type: 'value', min: 60, max: 90, splitLine: { lineStyle: { color: '#eef1f6' } }, axisLabel: { color: '#8b95a7', fontSize: 11 } },
    series: [{
      type: 'line', data: t.map((x) => x.avg), smooth: true, symbolSize: 7,
      lineStyle: { color: '#1d5bbf', width: 2.5 }, itemStyle: { color: '#1d5bbf' },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: 'rgba(29, 91, 191, 0.18)' }, { offset: 1, color: 'rgba(29, 91, 191, 0)' },
      ]) },
    }],
  })
}

function renderKpTrend() {
  if (!kpTrendEl.value || !detail.value) return
  kpTrendChart = kpTrendChart || echarts.init(kpTrendEl.value)
  const t = detail.value.trend
  kpTrendChart.setOption({
    grid: { left: 38, right: 12, top: 18, bottom: 24 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: t.map((x) => x.date), axisLabel: { color: '#8b95a7', fontSize: 10 } },
    yAxis: { type: 'value', max: 1, axisLabel: { color: '#8b95a7', fontSize: 10, formatter: (v: number) => `${Math.round(v * 100)}%` }, splitLine: { lineStyle: { color: '#eef1f6' } } },
    series: [{
      type: 'line', data: t.map((x) => x.error_rate), smooth: true, symbolSize: 6,
      lineStyle: { color: '#dc2646', width: 2 }, itemStyle: { color: '#dc2646' },
      areaStyle: { color: 'rgba(220, 38, 70, 0.1)' },
    }],
  })
}

function onResize() { trendChart?.resize(); kpTrendChart?.resize() }
onMounted(() => { init(); window.addEventListener('resize', onResize) })
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  trendChart?.dispose()
  kpTrendChart?.dispose()
})
</script>

<style scoped>
.tv2-insights { display: flex; flex-direction: column; gap: 14px; }
.tv2-insights__topbar-row { display: flex; align-items: center; gap: 16px; }
.tv2-insights__title { font-size: 16px; }
.tv2-insights__topbar-row > div:first-child > span { display: block; margin-top: 3px; }
.tv2-insights__classes { margin-left: auto; display: flex; gap: 7px; }
.tv2-insights__classbtn {
  border: 1px solid var(--tv2-line); background: var(--tv2-card); border-radius: 999px;
  padding: 5px 14px; font-size: 12.5px; color: var(--tv2-ink2); cursor: pointer; transition: all .12s;
}
.tv2-insights__classbtn:hover { border-color: var(--tv2-primary-border); color: var(--tv2-primary); }
.tv2-insights__classbtn.is-on { background: var(--tv2-primary); border-color: var(--tv2-primary); color: #fff; font-weight: 600; }

.tv2-insights__metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 16px; }
.tv2-insights__metric {
  border: 1px solid var(--tv2-line); border-radius: var(--tv2-radius); padding: 12px 16px;
  background: linear-gradient(180deg, #fbfcfe, #f6f8fc);
}
.tv2-insights__metric span { font-size: 11.5px; color: var(--tv2-ink3); display: block; }
.tv2-insights__metric b { font-size: 22px; font-family: var(--tv2-font-num); color: var(--tv2-ink); display: block; margin-top: 5px; }
.tv2-insights__metric b i { font-style: normal; font-size: 11px; color: var(--tv2-ink3); margin-left: 3px; }
.tv2-insights__metric.is-up b { color: var(--tv2-teal); }

.tv2-insights__loading { padding: 48px; text-align: center; color: var(--tv2-ink3); font-size: 13px; }
.tv2-insights__body { display: grid; grid-template-columns: minmax(0, 1fr) 316px; gap: 14px; align-items: start; }
.tv2-insights__main { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.tv2-insights__side { display: flex; flex-direction: column; gap: 14px; position: sticky; top: 12px; }

/* ===== 热力 ===== */
.tv2-insights__heat { display: flex; flex-direction: column; gap: 7px; }
.tv2-insights__heatrow {
  display: flex; align-items: center; gap: 12px; width: 100%; text-align: left;
  border: 1px solid transparent; border-radius: 9px; background: none; padding: 6px 10px; cursor: pointer;
  transition: all .12s;
}
.tv2-insights__heatrow:hover { background: var(--tv2-bg2); }
.tv2-insights__heatrow.is-on { border-color: var(--tv2-primary); background: var(--tv2-primary-soft); }
.tv2-insights__heat-name { width: 168px; font-size: 12.5px; color: var(--tv2-ink); flex-shrink: 0; }
.tv2-insights__heat-bar { flex: 1; height: 18px; background: var(--tv2-bg2); border-radius: 5px; overflow: hidden; }
.tv2-insights__heat-fill { height: 100%; border-radius: 5px; transition: width 0.5s; }
.tv2-insights__heat-num {
  width: 46px; text-align: right; font-size: 12.5px; font-weight: 700; font-family: var(--tv2-font-num); color: var(--tv2-ink); flex-shrink: 0;
}
.tv2-insights__heat-sample { width: 52px; font-size: 10.5px; color: var(--tv2-ink3); text-align: right; flex-shrink: 0; }

/* ===== 详情 ===== */
.tv2-insights__detail-body { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 22px; }
.tv2-insights__sub-label { font-size: 11.5px; color: var(--tv2-ink3); font-weight: 600; margin: 14px 0 8px; }
.tv2-insights__sub-label:first-child { margin-top: 0; }
.tv2-insights__chart { width: 100%; height: 220px; }
.tv2-insights__chart--sm { height: 150px; }
.tv2-insights__breakdown { display: flex; flex-direction: column; gap: 7px; }
.tv2-insights__bd-row { display: flex; align-items: center; gap: 9px; }
.tv2-insights__bd-tag { width: 148px; font-size: 11.5px; color: var(--tv2-ink2); flex-shrink: 0; }
.tv2-insights__bd-bar { flex: 1; height: 14px; background: var(--tv2-bg2); border-radius: 4px; overflow: hidden; }
.tv2-insights__bd-bar div { height: 100%; background: linear-gradient(90deg, var(--tv2-rose), #f43f5e); border-radius: 4px; }
.tv2-insights__bd-num { width: 52px; font-size: 11px; color: var(--tv2-ink3); text-align: right; font-family: var(--tv2-font-num); flex-shrink: 0; }
.tv2-insights__stu-cloud { display: flex; flex-wrap: wrap; gap: 5px; }
.tv2-insights__stu-chip {
  font-size: 11.5px; border-radius: 999px; padding: 3px 10px;
  background: var(--tv2-slate-soft); color: var(--tv2-slate);
}

/* ===== 副栏 ===== */
.tv2-insights__cluster { padding: 11px 0; border-bottom: 1px dashed var(--tv2-line2); }
.tv2-insights__cluster:first-child { padding-top: 2px; }
.tv2-insights__cluster-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.tv2-insights__cluster-head b { font-size: 13px; }
.tv2-insights__cluster-num { font-size: 12px; color: var(--tv2-rose); font-family: var(--tv2-font-num); font-weight: 700; }
.tv2-insights__cluster-meta { display: flex; align-items: center; gap: 8px; margin-top: 7px; }
.tv2-insights__cluster-kp { font-size: 11.5px; color: var(--tv2-ink3); }
.tv2-insights__cluster-action { display: inline-block; margin-top: 8px; font-size: 12px; color: var(--tv2-ai); font-weight: 600; text-decoration: none; }
.tv2-insights__cluster-note { margin: 10px 0 0; font-size: 11px; color: var(--tv2-ink3); line-height: 1.6; }

.tv2-insights__tier { padding: 12px 0; border-bottom: 1px dashed var(--tv2-line2); }
.tv2-insights__tier:first-child { padding-top: 2px; }
.tv2-insights__tier:last-child { border-bottom: none; }
.tv2-insights__tier-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 9px; }
.tv2-insights__tier-head b { font-size: 13px; }
.tv2-insights__tier-head span { font-size: 11.5px; color: var(--tv2-ink3); }
.tv2-insights__tier .tv2-insights__stu-chip { background: var(--tv2-primary-soft); color: var(--tv2-primary); }
.tv2-insights__tier.t-challenge .tv2-insights__stu-chip { background: var(--tv2-ai-soft); color: var(--tv2-ai); }
.tv2-insights__tier-action { display: inline-block; margin-top: 10px; font-size: 12px; color: var(--tv2-primary); font-weight: 600; text-decoration: none; }

@media (max-width: 1180px) {
  .tv2-insights__body { grid-template-columns: 1fr; }
  .tv2-insights__side { position: static; }
  .tv2-insights__detail-body { grid-template-columns: 1fr; }
  .tv2-insights__metrics { grid-template-columns: repeat(2, 1fr); }
}
</style>
