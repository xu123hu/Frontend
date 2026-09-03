<script setup lang="ts">
import Boundary from '@shared/ui/Boundary.vue';
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>科研项目</h1>
        <p>项目连接文献、论文、审查、教育研究和成果。</p>
      </div>
      <div class="actions">
        <button class="btn primary" type="button">新建项目</button>
      </div>
    </header>

    <Boundary tone="info" title="F0 占位：项目列表与详情">
      F1 阶段接入 `GET /api/research/v1/projects?limit=20` 并实现新建/切换/详情。
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
  justify-content: space-between;
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
.btn.primary {
  min-height: 34px;
  padding: 6px 11px;
  border: 1px solid var(--primary);
  border-radius: 7px;
  background: var(--primary);
  color: #fff;
  font-weight: 650;
  cursor: pointer;
}
</style>
