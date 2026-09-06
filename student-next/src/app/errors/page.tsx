"use client";

import { useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import { streamSse } from "@/lib/sse";
import { Lightbox, Pill, StageProgress } from "@/components/ui/ui";
import type { ErrorRecord } from "@/lib/types";

const STAGES = ["上传", "增强", "识别"];

export default function ErrorsPage() {
  const [records, setRecords] = useState<ErrorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [enhancing, setEnhancing] = useState<{ stage: string; pct: number; note: string } | null>(null);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [detail, setDetail] = useState<ErrorRecord | null>(null);
  const [imgLoaded, setImgLoaded] = useState<Record<string, boolean>>({});
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(apiUrl("/student/error-records"))
      .then((r) => r.json())
      .then((d) => setRecords(d.items))
      .finally(() => setLoading(false));
  }, []);

  const startEnhance = (file: File) => {
    setEnhancing({ stage: "上传", pct: 0, note: "准备上传…" });
    streamSse(apiUrl("/student/error-records/enhance"), {
      body: { filename: file.name },
      onEvent: (type, data) => {
        const d = data as Record<string, unknown>;
        if (type === "progress") {
          setEnhancing({ stage: String(d.stage), pct: Number(d.pct ?? 0), note: String(d.label ?? "") });
        } else if (type === "done") {
          const record = d.record as ErrorRecord;
          setRecords((prev) => [record, ...prev]);
          setEnhancing(null);
        }
      },
    }).catch(() => setEnhancing(null));
  };

  return (
    <div className="pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">错题本</h1>
          <p className="mt-1 text-sm text-slate-500">拍照 → 扫描级增强 → 自动归知识点 → 举一反三重练</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => cameraRef.current?.click()}
            className="bg-brand-gradient rounded-full px-4 py-2 text-sm font-medium text-white shadow-md hover:opacity-90"
          >
            📷 拍照入库
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
          >
            从相册选择
          </button>
          <button
            onClick={() =>
              !enhancing && startEnhance(new File(["mock"], "photo-example.jpg", { type: "image/jpeg" }))
            }
            className="rounded-full px-3 py-2 text-xs text-slate-400 hover:text-indigo-500"
          >
            没有照片？用示例照片试试
          </button>
        </div>
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && !enhancing) startEnhance(f);
          e.target.value = "";
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && !enhancing) startEnhance(f);
          e.target.value = "";
        }}
      />

      {enhancing && (
        <div className="mt-5 rounded-2xl border border-indigo-100 bg-white/90 p-5 shadow-sm">
          <p className="mb-3 text-sm font-medium text-slate-700">正在把照片变成清晰错题卡…</p>
          <StageProgress
            stages={STAGES}
            currentStage={STAGES.includes(enhancing.stage) ? enhancing.stage : "增强"}
            pct={enhancing.pct}
            note={enhancing.note}
          />
        </div>
      )}

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-56 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {records.map((r) => (
            <button
              key={r.record_id}
              onClick={() => setDetail(r)}
              className="group overflow-hidden rounded-2xl border border-slate-100 bg-white/90 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative bg-slate-50">
                {!imgLoaded[r.record_id] && <div className="skeleton h-44 rounded-none" />}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.image_url}
                  alt={r.kp}
                  onLoad={() => setImgLoaded((m) => ({ ...m, [r.record_id]: true }))}
                  className={imgLoaded[r.record_id] ? "block w-full" : "hidden"}
                />
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <Pill tone="indigo">{r.kp}</Pill>
                <span className="text-xs text-slate-400">{r.created_at}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 详情弹层：原图直出 + AI 诊断 + 举一反三入口 */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-6" onClick={() => setDetail(null)}>
          <div
            className="max-h-full w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={detail.image_url}
              alt={detail.kp}
              className="w-full cursor-zoom-in rounded-xl border border-slate-100"
              onClick={() => setZoomSrc(detail.hires_url ?? detail.image_url)}
            />
            <div className="mt-4 flex items-center justify-between gap-3">
              <Pill tone="indigo">{detail.kp}</Pill>
              <span className="text-xs text-slate-400">{detail.created_at}</span>
            </div>
            <div className="mt-3 rounded-2xl bg-indigo-50/70 p-4 text-sm leading-7 text-slate-700">
              <span className="font-semibold text-indigo-600">AI 诊断：</span>
              {detail.diagnosis ?? "暂无诊断"}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setDetail(null)} className="rounded-full px-4 py-2 text-sm text-slate-500 hover:bg-slate-100">
                关闭
              </button>
              <a
                href="/practice"
                className="bg-brand-gradient rounded-full px-5 py-2 text-sm font-medium text-white shadow hover:opacity-90"
              >
                举一反三练一题 →
              </a>
            </div>
          </div>
        </div>
      )}
      {zoomSrc && <Lightbox src={zoomSrc} onClose={() => setZoomSrc(null)} />}
    </div>
  );
}
