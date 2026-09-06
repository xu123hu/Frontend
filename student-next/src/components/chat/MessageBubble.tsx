"use client";

import QuestionImageCard from "./QuestionImageCard";
import StreamText from "./StreamText";
import type { ChatMessage } from "@/lib/types";

/** 单条消息：用户气泡 / AI 消息（步骤条 + 流式文本 + 题目图片卡 + 错误重试） */
export default function MessageBubble({
  message,
  streaming,
  onRetry,
}: {
  message: ChatMessage;
  streaming: boolean;
  onRetry?: () => void;
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
        {/* 首响应骨架：连接中且无任何内容 */}
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

        {(message.text !== "" || !connecting) && message.text !== "" && (
          <div className="rounded-2xl rounded-tl-md border border-slate-100 bg-white/90 px-4 py-3 shadow-sm">
            <StreamText text={message.text} streaming={streaming && !message.done} />
          </div>
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
