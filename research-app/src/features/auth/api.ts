/**
 * 认证 API：契约草案端点（CR-F1-01..03）。
 * 模型：POST /auth/session 设置 HttpOnly 会话 cookie；前端不接触 token。
 * Agent 2 冻结契约后如路径/字段变化，只需调整本文件。
 */
import { apiRequest } from '@app/api/client';
import type { Account } from '@entities/session/types';

/** 发送 OTP（POST /auth/session/otp）：204。 */
export function requestOtp(phone: string, signal?: AbortSignal): Promise<void> {
  return apiRequest<void>('/auth/session/otp', { method: 'POST', body: { phone }, signal }).then(() => undefined);
}

/** 登录（POST /auth/session）：返回账户，会话由 HttpOnly cookie 承载。 */
export function login(phone: string, otpCode: string, signal?: AbortSignal): Promise<Account> {
  return apiRequest<Account>('/auth/session', {
    method: 'POST',
    body: { phone, otp_code: otpCode },
    signal,
  }).then((envelope) => envelope.data);
}

/** 会话探测（GET /auth/me）：401 时抛 ApiError(kind=unauthorized)。 */
export function fetchMe(signal?: AbortSignal): Promise<Account> {
  return apiRequest<Account>('/auth/me', { signal }).then((envelope) => envelope.data);
}

/** 登出（DELETE /auth/session）：204。 */
export function logout(signal?: AbortSignal): Promise<void> {
  return apiRequest<void>('/auth/session', { method: 'DELETE', signal }).then(() => undefined);
}
