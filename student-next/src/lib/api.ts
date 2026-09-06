/**
 * 唯一的后端切换点：
 * - NEXT_PUBLIC_USE_MOCK 未设或 =1 → 本应用内 mock（src/app/api/v1/*）
 * - NEXT_PUBLIC_USE_MOCK=0 → 真实后端（B1/B2/B4，FastAPI /api/v1）
 */
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "0";
export const API_BASE = USE_MOCK
  ? "/api/v1"
  : (process.env.NEXT_PUBLIC_API_BASE ?? "/api/v1");

export const apiUrl = (path: string) => `${API_BASE}${path}`;
