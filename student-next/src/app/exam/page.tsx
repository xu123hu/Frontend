"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import QuestionImageCard from "@/components/chat/QuestionImageCard";
import type { ExamPaper, ExamPaperDetail } from "@/lib/types";

export default function ExamPage() {
  const [papers, setPapers] = useState<ExamPaper[]>([]);
  const [detail, setDetail] = useState<ExamPaperDetail | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(apiUrl("/student/exam/papers"))
      .then((r) => r.json())
      .then((d) => setPapers(d.items));
  }, []);

  const open = async (p: ExamPaper) => {
    setLoadingId(p.paper_id);
    const res = await fetch(apiUrl(`/student/exam/paper?id=${p.paper_id}`));
    const d = (await res.json()) as ExamPaperDetail;
    setDetail(d);
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
                {p.question_count} 题 · 建议 {p.duration_min} 分钟
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
              已答 {answeredCount}/{detail.questions.length}
            </span>
          </div>

          <div className="mt-4 space-y-6">
            {detail.questions.map((q, i) => (
              <div key={q.question_id} className="rounded-2xl border border-slate-100 p-4">
                <p className="mb-3 text-sm font-medium text-slate-500">第 {i + 1} 题</p>
                <QuestionImageCard image={{ image_url: q.stem_image, caption: `第 ${i + 1} 题题干原图` }} />
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {q.options?.map((o) => {
                    const active = answers[q.question_id] === o.key;
                    return (
                      <button
                        key={o.key}
                        disabled={submitted}
                        onClick={() => setAnswers((a) => ({ ...a, [q.question_id]: o.key }))}
                        className={
                          "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition " +
                          (active
                            ? "border-indigo-400 bg-indigo-50 font-medium text-indigo-700"
                            : "border-slate-200 hover:border-indigo-200")
                        }
                      >
                        <span className={"flex h-5 w-5 items-center justify-center rounded-full text-[11px] " + (active ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500")}>
                          {o.key}
                        </span>
                        {o.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between">
            {submitted ? (
              <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-600">
                ✓ 已交卷（mock）：本次练习不计入排名，错题将自动进入错题本
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
