/**
 * 评审域用例（vue-query）。
 * - 键层级：review → 资源（papers/paper/claims/verification/lean/revisions）。
 * - 修正/复核/验证启动成功后精确失效对应缓存。
 * - 验证/Lean 未运行（404）→ 返回 null（UI 显示「未运行」而非错误态）。
 */
import { computed, unref, type MaybeRef, type MaybeRefOrGetter, toValue } from 'vue';
import { useQuery, useMutation, useQueryClient, type UseQueryReturnType } from '@tanstack/vue-query';
import { ApiError } from '@app/api/client';
import {
  correctClaim,
  fetchClaims,
  fetchLean,
  fetchRevisions,
  fetchReviewPaper,
  fetchReviewPapers,
  fetchVerification,
  reviewRevision,
  startVerificationRun,
} from './api';
import type { LeanThreeStates, ReviewClaim, ReviewPaper, Revision, VerificationLayer } from '@entities/review/types';

export const reviewKeys = {
  all: ['review'] as const,
  papers: () => [...reviewKeys.all, 'papers'] as const,
  paper: (paperId: string) => [...reviewKeys.all, 'paper', paperId] as const,
  claims: (paperId: string) => [...reviewKeys.all, 'claims', paperId] as const,
  verification: (claimId: string) => [...reviewKeys.all, 'verification', claimId] as const,
  lean: (claimId: string) => [...reviewKeys.all, 'lean', claimId] as const,
  revisions: (paperId: string) => [...reviewKeys.all, 'revisions', paperId] as const,
};

/** 未运行（404）静默转 null：验证/Lean 是可选记录，非错误态。 */
async function optional<T>(fetcher: () => Promise<T>): Promise<T | null> {
  try {
    return await fetcher();
  } catch (err) {
    if (err instanceof ApiError && err.kind === 'not_found') return null;
    throw err;
  }
}

export function useReviewPapers(): UseQueryReturnType<ReviewPaper[], Error> {
  return useQuery({
    queryKey: reviewKeys.papers(),
    queryFn: ({ signal }) => fetchReviewPapers(signal),
  });
}

export function useReviewPaper(paperId: MaybeRef<string>): UseQueryReturnType<ReviewPaper, Error> {
  return useQuery({
    queryKey: reviewKeys.paper(unref(paperId)),
    queryFn: ({ signal }) => fetchReviewPaper(unref(paperId), signal),
    enabled: computed(() => !!unref(paperId)),
    retry: false,
  });
}

export function useClaims(paperId: MaybeRef<string>): UseQueryReturnType<ReviewClaim[], Error> {
  return useQuery({
    queryKey: reviewKeys.claims(unref(paperId)),
    queryFn: ({ signal }) => fetchClaims(unref(paperId), signal),
    enabled: computed(() => !!unref(paperId)),
  });
}

export function useCorrectClaim(paperId: MaybeRef<string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, correctedStatement }: { claimId: string; correctedStatement: string }) =>
      correctClaim(claimId, correctedStatement),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reviewKeys.claims(unref(paperId)) }),
  });
}

export function useVerification(claimId: MaybeRefOrGetter<string | null>): UseQueryReturnType<VerificationLayer[] | null, Error> {
  return useQuery({
    queryKey: computed(() => [...reviewKeys.all, 'verification', toValue(claimId) ?? '__none__'] as const),
    queryFn: ({ signal }) => (toValue(claimId) ? optional(() => fetchVerification(toValue(claimId)!, signal)) : Promise.resolve(null)),
    enabled: computed(() => !!toValue(claimId)),
  });
}

export function useLean(claimId: MaybeRefOrGetter<string | null>): UseQueryReturnType<LeanThreeStates | null, Error> {
  return useQuery({
    queryKey: computed(() => [...reviewKeys.all, 'lean', toValue(claimId) ?? '__none__'] as const),
    queryFn: ({ signal }) => (toValue(claimId) ? optional(() => fetchLean(toValue(claimId)!, signal)) : Promise.resolve(null)),
    enabled: computed(() => !!toValue(claimId)),
  });
}

export function useRevisions(paperId: MaybeRef<string>): UseQueryReturnType<Revision[], Error> {
  return useQuery({
    queryKey: reviewKeys.revisions(unref(paperId)),
    queryFn: ({ signal }) => fetchRevisions(unref(paperId), signal),
    enabled: computed(() => !!unref(paperId)),
  });
}

export function useReviewRevision(paperId: MaybeRef<string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ revisionId, status, reviewerNote }: { revisionId: string; status: 'approved' | 'needs_more_work'; reviewerNote: string }) =>
      reviewRevision(revisionId, status, reviewerNote),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reviewKeys.revisions(unref(paperId)) }),
  });
}

export function useStartVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, mockMethod }: { claimId: string; mockMethod?: 'layers' | 'lean' }) =>
      startVerificationRun(claimId, mockMethod ? { mockMethod } : {}),
    onSuccess: (_data, variables) => {
      // 运行完成后结果端点才有数据：延迟失效由调用方在 SSE 完成回调中触发，
      // 此处先失效一次保证重新运行后旧结果被清除。
      queryClient.invalidateQueries({ queryKey: reviewKeys.verification(variables.claimId) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.lean(variables.claimId) });
    },
  });
}
