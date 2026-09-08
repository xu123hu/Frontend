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

    <!-- 我的题库：真实题库数据（GET /api/v1/questions） -->
    <template v-else-if="tab === 'questions'">
      <div class="qb-head">
        <span class="qb-count">共 <b>{{ qTotal }}</b> 题</span>
        <select v-model="qType" class="qb-filter" @change="loadQuestions">
          <option value="">全部题型</option>
          <option value="choice">选择题</option>
          <option value="blank">填空题</option>
          <option value="solution">解答题</option>
        </select>
        <button class="qb-retry" :disabled="qLoading" @click="loadQuestions">↻ 刷新</button>
      </div>
      <div v-if="qLoading" style="padding:24px;text-align:center;color:var(--ink3);font-size:13px;">题库加载中…</div>
      <div v-else-if="!questions.length" style="padding:26px;text-align:center;color:var(--ink3);font-size:13px;">
        题库还没有题目——上传试卷（题库用途）或在对话里「出题」会自动收录。
      </div>
      <div v-else v-for="q in questions" :key="q.id" class="qb-item">
        <div class="qb-stem"><LatexText :text="q.stem" /></div>
        <div class="qb-meta">
          <span class="qb-tag">{{ qTypeZh(q.q_type) }}</span>
          <span v-if="q.difficulty" class="qb-tag">{{ diffZh(q.difficulty) }}</span>
          <span v-if="q.source" class="qb-tag src">{{ srcZh(q.source) }}</span>
          <span v-for="k in (q.kp_codes || []).slice(0, 2)" :key="k" class="qb-tag kp">{{ k }}</span>
        </div>
      </div>
    </template>
    <KnowledgeView v-else-if="tab === 'questions'" :initial-tab="'questions'" :key="'questions'" />
    <ResourceView v-else />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import KnowledgeView from '@/pages/student/KnowledgeView.vue'
import LatexText from '@/components/LatexText.vue'
import ResourceView from '@/pages/student/ResourceView.vue'

const route = useRoute()
const router = useRouter()
const valid = ['materials', 'questions', 'resources']
const tab = ref(valid.includes(route.query.tab) ? route.query.tab : 'materials')

// 我的题库：真实数据
const questions = ref([])
const qTotal = ref(0)
const qType = ref('')
const qLoading = ref(false)
function qTypeZh(t) {
  return ({ choice: '选择题', blank: '填空题', solution: '解答题' })[t] || t || '未分型'
}
function diffZh(d) {
  return ({ easy: '基础', medium: '进阶', hard: '压轴' })[d] || d
}
function srcZh(s) {
  return ({ imported: '试卷导入', bank: '平台题库', ai: 'AI 生成', web: '联网收录' })[s] || s
}
async function loadQuestions() {
  qLoading.value = true
  try {
    const r = await api.raw('GET', '/v1/questions', {
      query: { limit: 50, ...(qType.value ? { q_type: qType.value } : {}) },
    })
    questions.value = r.data?.items || []
    qTotal.value = r.data?.total || questions.value.length
  } catch {
    questions.value = []
    qTotal.value = 0
  } finally { qLoading.value = false }
}
watch(tab, (t) => { if (t === 'questions' && !questions.value.length && !qLoading.value) loadQuestions() })

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

/* 我的题库列表 */
.qb-head { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; }
.qb-count { font-size: 13px; color: var(--ink2); }
.qb-filter { padding: 6px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--card); font: inherit; font-size: 12.5px; color: var(--ink); }
.qb-item { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 13px 16px; margin-bottom: 10px; }
.qb-stem { font-size: 13px; color: var(--ink); line-height: 1.7; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.qb-meta { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.qb-tag { font-size: 11px; padding: 2px 9px; border-radius: 99px; background: var(--bg2, #f1f5f9); color: var(--ink2, #475569); font-weight: 600; }
.qb-tag.kp { background: var(--primary-subtle, #eef2ff); color: var(--primary, #4f46e5); }
.qb-tag.src { background: #ecfdf5; color: #047857; }
</style>
