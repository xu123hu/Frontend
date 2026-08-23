<template>
  <div class="rs-evidence-panel">
    <!-- 头部 -->
    <div class="rs-evidence-header">
      <div class="rs-evidence-title">
        <span>证据账本</span>
        <span class="rs-evidence-count">{{ evidenceList.length }}</span>
      </div>
      <button class="rs-evidence-close" type="button" aria-label="关闭证据面板" @click="$emit('close')">
        <span aria-hidden="true">✕</span>
      </button>
    </div>

    <!-- 筛选芯片 -->
    <div class="rs-evidence-filters">
      <button
        v-for="f in filters"
        :key="f.key"
        class="rs-filter-chip"
        :class="{ active: activeFilter === f.key }"
        type="button"
        @click="activeFilter = f.key"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- 证据列表 -->
    <div class="rs-evidence-list">
      <article
        v-for="item in filteredEvidence"
        :key="item.id"
        class="rs-evidence-item"
      >
        <div class="rs-evidence-item-head">
          <span class="rs-evidence-tag" :class="'tag-' + item.type">{{ typeLabels[item.type] }}</span>
          <span class="rs-evidence-status" :class="'status-' + item.status">
            <span class="rs-evidence-status-icon" aria-hidden="true">{{ statusIcons[item.status] }}</span>
          </span>
        </div>
        <h4 class="rs-evidence-item-title">{{ item.title }}</h4>
        <div class="rs-evidence-item-meta">
          <span class="rs-evidence-source">{{ item.source }}</span>
          <span class="rs-evidence-time">{{ item.time }}</span>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

defineEmits<{
  (e: 'close'): void
}>()

interface EvidenceItem {
  id: number
  type: 'literature' | 'verification' | 'formal' | 'empirical'
  status: 'verified' | 'pending' | 'conflict'
  title: string
  source: string
  time: string
}

const filters = [
  { key: 'all', label: '全部' },
  { key: 'verified', label: '已验证' },
  { key: 'pending', label: '待验证' },
  { key: 'literature', label: '来自文献' },
]

const typeLabels: Record<string, string> = {
  literature: '文献证据',
  verification: '数值验证',
  formal: '形式化证明',
  empirical: '实证数据',
}

const statusIcons: Record<string, string> = {
  verified: '✓',
  pending: '⋯',
  conflict: '!',
}

const activeFilter = ref('all')

const evidenceList = ref<EvidenceItem[]>([
  {
    id: 1,
    type: 'literature',
    status: 'verified',
    title: '代数曲线模空间的维数公式',
    source: 'Ann. of Math. 2023',
    time: '2小时前',
  },
  {
    id: 2,
    type: 'verification',
    status: 'verified',
    title: '椭圆曲线秩的下界数值验证',
    source: '数学验证台 · Run #42',
    time: '5小时前',
  },
  {
    id: 3,
    type: 'formal',
    status: 'verified',
    title: '费马小定理的 Lean4 证明',
    source: 'Lean4 形式化台 · theorem_017',
    time: '昨天',
  },
  {
    id: 4,
    type: 'literature',
    status: 'pending',
    title: '霍奇猜想的最新进展综述',
    source: 'arXiv:2401.03278',
    time: '昨天',
  },
  {
    id: 5,
    type: 'empirical',
    status: 'pending',
    title: '大规模并行计算实验数据',
    source: '运行中心 · batch-2048',
    time: '2天前',
  },
  {
    id: 6,
    type: 'literature',
    status: 'conflict',
    title: '关于 L 函数解析秩的两个相反结果',
    source: 'J. Number Theory · 待核实',
    time: '3天前',
  },
  {
    id: 7,
    type: 'verification',
    status: 'verified',
    title: '格点计数的精确误差界',
    source: '数学验证台 · Run #38',
    time: '4天前',
  },
  {
    id: 8,
    type: 'formal',
    status: 'pending',
    title: '范畴论基础引理的形式化',
    source: 'Lean4 形式化台 · in_progress',
    time: '5天前',
  },
])

const filteredEvidence = computed(() => {
  if (activeFilter.value === 'all') return evidenceList.value
  if (activeFilter.value === 'verified') return evidenceList.value.filter(e => e.status === 'verified')
  if (activeFilter.value === 'pending') return evidenceList.value.filter(e => e.status === 'pending')
  if (activeFilter.value === 'literature') return evidenceList.value.filter(e => e.type === 'literature')
  return evidenceList.value
})
</script>
