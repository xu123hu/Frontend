"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import QuestionImageCard from "@/components/chat/QuestionImageCard";
import type { ExamPaper, ExamPaperDetail } from "@/lib/types";

function Stem({ stemText, imageUrl, label }: { stemText: string; imageUrl: string | null; label: string }) {
  if (imageUrl) {
    return <QuestionImageCard image={{ image_url: imageUrl, caption: label }} />;
  }
  return (
    <div className="max-w-xl whitespace-pre-wrap rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-[15px] leading-7 text-slate-700">
      {stemText}
    </div>
  );
}

export default function ExamPage() {
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [detail, setDetail] = useState<ExamPaperDetail | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(apiUrl("/exams/papers"))
      .then((r) => r.json())
      .then((d) => setPapers(d.items));
  }, []);

  const open = async (p: ExamPaper) => {
    setLoadingId(p.paper_id);
    const res = await fetch(apiUrl(`/exams/papers/${p.paper_id}`));
    setDetail(await res.json());
    setAnswers({});
    setSubmitted(false);
    setLoadingId(null);
  };

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="pt-8">
      <h1 className="text-xl font-bold">模拟试卷</h1>
      <p className="mt-1 text-sm text-slate-500">按章节智能组卷 · 限时作答 · 自动批改</p>

      <div className="mt-5 space-y-3">
        {papers.map((p) => (
          <div key={p.paper_id} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-lg">📝</span>
            <div className="flex-1">
              <p className="text-[15px] font-medium">{p.title}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {p.question_count} 题{p.year ? ` · ${p.year}` : ""}
              </p>
            </div>
            <button
              onClick={() => open(p)}
              disabled={loadingId === p.paper_id}
              className="bg-brand-gradient rounded-full px-4 py-1.5 text-xs font-medium text-white shadow hover:opacity-90 disabled:opacity-40"
            >
              {loadingId === p.paper_id ? "组卷中…" : "开始作答"}
            </button>
          </div>
        ))}
      </div>

      {detail && (
        <div className="mt-8 rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold">{detail.title}</h2>
            <span className="text-xs text-slate-400">
              已答 {answeredCount}/{detail.items.length}
            </span>
          </div>

          <div className="mt-4 space-y-6">
            {detail.items.map((q) => (
              <div key={q.question_id} className="rounded-2xl border border-slate-100 p-4">
                <p className="mb-3 text-sm font-medium text-slate-500">第 {q.position} 题</p>
                <Stem stemText={q.stem_text} imageUrl={q.stem_image_url} label={`第 ${q.position} 题题干原图`} />
                {q.options ? (
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {Object.entries(q.options).map(([key, text]) => {
                      const active = answers[q.question_id] === key;
                      return (
                        <button
                          key={key}
                          disabled={submitted}
                          onClick={() => setAnswers((a) => ({ ...a, [q.question_id]: key }))}
                          className={
                            "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition " +
                            (active
                              ? "border-indigo-400 bg-indigo-50 font-medium text-indigo-700"
                              : "border-slate-200 hover:border-indigo-200")
                          }
                        >
                          <span className={"flex h-5 w-5 items-center justify-center rounded-full text-[11px] " + (active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500")}>
                            {key}
                          </span>
                          {text}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    disabled={submitted}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.question_id]: e.target.value }))}
                    placeholder="解答题：输入你的答案…"
                    className="mt-3 w-full rounded-2xl border border-slate-200 p-3 text-sm leading-7 outline-none focus:border-indigo-300"
                    rows={2}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between">
            {submitted ? (
              <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-600">
                ✓ 已交卷（mock）：错题将自动进入错题本
              </span>
            ) : (
              <span className="text-xs text-slate-400">带图题目均为原图直出，可点击放大作答</span>
            )}
            <button
              onClick={() => setSubmitted(true)}
              disabled={answeredCount === 0 || submitted}
              className="bg-brand-gradient rounded-full px-6 py-2 text-sm font-medium text-white shadow hover:opacity-90 disabled:opacity-30"
            >
              交卷
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
