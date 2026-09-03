<template>
  <div data-testid="tv3-insights">
    <div class="tv3-hero" style="margin-bottom: 18px">
      <div style="display: flex; gap: 24px; align-items: center">
        <div style="flex: 1">
          <div class="tv3-hero__title">学情洞察 <span style="font-size: 14px; font-weight: 500; color: #9db4d8">· {{ data?.class_name || '高二(3)班' }}</span></div>
          <div class="tv3-hero__sub">知识掌握热力 · 错因趋势 · 需关注名单 · 联动备课与组卷</div>
        </div>
        <select v-model="classId" class="tv3-input" style="width: 160px; background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.25); color: #fff">
          <option v-for="c in classes" :key="c.class_id" :value="c.class_id" style="color: var(--tv3-ink)">{{ c.name }}</option>
        </select>
      </div>
    </div>

    <div v-if="data" style="display: flex; flex-direction: column; gap: 14px">
      <!-- 顶部指标 -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px">
        <div class="tv3-card" style="padding: 16px">
          <div class="tv3-kpi__label">班级均分</div>
          <div class="tv3-kpi__num" style="color: var(--tv3-primary)">{{ data.avg }}</div>
          <svg class="tv3-kpi__spark" viewBox="0 0 100 26" preserveAspectRatio="none">
            <polyline :points="spark(data.trend)" fill="none" stroke="var(--tv3-primary)" stroke-width="2" />
          </svg>
        </div>
        <div class="tv3-card" style="padding: 16px">
          <div class="tv3-kpi__label">最薄弱知识点</div>
          <div class="tv3-kpi__num" style="color: var(--tv3-rose); font-size: 18px">{{ weakest?.name || '—' }}</div>
          <div style="font-size: 11.5px; color: var(--tv3-ink3); margin-top: 4px">掌握率 {{ weakest ? Math.round(weakest.mastery * 100) : 0 }}% <span :style="{ color: (weakest?.delta || 0) < 0 ? 'var(--tv3-rose)' : 'var(--tv3-teal)' }">{{ (weakest?.delta || 0) > 0 ? '↑' : '↓' }}{{ Math.abs((weakest?.delta || 0) * 100).toFixed(0) }}%</span></div>
        </div>
        <div class="tv3-card" style="padding: 16px">
          <div class="tv3-kpi__label">高频错因</div>
          <div class="tv3-kpi__num" style="color: var(--tv3-amber); font-size: 18px">{{ topError?.tag || '—' }}</div>
          <div style="font-size: 11.5px; color: var(--tv3-ink3); margin-top: 4px">{{ topError?.count || 0 }} 人次 · 环比 {{ (topError?.trend || 0) > 0 ? '↑' : '↓' }}{{ Math.abs(topError?.trend || 0) }}</div>
        </div>
        <div class="tv3-card" style="padding: 16px">
          <div class="tv3-kpi__label">需关注</div>
          <div class="tv3-kpi__num" style="color: var(--tv3-gold-deep)">{{ data.watchlist.length }} 人</div>
          <div style="font-size: 11.5px; color: var(--tv3-ink3); margin-top: 4px">建议本周完成面批</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 14px; align-items: start">
        <!-- 知识点热力 -->
        <div class="tv3-card">
          <div class="tv3-card__head">
            <span class="tv3-card__title">知识掌握热力</span>
            <span class="tv3-card__sub">颜色越红越薄弱 · 点击联动组卷</span>
          </div>
          <div class="tv3-card__body">
            <div class="tv3-heat" data-testid="tv3-kp-heat">
              <div v-for="k in data.kp_heat" :key="k.kp" class="tv3-heat__row" @click="drillKp(k)">
                <span class="tv3-heat__name">{{ k.name }}</span>
                <div class="tv3-heat__barwrap">
                  <div class="tv3-heat__bar" :style="{ width: k.mastery * 100 + '%', background: heatColor(k.mastery) }" />
                </div>
                <span class="tv3-heat__val">{{ Math.round(k.mastery * 100) }}%</span>
                <span class="tv3-heat__delta" :style="{ color: k.delta < 0 ? 'var(--tv3-rose)' : 'var(--tv3-teal)' }">{{ k.delta > 0 ? '↑' : '↓' }}{{ Math.abs(k.delta * 100).toFixed(0) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 错因分布 -->
        <div class="tv3-card">
          <div class="tv3-card__head">
            <span class="tv3-card__title">错因分布</span>
            <span class="tv3-card__sub">来自批改端教师确认标签</span>
          </div>
          <div class="tv3-card__body">
            <div class="tv3-errchart" data-testid="tv3-error-tags">
              <div v-for="e in data.error_tags" :key="e.tag" class="tv3-errchart__row">
                <span class="tv3-errchart__tag">{{ e.tag }}</span>
                <div class="tv3-errchart__barwrap"><div class="tv3-errchart__bar" :style="{ width: (e.count / maxErr) * 100 + '%' }" /></div>
                <span class="tv3-errchart__count">{{ e.count }}</span>
                <span class="tv3-heat__delta" :style="{ color: e.trend > 0 ? 'var(--tv3-rose)' : 'var(--tv3-teal)' }">{{ e.trend > 0 ? '↑' : '↓' }}{{ Math.abs(e.trend) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 需关注名单 -->
      <div class="tv3-card">
        <div class="tv3-card__head">
          <span class="tv3-card__title">需关注名单</span>
          <span class="tv3-card__sub">由连续作业表现与错因聚类自动汇总</span>
        </div>
        <div class="tv3-card__body" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 10px">
          <div v-for="w in data.watchlist" :key="w.name" class="tv3-watch">
            <div class="tv3-watch__avatar">{{ w.name[0] }}</div>
            <div style="flex: 1; min-width: 0">
              <div style="font-size: 13.5px; font-weight: 700">{{ w.name }}</div>
              <div style="font-size: 12px; color: var(--tv3-ink2); line-height: 1.6">{{ w.note }}</div>
              <div style="display: flex; gap: 5px; margin-top: 5px; flex-wrap: wrap">
                <span v-for="k in w.weak" :key="k" class="tv3-tag tv3-tag--danger" style="font-size: 10px">{{ k }}</span>
              </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 5px">
              <button class="tv3-btn tv3-btn--sm" @click="$router.push('/teacher-v3/quiz')">出变式题</button>
              <button class="tv3-btn tv3-btn--sm" @click="$router.push('/teacher-v3/prep')">纳入备课</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="tv3-card" style="padding: 60px; text-align: center; color: var(--tv3-ink3)">加载中…（mock 未启动时显示为空）</div>
  </div>
</template>

<script setup lang="ts">
/**
 * InsightsView —— 学情洞察
 * KPI 概览 · 知识点热力（点击 → 组卷中心带筛选）· 错因分布（批改端标签回流）· 需关注名单（联动备课/组卷）
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { v3Api, type V3InsightOverview } from '@/api/teacherV3'
import type { V3ClassInfo } from '@/types/teacherV3'

const router = useRouter()
const classes = ref<V3ClassInfo[]>([])
const classId = ref('c2-03')
const data = ref<V3InsightOverview | null>(null)

const weakest = computed(() => [...(data.value?.kp_heat || [])].sort((a, b) => a.mastery - b.mastery)[0])
const topError = computed(() => [...(data.value?.error_tags || [])].sort((a, b) => b.count - a.count)[0])
const maxErr = computed(() => Math.max(...(data.value?.error_tags || []).map((e) => e.count), 1))

function heatColor(m: number) {
  if (m >= 0.8) return 'linear-gradient(90deg, var(--tv3-teal), #3eb5a8)'
  if (m >= 0.65) return 'linear-gradient(90deg, #7fb86e, #a4c97e)'
  if (m >= 0.5) return 'linear-gradient(90deg, var(--tv3-amber), #d99a3d)'
  return 'linear-gradient(90deg, var(--tv3-rose), #e8627c)'
}
function spark(trend: number[]) {
  const min = Math.min(...trend)
  const span = Math.max(...trend) - min || 1
  return trend.map((v, i) => `${(i / (trend.length - 1)) * 100},${24 - ((v - min) / span) * 22}`).join(' ')
}
function drillKp(k: { name: string }) {
  void router.push({ path: '/teacher-v3/quiz', query: { kp: k.name } })
}

async function load() {
  try {
    const r = await v3Api.catalog.insights(classId.value)
    data.value = r.data
  } catch { data.value = null }
}
onMounted(async () => {
  try {
    const r = await v3Api.catalog.classes()
    classes.value = r.data.items
  } catch { /* mock */ }
  void load()
})
</script>

<style scoped>
.tv3-kpi__label { font-size: 11.5px; color: var(--tv3-ink3); }
.tv3-kpi__num { font-family: var(--tv3-font-num); font-size: 26px; font-weight: 800; margin-top: 2px; }
.tv3-kpi__spark { width: 100%; height: 26px; margin-top: 4px; }
.tv3-heat { display: flex; flex-direction: column; gap: 8px; }
.tv3-heat__row { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 4px 6px; border-radius: 8px; }
.tv3-heat__row:hover { background: var(--tv3-bg2); }
.tv3-heat__name { width: 130px; font-size: 12.5px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tv3-heat__barwrap { flex: 1; height: 18px; border-radius: 6px; background: var(--tv3-bg2); overflow: hidden; }
.tv3-heat__bar { height: 100%; border-radius: 6px; transition: width 0.4s ease; }
.tv3-heat__val { font-family: var(--tv3-font-num); font-size: 12.5px; font-weight: 700; width: 40px; text-align: right; }
.tv3-heat__delta { font-family: var(--tv3-font-num); font-size: 11px; width: 36px; text-align: right; }
.tv3-errchart { display: flex; flex-direction: column; gap: 9px; }
.tv3-errchart__row { display: flex; align-items: center; gap: 8px; }
.tv3-errchart__tag { width: 72px; font-size: 12px; color: var(--tv3-ink2); flex-shrink: 0; }
.tv3-errchart__barwrap { flex: 1; height: 12px; border-radius: 999px; background: var(--tv3-bg2); overflow: hidden; }
.tv3-errchart__bar { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--tv3-rose), #e8627c); transition: width 0.4s ease; }
.tv3-errchart__count { font-family: var(--tv3-font-num); font-size: 12px; font-weight: 700; width: 26px; text-align: right; }
.tv3-watch { display: flex; gap: 12px; padding: 12px; border: 1px solid var(--tv3-line); border-radius: 12px; background: #fff; }
.tv3-watch__avatar {
  width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, var(--tv3-navy), var(--tv3-gold)); color: #fff;
  display: grid; place-items: center; font-size: 15px; font-weight: 700;
}
</style>
