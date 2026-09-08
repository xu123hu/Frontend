<template>
  <div class="view">
    <div class="greeting">
      <div class="hello">🎓 课堂</div>
      <div class="sub">老师布置的任务、我的班级、AI 双师课堂——师生同一条线。</div>
    </div>

    <div class="cls-tabs">
      <button :class="{ active: tab === 'tasks' }" @click="tab = 'tasks'">📋 课堂任务</button>
      <button :class="{ active: tab === 'class' }" @click="tab = 'class'">🏫 我的班级</button>
      <button :class="{ active: tab === 'dual' }" @click="tab = 'dual'">🎬 双师课堂</button>
    </div>

    <TasksView v-if="tab === 'tasks'" />
    <ClassView v-else-if="tab === 'class'" />
    <div v-else class="dual-entry">
      <div class="de-card" @click="$router.push('/dual')">
        <div class="de-ic">🎬</div>
        <div class="de-body">
          <div class="de-title">AI 双师课堂</div>
          <div class="de-sub">输入知识点，AI 主讲 + AI 助教生成可交互课件；播放页为全屏课堂模式</div>
        </div>
        <div class="de-go">进入 →</div>
      </div>
      <div class="de-recent" v-if="recentDual.length">
        <div class="de-r-title">🕘 最近课堂</div>
        <div v-for="s in recentDual" :key="s.id" class="de-r-item" @click="$router.push('/dual/' + s.id)">
          <span class="de-r-dot" :class="s.status"></span>
          <span class="de-r-name">{{ s.title }}</span>
          <span class="de-r-meta">{{ s.slide_count }} 页 · {{ statusZh(s.status) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api/client'
import TasksView from '@/pages/student/TasksView.vue'
import ClassView from '@/pages/student/ClassView.vue'

const route = useRoute()
const router = useRouter()
const valid = ['tasks', 'class', 'dual']
const tab = ref(valid.includes(route.query.tab) ? route.query.tab : 'tasks')

watch(() => route.query.tab, (t) => { if (valid.includes(t)) tab.value = t })
watch(tab, (t) => router.replace({ query: { ...route.query, tab: t } }))

const recentDual = ref([])
onMounted(async () => {
  if (tab.value !== 'dual') return
  try {
    const d = await api.get('/classroom/sessions', { limit: 5 })
    recentDual.value = (d?.sessions || d?.items || []).slice(0, 5)
  } catch { /* 未登录/离线时静默 */ }
})
function statusZh(s) {
  return ({ ready: '已完成', generating: '备课中', failed: '生成失败' })[s] || s
}
</script>

<!-- 课堂容器页复用全局样式；局部样式仅 tab 与入口卡 -->
<style>
.cls-tabs { display: flex; gap: 8px; margin-bottom: 14px; }
.cls-tabs button {
  padding: 9px 20px; border-radius: 999px; border: 1px solid var(--line, #e2e8f0); background: var(--card, #fff);
  font: inherit; font-size: 13.5px; font-weight: 600; color: var(--ink2, #475569); cursor: pointer;
}
.cls-tabs button.active { background: var(--primary-subtle, #eef2ff); border-color: var(--primary-border, #c7d2fe); color: var(--primary, #4f46e5); }
.dual-entry { display: flex; flex-direction: column; gap: 14px; }
.de-card {
  display: flex; align-items: center; gap: 16px; padding: 22px 24px;
  background: linear-gradient(135deg, #eef2ff 0%, #fff 60%); border: 1px solid var(--primary-border, #c7d2fe);
  border-radius: 18px; cursor: pointer; transition: all .2s ease;
}
.de-card:hover { transform: translateY(-2px); box-shadow: 0 10px 40px -12px rgba(79, 70, 229, .25); }
.de-ic { font-size: 34px; }
.de-title { font-size: 16px; font-weight: 800; color: var(--ink, #0f172a); }
.de-sub { font-size: 12.5px; color: var(--ink2, #475569); margin-top: 4px; }
.de-go { margin-left: auto; color: var(--primary, #4f46e5); font-weight: 800; font-size: 13.5px; }
.de-r-title { font-size: 12.5px; color: var(--ink3, #94a3b8); font-weight: 700; margin-bottom: 8px; }
.de-r-item {
  display: flex; align-items: center; gap: 10px; padding: 11px 14px; margin-bottom: 8px;
  background: var(--card, #fff); border: 1px solid var(--line, #e2e8f0); border-radius: 12px;
  cursor: pointer; font-size: 13px;
}
.de-r-item:hover { border-color: var(--primary-border, #c7d2fe); }
.de-r-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ink3, #94a3b8); }
.de-r-dot.ready { background: var(--ok, #059669); }
.de-r-dot.generating { background: var(--warn, #d97706); }
.de-r-dot.failed { background: var(--err, #dc2626); }
.de-r-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--ink, #0f172a); }
.de-r-meta { color: var(--ink3, #94a3b8); font-size: 12px; }
</style>
