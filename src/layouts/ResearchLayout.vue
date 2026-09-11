<template>
  <div class="research-end">
    <header class="re-topbar">
      <div class="re-brand">
        <div class="re-logo">∫</div>
        <div><b>智学数研</b><small>科研端 · 论文阅读与写作</small></div>
      </div>
      <nav class="re-nav" aria-label="科研端导航">
        <RouterLink class="re-nav-item" :class="{ active: isActive('/research') }" to="/research">首页</RouterLink>
        <RouterLink class="re-nav-item" :class="{ active: isActive('/research/library') }" to="/research/library">文献库 <span v-if="paperTotal" class="re-count">{{ paperTotal }}</span></RouterLink>
        <RouterLink class="re-nav-item" :class="{ active: isActive('/research/writing') }" to="/research/writing">写作</RouterLink>
        <RouterLink class="re-nav-item" :class="{ active: isActive('/research/tasks') }" to="/research/tasks">任务</RouterLink>
      </nav>
      <div class="re-topbar-right">
        <div class="re-user" @mouseleave="menuOpen = false">
          <button type="button" class="re-user-chip" :title="`当前角色：${auth.activeRole || '—'}`" @click="menuOpen = !menuOpen">
            {{ displayName }} <span class="re-user-caret">▾</span>
          </button>
          <div v-if="menuOpen" class="re-user-menu" @click.stop>
            <div class="re-user-menu__head">
              <b>{{ displayName }}</b>
              <span>身份：{{ roleLabel }}</span>
              <span v-if="auth.user?.phone">手机：{{ auth.user.phone }}</span>
            </div>
            <button type="button" class="re-user-menu__item re-user-menu__item--danger" @click="onLogout">退出登录</button>
          </div>
        </div>
      </div>
    </header>
    <main class="re-main">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useResearchStore } from '@/stores/research'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const rstore = useResearchStore()

const menuOpen = ref(false)
const displayName = computed(() => auth.nickname || '科研用户')
const roleLabel = computed(() => auth.activeRole === 'teacher' ? '教师' : auth.activeRole === 'researcher' ? '科研人员' : auth.activeRole === 'admin' ? '管理员' : '学生')
const paperTotal = computed(() => rstore.total || '')

function isActive(prefix) {
  return route.path === prefix || (prefix !== '/research' && route.path.startsWith(prefix + '/'))
}

async function onLogout() {
  menuOpen.value = false
  try { await auth.logout() } catch { /* 令牌已失效时也照常跳转 */ }
  router.push('/login')
}

onMounted(async () => {
  if (rstore.summaryLoaded) return
  try {
    await rstore.fetchSummary()
    if (rstore.total && !rstore.collections.length) await rstore.fetchCollections()
  } catch { /* 首页再积极重试 */ }
})
watch(() => route.path, () => {
  if (rstore.total === 0 && !rstore.summaryLoaded) rstore.fetchSummary()
})
</script>

<style scoped>
.re-count { font-size: 10px; color: var(--re-green, #16a675); font-weight: 600; margin-left: 2px; }
</style>