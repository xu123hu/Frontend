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
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useResearchStore } from '@/stores/research'

const router = useRouter()
const auth = useAuthStore()
const rstore = useResearchStore()
const promptText = ref('')

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
  if (!v) { router.push('/research/library'); return }
  if (/^10\.\d{4,9}\//.test(v) || /^https?:\/\//i.test(v)) { router.push('/research/import'); return }
  router.push({ path: '/research/library', query: { q: v } })
}

onMounted(() => rstore.fetchSummary())
</script>

<style scoped>
.re-link { color: #405de4; font-size: 12px; cursor: pointer; }
</style>