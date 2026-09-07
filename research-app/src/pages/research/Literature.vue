<script setup lang="ts">
/**
 * 文献页（黄金链路二入口，TC-F02-01..12）。
 * 作用域：当前项目（默认第一个项目，可切换）；集合/条目/标签/详情三栏由 LiteratureBrowser 承担。
 * 诚实性：未选择项目时显示明确引导，不臆造数据。
 */
import { computed, ref } from 'vue';
import { AppButton, AppInput, AppCard, AppChip } from '@shared/ui';
import { useStewardChat } from '@features/steward/queries';
import { Sparkles, Search, Loader2 } from 'lucide-vue-next';
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

// S4 AI推荐检索词（真实调用 /steward/chat）
const aiRecommendOpen = ref(false);
const aiInput = ref('');
const aiLoading = ref(false);
const aiError = ref<string | null>(null);
const aiResults = ref<string[]>([]);
const stewardChat = useStewardChat();

async function generateSearchTerms(): Promise<void> {
  if (!aiInput.value.trim()) {
    aiError.value = '请输入研究问题或关键词';
    return;
  }
  aiLoading.value = true;
  aiError.value = null;
  aiResults.value = [];
  try {
    const prompt = `你是学术文献检索专家。请根据以下研究问题，推荐5-8个精准的学术检索词（中英文均可），每个检索词用换行分隔，不要解释，不要编号，不要加引号。\n\n研究问题：${aiInput.value}`;
    const response = await stewardChat.mutateAsync({ messages: [{ role: 'user', content: prompt }], reasoningPolicyId: 'standard' });
    const terms = response.content.split('\n').map((t: string) => t.trim()).filter((t: string) => t.length > 0 && t.length < 100);
    aiResults.value = terms.slice(0, 8);
    if (aiResults.value.length === 0) {
      aiError.value = 'AI未返回有效检索词，请重试';
    }
  } catch (err) {
    aiError.value = err instanceof Error ? `AI调用失败：${err.message}` : 'AI调用失败，请稍后重试';
  } finally {
    aiLoading.value = false;
  }
}

function useTerm(term: string): void {
  aiInput.value = term;
  aiRecommendOpen.value = false;
  searchOpen.value = true;
}
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
        <!-- S4 AI推荐检索词面板 -->
        <AppCard
          v-if="aiRecommendOpen"
          class="ai-recommend-panel"
          padding="md"
        >
          <div class="ai-recommend-head">
            <span class="ai-recommend-title"><Sparkles :size="16" /> AI推荐检索词</span>
            <AppChip
              tone="primary"
              size="sm"
            >
              真实 /steward/chat
            </AppChip>
          </div>
          <div class="ai-recommend-input">
            <AppInput
              v-model="aiInput"
              placeholder="输入研究问题，例如：分层线性模型下数学建模成绩差异的多层分析"
              @keyup.enter="generateSearchTerms"
            />
            <AppButton
              type="button"
              :disabled="aiLoading"
              @click="generateSearchTerms"
            >
              <Loader2
                v-if="aiLoading"
                :size="14"
                class="spin"
              />
              <Search
                v-else
                :size="14"
              />
              {{ aiLoading ? '生成中…' : '生成' }}
            </AppButton>
          </div>
          <div
            v-if="aiError"
            class="ai-error"
            role="alert"
          >
            {{ aiError }}
          </div>
          <div
            v-if="aiResults.length > 0"
            class="ai-results"
          >
            <p class="ai-results-label">
              推荐检索词（点击使用）：
            </p>
            <div class="ai-terms">
              <AppChip
                v-for="term in aiResults"
                :key="term"
                tone="neutral"
                size="md"
                class="ai-term"
                @click="useTerm(term)"
              >
                <Search :size="12" /> {{ term }}
              </AppChip>
            </div>
          </div>
          <p class="ai-honesty-note">
            诚实标注：AI推荐检索词由大模型生成，可能不精准，建议结合专业判断调整。
          </p>
        </AppCard>
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

.ai-recommend-panel { margin-bottom: 16px; }
.ai-recommend-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.ai-recommend-title { display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 15px; color: var(--s16-text, #0f172a); }
.ai-recommend-input { display: flex; gap: 8px; margin-bottom: 12px; }
.ai-recommend-input .s16-input { flex: 1; }
.ai-error { color: #ef4444; font-size: 13px; margin: 8px 0; padding: 8px; background: #fef2f2; border-radius: 6px; }
.ai-results-label { font-size: 13px; color: #64748b; margin: 0 0 8px; }
.ai-terms { display: flex; flex-wrap: wrap; gap: 8px; }
.ai-term { cursor: pointer; transition: all 0.15s; }
.ai-term:hover { opacity: 0.8; transform: translateY(-1px); }
.ai-honesty-note { font-size: 11px; color: #94a3b8; margin: 12px 0 0; font-style: italic; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
