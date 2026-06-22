"use client";

import { MonaAvatarSmall } from "./mona-avatar";
import type { MonaChatMessage } from "./mona-provider";
import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";

/**
 * Renders a single chat message bubble — user or Mona.
 * Uses design-system tokens: bg-surface, bg-surface-container-low,
 * text-on-surface, border-outline-variant, accent #00cec4.
 */
export function MonaMessage({ message }: { message: MonaChatMessage }) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  // Typing indicator
  if (message.isTyping) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-2.5 px-4 py-1"
      >
        <MonaAvatarSmall />
        <div className="rounded-2xl rounded-tl-md bg-surface-container-low border border-outline-variant px-4 py-3">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="rounded-full"
                style={{ width: 6, height: 6, background: "#00cec4" }}
                animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`group flex items-start gap-2.5 px-4 py-1 ${
        isUser ? "flex-row-reverse" : ""
      }`}
    >
      {/* Avatar (Mona only) */}
      {!isUser && <MonaAvatarSmall />}

      {/* Bubble */}
      <div className="flex max-w-[85%] flex-col gap-1">
        <div
          className={`relative rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
            isUser ? "rounded-tr-md" : "rounded-tl-md"
          } ${
            isUser
              ? /* User bubble — accent cyan */
                "text-white"
              : /* Mona bubble — surface token */
                "bg-surface-container-low text-on-surface border border-outline-variant"
          }`}
          style={
            isUser
              ? {
                  background: "linear-gradient(135deg, #00cec4, #00b8af)",
                }
              : undefined
          }
        >
          {/* Markdown-rendered content */}
          <div
            className="mona-prose"
            dangerouslySetInnerHTML={{
              __html: renderMonaMarkdown(message.content),
            }}
          />

          {/* Copy button (Mona messages only) */}
          {!isUser && message.content && (
            <button
              type="button"
              onClick={handleCopy}
              className="absolute -bottom-0.5 right-1 rounded-md p-1 text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
              title="Copy message"
            >
              {copied ? (
                <Check size={12} className="text-[#00cec4]" />
              ) : (
                <Copy size={12} />
              )}
            </button>
          )}
        </div>

        {/* Timestamp */}
        <span className="px-1 text-[9px] text-on-surface-variant opacity-60">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Lightweight markdown → HTML for Mona's responses.
 * Supports: **bold**, *italic*, `code`, links, lists, line breaks.
 */
function renderMonaMarkdown(text: string): string {
  if (!text) return "";

  let html = text
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`(.+?)`/g, '<code class="mona-code">$1</code>')
    // Links — markdown style
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" class="mona-link" target="_blank" rel="noopener">$1</a>'
    )
    // Internal navigation links — /path/to/page
    .replace(
      /\*\*\/([\w\-\/]+)\*\*/g,
      '<a href="/$1" class="mona-link mona-nav-link">/$1</a>'
    )
    // Unordered list items
    .replace(/^[\-\*]\s+(.+)/gm, '<li class="mona-li">$1</li>')
    // Numbered list items
    .replace(/^\d+\.\s+(.+)/gm, '<li class="mona-li mona-li-num">$1</li>')
    // Line breaks
    .replace(/\n/g, "<br/>");

  // Wrap consecutive <li> in <ul>
  html = html.replace(
    /(<li class="mona-li[^"]*">.*?<\/li>(?:<br\/>)?)+/g,
    (match) => `<ul class="mona-ul">${match.replace(/<br\/>/g, "")}</ul>`
  );

  return html;
}
