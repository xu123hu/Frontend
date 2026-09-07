import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // D:\frontend 父目录另有旧工程 lockfile，锁定本应用为 turbopack 根，避免误选
  turbopack: { root: __dirname },
  // 真实联调模式：BACKEND_PROXY=1 npm run dev —— 服务端代理（浏览器同源零 CORS）。
  // 三后端分路由：B2（kb/图谱，:8010）、B1（chat/ai/quiz/explain，:8011）、B4（其余+files，:8100）。
  // 注意 /api/v1/quiz/from-kb 是 B2-4 编排端点，必须排在 B1 的 /api/v1/quiz 之前。
  async rewrites() {
    if (process.env.BACKEND_PROXY !== "1") return [];
    const b2 = process.env.B2_BASE ?? "http://localhost:8010";
    const b1 = process.env.B1_BASE ?? "http://localhost:8011";
    const b4 = process.env.BACKEND_BASE ?? "http://localhost:8100";
    return {
      beforeFiles: [
        { source: "/api/v1/kb/:path*", destination: `${b2}/api/v1/kb/:path*` },
        { source: "/api/v1/knowledge-graph/:path*", destination: `${b2}/api/v1/knowledge-graph/:path*` },
        { source: "/api/v1/quiz/from-kb", destination: `${b2}/api/v1/quiz/from-kb` },
        { source: "/api/v1/ai/:path*", destination: `${b1}/api/v1/ai/:path*` },
        { source: "/api/v1/quiz", destination: `${b1}/api/v1/quiz` },
        { source: "/api/v1/explain", destination: `${b1}/api/v1/explain` },
        { source: "/api/v1/errors/:path*", destination: `${b4}/api/v1/errors/:path*` },
        { source: "/api/v1/practice/:path*", destination: `${b4}/api/v1/practice/:path*` },
        { source: "/api/v1/exams/:path*", destination: `${b4}/api/v1/exams/:path*` },
        { source: "/api/v1/dual-tutor/sessions", destination: `${b4}/api/v1/dual-tutor/sessions` },
        { source: "/api/v1/dual-tutor/sessions/:id/progress", destination: `${b4}/api/v1/dual-tutor/sessions/:id/progress` },
        { source: "/files/:path*", destination: `${b4}/files/:path*` },
        // 无 catch-all：/api/v1/chat* 与 dual-tutor 的 SSE events 由本地 handler 直通管道
        // （rewrite 外部代理走压缩通道会缓冲 SSE）；未知路径落到本地 mock handler。
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
