"use client";

import { useRef, useEffect, useCallback, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Volume2, VolumeOff, ChevronDown, Cpu } from "lucide-react";
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
    isOpen,
    messages,
    isLoading,
    error,
    models,
    currentModel,
    closeChat,
    sendMessage,
    clearChat,
    switchModel,
  } = useMonaChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
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
    if (!ttsEnabled) return;
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
  }, [messages, ttsEnabled]);

  const handleSend = useCallback(
    (text: string) => sendMessage(text),
    [sendMessage],
  );

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
              bottom: 24,
              right: 24,
              width: 420,
              height: "min(640px, calc(100vh - 48px))",
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
                  MONA
                </span>
                {/* Model selector — clickable subtitle */}
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
              <button
                type="button"
                onClick={() => setTtsEnabled((v) => !v)}
                className="rounded-lg p-1.5 text-mono-muted transition-colors hover:bg-mono-soft"
                style={ttsEnabled ? { color: "var(--mnx-accent)" } : undefined}
                title={ttsEnabled ? "Disable voice" : "Enable voice"}
              >
                {ttsEnabled ? <Volume2 size={16} /> : <VolumeOff size={16} />}
              </button>

              {/* Clear */}
              <button
                type="button"
                onClick={clearChat}
                className="rounded-lg p-1.5 text-mono-muted transition-colors hover:bg-mono-soft"
                title="Clear conversation"
              >
                <Trash2 size={16} />
              </button>

              {/* Close */}
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
              {messages.map((msg) => (
                <MonaMessage key={msg.id} message={msg} />
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
                POWERED BY GEMINI • CTRL+M TO TOGGLE
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    portalTarget,
  );
}
