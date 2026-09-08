<template>
  <div class="re-scroll">
    <div class="re-hero">
      <div class="re-greet">{{ greeting }}，{{ name }} 👋</div>
      <h1>今天想<span>读哪篇论文</span>？</h1>
      <p>粘贴 DOI、上传 PDF，或直接告诉我你想读懂什么、写什么、检查什么</p>
      <div class="re-prompt" data-testid="rs-home-prompt">
        <div class="re-clip">⌕</div>
        <input
          v-model="promptText"
          placeholder="输入问题、粘贴 DOI / URL，或搜索文献库标题 / 作者…"
          @keydown.enter="onPromptSubmit"
        />
        <button class="re-send" aria-label="发送" @click="onPromptSubmit">➤</button>
      </div>
      <div class="re-hint">
        <span>⌁ 多格式导入（PDF / DOI / URL / BibTeX）</span><i>·</i>
        <span>↗ 上传即解析入知识库</span><i>·</i>
        <span>⌗ AI 回答带页码与来源</span>
      </div>

      <!-- 提问即解答：首页内联 AI 问答 -->
      <div v-if="ask.open" class="re-ask-card" data-testid="rs-home-ask">
        <div class="re-ask-q">Q：{{ ask.question }}</div>
        <p :class="{ 're-ai-cursor': ask.streaming }">{{ ask.answer || (ask.streaming ? '正在结合知识库作答…' : '') }}</p>
        <div v-if="ask.sources.length" class="re-source-proof">
          <strong>回答依据（知识库 / 联网候选）</strong>
          <div v-for="(s, i) in ask.sources" :key="i">{{ s.cite }} · 《{{ s.title }}》{{ s.method ? ' · 检索:' + s.method : '' }}</div>
        </div>
        <div v-if="ask.error" class="re-error" style="margin-top:8px">{{ ask.error }}</div>
        <div class="re-ask-actions">
          <button class="re-btn sm" :disabled="ask.streaming" @click="streamAsk(ask.question)">重新提问</button>
          <button class="re-btn sm" data-testid="rs-ask-search" :disabled="ask.streaming" @click="searchInLibrary(ask.question)">在文献库中搜索「{{ (ask.question||'').slice(0,14) }}{{ (ask.question||'').length>14?'…':'' }}」</button>
          <button v-if="ask.streaming" class="re-btn sm" @click="abortAsk()">停止</button>
        </div>
      </div>
    </div>

    <div class="re-shortcuts">
      <button class="re-shortcut" data-testid="rs-card-read" @click="goReader">
        <div class="re-sicon blue">▣</div>
        <h3>继续阅读</h3>
        <p>回到最近打开的论文，恢复原页码并继续标注与提问</p>
      </button>
      <button class="re-shortcut" data-testid="rs-card-import" @click="router.push('/research/import')">
        <div class="re-sicon cyan">↥</div>
        <h3>上传 / 收录论文</h3>
        <p>上传 PDF、粘贴 DOI/URL，自动解析去重并进入知识库</p>
      </button>
      <button class="re-shortcut" data-testid="rs-card-library" @click="router.push('/research/library')">
        <div class="re-sicon violet">▤</div>
        <h3>打开文献库</h3>
        <p>按集合、标签、作者、年份与全文检索你的论文库</p>
      </button>
      <button class="re-shortcut" data-testid="rs-card-writing" @click="router.push('/research/writing')">
        <div class="re-sicon orange">✓</div>
        <h3>继续写作 / 导入文稿</h3>
        <p>打开 LaTeX 文稿，边写边检查符号、引用与格式</p>
      </button>
    </div>

    <section class="re-section">
      <div class="re-section-title">
        <h2>最近工作</h2>
        <a class="re-link" @click="router.push('/research/library')">打开文献库 ›</a>
      </div>

      <div v-if="loading" class="re-loading">正在加载…</div>
      <div v-else-if="errorMsg" class="re-error">{{ errorMsg }}</div>

      <template v-else-if="summary">
        <div class="re-recent" v-if="summary.recent_papers.length || summary.recent_manuscripts.length">
          <button v-for="p in summary.recent_papers.slice(0, 4)" :key="'p'+p.id" class="re-recent-item" data-testid="rs-recent-paper" @click="openPaper(p)">
            <div class="re-r-icon">▤</div>
            <div class="re-r-copy">
              <strong>{{ p.title }}</strong>
              <small>{{ authorsOf(p) }} · {{ p.venue || '期刊/预印本' }} · {{ p.year || '—' }}</small>
            </div>
            <span class="re-pill" :class="pillClass(p.reading_status)">{{ readingLabel(p.reading_status) }}</span>
            <span class="re-chev">›</span>
          </button>
          <button v-for="md in summary.recent_manuscripts.slice(0, 2)" :key="'m'+md.id" class="re-recent-item" data-testid="rs-recent-ms" @click="router.push(`/research/writing/${md.id}`)">
            <div class="re-r-icon cyanbg">✓</div>
            <div class="re-r-copy">
              <strong>{{ md.title }}</strong>
              <small>{{ md.word_count }} 字 · {{ compileLabel(md.compile_status) }} · {{ relTime(md.updated_at) }}</small>
            </div>
            <span class="re-pill done">继续写作</span>
            <span class="re-chev">›</span>
          </button>
        </div>

        <div v-else class="re-empty">
          <div class="re-empty-icon">📚</div>
          <p>文献库还是空的。上传第一篇论文，开始构建你的知识库。</p>
          <button class="re-btn primary" data-testid="rs-home-import" @click="router.push('/research/import')">上传第一篇论文</button>
        </div>

        <div v-if="summary.recent_tasks.length" class="re-section-title" style="margin-top: 26px">
          <h2>最近任务</h2>
          <a class="re-link" @click="router.push('/research/tasks')">全部任务 ›</a>
        </div>
        <div v-if="summary.recent_tasks.length" class="re-recent">
          <button v-for="t in summary.recent_tasks.slice(0, 3)" :key="t.id" class="re-recent-item" @click="router.push('/research/tasks')">
            <div class="re-r-icon" style="font-size: 13px">{{ taskIcon(t.task_type) }}</div>
            <div class="re-r-copy">
              <strong>{{ taskLabel(t.task_type) }}</strong>
              <small>{{ taskStatusLabel(t.status) }} · {{ relTime(t.created_at) }}</small>
            </div>
            <span class="re-pill" :class="statusPillClass(t.status)">{{ taskStatusText(t.status) }}</span>
            <span class="re-chev">›</span>
          </button>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useResearchStore } from '@/stores/research'
import { researchAiApi } from '@/api/researchEnd'

const router = useRouter()
const auth = useAuthStore()
const rstore = useResearchStore()
const promptText = ref('')

// 首页内联 AI 问答（输入问题即解答，知识库引用回源）
const ask = reactive({ open: false, question: '', answer: '', sources: [], streaming: false, error: '' })
let askStream = null

const summary = computed(() => rstore.summary)
const loading = computed(() => !rstore.summaryLoaded)
const errorMsg = computed(() => rstore.error)
const name = computed(() => auth.nickname || '科研用户')

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '上午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

function authorsOf(p) { return (p.authors || []).join(' · ') || '未知作者' }
function readingLabel(s) { return ({ unread: '待读', reading: '阅读中', read: '已读', archived: '归档' })[s] || '待读' }
function pillClass(s) { return s === 'reading' ? 'reading' : s === 'read' ? 'done' : '' }
function compileLabel(s) { return ({ idle: '未编译', compiling: '编译中', success: '编译通过', failed: '编译失败' })[s] || s }
function taskIcon(t) { return ({ pdf_parse: '⚙', compile: '🛠', export: '⇓', llm: '✦' })[t] || '•' }
function taskLabel(t) { return ({ pdf_parse: 'PDF 解析', compile: 'LaTeX 编译', export: '导出', llm: 'AI 任务' })[t] || t }
function taskStatusLabel(s) { return ({ pending: '排队', queued: '排队', running: '运行中', completed: '已完成', failed: '失败', cancelled: '已取消' })[s] || s }
function taskStatusText(s) { return ({ pending: '排队', queued: '排队', running: '运行中', completed: '成功', failed: '失败', cancelled: '已取消' })[s] || s }
function statusPillClass(s) { return s === 'completed' ? 'done' : s === 'failed' ? 'reading' : '' }
function relTime(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
}

function goReader() {
  const papers = summary.value?.recent_papers || []
  if (papers.length) openPaper(papers[0])
  else router.push('/research/library')
}
function openPaper(p) { router.push(`/research/reader/${p.id}`) }

function onPromptSubmit() {
  const v = promptText.value.trim()
  if (!v) return
  if (/^10\.\d{4,9}\//.test(v) || /^https?:\/\//i.test(v)) { router.push('/research/import'); return }
  // 普通问题 → 首页内联 AI 解答（不会再跳去搜索）
  streamAsk(v)
  promptText.value = ''
}

function streamAsk(q) {
  abortAsk()
  ask.open = true
  ask.question = q
  ask.answer = ''
  ask.sources = []
  ask.error = ''
  ask.streaming = true
  askStream = researchAiApi.chat({ message: q, context: {}, history: [] }, {
    onEvent: (ev, data) => {
      if (ev === 'source') ask.sources.push(data)
      else if (ev === 'token') ask.answer += data.text
      else if (ev === 'done') ask.streaming = false
      else if (ev === 'error') { ask.streaming = false; ask.error = data.message || 'AI 不可用' }
    },
  })
  askStream.finished.catch(() => { if (ask.streaming) { ask.streaming = false } })
}
function abortAsk() { if (askStream) { try { askStream.abort() } catch { } } askStream = null }
function searchInLibrary(q) { router.push({ path: '/research/library', query: { q } }) }

onMounted(() => rstore.fetchSummary())
</script>

<style scoped>
.re-link { color: #405de4; font-size: 12px; cursor: pointer; }
.re-ask-card {
  max-width: 760px; margin: 18px auto 0; background: #fff; border: 1px solid var(--re-line, #dfe8f4);
  border-radius: 16px; padding: 16px 18px; text-align: left; box-shadow: var(--re-shadow, 0 8px 24px #9fb9d515);
}
.re-ask-q { font-size: 13px; font-weight: 600; color: var(--re-ink, #0d1830); margin-bottom: 8px; }
.re-ask-card p { font-size: 13px; line-height: 1.75; color: #33415c; margin: 0; white-space: pre-wrap; word-break: break-word; }
.re-ask-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
</style>