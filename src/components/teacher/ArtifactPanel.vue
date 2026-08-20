<template>
  <div v-if="artifact" class="tdr-card tartifact">
    <div class="tartifact-head">
      <div class="tartifact-tags">
        <span class="tartifact-type">{{ artifact.artifact_type }}</span>
        <ArtifactStatusBadge :status="artifact.status" :degraded="artifact.degraded" />
        <span class="tartifact-ver muted">v{{ artifact.version }}</span>
      </div>
      <span class="tartifact-time muted">{{ artifact.updated_at }}</span>
    </div>

    <div v-if="artifact.degraded" class="tdr-banner warn">当前使用本地替代方案生成，内容可能简化，仍可编辑与确认。</div>
    <div v-if="artifact.warnings.length" class="tdr-banner warn">
      <span v-for="(w, i) in artifact.warnings" :key="i" class="tartifact-warn">{{ w }}</span>
    </div>

    <slot />

    <hr class="tartifact-div" />
    <SourceRefs :refs="artifact.source_refs || []" />

    <div v-if="actions.length" class="tartifact-actions">
      <button v-for="a in actions" :key="a" class="tdr-btn" :class="{ primary: a === 'confirm' || a === 'publish' }" type="button" @click="$emit('action', a)">
        {{ label(a) }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ArtifactStatus, TeacherArtifact } from '@/types/teacher'
import { allowedActions, ARTIFACT_ACTION_LABEL, type ArtifactAction } from '@/utils/artifactState'
import ArtifactStatusBadge from '@/components/teacher/ArtifactStatusBadge.vue'
import SourceRefs from '@/components/teacher/SourceRefs.vue'

const props = defineProps<{ artifact: TeacherArtifact }>()
defineEmits<{ (e: 'action', a: ArtifactAction): void }>()

const actions = computed<ArtifactAction[]>(() => allowedActions(props.artifact.status as ArtifactStatus))
function label(a: ArtifactAction): string { return ARTIFACT_ACTION_LABEL[a] }
</script>