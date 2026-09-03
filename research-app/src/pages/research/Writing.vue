<script setup lang="ts">
import Boundary from '@shared/ui/Boundary.vue';
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>写作</h1>
        <p>LaTeX 写作、引用插入、编译、修订 diff 与公式保真翻译。</p>
      </div>
      <div class="actions">
        <button class="btn" type="button">作者投稿前自检</button>
        <button class="btn primary" type="button">编译 PDF</button>
      </div>
    </header>

    <Boundary tone="info" title="F0 占位：写作工作台">
      F3 阶段交付：CodeMirror 6 编辑器 + LaTeX language pack + 文件树 + 编译 PDF 预览 +
      SyncTeX 双向定位 + AI diff 逐项接受/拒绝 + 引用仅来自已核验 CitationRecord。
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
