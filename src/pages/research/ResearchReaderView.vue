<template>
  <div class="re-explorer">
    <div class="re-reader" style="flex:1;min-height:0;display:flex;flex-direction:column">
      <!-- 顶部工具栏 -->
      <div class="re-reader-toolbar">
        <button class="re-tool-mini" data-testid="rs-back-library" @click="router.push('/research/library')">← 文献库</button>
        <strong style="font-size:12px">{{ paperTitle }}</strong>
        <span class="re-badge" :class="parseBadge(paper && paper.parse_status)">{{ parseLabel(paper && paper.parse_status) }}</span>
        <span class="re-tool-divider"></span>
        <button class="re-tool-mini" :disabled="!pdf || pageNumber<=1" @click="goPage(pageNumber-1)">‹</button>
        <input class="re-input re-page-num" :value="pageNumber" type="number" min="1" :max="pageCount" @change="goPage(+$event.target.value)" />
        <span class="tiny">/ {{ pageCount }}</span>
        <button class="re-tool-mini" :disabled="!pdf || pageNumber>=pageCount" @click="goPage(pageNumber+1)">›</button>
        <span class="re-tool-divider"></span>
        <button class="re-tool-mini" @click="zoom(-0.1)">−</button>
        <span class="tiny">{{ Math.round(scale*100) }}%</span>
        <button class="re-tool-mini" @click="zoom(0.1)">＋</button>
        <button class="re-tool-mini" @click="fitWidth">适合宽度</button>
        <span style="flex:1"></span>
        <select class="re-select" v-model="highlightColor" style="width:auto;font-size:11px">
          <option value="#fff3c4">高亮黄</option>
          <option value="#c9e7ff">高亮蓝</option>
          <option value="#c8f7dc">高亮绿</option>
          <option value="#ffd6e8">高亮粉</option>
        </select>
        <button class="re-tool-mini" :disabled="!currentSelection" @click="saveSelectionNote">保存笔记</button>
        <button class="re-btn primary sm" :disabled="!currentSelection" data-testid="rs-highlight-apply" @click="applyHighlight">高亮选中</button>
      </div>

      <!-- 三栏 -->
      <div class="re-reader-grid">
        <aside class="re-reader-left">
          <div class="re-side-tabs">
            <button :class="{ active: leftTab==='outline' }" @click="leftTab='outline'">目录</button>
            <button :class="{ active: leftTab==='marks' }" @click="leftTab='marks'">标注</button>
            <button :class="{ active: leftTab==='math' }" @click="leftTab='math'">结构</button>
          </div>
          <div class="re-left-panel" :class="{ active: leftTab==='outline' }">
            <div v-if="!outline.length" class="re-empty" style="padding:20px 10px"><p style="font-size:11px">尚无章节结构（解析后可提取）。</p></div>
            <div v-for="(item,i) in outline" :key="i" class="re-outline-item" :class="{ child: item.indent > 0, active: item.page === pageNumber }" @click="jumpToPage(item.page)">{{ item.title }}</div>
          </div>
          <div class="re-left-panel" :class="{ active: leftTab==='marks' }">
            <div v-if="!annotations.length" class="re-empty" style="padding:20px 10px"><p style="font-size:11px">暂无标注。拖动选择正文后点击「高亮选中」。</p></div>
            <div v-for="a in annotations" :key="a.id" class="re-note-card">
              <h3><span :style="{display:'inline-block',width:10,height:10,borderRadius:3,background:a.color,marginRight:6}"></span>{{ kindLabel(a.kind) }} · p.{{ a.page }}</h3>
              <p>{{ a.note_text || a.selected_text || '（无内容）' }}</p>
              <div style="display:flex;gap:6px;margin-top:6px">
                <button class="re-btn sm" @click="jumpToPage(a.page)">定位</button>
                <button class="re-btn sm danger" @click="removeAnnotation(a.id)">删除</button>
              </div>
            </div>
          </div>
          <div class="re-left-panel" :class="{ active: leftTab==='math' }">
            <div v-if="!objects.length" class="re-empty" style="padding:20px 10px"><p style="font-size:11px">识别出的定义/定理/公式将在此显示。</p></div>
            <div v-for="o in objects" :key="o.id" class="re-object-card">
              <h3>{{ objTypeLabel(o.object_type) }} · p.{{ o.page }} {{ o.name ? '· ' + o.name : '' }}</h3>
              <p>{{ o.source_text }}</p>
            </div>
          </div>
        </aside>

        <main class="re-pdf-stage" ref="stageRef">
          <div v-if="currentSelection" class="re-selection-action" data-testid="rs-selection-action" @click.stop>
            <button @click="runSelection('explain')">解释</button>
            <button @click="runSelection('translate')">翻译</button>
            <button @click="runSelection('derive')">推导公式</button>
            <button @click="saveSelectionNote">记笔记</button>
          </div>
          <div v-if="pdfError" class="re-error">
            {{ pdfError }}
            <div class="re-error-actions"><button class="re-btn sm" @click="loadPdf()">重试</button></div>
          </div>
          <div v-else-if="loading" class="re-loading">PDF 加载中…</div>
          <!-- canvas 常驻（v-show），避免 v-else-if 时序导致 ref 为 null -->
          <div class="re-pdf-page" v-show="pdf">
            <canvas ref="canvasRef"></canvas>
            <div ref="textLayerRef" class="re-text-layer textLayer"></div>
          </div>
          <div v-if="!pdf && !pdfError && !loading" class="re-empty"><div class="re-empty-icon">📄</div><p v-if="paper && !paper.has_pdf">该论文暂无 PDF 附件（仅元数据）。
            <br><button class="re-btn sm" style="margin-top:8px" @click="router.push('/research/library')">返回文献库</button></p></div>
        </main>

        <aside class="re-reader-inspector">
          <div class="re-inspector-tabs">
            <button :class="{ active: rightTab==='assistant' }" @click="rightTab='assistant'">AI 助手</button>
            <button :class="{ active: rightTab==='notes' }" @click="rightTab='notes'">笔记</button>
            <button :class="{ active: rightTab==='citations' }" @click="rightTab='citations'">引用</button>
            <button :class="{ active: rightTab==='kb' }" @click="rightTab='kb'">结构</button>
          </div>

          <div class="re-inspect-panel" :class="{ active: rightTab==='assistant' }">
            <div class="re-context-bar"><span>上下文：p.{{ pageNumber }}<template v-if="currentSelection"> · 「{{ currentSelection.slice(0,24) }}{{ currentSelection.length>24?'…':'' }}」</template></span><button class="re-tool-mini" @click="currentSelection=''">清除选区</button></div>
            <div class="re-answer-card">
              <h3>{{ answerTitle }}</h3>
              <p :class="{ 're-ai-cursor': streaming }">{{ answerText || (streaming ? '' : '选中文本或提问，AI 将基于当前论文与知识库作答并注明来源。') }}</p>
              <div v-if="sources.length" class="re-source-proof"><strong>回答依据</strong><div v-for="(s,i) in sources" :key="i">{{ s.cite }} · 《{{ s.title }}》{{ s.method ? ' · 检索:' + s.method : '' }}</div></div>
            </div>
            <div class="re-question-chips">
              <button v-for="q in questionChips" :key="q" class="re-question-chip" @click="askChat(q)">{{ q }}</button>
            </div>
            <div class="re-chat-box">
              <textarea v-model="question" placeholder="针对当前页、选区、公式提问…" data-testid="rs-reader-question" @keydown.enter.ctrl="askCustom"></textarea>
              <button class="re-btn primary sm" :disabled="streaming" @click="askCustom">发送</button>
            </div>
          </div>

          <div class="re-inspect-panel" :class="{ active: rightTab==='notes' }">
            <textarea v-model="noteInput" class="re-textarea" rows="4" style="width:100%" :placeholder="currentSelection ? '已带入选区和页码…' : '写一条阅读笔记。'"></textarea>
            <div style="display:flex;align-items:center;gap:8px;margin:8px 0 12px">
              <button class="re-btn primary sm" @click="addNote">保存笔记</button>
              <span style="font-size:10px;color:var(--re-muted)">自动附 p.{{ pageNumber }}<template v-if="currentSelection"> 与选区</template></span>
            </div>
            <div v-for="n in notes" :key="n.id" class="re-note-card">
              <h3>{{ n.title || '笔记' }} · p.{{ n.page || '—' }}</h3>
              <p>{{ n.content }}</p>
              <div style="display:flex;gap:6px;margin-top:6px">
                <button class="re-btn sm" @click="jumpToPage(n.page)">定位</button>
                <button class="re-btn sm danger" @click="removeNote(n.id)">删除</button>
              </div>
            </div>
            <div v-if="!notes.length" class="re-empty" style="padding:16px"><p style="font-size:11px">暂无笔记。</p></div>
          </div>

          <div class="re-inspect-panel" :class="{ active: rightTab==='citations' }">
            <div v-for="c in citations" :key="c.id" class="re-citation-card">
              <h3>{{ c.title }} <span v-if="c.verified" class="re-badge green">已核验</span></h3>
              <p>{{ (c.authors||[]).join(' · ') || '未知作者' }} · {{ c.year || '—' }}<template v-if="c.venue"> · {{ c.venue }}</template></p>
              <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
                <button class="re-btn sm" @click="toggleCitationNote(c)">{{ expandedCites.has(c.id) ? '收起' : '查看 BibTeX' }}</button>
                <button class="re-btn sm danger" @click="removeCitation(c.id)">删除</button>
              </div>
              <pre v-if="expandedCites.has(c.id) && c.bibtex" class="re-bibtex">{{ c.bibtex }}</pre>
            </div>
            <div v-if="pieceTitlePrompt" class="re-cite-add">
              <input v-model="citeTitle" class="re-input" placeholder="引用标题" style="width:100%" />
              <input v-model="citeAuthors" class="re-input" placeholder="作者（;分隔）" style="width:100%;margin-top:6px" />
              <input v-model="citeBibtex" class="re-input" placeholder="BibTeX（可选）" style="width:100%;margin-top:6px" />
              <div style="display:flex;gap:6px;margin-top:8px">
                <button class="re-btn primary sm" @click="addCitation">保存</button>
                <button class="re-btn sm" @click="pieceTitlePrompt=false">取消</button>
              </div>
            </div>
            <button v-else class="re-btn sm" style="width:100%" @click="pieceTitlePrompt=true">＋ 添加引用</button>
          </div>

          <div class="re-inspect-panel" :class="{ active: rightTab==='kb' }">
            <div class="re-kb-state">
              <div class="re-info-row"><span>解析状态</span><b>{{ parseLabel(kbState && kbState.parse_status) }}</b></div>
              <div class="re-info-row"><span>知识库分块</span><b>{{ kbState ? kbState.chunk_count : '—' }}</b></div>
              <div class="re-info-row"><span>数学对象</span><b>{{ kbState ? kbState.math_object_count : '—' }}</b></div>
              <div class="re-info-row"><span>向量检索</span><b>{{ kbState ? (kbState.embedding_state === 'done' ? '已就绪' : kbState.embedding_state === 'pending' ? '待补齐（文本检索可用）' : '未启用') : '—' }}</b></div>
              <p v-if="kbState && kbState.parse_error" class="re-note">{{ kbState.parse_error }}</p>
              <div class="re-actions"><button class="re-btn sm" @click="reparse">重新解析</button></div>
            </div>
            <div style="margin-top:10px">
              <div v-for="o in objects" :key="'o'+o.id" class="re-object-card">
                <h3>{{ objTypeLabel(o.object_type) }} · p.{{ o.page }} {{ o.name ? '· ' + o.name : '' }}</h3>
                <p>{{ o.source_text }}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <!-- 底部状态栏 -->
      <div class="re-reader-statusbar">
        <span v-if="paper">集合：{{ (paper.collections||[]).map(c=>c.name).join('、') || '未分组' }}</span>
        <span>阅读位置：p.{{ pageNumber }}</span>
        <span>标注 {{ annotations.length }} · 笔记 {{ notes.length }}</span>
        <span class="last">来源可追溯 · 标注自动保存</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getDocument, GlobalWorkerOptions, TextLayer } from 'pdfjs-dist'
import 'pdfjs-dist/web/pdf_viewer.css' // 文本层官方样式：span 透明、按字形对齐（消除与 canvas 的重影/叠字）
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { researchLibraryApi, researchReaderApi, researchKbApi, researchAiApi } from '@/api/researchEnd'
import { useToastStore } from '@/stores/toast'

GlobalWorkerOptions.workerSrc = workerUrl

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const paperId = route.params.paperId
const paper = ref(null)
const pdf = shallowRef(null)
const pdfError = ref('')
const loading = ref(false)
const pageNumber = ref(1)
const pageCount = ref(0)
const scale = ref(1.1)
const canvasRef = ref(null)
const textLayerRef = ref(null)
const stageRef = ref(null)

const annotations = ref([])
const notes = ref([])
const citations = ref([])
const objects = ref([])
const kbState = ref(null)
const chunks = ref([])

const leftTab = ref('outline')
const rightTab = ref('assistant')
const question = ref('')
const noteInput = ref('')
const answerTitle = ref('')
const answerText = ref('')
const sources = ref([])
const streaming = ref(false)
const currentSelection = ref('')
const highlightColor = ref('#fff3c4')

const pieceTitlePrompt = ref(false)
const citeTitle = ref('')
const citeAuthors = ref('')
const citeBibtex = ref('')
const expandedCites = ref(new Set())

let renderTask = null

const paperTitle = computed(() => paper.value?.title || '论文阅读')
const outline = computed(() => {
  const map = new Map()
  for (const c of chunks.value) {
    const key = c.section || `正文 p.${c.page}`
    if (!map.has(key)) map.set(key, { title: key, page: c.page, indent: isSectionTitleKey(key) ? 0 : 1 })
  }
  return [...map.values()]
})
const questionChips = ['解释当前页核心结论', '逐步推导本页公式', '比较相关定义', '整理本页阅读笔记']

function parseLabel(s) { return ({ pending: '待解析', parsing: '解析中', completed: '已解析', failed: '解析失败', metadata_only: '仅元数据' })[s] || s }
function parseBadge(s) { return s === 'completed' ? 'green' : s === 'failed' ? 'red' : s === 'metadata_only' ? 'orange' : '' }
function kindLabel(k) { return ({ highlight: '高亮', underline: '下划线', area: '区域', note: '笔记' })[k] || k }
function objTypeLabel(t) { return ({ definition: '定义', theorem: '定理', formula: '公式', symbol: '符号' })[t] || t }
function isSectionTitleKey(k) { return /^(abstract|introduction|references|conclusion)/i.test(k) || /^\d+(\.\d+)*\s/.test(k) }

// ---------- 数据 ----------
async function loadMeta() {
  paper.value = await researchLibraryApi.getPaper(paperId)
  annotations.value = await researchReaderApi.annotations(paperId)
  notes.value = await researchReaderApi.notes(paperId)
  citations.value = await researchReaderApi.citations(paperId)
  objects.value = await researchKbApi.objects(paperId)
  kbState.value = await researchKbApi.state(paperId)
  chunks.value = await researchKbApi.chunks(paperId, {})
}
async function loadPdf() {
  if (pdf.value || loading.value) return
  loading.value = true
  pdfError.value = ''
  try {
    const { blob } = await researchLibraryApi.downloadPdf(paperId)
    const data = new Uint8Array(await blob.arrayBuffer())
    const task = getDocument({ data })
    pdf.value = await task.promise
    pageCount.value = pdf.value.numPages
    const pos = paper.value?.reading_position?.page || 1
    pageNumber.value = Math.min(Math.max(1, pos), pageCount.value)
    scale.value = paper.value?.reading_position?.zoom || 1.1
    await nextTick() // 等 canvas 挂载（pdf.value 赋值后模板 v-else-if 才渲染）
    await renderPage()
  } catch (e) {
    const st = (e && e.stack) ? e.stack.split('\n').slice(1, 6).join(' | ') : ''
    pdfError.value = `${e?.message || 'PDF 加载失败'}\n${st}`.slice(0, 600)
  } finally { loading.value = false }
}

async function renderPage() {
  const pdfDoc = pdf.value
  if (!pdfDoc) return
  if (renderTask) { try { renderTask.cancel() } catch { } }
  const page = await pdfDoc.getPage(pageNumber.value)
  const viewport = page.getViewport({ scale: scale.value })
  const canvas = canvasRef.value
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.floor(viewport.width * dpr)
  canvas.height = Math.floor(viewport.height * dpr)
  canvas.style.width = viewport.width + 'px'
  canvas.style.height = viewport.height + 'px'
  const ctx = canvas.getContext('2d')
  renderTask = page.render({ canvasContext: ctx, viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null })
  try { await renderTask.promise } catch { }
  // 文本层
  try {
    const container = textLayerRef.value
    if (container) {
      container.innerHTML = ''
      const textContent = await page.getTextContent()
      const textLayer = new TextLayer({ textContentSource: textContent, container, viewport })
      await textLayer.render()
    }
  } catch (e) {
    // 文本层失败不阻断阅读（仅选区 AI 受影响）
  }
  savePositionDebounced()
}

function goPage(n) {
  if (!pdf.value) return
  n = Math.max(1, Math.min(pageCount.value, n || 1))
  if (n === pageNumber.value) { renderPage(); return }
  pageNumber.value = n
  renderPage()
}
function zoom(d) { scale.value = Math.min(2.5, Math.max(0.6, Math.round((scale.value + d) * 10) / 10)); renderPage() }
function fitWidth() { if (!pdf.value) return; scale.value = (stageRef.value?.offsetWidth - 50) / 700; renderPage() }
function jumpToPage(p) { if (p) goPage(p) }

// ---------- 选区 ----------
function onStageMouseUp() {
  setTimeout(() => {
    const sel = window.getSelection()
    const t = (sel?.toString() || '').trim()
    if (t && t.length > 1 && textLayerRef.value?.contains(sel.anchorNode)) {
      currentSelection.value = t.slice(0, 5000)
      saveSelectionToNote()
    }
  }, 10)
}

function saveSelectionToNote() {
  if (currentSelection.value) noteInput.value = noteInput.value || `（摘录 p.${pageNumber.value}）${currentSelection.value.slice(0, 300)}`
}
function saveSelectionNote() {
  if (!currentSelection.value) return
  addNote()
}
async function runSelection(mode) {
  if (!currentSelection.value) return
  rightTab.value = 'assistant'
  answerTitle.value = ({ explain: '选区·解释', translate: '选区·翻译', derive: '选区·公式推导', note: '记笔记' })[mode] || mode
  answerText.value = ''
  sources.value = []
  streaming.value = true
  const { abort, finished } = researchAiApi.selection({ paper_id: paperId, page: pageNumber.value, selection: currentSelection.value, mode }, {
    onEvent: (ev, data) => {
      if (ev === 'meta') { /* 无操作 */ }
      else if (ev === 'source') sources.value.push(data)
      else if (ev === 'token') answerText.value += data.text
      else if (ev === 'done') { streaming.value = false }
      else if (ev === 'error') { streaming.value = false; toast.error(data.message || 'AI 不可用') }
    },
  })
  await finished.catch(() => { if (streaming.value) { streaming.value = false; } })
}
async function askCustom() {
  const q = (question.value || '').trim()
  if (!q || streaming.value) return
  askWith(q)
  question.value = ''
}
function askChat(q) { askWith(q) }
async function askWith(q) {
  rightTab.value = 'assistant'
  answerTitle.value = q
  answerText.value = ''
  sources.value = []
  streaming.value = true
  const ctx = { paper_id: paperId, page: pageNumber.value }
  if (currentSelection.value) ctx.selection = currentSelection.value
  const { finished } = researchAiApi.chat({ message: q, context: ctx, history: [] }, {
    onEvent: (ev, data) => {
      if (ev === 'source') sources.value.push(data)
      else if (ev === 'token') answerText.value += data.text
      else if (ev === 'done') streaming.value = false
      else if (ev === 'error') { streaming.value = false; toast.error(data.message || 'AI 不可用') }
    },
  })
  await finished.catch(() => { if (streaming.value) streaming.value = false })
}
async function applyHighlight() {
  const text = currentSelection.value
  if (!text) return
  try {
    await researchReaderApi.createAnnotation(paperId, { page: pageNumber.value, kind: 'highlight', color: highlightColor.value, selected_text: text })
    await refreshAnnotations()
    toast.success('高亮已保存')
  } catch (e) { toast.error(e.message) }
}

// ---------- 标注/笔记/引用 ----------
async function refreshAnnotations() { annotations.value = await researchReaderApi.annotations(paperId) }
async function removeAnnotation(id) { await researchReaderApi.deleteAnnotation(id); await refreshAnnotations() }
async function addNote() {
  const content = noteInput.value.trim()
  if (!content) { toast.warning('笔记内容为空'); return }
  try {
    const title = currentSelection.value ? `摘录 p.${pageNumber.value}` : '阅读笔记'
    const page = currentSelection.value ? pageNumber.value : pageNumber.value
    await researchReaderApi.createNote(paperId, { page, title, content, kind: currentSelection.value ? 'quote' : 'note' })
    noteInput.value = ''; currentSelection.value = ''
    notes.value = await researchReaderApi.notes(paperId)
    toast.success('笔记已保存')
  } catch (e) { toast.error(e.message) }
}
async function removeNote(id) { await researchReaderApi.deleteNote(id); notes.value = await researchReaderApi.notes(paperId) }
async function addCitation() {
  if (!citeTitle.value.trim()) { toast.warning('引用标题必填'); return }
  const authors = citeAuthors.value.split(';').map((s) => s.trim()).filter(Boolean)
  try {
    await researchReaderApi.createCitation(paperId, { title: citeTitle.value, authors, bibtex: citeBibtex.value || null })
    pieceTitlePrompt.value = false; citeTitle.value = ''; citeAuthors.value = ''; citeBibtex.value = ''
    citations.value = await researchReaderApi.citations(paperId)
    toast.success('引用已添加')
  } catch (e) { toast.error(e.message) }
}
async function removeCitation(id) { await researchReaderApi.deleteCitation(id); citations.value = await researchReaderApi.citations(paperId) }
function toggleCitationNote(c) { const s = new Set(expandedCites.value); s.has(c.id) ? s.delete(c.id) : s.add(c.id); expandedCites.value = s }
async function reparse() {
  try { await researchLibraryApi.reparse(paperId); toast.success('解析任务已创建'); } catch (e) { toast.error(e.message) }
}

// ---------- 阅读位置 ----------
let posTimer = null
function savePositionDebounced() {
  clearTimeout(posTimer)
  posTimer = setTimeout(() => researchReaderApi.putPosition(paperId, { page: pageNumber.value, zoom: scale.value }).catch(() => {}), 800)
}

onMounted(async () => {
  await loadMeta()
  await loadPdf()
  stageRef.value?.addEventListener('mouseup', onStageMouseUp)
})
onBeforeUnmount(() => {
  clearTimeout(posTimer)
  stageRef.value?.removeEventListener('mouseup', onStageMouseUp)
  try { pdf.value?.destroy() } catch { }
})
</script>

<style scoped>
.tiny { font-size: 11px; color: #9aa7b8; }
.re-pdf-page { position: relative; }
.re-text-layer { position: absolute; inset: 0; text-align: initial; }
.re-text-layer ::selection { background: rgba(69,104,231,0.28); }
.re-kb-state { background: #f5f8fc; border: 1px solid #e7edf5; border-radius: 10px; padding: 12px; display: grid; gap: 8px; }
.re-bibtex { font-size: 10px; background: #f5f8fc; border-radius: 6px; padding: 8px; margin-top: 8px; white-space: pre-wrap; overflow-x: auto; color: #5a6b85; }
.re-note { font-size: 11px; color: #9aa7b8; margin: 6px 0 0; }
.re-cite-add { margin-top: 8px; }
</style>