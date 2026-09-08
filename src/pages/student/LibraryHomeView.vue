<template>
  <div class="view">
    <div class="greeting">
      <div class="hello">📚 知识库</div>
      <div class="sub">我的资料、我的题库、学习资源——一个入口统一管理。</div>
    </div>

    <div class="lib-tabs">
      <button :class="{ active: tab === 'materials' }" @click="tab = 'materials'">📚 我的资料</button>
      <button :class="{ active: tab === 'questions' }" @click="tab = 'questions'">📝 我的题库</button>
      <button :class="{ active: tab === 'resources' }" @click="tab = 'resources'">🌐 学习资源</button>
    </div>

    <KnowledgeView v-if="tab === 'materials'" :initial-tab="'textbook'" :key="'materials'" />
    <KnowledgeView v-else-if="tab === 'questions'" :initial-tab="'questions'" :key="'questions'" />
    <ResourceView v-else />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import KnowledgeView from '@/pages/student/KnowledgeView.vue'
import ResourceView from '@/pages/student/ResourceView.vue'

const route = useRoute()
const router = useRouter()
const valid = ['materials', 'questions', 'resources']
const tab = ref(valid.includes(route.query.tab) ? route.query.tab : 'materials')

watch(tab, (t) => router.replace({ query: { ...route.query, tab: t } }))
watch(() => route.query.tab, (t) => { if (valid.includes(t)) tab.value = t })
</script>

<style scoped>
.lib-tabs { display: flex; gap: 8px; margin-bottom: 14px; }
.lib-tabs button {
  padding: 9px 20px; border-radius: 999px; border: 1px solid var(--line); background: var(--card);
  font: inherit; font-size: 13.5px; font-weight: 600; color: var(--ink2); cursor: pointer;
  transition: all .18s ease;
}
.lib-tabs button.active { background: var(--primary-subtle); border-color: var(--primary-border); color: var(--primary); }

/* 容器页：隐藏子页面的内部 greeting（容器已提供页头上下文） */
:deep(.view > .greeting) { display: none; }
</style>
