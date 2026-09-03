<script setup lang="ts">
/**
 * 顶栏项目切换器（黄金链路一 TC-F01-06）。
 * 数据来自 GET /projects（当前租户）；切换后同步 ui store 项目名并跳转项目详情。
 * 无项目时显示「新建项目」引导入口。
 */
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { ChevronDown, FolderPlus } from 'lucide-vue-next';
import { useProjects } from '@features/projects/use-projects';
import { useUiStore } from '@app/stores/ui';
import Skeleton from '@shared/ui/Skeleton.vue';

const router = useRouter();
const ui = useUiStore();
const { data, isPending, isError } = useProjects(20);

const open = ref(false);
const root = ref<HTMLElement | null>(null);

const projects = computed(() => data.value?.items ?? []);
const currentTitle = computed(() => ui.currentProjectName || '选择项目');

function choose(id: string, title: string): void {
  ui.setProjectName(title);
  open.value = false;
  void router.push({ name: 'project', params: { id } });
}

function onDocumentClick(event: MouseEvent): void {
  if (root.value && !root.value.contains(event.target as Node)) open.value = false;
}
onMounted(() => document.addEventListener('click', onDocumentClick));
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick));
</script>

<template>
  <div
    ref="root"
    class="switcher"
  >
    <button
      type="button"
      class="switcher-btn"
      :aria-expanded="open"
      aria-haspopup="listbox"
      aria-label="切换项目"
      @click="open = !open"
    >
      <span class="title">{{ currentTitle }}</span>
      <ChevronDown :size="14" />
    </button>
    <div
      v-if="open"
      class="menu"
      role="listbox"
      aria-label="项目列表"
    >
      <Skeleton
        v-if="isPending"
        label="项目列表加载中"
      />
      <p
        v-else-if="isError"
        class="muted"
        role="alert"
      >
        项目列表加载失败，请稍后重试。
      </p>
      <template v-else-if="projects.length > 0">
        <button
          v-for="project in projects"
          :key="project.id"
          type="button"
          role="option"
          :aria-selected="project.title === ui.currentProjectName"
          class="menu-item"
          @click="choose(project.id, project.title)"
        >
          <span class="item-title">{{ project.title }}</span>
          <span class="item-domain">{{ project.domain }} · {{ project.stage }}</span>
        </button>
      </template>
      <p
        v-else
        class="muted"
      >
        当前租户还没有项目。
      </p>
      <button
        type="button"
        class="menu-item create"
        @click="open = false; router.push({ name: 'projects' })"
      >
        <FolderPlus :size="14" />
        前往新建项目
      </button>
    </div>
  </div>
</template>

<style scoped>
.switcher {
  position: relative;
}
.switcher-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  font-weight: 700;
  color: var(--text);
}
.switcher-btn:hover {
  background: var(--subtle-bg);
}
.title {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  min-width: 280px;
  max-height: 320px;
  overflow: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r);
  box-shadow: var(--shadow);
  padding: 6px;
  z-index: 40;
}
.menu-item {
  display: grid;
  gap: 2px;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  cursor: pointer;
}
.menu-item:hover,
.menu-item[aria-selected='true'] {
  background: var(--primary-soft);
}
.item-title {
  font-weight: 700;
  font-size: var(--font-size-sm);
}
.item-domain {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}
.menu-item.create {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--primary);
  font-weight: 700;
  border-top: 1px solid var(--border);
  border-radius: 0 0 7px 7px;
  margin-top: 4px;
  padding-top: 10px;
}
.muted {
  padding: 10px;
  color: var(--text-muted);
  font-size: var(--font-size-sm);
  margin: 0;
}
</style>
