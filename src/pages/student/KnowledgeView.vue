<template>
  <div class="view">
    <div class="greeting">
      <div class="hello">📚 我的知识库</div>
      <div class="sub">上传教材、笔记、试卷——AI 解析切片后，对话能引用、能基于它出题和讲解。教材与题目分库存放，互不混淆。</div>
    </div>

    <!-- 库 tab -->
    <div class="kb-tabs">
      <button :class="{ active: tab === 'textbook' }" @click="tab = 'textbook'">📚 我的教材库</button>
      <button :class="{ active: tab === 'questions' }" @click="tab = 'questions'">📝 我的题库</button>
    </div>

    <!-- 上传区 -->
    <div class="kb-upload card" :class="{ drag }"
         @dragover.prevent="drag = true" @dragleave.prevent="drag = false" @drop.prevent="onDrop">
      <div class="kb-up-ic">📁</div>
      <div class="kb-up-txt">拖拽或选择文件上传（PDF / Word / PPT / Markdown / 图片，≤{{ MAX_MB }}MB）</div>
      <div class="kb-up-sub">上传后自动：解析 → 切片 → 向量化 → 知识点打标，进度实时可见</div>
      <label class="kb-up-btn">
        ＋ 选择文件
        <input type="file" hidden :accept="ACCEPT" @change="onPick" />
      </label>
    </div>

    <!-- 文档列表 -->
    <div class="kb-list">
      <div v-if="loading" style="padding:26px;text-align:center;color:var(--ink3);font-size:13px;">加载中…</div>
      <div v-else-if="loadError" style="padding:20px;text-align:center;color:var(--err);font-size:13px;">
        {{ loadError }}
        <div style="margin-top:8px;"><button class="kb-retry" @click="load">重试</button></div>
      </div>
      <div v-else-if="!docs.length" style="padding:26px;text-align:center;color:var(--ink3);font-size:13px;">
        还没有资料。先传一本教材或一份笔记，AI 就能基于你的资料出题和讲解。
      </div>
      <div v-else v-for="d in docs" :key="d.id" class="kb-doc">
        <div class="kd-ic">{{ typeIcon(d.title) }}</div>
        <div class="kd-body">
          <div class="kd-title">{{ d.title }}</div>
          <div class="kd-meta">
            <span :class="['kd-st', statusClass(d.status)]">{{ statusZh(d) }}</span>
            <span v-if="d.page_count">📄 {{ d.page_count }} 页</span>
            <span v-if="d.chunk_count">🧩 {{ d.chunk_count }} 切片</span>
            <span>📅 {{ fmtDate(d.created_at) }}</span>
          </div>
          <div v-if="isActive(d.status)" class="kd-bar"><div class="kd-bar-fill" :style="{ width: (d.progress || 5) + '%' }"></div></div>
          <div v-if="d.status === 'failed'" class="kd-err">{{ errMsg(d.error) }}</div>
        </div>
        <div class="kd-ops">
          <button class="kd-op" :disabled="isActive(d.status)" @click="reingest(d)" title="重新解析（切片/向量化重跑，幂等不重复）">↻ 重新解析</button>
          <button class="kd-op danger" :disabled="isActive(d.status)" @click="removeDoc(d)">删除</button>
        </div>
      </div>
    </div>

    <div class="kb-note">💡 在对话里直接说「基于我上传的资料出 5 道题」即可引用这里的内容；上传的原文不会被解析结果覆盖。</div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const auth = useAuthStore()
const toast = useToastStore()
const uid = computed(() => auth.user?.id || auth.user?.user_id || '')

const props = defineProps({ initialTab: { type: String, default: 'textbook' } })
const tab = ref(props.initialTab === 'questions' ? 'questions' : 'textbook') // textbook | questions
const docs = ref([])
const loading = ref(false)
const loadError = ref('')
const drag = ref(false)

const ACCEPT = '.pdf,.docx,.pptx,.md,.txt,.png,.jpg,.jpeg'
const MAX_MB = 30
let pollTimer = null

const isActive = (s) => ['pending', 'parsing', 'chunking', 'embedding'].includes(s)

function typeIcon(name = '') {
  const n = name.toLowerCase()
  if (n.endsWith('.pdf')) return '📕'
  if (/\.(png|jpe?g)$/.test(n)) return '🖼️'
  if (/\.(docx?|pptx?)$/.test(n)) return '📘'
  return '📄'
}
function statusZh(d) {
  return ({ ready: '✓ 已解析', pending: '排队中', parsing: '解析中', chunking: '切片中', embedding: '向量化中', failed: '✗ 失败' })[d.status] || d.status
}
function statusClass(s) {
  return s === 'ready' ? 'ok' : s === 'failed' ? 'bad' : 'doing'
}
function errMsg(e) {
  if (!e) return '解析失败，可点击「重新解析」重试'
  return typeof e === 'string' ? e : (e.message || e.reason || '解析失败')
}
function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const r = await api.raw('GET', '/v1/kb/documents', { query: { kb_name: 'default', user_id: uid.value } })
    docs.value = r.data?.items || []
    schedulePoll()
  } catch (e) {
    // 首次使用/未建库：kb_not_found（404）是正常空态，不是错误
    const msg = e?.message || ''
    if (e?.code === 404 || e?.status === 404 || /不存在/.test(msg)) {
      docs.value = []
      loadError.value = ''
    } else {
      loadError.value = typeof msg === 'string' ? msg : '加载失败'
    }
  } finally {
    loading.value = false
  }
}

// 解析中的文档存在时 5s 轮询进度
function schedulePoll() {
  clearTimeout(pollTimer)
  if (docs.value.some((d) => isActive(d.status))) {
    pollTimer = setTimeout(load, 5000)
  }
}

async function onPick(e) {
  const files = [...(e.target.files || [])]
  e.target.value = ''
  for (const f of files) await uploadOne(f)
}
function onDrop(e) {
  drag.value = false
  const files = [...(e.dataTransfer?.files || [])]
  if (files.length) files.slice(0, 3).forEach((f) => uploadOne(f))
}

async function uploadOne(f) {
  if (f.size > MAX_MB * 1024 * 1024) {
    toast.error(`${f.name} 超过 ${MAX_MB}MB 上限`)
    return
  }
  const fd = new FormData()
  fd.append('file', f)
  fd.append('kb_name', 'default')
  fd.append('user_id', uid.value)
  try {
    const r = await api.raw('POST', '/v1/kb/upload', { body: fd })
    toast.success(`${f.name}：${r.data?.duplicate ? '已存在，断点续传解析' : '上传成功，开始解析'}`)
    await load()
  } catch (e) {
    toast.error(`${f.name} 上传失败：${e?.message || '未知错误'}`)
  }
}

async function reingest(d) {
  try {
    await api.raw('POST', '/v1/kb/upload', { body: await fileFromDoc(d) })
    toast.info('已重新拉起解析管线')
    await load()
  } catch {
    toast.error('重新解析失败（原文文件缺失时可删除后重传）')
  }
}
// 重新解析 = 用原文重传（后端 sha 断点续传语义幂等）
async function fileFromDoc(d) {
  const resp = await fetch(d.file_uri)
  const blob = await resp.blob()
  return new File([blob], d.title, { type: blob.type || 'application/octet-stream' })
}

async function removeDoc(d) {
  if (!window.confirm(`删除「${d.title}」？其切片与图谱关联将一并移除。`)) return
  try {
    await api.raw('DELETE', `/v1/kb/documents/${d.id}`, { query: { user_id: uid.value } })
    toast.success('已删除')
    await load()
  } catch (e) {
    toast.error(e?.message || '删除失败')
  }
}

onMounted(load)
onBeforeUnmount(() => clearTimeout(pollTimer))
</script>

<style scoped>
.kb-tabs { display: flex; gap: 8px; margin-bottom: 14px; }
.kb-tabs button {
  padding: 8px 18px; border-radius: 999px; border: 1px solid var(--line); background: var(--card);
  font: inherit; font-size: 13.5px; font-weight: 600; color: var(--ink2); cursor: pointer;
}
.kb-tabs button.active { background: var(--primary-subtle); border-color: var(--primary-border); color: var(--primary); }
.kb-upload {
  border: 2px dashed var(--line); border-radius: var(--radius-xl, 22px); padding: 26px;
  text-align: center; margin-bottom: 16px; transition: all .2s ease;
}
.kb-upload.drag { border-color: var(--primary); background: var(--primary-subtle); }
.kb-up-ic { font-size: 30px; margin-bottom: 6px; }
.kb-up-txt { font-size: 14px; font-weight: 600; color: var(--ink); }
.kb-up-sub { font-size: 12px; color: var(--ink3); margin: 6px 0 12px; }
.kb-up-btn {
  display: inline-block; padding: 9px 22px; border-radius: 999px; cursor: pointer;
  background: var(--gradient-brand); color: #fff; font-size: 13px; font-weight: 700;
}
.kb-doc {
  display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px;
  background: var(--card); border: 1px solid var(--line); border-radius: 14px; margin-bottom: 10px;
}
.kd-ic { font-size: 24px; }
.kd-body { flex: 1; min-width: 0; }
.kd-title { font-size: 14px; font-weight: 700; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kd-meta { display: flex; gap: 12px; font-size: 12px; color: var(--ink3); margin-top: 4px; flex-wrap: wrap; }
.kd-st.ok { color: var(--ok-deep); font-weight: 700; }
.kd-st.doing { color: var(--primary); font-weight: 700; }
.kd-st.bad { color: var(--err-deep); font-weight: 700; }
.kd-bar { height: 4px; background: var(--skeleton-bg); border-radius: 99px; margin-top: 8px; overflow: hidden; }
.kd-bar-fill { height: 100%; background: var(--gradient-brand); border-radius: 99px; transition: width .5s ease; }
.kd-err { font-size: 11.5px; color: var(--err-deep); margin-top: 6px; }
.kd-ops { display: flex; flex-direction: column; gap: 6px; }
.kd-op {
  padding: 6px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--card);
  font: inherit; font-size: 11.5px; color: var(--ink2); cursor: pointer; white-space: nowrap;
}
.kd-op.danger { color: var(--err); }
.kd-op:hover:not(:disabled) { border-color: var(--primary-border); color: var(--primary); }
.kd-op:disabled { opacity: .5; cursor: not-allowed; }
.kb-retry { padding: 6px 16px; border-radius: 8px; border: 1px solid var(--line); background: var(--card); font: inherit; font-size: 12px; cursor: pointer; }
.kb-note { margin-top: 14px; font-size: 12px; color: var(--ink3); line-height: 1.6; }
</style>
