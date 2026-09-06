"use client";

import { useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import { streamSse } from "@/lib/sse";
import { useSmoothStream } from "@/lib/useSmoothStream";
import type { CanvasOp } from "@/lib/types";

/** 画布：消费结构化 canvas_op 指令独立渲染（不随文字流重排）。 */
function ClassroomCanvas({ ops }: { ops: CanvasOp[] }) {
  const W = 640;
  const H = 400;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full">
      <rect width={W} height={H} fill="#ffffff" />
      {ops.map((op, i) => {
        if (op.op === "axes") {
          return (
            <g key={i} stroke="#334155" strokeWidth="1.6">
              <line x1={40} y1={H * 0.62} x2={W - 30} y2={H * 0.62} />
              <line x1={W * 0.42} y1={30} x2={W * 0.42} y2={H - 30} />
              <text x={W - 36} y={H * 0.62 + 18} fontSize="15" fill="#475569" stroke="none">x</text>
              <text x={W * 0.42 + 8} y={40} fontSize="15" fill="#475569" stroke="none">y</text>
            </g>
          );
        }
        if (op.op === "draw" && op.points) {
          const pts = op.points.map(([u, v]) => `${u * W},${v * H}`).join(" ");
          return (
            <polyline
              key={i}
              points={pts}
              fill="none"
              stroke={op.color ?? "#4f46e5"}
              strokeWidth="2.6"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1}
              style={{ animation: "drawline 1.6s ease forwards" }}
            >
              <style>{"@keyframes drawline{to{stroke-dashoffset:0}}"}</style>
            </polyline>
          );
        }
        if (op.op === "label" && op.at) {
          return (
            <text
              key={i}
              x={op.at[0] * W}
              y={(1 - op.at[1]) * H}
              fontSize="20"
              fontWeight="bold"
              fill={op.color ?? "#dc2626"}
            >
              {op.label}
            </text>
          );
        }
        return null;
      })}
    </svg>
  );
}

interface Line {
  id: string;
  role: "user" | "assistant";
  text: string;
  done: boolean;
}

/** 双师课堂：左讲解流 + 右动态画布（两区独立渲染，讲解流式不卡画布）。 */
export default function ClassroomPage() {
  const [lines, setLines] = useState<Line[]>([]);
  const [ops, setOps] = useState<CanvasOp[]>([]);
  const [running, setRunning] = useState(false);
  const [input, setInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const nextId = () => `l-${seqRef.current++}`;

  const startLesson = () => {
    setRunning(true);
    setOps([]);
    const assistantId = nextId();
    setLines([{ id: assistantId, role: "assistant", text: "", done: false }]);
    const controller = new AbortController();
    abortRef.current = controller;

    const patch = (fn: (l: Line) => Line) =>
      setLines((prev) => prev.map((l) => (l.id === assistantId ? fn(l) : l)));

    streamSse(apiUrl("/classroom/start"), {
      body: { lesson: "parabola-focus" },
      signal: controller.signal,
      onEvent: (type, data) => {
        const d = data as Record<string, unknown>;
        if (type === "delta") patch((l) => ({ ...l, text: l.text + String(d.text ?? "") }));
        else if (type === "message" && d.type === "canvas_op") setOps((prev) => [...prev, d.op as CanvasOp]);
        else if (type === "done") patch((l) => ({ ...l, done: true }));
      },
    })
      .catch(() => patch((l) => ({ ...l, done: true, text: l.text + "\n（连接中断）" })))
      .finally(() => setRunning(false));
  };

  const ask = () => {
    const t = input.trim();
    if (!t) return;
    setInput("");
    setLines((prev) => [
      ...prev,
      { id: nextId(), role: "user", text: t, done: true },
      {
        id: nextId(),
        role: "assistant",
        text: "好问题！结合画布上的图：焦点 F 的横坐标是 p/2，代入 p = 2 就能得出答案。试一试？",
        done: true,
      },
    ]);
  };

  const lastAssistant = [...lines].reverse().find((l) => l.role === "assistant");
  const lastIsStreaming = !!lastAssistant && !lastAssistant.done;

  return (
    <div className="pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">双师课堂 · 抛物线的焦点与准线</h1>
          <p className="mt-1 text-sm text-slate-500">AI 讲师（左）与动态画布（右）双通道，讲解流式输出不卡画布</p>
        </div>
        <button
          onClick={startLesson}
          disabled={running}
          className="bg-brand-gradient rounded-full px-5 py-2 text-sm font-medium text-white shadow hover:opacity-90 disabled:opacity-40"
        >
          {running ? "讲解中…" : lines.length === 0 ? "▶ 开始上课" : "重讲一遍"}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 讲解流区 */}
        <div className="flex h-[560px] flex-col rounded-3xl border border-slate-100 bg-white/90 p-4 shadow-sm">
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {lines.length === 0 && (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                点击「开始上课」，AI 讲师开讲，画布将同步演示
              </div>
            )}
            {lines.map((l) =>
              l.role === "user" ? (
                <div key={l.id} className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2 text-[15px] text-white">{l.text}</div>
                </div>
              ) : (
                <div key={l.id} className="flex gap-3">
                  <span className="bg-brand-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white">
                    师
                  </span>
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-md border border-slate-100 bg-slate-50/80 px-4 py-3 text-[15px] leading-7">
                    <StreamedText text={l.text} active={l.id === lastAssistant?.id && lastIsStreaming} />
                  </div>
                </div>
              ),
            )}
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

        {/* 画布区 */}
        <div className="h-[560px] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            动态画布 · 消费 B4 结构化绘图事件（{ops.length} 步）
          </div>
          <ClassroomCanvas ops={ops} />
        </div>
      </div>
    </div>
  );
}

function StreamedText({ text, active }: { text: string; active: boolean }) {
  const shown = useSmoothStream(text, active);
  return (
    <>
      {shown}
      {active && <span className="stream-cursor" />}
    </>
  );
}
