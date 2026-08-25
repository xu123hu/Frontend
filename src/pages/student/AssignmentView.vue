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
        </template>

        <HomeworkPhotos
          v-if="!submitted"
          v-model="photos[item.item_no]"
          :max="3"
          @ocr="(t) => { answers[item.item_no] = t }"
        />
        <div v-if="submitted && resultPhotos[item.item_no]?.length" class="submitted-photos">
          <img
            v-for="(src, i) in resultPhotos[item.item_no]"
            :key="i" :src="src" alt="作答照片"
            @click="openLightbox(src)"
          />
        </div>
      </div>

      <button v-if="!submitted" class="primary" type="button" :disabled="submitting" @click="submit">
        {{ submitting ? '提交中…' : '提交给老师' }}
      </button>

      <div v-if="result" class="card" style="margin-top:16px;padding:18px">
        <h3>批改结果</h3>
        <p>状态：{{ result.status === 'graded' ? '教师已确认' : '等待教师确认' }}</p>
        <p v-if="result.total_score !== null">总分：{{ result.total_score }}</p>
        <div v-for="item in result.items" :key="item.submission_item_id" style="padding:8px 0;border-top:1px solid var(--line)">
          第 {{ item.item_no }} 题：{{ item.score ?? '待确认' }}
          <div v-if="item.answer_text" style="font-size:12px;color:var(--ink2);margin-top:2px;">你的作答：{{ item.answer_text }}</div>
          <div v-if="item.teacher_feedback">老师反馈：{{ item.teacher_feedback }}</div>
          <div v-if="item.attachments?.length" class="result-photos">
            <img
              v-for="(src, i) in resultPhotos[item.item_no] || []"
              :key="i" :src="src" alt="作答照片"
              @click="openLightbox(src)"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { studentApi, filesApi } from '@/api'
import HomeworkPhotos from '@/components/student/HomeworkPhotos.vue'
import { openLightbox } from '@/utils/lightbox'
import { useToastStore } from '@/stores/toast'

const route = useRoute()
const toast = useToastStore()
const detail = ref(null)
const result = ref(null)
const answers = reactive({})
const photos = reactive({}) // item_no -> [{file_id}]
const resultPhotos = reactive({}) // item_no -> [presigned urls]
const loading = ref(true)
const submitting = ref(false)
const submitted = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    detail.value = await studentApi.assignmentDetail(route.params.id)
    try { result.value = await studentApi.assignmentResult(route.params.id) } catch { result.value = null }
    if (result.value) {
      submitted.value = true
      await resolveResultPhotos(result.value)
    }
  } catch (e) { error.value = e?.message || '作业加载失败' }
  finally { loading.value = false }
}

/** 预签名缩略图：学生提交的照片附件（含 OCR 文本兜底展示） */
async function resolveResultPhotos(submission) {
  for (const item of submission.items || []) {
    const ids = (item.attachments || []).map((a) => a.file_id).filter(Boolean)
    if (!ids.length) continue
    resultPhotos[item.item_no] = []
    for (const fid of ids) {
      try {
        const d = await filesApi.contentUrl(fid)
        if (d?.url) resultPhotos[item.item_no].push(d.url)
      } catch { /* 图片暂不可用：跳过缩略图 */ }
    }
  }
}

async function submit() {
  if (!detail.value || submitting.value) return
  const items = detail.value.items.map((item) => ({
    item_no: item.item_no,
    q_type: item.q_type,
    answer_text: answers[item.item_no] || null,
    attachments: photos[item.item_no] || [],
  }))
  if (items.some((item) => !item.answer_text && !item.attachments.length)) {
    toast.error('请完成全部题目后再提交（可填写答案或上传解答照片）')
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
    submitted.value = true
    result.value = await studentApi.assignmentResult(detail.value.assignment_id)
    await resolveResultPhotos(result.value)
  } catch (e) { toast.error(e?.message || '提交失败') }
  finally { submitting.value = false }
}

onMounted(load)
</script>

<style scoped>
.submitted-photos, .result-photos { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.submitted-photos img, .result-photos img {
  width: 96px; height: 72px; object-fit: cover; border-radius: 8px;
  border: 1px solid var(--line); cursor: zoom-in;
}
</style>
