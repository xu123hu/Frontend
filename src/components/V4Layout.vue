<template>
  <div class="layout" :class="{ collapsed }">
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

      <div
        v-for="item in coreNav" :key="item.key"
        class="nav-item" :class="{ active: isActive(item) }" :data-tip="item.name"
        @click="go(item)"
      >
        <span class="icon">{{ item.icon }}</span>
        <span class="txt">{{ item.name }}</span>
        <span v-if="item.badge" class="badge" :style="item.badgeStyle">{{ item.badge }}</span>
        <span v-else-if="item.new" class="new">{{ item.new }}</span>
      </div>

      <h4>考试 & 班级</h4>
      <div
        v-for="item in examNav" :key="item.key"
        class="nav-item" :class="{ active: isActive(item) }" :data-tip="item.name"
        @click="go(item)"
      >
        <span class="icon">{{ item.icon }}</span>
        <span class="txt">{{ item.name }}</span>
        <span v-if="item.badge" class="badge" :style="item.badgeStyle">{{ item.badge }}</span>
        <span v-else-if="item.new" class="new">{{ item.new }}</span>
      </div>

      <div class="group-toggle" :class="{ collapsed: !labOpen }" data-tip="实验室" @click="toggleLab">
        <span class="arr">▼</span><span>实验室</span>
        <span style="margin-left:auto;font-size:10px;background:var(--bg2);padding:1px 6px;border-radius:99px;">{{ labNav.length }}</span>
      </div>
      <template v-if="labOpen">
        <div
          v-for="item in labNav" :key="item.key"
          class="nav-item" :class="{ active: isActive(item) }" :data-tip="item.name"
          @click="go(item)"
        >
          <span class="icon">{{ item.icon }}</span>
          <span class="txt">{{ item.name }}</span>
          <span v-if="item.new" class="new">{{ item.new }}</span>
          <span v-else-if="item.unconfigured" style="margin-left:auto;font-size:9.5px;color:var(--ink3);">未配置</span>
        </div>
      </template>

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

      <div class="progress-card">
        <div class="lbl">本周综合分</div>
        <template v-if="overviewError">
          <div class="val" style="font-size:14px;color:var(--ink3);">加载失败</div>
          <div class="sub">学情数据暂时不可用</div>
        </template>
        <template v-else-if="!overview">
          <div class="val" style="font-size:14px;color:var(--ink3);">加载中…</div>
        </template>
        <template v-else-if="!overview.composite_score">
          <div class="val">--</div>
          <div class="sub">完成首次测评后生成综合分</div>
        </template>
        <template v-else>
          <div class="val">{{ overview.score_delta_week >= 0 ? '+' : '' }}{{ overview.score_delta_week }}<span style="font-size:13px;color:var(--ink2);">分</span></div>
          <div class="sub">从 {{ overview.last_week_score }} → {{ overview.composite_score }}<br/>距期末目标 {{ overview.target_score }} 还差 <b>{{ Math.max(overview.target_score - overview.composite_score, 0) }} 分</b></div>
        </template>
      </div>
    </aside>

    <!-- ===== 主内容区（折叠时自动占满剩余宽度） ===== -->
    <main class="main">
      <router-view v-slot="{ Component }">
        <transition name="view-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- ===== 右侧面板（v4 原样） ===== -->
    <aside class="right-panel">
      <template v-if="panelError">
        <div class="heading">⏰ 今晚任务 · 黄金时段</div>
        <div style="font-size:12px;color:var(--ink3);padding:10px 4px;">面板数据加载失败，请稍后刷新重试</div>
      </template>
      <template v-else-if="panelLoading">
        <div class="heading">⏰ 今晚任务 · 黄金时段</div>
        <div style="font-size:12px;color:var(--ink3);padding:10px 4px;">加载中…</div>
      </template>
      <template v-else-if="panel">
        <div class="heading">⏰ 今晚任务 · 黄金时段</div>
        <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);padding:11px 14px;border-radius:10px;border:1px solid var(--warn-border);margin-bottom:14px;">
          <div style="font-size:11.5px;font-weight:800;color:var(--warn-deep);margin-bottom:3px;">{{ panel.golden_window?.start || '--' }} - {{ panel.golden_window?.end || '--' }}</div>
          <div style="font-size:12px;line-height:1.5;color:var(--ink);">{{ panel.golden_window?.label || '黄金时段学习中' }}</div>
        </div>

        <div class="heading">📋 今日行动</div>
        <div class="quick">
          <div
            v-for="a in panel.today_actions || []" :key="a.key"
            class="quick-item" :style="a.count ? '' : 'opacity:.45;'"
            @click="goAction(a)"
          >
            <div class="ic" :style="actionIconStyle(a.key)">{{ actionIcon(a.key) }}</div>
            <div class="text">{{ a.title }}</div><div v-if="a.count" class="num">{{ a.count }}</div>
          </div>
          <div v-if="!(panel.today_actions || []).length" style="font-size:12px;color:var(--ink3);padding:6px 4px;">今日暂无行动安排</div>
        </div>

        <div class="heading">📊 本周速览</div>
        <div class="quick">
          <div class="quick-item" @click="info(independentRateTip)">
            <div class="ic" style="background:var(--ok-bg);color:var(--ok-deep);">⚡</div>
            <div class="text">独立解题率</div><div class="num">{{ independentRateText }}</div>
          </div>
          <div class="quick-item" @click="info(scoreDeltaTip)">
            <div class="ic" style="background:var(--indigo-soft);color:var(--indigo);">📈</div>
            <div class="text">本周提分</div><div class="num">{{ scoreDeltaText }}</div>
          </div>
          <div class="quick-item" @click="info(streakTip)">
            <div class="ic" style="background:var(--peach-soft);color:var(--peach);">🔥</div>
            <div class="text">连击天数</div><div class="num">{{ streakDays > 0 ? streakDays : '--' }}</div>
          </div>
        </div>

        <div class="encourage">
          <div class="em">🌱</div>
          <div class="txt">{{ panel.encouragement || '继续保持，每天进步一点点。' }}</div>
        </div>

        <div class="heading">⚡ 考前倒计时</div>
        <div style="text-align:center;padding:13px;background:linear-gradient(135deg,#fef2f2,#fee2e2);border-radius:10px;border:1px solid var(--err-border);">
          <div style="font-family:var(--font-num);font-size:30px;font-weight:900;color:var(--err-deep);">{{ panel.gaokao_countdown?.days ?? '--' }}<span style="font-size:14px;color:var(--ink2);">天</span></div>
          <div style="font-size:11.5px;color:var(--ink2);margin-top:2px;">距 {{ gaokaoYear }} 高考</div>
          <button
            style="margin-top:8px;padding:6px 12px;background:var(--err);color:#fff;border:none;border-radius:6px;font:inherit;font-size:11px;font-weight:700;cursor:pointer;"
            @click="$router.push('/exam')"
          >→ 去做真题</button>
        </div>
      </template>
    </aside>
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

const coreNav = [
  { key: 'overview', icon: '🏠', name: '学情总览', to: '/overview' },
  { key: 'dialog', icon: '💬', name: '对话学习', to: '/dialog', badge: '1' },
  { key: 'practice', icon: '🎯', name: '练题中心', to: '/practice', badge: '沉浸', badgeStyle: { background: 'var(--brand)' } },
  { key: 'errors', icon: '📕', name: '错题本', to: '/errors', badge: '3' },
  { key: 'report', icon: '📈', name: '学情报告', to: '/report' },
  { key: 'graph', icon: '🧠', name: '知识图谱', to: '/graph' },
]
const examNav = [
  { key: 'exam', icon: '📝', name: '模拟考试', to: '/exam', new: 'NEW' },
  { key: 'class', icon: '🏫', name: '我的班级', to: '/class', new: 'NEW' },
  { key: 'tasks', icon: '📋', name: '课堂任务', to: '/tasks', new: 'NEW' },
]
const labNav = [
  { key: 'dual', icon: '🎬', name: '双师课堂', to: '/dual', new: 'NEW' },
  { key: 'resource', icon: '📚', name: '资源推荐', to: '/resource', new: 'NEW' },
  { key: 'memories', icon: '🗂️', name: '记忆管理', to: '', unconfigured: true },
  { key: 'voice', icon: '🎙️', name: '语音讲解', to: '', unconfigured: true },
  { key: 'visual', icon: '📈', name: '可视化讲解', to: '', unconfigured: true },
  { key: 'derive', icon: '✅', name: '推导检查', to: '', unconfigured: true },
  { key: 'replay', icon: '🔁', name: '课堂回溯', to: '', unconfigured: true },
  { key: 'resource2', icon: '📖', name: '资源推荐', to: '', unconfigured: true },
  { key: 'daily', icon: '👣', name: '每日任务', to: '', unconfigured: true },
  { key: 'guest', icon: '🧪', name: '游客演示', to: '', unconfigured: true },
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
const avatarChar = computed(() => auth.user?.avatar || (auth.nickname || '同').slice(0, 1))

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
</style>
