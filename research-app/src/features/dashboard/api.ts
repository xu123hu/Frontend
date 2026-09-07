import { apiRequest } from '@app/api/client';

export interface DashboardSummary {
  projects: number;
  memberships: number;
  pending_reviews: number;
  running_tasks: number;
}

export function fetchDashboard(signal?: AbortSignal): Promise<DashboardSummary> {
  return apiRequest<DashboardSummary>('/dashboard', { signal }).then((e) => e.data);
}
