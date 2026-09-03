<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { Home, FolderOpen, BookOpen, PenLine, ClipboardCheck, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { useUiStore } from '@app/stores/ui';

const ui = useUiStore();
const route = useRoute();

interface NavItem {
  path: string;
  label: string;
  icon: typeof Home;
  // 顺序与提示词"六个一级入口"冻结一致
  badge?: string;
}

const items: readonly NavItem[] = [
  { path: '/research/home', label: '科研首页', icon: Home },
  { path: '/research/projects', label: '科研项目', icon: FolderOpen },
  { path: '/research/literature', label: '文献', icon: BookOpen },
  { path: '/research/writing', label: '写作', icon: PenLine },
  { path: '/research/review', label: '评审', icon: ClipboardCheck },
  { path: '/research/education', label: '教育研究', icon: GraduationCap },
];

const isActive = (path: string) => route.path.startsWith(path);
const isCollapsed = computed(() => ui.sidebarCollapsed);
</script>

<template>
  <nav
    id="global-nav"
    :class="{ 'nav-collapsed': isCollapsed }"
    aria-label="科研端主导航"
  >
    <RouterLink
      to="/research/home"
      class="nav-brand"
      :aria-label="'返回科研首页'"
    >
      <span
        class="brand-mark"
        aria-hidden="true"
      >知</span>
      <span
        v-if="!isCollapsed"
        class="nav-copy"
      >
        <b>智学数研</b>
        <small>可信研究工作台</small>
      </span>
    </RouterLink>

    <div class="nav-links">
      <RouterLink
        v-for="item in items"
        :key="item.path"
        :to="item.path"
        class="nav-link"
        :class="{ active: isActive(item.path) }"
        :aria-label="item.label"
        :title="isCollapsed ? item.label : undefined"
      >
        <span
          class="nav-icon"
          aria-hidden="true"
        >
          <component
            :is="item.icon"
            :size="18"
          />
        </span>
        <span
          v-if="!isCollapsed"
          class="nav-label"
        >{{ item.label }}</span>
        <span
          v-if="item.badge && !isCollapsed"
          class="nav-badge"
        >{{ item.badge }}</span>
      </RouterLink>
    </div>

    <div class="nav-bottom">
      <button
        id="personal-center"
        class="nav-utility"
        :aria-expanded="ui.personalCenterOpen"
        :aria-label="'研究者中心'"
        @click="ui.togglePersonalCenter()"
      >
        <span
          class="personal-avatar"
          aria-hidden="true"
        >研</span>
        <span
          v-if="!isCollapsed"
          class="nav-copy"
        >研究者中心</span>
      </button>
      <button
        id="nav-collapse"
        class="nav-utility"
        :aria-expanded="!isCollapsed"
        :aria-label="isCollapsed ? '展开导航' : '折叠导航'"
        @click="ui.toggleSidebar()"
      >
        <component
          :is="isCollapsed ? ChevronRight : ChevronLeft"
          :size="14"
          aria-hidden="true"
        />
        <span
          v-if="!isCollapsed"
          class="nav-copy"
        >折叠导航</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
#global-nav {
  grid-row: 1 / 3;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 14px 10px;
  gap: 4px;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
}
.nav-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 3px 5px 17px;
  background: transparent;
  text-align: left;
  color: var(--text);
}
.brand-mark {
  width: 31px;
  height: 31px;
  border-radius: 8px;
  background: var(--primary);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 800;
  flex: 0 0 auto;
}
.nav-brand b {
  display: block;
  font-size: var(--font-size-base);
}
.nav-brand small {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}
.nav-links {
  display: grid;
  gap: 4px;
}
.nav-link {
  border-radius: 7px;
  background: transparent;
  padding: 9px 10px;
  color: var(--text-muted);
  white-space: nowrap;
  text-align: left;
  position: relative;
  display: flex;
  align-items: center;
  gap: 9px;
  text-decoration: none;
}
.nav-link:hover {
  background: var(--subtle-bg);
  color: var(--text);
}
.nav-link.active {
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 700;
}
.nav-link.active::after {
  content: '';
  width: 3px;
  background: var(--primary);
  border-radius: 999px;
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
}
.nav-icon {
  width: 18px;
  text-align: center;
  font-size: 16px;
  line-height: 1;
  flex: 0 0 18px;
}
.nav-bottom {
  display: grid;
  gap: 6px;
  margin-top: auto;
  border-top: 1px solid var(--border);
  padding-top: 10px;
}
.nav-utility {
  border-radius: 7px;
  background: transparent;
  color: var(--text-muted);
  padding: 8px 10px;
  white-space: nowrap;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.nav-utility:hover {
  background: var(--subtle-bg);
  color: var(--text);
}
.personal-avatar {
  width: 25px;
  height: 25px;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary);
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: var(--font-size-xs);
  flex: 0 0 auto;
}
.nav-collapsed .nav-link {
  justify-content: center;
  padding-left: 6px;
  padding-right: 6px;
}
.nav-collapsed .nav-utility {
  justify-content: center;
  padding-left: 6px;
  padding-right: 6px;
}
/* ≤1279px 栅格列固定为 --nav-collapsed（64px），与 ResearchLayout 断点对齐：
   隐藏文字标签只留图标，避免 nowrap 标签在窄列中被裁成残字（布局破损）。 */
@media (max-width: 1279px) {
  .nav-copy,
  .nav-label {
    display: none;
  }
  .nav-link,
  .nav-utility {
    justify-content: center;
    padding-left: 6px;
    padding-right: 6px;
  }
}
</style>
