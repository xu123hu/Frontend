"use client";

import { useEffect } from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} />;
}

/** 分段进度条（上传/增强/识别、上传/解析/切片/向量化等） */
export function StageProgress({
  stages,
  currentStage,
  pct,
  note,
}: {
  stages: string[];
  currentStage: string;
  pct: number;
  note?: string;
}) {
  const idx = stages.indexOf(currentStage);
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center gap-2">
        {stages.map((s, i) => {
          const state = i < idx || pct >= 100 ? "done" : i === idx ? "doing" : "todo";
          return (
            <span
              key={s}
              className={
                "rounded-full px-2.5 py-1 text-xs " +
                (state === "done"
                  ? "bg-emerald-50 text-emerald-600"
                  : state === "doing"
                    ? "bg-indigo-50 font-medium text-indigo-600"
                    : "bg-slate-100 text-slate-400")
              }
            >
              {state === "done" ? "✓ " : ""}
              {s}
            </span>
          );
        })}
        <span className="ml-auto text-xs font-medium text-indigo-600">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="bg-brand-gradient h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      {note && <p className="mt-1.5 text-xs text-slate-400">{note}</p>}
    </div>
  );
}

/** 点击放大的原图查看器（图片直出的配套） */
export function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="题目原图"
        className="max-h-full max-w-full rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        className="absolute top-5 right-6 rounded-full bg-white/90 px-3 py-1 text-sm text-slate-600 shadow"
      >
        关闭 (Esc)
      </button>
    </div>
  );
}

export function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "indigo" | "green" | "amber" | "red" | "cyan" }) {
  const map: Record<string, string> = {
    slate: "bg-slate-100 text-slate-500",
    indigo: "bg-indigo-50 text-indigo-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-500",
    cyan: "bg-cyan-50 text-cyan-600",
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs ${map[tone]}`}>{children}</span>;
}
