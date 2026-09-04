<script setup lang="ts">
/**
 * 教育研究（F4 降级为明确边界声明，design.md §5）：
 * 隐私红线（不直连学生业务库、切片 k<20 一律拒绝）是后端数据侧职责，
 * 前端在 mock 环境无法验证真实隐私规则——此处仅静态展示流程与边界；真实数据流由 Agent 2 端到端，F5 收口。
 */
import Boundary from '@shared/ui/Boundary.vue';
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>教育研究</h1>
        <p>授权数据产品、隐私预检、k≥20 强制检查、统计分析与成果回流。</p>
      </div>
    </header>

    <section
      class="panel"
      aria-label="教育研究流程（草案边界）"
    >
      <h2>五步流程（草案）</h2>
      <ol class="steps">
        <li><b>接收课题</b> — 教师/研究者发起授权数据课题申请。</li>
        <li><b>隐私预检</b> — 数据边界审查；不满足授权范围的请求直接拒绝。</li>
        <li><b>数据快照</b> — 仅对授权快照做分析；图表与参数绑定快照哈希。</li>
        <li><b>统计与图表</b> — 分层模型等统计分析产出。</li>
        <li><b>成果审批</b> — 成果回流前需人工审批（HumanDecision 审计语义）。</li>
      </ol>
    </section>

    <Boundary
      tone="warning"
      title="边界声明（诚实性）"
    >
      本页为草案边界展示，不含真实教育数据流：隐私预检与「任何切片 k &lt; 20 一律拒绝」规则由后端数据侧强制执行
      （前端无法在 mock 环境验证真实隐私规则）；不直连学生业务库。真实教育数据端到端由 Agent 2 承担，F5 收口。
    </Boundary>
  </div>
</template>

<style scoped>
.page {
  max-width: 1460px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
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
.panel {
  border: 1px solid var(--border);
  border-radius: var(--r);
  background: var(--surface);
  padding: 16px;
}
.panel h2 {
  margin: 0 0 10px;
  font-size: var(--font-size-lg);
}
.steps {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 8px;
  font-size: var(--font-size-sm);
}
</style>

