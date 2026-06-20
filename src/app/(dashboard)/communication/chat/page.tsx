"use client";

import React, { useEffect, useState, useRef, useTransition } from "react";
import { MessageSquare, Send, Plus, Smile, Pin, Trash, RefreshCw, Hash, User } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  listConversations,
  listChatMessages,
  sendMessage,
  toggleReaction,
  deleteMessage,
  createConversation,
} from "@/modules/communication/chat.service";

export default function ChatPage() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  // Create Channel Form
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"CHANNEL" | "GROUP">("CHANNEL");

  const messageEndRef = useRef<HTMLDivElement>(null);

  // Load Conversations
  const reloadConversations = () => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (userId && orgId) {
      listConversations(userId, orgId).then((res) => {
        setConversations(res);
        if (res.length > 0 && !activeConvoId) {
          setActiveConvoId(res[0].id);
        }
      });
    }
  };

  useEffect(() => {
    reloadConversations();
  }, [session]);

  // Load Messages
  const reloadMessages = () => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (activeConvoId && userId && orgId) {
      listChatMessages(userId, orgId, activeConvoId).then((msgs) => {
        setMessages(msgs.reverse()); // Chronological order
      });
    }
  };

  useEffect(() => {
    reloadMessages();
  }, [activeConvoId, session]);

  // Auto-scroll to bottom
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Polling for new messages (every 5 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      reloadMessages();
    }, 5000);
    return () => clearInterval(timer);
  }, [activeConvoId, session]);

  const handleSend = () => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (!body.trim() || !activeConvoId || !userId || !orgId) return;

    startTransition(async () => {
      try {
        const msg = await sendMessage(userId, orgId, {
          conversationId: activeConvoId,
          body: body.trim(),
        });
        setBody("");
        setMessages((prev) => [...prev, msg]);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleCreateChannel = () => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (!newChannelName.trim() || !userId || !orgId) return;

    createConversation(userId, orgId, {
      name: newChannelName.trim(),
      type: newChannelType,
      isPublic: true,
    }).then((convo) => {
      setIsCreatingChannel(false);
      setNewChannelName("");
      reloadConversations();
      setActiveConvoId(convo.id);
    });
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (!userId || !orgId) return;
    await toggleReaction(userId, orgId, messageId, emoji);
    reloadMessages();
  };

  const handleDelete = async (messageId: string) => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (!userId || !orgId) return;
    if (confirm("Are you sure you want to delete this message?")) {
      await deleteMessage(userId, orgId, messageId);
      reloadMessages();
    }
  };

  const activeConvo = conversations.find((c) => c.id === activeConvoId);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] min-h-0">
      
      {/* 1. Conversations Sidebar */}
      <div className="w-full lg:w-64 shrink-0 flex flex-col bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl overflow-hidden min-h-0">
        <div className="p-4 border-b border-[var(--color-outline-variant)] flex justify-between items-center bg-[var(--color-surface-container-low)]">
          <h3 className="ds-h3 text-white text-xs font-bold uppercase tracking-wider">
            Conversations
          </h3>
          <button
            onClick={() => setIsCreatingChannel(true)}
            className="p-1.5 rounded-lg bg-[#00cec4]/10 text-[#00cec4] hover:bg-[#00cec4]/20 transition-all cursor-pointer"
            title="Create Channel / Group"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.map((convo) => {
            const isActive = convo.id === activeConvoId;
            const displayName = convo.name || convo.participants.find((p: any) => p.userId !== session?.user?.id)?.user.name || "Group Chat";
            const latestMsg = convo.messages[0];

            return (
              <button
                key={convo.id}
                onClick={() => setActiveConvoId(convo.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer text-left ${
                  isActive
                    ? "bg-[#00cec4]/10 text-[#00cec4]"
                    : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-white"
                }`}
              >
                <div className="h-8 w-8 rounded-full bg-slate-800 border border-[var(--color-outline-variant)]/60 flex items-center justify-center font-bold text-[10px] text-white shrink-0">
                  {convo.type === "CHANNEL" ? <Hash size={13} /> : <User size={13} />}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-white text-xs font-bold truncate leading-snug font-sans">
                    {displayName}
                  </h4>
                  <p className="text-[10px] text-[var(--color-on-surface-variant)] truncate mt-0.5">
                    {latestMsg ? `${latestMsg.sender.name}: ${latestMsg.body}` : "No messages yet"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Messages Panel */}
      <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl overflow-hidden flex flex-col min-h-0">
        
        {/* Active Header */}
        <div className="p-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-white text-sm font-bold font-sans uppercase flex items-center gap-1.5">
              {activeConvo?.type === "CHANNEL" ? <Hash size={15} className="text-[#00cec4]" /> : <User size={15} className="text-[#00cec4]" />}
              {activeConvo?.name || activeConvo?.participants.find((p: any) => p.userId !== session?.user?.id)?.user.name || "Monolith Chat Room"}
            </h3>
            <p className="text-[10px] text-[var(--color-on-surface-variant)] uppercase tracking-wider mt-0.5">
              {activeConvo?.participants?.length || 0} participants active
            </p>
          </div>
          <button
            onClick={reloadMessages}
            className="p-2 rounded-lg bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container)]/80 text-[var(--color-on-surface-variant)] hover:text-white cursor-pointer"
            title="Refresh Feed"
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => {
            const isMe = msg.senderId === session?.user?.id;
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[80%] ${isMe ? "ml-auto flex-row-reverse" : ""}`}
              >
                <div className="h-8 w-8 rounded-full bg-slate-800 border border-[var(--color-outline-variant)]/60 flex items-center justify-center font-bold text-[10px] text-white shrink-0">
                  {msg.sender.name.split(" ").map((n: string) => n[0]).join("")}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-bold font-sans">{msg.sender.name}</span>
                    <span className="text-[8px] text-[var(--color-on-surface-variant)] font-mono">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    isMe
                      ? "bg-[#00cec4] text-white rounded-tr-none"
                      : "bg-[var(--color-surface-container-low)] text-white rounded-tl-none border border-[var(--color-outline-variant)]/60"
                  }`}>
                    {msg.body}
                  </div>

                  {/* Message Tools (Reactions, Delete) */}
                  <div className={`flex items-center gap-1.5 ${isMe ? "justify-end" : ""}`}>
                    <button
                      onClick={() => handleToggleReaction(msg.id, "👍")}
                      className="p-1 rounded bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] hover:text-white text-[10px] cursor-pointer"
                    >
                      👍 {msg.reactions?.filter((r: any) => r.emoji === "👍").length || ""}
                    </button>
                    <button
                      onClick={() => handleToggleReaction(msg.id, "🚀")}
                      className="p-1 rounded bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] hover:text-white text-[10px] cursor-pointer"
                    >
                      🚀 {msg.reactions?.filter((r: any) => r.emoji === "🚀").length || ""}
                    </button>
                    {isMe && (
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="p-1 text-red-400 hover:text-red-300 rounded cursor-pointer"
                        title="Delete message"
                      >
                        <Trash size={10} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messageEndRef} />
          {messages.length === 0 && (
            <div className="p-8 text-center text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider">
              No message feeds inside this room yet. Send a hello!
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)]/40 flex items-center gap-3 shrink-0">
          <input
            type="text"
            placeholder="Type message, use @name to notify employees..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            className="flex-1 text-xs text-white"
          />
          <button
            disabled={isPending || !body.trim()}
            onClick={handleSend}
            className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] p-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <Send size={14} />
          </button>
        </div>

      </div>

      {/* 3. New Channel Creation Modal Overlay */}
      {isCreatingChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="ds-h3 text-white text-sm font-bold flex items-center gap-2">
              <Plus size={16} className="text-[#00cec4]" />
              New Channel / Group
            </h3>
            <div className="space-y-3">
              <div>
                <span className="ds-label block mb-1">Name</span>
                <input
                  type="text"
                  placeholder="e.g. general-operations"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="w-full text-xs text-white"
                />
              </div>
              <div>
                <span className="ds-label block mb-1">Privacy Type</span>
                <select
                  value={newChannelType}
                  onChange={(e: any) => setNewChannelType(e.target.value)}
                  className="w-full text-xs bg-[var(--color-surface-container)] text-white"
                >
                  <option value="CHANNEL">Public Channel (visible to all)</option>
                  <option value="GROUP">Private Group (invitation required)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-outline-variant)]/40">
              <button
                onClick={() => setIsCreatingChannel(false)}
                className="px-4 py-2 text-xs text-[var(--color-on-surface-variant)] hover:text-white uppercase tracking-wider font-bold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleCreateChannel}
                className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-5 py-2 rounded-xl text-xs uppercase tracking-widest font-bold transition-all cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
