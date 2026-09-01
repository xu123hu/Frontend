<!--
  V2 reconstruction source: Paper LMS CommonsCard (MIT), cloned at
  D:\teacher-v2-reference-repos\kocherm-paper-lms, commit 543c… .
  Its source-first catalog and review affordances are adapted to a teacher-owned
  high-school mathematics resource and explicit approval boundary.
-->
<template>
  <div class="resource-v2">
    <header class="resource-v2__head">
      <div>
        <p class="resource-v2__eyebrow">资源中心 · 高中数学</p>
        <h1>资源与题目审核</h1>
        <p>从真实讲义、试卷、课件或照片开始；所有候选题均需教师确认后，才可进入组卷题库。</p>

      </div>
      <div class="resource-v2__head-actions">
        <button class="t-btn" type="button" @click="showExternalForm = !showExternalForm">添加公开引用</button>
        <button class="t-btn primary lg" type="button" :disabled="store.loading" @click="fileInput?.click()">{{ store.loading ? '处理中…' : '上传教学材料' }}</button>
      </div>
      <input ref="fileInput" type="file" hidden accept=".txt,.md,.docx,.pdf,.png,.jpg,.jpeg" @change="onPicked">
    </header>

    <section class="resource-v2__toolbar" aria-label="资源检索与审核统计">
      <label>检索我的资料<input v-model.trim="query" type="search" placeholder="按文件名查找"></label>
      <p><strong>{{ pendingCount }}</strong> 道候选题等待教师审核</p>
    </section>
    <form v-if="showExternalForm" class="resource-v2__external-form" @submit.prevent="saveExternalReference">
      <strong>保存公开引用</strong>
      <p>只保存链接、署名和教学用途；平台不会下载、转载或解析第三方视频、试卷和课件。</p>
      <input v-model.trim="externalDraft.title" required maxlength="240" placeholder="资料标题">
      <input v-model.trim="externalDraft.url" required type="url" maxlength="2048" placeholder="https://…">
      <input v-model.trim="externalDraft.provider" maxlength="120" placeholder="平台/来源，例如 Bilibili">
      <input v-model.trim="externalDraft.attribution" maxlength="500" placeholder="作者或署名信息">
      <input v-model.trim="externalDraft.intended_use" maxlength="500" placeholder="教学用途，例如课前预习">
      <button class="t-btn sm primary" type="submit" :disabled="store.loading">保存公开引用</button><button class="t-btn sm" type="button" @click="showExternalForm = false">取消</button>
    </form>

    <p v-if="store.error" class="resource-v2__notice error" role="alert">{{ store.error }}</p>
    <p v-else-if="notice" class="resource-v2__notice" role="status">{{ notice }}</p>

    <main class="resource-v2__workspace">
      <section class="resource-v2__catalog" aria-labelledby="catalog-title">
        <header class="resource-v2__section-head">
          <div><p class="resource-v2__eyebrow">我的材料</p><h2 id="catalog-title">来源可追溯的资料库</h2></div>
          <span>{{ visibleItems.length }} 份</span>
        </header>
        <div v-if="!store.loading && !store.items.length" class="resource-v2__empty">
          <h3>还没有上传教学材料</h3><p>上传真实的高中数学讲义、试卷、PDF 或图片。系统不会预填示例资源。</p>
        </div>
        <div v-else-if="store.items.length && !visibleItems.length" class="resource-v2__empty">没有名称匹配的真实资料。</div>
        <div v-else class="resource-v2__list">
          <article v-for="resource in visibleItems" :key="resource.resource_id" class="resource-v2__item">
            <header>
              <div><p>{{ fileLabel(resource) }} · {{ resource.resource_kind === 'external_reference' ? '公开引用' : formatSize(resource.size_bytes) }}</p><h3>{{ resource.name }}</h3></div>
              <span :class="['resource-v2__status', `is-${resource.status}`]">{{ statusText(resource.status) }}</span>
            </header>
            <p class="resource-v2__summary">{{ resource.resource_kind === 'external_reference' ? `${resource.provider || '公开网页'} · ${resource.attribution || '教师待补充署名'} · ${resource.intended_use || '未填写教学用途'}` : (resource.summary || '尚未生成摘要；原文件仍保持可下载与可追溯。') }}</p>
            <p v-for="warning in resource.warnings || []" :key="warning" class="resource-v2__warning">{{ warning }}</p>
            <div class="resource-v2__actions">
              <template v-if="resource.resource_kind !== 'external_reference'">
                <button class="t-btn sm" type="button" @click="preprocess(resource.resource_id)">预处理</button><button class="t-btn sm" type="button" @click="understand(resource.resource_id)">生成摘要</button><button class="t-btn sm" type="button" @click="download(resource)">下载原文件</button>
              </template>
              <a v-else class="t-btn sm" :href="resource.external_url || '#'" target="_blank" rel="noopener noreferrer">打开原始页面</a>
              <button v-if="publishConfirmId !== resource.resource_id" class="t-btn sm" :class="resource.published ? 'soft' : 'primary'" type="button" @click="beginPublish(resource)">{{ resource.published ? '取消学生可见' : '发布给学生' }}</button>
              <button v-else class="t-btn sm primary" type="button" @click="confirmPublish(resource)">确认{{ resource.published ? '取消发布' : '发布' }}</button>
              <button v-if="publishConfirmId === resource.resource_id" class="t-btn sm" type="button" @click="publishConfirmId = null">返回</button>
              <button v-if="deleteConfirmId !== resource.resource_id" class="t-btn sm danger" type="button" @click="beginDelete(resource)">删除</button>
              <template v-else><button class="t-btn sm danger" type="button" :disabled="store.loading" @click="confirmDelete(resource)">确认删除</button><button class="t-btn sm" type="button" @click="deleteConfirmId = null">返回</button></template>
            </div>
          </article>
        </div>
      </section>

      <aside class="resource-v2__review" aria-labelledby="review-title">
        <p class="resource-v2__eyebrow">教师把关</p><h2 id="review-title">题目审核队列</h2>
        <p>候选题源自你的材料，但不会自动写进题库或发送给学生。</p>
        <div v-if="!candidates.length" class="resource-v2__review-empty">材料处理后出现的候选题会在这里等待审核；当前没有可审核项目。</div>
        <div v-else class="resource-v2__candidates">
          <article v-for="row in candidates" :key="row.candidate.candidate_id" class="resource-v2__candidate">
            <p>来自 {{ row.resource.name }}</p><h3>{{ row.candidate.stem }}</h3>
            <p>{{ row.candidate.q_type }} · {{ row.candidate.knowledge_points?.join('、') || '未标注知识点' }}</p>
            <span v-if="row.candidate.review_status === 'approved'" class="resource-v2__approved">已入库</span>
            <button v-else class="t-btn sm primary" type="button" :disabled="store.loading" @click="approveCandidate(row.resource.resource_id, row.candidate.candidate_id)">确认入库</button>
          </article>
        </div>
      </aside>
    </main>
    <p class="resource-v2__policy">外部试卷、优秀课件和 B 站视频仅在来源、署名、授权及导入目的清楚后保留引用；当前不会擅自下载、转载或伪造外部内容。</p>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import { api } from '@/api/client'
import { useResourcesStore } from '@/stores/teacher/resources'
import type { TeacherResource } from '@/types/teacher'

const store = useResourcesStore()
const fileInput = ref<HTMLInputElement | null>(null)
const query = ref('')
const notice = ref('')
const publishConfirmId = ref<string | null>(null)
const deleteConfirmId = ref<string | null>(null)
const showExternalForm = ref(false)
const externalDraft = ref({ title: '', url: '', provider: '', attribution: '', intended_use: '' })
const showToast = inject<(msg: string) => void>('showToast', () => {})
const visibleItems = computed(() => store.items.filter((resource) => resource.name.toLocaleLowerCase().includes(query.value.toLocaleLowerCase())))
const candidates = computed(() => store.items.flatMap((resource) => (resource.question_candidates || []).map((candidate) => ({ resource, candidate }))))
const pendingCount = computed(() => candidates.value.filter((row) => row.candidate.review_status === 'pending_review').length)

function formatSize(bytes: number) { if (!bytes) return '大小未知'; if (bytes < 1048576) return `${Math.ceil(bytes / 1024)} KB`; return `${(bytes / 1048576).toFixed(1)} MB` }
function fileLabel(resource: TeacherResource) { return resource.file_type || '文件' }
function statusText(status: TeacherResource['status']) { return status === 'ready' ? '可用' : status === 'failed' ? '处理失败' : '处理中' }
async function onPicked(event: Event) { const input = event.target as HTMLInputElement; const file = input.files?.[0]; input.value = ''; if (!file) return; if (file.size === 0) { showToast('文件内容为空，请选择非空文件'); return } try { await store.upload(file); notice.value = `已上传“${file.name}”。候选题仍需教师审核。`; showToast('上传成功') } catch (e: any) { showToast(e?.message || '上传失败') } }
async function saveExternalReference() { try { await store.createExternalReference({ ...externalDraft.value }); notice.value = '公开引用已保存。请确认署名、授权与教学用途后，再决定是否发布给学生。'; externalDraft.value = { title: '', url: '', provider: '', attribution: '', intended_use: '' }; showExternalForm.value = false } catch (e: any) { showToast(e?.message || '保存公开引用失败') } }
async function preprocess(id: string) { try { await store.preprocess(id); notice.value = '预处理完成，结果仍以原始材料为准。' } catch (e: any) { showToast(e?.message || '预处理失败') } }
async function understand(id: string) { try { await store.understand(id); notice.value = '摘要已更新；请结合原文件进行教学判断。' } catch (e: any) { showToast(e?.message || '生成摘要失败') } }
function beginPublish(resource: TeacherResource) { publishConfirmId.value = resource.resource_id; notice.value = resource.published ? '请再次确认取消学生可见。' : '请再次确认发布给学生。' }
function beginDelete(resource: TeacherResource) { deleteConfirmId.value = resource.resource_id; notice.value = `删除后“${resource.name}”及其未审核候选题不可恢复；已审核入库的题目不受影响。` }
async function confirmDelete(resource: TeacherResource) { try { await store.remove(resource.resource_id); deleteConfirmId.value = null; notice.value = `已删除“${resource.name}”。`; showToast('已删除') } catch (e: any) { showToast(e?.message || '删除失败') } }
async function confirmPublish(resource: TeacherResource) { try { await store.setPublished(resource.resource_id, !resource.published); publishConfirmId.value = null; notice.value = resource.published ? '资源已发布给学生。' : '资源已取消学生可见。' } catch (e: any) { showToast(e?.message || '发布操作失败') } }
async function approveCandidate(resourceId: string, candidateId: string) { try { await store.approveQuestionCandidate(resourceId, candidateId); notice.value = '候选题已确认入库，可供后续组卷使用。' } catch (e: any) { showToast(e?.message || '候选题审核失败') } }

async function download(resource: TeacherResource) { try { const path = String(resource.download_url || `/api/teacher/resources/${resource.resource_id}/download`).replace(/^\/api/, ''); const { blob } = await api.download(path); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = resource.name; link.click(); URL.revokeObjectURL(url) } catch { showToast('下载失败') } }
onMounted(() => { void store.fetch() })
</script>

<style scoped>
.resource-v2 { max-width: 1500px; margin: 0 auto; padding: 30px 32px 42px; color: #17243b; }
.resource-v2__head, .resource-v2__section-head, .resource-v2__item > header, .resource-v2__head-actions { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.resource-v2__head h1 { margin: 3px 0 8px; font-size: 32px; letter-spacing: -.04em; }.resource-v2__head > div > p:last-child { margin: 0; color: #53637b; max-width: 680px; }
.resource-v2__eyebrow { margin: 0; color: #69758b; font-size: 12px; letter-spacing: .08em; font-weight: 700; }.resource-v2__toolbar { margin: 24px 0; min-height: 66px; padding: 12px 16px; border: 1px solid #e1e7ef; background: #fff; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; gap: 20px; }.resource-v2__toolbar label { color: #526178; font-size: 13px; }.resource-v2__toolbar input { margin-left: 10px; width: min(340px, 47vw); padding: 9px 11px; border: 1px solid #d5dee9; border-radius: 7px; }.resource-v2__toolbar p { margin: 0; color: #53637b; }.resource-v2__toolbar strong { color: #b45309; font-size: 20px; }
.resource-v2__notice { margin: 0 0 16px; padding: 11px 14px; background: #edf7ff; color: #175e8f; border-radius: 8px; }.resource-v2__notice.error { background: #fff1f1; color: #b42318; }.resource-v2__workspace { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(320px, .72fr); gap: 22px; }.resource-v2__catalog, .resource-v2__review { background: #fff; border: 1px solid #e1e7ef; border-radius: 14px; min-width: 0; }.resource-v2__section-head { padding: 20px 22px 16px; border-bottom: 1px solid #edf0f4; }.resource-v2 h2 { margin: 5px 0 0; font-size: 20px; }.resource-v2__section-head > span { color: #637085; font-size: 13px; }.resource-v2__list { padding: 10px; }.resource-v2__item { padding: 17px 13px; border-bottom: 1px solid #edf0f4; }.resource-v2__item:last-child { border-bottom: 0; }.resource-v2__item header p, .resource-v2__candidate > p { margin: 0 0 4px; color: #718096; font-size: 12px; }.resource-v2__item h3, .resource-v2__candidate h3 { margin: 0; font-size: 16px; word-break: break-word; }.resource-v2__summary { margin: 12px 0 8px; color: #4c5d75; font-size: 14px; line-height: 1.55; }.resource-v2__warning { margin: 6px 0; color: #9a6700; font-size: 12px; }.resource-v2__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 13px; }.resource-v2__status { padding: 4px 8px; background: #eff6ff; color: #1d4ed8; border-radius: 999px; font-size: 12px; white-space: nowrap; }.resource-v2__status.is-failed { background: #fff1f2; color: #be123c; }
.resource-v2__external-form { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; margin:0 0 16px; padding:16px; border:1px solid #c8d8e8; border-radius:12px; background:#f8fbff; }.resource-v2__external-form strong,.resource-v2__external-form p{grid-column:1/-1;margin:0}.resource-v2__external-form p{color:#5e6d82;font-size:13px;line-height:1.5}.resource-v2__external-form input{padding:9px 10px;border:1px solid #d5dee9;border-radius:7px;font:inherit}.resource-v2__external-form button{width:max-content}.resource-v2__actions a{text-decoration:none}
.resource-v2__review { padding: 21px; align-self: start; }.resource-v2__review > p:not(.resource-v2__eyebrow) { color: #5c6b80; line-height: 1.55; }.resource-v2__review-empty, .resource-v2__empty { padding: 25px; color: #67758b; background: #f8fafc; border-radius: 9px; line-height: 1.55; }.resource-v2__empty { margin: 14px; text-align: center; }.resource-v2__empty h3 { color: #26354b; margin: 0 0 6px; }.resource-v2__empty p { margin: 0; }.resource-v2__candidates { display: grid; gap: 10px; margin-top: 16px; }.resource-v2__candidate { padding: 14px; border: 1px solid #e4e9f0; border-radius: 10px; background: #fff; }.resource-v2__candidate h3 { font-size: 14px; line-height: 1.5; }.resource-v2__candidate > p:last-of-type { margin: 9px 0; }.resource-v2__approved { display: inline-block; padding: 5px 8px; color: #166534; background: #ecfdf3; border-radius: 6px; font-size: 12px; }.resource-v2__policy { margin: 18px 0 0; color: #69758b; font-size: 13px; line-height: 1.55; }
@media (max-width: 900px) { .resource-v2 { padding: 22px 16px; }.resource-v2__workspace { grid-template-columns: 1fr; }.resource-v2__head, .resource-v2__toolbar { align-items: stretch; flex-direction: column; }.resource-v2__toolbar input { width: calc(100% - 78px); } }
</style>

