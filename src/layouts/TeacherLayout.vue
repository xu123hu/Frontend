<template>
  <div class="tdr-layout">
    <header class="tdr-topbar">
      <button class="tdr-icobtn" type="button" :aria-expanded="navOpen" aria-label="切换导航" @click="navOpen = !navOpen">☰</button>
      <div class="tdr-brand">
        <span class="tdr-mark" aria-hidden="true">π</span>
        <span class="tdr-brand-name">智学数研</span>
        <span class="tdr-sub">教师端</span>
      </div>
      <div class="tdr-spacer"></div>
      <span class="tdr-role muted">{{ auth.nickname }}</span>
      <button v-if="auth.roles.includes('student')" class="tdr-icobtn" type="button" title="切换到学生端" aria-label="切换到学生端" @click="switchTo('student')">🎓</button>
      <button class="tdr-icobtn" type="button" title="退出登录" aria-label="退出登录" @click="logout">⎋</button>
      <button class="tdr-icobtn" type="button" :aria-expanded="butlerOpen" aria-label="打开 AI 教学助手" @click="butlerOpen = !butlerOpen">🤖</button>
    </header>

    <aside class="tdr-nav" :class="{ open: navOpen }" aria-hidden="false">
      <TeacherNav />
    </aside>
    <div v-if="navOpen" class="tdr-scrim" @click="navOpen = false"></div>

    <main class="tdr-main">
      <TeacherContextBar />
      <RouterView class="tdr-view" />
    </main>

    <aside class="tdr-butler" :class="{ open: butlerOpen }">
      <ButlerPanel />
    </aside>
    <div v-if="butlerOpen" class="tdr-scrim butler" @click="butlerOpen = false"></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTeacherContextStore } from '@/stores/teacher/context'
import TeacherNav from '@/components/teacher/TeacherNav.vue'
import TeacherContextBar from '@/components/teacher/TeacherContextBar.vue'
import ButlerPanel from '@/components/teacher/ButlerPanel.vue'

const auth = useAuthStore()
const router = useRouter()
const navOpen = ref(false)
const butlerOpen = ref(false)

/** 角色切换（教师 → 学生）：换发 JWT 后回到学生首页 */
async function switchTo(role: string) {
  try {
    await auth.switchRole(role)
    useTeacherContextStore().reset()
    router.push('/overview')
  } catch { /* 未绑定该角色时静默 */ }
}

function logout() {
  auth.logout()
  router.push('/login')
}
</script>