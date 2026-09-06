"use client";

import { useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import { streamSse } from "@/lib/sse";
import { StageProgress } from "@/components/ui/ui";
import type { Slide } from "@/lib/types";

function BlockView({ b }: { b: Slide["blocks"][number] }) {
  if (b.kind === "text") {
    return <p className="text-[15px] leading-7 text-slate-700">{b.content}</p>;
  }
  if (b.kind === "latex") {
    // AI 新生成讲稿公式：联调期以等宽文本呈现；KaTeX 渲染待 B1 打通后启用（不涉题目原图）
    return (
      <pre className="overflow-x-auto rounded-xl bg-slate-50 px-3 py-2 font-mono text-sm text-indigo-700">{b.content}</pre>
    );
  }
  if (b.kind === "example") {
    return (
      <div className="rounded-2xl bg-cyan-50/60 p-3">
        <p className="text-sm font-semibold text-cyan-700">{b.content}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-600">
          {(b.analysis ?? []).map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ol>
      </div>
    );
  }
  return null; // figure_ref 在右侧画布区渲染
}

/** 双师课堂：B4-5 两步流（创建会话 → SSE slide 事件流），讲义逐页 + 图形直出。 */
export default function ClassroomPage() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [current, setCurrent] = useState(0);
  const [percent, setPercent] = useState(0);
  const [stage, setStage] = useState("");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [askLog, setAskLog] = useState<{ q: string; a: string }[]>([]);
  const sessionRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startLesson = async () => {
    setRunning(true);
    setSlides([]);
    setCurrent(0);
    setPercent(0);
    setError(null);
    try {
      const res = await fetch(apiUrl("/dual-tutor/sessions"), {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID(), "Content-Type": "application/json" },
        body: JSON.stringify({ topic: "抛物线的焦点与准线", slide_count: 3, with_figures: true }),
      });
      if (!res.ok && res.status !== 202) throw new Error(`创建会话失败（HTTP ${res.status}）`);
      const created = (await res.json()) as { session_id: string; task_id: string };
      sessionRef.current = created.session_id;

      const controller = new AbortController();
      abortRef.current = controller;
      await streamSse(apiUrl(`/dual-tutor/sessions/${created.session_id}/events`), {
        body: {},
        signal: controller.signal,
        onEvent: (type, data) => {
          const d = data as Record<string, unknown>;
          if (type === "progress") {
            setPercent(Number(d.percent ?? 0));
            setStage(String(d.stage ?? ""));
          } else if (type === "slide") {
            const s = d as unknown as Slide;
            setSlides((prev) => [...prev.filter((x) => x.index !== s.index), s].sort((a, b) => a.index - b.index));
            setCurrent(s.index);
          } else if (type === "error") {
            setError(String(d.message ?? "生成失败"));
          }
        },
      });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError(e instanceof Error ? e.message : "连接中断");
      }
    } finally {
      setRunning(false);
      setPercent(100);
    }
  };

  const selectSlide = (idx: number) => {
    setCurrent(idx);
    // 进度写回（B4-5 PATCH，修复"刷新回第 0 页"）
    if (sessionRef.current) {
      fetch(apiUrl(`/dual-tutor/sessions/${sessionRef.current}/progress`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cur_index: idx }),
      }).catch(() => undefined);
    }
  };

  const ask = () => {
    const t = input.trim();
    if (!t) return;
    setInput("");
    // 契约 v1 暂无学生提问端点（FE 已增补请求），先本地回显兜底
    setAskLog((prev) => [...prev, { q: t, a: "好问题！结合右侧图形：焦点 F(p/2, 0)，代入 p = 2 试试。" }]);
  };

  const currentSlide = slides.find((s) => s.index === current) ?? slides[slides.length - 1] ?? null;
  const figure = currentSlide?.blocks.find((b) => b.kind === "figure_ref");

  return (
    <div className="pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">双师课堂 · 抛物线的焦点与准线</h1>
          <p className="mt-1 text-sm text-slate-500">讲义逐页生成（B4-5 slide 事件流）· 图形 artifact 直出</p>
        </div>
        <button
          onClick={startLesson}
          disabled={running}
          className="bg-brand-gradient rounded-full px-5 py-2 text-sm font-medium text-white shadow hover:opacity-90 disabled:opacity-40"
        >
          {running ? "讲义生成中…" : slides.length === 0 ? "▶ 开始上课" : "重讲一遍"}
        </button>
      </div>

      {running && (
        <div className="mt-4">
          <StageProgress stages={["创建会话", "生成讲义", "完成"]} currentStage={percent >= 100 ? "完成" : percent > 10 ? "生成讲义" : "创建会话"} pct={percent} note={stage} />
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">⚠ {error}</div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 讲义区 */}
        <div className="flex h-[560px] flex-col rounded-3xl border border-slate-100 bg-white/90 p-4 shadow-sm">
          {slides.length > 0 && (
            <div className="mb-3 flex gap-1.5">
              {slides.map((s) => (
                <button
                  key={s.index}
                  onClick={() => selectSlide(s.index)}
                  className={
                    "rounded-full px-3 py-1 text-xs transition " +
                    (s.index === current
                      ? "bg-indigo-600 font-medium text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200")
                  }
                >
                  第 {s.index + 1} 页
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {slides.length === 0 && !running && (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                点击「开始上课」，AI 讲师逐页生成讲义，右侧同步演示图形
              </div>
            )}
            {currentSlide?.blocks
              .filter((b) => b.kind !== "figure_ref")
              .map((b, i) => (
                <BlockView key={i} b={b} />
              ))}
            {askLog.map((x, i) => (
              <div key={`ask-${i}`} className="space-y-2">
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2 text-[15px] text-white">{x.q}</div>
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-slate-100 bg-slate-50/80 px-4 py-3 text-[15px] leading-7">
                  {x.a}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask()}
              placeholder="向讲师提问…"
              className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-300"
            />
            <button
              onClick={ask}
              className="bg-brand-gradient rounded-full px-4 py-2 text-sm font-medium text-white shadow hover:opacity-90"
            >
              提问
            </button>
          </div>
        </div>

        {/* 图形区：figure_ref artifact 直出 */}
        <div className="h-[560px] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            图形区 · 消费 figure_ref artifact（{slides.length} 页讲义）
          </div>
          {figure?.artifact_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={figure.artifact_url} alt={figure.expr ?? "课堂图形"} className="h-[calc(100%-36px)] w-full object-contain" />
          ) : (
            <div className="flex h-[calc(100%-36px)] items-center justify-center text-sm text-slate-300">
              讲义图形将在此直出（SVG artifact）
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
