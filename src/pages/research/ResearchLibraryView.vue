<template>
  <div class="re-explorer">
    <div class="re-surface-head">
      <b>本地文献库</b>
      <span class="re-badge blue">{{ rstore.total }} 篇</span>
      <span>{{ rstore.collections.length }} 个集合</span>
      <span style="margin-left: auto; display: flex; gap: 8px; align-items: center">
        <select class="re-select sm" :value="exportFmt" @change="onExport($event)">
          <option value="" disabled>导出…</option>
          <option value="bibtex">导出 BibTeX</option>
          <option value="ris">导出 RIS</option>
          <option value="csv">导出 CSV</option>
        </select>
        <button class="re-btn sm" data-testid="rs-trash-toggle" @click="showTrash = !showTrash">{{ showTrash ? '返回文献库' : '回收站' }}</button>
        <button class="re-btn primary sm" data-testid="rs-import-btn" @click="router.push('/research/import')">＋ 收录论文</button>
      </span>
    </div>

    <div class="re-three re-lit-grid">
      <!-- 左：集合与标签 -->
      <aside class="re-lit-left">
        <div class="re-side-title">我的集合</div>
        <div class="re-coll-item" :class="{ active: !rstore.filters.collection_id && !showTrash }" @click="pickCollection(null)">全部论文 <span class="re-count">{{ rstore.total }}</span></div>
        <div v-for="c in rstore.collections" :key="c.id" class="re-coll-item" :class="{ active: rstore.filters.collection_id === c.id }" @click="pickCollection(c.id)">
          {{ c.name }} <span class="re-count">{{ c.count }}</span>
        </div>
        <div style="display: flex; gap: 6px; margin-top: 10px">
          <input v-model="newColl" class="re-input" style="flex:1; font-size: 11px" placeholder="新建集合…" @keydown.enter="createColl" />
          <button class="re-btn sm" @click="createColl">＋</button>
        </div>

        <hr style="border: 0; border-top: 1px solid #e5ebf3; margin: 15px 0" />
        <div class="re-side-title">标签</div>
        <div v-for="t in rstore.tags" :key="t.id" class="re-coll-item" style="font-size: 11px" @click="pickTag(t.id)">
          <span :style="tagDot(t.color)"></span>{{ t.name }} <span class="re-count">{{ t.count }}</span>
        </div>
        <div style="display: flex; gap: 6px; margin-top: 10px">
          <input v-model="newTagName" class="re-input" style="flex:1; font-size: 11px" placeholder="新建标签…" @keydown.enter="createTag" />
          <button class="re-btn sm" @click="createTag">＋</button>
        </div>
      </aside>

      <!-- 中：列表 -->
      <section class="re-lit-main">
        <div class="re-lit-toolbar">
          <div class="re-searchbox">
            <span style="color: #9aa7b8">⌕</span>
            <input v-model="searchInput" data-testid="rs-library-search" placeholder="搜索标题、作者、DOI…" @input="onSearchInput" />
          </div>
          <select class="re-select" v-model="rstore.filters.reading_status" @change="reload">
            <option value="">阅读状态</option>
            <option value="unread">待读</option>
            <option value="reading">阅读中</option>
            <option value="read">已读</option>
            <option value="archived">归档</option>
          </select>
          <select class="re-select" v-model="rstore.filters.sort" @change="reload">
            <option value="recently_clicked">最近打开</option>
            <option value="created_at">添加时间</option>
            <option value="title">标题</option>
            <option value="year">年份</option>
            <option value="reading_status">阅读状态</option>
          </select>
          <button class="re-btn" :title="rstore.filters.order === 'desc' ? '降序' : '升序'" @click="toggleOrder">{{ rstore.filters.order === 'desc' ? '↓' : '↑' }}</button>
          <button class="re-btn" :class="{ active: manageMode }" data-testid="rs-manage-toggle" @click="toggleManage">{{ manageMode ? '完成' : '管理' }}</button>
          <button class="re-btn" @click="reload">⟳</button>
        </div>

        <div v-if="selected.size > 0 && manageMode" class="re-batch-bar">
          <span>已选 {{ selected.size }} 篇</span>
          <button class="re-btn sm" @click="batch('mark_read')">标记已读</button>
          <button class="re-btn sm" @click="batch('star')">收藏</button>
          <button class="re-btn sm" @click="batch('move')">移动到集合</button>
          <button class="re-btn sm danger" @click="batch('delete')">删除</button>
          <button class="re-btn sm" @click="selected.clear()">取消</button>
        </div>

        <div v-if="rstore.loading" class="re-loading">加载中…</div>
        <div v-else-if="rstore.error" class="re-error">{{ rstore.error }}<div class="re-error-actions"><button class="re-btn sm" @click="reload">重试</button></div></div>

        <div v-else-if="showTrash" class="re-lit-list">
          <div v-if="!trashItems.length" class="re-empty"><div class="re-empty-icon">🗑️</div><p>回收站为空</p></div>
          <div v-for="p in trashItems" :key="'t'+p.id" class="re-paper-card">
            <div class="re-pc-copy">
              <div class="re-pc-title">{{ p.title }}</div>
              <div class="re-pc-meta">{{ (p.authors||[]).join(' · ') || '未知作者' }} · {{ p.year || '—' }}<span class="re-badge red" style="margin-left:6px">已删除</span></div>
            </div>
            <button class="re-btn sm" @click="restorePaper(p.id)">恢复</button>
            <button class="re-btn sm danger" @click="purgePaper(p.id)">永久删除</button>
          </div>
        </div>

        <div v-else class="re-lit-list">
          <div v-if="!rstore.papers.length" class="re-empty">
            <div class="re-empty-icon">📚</div>
            <p>没有匹配的论文。上传第一篇论文，或调整筛选条件。</p>
            <button class="re-btn primary" @click="router.push('/research/import')">收录论文</button>
          </div>
          <div v-for="p in rstore.papers" :key="p.id" class="re-paper-card" :class="{ sel: selectedPaper && selectedPaper.id === p.id }" data-testid="rs-paper-card" @click="selectDetail(p)">
            <input v-if="manageMode" type="checkbox" class="re-check" :checked="selected.has(p.id)" @change="toggleSelected(p.id)" @click.stop />
            <div class="re-r-icon" :style="starStyle(p.starred)">▤</div>
            <div class="re-pc-copy" @click.stop="openReader(p)">
              <div class="re-pc-title">{{ p.title }}</div>
              <div class="re-pc-meta">
                {{ (p.authors||[]).join(' · ') || '未知作者' }} · {{ p.venue || '期刊' }} · {{ p.year || '—' }}
                <span class="re-tags">
                  <span v-for="t in p.tags" :key="'tag'+t.id" class="re-tag">{{ t.name }}</span>
                </span>
              </div>
            </div>
            <span class="re-badge" :class="parseBadge(p.parse_status)" :title="p.parse_error || ''">{{ parseLabel(p.parse_status) }}</span>
            <span class="re-pill" :class="pillClass(p.reading_status)" @click.stop="toggleRead(p)">{{ readLabel(p.reading_status) }}</span>
            <button class="re-btn sm" :title="p.starred ? '取消收藏' : '收藏'" @click.stop="toggleStar(p)">{{ p.starred ? '★' : '☆' }}</button>
            <button class="re-btn sm" title="打开阅读" @click.stop="openReader(p)">➡</button>
          </div>
        </div>

        <div v-if="!showTrash && rstore.total > 0" class="re-pagination">
          <button class="re-btn sm" :disabled="rstore.page <= 1" @click="goPage(rstore.page - 1)">‹</button>
          <span>第 {{ rstore.page }} / {{ totalPages }} 页 · {{ rstore.total }} 篇</span>
          <button class="re-btn sm" :disabled="rstore.page >= totalPages" @click="goPage(rstore.page + 1)">›</button>
        </div>
      </section>

      <!-- 右：详情 -->
      <aside class="re-lit-detail">
        <template v-if="selectedPaper">
          <div class="re-eyebrow">Selected Paper</div>
          <h3 class="re-detail-title" data-testid="rs-detail-title">{{ selectedPaper.title }}</h3>
          <div class="re-info-grid">
            <div class="re-info-row"><span>作者</span><b>{{ (selectedPaper.authors||[]).join('; ') || '未知' }}</b></div>
            <div class="re-info-row"><span>年份</span><b>{{ selectedPaper.year || '—' }}</b></div>
            <div class="re-info-row"><span>期刊</span><b>{{ selectedPaper.venue || '—' }}</b></div>
            <div class="re-info-row"><span>DOI</span><b>{{ selectedPaper.doi || '—' }}</b></div>
            <div class="re-info-row"><span>附件</span><b>{{ selectedPaper.file_name || '—' }}（{{ selectedPaper.file_size ? fmtSize(selectedPaper.file_size) : '—' }}）</b></div>
            <div class="re-info-row"><span>解析</span><b>{{ parseLabel(selectedPaper.parse_status) }}</b></div>
            <div v-if="selectedPaper.reading_position" class="re-info-row"><span>阅读位置</span><b>第 {{ selectedPaper.reading_position.page }} 页（{{ zoomPct(selectedPaper.reading_position.zoom) }}）</b></div>
          </div>
          <p v-if="selectedPaper.abstract" class="re-abstract">{{ selectedPaper.abstract }}</p>
          <div style="margin-top: 8px;display:flex;gap:6px;flex-wrap:wrap">
            <span v-for="c in selectedPaper.collections" :key="'col'+c.id" class="re-tag" style="background:#eaf0ff;color:#3f61d7">📁 {{ c.name }}</span>
            <span v-for="t in selectedPaper.tags" :key="'tag'+t.id" class="re-tag" :style="{background: t.color + '22', color:'#42526e'}"># {{ t.name }}</span>
          </div>
          <div class="re-actions">
            <button class="re-btn primary sm" data-testid="rs-detail-read" @click="openReader(selectedPaper)">立即阅读</button>
            <button class="re-btn sm" @click="toggleEdit">{{ editing ? '收起' : '编辑元数据' }}</button>
            <button class="re-btn sm" @click="downloadPdf(selectedPaper)">下载 PDF</button>
            <button class="re-btn sm" @click="reparsePaper(selectedPaper)">重新解析</button>
            <button class="re-btn sm danger" @click="removePaper(selectedPaper.id)">删除</button>
          </div>
          <div v-if="editing" class="re-edit-form">
            <div class="re-field"><label>标题</label><input v-model="editForm.title" class="re-input" /></div>
            <div class="re-field"><label>作者（;分隔）</label><input v-model="editAuthors" class="re-input" /></div>
            <div class="re-field" style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><label>年份</label><input v-model.number="editForm.year" class="re-input" type="number" /></div><div><label>期刊</label><input v-model="editForm.venue" class="re-input" /></div></div>
            <div class="re-field"><label>DOI</label><input v-model="editForm.doi" class="re-input" /></div>
            <div class="re-actions">
              <button class="re-btn primary sm" @click="saveEdit">保存</button>
              <button class="re-btn sm" @click="editing=false">取消</button>
            </div>
          </div>
        </template>
        <div v-else-if="!rstore.papers.length" class="re-empty"><div class="re-empty-icon">👈</div><p>从左侧选择一篇论文查看详情</p></div>
        <div v-else class="re-empty"><div class="re-empty-icon">👈</div><p>点击论文卡片查看详情并进入阅读</p></div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useResearchStore } from '@/stores/research'
import { useToastStore } from '@/stores/toast'
import { researchLibraryApi } from '@/api/researchEnd'

const route = useRoute()
const router = useRouter()
const rstore = useResearchStore()
const toast = useToastStore()

const searchInput = ref('')
const newColl = ref('')
const newTagName = ref('')
const showTrash = ref(false)
const manageMode = ref(false)
const selected = ref(new Set())
const trashItems = ref([])
const selectedPaper = ref(null)
const editing = ref(false)
const editForm = ref({})
const exportFmt = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(rstore.total / rstore.pageSize)))

const editAuthors = computed({
  get: () => (editForm.value.authors || []).join('; '),
  set: (v) => { editForm.value.authors = v.split(';').map((s) => s.trim()).filter(Boolean) },
})

function tagDot(c) { return `display:inline-block;width:10px;height:10px;border-radius:50%;background:${c || '#4169e1'};margin-right:6px;` }
function parseLabel(s) { return ({ pending: '待解析', parsing: '解析中', completed: '已解析', failed: '解析失败', metadata_only: '仅元数据' })[s] || s }
function parseBadge(s) { return s === 'completed' ? 'green' : s === 'failed' ? 'red' : s === 'metadata_only' ? 'orange' : '' }
function readLabel(s) { return ({ unread: '待读', reading: '阅读中', read: '已读', archived: '归档' })[s] || '待读' }
function pillClass(s) { return s === 'reading' ? 'reading' : s === 'read' ? 'done' : '' }
function fmtSize(n) { return n > 1048576 ? `${(n / 1048576).toFixed(1)}MB` : `${Math.round(n / 1024)}KB` }
function zoomPct(z) { return Math.round((z || 1) * 100) + '%' }
function starStyle(b) { return b ? 'background:linear-gradient(135deg,#ffb13e,#ec795c)' : '' }

async function reload() {
  try {
    await rstore.fetchLibrary()
    if (selectedPaper.value) {
      const fresh = await researchLibraryApi.getPaper(selectedPaper.value.id)
      selectedPaper.value = fresh
    }
  } catch (e) { toast.error(e?.message || '加载失败') }
}
function onSearchInput() {
  clearTimeout(searchInput._t)
  searchInput._t = setTimeout(async () => {
    rstore.filters.q = searchInput.value.trim()
    rstore.page = 1
    await reload()
  }, 300)
}
function toggleOrder() { rstore.filters.order = rstore.filters.order === 'desc' ? 'asc' : 'desc'; reload() }
function goPage(p) { rstore.page = p; reload() }
function pickCollection(id) { rstore.filters.collection_id = id; reload() }
function pickTag(id) { rstore.filters.tag_id = rstore.filters.tag_id === id ? '' : id; reload() }
function toggleManage() { manageMode.value = !manageMode.value; selected.value.clear() }
function toggleSelected(id) { const s = new Set(selected.value); s.has(id) ? s.delete(id) : s.add(id); selected.value = s }
function toggleRead(p) { researchLibraryApi.patchPaper(p.id, { reading_status: p.reading_status === 'read' ? 'unread' : 'read' }).then(() => reload()).catch((e) => toast.error(e.message)) }
function toggleStar(p) { researchLibraryApi.patchPaper(p.id, { starred: !p.starred }).then(() => reload()).catch((e) => toast.error(e.message)) }

async function openReader(p) {
  const detail = selectedPaper.value?.id === p.id ? selectedPaper.value : await researchLibraryApi.getPaper(p.id)
  if (detail.reading_status === 'unread') { await researchLibraryApi.patchPaper(p.id, { reading_status: 'reading' }).catch(() => {}) }
  router.push(`/research/reader/${p.id}`)
}

async function selectDetail(p) {
  try { selectedPaper.value = await researchLibraryApi.getPaper(p.id) } catch (e) { toast.error(e.message) }
}
async function createColl() {
  if (!newColl.value.trim()) return
  try { await researchLibraryApi.createCollection({ name: newColl.value.trim() }); newColl.value = ''; await rstore.fetchCollections() } catch (e) { toast.error(e.message) }
}
async function createTag() {
  if (!newTagName.value.trim()) return
  try { await researchLibraryApi.createTag({ name: newTagName.value.trim(), color: '#4169e1' }); newTagName.value = ''; await rstore.fetchTags() } catch (e) { toast.error(e.message) }
}
function toggleEdit() { editing.value = !editing.value; if (editing.value) editForm.value = { ...selectedPaper.value } }
async function saveEdit() {
  try {
    const body = { title: editForm.value.title, authors: editForm.value.authors, year: editForm.value.year || null, venue: editForm.value.venue, doi: editForm.value.doi }
    await researchLibraryApi.patchPaper(selectedPaper.value.id, body)
    toast.success('元数据已保存')
    editing.value = false
    await reload()
  } catch (e) { toast.error(e.message) }
}
async function downloadPdf(p) {
  if (!p.has_pdf) { toast.info('该论文暂无 PDF 附件'); return }
  try {
    const { blob, filename } = await researchLibraryApi.downloadPdf(p.id)
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename || p.file_name || 'paper.pdf'; a.click()
  } catch (e) { toast.error(e.message) }
}
async function reparsePaper(p) {
  try { await researchLibraryApi.reparse(p.id); toast.success('解析任务已创建'); } catch (e) { toast.error(e.message) }
}
async function removePaper(id) {
  if (!confirm('将该论文移入回收站？')) return
  try { await researchLibraryApi.deletePaper(id); toast.success('已移入回收站'); if (selectedPaper.value?.id === id) selectedPaper.value = null; await reload() } catch (e) { toast.error(e.message) }
}
async function restorePaper(id) { await researchLibraryApi.restorePaper(id).then(() => { toast.success('已恢复'); loadTrash() }) }
async function purgePaper(id) { if (!confirm('永久删除该论文及全部标注/分块？此操作不可撤销')) return; await researchLibraryApi.purgePaper(id).then(() => { toast.success('已永久删除'); loadTrash() }) }
async function loadTrash() {
  try { const d = await researchLibraryApi.listPapers({ include_deleted: true, page: 1, page_size: 100, reading_status: 'archived' }); trashItems.value = d.items || [] } catch { trashItems.value = [] }
}
async function batch(action) {
  const ids = [...selected.value]
  if (action === 'move') { const cid = prompt('输入目标集合 ID（左侧集合点击后可见）'); if (!cid) return; await researchLibraryApi.batch({ ids, action: 'move_collection', collection_id: cid }) }
  else await researchLibraryApi.batch({ ids, action, tag_ids: action === 'add_tags' ? [] : undefined })
  toast.success('批量操作完成'); selected.value.clear()
  if (action === 'delete') showTrash.value = true
  await reload()
}
async function onExport(e) {
  const fmt = e.target.value
  e.target.value = ''
  if (!fmt) return
  const ids = selected.value.size ? [...selected.value].join(',') : ''
  try { const { blob, filename } = await researchLibraryApi.exportRefs(fmt, ids); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); } catch (err) { toast.error(err.message) }
}

watch(showTrash, (v) => { if (v) loadTrash() })

onMounted(async () => {
  if (route.query.q) { rstore.filters.q = String(route.query.q); searchInput.value = String(route.query.q) }
  try { await Promise.all([rstore.fetchCollections(), rstore.fetchTags()]) } catch { /* 单独失败不阻塞列表 */ }
  await reload()
})
</script>

<style scoped>
.re-lit-grid { grid-template-columns: 210px 1fr 300px; }
.re-check { width: 14px; height: 14px; accent-color: #4568e7; flex-shrink: 0; }
.re-batch-bar { display: flex; align-items: center; gap: 8px; background: #eaf0ff; border: 1px solid #c9dbff; border-radius: 10px; padding: 8px 12px; margin-bottom: 10px; font-size: 12px; color: #3f61d7; flex-wrap: wrap; }
.re-abstract { font-size: 11px; line-height: 1.7; color: #4d5870; margin: 14px 0 0; }
.re-edit-form { margin-top: 14px; display: grid; gap: 10px; }
.re-field label { display: block; font-size: 11px; color: #8a99ae; margin-bottom: 4px; }
.re-field input { width: 100%; font-size: 12px; }
.re-pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; font-size: 12px; color: #8a99ae; }
</style>