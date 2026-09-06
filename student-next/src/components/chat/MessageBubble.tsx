"use client";

import { useState } from "react";
import QuestionImageCard from "./QuestionImageCard";
import StreamText from "./StreamText";
import type { ChatMessage, PendingQuestion } from "@/lib/types";

/** wait_for_input 作答卡：choice → 选项按钮；text → 输入框 */
function ReplyCard({ question, onReply }: { question: PendingQuestion; onReply: (q: PendingQuestion, v: string) => void }) {
  const [text, setText] = useState("");
  const submit = () => {
    const t = text.trim();
    if (t) onReply(question, t);
  };
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
      <p className="text-[15px] font-medium text-amber-700">✏️ {question.prompt}</p>
      {question.kind === "choice" && question.options ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {question.options.map((o) => (
            <button
              key={o.label}
              onClick={() => onReply(question, o.label)}
              className="rounded-full border border-amber-300 bg-white px-4 py-1.5 text-sm text-amber-700 hover:bg-amber-100"
            >
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && submit()}
            placeholder="输入你的回答…"
            className="flex-1 rounded-full border border-amber-300 bg-white px-4 py-2 text-sm outline-none focus:border-amber-400"
          />
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-30"
          >
            回答
          </button>
        </div>
      )}
    </div>
  );
}

/** 单条消息：用户气泡 / AI 消息（步骤 + 引用 + 流式文本 + 题目图片卡 + 追问卡 + 错误重试） */
export default function MessageBubble({
  message,
  streaming,
  onRetry,
  onReply,
}: {
  message: ChatMessage;
  streaming: boolean;
  onRetry?: () => void;
  onReply?: (q: PendingQuestion, v: string) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-indigo-600 px-4 py-2.5 text-[15px] leading-7 text-white shadow-sm">
          {message.text}
        </div>
      </div>
    );
  }

  const connecting = streaming && message.text === "" && message.steps.length === 0 && message.images.length === 0;

  return (
    <div className="flex gap-3">
      <span className="bg-brand-gradient mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white">
        AI
      </span>
      <div className="min-w-0 max-w-[85%] space-y-3">
        {connecting && (
          <div className="space-y-2 rounded-2xl rounded-tl-md border border-slate-100 bg-white/80 p-4 shadow-sm">
            <div className="skeleton h-3.5 w-52 rounded-full" />
            <div className="skeleton h-3.5 w-80 rounded-full" />
            <div className="skeleton h-3.5 w-40 rounded-full" />
          </div>
        )}

        {message.steps.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.steps.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-xs text-cyan-700"
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500" />
                {s}
              </span>
            ))}
          </div>
        )}

        {message.images.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {message.images.map((img, i) => (
              <QuestionImageCard key={i} image={img} />
            ))}
          </div>
        )}

        {message.text !== "" && (
          <div className="rounded-2xl rounded-tl-md border border-slate-100 bg-white/90 px-4 py-3 shadow-sm">
            <StreamText text={message.text} streaming={streaming && !message.done} />
          </div>
        )}

        {message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.sources.map((s, i) => (
              <span key={i} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                📄 {s.title}
                {s.locator ? ` · ${s.locator}` : ""}
              </span>
            ))}
          </div>
        )}

        {message.done && message.pendingQuestion && onReply && (
          <ReplyCard question={message.pendingQuestion} onReply={onReply} />
        )}

        {message.error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            <span>⚠ {message.error.message}</span>
            {message.error.retryable && onRetry && (
              <button
                onClick={onRetry}
                className="rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600"
              >
                重试
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
