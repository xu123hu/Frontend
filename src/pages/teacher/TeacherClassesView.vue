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
    <main v-if="loading" class="classes-v2__empty">正在加载该班真实成员和作答数据…
      <section v-if="visibleInviteCode" class="classes-v2__next" aria-label="学生入班邀请码"><div><p class="classes-v2__eyebrow">学生入班邀请码</p><h2 style="letter-spacing:.16em;">{{ visibleInviteCode }}</h2><p>仅向本班创建教师展示，请通过可信渠道发送给学生。</p></div><button class="t-btn sm" type="button" @click="copyInviteCode">{{ copyStatus || '复制邀请码' }}</button></section>
    </main>
    <main v-else-if="!classes.length" class="classes-v2__empty"><h2>还没有任教班级</h2><p>等待班级建立或任课关系配置后，此处才会出现花名册。</p></main>
    <main v-else class="classes-v2__workspace">
      <section class="classes-v2__roster"><header><div><p class="classes-v2__eyebrow">平台成员</p><h2>班级花名册</h2></div><span>{{ students.length }} 名已确认学生</span></header>
        <div v-if="members.length" class="classes-v2__table"><div class="classes-v2__tr classes-v2__th"><span>成员</span><span>角色</span><span>班级状态</span></div><div v-for="member in members" :key="member.userId" class="classes-v2__tr"><strong>{{ member.nicknameInClass || member.nickname || '未命名成员' }}</strong><span>{{ member.memberRole === 'teacher' ? '教师' : '学生' }}</span><span :class="member.confirmed ? 'is-confirmed' : 'is-pending'">{{ member.confirmed ? '已确认在班' : '等待确认' }}</span></div></div>
        <p v-else class="classes-v2__empty">当前班级尚无成员记录。</p>
      </section>
      <aside class="classes-v2__evidence"><p class="classes-v2__eyebrow">已确认作答的聚合结果</p><h2>作答证据</h2><p class="classes-v2__description">只展示后端形成的可行动洞察；没有证据时保持为空，不把建议写成班级事实。</p>
        <div v-if="insights.length" class="classes-v2__insights"><article v-for="insight in insights" :key="insight.insight_id"><h3>{{ insight.summary }}</h3><p>{{ evidenceText(insight.evidence) }}</p><small v-if="insight.recommended_actions?.length">建议：{{ insight.recommended_actions.join('；') }}</small><button class="t-btn sm primary classes-v2__act" type="button" @click="go(insightAction(insight).path)">{{ insightAction(insight).label }}</button></article></div>
        <p v-else class="classes-v2__empty">当前没有足以形成教学行动的作答证据。</p>
      </aside>
      <section class="classes-v2__next"><div><p class="classes-v2__eyebrow">带入当前班级</p><h2>{{ currentClass?.name }}</h2><p>以下入口会将当前班级上下文交给正式工作区。</p></div><div><button class="t-btn primary" type="button" @click="go('/teacher/prep')">基于资料备课</button><button class="t-btn" type="button" @click="go('/teacher/assign')">从已审核题库组卷</button><button class="t-btn" type="button" @click="go('/teacher/classroom')">进入课堂控制</button></div></section>
    </main>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { classApi } from '@/api'
import { classesApi } from '@/api/teacher/classes'
import { useTeacherContextStore } from '@/stores/teacher/context'
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
const pendingMembers = computed(() => members.value.filter((item) => !item.confirmed))

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
    error.value = cause?.message || '班级数据加载失败'
    members.value = []
    insights.value = []
  } finally {
    if (requestVersion === classRequestVersion && selectedClassId.value === cls.id) loading.value = false
  }
}

function evidenceText(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return '暂无更多证据'
  const evidence = value.trim()
  if (/(?:^|[;；,，\s])[a-z][a-z0-9_]*\s*=/i.test(evidence)) {
    return '证据格式待更新，暂不展示内部诊断字段。'
  }
  return evidence
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
    error.value = cause?.message || '班级列表加载失败'
    loading.value = false
  }
})
const INSIGHT_ACTIONS: Record<string, { label: string; path: string }> = {
  review_backlog: { label: '去批改这些作答', path: '/teacher/grading' },
  low_mastery: { label: '布置针对性练习', path: '/teacher/assign' },
  submission_trend: { label: '查看作业与提交', path: '/teacher/assign' },
}
function insightAction(insight: ActionableInsight) { return INSIGHT_ACTIONS[insight.kind] || { label: '回到今天的工作台', path: '/teacher/today' } }
</script>

<style scoped>
.class-invite {
  align-items: center;
  display: flex;
  gap: 20px;
  justify-content: space-between;
  margin-bottom: 16px;
}

.class-invite-label {
  color: var(--t-text-secondary);
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 6px;
}

.class-invite-value {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 0.16em;
}

.class-invite p {
  margin: 6px 0 0;
}

.class-invite-action {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

@media (max-width: 640px) {
  .class-invite {
    align-items: flex-start;
    flex-direction: column;
  }

  .class-invite-action {
    align-items: flex-start;
  }
}

</style>

