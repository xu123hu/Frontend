<script setup lang="ts">
import Boundary from '@shared/ui/Boundary.vue';
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>未找到页面</h1>
        <p>您访问的路由不存在或尚未在 F0 阶段占位实现。</p>
      </div>
    </header>
    <Boundary
      tone="warning"
      title="死路由检查"
    >
      本占位页用于满足 08 §5.2 死路由检查；任何 4xx 路径必须 fallback 到此处，而不是显示空白。
    </Boundary>
  </div>
</template>

<style scoped>
.page {
  max-width: 1460px;
  margin: 0 auto;
}
.page-head {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  margin-bottom: 18px;
}
.page-head h1 {
  font-size: var(--font-size-3xl);
  margin: 0 0 6px;
}
.page-head p {
  margin: 0;
  color: var(--text-muted);
  max-width: 75ch;
}
</style>
