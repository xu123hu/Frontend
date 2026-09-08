<script setup>
/**
 * 智学数研 · 统一工作入口（三端 Hub）
 *
 * 职责：一个固定地址承载学生/教师/科研/管理后台的授权入口与真实运行状态。
 * - 身份来自真实平台会话（auth store）
 * - 端状态来自真实后端探针（/api/health、/api/v1/ai/healthz、/api/teacher-v3/healthz）
 * - 任务区来自真实持久任务（教师端 /tasks；学生端最近会话；科研端运行中心链接）
 * - 科研端为独立 Keycloak OIDC 身份体系，入口页负责身份映射说明与跳转，绝不假成功
 */
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { agentApi } from '@/api'
import { api } from '@/api/client'
import { v3Api } from '@/api/teacherV3'
import { authApi } from '@/api/auth'

const router = useRouter()
const auth = useAuthStore()

const health = ref({ platform: 'unknown', student: 'unknown', teacher: 'unknown' })
const teachers = ref(null)   // 教师端真实任务快照
const sdRecent = ref(0)      // 学生端最近会话数
const errorMsg = ref('')

const roles = computed(() => auth.roles || [])
const can = (r) => roles.value.includes(r)
const activeRole = computed(() => auth.activeRole)
const maskedPhone = computed(() => {
  const p = auth.user?.phone || ''
  return p.length >= 7 ? p.slice(0, 3) + '****' + p.slice(-4) : (p || '已登录')
})

async function probeHealth() {
  const probe = async (path, key) => {
    try {
      const { status } = await api.raw('GET', path, {})
      health.value[key] = status === 200 ? 'ok' : (status === 401 || status === 403) ? 'auth' : 'error'
    } catch { health.value[key] = 'down' }
  }
  await Promise.all([
    probe('/health', 'platform'),
    probe('/v1/ai/healthz', 'student'),
    probe('/teacher-v3/healthz', 'teacher'),
  ])
}

async function loadTasks() {
  if (can('teacher')) {
    try {
      const resp = await v3Api.tasks()
      const items = resp?.data?.items || []
      teachers.value = Array.isArray(items) ? items.slice(0, 6) : []
    } catch { teachers.value = [] }
  }
  if (can('student')) {
    try {
      const data = await agentApi.conversations({ limit: 1 })
      const items = data?.data?.items || data?.data || data?.items || []
      sdRecent.value = Array.isArray(items) ? items.length : 0
    } catch { sdRecent.value = -1 }
  }
}

const statusLabel = (s) => ({ ok: '在线', auth: '需登录', error: '异常', down: '离线', unknown: '探测中' })[s] || '未知'
const statusColor = (s) => ({ ok: 'ok', auth: 'warn', error: 'err', down: 'err', unknown: 'mute' })[s] || 'mute'

const endpoints = computed(() => [
  { key: 'student', name: '学生端', sub: '对话 · 练题 · 错题复习', icon: '✎', href: '/dialog', allow: can('student'), statusKey: 'student', statusText: can('student') ? statusLabel(health.value.student) : '未授权', color: statusColor(health.value.student) },
  { key: 'teacher', name: '教师端', sub: '备课 · 课件 · 课堂 · 学情', icon: '§', href: '/teacher-v3/today', allow: can('teacher'), statusKey: 'teacher', statusText: can('teacher') ? statusLabel(health.value.teacher) : '未授权', color: statusColor(health.value.teacher) },
  { key: 'research', name: '科研端', sub: '项目 · 文献 · 验证 · 写作', icon: 'ƒ', href: '/hub/research', allow: true, statusKey: 'research', statusText: '独立身份', color: 'mute', iso: true },
  { key: 'admin', name: '管理后台', sub: '用户 · 任务 · 模型 · 数据', icon: '▤', href: '/admin/overview', allow: can('admin'), statusKey: 'platform', statusText: can('admin') ? `平台 ${statusLabel(health.value.platform)}` : '未授权', color: can('admin') ? statusColor(health.value.platform) : 'mute' },
])

const taskStatusText = (st) => ({ pending: '排队', running: '进行中', succeeded: '完成', failed: '失败', cancelled: '已取消' })[st] || st
const taskStatusColor = (st) => ({ succeeded: 'ok', failed: 'err', running: 'warn', pending: 'mute', cancelled: 'mute' })[st] || 'mute'

async function onSwitchRole(role) {
  try {
    await auth.switchRole(role)
    router.push({ path: role === 'teacher' ? '/teacher-v3/today' : role === 'researcher' ? '/research' : role === 'admin' ? '/admin/overview' : '/hub' })
  } catch (e) {
    errorMsg.value = '切换身份失败：' + (e?.message || '未知错误')
  }
}

function onGo(e) {
  if (e.iso) return // 科研端走独立入口
  if (!e.allow) { errorMsg.value = `当前账号尚未获得「${e.name}」权限，请到个人中心申请身份认证。`; return }
  // 管理后台等要求 active 角色一致：先切身份再进入（独立审查/第0关：权限必须真实）
  if (e.key === 'admin' && activeRole.value !== 'admin') {
    switchRoleAndGo('admin', '/admin/overview')
    return
  }
  router.push(e.href)
}

async function switchRoleAndGo(role, path) {
  try {
    await auth.switchRole(role)
    router.push(path)
  } catch (err) {
    errorMsg.value = '切换身份失败：' + (err?.message || '未知错误')
  }
}

function onLogout() {
  authApi.logout().catch(() => {}).finally(() => location.assign('/login'))
}

onMounted(() => {
  probeHealth()
  loadTasks()
})
</script>

<template>
  <div class="hub">
    <!-- ===== 顶栏 ===== -->
    <header class="hub-top">
      <div class="hub-brand">
        <span class="hub-brand__mark">∫</span>
        <span class="hub-brand__name">智学数研</span>
        <span class="hub-brand__tag">统一工作入口</span>
      </div>
      <div class="hub-top__right">
        <span v-if="errorMsg" class="hub-err" role="alert">{{ errorMsg }}</span>
        <button class="hub-btn hub-btn--ghost" type="button" @click="onLogout">退出登录</button>
      </div>
    </header>

    <div class="hub-body">
      <!-- ===== 首屏：当前工作身份 ===== -->
      <section class="hub-hero">
        <p class="hub-hero__eyebrow">数学编辑室 · Mathematics Studio</p>
        <h1 class="hub-hero__title">{{ auth.nickname }}，欢迎回到你的数学工作台</h1>
        <p class="hub-hero__sub">
          当前身份 <strong class="hub-role-chip">{{ activeRole === 'researcher' ? '科研人员' : activeRole === 'teacher' ? '教师' : activeRole === 'admin' ? '管理员' : '学生' }}</strong>
          · 手机号 {{ maskedPhone }}
        </p>
        <div v-if="roles.length > 1" class="hub-roles">
          <span class="hub-roles__label">已授权的其他身份：</span>
          <button v-for="r in roles" :key="r" type="button" class="hub-role-switch" :class="{ disabled: r === activeRole }" :disabled="r === activeRole" @click="onSwitchRole(r)">
            {{ r === 'teacher' ? '教师' : r === 'researcher' ? '科研' : r === 'admin' ? '管理员' : '学生' }}
          </button>
        </div>
      </section>

      <!-- ===== 三端 + 后台入口 ===== -->
      <section class="hub-grid">
        <article v-for="e in endpoints" :key="e.key" class="hub-card" :class="{ 'hub-card--locked': !e.allow && !e.iso }" @click="onGo(e)">
          <div class="hub-card__head">
            <span class="hub-card__icon">{{ e.icon }}</span>
            <span class="hub-status" :class="'hub-status--' + e.color">{{ e.statusText }}</span>
          </div>
          <h2 class="hub-card__title">{{ e.name }}</h2>
          <p class="hub-card__sub">{{ e.sub }}</p>
          <div v-if="e.iso" class="hub-card__iso">独立 OIDC 身份 · 见科研端说明</div>
          <div v-else-if="!e.allow" class="hub-card__iso">当前账号未授权该端</div>
          <span class="hub-card__go">进入 →</span>
        </article>
      </section>

      <!-- ===== 正在进行的真实工作 ===== -->
      <section class="hub-panel">
        <div class="hub-panel__head">
          <h2>正在进行的任务</h2>
          <span class="hub-panel__note">服务端持久任务 · 刷新不丢</span>
        </div>

        <div v-if="can('teacher')" class="hub-taskwrap">
          <p v-if="teachers === null" class="hub-empty">正在读取教师端任务…</p>
          <p v-else-if="Array.isArray(teachers) && teachers.length === 0" class="hub-empty">教师端暂无后台任务</p>
          <template v-else>
            <div v-for="t in teachers" :key="t.task_id" class="hub-task">
              <span class="hub-tag" :class="'hub-tag--' + taskStatusColor(t.status)">{{ taskStatusText(t.status) }}</span>
              <span class="hub-task__title">{{ t.title }}</span>
              <span v-if="t.status === 'running' && typeof t.progress === 'number'" class="hub-task__bar"><i :style="{ width: (t.progress || 0) + '%' }" /></span>
            </div>
            <button class="hub-btn hub-btn--quiet" type="button" @click="router.push('/teacher-v3/today')">在教师端查看全部 →</button>
          </template>
        </div>

        <div v-if="can('student')" class="hub-row">
          <span class="hub-row__label">最近学习会话</span>
          <strong>{{ sdRecent >= 0 ? sdRecent + ' 个' : '读取失败' }}</strong>
          <button v-if="sdRecent >= 0" class="hub-btn hub-btn--quiet" type="button" @click="router.push('/dialog')">继续学习 →</button>
        </div>

        <div class="hub-row">
          <span class="hub-row__label">科研运行中心（独立身份）</span>
          <button class="hub-btn hub-btn--quiet" type="button" @click="router.push('/hub/research')">打开展示 →</button>
        </div>

        <div v-if="can('admin')" class="hub-row">
          <span class="hub-row__label">平台任务与错误定位</span>
          <button class="hub-btn hub-btn--quiet" type="button" @click="router.push('/admin/overview')">进入管理后台 →</button>
        </div>
      </section>

      <!-- ===== 端运行状态 ===== -->
      <section class="hub-foot">
        <div class="hub-foot__item"><i class="hub-dot" :class="'hub-dot--' + statusColor(statusLabel(health.platform))" /> 学生平台 API：{{ statusLabel(health.platform) }}</div>
        <div class="hub-foot__item"><i class="hub-dot" :class="'hub-dot--' + statusColor(health.student)" /> 学生 AI 服务：{{ statusLabel(health.student) }}</div>
        <div class="hub-foot__item"><i class="hub-dot" :class="'hub-dot--' + statusColor(health.teacher)" /> 教师平台 API：{{ statusLabel(health.teacher) }}</div>
        <div class="hub-foot__item"><i class="hub-dot hub-dot--mute" /> 科研端：独立地址 <code>http://127.0.0.1:5173</code></div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.hub { min-height: 100vh; background: var(--ed-wash); color: var(--ed-ink); font-family: var(--ed-font-sans); }
/* 顶栏 */
.hub-top { display: flex; align-items: center; justify-content: space-between; padding: 14px 28px; border-bottom: 1px solid var(--ed-line); background: var(--ed-paper-warm); }
.hub-brand { display: flex; align-items: baseline; gap: 10px; }
.hub-brand__mark { font-family: var(--ed-font-serif); font-size: 22px; color: var(--ed-pine); }
.hub-brand__name { font-size: 17px; font-weight: 700; letter-spacing: 0.02em; }
.hub-brand__tag { font-size: 12px; color: var(--ed-ink-3); border: 1px solid var(--ed-line-strong); border-radius: 999px; padding: 2px 10px; }
.hub-top__right { display: flex; align-items: center; gap: 14px; }
.hub-err { color: var(--ed-err); font-size: 13px; }
.hub-body { max-width: 1080px; margin: 0 auto; padding: 36px 24px 60px; }
/* 首屏 */
.hub-hero { margin-bottom: 30px; }
.hub-hero__eyebrow { font-size: 12px; letter-spacing: 0.18em; color: var(--ed-sienna); text-transform: uppercase; margin: 0 0 10px; }
.hub-hero__title { font-family: var(--ed-font-serif); font-size: 28px; line-height: 1.35; margin: 0 0 10px; font-weight: 600; }
.hub-hero__sub { color: var(--ed-ink-2); margin: 0 0 12px; font-size: 14px; }
.hub-role-chip { display: inline-block; background: var(--ed-pine-soft); color: var(--ed-pine); border-radius: 4px; padding: 2px 10px; font-weight: 600; font-size: 13px; }
.hub-roles { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.hub-roles__label { font-size: 13px; color: var(--ed-ink-3); }
.hub-role-switch { border: 1px solid var(--ed-pine-line); background: #fff; color: var(--ed-pine); border-radius: 999px; padding: 4px 14px; font-size: 13px; cursor: pointer; }
.hub-role-switch:hover { background: var(--ed-pine-soft); }
.hub-role-switch.disabled { opacity: 0.45; cursor: default; background: var(--ed-pine-soft); }
/* 入口卡片 */
.hub-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 16px; margin-bottom: 30px; }
.hub-card { background: var(--ed-paper); border: 1px solid var(--ed-line); border-radius: var(--ed-radius-lg); padding: 18px 20px; cursor: pointer; box-shadow: var(--ed-shadow-panel); transition: transform 0.12s ease, border-color 0.12s ease; }
.hub-card:hover { transform: translateY(-2px); border-color: var(--ed-pine-line); }
.hub-card--locked { opacity: 0.78; cursor: not-allowed; }
.hub-card__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.hub-card__icon { font-family: var(--ed-font-serif); font-size: 26px; color: var(--ed-pine); }
.hub-status { font-size: 12px; padding: 2px 9px; border-radius: 999px; }
.hub-status--ok { background: var(--ed-ok-soft); color: var(--ed-ok); }
.hub-status--warn { background: var(--ed-warn-soft); color: var(--ed-warn); }
.hub-status--err { background: var(--ed-err-soft); color: var(--ed-err); }
.hub-status--mute { background: #f1efe7; color: var(--ed-ink-3); }
.hub-card__title { font-size: 17px; margin: 0 0 6px; font-weight: 700; }
.hub-card__sub { font-size: 13px; color: var(--ed-ink-2); margin: 0 0 10px; line-height: 1.5; }
.hub-card__iso { font-size: 12px; color: var(--ed-ink-3); margin-bottom: 8px; }
.hub-card__go { font-size: 13px; color: var(--ed-pine); font-weight: 600; }
/* 任务面板 */
.hub-panel { background: var(--ed-paper); border: 1px solid var(--ed-line); border-radius: var(--ed-radius-lg); padding: 20px 22px; margin-bottom: 26px; }
.hub-panel__head { display: flex; align-items: baseline; justify-content: space-between; border-bottom: 1px solid var(--ed-line); padding-bottom: 10px; margin-bottom: 12px; }
.hub-panel__head h2 { font-size: 16px; margin: 0; }
.hub-panel__note { font-size: 12px; color: var(--ed-ink-3); }
.hub-taskwrap { display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px; }
.hub-task { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.hub-tag { font-size: 11px; padding: 2px 8px; border-radius: 4px; white-space: nowrap; }
.hub-tag--ok { background: var(--ed-ok-soft); color: var(--ed-ok); }
.hub-tag--err { background: var(--ed-err-soft); color: var(--ed-err); }
.hub-tag--warn { background: var(--ed-warn-soft); color: var(--ed-warn); }
.hub-tag--mute { background: #f1efe7; color: var(--ed-ink-3); }
.hub-task__title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hub-task__bar { flex: 1; height: 6px; background: #eee; border-radius: 999px; overflow: hidden; }
.hub-task__bar i { display: block; height: 100%; background: var(--ed-pine); }
.hub-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; font-size: 13px; color: var(--ed-ink-2); }
.hub-row__label { flex: 1; }
.hub-empty { color: var(--ed-ink-3); font-size: 13px; margin: 0; }
.hub-btn { border: none; background: none; cursor: pointer; font-size: 13px; color: var(--ed-pine); font-weight: 600; }
.hub-btn:hover { text-decoration: underline; }
.hub-btn--ghost { border: 1px solid var(--ed-line-strong); border-radius: 6px; padding: 6px 14px; color: var(--ed-ink-2); }
.hub-btn--ghost:hover { text-decoration: none; background: var(--ed-pine-soft); }
.hub-btn--quiet { color: var(--ed-pine); white-space: nowrap; }
/* 端状态脚注 */
.hub-foot { display: flex; flex-wrap: wrap; gap: 14px 24px; padding-top: 6px; font-size: 12px; color: var(--ed-ink-3); }
.hub-foot__item { display: flex; align-items: center; gap: 7px; }
.hub-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.hub-dot--ok { background: var(--ed-ok); }
.hub-dot--warn { background: var(--ed-warn); }
.hub-dot--err { background: var(--ed-err); }
.hub-dot--mute { background: var(--ed-line-strong); }
.hub-foot code { background: var(--ed-paper-warm); padding: 1px 6px; border-radius: 4px; font-family: var(--ed-font-mono); }
</style>