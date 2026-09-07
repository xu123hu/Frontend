<script setup lang="ts">
/**
 * 统一卡片（S16 组件库唯一实现，H17）。
 * 变体：default（白卡实线边框，工作页）/ portal（portal 卡，backdrop-blur）/ interactive（hover 上浮）。
 * paddings: none/sm/md/lg。
 */
withDefaults(
  defineProps<{
    variant?: 'default' | 'portal' | 'interactive';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    flush?: boolean;
    ariaLabel?: string;
  }>(),
  { variant: 'default', padding: 'md', flush: false, ariaLabel: undefined },
);
</script>

<template>
  <div
    class="app-card"
    :class="[`v-${variant}`, `p-${padding}`, { flush }]"
    :aria-label="ariaLabel"
  >
    <slot />
  </div>
</template>

<style scoped>
.app-card {
  background: var(--ailp-card);
  border: 1px solid var(--ailp-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--ailp-shadow-sm);
}
.p-none { padding: 0; }
.p-sm { padding: 10px; }
.p-md { padding: 16px; }
.p-lg { padding: 24px; }
.flush { box-shadow: none; }

.v-portal {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid var(--ailp-border);
  border-radius: var(--radius-xl);
}
.v-interactive {
  cursor: pointer;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
}
.v-interactive:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px -10px rgba(79, 70, 229, 0.15), 0 10px 20px -5px rgba(6, 182, 212, 0.1);
}
</style>
