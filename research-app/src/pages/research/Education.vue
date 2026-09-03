<script setup lang="ts">
import Boundary from '@shared/ui/Boundary.vue';
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>教育研究</h1>
        <p>授权数据产品、隐私预检、k≥20 强制检查、统计分析与成果回流。</p>
      </div>
      <div class="actions">
        <button class="btn" type="button">数据边界</button>
        <button class="btn primary" type="button">使用授权数据</button>
      </div>
    </header>

    <Boundary tone="info" title="F0 占位：教育研究">
      F4 阶段交付：5 步流程（接收课题 → 隐私预检 → 数据快照 → 统计与图表 → 成果审批）；
      任何切片 k &lt; 20 一律拒绝；不直连学生业务库；图表与参数绑定快照哈希。
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
