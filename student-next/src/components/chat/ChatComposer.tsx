"use client";

import { useRef, useState } from "react";

/** 胶囊输入框（对齐设计稿 S1/S4）：自动增高、Enter 发送、流式中变"停止"钮。 */
export default function ChatComposer({
  onSend,
  onStop,
  streaming,
  placeholder = "输入你的问题，或把题目拍照发给我…",
  autoFocus = false,
}: {
  onSend: (text: string) => void;
  onStop?: () => void;
  streaming?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const t = text.trim();
    if (!t || streaming) return;
    onSend(t);
    setText("");
    if (ref.current) ref.current.style.height = "auto";
  };

  return (
    <div className="rounded-3xl border border-indigo-100 bg-white/95 p-3 shadow-[0_10px_40px_-12px_rgba(79,70,229,0.25)] transition focus-within:border-indigo-300">
      <textarea
        ref={ref}
        autoFocus={autoFocus}
        value={text}
        rows={1}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        className="max-h-40 w-full resize-none bg-transparent px-2 py-1.5 text-[15px] leading-7 outline-none placeholder:text-slate-400"
      />
      <div className="mt-1 flex items-center justify-between">
        <span className="pl-2 text-xs text-slate-400">Enter 发送 · Shift+Enter 换行</span>
        {streaming ? (
          <button
            onClick={onStop}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-white transition hover:bg-slate-700"
            title="停止生成"
          >
            <span className="block h-3 w-3 rounded-[3px] bg-current" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="bg-brand-gradient flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md transition hover:opacity-90 disabled:opacity-30"
            title="发送"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 11.5L21 3l-8.5 18-2.3-7.2L3 11.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
