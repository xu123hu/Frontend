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

        <div v-if="insufficiencyHint" class="t-api-note warn" role="alert">
          <b>题库供题不足</b>：本卷实际 {{ items.length }} 题（< 请求 {{ form.count }} 题）。请改用「换一题/找相似题」补齐，或在左侧降低题量后再发布。
        </div>

        <div class="t-row t-between">
          <button class="t-btn primary lg" type="button" :disabled="generating" @click="generatePaper">
            {{ generating ? '生成中…' : '✨ 生成试卷' }}
          </button>
          <div class="t-row" style="gap: 8px">
            <button v-if="items.length" class="t-btn lg" type="button" @click="previewAsStudent">
              👁 预览学生端
            </button>
            <button v-if="items.length" class="t-btn lg primary" type="button" :disabled="publishDisabled" :title="publishBlockReason" @click="publishPaper">
              {{ store.publishing ? '发布中…' : '确认并发布给学生' }}
            </button>
          </div>
        </div>
        <p v-if="publishDisabled && items.length" class="t-tiny t-warn" style="margin-top:6px">{{ publishBlockReason }}</p>
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
              <div class="qt"><LatexText :text="q.question_text" /></div>
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

    <!-- 预览学生端：学生视角整卷，隐藏答案/解析 -->
    <div v-if="studentPreviewOpen" class="t-modal-mask" @click.self="studentPreviewOpen = false">
      <div class="t-modal" role="dialog" aria-modal="true" aria-label="学生端预览">
        <div class="t-modal-head">
          <div>
            <h3>学生端预览</h3>
            <span class="t-sub">学生将看到以下整卷（答案与解析不可见），可逐题作答后提交</span>
          </div>
          <button class="t-btn sm" type="button" @click="studentPreviewOpen = false">关闭</button>
        </div>
        <div class="t-modal-body">
          <div class="t-spaper-head">
            <b>{{ typeOptions.find((t) => t.id === selectedType)?.title || '数学练习' }}</b>
            <span>{{ ctx.className }} · 共 {{ items.length }} 题 · {{ estimateMin }} 分钟</span>
          </div>
          <div v-for="(q, idx) in items" :key="q._key" class="t-spaper-q">
            <div class="t-spaper-no">{{ idx + 1 }}</div>
            <div class="t-spaper-body">
              <div class="qt"><LatexText :text="q.question_text" /></div>
              <div v-if="q.q_type === 'choice' && q.options" class="t-spaper-opts">
                <label v-for="(opt, oi) in q.options" :key="oi" class="t-spaper-opt">
                  <span class="t-spaper-letter">{{ 'ABCD'[oi] }}</span><LatexText :text="opt" />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import { artifactsApi } from '@/api/teacher/artifacts'
import { assignmentsApi } from '@/api/teacher/assignments'
import { useTeacherContextStore } from '@/stores/teacher/context'
import { useAssessmentStore } from '@/stores/teacher/assessment'
import { SCOPE_TO_KP, MONOTONICITY_BANK, replacementCandidates, type BankQuestion } from '@/mock/questionBank'
import LatexText from '@/components/LatexText.vue'
import type { Assignment, QuizQuestion, TeacherArtifact } from '@/types/teacher'

const route = useRoute()
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

// ---- 范围 → 知识点（出题范围与蓝图对齐，见 SCOPE_TO_KP） ----
// 范围映射收敛到 questionBank 的 SCOPE_TO_KP，避免双份知识点表漂移。

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
const studentPreviewOpen = ref(false)

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

// ---- 发布一致性门（RC-05-3 D1/发布门）：题数与设定一致 且 每题分值>0 且 总分>0 才可发布；任何不一致禁用并示因 ----
const totalMismatch = computed(() => items.value.length !== form.count)
const hasZeroScoreQ = computed(() => items.value.some((q) => !(q.score > 0)))
const sumScoreMismatch = computed(() => items.value.length > 0 && totalScore.value <= 0)
const insufficiencyHint = computed(() => items.value.length > 0 && totalMismatch.value)
const publishBlockReason = computed(() => {
  if (!items.value.length) return '请先生成试卷'
  if (totalMismatch.value) return `设定 ${form.count} 题，实际 ${items.value.length} 题，请补齐后发布`
  if (hasZeroScoreQ.value) return '存在分值为 0 或未设置的题目，请为每题设置分值'
  if (sumScoreMismatch.value) return '总分为 0，请为题目设置分值'
  if (store.publishing) return '正在发布…'
  return ''
})
const publishDisabled = computed(() => !publishBlockReason.value ? false : true)

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

// ---- 学生端预览：渲染交 KaTeX（LatexText 组件），非伪斜体替换 ----
function previewAsStudent() { studentPreviewOpen.value = true }

function restoreItemsFrom(raw: Array<Record<string, unknown>>) {
  items.value = raw.map(toEditable)
  editingIdx.value = -1
  similarList.value = []
}
function anyArtifact() {
  const content = store.quizArtifact?.content || {}
  const arr = (Array.isArray(content.items) ? content.items : []) as Array<Record<string, unknown>>
  if (arr.length) restoreItemsFrom(arr)
}

/** D2 草稿寻址：生成成功后把 artifact_id 写入 URL（history.replaceState），刷新可回同一草稿 */
function writeArtifactUrl() {
  const id = store.quizArtifact?.artifact_id
  if (!id) return
  if (route.query.artifact_id === id) return
  router.replace({ query: { ...route.query, artifact_id: id } })
}

async function restoreDraft() {
  const id = typeof route.query.artifact_id === 'string' ? route.query.artifact_id : ''
  if (!id || items.value.length) return
  try {
    store.quizArtifact = (await artifactsApi.get(id)).data
    anyArtifact()
    if (items.value.length) showToast?.('已恢复上次草稿，可继续编辑或发布')
  } catch (e: any) {
    showToast?.(e?.message || '草稿恢复失败，请重新生成')
  }
}

async function generatePaper() {
  if (generating.value || !form.classId) return
  generating.value = true
  // 范围 → 知识点名称（供 mock/后端按知识点分布取题）
  const kps = (SCOPE_TO_KP[form.scope] || SCOPE_TO_KP.monotonicity).map((k) => k.name)
  // 题型比例（小题量不越界）：choice 30% / blank 20% / 余解答
  const left = Math.max(1, form.count)
  const choice = left <= 1 ? 1 : Math.max(1, Math.round(left * 0.3))
  const blank = left <= 2 ? (left === 1 ? 0 : 1) : Math.max(1, Math.round(left * 0.2))
  try {
    await store.generateQuiz({
      class_id: form.classId,
      knowledge_points: kps,
      count: form.count,
      question_types: { choice, blank, text: Math.max(0, form.count - choice - blank) },
      difficulty: { easy: difficultyRatio.value.basic / 100, medium: difficultyRatio.value.medium / 100, hard: difficultyRatio.value.hard / 100 },
      exclude_hashes: [],
    })
    const raw = (store.quizArtifact?.content?.items || []) as Array<Record<string, unknown>>
    restoreItemsFrom(raw)
    // 高级蓝图参与：打开高级设置时按 知识点×难度 分值蓝图回填每题分值
    if (advancedOpen.value && blueprint.value.length) applyBlueprintScores()
    writeArtifactUrl()
    showToast?.(store.quizArtifact?.degraded ? '题库不足部分已用本地模板补齐，请确认后发布' : '试卷已生成，可逐题调整')
  } catch (e: any) { showToast?.(e?.message || store.error || '生成失败') }
  finally { generating.value = false }
}

/** 高级蓝图：按 知识点×难度 找到对应行分值；命中则为该题回填分值（蓝图真实影响试卷，不再只是展示） */
function applyBlueprintScores() {
  items.value.forEach((q) => {
    const name = q.kp_name || q.kp_code || ''
    const row = blueprint.value.find((b) => b.kp === name || name.includes(b.kp) || b.kp.includes(name))
    if (row) q.score = Number(q.difficulty === 'easy' ? row.easy : q.difficulty === 'hard' ? row.hard : row.medium) || q.score
  })
}

/** 把当前逐题编辑/替换结果写回 artifact（编辑并非一次性发布才落盘） */
function syncToArtifact() {
  if (!store.quizArtifact) return
  const content = { ...(store.quizArtifact.content || {}) }
  content.items = items.value.map(({ _key, locked, ...q }) => ({ ...q }))
  content.count = items.value.length
  store.quizArtifact = { ...store.quizArtifact, content }
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
  syncToArtifact()
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
    question_text: cand.question_text,
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
  syncToArtifact()
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
    if (classes.value.length) await restoreDraft()
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

/* ---- 发布一致性门 & 学生端预览（本组件局部，覆盖全局 .t-modal 的 display:none） ---- */
.t-api-note { margin: 0 0 10px; padding: 9px 12px; border-radius: var(--t-radius-sm); font-size: 13px; line-height: 1.5; }
.t-api-note.warn { background: rgba(244, 151, 52, .12); border: 1px solid var(--t-amber, #f49734); color: #7a4a0b; }
.t-warn { color: #b4550d; }

.t-modal-mask { position: fixed; inset: 0; background: rgba(15, 22, 38, .42); z-index: 90; display: flex; align-items: center; justify-content: center; padding: 20px; }
.t-modal { display: flex; flex-direction: column; background: #fff; border-radius: 18px; width: min(860px, 94vw); max-height: 84vh; box-shadow: 0 30px 90px rgba(0, 0, 0, .25); overflow: hidden; }
.t-modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--t-line); }
.t-modal-head h3 { margin: 0; font-size: 16px; }
.t-modal-head .t-sub { font-size: 12px; color: var(--t-ink-2); display: block; margin-top: 4px; }
.t-modal-body { padding: 6px 18px 18px; overflow: auto; }

.t-spaper-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 10px 2px 8px; border-bottom: 2px solid #000; margin-bottom: 4px; }
.t-spaper-head b { font-size: 15px; }
.t-spaper-head span { font-size: 12px; color: var(--t-ink-2); }
.t-spaper-q { display: flex; gap: 10px; padding: 10px 2px 4px; border-bottom: 1px dashed var(--t-line); }
.t-spaper-no { flex: none; width: 22px; font-weight: 700; font-size: 13px; }
.t-spaper-body { flex: 1; }
.t-spaper-body .qt { font-size: 14px; line-height: 1.6; }
.t-spaper-body :deep(i) { font-style: normal; font-family: 'Latin Modern', 'STIX', Georgia, serif; }
.t-spaper-opts { display: flex; flex-direction: column; gap: 3px; margin-top: 6px; }
.t-spaper-opt { display: flex; gap: 8px; font-size: 13px; cursor: pointer; }
.t-spaper-letter { font-weight: 700; color: var(--t-ink-2); }
</style>