import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // D:\frontend 父目录另有旧工程 lockfile，锁定本应用为 turbopack 根，避免误选
  turbopack: { root: __dirname },
  // 真实联调模式：BACKEND_PROXY=1 npm run dev —— 服务端代理（浏览器同源零 CORS）。
  // B2（kb/知识图谱，独立 dev server :8010）与 B4/B1（student-api :8100）分路由直连，
  // 对齐 api-contracts B2 段"集成期并入单服务"的过渡形态；B1 挂载后 B2 路由自动落到 8100 也可。
  async rewrites() {
    if (process.env.BACKEND_PROXY !== "1") return [];
    const b2 = process.env.B2_BASE ?? "http://localhost:8010";
    const b4 = process.env.BACKEND_BASE ?? "http://localhost:8100";
    return {
      beforeFiles: [
        { source: "/api/v1/kb/:path*", destination: `${b2}/api/v1/kb/:path*` },
        { source: "/api/v1/knowledge-graph/:path*", destination: `${b2}/api/v1/knowledge-graph/:path*` },
        { source: "/files/:path*", destination: `${b4}/files/:path*` },
        { source: "/api/v1/:path*", destination: `${b4}/api/v1/:path*` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
