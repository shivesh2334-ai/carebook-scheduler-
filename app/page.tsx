"use client";

import { useRef, useState } from "react";
import { Send } from "lucide-react";
import { ChatMessage } from "@/components/ChatMessage";
import type { ChatMessage as ChatMessageType } from "@/lib/types";

const QUICK_ACTIONS = [
  "Book an OPD appointment",
  "I need a follow-up visit",
  "Cancel my appointment",
  "What slots are open tomorrow?"
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi, I'm CareBot 👋 I can help you book, reschedule, or cancel an appointment at Dwarka Clinic. How can I help today?"
    }
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function sendMessage(text: string) {
    if (!text.trim() || isStreaming) return;

    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: "user",
      content: text
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsStreaming(true);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" }
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!res.ok) {
        const body = await res.text();
        const match = body.match(/^data: (.+)$/m);
        const message = match
          ? JSON.parse(match[1]).message || JSON.parse(match[1]).error
          : body;
        throw new Error(message || "Request failed");
      }

      if (!res.body) throw new Error("No response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const raw of events) {
          const lines = raw.split("\n");
          const eventType = lines
            .find((line) => line.startsWith("event: "))
            ?.slice("event: ".length);
          const dataLines = lines
            .filter((line) => line.startsWith("data: "))
            .map((line) => line.slice("data: ".length));
          if (!eventType || dataLines.length === 0) continue;

          const data = JSON.parse(dataLines.join("\n"));

          if (eventType === "text") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + data.text }
                  : m
              )
            );
          } else if (eventType === "error") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: m.content || data.message || data.error ||
                        "Sorry, something went wrong. Please try again."
                    }
                  : m
              )
            );
          }
        }
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId && !m.content
            ? {
                ...m,
                content:
                  error instanceof Error && error.message
                    ? error.message
                    : "Sorry, something went wrong. Please try again."
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-lg font-semibold text-slate-900">CareBot</h1>
        <p className="text-sm text-slate-500">
          Clinical appointment assistant for Dwarka Clinic
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200 bg-white px-4 py-3 space-y-3">
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action}
              onClick={() => sendMessage(action)}
              disabled={isStreaming}
              className="rounded-full border border-clinic-200 bg-clinic-50 px-3 py-1 text-xs text-clinic-700 hover:bg-clinic-100 disabled:opacity-50"
            >
              {action}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clinic-500"
            disabled={isStreaming}
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={isStreaming}
            className="flex items-center justify-center rounded-full bg-clinic-600 px-4 py-2 text-white hover:bg-clinic-700 disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
