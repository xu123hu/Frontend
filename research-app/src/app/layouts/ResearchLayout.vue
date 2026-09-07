<script setup lang="ts">
import GlobalNav from '@widgets/Nav/GlobalNav.vue';
import AppHeader from '@widgets/Header/AppHeader.vue';
import AssistantOrb from '@widgets/AssistantOrb/AssistantOrb.vue';
import AgentDrawer from '@widgets/AgentDrawer/AgentDrawer.vue';
import { useUiStore } from '@app/stores/ui';
import { watch } from 'vue';
import { useRoute } from 'vue-router';

const ui = useUiStore();
const route = useRoute();

// 双轨背景（H17）：路由 meta.theme 驱动 <html data-theme>。
// portal=入口页渐变；work=工作页中性浅灰。
watch(
  () => (typeof route.meta.theme === 'string' ? route.meta.theme : 'work'),
  (theme) => {
    document.documentElement.dataset.theme = theme;
  },
  { immediate: true },
);
</script>

<template>
  <div
    id="app-shell"
    :class="{ 'nav-collapsed': ui.sidebarCollapsed }"
  >
    <GlobalNav />
    <div class="shell-main">
      <AppHeader />
      <div class="app-layout">
        <main
          id="view-root"
          tabindex="-1"
          role="main"
        >
          <RouterView />
        </main>
      </div>
    </div>
    <AssistantOrb />
    <AgentDrawer />
  </div>
</template>

<style scoped>
#app-shell {
  min-height: 100vh;
  background: var(--app-bg);
  display: grid;
  grid-template-columns: var(--nav-expanded) minmax(0, 1fr);
  transition: grid-template-columns var(--transition-base);
}
#app-shell.nav-collapsed {
  grid-template-columns: var(--nav-collapsed) minmax(0, 1fr);
}
.shell-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.app-layout {
  min-height: calc(100vh - var(--header-height));
  flex: 1;
}
#view-root {
  min-width: 0;
  padding: 25px clamp(18px, 3vw, 42px) 48px;
  outline: 0;
}
@media (max-width: 1279px) {
  #app-shell {
    grid-template-columns: var(--nav-collapsed) minmax(0, 1fr);
  }
}
@media (max-width: 760px) {
  #app-shell {
    grid-template-columns: var(--nav-collapsed) minmax(0, 1fr);
  }
  #view-root {
    padding: 18px 12px 88px;
  }
}
</style>




