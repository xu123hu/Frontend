/**
 * 教育研究域 vue-query（CR-F5-01）。
 * 状态派生：步骤流由页面本地推进；远端数据（study/product/preflight/snapshot/analysis）走 query/mutation。
 */
import { toValue, type MaybeRefOrGetter } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import type { UseQueryReturnType } from '@tanstack/vue-query';
import { createSnapshot, exportChart, fetchDataProducts, fetchEducationStudy, requestPublication, runAnalysis, runPreflight } from './api';
import type { AnalysisResult, ChartExport, DatasetSnapshot, EducationDataProduct, EducationStudy, PublicationRequest } from '@entities/education/types';

export const educationKeys = {
  all: ['education'] as const,
  study: () => [...educationKeys.all, 'study'] as const,
  products: () => [...educationKeys.all, 'products'] as const,
  snapshot: (id: string) => [...educationKeys.all, 'snapshot', id] as const,
  analysis: (id: string) => [...educationKeys.all, 'analysis', id] as const,
};

export function useEducationStudy(): UseQueryReturnType<EducationStudy | null, Error> {
  return useQuery({
    queryKey: educationKeys.study(),
    queryFn: ({ signal }) => fetchEducationStudy(signal),
  });
}

export function useDataProducts(): UseQueryReturnType<EducationDataProduct[] | null, Error> {
  return useQuery({
    queryKey: educationKeys.products(),
    queryFn: ({ signal }) => fetchDataProducts(signal),
  });
}

export function usePreflight() {
  return useMutation({
    mutationFn: ({ productId, scope }: { productId: string; scope: Record<string, string> }) => runPreflight(productId, scope),
  });
}

export function useCreateSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, scope }: { productId: string; scope: Record<string, string> }) => createSnapshot(productId, scope),
    onSuccess: (snapshot: DatasetSnapshot) => {
      queryClient.setQueryData(educationKeys.snapshot(snapshot.id), snapshot);
    },
  });
}

export function useRunAnalysis(snapshotId: MaybeRefOrGetter<string | null>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => runAnalysis(toValue(snapshotId) ?? ''),
    onSuccess: (result: AnalysisResult) => {
      queryClient.setQueryData(educationKeys.analysis(result.id), result);
    },
  });
}

export function useExportChart() {
  return useMutation({
    mutationFn: ({ snapshotId, format }: { snapshotId: string; format: string }) => exportChart(snapshotId, format),
  });
}

export function useRequestPublication() {
  return useMutation({
    mutationFn: ({ studyId }: { studyId: string }) => requestPublication(studyId),
  });
}

export type { ChartExport, DatasetSnapshot, EducationDataProduct, EducationStudy, PublicationRequest };
