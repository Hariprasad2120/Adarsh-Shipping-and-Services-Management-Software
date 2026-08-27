"use client";

import { MonaAvatarSmall } from "@/modules/mona/components/mona-avatar";
import type { MonaChatMessage } from "@/modules/mona/components/mona-provider";
import { motion } from "framer-motion";
import { Copy, Check, ThumbsDown, ThumbsUp } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import { useState, useCallback } from "react";

/**
 * Renders a single chat message bubble — user or Mona.
 * Uses design-system tokens: bg-mono-card, bg-mono-soft,
 * text-mono-text, border-mono-border, and the semantic accent token.
 */
export function MonaMessage({
  message,
  onExecuteAction,
  onSubmitFeedback,
}: {
  message: MonaChatMessage;
  onExecuteAction?: (
    messageId: string,
    action: NonNullable<MonaChatMessage["actions"]>[number],
  ) => Promise<void>;
  onSubmitFeedback?: (params: {
    feedback: "helpful" | "unhelpful";
    reason?: string;
    responseExcerpt: string;
  }) => Promise<void>;
}) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<"helpful" | "unhelpful" | null>(null);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  const handleExecuteAction = useCallback(
    async (action: NonNullable<MonaChatMessage["actions"]>[number]) => {
      if (!onExecuteAction || executingActionId) {
        return;
      }

      setExecutingActionId(action.id);
      try {
        await onExecuteAction(message.id, action);
      } finally {
        setExecutingActionId(null);
      }
    },
    [executingActionId, message.id, onExecuteAction],
  );

  const handleFeedback = useCallback(
    async (feedback: "helpful" | "unhelpful") => {
      if (!onSubmitFeedback || feedbackState) {
        return;
      }

      const reason =
        feedback === "unhelpful"
          ? window.prompt("What was missing or incorrect? Optional.", "")?.trim() || undefined
          : undefined;

      await onSubmitFeedback({
        feedback,
        reason,
        responseExcerpt: message.content.slice(0, 500),
      });
      setFeedbackState(feedback);
    },
    [feedbackState, message.content, onSubmitFeedback],
  );

  // Typing indicator
  if (message.isTyping) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-2.5 px-4 py-1"
      >
        <MonaAvatarSmall />
        <div className="rounded-2xl rounded-tl-md bg-mono-soft border border-mono-border px-4 py-3">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  background: "var(--mnx-accent)",
                }}
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
                "text-[var(--mn-color-on-accent)]"
              : /* Mona bubble — surface token */
                "bg-mono-soft text-mono-text border border-mono-border"
          }`}
          style={
            isUser
              ? {
                  background: "var(--mn-gradient-accent)",
                }
              : undefined
          }
        >
          {/* Markdown-rendered content */}
          <div
            className="mona-prose"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(renderMonaMarkdown(message.content)),
            }}
          />

          {/* Copy button (Mona messages only) */}
          {!isUser && message.content && (
            // eslint-disable-next-line no-restricted-syntax -- compact copy control is an intentional message-bubble utility affordance
            <button
              type="button"
              onClick={handleCopy}
              className="absolute -bottom-0.5 right-1 rounded-md p-1 text-mono-muted opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
              title="Copy message"
            >
              {copied ? (
                <Check size={12} className="mnx-text-accent" />
              ) : (
                <Copy size={12} />
              )}
            </button>
          )}
        </div>

        {/* Timestamp */}
        <div className="flex flex-col gap-1 px-1">
          {message.actions && message.actions.length > 0 ? (
            <div className="flex flex-col gap-2">
              {message.actions.map((action) => {
                const isExecuting = executingActionId === action.id;

                return (
                  <div
                    key={action.id}
                    className="rounded-2xl border border-mono-border bg-mono-card px-3 py-3"
                  >
                    <div className="flex flex-col gap-1">
                      <div className="text-[12px] font-semibold text-mono-text">
                        {action.title}
                      </div>
                      <p className="text-[11px] leading-5 text-mono-muted">
                        {action.description}
                      </p>
                    </div>

                    {action.fields.length > 0 ? (
                      <div className="mt-2 grid gap-1">
                        {action.fields.map((field) => (
                          <div
                            key={`${action.id}-${field.label}`}
                            className="flex items-start justify-between gap-3 rounded-xl bg-mono-page px-2.5 py-2"
                          >
                            <span className="text-[10px] uppercase tracking-[0.12em] text-mono-muted">
                              {field.label}
                            </span>
                            <span className="text-right text-[11px] text-mono-text">
                              {field.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {onExecuteAction ? (
                      // eslint-disable-next-line no-restricted-syntax -- action confirmation is a compact inline control embedded inside a chat message card
                      <button
                        type="button"
                        onClick={() => void handleExecuteAction(action)}
                        disabled={isExecuting}
                        className="mt-3 inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[11px] font-semibold text-[var(--mn-color-on-accent)] transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                        style={{ background: "var(--mn-gradient-accent)" }}
                      >
                        {isExecuting ? "Working..." : action.confirmationLabel}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}

          {message.citations && message.citations.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {message.citations.map((citation) =>
                citation.href ? (
                  <a
                    key={citation.id}
                    href={citation.href}
                    className="rounded-full border border-mono-border bg-mono-page px-2 py-0.5 text-[9px] font-medium text-mono-muted transition-colors hover:bg-mono-soft hover:text-mono-text"
                    title={citation.detail ?? citation.label}
                  >
                    Source: {citation.label}
                  </a>
                ) : (
                  <span
                    key={citation.id}
                    className="rounded-full border border-mono-border bg-mono-page px-2 py-0.5 text-[9px] font-medium text-mono-muted"
                    title={citation.detail ?? citation.label}
                  >
                    Source: {citation.label}
                  </span>
                ),
              )}
            </div>
          ) : null}

          {!isUser && message.content && !message.actions?.length ? (
            <div className="flex items-center gap-1.5">
              {/* eslint-disable-next-line no-restricted-syntax -- compact message feedback controls are intentional inline utilities in the chat transcript */}
              <button
                type="button"
                onClick={() => void handleFeedback("helpful")}
                disabled={feedbackState !== null}
                className="inline-flex items-center gap-1 rounded-full border border-mono-border bg-mono-page px-2 py-0.5 text-[9px] font-medium text-mono-muted transition-colors hover:bg-mono-soft disabled:cursor-default disabled:opacity-70"
              >
                <ThumbsUp size={10} />
                <span>{feedbackState === "helpful" ? "Marked helpful" : "Helpful"}</span>
              </button>
              {/* eslint-disable-next-line no-restricted-syntax -- compact message feedback controls are intentional inline utilities in the chat transcript */}
              <button
                type="button"
                onClick={() => void handleFeedback("unhelpful")}
                disabled={feedbackState !== null}
                className="inline-flex items-center gap-1 rounded-full border border-mono-border bg-mono-page px-2 py-0.5 text-[9px] font-medium text-mono-muted transition-colors hover:bg-mono-soft disabled:cursor-default disabled:opacity-70"
              >
                <ThumbsDown size={10} />
                <span>{feedbackState === "unhelpful" ? "Marked unhelpful" : "Needs work"}</span>
              </button>
            </div>
          ) : null}

          <span className="text-[9px] text-mono-muted opacity-60">
            {formatTime(message.timestamp)}
          </span>
        </div>
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
      '<a href="$2" class="mona-link" target="_blank" rel="noopener">$1</a>',
    )
    // Internal navigation links — /path/to/page
    .replace(
      /\*\*\/([\w\-\/]+)\*\*/g,
      '<a href="/$1" class="mona-link mona-nav-link">/$1</a>',
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
    (match) => `<ul class="mona-ul">${match.replace(/<br\/>/g, "")}</ul>`,
  );

  return html;
}
