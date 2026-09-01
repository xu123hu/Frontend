<!--
  V2 reconstruction source: Paper LMS EnrollmentTermsPage (MIT), cloned at
  D:\teacher-v2-reference-repos\kocherm-paper-lms, commit 543c… .
  Its roster-first administrative pattern is adapted to the existing teacher
  class scope; membership remains read from the platform rather than mocked.
-->
<template>
  <div class="classes-v2">
    <header class="classes-v2__head">
      <div><p class="classes-v2__eyebrow">班级 · 高中数学</p><h1>班级花名册与教学证据</h1><p>成员身份、确认状态和作答洞察均来自当前平台数据；这里不生成虚构的班级画像。</p></div>
      <label v-if="classes.length" class="classes-v2__picker">当前班级<select v-model="selectedClassId" @change="loadClassData"><option v-for="item in classes" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
    </header>
    <p v-if="error" class="classes-v2__notice is-error" role="alert">{{ error }}</p>
    <main v-if="loading" class="classes-v2__empty">正在加载该班真实成员和作答数据…</main>
    <main v-else-if="!classes.length" class="classes-v2__empty"><h2>还没有任教班级</h2><p>等待班级建立或任课关系配置后，此处才会出现花名册。</p></main>
    <main v-else class="classes-v2__workspace">
      <section class="classes-v2__roster"><header><div><p class="classes-v2__eyebrow">平台成员</p><h2>班级花名册</h2></div><span>{{ students.length }} 名已确认学生</span></header>
        <div v-if="members.length" class="classes-v2__table"><div class="classes-v2__tr classes-v2__th"><span>成员</span><span>角色</span><span>班级状态</span></div><div v-for="member in members" :key="member.userId" class="classes-v2__tr"><strong>{{ member.nicknameInClass || member.nickname || '未命名成员' }}</strong><span>{{ member.memberRole === 'teacher' ? '教师' : '学生' }}</span><span :class="member.confirmed ? 'is-confirmed' : 'is-pending'">{{ member.confirmed ? '已确认在班' : '等待确认' }}</span></div></div>
        <p v-else class="classes-v2__empty">当前班级尚无成员记录。</p>
      </section>
      <aside class="classes-v2__evidence"><p class="classes-v2__eyebrow">已确认作答的聚合结果</p><h2>作答证据</h2><p class="classes-v2__description">只展示后端形成的可行动洞察；没有证据时保持为空，不把建议写成班级事实。</p>
        <div v-if="insights.length" class="classes-v2__insights"><article v-for="insight in insights" :key="insight.insight_id"><h3>{{ insightTitle(insight) }}</h3><p>{{ evidenceText(insight.evidence) }}</p><small v-if="insight.recommended_actions?.length">建议：{{ insight.recommended_actions.join('；') }}</small><div class="classes-v2__actrow"><button v-for="act in insightActions(insight)" :key="act.label" class="t-btn sm primary classes-v2__act" type="button" @click="goAction(act)">{{ act.label }}</button></div></article></div>
        <p v-else class="classes-v2__empty">当前没有足以形成教学行动的作答证据。</p>
      </aside>
      <section class="classes-v2__next"><div><p class="classes-v2__eyebrow">带入当前班级</p><h2>{{ currentClass?.name }}</h2><p>以下入口会将当前班级上下文交给正式工作区。</p></div><div><button class="t-btn primary" type="button" @click="go('/teacher/prep')">基于资料备课</button><button class="t-btn" type="button" @click="go('/teacher/assign')">从已审核题库组卷</button><button class="t-btn" type="button" @click="go('/teacher/classroom')">进入课堂控制</button></div></section>
    </main>

    <section v-if="visibleInviteCode" class="classes-v2__next" data-testid="class-invite-code" aria-label="学生入班邀请码"><div><p class="classes-v2__eyebrow">学生入班邀请码</p><h2 style="letter-spacing:.16em;">{{ visibleInviteCode }}</h2><p>仅向本班创建教师展示，请通过可信渠道发送给学生。</p></div><button class="t-btn sm" type="button" :aria-label="`复制班级邀请码 ${visibleInviteCode}`" @click="copyInviteCode">{{ copyStatus || '复制邀请码' }}</button></section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { classApi } from '@/api'
import { classesApi } from '@/api/teacher/classes'
import { useTeacherContextStore } from '@/stores/teacher/context'
import { evidenceText, insightTitle, isKnownInsightKind } from '@/utils/insightCopy'
import type { ActionableInsight } from '@/types/teacher'

interface ClassItem { id: string; name: string; myRole?: string; confirmed?: boolean; inviteCode?: string | null }
interface ClassMember {
  userId: string
  nickname?: string
  nicknameInClass?: string
  memberRole: string
  confirmed: boolean
}

const router = useRouter()
const context = useTeacherContextStore()
const classes = ref<ClassItem[]>([])
const members = ref<ClassMember[]>([])
const insights = ref<ActionableInsight[]>([])
const selectedClassId = ref('')
const loading = ref(false)
const error = ref('')
const copyStatus = ref('')
let classRequestVersion = 0

const currentClass = computed(() => classes.value.find((item) => item.id === selectedClassId.value))
const visibleInviteCode = computed(() => {
  const cls = currentClass.value
  if (cls?.myRole !== 'teacher' || typeof cls.inviteCode !== 'string') return ''
  return cls.inviteCode.trim()
})
const students = computed(() => members.value.filter((item) => item.memberRole === 'student' && item.confirmed))

async function loadClassData() {
  const cls = currentClass.value
  if (!cls) return
  const requestVersion = ++classRequestVersion
  context.setClass(cls.id, cls.name)
  members.value = []
  insights.value = []
  copyStatus.value = ''
  loading.value = true
  error.value = ''
  try {
    const [memberData, insightData] = await Promise.all([
      classApi.members(cls.id),
      classesApi.insights(cls.id, true),
    ])
    if (requestVersion !== classRequestVersion || selectedClassId.value !== cls.id) return
    members.value = memberData?.items || []
    insights.value = insightData
  } catch (cause: any) {
    if (requestVersion !== classRequestVersion || selectedClassId.value !== cls.id) return
    console.error('[classes] 班级数据加载失败', cause)
    error.value = '班级数据暂时加载不出来，可重试或先切换班级。'
    members.value = []
    insights.value = []
  } finally {
    if (requestVersion === classRequestVersion && selectedClassId.value === cls.id) loading.value = false
  }
}

async function copyInviteCode() {
  const code = visibleInviteCode.value
  if (!code) return
  try {
    if (!navigator.clipboard?.writeText) {
      copyStatus.value = '请手动选择邀请码复制'
      return
    }
    await navigator.clipboard.writeText(code)
    copyStatus.value = '邀请码已复制'
  } catch {
    copyStatus.value = '复制失败，请手动选择'
  }
}

function go(path: string) {
  const cls = currentClass.value
  if (cls) context.setClass(cls.id, cls.name)
  router.push(path)
}

onMounted(async () => {
  loading.value = true
  try {
    const data = await classApi.mine()
    classes.value = data?.items || []
    selectedClassId.value = classes.value.some((item) => item.id === context.classId)
      ? context.classId || ''
      : classes.value[0]?.id || ''
    if (selectedClassId.value) await loadClassData()
    else loading.value = false
  } catch (cause: any) {
    console.error('[classes] 班级列表加载失败', cause)
    error.value = '班级列表暂时加载不出来，请刷新重试。'
    loading.value = false
  }
})
/** 洞察动作映射：kind 权威四枚举（契约记录 2026-09-01），未知 kind 落兜底并告警 */
interface InsightAction { label: string; path: string; query?: Record<string, string> }
const INSIGHT_ACTIONS: Record<string, InsightAction[]> = {
  error_cluster: [
    { label: '布置变式练习', path: '/teacher/assign' },
    { label: '看典型错误', path: '/teacher/grading' },
  ],
  review_backlog: [{ label: '去批改这些作答', path: '/teacher/grading' }],
  low_mastery: [{ label: '布置针对性练习', path: '/teacher/assign' }],
  submission_trend: [{ label: '查看作业与提交', path: '/teacher/assign' }],
}

function insightActions(insight: ActionableInsight): InsightAction[] {
  if (!isKnownInsightKind(insight.kind)) console.warn(`[insights] 未知洞察 kind：${insight.kind}，动作落兜底`)
  const base = INSIGHT_ACTIONS[insight.kind] || [{ label: '回到今天的工作台', path: '/teacher/today' }]
  const kpCode = (insight as { kp_code?: string }).kp_code
  const classId = selectedClassId.value
  return base.map((act) => {
    const query: Record<string, string> = { ...(act.query || {}) }
    if (kpCode && act.path === '/teacher/assign') query.kp_codes = kpCode
    if (classId && act.path === '/teacher/grading') query.class_id = classId
    return { ...act, query }
  })
}

function goAction(action: InsightAction) {
  const cls = currentClass.value
  if (cls) context.setClass(cls.id, cls.name)
  router.push({ path: action.path, query: action.query })
}

</script>

<style scoped>
/* 版式参照 REF-L5（Khan 班级 Overview）：左花名册右证据两栏；此前 classes-v2 版式类零定义（体验轨未通过项修复） */
.classes-v2 { max-width: 1500px; margin: 0 auto; padding: 30px 32px 44px; color: #17243b; }
.classes-v2__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.classes-v2__eyebrow { margin: 0; color: #69758b; font-size: 12px; font-weight: 700; letter-spacing: .08em; }
.classes-v2 h1 { margin: 4px 0 8px; font-size: 30px; letter-spacing: -.03em; }
.classes-v2 h2 { margin: 4px 0 0; font-size: 20px; }
.classes-v2__head > div > p:last-child { margin: 6px 0 0; color: #53637b; max-width: 720px; line-height: 1.6; }
.classes-v2__picker { display: grid; gap: 6px; color: #526178; font-size: 12px; font-weight: 700; }
.classes-v2__picker select { min-width: 200px; padding: 9px 10px; border: 1px solid #d8e1ec; border-radius: 8px; background: #fff; color: inherit; font: inherit; }
.classes-v2__notice { margin: 18px 0 0; padding: 11px 14px; border-radius: 9px; background: #fff1f2; color: #b42318; }
.classes-v2__workspace { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 20px; margin-top: 24px; align-items: start; }
.classes-v2__roster, .classes-v2__evidence, .classes-v2__next { border: 1px solid #e1e7ef; border-radius: 14px; background: #fff; padding: 20px 22px; }
.classes-v2__roster > header, .classes-v2__evidence .classes-v2__eyebrow { margin-bottom: 8px; }
.classes-v2__roster header { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
.classes-v2__roster header span { color: #65758b; font-size: 13px; }
.classes-v2__table { display: grid; margin-top: 8px; }
.classes-v2__tr { display: grid; grid-template-columns: minmax(0, 1.4fr) 90px 120px; gap: 10px; padding: 9px 4px; border-bottom: 1px solid #eef2f6; align-items: center; }
.classes-v2__th { color: #7c8aa0; font-size: 12px; font-weight: 700; }
.classes-v2__tr strong { font-weight: 600; }
.classes-v2__tr span { color: #5d6d84; font-size: 13px; }
.classes-v2__tr .is-confirmed { color: #166534; }
.classes-v2__tr .is-pending { color: #92400e; }
.classes-v2__description { margin: 6px 0 10px; color: #53637b; font-size: 13px; line-height: 1.6; }
.classes-v2__insights { display: grid; gap: 12px; margin-top: 4px; }
.classes-v2__insights article { border: 1px solid #e4ebf3; border-radius: 11px; padding: 14px 16px; background: #fbfdff; }
.classes-v2__insights h3 { margin: 0; font-size: 15px; color: #1c3452; }
.classes-v2__insights p { margin: 6px 0 0; color: #65758b; font-size: 13px; line-height: 1.55; }
.classes-v2__insights small { display: block; margin-top: 6px; color: #91a0b8; font-size: 12px; }
.classes-v2__actrow { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.classes-v2__actrow .t-btn.sm { padding: 6px 12px; font-size: 12px; }
.classes-v2__empty { margin-top: 10px; color: #6b7a90; }
.classes-v2__next { margin-top: 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.classes-v2__next > div > p { margin: 4px 0 0; color: #53637b; font-size: 13px; }
.classes-v2__next > div:last-child { display: flex; gap: 9px; flex-wrap: wrap; }
@media (max-width: 980px) { .classes-v2 { padding: 22px 16px; } .classes-v2__workspace { grid-template-columns: 1fr; } .classes-v2__head { flex-direction: column; } }
</style>
