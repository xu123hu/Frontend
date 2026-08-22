<template>
  <div id="page-resources">
    <div class="t-page-head">
      <div class="t-page-title"><h1>资源工作台</h1><p>文件真实保存；外部 AI 不可用时，文本提取、切片与摘要走本地降级。</p></div>
      <button class="t-btn primary lg" type="button" :disabled="store.loading" @click="fileInput?.click()">{{ store.loading ? '处理中…' : '+ 上传资料' }}</button>
      <input ref="fileInput" type="file" hidden accept=".txt,.md,.docx,.pdf,.png,.jpg,.jpeg" @change="onPicked">
    </div>
    <div v-if="store.error" class="t-card" style="color:var(--t-red)">{{ store.error }}</div>
    <div v-if="!store.loading && !store.items.length" class="t-card t-muted" style="text-align:center;padding:40px">暂无资源，点击“上传资料”开始。</div>
    <div v-else class="t-resource-grid">
      <div v-for="res in store.items" :key="res.resource_id" class="t-resource">
        <div class="t-resource-cover"><span>{{ icon(res.file_type) }}</span></div>
        <div class="t-resource-body">
          <b>{{ res.name }}</b>
          <p>{{ res.file_type }} · {{ formatSize(res.size_bytes) }} · {{ statusText(res.status) }}</p>
          <p v-if="res.summary" class="t-small">{{ res.summary }}</p>
          <p v-if="res.warnings?.length" class="t-tiny t-muted">{{ res.warnings.join('；') }}</p>
          <div class="t-row" style="gap:6px;flex-wrap:wrap">
            <button class="t-btn sm" @click="preprocess(res.resource_id)">本地预处理</button>
            <button class="t-btn sm" @click="understand(res.resource_id)">生成摘要</button>
            <button class="t-btn sm" @click="download(res)">下载</button>
            <button class="t-btn sm" :class="res.published ? 'soft' : 'primary'" @click="togglePublish(res)">{{ res.published ? '取消发布' : '发布' }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, onMounted, ref } from 'vue'
import { authHeaders } from '@/api/client'
import { useResourcesStore } from '@/stores/teacher/resources'
import type { TeacherResource } from '@/types/teacher'

const store = useResourcesStore()
const fileInput = ref<HTMLInputElement | null>(null)
const showToast = inject<(msg: string) => void>('showToast', () => {})
function formatSize(bytes: number) { if (bytes < 1024) return `${bytes || 0} B`; if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / 1048576).toFixed(1)} MB` }
function icon(type: string) { if (type.includes('pdf') || type.includes('word')) return '📄'; if (type.includes('image')) return '🖼'; return '📁' }
function statusText(status: string) { return status === 'ready' ? '可用' : status === 'failed' ? '失败' : '处理中' }
async function onPicked(event: Event) { const input = event.target as HTMLInputElement; const file = input.files?.[0]; input.value = ''; if (!file) return; if (file.size === 0) { showToast('文件内容为空，请选择非空文件'); return } try { await store.upload(file); showToast('上传成功，资源已可用') } catch (e: any) { showToast(e?.message || '上传失败') } }
async function preprocess(id: string) { try { await store.preprocess(id); showToast('本地预处理完成') } catch (e: any) { showToast(e?.message || '预处理失败') } }
async function understand(id: string) { try { await store.understand(id); showToast('本地摘要已生成') } catch (e: any) { showToast(e?.message || '理解失败') } }
async function togglePublish(resource: TeacherResource) { try { const next = !resource.published; await store.setPublished(resource.resource_id, next); showToast(next ? '已发布' : '已取消发布') } catch (e: any) { showToast(e?.message || '操作失败') } }
async function download(resource: TeacherResource) { const response = await fetch(resource.download_url || `/api/teacher/resources/${resource.resource_id}/download`, { headers: authHeaders() as HeadersInit }); if (!response.ok) return showToast('下载失败'); const url = URL.createObjectURL(await response.blob()); const link = document.createElement('a'); link.href = url; link.download = resource.name; link.click(); URL.revokeObjectURL(url) }
onMounted(() => store.fetch())
</script>
