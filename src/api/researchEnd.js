/**
 * 科研端 API 封装（论文阅读与写作平台）
 * 复用统一 fetch client（/api/client.js 信封解析 + 401 自动刷新）。
 * 禁止在组件内直接拼 /api 路径。PDF 用 api.download 拿 blob；SSE 复用 streamChat。
 */
import { api } from '@/api/client'
import { streamChat } from '@/api/sse'

const R = '/research'
const lit = `${R}/literature`
const read = `${R}/reader`
const kb = `${R}/kb`
const wr = `${R}/writing`
const ai = `${R}/ai`
const tk = `${R}/tasks`

export async function researchSummary() {
  return api.get(`${R}/summary`)
}

// ---------------- 文献库 ----------------
export const researchLibraryApi = {
  listPapers: (params) => api.get(`${lit}/papers`, params),
  getPaper: (id) => api.get(`${lit}/papers/${id}`),
  importPaper: (body) => api.post(`${lit}/papers`, body),
  patchPaper: (id, body) => api.patch(`${lit}/papers/${id}`, body),
  deletePaper: (id) => api.delete(`${lit}/papers/${id}`),
  restorePaper: (id) => api.post(`${lit}/papers/${id}/restore`),
  purgePaper: (id) => api.delete(`${lit}/papers/${id}/purge`),
  reparse: (id) => api.post(`${lit}/papers/${id}/reparse`),
  batch: (body) => api.post(`${lit}/batch`, body),

  collections: () => api.get(`${lit}/collections`),
  createCollection: (body) => api.post(`${lit}/collections`, body),
  patchCollection: (id, body) => api.patch(`${lit}/collections/${id}`, body),
  deleteCollection: (id) => api.delete(`${lit}/collections/${id}`),

  tags: () => api.get(`${lit}/tags`),
  createTag: (body) => api.post(`${lit}/tags`, body),
  patchTag: (id, body) => api.patch(`${lit}/tags/${id}`, body),
  deleteTag: (id) => api.delete(`${lit}/tags/${id}`),

  setCollections: (id, ids) => api.post(`${lit}/papers/${id}/collections`, { ids }),
  setTags: (id, ids) => api.post(`${lit}/papers/${id}/tags`, { ids }),

  downloadPdf: (id) => api.download(`${lit}/papers/${id}/pdf`),
  exportRefs: (fmt = 'bibtex', ids = '') =>
    api.download(`${lit}/export?format=${encodeURIComponent(fmt)}${ids ? `&ids=${ids}` : ''}`),
}

// ---------------- 阅读 ----------------
export const researchReaderApi = {
  getPosition: (pid) => api.get(`${read}/papers/${pid}/position`),
  putPosition: (pid, body) => api.put(`${read}/papers/${pid}/position`, body),
  annotations: (pid, params) => api.get(`${read}/papers/${pid}/annotations`, params),
  createAnnotation: (pid, body) => api.post(`${read}/papers/${pid}/annotations`, body),
  patchAnnotation: (id, body) => api.patch(`${read}/annotations/${id}`, body),
  deleteAnnotation: (id) => api.delete(`${read}/annotations/${id}`),
  notes: (pid) => api.get(`${read}/papers/${pid}/notes`),
  createNote: (pid, body) => api.post(`${read}/papers/${pid}/notes`, body),
  patchNote: (id, body) => api.patch(`${read}/notes/${id}`, body),
  deleteNote: (id) => api.delete(`${read}/notes/${id}`),
  citations: (pid) => api.get(`${read}/papers/${pid}/citations`),
  createCitation: (pid, body) => api.post(`${read}/papers/${pid}/citations`, body),
  patchCitation: (id, body) => api.patch(`${read}/citations/${id}`, body),
  deleteCitation: (id) => api.delete(`${read}/citations/${id}`),
}

// ---------------- 知识库 ----------------
export const researchKbApi = {
  state: (pid) => api.get(`${kb}/papers/${pid}/state`),
  chunks: (pid, params) => api.get(`${kb}/papers/${pid}/chunks`, params),
  objects: (pid) => api.get(`${kb}/papers/${pid}/objects`),
  search: (body) => api.post(`${kb}/search`, body),
  embed: (pid) => api.post(`${kb}/papers/${pid}/embed`),
}

// ---------------- 写作 ----------------
export const researchWritingApi = {
  manuscripts: (params) => api.get(`${wr}/manuscripts`, params),
  getManuscript: (id) => api.get(`${wr}/manuscripts/${id}`),
  createManuscript: (body) => api.post(`${wr}/manuscripts`, body),
  patchManuscript: (id, body) => api.patch(`${wr}/manuscripts/${id}`, body),
  deleteManuscript: (id) => api.delete(`${wr}/manuscripts/${id}`),
  versions: (id) => api.get(`${wr}/manuscripts/${id}/versions`),
  restoreVersion: (id, version) => api.post(`${wr}/manuscripts/${id}/restore-version`, { version }),
  compile: (id) => api.post(`${wr}/manuscripts/${id}/compile`),
  downloadPdf: (id) => api.download(`${wr}/manuscripts/${id}/pdf`),
  exportManuscript: (id, fmt = 'tex') => api.download(`${wr}/manuscripts/${id}/export?format=${encodeURIComponent(fmt)}`),

  materials: (msid) => api.get(`${wr}/manuscripts/${msid}/materials`),
  addMaterial: (body) => api.post(`${wr}/materials`, body),
  patchMaterial: (id, body) => api.patch(`${wr}/materials/${id}`, body),
  deleteMaterial: (id) => api.delete(`${wr}/materials/${id}`),

  citations: (msid) => api.get(`${wr}/manuscripts/${msid}/citations`),
  addCitation: (msid, body) => api.post(`${wr}/manuscripts/${msid}/citations`, body),
  deleteCitation: (id) => api.delete(`${wr}/citations/${id}`),

  suggestions: (msid, params) => api.get(`${wr}/manuscripts/${msid}/suggestions`, params),
  aiCheck: (msid) => api.post(`${wr}/manuscripts/${msid}/ai-check`),
  acceptSuggestion: (id, body) => api.post(`${wr}/suggestions/${id}/accept`, body),
  ignoreSuggestion: (id) => api.post(`${wr}/suggestions/${id}/ignore`),
}

// ---------------- AI ----------------
export const researchAiApi = {
  chat: (payload, { onEvent, signal } = {}) =>
    streamChat(payload, { path: `/api${ai}/chat`, onEvent, signal }),
  selection: (payload, { onEvent, signal } = {}) =>
    streamChat(payload, { path: `/api${ai}/selection`, onEvent, signal }),
  webCandidates: (body) => api.post(`${ai}/search-candidates`, body),
  // 对话记忆会话
  sessions: () => api.get(`${ai}/sessions`),
  createSession: (body) => api.post(`${ai}/sessions`, body || {}),
  deleteSession: (id) => api.delete(`${ai}/sessions/${id}`),
  sessionMessages: (id) => api.get(`${ai}/sessions/${id}/messages`),
}

// ---------------- 任务中心 ----------------
export const researchTasksApi = {
  list: (params) => api.get(`${tk}`, params),
  get: (id) => api.get(`${tk}/${id}`),
  cancel: (id) => api.post(`${tk}/${id}/cancel`),
  retry: (id) => api.post(`${tk}/${id}/retry`),
  remove: (id) => api.delete(`${tk}/${id}`),
}

/** PDF 字节（pdf.js 用）：api.download 已带鉴权；返回 { blob, filename } */
export async function researchPdfBlob(path) {
  return api.download(path)
}

/** 上传本地 PDF（走平台 /api/files 上传 → 返回 file_id 供 research import file 模式） */
export async function uploadPdf(file) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { sha256Hex } = await import('@/utils/sha256')
  const sha = await sha256Hex(bytes)
  const up = await api.post('/files/upload', {
    filename: file.name, mime: 'application/pdf', size_bytes: bytes.byteLength, sha256: sha, multipart: false,
  })
  const { file_id, upload_url } = up || {}
  if (!file_id || !upload_url) throw new Error('上传初始化失败')
  // 本地代理 PUT（dev）或预签名 PUT：原样字节，不带 JSON 头
  const { authHeaders } = await import('@/api/client')
  const res = await fetch(upload_url, { method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/pdf' }, body: bytes })
  if (!res.ok) throw new Error(`上传失败（HTTP ${res.status}）`)
  return file_id
}