<!--
  V2 reconstruction source: Nellavio ProfileView/ProfileHeaderCard (MIT),
  cloned at D:\teacher-v2-reference-repos\nellavio-dashboard, commit 522f… .
  The profile header + two-column information hierarchy is adapted to real
  teacher identity and a deliberately key-free model channel status.
-->
<template>
  <div class="teacher-profile-v2">
    <header class="teacher-profile-v2__head"><p class="teacher-profile-v2__eyebrow">教师工作台</p><h1>个人中心</h1><p>查看当前教师身份、工作台权限和 AI 管家运行通道。</p></header>
    <p v-if="notice" class="teacher-profile-v2__notice" role="status">{{ notice }}</p>
    <section class="teacher-profile-v2__hero">
      <div class="teacher-profile-v2__banner"></div>
      <div class="teacher-profile-v2__avatar">{{ initials }}</div>
      <div class="teacher-profile-v2__identity"><h2>{{ user?.nickname || '未读取教师姓名' }}</h2><p>高中数学教师 · {{ roleText }}</p><span>{{ user?.phone || '联系方式未返回' }}</span></div>
    </section>
    <main class="teacher-profile-v2__grid">
      <aside class="teacher-profile-v2__side">
        <h2>账户与权限</h2>
        <dl><div><dt>当前角色</dt><dd>{{ roleText }}</dd></div><div><dt>可用教师工作区</dt><dd>{{ teacherRole ? '已启用' : '未启用' }}</dd></div><div><dt>身份状态</dt><dd>{{ user?.status || '未返回' }}</dd></div></dl>
        <button class="t-btn" type="button" @click="router.push('/account/security')">账户安全设置</button>
      </aside>
      <section class="teacher-profile-v2__content">
        <article><p class="teacher-profile-v2__eyebrow">AI 管家</p><h2>模型通道状态</h2><p>管家继承当前用户的学生端模型配置；此处只显示模型名称和配置来源，不显示或读取密钥。</p><div class="teacher-profile-v2__model"><span>{{ primaryModelLabel }}</span><strong>{{ primaryModel }}</strong><small>{{ primarySource }}</small></div><div class="teacher-profile-v2__model"><span>辅助通道</span><strong>{{ secondaryModel }}</strong><small>{{ secondarySource }}</small></div></article>
        <article><p class="teacher-profile-v2__eyebrow">操作边界</p><h2>教师确认仍是最后一步</h2><p>AI 可协助建立备课、组卷或发布草稿；学生可见内容、正式成绩和题库入库都必须在相应工作区由教师确认。</p><div class="teacher-profile-v2__links"><button class="t-btn" type="button" @click="router.push('/teacher/today')">打开 AI 管家</button><button class="t-btn" type="button" @click="router.push('/teacher/resources')">管理题源审核</button></div></article>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '@/api/auth'
import { api } from '@/api/client'

type CurrentUser = { nickname?: string; phone?: string; status?: string; active_role?: string; roles?: Array<{ role: string; status?: string }> }
type ModelConfig = { configured?: boolean; primary?: { model?: string; source?: string }; secondary?: { model?: string; source?: string } }
const router = useRouter()
const user = ref<CurrentUser | null>(null)
const modelConfig = ref<ModelConfig | null>(null)
const notice = ref('')
const initials = computed(() => (user.value?.nickname || '师').slice(0, 1))
const teacherRole = computed(() => user.value?.roles?.some((item) => item.role === 'teacher' && (!item.status || item.status === 'approved')) ?? user.value?.active_role === 'teacher')
const roleText = computed(() => teacherRole.value ? '教师' : (user.value?.active_role || '未返回'))
const primaryModel = computed(() => modelConfig.value?.primary?.model || '未配置')
const secondaryModel = computed(() => modelConfig.value?.secondary?.model || '未配置')
const primarySource = computed(() => modelConfig.value?.primary?.source === 'user' ? '当前教师个人配置' : '系统默认配置')
const secondarySource = computed(() => modelConfig.value?.secondary?.source === 'user' ? '当前教师个人配置' : '系统默认配置')
const primaryModelLabel = computed(() => /mimo/i.test(primaryModel.value) ? 'Mimo 测试通道' : '主要通道')

onMounted(async () => {
  try {
    const [currentUser, config] = await Promise.all([authApi.me(), api.get('/model-config')])
    user.value = currentUser || null
    modelConfig.value = config || null
  } catch (error: any) { notice.value = error?.message || '个人配置暂未连通；未展示任何示例身份或模型信息。' }
})
</script>

<style scoped>
.teacher-profile-v2 { max-width: 1220px; margin: 0 auto; padding: 30px 32px 42px; color: #17243b; }.teacher-profile-v2__head h1 { margin: 4px 0 8px; font-size: 32px; letter-spacing: -.04em; }.teacher-profile-v2__head > p:last-child { margin: 0; color: #53637b; }.teacher-profile-v2__eyebrow { margin: 0; color: #64748b; font-size: 12px; letter-spacing: .08em; font-weight: 700; }.teacher-profile-v2__notice { margin: 20px 0; padding: 11px 14px; color: #9a6700; background: #fffbeb; border-radius: 8px; }.teacher-profile-v2__hero, .teacher-profile-v2__side, .teacher-profile-v2__content article { position: relative; background: #fff; border: 1px solid #e1e7ef; border-radius: 14px; }.teacher-profile-v2__hero { overflow: hidden; min-height: 230px; }.teacher-profile-v2__banner { height: 104px; background: linear-gradient(120deg, #e0efff, #f5e7c8); }.teacher-profile-v2__avatar { position: absolute; top: 58px; left: 42px; width: 92px; height: 92px; display: grid; place-items: center; border: 4px solid #fff; border-radius: 50%; color: #fff; background: linear-gradient(135deg, #a65d13, #e7a52b); font-size: 31px; font-weight: 800; }.teacher-profile-v2__identity { padding: 59px 42px 25px; }.teacher-profile-v2__identity h2 { margin: 0; font-size: 24px; }.teacher-profile-v2__identity p { margin: 6px 0; color: #53637b; }.teacher-profile-v2__identity span { color: #738198; font-size: 13px; }.teacher-profile-v2__grid { display: grid; grid-template-columns: minmax(250px, .66fr) minmax(0, 1.35fr); gap: 22px; margin-top: 22px; }.teacher-profile-v2__side { padding: 21px; align-self: start; }.teacher-profile-v2 h2 { margin: 5px 0 15px; font-size: 19px; }.teacher-profile-v2__side dl { margin: 0 0 20px; }.teacher-profile-v2__side dl div { display: flex; justify-content: space-between; gap: 14px; padding: 12px 0; border-bottom: 1px solid #edf0f4; }.teacher-profile-v2 dt { color: #66758b; font-size: 13px; }.teacher-profile-v2 dd { margin: 0; color: #26354b; font-size: 13px; font-weight: 700; text-align: right; }.teacher-profile-v2__content { display: grid; gap: 20px; }.teacher-profile-v2__content article { padding: 21px; }.teacher-profile-v2__content article > p:not(.teacher-profile-v2__eyebrow) { color: #596a82; line-height: 1.6; margin: 0 0 16px; }.teacher-profile-v2__model { display: grid; grid-template-columns: 120px 1fr auto; align-items: center; gap: 12px; padding: 12px 0; border-top: 1px solid #edf0f4; font-size: 13px; }.teacher-profile-v2__model span, .teacher-profile-v2__model small { color: #6b7a90; }.teacher-profile-v2__model strong { word-break: break-all; }.teacher-profile-v2__links { display: flex; flex-wrap: wrap; gap: 9px; }
@media (max-width: 800px) { .teacher-profile-v2 { padding: 22px 16px; }.teacher-profile-v2__grid { grid-template-columns: 1fr; }.teacher-profile-v2__avatar { left: 24px; }.teacher-profile-v2__identity { padding-left: 24px; }.teacher-profile-v2__model { grid-template-columns: 1fr; gap: 5px; } }
</style>
