import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/shell/AppShell";

export const metadata: Metadata = {
  title: "小研同学 · AI 学习助手",
  description: "数学学生端重构：AI 对话首页、知识库、错题本、练题中心、知识图谱、双师课堂、模拟试卷",
};

// 移动端按设备宽布局（缺失时浏览器按 ~980px 布局再缩放，导致全部页面横向溢出）
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-44 left-1/2 h-[480px] w-[760px] -translate-x-1/2 rounded-full bg-indigo-200/40 blur-3xl" />
          <div className="absolute top-44 -right-44 h-[420px] w-[560px] rounded-full bg-cyan-100/60 blur-3xl" />
          <div className="absolute top-[560px] -left-44 h-[380px] w-[500px] rounded-full bg-violet-100/50 blur-3xl" />
        </div>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
