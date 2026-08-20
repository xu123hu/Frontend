<template>
  <section class="tdr-ws" :aria-label="'班级'">
    <header class="tdr-ws-head">
      <h1>班级</h1>
      <p class="tdr-ws-desc">默认班级聚合，不默认展示学生敏感明细；洞察含依据与推荐动作。</p>
    </header>

    <div class="tfrm-row">
      <div class="tfrm-field">
        <label for="cls-pick">选择班级</label>
        <select id="cls-pick" v-model="classId">
          <option :value="undefined">选择班级</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="tdr-skeleton" style="height: 120px"></div>
    <template v-else>
      <div v-if="error" class="tdr-banner err">{{ error }}</div>
      <div v-if="insights.length" class="tdr-ws-actions">
        <ActionableInsightCard
          v-for="ins in insights" :key="ins.insight_id" :insight="ins" @view="onView" @apply="onApply"
        />
      </div>
      <div v-else class="tdr-card"><p class="tcard-empty muted">该班级暂无新洞察。</p></div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { classApi } from '@/api'
import { classesApi } from '@/api/teacher/classes'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import ActionableInsightCard from '@/components/teacher/ActionableInsightCard.vue'
import type { ActionableInsight } from '@/types/teacher'

const classes = ref<{ id: string; name: string }[]>([])
const classId = ref<string | undefined>(undefined)
const insights = ref<ActionableInsight[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const { confirm } = useConfirm()
const toast = useToastStore()

let ctrl: AbortController | null = null

async function load(classScope: string) {
  ctrl?.abort()
  const ac = new AbortController()
  ctrl = ac
  loading.value = true
  error.value = null
  insights.value = [] // 切班级立即清空旧的 scope 缓存
  try {
    insights.value = (await classesApi.insights(classScope, true, ac.signal)).data
  } catch (e: any) {
    if (e?.code !== -2) error.value = e?.message || '加载失败'
  } finally { loading.value = false }
}

watch(classId, (v) => { if (v) load(v) })

onMounted(async () => {
  try { classes.value = (await classApi.mine()).items || [] } catch { /* none */ }
  if (classes.value.length) classId.value = classes.value[0].id
})

async function onView(_ins: ActionableInsight) {
  toast.info('学生明细需在确认权限后展开')
}
async function onApply(_ins: ActionableInsight) {
  const ok = await confirm({ title: '应用洞察', message: '将洞察写为教案草稿（不自动发布）。确认应用？', confirmText: '应用' })
  if (ok) toast.success('已应用为教案草稿')
}
</script>