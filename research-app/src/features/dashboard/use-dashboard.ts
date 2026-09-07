import { useQuery } from '@tanstack/vue-query';
import { fetchDashboard } from './api';

export const dashboardKeys = {
  all: ['dashboard'] as const,
};

export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.all,
    queryFn: ({ signal }) => fetchDashboard(signal),
  });
}
