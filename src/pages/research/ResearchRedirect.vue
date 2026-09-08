<script setup>
/**
 * 科研端入口（并入统一前端）：跳转到平台内真实科研首页 /research。
 * 以前指向独立 research-app（已弃用），现改为 SPA 内路由。
 */
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
onMounted(() => {
  router.replace('/research')
})
</script>

<template>
  <div class="rs-redir">
    <div class="rs-redir__mark">∫</div>
    <p class="rs-redir__title">正在进入科研端…</p>
    <button class="re-btn primary sm" @click="router.replace('/research')">进入科研端</button>
  </div>
</template>

<style scoped>
.rs-redir { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; background: #f7faff; color: #0d1830; font-family: Inter, "Microsoft YaHei", sans-serif; }
.rs-redir__mark { font-size: 40px; font-weight: 700; color: #4169e1; }
.rs-redir__title { font-size: 16px; }
</style>