/**
 * 后端切换点（mock 与真实共用同一 /api/v1 路径，切换零代码改动）：
 * - 默认（NEXT_PUBLIC_USE_MOCK≠"0"）：本应用内 mock handlers（src/app/api/v1/**，形状对齐契约）
 * - 真实：`BACKEND_PROXY=1 npm run dev` 由 next.config 把 /api/v1/* 服务端代理到
 *   BACKEND_BASE（默认 http://localhost:8100），浏览器同源零 CORS
 */
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "0";
export const API_BASE = "/api/v1";

export const apiUrl = (path: string) => `${API_BASE}${path}`;
