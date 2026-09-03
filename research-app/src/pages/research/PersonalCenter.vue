<script setup lang="ts">
/**
 * 启动期只读自检。
 * 在开发模式下，把 M0 状态以 Boundary 形式展示。
 * 任何业务 API 接入必须先经过 R0 契约审查。
 */
import Boundary from '@shared/ui/Boundary.vue';
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>个人中心</h1>
        <p>账户偏好、通知、隐私与记忆管理。</p>
      </div>
    </header>
    <Boundary tone="info" title="F0 占位：个人中心">
      F1 阶段实现：语言/通知/单位偏好（@intlify/unplugin-vue-i18n）、会话管理、记忆可见/编辑/删除。
      偏好持久化通过 `PATCH /api/research/v1/users/me/preferences`，不写入 localStorage。
    </Boundary>
  </div>
</template>

<style scoped>
.page {
  max-width: 1460px;
  margin: 0 auto;
}
.page-head {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  margin-bottom: 18px;
}
.page-head h1 {
  font-size: var(--font-size-3xl);
  margin: 0 0 6px;
}
.page-head p {
  margin: 0;
  color: var(--text-muted);
  max-width: 75ch;
}
</style>
