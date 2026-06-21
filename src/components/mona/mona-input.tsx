"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Mic, MicOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type SpeechRecognitionType = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
};

/**
 * Chat input with auto-resize textarea, voice input (Web Speech API),
 * and send button. All styled with design-system tokens.
 */
export function MonaInput({
  onSend,
  isLoading,
}: {
  onSend: (text: string) => void;
  isLoading: boolean;
}) {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  // Check for Web Speech API support
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognition);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, [text]);

  const handleSend = useCallback(() => {
    if (!text.trim() || isLoading) return;
    onSend(text.trim());
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [text, isLoading, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const toggleVoice = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition() as SpeechRecognitionType;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setText((prev) => (prev + " " + finalTranscript).trim());
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  return (
    <div className="flex items-end gap-2 border-t border-outline-variant bg-surface px-3 py-2.5">
      {/* Voice button */}
      {voiceSupported && (
        <button
          type="button"
          onClick={toggleVoice}
          disabled={isLoading}
          className="relative flex shrink-0 items-center justify-center rounded-full p-2 transition-all"
          style={{
            background: isListening ? "rgba(239, 68, 68, 0.12)" : "transparent",
            color: isListening ? "#ef4444" : "var(--color-on-surface-variant)",
          }}
          title={isListening ? "Stop listening" : "Voice input"}
        >
          <AnimatePresence mode="wait">
            {isListening ? (
              <motion.div
                key="off"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <MicOff size={18} />
              </motion.div>
            ) : (
              <motion.div
                key="on"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Mic size={18} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Listening pulse ring — red */}
          {isListening && (
            <motion.div
              className="absolute rounded-full"
              style={{
                width: 36,
                height: 36,
                border: "2px solid rgba(239, 68, 68, 0.5)",
              }}
              animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </button>
      )}

      {/* Textarea — uses surface-container-low bg, outline-variant border */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isListening ? "Listening..." : "Ask Mona anything..."}
        disabled={isLoading}
        rows={1}
        className="mona-input flex-1 resize-none rounded-xl bg-surface-container-low text-on-surface border border-outline-variant px-3 py-2 text-[13px] leading-relaxed outline-none transition-colors placeholder:text-on-surface-variant/60"
        style={{ maxHeight: 120, minHeight: 36 }}
      />

      {/* Send button — cyan gradient when active */}
      <button
        type="button"
        onClick={handleSend}
        disabled={!text.trim() || isLoading}
        className="flex shrink-0 items-center justify-center rounded-full p-2 transition-all"
        style={{
          background:
            text.trim() && !isLoading
              ? "linear-gradient(135deg, #00cec4, #00b8af)"
              : "transparent",
          color:
            text.trim() && !isLoading
              ? "#ffffff"
              : "var(--color-on-surface-variant)",
          opacity: text.trim() && !isLoading ? 1 : 0.4,
        }}
        title="Send message (Enter)"
      >
        {isLoading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Send size={18} />
        )}
      </button>
    </div>
  );
}
