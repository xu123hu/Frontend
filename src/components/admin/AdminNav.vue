<template>
  <nav class="anav" aria-label="管理后台导航">
    <router-link
      v-for="item in adminNav"
      :key="item.to"
      :to="item.to"
      class="anav-item"
      :class="{ active: $route?.path === item.to }"
    >
      <span class="anav-icon" aria-hidden="true">{{ item.icon }}</span>
      <span class="anav-txt">{{ item.title }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { adminNav } from '@/config/nav'
</script>

<style scoped>
.anav { display: flex; flex-direction: column; gap: 2px; padding: 8px; }
.anav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px; border-radius: 8px;
  color: var(--text-secondary, #4b5563);
  text-decoration: none; font-size: var(--text-sm, 14px);
  transition: background 0.15s, color 0.15s;
}
.anav-item:hover { background: var(--bg-hover, #f3f4f6); color: var(--text-primary, #111827); }
.anav-item.active { background: var(--primary-soft, #dbeafe); color: var(--primary, #2563eb); font-weight: 600; }
.anav-icon { font-size: 16px; }
</style>
