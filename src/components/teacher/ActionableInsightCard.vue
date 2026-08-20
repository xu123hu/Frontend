<template>
  <article class="tdr-card tins">
    <div class="tins-head">
      <h4 class="tins-summary">{{ insight.summary }}</h4>
      <span class="tins-window muted">{{ insight.data_window.from }} → {{ insight.data_window.to }}</span>
    </div>
    <p class="tins-evidence">{{ insight.evidence }}</p>
    <div v-if="insight.confidence !== undefined" class="tins-conf">可信度 {{ Math.round(insight.confidence * 100) }}%</div>
    <div class="tins-actions">
      <button class="tdr-btn" type="button" @click="$emit('view', insight)">查看依据</button>
      <button v-for="a in insight.recommended_actions" :key="a" class="tdr-btn primary" type="button" @click="$emit('apply', insight, a)">
        {{ a }}
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ActionableInsight } from '@/types/teacher'
defineProps<{ insight: ActionableInsight }>()
defineEmits<{ (e: 'view', i: ActionableInsight): void; (e: 'apply', i: ActionableInsight, action: string): void }>()
</script>