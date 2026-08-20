<template>
  <ul v-if="refs && refs.length" class="tsrc">
    <li v-for="(r, i) in refs" :key="i">
      <span class="tsrc-kind">{{ r.kind }}</span>
      <span class="tsrc-title">{{ r.title || r.ref }}</span>
      <span v-if="r.page" class="tsrc-page">p.{{ r.page }}</span>
      <span v-if="r.snippet" class="tsrc-snippet">{{ r.snippet }}</span>
    </li>
  </ul>
  <p v-else class="tsrc-empty muted">无来源引用</p>
</template>

<script setup lang="ts">
import type { SourceRef } from '@/types/teacher'
defineProps<{ refs: SourceRef[] }>()
</script>