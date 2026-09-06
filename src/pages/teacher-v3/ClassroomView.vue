<template>
  <div data-testid="tv3-classroom">
    <!-- 未开课 -->
    <div v-if="!session" class="tv3-card" style="max-width: 640px; margin: 40px auto; text-align: center; padding: 40px">
      <div style="font-size: 44px; margin-bottom: 10px">🎓</div>
      <div style="font-size: 18px; font-weight: 800; margin-bottom: 6px">课堂互动</div>
      <div style="font-size: 13px; color: var(--tv3-ink3); margin-bottom: 20px">确定性状态机 · 讲台模式 · 教师选择的分支卡（概念演示）</div>
      <div style="display: flex; gap: 10px; justify-content: center; align-items: center">
        <select v-model="pickClass" class="tv3-input" style="width: 150px">
          <option v-for="c in classes" :key="c.class_id" :value="c.class_id">{{ c.name }}</option>
        </select>
        <input v-model="topicDraft" class="tv3-input" style="width: 220px" placeholder="本节课题（可改）" />
        <button class="tv3-btn tv3-btn--primary" data-testid="tv3-open-session" @click="openSession">开课</button>
      </div>
    </div>

    <!-- 课堂中 -->
    <template v-else>
      <div class="tv3-card" style="margin-bottom: 14px">
        <div class="tv3-card__head">
          <span class="tv3-tag" :class="sessionStatus === 'waiting' ? 'tv3-tag--warn' : sessionStatus === 'ended' ? '' : 'tv3-tag--ok'" data-testid="tv3-status-tag">
            {{ sessionStatus === 'waiting' ? '◦ 等待学生' : sessionStatus === 'collecting' ? '● 答题中' : sessionStatus === 'stopped' ? '▪ 已停止' : sessionStatus === 'revealed' ? '◈ 讲评中' : '▪ 已结束' }}
          </span>
          <span class="tv3-tag" style="font-size: 10px" title="状态、作答与加入均为确定性演示数据，非真实学生端（真实学生端在 M2-A 接入）">模拟学生端 · 概念演示</span>
          <input v-model="session.topic" class="tv3-input" style="max-width: 260px; font-weight: 700" title="本节课题（可改）" />
          <span class="tv3-card__sub" data-testid="tv3-elapsed">⏱ {{ fmtClock(elapsedSec) }}</span>
          <span class="tv3-card__sub" data-testid="tv3-joined">{{ joinedCount }}/{{ total }} 人已加入</span>
          <div class="tv3-card__spacer" />
          <button class="tv3-btn tv3-btn--sm" data-testid="tv3-podium-open" @click="podiumOpen = true">🖥 讲台模式</button>
          <button class="tv3-btn tv3-btn--sm" data-testid="tv3-pick-student" @click="pickStudent">🎲 随机点名</button>
          <button class="tv3-btn tv3-btn--sm tv3-btn--danger" data-testid="tv3-end-session" @click="endSession">下课</button>
        </div>
        <!-- 等待学生：加入流 -->
        <div v-if="sessionStatus === 'waiting'" class="tv3-card__body" style="padding-top: 0">
          <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center">
            <span class="tv3-tag" v-for="n in joinedNames.slice(-6)" :key="n" style="font-size: 10.5px">{{ n }} 已加入</span>
            <span v-if="joinedCount < total" class="tv3-pulse-dot" style="color: var(--tv3-ink3); font-size: 11px">正在加入…</span>
            <span v-else class="tv3-tag tv3-tag--ok" style="font-size: 10.5px">全班已加入，可以发题</span>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1.4fr; gap: 14px; align-items: start">
        <!-- 发题 -->
        <div class="tv3-card">
          <div class="tv3-card__head"><span class="tv3-card__title">发题</span><span class="tv3-card__sub">题干公式结构化推送 · 限时 {{ fmtClock(qTimeLeft) }}<template v-if="extendedTimes"> · 已续 {{ extendedTimes }} 次</template></span></div>
          <div class="tv3-card__body" style="display: flex; flex-direction: column; gap: 8px">
            <div
              v-for="q in quizPool" :key="q.id"
              class="tv3-row" :class="{ 'is-selected': activeQ?.id === q.id }" style="cursor: pointer; align-items: flex-start"
              :data-testid="`tv3-question-${q.id}`"
              @click="sendQuestion(q)"
            >
              <span class="tv3-tag" :class="q.difficulty === 'hard' ? 'tv3-tag--danger' : q.difficulty === 'medium' ? 'tv3-tag--warn' : 'tv3-tag--ok'">{{ diffLabel(q.difficulty) }}</span>
              <div style="flex: 1; min-width: 0">
                <div style="font-size: 12.5px; line-height: 1.5" v-html="renderLatex(q.stem_latex)" />
                <div v-if="q.options" style="font-size: 11.5px; color: var(--tv3-ink3); margin-top: 2px">{{ q.options.length }} 个选项</div>
              </div>
              <span v-if="activeQ?.id === q.id" class="tv3-tag" :class="sessionStatus === 'collecting' ? 'tv3-tag--gold tv3-pulse-dot' : 'tv3-tag'">
                {{ sessionStatus === 'collecting' ? '答题中' : sessionStatus === 'stopped' ? '已停止' : '已公布' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 实时分布 -->
        <div class="tv3-card">
          <div class="tv3-card__head">
            <span class="tv3-card__title">实时作答分布</span>
            <span class="tv3-card__sub" data-testid="tv3-live-count">{{ answered }} / {{ total }} 已作答<template v-if="sessionStatus !== 'collecting'">（已冻结）</template></span>
            <div class="tv3-card__spacer" />
            <button v-if="activeQ && sessionStatus === 'collecting'" class="tv3-btn tv3-btn--sm" data-testid="tv3-close-q" @click="stopQuestion">停止作答</button>
            <button v-if="activeQ && sessionStatus === 'collecting'" class="tv3-btn tv3-btn--sm" data-testid="tv3-extend-time" @click="extendTime">+30s 续时</button>
            <button v-else-if="activeQ && sessionStatus === 'stopped'" class="tv3-btn tv3-btn--sm tv3-btn--gold" data-testid="tv3-reveal-q" @click="revealQuestion">公布答案 → 讲评</button>
            <span v-else-if="activeQ && sessionStatus === 'revealed'" class="tv3-tag tv3-tag--ok">已公布 · 讲评中</span>
          </div>
          <div class="tv3-card__body">
            <div v-if="!activeQ" style="text-align: center; color: var(--tv3-ink3); padding: 60px 0; font-size: 13px">左侧发题后，这里实时显示作答分布</div>
            <template v-else>
              <div class="tv3-live__options" data-testid="tv3-live-options">
                <div v-for="(o, i) in activeOptions" :key="i" class="tv3-live__opt" :class="{ 'is-top': topIdx === i }">
                  <span class="tv3-live__letter">{{ String.fromCharCode(65 + i) }}</span>
                  <div class="tv3-live__barwrap"><div class="tv3-live__bar" :style="{ width: (dist[i] / Math.max(1, answered)) * 100 + '%' }" /></div>
                  <span class="tv3-live__pct">{{ answered ? Math.round((dist[i] / answered) * 100) : 0 }}%</span>
                  <span v-if="sessionStatus === 'revealed' && activeQ.answer === String.fromCharCode(65 + i)" class="tv3-tag tv3-tag--ok" style="font-size: 10px">正确</span>
                </div>
              </div>
              <div v-if="sessionStatus === 'stopped'" class="tv3-live__reveal" style="border-color: var(--tv3-gold-border, #e5c96a)">
                <span class="tv3-tag tv3-tag--warn">已停止收答 · 答案尚未公布（{{ total - answered }} 人未作答）</span>
                <button class="tv3-btn tv3-btn--sm tv3-btn--gold" @click="revealQuestion">公布答案 → 讲评</button>
              </div>
              <template v-if="sessionStatus === 'revealed'">
                <div class="tv3-live__reveal">
                  <span class="tv3-tag tv3-tag--ok">正确率 {{ correctRate }}%</span>
                  <span class="tv3-tag tv3-tag--warn">易错项 {{ String.fromCharCode(65 + topIdx) }}（{{ dist[topIdx] }} 人）</span>
                  <button class="tv3-btn tv3-btn--sm tv3-btn--gold" @click="$router.push({ path: '/teacher-v3/slides', query: { mode: 'photo' } })">拍照典型错例 → 讲评</button>
                </div>
                <!-- B5 分支卡：系统只建议排序，教师点选才执行 -->
                <div style="margin-top: 12px" data-testid="tv3-branch-cards">
                  <div style="font-size: 11.5px; color: var(--tv3-ink3); margin-bottom: 6px">
                    下一步走向 · <b>由你决定</b>（系统按正确率排序建议；第一张为推荐，点击才执行，不做自动切换）
                  </div>
                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px">
                    <div
                      v-for="(card, bi) in branchCards" :key="card.kind"
                      class="tv3-prep__diffitem" style="padding: 8px 10px"
                      :style="bi === 0 ? { borderColor: 'var(--tv3-gold, #c99735)', background: 'var(--tv3-gold-soft, #fdf6e3)' } : {}"
                      :data-testid="`tv3-branch-${card.kind}`"
                    >
                      <div style="display: flex; gap: 5px; align-items: center">
                        <span v-if="bi === 0" class="tv3-tag tv3-tag--gold" style="font-size: 9.5px">推荐</span>
                        <b style="font-size: 12px">{{ card.label }}</b>
                      </div>
                      <div style="font-size: 10.5px; color: var(--tv3-ink3); margin: 4px 0">触发：{{ card.trigger }} · 约 {{ card.minutes }} 分钟</div>
                      <div style="font-size: 11px; color: var(--tv3-ink2); line-height: 1.55; min-height: 46px">{{ card.action }}</div>
                      <button
                        class="tv3-btn tv3-btn--sm" :class="bi === 0 ? 'tv3-btn--gold' : ''" style="width: 100%"
                        :data-testid="`tv3-branch-run-${card.kind}`" @click="runBranch(card)"
                      >执行此分支</button>
                    </div>
                  </div>
                </div>
              </template>
              <!-- 点名结果 -->
              <div v-if="picked" class="tv3-live__picked" data-testid="tv3-picked">
                🎯 本轮点名：<b>{{ picked }}</b> <span style="color: var(--tv3-ink3); font-size: 11.5px">（剩余 {{ remaining }} 人未点到，全员点完后自动重置）</span>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- 动态演示大屏 -->
      <div class="tv3-card" style="margin-top: 14px">
        <div class="tv3-card__head">
          <span class="tv3-card__title">动态演示</span>
          <span class="tv3-card__sub">课堂大屏 · 学生可扫码跟看 · 图形可拖</span>
          <div class="tv3-card__spacer" />
          <div class="tv3-seg">
            <button v-for="d in demos" :key="d.id" class="tv3-seg__btn" :class="{ 'is-active': demoId === d.id }" @click="demoId = d.id">{{ d.name }}</button>
          </div>
        </div>
        <div class="tv3-card__body" style="display: grid; grid-template-columns: 1fr 320px; gap: 14px">
          <GeoFigure :key="demoId" :preset-id="demoId" :params="demoParams" :interactive="true" :height="360" boxed show-badge @update:params="demoParams = $event" />
          <div>
            <div class="tv3-form-label">当前演示说明</div>
            <div style="font-size: 12.5px; color: var(--tv3-ink2); line-height: 1.8">{{ demoDesc }}</div>
            <div class="tv3-form-label" style="margin-top: 12px">教学建议</div>
            <div style="font-size: 12px; color: var(--tv3-ink3); line-height: 1.8">
              拖动参数滑杆让学生先<b>预测</b>变化，再验证；配合随机点名追问「为什么」。
            </div>
            <button class="tv3-btn tv3-btn--sm tv3-btn--ghost-ai" style="margin-top: 10px" @click="pushToSlides">存入当前课件</button>
          </div>
        </div>
      </div>
    </template>

    <!-- 讲台模式：高对比 · 大字号 · 少操作（响应式投屏视图；Esc 退出） -->
    <div v-if="podiumOpen && session" class="tv3-podium" data-testid="tv3-podium" @keydown.esc="podiumOpen = false" tabindex="0">
      <div style="position: absolute; top: 18px; right: 22px; display: flex; gap: 10px; align-items: center">
        <span style="color: #ffd77a; font-size: 15px; font-weight: 700" data-testid="tv3-podium-clock">{{ activeQ && sessionStatus === 'collecting' ? '⏱ ' + fmtClock(qTimeLeft) : '⏱ ' + fmtClock(elapsedSec) }}</span>
        <span style="color: #9fb4d8; font-size: 14px">{{ session.class_name }} · {{ joinedCount }}/{{ total }} 人</span>
        <button class="tv3-btn tv3-btn--sm" style="background: rgba(255,255,255,.12); color: #fff; border-color: rgba(255,255,255,.3)" data-testid="tv3-podium-exit" @click="podiumOpen = false">退出讲台 (Esc)</button>
      </div>
      <div style="position: absolute; top: 18px; left: 26px">
        <span style="color: #9fb4d8; font-size: 14px">{{ session.topic }}</span>
        <div style="color: #ffd77a; font-size: 20px; font-weight: 800; margin-top: 4px">{{ sessionStatus === 'collecting' ? '● 答题中' : sessionStatus === 'stopped' ? '▪ 已停止' : sessionStatus === 'revealed' ? '◈ 讲评中' : '◦ 等待学生' }}</div>
      </div>
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; padding: 0 6vw">
        <template v-if="activeQ">
          <div style="color: #fff; font-size: clamp(24px, 3.4vw, 44px); font-weight: 800; text-align: center; line-height: 1.4" data-testid="tv3-podium-question" v-html="renderLatex(activeQ.stem_latex)" />
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3vh 4vw; width: 100%; max-width: 1200px; margin-top: 5vh">
            <div v-for="(o, i) in activeOptions" :key="i" style="display: flex; align-items: center; gap: 16px">
              <span style="width: 56px; height: 56px; border-radius: 16px; display: grid; place-items: center; font-size: 26px; font-weight: 800; flex-shrink: 0; background: sessionStatus === 'revealed' && activeQ.answer === String.fromCharCode(65 + i) ? '#1f8a5f' : 'rgba(255,255,255,.14)'; color: #fff">{{ String.fromCharCode(65 + i) }}</span>
              <div style="flex: 1; height: 30px; border-radius: 10px; background: rgba(255,255,255,.12); overflow: hidden">
                <div style="height: 100%; background: linear-gradient(90deg, #3b74cf, #6ea3ff); transition: width .4s" :style="{ width: (dist[i] / Math.max(1, answered)) * 100 + '%' }" />
              </div>
              <span style="color: #fff; font-size: 24px; font-weight: 800; width: 84px; text-align: right">{{ answered ? Math.round((dist[i] / answered) * 100) : 0 }}%</span>
            </div>
          </div>
        </template>
        <div v-else style="color: #cfe0ff; font-size: clamp(22px, 2.6vw, 34px)">左侧发题后，此处大屏显示题目与实时分布</div>
      </div>
      <div style="padding: 24px; display: flex; gap: 16px; justify-content: center; width: 100%">
        <button v-if="activeQ && sessionStatus === 'collecting'" class="tv3-btn tv3-btn--lg" style="background: #c9531f; color: #fff; border: none; font-size: 20px; padding: 16px 38px" data-testid="tv3-podium-stop" @click="stopQuestion">停止作答</button>
        <button v-else-if="activeQ && sessionStatus === 'stopped'" class="tv3-btn tv3-btn--lg" style="background: #1f8a5f; color: #fff; border: none; font-size: 20px; padding: 16px 38px" data-testid="tv3-podium-reveal" @click="revealQuestion">公布答案</button>
        <button class="tv3-btn tv3-btn--lg" style="background: rgba(255,255,255,.14); color: #fff; border: none; font-size: 20px; padding: 16px 38px" @click="pickStudent">🎲 点名</button>
      </div>
    </div>

    <!-- 课堂小结（已结束） -->
    <div v-if="summaryShown && summary" class="tv3-card" style="max-width: 640px; margin: 24px auto" data-testid="tv3-session-summary">
      <div class="tv3-card__head"><span class="tv3-card__title">课堂小结</span><span class="tv3-card__sub">来自本节课堂的确定性数据</span></div>
      <div class="tv3-card__body" style="display: flex; flex-direction: column; gap: 6px; font-size: 13px; line-height: 1.8">
        <div>· 发题 <b>{{ summary.questions }}</b> 题 · 平均正确率 <b>{{ summary.avgCorrectRate }}%</b></div>
        <div>· 最高频错因：<b>{{ summary.topWrong }}</b></div>
        <div v-if="summary.branchesUsed.length">· 分支使用：{{ summary.branchesUsed.join(' → ') }}</div>
        <div>· 课堂时长：约 {{ summary.durationMin }} 分钟</div>
        <div style="display: flex; gap: 8px; margin-top: 8px">
          <button class="tv3-btn tv3-btn--sm tv3-btn--primary" @click="$router.push({ path: '/teacher-v3/insights' })">去学情洞察回流</button>
          <button class="tv3-btn tv3-btn--sm" @click="summaryShown = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ClassroomView —— 课堂互动（B5：确定性状态机 + 讲台模式 + 教师选择的分支卡）
 * 状态机：等待学生 → 答题中 → 已停止 → 讲评中 → 已结束（迁移表见 classroomLogic）
 * 全部作答/加入为确定性演示数据并显著标注；分支卡只排序建议，教师点选才执行。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { v3Api, type V3QuizQuestion } from '@/api/teacherV3'
import { renderLatex } from '@/components/mathx/latex'
import GeoFigure from '@/components/mathx/GeoFigure.vue'
import { useToastStore } from '@/stores/toast'
import type { V3ClassInfo, V3Slide } from '@/types/teacherV3'
import { updateTv3Context, useTv3Context } from '@/stores/teacherContext'
import {
  canTransition, joinSequence, suggestBranch, buildSummary, fmtClock,
  QUESTION_TIME_DEFAULT, QUESTION_TIME_EXTEND, QUESTION_TIME_MAX,
  type BranchCard, type ClassStatus, type SessionSummary,
} from './classroomLogic'

/* toast 惰性获取：setup 顶层实例化会要求测试环境安装 Pinia */
let toast: ReturnType<typeof useToastStore> | null = null
const toastOf = () => (toast ??= useToastStore())
const classes = ref<V3ClassInfo[]>([])
const quizPool = ref<V3QuizQuestion[]>([])
const pickClass = ref('c2-03')
const topicDraft = ref('椭圆及其标准方程 · 习题课')
const session = ref<{ class_name: string; topic: string; started: string } | null>(null)
const sessionStatus = ref<ClassStatus>('idle')
const activeQ = ref<V3QuizQuestion | null>(null)
const dist = ref([0, 0, 0, 0])
const answered = ref(0)
const picked = ref('')
const remaining = ref(0)
const demoId = ref('conic/ellipse')
const demoParams = ref<Record<string, number>>({})
const podiumOpen = ref(false)

/* presence（确定性加入序列） */
const joinedNames = ref<string[]>([])
let joinTimer: number | undefined

/* 限时与续时 */
const qTimeLeft = ref(QUESTION_TIME_DEFAULT)
const extendedTimes = ref(0)
let qTimer: number | undefined
let clockTimer: number | undefined
const elapsedSec = ref(0)

/* 记录与小结 */
const askedRates = ref<number[]>([])
const wrongTags = ref<string[]>([])
const branchesUsed = ref<string[]>([])
const sessionStartedAt = ref(0)
const summaryShown = ref(false)
const summary = ref<SessionSummary | null>(null)

const demos = [
  { id: 'conic/ellipse', name: '椭圆定义', desc: '两定点距离之和为定值 2a：拖动参数观察 a 与 b 的关系，焦点联动，退化为线段的临界时刻是教学关键点。' },
  { id: 'function/sine', name: '正弦三参数', desc: 'y = a·sin(bx+c)：先固定两个参数只动一个，建立「一次只变一件事」的实验意识。' },
  { id: 'solid/cube-section', name: '正方体截面', desc: '三点定面：让学生先猜截面形状（三角/四边/五边/六边），再拖点验证，破除「截面一定是三角形」的迷思。' },
]

const total = computed(() => classes.value.find((c) => c.class_id === pickClass.value)?.students ?? 44)
const joinedCount = computed(() => joinedNames.value.length)
const activeOptions = computed(() => activeQ.value?.options || ['A', 'B', 'C', 'D'])
const topIdx = computed(() => dist.value.indexOf(Math.max(...dist.value)))
const correctRate = computed(() => {
  if (!activeQ.value) return 0
  const ai = activeQ.value.answer.charCodeAt(0) - 65
  return answered.value ? Math.round((dist.value[ai] / answered.value) * 100) : 0
})
const demoDesc = computed(() => demos.find((d) => d.id === demoId.value)?.desc || '')
const diffLabel = (d: string) => ({ easy: '容易', medium: '中等', hard: '较难' } as Record<string, string>)[d] || d
const branchCards = computed(() => suggestBranch(correctRate.value))
const ROSTER = ['王雨桐', '陈子豪', '刘一鸣', '林小满', '赵启铭', '孙浩然', '周可欣', '吴宇轩', '郑好', '冯天佑', '何雨欣', '李嘉明']

onMounted(async () => {
  const [c, q] = await Promise.all([
    v3Api.catalog.classes().then((r) => r.data.items).catch(() => []),
    v3Api.catalog.quizQuestions().then((r) => r.data.items).catch(() => []),
  ])
  classes.value = c
  quizPool.value = q.filter((x) => x.q_type === 'choice').slice(0, 6)
  remaining.value = total.value
})
onBeforeUnmount(() => { clearTimers() })
function clearTimers() {
  for (const t of [joinTimer, qTimer, clockTimer]) if (t) window.clearInterval(t)
}

/* ---------- B6 上下文写入 + 管家快捷动作 ---------- */
const ctxStore = useTv3Context()
watch([session, sessionStatus, joinedCount], () => {
  ctxStore.route = '/teacher-v3/classroom'
  updateTv3Context({
    route: '/teacher-v3/classroom',
    class_name: session.value?.class_name,
    topic: session.value?.topic,
    extra: (session.value ? joinedCount.value + '/' + total.value + ' 人' : '') + (session.value ? ' · ' + sessionStatus.value : ''),
  })
})
function onButlerQuick(ev: Event) {
  const action = (ev as CustomEvent).detail?.action
  if (action === 'podium') podiumOpen.value = true
}
onMounted(() => window.addEventListener('tv3-butler-quick', onButlerQuick as EventListener))

/* ---------- 状态机：所有迁移走 canTransition 校验 ---------- */
function transition(to: ClassStatus) {
  if (!canTransition(sessionStatus.value, to)) return false
  sessionStatus.value = to
  return true
}

function openSession() {
  const cls = classes.value.find((c) => c.class_id === pickClass.value)
  session.value = {
    class_name: cls?.name || '高二(3)班',
    topic: topicDraft.value || '椭圆及其标准方程 · 习题课',
    started: new Date().toTimeString().slice(0, 5),
  }
  sessionStatus.value = 'idle'
  transition('waiting')
  sessionStartedAt.value = Date.now()
  joinedNames.value = []
  askedRates.value = []
  wrongTags.value = []
  branchesUsed.value = []
  summaryShown.value = false
  clockTimer = window.setInterval(() => { elapsedSec.value = Math.floor((Date.now() - sessionStartedAt.value) / 1000) }, 1000)
  /* 确定性加入序列（演示标注见头部徽标） */
  const seq = joinSequence(total.value, ROSTER)
  let i = 0
  joinTimer = window.setInterval(() => {
    if (i >= seq.length) { window.clearInterval(joinTimer); return }
    joinedNames.value.push(seq[i].name)
    i += 1
  }, 260)
}

function endSession() {
  if ((sessionStatus.value === 'collecting') && !window.confirm('正在收答中，确定直接下课？（未公布的作答将不保留）')) return
  transition('ended')
  clearTimers()
  summary.value = buildSummary({
    askedCount: askedRates.value.length,
    rates: askedRates.value,
    wrongTags: wrongTags.value,
    branchesUsed: branchesUsed.value as any,
    elapsedMs: Date.now() - sessionStartedAt.value,
  })
  summaryShown.value = true
  session.value = null
  activeQ.value = null
  podiumOpen.value = false
}

/* ---------- 发题（waiting/stopped/revealed → collecting） ---------- */
function sendQuestion(q: V3QuizQuestion) {
  if (!transition('collecting')) return
  activeQ.value = q
  dist.value = [0, 0, 0, 0]
  answered.value = 0
  qTimeLeft.value = QUESTION_TIME_DEFAULT
  extendedTimes.value = 0
  if (qTimer) window.clearInterval(qTimer)
  const answerIdx = q.answer.charCodeAt(0) - 65
  const nOptions = q.options?.length || 4
  const cap = Math.round(total.value * 0.9)
  const seq = seededSeq(q.id + ':' + q.stem_latex.slice(0, 12), cap, answerIdx, nOptions)
  let cursor = 0
  qTimer = window.setInterval(() => {
    if (sessionStatus.value !== 'collecting') { window.clearInterval(qTimer); return }
    const target = seq[cursor]
    if (target === undefined) { window.clearInterval(qTimer); return }
    dist.value[target] += 1
    answered.value += 1
    cursor += 1
  }, 650)
  /* 限时倒计时：到 0 自动停止（教师可续时），不再依赖人工停 */
  qTimer = window.setInterval(() => {
    if (sessionStatus.value !== 'collecting') { window.clearInterval(qTimer); return }
    qTimeLeft.value -= 1
    if (qTimeLeft.value <= 0) {
      stopQuestion()
      toastOf().info('限时已到：已自动停止收答（可公布答案或续时重发）')
    }
  }, 1000)
  toastOf().success(`已发题：${diffLabel(q.difficulty)} · 限时 ${fmtClock(qTimeLeft.value)}`)
}

function stopQuestion() {
  if (qTimer) window.clearInterval(qTimer)
  if (!transition('stopped')) return
  const ai = activeQ.value ? activeQ.value.answer.charCodeAt(0) - 65 : 0
  askedRates.value.push(answered.value ? Math.round((dist.value[ai] / Math.max(1, answered.value)) * 100) : 0)
  const topWrong = String.fromCharCode(65 + topIdx.value)
  if (topWrong !== activeQ.value?.answer) wrongTags.value.push(`易错项 ${topWrong}`)
}

function revealQuestion() {
  if (!transition('revealed')) return
  toastOf().success(`已公布答案：正确率 ${correctRate.value}%（下方分支卡由你决定走向）`)
}

function extendTime() {
  if (sessionStatus.value !== 'collecting') return
  const next = Math.min(QUESTION_TIME_MAX, qTimeLeft.value + QUESTION_TIME_EXTEND)
  if (next === qTimeLeft.value) { toastOf().info(`已达单题时间上限 ${fmtClock(QUESTION_TIME_MAX)}`); return }
  qTimeLeft.value = next
  extendedTimes.value += 1
  toastOf().info(`已续时 +${QUESTION_TIME_EXTEND}s（当前 ${fmtClock(qTimeLeft.value)}）`)
}

/* ---------- B5 分支卡：建议排序，教师点选执行 ---------- */
function runBranch(card: BranchCard) {
  branchesUsed.value.push(card.kind)
  if (card.demoId) demoId.value = card.demoId
  const pool = quizPool.value.filter((x) => x.id !== activeQ.value?.id)
  const target =
    (card.sendDifficulty === 'hard' && pool.find((x) => x.difficulty === 'hard')) ||
    (card.sendDifficulty === 'easy' && pool.find((x) => x.difficulty === 'easy')) ||
    pool[0]
  toastOf().info(`已执行「${card.label}」：${card.action}（已记入课堂小结）`)
  if (target) {
    window.setTimeout(() => sendQuestion(target), 600)
  }
}

/* ---------- 确定性作答序列（B0） ---------- */
function seededSeq(seedStr: string, len: number, answerIdx: number, nOptions: number): number[] {
  let s = 0
  for (const ch of seedStr) s = (s * 31 + ch.charCodeAt(0)) >>> 0
  const out: number[] = []
  for (let i = 0; i < len; i++) {
    s = (s * 1103515245 + 12345) >>> 0
    const r = (s >>> 8) % 100
    if (r < 55) out.push(answerIdx)
    else out.push((answerIdx + 1 + (r % Math.max(1, nOptions - 1))) % nOptions)
  }
  return out
}

function pickStudent() {
  const names = ROSTER.slice(0, 10)
  if (remaining.value <= 0) remaining.value = total.value
  picked.value = names[Math.floor(Math.random() * names.length)]
  remaining.value -= 1
}

/** 存入当前课件：把当前演示图形作为「课堂演示页」真实写入最近编辑的课件（B0） */
async function pushToSlides() {
  if (!demoId.value) return
  const demoName = demos.find((d) => d.id === demoId.value)?.name || demoId.value
  try {
    const r = await v3Api.decks.list()
    const target = r.data.items?.[0]
    if (!target) { toastOf().error('当前没有课件：请先在课件工坊创建一个课件'); return }
    const stamp = Date.now()
    const slide: V3Slide = {
      id: `cl-${stamp}`,
      layout: 'definition',
      elements: [
        { id: `cle-${stamp}-t`, z: 1, type: 'text', left: 70, top: 44, width: 620, height: 48, html: `课堂演示 · ${demoName}`, font_size: 26, bold: true },
        { id: `cle-${stamp}-g`, z: 2, type: 'geometry', left: 240, top: 120, width: 800, height: 480, preset_id: demoId.value, params: { ...demoParams.value }, teacher_confirmed: false },
        { id: `cle-${stamp}-n`, z: 3, type: 'text', left: 70, top: 500, width: 500, height: 60, html: '来源：课堂互动 · 动态演示（参数为课堂现场值）', font_size: 15, color: '#64748b' },
      ],
    }
    await v3Api.decks.addSlide(target.id, { slide })
    toastOf().success(`已把「课堂演示 · ${demoName}」存入课件《${target.title}》（未确认元素，可编辑）`)
  } catch {
    toastOf().error('存入失败（mock 服务未启动？）')
  }
}

/* Esc 退出讲台 */
watch(podiumOpen, (v) => {
  if (v) window.addEventListener('keydown', onPodiumKey)
  else window.removeEventListener('keydown', onPodiumKey)
})
function onPodiumKey(e: KeyboardEvent) { if (e.key === 'Escape') podiumOpen.value = false }
onBeforeUnmount(() => window.removeEventListener('keydown', onPodiumKey))
</script>

<style scoped>
.tv3-podium {
  position: fixed; inset: 0; z-index: 1500;
  background: radial-gradient(1200px 700px at 50% 30%, #123a6d, #071a35 75%);
  display: flex; flex-direction: column; align-items: center;
  outline: none;
}
</style>
