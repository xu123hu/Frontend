<template>
  <nav class="rs-nav" aria-label="科研端导航">
    <!-- 概览组 -->
    <div class="rs-nav-group">
      <span class="rs-nav-group-title">概览</span>
      <router-link
        v-for="item in overviewNav"
        :key="item.to"
        :to="item.to"
        class="rs-nav-item"
        :class="{ active: isActive(item.to) }"
      >
        <span class="rs-nav-icon" aria-hidden="true">{{ item.icon }}</span>
        <span class="rs-nav-text">{{ item.name }}</span>
        <span v-if="item.badge" class="rs-nav-badge">{{ item.badge }}</span>
      </router-link>
    </div>

    <!-- 研究流程组 -->
    <div class="rs-nav-group">
      <span class="rs-nav-group-title">研究流程</span>
      <router-link
        v-for="item in researchNav"
        :key="item.to"
        :to="item.to"
        class="rs-nav-item"
        :class="{ active: isActive(item.to) }"
      >
        <span class="rs-nav-icon" aria-hidden="true">{{ item.icon }}</span>
        <span class="rs-nav-text">{{ item.name }}</span>
        <span v-if="item.badge" class="rs-nav-badge" :class="{ alert: item.alert }">{{ item.badge }}</span>
        <span v-if="item.live" class="rs-nav-live">
          <span class="rs-nav-live-dot"></span>
          LIVE
        </span>
      </router-link>
    </div>

    <!-- 专项组 -->
    <div class="rs-nav-group">
      <span class="rs-nav-group-title">专项</span>
      <router-link
        v-for="item in specialNav"
        :key="item.to"
        :to="item.to"
        class="rs-nav-item"
        :class="{ active: isActive(item.to) }"
      >
        <span class="rs-nav-icon" aria-hidden="true">{{ item.icon }}</span>
        <span class="rs-nav-text">{{ item.name }}</span>
        <span v-if="item.badge" class="rs-nav-badge">{{ item.badge }}</span>
      </router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const overviewNav = [
  { to: '/research/dashboard', icon: '◉', name: '研究驾驶舱' },
  { to: '/research/project', icon: '▤', name: '项目空间', badge: 3 },
]

const researchNav = [
  { to: '/research/literature', icon: '📚', name: '文献桌面', badge: 127 },
  { to: '/research/verify', icon: '∮', name: '数学验证台' },
  { to: '/research/lean', icon: 'λ', name: 'Lean4 形式化', live: true },
  { to: '/research/writing', icon: '✎', name: '论文写作台' },
  { to: '/research/review', icon: '✓', name: '论文初审', badge: 7, alert: true },
]

const specialNav = [
  { to: '/research/education', icon: '🎓', name: '教育研究台' },
  { to: '/research/runs', icon: '▶', name: '运行中心', badge: 5 },
]

function isActive(path: string): boolean {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>
