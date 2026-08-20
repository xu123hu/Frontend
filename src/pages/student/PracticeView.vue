<template>
  <div class="view" :class="{ immersive: quizState === 'ready' && showImmersive }">
    <button
      v-if="quizState === 'ready' && showImmersive"
      class="immersive-exit"
      @click="exitImmersive"
      title="退出沉浸模式"
    >← 退出沉浸</button>
    <div class="greeting">
      <div class="hello">今日训练 · <span style="color:var(--brand-deep);">{{ greetingTitle }}</span></div>
      <div class="sub" v-if="groupLoading">正在为你生成今日训练推荐…</div>
      <div class="sub" v-else-if="groupError">训练推荐加载失败：{{ groupError }}</div>
      <div class="sub" v-else>{{ greetingSub }}</div>
      <div v-if="!groupLoading && group" class="sub" style="margin-top:4px;display:flex;gap:10px;align-items:center;">
        <span>⏱ 已用 <b>{{ usedTime }}</b> / {{ modeTotalLabel }}</span>
        <span>·</span>
        <span>📚 当前知识点：<b>{{ group.kp_name || '摸底训练' }}</b></span>
        <span v-if="group.kp_name" style="font-size:11px;color:var(--ink3);">（薄弱 Top1，由后端推荐）</span>
      </div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
      <div class="practice-mode">
        <div
          v-for="m in modes" :key="m"
          class="opt" :class="{ active: mode === m }"
          @click="switchMode(m)"
        >{{ m }}</div>
      </div>
      <div style="display:flex;gap:10px;align-items:center;font-size:12px;color:var(--ink3);flex-wrap:wrap;">
        <span>📚 知识点：</span>
        <select
          v-model="selectedKp"
          @change="selectKp(selectedKp)"
          style="padding:5px 10px;border-radius:6px;border:1px solid var(--line);font:inherit;font-size:12px;background:var(--card);color:var(--ink);max-width:280px;"
          title="默认按后端薄弱 Top1，可手动切换"
        >
          <option value="">🧠 薄弱 Top1（后端推荐）</option>
          <option v-for="w in kpOptions" :key="w.code" :value="w.code">📉 {{ w.name }}（{{ Math.round((w.mastery || 0) * 100) }}%）</option>
        </select>
        <span>🎯 难度:</span>
        <select v-model="difficulty" style="padding:5px 10px;border-radius:6px;border:1px solid var(--line);font:inherit;font-size:12px;background:var(--card);color:var(--ink);">
          <option>自适应 (推荐)</option>
          <option>易 30% / 中 50% / 难 20%</option>
          <option>只做易题 (焦虑友好)</option>
        </select>
      </div>
    </div>

    <!-- 今日主卡 -->
    <div class="daily-quest">
      <template v-if="groupLoading">
        <div class="badge">🎯 今日推荐</div>
        <h2>推荐加载中…</h2>
      </template>
      <template v-else-if="groupError">
        <div class="badge">🎯 今日推荐</div>
        <h2>推荐加载失败</h2>
        <div class="meta-row">
          <div class="item">{{ groupError }}</div>
        </div>
        <button class="start-btn" @click="loadGroup">↻ 重新加载</button>
      </template>
      <template v-else-if="group">
        <div class="badge">🎯 今日推荐 · {{ group.kp_code ? '薄弱 Top1' : '摸底训练' }}</div>
        <h2>{{ group.kp_name || '摸底训练' }} · <b>{{ group.count }} 题变式</b></h2>
        <div class="meta-row">
          <div class="item">📍 <b>{{ group.count }}</b> 题</div>
          <div class="item">⏱ 约 <b>{{ group.est_minutes }}</b> 分钟</div>
          <div class="item">📊 {{ mixText }} 难度配比</div>
          <div class="item" v-if="group.mastery_now !== null && group.mastery_now !== undefined">
            🎓 完成 + <b>{{ masteryGain }}%</b> 掌握度
          </div>
          <div class="item" v-if="group.kp_name">
            📈 <b>{{ group.kp_name }} Top1</b><span v-if="group.mastery_now !== null && group.mastery_now !== undefined"> → 离开红区</span>
          </div>
        </div>
        <button class="start-btn" :disabled="starting" @click="start">{{ starting ? '出题中…' : '▶ 开始训练' }}</button>
      </template>
    </div>

    <!-- 难度配比 + 当前题卡片 -->
    <div class="section-head">
      <h2>{{ quizHeadText }}</h2>
      <span style="font-size:12px;color:var(--ink3);">⏱ 已用 {{ usedTime }} · 平均每题 ~{{ avgMinutes }} 分钟</span>
    </div>
    <div class="practice-row">
      <div class="quiz-card">
        <div v-if="quizState === 'idle'" style="padding:32px 0;text-align:center;color:var(--ink3);font-size:13px;">
          点击上方「开始训练」，AI 将按推荐难度配比为你生成今日题组。
        </div>
        <div v-else-if="quizState === 'loading'" style="padding:32px 0;text-align:center;color:var(--ink3);font-size:13px;">
          正在出题，请稍候…
        </div>
        <div v-else-if="quizState === 'error'" style="padding:32px 0;text-align:center;color:var(--ink3);font-size:13px;">
          出题失败：{{ quizError }}
          <div style="margin-top:10px;">
            <button
              style="padding:7px 16px;background:var(--brand);color:#fff;border:none;border-radius:7px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;"
              @click="start"
            >重试</button>
          </div>
        </div>
        <div v-else-if="quizState === 'empty'" style="padding:32px 0;text-align:center;color:var(--ink3);font-size:13px;">
          本次出题暂无可在线作答的题目（选择题须带选项、填空题须可判分），请稍后再试或切换训练模式。
        </div>
        <template v-else>
          <div class="quiz-head">
            <div class="lbl">
              <span class="num">Q{{ qIndex + 1 }}/{{ questions.length }}</span>
              <span :style="{ color: diffColor(q.difficulty) }">● {{ diffZh(q.difficulty) }}</span>
              <span v-if="group && group.kp_name">{{ group.kp_name }}</span>
            </div>
            <div class="smart-score" v-if="smartScore !== null">
              SmartScore: <span style="font-family:var(--font-num);font-size:14px;">{{ smartScore }}</span> / 100
            </div>
          </div>
          <div class="q-text">
            <LatexText :text="q.text" />
          </div>
          <div v-if="q.image && q.image.length" class="q-fig">
            <img v-for="(src, fi) in q.image" :key="fi" :src="src" alt="题目配图" />
          </div>
          <div v-if="q.interaction_type === 'choice'" class="answer-grid">
            <div
              v-for="(opt, oi) in q.optionsArr" :key="oi"
              class="ans"
              :class="ansClass(oi)"
              @click="pick(oi)"
            >
              <span class="ltr">{{ opt.letter }}</span>
              <span class="opt-text"><LatexText :text="opt.text" /></span>
            </div>
          </div>
          <!-- blank / text：输入作答（阶段 1 契约：前端全部题型可作答） -->
          <div v-else class="text-answer-box">
            <input
              v-if="q.interaction_type === 'blank'"
              v-model="textAnswer"
              :disabled="judged || submitting"
              class="text-answer-input"
              placeholder="输入答案（如：3、x=2）"
              @keyup.enter="submitText"
            />
            <textarea
              v-else
              v-model="textAnswer"
              :disabled="judged || submitting"
              class="text-answer-input"
              rows="3"
              placeholder="输入解答（支持 LaTeX，如 $x^2-1=0$）"
            ></textarea>
            <button
              v-if="!judged"
              class="text-answer-btn"
              :disabled="submitting"
              @click="submitText"
            >{{ submitting ? '判分中…' : '提交答案' }}</button>
          </div>
          <div v-if="judged" class="feedback" :class="correct ? 'ok' : 'err'">
            <span class="em">{{ correct ? '✓' : '✗' }}</span>
            <b>{{ correct ? '答对了！' : '差一点，这题答错了。' }}</b>
            {{ correct ? '继续保持，下一题加油。' : '已自动收录进错题本，可在错题本中查看解析。' }}
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:var(--ink3);">
            <span v-if="submitting">判分中…</span>
            <span v-else-if="judged">⏱ 本题用时 {{ qElapsed }} 秒</span>
            <span v-else>{{ q.interaction_type === 'choice' ? '选择一个选项作答' : (q.interaction_type === 'blank' ? '输入答案后回车提交' : '输入解答后提交') }}</span>
            <button
              v-if="judged && qIndex < questions.length - 1"
              style="padding:7px 16px;background:var(--brand);color:#fff;border:none;border-radius:7px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;"
              @click="nextQ"
            >下一题 →</button>
            <button
              v-if="judged && qIndex === questions.length - 1"
              style="padding:7px 16px;background:var(--brand);color:#fff;border:none;border-radius:7px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;"
              @click="finish"
            >完成 🎉</button>
          </div>
        </template>
      </div>
      <div class="difficulty-pie">
        <h4>📊 难度配比 · {{ pieTotal }} 题分布</h4>
        <div v-if="mixLoading" class="pie-wrap" style="justify-content:center;color:var(--ink3);font-size:13px;">
          配比加载中…
        </div>
        <div v-else-if="mixError" class="pie-wrap" style="justify-content:center;color:var(--ink3);font-size:13px;">
          配比加载失败：{{ mixError }}
        </div>
        <div v-else-if="!pieTotal" class="pie-wrap" style="justify-content:center;color:var(--ink3);font-size:13px;">
          暂无难度配比数据，开始训练后将按标准配比出题。
        </div>
        <div v-else class="pie-wrap">
          <svg width="150" height="150" viewBox="0 0 150 150">
            <path v-for="seg in pieSegments" :key="seg.level" :d="seg.path" :fill="seg.color" />
            <circle cx="75" cy="75" r="38" fill="#ffffff"/>
            <text x="75" y="73" font-size="22" font-weight="900" fill="#0f172a" text-anchor="middle" font-family="Inter">{{ pieTotal }}</text>
            <text x="75" y="89" font-size="10" fill="#94a3b8" text-anchor="middle" font-weight="700">总题数</text>
          </svg>
          <div class="legend-pie">
            <div class="item" v-for="seg in pieSegments" :key="seg.level">
              <span class="swatch" :style="{ background: seg.color }"></span>
              <span>{{ seg.label }}</span>
              <b>{{ seg.count }}</b>
            </div>
            <div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--line);font-size:11px;color:var(--ink2);line-height:1.5;">
              💡 {{ mixExplanation }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 总结卡（Khan 风格） -->
    <div class="summary-card">
      <h4>📋 今日训练总结卡</h4>
      <div v-if="summaryState === 'idle'" style="background:rgba(255,255,255,.85);padding:12px 14px;border-radius:10px;font-size:13px;color:var(--ink3);line-height:1.6;">
        完成本组训练后，这里会生成你的升级 / 持平 / 降级总结。
      </div>
      <div v-else-if="summaryState === 'loading'" style="background:rgba(255,255,255,.85);padding:12px 14px;border-radius:10px;font-size:13px;color:var(--ink3);line-height:1.6;">
        正在生成训练总结…
      </div>
      <div v-else-if="summaryState === 'error'" style="background:rgba(255,255,255,.85);padding:12px 14px;border-radius:10px;font-size:13px;color:var(--ink3);line-height:1.6;">
        总结生成失败，可稍后在「学情报告」查看掌握度变化。
      </div>
      <template v-else-if="summary">
        <div class="changes" v-if="!summaryAllEmpty">
          <div class="change up" v-if="summary.upgraded.length">
            <div class="label">↑ 升级</div>
            <div class="val">{{ summary.upgraded.length }}</div>
            <div class="desc">{{ kpLines(summary.upgraded) }}</div>
          </div>
          <div class="change" style="background:rgba(255,255,255,.85);" v-if="summary.flat.length">
            <div class="label">→ 持平</div>
            <div class="val" style="color:var(--ink);">{{ summary.flat.length }}</div>
            <div class="desc">{{ kpLines(summary.flat) }}</div>
          </div>
          <div class="change down" v-if="summary.downgraded.length">
            <div class="label">↓ 降级</div>
            <div class="val">{{ summary.downgraded.length }}</div>
            <div class="desc">{{ kpLines(summary.downgraded) }}</div>
          </div>
        </div>
        <div v-else style="background:rgba(255,255,255,.85);padding:12px 14px;border-radius:10px;font-size:13px;color:var(--ink);line-height:1.6;margin-bottom:10px;">
          本次训练暂无掌握度对比数据（如首次训练无对比快照），继续练习后会生成变化总结。
        </div>
        <div style="background:rgba(255,255,255,.85);padding:12px 14px;border-radius:10px;font-size:13px;color:var(--ink);line-height:1.6;">
          💡 <b>下一步推荐：</b>{{ summary.recommendation }}
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api/client'
import { useToastStore } from '@/stores/toast'
import { useAuthStore } from '@/stores/auth'
import LatexText from '@/components/LatexText.vue'

const route = useRoute()
const toast = useToastStore()
const auth = useAuthStore()
const modes = ['15 分钟模式', '60 分钟模式', '考前冲刺']
const mode = ref('15 分钟模式')
const difficulty = ref('自适应 (推荐)')

const DIFF_ZH = { easy: '易', medium: '中', hard: '难' }
const LEVEL_META = {
  easy: { label: '易（基础巩固）', color: '#16a34a' },
  medium: { label: '中（综合应用）', color: '#f59e0b' },
  hard: { label: '难（压轴突破）', color: '#dc2626' },
}

function pct(v) { return Math.round((Number(v) || 0) * 100) }

/* ==================== 今日训练组推荐 ==================== */
const group = ref(null)
const groupLoading = ref(true)
const groupError = ref('')

async function loadGroup() {
  groupLoading.value = true
  groupError.value = ''
  try {
    group.value = await api.get('/student/practice/group-recommend', { count: 5 })
  } catch (e) {
    groupError.value = e.message || '加载失败'
  } finally {
    groupLoading.value = false
  }
}

const greetingTitle = computed(() => {
  if (groupLoading.value) return '加载中…'
  if (!group.value) return '今日训练'
  return `${group.value.count} 题${group.value.kp_name || '摸底训练'}`
})
const modeTotalLabel = computed(() => {
  const cfg = MODE_CONFIG[mode.value]
  if (!cfg) return ''
  return cfg.minutes >= 60 ? `${cfg.minutes / 60} 小时` : `${cfg.minutes} 分钟`
})
const greetingSub = computed(() => {
  const g = group.value
  if (!g) return ''
  const name = auth.nickname
  if (g.mastery_now === null || g.mastery_now === undefined) return `${name}，${g.reason}`
  return `${name}，${g.reason} 做完预计掌握度 ${pct(g.mastery_now)}% → ${pct(g.mastery_forecast)}%。`
})
const mixText = computed(() => {
  const m = group.value?.mix
  return m ? `${m.easy}:${m.medium}:${m.hard}` : '3:2:1'
})
const masteryGain = computed(() => {
  const g = group.value
  if (!g || g.mastery_now === null || g.mastery_now === undefined) return 0
  return Math.max(0, pct(g.mastery_forecast) - pct(g.mastery_now))
})
const avgMinutes = computed(() => {
  const g = group.value
  if (!g || !g.count) return 4
  return Math.max(1, Math.round((g.est_minutes || 0) / g.count))
})

/* ==================== 难度配比饼图 ==================== */
const mixItems = ref([])
const mixExplanation = ref('')
const mixLoading = ref(true)
const mixError = ref('')

async function loadMix(count = 5) {
  mixLoading.value = true
  mixError.value = ''
  try {
    const d = await api.get('/student/practice/difficulty-mix', { count })
    mixItems.value = d.items || []
    mixExplanation.value = d.explanation || ''
  } catch (e) {
    mixError.value = e.message || '加载失败'
  } finally {
    mixLoading.value = false
  }
}

const pieTotal = computed(() => mixItems.value.reduce((s, it) => s + (it.count || 0), 0))

function polar(angleDeg, r) {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return [75 + r * Math.cos(a), 75 + r * Math.sin(a)]
}
function piePath(startFrac, endFrac) {
  const r = 58
  if (endFrac - startFrac >= 0.9999) {
    // 整圆：拆成两个半圆避免 arc 退化
    return `M 75 ${75 - r} A ${r} ${r} 0 1 1 75 ${75 + r} A ${r} ${r} 0 1 1 75 ${75 - r} Z`
  }
  const [x1, y1] = polar(startFrac * 360, r)
  const [x2, y2] = polar(endFrac * 360, r)
  const large = endFrac - startFrac > 0.5 ? 1 : 0
  return `M 75 75 L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`
}
const pieSegments = computed(() => {
  const total = pieTotal.value
  if (!total) return []
  let acc = 0
  return mixItems.value
    .filter((it) => (it.count || 0) > 0)
    .map((it) => {
      const start = acc
      acc += it.count / total
      const meta = LEVEL_META[it.level] || { label: it.level, color: '#94a3b8' }
      return { level: it.level, count: it.count, ...meta, path: piePath(start, acc) }
    })
})

/* ==================== 作答流程（start / submit / smart-score） ==================== */
const quizId = ref(null)
const questions = ref([])
const quizState = ref('idle') // idle / loading / error / empty / ready
const quizError = ref('')
const starting = ref(false)
const qIndex = ref(0)
const chosen = ref(-1)
const textAnswer = ref('') // blank/text 作答输入
const verdict = ref(null) // 'correct' / 'wrong'
const submitting = ref(false)
const smartScore = ref(null)
const qElapsed = ref(0)
let qStartAt = 0

const q = computed(() => questions.value[qIndex.value] || { optionsArr: [] })
const judged = computed(() => verdict.value !== null)
const correct = computed(() => verdict.value === 'correct')
const quizHeadText = computed(() => {
  if (quizState.value !== 'ready') return '今日题组 · 待开始'
  return `第 ${qIndex.value + 1} / ${questions.value.length} 题 · ${diffZh(q.value.difficulty)}`
})

function normalizeOptions(options) {
  if (Array.isArray(options)) {
    return options.map((text, i) => ({ letter: String.fromCharCode(65 + i), text: String(text) }))
  }
  if (options && typeof options === 'object') {
    return Object.keys(options).sort().map((k) => ({ letter: k, text: String(options[k]) }))
  }
  return []
}

async function start() {
  if (starting.value) return
  starting.value = true
  quizState.value = 'loading'
  try {
    const g = group.value
    // 新用户兜底推荐无 kp_code：回退每日一题模式；有 kp_code 走专练
    const payload = g && g.kp_code
      ? { mode: 'special', kp_code: g.kp_code, count: g.count || 5 }
      : { mode: 'daily' }
    const data = await api.post('/student/practice/start', payload)
    // 阶段 1 契约：优先 interaction_type，缺失时兼容旧 q_type
    const itype = (it) => it.interaction_type || it.q_type || 'text'
    quizId.value = data.quiz_id
    questions.value = (data.items || [])
      .filter((it) => {
        const t = itype(it)
        // choice 必须带选项才可作答；blank/text 直接可作答
        return t === 'choice' ? !!it.options : true
      })
      .map((it) => ({
        item_no: it.item_no,
        interaction_type: itype(it),
        q_type: it.q_type,
        difficulty: it.difficulty || 'medium',
        kp_code: it.kp_code,
        text: it.question_text,
        image: it.image || [],
        optionsArr: normalizeOptions(it.options),
      }))
    if (!questions.value.length) {
      quizState.value = 'empty'
      return
    }
    quizState.value = 'ready'
    qIndex.value = 0
    chosen.value = -1
    verdict.value = null
    smartScore.value = null
    summaryState.value = 'idle'
    summary.value = null
    secs = 0
    markQStart()
    toast.info(`已开始训练（${mode.value} · ${difficulty.value}）——${questions.value.length} 题，加油！`)
  } catch (e) {
    quizState.value = 'error'
    quizError.value = e.message || '出题失败'
  } finally {
    starting.value = false
  }
}

async function pick(oi) {
  if (judged.value || submitting.value || quizState.value !== 'ready') return
  const item = q.value
  if (!item.optionsArr[oi]) return
  chosen.value = oi
  submitting.value = true
  try {
    const data = await api.post('/student/practice/submit', {
      quiz_id: quizId.value,
      client_submit_id: `${quizId.value}:${item.item_no}`,
      items: [{ item_no: item.item_no, q_type: 'choice', answer_text: item.optionsArr[oi].letter }],
    })
    const r = (data.results || []).find((x) => x.item_no === item.item_no) || {}
    verdict.value = r.verdict === 'correct' ? 'correct' : 'wrong'
    qElapsed.value = Math.max(1, Math.round((Date.now() - qStartAt) / 1000))
    if (data.submission_id) loadSmartScore(data.submission_id)
  } catch (e) {
    chosen.value = -1
    toast.error(e.message || '判分失败，请重试')
  } finally {
    submitting.value = false
  }
}

// blank / text 题型作答：输入答案后提交（q_type 回传原始值，answer_text 为输入内容）
async function submitText() {
  if (judged.value || submitting.value || quizState.value !== 'ready') return
  const item = q.value
  const ans = textAnswer.value.trim()
  if (!ans) {
    toast.error('请先输入答案')
    return
  }
  submitting.value = true
  try {
    const data = await api.post('/student/practice/submit', {
      quiz_id: quizId.value,
      client_submit_id: `${quizId.value}:${item.item_no}`,
      items: [{ item_no: item.item_no, q_type: item.q_type || 'blank', answer_text: ans }],
    })
    const r = (data.results || []).find((x) => x.item_no === item.item_no) || {}
    verdict.value = r.verdict === 'correct' ? 'correct' : 'wrong'
    qElapsed.value = Math.max(1, Math.round((Date.now() - qStartAt) / 1000))
    if (data.submission_id) loadSmartScore(data.submission_id)
  } catch (e) {
    toast.error(e.message || '判分失败，请重试')
  } finally {
    submitting.value = false
  }
}

async function loadSmartScore(submissionId) {
  try {
    const d = await api.get('/student/practice/smart-score', { submission_id: submissionId })
    smartScore.value = d.smart_score
  } catch {
    // submission_id 无效（404）等场景：按契约不展示计分条
    smartScore.value = null
  }
}

function nextQ() {
  qIndex.value++
  chosen.value = -1
  textAnswer.value = ''
  verdict.value = null
  markQStart()
}
function markQStart() { qStartAt = Date.now() }

/* ==================== 训练总结 ==================== */
const summaryState = ref('idle') // idle / loading / error / ready
const summary = ref(null)

async function finish() {
  if (!quizId.value) return
  summaryState.value = 'loading'
  try {
    summary.value = await api.get('/student/practice/summary', { quiz_id: quizId.value })
    summaryState.value = 'ready'
    toast.success(`今日 ${questions.value.length} 题完成！训练总结已生成 🎉`)
  } catch (e) {
    summaryState.value = 'error'
    toast.error(e.message || '总结生成失败')
  }
}

const summaryAllEmpty = computed(() => {
  const s = summary.value
  if (!s) return true
  return !s.upgraded?.length && !s.flat?.length && !s.downgraded?.length
})
function kpLines(list) {
  return (list || [])
    .map((e) => `${e.kp_name || e.kp_code}（${pct(e.from)}%→${pct(e.to)}%）`)
    .join(' · ')
}

/* ==================== 展示辅助 ==================== */
function diffZh(d) { return DIFF_ZH[d] || d }
function diffColor(d) { return { easy: 'var(--ok-deep)', medium: 'var(--warn-deep)', hard: 'var(--err-deep)' }[d] }
function ansClass(oi) {
  if (!judged.value) return {}
  if (oi === chosen.value) return correct.value ? { correct: true } : { wrong: true }
  return {}
}
function switchMode(m) {
  if (mode.value === m) return
  mode.value = m
  const cfg = MODE_CONFIG[m]
  if (cfg) {
    // 切换模式：重置计时 + 按模式题量重新拉推荐
    secs = 0
    usedTime.value = '0:00'
    loadGroupWithCount(cfg.count)
  }
  toast.info(`已切换到${m}（${cfg.count} 题 · ${cfg.minutes} 分钟）`)
}

const MODE_CONFIG = {
  '15 分钟模式': { count: 5, minutes: 15 },
  '60 分钟模式': { count: 15, minutes: 60 },
  '考前冲刺': { count: 10, minutes: 90 },
}

async function loadGroupWithCount(count, kpCode) {
  groupLoading.value = true
  groupError.value = ''
  try {
    const params = { count }
    if (kpCode) params.kp_code = kpCode
    group.value = await api.get('/student/practice/group-recommend', params)
  } catch (e) {
    groupError.value = e.message || '加载失败'
  } finally {
    groupLoading.value = false
  }
}

// 知识点切换：薄弱 Top5 列表 + 手动选其他
const kpOptions = ref([])  // [{code, name, mastery, is_weak}]
const selectedKp = ref('')
async function loadKpOptions() {
  try {
    const d = await api.get('/student/report/weak-points')
    kpOptions.value = (d?.items || []).slice(0, 5).map((w) => ({
      code: w.kp_code, name: w.kp_name, mastery: w.mastery, is_weak: true,
    }))
  } catch {
    kpOptions.value = []
  }
}
function selectKp(kpCode) {
  selectedKp.value = kpCode || ''
  const cfg = MODE_CONFIG[mode.value]
  if (cfg) loadGroupWithCount(cfg.count, selectedKp.value || undefined)
}

// 沉浸式练题开关（不丢题，只切全屏）
const showImmersive = ref(true)
function exitImmersive() { showImmersive.value = false }

const usedTime = ref('0:00')
let secs = 0
const timer = setInterval(() => {
  if (quizState.value !== 'ready') return
  secs++
  usedTime.value = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
}, 1000)
onBeforeUnmount(() => clearInterval(timer))

onMounted(async () => {
  // 迭代18 修复：知识图谱"直接练"带 ?kp= 参数 → 定向该知识点训练
  const qKp = route.query.kp ? String(route.query.kp) : ''
  if (qKp) selectedKp.value = qKp
  await loadGroup()
  loadMix(group.value?.count || 5)
  loadKpOptions()
  if (qKp) {
    // 查询参数指定的知识点可能不在薄弱 Top5 列表里，补进下拉选项避免显示空
    if (!kpOptions.value.some((o) => o.code === qKp)) {
      kpOptions.value.unshift({ code: qKp, name: qKp, mastery: null, is_weak: false })
    }
    selectKp(qKp)
  }
})
</script>

<style scoped>
/* ===== 沉浸式练题：进入答题后隐藏其他区域，practice-row 占满 100vh ===== */
.view.immersive {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: linear-gradient(180deg, #fffbeb 0%, #ffffff 100%);
  padding: var(--space-4) var(--space-5);
  overflow: hidden;
}
.view.immersive > *:not(.practice-row):not(.immersive-exit) { display: none; }
.view.immersive .practice-row {
  height: 100%;
  align-items: center;
  justify-content: center;
}
.view.immersive .quiz-card {
  max-width: 760px;
  width: 100%;
  min-height: 70vh;
  padding: var(--space-6) var(--space-8);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}
.view.immersive .q-text { font-size: 16px; line-height: 1.8; }
.q-fig { margin: 10px 0; text-align: center; }
.q-fig img { max-width: 100%; max-height: 260px; border: 1px solid var(--line); border-radius: 8px; background: #fff; }
.view.immersive .ans { font-size: 14px; padding: 12px 14px; }
/* blank/text 输入作答（阶段 1 契约） */
.text-answer-box { margin: 14px 0; display: flex; flex-direction: column; gap: 10px; }
.text-answer-input {
  width: 100%; box-sizing: border-box;
  padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px;
  font: inherit; font-size: 14px; color: var(--ink);
  background: #fff; resize: vertical;
}
.text-answer-input:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 2px color-mix(in srgb, var(--brand) 18%, transparent); }
.text-answer-btn {
  align-self: flex-start; padding: 8px 20px;
  background: var(--brand); color: #fff; border: none; border-radius: 7px;
  font: inherit; font-size: 13px; font-weight: 700; cursor: pointer;
}
.text-answer-btn:disabled { opacity: 0.55; cursor: not-allowed; }
/* 退出沉浸式的小按钮 */
.immersive-exit {
  position: fixed; top: 14px; right: 18px; z-index: 60;
  background: rgba(15, 23, 42, 0.85); color: #fff; border: none;
  padding: 6px 12px; border-radius: 99px; font-size: 12px; font-weight: 600;
  cursor: pointer; display: inline-flex; align-items: center; gap: 4px;
}
.immersive-exit:hover { background: rgba(15, 23, 42, 1); }
</style>
