"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import { Pill, StageProgress } from "@/components/ui/ui";
import type { KbDoc, KbStatus } from "@/lib/types";

/** B2-1：上传后轮询 documents 进度（契约用轮询，不占 SSE 通道） */
const STAGES = ["上传", "解析", "切片", "向量化"];
function stageOf(status: KbStatus, pct: number): string {
  if (status === "ready") return "向量化";
  if (status === "failed") return "解析";
  if (status === "embedding") return "向量化";
  if (status === "parsing") return pct >= 40 ? "切片" : "解析";
  return "上传";
}

export default function KbPage() {
  const [docs, setDocs] = useState<KbDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async (): Promise<KbDoc[]> => {
    const res = await fetch(apiUrl("/kb/documents"));
    const d = (await res.json()) as { items: KbDoc[] };
    setDocs(d.items);
    return d.items;
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 异步取数后关闭骨架屏，非同步级联
    refresh().finally(() => setLoading(false));
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refresh]);

  const startPolling = useCallback(
    (docId: string) => {
      setUploadingId(docId);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        const items = await refresh();
        const me = items.find((x) => x.id === docId);
        if (!me || me.status === "ready" || me.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
          setUploadingId(null);
        }
      }, 1200);
    },
    [refresh],
  );

  const startUpload = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(apiUrl("/kb/upload"), { method: "POST", body: form });
    if (res.status === 202) {
      const d = (await res.json()) as { document_id: string };
      await refresh();
      startPolling(d.document_id);
    } else {
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      alert(err.message ?? "上传失败");
    }
  };

  const uploading = docs.find((d) => d.id === uploadingId) ?? null;

  return (
    <div className="pt-8">
      <h1 className="text-xl font-bold">我的知识库</h1>
      <p className="mt-1 text-sm text-slate-500">
        上传教材/笔记 → 自动解析、切片、向量化 → AI 按你的资料出题
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f && !uploadingId) startUpload(f);
        }}
        onClick={() => !uploadingId && inputRef.current?.click()}
        className={
          "mt-5 cursor-pointer rounded-3xl border-2 border-dashed bg-white/70 p-10 text-center transition " +
          (dragOver ? "border-indigo-400 bg-indigo-50/60" : "border-indigo-200 hover:border-indigo-300")
        }
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.txt,.md,.docx"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) startUpload(f);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <div className="mx-auto max-w-md">
            <p className="mb-3 text-sm font-medium text-slate-700">{uploading.title}</p>
            <StageProgress
              stages={STAGES}
              currentStage={stageOf(uploading.status, uploading.progress)}
              pct={uploading.progress}
              note={uploading.status === "pending" ? "排队中…" : uploading.status === "failed" ? uploading.error ?? "解析失败" : "后端处理中（轮询进度）"}
            />
          </div>
        ) : (
          <>
            <div className="bg-brand-gradient mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-xl text-white shadow-md">
              ⇪
            </div>
            <p className="mt-3 text-[15px] font-medium">拖拽文件到这里，或点击选择上传</p>
            <p className="mt-1 text-xs text-slate-400">支持 PDF / Word / 图片 / TXT / Markdown，单个 ≤ 50MB</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                startUpload(new File(["mock"], "圆锥曲线讲义（示例）.pdf", { type: "application/pdf" }));
              }}
              className="mt-3 rounded-full bg-indigo-50 px-3.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100"
            >
              没有文件？用示例 PDF 试一试
            </button>
          </>
        )}
      </div>

      <div className="mt-6 space-y-3">
        {loading && [1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        {docs.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-lg">📄</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium">{doc.title}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {doc.status === "ready"
                  ? `${doc.page_count} 页 · 已就绪`
                  : doc.status === "failed"
                    ? doc.error ?? "解析失败"
                    : `处理中 ${doc.progress}%`}
              </p>
            </div>
            {doc.status === "ready" ? (
              <>
                <Pill tone="green">已就绪</Pill>
                <a
                  href="/practice?mode=special"
                  className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100"
                >
                  按这份资料出题 →
                </a>
              </>
            ) : doc.status === "failed" ? (
              <>
                <Pill tone="red">解析失败</Pill>
                <button className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-500">重试</button>
              </>
            ) : (
              <Pill tone="indigo">处理中 {doc.progress}%</Pill>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
