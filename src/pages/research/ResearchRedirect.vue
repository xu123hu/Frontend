<script setup>
/**
 * 科研端入口（同源挂载后）：由主平台跳转到 /research-app/（科研前端静态构建，
 * 与主平台同源，由主前端服务承担）。整体导航（location.assign）规避 Vue Router
 * 的 catch-all，保证 5176 单地址直连科研工作台。
 */
import { onMounted } from 'vue'
onMounted(() => {
  location.assign('/research-app/')
})
</script>

<template>
  <div class="rs-redir">
    <div class="rs-redir__mark">ƒ</div>
    <p class="rs-redir__title">正在打开科研工作台…</p>
    <a class="rs-redir__sub" href="/research-app/">若未跳转，请点击此处进入</a>
  </div>
</template>

<style scoped>
.rs-redir { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; background: var(--ed-wash, #f5f4ef); color: var(--ed-ink, #202a26); font-family: var(--ed-font-sans, inherit); }
.rs-redir__mark { font-family: var(--ed-font-serif, serif); font-size: 40px; color: var(--ed-pine, #174c3c); }
.rs-redir__title { font-size: 16px; }
.rs-redir__sub { font-size: 13px; color: var(--ed-ink-3, #79857e); }
</style>