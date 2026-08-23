<template>
  <div id="page-assign">
    <!-- 页面头部 -->
    <header class="t-page-head">
      <div class="t-page-title">
        <h1>作业与测验</h1>
        <p>选择题型和范围，AI 自动组卷，可逐题编辑、替换、锁定后发布给学生</p>
      </div>
      <div class="t-contextbar">
        <button class="t-btn" type="button" @click="goToMyPapers">
          <span aria-hidden="true">📂</span>
          我的试卷
        </button>
      </div>
    </header>

    <div v-if="papersOpen" class="t-card" style="margin-bottom: 16px;">
      <div class="t-section-title">
        <div><h2>我的试卷与作业</h2><span class="sub">来自教师作业库</span></div>
        <button class="t-btn sm" type="button" @click="papersOpen = false">关闭</button>
      </div>
      <div v-if="papersLoading" class="t-muted">正在加载…</div>
      <div v-else-if="papers.length" class="t-task-list">
        <div v-for="paper in papers" :key="paper.assignment_id" class="t-task-item">
          <div class="t-task-icon" aria-hidden="true">卷</div>
          <div class="t-task-main">
            <div class="t">{{ paper.title }}</div>
            <div class="m">{{ paper.status }} · {{ new Date(paper.created_at).toLocaleString('zh-CN') }}</div>
          </div>
          <span class="t-tag" :class="paper.status === 'published' ? 'green' : 'amber'">{{ paper.status === 'published' ? '已发布' : '草稿' }}</span>
        </div>
      </div>
      <p v-else class="t-muted">当前班级还没有试卷或作业。</p>
    </div>

    <!-- 题型选择卡片 -->
    <div class="t-card" style="margin-bottom: 16px">
      <div class="t-section-title">
        <div>
          <h2>你要出什么？</h2>
          <span class="sub">选一个场景，我们会自动匹配题量和难度</span>
        </div>
      </div>
      <div class="t-type-grid">
        <button
          v-for="t in typeOptions"
          :key="t.id"
          class="t-type-card"
          :class="{ on: selectedType === t.id }"
          type="button"
          @click="selectType(t.id)"
        >
          <div class="ico">{{ t.icon }}</div>
          <b>{{ t.title }}</b>
          <span>{{ t.desc }}</span>
        </button>
      </div>
    </div>

    <!-- 双栏布局 -->
    <div class="t-g2 t-grid">
      <!-- 左栏 - 快速设置 -->
      <div class="t-card">
        <div class="t-section-title">
          <div class="t-row" style="gap: 8px">
            <h2>快速设置</h2>
            <span class="t-tag green">预计1分钟完成</span>
          </div>
        </div>

        <div class="t-form-grid">
          <div class="t-field">
            <label for="assign-class">班级</label>
            <select id="assign-class" v-model="form.classId">
              <option v-for="item in classes" :key="item.id" :value="item.id">{{ item.name }}</option>
            </select>
          </div>
          <div class="t-field">
            <label for="assign-scope">范围</label>
            <select id="assign-scope" v-model="form.scope">
              <option value="monotonicity">函数的单调性</option>
              <option value="parity">函数的奇偶性</option>
              <option value="basic">函数的基本性质</option>
              <option value="chapter1">第一章 集合与函数</option>
            </select>
          </div>
          <div class="t-field">
            <label for="assign-count">题量</label>
            <input id="assign-count" v-model.number="form.count" type="number" min="1" max="50" />
          </div>
          <div class="t-field">
            <label for="assign-duration">预计用时</label>
            <select id="assign-duration" v-model="form.duration">
              <option value="15">15 分钟</option>
              <option value="20">20 分钟</option>
              <option value="30">30 分钟</option>
              <option value="45">45 分钟</option>
              <option value="60">60 分钟</option>
            </select>
          </div>
        </div>

        <div class="t-switch-row">
          <label class="t-check-pill">
            <input type="checkbox" v-model="form.avoidRecent" />
            避开近30天做过的题
          </label>
          <label class="t-check-pill">
            <input type="checkbox" v-model="form.abRoll" />
            生成A/B卷
          </label>
          <label class="t-check-pill">
            <input type="checkbox" v-model="form.sameDiff" />
            参数不同但难度一致
          </label>
          <label class="t-check-pill">
            <input type="checkbox" v-model="form.preferFav" />
            优先用我的收藏题
          </label>
        </div>

        <div class="t-divider"></div>

        <div class="t-row t-between" style="margin-bottom: 8px">
          <span class="t-small t-muted">难度比例</span>
          <div class="t-row" style="gap: 6px">
            <span class="t-tag green">基础 {{ difficultyRatio.basic }}%</span>
            <span class="t-tag amber">提升 {{ difficultyRatio.medium }}%</span>
            <span class="t-tag violet">挑战 {{ difficultyRatio.hard }}%</span>
          </div>
        </div>

        <div style="margin-top: 12px">
          <button class="t-btn sm" type="button" @click="advancedOpen = !advancedOpen">
            <span aria-hidden="true">{{ advancedOpen ? '▾' : '▸' }}</span>
            高级设置
          </button>
        </div>

        <div class="t-advanced" :class="{ open: advancedOpen }">
          <div class="t-small t-muted" style="margin-bottom: 8px">
            知识点 × 难度 × 分值 蓝图（细粒度调整）
          </div>
          <table class="t-blueprint">
            <thead>
              <tr>
                <th>知识点</th>
                <th>基础题(分)</th>
                <th>提升题(分)</th>
                <th>挑战题(分)</th>
                <th>小计</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in blueprint" :key="row.kp">
                <td style="text-align: left; font-weight: 600">{{ row.kp }}</td>
                <td><input type="number" v-model.number="row.easy" min="0" /></td>
                <td><input type="number" v-model.number="row.medium" min="0" /></td>
                <td><input type="number" v-model.number="row.hard" min="0" /></td>
                <td class="t-strong">{{ row.easy + row.medium + row.hard }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="t-divider"></div>

        <div class="t-row t-between">
          <button class="t-btn primary lg" type="button" :disabled="generating" @click="generatePaper">
            {{ generating ? '生成中…' : '✨ 生成试卷' }}
          </button>
          <button v-if="items.length" class="t-btn lg" type="button" :disabled="store.publishing" @click="publishPaper">
            {{ store.publishing ? '发布中…' : '确认并发布给学生' }}
          </button>
          <span class="t-tiny t-muted">生成后逐题编辑、替换、锁定，再发布</span>
        </div>
      </div>

      <!-- 右栏 - 试卷预览 -->
      <div class="t-card">
        <div class="t-section-title">
          <div class="t-row" style="gap: 8px">
            <h2>试卷预览</h2>
            <span class="t-tag green">可按题编辑</span>
          </div>
          <span class="t-tiny t-muted">共 {{ items.length }} 题 · {{ totalScore }} 分 · 预计 {{ estimateMin }} 分钟</span>
        </div>

        <div v-if="coverage.length" class="t-coverage">
          <span class="t-coverage-label">覆盖</span>
          <span v-for="kp in coverage" :key="kp" class="t-tag green">{{ kp }}</span>
          <span v-if="hasDuplicate" class="t-coverage-warn">· {{ duplicateHint }}</span>
        </div>

        <div class="t-paper-preview">
          <div
            v-for="(q, idx) in items"
            :key="q._key"
            class="t-q-row"
            :class="{ locked: q.locked }"
          >
            <div class="t-q-no">{{ idx + 1 }}</div>
            <div class="t-q-main">
              <div class="qt">{{ q.question_text }}</div>
              <div class="qm">
                {{ q.kp_name || q.kp_code || '综合数学' }} · {{ difficultyLabel(q.difficulty) }} · {{ q.score }}分
                <span v-if="q.locked" class="t-lock">已锁定</span>
                <span v-if="typeLabel(q.q_type)" class="t-type">{{ typeLabel(q.q_type) }}</span>
              </div>

              <!-- 内联编辑表单 -->
              <div v-if="editingIdx === idx" class="t-q-edit">
                <label class="t-field"><span>题干</span>
                  <textarea v-model="q.question_text" rows="2" class="t-input"></textarea>
                </label>
                <div v-if="q.q_type === 'choice' && q.options" class="t-optgrid">
                  <label v-for="(opt, oi) in q.options" :key="oi" class="t-field">
                    <span>选项 {{ 'ABCD'[oi] || oi + 1 }}</span>
                    <input v-model="q.options[oi]" class="t-input" />
                  </label>
                </div>
                <div class="t-editgrid">
                  <label class="t-field"><span>答案</span><input v-model="q.answer" class="t-input" /></label>
                  <label class="t-field"><span>难度</span>
                    <select v-model="q.difficulty" class="t-input">
                      <option value="easy">基础</option>
                      <option value="medium">提升</option>
                      <option value="hard">挑战</option>
                    </select>
                  </label>
                  <label class="t-field"><span>分值</span><input v-model.number="q.score" type="number" min="0" step="1" class="t-input" /></label>
                </div>
                <label class="t-field"><span>解析</span>
                  <textarea v-model="q.answer_analysis" rows="2" class="t-input"></textarea>
                </label>

                <div v-if="similarList.length" class="t-similar">
                  <div class="t-small t-strong" style="margin-bottom:6px;">找一个相似题替换：</div>
                  <button
                    v-for="c in similarList"
                    :key="c.question_text"
                    class="t-similar-item"
                    type="button"
                    @click="applyCandidate(idx, c)"
                  >
                    <span>{{ c.question_text }}</span>
                    <b>选用</b>
                  </button>
                  <button class="t-btn sm" type="button" @click="similarList = []">取消相似题</button>
                </div>

                <div class="t-row" style="gap: 8px; margin-top: 10px">
                  <button class="t-btn sm primary" type="button" @click="saveEdit(idx)">保存</button>
                  <button class="t-btn sm" type="button" @click="cancelEdit">取消</button>
                  <button v-if="q.locked" class="t-btn sm" type="button" @click="toggleLock(idx)">解锁</button>
                </div>
              </div>

              <!-- 操作行：编辑 / 换一题 / 重生成 / 找相似 / 锁定 -->
              <div v-else class="t-q-actions">
                <button class="t-btn sm" type="button" :disabled="q.locked" @click="startEdit(idx)">编辑</button>
                <button class="t-btn sm" type="button" :disabled="q.locked" @click="replaceOne(idx)">换一题</button>
                <button class="t-btn sm" type="button" :disabled="q.locked" @click="regenerateOne(idx)">重新生成</button>
                <button class="t-btn sm" type="button" :disabled="q.locked" @click="openSimilar(idx)">找相似题</button>
                <button class="t-btn sm" type="button" @click="toggleLock(idx)">{{ q.locked ? '解锁' : '锁定' }}</button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!items.length" class="t-muted t-small" style="text-align: center; padding: 30px 0">
          点击「生成试卷」预览题目
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api/client'
import { artifactsApi } from '@/api/teacher/artifacts'
import { assignmentsApi } from '@/api/teacher/assignments'
import { useTeacherContextStore } from '@/stores/teacher/context'
import { useAssessmentStore } from '@/stores/teacher/assessment'
import { MONOTONICITY_BANK, replacementCandidates, type BankQuestion } from '@/mock/questionBank'
import type { Assignment, QuizQuestion } from '@/types/teacher'

const router = useRouter()
const ctx = useTeacherContextStore()
const store = useAssessmentStore()
const showToast = inject('showToast') as (msg: string) => void
const classes = ref<Array<{ id: string; name: string }>>([])
const papers = ref<Assignment[]>([])
const papersOpen = ref(false)
const papersLoading = ref(false)

// ---- 题型选择 ----
const selectedType = ref('quiz-20min')

interface TypeOption { id: string; icon: string; title: string; desc: string; defaultCount: number; defaultDuration: string }

const typeOptions: TypeOption[] = [
  { id: 'quiz-20min', icon: '⏱️', title: '20分钟小测', desc: '课堂快速检测', defaultCount: 8, defaultDuration: '20' },
  { id: 'weekly', icon: '📅', title: '周作业', desc: '一周内容巩固', defaultCount: 12, defaultDuration: '30' },
  { id: 'unit-test', icon: '📝', title: '单元测验', desc: '章节综合考察', defaultCount: 20, defaultDuration: '45' },
  { id: 'wrong-review', icon: '🎯', title: '错题巩固', desc: '针对错题再练', defaultCount: 10, defaultDuration: '20' },
  { id: 'formal-exam', icon: '🏆', title: '正式考试', desc: '期中/期末模拟', defaultCount: 25, defaultDuration: '60' },
]

// ---- 范围 → 知识点 ----
const SCOPE_KP: Record<string, { code: string; name: string }> = {
  monotonicity: { code: 'MATH-101', name: '函数的单调性' },
  parity: { code: 'MATH-102', name: '函数的奇偶性' },
  basic: { code: 'MATH-103', name: '函数的基本性质' },
  chapter1: { code: 'MATH-001', name: '集合与函数' },
}

// ---- 表单状态 ----
const form = reactive({
  classId: '',
  scope: 'monotonicity',
  count: 8,
  duration: '20',
  avoidRecent: true,
  abRoll: false,
  sameDiff: false,
  preferFav: true,
})

const advancedOpen = ref(false)
const generating = ref(false)

const difficultyRatio = computed(() => {
  const type = typeOptions.find((t) => t.id === selectedType.value)
  if (type?.id === 'formal-exam') return { basic: 40, medium: 40, hard: 20 }
  if (type?.id === 'unit-test') return { basic: 50, medium: 35, hard: 15 }
  if (type?.id === 'wrong-review') return { basic: 30, medium: 50, hard: 20 }
  return { basic: 60, medium: 30, hard: 10 }
})

interface BlueprintRow { kp: string; easy: number; medium: number; hard: number }

const blueprint = ref<BlueprintRow[]>([
  { kp: '单调性的判定', easy: 20, medium: 15, hard: 5 },
  { kp: '单调性的证明', easy: 10, medium: 15, hard: 10 },
  { kp: '单调区间求解', easy: 10, medium: 10, hard: 5 },
])

// ---- 可编辑题目对象（保留完整字段 + 分值 + 锁定 + 客户端稳定 key） ----
interface EditableQuestion extends QuizQuestion {
  _key: string
  score: number
  locked: boolean
}

const items = ref<EditableQuestion[]>([])
const editingIdx = ref(-1)
const similarList = ref<BankQuestion[]>([])
let keySeq = 0

const totalScore = computed(() => items.value.reduce((sum, q) => sum + (q.score || 0), 0))
const estimateMin = computed(() => items.value.length > 0 ? Math.round(Number(form.duration) || 20) : 0)
const coverage = computed(() => Array.from(new Set(items.value.map((q) => q.kp_name || q.kp_code).filter(Boolean))) as string[])
const hasDuplicate = computed(() => {
  const seen = new Set<string>()
  let dup = 0
  for (const q of items.value) {
    if (seen.has(q.question_text)) dup++
    seen.add(q.question_text)
  }
  return dup > 0
})
const duplicateHint = computed(() => hasDuplicate.value ? '存在重复题，请用"换一题"替换' : '')

function typeLabel(t?: string) {
  return t === 'choice' ? '选择' : t === 'blank' ? '填空' : t === 'text' ? '解答' : ''
}
function difficultyLabel(d?: string) {
  return d === 'hard' ? '挑战' : d === 'medium' ? '提升' : d === 'easy' ? '基础' : ''
}

function toEditable(raw: Record<string, unknown>): EditableQuestion {
  return {
    item_no: Number(raw.item_no ?? 0),
    q_type: (raw.q_type as EditableQuestion['q_type']) || 'choice',
    difficulty: (raw.difficulty as EditableQuestion['difficulty']) || 'medium',
    kp_code: raw.kp_code ? String(raw.kp_code) : undefined,
    kp_name: raw.kp_name ? String(raw.kp_name) : undefined,
    question_text: String(raw.question_text ?? ''),
    options: Array.isArray(raw.options) ? (raw.options as string[]) : undefined,
    answer: raw.answer ? String(raw.answer) : '',
    answer_analysis: raw.answer_analysis ? String(raw.answer_analysis) : '',
    _key: `q-${keySeq++}`,
    score: Number(raw.score ?? ((raw.q_type as string) === 'text' || (raw.q_type as string) === 'solution' ? 10 : 5)),
    locked: false,
  }
}

// ---- 选择类型 ----
function selectType(id: string) {
  selectedType.value = id
  const type = typeOptions.find((t) => t.id === id)
  if (type) {
    form.count = type.defaultCount
    form.duration = type.defaultDuration
  }
  showToast?.(`已选择「${type?.title}」场景`)
}

async function generatePaper() {
  if (generating.value || !form.classId) return
  generating.value = true
  const kp = SCOPE_KP[form.scope] || SCOPE_KP.monotonicity
  const choice = Math.max(1, Math.floor(form.count * 0.3))
  const blank = Math.max(1, Math.floor(form.count * 0.2))
  try {
    await store.generateQuiz({
      class_id: form.classId,
      knowledge_points: [kp.code],
      count: form.count,
      question_types: { choice, blank, text: Math.max(0, form.count - choice - blank) },
      difficulty: { easy: difficultyRatio.value.basic / 100, medium: difficultyRatio.value.medium / 100, hard: difficultyRatio.value.hard / 100 },
      exclude_hashes: [],
    })
    const raw = (store.quizArtifact?.content?.items || []) as Array<Record<string, unknown>>
    items.value = raw.map(toEditable)
    editingIdx.value = -1
    similarList.value = []
    showToast?.(store.quizArtifact?.degraded ? '题库不足部分已用本地模板补齐，请确认后发布' : '试卷已生成，可逐题调整')
  } catch (e: any) { showToast?.(e?.message || store.error || '生成失败') }
  finally { generating.value = false }
}

// ---- 每题动作 ----
function startEdit(idx: number) {
  editingIdx.value = idx
  similarList.value = []
}
function cancelEdit() { editingIdx.value = -1; similarList.value = [] }
function saveEdit(idx: number) {
  const q = items.value[idx]
  if (!q.question_text.trim()) { showToast?.('题干不能为空'); return }
  editingIdx.value = -1
  showToast?.('已保存该题')
}

function excludeTexts() { return items.value.map((q) => q.question_text) }

/** 候选匹配：先按知识点精匹配；题库无该知识点时按难度回退，保证换一题/重生成总有候选题 */
function bankCandidatesFor(q: EditableQuestion): BankQuestion[] {
  const exact = replacementCandidates(q.kp_code, q.difficulty, excludeTexts())
  if (exact.length) return exact
  return MONOTONICITY_BANK.filter((c) => c.difficulty === q.difficulty && !excludeTexts().includes(c.question_text))
}

function pickCandidate(idx: number, offset = 0): BankQuestion | null {
  const q = items.value[idx]
  const cands = bankCandidatesFor(q)
  if (!cands.length) return null
  return cands[(idx + offset) % cands.length]
}

function replaceOne(idx: number) {
  const cur = items.value[idx]
  if (cur.locked) { showToast?.('该题已锁定，请先解锁'); return }
  const cand = pickCandidate(idx, 1)
  if (!cand) { showToast?.('暂无同类候选题，可编辑该题'); return }
  applyCandidate(idx, cand, '已换一题')
}

function regenerateOne(idx: number) {
  const cur = items.value[idx]
  if (cur.locked) { showToast?.('该题已锁定，请先解锁'); return }
  const cand = pickCandidate(idx, 2)
  if (!cand) { showToast?.('暂无同类候选题'); return }
  applyCandidate(idx, cand, '已重新生成该题')
}

function openSimilar(idx: number) {
  const q = items.value[idx]
  if (q.locked) { showToast?.('该题已锁定，请先解锁'); return }
  similarList.value = bankCandidatesFor(q).slice(0, 3)
  editingIdx.value = idx
  showToast?.(similarList.value.length ? `找到 ${similarList.value.length} 个相似题，请挑选` : '暂无相似题')
}

function applyCandidate(idx: number, cand: BankQuestion, msg?: string) {
  const cur = items.value[idx]
  const picked: EditableQuestion = {
    item_no: cur.item_no,
    q_type: cand.q_type,
    difficulty: cand.difficulty,
    kp_code: cand.kp_code,
    kp_name: cand.kp_name,
    question_text: `导数与单调性：${cand.question_text}`,
    options: cand.options ? [...cand.options] : undefined,
    answer: cand.answer,
    answer_analysis: cand.answer_analysis,
    _key: `q-${keySeq++}`,
    score: cand.q_type === 'text' ? 10 : 5,
    locked: false,
  }
  items.value[idx] = picked
  editingIdx.value = -1
  similarList.value = []
  showToast?.(msg || '已选用该题')
}

function toggleLock(idx: number) {
  const q = items.value[idx]
  q.locked = !q.locked
  if (q.locked && editingIdx.value === idx) editingIdx.value = -1
  showToast?.(q.locked ? '该题已锁定，将不再被批量改动' : '该题已解锁')
}

// ---- 发布：先写回 working items，再确认 + 创建作业 + 发布 ----
async function publishPaper() {
  if (!store.quizArtifact) return
  try {
    const content = { ...(store.quizArtifact.content || {}) }
    content.items = items.value.map(({ _key, locked, ...q }) => ({ ...q }))
    content.knowledge_points = Array.from(new Set(items.value.map((q) => q.kp_code).filter(Boolean)))
    content.count = items.value.length
    store.quizArtifact = { ...store.quizArtifact, content }
    store.quizArtifact = await artifactsApi.confirm(store.quizArtifact.artifact_id, `confirm:${store.quizArtifact.artifact_id}`)
    const type = typeOptions.find((item) => item.id === selectedType.value)
    await store.createAssignment({ class_id: form.classId, title: type?.title || '数学作业', artifact_id: store.quizArtifact.artifact_id })
    await store.publish()
    showToast?.('作业已发布，学生端任务中心现在可见')
  } catch (e: any) { showToast?.(e?.message || store.error || '发布失败') }
}

async function goToMyPapers() {
  papersOpen.value = true
  papersLoading.value = true
  try {
    papers.value = await assignmentsApi.list(form.classId || undefined)
  } catch (e: any) { showToast?.(e?.message || '试卷库加载失败') }
  finally { papersLoading.value = false }
}

// 重新进入页面或切班时清空旧卷
watch(() => form.classId, () => { items.value = []; editingIdx.value = -1; similarList.value = [] })

onMounted(async () => {
  try {
    const data = await api.get('/classes/mine')
    classes.value = data?.items || []
    if (classes.value.length) {
      form.classId = classes.value[0].id
      ctx.setClass(classes.value[0].id, classes.value[0].name)
    }
  } catch (e: any) { showToast?.(e?.message || '班级加载失败') }
})
</script>

<style scoped>
.t-coverage { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin: 0 0 12px; padding: 8px 12px; background: var(--t-surface-2); border-radius: var(--t-radius-sm); }
.t-coverage-label { color: var(--t-ink-2); font-size: 12px; font-weight: 600; }
.t-coverage-warn { color: var(--t-red); font-size: 12px; font-weight: 600; }

.t-q-row { display: flex; gap: 12px; padding: 14px 14px; border: 1px solid var(--t-line); border-radius: var(--t-radius-sm); margin-bottom: 10px; align-items: flex-start; background: var(--t-surface); transition: border-color .15s; }
.t-q-row.locked { background: var(--t-surface-2); border-style: dashed; }
.t-q-main { flex: 1; min-width: 0; }
.t-q-no { flex: none; width: 22px; height: 22px; border-radius: 6px; background: var(--t-brand-deep); color: #fff; font-size: 12px; font-weight: 700; display: grid; place-items: center; }
.t-q-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
.t-lock { margin-left: 6px; color: var(--t-violet); font-weight: 600; font-size: 12px; }
.t-type { margin-left: 6px; color: var(--t-ink-3); font-size: 12px; }

.t-q-edit { margin-top: 10px; padding: 12px; border: 1px solid var(--t-line); border-radius: var(--t-radius-sm); background: var(--t-surface-2); display: flex; flex-direction: column; gap: 10px; }
.t-q-edit .t-field { display: flex; flex-direction: column; gap: 4px; }
.t-q-edit .t-field > span { font-size: 12px; color: var(--t-ink-2); font-weight: 600; }
.t-optgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.t-editgrid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }

.t-similar { display: flex; flex-direction: column; gap: 6px; }
.t-similar-item { display: flex; align-items: center; justify-content: space-between; gap: 8px; text-align: left; padding: 8px 10px; border: 1px solid var(--t-brand); border-radius: var(--t-radius-sm); background: var(--t-brand-faint); color: var(--t-ink); cursor: pointer; font-size: 13px; }
.t-similar-item b { color: var(--t-brand-deep); font-weight: 700; flex: none; }
@media (max-width: 900px) {
  .t-optgrid, .t-editgrid { grid-template-columns: 1fr; }
}
</style>