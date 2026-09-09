<template>
  <div class="re-explorer">
    <div class="re-surface-head">
      <b>{{ currentMs ? currentMs.title : '写作' }}</b>
      <span>v{{ currentMs ? currentMs.version : '—' }} · <span :class="saveClass">{{ saveLabel }}</span></span>
      <span class="re-badge" :class="compileBadge">{{ compileLabel }}</span>
      <span style="margin-left:auto; display:flex; gap:8px; align-items:center">
        <button class="re-btn sm" data-testid="rs-import-tex" @click="texInput && texInput.click()">↥ 导入文稿</button>
        <input ref="texInput" type="file" accept=".tex,.txt" style="display:none" @change="onImportTex" />
        <select class="re-select sm" :value="exportFmt" @change="onExport($event)">
          <option value="" disabled>导出…</option>
          <option value="tex">LaTeX 源码</option>
          <option value="markdown">Markdown</option>
          <option value="pdf">编译 PDF</option>
        </select>
        <button class="re-btn primary sm" :disabled="compileBusy" @click="doCompile">{{ compileBusy ? '编译中…' : '编译 PDF' }}</button>
        <button class="re-btn sm" @click="runAICheck" :disabled="aiChecking">{{ aiChecking ? '检查中…' : 'AI 检查' }}</button>
      </span>
    </div>

    <div class="re-three re-write-grid">
      <!-- 左：文稿 + 大纲 + 素材 -->
      <aside class="re-write-left">
        <div class="re-ms-section-title"><span>我的文稿</span><button title="新建文稿" @click="createManuscript">＋</button></div>
        <div v-for="m in manuscripts" :key="m.id" class="re-ms-item" :class="{ active: currentMs && currentMs.id === m.id }" data-testid="rs-ms-item" @click="switchManuscript(m.id)">
          <div class="re-ms-icon">▤</div>
          <div class="re-ms-info">
            <div class="re-ms-name">{{ m.title }}</div>
            <div class="re-ms-meta">{{ m.word_count }} 字 · {{ msStatusLabel(m.status) }} · {{ compileLabelOf(m.compile_status) }}</div>
          </div>
        </div>
        <div v-if="!manuscripts.length" class="re-empty" style="padding:16px 8px"><p style="font-size:11px">点击 ＋ 新建文稿</p></div>
        <button class="re-ms-new" @click="createManuscript">＋ 新建文稿（LaTeX）</button>

        <div class="re-outline-title">章节大纲</div>
        <div v-for="(ch, i) in outline" :key="i" class="re-chapter" :class="{ active: activeChapter === i }" @click="gotoChapter(i)">
          {{ ch.indent ? '　' : '' }}{{ ch.title }}
        </div>
        <div v-if="!outline.length" class="re-outline-title">（未识别章节）</div>

        <div class="re-outline-title">素材箱（{{ materials.length }}）</div>
        <div v-for="m in materials" :key="m.id" class="re-chapter" :class="{ issue: !m.used }" @click="insertMaterial(m)">
          <span class="re-tag" style="margin-right:5px">{{ matType(m.material_type) }}</span>{{ (m.content || m.quote || '').slice(0, 28) }}
        </div>
      </aside>

      <!-- 中：编辑器 / PDF 预览 -->
      <section class="re-editor-main">
        <div class="re-editor-tabs">
          <button :class="{ active: editorMode === 'source' }" @click="setMode('source')">源码</button>
          <button :class="{ active: editorMode === 'pdf' }" @click="setMode('pdf')">PDF 预览</button>
          <span v-if="currentMs">Ln {{ cursorLine }}, Col {{ cursorCol }} · {{ wordCount }} 字</span>
        </div>
        <div class="re-editor-body">
          <div v-show="editorMode === 'source'" class="re-cm-wrap" ref="cmHost"></div>
          <div v-show="editorMode === 'pdf'" class="re-pdf-view">
            <div v-if="pdfError" class="re-error">{{ pdfError }}</div>
            <div v-else-if="previewLoading" class="re-loading">PDF 加载中…</div>
            <div v-else-if="pdfDoc" class="re-pdf-page"><canvas ref="previewCanvasRef"></canvas>
              <div style="display:flex;justify-content:center;gap:12px;margin-top:12px">
                <button class="re-btn sm" :disabled="previewPage<=1" @click="renderPreview(previewPage-1)">‹</button>
                <span class="tiny">第 {{ previewPage }} / {{ previewPages }} 页</span>
                <button class="re-btn sm" :disabled="previewPage>=previewPages" @click="renderPreview(previewPage+1)">›</button>
              </div>
            </div>
            <div v-else class="re-empty"><div class="re-empty-icon">📄</div>
              <p>{{ compileLabel === '编译通过' ? '点击「编译 PDF」生成预览' : '需要编译成功后才能预览 PDF' }}</p></div>
          </div>
        </div>
      </section>

      <!-- 右：AI 面板 -->
      <aside class="re-ai-panel">
        <div class="re-ai-tabs">
          <button :class="{ active: rightTab==='suggestions' }" @click="rightTab='suggestions'">写作建议 <b>{{ pendingSugs }}</b></button>
          <button :class="{ active: rightTab==='citations' }" @click="rightTab='citations'">引用</button>
          <button :class="{ active: rightTab==='chat' }" @click="rightTab='chat'">AI 助手</button>
        </div>

        <div class="re-ai-body">
          <div v-show="rightTab==='suggestions'">
            <div v-if="aiChecking" class="re-loading">正在请 AI 检查文稿…</div>
            <div v-else-if="!suggestions.length" class="re-empty" style="padding:20px 12px"><div class="re-empty-icon" style="font-size:20px">✓</div>
              <p style="font-size:11px">还没有检查建议。点顶部「AI 检查」生成（语言/符号/引用/格式/结构）。</p></div>
            <div v-for="s in suggestions" :key="s.id" class="re-ai-card" :class="{ resolved: s.status!=='pending' }">
              <div class="re-ai-card-top"><strong>{{ sugType(s.suggestion_type) }}<span v-if="s.line_number"> · L{{ s.line_number }}</span></strong>
                <span class="re-badge" :class="sevClass(s.severity)">{{ s.status==='pending' ? '待处理' : s.status==='accepted' ? '已接受' : '已忽略' }}</span></div>
              <p>{{ s.suggestion }}</p>
              <div v-if="s.original_text" class="re-basis">原文：「{{ s.original_text }}」</div>
              <div v-if="s.replacement_text" class="re-basis">建议替换：「{{ s.replacement_text }}」</div>
              <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
                <button v-if="s.status==='pending'" class="re-btn primary sm" @click="acceptSuggestion(s)">接受局部修改</button>
                <button v-if="s.status==='pending'" class="re-btn sm" @click="ignoreSuggestion(s)">忽略</button>
                <button class="re-btn sm" @click="locateSuggestion(s)">定位</button>
              </div>
            </div>
          </div>

          <div v-show="rightTab==='citations'">
            <div v-for="c in msCitations" :key="c.id" class="re-citation-card">
              <h3>[{{ c.citation_key }}] <span v-if="c.verified" class="re-badge green">已核验</span></h3>
              <p v-if="c.quote">「{{ c.quote }}」</p>
              <pre v-if="c.bibtex" class="re-bibtex">{{ c.bibtex }}</pre>
              <div style="display:flex;gap:6px;margin-top:8px">
                <button class="re-btn sm" @click="insertCite(c.citation_key)">插入 \cite{...}</button>
                <button class="re-btn sm danger" @click="removeMsCitation(c.id)">删除</button>
              </div>
            </div>
            <div v-if="!msCitations.length" class="re-empty" style="padding:20px 12px"><div class="re-empty-icon">“</div>
              <p style="font-size:11px">用右下角 📚 悬浮球从文献库选中段落，「插入引用」会在此登记。</p></div>
          </div>

          <div v-show="rightTab==='chat'">
            <div class="re-answer-card">
              <h3>{{ chatTitle }}</h3>
              <p :class="{ 're-ai-cursor': chatStreaming }">{{ chatText || (chatStreaming ? '' : '向 AI 提问当前文稿：润色本节、续写、检查符号一致性…') }}</p>
              <div v-if="chatSources.length" class="re-source-proof"><strong>引用来源</strong><div v-for="(s,i) in chatSources" :key="i">{{ s.cite }} · 《{{ s.title }}》</div></div>
            </div>
            <div class="re-chat-box">
              <textarea v-model="chatInput" placeholder="针对当前文稿提问…" data-testid="rs-write-question" @keydown.enter.ctrl="sendChat"></textarea>
              <button class="re-btn primary sm" :disabled="chatStreaming" @click="sendChat">发送</button>
            </div>
            <div class="re-ai-rule">AI 只提出局部 diff，接受/忽略由你决定。引用文献请用右下角 📚 悬浮球。</div>
          </div>
        </div>
      </aside>
    </div>

    <!-- 文献悬浮球 -->
    <button v-if="currentMs" class="re-floating-ball" data-testid="rs-lit-ball" title="文献库 · 快速引用" @click="openLit = true">📚<span class="re-fb-badge">{{ msCitations.filter(c=>c.page).length }}</span></button>

    <!-- 文献预览浮层 -->
    <div v-if="openLit" class="re-lit-overlay" @click.self="openLit=false">
      <div class="re-lit-modal">
        <div class="re-lit-head">
          <strong>文献库 · 快速引用</strong>
          <div class="re-lit-search"><span>⌕</span><input v-model="litSearch" placeholder="搜索标题 / 作者 / DOI…" @input="onLitSearch" /></div>
          <span style="font-size:10px;color:#8a99ae">当前文稿：{{ currentMs ? currentMs.title : '' }}</span>
          <button class="re-btn sm" @click="openLit=false">✕</button>
        </div>
        <div class="re-lit-body">
          <div class="re-lit-list">
            <div v-for="p in litPapers" :key="p.id" class="re-lit-paper" :class="{ active: litPaper && litPaper.id === p.id }" @click="selectLitPaper(p.id)">
              <div class="lpi-title">{{ p.title }}</div>
              <div class="lpi-meta">{{ (p.authors||[]).join(' · ') || '未知' }} · {{ p.year || '—' }}<span class="re-badge" :class="parseBadge(p.parse_status)" style="margin-left:5px">{{ parseLabel(p.parse_status) }}</span></div>
            </div>
            <div v-if="!litPapers.length && !litSearch" class="re-lit-paper"><div class="lpi-meta">输入关键词搜索文献库</div></div>
            <div v-if="litEmptyMsg" class="re-lit-paper"><div class="lpi-meta">{{ litEmptyMsg }}</div></div>
          </div>
          <div class="re-lit-preview">
            <div class="re-lit-preview-inner" @mouseup="onLitSelect">
              <template v-if="litPaper">
                <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:#8a99ae;margin-bottom:12px">
                  <span>{{ (litPaper.authors||[]).join(' · ') || '未知作者' }}</span><span>{{ litPaper.venue || '期刊' }}</span><span v-if="litPaper.doi">DOI: {{ litPaper.doi }}</span>
                </div>
                <h2>{{ litPaper.title }}</h2>
                <p style="font-size:11px;color:#6b7c96">（文本预览 · 来自知识库）</p>
                <div v-for="c in litChunks" :key="c.id" style="margin-bottom:10px">
                  <div class="re-tag" style="margin-bottom:4px">p.{{ c.page }}<template v-if="c.section"> · {{ c.section }}</template> · {{ c.kind }}</div>
                  <p>{{ c.content }}</p>
                </div>
                <div v-if="!litChunks.length" style="color:#8a99ae;font-size:12px">该论文暂无知识库分块（未上传 PDF 或未解析）。</div>
              </template>
              <div v-else class="re-empty"><div class="re-empty-icon">📚</div><p>选择左侧论文以预览全文，再选中文字操作</p></div>
            </div>
            <div v-if="litSelection" class="re-selection-action" style="position:static;margin:10px auto 0" @click.stop>
              <button class="primary" @click="litInsertCite">插入引用</button>
              <button @click="litAddMaterial">加入素材</button>
              <button @click="litExplain">AI 解释</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EditorState, Compartment } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { StreamLanguage, syntaxHighlighting, defaultHighlightStyle, indentUnit } from '@codemirror/language'
import { stex } from '@codemirror/legacy-modes/mode/stex'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { researchWritingApi, researchLibraryApi, researchKbApi, researchAiApi, researchTasksApi } from '@/api/researchEnd'
import { useToastStore } from '@/stores/toast'

GlobalWorkerOptions.workerSrc = workerUrl

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const manuscripts = ref([])
const currentMs = ref(null)
const materials = ref([])
const msCitations = ref([])
const suggestions = ref([])
const saveLabel = ref('就绪')
const saveState = ref('idle')
const compileBusy = ref(false)
const aiChecking = ref(false)
const editorMode = ref('source')
const rightTab = ref('suggestions')
const chatInput = ref('')
const chatTitle = ref('文稿助手')
const chatText = ref('')
const chatSources = ref([])
const chatStreaming = ref(false)
const exportFmt = ref('')

const cmHost = ref(null)
let editorView = null
let contentComp = new Compartment()
const cursorLine = ref(1)
const cursorCol = ref(1)

// PDF 预览
const previewCanvasRef = ref(null)
const pdfDoc = shallowRef(null)
const previewPage = ref(1)
const previewPages = ref(0)
const previewLoading = ref(false)
const pdfError = ref('')

// 悬浮球
const openLit = ref(false)
const litSearch = ref('')
const litPapers = ref([])
const litPaper = ref(null)
const litChunks = ref([])
const litSelection = ref('')
const litEmptyMsg = ref('')

const wordCount = computed(() => (currentMs.value?.word_count) || 0)
const outline = computed(() => parseOutline(currentMs.value?.content || ''))
const activeChapter = ref(-1)
const pendingSugs = computed(() => suggestions.value.filter((s) => s.status === 'pending').length)
const compileLabel = computed(() => ({ idle: '未编译', compiling: '编译中…', success: '编译通过', failed: '编译失败' })[currentMs.value?.compile_status] || '未编译')
const compileBadge = computed(() => currentMs.value?.compile_status === 'success' ? 'green' : currentMs.value?.compile_status === 'failed' ? 'red' : '')

let saveTimer = null

async function loadManuscripts(preferId) {
  const d = await researchWritingApi.manuscripts()
  manuscripts.value = d.items || []
  const id = preferId || route.params.manuscriptId
  const target = id ? manuscripts.value.find((m) => m.id === id) : manuscripts.value[0]
  if (target) await switchManuscript(target.id)
}
async function switchManuscript(id) {
  const m = await researchWritingApi.getManuscript(id)
  currentMs.value = m
  saveLabel.value = '就绪'
  await loadSideData()
  await nextTick(() => setupEditor())
}
async function loadSideData() {
  if (!currentMs.value) return
  const [mats, cites, sugs] = await Promise.all([
    researchWritingApi.materials(currentMs.value.id),
    researchWritingApi.citations(currentMs.value.id),
    researchWritingApi.suggestions(currentMs.value.id),
  ])
  materials.value = mats || []
  msCitations.value = cites || []
  suggestions.value = sugs || []
}
async function createManuscript() {
  const title = safePrompt('文稿标题：', '未命名论文')
  if (title === null) return
  try {
    const m = await researchWritingApi.createManuscript({ title: title || '未命名论文', format: 'latex', content: '\\documentclass{article}\n\\usepackage{amsmath,amssymb}\n\\begin{document}\n\n\\section{Introduction}\n\n\\end{document}\n', status: 'draft' })
    toast.success('文稿已创建')
    await loadManuscripts(m.id)
  } catch (e) { toast.error(e.message) }
}
/** window.prompt 在部分宿主（如自动化预览/受限 iframe）不可用 → 静默回退默认标题，不打断新建 */
function safePrompt(msg, def) {
  try { return window.prompt(msg, def) } catch { return def }
}
async function onImportTex(e) {
  const f = e.target.files?.[0]
  if (!f) return
  try {
    const text = await f.text()
    const title = f.name.replace(/\.(tex|txt)$/i, '') || '导入文稿'
    const m = await researchWritingApi.createManuscript({ title, format: 'latex', content: text, status: 'draft' })
    toast.success('已导入文稿')
    await loadManuscripts(m.id)
  } catch (err) { toast.error(err.message) }
}

function setupEditor() {
  if (!cmHost.value) return
  if (editorView) { editorView.destroy(); editorView = null }
  const content = currentMs.value?.content || ''
  editorView = new EditorView({
    state: EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        StreamLanguage.define(stex),
        syntaxHighlighting(defaultHighlightStyle),
        indentUnit.of('    '),
        contentComp.of([]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) onContentChange(u.state.doc.toString())
          if (u.selectionSet || u.docChanged) {
            const head = u.state.selection.main.head
            const line = u.state.doc.lineAt(head)
            cursorLine.value = line.number
            cursorCol.value = head - line.from + 1
          }
        }),
      ],
    }),
    parent: cmHost.value,
  })
}
function onContentChange(content) {
  if (!currentMs.value) return
  saveLabel.value = '保存中…'
  saveState.value = 'saving'
  clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      const updated = await researchWritingApi.patchManuscript(currentMs.value.id, { content })
      currentMs.value = { ...currentMs.value, ...updated }
      saveLabel.value = '已保存'
      saveState.value = 'saved'
    } catch (e) {
      saveLabel.value = '保存失败'
      saveState.value = 'error'
      toast.error(`自动保存失败：${e.message}`)
    }
  }, 600)
}
const saveClass = computed(() => saveState.value === 'saved' ? 'ok' : saveState.value === 'error' ? 'err' : '')

function setMode(mode) {
  editorMode.value = mode
  if (mode === 'pdf') loadPreview()
}
async function loadPreview() {
  // 修复：旧守卫 `!ms?.compile_status === 'success'` 恒 false，未编译也尝试读 ms.id（null）→ 隐式 pdf 区报 null.id
  if (!currentMs.value) { toast.info('请先新建或打开文稿'); editorMode.value = 'source'; return }
  if (currentMs.value.compile_status !== 'success' || !currentMs.value.has_pdf) {
    toast.info('需要先「编译 PDF」成功后才可预览')
    pdfError.value = '尚未编译成功（compile_status=' + currentMs.value.compile_status + '）。点击顶部「编译 PDF」生成后再预览。'
    return
  }
  pdfError.value = ''
  previewLoading.value = true
  try {
    const { blob } = await researchWritingApi.downloadPdf(currentMs.value.id)
    const data = new Uint8Array(await blob.arrayBuffer())
    pdfDoc.value = await getDocument({ data }).promise
    previewPages.value = pdfDoc.value.numPages
    previewPage.value = 1
    await renderPreview(1)
  } catch (e) {
    pdfError.value = e?.message || 'PDF 预览不可用'
    pdfDoc.value = null
  } finally { previewLoading.value = false }
}
async function renderPreview(n) {
  if (!pdfDoc.value) return
  const page = await pdfDoc.value.getPage(n)
  const vp = page.getViewport({ scale: 1.6 })
  const canvas = previewCanvasRef.value
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.floor(vp.width * dpr); canvas.height = Math.floor(vp.height * dpr)
  canvas.style.width = vp.width + 'px'; canvas.style.height = vp.height + 'px'
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise
  previewPage.value = n
}

// 编译
async function doCompile() {
  if (!currentMs.value || compileBusy.value) return
  compileBusy.value = true
  try {
    const { task_id } = await researchWritingApi.compile(currentMs.value.id)
    toast.info('编译任务已创建')
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 1500))
      const t = await researchTasksApi.get(task_id)
      if (t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled') break
    }
    const m = await researchWritingApi.getManuscript(currentMs.value.id)
    currentMs.value = m
    if (m.compile_status === 'success') { toast.success('编译通过'); loadPreview() }
    else if (m.compile_log) toast.warning(m.compile_log.slice(0, 220))
    else toast.warning('编译未成功（查看日志）')
  } catch (e) { toast.error(e.message) } finally { compileBusy.value = false }
}

// AI 检查
async function runAICheck() {
  if (!currentMs.value || aiChecking.value) return
  aiChecking.value = true
  try {
    const data = await researchWritingApi.aiCheck(currentMs.value.id)
    suggestions.value = data.suggestions || []
    toast.success(`AI 检查完成：${suggestions.value.length} 条建议`)
    rightTab.value = 'suggestions'
  } catch (e) { toast.error(`AI 检查不可用：${e.message}`) } finally { aiChecking.value = false }
}
async function acceptSuggestion(s) {
  try {
    const body = s.replacement_text ? { replacement_text: s.replacement_text } : {}
    const updated = await researchWritingApi.acceptSuggestion(s.id, body)
    suggestions.value = suggestions.value.map((x) => x.id === s.id ? updated : x)
    const m = await researchWritingApi.getManuscript(currentMs.value.id)
    currentMs.value = m
    toast.success(updated.evidence?.applied ? '已应用局部修改' : '已标记接受')
    setupEditor()
  } catch (e) { toast.error(e.message) }
}
async function ignoreSuggestion(s) {
  const updated = await researchWritingApi.ignoreSuggestion(s.id)
  suggestions.value = suggestions.value.map((x) => x.id === s.id ? updated : x)
}
function locateSuggestion(s) {
  if (!editorView) return
  const doc = editorView.state.doc
  if (s.original_text) {
    const idx = doc.toString().indexOf(s.original_text)
    if (idx >= 0) { editorView.dispatch({ selection: { anchor: idx, head: idx + s.original_text.length } }); editorView.scrollIntoView(); return }
  }
  if (s.line_number) {
    const line = doc.line(s.line_number)
    editorView.dispatch({ selection: { anchor: line.from } }); editorView.scrollIntoView()
  }
}

// 插入
function insertAtCursor(text) {
  if (!editorView) return
  const sel = editorView.state.selection.main
  editorView.dispatch({ changes: { from: sel.from, insert: text }, selection: { anchor: sel.from + text.length }, scrollIntoView: true })
  saveLabel.value = '已修改'
  saveState.value = 'dirty'
}
function insertCite(key) { insertAtCursor(`\\cite{${key}}`) }
function insertMaterial(m) {
  insertAtCursor((m.content || m.quote || ''))
  researchWritingApi.patchMaterial(m.id, { used: true }).then(() => { m.used = true }).catch(() => {})
}
async function removeMsCitation(id) { await researchWritingApi.deleteCitation(id); msCitations.value = await researchWritingApi.citations(currentMs.value.id) }

// 悬浮球
let litTimer = null
async function loadLitPapers(q) {
  try {
    const d = await researchLibraryApi.listPapers({ q: q || undefined, page: 1, page_size: 20 })
    litPapers.value = d.items || []
    litEmptyMsg.value = litPapers.value.length ? '' : (q ? '无匹配论文' : '')
  } catch (e) { litEmptyMsg.value = e.message }
}
function onLitSearch() {
  clearTimeout(litTimer)
  litTimer = setTimeout(() => loadLitPapers(litSearch.value.trim()), 300)
}
async function selectLitPaper(id) {
  const p = litPapers.value.find((x) => x.id === id)
  litPaper.value = p
  litChunks.value = (await researchKbApi.chunks(id, {})) || []
  litSelection.value = ''
}
function onLitSelect() {
  setTimeout(() => {
    const sel = window.getSelection()
    const t = (sel?.toString() || '').trim()
    if (t && t.length > 1 && document.querySelector('.re-lit-preview-inner')?.contains(sel.anchorNode)) {
      litSelection.value = t.slice(0, 5000)
    }
  }, 10)
}
async function litInsertCite() {
  if (!litPaper.value || !litSelection.value) { toast.warning('先在预览中选中文字'); return }
  try {
    const key = 'cit' + litPaper.value.id.slice(0, 8)
    const exists = msCitations.value.find((c) => c.citation_key === key)
    if (!exists) {
      await researchWritingApi.addCitation(currentMs.value.id, { citation_key: key, source_paper_id: litPaper.value.id, quote: litSelection.value, page: litChunks.value[0]?.page || null })
      msCitations.value = await researchWritingApi.citations(currentMs.value.id)
    }
    insertCite(key)
    toast.success(`已插入 \\cite{${key}}（${litPaper.value.title.slice(0, 20)}…）`)
    openLit.value = false
  } catch (e) { toast.error(e.message) }
}
async function litAddMaterial() {
  if (!litPaper.value || !litSelection.value) { toast.warning('先在预览中选中文字'); return }
  try {
    await researchWritingApi.addMaterial({ manuscript_id: currentMs.value.id, source_paper_id: litPaper.value.id, page: litChunks.value[0]?.page || null, quote: litSelection.value, content: litSelection.value, material_type: 'quote' })
    materials.value = await researchWritingApi.materials(currentMs.value.id)
    litSelection.value = ''
    toast.success('已加入素材箱')
  } catch (e) { toast.error(e.message) }
}
function litExplain() {
  if (!litPaper.value || !litSelection.value) return
  rightTab.value = 'chat'
  chatTitle.value = `「${litSelection.value.slice(0, 30)}…」`
  chatText.value = ''
  chatSources.value = [{ cite: `${litPaper.value.title}`, title: litPaper.value.title }]
  chatStreaming.value = true
  researchAiApi.chat({ message: `请解释这段内容：${litSelection.value}`, context: { paper_id: litPaper.value.id }, history: [] }, {
    onEvent: (ev, data) => { if (ev === 'token') chatText.value += data.text; else if (ev === 'done') chatStreaming.value = false; else if (ev === 'error') { chatStreaming.value = false; toast.error(data.message) } },
  }).finished.catch(() => { chatStreaming.value = false })
  openLit.value = false
}

// AI 助手聊天
async function sendChat() {
  const q = chatInput.value.trim()
  if (!q || chatStreaming.value || !currentMs.value) return
  chatTitle.value = q; chatText.value = ''; chatSources.value = []
  chatStreaming.value = true
  const { finished } = researchAiApi.chat({ message: q, context: { manuscript_id: currentMs.value.id }, history: [] }, {
    onEvent: (ev, data) => {
      if (ev === 'source') chatSources.value.push(data)
      else if (ev === 'token') chatText.value += data.text
      else if (ev === 'done') chatStreaming.value = false
      else if (ev === 'error') { chatStreaming.value = false; toast.error(data.message || 'AI 不可用') }
    },
  })
  chatInput.value = ''
  await finished.catch(() => { if (chatStreaming.value) chatStreaming.value = false })
}

async function onExport(e) {
  const fmt = e.target.value; e.target.value = ''
  if (!fmt || !currentMs.value) return
  try {
    if (fmt === 'pdf') {
      if (currentMs.value.compile_status !== 'success') { toast.warning('请先编译成功'); return }
      const { blob, filename } = await researchWritingApi.downloadPdf(currentMs.value.id)
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
    } else {
      const { blob, filename } = await researchWritingApi.exportManuscript(currentMs.value.id, fmt)
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
    }
  } catch (err) { toast.error(err.message) }
}

function parseOutline(content) {
  if (!content) return []
  const out = []
  const re = /\\(?:sub){0,2}section\s*\{([^}]+)\}/g
  let m
  while ((m = re.exec(content))) out.push({ title: m[1], indent: m[0].indexOf('subsection') >= 0 })
  return out
}
function gotoChapter(i) {
  if (!editorView) return
  const ch = outline.value[i]
  const re = new RegExp(`\\\\(?:sub){0,2}section\\s*\\{${escapeReg(ch.title)}\\}`)
  const match = re.exec(editorView.state.doc.toString())
  activeChapter.value = i
  if (match) { editorView.dispatch({ selection: { anchor: match.index } }); editorView.scrollIntoView() }
}
function escapeReg(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

function matType(t) { return ({ quote: '引用', paraphrase: '改写', data: '数据', formula: '公式' })[t] || t }
function sugType(t) { return ({ language: '语言', symbol: '符号', citation: '引用', format: '格式', structure: '结构' })[t] || t }
function sevClass(s) { return s === 'error' ? 'red' : s === 'warning' ? 'orange' : 'green' }
function msStatusLabel(s) { return ({ draft: '草稿', reviewing: '审阅中', final: '定稿' })[s] || s }
function compileLabelOf(s) { return ({ idle: '', compiling: '编译中', success: '✓', failed: '✗' })[s] || s }
function parseBadge(s) { return s === 'completed' ? 'green' : s === 'failed' ? 'red' : s === 'metadata_only' ? 'orange' : '' }
function parseLabel(s) { return ({ metadata_only: '仅元数据', completed: '已解析', failed: '解析失败', pending: '待解析' })[s] || s }

onMounted(async () => {
  await loadManuscripts()
  openLit.value = false
})
onBeforeUnmount(() => {
  clearTimeout(saveTimer)
  if (editorView) editorView.destroy()
  try { pdfDoc.value?.destroy() } catch { }
})
</script>

<style scoped>
.re-write-grid { grid-template-columns: 210px minmax(0, 1fr) 330px; }
.tiny { font-size: 11px; color: #9aa7b8; }
.re-bibtex { font-size: 10px; background: #f5f8fc; border-radius: 6px; padding: 8px; margin-top: 8px; white-space: pre-wrap; overflow-x: auto; color: #5a6b85; }
.re-chat-box { display: flex; gap: 6px; align-items: flex-end; }
.re-chat-box textarea { flex: 1; border: 1px solid var(--re-line); border-radius: 9px; padding: 9px 11px; font-size: 12px; font-family: inherit; resize: none; height: 42px; outline: none; background: #fff; }
.re-ai-card.resolved { opacity: .55; }
.save-ok { color: var(--re-green, #16a675); }
.save-err { color: var(--re-red, #df6757); }
</style>