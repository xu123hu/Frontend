import type { NextConfig } from "next";

const BACKEND_BASE = process.env.BACKEND_BASE ?? "http://localhost:8100";

const nextConfig: NextConfig = {
  // D:\frontend 父目录另有旧工程 lockfile，锁定本应用为 turbopack 根，避免误选
  turbopack: { root: __dirname },
  // 真实联调模式：BACKEND_PROXY=1 npm run dev —— /api/v1/* 与 /files/* 整体代理到后端
  // （beforeFiles 优先于本地 mock handlers，浏览器同源零 CORS）；默认不代理走 mock。
  async rewrites() {
    if (process.env.BACKEND_PROXY !== "1") return [];
    return {
      beforeFiles: [
        { source: "/api/v1/:path*", destination: `${BACKEND_BASE}/api/v1/:path*` },
        { source: "/files/:path*", destination: `${BACKEND_BASE}/files/:path*` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
