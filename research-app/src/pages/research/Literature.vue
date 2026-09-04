<script setup lang="ts">
/**
 * 文献页（黄金链路二入口，TC-F02-01..12）。
 * 作用域：当前项目（默认第一个项目，可切换）；集合/条目/标签/详情三栏由 LiteratureBrowser 承担。
 * 诚实性：未选择项目时显示明确引导，不臆造数据。
 */
import { computed, ref } from 'vue';
import Boundary from '@shared/ui/Boundary.vue';
import Skeleton from '@shared/ui/Skeleton.vue';
import EmptyState from '@shared/ui/EmptyState.vue';
import LiteratureBrowser from '@widgets/LiteratureBrowser/LiteratureBrowser.vue';
import LiteratureSearchDialog from '@widgets/LiteratureSearchDialog/LiteratureSearchDialog.vue';
import ImportDialog from '@widgets/ImportDialog/ImportDialog.vue';
import { useProjects } from '@features/projects/use-projects';
import { useInvalidateLiterature } from '@features/literature/queries';

const projectsQuery = useProjects(20);
const projects = computed(() => projectsQuery.data.value?.items ?? []);
const activeProjectId = ref<string>('');
const projectId = computed(() => activeProjectId.value || projects.value[0]?.id || '');

const searchOpen = ref(false);
const importOpen = ref(false);

// 检索导入走 mutation onSuccess 失效；SSE 驱动的批量导入不在 mutation 生命周期内，
// 导入完成的 itemId 事件必须在此失效列表缓存，否则库内看不到新条目。
const invalidateLiterature = useInvalidateLiterature();
function onImported(itemId?: string): void {
  void invalidateLiterature(itemId ? [itemId] : []);
}
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div>
        <h1>文献</h1>
        <p>三源检索、集合/标签管理、批量导入与切分确认，条目关系按 Zotero 心智组织。</p>
      </div>
      <div class="actions">
        <template v-if="projectsQuery.isPending.value">
          <Skeleton label="项目列表加载中" />
        </template>
        <select
          v-else-if="projects.length > 0"
          :value="projectId"
          class="scope"
          aria-label="切换文献库所属项目"
          @change="activeProjectId = ($event.target as HTMLSelectElement).value"
        >
          <option
            v-for="p in projects"
            :key="p.id"
            :value="p.id"
          >
            {{ p.title }}
          </option>
        </select>
        <button
          class="btn"
          type="button"
          :disabled="!projectId"
          @click="searchOpen = true"
        >
          检索文献
        </button>
        <button
          class="btn primary"
          type="button"
          :disabled="!projectId"
          @click="importOpen = true"
        >
          导入文献
        </button>
      </div>
    </header>

    <EmptyState
      v-if="!projectsQuery.isPending.value && !projectId"
      title="还没有科研项目"
      hint="文献库按项目组织：先创建项目，再导入与检索文献。"
    >
      <button
        class="btn primary"
        type="button"
        @click="$router.push({ name: 'projects' })"
      >
        前往新建项目
      </button>
    </EmptyState>

    <Skeleton
      v-else-if="projectsQuery.isPending.value"
      label="文献库加载中"
    />

    <Boundary
      v-else-if="projectsQuery.isError.value"
      tone="danger"
      title="项目列表加载失败"
    >
      {{ projectsQuery.error.value?.message }}
      <button
        class="retry"
        type="button"
        @click="projectsQuery.refetch()"
      >
        重试
      </button>
    </Boundary>

    <LiteratureBrowser
      v-else
      :key="projectId"
      :project-id="projectId"
      @open-search="searchOpen = true"
      @open-import="importOpen = true"
    />

    <LiteratureSearchDialog
      :open="searchOpen"
      :project-id="projectId"
      @close="searchOpen = false"
      @added="onImported"
    />
    <ImportDialog
      :open="importOpen"
      @close="importOpen = false"
      @imported="onImported"
    />
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
  justify-content: space-between;
  margin-bottom: 16px;
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
.actions {
  display: flex;
  gap: 7px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.scope {
  min-height: 34px;
  padding: 5px 9px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  font-weight: 650;
  color: var(--text);
  max-width: 200px;
}
.btn {
  min-height: 34px;
  padding: 6px 11px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  font-weight: 650;
  color: var(--text);
  cursor: pointer;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn.primary {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}
.retry {
  border: 0;
  background: none;
  color: var(--primary);
  font-weight: 700;
  cursor: pointer;
  padding: 0 2px;
  text-decoration: underline;
}
</style>
