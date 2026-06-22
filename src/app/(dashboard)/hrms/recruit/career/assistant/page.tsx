"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Add } from "@carbon/icons-react";

type Message = { role: "USER" | "ASSISTANT"; content: string; createdAt: string };
type Conversation = { id: string; title: string; createdAt: string };

export default function CareerAssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/recruit/jobseeker/career/conversations")
      .then((r) => r.json())
      .then((d) => {
        setConversations(d.data?.items ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeId) return;
    fetch(`/api/recruit/jobseeker/career/conversations/${activeId}`)
      .then((r) => r.json())
      .then((d) => setMessages(d.data?.messages ?? []));
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const newConversation = async () => {
    const title = `Career Chat ${new Date().toLocaleDateString()}`;
    const res = await fetch("/api/recruit/jobseeker/career/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (res.ok) {
      const data = await res.json();
      const conv = data.data;
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
      setMessages([]);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeId) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    setMessages((m) => [...m, { role: "USER", content: text, createdAt: new Date().toISOString() }]);
    const res = await fetch(`/api/recruit/jobseeker/career/conversations/${activeId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, role: "USER" }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.data?.assistantMessage) {
        setMessages((m) => [...m, data.data.assistantMessage]);
      }
    }
    setSending(false);
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4 overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-56 flex-shrink-0 flex-col gap-2 overflow-y-auto rounded-xl border border-outline-variant bg-surface p-3">
        <button
          onClick={newConversation}
          className="flex items-center gap-2 rounded-xl bg-[#00cec4]/10 px-3 py-2 text-sm font-medium text-[#00cec4] transition hover:bg-[#00cec4]/20"
        >
          <Add size={16} />
          New Chat
        </button>
        <p className="ds-label mt-2 px-1">Previous</p>
        {loading && <p className="text-xs text-on-surface-variant px-1">Loading...</p>}
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveId(c.id)}
            className={`rounded-xl px-3 py-2 text-left text-sm transition ${
              activeId === c.id
                ? "bg-[#00cec4]/10 text-[#00cec4]"
                : "text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            <span className="line-clamp-2">{c.title}</span>
          </button>
        ))}
      </aside>

      {/* Chat Area */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface">
        {!activeId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#818cf8]/10">
              <Send size={24} className="text-[#818cf8]" />
            </div>
            <p className="font-medium text-on-surface">Career Assistant</p>
            <p className="max-w-xs text-sm text-on-surface-variant">
              AI-powered career advice — completely private. Start a new chat or select a previous conversation.
            </p>
            <button
              onClick={newConversation}
              className="rounded-xl bg-[#00cec4] px-5 py-2 text-sm font-medium text-white hover:bg-[#00b8af]"
            >
              Start Chat
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-center text-sm text-on-surface-variant pt-8">
                  Ask anything about your career, interview prep, or job search strategy.
                </p>
              )}
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "USER" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "USER"
                        ? "bg-[#00cec4] text-white"
                        : "bg-surface-container text-on-surface"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-surface-container px-4 py-2.5 text-sm text-on-surface-variant">
                    Thinking…
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={sendMessage} className="border-t border-outline-variant p-3 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your career assistant..."
                className="flex-1 rounded-xl px-3 py-2 text-sm"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="flex items-center gap-1 rounded-xl bg-[#00cec4] px-4 py-2 text-sm font-medium text-white hover:bg-[#00b8af] disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
