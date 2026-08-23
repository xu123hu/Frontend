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
import { computed } from 'vue'
import { useGradingStore } from '@/stores/teacher/grading'

const gradingStore = useGradingStore()

const nav = computed(() => [
  { to: '/teacher/today', icon: '⌂', name: '今天' },
  { to: '/teacher/prep', icon: '✎', name: '备课' },
  { to: '/teacher/assign', icon: '▤', name: '作业测验' },
  { to: '/teacher/grading', icon: '✓', name: '批改', badge: gradingStore.queue.length > 0 ? gradingStore.queue.length : null },
  { to: '/teacher/classroom', icon: '▶', name: '课堂' },
  { to: '/teacher/classes', icon: '👥', name: '班级' },
  { to: '/teacher/resources', icon: '▣', name: '资源' },
])
</script>
