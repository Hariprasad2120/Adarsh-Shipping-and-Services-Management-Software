"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Volume2, VolumeOff, ChevronDown, Cpu } from "lucide-react";
import { useMonaChat } from "./mona-provider";
import { MonaAvatar } from "./mona-avatar";
import { MonaMessage } from "./mona-message";
import { MonaInput } from "./mona-input";

/**
 * The main Mona chat widget — FAB + expandable panel.
 *
 * Design-system compliance:
 * - bg-surface, bg-surface-container-low for panels
 * - border-outline-variant for borders
 * - text-on-surface, text-on-surface-variant for text
 * - #00cec4 accent for interactive elements
 * - Kiona font for header title
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
    toggleChat,
    closeChat,
    sendMessage,
    clearChat,
    switchModel,
  } = useMonaChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);

  // Portal needs document.body — only available after mount
  useEffect(() => setMounted(true), []);

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

  // Tooltip on first load
  useEffect(() => {
    const shown = sessionStorage.getItem("mona-tooltip-shown");
    if (!shown) {
      const timer = setTimeout(() => {
        setShowTooltip(true);
        sessionStorage.setItem("mona-tooltip-shown", "1");
        setTimeout(() => setShowTooltip(false), 4000);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSend = useCallback(
    (text: string) => sendMessage(text),
    [sendMessage]
  );

  // Don't render until mounted (SSR safety for portal)
  if (!mounted) return null;

  return createPortal(
    <>
      {/* ─── Floating Action Button ─────────────────────────────────────── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            className="fixed z-[9999]"
            style={{ bottom: 24, right: 24 }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            {/* Tooltip bubble */}
            <AnimatePresence>
              {showTooltip && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="absolute bottom-full right-0 mb-3 whitespace-nowrap rounded-xl bg-surface text-on-surface border border-outline-variant px-4 py-2 text-[12px] font-medium"
                  style={{
                    boxShadow:
                      "0 4px 24px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 206, 196, 0.15)",
                  }}
                >
                  👋 Hi! I&apos;m <strong>Mona</strong>, your AI companion
                  <div
                    className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 bg-surface border-r border-b border-outline-variant"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="button"
              onClick={toggleChat}
              className="group relative flex items-center justify-center rounded-full bg-surface-container shadow-2xl transition-shadow hover:shadow-[0_0_0_4px_rgba(0,206,196,0.2)]"
              style={{
                width: 56,
                height: 56,
                border: "2px solid rgba(0, 206, 196, 0.4)",
              }}
              title="Chat with Mona (Ctrl+M)"
              id="mona-fab"
            >
              <MonaAvatar size={48} isActive={false} showRing />

              {/* Pulse ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: "2px solid rgba(0, 206, 196, 0.25)" }}
                animate={{ scale: [1, 1.3], opacity: [0.6, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Chat Panel ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed z-[9999] flex flex-col overflow-hidden rounded-2xl bg-surface border border-outline-variant"
            style={{
              bottom: 24,
              right: 24,
              width: 420,
              height: "min(640px, calc(100vh - 48px))",
              boxShadow:
                "0 24px 80px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 206, 196, 0.08)",
            }}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* ─── Header ───────────────────────────────────────────────── */}
            <div
              className="relative flex shrink-0 items-center gap-3 border-b border-outline-variant px-4 py-3"
              style={{
                background:
                  "linear-gradient(135deg, rgba(0, 206, 196, 0.04), rgba(56, 189, 248, 0.02))",
              }}
            >
              <MonaAvatar size={36} isActive={isLoading} showRing={false} />
              <div className="flex flex-1 flex-col">
                <span
                  className="text-[14px] font-bold tracking-wide text-on-surface"
                  style={{ fontFamily: "var(--font-kiona-sans), sans-serif" }}
                >
                  MONA
                </span>
                {/* Model selector — clickable subtitle */}
                <button
                  type="button"
                  onClick={() => setShowModelPicker((v) => !v)}
                  className="flex items-center gap-1 text-[10px] tracking-wider transition-colors hover:opacity-80"
                  style={{ color: "#00cec4" }}
                  title="Switch AI model"
                >
                  {isLoading ? (
                    "THINKING..."
                  ) : (
                    <>
                      <Cpu size={10} />
                      {models.find((m) => m.id === currentModel)?.name?.toUpperCase() || "MONOLITH COMPANION"}
                      <ChevronDown size={10} className={`transition-transform ${showModelPicker ? "rotate-180" : ""}`} />
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
                    className="absolute left-3 right-3 top-[64px] z-10 overflow-hidden rounded-xl bg-surface border border-outline-variant"
                    style={{
                      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 206, 196, 0.1)",
                    }}
                  >
                    <div className="px-3 py-2 border-b border-outline-variant">
                      <span className="text-[9px] font-medium tracking-[0.12em] text-on-surface-variant uppercase">
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
                            ? "bg-[rgba(0,206,196,0.08)]"
                            : "hover:bg-surface-container-low"
                        }`}
                      >
                        <Cpu
                          size={14}
                          style={{
                            color: m.id === currentModel ? "#00cec4" : "var(--color-on-surface-variant)",
                          }}
                        />
                        <div className="flex flex-col">
                          <span
                            className="text-[12px] font-medium"
                            style={{
                              color: m.id === currentModel ? "#00cec4" : "var(--color-on-surface)",
                            }}
                          >
                            {m.name}
                          </span>
                          <span className="text-[10px] text-on-surface-variant">
                            {m.description}
                          </span>
                        </div>
                        {m.id === currentModel && (
                          <span className="ml-auto text-[9px] font-medium tracking-wider" style={{ color: "#00cec4" }}>
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
                className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-[rgba(0,206,196,0.08)]"
                style={ttsEnabled ? { color: "#00cec4" } : undefined}
                title={ttsEnabled ? "Disable voice" : "Enable voice"}
              >
                {ttsEnabled ? <Volume2 size={16} /> : <VolumeOff size={16} />}
              </button>

              {/* Clear */}
              <button
                type="button"
                onClick={clearChat}
                className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-[rgba(0,206,196,0.08)]"
                title="Clear conversation"
              >
                <Trash2 size={16} />
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={closeChat}
                className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-[rgba(0,206,196,0.08)]"
                title="Close (Ctrl+M)"
              >
                <X size={16} />
              </button>
            </div>

            {/* ─── Messages Area ────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto bg-background py-3 scrollbar-none [&::-webkit-scrollbar]:hidden">
              {messages.map((msg) => (
                <MonaMessage key={msg.id} message={msg} />
              ))}

              {/* Error state */}
              {error && (
                <div className="px-4 py-2">
                  <div
                    className="rounded-xl px-3 py-2 text-[12px]"
                    style={{
                      background: "rgba(239, 68, 68, 0.08)",
                      color: "#ef4444",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                    }}
                  >
                    {error}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ─── Input ────────────────────────────────────────────────── */}
            <MonaInput onSend={handleSend} isLoading={isLoading} />

            {/* ─── Footer ───────────────────────────────────────────────── */}
            <div className="flex items-center justify-center border-t border-outline-variant bg-surface px-3 py-1.5">
              <span className="text-[9px] tracking-wider text-on-surface-variant opacity-50">
                POWERED BY GEMINI • CTRL+M TO TOGGLE
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>,
    document.body
  );
}
