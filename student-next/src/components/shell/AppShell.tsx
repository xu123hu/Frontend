"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "AI 对话" },
  { href: "/kb", label: "知识库" },
  { href: "/errors", label: "错题本" },
  { href: "/practice", label: "练题中心" },
  { href: "/graph", label: "知识图谱" },
  { href: "/classroom", label: "双师课堂" },
  { href: "/exam", label: "模拟试卷" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="bg-brand-gradient flex h-8 w-8 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm">
              研
            </span>
            <span className="text-[15px] font-semibold tracking-tight">
              小研同学 <span className="text-gradient font-bold">AI 学习</span>
            </span>
          </Link>
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {NAV.map((n) => {
              const active = pathname === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={
                    "rounded-full px-3 py-1.5 text-sm transition " +
                    (active
                      ? "bg-indigo-50 font-medium text-indigo-600"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800")
                  }
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-slate-400 sm:inline">高二(5)班</span>
            <span className="bg-brand-gradient flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white">
              同
            </span>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-1.5 md:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={
                "whitespace-nowrap rounded-full px-3 py-1 text-xs " +
                (pathname === n.href ? "bg-indigo-50 font-medium text-indigo-600" : "text-slate-500")
              }
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 overflow-x-clip px-4 pb-16">{children}</main>
    </div>
  );
}
