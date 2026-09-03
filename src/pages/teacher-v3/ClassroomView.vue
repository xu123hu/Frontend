<template>
  <div data-testid="tv3-classroom">
    <!-- 未开课 -->
    <div v-if="!session" class="tv3-card" style="max-width: 640px; margin: 40px auto; text-align: center; padding: 40px">
      <div style="font-size: 44px; margin-bottom: 10px">🎓</div>
      <div style="font-size: 18px; font-weight: 800; margin-bottom: 6px">课堂互动</div>
      <div style="font-size: 13px; color: var(--tv3-ink3); margin-bottom: 20px">发题 · 实时作答分布 · 随机点名 · 动态演示大屏</div>
      <div style="display: flex; gap: 10px; justify-content: center; align-items: center">
        <select v-model="pickClass" class="tv3-input" style="width: 160px">
          <option v-for="c in classes" :key="c.class_id" :value="c.class_id">{{ c.name }}</option>
        </select>
        <button class="tv3-btn tv3-btn--primary" data-testid="tv3-open-session" @click="openSession">开课</button>
      </div>
    </div>

    <!-- 课堂中 -->
    <template v-else>
      <div class="tv3-card" style="margin-bottom: 14px">
        <div class="tv3-card__head">
          <span class="tv3-pulse-dot tv3-tag tv3-tag--ok">● 进行中</span>
          <span class="tv3-card__title">{{ session.class_name }} · {{ session.topic }}</span>
          <span class="tv3-card__sub">{{ session.started }}</span>
          <div class="tv3-card__spacer" />
          <button class="tv3-btn tv3-btn--sm" data-testid="tv3-pick-student" @click="pickStudent">🎲 随机点名</button>
          <button class="tv3-btn tv3-btn--sm tv3-btn--danger" @click="session = null">下课</button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1.4fr; gap: 14px; align-items: start">
        <!-- 发题 -->
        <div class="tv3-card">
          <div class="tv3-card__head"><span class="tv3-card__title">发题</span><span class="tv3-card__sub">题干公式结构化推送</span></div>
          <div class="tv3-card__body" style="display: flex; flex-direction: column; gap: 8px">
            <div
              v-for="q in quizPool" :key="q.id"
              class="tv3-row" :class="{ 'is-selected': activeQ?.id === q.id }" style="cursor: pointer; align-items: flex-start"
              @click="sendQuestion(q)"
            >
              <span class="tv3-tag" :class="q.difficulty === 'hard' ? 'tv3-tag--danger' : q.difficulty === 'medium' ? 'tv3-tag--warn' : 'tv3-tag--ok'">{{ diffLabel(q.difficulty) }}</span>
              <div style="flex: 1; min-width: 0">
                <div style="font-size: 12.5px; line-height: 1.5" v-html="renderLatex(q.stem_latex)" />
                <div v-if="q.options" style="font-size: 11.5px; color: var(--tv3-ink3); margin-top: 2px">{{ q.options.length }} 个选项</div>
              </div>
              <span v-if="activeQ?.id === q.id" class="tv3-tag tv3-tag--gold tv3-pulse-dot">答题中</span>
            </div>
          </div>
        </div>

        <!-- 实时分布 -->
        <div class="tv3-card">
          <div class="tv3-card__head">
            <span class="tv3-card__title">实时作答分布</span>
            <span class="tv3-card__sub" data-testid="tv3-live-count">{{ answered }} / {{ total }} 已作答</span>
            <div class="tv3-card__spacer" />
            <button v-if="activeQ" class="tv3-btn tv3-btn--sm" data-testid="tv3-close-q" @click="closeQuestion">停止作答</button>
          </div>
          <div class="tv3-card__body">
            <div v-if="!activeQ" style="text-align: center; color: var(--tv3-ink3); padding: 60px 0; font-size: 13px">左侧发题后，这里实时显示作答分布</div>
            <template v-else>
              <div class="tv3-live__options" data-testid="tv3-live-options">
                <div v-for="(o, i) in activeOptions" :key="i" class="tv3-live__opt" :class="{ 'is-top': topIdx === i }">
                  <span class="tv3-live__letter">{{ String.fromCharCode(65 + i) }}</span>
                  <div class="tv3-live__barwrap"><div class="tv3-live__bar" :style="{ width: (dist[i] / Math.max(1, answered)) * 100 + '%' }" /></div>
                  <span class="tv3-live__pct">{{ answered ? Math.round((dist[i] / answered) * 100) : 0 }}%</span>
                  <span v-if="activeQ.answer === String.fromCharCode(65 + i)" class="tv3-tag tv3-tag--ok" style="font-size: 10px">正确</span>
                </div>
              </div>
              <div v-if="closed" class="tv3-live__reveal">
                <span class="tv3-tag tv3-tag--ok">正确率 {{ correctRate }}%</span>
                <span class="tv3-tag tv3-tag--warn">易错项 {{ String.fromCharCode(65 + topIdx) }}（{{ dist[topIdx] }} 人）</span>
                <button class="tv3-btn tv3-btn--sm tv3-btn--gold" @click="$router.push('/teacher-v3/slides')">拍照典型错例 → 讲评</button>
              </div>
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
  </div>
</template>

<script setup lang="ts">
/**
 * ClassroomView —— 课堂互动
 * 开课 → 发题（题干公式化）→ 实时分布（本地模拟学生作答流入）→ 停止作答公布正确率
 * 随机点名（全员轮询）· 动态演示大屏（GeoFigure 交互 + 参数滑杆）
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { v3Api, type V3QuizQuestion } from '@/api/teacherV3'
import { renderLatex } from '@/components/mathx/latex'
import GeoFigure from '@/components/mathx/GeoFigure.vue'
import type { V3ClassInfo } from '@/types/teacherV3'

const classes = ref<V3ClassInfo[]>([])
const quizPool = ref<V3QuizQuestion[]>([])
const pickClass = ref('c2-03')
const session = ref<{ class_name: string; topic: string; started: string } | null>(null)
const activeQ = ref<V3QuizQuestion | null>(null)
const dist = ref([0, 0, 0, 0])
const answered = ref(0)
const closed = ref(false)
const picked = ref('')
const remaining = ref(0)
const demoId = ref('conic/ellipse')
const demoParams = ref<Record<string, number>>({})

const demos = [
  { id: 'conic/ellipse', name: '椭圆定义', desc: '两定点距离之和为定值 2a：拖动参数观察 a 与 b 的关系，焦点联动，退化为线段的临界时刻是教学关键点。' },
  { id: 'function/sine', name: '正弦三参数', desc: 'y = a·sin(bx+c)：先固定两个参数只动一个，建立「一次只变一件事」的实验意识。' },
  { id: 'solid/cube-section', name: '正方体截面', desc: '三点定面：让学生先猜截面形状（三角/四边/五边/六边），再拖点验证，破除「截面一定是三角形」的迷思。' },
]

let timer: number | undefined

const total = computed(() => classes.value.find((c) => c.class_id === pickClass.value)?.students ?? 44)
const activeOptions = computed(() => activeQ.value?.options || ['A', 'B', 'C', 'D'])
const topIdx = computed(() => dist.value.indexOf(Math.max(...dist.value)))
const correctRate = computed(() => {
  if (!activeQ.value) return 0
  const ai = activeQ.value.answer.charCodeAt(0) - 65
  return answered.value ? Math.round((dist.value[ai] / answered.value) * 100) : 0
})
const demoDesc = computed(() => demos.find((d) => d.id === demoId.value)?.desc || '')
const diffLabel = (d: string) => ({ easy: '容易', medium: '中等', hard: '较难' } as Record<string, string>)[d] || d

onMounted(async () => {
  const [c, q] = await Promise.all([
    v3Api.catalog.classes().then((r) => r.data.items).catch(() => []),
    v3Api.catalog.quizQuestions().then((r) => r.data.items).catch(() => []),
  ])
  classes.value = c
  quizPool.value = q.filter((x) => x.q_type === 'choice').slice(0, 6)
  remaining.value = total.value
})
onBeforeUnmount(() => { if (timer) window.clearInterval(timer) })

function openSession() {
  const cls = classes.value.find((c) => c.class_id === pickClass.value)
  session.value = {
    class_name: cls?.name || '高二(3)班',
    topic: '椭圆及其标准方程 · 习题课',
    started: new Date().toTimeString().slice(0, 5),
  }
}

function sendQuestion(q: V3QuizQuestion) {
  activeQ.value = q
  dist.value = [0, 0, 0, 0]
  answered.value = 0
  closed.value = false
  if (timer) window.clearInterval(timer)
  timer = window.setInterval(() => {
    if (closed.value) return
    if (answered.value >= Math.round(total.value * 0.9)) return
    answered.value += 1
    const bias = q.answer.charCodeAt(0) - 65
    const w = [0.28, 0.3, 0.24, 0.18]
    w[bias] += 0.18
    const r = Math.random()
    let acc = 0
    for (let i = 0; i < 4; i++) {
      acc += w[i]
      if (r <= acc) { dist.value[i] += 1; break }
    }
  }, 700)
}

function closeQuestion() {
  closed.value = true
  if (timer) window.clearInterval(timer)
}

function pickStudent() {
  const names = ['王雨桐', '陈子豪', '刘一鸣', '林小满', '赵启铭', '孙浩然', '周可欣', '吴宇轩', '郑好', '冯天佑']
  if (remaining.value <= 0) remaining.value = total.value
  picked.value = names[Math.floor(Math.random() * names.length)]
  remaining.value -= 1
}

function pushToSlides() { /* 存入课件走任务链路，mock 直接成功 */ }
</script>

<style scoped>
.tv3-live__options { display: flex; flex-direction: column; gap: 10px; }
.tv3-live__opt { display: flex; align-items: center; gap: 10px; }
.tv3-live__letter {
  width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0;
  background: var(--tv3-bg2); color: var(--tv3-ink2); font-weight: 700;
  display: grid; place-items: center; font-size: 13px;
}
.tv3-live__opt.is-top .tv3-live__letter { background: var(--tv3-navy); color: #fff; }
.tv3-live__barwrap { flex: 1; height: 26px; border-radius: 8px; background: var(--tv3-bg2); overflow: hidden; }
.tv3-live__bar { height: 100%; border-radius: 8px; background: linear-gradient(90deg, var(--tv3-primary), #3b74cf); transition: width 0.5s ease; }
.tv3-live__opt.is-top .tv3-live__bar { background: linear-gradient(90deg, var(--tv3-gold-deep), var(--tv3-gold)); }
.tv3-live__pct { font-family: var(--tv3-font-num); font-size: 13px; font-weight: 700; width: 42px; text-align: right; }
.tv3-live__reveal { display: flex; align-items: center; gap: 10px; margin-top: 14px; padding-top: 12px; border-top: 1px dashed var(--tv3-line); }
.tv3-live__picked { margin-top: 12px; font-size: 13.5px; padding: 10px 12px; border-radius: 10px; background: var(--tv3-gold-soft); border: 1px solid var(--tv3-gold-border); }
</style>
