<template>
  <div class="re-scroll">
    <div style="max-width: 1080px; margin: 0 auto; padding: 26px 36px 60px">
      <div class="re-flow-head">
        <div>
          <h1>收录论文</h1>
          <p>上传 PDF 或录入 DOI / URL / BibTeX。PDF 上传后立即解析进入知识库；其余仅存元数据，后续上传 PDF 再解析。</p>
        </div>
        <div class="re-stepper">
          <span class="re-step active"><b>1</b>选择来源</span>
          <span class="re-step-line"></span>
          <span class="re-step" :class="{ done: imported > 0 }"><b>2</b>确认</span>
        </div>
      </div>

      <div class="re-surface" style="background:#fff;border:1px solid var(--re-line);border-radius:17px;padding:24px;box-shadow:var(--re-shadow)">
        <div class="re-source-tabs">
          <button class="re-source-tab" :class="{ active: tab === 'file' }" @click="tab = 'file'">上传 PDF</button>
          <button class="re-source-tab" :class="{ active: tab === 'doi' }" @click="tab = 'doi'">输入 DOI</button>
          <button class="re-source-tab" :class="{ active: tab === 'url' }" @click="tab = 'url'">粘贴 URL</button>
          <button class="re-source-tab" :class="{ active: tab === 'bibtex' }" @click="tab = 'bibtex'">BibTeX / RIS</button>
        </div>

        <div v-if="tab === 'file'">
          <div class="re-dropzone" data-testid="rs-dropzone" @click="fileInput && fileInput.click()" @dragover.prevent @drop.prevent="onDrop">
            <input ref="fileInput" type="file" accept="application/pdf,.pdf" style="display:none" @change="onPickFile" />
            <div v-if="!pdfState.file" class="re-upload-mark">↑</div>
            <h3>{{ pdfState.file ? pdfState.file.name : '拖入论文 PDF' }}</h3>
            <p>{{ pdfState.file ? `${fmtSize(pdfState.file.size)} · 点击选择其他文件` : '支持单篇 PDF，最大 20MB。系统自动解析文本层、公式、参考文献并进入知识库' }}</p>
            <button v-if="pdfState.file" class="re-btn primary" style="margin-top:12px" data-testid="rs-upload-start" @click.stop="startFileImport">开始收录</button>
          </div>

          <div v-if="pdfState.status && pdfState.status !== 'idle'" class="re-parse-panel">
            <div style="display:flex"><strong style="font-size:12px">处理状态</strong><span style="margin-left:auto;font-size:11px;color:var(--re-muted)">{{ pdfState.label }}</span></div>
            <div class="re-progress" style="margin:10px 0"><i :style="{ width: pdfState.progress + '%' }"></i></div>
            <div class="re-parse-grid"><span>附件上传</span><span>元数据</span><span>知识库分块解析</span></div>
          </div>
        </div>

        <div v-else-if="tab === 'doi' || tab === 'url'">
          <div style="display:flex;gap:8px">
            <input v-model="metaInput" class="re-input" style="flex:1" :placeholder="tab === 'doi' ? '例如：10.1000/xyz.123' : '例如：https://arxiv.org/abs/2401.00001'" data-testid="rs-meta-input" />
            <button class="re-btn primary" @click="importMeta">收录</button>
          </div>
          <p class="re-note">仅保存元数据；拿到全文 PDF 后再上传即可自动解析入知识库。</p>
        </div>

        <div v-else>
          <textarea v-model="bibtexInput" class="re-textarea" rows="12" style="width:100%" placeholder="@article{key,
  title = {...},
  author = {...},
  year = {2024},
  journal = {...},
  doi = {...}
}"></textarea>
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="re-btn primary" @click="importBibtex">批量导入</button>
            <span class="re-note" style="align-self:center">仅存元数据，不解析</span>
          </div>
        </div>

        <!-- 结果 -->
        <div v-if="result" class="re-result" :class="result.duplicates?.length ? 'warn' : ''">
          <strong>{{ result.created ? '收录完成' : result.duplicates?.length ? '存在重复条目' : '完成' }}</strong>
          <p style="margin-top:6px">
            <template v-if="result.papers?.length">新增 {{ result.papers.length }} 篇：由解析任务自动入库。</template>
            <template v-if="result.duplicates?.length">发现 {{ result.duplicates.length }} 个重复条目（按 DOI/标题匹配），未重复创建，可在文献库中合并附件。</template>
            <template v-if="result.merged">已为既有条目补充 PDF 附件并触发解析（合并，未新建）。</template>
          </p>
          <div class="re-actions">
            <button class="re-btn sm" @click="router.push('/research/library')">去文献库</button>
            <button class="re-btn sm" @click="resetForm">继续收录</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToastStore } from '@/stores/toast'
import { researchLibraryApi, uploadPdf } from '@/api/researchEnd'

const router = useRouter()
const toast = useToastStore()

const tab = ref('file')
const fileInput = ref(null)
const pdfState = reactive({ file: null, status: 'idle', progress: 0, label: '等待文件' })
const metaInput = ref('')
const bibtexInput = ref('')
const result = ref(null)
const imported = ref(0)

function fmtSize(n) { return n > 1048576 ? `${(n / 1048576).toFixed(1)}MB` : `${Math.round(n / 1024)}KB` }

function onPickFile(e) { const f = e.target.files?.[0]; if (f) { if (f.type !== 'application/pdf' && !f.name.endsWith('.pdf')) { toast.warning('仅支持 PDF'); return } if (f.size > 20 * 1024 * 1024) { toast.warning('文件超过 20MB'); return } pdfState.file = f; pdfState.status = 'idle'; pdfState.progress = 0; pdfState.label = '待开始'; } }
function onDrop(e) { const f = e.dataTransfer?.files?.[0]; if (f) { pdfState.file = f; pdfState.status = 'idle' } }

async function startFileImport() {
  if (!pdfState.file) return
  pdfState.status = 'uploading'; pdfState.progress = 10; pdfState.label = '上传附件…'
  try {
    const file_id = await uploadPdf(pdfState.file)
    pdfState.progress = 45; pdfState.label = '写入文献库并触发解析…'
    const data = await researchLibraryApi.importPaper({ mode: 'file', file_id, title: '', authors: [] })
    result.value = data
    imported.value = 1
    pdfState.progress = 100; pdfState.label = '解析任务已创建'
    toast.success('已收录，正在后台解析进入知识库')
  } catch (e) {
    pdfState.status = 'error'; pdfState.label = e?.message || '导入失败'
    toast.error(e?.message || '导入失败')
  }
}

async function importMeta() {
  const v = metaInput.value.trim()
  if (!v) { toast.warning('请输入 DOI 或 URL'); return }
  const mode = tab.value === 'doi' ? 'doi' : 'url'
  try {
    const data = await researchLibraryApi.importPaper({ mode, doi_or_url: v })
    result.value = data; imported.value = data.papers?.length ? 1 : 0
    toast.success('已保存元数据')
  } catch (e) { toast.error(e?.message || '录入失败') }
}

async function importBibtex() {
  if (!bibtexInput.value.trim()) { toast.warning('请输入 BibTeX 内容'); return }
  try {
    const data = await researchLibraryApi.importPaper({ mode: 'bibtex', bibtex_text: bibtexInput.value })
    result.value = data; imported.value = data.papers?.length ? 1 : 0
    toast.success(`已导入 ${data.papers?.length || 0} 篇（仅元数据）`)
  } catch (e) { toast.error(e?.message || '导入失败') }
}

function resetForm() {
  result.value = null; pdfState.file = null; pdfState.status = 'idle'; pdfState.progress = 0; pdfState.label = '等待文件'
  metaInput.value = ''; bibtexInput.value = ''; imported.value = 0
}
</script>

<style scoped>
.re-note { color: var(--re-muted); font-size: 12px; margin-top: 8px; }
.re-result { margin-top: 18px; background: #eef9f4; border: 1px solid #cdeee2; border-radius: 12px; padding: 14px 16px; font-size: 13px; }
.re-result.warn { background: #fff8eb; border-color: #f5dfae; }
</style>