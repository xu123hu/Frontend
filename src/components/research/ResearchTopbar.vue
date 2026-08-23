<template>
  <header class="rs-topbar">
    <!-- 左侧：品牌 + 项目切换器 -->
    <div class="rs-topbar-left">
      <div class="rs-brand">
        <span class="rs-brand-mark" aria-hidden="true">∑</span>
        <div class="rs-brand-text">
          <strong>智学数研</strong>
          <span>Research Workbench</span>
        </div>
      </div>

      <div class="rs-project-switcher" role="button" tabindex="0" @click="$emit('open-project')" @keydown.enter="$emit('open-project')">
        <span class="rs-project-dot" aria-hidden="true"></span>
        <span class="rs-project-name">{{ currentProject }}</span>
        <span class="rs-project-caret" aria-hidden="true">▾</span>
      </div>
    </div>

    <!-- 中间：命令触发器 -->
    <div class="rs-topbar-center">
      <div
        class="rs-cmd-trigger"
        role="button"
        tabindex="0"
        @click="$emit('open-cmd')"
        @keydown.enter="$emit('open-cmd')"
      >
        <span class="rs-cmd-icon" aria-hidden="true">⌕</span>
        <span class="rs-cmd-hint">搜索文献、启动研究流，或输入命令…</span>
        <span class="rs-cmd-kbd">⌘ K</span>
      </div>
    </div>

    <!-- 右侧：模式 + 通知 + 证据面板切换 + 用户 -->
    <div class="rs-topbar-right">
      <!-- 模式指示器 -->
      <div class="rs-mode-select">
        <select v-model="mode" class="rs-mode-select-input" aria-label="运行模式">
          <option value="FULL">FULL</option>
          <option value="LOCAL_ENGINE">LOCAL_ENGINE</option>
          <option value="BROWSER_LOCAL">BROWSER_LOCAL</option>
          <option value="UNAVAILABLE">UNAVAILABLE</option>
        </select>
        <span class="rs-mode-indicator" :class="modeClass" aria-hidden="true"></span>
      </div>

      <!-- 通知 -->
      <button class="rs-icon-btn" type="button" title="通知" aria-label="通知" @click="$emit('open-notifications')">
        <span aria-hidden="true">🔔</span>
        <span class="rs-dot"></span>
      </button>

      <!-- 证据面板切换 -->
      <button
        class="rs-icon-btn rs-evidence-toggle"
        type="button"
        :class="{ active: evidenceOpen }"
        title="证据账本"
        aria-label="证据账本"
        @click="$emit('toggle-evidence')"
      >
        <span aria-hidden="true">📋</span>
      </button>

      <!-- 用户头像 -->
      <div class="rs-user">
        <div class="rs-user-avatar">{{ firstChar }}</div>
        <div class="rs-user-info">
          <span class="rs-user-name">{{ auth.nickname }}</span>
          <span class="rs-user-role">研究员</span>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { useAuthStore } from '@/stores/auth'

defineEmits<{
  (e: 'open-cmd'): void
  (e: 'toggle-evidence'): void
  (e: 'open-project'): void
  (e: 'open-notifications'): void
}>()

const auth = useAuthStore()
const evidenceOpen = inject<{ value: boolean }>('evidenceOpen', { value: true })

const currentProject = ref('代数几何前沿课题')
const mode = ref<'FULL' | 'LOCAL_ENGINE' | 'BROWSER_LOCAL' | 'UNAVAILABLE'>('FULL')

const modeClass = computed(() => {
  switch (mode.value) {
    case 'FULL': return 'mode-full'
    case 'LOCAL_ENGINE': return 'mode-local'
    case 'BROWSER_LOCAL': return 'mode-browser'
    case 'UNAVAILABLE': return 'mode-unavailable'
    default: return 'mode-full'
  }
})

const firstChar = computed(() => {
  const name = auth.nickname || '研'
  return name.charAt(0)
})
</script>
