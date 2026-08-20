<template>
  <section class="tdr-ws" :aria-label="'资源'">
    <header class="tdr-ws-head">
      <h1>资源</h1>
      <p class="tdr-ws-desc">上传 → 解析/预处理 → 可检索；文档理解显示来源定位。</p>
    </header>

    <form class="tdr-card tfrm" @submit.prevent="uploadFile">
      <div class="tfrm-row">
        <div class="tfrm-field">
          <label for="res-pick">选择文件</label>
          <input id="res-pick" type="file" @change="onPick" :disabled="store.loading" />
        </div>
        <button class="tdr-btn primary" type="submit" :disabled="!canUpload">{{ store.loading ? '上传中…' : '上传并预处理' }}</button>
      </div>
      <div v-if="store.error" class="tdr-banner err">{{ store.error }}</div>
    </form>

    <div class="tdr-ws-block">
      <h3 class="tdr-ws-h">材料</h3>
      <div v-if="store.loading" class="tdr-skeleton" style="height: 80px"></div>
      <div v-for="r in store.items" :key="r.resource_id" class="tlist-item">
        <div class="tlist-main">
          <span class="tlist-title">{{ r.name }}</span>
          <span class="tlist-meta">{{ r.file_type }} · {{ sizeText(r.size_bytes) }}</span>
          <div v-if="r.pages && r.pages.length" class="tlist-meta">来源定位：{{ r.pages.length }} 页/切片</div>
        </div>
        <div class="tlist-meta res-actions">
          <span class="tdr-badge" :class="r.status">{{ r.status }}</span>
          <div v-if="r.error" class="tdr-banner err">{{ r.error }}</div>
          <div class="tfrm-actions">
            <button v-if="r.status === 'ready'" class="tdr-btn slim" type="button" @click="understand(r)">理解文档</button>
            <button v-if="r.status === 'failed'" class="tdr-btn slim" type="button" @click="preprocess(r)">重试预处理</button>
          </div>
        </div>
      </div>
      <div v-if="!store.loading && !store.items.length" class="tdr-card"><p class="tcard-empty muted">暂无材料，请上传文件。</p></div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useResourcesStore } from '@/stores/teacher/resources'
import { useToastStore } from '@/stores/toast'
import type { TeacherResource } from '@/types/teacher'

const store = useResourcesStore()
const toast = useToastStore()
const selected = ref<{ name: string; type: string; size: number } | null>(null)

const canUpload = computed(() => !!selected.value && !store.loading)

function onPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  selected.value = file ? { name: file.name, type: file.type || 'unknown', size: file.size } : null
}

function sizeText(bytes: number) {
  if (!bytes) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

async function uploadFile() {
  if (!selected.value) return
  try {
    const ticket = await store.upload({ name: selected.value.name, file_type: selected.value.type, size_bytes: selected.value.size })
    if (ticket?.resource_id) await store.preprocess(ticket.resource_id)
    selected.value = null
  } catch { toast.error('上传失败') }
}

async function preprocess(r: TeacherResource) { try { await store.preprocess(r.resource_id); toast.info('已重新提交预处理') } catch { toast.error('失败') } }
async function understand(r: TeacherResource) { try { await store.understand(r.resource_id); toast.info('已提交文档理解') } catch { toast.error('失败') } }

onMounted(() => { store.fetch() })
</script>