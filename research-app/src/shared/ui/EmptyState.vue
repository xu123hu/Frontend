<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string;
    hint?: string;
  }>(),
  { title: '暂无数据', hint: '可以在此添加引导用户的第一步操作。' },
);
</script>

<template>
  <div
    class="empty"
    role="status"
  >
    <b>{{ title }}</b>
    <p>{{ hint }}</p>
    <slot />
  </div>
</template>

<style scoped>
.empty {
  padding: 35px;
  text-align: center;
  color: var(--muted);
}
.empty b {
  display: block;
  color: var(--ink);
  margin-bottom: 5px;
  font-size: var(--font-size-base);
}
.empty p {
  margin: 0 0 12px;
  font-size: var(--font-size-sm);
}
</style>
