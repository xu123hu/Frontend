<template>
  <div id="tv2-prep" class="tv2-prep">
    <!-- 步骤条 -->
    <div class="tv2-card tv2-prep__steps">
      <div class="tv2-card__body tv2-steps">
        <div v-for="(s, i) in stepNames" :key="s" class="tv2-step" :class="{ 'is-active': step === i + 1, 'is-done': step > i + 1 }" @click="goStep(i + 1)">
          <span class="tv2-step__no">{{ step > i + 1 ? '✓' : i + 1 }}</span>{{ s }}
          <span v-if="i < stepNames.length - 1" class="tv2-step__arrow">→</span>
        </div>
      </div>
    </div>

    <!-- 生成进度条 -->
    <div v-if="generating" class="tv2-card tv2-prep__genstate">
      <div class="tv2-card__body" style="display: flex; align-items: center; gap: 14px">
        <span class="tv2-ai-badge">✦ AI 生成中</span>
        <div class="tv2-progress" style="flex: 1">
          <div class="tv2-progress__bar tv2-progress__bar--ai" :style="{ width: genProgress + '%' }" />
        </div>
        <span class="tv2-prep__genlabel">{{ genLabel }}</span>
      </div>
    </div>

    <!-- Step 1 课题 -->
    <div v-if="step === 1" class="tv2-card tv2-prep__form tv2-fade-up">
      <!-- 已有教案：继续编辑 -->
      <div v-if="myPlans.length" class="tv2-prep__mine">
        <span class="tv2-prep__mine-label">我的教案</span>
        <button
          v-for="p in myPlans" :key="p.plan_id"
          class="tv2-prep__mine-chip" type="button" :data-testid="`tv2-plan-${p.plan_id}`" @click="openPlan(p.plan_id)"
        >
          <span class="tv2-prep__mine-topic">{{ p.topic }}</span>
          <span class="tv2-tag" :class="p.status === 'confirmed' ? 'tv2-tag--ok' : 'tv2-tag--slate'">{{ p.status === 'confirmed' ? '已定稿' : '草稿' }}</span>
          <span class="tv2-prep__mine-cls">{{ p.class_name }}</span>
        </button>
      </div>
      <div class="tv2-card__head"><div class="tv2-card__title">选择课题与班级</div><div class="tv2-card__sub">AI 将结合班级学情数据生成教学设计</div></div>
      <div class="tv2-card__body">
        <div class="tv2-form-row">
          <label class="tv2-form-label">课题</label>
          <input v-model="form.topic" class="tv2-input" type="text" placeholder="如：3.1.1 椭圆的标准方程（第 1 课时）" data-testid="tv2-prep-topic" />
        </div>
        <div class="tv2-form-row">
          <label class="tv2-form-label">班级</label>
          <div class="tv2-seg">
            <button v-for="c in classes" :key="c.class_id" class="tv2-seg__item" :class="{ 'is-active': form.class_id === c.class_id }" type="button" @click="form.class_id = c.class_id">
              {{ c.class_name }}<span class="tv2-seg__sub">{{ c.student_count }} 人</span>
            </button>
          </div>
        </div>
        <div class="tv2-form-row">
          <label class="tv2-form-label">课型</label>
          <div class="tv2-seg">
            <button v-for="t in lessonTypes" :key="t" class="tv2-seg__item" :class="{ 'is-active': form.lesson_type === t }" type="button" @click="form.lesson_type = t">{{ t }}</button>
          </div>
        </div>
        <div class="tv2-form-row">
          <label class="tv2-form-label">课时</label>
          <div class="tv2-seg">
            <button v-for="d in [40, 45, 90]" :key="d" class="tv2-seg__item" :class="{ 'is-active': form.duration === d }" type="button" @click="form.duration = d">{{ d }} 分钟</button>
          </div>
        </div>

        <div class="tv2-prep__basis">
          <span class="tv2-ai-badge">✦ 学情驱动</span>
          <span class="tv2-prep__basis-text">{{ basisPreview }}</span>
        </div>

        <div class="tv2-prep__submit">
          <button class="tv2-btn tv2-btn--ai tv2-btn--lg" type="button" :disabled="!form.topic.trim() || generating" data-testid="tv2-prep-generate" @click="generate">
            ✦ 生成教学设计
          </button>
          <span class="tv2-prep__hint">预计 6 秒 · 生成过程逐环节呈现，可随时打断编辑</span>
        </div>
      </div>
    </div>

    <!-- Step 2 大纲 -->
    <div v-else-if="step === 2" class="tv2-prep__outline tv2-fade-up">
      <div v-if="plan?.design_basis" class="tv2-card tv2-prep__basis-card">
        <div class="tv2-card__head">
          <div class="tv2-card__title"><span class="tv2-ai-badge">✦ 设计依据</span>{{ plan.design_basis.text }}</div>
        </div>
        <div class="tv2-card__body tv2-prep__basis-evidence">
          <div v-for="(ev, i) in plan.design_basis.evidence" :key="i" class="tv2-prep__ev">
            <div class="tv2-prep__ev-label">{{ ev.label }}</div>
            <div class="tv2-prep__ev-value">{{ ev.value }}</div>
            <div class="tv2-prep__ev-detail">{{ ev.detail }}</div>
          </div>
        </div>
      </div>

      <div class="tv2-card">
        <div class="tv2-card__head">
          <div class="tv2-card__title">教学大纲</div>
          <div class="tv2-card__sub">{{ outline.length }} 个环节 · 合计 {{ outlineMinutes }} / {{ plan?.duration_minutes }} 分钟</div>
        </div>
        <div class="tv2-card__body tv2-prep__outline-grid">
          <div v-for="(o, i) in outline" :key="o.id" class="tv2-prep__ocard tv2-fade-up" :style="{ animationDelay: i * 0.04 + 's' }">
            <div class="tv2-prep__ocard-kind" :class="'k-' + (i % 4)">{{ o.kind }}</div>
            <div class="tv2-prep__ocard-title">{{ o.title }}</div>
            <p class="tv2-prep__ocard-summary">{{ o.summary }}</p>
            <div class="tv2-prep__ocard-foot">
              <span class="tv2-prep__ocard-min">{{ o.minutes }}′</span>
            </div>
          </div>
          <div v-if="generating" class="tv2-prep__ocard tv2-prep__ocard--loading">
            <span class="tv2-pulse-dot">●●●</span> 环节细化中{{ sectionsDone ? ` ${sectionsDone}/8` : '…' }}
          </div>
        </div>
        <div class="tv2-card__body" style="padding-top: 0">
          <button class="tv2-btn tv2-btn--primary" type="button" :disabled="generating" @click="step = 3">进入环节细化 →</button>
        </div>
      </div>
    </div>

    <!-- Step 3 环节细化 -->
    <div v-else-if="step === 3 && plan" class="tv2-card tv2-fade-up">
      <div class="tv2-card__head">
        <div class="tv2-card__title">环节时间轴</div>
        <div class="tv2-card__sub">可编辑时长与活动 · 合计 <b :class="{ 'is-over': totalMinutes !== plan.duration_minutes }">{{ totalMinutes }} / {{ plan.duration_minutes }} 分钟</b></div>
      </div>
      <div class="tv2-card__body">
        <div class="tv2-prep__sections">
          <div v-for="(s, i) in plan.sections" :key="s.id" class="tv2-prep__sec">
            <div class="tv2-prep__sec-rail">
              <span class="tv2-prep__sec-no">{{ i + 1 }}</span>
              <span class="tv2-prep__sec-line" :style="{ height: (s.minutes * 6) + 'px' }" />
            </div>
            <div class="tv2-prep__sec-body">
              <div class="tv2-prep__sec-head">
                <span class="tv2-prep__sec-phase">{{ s.phase }}</span>
                <input v-model.number="s.minutes" class="tv2-prep__min" type="number" min="1" max="30" /> 分钟
                <span class="tv2-prep__sec-intent" :title="s.design_intent">💡 {{ s.design_intent }}</span>
              </div>
              <div class="tv2-prep__sec-cols">
                <div class="tv2-prep__sec-col">
                  <div class="tv2-prep__sec-label">教师活动</div>
                  <textarea v-model="s.teacher_activity" class="tv2-textarea" rows="3" />
                </div>
                <div class="tv2-prep__sec-col">
                  <div class="tv2-prep__sec-label">学生活动</div>
                  <textarea v-model="s.student_activity" class="tv2-textarea" rows="3" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="tv2-prep__sec-actions">
          <button class="tv2-btn" type="button" @click="step = 2">← 返回大纲</button>
          <button class="tv2-btn tv2-btn--primary" type="button" :disabled="totalMinutes !== plan.duration_minutes" @click="saveAndPreview">
            保存并预览成稿 →
          </button>
          <span v-if="totalMinutes !== plan.duration_minutes" class="tv2-prep__minwarn">时长合计需等于 {{ plan.duration_minutes }} 分钟（当前 {{ totalMinutes }}）</span>
        </div>
      </div>
    </div>

    <!-- Step 4 成稿 -->
    <div v-else-if="step === 4 && plan" class="tv2-prep__final tv2-fade-up">
      <div class="tv2-prep__final-main">
        <section class="tv2-card">
          <div class="tv2-card__head">
            <div class="tv2-card__title">{{ plan.topic }}</div>
            <div class="tv2-card__sub">{{ plan.class_name }} · {{ plan.lesson_type }} · {{ plan.duration_minutes }} 分钟</div>
            <span v-if="plan.status === 'confirmed'" class="tv2-tag tv2-tag--ok">已定稿</span>
            <span v-else class="tv2-tag tv2-tag--warn">草稿 v{{ plan.version }}</span>
          </div>
          <div class="tv2-card__body">
            <div class="tv2-prep__final-grid">
              <div>
                <div class="tv2-prep__f-label">教学目标</div>
                <ol class="tv2-prep__f-list"><li v-for="o in plan.objectives" :key="o">{{ o }}</li></ol>
                <div class="tv2-prep__f-label">重点 / 难点</div>
                <p class="tv2-prep__f-text"><b>重点：</b>{{ plan.key_point }}</p>
                <p class="tv2-prep__f-text"><b>难点：</b>{{ plan.difficulty_point }}</p>
                <div class="tv2-prep__f-label">板书设计</div>
                <pre class="tv2-prep__f-board">{{ plan.board_design }}</pre>
                <div class="tv2-prep__f-label">分层作业</div>
                <div v-for="h in plan.homework" :key="h.tier" class="tv2-prep__f-hw">
                  <span class="tv2-tag tv2-tag--info">{{ h.tier }}</span>{{ h.items.join('；') }}
                </div>
                <div class="tv2-prep__f-label">引用来源</div>
                <div class="tv2-source-ref" v-for="c in plan.citations" :key="c.title"><b>{{ c.kind }}</b> · {{ c.title }} {{ c.page }}</div>
                <div class="tv2-ai-badge" style="margin-top: 8px">✦ 本教案由 AI 生成 · 教师可编辑 · 引用来源如上</div>
              </div>
              <div>
                <div class="tv2-prep__f-label">环节速览</div>
                <div class="tv2-prep__f-sec" v-for="s in plan.sections" :key="s.id">
                  <b>{{ s.phase }}</b><span>{{ s.minutes }}′</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <aside class="tv2-prep__final-side">
        <section class="tv2-card">
          <div class="tv2-card__head"><div class="tv2-card__title">质量自检</div><span class="tv2-tag" :class="checkPass ? 'tv2-tag--ok' : 'tv2-tag--err'">{{ checkPassCount }}/{{ plan.quality_check.length }}</span></div>
          <div class="tv2-card__body">
            <div v-for="c in plan.quality_check" :key="c.item" class="tv2-prep__check" :class="{ 'is-pass': c.pass }">
              <span class="tv2-prep__check-icon">{{ c.pass ? '✓' : '✕' }}</span>{{ c.item }}
            </div>
          </div>
        </section>

        <section class="tv2-card">
          <div class="tv2-card__body tv2-prep__final-actions">
            <button v-if="plan.status !== 'confirmed'" class="tv2-btn tv2-btn--primary tv2-btn--lg" type="button" data-testid="tv2-prep-confirm" @click="confirmPlan">定稿教案</button>
            <template v-else>
              <button class="tv2-btn tv2-btn--ai tv2-btn--lg" type="button" data-testid="tv2-prep-to-slides" @click="toSlides">✦ 生成课件</button>
              <button class="tv2-btn" type="button" @click="toQuiz">顺便出一份变式卷</button>
            </template>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { v2Api } from '@/api/teacherV2'
import { useToastStore } from '@/stores/toast'
import type { V2LessonOutlineItem, V2LessonPlan } from '@/types/teacherV2'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const stepNames = ['选定课题', '生成大纲', '环节细化', '成稿定稿']
const lessonTypes = ['新授课', '复习课', '习题课', '讲评课']
const classes = [
  { class_id: 'cls-g2-3', class_name: '高二 3 班', student_count: 46 },
  { class_id: 'cls-g2-5', class_name: '高二 5 班', student_count: 44 },
]

const step = ref(1)
const generating = ref(false)
const genProgress = ref(0)
const genLabel = ref('')
const outline = ref<V2LessonOutlineItem[]>([])
const sectionsDone = ref(0)
const plan = ref<any>(null)

const form = ref({
  topic: '3.1.1 椭圆的标准方程（第 1 课时）',
  class_id: 'cls-g2-3',
  lesson_type: '新授课',
  duration: 45,
})

const basisPreview = computed(() => form.value.class_id === 'cls-g2-3'
  ? '高二 3 班「椭圆的概念」预习错误率 40%，重难点将向定义条件辨析倾斜'
  : '高二 5 班「函数的单调性」错误率 22%，证明步骤缺失占 45%')

const outlineMinutes = computed(() => outline.value.reduce((s, o) => s + o.minutes, 0))
const totalMinutes = computed(() => (plan.value?.sections || []).reduce((s: number, x: any) => s + (Number(x.minutes) || 0), 0))
const checkPassCount = computed(() => plan.value?.quality_check?.filter((c: any) => c.pass).length || 0)
const checkPass = computed(() => checkPassCount.value === (plan.value?.quality_check?.length || 0))

function goStep(n: number) {
  if (n <= step.value || (plan.value && n <= 4)) step.value = n
}

async function generate() {
  generating.value = true
  genProgress.value = 4
  genLabel.value = '理解课题与班级学情…'
  outline.value = []
  sectionsDone.value = 0
  step.value = 2

  v2Api.generatePlan({ topic: form.value.topic, class_id: form.value.class_id }, (event, data) => {
    if (event === 'meta') {
      genProgress.value = 12
      genLabel.value = '生成设计依据与大纲…'
    } else if (event === 'outline') {
      outline.value = data.outline
      genProgress.value = 35
      genLabel.value = '逐环节细化中…'
    } else if (event === 'section') {
      sectionsDone.value = data.index
      genProgress.value = 35 + Math.round((data.index / data.total) * 55)
      genLabel.value = `环节 ${data.index}/${data.total} · ${data.section.phase}`
    } else if (event === 'done') {
      plan.value = data.plan
      if (!outline.value.length) outline.value = data.plan.outline
      genProgress.value = 100
      genLabel.value = '生成完成'
      generating.value = false
      toast.success('教案初稿已生成，请进入环节细化核对')
    }
  }).finished.catch(() => {
    generating.value = false
    toast.error('生成中断，请重试')
  })
}

async function saveAndPreview() {
  if (!plan.value) return
  try {
    const res = await v2Api.patchPlan(plan.value.plan_id, plan.value.version, { sections: plan.value.sections })
    plan.value = res.data
    step.value = 4
  } catch (e: any) {
    toast.error(e?.message || '保存失败')
  }
}

async function confirmPlan() {
  if (!plan.value) return
  const res = await v2Api.confirmPlan(plan.value.plan_id)
  plan.value = res.data
  toast.success('教案已定稿，可直接生成课件')
}

const toSlides = () => router.push({ path: '/teacher-v2/slides', query: { plan: plan.value.plan_id, generate: '1' } })
const toQuiz = () => router.push({ path: '/teacher-v2/quiz', query: { kp: 'KP-TY,KP-BZ' } })

const myPlans = ref<V2LessonPlan[]>([])

async function openPlan(id: string) {
  try {
    const res = await v2Api.plan(id)
    plan.value = res.data
    outline.value = res.data.outline
    step.value = 4
  } catch (e: any) {
    toast.error(e?.message || '教案加载失败')
  }
}

onMounted(async () => {
  try {
    const res = await v2Api.plans()
    myPlans.value = res.data.items
  } catch { /* 教案列表失败不阻塞新建流程 */ }
  const planId = route.query.plan as string
  if (planId) {
    try {
      const res = await v2Api.plan(planId)
      plan.value = res.data
      outline.value = res.data.outline
      step.value = 4
    } catch { /* 保持新建流程 */ }
  }
})
</script>

<style scoped>
.tv2-prep { display: flex; flex-direction: column; gap: 16px; }
.tv2-prep__mine { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; padding: 14px 18px 0; }
.tv2-prep__mine-label { font-size: 12px; color: var(--tv2-ink3); font-weight: 600; flex-shrink: 0; }
.tv2-prep__mine-chip {
  display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--tv2-line); background: var(--tv2-card);
  border-radius: 999px; padding: 5px 13px; font-size: 12.5px; color: var(--tv2-ink2); cursor: pointer; transition: all .12s;
}
.tv2-prep__mine-chip:hover { border-color: var(--tv2-primary); color: var(--tv2-primary); background: var(--tv2-primary-soft); }
.tv2-prep__mine-topic { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tv2-prep__mine-cls { font-size: 11px; color: var(--tv2-ink3); }
.tv2-prep__steps .tv2-steps { justify-content: space-between; }
.tv2-prep__steps .tv2-step { cursor: default; }
.tv2-prep__genlabel { font-size: 12.5px; color: var(--tv2-ai); font-weight: 600; white-space: nowrap; }

.tv2-form-row { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 18px; }
.tv2-form-label { width: 64px; flex-shrink: 0; font-size: 13px; font-weight: 600; color: var(--tv2-ink2); padding-top: 8px; }
.tv2-input {
  flex: 1; border: 1px solid var(--tv2-line); border-radius: 9px; padding: 9px 13px; font-size: 13.5px; outline: none;
}
.tv2-input:focus { border-color: var(--tv2-primary); box-shadow: 0 0 0 3px var(--tv2-primary-soft); }
.tv2-seg { display: flex; gap: 8px; flex-wrap: wrap; flex: 1; }
.tv2-seg__item {
  border: 1px solid var(--tv2-line); background: var(--tv2-card); border-radius: 9px; padding: 8px 15px;
  font-size: 13px; cursor: pointer; transition: all 0.15s; color: var(--tv2-ink2);
}
.tv2-seg__item:hover { border-color: var(--tv2-primary-border); }
.tv2-seg__item.is-active { background: var(--tv2-primary-soft); border-color: var(--tv2-primary); color: var(--tv2-primary); font-weight: 600; }
.tv2-seg__sub { font-size: 11px; color: var(--tv2-ink3); margin-left: 5px; }
.tv2-prep__basis { display: flex; align-items: center; gap: 11px; background: var(--tv2-ai-soft); border: 1px dashed var(--tv2-ai-border); border-radius: 10px; padding: 11px 14px; }
.tv2-prep__basis-text { font-size: 12.5px; color: var(--tv2-ai-deep); }
.tv2-prep__submit { display: flex; align-items: center; gap: 14px; margin-top: 20px; }
.tv2-prep__hint { font-size: 12px; color: var(--tv2-ink3); }

.tv2-prep__basis-card { border-left: 3px solid var(--tv2-ai); }
.tv2-prep__basis-evidence { display: flex; gap: 12px; flex-wrap: wrap; }
.tv2-prep__ev { flex: 1; min-width: 200px; background: var(--tv2-bg2); border-radius: 9px; padding: 10px 13px; }
.tv2-prep__ev-label { font-size: 11.5px; color: var(--tv2-ink3); }
.tv2-prep__ev-value { font-size: 19px; font-weight: 800; color: var(--tv2-rose); font-family: var(--tv2-font-num); margin: 2px 0; }
.tv2-prep__ev-detail { font-size: 11.5px; color: var(--tv2-ink2); }

.tv2-prep__outline-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; }
.tv2-prep__ocard { border: 1px solid var(--tv2-line); border-radius: var(--tv2-radius); padding: 12px 14px; position: relative; background: var(--tv2-card); }
.tv2-prep__ocard--loading { display: grid; place-items: center; color: var(--tv2-ai); font-size: 12.5px; min-height: 120px; border-style: dashed; }
.tv2-prep__ocard-kind {
  display: inline-block; font-size: 11px; font-weight: 700; border-radius: 6px; padding: 2px 8px; margin-bottom: 7px;
}
.tv2-prep__ocard-kind.k-0 { background: var(--tv2-primary-soft); color: var(--tv2-primary); }
.tv2-prep__ocard-kind.k-1 { background: var(--tv2-teal-soft); color: var(--tv2-teal); }
.tv2-prep__ocard-kind.k-2 { background: var(--tv2-amber-soft); color: var(--tv2-amber); }
.tv2-prep__ocard-kind.k-3 { background: var(--tv2-ai-soft); color: var(--tv2-ai); }
.tv2-prep__ocard-title { font-size: 13.5px; font-weight: 700; }
.tv2-prep__ocard-summary { font-size: 12px; color: var(--tv2-ink2); line-height: 1.6; margin: 6px 0 8px; }
.tv2-prep__ocard-foot { display: flex; justify-content: flex-end; }
.tv2-prep__ocard-min { font-size: 13px; font-weight: 800; color: var(--tv2-primary); font-family: var(--tv2-font-num); }

.tv2-prep__sections { display: flex; flex-direction: column; }
.tv2-prep__sec { display: flex; gap: 14px; }
.tv2-prep__sec-rail { display: flex; flex-direction: column; align-items: center; }
.tv2-prep__sec-no {
  width: 26px; height: 26px; border-radius: 50%; background: var(--tv2-primary-soft); color: var(--tv2-primary);
  display: grid; place-items: center; font-size: 12px; font-weight: 800; font-family: var(--tv2-font-num); flex-shrink: 0;
}
.tv2-prep__sec-line { width: 2px; background: var(--tv2-line); margin: 4px 0; }
.tv2-prep__sec:last-child .tv2-prep__sec-line { display: none; }
.tv2-prep__sec-body { flex: 1; padding-bottom: 18px; min-width: 0; }
.tv2-prep__sec-head { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.tv2-prep__sec-phase { font-size: 14px; font-weight: 700; }
.tv2-prep__min { width: 52px; border: 1px solid var(--tv2-line); border-radius: 7px; padding: 3px 7px; font-size: 12.5px; text-align: center; font-family: var(--tv2-font-num); outline: none; }
.tv2-prep__sec-intent { font-size: 11.5px; color: var(--tv2-ink3); }
.tv2-prep__sec-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
.tv2-prep__sec-label { font-size: 11px; color: var(--tv2-ink3); margin-bottom: 4px; font-weight: 600; }
.tv2-textarea {
  width: 100%; box-sizing: border-box; border: 1px solid var(--tv2-line); border-radius: 8px; padding: 8px 11px;
  font-size: 12.5px; line-height: 1.6; resize: vertical; outline: none; font-family: inherit; background: var(--tv2-card); color: var(--tv2-ink);
}
.tv2-textarea:focus { border-color: var(--tv2-primary); }
.tv2-prep__sec-actions { display: flex; align-items: center; gap: 12px; }
.tv2-prep__minwarn { font-size: 12px; color: var(--tv2-rose); font-weight: 600; }

.tv2-prep__final { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start; }
.tv2-prep__final-grid { display: grid; grid-template-columns: minmax(0, 1fr) 240px; gap: 20px; }
.tv2-prep__f-label { font-size: 12px; font-weight: 700; color: var(--tv2-ink3); margin: 14px 0 7px; letter-spacing: 0.5px; }
.tv2-prep__f-list { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.75; color: var(--tv2-ink); }
.tv2-prep__f-text { font-size: 13px; line-height: 1.65; color: var(--tv2-ink2); margin: 4px 0; }
.tv2-prep__f-board { background: var(--tv2-bg2); border-radius: 9px; padding: 11px 14px; font-size: 12.5px; line-height: 1.8; font-family: inherit; white-space: pre-wrap; }
.tv2-prep__f-hw { display: flex; align-items: baseline; gap: 8px; font-size: 12.5px; color: var(--tv2-ink2); margin: 6px 0; }
.tv2-prep__f-sec { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--tv2-ink2); padding: 6px 0; border-bottom: 1px dashed var(--tv2-line); }
.tv2-prep__f-sec b { font-weight: 600; }
.tv2-prep__check { display: flex; align-items: center; gap: 9px; font-size: 12.5px; padding: 5px 0; color: var(--tv2-ink2); }
.tv2-prep__check-icon {
  width: 17px; height: 17px; border-radius: 50%; display: grid; place-items: center; font-size: 10.5px; flex-shrink: 0;
  background: var(--tv2-rose-soft); color: var(--tv2-rose); font-weight: 800;
}
.tv2-prep__check.is-pass .tv2-prep__check-icon { background: var(--tv2-teal-soft); color: var(--tv2-teal); }
.tv2-prep__final-actions { display: flex; flex-direction: column; gap: 9px; }
.tv2-prep__final-actions .tv2-btn { width: 100%; }
</style>
