"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiUrl } from "@/lib/api";
import QuestionImageCard from "@/components/chat/QuestionImageCard";
import { Pill } from "@/components/ui/ui";
import type { GraphNode, PracticeQuestion } from "@/lib/types";

type Feedback = { verdict: "right" | "wrong"; error_id?: string } | null;

const MODES = [
  { key: "daily", label: "每日练" },
  { key: "retry", label: "错题重练" },
  { key: "special", label: "专项练" },
];

function StemCard({ q }: { q: PracticeQuestion }) {
  if (q.stem_image_url) {
    return <QuestionImageCard image={{ image_url: q.stem_image_url, hires_url: q.stem_image_url, caption: "题干原图" }} />;
  }
  return (
    <div className="max-w-xl whitespace-pre-wrap rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-[15px] leading-7 text-slate-700">
      {q.stem_text}
    </div>
  );
}

function PracticeInner() {
  const sp = useSearchParams();
  const [mode, setMode] = useState(sp.get("mode") ?? "daily");
  const [kps, setKps] = useState<string[]>([]);
  const [activeKp, setActiveKp] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(apiUrl("/knowledge-graph/nodes?limit=20"))
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setKps((d.items as GraphNode[]).filter((n) => n.code.startsWith("conic.")).map((n) => n.code)))
      .catch(() => setKps([]));
  }, []);

  const start = useCallback(
    async (m: string, kp: string | null) => {
      setLoading(true);
      setFeedback(null);
      setPicked(null);
      setTextAnswer("");
      setQIdx(0);
      const params = new URLSearchParams({ mode: m, count: "5" });
      if (kp) params.set("kp_codes", kp);
      const res = await fetch(apiUrl(`/practice/questions?${params}`));
      const d = (await res.json()) as { items: PracticeQuestion[] };
      setQuestions(d.items);
      setLoading(false);
    },
    [],
  );

  // URL 带 mode/kp_codes 时自动开始
  useEffect(() => {
    const kp = sp.get("kp_codes");
    const m = sp.get("mode");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 异步取数前置 loading，非同步级联
    if (m || kp) start(m ?? "special", kp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    const q = questions[qIdx];
    const answer = q.options ? picked : textAnswer.trim();
    if (!answer) return;
    const res = await fetch(apiUrl("/practice/submit"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: q.question_id, answer }),
    });
    setFeedback(await res.json());
  };

  const current = questions[qIdx];

  return (
    <div className="pt-8">
      <h1 className="text-xl font-bold">练题中心</h1>
      <p className="mt-1 text-sm text-slate-500">按薄弱知识点精准练 · 题目一律原图直出（无图题文字呈现）</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => {
              setMode(m.key);
              setActiveKp(null);
              start(m.key, null);
            }}
            className={
              "rounded-full border px-4 py-2 text-sm transition " +
              (mode === m.key
                ? "border-indigo-400 bg-indigo-50 font-medium text-indigo-600"
                : "border-slate-200 bg-white/80 text-slate-600 hover:border-indigo-300")
            }
          >
            {m.label}
          </button>
        ))}
      </div>

      {kps.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {kps.map((kp) => (
            <button
              key={kp}
              onClick={() => {
                setActiveKp(kp);
                setMode("special");
                start("special", kp);
              }}
              className={
                "rounded-full border px-3 py-1 text-xs transition " +
                (activeKp === kp
                  ? "border-indigo-400 bg-indigo-50 font-medium text-indigo-600"
                  : "border-slate-200 bg-white/70 text-slate-500 hover:border-indigo-300")
              }
            >
              {kp}
            </button>
          ))}
        </div>
      )}

      {loading && <div className="skeleton mt-6 h-72 rounded-2xl" />}

      {current && !loading && (
        <div className="mt-6 rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex gap-2">
              <Pill tone="indigo">{current.kp_codes[0] ?? "综合"}</Pill>
              <Pill tone={current.source === "ai" ? "amber" : "slate"}>
                {current.source === "ai" ? "AI 兜底题" : current.source === "imported" ? "真题导入" : "题库"}
              </Pill>
            </div>
            <span className="text-xs text-slate-400">
              第 {qIdx + 1} / {questions.length} 题
            </span>
          </div>

          <StemCard q={current} />

          {current.options ? (
            <div className="mt-4 space-y-2">
              {Object.entries(current.options).map(([key, text]) => {
                const isPicked = picked === key;
                return (
                  <button
                    key={key}
                    disabled={!!feedback}
                    onClick={() => setPicked(key)}
                    className={
                      "flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-[15px] transition " +
                      (isPicked
                        ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/40")
                    }
                  >
                    <span
                      className={
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold " +
                        (isPicked ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500")
                      }
                    >
                      {key}
                    </span>
                    {text}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4">
              <textarea
                value={textAnswer}
                disabled={!!feedback}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder="此题为填空/解答题，输入你的答案…"
                className="w-full rounded-2xl border border-slate-200 p-3 text-[15px] leading-7 outline-none focus:border-indigo-300"
                rows={2}
              />
            </div>
          )}

          {feedback && (
            <div
              className={
                "mt-4 rounded-2xl border p-4 " +
                (feedback.verdict === "right" ? "border-emerald-100 bg-emerald-50/70" : "border-amber-100 bg-amber-50/70")
              }
            >
              <p className={"text-sm font-semibold " + (feedback.verdict === "right" ? "text-emerald-600" : "text-amber-600")}>
                {feedback.verdict === "right" ? "✓ 回答正确" : "✗ 未答对 · 已自动加入错题本"}
              </p>
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            {!feedback ? (
              <button
                onClick={submit}
                disabled={!picked && !textAnswer.trim()}
                className="bg-brand-gradient rounded-full px-6 py-2 text-sm font-medium text-white shadow hover:opacity-90 disabled:opacity-30"
              >
                提交答案
              </button>
            ) : qIdx < questions.length - 1 ? (
              <button
                onClick={() => {
                  setQIdx((i) => i + 1);
                  setPicked(null);
                  setTextAnswer("");
                  setFeedback(null);
                }}
                className="bg-brand-gradient rounded-full px-6 py-2 text-sm font-medium text-white shadow hover:opacity-90"
              >
                下一题 →
              </button>
            ) : (
              <button
                onClick={() => start(mode, activeKp)}
                className="bg-brand-gradient rounded-full px-6 py-2 text-sm font-medium text-white shadow hover:opacity-90"
              >
                这一组练完了 · 再来一组
              </button>
            )}
          </div>
        </div>
      )}

      {!current && !loading && (
        <div className="mt-10 rounded-3xl border border-dashed border-indigo-200 bg-white/60 p-10 text-center text-sm text-slate-400">
          选择模式开始练习（带图题一律图片直出；判分错题自动进错题本）
        </div>
      )}
    </div>
  );
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="skeleton mt-8 h-72 rounded-2xl" />}>
      <PracticeInner />
    </Suspense>
  );
}
