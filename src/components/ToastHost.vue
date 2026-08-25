<template>
  <div class="toast-wrap">
    <transition-group name="toast">
      <div v-for="t in store.items" :key="t.id" class="toast" :class="t.type">
        <span class="t-icon">{{ icons[t.type] || 'ℹ️' }}</span>
        <span>{{ t.text }}</span>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { useToastStore } from '@/stores/toast'
const store = useToastStore()
const icons = { success: '✅', error: '⚠️', info: 'ℹ️', warning: '🔔' }
</script>

<style scoped>
.toast-wrap {
  position: fixed; top: var(--space-5); right: var(--space-5); z-index: 9999;
  display: flex; flex-direction: column; gap: var(--space-3); pointer-events: none;
}
.toast {
  display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-3) var(--space-4); border-radius: var(--radius-md);
  background: var(--bg-white);
  border: 1px solid var(--border); box-shadow: var(--shadow-md);
  font-size: var(--text-sm); color: var(--text-primary); max-width: 360px;
}
.toast.success { border-left: 3px solid var(--success); }
.toast.error { border-left: 3px solid var(--error); }
.toast.info { border-left: 3px solid var(--primary); }
.toast.warning { border-left: 3px solid var(--warning, #f59e0b); }
.toast-enter-active, .toast-leave-active { transition: all var(--transition-base); }
.toast-enter-from { opacity: 0; transform: translateX(16px); }
.toast-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
