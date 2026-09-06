"use client";

import { useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import { streamSse } from "@/lib/sse";
import type { KbDoc, KbStage } from "@/lib/types";
import { Pill, StageProgress } from "@/components/ui/ui";

const STAGES = ["上传", "解析", "切片", "向量化"];
const STAGE_MAP: Record<string, string> = { upload: "上传", parse: "解析", chunk: "切片", embed: "向量化" };

interface Uploading {
  filename: string;
  stage: KbStage;
  pct: number;
  note: string;
}

export default function KbPage() {
  const [docs, setDocs] = useState<KbDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<Uploading | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(apiUrl("/kb/docs"))
      .then((r) => r.json())
      .then((d) => setDocs(d.items))
      .finally(() => setLoading(false));
  }, []);

  const startUpload = (file: File) => {
    setUploading({ filename: file.name, stage: "upload", pct: 0, note: "准备上传…" });
    const controller = new AbortController();
    streamSse(apiUrl("/kb/docs/import"), {
      body: { filename: file.name },
      signal: controller.signal,
      onEvent: (type, data) => {
        const d = data as Record<string, unknown>;
        if (type === "progress") {
          setUploading({
            filename: file.name,
            stage: (d.stage as KbStage) ?? "upload",
            pct: Number(d.pct ?? 0),
            note: String(d.label ?? ""),
          });
        } else if (type === "done") {
          setDocs((prev) => [
            {
              doc_id: String(d.doc_id),
              filename: String(d.filename),
              status: "ready",
              progress: 100,
              chunks: Number(d.chunks),
            },
            ...prev,
          ]);
          setUploading(null);
        }
      },
    }).catch(() => setUploading(null));
  };

  return (
    <div className="pt-8">
      <h1 className="text-xl font-bold">我的知识库</h1>
      <p className="mt-1 text-sm text-slate-500">
        上传教材/笔记 → 自动解析、切片、向量化 → AI 按你的资料出题
      </p>

      {/* 上传区（拖拽/点击） */}
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
          if (f && !uploading) startUpload(f);
        }}
        onClick={() => !uploading && inputRef.current?.click()}
        className={
          "mt-5 cursor-pointer rounded-3xl border-2 border-dashed bg-white/70 p-10 text-center transition " +
          (dragOver ? "border-indigo-400 bg-indigo-50/60" : "border-indigo-200 hover:border-indigo-300")
        }
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.pptx,.md,image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) startUpload(f);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <div className="mx-auto max-w-md">
            <p className="mb-3 text-sm font-medium text-slate-700">{uploading.filename}</p>
            <StageProgress
              stages={STAGES}
              currentStage={STAGE_MAP[uploading.stage] ?? "上传"}
              pct={uploading.pct}
              note={uploading.note}
            />
          </div>
        ) : (
          <>
            <div className="bg-brand-gradient mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-xl text-white shadow-md">
              ⇪
            </div>
            <p className="mt-3 text-[15px] font-medium">拖拽文件到这里，或点击选择上传</p>
            <p className="mt-1 text-xs text-slate-400">支持 PDF / Word / PPT / Markdown / 图片，单个 ≤ 50MB</p>
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

      {/* 文档列表 */}
      <div className="mt-6 space-y-3">
        {loading && [1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        {docs.map((doc) => (
          <div
            key={doc.doc_id}
            className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-lg">📄</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-medium">{doc.filename}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {doc.chunks ? `${doc.chunks} 个切片 · ` : ""}
                {doc.size_hint ?? "刚上传"}
              </p>
            </div>
            {doc.status === "ready" ? (
              <>
                <Pill tone="green">已就绪</Pill>
                <a
                  href="/practice"
                  className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-100"
                >
                  按这份资料出题 →
                </a>
              </>
            ) : (
              <>
                <Pill tone="red">解析失败</Pill>
                <button className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-500">重试</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
