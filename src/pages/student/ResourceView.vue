<template>
  <div class="view">
    <div class="resource-hero">
      <h2>📚 为你推荐的 {{ loading ? '…' : resources.length }} 个资源</h2>
      <div class="sub" v-if="kpName">
        基于你的学情：当前最薄弱知识点「{{ kpName }}」（掌握度 {{ masteryPct }}%），系统为你匹配了以下资源。
      </div>
      <div class="sub" v-else>基于你的学情为你匹配的学习资源。</div>
      <div class="reasons" v-if="kpName">
        <span class="tag-pill err">🎯 针对薄弱：{{ kpName }} {{ masteryPct }}%</span>
      </div>
    </div>

    <div class="resource-filters">
      <span
        v-for="f in filters" :key="f.key"
        class="filter" :class="{ active: activeFilter === f.key }"
        @click="activeFilter = f.key"
      >{{ f.label }}</span>
    </div>

    <div v-if="loading" class="state-box">加载中…</div>
    <div v-else-if="error" class="state-box">⚠ {{ error }}<button style="margin-left:10px;" @click="load">重试</button></div>
    <div v-else-if="!resources.length" class="state-box">
      📭 暂时没有可推荐的资源，先去练一组题生成你的学情画像吧
    </div>
    <div v-else-if="!shownResources.length" class="state-box">该分类下暂无资源</div>

    <div v-else class="resource-grid">
      <div v-for="(r, i) in shownResources" :key="i" class="resource-card" :class="r.coverCls" @click="open(r)">
        <div class="cover">{{ r.coverIcon }}</div>
        <span class="type" :style="{ color: r.typeColor }">{{ r.typeLabel }}</span>
        <div class="tt">{{ r.title }}</div>
        <div class="why">{{ r.reason }}</div>
        <div class="meta">
          <span>{{ r.actionHint }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '@/api/client'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
const router = useRouter()
const activeFilter = ref('all')
const loading = ref(true)
const error = ref('')
const resources = ref([])
const kpName = ref('')
const masteryPct = ref(0)

const filters = [
  { key: 'all', label: '全部' },
  { key: 'doc', label: '文档' },
  { key: 'video', label: '视频' },
  { key: 'exercise', label: '练习' },
]

const KIND_META = {
  doc: { coverIcon: '📝', typeLabel: '📝 文档', typeColor: 'var(--ok-deep)', coverCls: 'cover-green', actionHint: '📄 讲义' },
  video: { coverIcon: '🎬', typeLabel: '🎬 视频', typeColor: 'var(--brand-deep)', coverCls: '', actionHint: '▶ 微课' },
  exercise: { coverIcon: '✏️', typeLabel: '✏️ 练习', typeColor: 'var(--indigo)', coverCls: 'cover-blue', actionHint: '🎯 去练题' },
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await api.get('/student/resources/recommend', { limit: 10 })
    kpName.value = data?.kp_name || ''
    // 契约：掌握度为 0~1 小数，前端乘 100 展示
    masteryPct.value = Math.round((data?.mastery ?? 0) * 100)
    resources.value = (data?.items || []).map((it) => ({
      ...it,
      ...(KIND_META[it.kind] || { coverIcon: '📚', typeLabel: '📚 资源', typeColor: 'var(--ink3)', coverCls: '', actionHint: '📚 查看' }),
    }))
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败，请稍后重试'
    resources.value = []
  } finally {
    loading.value = false
  }
}

const shownResources = computed(() => {
  if (activeFilter.value === 'all') return resources.value
  return resources.value.filter((r) => r.kind === activeFilter.value)
})

function open(r) {
  if (r.route) {
    router.push(r.route)
  } else {
    toast.info(`正在打开《${r.title}》`)
  }
}

onMounted(load)
</script>

<style scoped>
.state-box {
  padding: 40px 20px;
  text-align: center;
  color: var(--ink3);
  font-size: 13px;
  background: var(--card-bg, #fff);
  border: 1px dashed var(--line, #e5e7eb);
  border-radius: var(--radius-lg, 12px);
}
</style>
