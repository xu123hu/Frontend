/**
 * 文献域用例（vue-query）。
 * - 键层级：literature → 域 → 作用域（项目/条目）→ 过滤器，保证失效精确。
 * - 写操作成功后失效条目/集合缓存（集合计数服务端同步）。
 * - 409 duplicate_item / 404 等错误原样抛 ApiError，UI 层映射状态，不吞。
 */
import { computed, unref, type MaybeRef, type MaybeRefOrGetter, toValue } from 'vue';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient, type UseQueryReturnType } from '@tanstack/vue-query';
import {
  addToCollection,
  batchItems,
  confirmChunks,
  createAnnotation,
  createCollection,
  createItemFromHit,
  createNote,
  deleteAnnotation,
  deleteItem,
  fetchAnnotations,
  fetchChunks,
  fetchCollections,
  fetchItem,
  fetchItems,
  fetchNotes,
  removeFromCollection,
  searchLiterature,
  updateAnnotation,
  type AnnotationInput,
  type BatchItemsInput,
  type ItemFilters,
  type SearchResult,
} from './api';
import type { LitAnnotation, LitChunk, LitCollection, LitItem, LitNote } from '@entities/literature/types';

export const literatureKeys = {
  all: ['literature'] as const,
  collections: (projectId: string) => [...literatureKeys.all, 'collections', projectId] as const,
  items: (projectId: string, filters: ItemFilters) => [...literatureKeys.all, 'items', projectId, filters] as const,
  item: (itemId: string) => [...literatureKeys.all, 'item', itemId] as const,
  chunks: (itemId: string) => [...literatureKeys.all, 'chunks', itemId] as const,
  annotations: (itemId: string) => [...literatureKeys.all, 'annotations', itemId] as const,
  notes: (itemId: string) => [...literatureKeys.all, 'notes', itemId] as const,
};

export function useCollections(projectId: string): UseQueryReturnType<LitCollection[], Error> {
  return useQuery({
    queryKey: literatureKeys.collections(projectId),
    queryFn: ({ signal }) => fetchCollections(projectId, signal),
    enabled: !!projectId,
  });
}

export function useCreateCollection(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createCollection(projectId, name, crypto.randomUUID()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: literatureKeys.collections(projectId) }),
  });
}

export function useLiteratureItems(
  projectId: MaybeRef<string>,
  filters: MaybeRef<ItemFilters>,
): UseQueryReturnType<{ items: LitItem[]; next_cursor: string | null }, Error> {
  return useQuery({
    queryKey: [...literatureKeys.all, 'items', projectId, filters],
    queryFn: ({ signal }) => fetchItems(unref(projectId), unref(filters), signal),
    enabled: computed(() => !!unref(projectId)),
    placeholderData: (prev) => prev, // 筛选切换时保留上一页数据，避免闪烁
  });
}

export function useLiteratureItem(itemId: MaybeRef<string>): UseQueryReturnType<LitItem, Error> {
  return useQuery({
    queryKey: [...literatureKeys.all, 'item', itemId] as const,
    queryFn: ({ signal }) => fetchItem(unref(itemId), signal),
    enabled: computed(() => !!unref(itemId)),
    retry: false,
  });
}

/**
 * 游标分页无限查询（TC-F02-10：万级条目配合虚拟滚动）。
 * cursor 语义由服务端定义（opaque），前端只透传 next_cursor。
 */
export function useLiteratureItemsInfinite(projectId: MaybeRefOrGetter<string>, filters: MaybeRefOrGetter<ItemFilters>) {
  return useInfiniteQuery({
    queryKey: [...literatureKeys.all, 'items-inf', projectId, filters],
    queryFn: ({ signal, pageParam }) =>
      fetchItems(toValue(projectId), { ...toValue(filters), cursor: pageParam as string | undefined }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next_cursor ?? undefined,
    enabled: !!toValue(projectId),
    placeholderData: (prev) => prev,
  });
}

export function useChunks(itemId: MaybeRef<string>): UseQueryReturnType<LitChunk[], Error> {
  return useQuery({
    queryKey: [...literatureKeys.all, 'chunks', itemId] as const,
    queryFn: ({ signal }) => fetchChunks(unref(itemId), signal),
    enabled: computed(() => !!unref(itemId)),
  });
}

export function useAnnotations(itemId: MaybeRef<string>): UseQueryReturnType<LitAnnotation[], Error> {
  return useQuery({
    queryKey: [...literatureKeys.all, 'annotations', itemId] as const,
    queryFn: ({ signal }) => fetchAnnotations(unref(itemId), signal),
    enabled: computed(() => !!unref(itemId)),
  });
}

export function useNotes(itemId: MaybeRef<string>): UseQueryReturnType<LitNote[], Error> {
  return useQuery({
    queryKey: [...literatureKeys.all, 'notes', itemId] as const,
    queryFn: ({ signal }) => fetchNotes(unref(itemId), signal),
    enabled: computed(() => !!unref(itemId)),
  });
}

/** 三源检索：partial（源级降级）在结果中显式返回，由调用方展示。 */
export function useLiteratureSearch(
  params: MaybeRefOrGetter<{ q: string; sources?: string[]; simulateUnavailable?: string }>,
  enabled: MaybeRefOrGetter<boolean>,
): UseQueryReturnType<SearchResult, Error> {
  return useQuery({
    queryKey: [...literatureKeys.all, 'search', params],
    queryFn: ({ signal }) => searchLiterature(toValue(params), signal),
    enabled: computed(() => toValue(enabled)),
    placeholderData: (prev) => prev,
  });
}

// ---------- 写操作 ----------

/** 条目/集合相关缓存失效（导入/批量操作后触发）。
 * 注意：无限列表 key 为 'items-inf'，与 'items' 仅差在一个 key 元素上，
 * TanStack 前缀失效按元素相等比较，因此必须用 domain 根 key 整体失效。 */
export function useInvalidateLiterature() {
  const queryClient = useQueryClient();
  return (itemIds: string[] = []): Promise<void> =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: literatureKeys.all }),
      ...itemIds.map((id) => queryClient.invalidateQueries({ queryKey: literatureKeys.item(id) })),
    ]).then(() => undefined);
}

export function useCreateItemFromHit() {
  const invalidate = useInvalidateLiterature();
  return useMutation({
    mutationFn: ({
      hit,
      idempotencyKey,
    }: {
      hit: Parameters<typeof createItemFromHit>[0];
      idempotencyKey: string;
    }) => createItemFromHit(hit, idempotencyKey),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteItem() {
  const invalidate = useInvalidateLiterature();
  return useMutation({
    mutationFn: (itemId: string) => deleteItem(itemId),
    onSuccess: () => invalidate(),
  });
}

export function useBatchItems() {
  const invalidate = useInvalidateLiterature();
  return useMutation({
    mutationFn: (input: BatchItemsInput) => batchItems(input),
    onSuccess: () => invalidate(),
  });
}

export function useAddToCollection() {
  const invalidate = useInvalidateLiterature();
  return useMutation({
    mutationFn: ({ collectionId, itemId }: { collectionId: string; itemId: string }) =>
      addToCollection(collectionId, itemId),
    onSuccess: () => invalidate(),
  });
}

export function useRemoveFromCollection() {
  const invalidate = useInvalidateLiterature();
  return useMutation({
    mutationFn: ({ collectionId, itemId }: { collectionId: string; itemId: string }) =>
      removeFromCollection(collectionId, itemId),
    onSuccess: () => invalidate(),
  });
}

export function useConfirmChunks(itemId: MaybeRef<string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { block_ids?: string[]; all?: boolean }) => confirmChunks(unref(itemId), body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...literatureKeys.all, 'chunks', unref(itemId)] }),
  });
}

export function useCreateAnnotation(itemId: MaybeRef<string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AnnotationInput) =>
      createAnnotation(unref(itemId), input, crypto.randomUUID()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...literatureKeys.all, 'annotations', unref(itemId)] }),
  });
}

export function useUpdateAnnotation(itemId: MaybeRef<string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ annoId, patch }: { annoId: string; patch: { comment?: string; color?: string } }) =>
      updateAnnotation(annoId, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...literatureKeys.all, 'annotations', unref(itemId)] }),
  });
}

export function useDeleteAnnotation(itemId: MaybeRef<string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (annoId: string) => deleteAnnotation(annoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...literatureKeys.all, 'annotations', unref(itemId)] }),
  });
}

export function useCreateNote(itemId: MaybeRef<string>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => createNote(unref(itemId), content, crypto.randomUUID()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...literatureKeys.all, 'notes', unref(itemId)] }),
  });
}
