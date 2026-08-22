<template>
  <div id="page-assign">
    <!-- 页面头部 -->
    <header class="t-page-head">
      <div class="t-page-title">
        <h1>作业与测验</h1>
        <p>选择题型和范围，AI 自动组卷，可逐题调整后发布给学生</p>
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

        <!-- 表单 4 列 -->
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

        <!-- 复选胶囊行 -->
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

        <!-- 难度比例 -->
        <div class="t-row t-between" style="margin-bottom: 8px">
          <span class="t-small t-muted">难度比例</span>
          <div class="t-row" style="gap: 6px">
            <span class="t-tag green">基础 {{ difficultyRatio.basic }}%</span>
            <span class="t-tag amber">提升 {{ difficultyRatio.medium }}%</span>
            <span class="t-tag violet">挑战 {{ difficultyRatio.hard }}%</span>
          </div>
        </div>

        <!-- 高级设置切换 -->
        <div style="margin-top: 12px">
          <button class="t-btn sm" type="button" @click="advancedOpen = !advancedOpen">
            <span aria-hidden="true">{{ advancedOpen ? '▾' : '▸' }}</span>
            高级设置
          </button>
        </div>

        <!-- 高级设置内容 -->
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

        <!-- 底部操作 -->
        <div class="t-row t-between">
          <button class="t-btn primary lg" type="button" :disabled="generating" @click="generatePaper">
            {{ generating ? '生成中…' : '✨ 生成试卷' }}
          </button>
          <button v-if="store.quizArtifact" class="t-btn lg" type="button" :disabled="store.publishing" @click="publishPaper">
            {{ store.publishing ? '发布中…' : '确认并发布给学生' }}
          </button>
          <span class="t-tiny t-muted">生成后可逐题替换、调整难度</span>
        </div>
      </div>

      <!-- 右栏 - 试卷预览 -->
      <div class="t-card">
        <div class="t-section-title">
          <div class="t-row" style="gap: 8px">
            <h2>试卷预览</h2>
            <span class="t-tag green">可编辑</span>
          </div>
          <span class="t-tiny t-muted">共 {{ previewQuestions.length }} 题 · 满分 100 分</span>
        </div>

        <div class="t-paper-preview">
          <div
            v-for="(q, idx) in previewQuestions"
            :key="q.id"
            class="t-q-row"
          >
            <div class="t-q-no">{{ idx + 1 }}</div>
            <div>
              <div class="qt">{{ q.text }}</div>
              <div class="qm">
                {{ q.kp }} · {{ q.difficultyLabel }} · {{ q.score }}分
              </div>
            </div>
            <div>
              <button class="t-btn sm" type="button" @click="replaceQuestion(idx)">
                换一题
              </button>
            </div>
          </div>
        </div>

        <div v-if="!previewQuestions.length" class="t-muted t-small" style="text-align: center; padding: 30px 0">
          点击「生成试卷」预览题目
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api/client'
import { artifactsApi } from '@/api/teacher/artifacts'
import { assignmentsApi } from '@/api/teacher/assignments'
import { useTeacherContextStore } from '@/stores/teacher/context'
import { useAssessmentStore } from '@/stores/teacher/assessment'
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

interface TypeOption {
  id: string
  icon: string
  title: string
  desc: string
  defaultCount: number
  defaultDuration: string
}

const typeOptions: TypeOption[] = [
  { id: 'quiz-20min', icon: '⏱️', title: '20分钟小测', desc: '课堂快速检测', defaultCount: 8, defaultDuration: '20' },
  { id: 'weekly', icon: '📅', title: '周作业', desc: '一周内容巩固', defaultCount: 12, defaultDuration: '30' },
  { id: 'unit-test', icon: '📝', title: '单元测验', desc: '章节综合考察', defaultCount: 20, defaultDuration: '45' },
  { id: 'wrong-review', icon: '🎯', title: '错题巩固', desc: '针对错题再练', defaultCount: 10, defaultDuration: '20' },
  { id: 'formal-exam', icon: '🏆', title: '正式考试', desc: '期中/期末模拟', defaultCount: 25, defaultDuration: '60' },
]

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

// 难度比例
const difficultyRatio = computed(() => {
  const type = typeOptions.find((t) => t.id === selectedType.value)
  if (type?.id === 'formal-exam') return { basic: 40, medium: 40, hard: 20 }
  if (type?.id === 'unit-test') return { basic: 50, medium: 35, hard: 15 }
  if (type?.id === 'wrong-review') return { basic: 30, medium: 50, hard: 20 }
  return { basic: 60, medium: 30, hard: 10 }
})

// 知识点蓝图
interface BlueprintRow {
  kp: string
  easy: number
  medium: number
  hard: number
}

const blueprint = ref<BlueprintRow[]>([
  { kp: '单调性的判定', easy: 20, medium: 15, hard: 5 },
  { kp: '单调性的证明', easy: 10, medium: 15, hard: 10 },
  { kp: '单调区间求解', easy: 10, medium: 10, hard: 5 },
])

// ---- 预览题目 ----
interface PreviewQuestion {
  id: string
  text: string
  kp: string
  difficultyLabel: string
  score: number
  difficulty: 'easy' | 'medium' | 'hard'
}

const previewQuestions = ref<PreviewQuestion[]>([])

// ---- 交互逻辑 ----
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
  const choice = Math.max(1, Math.floor(form.count * 0.3))
  const blank = Math.max(1, Math.floor(form.count * 0.2))
  try {
    await store.generateQuiz({
      class_id: form.classId,
      knowledge_points: ['MATH-002'],
      count: form.count,
      question_types: { choice, blank, text: Math.max(0, form.count - choice - blank) },
      difficulty: { easy: difficultyRatio.value.basic / 100, medium: difficultyRatio.value.medium / 100, hard: difficultyRatio.value.hard / 100 },
      exclude_hashes: [],
      client_request_id: `quiz-${Date.now()}`,
    })
    const items = (store.quizArtifact?.content?.items || []) as Array<any>
    previewQuestions.value = items.map((item, index) => ({
      id: String(item.hash || item.item_no || index),
      text: String(item.question_text || ''),
      kp: String(item.kp_code || '综合数学'),
      difficultyLabel: item.difficulty === 'hard' ? '挑战' : item.difficulty === 'medium' ? '提升' : '基础',
      score: item.q_type === 'solution' || item.q_type === 'text' ? 10 : 5,
      difficulty: item.difficulty || 'medium',
    }))
    showToast?.(store.quizArtifact?.degraded ? '题库不足部分已用本地模板补齐，请确认后发布' : '试卷已生成，可确认发布')
  } catch (e: any) { showToast?.(e?.message || store.error || '生成失败') }
  finally {
    generating.value = false
  }
}

async function publishPaper() {
  try {
    if (!store.quizArtifact) return
    store.quizArtifact = await artifactsApi.confirm(store.quizArtifact.artifact_id, `confirm:${store.quizArtifact.artifact_id}`)
    const type = typeOptions.find((item) => item.id === selectedType.value)
    await store.createAssignment({ class_id: form.classId, title: type?.title || '数学作业', artifact_id: store.quizArtifact.artifact_id })
    await store.publish()
    showToast?.('作业已发布，学生端任务中心现在可见')
  } catch (e: any) { showToast?.(e?.message || store.error || '发布失败') }
}

async function replaceQuestion(idx: number) {
  showToast?.(`正在重新生成试卷，以替换第 ${idx + 1} 题`)
  await generatePaper()
}

async function goToMyPapers() {
  papersOpen.value = true
  papersLoading.value = true
  try {
    papers.value = await assignmentsApi.list(form.classId || undefined)
  } catch (e: any) {
    showToast?.(e?.message || '试卷库加载失败')
  } finally {
    papersLoading.value = false
  }
}

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
