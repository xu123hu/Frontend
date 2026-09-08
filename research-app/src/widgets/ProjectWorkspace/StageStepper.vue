<script setup lang="ts">
/** 紧凑研究阶段步进器（右栏）：发现→验证→写作→评审→发表。 */
import { computed } from 'vue';

const props = defineProps<{ currentStage: string }>();

const STAGES: Array<{ key: string; label: string; desc: string }> = [
  { key: 'discovery', label: '发现期', desc: '研究问题与候选假设' },
  { key: 'verification', label: '验证期', desc: '数学验证与证据沉淀' },
  { key: 'writing', label: '写作期', desc: 'LaTeX 写作与引用核验' },
  { key: 'review', label: '评审期', desc: '双视角审查' },
  { key: 'published', label: '已发表', desc: '成果与复现包' },
];
const currentIndex = computed(() => {
  const idx = STAGES.findIndex((s) => s.key === props.currentStage);
  return idx < 0 ? 0 : idx;
});
</script>

<template>
  <ol class="stepper">
    <li
      v-for="(stage, index) in STAGES"
      :key="stage.key"
      class="step"
      :class="{ done: index < currentIndex, current: index === currentIndex }"
      :title="stage.desc"
    >
      <span class="dot" />
      <span class="label">{{ stage.label }}</span>
    </li>
  </ol>
</template>

<style scoped>
.stepper {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.step {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
  color: var(--text-weak);
  padding: 3px 0;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: var(--ailp-gray-200);
  flex: none;
}
.step.done .dot {
  background: var(--ailp-primary-300);
}
.step.current {
  color: var(--text);
  font-weight: 600;
}
.step.current .dot {
  background: var(--ailp-primary-600);
}
</style>
