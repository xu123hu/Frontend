<template>
  <div id="tv2-assign" class="tv2-assign">
    <!-- 顶栏 -->
    <div class="tv2-card tv2-assign__topbar">
      <div class="tv2-card__body tv2-assign__topbar-row">
        <div>
          <b class="tv2-assign__title">{{ current ? current.title : '作业与批改' }}</b>
          <span class="tv2-card__sub" v-if="current">
            {{ current.class_name }} · {{ current.kp_name }} · 截止 {{ current.due_at }}
            <span class="tv2-tag" :class="statusClass(current.status)">{{ statusLabel(current.status) }}</span>
          </span>
        </div>
        <div class="tv2-assign__topbar-actions">
          <button v-if="current && current.status === 'grading'" class="tv2-btn" type="button" data-testid="tv2-review-pack" :disabled="packLoading" @click="makeReviewPack">
            {{ packLoading ? '生成中…' : '✦ 生成讲评包' }}
          </button>
          <button class="tv2-btn tv2-btn--primary" type="button" data-testid="tv2-assign-new" @click="publishOpen = true">＋ 发布新作业</button>
        </div>
      </div>
    </div>

    <div v-if="error" class="tv2-error" role="alert">{{ error }} <button class="tv2-btn tv2-btn--sm" type="button" @click="init">重试</button></div>

    <div class="tv2-assign__body">
      <!-- 左：作业列表 -->
      <aside class="tv2-card tv2-assign__list">
        <div class="tv2-card__head"><div class="tv2-card__title">作业批次</div><div class="tv2-card__sub">{{ items.length }} 份</div></div>
        <div class="tv2-card__body tv2-assign__list-body">
          <button
            v-for="a in items" :key="a.assignment_id"
            class="tv2-assign__item" :class="{ 'is-on': current?.assignment_id === a.assignment_id }"
            type="button" :data-testid="`tv2-assign-${a.assignment_id}`" @click="select(a)"
          >
            <div class="tv2-assign__item-top">
              <b>{{ a.title }}</b>
              <span class="tv2-tag" :class="statusClass(a.status)">{{ statusLabel(a.status) }}</span>
            </div>
            <div class="tv2-assign__item-meta">
              <span>{{ a.class_name }}</span>
              <span>{{ a.submitted }}/{{ a.total }} 份</span>
              <span class="tv2-assign__due">截止 {{ a.due_at }}</span>
            </div>
            <div class="tv2-assign__tiers">
              <span v-for="t in a.tiers" :key="t.tier" class="tv2-assign__tier-chip" :class="'t-' + t.tier">{{ t.label }} · {{ t.student_count }} 人</span>
            </div>
          </button>
        </div>
      </aside>

      <!-- 主区 -->
      <main class="tv2-assign__main">
        <!-- 批改工作台 -->
        <template v-if="current && current.status !== 'collecting' && !reviewPack">
          <!-- 筛选 tabs + 进度 -->
          <div class="tv2-card tv2-assign__gradingbar">
            <div class="tv2-card__body tv2-assign__gradingbar-row">
              <div class="tv2-assign__tabs">
                <button v-for="t in tabs" :key="t.key" class="tv2-assign__tab" :class="{ 'is-on': filter === t.key }" type="button" @click="setFilter(t.key)">
                  {{ t.label }} <i v-if="t.count" class="tv2-assign__tab-count">{{ t.count }}</i>
                </button>
              </div>
              <div class="tv2-assign__prog">
                <span class="tv2-assign__prog-label">终审进度</span>
                <div class="tv2-progress" style="flex: 1">
                  <div class="tv2-progress__bar" :style="{ width: (gradedCount / subs.length * 100) + '%' }" />
                </div>
                <span class="tv2-assign__prog-num">{{ gradedCount }}/{{ subs.length }}</span>
              </div>
            </div>
          </div>

          <div class="tv2-assign__grading">
            <!-- 队列 -->
            <aside class="tv2-card tv2-assign__queue">
              <div class="tv2-assign__queue-body">
                <button
                  v-for="s in filtered" :key="s.submission_id"
                  class="tv2-assign__stu" :class="{ 'is-on': active?.submission_id === s.submission_id, 'is-graded': s.final_score != null }"
                  type="button" @click="active = s"
                >
                  <span class="tv2-assign__stu-dot" :class="confClass(s.ai_confidence)" :title="`AI 置信度 ${s.ai_confidence}`" />
                  <span class="tv2-assign__stu-name">{{ s.student.name }}</span>
                  <span v-if="s.student.tier !== 'consolid'" class="tv2-tag" :class="s.student.tier === 'base' ? 'tv2-tag--slate' : 'tv2-tag--ai'">{{ s.student.tier === 'base' ? '基础' : '挑战' }}</span>
                  <span class="tv2-assign__stu-score">{{ s.final_score ?? s.ai_suggested_score ?? '—' }}<i v-if="s.final_score == null && s.ai_suggested_score != null"> AI</i></span>
                </button>
              </div>
            </aside>

            <!-- 批改主区 -->
            <section v-if="active" class="tv2-card tv2-assign__work">
              <div class="tv2-card__head">
                <div class="tv2-card__title">{{ active.student.name }} 的作答</div>
                <div class="tv2-card__sub">提交于 {{ active.submitted_at }} · {{ active.work_image_hint }}</div>
              </div>
              <div class="tv2-card__body">
                <!-- 客观题 -->
                <div class="tv2-assign__objective">
                  <span class="tv2-assign__obj-label">客观题</span>
                  <span class="tv2-assign__obj-cells">
                    <span v-for="n in active.objective.total" :key="n" class="tv2-assign__cell" :class="{ 'is-ok': n <= active.objective.correct }">{{ n <= active.objective.correct ? '✓' : '✗' }}</span>
                  </span>
                  <span class="tv2-assign__obj-num">{{ active.objective.correct }}/{{ active.objective.total }} 正确</span>
                </div>

                <!-- AI 预批 -->
                <div class="tv2-assign__ai" :class="`c-${active.ai_confidence}`">
                  <div class="tv2-assign__ai-head">
                    <span class="tv2-ai-badge tv2-ai-badge--sm">✦</span> AI 预批
                    <b class="tv2-assign__ai-score">{{ active.ai_suggested_score }} 分</b>
                    <span class="tv2-assign__conf" :class="confClass(active.ai_confidence)">
                      {{ { high: '置信度 高 · 可直接采纳', mid: '置信度 中 · 建议复核', low: '置信度 低 · 必须人工终审' }[active.ai_confidence] }}
                    </span>
                  </div>
                  <p v-if="active.ai_confidence === 'low'" class="tv2-assign__ai-reason">识别到作答书写潦草 / 步骤跳跃，客观题以外的判分仅供参考，请查看扫描件人工定分。</p>
                </div>

                <!-- 错因标签 -->
                <div class="tv2-assign__tags">
                  <div class="tv2-assign__field-label">错因标签（进入学情聚类）</div>
                  <div class="tv2-assign__tagrow">
                    <button
                      v-for="tag in tagPool" :key="tag"
                      class="tv2-assign__tagbtn" :class="{ 'is-on': pickedTags.includes(tag), 'is-ai': active.error_tags.some((t) => t.tag === tag && t.source === 'ai') }"
                      type="button" @click="toggleTag(tag)"
                    >
                      {{ tag }}<span v-if="active.error_tags.some((t) => t.tag === tag && t.source === 'ai')" class="tv2-assign__tag-ai">AI</span>
                    </button>
                  </div>
                </div>

                <!-- 终审 -->
                <div class="tv2-assign__final">
                  <div class="tv2-assign__final-score">
                    <div class="tv2-assign__field-label">终审分数</div>
                    <div class="tv2-assign__score-ctl">
                      <button class="tv2-quiz__step-btn" type="button" @click="finalScore = Math.max(0, (finalScore ?? 0) - 5)">−5</button>
                      <input v-model.number="finalScore" class="tv2-assign__score-input" type="number" min="0" max="100" data-testid="tv2-final-score" />
                      <button class="tv2-quiz__step-btn" type="button" @click="finalScore = Math.min(100, (finalScore ?? 0) + 5)">＋5</button>
                      <span class="tv2-assign__score-diff" v-if="finalScore != null && active.ai_suggested_score != null" :class="{ 'is-down': finalScore < active.ai_suggested_score }">
                        {{ finalScore > active.ai_suggested_score ? '+' : '' }}{{ Math.round((finalScore - active.ai_suggested_score) * 10) / 10 }} vs AI
                      </span>
                    </div>
                  </div>
                  <div class="tv2-assign__final-feedback">
                    <div class="tv2-assign__field-label">反馈语（学生可见）</div>
                    <textarea v-model="feedback" class="tv2-textarea" rows="3" placeholder="面向学生的批语，如：定义理解到位，注意焦点位置先判断再设方程…" data-testid="tv2-feedback" />
                  </div>
                </div>

                <div class="tv2-assign__actions">
                  <button class="tv2-btn" type="button" @click="adoptAi" v-if="finalScore == null && active.ai_suggested_score != null">采纳 AI 分</button>
                  <button class="tv2-btn tv2-btn--primary tv2-btn--lg" type="button" :disabled="grading || finalScore == null" data-testid="tv2-grade-submit" @click="submitGrade">
                    {{ grading ? '提交中…' : nextPending ? '提交并批下一份 →' : '提交终审' }}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </template>

        <!-- 收集中 -->
        <div v-else-if="current && current.status === 'collecting' && !reviewPack" class="tv2-card">
          <div class="tv2-card__body tv2-empty" style="padding: 56px 0">
            <div class="tv2-empty__title">作业收集中 · {{ current.submitted }}/{{ current.total }} 份已交</div>
            <div class="tv2-empty__desc">学生陆续提交中。全部交齐后进入 AI 预批，低置信度作答会进入人工终审队列。</div>
            <div class="tv2-assign__collecting-preview">
              <div v-for="t in current.tiers" :key="t.tier" class="tv2-assign__tier-card" :class="'t-' + t.tier">
                <b>{{ t.label }}</b>
                <span>{{ t.student_count }} 人</span>
                <p v-for="(it, i) in t.items" :key="i">{{ it }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 讲评包 -->
        <template v-else-if="reviewPack">
          <div class="tv2-card tv2-assign__packhead">
            <div class="tv2-card__body tv2-assign__packhead-row">
              <div>
                <b class="tv2-assign__title">批后讲评包</b>
                <span class="tv2-card__sub">{{ current?.title }} · {{ wrongCount }} 人低于满分 · 已按错因排序</span>
              </div>
              <div class="tv2-assign__topbar-actions">
                <button class="tv2-btn" type="button" @click="reviewPack = null">‹ 返回批改</button>
                <button class="tv2-btn tv2-btn--ai" type="button" data-testid="tv2-pack-to-prep" @click="goPrep">把变式题加入明日讲评 →</button>
              </div>
            </div>
          </div>
          <div class="tv2-assign__pack">
            <section class="tv2-card">
              <div class="tv2-card__head"><div class="tv2-card__title">最值得讲的 {{ reviewPack.top_errors.length }} 题</div><div class="tv2-card__sub">错因聚类 · 附出错学生名单</div></div>
              <div class="tv2-card__body tv2-assign__pack-errors">
                <div v-for="(e, i) in reviewPack.top_errors" :key="i" class="tv2-assign__pack-err">
                  <div class="tv2-assign__pack-err-meta">
                    <span class="tv2-assign__pack-err-rate" :style="heatStyle(e.error_rate)">{{ Math.round(e.error_rate * 100) }}%</span>
                    <span class="tv2-assign__pack-err-tag">{{ e.tag }}</span>
                    <span class="tv2-assign__pack-err-stu" :title="e.wrong_students.join('、')">{{ e.wrong_students.slice(0, 5).join('、') }}{{ e.wrong_students.length > 5 ? ` 等 ${e.wrong_students.length} 人` : '' }}</span>
                  </div>
                  <QuestionCard :question="e.question" compact :show-answer="true" :show-analysis="false" />
                </div>
              </div>
            </section>
            <section class="tv2-card">
              <div class="tv2-card__head"><div class="tv2-card__title"><span class="tv2-ai-badge tv2-ai-badge--sm">✦</span> 变式题推荐</div><div class="tv2-card__sub">针对前三错因 · 已排入明日讲评</div></div>
              <div class="tv2-card__body tv2-assign__pack-variants">
                <QuestionCard v-for="(q, i) in reviewPack.variant_pick" :key="q.question_id" :question="q" :seq="i + 1" compact :show-answer="true" />
              </div>
            </section>
          </div>
        </template>

        <!-- 空态 -->
        <div v-else class="tv2-card"><div class="tv2-card__body tv2-empty" style="padding: 64px 0">
          <div class="tv2-empty__title">左侧选择一个作业批次</div>
          <div class="tv2-empty__desc">或在组卷中心完成一份试卷后发布为分层作业。</div>
          <RouterLink to="/teacher-v2/quiz" class="tv2-btn tv2-btn--primary">去组卷中心 →</RouterLink>
        </div></div>
      </main>
    </div>

    <!-- 发布作业弹层 -->
    <div v-if="publishOpen" class="tv2-modal" role="dialog" aria-modal="true" @click.self="publishOpen = false">
      <div class="tv2-modal__box">
        <div class="tv2-modal__head">
          <b>发布分层作业</b>
          <button class="tv2-modal__close" type="button" @click="publishOpen = false">✕</button>
        </div>
        <div class="tv2-modal__body">
          <div class="tv2-assign__pub-row">
            <label class="tv2-assign__pub-label">作业标题</label>
            <input v-model="pubForm.title" class="tv2-input" type="text" data-testid="tv2-pub-title" />
          </div>
          <div class="tv2-assign__pub-row">
            <label class="tv2-assign__pub-label">班级</label>
            <div class="tv2-assign__pub-classes">
              <button v-for="c in classes" :key="c.class_id" class="tv2-quiz__chip" :class="{ 'is-on': pubForm.class_id === c.class_id }" type="button" @click="pubForm.class_id = c.class_id">
                {{ c.class_name }} · {{ c.student_count }} 人
              </button>
            </div>
          </div>
          <div class="tv2-assign__pub-row">
            <label class="tv2-assign__pub-label">知识点</label>
            <input v-model="pubForm.kp_name" class="tv2-input" type="text" />
          </div>
          <div class="tv2-assign__pub-row">
            <label class="tv2-assign__pub-label">截止时间</label>
            <input v-model="pubForm.due_at" class="tv2-input" type="text" placeholder="如 09-03 22:00" data-testid="tv2-pub-due" />
          </div>
          <div class="tv2-assign__pub-row">
            <label class="tv2-assign__pub-label">分层方案</label>
            <div class="tv2-assign__pub-tiers">
              <div v-for="t in pubForm.tiers" :key="t.tier" class="tv2-assign__tier-card" :class="'t-' + t.tier">
                <b>{{ t.label }}</b>
                <span>{{ t.student_count }} 人</span>
                <p v-for="(it, i) in t.items" :key="i">{{ it }}</p>
              </div>
            </div>
          </div>
        </div>
        <div class="tv2-modal__foot">
          <button class="tv2-btn" type="button" @click="publishOpen = false">取消</button>
          <button class="tv2-btn tv2-btn--primary" type="button" :disabled="publishing" data-testid="tv2-pub-submit" @click="publish">{{ publishing ? '发布中…' : '发布作业' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import QuestionCard from '@/components/teacherV2/QuestionCard.vue'
import { v2Api } from '@/api/teacherV2'
import { useToastStore } from '@/stores/toast'
import type { V2Assignment, V2ReviewPack, V2Submission } from '@/types/teacherV2'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const items = ref<V2Assignment[]>([])
const current = ref<V2Assignment | null>(null)
const subs = ref<V2Submission[]>([])
const filter = ref('all')
const active = ref<V2Submission | null>(null)
const error = ref('')
const grading = ref(false)
const packLoading = ref(false)
const reviewPack = ref<V2ReviewPack | null>(null)
const wrongCount = ref(0)

const finalScore = ref<number | null>(null)
const feedback = ref('')
const pickedTags = ref<string[]>([])

const classes = [
  { class_id: 'cls-g2-3', class_name: '高二 3 班', student_count: 46 },
  { class_id: 'cls-g2-5', class_name: '高二 5 班', student_count: 44 },
]

const tagPool = [
  '概念混淆 · 忽略定义条件',
  '运算失误 · 平方化简跳步',
  '审题遗漏 · 焦点位置判断',
  '证明步骤缺失 · 定义法',
  '公式选用不当 · 知三求一',
]

const tabs = computed(() => [
  { key: 'all', label: '全部', count: subs.value.length },
  { key: 'manual', label: '需人工', count: subs.value.filter((s) => s.needs_manual && s.final_score == null).length },
  { key: 'graded', label: '已终审', count: subs.value.filter((s) => s.final_score != null).length },
])
const filtered = computed(() => {
  if (filter.value === 'manual') return subs.value.filter((s) => s.needs_manual)
  if (filter.value === 'graded') return subs.value.filter((s) => s.final_score != null)
  return subs.value
})
const gradedCount = computed(() => subs.value.filter((s) => s.final_score != null).length)
const nextPending = computed(() => subs.value.find((s) => s.final_score == null && s.submission_id !== active.value?.submission_id))

function statusLabel(s: string) { return { collecting: '收集中', grading: '批改中', reviewed: '已讲评' }[s] || s }
function statusClass(s: string) { return { collecting: 'tv2-tag--info', grading: 'tv2-tag--warn', reviewed: 'tv2-tag--ok' }[s] || 'tv2-tag--slate' }
function confClass(c: string) { return { high: 'c-high', mid: 'c-mid', low: 'c-low' }[c] || 'c-mid' }
function heatStyle(rate: number) {
  const hot = Math.min(1, Math.max(0, rate))
  const hue = 150 - hot * 150
  return { background: `hsl(${hue}, 78%, 92%)`, color: `hsl(${hue}, 72%, 32%)` }
}

async function init() {
  error.value = ''
  try {
    const res = await v2Api.assignments()
    items.value = res.data.items
    if (items.value.length) {
      // 从组卷中心发布跳入时默认选最后一个（新发布的）
      const target = route.query.paper_id ? items.value[items.value.length - 1] : items.value.find((a) => a.status === 'grading') || items.value[0]
      await select(target)
    }
    // 从组卷中心跳入：直接打开发布弹层
    if (route.query.paper_id) openPublish(String(route.query.title || ''))
  } catch (e: any) {
    error.value = e?.message || '加载失败'
  }
}

async function select(a: V2Assignment) {
  current.value = a
  reviewPack.value = null
  filter.value = 'all'
  active.value = null
  if (a.status === 'collecting') return
  try {
    const res = await v2Api.submissions(a.assignment_id)
    subs.value = res.data.items
    current.value = res.data.context.assignment
    const first = subs.value.find((s) => s.needs_manual) || subs.value[0]
    if (first) setActive(first)
  } catch (e: any) {
    error.value = e?.message || '作答列表加载失败'
  }
}

function setActive(s: V2Submission) {
  active.value = s
  finalScore.value = s.final_score
  feedback.value = s.teacher_feedback || ''
  pickedTags.value = s.error_tags.map((t) => t.tag)
}

function setFilter(k: string) {
  filter.value = k
  const list = k === 'manual' ? subs.value.filter((s) => s.needs_manual)
    : k === 'graded' ? subs.value.filter((s) => s.final_score != null)
    : subs.value
  if (list.length && !list.includes(active.value as V2Submission)) setActive(list[0])
}

function toggleTag(tag: string) {
  const i = pickedTags.value.indexOf(tag)
  if (i >= 0) pickedTags.value.splice(i, 1)
  else pickedTags.value.push(tag)
}

function adoptAi() {
  if (active.value?.ai_suggested_score != null) finalScore.value = active.value.ai_suggested_score
}

async function submitGrade() {
  if (!active.value || finalScore.value == null) return
  grading.value = true
  try {
    const res = await v2Api.grade(active.value.submission_id, {
      final_score: finalScore.value,
      teacher_feedback: feedback.value,
      error_tags: pickedTags.value,
      kp_name: current.value?.kp_name,
    })
    const idx = subs.value.findIndex((s) => s.submission_id === res.data.submission_id)
    if (idx >= 0) subs.value[idx] = res.data
    if (nextPending.value) {
      setActive(nextPending.value)
      toast.success(`已终审 ${res.data.student.name} · 自动跳转下一位`)
    } else {
      active.value = res.data
      toast.success(`已终审 ${res.data.student.name} · 本批全部完成，可生成讲评包`)
    }
  } catch (e: any) {
    toast.error(e?.message || '提交失败')
  } finally {
    grading.value = false
  }
}

async function makeReviewPack() {
  if (!current.value) return
  packLoading.value = true
  try {
    const res = await v2Api.reviewPack(current.value.assignment_id)
    reviewPack.value = res.data.pack
    wrongCount.value = res.data.wrong_count
    toast.success('讲评包已生成：错因排序 + 变式推荐')
  } catch (e: any) {
    toast.error(e?.message || '讲评包生成失败')
  } finally {
    packLoading.value = false
  }
}

function goPrep() {
  router.push({ path: '/teacher-v2/prep', query: { from: 'review-pack', pack: reviewPack.value?.pack_id || '' } })
}

/* ===== 发布作业 ===== */
const publishOpen = ref(false)
const publishing = ref(false)
const pubForm = reactive({
  title: '',
  class_id: 'cls-g2-3',
  kp_name: '椭圆的标准方程',
  due_at: '09-03 22:00',
  tiers: [
    { tier: 'base' as const, label: '基础组（预习单 <60）', student_count: 12, items: ['A 卷 · 6 题（3:2:1）'] },
    { tier: 'consolid' as const, label: '巩固组', student_count: 24, items: ['B 卷 · 8 题（3:4:1）'] },
    { tier: 'challenge' as const, label: '挑战组', student_count: 10, items: ['C 卷 · 6 题（1:3:2）'] },
  ],
})

function openPublish(title: string) {
  pubForm.title = title || '椭圆周测 · 分层作业'
  publishOpen.value = true
}

async function publish() {
  publishing.value = true
  try {
    const res = await v2Api.createAssignment({ ...pubForm })
    items.value.push(res.data)
    publishOpen.value = false
    toast.success(`已发布「${res.data.title}」· ${res.data.class_name} 三层分层`)
    await select(res.data)
  } catch (e: any) {
    toast.error(e?.message || '发布失败')
  } finally {
    publishing.value = false
  }
}

onMounted(init)
</script>

<style scoped>
.tv2-assign { display: flex; flex-direction: column; gap: 14px; }
.tv2-assign__topbar-row { display: flex; align-items: center; gap: 16px; }
.tv2-assign__title { font-size: 16px; }
.tv2-assign__topbar-row > div > span { display: block; margin-top: 3px; }
.tv2-assign__topbar-actions { margin-left: auto; display: flex; gap: 8px; }
.tv2-assign__body { display: grid; grid-template-columns: 292px minmax(0, 1fr); gap: 14px; align-items: start; }

/* ===== 左：批次列表 ===== */
.tv2-assign__list { position: sticky; top: 12px; }
.tv2-assign__list-body { display: flex; flex-direction: column; gap: 8px; max-height: calc(100vh - 220px); overflow-y: auto; }
.tv2-assign__item {
  text-align: left; border: 1px solid var(--tv2-line); border-radius: var(--tv2-radius);
  background: var(--tv2-card); padding: 11px 13px; cursor: pointer; transition: all .13s; width: 100%;
}
.tv2-assign__item:hover { border-color: var(--tv2-primary-border); }
.tv2-assign__item.is-on { border-color: var(--tv2-primary); box-shadow: 0 0 0 3px var(--tv2-primary-soft); }
.tv2-assign__item-top { display: flex; align-items: center; gap: 8px; justify-content: space-between; }
.tv2-assign__item-top b { font-size: 13px; }
.tv2-assign__item-meta { display: flex; gap: 10px; font-size: 11.5px; color: var(--tv2-ink3); margin-top: 6px; flex-wrap: wrap; }
.tv2-assign__due { margin-left: auto; }
.tv2-assign__tiers { display: flex; gap: 5px; margin-top: 7px; flex-wrap: wrap; }
.tv2-assign__tier-chip { font-size: 10.5px; padding: 2px 7px; border-radius: 5px; }
.tv2-assign__tier-chip.t-base { background: var(--tv2-slate-soft); color: var(--tv2-slate); }
.tv2-assign__tier-chip.t-consolid { background: var(--tv2-primary-soft); color: var(--tv2-primary); }
.tv2-assign__tier-chip.t-challenge { background: var(--tv2-ai-soft); color: var(--tv2-ai); }

/* ===== 批改 ===== */
.tv2-assign__gradingbar-row { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
.tv2-assign__tabs { display: flex; gap: 4px; }
.tv2-assign__tab {
  border: none; background: none; cursor: pointer; font-size: 12.5px; color: var(--tv2-ink2);
  padding: 6px 12px; border-radius: 8px; display: flex; align-items: center; gap: 6px; transition: all .12s;
}
.tv2-assign__tab:hover { background: var(--tv2-bg2); }
.tv2-assign__tab.is-on { background: var(--tv2-primary-soft); color: var(--tv2-primary); font-weight: 600; }
.tv2-assign__tab-count {
  font-style: normal; font-size: 10.5px; font-family: var(--tv2-font-num); background: var(--tv2-card);
  border: 1px solid var(--tv2-line); border-radius: 999px; padding: 0 6px; min-width: 18px; text-align: center;
}
.tv2-assign__tab.is-on .tv2-assign__tab-count { border-color: var(--tv2-primary-border); }
.tv2-assign__prog { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 200px; margin-left: auto; }
.tv2-assign__prog-label { font-size: 11.5px; color: var(--tv2-ink3); white-space: nowrap; }
.tv2-assign__prog-num { font-size: 12px; font-family: var(--tv2-font-num); font-weight: 700; color: var(--tv2-primary); white-space: nowrap; }

.tv2-assign__grading { display: grid; grid-template-columns: 252px minmax(0, 1fr); gap: 14px; align-items: start; }
.tv2-assign__queue { max-height: calc(100vh - 280px); overflow-y: auto; }
.tv2-assign__queue-body { display: flex; flex-direction: column; gap: 3px; padding: 8px !important; }
.tv2-assign__stu {
  display: flex; align-items: center; gap: 8px; width: 100%; text-align: left;
  border: none; background: none; cursor: pointer; padding: 7px 10px; border-radius: 8px;
  font-size: 12.5px; color: var(--tv2-ink); transition: background .1s;
}
.tv2-assign__stu:hover { background: var(--tv2-bg2); }
.tv2-assign__stu.is-on { background: var(--tv2-primary-soft); font-weight: 600; }
.tv2-assign__stu.is-graded { opacity: 0.62; }
.tv2-assign__stu-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.tv2-assign__stu-dot.c-high { background: var(--tv2-teal); }
.tv2-assign__stu-dot.c-mid { background: var(--tv2-amber); }
.tv2-assign__stu-dot.c-low { background: var(--tv2-rose); box-shadow: 0 0 0 3px var(--tv2-rose-soft); }
.tv2-assign__stu-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tv2-assign__stu-score { font-family: var(--tv2-font-num); font-weight: 700; font-size: 12.5px; }
.tv2-assign__stu-score i { font-style: normal; font-size: 9.5px; color: var(--tv2-ai); margin-left: 2px; }

.tv2-assign__objective { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: var(--tv2-bg2); border-radius: 9px; }
.tv2-assign__obj-label { font-size: 12px; color: var(--tv2-ink3); font-weight: 600; }
.tv2-assign__obj-cells { display: flex; gap: 6px; }
.tv2-assign__cell {
  width: 24px; height: 24px; border-radius: 6px; display: grid; place-items: center;
  font-size: 12px; font-weight: 700; background: var(--tv2-rose-soft); color: var(--tv2-rose); border: 1px solid var(--tv2-rose-border);
}
.tv2-assign__cell.is-ok { background: var(--tv2-teal-soft); color: var(--tv2-teal); border-color: var(--tv2-teal-border); }
.tv2-assign__obj-num { font-size: 12px; color: var(--tv2-ink2); margin-left: auto; }

.tv2-assign__ai { margin-top: 12px; border: 1px solid var(--tv2-ai-border); background: var(--tv2-ai-soft); border-radius: 9px; padding: 11px 14px; }
.tv2-assign__ai.c-low { border-color: var(--tv2-rose-border); background: var(--tv2-rose-soft); }
.tv2-assign__ai-head { display: flex; align-items: center; gap: 9px; font-size: 12.5px; color: var(--tv2-ai-deep); flex-wrap: wrap; }
.tv2-assign__ai.c-low .tv2-assign__ai-head { color: var(--tv2-rose); }
.tv2-assign__ai-score { font-family: var(--tv2-font-num); font-size: 17px; }
.tv2-assign__conf { font-size: 11.5px; }
.tv2-assign__conf.c-high { color: var(--tv2-teal); }
.tv2-assign__conf.c-mid { color: var(--tv2-amber); }
.tv2-assign__conf.c-low { color: var(--tv2-rose); }
.tv2-assign__ai-reason { margin: 7px 0 0; font-size: 11.5px; line-height: 1.6; color: var(--tv2-ink2); }

.tv2-assign__field-label { font-size: 11.5px; color: var(--tv2-ink3); font-weight: 600; margin: 14px 0 8px; }
.tv2-assign__tagrow { display: flex; gap: 7px; flex-wrap: wrap; }
.tv2-assign__tagbtn {
  border: 1px solid var(--tv2-line); background: var(--tv2-card); border-radius: 999px;
  padding: 4px 12px; font-size: 12px; color: var(--tv2-ink2); cursor: pointer; transition: all .12s;
  display: inline-flex; align-items: center; gap: 5px;
}
.tv2-assign__tagbtn:hover { border-color: var(--tv2-rose-border); color: var(--tv2-rose); }
.tv2-assign__tagbtn.is-ai { border-color: var(--tv2-ai-border); background: var(--tv2-ai-soft); }
.tv2-assign__tagbtn.is-on { background: var(--tv2-rose); border-color: var(--tv2-rose); color: #fff; font-weight: 600; }
.tv2-assign__tag-ai { font-size: 9px; background: var(--tv2-ai); color: #fff; border-radius: 4px; padding: 0 4px; font-family: var(--tv2-font-num); }

.tv2-assign__final { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 20px; }
.tv2-assign__score-ctl { display: flex; align-items: center; gap: 8px; }
.tv2-assign__score-input {
  width: 88px; height: 40px; border: 1.5px solid var(--tv2-primary); border-radius: 9px; text-align: center;
  font-size: 18px; font-weight: 700; font-family: var(--tv2-font-num); color: var(--tv2-primary-deep); outline: none;
}
.tv2-assign__score-input:focus { box-shadow: 0 0 0 3px var(--tv2-primary-soft); }
.tv2-assign__score-diff { font-size: 11.5px; color: var(--tv2-teal); font-family: var(--tv2-font-num); }
.tv2-assign__score-diff.is-down { color: var(--tv2-rose); }
.tv2-textarea, .tv2-input {
  width: 100%; border: 1px solid var(--tv2-line); border-radius: 8px; padding: 8px 11px;
  font-size: 13px; color: var(--tv2-ink); background: var(--tv2-card); outline: none; font-family: inherit; resize: vertical;
}
.tv2-textarea:focus, .tv2-input:focus { border-color: var(--tv2-primary); box-shadow: 0 0 0 3px var(--tv2-primary-soft); }
.tv2-assign__actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; border-top: 1px dashed var(--tv2-line); padding-top: 14px; }

/* ===== 收集中 ===== */
.tv2-assign__collecting-preview { display: flex; gap: 10px; justify-content: center; margin-top: 4px; flex-wrap: wrap; }
.tv2-assign__tier-card {
  border: 1px solid var(--tv2-line); border-radius: var(--tv2-radius); padding: 12px 15px; min-width: 170px; text-align: left; background: var(--tv2-card);
}
.tv2-assign__tier-card.t-base { border-top: 3px solid var(--tv2-slate); }
.tv2-assign__tier-card.t-consolid { border-top: 3px solid var(--tv2-primary); }
.tv2-assign__tier-card.t-challenge { border-top: 3px solid var(--tv2-ai); }
.tv2-assign__tier-card b { font-size: 13px; display: block; }
.tv2-assign__tier-card span { font-size: 11px; color: var(--tv2-ink3); display: block; margin: 4px 0 8px; }
.tv2-assign__tier-card p { font-size: 12px; color: var(--tv2-ink2); margin: 3px 0; }

/* ===== 讲评包 ===== */
.tv2-assign__packhead-row { display: flex; align-items: center; gap: 16px; }
.tv2-assign__pack { display: flex; flex-direction: column; gap: 14px; }
.tv2-assign__pack-errors { display: flex; flex-direction: column; gap: 14px; }
.tv2-assign__pack-err-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
.tv2-assign__pack-err-rate {
  font-size: 12px; font-weight: 700; border-radius: 6px; padding: 2px 8px; font-family: var(--tv2-font-num);
}
.tv2-assign__pack-err-tag { font-size: 12.5px; font-weight: 600; color: var(--tv2-rose); }
.tv2-assign__pack-err-stu { font-size: 11.5px; color: var(--tv2-ink3); margin-left: auto; }
.tv2-assign__pack-variants { display: flex; flex-direction: column; gap: 10px; }

/* ===== 发布弹层 ===== */
.tv2-modal { position: fixed; inset: 0; background: rgba(23, 35, 61, 0.44); display: grid; place-items: center; z-index: 60; }
.tv2-modal__box { width: min(560px, 92vw); background: var(--tv2-card); border-radius: var(--tv2-radius-xl); box-shadow: var(--tv2-shadow-lg); }
.tv2-modal__head { display: flex; align-items: center; justify-content: space-between; padding: 16px 22px; border-bottom: 1px solid var(--tv2-line2); }
.tv2-modal__head b { font-size: 15.5px; }
.tv2-modal__close { border: none; background: none; cursor: pointer; font-size: 14px; color: var(--tv2-ink3); }
.tv2-modal__body { padding: 18px 22px; max-height: 64vh; overflow-y: auto; }
.tv2-modal__foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px; border-top: 1px solid var(--tv2-line2); }
.tv2-assign__pub-row { margin-bottom: 14px; }
.tv2-assign__pub-label { display: block; font-size: 12px; color: var(--tv2-ink3); font-weight: 600; margin-bottom: 6px; }
.tv2-assign__pub-classes { display: flex; gap: 8px; }
.tv2-assign__pub-tiers { display: flex; gap: 10px; flex-wrap: wrap; }

@media (max-width: 1100px) {
  .tv2-assign__body { grid-template-columns: 1fr; }
  .tv2-assign__list { position: static; }
  .tv2-assign__grading { grid-template-columns: 1fr; }
  .tv2-assign__final { grid-template-columns: 1fr; }
}
</style>
