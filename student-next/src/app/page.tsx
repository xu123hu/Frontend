"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ChatSessionProvider, useChat } from "@/features/chat/ChatSessionProvider";
import ChatComposer from "@/components/chat/ChatComposer";
import MessageBubble from "@/components/chat/MessageBubble";

const QUICK_ACTIONS = ["引导我解一道椭圆题", "来一道举一反三的变式题", "讲解：抛物线的焦点与准线"];

const RECOMMENDATIONS = [
  { icon: "📐", text: "带我一步步解：椭圆 x²/6 + y²/3 = 1 的焦点三角形问题" },
  { icon: "🔁", text: "把昨天错的抛物线焦点弦题，出一道类似的变式" },
  { icon: "🧭", text: "用知识图谱看看圆锥曲线我哪里最薄弱" },
];

const ENTRIES = [
  { href: "/kb", icon: "📚", title: "知识库", desc: "上传教材，AI 按你的资料出题" },
  { href: "/errors", icon: "📷", title: "错题本", desc: "拍照增强，自动归知识点" },
  { href: "/practice", icon: "✏️", title: "练题中心", desc: "按薄弱点精准练" },
  { href: "/graph", icon: "🕸️", title: "知识图谱", desc: "看清章节脉络与漏洞" },
  { href: "/classroom", icon: "👨‍🏫", title: "双师课堂", desc: "讲义逐页 + 图形演示" },
  { href: "/exam", icon: "📝", title: "模拟试卷", desc: "限时组卷，自动批改" },
];

function Hero({ onSend }: { onSend: (t: string) => void }) {
  return (
    <div className="mx-auto max-w-3xl pt-16 text-center">
      <p className="text-[15px] text-slate-500">晚上好，同学 👋</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
        今天想<span className="text-gradient">学点</span>什么？
      </h1>
      <p className="mt-3 text-[15px] text-slate-500">引导解题、举一反三、错题讲解、按你的教材出题——一句话交给 AI</p>

      <div className="mt-8">
        <ChatComposer autoFocus onSend={onSend} />
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {QUICK_ACTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onSend(q)}
            className="rounded-full border border-slate-200 bg-white/80 px-3.5 py-1.5 text-sm text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="mt-10 text-left">
        <h2 className="text-sm font-semibold text-slate-400">为你推荐</h2>
        <div className="mt-3 space-y-2.5">
          {RECOMMENDATIONS.map((r) => (
            <button
              key={r.text}
              onClick={() => onSend(r.text)}
              className="flex w-full min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 px-4 py-3 text-left text-[15px] shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/40"
            >
              <span className="shrink-0 text-lg">{r.icon}</span>
              <span className="min-w-0 flex-1 break-words text-slate-700">{r.text}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-3 text-left sm:grid-cols-3">
        {ENTRIES.map((e) => (
          <Link
            key={e.href}
            href={e.href}
            className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
          >
            <div className="text-xl">{e.icon}</div>
            <div className="mt-1.5 text-[15px] font-semibold">{e.title}</div>
            <div className="mt-0.5 text-xs text-slate-400">{e.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Conversation() {
  const { messages, status, send, stop, retry, reply } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const streaming = status === "connecting" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div className="mx-auto max-w-3xl pt-6">
      <div className="space-y-6 pb-4">
        {messages.map((m, i) => (
          <MessageBubble
            key={m.id}
            message={m}
            streaming={streaming && i === messages.length - 1 && m.role === "assistant"}
            onRetry={retry}
            onReply={reply}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="sticky bottom-4 pt-2">
        <ChatComposer onSend={send} onStop={stop} streaming={streaming} />
      </div>
    </div>
  );
}

function HomeInner() {
  const { messages, send } = useChat();
  return messages.length === 0 ? <Hero onSend={send} /> : <Conversation />;
}

export default function HomePage() {
  return (
    <ChatSessionProvider>
      <HomeInner />
    </ChatSessionProvider>
  );
}
