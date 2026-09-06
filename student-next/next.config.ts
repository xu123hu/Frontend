import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // D:\frontend 父目录另有旧工程 lockfile，锁定本应用为 turbopack 根，避免误选
  turbopack: { root: __dirname },
};

export default nextConfig;
