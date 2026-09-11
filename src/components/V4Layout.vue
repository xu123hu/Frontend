<template>
  <div class="layout" :class="{ collapsed }">
    <!-- PHASE 6 氛围光斑层（student-next 同款三光斑，pointer-events:none 不挡交互） -->
    <div class="ambient" aria-hidden="true">
      <span class="ambient-b1"></span><span class="ambient-b2"></span><span class="ambient-b3"></span>
    </div>
    <!-- ===== 顶部栏（无导航/搜索；保留 Logo + 连击 + 用户头像→个人中心） ===== -->
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          <div class="mark">π</div>
          <span>智学数研</span>
          <span class="sub">学生端</span>
        </div>
        <div class="spacer"></div>
        <div class="right">
          <span class="streak" :title="streakTitle">
            <span class="ic">🔥</span>
            <span v-if="streakDays > 0"><span class="num">{{ streakDays }}</span> 连击</span>
            <span v-else>开始第 1 天</span>
          </span>
          <router-link to="/profile" class="user-chip" title="点击进入个人中心">
            <div class="avatar">{{ avatarChar }}</div>
            <div class="text">
              <span class="name">{{ auth.nickname }}</span>
              <span class="sub">{{ auth.user?.grade || '' }}</span>
            </div>
          </router-link>
        </div>
      </div>
    </header>

    <!-- ===== 左侧边栏（可折叠：折叠后仅图标 + hover 提示；标题已在顶部栏） ===== -->
    <aside class="sidebar">
      <!-- 第一行：学习闭环 标题 + 折叠按钮（齐平，整体上移） -->
      <div class="sb-nav-head">
        <h4>学习闭环</h4>
        <button class="collapse-btn" :title="collapsed ? '展开侧边栏' : '收起侧边栏'" @click="toggleCollapsed">
          {{ collapsed ? '»' : '«' }}
        </button>
      </div>

      <!-- 第二轮布局重构：导航 13→6（V2 文档 §6 强制） -->
      <div
        v-for="item in mainNav" :key="item.key"
        class="nav-item" :class="{ active: isActive(item) }" :data-tip="item.name"
        @click="go(item)"
      >
        <span class="icon">{{ item.icon }}</span>
        <span class="txt">{{ item.name }}</span>
        <span v-if="item.badge" class="badge" :style="item.badgeStyle">{{ item.badge }}</span>
        <span v-else-if="item.new" class="new">{{ item.new }}</span>
      </div>


      <!-- ===== 下半区：对话历史（仅在 /dialog 路由显示 + 折叠时隐藏） ===== -->
      <div v-if="!collapsed && isDialogRoute" v-show="!collapsed && isDialogRoute" class="sb-convs">
        <button class="btn btn-primary btn-sm sb-new" @click="onNewConv">＋ 新对话</button>
        <ConversationSidebar
          :conversations="conv.items"
          :active-id="conv.activeId"
          :loading="conv.loading"
          :has-more="conv.hasMore"
          @select="onSelectConv"
          @remove="onRemoveConv"
          @rename="conv.rename"
          @toggle-pin="conv.togglePin"
          @search="conv.search"
          @load-more="conv.loadMore"
        />
      </div>

    </aside>

    <!-- ===== 主内容区（折叠时自动占满剩余宽度） ===== -->
    <main class="main" :class="{ 'main--dialog': isDialogRoute }">
      <router-view v-slot="{ Component }">
        <transition name="view-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>


    <!-- AI 管家悬浮球：后台任务中心 + 站内通知（仅登录学生态显示） -->
    <FloatingButler v-if="auth.isLoggedIn" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { useConvStore } from '@/stores/conv'
import { useSkillStore } from '@/stores/skill'
import ConversationSidebar from '@/components/chat/ConversationSidebar.vue'
import FloatingButler from '@/components/butler/FloatingButler.vue'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()
const auth = useAuthStore()
const conv = useConvStore()
const skillStore = useSkillStore()

const collapsed = ref(localStorage.getItem('ma_sidebar_collapsed') === '1')
// v4 原文件实验室默认收起
const labOpen = ref(localStorage.getItem('ma_lab_open') === '1')

function toggleCollapsed() {
  collapsed.value = !collapsed.value
  localStorage.setItem('ma_sidebar_collapsed', collapsed.value ? '1' : '0')
}
function toggleLab() {
  labOpen.value = !labOpen.value
  localStorage.setItem('ma_lab_open', labOpen.value ? '1' : '0')
}

// 第二轮布局重构：导航 13→6（学情总览删/报告+图谱入"我的"/模拟考入练题/班级任务入课堂/资源入知识库）
const mainNav = [
  { key: 'home', icon: '🏠', name: '首页', to: '/dialog', badge: '1' },
  { key: 'practice', icon: '✏️', name: '练题', to: '/practice', badge: '沉浸', badgeStyle: { background: 'var(--brand)' } },
  { key: 'errors', icon: '📕', name: '错题', to: '/errors', badge: '3' },
  { key: 'library', icon: '📚', name: '知识库', to: '/library' },
  { key: 'classroom', icon: '🎓', name: '课堂', to: '/classroom' },
  { key: 'me', icon: '👤', name: '我的', to: '/me' },
]

const isActive = (item) => route.path === item.to || (item.to && route.path.startsWith(item.to + '/'))

function go(item) {
  if (item.to) {
    router.push(item.to)
  } else if (item.badge) {
    toast.info(`${item.name}：${item.badge}`)
  } else {
    toast.info(`${item.name}（该功能尚未配置）`)
  }
}

/** 是否处于对话学习路由（控制侧边栏历史模块的显隐） */
const isDialogRoute = computed(() => route.path.startsWith('/dialog'))
// P1-8:对话页 main 去掉全局内边距,让对话区直接贴边铺满(去掉白色卡片与左右大留白)
function info(text) {
  toast.info(text)
}

/* ===== 顶栏 / 右侧全局面板（growth/overview + growth/panel） ===== */
const overview = ref(null)
const overviewError = ref(false)
const panel = ref(null)
const panelLoading = ref(true)
const panelError = ref(false)

const streakDays = computed(() => {
  const d = panel.value?.week_brief?.streak_days ?? overview.value?.streak_days
  return Number.isFinite(d) ? d : 0
})
const streakTitle = computed(() =>
  streakDays.value > 0 ? `连续学习 ${streakDays.value} 天 · 继续加油 🔥` : '今天开始第 1 天学习')
// 头像字符：username 优先，其次 nickname 首字（用户要求显示用户名）
const avatarChar = computed(() => auth.user?.avatar || (auth.user?.username || auth.nickname || '同').slice(0, 1))

const independentRateText = computed(() => {
  const r = panel.value?.week_brief?.independent_rate
  return r ? `${Math.round(r * 100)}%` : '--'
})
const independentRateTip = computed(() =>
  independentRateText.value === '--' ? '本周暂无独立解题数据' : `独立解题率 ${independentRateText.value}`)
const scoreDeltaText = computed(() => {
  const d = panel.value?.week_brief?.score_delta
  return d ? (d > 0 ? `+${d}` : `${d}`) : '--'
})
const scoreDeltaTip = computed(() => {
  const d = panel.value?.week_brief?.score_delta
  return d ? `本周提分 ${scoreDeltaText.value}：${overview.value?.last_week_score ?? '--'} → ${overview.value?.composite_score ?? '--'}` : '本周暂无提分数据'
})
const streakTip = computed(() =>
  streakDays.value > 0 ? `已连续学习 ${streakDays.value} 天，继续保持 🔥` : '今天开始第 1 天学习，加油')
const gaokaoYear = computed(() => {
  const d = panel.value?.gaokao_countdown?.exam_date
  return d ? String(d).slice(0, 4) : new Date().getFullYear() + 1
})

/** 今日行动图标：按后端 key 映射，保留 v4 配色 */
const ACTION_ICON_MAP = {
  review_errors: { icon: '📕', style: { background: 'var(--err-bg)', color: 'var(--err)' } },
  variant_drill: { icon: '🎯', style: { background: 'var(--brand-soft)', color: 'var(--brand-deep)' } },
  final_challenge: { icon: '🔥', style: { background: 'var(--purple-soft)', color: 'var(--purple)' } },
  teacher_homework: { icon: '📝', style: { background: 'var(--cyan-soft)', color: 'var(--cyan)' } },
}
const DEFAULT_ACTION_ICON = { icon: '✅', style: { background: 'var(--bg2)', color: 'var(--ink2)' } }
function actionIcon(key) { return (ACTION_ICON_MAP[key] || DEFAULT_ACTION_ICON).icon }
function actionIconStyle(key) { return (ACTION_ICON_MAP[key] || DEFAULT_ACTION_ICON).style }
function goAction(a) {
  if (a.route) router.push(a.route).catch(() => {})
  else toast.info(`${a.title}（暂未配置入口）`)
}

async function loadOverview() {
  overviewError.value = false
  try {
    overview.value = await api.get('/student/growth/overview')
  } catch (e) {
    overviewError.value = true
    console.warn('[V4Layout] growth/overview 加载失败：', e?.message || e)
  }
}
async function loadPanel() {
  panelLoading.value = true
  panelError.value = false
  try {
    panel.value = await api.get('/student/growth/panel')
  } catch (e) {
    panelError.value = true
    console.warn('[V4Layout] growth/panel 加载失败：', e?.message || e)
  } finally {
    panelLoading.value = false
  }
}

/* ===== 对话历史（侧边栏下半区） ===== */
onMounted(() => {
  conv.load()
  loadOverview()
  loadPanel()
  // 刷新用户资料（昵称/年级），失败静默降级为本地缓存
  if (auth.isLoggedIn) auth.refreshMe().catch(() => {})
})

/** 选中会话：切到对话页并打开该会话；已在对话页时仅切换会话 */
function onSelectConv(id) {
  conv.select(id)
  if (route.path.startsWith('/dialog')) {
    router.push(`/dialog/${id}`).catch(() => {})
  } else {
    router.push(`/dialog/${id}`).catch(() => {})
  }
}

async function onNewConv() {
  try {
    const c = await conv.create()
    skillStore.resetDefault()
    router.push(`/dialog/${c.id}`).catch(() => {})
  } catch (e) {
    toast.error(e?.message || '新建会话失败')
  }
}

async function onRemoveConv(id) {
  const ok = await conv.remove(id)
  if (ok && route.path.startsWith('/dialog/')) {
    router.push('/dialog').catch(() => {})
  }
}
</script>

<style scoped>
.view-fade-enter-active, .view-fade-leave-active { transition: opacity .2s ease, transform .2s ease; }
.view-fade-enter-from { opacity: 0; transform: translateY(6px); }
.view-fade-leave-to { opacity: 0; }

/* 顶部栏已有标题；侧边栏第一行 = 学习闭环标题 + 折叠按钮（齐平） */
.sb-nav-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.sb-nav-head h4 { margin: 0; }
.layout.collapsed .sb-nav-head { justify-content: center; margin-bottom: 2px; }

/* ===== 对话历史模块（侧边栏下半区） ===== */
.sb-convs { margin-top: 14px; border-top: 1px solid var(--line); padding-top: 12px; }
.sb-new { width: 100%; }
/* 选中高亮与侧边栏导航 active 态完全统一（v4 brand-soft 底 + brand-deep 字） */
.sb-convs :deep(.cs-item.active) { background: var(--brand-soft); }
.sb-convs :deep(.cs-item.active .cs-item-title) { color: var(--brand-deep); font-weight: 700; }
.sb-convs :deep(.cs-item:hover) { background: var(--bg2); }
.sb-convs :deep(.cs-item.active:hover) { background: var(--brand-soft); }
.sb-convs :deep(.cs-item-time) { color: var(--ink3); }

/* PHASE 6 氛围光斑层 */
.ambient { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.ambient-b1 { position: absolute; top: -80px; left: -60px; width: 420px; height: 420px; border-radius: 50%;
  background: rgba(99, 102, 241, .10); filter: blur(70px); }
.ambient-b2 { position: absolute; top: -40px; right: -80px; width: 380px; height: 380px; border-radius: 50%;
  background: rgba(6, 182, 212, .08); filter: blur(70px); }
.ambient-b3 { position: absolute; bottom: -100px; left: 30%; width: 460px; height: 460px; border-radius: 50%;
  background: rgba(124, 58, 237, .07); filter: blur(80px); }
</style>
