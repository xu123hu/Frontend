<template>
  <div id="tv2-classroom" class="tv2-classroom">
    <!-- 顶栏 -->
    <div class="tv2-card tv2-classroom__topbar">
      <div class="tv2-card__body tv2-classroom__topbar-row">
        <template v-if="!session">
          <div>
            <b class="tv2-classroom__title">开启课堂互动</b>
            <span class="tv2-card__sub">当堂发题 · 实时作答分布 · 随机点名</span>
          </div>
          <div class="tv2-classroom__setup">
            <button v-for="c in classes" :key="c.class_id" class="tv2-quiz__chip" :class="{ 'is-on': form.class_id === c.class_id }" type="button" @click="form.class_id = c.class_id">
              {{ c.class_name }} · {{ c.student_count }} 人
            </button>
            <input v-model="form.topic" class="tv2-input tv2-classroom__topic" type="text" placeholder="课题，如：椭圆的标准方程（新授）" />
            <button class="tv2-btn tv2-btn--primary" type="button" :disabled="opening" data-testid="tv2-classroom-open" @click="open">{{ opening ? '开启中…' : '▶ 开启课堂' }}</button>
          </div>
        </template>
        <template v-else>
          <div>
            <b class="tv2-classroom__title">{{ session.topic }}</b>
            <span class="tv2-card__sub">{{ session.class_name }} · {{ session.roster.length }} 名学生 ·
              <span class="tv2-tag" :class="sessClass(session.status)">{{ sessLabel(session.status) }}</span>
            </span>
          </div>
          <div class="tv2-classroom__topbar-actions">
            <button class="tv2-btn tv2-btn--danger" type="button" data-testid="tv2-classroom-close" @click="close">■ 结束课堂</button>
          </div>
        </template>
      </div>
    </div>

    <div v-if="error" class="tv2-error" role="alert">{{ error }} <button class="tv2-btn tv2-btn--sm" type="button" @click="init">重试</button></div>

    <!-- 三区主体 -->
    <div v-if="session" class="tv2-classroom__body">
      <!-- 左：题单 -->
      <aside class="tv2-card tv2-classroom__qlist">
        <div class="tv2-card__head"><div class="tv2-card__title">当堂题单</div><div class="tv2-card__sub">{{ session.questions.length }} 题</div></div>
        <div class="tv2-card__body tv2-classroom__qlist-body">
          <button
            v-for="(q, i) in session.questions" :key="q.question_id"
            class="tv2-classroom__qitem" :class="{ 'is-active': activeQ?.question_id === q.question_id }"
            type="button" :data-testid="`tv2-cq-${i + 1}`" @click="activeQ = q"
          >
            <span class="tv2-classroom__qitem-no">{{ i + 1 }}</span>
            <span class="tv2-classroom__qitem-stem">{{ q.stem.replace(/\$/g, '').slice(0, 40) }}…</span>
            <span class="tv2-classroom__qitem-state" :class="'s-' + q.status">
              {{ { pending: '未发', collecting: '收集中', closed: '已结束' }[q.status] }}
            </span>
          </button>
        </div>
      </aside>

      <!-- 中：当前题 -->
      <main class="tv2-classroom__stage">
        <!-- 未开启课堂 -->
        <div v-if="!activeQ" class="tv2-card"><div class="tv2-card__body tv2-empty" style="padding: 64px 0">
          <div class="tv2-empty__title">左侧选择一道题开始当堂检测</div>
          <div class="tv2-empty__desc">发题后学生端实时作答，这里同步呈现作答分布与错误聚类。</div>
        </div></div>

        <template v-else>
          <!-- 题卡 -->
          <div class="tv2-card tv2-classroom__qcard">
            <div class="tv2-card__body">
              <QuestionCard :question="questionDetail(activeQ)" :show-answer="activeQ.status === 'closed'" :show-analysis="false" />
            </div>
            <div class="tv2-classroom__qcard-actions">
              <template v-if="activeQ.status === 'pending'">
                <button class="tv2-btn tv2-btn--primary tv2-btn--lg" type="button" data-testid="tv2-send-question" @click="send">📤 发题 · 全班作答</button>
              </template>
              <template v-else-if="activeQ.status === 'collecting'">
                <span class="tv2-classroom__live tv2-pulse-dot">● 实时收集中</span>
                <button class="tv2-btn tv2-btn--danger tv2-btn--lg" type="button" data-testid="tv2-close-question" @click="closeQ">结束作答 · 看分布</button>
              </template>
              <template v-else>
                <span class="tv2-tag tv2-tag--ok">作答已结束 · 正确率 {{ Math.round((activeQ.stats.correct_rate || 0) * 100) }}%</span>
                <button class="tv2-btn" type="button" @click="replay">↻ 换一题再练</button>
              </template>
            </div>
          </div>

          <!-- 实时统计 -->
          <div v-if="activeQ.status !== 'pending'" class="tv2-classroom__stats">
            <!-- 进度环 -->
            <div class="tv2-card tv2-classroom__progress-card">
              <div class="tv2-card__body tv2-classroom__progress-body">
                <div class="tv2-classroom__ring" :style="ringStyle">
                  <b>{{ Math.round((activeQ.stats.answered / Math.max(1, activeQ.stats.total)) * 100) }}%</b>
                  <span>已作答</span>
                </div>
                <div class="tv2-classroom__progress-meta">
                  <div class="tv2-classroom__pm-row"><span>已答</span><b>{{ activeQ.stats.answered }} 人</b></div>
                  <div class="tv2-classroom__pm-row"><span>全班</span><b>{{ activeQ.stats.total }} 人</b></div>
                  <div class="tv2-classroom__pm-row"><span>正确率</span><b class="tv2-classroom__cr">{{ Math.round((activeQ.stats.correct_rate || 0) * 100) }}%</b></div>
                </div>
              </div>
            </div>

            <!-- 选项分布 -->
            <div class="tv2-card tv2-classroom__dist">
              <div class="tv2-card__head"><div class="tv2-card__title">作答分布</div><div class="tv2-card__sub">{{ activeQ.stats.answered ? '实时更新' : '等待作答' }}</div></div>
              <div class="tv2-card__body tv2-classroom__dist-body">
                <div v-for="opt in optionKeys(activeQ)" :key="opt" class="tv2-classroom__dist-row">
                  <span class="tv2-classroom__dist-opt" :class="{ 'is-answer': opt === activeQ.answer }">{{ opt }}<i v-if="opt === activeQ.answer">✓</i></span>
                  <div class="tv2-classroom__dist-bar">
                    <div
                      class="tv2-classroom__dist-fill" :class="{ 'is-answer': opt === activeQ.answer, 'is-wrong': opt !== activeQ.answer }"
                      :style="{ width: distPct(activeQ, opt) + '%' }"
                    />
                  </div>
                  <span class="tv2-classroom__dist-num">{{ activeQ.stats.distribution[opt] || 0 }} 人 · {{ distPct(activeQ, opt) }}%</span>
                </div>
              </div>
            </div>

            <!-- 错误聚类 -->
            <div class="tv2-card tv2-classroom__cluster">
              <div class="tv2-card__head"><div class="tv2-card__title"><span class="tv2-ai-badge tv2-ai-badge--sm">✦</span>错误聚类</div><div class="tv2-card__sub">高频错误选项归因</div></div>
              <div class="tv2-card__body">
                <div v-if="!activeQ.stats.error_cluster?.length" class="tv2-classroom__cluster-empty">暂无错误聚类（作答收集中）</div>
                <div v-for="c in activeQ.stats.error_cluster" :key="c.option" class="tv2-classroom__cluster-row">
                  <span class="tv2-classroom__cluster-opt">选 {{ c.option }}</span>
                  <b class="tv2-classroom__cluster-count">{{ c.count }} 人</b>
                  <span class="tv2-classroom__cluster-tag">{{ c.tag }}</span>
                </div>
                <p v-if="activeQ.status === 'closed' && activeQ.stats.error_cluster?.length" class="tv2-classroom__cluster-advice">
                  建议：先请「选 {{ activeQ.stats.error_cluster[0].option }}」的同学说思路，针对「{{ activeQ.stats.error_cluster[0].tag }}」做对比讲评。
                </p>
              </div>
            </div>
          </div>
        </template>
      </main>

      <!-- 右：随机点名 -->
      <aside class="tv2-card tv2-classroom__pick">
        <div class="tv2-card__head"><div class="tv2-card__title">随机点名</div><div class="tv2-card__sub">均衡覆盖 · 一轮后自动重置</div></div>
        <div class="tv2-card__body">
          <div class="tv2-classroom__pick-stage" :class="{ 'is-rolling': rolling }" data-testid="tv2-pick-stage">
            <template v-if="picked">{{ picked.name }}</template>
            <template v-else-if="rolling">…</template>
            <template v-else>点击下方按钮</template>
          </div>
          <button class="tv2-btn tv2-btn--ai" type="button" style="width: 100%" data-testid="tv2-pick-btn" @click="pick">
            {{ rolling ? '抽取中…' : '✦ 随机点名' }}
          </button>
          <div class="tv2-classroom__picked-list">
            <span v-for="r in session.roster.filter((x) => x.picked)" :key="r.user_id" class="tv2-classroom__picked-chip">{{ r.name }}</span>
          </div>
          <div class="tv2-classroom__pick-meta">剩余 {{ session.roster.filter((r) => !r.picked).length }} 人未点到</div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import QuestionCard from '@/components/teacherV2/QuestionCard.vue'
import { streamSessionStats, v2Api } from '@/api/teacherV2'
import { useToastStore } from '@/stores/toast'
import type { V2ClassroomSession, V2SessionQuestion } from '@/types/teacherV2'

const toast = useToastStore()

const session = ref<V2ClassroomSession | null>(null)
const activeQ = ref<V2SessionQuestion | null>(null)
const error = ref('')
const opening = ref(false)
const picked = ref<{ user_id: string; name: string } | null>(null)
const rolling = ref(false)

const classes = [
  { class_id: 'cls-g2-3', class_name: '高二 3 班', student_count: 46 },
  { class_id: 'cls-g2-5', class_name: '高二 5 班', student_count: 44 },
]
const form = ref({ class_id: 'cls-g2-3', topic: '椭圆的标准方程（新授）' })

let statsCtrl: { abort: () => void } | null = null

function sessLabel(s: string) { return { open: '进行中', questioning: '题目收集中', reviewing: '讲评中', closed: '已结束' }[s] || s }
function sessClass(s: string) { return { open: 'tv2-tag--ok', questioning: 'tv2-tag--warn', reviewing: 'tv2-tag--info', closed: 'tv2-tag--slate' }[s] || 'tv2-tag--slate' }

/* 题单中的题只有摘要，从 stats 拼出完整题卡所需字段 */
function questionDetail(q: V2SessionQuestion) {
  return {
    question_id: q.question_id,
    kp_code: '', kp_name: q.kp_name,
    q_type: q.options ? ('choice' as const) : ('solution' as const),
    difficulty: 'medium' as const,
    source: 'official' as const,
    stem: q.stem,
    options: q.options,
    answer: q.answer,
    analysis: { analysis: '', solution: '', comment: '' },
    score: 5,
  }
}

function optionKeys(q: V2SessionQuestion) { return q.options ? ['A', 'B', 'C', 'D'] : ['对', '错'] }
function distPct(q: V2SessionQuestion, opt: string) {
  const total = q.stats.answered || Object.values(q.stats.distribution).reduce((s, v) => s + v, 0)
  if (!total) return 0
  return Math.round(((q.stats.distribution[opt] || 0) / total) * 100)
}

const ringStyle = computed(() => {
  const q = activeQ.value
  if (!q) return {}
  const pct = Math.round((q.stats.answered / Math.max(1, q.stats.total)) * 100)
  return { background: `conic-gradient(var(--tv2-primary) ${pct * 3.6}deg, var(--tv2-bg2) 0deg)` }
})

async function init() {
  error.value = ''
}

async function open() {
  opening.value = true
  error.value = ''
  try {
    const res = await v2Api.openSession({ class_id: form.value.class_id, topic: form.value.topic })
    session.value = res.data
    activeQ.value = res.data.questions[0] || null
    toast.success(`课堂已开启：${res.data.class_name} · 题单 ${res.data.questions.length} 题`)
  } catch (e: any) {
    error.value = e?.message || '开启课堂失败'
  } finally {
    opening.value = false
  }
}

async function send() {
  if (!session.value || !activeQ.value) return
  try {
    const res = await v2Api.sendQuestion(session.value.session_id, activeQ.value.question_id)
    session.value = res.data
    activeQ.value = res.data.questions.find((q) => q.question_id === activeQ.value!.question_id) || activeQ.value
    toast.success('题目已发送，学生端开始作答')
    startStats()
  } catch (e: any) {
    toast.error(e?.message || '发题失败')
  }
}

function startStats() {
  statsCtrl?.abort()
  if (!session.value || !activeQ.value) return
  const qid = activeQ.value.question_id
  statsCtrl = streamSessionStats(session.value.session_id, qid, (event, data) => {
    if (event === 'stats') {
      const q = session.value?.questions.find((x) => x.question_id === qid)
      if (q) {
        q.stats = { ...q.stats, answered: data.answered, distribution: data.distribution, correct_rate: data.correct_rate, error_cluster: data.error_cluster }
        if (activeQ.value?.question_id === qid) activeQ.value = { ...q }
      }
    } else if (event === 'done') {
      toast.success('全班已提交完毕')
    }
  })
}

async function closeQ() {
  if (!session.value || !activeQ.value) return
  statsCtrl?.abort()
  try {
    const res = await v2Api.closeQuestion(session.value.session_id, activeQ.value.question_id)
    session.value = res.data
    activeQ.value = res.data.questions.find((q) => q.question_id === activeQ.value!.question_id) || activeQ.value
    toast.success(`作答结束：正确率 ${Math.round((activeQ.value.stats.correct_rate || 0) * 100)}%`)
  } catch (e: any) {
    toast.error(e?.message || '结束作答失败')
  }
}

function replay() {
  // 换下一道未发的题
  if (!session.value) return
  const next = session.value.questions.find((q) => q.status === 'pending')
  if (next) {
    activeQ.value = next
    toast.info(`切换到下一题：${next.stem.slice(0, 20)}…`)
  } else {
    toast.info('题单已全部练完，可结束课堂')
  }
}

async function close() {
  if (!session.value) return
  try {
    const res = await v2Api.closeSession(session.value.session_id)
    session.value = res.data
    statsCtrl?.abort()
    toast.success('课堂已结束，作答数据已归档到学情洞察')
  } catch (e: any) {
    toast.error(e?.message || '结束课堂失败')
  }
}

async function pick() {
  if (!session.value || rolling.value) return
  rolling.value = true
  picked.value = null
  try {
    const res = await v2Api.pick(session.value.session_id)
    if (res.data.student) {
      // 滚动动画 800ms 后揭示
      setTimeout(() => {
        picked.value = res.data.student
        rolling.value = false
        toast.success(`请 ${res.data.student!.name} 回答`)
      }, 800)
    } else {
      rolling.value = false
      picked.value = null
      toast.info('全班都点过一轮了，已自动重置点名池')
      const s = await v2Api.session(session.value.session_id)
      session.value = s.data
    }
  } catch (e: any) {
    rolling.value = false
    toast.error(e?.message || '点名失败')
  }
}

onBeforeUnmount(() => { statsCtrl?.abort() })
init()
</script>

<style scoped>
.tv2-classroom { display: flex; flex-direction: column; gap: 14px; }
.tv2-classroom__topbar-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.tv2-classroom__title { font-size: 16px; }
.tv2-classroom__topbar-row > div:first-child > span { display: block; margin-top: 3px; }
.tv2-classroom__setup { margin-left: auto; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.tv2-classroom__topic { width: 300px; }
.tv2-classroom__topbar-actions { margin-left: auto; display: flex; gap: 8px; }

.tv2-input {
  height: 34px; border: 1px solid var(--tv2-line); border-radius: 8px; padding: 0 12px;
  font-size: 13px; color: var(--tv2-ink); background: var(--tv2-card); outline: none; font-family: inherit;
}
.tv2-input:focus { border-color: var(--tv2-primary); box-shadow: 0 0 0 3px var(--tv2-primary-soft); }
.tv2-quiz__chip {
  border: 1px solid var(--tv2-line); background: var(--tv2-card); border-radius: 999px;
  padding: 4px 12px; font-size: 12px; color: var(--tv2-ink2); cursor: pointer; transition: all .12s;
}
.tv2-quiz__chip.is-on { background: var(--tv2-primary-soft); border-color: var(--tv2-primary); color: var(--tv2-primary); font-weight: 600; }

.tv2-classroom__body { display: grid; grid-template-columns: 264px minmax(0, 1fr) 236px; gap: 14px; align-items: start; }

/* ===== 左：题单 ===== */
.tv2-classroom__qlist { position: sticky; top: 12px; }
.tv2-classroom__qlist-body { display: flex; flex-direction: column; gap: 7px; }
.tv2-classroom__qitem {
  display: flex; align-items: center; gap: 9px; text-align: left; width: 100%;
  border: 1px solid var(--tv2-line); border-radius: 9px; background: var(--tv2-card);
  padding: 9px 11px; cursor: pointer; transition: all .12s;
}
.tv2-classroom__qitem:hover { border-color: var(--tv2-primary-border); }
.tv2-classroom__qitem.is-active { border-color: var(--tv2-primary); box-shadow: 0 0 0 3px var(--tv2-primary-soft); }
.tv2-classroom__qitem-no {
  width: 22px; height: 22px; border-radius: 7px; background: var(--tv2-bg2); color: var(--tv2-ink2);
  display: grid; place-items: center; font-size: 11.5px; font-weight: 700; flex-shrink: 0; font-family: var(--tv2-font-num);
}
.tv2-classroom__qitem.is-active .tv2-classroom__qitem-no { background: var(--tv2-primary); color: #fff; }
.tv2-classroom__qitem-stem { flex: 1; min-width: 0; font-size: 12px; color: var(--tv2-ink2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tv2-classroom__qitem-state { font-size: 10.5px; border-radius: 5px; padding: 2px 6px; flex-shrink: 0; }
.tv2-classroom__qitem-state.s-pending { background: var(--tv2-slate-soft); color: var(--tv2-slate); }
.tv2-classroom__qitem-state.s-collecting { background: var(--tv2-amber-soft); color: var(--tv2-amber); }
.tv2-classroom__qitem-state.s-closed { background: var(--tv2-teal-soft); color: var(--tv2-teal); }

/* ===== 中：当前题 ===== */
.tv2-classroom__stage { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.tv2-classroom__qcard { overflow: visible; }
.tv2-classroom__qcard-actions { display: flex; align-items: center; gap: 14px; padding: 0 18px 16px; }
.tv2-classroom__live { font-size: 12.5px; color: var(--tv2-rose); font-weight: 700; }

.tv2-classroom__stats { display: grid; grid-template-columns: 236px minmax(0, 1fr); gap: 14px; }
.tv2-classroom__progress-card { grid-row: span 2; }
.tv2-classroom__progress-body { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 22px 16px !important; }
.tv2-classroom__ring {
  width: 118px; height: 118px; border-radius: 50%; display: grid; place-items: center; align-content: center;
  position: relative; transition: background 0.4s;
}
.tv2-classroom__ring::before { content: ''; position: absolute; inset: 12px; border-radius: 50%; background: var(--tv2-card); }
.tv2-classroom__ring b { position: relative; font-size: 24px; font-family: var(--tv2-font-num); color: var(--tv2-primary-deep); }
.tv2-classroom__ring span { position: relative; font-size: 11px; color: var(--tv2-ink3); }
.tv2-classroom__progress-meta { width: 100%; display: flex; flex-direction: column; gap: 7px; }
.tv2-classroom__pm-row { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--tv2-ink2); }
.tv2-classroom__pm-row b { font-family: var(--tv2-font-num); color: var(--tv2-ink); }
.tv2-classroom__cr { color: var(--tv2-teal) !important; }

.tv2-classroom__dist-body { display: flex; flex-direction: column; gap: 10px; }
.tv2-classroom__dist-row { display: flex; align-items: center; gap: 11px; }
.tv2-classroom__dist-opt {
  width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; flex-shrink: 0;
  background: var(--tv2-bg2); color: var(--tv2-ink2); font-weight: 700; font-family: var(--tv2-font-num); font-size: 13px;
}
.tv2-classroom__dist-opt.is-answer { background: var(--tv2-teal-soft); color: var(--tv2-teal); border: 1.5px solid var(--tv2-teal-border); }
.tv2-classroom__dist-opt i { font-style: normal; font-size: 10px; margin-left: 2px; }
.tv2-classroom__dist-bar { flex: 1; height: 26px; background: var(--tv2-bg2); border-radius: 7px; overflow: hidden; }
.tv2-classroom__dist-fill { height: 100%; border-radius: 7px; transition: width 0.5s ease; min-width: 0; }
.tv2-classroom__dist-fill.is-answer { background: linear-gradient(90deg, var(--tv2-teal), #14b8a6); }
.tv2-classroom__dist-fill.is-wrong { background: linear-gradient(90deg, #f43f5e88, #f43f5e); }
.tv2-classroom__dist-num { width: 86px; text-align: right; font-size: 11.5px; color: var(--tv2-ink2); font-family: var(--tv2-font-num); flex-shrink: 0; }

.tv2-classroom__cluster-empty { font-size: 12.5px; color: var(--tv2-ink3); padding: 6px 0; }
.tv2-classroom__cluster-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px dashed var(--tv2-line2); }
.tv2-classroom__cluster-row:last-of-type { border-bottom: none; }
.tv2-classroom__cluster-opt { font-size: 12.5px; font-weight: 600; color: var(--tv2-rose); width: 52px; }
.tv2-classroom__cluster-count { font-size: 13px; font-family: var(--tv2-font-num); color: var(--tv2-ink); }
.tv2-classroom__cluster-tag { font-size: 12px; color: var(--tv2-ink2); margin-left: auto; text-align: right; }
.tv2-classroom__cluster-advice {
  margin: 10px 0 0; padding: 9px 12px; background: var(--tv2-ai-soft); border: 1px solid var(--tv2-ai-border);
  border-radius: 8px; font-size: 12px; color: var(--tv2-ai-deep); line-height: 1.6;
}

/* ===== 右：点名 ===== */
.tv2-classroom__pick { position: sticky; top: 12px; }
.tv2-classroom__pick-stage {
  height: 118px; border-radius: var(--tv2-radius-lg); background: linear-gradient(135deg, #f6f2fd, #eef4fd);
  border: 1px dashed var(--tv2-ai-border); display: grid; place-items: center;
  font-size: 26px; font-weight: 800; color: var(--tv2-ai-deep); letter-spacing: 3px; margin-bottom: 12px;
}
.tv2-classroom__pick-stage.is-rolling { animation: tv2Roll 0.16s infinite alternate; }
@keyframes tv2Roll { from { transform: rotate(-1deg); } to { transform: rotate(1deg); } }
.tv2-classroom__picked-list { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 12px; min-height: 24px; }
.tv2-classroom__picked-chip {
  font-size: 11px; background: var(--tv2-slate-soft); color: var(--tv2-slate);
  border-radius: 999px; padding: 2px 9px;
}
.tv2-classroom__pick-meta { margin-top: 8px; font-size: 11px; color: var(--tv2-ink3); text-align: center; }

@media (max-width: 1280px) {
  .tv2-classroom__body { grid-template-columns: 232px minmax(0, 1fr); }
  .tv2-classroom__pick { grid-column: 1 / -1; position: static; }
  .tv2-classroom__stats { grid-template-columns: 1fr; }
  .tv2-classroom__progress-card { grid-row: auto; }
}
</style>
