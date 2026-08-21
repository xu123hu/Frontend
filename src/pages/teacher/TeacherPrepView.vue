<template>
  <section class="tdr-ws" :aria-label="'备课'">
    <header class="tdr-ws-head">
      <h1>备课</h1>
      <p class="tdr-ws-desc">从已有材料改编教案、课件与讲解，默认改编而非从空白开始。</p>
    </header>

    <form class="tdr-card tfrm" @submit.prevent="adapt">
      <div class="tfrm-row">
        <div class="tfrm-field">
          <label for="prep-class">班级</label>
          <select id="prep-class" v-model="classId">
            <option :value="undefined" disabled>选择班级</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="tfrm-field">
          <label for="prep-topic">课题</label>
          <input id="prep-topic" v-model="topic" placeholder="如：函数的单调性" />
        </div>
        <div class="tfrm-field">
          <label for="prep-duration">时长（分钟）</label>
          <input id="prep-duration" v-model.number="duration" type="number" min="15" max="120" />
        </div>
      </div>
      <div class="tfrm-field">
        <label for="prep-req">改编要求</label>
        <textarea id="prep-req" v-model="requirements" placeholder="如：压缩讲授，增加两个形成性检查" />
      </div>
      <div class="tfrm-actions">
        <button class="tdr-btn primary" type="submit" :disabled="store.loading || !topic.trim()">
          {{ store.loading ? '生成中…' : '改编教案' }}
        </button>
      </div>
    </form>

    <ArtifactPanel v-if="store.artifact" :artifact="store.artifact" @action="onArtifactAction">
      <template #default>
        <div v-if="editing" class="tedit">
          <textarea v-model="editedContent" aria-label="教案内容（JSON）"></textarea>
          <div class="tfrm-actions">
            <button class="tdr-btn primary" type="button" @click="saveDraft">保存草稿</button>
            <button class="tdr-btn" type="button" @click="editing = false">取消</button>
          </div>
        </div>
        <template v-else>
          <div v-for="(s, i) in lessonSections" :key="i" class="tq">
            <div class="tq-head"><strong>{{ i + 1 }}. {{ s.title }}</strong><span class="muted" v-if="s.duration_minutes">{{ s.duration_minutes }} 分钟</span></div>
            <ul style="margin:0;padding-left:18px">
              <li v-for="act in s.activities" :key="act" style="font-size:13px">{{ act }}</li>
            </ul>
          </div>
        </template>
      </template>
    </ArtifactPanel>

    <AsyncTaskProgress v-if="slidesTask.task.value" :task="slidesTask.task.value" @cancel="cancelSlides" />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { classApi } from '@/api'
import { artifactsApi } from '@/api/teacher/artifacts'
import { lessonsApi } from '@/api/teacher/lessons'
import { useTeacherContextStore } from '@/stores/teacher/context'
import { useLessonArtifactsStore } from '@/stores/teacher/lessonArtifacts'
import { useArtifactMutation } from '@/composables/useArtifactMutation'
import { useAsyncTeacherTask } from '@/composables/useAsyncTeacherTask'
import { useConfirm } from '@/composables/useConfirm'
import { useToastStore } from '@/stores/toast'
import ArtifactPanel from '@/components/teacher/ArtifactPanel.vue'
import AsyncTaskProgress from '@/components/teacher/AsyncTaskProgress.vue'
import type { ArtifactAction } from '@/utils/artifactState'
import type { LessonPlanSection } from '@/types/teacher'

const ctx = useTeacherContextStore()
const store = useLessonArtifactsStore()
const toast = useToastStore()
const { run } = useArtifactMutation()
const { confirm } = useConfirm()
const slidesTask = useAsyncTeacherTask()

const classes = ref<{ id: string; name: string }[]>([])
const classId = ref<string | undefined>(undefined)
const topic = ref('')
const requirements = ref('')
const duration = ref(45)
const editing = ref(false)
const editedContent = ref('')

watch(classId, (v) => {
  const it = classes.value.find((c) => c.id === v)
  ctx.setClass(v ?? null, it?.name ?? null)
})

onMounted(async () => {
  try { classes.value = (await classApi.mine()).items || [] } catch { /* 无班级 */ }
  if (classes.value.length) classId.value = classes.value[0].id
})

const lessonSections = computed<LessonPlanSection[]>(() => (store.artifact?.content?.sections as LessonPlanSection[]) || [])

async function adapt() {
  if (!classId.value) { toast.info('请先选择班级'); return }
  editing.value = false
  await store.adapt({ class_id: classId.value, topic: topic.value, duration_minutes: duration.value, requirements: requirements.value })
  if (store.artifact) editedContent.value = JSON.stringify(store.artifact.content, null, 2)
}

function startEdit() {
  editing.value = true
  if (store.artifact) editedContent.value = JSON.stringify(store.artifact.content, null, 2)
}

async function saveDraft() {
  if (!store.artifact) return
  try {
    const content = JSON.parse(editedContent.value)
    const res = await store.save({ version: store.artifact.version, content })
    if (res) { toast.success('草稿已保存'); editing.value = false }
  } catch { toast.error('内容不是合法的 JSON'); }
}

async function onArtifactAction(a: ArtifactAction) {
  const artifact = store.artifact
  if (!artifact) return
  if (a === 'edit') { startEdit(); return }
  if (a === 'regenerate') { await adapt(); return }
  if (a === 'confirm') {
    const ok = await confirm({ title: '确认教案', message: '确认后将视为正式教案，未确认前不会进入下游业务。', confirmText: '确认教案' })
    if (!ok) return
    // artifactsApi.confirm 已解包返回 TeacherArtifact
    const res = await run('confirm:' + artifact.artifact_id, (key) => artifactsApi.confirm(artifact.artifact_id, key))
    if (res) { store.artifact = res; toast.success('教案已确认'); }
    return
  }
  if (a === 'derive') {
    // 课件为同步 slide_deck Artifact（审计 C-04 对齐：不再轮询任务）
    const res = await run('slides:' + artifact.artifact_id, () => lessonsApi.createSlides(artifact.artifact_id, { version: artifact.version }))
    if (res?.data) {
      toast.success(`课件大纲已生成（${(res.data.content?.slides as unknown[])?.length ?? 0} 页），可到资源中查看`)
    }
    return
  }
  if (a === 'archive') {
    const ok = await confirm({ title: '归档教案', message: '归档不物理删除，保留审计记录。确认归档？', danger: true, confirmText: '归档' })
    if (!ok) return
    const res = await run('archive:' + artifact.artifact_id, (key) => artifactsApi.archive(artifact.artifact_id, key))
    if (res) { store.clear(); toast.success('教案已归档'); }
  }
}

async function cancelSlides() { if (slidesTask.task.value?.task_id) await slidesTask.cancel(slidesTask.task.value.task_id) }
</script>