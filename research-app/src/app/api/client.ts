/**
 * 科研端 API 客户端核心层。
 *
 * 契约依据：
 * - M0 冻结契约 research-contracts v0.1.0（health、runs、SSE）。
 * - M4 OpenAPI v2.0（需求级字段契约：SuccessEnvelope / ErrorEnvelope / ProjectCreate）。
 * - 06 §11：错误响应遵循 Problem Details；403 不得泄露资源存在性。
 *
 * 红线（08 §6）：任何降级必须可观察；吞错返回假成功一律禁止。
 */
import { config } from '../config';

/** 与 M4 ErrorEnvelope.error 对齐的错误码分类（kind 用于前端状态映射，不等于后端 code）。 */
export type ApiErrorKind =
  | 'unauthorized' // 401：未登录/会话过期 → 跳登录
  | 'forbidden' // 403：无权限 → 不泄露存在性
  | 'not_found' // 404
  | 'rate_limited' // 429：可重试，带冷却
  | 'not_wired' // 501：M0 honest 501，后端未接线
  | 'validation' // 422 / 字段校验
  | 'server' // 5xx：可重试
  | 'network' // 断网 / DNS / CORS
  | 'aborted'; // 调用方取消，不算失败

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  /** M4 ErrorEnvelope.error.retryable */
  readonly retryable: boolean;
  /** 后端错误码（ErrorEnvelope.error.code），原样透传用于展示。 */
  readonly code: string | null;
  /** 422 字段级错误：loc.join('.') → msg */
  readonly fieldErrors: Readonly<Record<string, string>>;

  constructor(init: {
    kind: ApiErrorKind;
    status: number | null;
    retryable: boolean;
    message: string;
    code?: string | null;
    fieldErrors?: Record<string, string>;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status;
    this.retryable = init.retryable;
    this.code = init.code ?? null;
    this.fieldErrors = init.fieldErrors ?? {};
  }

  get isAborted(): boolean {
    return this.kind === 'aborted';
  }
}

export interface ApiMeta {
  request_id?: string;
  [key: string]: unknown;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta: ApiMeta;
}

/** 对齐 M4 SuccessEnvelope：调用方拿到的是 envelope，data 类型由实体层冻结。 */
export type ApiEnvelope<T> = ApiSuccess<T>;

const RETRYABLE_KINDS = new Set<ApiErrorKind>(['rate_limited', 'server', 'network']);

function kindFromStatus(status: number): ApiErrorKind {
  if (status === 400) return 'validation';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limited';
  if (status === 422) return 'validation';
  if (status === 501) return 'not_wired';
  if (status >= 500) return 'server';
  return 'server';
}

function fallbackMessage(kind: ApiErrorKind): string {
  switch (kind) {
    case 'unauthorized':
      return '登录状态已失效，请重新登录。';
    case 'forbidden':
      return '无权访问该资源。';
    case 'not_found':
      return '请求的资源不存在。';
    case 'rate_limited':
      return '请求过于频繁，请稍后重试。';
    case 'not_wired':
      return '该能力尚未在后端接线（M0 声明的诚实 501）。';
    case 'validation':
      return '提交的内容未通过校验。';
    case 'server':
      return '服务暂时不可用，请稍后重试。';
    case 'network':
      return '网络连接不可用，请检查网络后重试。';
    case 'aborted':
      return '请求已取消。';
  }
}

interface ProblemDetails {
  title?: string;
  detail?: string;
  status?: number;
  [key: string]: unknown;
}

function extractFieldErrors(payload: unknown): Record<string, string> {
  // FastAPI 422 HTTPValidationError：{detail: [{loc, msg, type}]}
  if (payload && typeof payload === 'object' && 'detail' in payload) {
    const detail = (payload as { detail: unknown }).detail;
    if (Array.isArray(detail)) {
      const out: Record<string, string> = {};
      for (const item of detail) {
        if (item && typeof item === 'object' && 'loc' in item && 'msg' in item) {
          const loc = (item as { loc: unknown }).loc;
          const msg = (item as { msg: unknown }).msg;
          if (Array.isArray(loc)) {
            const key = loc.filter((p) => typeof p === 'string' && p !== 'body').join('.');
            if (key) out[key] = String(msg);
          }
        }
      }
      return out;
    }
  }
  return {};
}

async function parseErrorPayload(response: Response): Promise<{ message: string; code: string | null; retryable: boolean; fieldErrors: Record<string, string> }> {
  const kind = kindFromStatus(response.status);
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // 非 JSON 错误体：走兜底文案，不吞状态。
  }
  const fieldErrors = extractFieldErrors(payload);
  // M4 ErrorEnvelope：{success:false, error:{code,message,retryable}}
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const err = (payload as { error: { code?: string; message?: string; retryable?: boolean } }).error;
    return {
      message: err.message || fallbackMessage(kind),
      code: err.code ?? null,
      retryable: err.retryable ?? RETRYABLE_KINDS.has(kind),
      fieldErrors,
    };
  }
  // RFC 9457 Problem Details
  if (payload && typeof payload === 'object' && ('title' in payload || 'detail' in payload)) {
    const pd = payload as ProblemDetails;
    return {
      message: pd.detail || pd.title || fallbackMessage(kind),
      code: (pd['code' as keyof ProblemDetails] as string) ?? null,
      retryable: RETRYABLE_KINDS.has(kind),
      fieldErrors,
    };
  }
  return { message: fallbackMessage(kind), code: null, retryable: RETRYABLE_KINDS.has(kind), fieldErrors };
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** 幂等键（M4 v2.0 /projects POST 的 IdempotencyKey 参数）。 */
  idempotencyKey?: string;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = config.apiBaseUrl.endsWith('/') ? config.apiBaseUrl.slice(0, -1) : config.apiBaseUrl;
  const url = new URL(`${base}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.pathname + url.search;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<ApiSuccess<T>> {
  const { method = 'GET', body, idempotencyKey, query, signal } = options;
  const headers = new Headers({ Accept: 'application/json' });
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      credentials: 'same-origin',
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError({ kind: 'aborted', status: null, retryable: false, message: fallbackMessage('aborted') });
    }
    throw new ApiError({ kind: 'network', status: null, retryable: true, message: fallbackMessage('network') });
  }

  if (!response.ok) {
    const parsed = await parseErrorPayload(response);
    throw new ApiError({
      kind: kindFromStatus(response.status),
      status: response.status,
      retryable: parsed.retryable,
      message: parsed.message,
      code: parsed.code,
      fieldErrors: parsed.fieldErrors,
    });
  }

  if (response.status === 204) {
    return { success: true, data: undefined as T, meta: {} };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError({
      kind: 'server',
      status: response.status,
      retryable: false,
      message: '响应不是合法 JSON，契约不匹配。',
      code: 'contract_violation',
    });
  }

  // M4 SuccessEnvelope：{success:true, data, meta}
  // 任何携带 success 字段的 2xx 响应都必须是完整成功信封，否则视为契约违规（不静默）。
  if (payload && typeof payload === 'object' && 'success' in payload) {
    const envelope = payload as { success: boolean; data?: T; meta?: ApiMeta };
    if (envelope.success !== true || !('data' in envelope)) {
      throw new ApiError({
        kind: 'server',
        status: response.status,
        retryable: false,
        message: '成功状态码携带非成功信封，契约不匹配。',
        code: 'contract_violation',
      });
    }
    return { success: true, data: envelope.data as T, meta: envelope.meta ?? {} };
  }

  // M0 部分端点（health、202 RunCreationAccepted）不使用 envelope：原样返回为 data。
  return { success: true, data: payload as T, meta: {} };
}

export { buildUrl };
