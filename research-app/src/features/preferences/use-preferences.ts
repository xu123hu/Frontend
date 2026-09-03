import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { fetchPreferences, patchPreferences } from './api';
import type { UserPreferences } from '@entities/session/types';

export const preferenceKeys = {
  me: ['preferences', 'me'] as const,
};

export function usePreferences() {
  return useQuery({
    queryKey: preferenceKeys.me,
    queryFn: ({ signal }) => fetchPreferences(signal),
  });
}

export function usePatchPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<UserPreferences>) => patchPreferences(patch),
    onSuccess: (data) => {
      queryClient.setQueryData(preferenceKeys.me, data);
    },
  });
}
