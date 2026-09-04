/**
 * 翻译域用例（vue-query）。
 * - 键层级：translation → 域 → 条目/run。
 * - 翻译 run 状态轮询（refetchInterval）+ 译文单元 + 保真报告。
 */
import { computed, ref, toValue, type MaybeRefOrGetter } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import {
  fetchFidelityReport,
  fetchTranslationRun,
  fetchTranslationUnits,
  startTranslation,
} from './api';
import type { FidelityReport, TranslationRun, TranslationUnit } from '@entities/translation/types';

export const translationKeys = {
  all: ['translation'] as const,
  run: (runId: string) => [...translationKeys.all, 'run', runId] as const,
  units: (itemId: string) => [...translationKeys.all, 'units', itemId] as const,
  fidelity: (runId: string) => [...translationKeys.all, 'fidelity', runId] as const,
};

/** 当前条目的「活动翻译 run」（成功后停止轮询）。 */
export function useActiveTranslationRun(itemId: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient();
  const activeRunId = ref<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => startTranslation(toValue(itemId)),
    onSuccess: (accepted) => {
      activeRunId.value = accepted.run_id;
      queryClient.setQueryData(translationKeys.run(accepted.run_id), {
        run_id: accepted.run_id,
        status: 'queued',
        progress: null,
        stageMessage: '等待服务端事件',
        budget: null,
        spent: null,
        artifact_id: null,
      } satisfies TranslationRun);
    },
  });
  const runQuery = useQuery({
    queryKey: computed(() => [...translationKeys.all, 'run', activeRunId.value ?? '__none__'] as const),
    queryFn: ({ signal }) => (activeRunId.value ? fetchTranslationRun(activeRunId.value, signal) : Promise.resolve(null)),
    enabled: computed(() => !!activeRunId.value),
    refetchInterval: (query) =>
      query.state.data && ['queued', 'running'].includes(query.state.data.status) ? 1_000 : false,
  });
  return { mutation, activeRunId, runQuery };
}

export function useTranslationUnits(itemId: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => translationKeys.units(toValue(itemId))),
    queryFn: ({ signal }) => fetchTranslationUnits(toValue(itemId), signal),
    enabled: computed(() => !!toValue(itemId)),
  });
}

export function useFidelityReport(runId: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => [...translationKeys.all, 'fidelity', toValue(runId) ?? '__none__'] as const),
    queryFn: ({ signal }) => (toValue(runId) ? fetchFidelityReport(toValue(runId)!, signal) : Promise.resolve(null)),
    enabled: computed(() => !!toValue(runId)),
  });
}

export type { FidelityReport, TranslationRun, TranslationUnit };
