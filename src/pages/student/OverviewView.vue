<template>
  <div class="view">
    <div class="greeting">
      <div class="hello">{{ greeting }}，{{ nickname }} <span class="em">✋</span></div>
      <div class="sub">
        <template v-if="streakDays !== null">
          <template v-if="streakDays > 0">连续学了 <b>{{ streakDays }} 天</b>。</template>
          <template v-else>今天是你开始的第 <b>1</b> 天。</template>
        </template>
        今天是 <b>薄弱学科攻坚</b> 黄金时段，AI 陪你走一遍"对话学习闭环"，把薄弱点一步步补上。
      </div>
    </div>

    <!-- 对话学习闭环流程条（独家） -->
    <div class="loop-flow">
      <h3>
        🔄 对话学习闭环 · 今天你能走完这 7 步
        <template v-if="loopData">（已完成 {{ loopData.done_count }}/{{ loopData.total }}）</template>
      </h3>
      <div v-if="loopLoading" class="state-tip">闭环进度加载中…</div>
      <div v-else-if="loopError" class="state-tip">闭环进度暂时加载失败，稍后再来看看</div>
      <template v-else>
        <div class="steps">
          <div v-for="s in loopSteps" :key="s.key" class="step" :class="{ done: s.done, pending: !s.done }">
            <div class="ic" :style="{ background: s.bg }">{{ s.ic }}</div>
            <div class="nm">{{ s.nm }}<template v-if="s.done"> ✓</template></div>
            <div class="sub">{{ s.sub }}<template v-if="s.count"> · {{ s.count }} 次</template></div>
          </div>
        </div>
        <div v-if="loopData && loopData.done_count === 0" class="loop-guide">
          今天还没开始，从「遇到不会的题」走起 👉 去对话页拍照/粘贴提问
        </div>
      </template>
    </div>

    <!-- 课堂任务速览（真实数据联动 /student/assignments） -->
    <div class="card" style="padding:14px 18px;margin-bottom:14px;display:flex;align-items:center;gap:14px;cursor:pointer;" @click="router.push('/tasks')">
      <span style="font-size:24px;">📋</span>
      <div style="flex:1;">
        <div style="font-weight:800;font-size:14px;">课堂任务</div>
        <div style="font-size:12px;color:var(--ink3);margin-top:2px;">
          <template v-if="taskStat.loading">加载中…</template>
          <template v-else-if="taskStat.error">暂时无法加载，稍后再试</template>
          <template v-else>
            待完成 <b style="color:var(--err-deep);">{{ taskStat.todo + taskStat.overdue }}</b> 项 · 已逾期 <b style="color:var(--err-deep);">{{ taskStat.overdue }}</b> 项 · 已完成 {{ taskStat.done }} 项
          </template>
        </div>
      </div>
      <span style="font-size:12px;font-weight:700;color:var(--brand);">去完成 ›</span>
    </div>

    <div class="hero-row">
      <div class="hero-main">
        <div class="today-tag">🌙 晚自习 · 薄弱攻坚</div>
        <h1>今天 3 件事，做完就<span class="em">离目标更近</span></h1>
        <div class="quote">{{ heroQuote }}</div>
      </div>
      <div class="hero-side">
        <div class="lbl">本周数学 · 综合分</div>
        <div v-if="scoreLoading" class="state-tip">综合分加载中…</div>
        <div v-else-if="scoreError" class="state-tip">综合分加载失败，稍后再试</div>
        <template v-else-if="score">
          <div class="today-score">
            <div class="num">{{ hasScore ? score.score : '--' }}</div>
            <div class="delta" v-if="hasScore && score.delta_week">
              {{ score.delta_week > 0 ? '↑' : '↓' }} {{ Math.abs(score.delta_week) }} 分
            </div>
            <div class="delta" v-else>--</div>
            <div class="out">/ 100</div>
          </div>
          <div class="progress-bar"><div class="fill" :style="{ width: (hasScore ? score.score : 0) + '%' }"></div></div>
          <div style="font-size:11.5px;color:var(--ink3);display:flex;justify-content:space-between;">
            <span>上周 {{ hasScore ? lastWeekScore : '--' }}</span><span>目标 {{ score.target || '--' }}</span>
          </div>
          <div v-if="!hasScore" class="score-empty">还没有综合分，去完成首次测评或一组练习即可生成</div>
          <div v-else-if="trendBars.length" class="trend-mini">
            <div
              v-for="(b, i) in trendBars"
              :key="i"
              class="bar"
              :class="{ null: b === null }"
              :style="{ height: (b === null ? 8 : Math.max(8, b)) + '%' }"
            ></div>
          </div>
        </template>
      </div>
    </div>

    <div class="section-head">
      <h2>今天 3 件事 <span class="tag">自动记录 · 可换组</span></h2>
      <span v-if="todayGroups.length > 1" class="more" @click="rotateActions">↻ 换一组</span>
    </div>
    <div v-if="t3Loading" class="state-tip">今日任务加载中…</div>
    <div v-else-if="t3Error" class="state-tip">今日任务加载失败，请稍后重试</div>
    <div v-else-if="!todayActions.length" class="state-tip">今日任务暂未生成，先去对话页问一道题吧</div>
    <div v-else class="action-grid">
      <div v-for="(a, i) in todayActions" :key="a.key + i" class="action-card" @click="goAction(a)">
        <div class="check" :class="{ done: a.done }">{{ a.done ? '✓' : '' }}</div>
        <div class="body">
          <div class="title">{{ a.title }}</div>
          <div class="why">{{ a.why }}</div>
          <div class="meta">
            <span class="dur">⏱ {{ a.est_minutes }} 分钟</span>
            <span class="feedback">→ {{ a.benefit }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="section-head">
      <h2>其他功能 <span class="tag">快速跳转</span></h2>
    </div>
    <div v-if="feLoading" class="state-tip">功能入口加载中…</div>
    <div v-else-if="feError" class="state-tip">功能入口加载失败，稍后再试</div>
    <div v-else-if="!featureEntries.length" class="state-tip">暂无功能入口</div>
    <div v-else class="feature-row">
      <div v-for="e in featureEntries" :key="e.key" class="feature-tile" @click="go(e.route)">
        <div class="icon" :style="{ background: iconOf(e.key).bg }">{{ iconOf(e.key).ic }}</div>
        <div v-if="e.badge" class="live">{{ e.badge }}</div>
        <div class="name">{{ e.title }}</div>
        <div class="stat">{{ e.stat_text }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api/client'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const nickname = computed(() => auth.nickname)

/* ---------- 问候区 ---------- */
const greeting = computed(() => {
  const d = new Date()
  const h = d.getHours()
  const period = h < 6 ? '凌晨' : h < 9 ? '早上' : h < 12 ? '上午' : h < 14 ? '中午' : h < 18 ? '下午' : h < 23 ? '晚上' : '深夜'
  return `${period} ${String(h).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})
const streakDays = ref(null) // null=加载失败/中，不展示连击文案
async function loadStreak() {
  try {
    const d = await api.get('/student/streak')
    streakDays.value = d?.days ?? d?.current_streak ?? 0
  } catch {
    streakDays.value = null
  }
}

/* ---------- 对话学习闭环 7 步 ---------- */
// 图标/文案为纯展示装饰；done/count 来自 GET /student/growth/loop-progress
const LOOP_META = [
  { key: 'encounter', ic: '📷', bg: '#fef3c7', nm: '遇到不会的题', sub: '拍照/粘贴/口述' },
  { key: 'socratic', ic: '💬', bg: '#fce7f3', nm: '引导式解题', sub: '苏格拉底提问' },
  { key: 'answer', ic: '✍️', bg: '#fee2e2', nm: '对话内作答', sub: '直接答 ABCD' },
  { key: 'judge', ic: '⚡', bg: '#ede9fe', nm: '即时判分讲解', sub: 'AI 初始+错因定位' },
  { key: 'variant', ic: '🧩', bg: '#dbeafe', nm: '变式巩固', sub: '以你的弱出 3 道' },
  { key: 'record', ic: '📌', bg: '#fef3c7', nm: '错题自动收录', sub: '进错题本+排期复习' },
  { key: 'action', ic: '🚀', bg: '#dcfce7', nm: '学情行动化', sub: '告诉你下一步练什么' },
]
const loopData = ref(null)
const loopLoading = ref(true)
const loopError = ref(false)
const loopSteps = computed(() => {
  const byKey = {}
  ;(loopData.value?.steps || []).forEach((s) => { byKey[s.key] = s })
  return LOOP_META.map((m) => ({ ...m, done: !!byKey[m.key]?.done, count: byKey[m.key]?.count || 0 }))
})
async function loadLoop() {
  loopLoading.value = true
  loopError.value = false
  try {
    loopData.value = await api.get('/student/growth/loop-progress')
  } catch {
    loopError.value = true
  } finally {
    loopLoading.value = false
  }
}

/* ---------- 综合分 hero 卡 + 7 日趋势 ---------- */
const score = ref(null)
const scoreLoading = ref(true)
const scoreError = ref(false)
const hasScore = computed(() => !!score.value && score.value.score > 0)
const lastWeekScore = computed(() => Math.max(0, score.value.score - (score.value.delta_week || 0)))
// daily[{date, score|null}]：全 null 或空数组 → 隐藏柱状区（契约空态）
const trendBars = computed(() => {
  const daily = score.value?.daily || []
  if (!daily.some((d) => d && d.score !== null && d.score !== undefined)) return []
  return daily.map((d) => (d && d.score != null ? d.score : null))
})
async function loadScore() {
  scoreLoading.value = true
  scoreError.value = false
  try {
    score.value = await api.get('/student/growth/score-trend')
  } catch {
    scoreError.value = true
  } finally {
    scoreLoading.value = false
  }
}

/* ---------- 今天 3 件事（两组可切换） ---------- */
const todayGroups = ref([])
const groupIdx = ref(0)
const t3Loading = ref(true)
const t3Error = ref(false)
const todayActions = computed(() => todayGroups.value[groupIdx.value] || [])
const heroQuote = computed(() => {
  const g = todayGroups.value[0] || []
  const v = g.find((a) => a.key === 'variant_top1') || g[1] || g[0]
  if (!v) return '坚持完成今天的 3 件事，每一分进步都算数。'
  return `本周主攻「${v.title}」：${v.why}，完成后${v.benefit}。`
})
function rotateActions() {
  if (todayGroups.value.length > 1) groupIdx.value = (groupIdx.value + 1) % todayGroups.value.length
}
function goAction(a) {
  if (a.route) router.push(a.route)
}
async function loadToday3() {
  t3Loading.value = true
  t3Error.value = false
  try {
    const d = await api.get('/student/growth/today-3')
    todayGroups.value = (d?.groups || []).filter((g) => Array.isArray(g) && g.length)
    groupIdx.value = 0
  } catch {
    t3Error.value = true
  } finally {
    t3Loading.value = false
  }
}

/* ---------- 其他功能入口 ---------- */
// 图标/渐变为纯展示装饰；标题/计数/角标/跳转来自 GET /student/growth/feature-entries
const ENTRY_ICONS = {
  chat: { ic: '💬', bg: 'linear-gradient(135deg,#fef3c7,#fde68a)' },
  dialog: { ic: '💬', bg: 'linear-gradient(135deg,#fef3c7,#fde68a)' },
  practice: { ic: '🎯', bg: 'linear-gradient(135deg,var(--purple-soft),var(--purple-border))' },
  errors: { ic: '📕', bg: 'linear-gradient(135deg,#ffe4e6,#fecaca)' },
  exam: { ic: '📝', bg: 'linear-gradient(135deg,#dbeafe,#bfdbfe)' },
  report: { ic: '📊', bg: 'linear-gradient(135deg,#dcfce7,#bbf7d0)' },
  graph: { ic: '🗺', bg: 'linear-gradient(135deg,#ede9fe,#ddd6fe)' },
  tasks: { ic: '📋', bg: 'linear-gradient(135deg,#ffedd5,#fed7aa)' },
}
const iconOf = (key) => ENTRY_ICONS[key] || { ic: '✨', bg: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)' }
const featureEntries = ref([])
const feLoading = ref(true)
const feError = ref(false)
function go(route) {
  if (route) router.push(route)
}
async function loadEntries() {
  feLoading.value = true
  feError.value = false
  try {
    const d = await api.get('/student/growth/feature-entries')
    featureEntries.value = d?.entries || []
  } catch {
    feError.value = true
  } finally {
    feLoading.value = false
  }
}


/* ---------- 课堂任务速览（作业/课堂任务联动） ---------- */
const taskStat = ref({ loading: true, error: false, todo: 0, overdue: 0, done: 0 })
async function loadTaskStat() {
  try {
    const d = await api.get('/student/assignments', { status: 'all' })
    const st = { loading: false, error: false, todo: 0, overdue: 0, done: 0 }
    ;(d?.items || []).forEach((it) => {
      const p = it.progress || { done: 0, total: 0 }
      const done = p.total > 0 && p.done >= p.total
      if (it.overdue && !done) st.overdue++
      else if (done) st.done++
      else st.todo++
    })
    taskStat.value = st
  } catch {
    taskStat.value = { loading: false, error: true, todo: 0, overdue: 0, done: 0 }
  }
}
onMounted(() => {
  loadStreak()
  loadLoop()
  loadScore()
  loadToday3()
  loadEntries()
  loadTaskStat()
})
</script>

<style scoped>
.state-tip {
  padding: 16px;
  text-align: center;
  color: var(--ink3);
  font-size: 13px;
}
.loop-guide {
  margin-top: 10px;
  font-size: 12.5px;
  color: var(--ink3);
}
.step.pending {
  opacity: 0.55;
}
.step.done .ic {
  box-shadow: 0 0 0 2px #34d399;
}
.action-card {
  cursor: pointer;
}
.score-empty {
  margin-top: 8px;
  font-size: 11.5px;
  color: var(--ink3);
}
.bar.null {
  opacity: 0.25;
}
</style>
