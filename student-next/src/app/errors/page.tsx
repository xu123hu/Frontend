"use client";

import { useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import { Lightbox, Pill } from "@/components/ui/ui";
import type { ErrorRecord } from "@/lib/types";

export default function ErrorsPage() {
  const [records, setRecords] = useState<ErrorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [enhancing, setEnhancing] = useState(false);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [detail, setDetail] = useState<ErrorRecord | null>(null);
  const [imgLoaded, setImgLoaded] = useState<Record<string, boolean>>({});
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(apiUrl("/errors"))
      .then((r) => r.json())
      .then((d) => setRecords(d.items))
      .finally(() => setLoading(false));
  }, []);

  // B4-1：增强在 photo 请求内同步完成，FE 以不定进度呈现
  const startEnhance = async (file: File) => {
    setEnhancing(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(apiUrl("/errors/photo"), { method: "POST", body: form });
      if (res.status === 202) {
        const d = (await res.json()) as { error_id: string };
        const detailRes = await fetch(apiUrl(`/errors/${d.error_id}`));
        const rec = (await detailRes.json()) as ErrorRecord;
        setRecords((prev) => [rec, ...prev]);
      } else {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        alert(err.message ?? "上传失败");
      }
    } finally {
      setEnhancing(false);
    }
  };

  const openDetail = async (r: ErrorRecord) => {
    setDetail(r);
    if (!r.error_cause) {
      const res = await fetch(apiUrl(`/errors/${r.error_id}`));
      if (res.ok) {
        const full = (await res.json()) as ErrorRecord;
        setDetail(full);
        setRecords((prev) => prev.map((x) => (x.error_id === full.error_id ? full : x)));
      }
    }
  };

  return (
    <div className="pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">错题本</h1>
          <p className="mt-1 text-sm text-slate-500">拍照 → 扫描级增强 → 自动归知识点 → 举一反三重练</p>
        </div>
        <div className="flex items-center gap-2">
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
            onClick={() => !enhancing && startEnhance(new File(["mock"], "photo-example.jpg", { type: "image/jpeg" }))}
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
          <p className="mb-3 text-sm font-medium text-slate-700">正在把照片变成清晰错题卡（增亮 · 去阴影 · 识别知识点）…</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="bg-brand-gradient h-full w-1/3 animate-pulse rounded-full" />
          </div>
          <p className="mt-1.5 text-xs text-slate-400">扫描级增强在服务端进行，请稍候…</p>
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
              key={r.error_id}
              onClick={() => openDetail(r)}
              className="group overflow-hidden rounded-2xl border border-slate-100 bg-white/90 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {r.enhanced_image_url ? (
                <div className="relative bg-slate-50">
                  {!imgLoaded[r.error_id] && <div className="skeleton h-44 rounded-none" />}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.enhanced_image_url}
                    alt={r.kp_code}
                    onLoad={() => setImgLoaded((m) => ({ ...m, [r.error_id]: true }))}
                    className={imgLoaded[r.error_id] ? "block w-full" : "hidden"}
                  />
                </div>
              ) : (
                <div className="flex h-44 flex-col justify-center bg-slate-50 p-4">
                  <p className="line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {r.question_text ?? "（无题面）"}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3">
                <Pill tone="indigo">{r.kp_code}</Pill>
                <span className="text-xs text-slate-400">{r.created_at?.slice(0, 10)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-6" onClick={() => setDetail(null)}>
          <div
            className="max-h-full w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {detail.enhanced_image_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={detail.enhanced_image_url}
                alt={detail.kp_code}
                className="w-full cursor-zoom-in rounded-xl border border-slate-100"
                onClick={() => setZoomSrc(detail.enhanced_image_url ?? null)}
              />
            ) : (
              <div className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-4 text-[15px] leading-7 text-slate-700">
                {detail.question_text ?? "（无题面）"}
              </div>
            )}
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex gap-2">
                <Pill tone="indigo">{detail.kp_code}</Pill>
                <Pill tone={detail.source_channel === "auto_judge" ? "cyan" : "slate"}>
                  {detail.source_channel === "auto_judge" ? "判分自动收录" : "手动拍照"}
                </Pill>
              </div>
              <span className="text-xs text-slate-400">{detail.created_at?.slice(0, 10)}</span>
            </div>
            <div className="mt-3 rounded-2xl bg-indigo-50/70 p-4 text-sm leading-7 text-slate-700">
              <span className="font-semibold text-indigo-600">AI 诊断：</span>
              {detail.error_cause ?? "暂无诊断"}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setDetail(null)} className="rounded-full px-4 py-2 text-sm text-slate-500 hover:bg-slate-100">
                关闭
              </button>
              <a
                href={`/practice?mode=retry&kp_codes=${encodeURIComponent(detail.kp_code)}`}
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
