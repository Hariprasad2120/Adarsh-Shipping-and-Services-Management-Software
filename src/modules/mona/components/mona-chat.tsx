"use client";

import { useRef, useEffect, useCallback, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Cpu,
  History,
  MessageSquarePlus,
  Trash2,
  Volume2,
  VolumeOff,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMonaChat } from "@/modules/mona/components/mona-provider";
import { MonaAvatar } from "@/modules/mona/components/mona-avatar";
import { MonaMessage } from "@/modules/mona/components/mona-message";
import { MonaInput } from "@/modules/mona/components/mona-input";

/**
 * The main Mona chat widget — panel only.
 *
 * Design-system compliance:
 * - bg-mono-card, bg-mono-soft for panels
 * - border-mono-border for borders
 * - text-mono-text, text-mono-muted for text
 * - Semantic Monolith accent tokens for interactive elements
 * - Shared Monolith display typography for the header title
 * - var(--radius-2xl) = 16px for panel radius
 * - var(--shadow-ambient) for shadows
 * - Works in both light and dark themes
 */
export function MonaChat() {
  const {
    activeConversationId,
    conversations,
    contextSnapshot,
    isOpen,
    isConversationListLoading,
    isContextLoading,
    messages,
    isLoading,
    error,
    models,
    currentModel,
    closeChat,
    preferences,
    sendMessage,
    executeAction,
    submitFeedback,
    guidanceTargets,
    startGuidance,
    clearGuidance,
    activeGuidanceTarget,
    clearChat,
    loadConversation,
    suggestedPrompts,
    switchModel,
    updatePreferences,
  } = useMonaChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const portalTarget = useSyncExternalStore(
    () => () => undefined,
    () => document.body,
    () => null,
  );

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Text-to-speech for Mona responses
  useEffect(() => {
    if (!preferences.voiceEnabled) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        speechSynthesis.cancel();
      }
      return;
    }
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "mona" && !lastMsg.isTyping && lastMsg.content) {
      const cleanText = lastMsg.content
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/`(.+?)`/g, "$1")
        .replace(/\[(.+?)\]\(.+?\)/g, "$1")
        .replace(/[#\-\*]/g, "");

      if (cleanText.length > 0 && cleanText.length < 500) {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "en-IN";
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        speechSynthesis.speak(utterance);
      }
    }
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        speechSynthesis.cancel();
      }
    };
  }, [messages, preferences.voiceEnabled]);

  const handleSend = useCallback(
    (text: string) => sendMessage(text),
    [sendMessage],
  );

  const handleLoadConversation = useCallback(
    async (conversationId: string) => {
      await loadConversation(conversationId);
      setShowHistory(false);
    },
    [loadConversation],
  );

  function formatConversationTime(value: string) {
    const date = new Date(value);
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  // Don't render until mounted (SSR safety for portal)
  if (!portalTarget) return null;

  return createPortal(
    <>
      {/* ─── Chat Panel ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="mnx-floating-surface mnx-mona-panel fixed z-[9999] flex flex-col overflow-hidden"
            style={{
              bottom: "max(0.75rem, env(safe-area-inset-bottom))",
              right: "max(0.75rem, env(safe-area-inset-right))",
              width: "min(420px, calc(100vw - 1rem))",
              maxWidth: "calc(100vw - 1rem)",
              height: "min(640px, calc(100vh - 1rem))",
              maxHeight: "calc(100vh - 1rem)",
            }}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* ─── Header ───────────────────────────────────────────────── */}
            <div
              className="relative flex shrink-0 items-center gap-3 border-b border-mono-border px-4 py-3"
              style={{
                background: "var(--mn-gradient-glass)",
              }}
            >
              <MonaAvatar size={36} isActive={isLoading} showRing={false} />
              <div className="flex flex-1 flex-col">
                <span
                  className="text-[14px] font-bold tracking-wide text-mono-text"
                  style={{ fontFamily: "var(--mn-font-sans)" }}
                >
                  {preferences.petName.toUpperCase()}
                </span>
                {/* Model selector — clickable subtitle */}
                {/* eslint-disable-next-line no-restricted-syntax -- assistant model switcher is a custom inline header control */}
                <button
                  type="button"
                  onClick={() => setShowModelPicker((v) => !v)}
                  className="flex items-center gap-1 text-[10px] tracking-wider transition-colors hover:opacity-80"
                  style={{ color: "var(--mnx-accent)" }}
                  title="Switch AI model"
                >
                  {isLoading ? (
                    "THINKING..."
                  ) : (
                    <>
                      <Cpu size={10} />
                      {models
                        .find((m) => m.id === currentModel)
                        ?.name?.toUpperCase() || "MONOLITH COMPANION"}
                      <ChevronDown
                        size={10}
                        className={`transition-transform ${showModelPicker ? "rotate-180" : ""}`}
                      />
                    </>
                  )}
                </button>
              </div>

              {/* ─── Model Picker Dropdown ──────────────────────────── */}
              <AnimatePresence>
                {showModelPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="mnx-floating-surface mnx-floating-menu absolute left-3 right-3 top-[64px] z-10 overflow-hidden rounded-xl"
                  >
                    <div className="px-3 py-2 border-b border-mono-border">
                      <span className="text-[9px] font-medium tracking-[0.12em] text-mono-muted uppercase">
                        SELECT MODEL
                      </span>
                    </div>
                    {models.map((m) => (
                      // eslint-disable-next-line no-restricted-syntax -- model list rows are custom menu-option buttons
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          switchModel(m.id);
                          setShowModelPicker(false);
                        }}
                        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                          m.id === currentModel
                            ? "mnx-bg-accent-soft"
                            : "hover:bg-mono-soft"
                        }`}
                      >
                        <Cpu
                          size={14}
                          style={{
                            color:
                              m.id === currentModel
                                ? "var(--mnx-accent)"
                                : "var(--mnx-text-muted)",
                          }}
                        />
                        <div className="flex flex-col">
                          <span
                            className="text-[12px] font-medium"
                            style={{
                              color:
                                m.id === currentModel
                                  ? "var(--mnx-accent)"
                                  : "var(--mnx-text)",
                            }}
                          >
                            {m.name}
                          </span>
                          <span className="text-[10px] text-mono-muted">
                            {m.description}
                          </span>
                        </div>
                        {m.id === currentModel && (
                          <span className="mnx-text-accent ml-auto text-[9px] font-medium tracking-wider">
                            ACTIVE
                          </span>
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* TTS toggle */}
              {/* eslint-disable-next-line no-restricted-syntax -- compact icon toggle keeps the chat header action footprint small */}
              <button
                type="button"
                onClick={() =>
                  updatePreferences({ voiceEnabled: !preferences.voiceEnabled })
                }
                className="rounded-lg p-1.5 text-mono-muted transition-colors hover:bg-mono-soft"
                style={preferences.voiceEnabled ? { color: "var(--mnx-accent)" } : undefined}
                title={preferences.voiceEnabled ? "Disable voice" : "Enable voice"}
              >
                {preferences.voiceEnabled ? <Volume2 size={16} /> : <VolumeOff size={16} />}
              </button>

              {/* History */}
              {/* eslint-disable-next-line no-restricted-syntax -- compact icon action matches the existing floating panel header pattern */}
              <button
                type="button"
                onClick={() => setShowHistory((current) => !current)}
                className="rounded-lg p-1.5 text-mono-muted transition-colors hover:bg-mono-soft"
                style={showHistory ? { color: "var(--mnx-accent)" } : undefined}
                title="Recent conversations"
              >
                <History size={16} />
              </button>

              {/* Clear */}
              {/* eslint-disable-next-line no-restricted-syntax -- compact icon action matches the existing floating panel header pattern */}
              <button
                type="button"
                onClick={clearChat}
                className="rounded-lg p-1.5 text-mono-muted transition-colors hover:bg-mono-soft"
                title="Clear conversation"
              >
                <Trash2 size={16} />
              </button>

              {/* Close */}
              {/* eslint-disable-next-line no-restricted-syntax -- compact icon action matches the existing floating panel header pattern */}
              <button
                type="button"
                onClick={closeChat}
                className="rounded-lg p-1.5 text-mono-muted transition-colors hover:bg-mono-soft"
                title="Close (Ctrl+M)"
              >
                <X size={16} />
              </button>
            </div>

            {/* ─── Messages Area ────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto bg-mono-page py-3 scrollbar-none [&::-webkit-scrollbar]:hidden">
              <AnimatePresence initial={false}>
                {showHistory ? (
                  <motion.div
                    className="px-4 pb-3"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="rounded-2xl border border-mono-border bg-mono-card px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-medium tracking-[0.16em] text-mono-muted uppercase">
                            Recent conversations
                          </span>
                          <p className="mt-1 text-[11px] leading-5 text-mono-muted">
                            Resume a previous thread or start fresh in this workspace.
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => void clearChat()}>
                          <MessageSquarePlus size={14} />
                          <span>New chat</span>
                        </Button>
                      </div>

                      <div className="mt-3 space-y-2">
                        {isConversationListLoading ? (
                          <div className="rounded-xl border border-dashed border-mono-border bg-mono-page px-3 py-3 text-[11px] text-mono-muted">
                            Loading recent conversations...
                          </div>
                        ) : conversations.length > 0 ? (
                          conversations.slice(0, 6).map((conversation) => (
                            // eslint-disable-next-line no-restricted-syntax -- conversation rows are custom list items with compact history metadata
                            <button
                              key={conversation.id}
                              type="button"
                              onClick={() => void handleLoadConversation(conversation.id)}
                              className={`flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                                conversation.id === activeConversationId
                                  ? "border-[var(--mnx-accent)] bg-[var(--mnx-highlight-surface-soft)]"
                                  : "border-mono-border bg-mono-page hover:bg-mono-soft"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[12px] font-semibold text-mono-text">
                                  {conversation.title}
                                </div>
                                <div className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-mono-muted">
                                  {conversation.lastPageLabel}
                                </div>
                                <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-mono-muted">
                                  {conversation.preview || "Conversation saved to history."}
                                </p>
                              </div>
                              <span className="shrink-0 text-[10px] text-mono-muted">
                                {formatConversationTime(conversation.lastMessageAt)}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-mono-border bg-mono-page px-3 py-3 text-[11px] text-mono-muted">
                            No saved conversations yet. Start a new chat and Mona will keep the thread for you.
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <div className="px-4 pb-3">
                <div className="rounded-2xl border border-mono-border bg-mono-card px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-medium tracking-[0.16em] text-mono-muted uppercase">
                        Current focus
                      </span>
                      <div className="text-[13px] font-semibold text-mono-text">
                        {contextSnapshot?.route.pageLabel ?? "Workspace context"}
                      </div>
                      <p className="text-[11px] leading-5 text-mono-muted">
                        {isContextLoading
                          ? "Reading the current page context..."
                          : contextSnapshot?.entity?.summary ??
                            contextSnapshot?.route.pageSummary ??
                            "Ask for a summary, next steps, or help navigating this workspace."}
                      </p>
                    </div>
                    <div className="shrink-0 rounded-full border border-mono-border px-2 py-1 text-[10px] text-mono-muted">
                      {contextSnapshot?.route.moduleLabel ?? "Monolith"}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {suggestedPrompts.map((suggestion) => (
                      // eslint-disable-next-line no-restricted-syntax -- prompt chips are compact context actions inside the chat intro card
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => void handleSend(suggestion.prompt)}
                        className="rounded-full border border-mono-border bg-mono-page px-2.5 py-1 text-[11px] font-medium text-mono-text transition-colors hover:bg-mono-soft"
                      >
                        {suggestion.label}
                      </button>
                    ))}
                  </div>

                  {guidanceTargets.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {guidanceTargets.slice(0, 3).map((target) => (
                        // eslint-disable-next-line no-restricted-syntax -- guidance chips are compact route-scoped toggles inside the chat intro card
                        <button
                          key={target.id}
                          type="button"
                          onClick={() =>
                            activeGuidanceTarget?.id === target.id
                              ? clearGuidance()
                              : startGuidance(target.id)
                          }
                          className="rounded-full border border-mono-border bg-mono-page px-2.5 py-1 text-[11px] font-medium text-mono-text transition-colors hover:bg-mono-soft"
                        >
                          {activeGuidanceTarget?.id === target.id
                            ? `Hide guide: ${target.label}`
                            : `Guide: ${target.label}`}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {messages.map((msg) => (
                <MonaMessage
                  key={msg.id}
                  message={msg}
                  onExecuteAction={executeAction}
                  onSubmitFeedback={submitFeedback}
                />
              ))}

              {/* Error state */}
              {error && (
                <div className="px-4 py-2">
                  <div className="mnx-tone-danger rounded-xl px-3 py-2 text-[12px]">
                    {error}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ─── Input ────────────────────────────────────────────────── */}
            <MonaInput onSend={handleSend} isLoading={isLoading} />

            {/* ─── Footer ───────────────────────────────────────────────── */}
            <div className="flex items-center justify-center border-t border-mono-border bg-mono-card px-3 py-1.5">
              <span className="text-[9px] tracking-wider text-mono-muted opacity-50">
                {preferences.petName.toUpperCase()} • POWERED BY GEMINI • CTRL+M TO TOGGLE
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    portalTarget,
  );
}
