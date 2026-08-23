<template>
  <div class="view">
    <div class="greeting">
      <div class="hello">双师课堂</div>
      <div class="sub">主讲老师授课 + AI 辅导即时答疑，课后自动生成个性化巩固练习。</div>
    </div>

    <div v-if="loading" class="state-box">加载中…</div>
    <div v-else-if="error" class="state-box">⚠ {{ error }}<button style="margin-left:10px;" @click="load">重试</button></div>
    <div v-else-if="!courses.length" class="state-box">
      🎓 暂无课程，等老师开课或登记课程后这里会展示课堂内容
    </div>

    <template v-else>
      <div class="resource-filters" style="margin-bottom:14px;">
        <span
          v-for="c in courses" :key="c.course_id"
          class="filter" :class="{ active: currentId === c.course_id }"
          @click="select(c.course_id)"
        >{{ c.title }}</span>
      </div>

      <div v-if="current?.openmaic" class="openmaic-embed">
        <div class="openmaic-head">
          <span class="openmaic-title">{{ current.title }} · 交互双师课堂</span>
          <span class="openmaic-tag">OpenMAIC</span>
        </div>
        <iframe
          :key="current.openmaic.classroom_url"
          :src="current.openmaic.classroom_url"
          title="双师课堂"
          allow="microphone; camera; autoplay; fullscreen"
          allowfullscreen
          loading="lazy"
        ></iframe>
        <div class="openmaic-hint">AI 主讲老师 + AI 助教实时授课，可随讲随问，课后自动巩固。</div>
      </div>

      <!-- 未绑定 OpenMAIC 课堂时的旧占位：绑定了则只显示真实 OpenMAIC 课堂 -->
      <template v-else>
      <div class="dual-hero">
        <div class="dual-video">
          <div class="live-badge"><span class="pulse"></span> {{ statusLabel(current?.status) }}</div>
          <div class="teacher">
            <div class="avatar-big">课</div>
            <div class="nm">{{ current?.title || '未命名课程' }}</div>
            <div class="role">{{ current?.chapter_count ?? 0 }} 个章节 · {{ dateText(current?.created_at) }}</div>
            <div class="topic" v-if="detailLoading">📖 章节加载中…</div>
            <div class="topic" v-else-if="chapters.length">📖 章节：{{ chapters.map((ch) => ch.title).join(' / ') }}</div>
            <div class="topic" v-else>📖 课程预处理完成后会展示章节内容</div>
          </div>
          <div class="meta" v-if="detail?.kp_codes?.length">🎯 覆盖知识点 {{ detail.kp_codes.length }} 个 · 知识卡 {{ detail.knowledge_cards?.length ?? 0 }} 张</div>
        </div>
        <div class="dual-controls">
          <div class="left">
            <button v-for="b in ctrls" :key="b.label" :class="{ active: b.active }" @click="ctrl(b)">{{ b.label }}</button>
          </div>
          <div class="progress-msg">看课完成 → 自动进入个性化巩固（随堂测 + 变式训练）</div>
          <div>
            <button class="save-btn" @click="save">📌 收藏本课</button>
          </div>
        </div>
      </div>

      <div class="dual-side">
        <div class="ai-qa-panel">
          <h4>🤖 AI 实时答疑 · π 在听</h4>
          <div style="font-size:11.5px;color:var(--ink2);margin-bottom:12px;">你可以在看课时随时提问，AI 基于当前讲解内容即时回答；疑难问题自动汇总给主讲老师。</div>
          <div v-for="(q, i) in qas" :key="i" class="qa-item">
            <div class="q">{{ q.q }}</div>
            <div class="a" v-html="q.a"></div>
          </div>
          <div class="ask-input">
            <input v-model="askDraft" placeholder='向 AI 提问，或输入"老师这段我没懂"...' @keydown.enter="ask" />
            <button @click="ask">提问</button>
          </div>
        </div>

        <div class="notes-panel">
          <h4>📝 我的课堂笔记 · 自动同步</h4>
          <div style="font-size:11.5px;color:var(--ink2);margin-bottom:10px;">系统根据视频时间轴自动记录关键板书 + 你的笔记 ↓</div>
          <textarea v-model="notes"></textarea>
          <div style="display:flex;gap:8px;margin-top:10px;font-size:11.5px;color:var(--ink3);">
            <span style="margin-left:auto;color:var(--ok-deep);font-weight:700;">✓ 已同步到错题本</span>
          </div>
        </div>
      </div>

      <div style="margin-top:18px;background:linear-gradient(135deg,var(--brand-faint),var(--brand-soft));border:1px dashed var(--warn-border);border-radius:var(--radius-lg);padding:18px 22px;display:flex;align-items:center;gap:14px;">
        <div style="font-size:36px;">🎓</div>
        <div style="flex:1;">
          <div style="font-size:14.5px;font-weight:800;">课程结束 → 自动进入个性化巩固</div>
          <div style="font-size:12.5px;color:var(--ink2);margin-top:4px;">系统会根据你的错题记录自动推 <b>变式训练</b>（含你错过的同类题 + 难度递进题）。</div>
        </div>
        <button style="padding:10px 18px;background:var(--brand);color:#fff;border:none;border-radius:8px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;" @click="schedule">📅 排到练题中心</button>
      </div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '@/api/client'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
const router = useRouter()

const loading = ref(true)
const error = ref('')
const courses = ref([])
const currentId = ref('')
const detail = ref(null)
const detailLoading = ref(false)

const current = computed(() => courses.value.find((c) => c.course_id === currentId.value) || null)
const chapters = computed(() => detail.value?.chapters || [])

const STATUS_LABELS = {
  ready: '已就绪',
  pending: '排队中',
  processing: '预处理中',
  failed: '预处理失败',
}
function statusLabel(s) {
  return STATUS_LABELS[s] || s || '未知状态'
}
function dateText(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

async function loadDetail(id) {
  detailLoading.value = true
  detail.value = null
  try {
    detail.value = await api.get(`/courses/${id}`)
  } catch (e) {
    // 详情失败（如无权限）不崩页，仅提示，保留列表信息展示
    toast.error(e instanceof ApiError ? `课程详情加载失败：${e.message}` : '课程详情加载失败')
  } finally {
    detailLoading.value = false
  }
}

function select(id) {
  if (!id || id === currentId.value) return
  currentId.value = id
  loadDetail(id)
}

async function load() {
  loading.value = true
  error.value = ''
  courses.value = []
  currentId.value = ''
  detail.value = null
  try {
    const data = await api.get('/courses')
    courses.value = data?.items || []
    if (courses.value.length) {
      currentId.value = courses.value[0].course_id
      loadDetail(currentId.value)
    }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

const ctrls = ref([
  { label: '▶ 播放', active: true },
  { label: '⏸ 暂停', active: false },
  { label: '🔊 音量', active: false },
  { label: '📺 全屏', active: false },
])
function ctrl(b) {
  ctrls.value.forEach((x) => (x.active = false))
  b.active = true
  if (b.label.includes('暂停')) toast.info('已暂停（模拟）')
  else if (b.label.includes('全屏')) toast.info('📺 已切换全屏（模拟）')
  else if (b.label.includes('音量')) toast.info('🔊 音量已调至 70%（模拟）')
}

const qas = ref([
  { q: '❓ 刚才讲的"端点必比较"如何记忆？', a: '💡 闭区间最值有 3 个候选点——<b>极值点、两个端点</b>。记忆口诀："先找导零，再代端点，谁大谁小"。' },
  { q: '❓ 这道例题和错题本里的题是不是同一类？', a: '📌 是的。这是你的高频错题类型。课程结束后系统会推同类变式到你的练题中心。' },
])
const askDraft = ref('')
const notes = ref('')

function ask() {
  const t = askDraft.value.trim()
  if (!t) return
  qas.value.push({ q: `❓ ${t}`, a: '💡 AI 已收到你的问题，正在基于当前讲解内容分析…（模拟回答）' })
  askDraft.value = ''
}
function save() {
  toast.success(`📌 已收藏本课：${current.value?.title || ''}`)
}
function schedule() {
  toast.success('已排入练题中心：变式训练')
  router.push('/practice')
}

onMounted(load)
</script>

<style scoped>
.save-btn {
  padding: 8px 14px; background: var(--brand); color: #fff; border: none;
  border-radius: 8px; font: inherit; font-size: 12.5px; font-weight: 700; cursor: pointer;
}
.state-box {
  padding: 40px 20px;
  text-align: center;
  color: var(--ink3);
  font-size: 13px;
  background: var(--card-bg, #fff);
  border: 1px dashed var(--line, #e5e7eb);
  border-radius: var(--radius-lg, 12px);
}
.openmaic-embed {
  margin-bottom: 16px;
  background: #fff;
  border: 1px solid var(--line, #e5e7eb);
  border-radius: var(--radius-lg, 12px);
  overflow: hidden;
}
.openmaic-head {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--line, #eef1f5);
  background: linear-gradient(135deg, var(--brand-faint, #f3f7ff), #fff);
}
.openmaic-title { font-size: 14px; font-weight: 800; color: var(--ink1, #1f2329); }
.openmaic-tag {
  margin-left: auto;
  font-size: 11px; font-weight: 700; color: var(--brand, #3b7bff);
  background: rgba(59,123,255,.1); padding: 2px 8px; border-radius: 999px;
}
.openmaic-embed iframe {
  width: 100%; height: 62vh; min-height: 420px;
  border: 0; display: block; background: #0f0f12;
}
.openmaic-hint {
  padding: 8px 14px; font-size: 12px; color: var(--ink2, #646a73);
  background: var(--brand-faint, #f6f9ff);
}
</style>
