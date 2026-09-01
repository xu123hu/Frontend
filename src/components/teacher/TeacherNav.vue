<template>
  <nav class="t-nav" aria-label="教师工作台导航">
    <router-link
      v-for="item in nav"
      :key="item.to"
      :to="item.to"
      class="t-nav-btn"
      :class="{ active: $route.path === item.to }"
    >
      <span class="t-nav-icon" aria-hidden="true">{{ item.icon }}</span>
      <span>{{ item.name }}</span>
      <span v-if="item.badge" class="t-nav-badge">{{ item.badge }}</span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { gradingWorkspaceApi } from '@/api/teacher/gradingWorkspace'

const route = useRoute()
/** 角标唯一数据源 = V2 workspace 批改队列剩余数（V1 queue 已收敛删除） */
const ungradedRemaining = ref<number | null>(null)

async function refreshBadge() {
  // 失败静默：角标缺失只是少一个数字，不打扰教师主流程
  try {
    const res = await gradingWorkspaceApi.get({ status: 'ungraded' })
    const remaining = (res.data as any)?.context?.progress?.remaining
    ungradedRemaining.value = typeof remaining === 'number' && remaining > 0 ? remaining : null
  } catch { ungradedRemaining.value = null }
}

onMounted(refreshBadge)
// 离开批改页时刷新角标（批改页内确认后由下次进入时刷新，避免打断教师当前份）
watch(() => route.path, (path) => { if (path !== '/teacher/grading') void refreshBadge() })

const nav = computed(() => [
  { to: '/teacher/today', icon: '⌂', name: '今天' },
  { to: '/teacher/prep', icon: '✎', name: '备课' },
  { to: '/teacher/assign', icon: '▤', name: '作业测验' },
  { to: '/teacher/grading', icon: '✓', name: '批改', badge: ungradedRemaining.value },
  { to: '/teacher/classroom', icon: '▶', name: '课堂' },
  { to: '/teacher/classes', icon: '👥', name: '班级' },
  { to: '/teacher/resources', icon: '▣', name: '资源' },
  { to: '/teacher/profile', icon: '◉', name: '我' },
])
</script>
