<template>
  <div class="research-app rs-app">
    <!-- 顶栏 -->
    <ResearchTopbar @toggle-evidence="evidenceOpen = !evidenceOpen" />

    <!-- 侧栏 -->
    <aside class="rs-sidebar" aria-label="科研端导航">
      <ResearchNav />
      <div class="rs-sidebar-footer">
        <div class="rs-storage-info">
          <span>存储空间</span>
          <strong>34.2 / 100 GB</strong>
        </div>
        <div class="rs-storage-bar">
          <div class="rs-storage-bar-fill"></div>
        </div>
        <button class="rs-help-link" type="button">帮助与文档 →</button>
      </div>
    </aside>

    <!-- 主工作区 -->
    <main class="rs-main">
      <div class="rs-workspace">
        <RouterView class="rs-view" />
      </div>
    </main>

    <!-- 证据面板 -->
    <aside class="rs-evidence" :class="{ open: evidenceOpen }" aria-label="证据账本">
      <EvidencePanel @close="evidenceOpen = false" />
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue'
import ResearchTopbar from '@/components/research/ResearchTopbar.vue'
import ResearchNav from '@/components/research/ResearchNav.vue'
import EvidencePanel from '@/components/research/EvidencePanel.vue'

const evidenceOpen = ref(true)
provide('evidenceOpen', evidenceOpen)
</script>
