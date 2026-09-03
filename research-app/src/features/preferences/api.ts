/**
 * 偏好 API：契约草案（CR-F1-04）。
 * 偏好持久化在服务端（06 §3 步骤 5：刷新后仍保留），禁止写入 localStorage。
 */
import { apiRequest } from '@app/api/client';
import type { UserPreferences } from '@entities/session/types';

export function fetchPreferences(signal?: AbortSignal): Promise<UserPreferences> {
  return apiRequest<UserPreferences>('/me/preferences', { signal }).then((envelope) => envelope.data);
}

export function patchPreferences(
  patch: Partial<UserPreferences>,
  signal?: AbortSignal,
): Promise<UserPreferences> {
  return apiRequest<UserPreferences>('/me/preferences', { method: 'PATCH', body: patch, signal }).then(
    (envelope) => envelope.data,
  );
}
