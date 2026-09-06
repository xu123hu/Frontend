"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import { streamSse, StreamAbortedError, FirstTokenTimeoutError } from "@/lib/sse";
import type { ChatMessage, ChatStatus, PendingQuestion, QuestionImage, SourceRef } from "@/lib/types";

/**
 * 对话会话状态机（对齐 api-contracts B1-1 + event-contracts v1.0-rc1）：
 * SSE 连接生命周期在此收口；wait_for_input → reply 端点续轮；断线带 Last-Event-ID 指数退避重连。
 */

interface ChatContextValue {
  messages: ChatMessage[];
  status: ChatStatus;
  sessionId: string | null;
  send: (text: string) => void;
  reply: (q: PendingQuestion, value: string) => void;
  stop: () => void;
  retry: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

let seq = 0;
const nextId = () => `msg-${Date.now().toString(36)}-${seq++}`;

interface QuizBlock {
  kind: "quiz_item";
  stem_text?: string;
  stem_images?: { url: string; page_no?: number }[];
  options?: Record<string, string> | null;
}
type Block = QuizBlock | { kind: "figure" | "lecture_page"; content?: string; artifact_url?: string; expr?: string };

function isQuizBlock(b: Block): b is QuizBlock {
  return b.kind === "quiz_item";
}

export function ChatSessionProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastSeqRef = useRef<number>(0);
  const lastSentRef = useRef<string>("");
  const sessionIdRef = useRef<string | null>(null);

  const patch = (assistantId: string, fn: (m: ChatMessage) => ChatMessage) =>
    setMessages((prev) => prev.map((m) => (m.id === assistantId ? fn(m) : m)));

  const run = useCallback((url: string, body: Record<string, unknown>, text: string) => {
    const assistantId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "user", text, images: [], steps: [], sources: [] },
      { id: assistantId, role: "assistant", text: "", images: [], steps: [], sources: [] },
    ]);
    setStatus("connecting");
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      // 断线重连：指数退避 1s/2s，带 Last-Event-ID（event-contracts §4）
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await streamSse(url, {
            body,
            signal: controller.signal,
            headers: lastSeqRef.current > 0 ? { "Last-Event-ID": String(lastSeqRef.current) } : undefined,
            onEvent: (type, data, id) => {
              if (id) lastSeqRef.current = Number(id) || lastSeqRef.current;
              const d = data as Record<string, unknown>;
              switch (type) {
                case "session":
                  if (d.session_id) {
                    setSessionId(String(d.session_id));
                    sessionIdRef.current = String(d.session_id);
                  }
                  setStatus("streaming");
                  break;
                case "stage_start":
                  patch(assistantId, (m) => ({ ...m, steps: [...m.steps, `阶段·${String(d.stage)}`] }));
                  setStatus("streaming");
                  break;
                case "thinking": {
                  patch(assistantId, (m) =>
                    m.steps.includes("推理中") ? m : { ...m, steps: [...m.steps, "推理中"] },
                  );
                  break;
                }
                case "delta":
                  setStatus("streaming");
                  // 仅 answer 通道拼接为正文；tool 通道视为过程
                  if (d.call_kind === "answer") {
                    patch(assistantId, (m) => ({ ...m, text: m.text + String(d.delta ?? "") }));
                  }
                  break;
                case "tool_call":
                  patch(assistantId, (m) => ({ ...m, steps: [...m.steps, `🔧 ${String(d.tool)}`] }));
                  break;
                case "tool_result":
                  patch(assistantId, (m) => ({ ...m, steps: [...m.steps, String(d.summary ?? "工具完成")] }));
                  break;
                case "progress":
                  patch(assistantId, (m) => ({
                    ...m,
                    steps: [...m.steps, `${String(d.phase ?? "处理中")}${d.message ? ` · ${String(d.message)}` : ""}`],
                  }));
                  break;
                case "sources": {
                  const list = (d.sources ?? []) as SourceRef[];
                  patch(assistantId, (m) => ({ ...m, sources: [...m.sources, ...list] }));
                  break;
                }
                case "message": {
                  const blocks = (d.blocks ?? []) as Block[];
                  const content = typeof d.content === "string" ? d.content : "";
                  patch(assistantId, (m) => {
                    let next = { ...m, text: m.text + (content ? (m.text ? "\n\n" : "") + content : "") };
                    for (const b of blocks) {
                      if (isQuizBlock(b)) {
                        const imgs: QuestionImage[] = (b.stem_images ?? []).map((s) => ({
                          image_url: s.url,
                          caption: b.stem_text?.slice(0, 40) || "题目原图",
                        }));
                        next = { ...next, images: [...next.images, ...imgs] };
                        if (b.options && Object.keys(b.options).length > 0) {
                          const optText = Object.entries(b.options)
                            .map(([k, v]) => `${k}. ${v}`)
                            .join("　");
                          next = { ...next, text: next.text + (next.text ? "\n\n" : "") + optText };
                        }
                      } else if (b.kind === "figure" && (b.artifact_url || (b as { url?: string }).url)) {
                        const u = b.artifact_url ?? (b as { url?: string }).url ?? "";
                        next = { ...next, images: [...next.images, { image_url: u, caption: b.expr ?? "图形" }] };
                      } else if (b.kind === "lecture_page" && b.content) {
                        next = { ...next, text: next.text + (next.text ? "\n\n" : "") + String(b.content) };
                      }
                    }
                    return next;
                  });
                  setStatus("streaming");
                  break;
                }
                case "wait_for_input": {
                  const qs = (d.questions ?? []) as PendingQuestion[];
                  if (qs.length > 0) {
                    patch(assistantId, (m) => ({ ...m, pendingQuestion: qs[0] }));
                  }
                  break;
                }
                case "done":
                  patch(assistantId, (m) => ({ ...m, done: true }));
                  setStatus("idle");
                  break;
                case "error":
                  patch(assistantId, (m) => ({
                    ...m,
                    error: {
                      code: String(d.code ?? "unknown"),
                      message: String(d.message ?? "出错了"),
                      retryable: Boolean(d.retryable),
                    },
                    // partial_response=false 时此前 delta 不可信，清空展示
                    text: d.partial_response === false ? "" : m.text,
                  }));
                  setStatus("error");
                  break;
              }
            },
          });
          // 服务端正常关流兜底定稿
          patch(assistantId, (m) => (m.done ? m : { ...m, done: true }));
          setStatus((s) => (s === "error" ? s : "idle"));
          return;
        } catch (err) {
          if (err instanceof StreamAbortedError) {
            patch(assistantId, (m) => ({
              ...m,
              done: true,
              text: m.text + (m.text ? "\n\n（已停止生成）" : "（已停止生成）"),
            }));
            setStatus("idle");
            return;
          }
          if (err instanceof FirstTokenTimeoutError) {
            patch(assistantId, (m) => ({
              ...m,
              done: true,
              error: { code: "first_token_timeout", message: err.message, retryable: true },
            }));
            setStatus("error");
            return;
          }
          // 网络/HTTP 错误：退避后重连（非用户中止）
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            continue;
          }
          patch(assistantId, (m) => ({
            ...m,
            done: true,
            error: {
              code: "network",
              message: err instanceof Error ? err.message : "网络异常，请重试",
              retryable: true,
            },
          }));
          setStatus("error");
          return;
        }
      }
    })();
  }, []);

  const send = useCallback(
    (text: string) => {
      if (status === "connecting" || status === "streaming") return;
      lastSentRef.current = text;
      lastSeqRef.current = 0; // 新 turn 重置续传游标
      run(apiUrl("/chat"), { session_id: sessionIdRef.current, client_msg_id: nextId(), message: text, capability: "guided_solve" }, text);
    },
    [status, run],
  );

  const reply = useCallback(
    (q: PendingQuestion, value: string) => {
      if (status === "connecting" || status === "streaming" || !sessionIdRef.current) return;
      lastSeqRef.current = 0;
      run(
        apiUrl(`/chat/sessions/${sessionIdRef.current}/reply`),
        { client_msg_id: nextId(), reply: { question_id: q.id, kind: q.kind, value } },
        value,
      );
    },
    [status, run],
  );

  const retry = useCallback(() => {
    if (status === "connecting" || status === "streaming" || !lastSentRef.current) return;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      return last?.role === "assistant" && last.error ? prev.slice(0, -1) : prev;
    });
    lastSeqRef.current = 0;
    run(apiUrl("/chat"), { session_id: sessionIdRef.current, client_msg_id: nextId(), message: lastSentRef.current, capability: "guided_solve" }, lastSentRef.current);
  }, [status, run]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return (
    <ChatContext.Provider value={{ messages, status, sessionId, send, reply, stop, retry }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat 必须在 ChatSessionProvider 内使用");
  return ctx;
}
