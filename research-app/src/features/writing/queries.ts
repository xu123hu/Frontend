/**
 * 写作域用例（vue-query）。
 * - 键层级：writing → 域 → 作用域（项目/文稿）→ 资源。
 * - 写操作成功后精确失效对应缓存（编译/决策/引用/保存）。
 * - 409 乐观锁冲突原样抛 ApiError，UI 提示重新加载。
 */
import { computed, unref, type MaybeRef, type MaybeRefOrGetter, toValue } from 'vue';
import { useQuery, useMutation, useQueryClient, type UseQueryReturnType } from '@tanstack/vue-query';
import {
  createManuscript,
  decideSuggestion,
  fetchCitationCandidates,
  fetchCompileRun,
  fetchManuscript,
  fetchManuscriptFiles,
  fetchManuscripts,
  fetchSuggestions,
  insertCitation,
  saveFileContent,
  startCompile,
} from './api';
import type { AiSuggestion, Manuscript, ManuscriptFile, CompileRun } from '@entities/writing/types';

export const writingKeys = {
  all: ['writing'] as const,
  manuscripts: (projectId: string) => [...writingKeys.all, 'manuscripts', projectId] as const,
  manuscript: (manuscriptId: string) => [...writingKeys.all, 'manuscript', manuscriptId] as const,
  files: (manuscriptId: string) => [...writingKeys.all, 'files', manuscriptId] as const,
  file: (fileId: string) => [...writingKeys.all, 'file', fileId] as const,
  suggestions: (manuscriptId: string) => [...writingKeys.all, 'suggestions', manuscriptId] as const,
  citations: (manuscriptId: string) => [...writingKeys.all, 'citations', manuscriptId] as const,
  compile: (runId: string) => [...writingKeys.all, 'compile', runId] as const,
};

export function useManuscripts(projectId: MaybeRefOrGetter<string>): UseQueryReturnType<Manuscript[], Error> {
  return useQuery({
    queryKey: computed(() => writingKeys.manuscripts(toValue(projectId))),
    queryFn: ({ signal }) => fetchManuscripts(toValue(projectId), signal).then((e) => e.items),
    enabled: computed(() => !!toValue(projectId)),
  });
}

export function useManuscript(manuscriptId: MaybeRef<string>): UseQueryReturnType<Manuscript, Error> {
  return useQuery({
    queryKey: writingKeys.manuscript(unref(manuscriptId)),
    queryFn: ({ signal }) => fetchManuscript(unref(manuscriptId), signal),
    enabled: computed(() => !!unref(manuscriptId)),
    retry: false,
  });
}

export function useCreateManuscript(projectId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createManuscript(toValue(projectId), name, crypto.randomUUID()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: writingKeys.manuscripts(toValue(projectId)) }),
  });
}

export function useManuscriptFiles(manuscriptId: MaybeRef<string>): UseQueryReturnType<ManuscriptFile[], Error> {
  return useQuery({
    queryKey: writingKeys.files(unref(manuscriptId)),
    queryFn: ({ signal }) => fetchManuscriptFiles(unref(manuscriptId), signal),
    enabled: computed(() => !!unref(manuscriptId)),
  });
}

export function useSaveFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, content, version }: { fileId: string; content: string; version: number }) =>
      saveFileContent(fileId, content, version),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: writingKeys.file(saved.id) });
      // 保存后文件内容变化 → 建议/编译上下文失效
      queryClient.invalidateQueries({ queryKey: [...writingKeys.all, 'suggestions'] });
    },
  });
}

export function useSuggestions(manuscriptId: MaybeRef<string>): UseQueryReturnType<AiSuggestion[], Error> {
  return useQuery({
    queryKey: writingKeys.suggestions(unref(manuscriptId)),
    queryFn: ({ signal }) => fetchSuggestions(unref(manuscriptId), signal),
    enabled: computed(() => !!unref(manuscriptId)),
  });
}

export function useDecideSuggestion(manuscriptId: MaybeRef<string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ suggestionId, accept }: { suggestionId: string; accept: boolean }) => decideSuggestion(suggestionId, accept),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: writingKeys.suggestions(unref(manuscriptId)) }),
  });
}

export function useCitationCandidates(manuscriptId: MaybeRef<string>) {
  return useQuery({
    queryKey: writingKeys.citations(unref(manuscriptId)),
    queryFn: ({ signal }) => fetchCitationCandidates(unref(manuscriptId), signal),
    enabled: computed(() => !!unref(manuscriptId)),
  });
}

export function useInsertCitation(manuscriptId: MaybeRef<string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => insertCitation(unref(manuscriptId), itemId, crypto.randomUUID()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: writingKeys.citations(unref(manuscriptId)) });
      queryClient.invalidateQueries({ queryKey: writingKeys.files(unref(manuscriptId)) });
    },
  });
}

// ---------- 编译 run（SSE 由调用方 useCompileRunEvents 消费，与 F2 导入队列同构） ----------

export function useStartCompile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ manuscriptId, mockScenario }: { manuscriptId: string; mockScenario?: 'success' | 'missing_resource' | 'unsafe_command' }) =>
      startCompile(manuscriptId, mockScenario ? { mockScenario } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...writingKeys.all, 'manuscript'] });
    },
  });
}

export function useCompileRun(runId: MaybeRefOrGetter<string | null>): UseQueryReturnType<CompileRun | null, Error> {
  return useQuery({
    queryKey: computed(() => {
      const id = toValue(runId);
      return [...writingKeys.all, 'compile', id ?? '__none__'] as const;
    }),
    queryFn: ({ signal }) => (toValue(runId) ? fetchCompileRun(toValue(runId)!, signal) : Promise.resolve(null)),
    enabled: computed(() => !!toValue(runId)),
    refetchInterval: 1_200,
  });
}
