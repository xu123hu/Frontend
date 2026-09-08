<template>
  <div class="ped">
    <!-- 顶栏 -->
    <header class="ped-top">
      <button class="ped-top__back" data-testid="ailp-ed-back" @click="emit('back')">←</button>
      <h1>{{ plan?.topic || chain.brief?.topic || '备课编辑器' }}</h1>
      <span class="ailp-tag ailp-tag--primary">{{ chain.brief?.className || '高二(5)班' }}</span>
      <span class="ailp-tag ailp-tag--accent">{{ chain.brief?.courseType || plan?.lesson_type || '新授课' }}</span>
      <span class="ailp-tag ailp-tag--muted">{{ chain.brief?.textbook || '人教A版' }}</span>
      <div style="flex:1" />
      <span class="ped-top__save"><i />{{ savedText }}</span>
      <button class="ped-top__btn" title="导出（原型：教案导出属后端能力）" @click="toastInfo('教案导出属后端能力，原型不做假文件')">⬇</button>
      <button class="ped-top__btn" title="推送为课件" data-testid="ailp-ed-push" @click="pushToDeck">🎞 推送为课件</button>
    </header>

    <div class="ped-body">
      <!-- 左：锚点导航 -->
      <aside class="ped-dots">
        <a v-for="b in blocks" :key="b.id" :href="`#ailp-${b.id}`" :title="b.label" class="ped-dot" :class="{ 'is-on': activeBlock === b.id }" />
      </aside>

      <!-- 中：文档（可编辑） -->
      <main class="ped-doc" @scroll.passive="onScroll">
        <article class="ped-doc__card">
          <!-- 教学目标 -->
          <section id="ailp-objectives" class="ped-block">
            <div class="ped-block__head">
              <h2>教学目标</h2>
              <div class="ped-block__headbtns">
                <button class="ped-ai" @click="aiHint('教学目标')">✦ AI 优化</button>
                <button class="ped-edit" :data-testid="`ailp-ed-edit-objectives`" @click="toggleEdit('objectives')">{{ editMode.objectives ? '完成 ✓' : '✎ 编辑' }}</button>
              </div>
            </div>
            <template v-if="editMode.objectives">
              <div v-for="(o, i) in edit.objectives" :key="i" class="ped-editrow">
                <span class="ped-editrow__no">{{ i + 1 }}</span>
                <textarea v-model="edit.objectives[i]" rows="2" class="ped-ta" />
                <button class="ped-editrow__del" @click="edit.objectives.splice(i, 1)">删除</button>
              </div>
              <button class="ped-editrow__add" @click="edit.objectives.push('新目标：')">＋ 加一条目标</button>
            </template>
            <ol v-else class="ped-objectives">
              <li v-for="(o, i) in edit.objectives" :key="i" v-html="renderRich(o)" />
            </ol>
          </section>
          <div class="ped-block__div" />

          <!-- 重难点 -->
          <section id="ailp-keypoints" class="ped-block">
            <div class="ped-block__head">
              <h2>教学重点与难点</h2>
              <div class="ped-block__headbtns">
                <button class="ped-ai" @click="aiHint('重难点')">✦ AI 优化</button>
                <button class="ped-edit" @click="toggleEdit('keypoints')">{{ editMode.keypoints ? '完成 ✓' : '✎ 编辑' }}</button>
              </div>
            </div>
            <div class="ped-kpgrid">
              <div class="ped-kp is-major">
                <b>重</b>
                <div>
                  <strong>教学重点</strong>
                  <template v-if="editMode.keypoints">
                    <textarea v-for="(k, i) in edit.major" :key="i" v-model="edit.major[i]" rows="2" class="ped-ta" />
                    <button class="ped-editrow__add" @click="edit.major.push('重点：')">＋ 加重点</button>
                  </template>
                  <p v-for="(k, i) in edit.major" v-else :key="i" v-html="renderRich(k)" />
                </div>
              </div>
              <div class="ped-kp is-hard">
                <b>难</b>
                <div>
                  <strong>教学难点</strong>
                  <template v-if="editMode.keypoints">
                    <textarea v-for="(k, i) in edit.hard" :key="i" v-model="edit.hard[i]" rows="2" class="ped-ta" />
                    <button class="ped-editrow__add" @click="edit.hard.push('难点：')">＋ 加难点</button>
                  </template>
                  <p v-for="(k, i) in edit.hard" v-else :key="i" v-html="renderRich(k)" />
                </div>
              </div>
            </div>
          </section>
          <div class="ped-block__div" />

          <!-- 教学过程 -->
          <section id="ailp-process" class="ped-block">
            <div class="ped-block__head">
              <h2>教学过程 <small>总时长 {{ totalMinutes }} 分钟</small></h2>
              <div class="ped-block__headbtns">
                <button class="ped-ai" @click="aiHint('教学过程')">✦ AI 优化</button>
                <button class="ped-edit" @click="toggleEdit('process')">{{ editMode.process ? '完成 ✓' : '✎ 编辑' }}</button>
                <button class="ped-add" @click="toastInfo('添加环节：先在大纲确认页调整，编辑器内联增删属下一批')">＋ 添加环节</button>
              </div>
            </div>
            <div class="ped-steps">
              <div v-for="s in edit.steps" :key="s.id" class="ped-step">
                <div class="ped-step__head"><h3>{{ s.name }}</h3><span>{{ s.minutes }} 分钟</span></div>
                <div class="ped-step__body">
                  <template v-if="editMode.process">
                    <div class="ped-editrow"><small>环节目标</small><textarea v-model="s.goal" rows="2" class="ped-ta" /></div>
                    <div class="ped-editrow"><small>教师活动</small><textarea v-model="s.teacher" rows="4" class="ped-ta" /></div>
                    <div class="ped-step__kv" v-if="s.teacher"><small>预览（$..$ 公式已内联）</small><p v-html="renderRich(s.teacher)" /></div>
                  </template>
                  <template v-else>
                    <div v-if="s.goal" class="ped-step__kv"><small>环节目标</small><p v-html="renderRich(s.goal)" /></div>
                    <div v-if="s.teacher" class="ped-step__kv"><small>教师活动</small><p v-html="renderRich(s.teacher)" /></div>
                    <div v-if="s.student" class="ped-step__kv"><small>学生活动</small><p v-html="renderRich(s.student)" /></div>
                    <div v-if="retrievalOf(s.id).key_points?.length" class="ped-retrieval">
                      <div class="ped-retrieval__tag">📚 本环节检索要点 · 资料依据</div>
                      <p v-for="(kp, ki) in retrievalOf(s.id).key_points" :key="ki" class="ped-retrieval__kp" v-html="renderRich(kp)" />
                      <p v-if="retrievalOf(s.id).formula_hint" class="ped-retrieval__hint">公式提示：<span v-html="renderRich(retrievalOf(s.id).formula_hint as string)" /></p>
                      <p v-if="retrievalOf(s.id).source_note" class="ped-retrieval__src">{{ retrievalOf(s.id).source_note }}</p>
                    </div>
                  </template>
                  <!-- P2：环节预配资源（题目=题库匹配 / 公式·图形=演示） -->
                  <div v-if="resOf(s.id).questions.length || resOf(s.id).formulas.length || resOf(s.id).figure" class="poc-res">
                    <div class="poc-res__badge">✦ AI 预配 <small>题目=题库检索匹配 · 公式/图形=演示素材</small></div>
                    <div v-for="(q, qi) in resOf(s.id).questions" :key="`q${qi}`" class="poc-res__card">
                      <span class="poc-res__kind is-q">题</span>
                      <div class="poc-res__body">
                        <div class="poc-res__latex" v-html="renderRich(q.stem)" />
                        <small>{{ q.source }} · {{ q.difficulty }}</small>
                      </div>
                    </div>
                    <div v-for="(f, fi) in resOf(s.id).formulas" :key="`f${fi}`" class="poc-res__card">
                      <span class="poc-res__kind is-f">σ</span>
                      <div class="poc-res__body"><div class="poc-res__latex" v-html="renderRich(f)" /><small>核心公式</small></div>
                    </div>
                    <div v-if="resOf(s.id).figure" class="poc-res__card poc-res__card--fig">
                      <span class="poc-res__kind is-g">📐</span>
                      <div class="poc-res__body">
                        <div class="poc-res__fig" v-html="resOf(s.id).figure!.svg" />
                        <small>{{ resOf(s.id).figure!.name }}（演示图形）</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <div class="ped-block__div" />

          <!-- 板书设计 -->
          <section id="ailp-blackboard" class="ped-block">
            <div class="ped-block__head">
              <h2>板书设计</h2>
              <div class="ped-block__headbtns">
                <button class="ped-ai" @click="aiHint('板书设计')">✦ AI 优化</button>
                <button class="ped-edit" @click="toggleEdit('board')">{{ editMode.board ? '完成 ✓' : '✎ 编辑' }}</button>
              </div>
            </div>
            <div class="ped-board">
              <div class="ped-board__main">
                <small>主板书</small>
                <template v-if="editMode.board">
                  <textarea v-for="(l, i) in edit.boardMain" :key="i" v-model="edit.boardMain[i]" rows="1" class="ped-ta" />
                  <button class="ped-editrow__add" @click="edit.boardMain.push('')">＋ 加一行</button>
                </template>
                <p v-for="(l, i) in edit.boardMain" v-else :key="i" class="ailp-math" v-html="renderRich(l)" />
              </div>
              <div class="ped-board__side">
                <small>副板书</small>
                <template v-if="editMode.board">
                  <textarea v-for="(l, i) in edit.boardSide" :key="i" v-model="edit.boardSide[i]" rows="1" class="ped-ta" />
                  <button class="ped-editrow__add" @click="edit.boardSide.push('')">＋ 加一行</button>
                </template>
                <p v-for="(l, i) in edit.boardSide" v-else :key="i">{{ l }}</p>
              </div>
            </div>
          </section>
          <div class="ped-block__div" />

          <!-- 作业布置 -->
          <section id="ailp-homework" class="ped-block">
            <div class="ped-block__head">
              <h2>作业布置</h2>
              <div class="ped-block__headbtns">
                <button class="ped-ai" @click="aiHint('作业布置')">✦ AI 优化</button>
                <button class="ped-edit" @click="toggleEdit('homework')">{{ editMode.homework ? '完成 ✓' : '✎ 编辑' }}</button>
              </div>
            </div>
            <div class="ped-hwgrid">
              <div v-for="h in edit.hw" :key="h.tier" class="ped-hw" :class="`is-${h.tier}`">
                <b>{{ h.label }}</b>
                <template v-if="editMode.homework">
                  <textarea v-for="(it, i) in h.items" :key="i" v-model="h.items[i]" rows="2" class="ped-ta" />
                  <button class="ped-editrow__add" @click="h.items.push('')">＋ 加一条</button>
                </template>
                <ul v-else><li v-for="(it, i) in h.items" :key="i" v-html="renderRich(it)" /></ul>
                <small>{{ h.minutes }}</small>
              </div>
            </div>
          </section>
          <div style="height: 40px" />
        </article>
      </main>

      <!-- 右：备小研面板 -->
      <aside class="ped-rail">
        <div class="ped-rail__tabs">
          <button class="is-on">备小研</button>
          <button @click="openCompanion">资源推荐</button>
        </div>
        <div class="ped-rail__chat">
          <div class="ped-bot">
            <div class="ped-bot__ava">🤖</div>
            <div class="ped-bot__who"><b>备小研</b><small>AI 备课助手 · 在线</small></div>
          </div>
          <div ref="chatRef" class="ped-msgs">
            <div v-for="(m, i) in msgs" :key="i" class="ped-msg" :class="m.role">
              <div class="ped-msg__bubble">{{ m.text }}</div>
            </div>
            <div v-if="pending" class="ped-msg ai"><div class="ped-msg__bubble">思考中…</div></div>
          </div>
          <div class="ped-quick">
            <button @click="quickChat('调整难度')">🎚 调整难度</button>
            <button @click="quickChat('补充例题')">📖 补充例题</button>
            <button @click="quickChat('增加互动')">👥 增加互动</button>
            <button data-testid="ailp-ed-gen-deck" @click="pushToDeck">🎞 生成课件</button>
          </div>
          <div class="ped-input">
            <input v-model="draft" placeholder="输入你的需求..." data-testid="ailp-ed-chat-input" @keydown.enter.prevent="send">
            <button class="ped-input__send" @click="send">➤</button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * PrepEditor —— 备课编辑器（P，用户定稿 HTML 移植 + P2 可编辑）
 * 文档式五区块 + 左锚点 + 右备小研。P2：全区块可编辑（编辑/完成切换，本机保存演示）
 * + 每个授课环节挂 AI 预配资源（题目=题库匹配 / 公式·图形=演示）。
 * 诚实位：AI 优化为后端能力提示；编辑保存已接后端 PATCH（不再本机演示）；push-to-deck 待 confirm+模板解析见 #2b
 */
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { renderRich } from '@/components/mathx/latex'
import { v3Api } from '@/api/teacherV3'
import type { V3LessonPlan } from '@/types/teacherV3'
import { usePrepChain } from './prepChain'
import { updateTv3Context } from '@/stores/teacherContext'
import { useToastStore } from '@/stores/toast'
import { matchPhaseResources, type PhaseResource } from './ailpMock'

const emit = defineEmits<{ (e: 'back'): void }>()
const chain = usePrepChain()
const toast = useToastStore()
const router = useRouter()

const plan = ref<V3LessonPlan | null>(null)
const activeBlock = ref('objectives')
const draft = ref('')
const pending = ref(false)
const savedText = ref('已自动保存 · 演示')
const msgs = ref<{ role: 'user' | 'ai'; text: string }[]>([
  { role: 'ai', text: '李老师，教案初稿已就绪。每个区块都可以点「✎ 编辑」直接改；也可以让我调整，或点「资源推荐」按当前环节找素材。' },
])
const chatRef = ref<HTMLElement | null>(null)

const blocks = [
  { id: 'objectives', label: '教学目标' },
  { id: 'keypoints', label: '教学重点与难点' },
  { id: 'process', label: '教学过程' },
  { id: 'blackboard', label: '板书设计' },
  { id: 'homework', label: '作业布置' },
]

/* ---------- 数据源（plan 优先，outline 兜底） ---------- */
const objectives = computed<string[]>(() => {
  if (plan.value?.objectives?.length) return plan.value.objectives
  if (chain.outline?.objectives?.length) return chain.outline.objectives
  return [`${chain.brief?.topic || '本课'}：目标待补`]
})
const keypoints = computed<{ major: string[]; hard: string[] }>(() => {
  if (chain.outline?.keypoints) return chain.outline.keypoints
  return { major: plan.value?.key_points || ['待补'], hard: ['待补'] }
})
const sections = computed<{ id: string; name: string; minutes: number; goal: string; teacher_activity: string; student_activity: string }[]>(() => {
  if (plan.value?.sections?.length) {
    return plan.value.sections.map((s: any) => ({ id: s.id, name: s.name, minutes: s.minutes || 0, goal: s.goal || s.design_intent || '', teacher_activity: s.teacher_activity || '', student_activity: s.student_activity || '' }))
  }
  return (chain.outline?.sections || []).map((s) => ({ id: s.id, name: s.name, minutes: s.minutes, goal: s.goal, teacher_activity: '', student_activity: '' }))
})

/** 检索要点透出（独立审查 #4）：本环节的资料检索要点/公式提示/溯源 */
function retrievalOf(id: string) {
  const found = plan.value?.sections?.find((s: any) => s.id === id)
  return (found?.retrieval || {}) as { key_points?: string[]; formula_hint?: string; source_note?: string }
}
const totalMinutes = computed(() => sections.value.reduce((a, s) => a + s.minutes, 0) || chain.outline?.total_minutes || 45)
const blackboardSrc = computed(() => chain.outline?.blackboard || { main: ['板书设计待生成'], side: ['例题演板'] })
const homeworkSrc = computed(() => chain.outline?.homework || [{ tier: 'basic', label: '基础题（必做）', items: ['待生成'], minutes: '预计 10 分钟' } as never])

/* ---------- P2 可编辑模型：渲染全部走 edit，编辑/完成只切显示 ---------- */
const editMode = reactive<Record<string, boolean>>({})
const edit = reactive({
  objectives: [] as string[],
  major: [] as string[],
  hard: [] as string[],
  steps: [] as { id: string; name: string; minutes: number; goal: string; teacher: string; student: string }[],
  boardMain: [] as string[],
  boardSide: [] as string[],
  hw: [] as { tier: string; label: string; items: string[]; minutes: string }[],
})
let initKey = ''
function initEdit() {
  const key = `${plan.value?.id || ''}|${chain.outline?.topic || ''}|${objectives.value.length}`
  if (key === initKey) return
  initKey = key
  edit.objectives = [...objectives.value]
  edit.major = [...keypoints.value.major]
  edit.hard = [...keypoints.value.hard]
  edit.steps = sections.value.map((s) => ({ id: s.id, name: s.name, minutes: s.minutes, goal: s.goal, teacher: s.teacher_activity, student: s.student_activity }))
  edit.boardMain = [...blackboardSrc.value.main]
  edit.boardSide = [...blackboardSrc.value.side]
  edit.hw = homeworkSrc.value.map((h) => ({ ...h, items: [...h.items] }))
}
watch([plan, () => chain.outline], () => initEdit(), { immediate: true, deep: false })

function toggleEdit(block: string) {
  editMode[block] = !editMode[block]
  if (!editMode[block]) {
    void persistPlan()
  }
}

/** 真实保存（独立审查 #2a）：把编辑中的环节持久化到后端；失败如实报错，不再“本机演示”】
 * 存储形：boards[] = 环节{id,name,minutes,goal,content{board,teacher_activity,student_activity}}；
 * 后端按 id 合并 old_content，保留 key_points_backend/source_note/formula_hint/boards_metadata。
 */
async function persistPlan() {
  const pid = plan.value?.id || chain.planId
  if (!pid) { toast.error('尚未生成教案实体，无法保存'); return }
  const sections = edit.steps.map((s) => ({
    id: s.id, name: s.name, minutes: s.minutes, goal: s.goal,
    content: { board: s.name, teacher_activity: [s.teacher || ''], student_activity: [s.student || ''] },
  }))
  try {
    await v3Api.plans.patch(pid, { sections } as any)
    savedText.value = `已保存到服务器：${new Date().toLocaleTimeString()}`
    toast.success('教案已保存到服务器')
  } catch (err) {
    toast.error('保存失败：' + (err instanceof Error ? err.message : '未知错误'))
  }
}
function onScroll(ev: Event) {
  const el = ev.target as HTMLElement
  for (const b of blocks) {
    const node = document.getElementById(`ailp-${b.id}`)
    if (node && node.offsetTop - el.scrollTop <= 120) activeBlock.value = b.id
  }
}
function aiHint(block: string) {
  toast.info(`「${block}」的 AI 优化属后端能力（原型未接入）。可以在「✎ 编辑」里直接改，或让备小研记录需求。`)
}
function openCompanion() {
  window.dispatchEvent(new CustomEvent('tv3-open-companion', { detail: { tool: 'resource' } }))
}
function toastInfo(msg: string) { toast.info(msg) }

async function pushToDeck() {
  const pid = plan.value?.id || chain.planId
  if (!pid) { toast.error('尚未生成教案实体，无法推送课件'); return }
  try {
    // 独立审查 #2b：推送需先确认（后端 confirmed 门禁）；模板 slug 已由后端解析
    const pAny = plan.value as any
    if (!pAny?.confirmed) {
      await v3Api.plans.confirm(pid)
      if (pAny) pAny.confirmed = true
    }
    const r = await v3Api.plans.pushToDeck(pid, { template_id: 'tpl-academic-blue' })
    toast.success('已推送为课件，正在打开课件工坊')
    router.push({ path: '/teacher-v3/slides', query: { deck: r.data.deck_id } })
  } catch (e:any) {
    toast.error('推送失败：' + (e?.message || '服务端拒绝（教案需先确认，模板需有效）'))
  }
}

async function send() {
  const t = draft.value.trim()
  if (!t || pending.value) return
  msgs.value.push({ role: 'user', text: t })
  draft.value = ''
  pending.value = true
  let buf = ''
  try {
    await new Promise<void>((resolve) => {
      v3Api.butler.chat({
        message: t,
        context: { route: '/teacher-v3/prep', route_title: '备课中心', plan_id: plan.value?.id, topic: plan.value?.topic || chain.brief?.topic, class_id: chain.brief?.classId },
      } as any, (event: string, data: any) => {
        if (event === 'token') { buf += data.text || '' }
        if (event === 'done') resolve()
      }, undefined).finished.catch(() => resolve())
    })
    msgs.value.push({ role: 'ai', text: buf || '（备小研没有返回内容）' })
  } catch {
    msgs.value.push({ role: 'ai', text: '备小研暂不可用（mock 未启动？）——可以直接在「✎ 编辑」里改文档。' })
  } finally {
    pending.value = false
    void nextTick(() => { if (chatRef.value) chatRef.value.scrollTop = chatRef.value.scrollHeight })
  }
}
function quickChat(text: string) {
  draft.value = text
  void send()
}

/* ---------- P2 环节资源预配 ---------- */
const bank = ref<{ stem_latex: string; source?: string; difficulty: string; kp_name: string }[]>([])
const lib = ref<{ name: string; thumb: string }[]>([])
const resMap = computed<Record<string, PhaseResource>>(() => {
  const m: Record<string, PhaseResource> = {}
  const topic = plan.value?.topic || chain.brief?.topic || ''
  for (const s of edit.steps) m[s.id] = matchPhaseResources(bank.value, lib.value, topic, s.name)
  return m
})
const resOf = (id: string) => resMap.value[id] || { questions: [], formulas: [], figure: undefined }

onMounted(async () => {
  const pid = chain.planId
  if (pid) {
    try {
      const r = await v3Api.plans.get(pid)
      plan.value = r.data
    } catch { plan.value = null }
  }
  initEdit()
  try { const r = await v3Api.catalog.quizQuestions(); bank.value = r.data.items } catch { bank.value = [] }
  try { const r = await v3Api.draw.library(); lib.value = r.data.items } catch { lib.value = [] }
  updateTv3Context({
    route: '/teacher-v3/prep',
    plan_id: plan.value?.id || chain.planId,
    topic: plan.value?.topic || chain.brief?.topic,
    class_name: chain.brief?.className,
    selection: { type: 'text', summary: '环节「' + (edit.steps[0]?.name || '') + '」' },
  })
})
</script>

<style scoped>
.ped { height: calc(100vh - 56px); display: flex; flex-direction: column; overflow: hidden; }
.ped-top { display: flex; align-items: center; gap: 10px; padding: 10px 18px; border-bottom: 1px solid var(--ailp-gray-200); background: #fff; flex-shrink: 0; }
.ped-top__back { width: 30px; height: 30px; border-radius: 8px; border: none; background: none; cursor: pointer; font-size: 14px; color: var(--ailp-gray-600); }
.ped-top h1 { font-size: 14.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ped-top__save { font-size: 10.5px; color: var(--ailp-gray-500); display: inline-flex; align-items: center; gap: 5px; }
.ped-top__save i { width: 6px; height: 6px; border-radius: 50%; background: var(--ailp-success-500); }
.ped-top__btn { border: none; background: none; cursor: pointer; font-size: 12.5px; color: var(--ailp-gray-600); padding: 5px 8px; border-radius: 8px; }
.ped-top__btn:hover { background: var(--ailp-gray-100); }
.ped-body { flex: 1; display: flex; min-height: 0; }
.ped-dots { width: 40px; border-right: 1px solid var(--ailp-gray-200); background: rgba(255, 255, 255, 0.6); display: flex; flex-direction: column; align-items: center; padding-top: 90px; gap: 14px; flex-shrink: 0; }
.ped-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ailp-gray-300); transition: all 0.2s ease; }
.ped-dot.is-on { background: var(--ailp-primary-500); box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.18); }
.ped-doc { flex: 1; overflow-y: auto; padding: 24px 34px; }
.ped-doc__card { max-width: 760px; margin: 0 auto; background: #fff; border: 1px solid var(--ailp-gray-200); border-radius: 14px; box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04); padding: 30px 34px; }
.ped-block__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.ped-block__head h2 { font-size: 16px; font-weight: 700; display: flex; align-items: baseline; gap: 8px; }
.ped-block__head h2 small { font-size: 11px; color: var(--ailp-gray-500); font-weight: 400; }
.ped-block__headbtns { display: flex; gap: 8px; }
.ped-ai { border: 1px solid var(--ailp-primary-100); background: var(--ailp-primary-50); color: var(--ailp-primary-600); font-size: 11px; font-weight: 600; padding: 5px 11px; border-radius: 9px; cursor: pointer; }
.ped-ai:hover { background: var(--ailp-primary-100); }
.ped-edit { border: 1px solid var(--ailp-gray-200); background: #fff; color: var(--ailp-gray-700); font-size: 11px; font-weight: 600; padding: 5px 11px; border-radius: 9px; cursor: pointer; }
.ped-edit:hover { border-color: var(--ailp-primary-300); color: var(--ailp-primary-600); }
.ped-add { border: 1px solid var(--ailp-gray-200); background: #fff; color: var(--ailp-gray-700); font-size: 11px; font-weight: 500; padding: 5px 11px; border-radius: 9px; cursor: pointer; }
.ped-block__div { height: 1px; background: var(--ailp-gray-200); margin: 22px 0; }
/* 编辑态 */
.ped-ta { width: 100%; border: 1px solid var(--ailp-primary-200); border-radius: 9px; padding: 8px 10px; font-size: 12.5px; font-family: inherit; line-height: 1.65; resize: vertical; outline: none; background: #fcfdff; }
.ped-ta:focus { border-color: var(--ailp-primary-500); background: #fff; }
.ped-editrow { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px; }
.ped-editrow__no { flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; font-size: 10px; font-weight: 700; color: var(--ailp-primary-700); background: var(--ailp-primary-100); margin-top: 4px; }
.ped-editrow small { flex-shrink: 0; width: 56px; font-size: 10.5px; font-weight: 700; color: var(--ailp-gray-500); margin-top: 9px; }
.ped-editrow__del { border: none; background: none; color: var(--ailp-error-500); font-size: 11px; cursor: pointer; margin-top: 8px; flex-shrink: 0; }
.ped-editrow__add { border: 1px dashed var(--ailp-gray-300); background: none; color: var(--ailp-gray-500); font-size: 11px; padding: 5px 12px; border-radius: 8px; cursor: pointer; margin-top: 4px; }
.ped-editrow__add:hover { color: var(--ailp-primary-600); border-color: var(--ailp-primary-300); }
.ped-objectives { padding-left: 4px; display: flex; flex-direction: column; gap: 10px; }
.ped-objectives li { font-size: 13px; color: var(--ailp-gray-700); line-height: 1.75; }
.ped-kpgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ped-kp { display: flex; gap: 10px; border: 1px solid var(--ailp-gray-200); border-radius: 11px; padding: 13px 14px; background: rgba(248, 250, 252, 0.6); }
.ped-kp b { width: 22px; height: 22px; border-radius: 6px; display: grid; place-items: center; font-size: 11px; color: #fff; flex-shrink: 0; }
.ped-kp.is-major b { background: var(--ailp-primary-600); }
.ped-kp.is-hard b { background: var(--ailp-accent-500); }
.ped-kp strong { font-size: 12px; }
.ped-kp p { font-size: 11.5px; color: var(--ailp-gray-600); line-height: 1.65; margin-top: 3px; }
.ped-kp .ped-ta { margin-bottom: 6px; }
.ped-steps { display: flex; flex-direction: column; gap: 18px; padding-left: 4px; }
.ped-step { border-left: 2px solid rgba(79, 70, 229, 0.3); padding-left: 14px; }
.ped-step__head { display: flex; align-items: center; gap: 9px; margin-bottom: 9px; }
.ped-step__head h3 { font-size: 14px; font-weight: 700; }
.ped-step__head span { font-size: 10.5px; padding: 2px 9px; border-radius: 999px; background: var(--ailp-gray-100); color: var(--ailp-gray-500); }
.ped-step__body { display: flex; flex-direction: column; gap: 9px; }
.ped-step__kv { border: 1px solid var(--ailp-gray-200); background: rgba(248, 250, 252, 0.7); border-radius: 10px; padding: 10px 13px; }
.ped-step__kv small { font-size: 10px; font-weight: 700; color: var(--ailp-primary-600); display: block; margin-bottom: 4px; }
.ped-step__kv p { font-size: 12.5px; color: var(--ailp-gray-700); line-height: 1.75; }
/* P2 资源卡 */
.poc-res { margin: 4px 0 0; display: flex; flex-direction: column; gap: 6px; }
.poc-res__badge { font-size: 10.5px; font-weight: 700; color: var(--ailp-primary-600); }
.poc-res__badge small { color: var(--ailp-gray-400); font-weight: 400; margin-left: 6px; }
.poc-res__card { display: flex; align-items: flex-start; gap: 9px; background: #fbfcff; border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 9px; padding: 8px 11px; }
.poc-res__card--fig { align-items: center; }
.poc-res__kind { flex-shrink: 0; width: 20px; height: 20px; border-radius: 6px; display: grid; place-items: center; font-size: 10px; font-weight: 800; color: #fff; background: var(--ailp-primary-500); }
.poc-res__kind.is-f { background: var(--ailp-accent-500); }
.poc-res__kind.is-g { background: #8b5cf6; }
.poc-res__body { flex: 1; min-width: 0; }
.poc-res__latex { font-size: 12.5px; line-height: 1.6; overflow-x: auto; }
.poc-res__body small { font-size: 10px; color: var(--ailp-gray-400); }
.poc-res__fig { display: flex; justify-content: center; }
.poc-res__fig :deep(svg) { max-width: 100%; }
.ped-board { display: grid; grid-template-columns: 2fr 1fr; gap: 11px; }
.ped-board__main, .ped-board__side { border: 1px solid var(--ailp-gray-200); border-radius: 11px; padding: 13px 15px; background: rgba(248, 250, 252, 0.6); min-height: 150px; }
.ped-board__side { border-style: dashed; background: rgba(241, 245, 249, 0.4); }
.ped-board small { font-size: 9.5px; font-weight: 700; color: var(--ailp-gray-500); display: block; margin-bottom: 8px; letter-spacing: 0.5px; }
.ped-board p { font-size: 11.5px; color: var(--ailp-gray-600); line-height: 1.9; }
.ped-board .ped-ta { margin-bottom: 6px; }
.ped-hwgrid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 11px; }
.ped-hw { border: 1px solid var(--ailp-gray-200); border-radius: 11px; padding: 12px 13px; }
.ped-hw b { display: block; font-size: 12px; margin-bottom: 6px; }
.ped-hw ul { padding-left: 16px; }
.ped-hw li { font-size: 11px; color: var(--ailp-gray-600); line-height: 1.65; }
.ped-hw small { font-size: 9.5px; color: var(--ailp-gray-400); }
.ped-hw.is-basic { border-color: rgba(16, 185, 129, 0.3); background: rgba(16, 185, 129, 0.04); }
.ped-hw.is-basic b { color: var(--ailp-success-700); }
.ped-hw.is-raise { border-color: rgba(245, 158, 11, 0.3); background: rgba(245, 158, 11, 0.04); }
.ped-hw.is-raise b { color: var(--ailp-warning-600); }
.ped-hw.is-expand { border-color: rgba(79, 70, 229, 0.3); background: rgba(79, 70, 229, 0.04); }
.ped-hw.is-expand b { color: var(--ailp-primary-700); }
.ped-hw .ped-ta { margin-bottom: 6px; }
.ped-rail { width: 350px; flex-shrink: 0; border-left: 1px solid var(--ailp-gray-200); background: #fff; display: flex; flex-direction: column; }
.ped-rail__tabs { display: flex; border-bottom: 1px solid var(--ailp-gray-200); }
.ped-rail__tabs button { flex: 1; padding: 11px 0; border: none; background: none; font-size: 12.5px; font-weight: 600; color: var(--ailp-gray-500); cursor: pointer; }
.ped-rail__tabs button.is-on { color: var(--ailp-primary-600); box-shadow: inset 0 -2px 0 var(--ailp-primary-500); }
.ped-rail__chat { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.ped-bot { display: flex; align-items: center; gap: 10px; margin: 12px 14px 0; padding: 10px 12px; border-radius: 12px; background: linear-gradient(135deg, rgba(99, 102, 241, 0.07), rgba(6, 182, 212, 0.06)); border: 1px solid rgba(99, 102, 241, 0.14); }
.ped-bot__ava { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: linear-gradient(135deg, var(--ailp-primary-500), var(--ailp-accent-500)); font-size: 16px; }
.ped-bot__who b { font-size: 12.5px; display: block; }
.ped-bot__who small { font-size: 10px; color: var(--ailp-gray-500); }
.ped-msgs { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 9px; }
.ped-msg { display: flex; }
.ped-msg.user { justify-content: flex-end; }
.ped-msg__bubble { max-width: 86%; padding: 9px 12px; border-radius: 13px; font-size: 12px; line-height: 1.7; white-space: pre-wrap; }
.ped-msg.ai .ped-msg__bubble { background: linear-gradient(135deg, rgba(99, 102, 241, 0.07), rgba(6, 182, 212, 0.05)); border: 1px solid rgba(99, 102, 241, 0.14); border-top-left-radius: 4px; }
.ped-msg.user .ped-msg__bubble { background: rgba(79, 70, 229, 0.1); color: var(--ailp-primary-700); border-top-right-radius: 4px; }
.ped-quick { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; padding: 0 14px 10px; }
.ped-quick button { border: 1px solid var(--ailp-gray-200); background: #fff; border-radius: 9px; font-size: 11px; font-weight: 500; color: var(--ailp-gray-700); padding: 7px 4px; cursor: pointer; }
.ped-quick button:hover { border-color: var(--ailp-primary-300); color: var(--ailp-primary-600); background: var(--ailp-primary-50); }
.ped-input { display: flex; align-items: center; gap: 8px; margin: 0 14px 14px; padding: 7px 9px; border: 1px solid var(--ailp-gray-200); border-radius: 12px; background: rgba(248, 250, 252, 0.7); }
.ped-input input { flex: 1; border: none; outline: none; background: none; font-size: 12px; }
.ped-input__send { width: 30px; height: 30px; border-radius: 9px; border: none; color: #fff; cursor: pointer; background: linear-gradient(135deg, var(--ailp-primary-500), var(--ailp-accent-500)); font-size: 12px; }
/* 检索要点透出（独立审查 #4）：资料依据可视化 */
.ped-retrieval { margin-top: 10px; border: 1px dashed var(--ailp-primary-200); background: var(--ailp-primary-50); border-radius: 9px; padding: 9px 12px; }
.ped-retrieval__tag { font-size: 11px; font-weight: 600; color: var(--ailp-primary-600); margin-bottom: 6px; }
.ped-retrieval__kp { margin: 3px 0; font-size: 13px; color: var(--ailp-gray-800); }
.ped-retrieval__hint { margin: 5px 0 2px; font-size: 12px; color: var(--ailp-accent-600); }
.ped-retrieval__src { margin: 2px 0 0; font-size: 11px; color: var(--ailp-gray-500); }
</style>
