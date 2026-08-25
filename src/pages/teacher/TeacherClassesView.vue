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

type ClassItem = { id: string; name: string }
type ClassMember = { userId: string; nickname?: string; nicknameInClass?: string; memberRole: string; confirmed: boolean }
const router = useRouter(); const context = useTeacherContextStore(); const classes = ref<ClassItem[]>([]); const members = ref<ClassMember[]>([]); const insights = ref<ActionableInsight[]>([]); const selectedClassId = ref(''); const loading = ref(false); const error = ref('')
const currentClass = computed(() => classes.value.find((item) => item.id === selectedClassId.value)); const students = computed(() => members.value.filter((item) => item.memberRole === 'student' && item.confirmed))
async function loadClassData() { const current = currentClass.value; if (!current) return; context.setClass(current.id, current.name); loading.value = true; error.value = ''; try { const [memberData, insightData] = await Promise.all([classApi.members(current.id), classesApi.insights(current.id, true)]); members.value = memberData?.items || []; insights.value = insightData } catch (cause: any) { error.value = cause?.message || '班级数据加载失败'; members.value = []; insights.value = [] } finally { loading.value = false } }
function evidenceText(value: unknown) { if (typeof value === 'string') return value; if (!value) return '后端未提供更多证据'; try { return JSON.stringify(value) } catch { return '证据格式无法展示' } }
const INSIGHT_ACTIONS: Record<string, { label: string; path: string }> = {
  review_backlog: { label: '去批改这些作答', path: '/teacher/grading' },
  low_mastery: { label: '布置针对性练习', path: '/teacher/assign' },
  submission_trend: { label: '查看作业与提交', path: '/teacher/assign' },
}
function insightAction(insight: ActionableInsight) { return INSIGHT_ACTIONS[insight.kind] || { label: '回到今天的工作台', path: '/teacher/today' } }
function go(path: string) { const current = currentClass.value; if (current) context.setClass(current.id, current.name); router.push(path) }
onMounted(async () => { loading.value = true; try { const data = await classApi.mine(); classes.value = data?.items || []; selectedClassId.value = classes.value.some((item) => item.id === context.classId) ? context.classId || '' : classes.value[0]?.id || ''; if (selectedClassId.value) await loadClassData() } catch (cause: any) { error.value = cause?.message || '班级列表加载失败' } finally { loading.value = false } })
</script>

<style scoped>
.classes-v2{max-width:1500px;margin:0 auto;padding:30px 32px 42px;color:#17243b}.classes-v2__head,.classes-v2__roster>header,.classes-v2__next{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.classes-v2__eyebrow{margin:0;color:#69758b;font-size:12px;letter-spacing:.08em;font-weight:700}.classes-v2 h1{margin:4px 0 8px;font-size:32px;letter-spacing:-.04em}.classes-v2 h2{margin:5px 0 0;font-size:20px}.classes-v2__head>div>p:last-child{margin:0;max-width:720px;color:#53637b;line-height:1.6}.classes-v2__picker{display:grid;gap:6px;color:#526178;font-size:12px;font-weight:700}.classes-v2 select{min-width:230px;padding:10px;border:1px solid #d8e1ec;border-radius:8px;background:#fff;color:#17243b;font:inherit}.classes-v2__notice{margin:20px 0;padding:11px 14px;border-radius:9px}.classes-v2__notice.is-error{background:#fff1f1;color:#b42318}.classes-v2__workspace{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(310px,.75fr);gap:22px;margin-top:25px}.classes-v2__roster,.classes-v2__evidence,.classes-v2__next{border:1px solid #e1e7ef;background:#fff;border-radius:14px}.classes-v2__roster>header{padding:20px 22px 16px;border-bottom:1px solid #edf0f4}.classes-v2__roster>header span{color:#65758b;font-size:13px}.classes-v2__table{padding:8px 18px 16px}.classes-v2__tr{display:grid;grid-template-columns:minmax(120px,1fr) 100px 130px;gap:14px;align-items:center;padding:14px 4px;border-bottom:1px solid #edf0f4;font-size:14px}.classes-v2__th{color:#718096;font-size:12px;font-weight:700}.is-confirmed{color:#166534}.is-pending{color:#9a6700}.classes-v2__evidence{padding:22px;align-self:start}.classes-v2__description{color:#5d6c80;line-height:1.55;font-size:14px}.classes-v2__insights{display:grid;gap:10px}.classes-v2__insights article{padding:14px;border-left:3px solid #f59e0b;background:#fffdf8;border-radius:0 8px 8px 0}.classes-v2__insights h3{margin:0;font-size:15px}.classes-v2__insights p{margin:7px 0;color:#56667d;font-size:13px;line-height:1.5}.classes-v2__insights small{color:#8a5a14;font-size:12px}.classes-v2__insights .t-btn{margin-top:10px}.classes-v2__next{grid-column:1/-1;padding:21px;align-items:center}.classes-v2__next h2{margin:5px 0}.classes-v2__next p{margin:7px 0 0;color:#627187}.classes-v2__next>div:last-child{display:flex;gap:9px;flex-wrap:wrap}.classes-v2__empty{padding:34px 22px;margin-top:22px;border-radius:12px;background:#f8fafc;color:#64748b;text-align:center;line-height:1.55}.classes-v2__roster .classes-v2__empty,.classes-v2__evidence .classes-v2__empty{margin:16px 0;padding:22px}@media(max-width:900px){.classes-v2{padding:22px 16px}.classes-v2__head,.classes-v2__next{flex-direction:column}.classes-v2__workspace{grid-template-columns:1fr}.classes-v2__tr{grid-template-columns:1fr 80px 100px}.classes-v2__next>div:last-child{width:100%}}
</style>
