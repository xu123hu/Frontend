<template>
  <div class="view">
    <div class="greeting">
      <div class="hello">{{ detail?.title || '作业作答' }}</div>
      <div class="sub">答案与照片会真实提交给老师，教师确认后可在此查看终分和反馈。</div>
    </div>

    <div v-if="loading" class="empty-state"><div class="es-text">作业加载中…</div></div>
    <div v-else-if="error" class="empty-state"><div class="es-text">{{ error }}</div></div>
    <template v-else-if="detail">
      <div v-for="item in detail.items" :key="item.item_no" class="card" style="margin-bottom:12px;padding:18px">
        <h3>{{ item.item_no }}. {{ item.question_text }}</h3>
        <div v-if="item.q_type === 'choice'" style="display:grid;gap:8px">
          <label v-for="(text, key) in item.options || {}" :key="key">
            <input v-model="answers[item.item_no]" type="radio" :value="key"> {{ key }}. {{ text }}
          </label>
        </div>
        <input v-else-if="item.q_type === 'blank'" v-model="answers[item.item_no]" class="input" placeholder="填写答案">
        <template v-else>
          <textarea v-model="answers[item.item_no]" class="input" rows="6" placeholder="写出解题步骤，或拍照识别后修改"></textarea>
          <button class="secondary" type="button" :disabled="photo.busy[item.item_no]" @click="photo.pick(item.item_no)">
            {{ photo.busyText[item.item_no] || '📷 拍照上传解答' }}
          </button>
          <input :ref="photo.setInput(item.item_no)" type="file" accept="image/*" hidden
                 @change="photo.onPicked(item.item_no, $event, { onText: (text) => { answers[item.item_no] = text } })">
        </template>
      </div>
      <button class="primary" type="button" :disabled="submitting" @click="submit">
        {{ submitting ? '提交中…' : '提交给老师' }}
      </button>

      <div v-if="result" class="card" style="margin-top:16px;padding:18px">
        <h3>批改结果</h3>
        <p>状态：{{ result.status === 'graded' ? '教师已确认' : '等待教师确认' }}</p>
        <p v-if="result.total_score !== null">总分：{{ result.total_score }}</p>
        <div v-for="item in result.items" :key="item.submission_item_id" style="padding:8px 0;border-top:1px solid var(--line)">
          第 {{ item.item_no }} 题：{{ item.score ?? '待确认' }}
          <div v-if="item.teacher_feedback">老师反馈：{{ item.teacher_feedback }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { studentApi } from '@/api'
import { useSolutionPhoto } from '@/components/student/useSolutionPhoto'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const toast = useToastStore()
const photo = useSolutionPhoto(toast)
const detail = ref(null)
const result = ref(null)
const answers = reactive({})
const loading = ref(true)
const submitting = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    detail.value = await studentApi.assignmentDetail(route.params.id)
    try { result.value = await studentApi.assignmentResult(route.params.id) } catch { result.value = null }
  } catch (e) { error.value = e?.message || '作业加载失败' }
  finally { loading.value = false }
}

async function submit() {
  if (!detail.value || submitting.value) return
  const items = detail.value.items.map((item) => ({
    item_no: item.item_no,
    q_type: item.q_type,
    answer_text: answers[item.item_no] || null,
    ...(photo.fileIds[item.item_no] ? { file_id: photo.fileIds[item.item_no] } : {}),
  }))
  if (items.some((item) => !item.answer_text && !item.file_id)) {
    toast.error('请完成全部题目后再提交')
    return
  }
  submitting.value = true
  try {
    await studentApi.practiceSubmit({
      assignment_id: detail.value.assignment_id,
      client_submit_id: `assignment-${detail.value.assignment_id}-${Date.now()}`,
      items,
    })
    toast.success('已提交，等待老师确认')
    result.value = await studentApi.assignmentResult(detail.value.assignment_id)
  } catch (e) { toast.error(e?.message || '提交失败') }
  finally { submitting.value = false }
}

onMounted(load)
</script>
