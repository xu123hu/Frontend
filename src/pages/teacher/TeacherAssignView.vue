<template>
  <section class="tdr-ws" :aria-label="'布置作业'">
    <header class="tdr-ws-head">
      <h1>布置作业</h1>
      <p class="tdr-ws-desc">指定知识点与题型，生成题集、逐题编辑、确认后创建作业草稿并单独发布。</p>
    </header>

    <form class="tdr-card tfrm" @submit.prevent="generate">
      <div class="tfrm-row">
        <div class="tfrm-field">
          <label for="as-kp">知识点</label>
          <input id="as-kp" v-model="kps" placeholder="逗号分隔，如：函数单调性, 导数" />
        </div>
        <div class="tfrm-field">
          <label for="as-count">题量</label>
          <input id="as-count" v-model.number="count" type="number" min="1" max="100" />
        </div>
        <div class="tfrm-field"><label>选择题</label><input v-model.number="choice" type="number" min="0" :max="count" /></div>
        <div class="tfrm-field"><label>填空题</label><input v-model.number="blank" type="number" min="0" :max="count" /></div>
        <div class="tfrm-field"><label>解答题</label><input v-model.number="textQ" type="number" min="0" :max="count" /></div>
      </div>
      <div class="tfrm-actions">
        <button class="tdr-btn primary" type="submit" :disabled="store.generating || !kps.trim()">
          {{ store.generating ? '生成中…' : '生成题集' }}
        </button>
      </div>
    </form>

    <div v-if="store.error" class="tdr-banner err">{{ store.error }}</div>
    <div v-if="quiz?.insufficient" class="tdr-banner err">题库不足，实际生成数量少于请求。</div>

    <div v-if="quiz" class="tdr-ws-block">
      <div class="tdr-ws-h-row"><h3 class="tdr-ws-h">题集草稿</h3><span class="tdr-badge draft">草稿</span></div>

      <div v-for="(q, i) in quiz.items" :key="i" class="tq">
        <div class="tq-head">
          <div class="tq-meta"><span class="tdr-badge draft">{{ q.q_type }}</span><span class="muted">{{ q.difficulty }}</span></div>
          <div class="tq-actions">
            <button class="tdr-btn slim" type="button" @click="startEditItem(i)">编辑</button>
            <button class="tdr-btn slim" type="button" @click="removeItem(i)">删除</button>
            <button class="tdr-btn slim" type="button" @click="replaceItem(i)">换题</button>
          </div>
        </div>
        <p class="tq-text">{{ q.question_text }}</p>
        <div v-if="editingIdx === i" class="tedit" style="width:100%">
          <textarea v-model="editingText" aria-label="编辑题目"></textarea>
          <div class="tfrm-actions">
            <button class="tdr-btn primary" type="button" @click="saveEditItem(i)">保存</button>
            <button class="tdr-btn" type="button" @click="editingIdx = -1">取消</button>
          </div>
        </div>
        <div class="tq-meta" v-if="q.kp_name"><span class="muted">考点：{{ q.kp_name }}</span></div>
      </div>

      <div class="tdr-ws-block">
        <div class="tfrm-actions">
          <button class="tdr-btn primary" type="button" :disabled="!quiz.items.length || !!store.assignment" @click="confirmQuiz">确认题集 → 创建作业草稿</button>
          <span v-if="store.assignment" class="tdr-badge" :class="store.assignment.status">{{ store.assignment.status }}</span>
          <button v-if="store.assignment?.status === 'draft'" class="tdr-btn" type="button" :disabled="store.publishing" @click="publish">
            {{ store.publishing ? '发布中…' : '发布作业' }}
          </button>
        </div>
        <p v-if="store.assignment?.status === 'draft'" class="muted" style="font-size:12px">作业尚未发布，学生不会收到。</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAssessmentStore } from '@/stores/teacher/assessment'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import type { QuizSet, QuizQuestion } from '@/types/teacher'

const store = useAssessmentStore()
const { confirm } = useConfirm()
const toast = useToastStore()

const kps = ref('函数单调性')
const count = ref(8)
const choice = ref(4)
const blank = ref(2)
const textQ = ref(2)
const editingIdx = ref(-1)
const editingText = ref('')

const quiz = computed(() => (store.quizArtifact?.content as unknown as QuizSet) || null)

async function generate() {
  await store.generateQuiz({
    knowledge_points: kps.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
    count: count.value,
    question_types: { choice: choice.value, blank: blank.value, text: textQ.value },
    difficulty: { easy: 0.25, medium: 0.5, hard: 0.25 },
  })
  editingIdx.value = -1
}

function startEditItem(i: number) { editingIdx.value = i; editingText.value = quiz.value.items[i].question_text }
function saveEditItem(i: number) {
  const items = quiz.value.items.map((q, idx) => idx === i ? { ...q, question_text: editingText.value } : q)
  store.patchQuiz({ items })
  editingIdx.value = -1
}
function removeItem(i: number) { store.patchQuiz({ items: quiz.value.items.filter((_, idx) => idx !== i) }) }
function replaceItem(i: number) { toast.info('换题：已模拟为该题申请替代题库条目'); }

async function confirmQuiz() {
  const ok = await confirm({ title: '确认题集', message: '确认后将据此创建作业草稿，学生暂不可见。', confirmText: '确认并创建' })
  if (!ok) return
  try {
    await store.createAssignment({ class_id: store.quizArtifact?.class_id || null, title: kps.value + ' · 巩固练习', quiz_set: quiz.value })
    toast.success('作业草稿已创建')
  } catch { toast.error('创建作业草稿失败') }
}

async function publish() {
  if (!store.assignment) return
  const ok = await confirm({ title: '发布作业', message: '发布后学生将收到该作业，请二次确认。', confirmText: '发布' })
  if (!ok) return
  try { await store.publish(store.assignment.assignment_id); toast.success('作业已发布') } catch { toast.error('发布失败') }
}
</script>