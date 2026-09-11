/**
 * 科研端 API 模块
 * 诚实原则（2026-09-08 独立审查 #5）：不再静默降级到本地 mock。
 * 科研端为平台内应用：登录后直达 /research 平台路由（不再有统一入口 Hub）。
 * 旧 /research/* 页面已收敛为入口重定向；此模块保留给既有调用方，失败即抛出，
 * 由页面呈现真实错误态，绝不回填假数据冒充科研成果。
 */
import { api } from './client'

// 失败透传：任何后端异常（404/500/网络错误）直接抛出，由调用方处理；不返回 mock
async function safeCall(fetcher) {
  return await fetcher()
}

/* ===== 项目管理 /api/research/projects ===== */
export const researchProjectApi = {
  list: (params = {}) => safeCall(
    () => api.get('/research/projects', params),
    () => researchMock.getProjects(params),
  ),
  detail: (id) => safeCall(
    () => api.get(`/research/projects/${id}`),
    () => researchMock.getProjectDetail(id),
  ),
  members: (id) => safeCall(
    () => api.get(`/research/projects/${id}/members`),
    () => researchMock.getProjectMembers(id),
  ),
  tasks: (id) => safeCall(
    () => api.get(`/research/projects/${id}/tasks`),
    () => researchMock.getProjectTasks(id),
  ),
  evidence: (id) => safeCall(
    () => api.get(`/research/projects/${id}/evidence`),
    () => researchMock.getProjectEvidence(id),
  ),
  activity: (id) => safeCall(
    () => api.get(`/research/projects/${id}/activity`),
    () => researchMock.getProjectActivity(id),
  ),
  create: (payload) => safeCall(
    () => api.post('/research/projects', payload),
    () => ({ id: `proj-${Date.now()}`, ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
  ),
  update: (id, payload) => safeCall(
    () => api.patch(`/research/projects/${id}`, payload),
    () => ({ ...researchMock.getProjectDetail(id), ...payload, updatedAt: new Date().toISOString() }),
  ),
}

/* ===== 文献管理 /api/research/literature ===== */
export const researchLiteratureApi = {
  list: (params = {}) => safeCall(
    () => api.get('/research/literature/papers', params),
    () => researchMock.getPapers(params),
  ),
  detail: (id) => safeCall(
    () => api.get(`/research/literature/papers/${id}`),
    () => researchMock.getPaperDetail(id),
  ),
  collections: () => safeCall(
    () => api.get('/research/literature/collections'),
    () => researchMock.getCollections(),
  ),
  addPaper: (payload) => safeCall(
    () => api.post('/research/literature/papers', payload),
    () => ({ id: `p-${Date.now()}`, ...payload, addedAt: new Date().toISOString() }),
  ),
  updateReadStatus: (id, status) => safeCall(
    () => api.patch(`/research/literature/papers/${id}`, { readStatus: status }),
    () => ({ ...researchMock.getPaperDetail(id), readStatus: status }),
  ),
  deletePaper: (id) => safeCall(
    () => api.del(`/research/literature/papers/${id}`),
    () => ({ ok: true }),
  ),
}

/* ===== 数学验证 /api/research/verify ===== */
export const researchVerifyApi = {
  verify: (payload) => safeCall(
    () => api.post('/research/derivations/verify', payload),
    () => researchMock.verifyDerivation(payload),
    800,
  ),
  history: () => safeCall(
    () => api.get('/research/verify/history'),
    () => researchMock.getVerifyHistory(),
  ),
  detail: (id) => safeCall(
    () => api.get(`/research/verify/${id}`),
    () => researchMock.getVerifyHistory().find(v => v.id === id),
  ),
}

/* ===== Lean4 /api/research/lean ===== */
export const researchLeanApi = {
  files: (projectId) => safeCall(
    () => api.get('/research/lean/files', { projectId }),
    () => researchMock.getLeanFiles(projectId),
  ),
  fileContent: (fileId) => safeCall(
    () => api.get(`/research/lean/files/${fileId}`),
    () => researchMock.getLeanFileContent(fileId),
  ),
  saveFile: (fileId, content) => safeCall(
    () => api.put(`/research/lean/files/${fileId}`, { content }),
    () => ({ id: fileId, saved: true }),
  ),
  startBuild: (projectId) => safeCall(
    () => api.post('/research/lean/build', { projectId }),
    () => researchMock.startLeanBuild(projectId),
  ),
  buildStatus: (buildId) => safeCall(
    () => api.get(`/research/lean/build/${buildId}`),
    () => researchMock.getLeanBuildStatus(buildId),
  ),
  goals: (fileId) => safeCall(
    () => api.get(`/research/lean/files/${fileId}/goals`),
    () => researchMock.getLeanGoals(fileId),
  ),
}

/* ===== 论文写作 /api/research/writing ===== */
export const researchWritingApi = {
  list: () => safeCall(
    () => api.get('/research/writing/projects'),
    () => researchMock.getWritingProjects(),
  ),
  compile: (projectId) => safeCall(
    () => api.post(`/research/writing/projects/${projectId}/compile`),
    () => ({ id: projectId, compileStatus: 'compiling' }),
  ),
  status: (projectId) => safeCall(
    () => api.get(`/research/writing/projects/${projectId}/status`),
    () => researchMock.getWritingProjects().find(p => p.id === projectId),
  ),
}

/* ===== 论文初审 /api/research/review ===== */
export const researchReviewApi = {
  submissions: () => safeCall(
    () => api.get('/research/review/submissions'),
    () => researchMock.getReviewSubmissions(),
  ),
  submit: (payload) => safeCall(
    () => api.post('/research/review/submissions', payload),
    () => ({ id: `rs-${Date.now()}`, ...payload, status: 'pending', submittedAt: new Date().toISOString() }),
    500,
  ),
  detail: (id) => safeCall(
    () => api.get(`/research/review/submissions/${id}`),
    () => researchMock.getReviewSubmissions().find(s => s.id === id),
  ),
  findings: (submissionId) => safeCall(
    () => api.get(`/research/review/submissions/${submissionId}/findings`),
    () => researchMock.getReviewFindings(submissionId),
  ),
}

/* ===== 教育研究 /api/research/education ===== */
export const researchEducationApi = {
  analyses: () => safeCall(
    () => api.get('/research/education/analyses'),
    () => researchMock.getEducationAnalyses(),
  ),
  create: (payload) => safeCall(
    () => api.post('/research/education/analyses', payload),
    () => ({ id: `ea-${Date.now()}`, ...payload, status: 'configuring', step: 1 }),
  ),
  detail: (id) => safeCall(
    () => api.get(`/research/education/analyses/${id}`),
    () => researchMock.getEducationAnalyses().find(a => a.id === id),
  ),
  start: (id) => safeCall(
    () => api.post(`/research/education/analyses/${id}/start`),
    () => ({ id, status: 'running', step: 2 }),
  ),
}

/* ===== 运行中心 /api/research/runs ===== */
export const researchRunsApi = {
  list: (params = {}) => safeCall(
    () => api.get('/research/runs', params),
    () => researchMock.getRuns(params),
  ),
  detail: (id) => safeCall(
    () => api.get(`/research/runs/${id}`),
    () => researchMock.getRunDetail(id),
  ),
  cancel: (id) => safeCall(
    () => api.post(`/research/runs/${id}/cancel`),
    () => ({ id, status: 'cancelled' }),
  ),
}

/* ===== 证据账本 /api/research/evidence ===== */
export const researchEvidenceApi = {
  list: (params = {}) => safeCall(
    () => api.get('/research/evidence', params),
    () => researchMock.getEvidence(params),
  ),
  detail: (id) => safeCall(
    () => api.get(`/research/evidence/${id}`),
    () => researchMock.getEvidence().find(e => e.id === id),
  ),
}

/* ===== 仪表盘 /api/research/dashboard ===== */
export const researchDashboardApi = {
  overview: () => safeCall(
    () => api.get('/research/dashboard'),
    () => researchMock.getDashboard(),
  ),
}
