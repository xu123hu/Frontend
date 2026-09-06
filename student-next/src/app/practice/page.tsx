"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import QuestionImageCard from "@/components/chat/QuestionImageCard";
import { Pill } from "@/components/ui/ui";
import type { KpItem, PracticeQuestion } from "@/lib/types";

type Feedback = { correct: boolean; comment: string; standard_answer: string; analysis_image: string } | null;

export default function PracticePage() {
  const [kps, setKps] = useState<KpItem[]>([]);
  const [activeKp, setActiveKp] = useState<KpItem | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetch(apiUrl("/student/practice/kp-catalog"))
      .then((r) => r.json())
      .then((d) => setKps(d.items));
  }, []);

  const start = async (kp: KpItem) => {
    setActiveKp(kp);
    setStarting(true);
    setFeedback(null);
    setPicked(null);
    setQIdx(0);
    const res = await fetch(apiUrl("/student/practice/start"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kp_code: kp.kp_code }),
    });
    const d = await res.json();
    setQuestions(d.questions);
    setStarting(false);
  };

  const submit = async () => {
    if (!picked) return;
    const q = questions[qIdx];
    const res = await fetch(apiUrl("/student/practice/submit"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: q.question_id, answer: picked }),
    });
    const d = await res.json();
    setFeedback(d);
  };

  const current = questions[qIdx];

  return (
    <div className="pt-8">
      <h1 className="text-xl font-bold">练题中心</h1>
      <p className="mt-1 text-sm text-slate-500">按薄弱知识点精准练习 · 题目一律原图直出</p>

      {/* 知识点选择 */}
      <div className="mt-5 flex flex-wrap gap-2">
        {kps.map((kp) => (
          <button
            key={kp.kp_code}
            onClick={() => start(kp)}
            className={
              "rounded-full border px-4 py-2 text-sm transition " +
              (activeKp?.kp_code === kp.kp_code
                ? "border-indigo-400 bg-indigo-50 font-medium text-indigo-600"
                : "border-slate-200 bg-white/80 text-slate-600 hover:border-indigo-300")
            }
          >
            {kp.name}
            <span className="ml-2 text-xs text-slate-400">掌握 {(kp.mastery * 100).toFixed(0)}%</span>
          </button>
        ))}
      </div>

      {starting && <div className="skeleton mt-6 h-72 rounded-2xl" />}

      {current && !starting && (
        <div className="mt-6 rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <Pill tone="indigo">{activeKp?.name}</Pill>
            <span className="text-xs text-slate-400">
              第 {qIdx + 1} / {questions.length} 题
            </span>
          </div>

          <QuestionImageCard image={{ image_url: current.stem_image, hires_url: current.stem_image_hires, caption: "题干原图" }} />

          <div className="mt-4 space-y-2">
            {current.options?.map((o) => {
              const isPicked = picked === o.key;
              const isAnswer = feedback && o.key === feedback.standard_answer;
              return (
                <button
                  key={o.key}
                  disabled={!!feedback}
                  onClick={() => setPicked(o.key)}
                  className={
                    "flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-[15px] transition " +
                    (isAnswer
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : isPicked
                        ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/40")
                  }
                >
                  <span
                    className={
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold " +
                      (isPicked || isAnswer ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500")
                    }
                  >
                    {o.key}
                  </span>
                  {o.text}
                </button>
              );
            })}
          </div>

          {feedback && (
            <div
              className={
                "mt-4 rounded-2xl border p-4 " +
                (feedback.correct ? "border-emerald-100 bg-emerald-50/70" : "border-amber-100 bg-amber-50/70")
              }
            >
              <p className={"text-sm font-semibold " + (feedback.correct ? "text-emerald-600" : "text-amber-600")}>
                {feedback.correct ? "✓ 回答正确" : "✗ 未答对"} · {feedback.comment}
              </p>
              <div className="mt-3 max-w-md">
                <QuestionImageCard image={{ image_url: feedback.analysis_image, caption: "答案解析（图片直出）" }} />
              </div>
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            {!feedback ? (
              <button
                onClick={submit}
                disabled={!picked}
                className="bg-brand-gradient rounded-full px-6 py-2 text-sm font-medium text-white shadow hover:opacity-90 disabled:opacity-30"
              >
                提交答案
              </button>
            ) : qIdx < questions.length - 1 ? (
              <button
                onClick={() => {
                  setQIdx((i) => i + 1);
                  setPicked(null);
                  setFeedback(null);
                }}
                className="bg-brand-gradient rounded-full px-6 py-2 text-sm font-medium text-white shadow hover:opacity-90"
              >
                下一题 →
              </button>
            ) : (
              <button
                onClick={() => start(activeKp!)}
                className="bg-brand-gradient rounded-full px-6 py-2 text-sm font-medium text-white shadow hover:opacity-90"
              >
                这一组练完了 · 再来一组
              </button>
            )}
          </div>
        </div>
      )}

      {!current && !starting && (
        <div className="mt-10 rounded-3xl border border-dashed border-indigo-200 bg-white/60 p-10 text-center text-sm text-slate-400">
          选择一个知识点开始练习（题目来自题库，带图题一律图片直出）
        </div>
      )}
    </div>
  );
}
