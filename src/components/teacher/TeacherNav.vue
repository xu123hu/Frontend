<template>
  <nav class="tnav" aria-label="教师工作台导航">
    <router-link
      v-for="item in nav"
      :key="item.to"
      :to="item.to"
      class="tnav-item"
      :class="{ active: $route.path === item.to }"
    >
      <span class="tnav-icon" aria-hidden="true">{{ item.icon }}</span>
      <span class="tnav-txt">{{ item.name }}</span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
const nav = [
  { to: '/teacher/today', icon: '📆', name: '今天' },
  { to: '/teacher/prep', icon: '📝', name: '备课' },
  { to: '/teacher/assign', icon: '📚', name: '布置作业' },
  { to: '/teacher/grading', icon: '✏️', name: '批改' },
  { to: '/teacher/classroom', icon: '🏫', name: '课堂' },
  { to: '/teacher/classes', icon: '👥', name: '班级' },
  { to: '/teacher/resources', icon: '🗂️', name: '资源' },
] as const
</script>