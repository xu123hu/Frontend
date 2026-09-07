<script setup lang="ts">
/**
 * 文献页（黄金链路二入口，TC-F02-01..12）。
 * 作用域：当前项目（默认第一个项目，可切换）；集合/条目/标签/详情三栏由 LiteratureBrowser 承担。
 * 诚实性：未选择项目时显示明确引导，不臆造数据。
 */
import { computed, ref } from 'vue';
import { AppButton } from '@shared/ui';
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
        <AppButton
          variant="secondary"
          :disabled="!projectId"
          @click="searchOpen = true"
        >
          检索文献
        </AppButton>
        <AppButton
          :disabled="!projectId"
          @click="importOpen = true"
        >
          导入文献
        </AppButton>
      </div>
    </header>

    <EmptyState
      v-if="!projectsQuery.isPending.value && !projectId"
      title="还没有科研项目"
      hint="文献库按项目组织：先创建项目，再导入与检索文献。"
    >
      <AppButton @click="$router.push({ name: 'projects' })">
        前往新建项目
      </AppButton>
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
      <AppButton
        variant="ghost"
        size="sm"
        @click="projectsQuery.refetch()"
      >
        重试
      </AppButton>
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
  margin: 0 0 6px;
  font-size: var(--font-size-3xl);
  color: var(--ailp-foreground);
}
.page-head p {
  margin: 0;
  color: var(--ailp-muted-foreground);
  max-width: 75ch;
  font-size: var(--font-size-base);
}
.actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.scope {
  min-height: 34px;
  padding: 5px 12px;
  border: 1px solid var(--ailp-input);
  border-radius: var(--radius-md);
  background: var(--ailp-card);
  font-family: var(--font);
  font-weight: 650;
  font-size: var(--font-size-base);
  color: var(--ailp-foreground);
  max-width: 220px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.scope:focus {
  border-color: var(--ailp-ring);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
</style>
