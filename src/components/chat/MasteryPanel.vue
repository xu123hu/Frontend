<template>
  <!-- 右侧可折叠学情仪表盘（F6 摘要，数据：GET /student/mastery/summary） -->
  <aside class="mastery-panel glass-card" :class="{ embedded }">
    <div v-if="!embedded" class="mp-head">
      <span class="mp-title">📊 学情仪表盘</span>
      <button class="mp-close" title="收起" @click="$emit('close')">×</button>
    </div>

    <div v-if="loading" class="mp-loading"><span class="spinner"></span> 加载中…</div>

    <div v-else-if="errorText" class="mp-error">
      <div class="text-sm text-muted mb-2">{{ errorText }}</div>
      <button class="btn btn-sm" @click="load">重试</button>
    </div>

    <div v-else-if="!radar.length" class="empty-state mp-empty">
      <div class="es-icon">📈</div>
      <div class="es-text">样本不足<br />先去刷几道题吧</div>
    </div>

    <template v-else>
      <div class="mp-stats">
        <div class="mp-stat">
          <div class="mp-stat-v">{{ radar.length }}</div>
          <div class="mp-stat-l">已学知识点</div>
        </div>
        <div class="mp-stat">
          <div class="mp-stat-v">{{ hintDepText }}</div>
          <div class="mp-stat-l">提示依赖度</div>
        </div>
      </div>

      <div class="mp-sec-title">掌握度</div>
      <div class="mp-radar">
        <div v-for="r in radar" :key="r.kp_code" class="mp-row">
          <div class="mp-row-name" :title="r.kp_code">{{ r.kp_name }}</div>
          <div class="progress-bar mp-bar">
            <div class="fill" :class="barClass(r.mastery)" :style="{ width: pct(r.mastery) + '%' }"></div>
          </div>
          <div class="mp-row-v">{{ pct(r.mastery) }}%</div>
        </div>
      </div>

      <template v-if="topWeak.length">
        <div class="mp-sec-title">薄弱环节</div>
        <div class="mp-weak">
          <span v-for="w in topWeak" :key="w.kp_code" class="tag red">{{ w.kp_name }}</span>
        </div>
      </template>
    </template>
  </aside>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { studentApi } from '@/api'

defineProps({
  embedded: { type: Boolean, default: false }, // 嵌入 ChatSidePanel 时隐藏自带头部与外壳样式
})
defineEmits(['close'])

const loading = ref(false)
const errorText = ref('')
const data = ref(null)

const radar = computed(() => (Array.isArray(data.value?.radar) ? data.value.radar : []))
const topWeak = computed(() => (Array.isArray(data.value?.top_weak) ? data.value.top_weak : []))
const hintDepText = computed(() => {
  const v = data.value?.hint_dependency
  return typeof v === 'number' ? v.toFixed(2) : '—'
})

function pct(m) {
  const v = Number(m)
  if (!Number.isFinite(v)) return 0
  return Math.round(Math.max(0, Math.min(1, v)) * 100)
}
function barClass(m) {
  const p = pct(m)
  if (p < 40) return 'red'
  if (p < 70) return 'orange'
  return 'green'
}

async function load() {
  loading.value = true
  errorText.value = ''
  try {
    data.value = await studentApi.masterySummary()
  } catch (e) {
    errorText.value = e?.message || '学情数据加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.mastery-panel {
  width: 280px; flex-shrink: 0; align-self: stretch; overflow-y: auto;
  padding: 16px; margin: 12px 12px 12px 0;
}
.mastery-panel.embedded {
  width: auto; margin: 0; padding: 0; border: none; background: transparent;
  backdrop-filter: none; box-shadow: none; overflow-y: visible;
}
.mp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.mp-title { font-weight: 700; font-size: 14px; }
.mp-close { border: none; background: none; font-size: 18px; cursor: pointer; color: var(--text-muted); }
.mp-loading { color: var(--text-muted); font-size: 13px; display: flex; align-items: center; gap: 8px; padding: 20px 0; }
.mp-error { padding: 16px 0; text-align: center; }
.mp-empty { padding: 28px 8px; }
.mp-stats { display: flex; gap: 10px; margin-bottom: 14px; }
.mp-stat {
  flex: 1; text-align: center; padding: 10px 6px; border-radius: var(--radius-md);
  background: rgba(238, 242, 255, 0.7);
}
.mp-stat-v { font-size: 20px; font-weight: 800; color: var(--primary); }
.mp-stat-l { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.mp-sec-title { font-size: 12px; font-weight: 700; color: var(--text-secondary); margin: 10px 0 6px; }
.mp-radar { display: flex; flex-direction: column; gap: 8px; }
.mp-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.mp-row-name { width: 76px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary); }
.mp-bar { flex: 1; }
.mp-row-v { width: 36px; text-align: right; color: var(--text-muted); flex-shrink: 0; }
.mp-weak { display: flex; flex-wrap: wrap; gap: 6px; }
</style>
