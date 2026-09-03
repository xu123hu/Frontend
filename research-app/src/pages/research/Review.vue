<script setup lang="ts">
import Boundary from '@shared/ui/Boundary.vue';
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>评审</h1>
        <p>作者投稿前自检与评委论文初审；数学分层验证 + Lean 三状态分项。</p>
      </div>
      <div class="actions">
        <button
          class="btn"
          type="button"
        >
          审查边界
        </button>
        <button
          class="btn primary"
          type="button"
        >
          上传论文
        </button>
      </div>
    </header>

    <Boundary
      tone="info"
      title="F0 占位：评审工作区"
    >
      F4 阶段交付：作者视图与评委视图（后端裁剪权限）；分层验证 L0–L4（SymPy/Z3）；
      适用时启用 Lean（评审工作区内部）；形式化翻译/内核/科研结论三状态分项。
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
