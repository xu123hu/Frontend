"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import { streamSse, StreamAbortedError } from "@/lib/sse";
import type { ChatMessage, ChatStatus } from "@/lib/types";

/**
 * 对话会话状态机：SSE 连接生命周期在此收口，UI 组件只读。
 * 状态：idle → connecting（骨架）→ streaming（打字机）→ idle / error（可重试）。
 */

interface ChatContextValue {
  messages: ChatMessage[];
  status: ChatStatus;
  sessionId: string | null;
  send: (text: string) => void;
  stop: () => void;
  /** 重发最后一条用户消息（用于失败重试） */
  retry: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

let seq = 0;
const nextId = () => `msg-${Date.now().toString(36)}-${seq++}`;

export function ChatSessionProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastSentRef = useRef<string>("");

  const run = useCallback((text: string) => {
    const assistantId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "user", text, images: [], steps: [] },
      { id: assistantId, role: "assistant", text: "", images: [], steps: [] },
    ]);
    setStatus("connecting");

    const patch = (fn: (m: ChatMessage) => ChatMessage) =>
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? fn(m) : m)));

    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        await streamSse(apiUrl("/agent/chat"), {
          body: { message: text, session_id: sessionId },
          signal: controller.signal,
          onEvent: (type, data) => {
            const d = data as Record<string, unknown>;
            switch (type) {
              case "session":
                setSessionId(String(d.session_id));
                setStatus("streaming");
                break;
              case "delta":
                setStatus("streaming");
                patch((m) => ({ ...m, text: m.text + String(d.text ?? "") }));
                break;
              case "progress":
              case "tool_call":
                setStatus("streaming");
                patch((m) => ({
                  ...m,
                  steps: [...m.steps, String(d.stage ?? d.name ?? "处理中")],
                }));
                break;
              case "message": {
                setStatus("streaming");
                if (d.type === "question_image" && d.image) {
                  patch((m) => ({ ...m, images: [...m.images, d.image as ChatMessage["images"][number]] }));
                } else if (d.type === "canvas_op" && d.op) {
                  // 课堂画布指令由课堂页自行消费，普通对话忽略
                }
                break;
              }
              case "done":
                patch((m) => ({ ...m, done: true }));
                setStatus("idle");
                break;
              case "error":
                patch((m) => ({
                  ...m,
                  done: true,
                  error: {
                    code: String(d.code ?? "unknown"),
                    message: String(d.message ?? "出错了"),
                    retryable: Boolean(d.retryable),
                  },
                }));
                setStatus("error");
                break;
            }
          },
        });
        // 服务端正常关流但未发 done：兜底定稿
        patch((m) => (m.done ? m : { ...m, done: true }));
        setStatus((s) => (s === "error" ? s : "idle"));
      } catch (err) {
        if (err instanceof StreamAbortedError) {
          patch((m) => ({
            ...m,
            done: true,
            text: m.text + (m.text ? "\n\n（已停止生成）" : "（已停止生成）"),
          }));
          setStatus("idle");
        } else {
          patch((m) => ({
            ...m,
            done: true,
            error: {
              code: "network",
              message: err instanceof Error ? err.message : "网络异常，请重试",
              retryable: true,
            },
          }));
          setStatus("error");
        }
      } finally {
        abortRef.current = null;
      }
    })();
  }, [sessionId]);

  const send = useCallback(
    (text: string) => {
      if (status === "connecting" || status === "streaming") return;
      lastSentRef.current = text;
      run(text);
    },
    [status, run],
  );

  const retry = useCallback(() => {
    if (status === "connecting" || status === "streaming" || !lastSentRef.current) return;
    // 移除最后一条失败的 assistant 消息后重发
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      return last?.role === "assistant" && last.error ? prev.slice(0, -1) : prev;
    });
    run(lastSentRef.current);
  }, [status, run]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return (
    <ChatContext.Provider value={{ messages, status, sessionId, send, stop, retry }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat 必须在 ChatSessionProvider 内使用");
  return ctx;
}
