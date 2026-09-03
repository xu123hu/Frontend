<script setup lang="ts">
import Boundary from '@shared/ui/Boundary.vue';
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>文献</h1>
        <p>个人文献库与项目文献库，按集合、列表与原文详情管理文献。</p>
      </div>
      <div class="actions">
        <button class="btn" type="button">查找重复项</button>
        <button class="btn primary" type="button">导入文献</button>
      </div>
    </header>

    <Boundary tone="info" title="F0 占位：文献库 Zotero 式关系">
      F2 阶段交付：检索（OpenAlex + Crossref + arXiv）、详情、附件/批注/笔记/集合/标签关系，
      PDF 阅读（PDF.js）、批注层、证据定位（page_index + bbox）。
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
.actions {
  display: flex;
  gap: 7px;
}
.btn {
  min-height: 34px;
  padding: 6px 11px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  font-weight: 650;
  color: var(--text);
  cursor: pointer;
}
.btn.primary {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}
</style>
