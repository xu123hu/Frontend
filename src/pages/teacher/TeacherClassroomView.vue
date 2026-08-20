<template>
  <section class="tdr-ws" :aria-label="'课堂'">
    <header class="tdr-ws-head">
      <h1>课堂</h1>
      <p class="tdr-ws-desc">选择班级与教案，启动/停止课堂模式，课后查看聚合洞察。</p>
    </header>

    <form class="tdr-card tfrm" @submit.prevent="() => {}">
      <div class="tfrm-row">
        <div class="tfrm-field">
          <label for="cr-class">班级</label>
          <select id="cr-class" v-model="classId">
            <option :value="undefined">选择班级</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="tfrm-field">
          <label for="cr-lesson">教案</label>
          <select id="cr-lesson" v-model="lessonId">
            <option :value="undefined">选择教案（可选）</option>
          </select>
        </div>
      </div>
      <div class="tfrm-actions">
        <button v-if="!store.mode?.enabled" class="tdr-btn primary" type="button" @click="startMode">启动课堂模式</button>
        <button v-else class="tdr-btn danger" type="button" @click="stopMode">停止课堂模式</button>
      </div>
      <p v-if="store.mode?.enabled" class="muted" style="margin:0;font-size:12.5px">
        状态 TTL {{ store.mode.ttl_seconds }}s · 最近更新 {{ store.mode.updated_at }}
      </p>
      <div v-if="store.mode?.degraded" class="tdr-banner warn">课堂数据源不可用，实时参与度未接入（不伪造）。</div>
    </form>

    <div v-if="insights" class="tdr-ws-block">
      <h3 class="tdr-ws-h">课后聚合洞察</h3>
      <p v-if="insights.degraded" class="tdr-banner warn">视频/课堂数据源未接入，返回空聚合数据。</p>
      <div v-if="insights.actions?.length" class="tdr-ws-actions">
        <ActionableInsightCard v-for="a in insights.actions" :key="a.insight_id" :insight="a" @view="() => {}" @apply="() => {}" />
      </div>
      <div v-else class="tdr-card"><p class="tcard-empty muted">暂无聚合洞察。</p></div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { classApi } from '@/api'
import { useClassroomStore } from '@/stores/teacher/classroom'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import ActionableInsightCard from '@/components/teacher/ActionableInsightCard.vue'
import type { VideoInsight } from '@/types/teacher'

const store = useClassroomStore()
const { confirm } = useConfirm()
const toast = useToastStore()

const classes = ref<{ id: string; name: string }[]>([])
const classId = ref<string | undefined>(undefined)
const lessonId = ref<string | undefined>(undefined)

const insights = computed<VideoInsight | null>(() => store.insights)

watch(classId, async (v) => {
  if (!v) { store.clear(); return }
  store.fetchState(v)
})

onMounted(async () => {
  try { classes.value = (await classApi.mine()).items || [] } catch { /* none */ }
  if (classes.value.length) classId.value = classes.value[0].id
})

async function startMode() {
  if (!classId.value) { toast.info('请先选择班级'); return }
  const ok = await confirm({ title: '启动课堂模式', message: '启动后将记录课堂控制状态（含 TTL）并写入留痕。确认启动？', confirmText: '启动' })
  if (!ok) return
  try {
    await store.setMode(classId.value, true, lessonId.value)
    toast.success('课堂模式已启动')
    store.fetchVideoInsights(classId.value, lessonId.value)
  } catch { toast.error('启动失败') }
}

async function stopMode() {
  if (!classId.value) return
  const ok = await confirm({ title: '停止课堂模式', message: '结束后将展示聚合洞察；确认停止？', danger: true, confirmText: '停止' })
  if (!ok) return
  try { await store.setMode(classId.value, false, lessonId.value); toast.info('课堂模式已停止') } catch { toast.error('操作失败') }
}
</script>