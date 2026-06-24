"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  useRef,
} from "react";
import { usePathname } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

export type MonaChatMessage = {
  id: string;
  role: "user" | "mona";
  content: string;
  timestamp: number;
  toolsUsed?: string[];
  isTyping?: boolean;
};

export type MonaModel = {
  id: string;
  name: string;
  description: string;
};

type MonaChatState = {
  isOpen: boolean;
  messages: MonaChatMessage[];
  isLoading: boolean;
  error: string | null;
  models: MonaModel[];
  currentModel: string;
};

type MonaChatActions = {
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
  switchModel: (modelId: string) => Promise<void>;
};

type MonaChatContextValue = MonaChatState & MonaChatActions;

// ─── Context ─────────────────────────────────────────────────────────────────

const MonaChatContext = createContext<MonaChatContextValue | null>(null);

export function useMonaChat(): MonaChatContextValue {
  const ctx = useContext(MonaChatContext);
  if (!ctx) throw new Error("useMonaChat must be used inside <MonaProvider>");
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

let messageCounter = 0;
function genId() {
  return `mona-${Date.now()}-${++messageCounter}`;
}

const WELCOME_MESSAGE: MonaChatMessage = {
  id: "mona-welcome",
  role: "mona",
  content: "",
  timestamp: Date.now(),
};

type MonaModelPayload = {
  models?: MonaModel[];
  current?: string;
};

let cachedModelPayload: MonaModelPayload | null = null;
let modelPayloadPromise: Promise<MonaModelPayload> | null = null;

function fetchModelPayload() {
  if (cachedModelPayload) return Promise.resolve(cachedModelPayload);
  if (modelPayloadPromise) return modelPayloadPromise;

  modelPayloadPromise = fetch("/api/mona/model")
    .then((r) => (r.ok ? r.json() : {}))
    .then((data: MonaModelPayload) => {
      cachedModelPayload = data;
      return data;
    })
    .catch(() => ({}))
    .finally(() => {
      modelPayloadPromise = null;
    });

  return modelPayloadPromise;
}

export function MonaProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reactSessionId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<MonaChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<MonaModel[]>([]);
  const [currentModel, setCurrentModel] = useState("");
  const sessionIdRef = useRef(`session-${reactSessionId}`);
  const hasLoadedInsightsRef = useRef(false);

  const loadModelConfig = useCallback(async () => {
    const data = await fetchModelPayload();
    if (data.models) setModels(data.models);
    if (data.current) setCurrentModel(data.current);
  }, []);

  // Generate the welcome message with proactive insights on first open
  const loadWelcomeInsights = useCallback(async () => {
    if (hasLoadedInsightsRef.current) return;
    hasLoadedInsightsRef.current = true;

    try {
      const res = await fetch("/api/mona/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:
            "Greet me warmly and give me proactive insights about my pending work, tasks, and anything that needs my attention. Use the getProactiveInsights tool. Be concise but helpful.",
          currentPath: pathname,
          sessionId: sessionIdRef.current,
        }),
      });

      if (!res.ok) {
        setMessages([
          {
            id: "mona-welcome",
            role: "mona",
            content:
              "Hey there! 👋 I'm **Mona**, your Monolith Companion. Ask me anything about your work, tasks, attendance, or any module. I'm here to help!",
            timestamp: Date.now(),
          },
        ]);
        return;
      }

      const data = await res.json();
      setMessages([
        {
          id: "mona-welcome",
          role: "mona",
          content:
            data.content ||
            "Hey there! 👋 I'm **Mona**, your Monolith Companion. Ask me anything about your work, tasks, attendance, or any module. I'm here to help!",
          timestamp: Date.now(),
          toolsUsed: data.toolsUsed,
        },
      ]);
    } catch {
      setMessages([
        {
          id: "mona-welcome",
          role: "mona",
          content:
            "Hey there! 👋 I'm **Mona**, your Monolith Companion. Ask me anything about your work, tasks, attendance, or any module. I'm here to help!",
          timestamp: Date.now(),
        },
      ]);
    }
  }, [pathname]);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        void loadModelConfig();
        loadWelcomeInsights();
      }
      return next;
    });
  }, [loadModelConfig, loadWelcomeInsights]);

  const openChat = useCallback(() => {
    setIsOpen(true);
    void loadModelConfig();
    loadWelcomeInsights();
  }, [loadModelConfig, loadWelcomeInsights]);

  const closeChat = useCallback(() => setIsOpen(false), []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: MonaChatMessage = {
        id: genId(),
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
      };

      // Add user message + typing indicator
      const typingMsg: MonaChatMessage = {
        id: "mona-typing",
        role: "mona",
        content: "",
        timestamp: Date.now(),
        isTyping: true,
      };

      setMessages((prev) => [...prev, userMsg, typingMsg]);
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/mona/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            currentPath: pathname,
            sessionId: sessionIdRef.current,
          }),
        });

        const data = await res.json();

        const monaMsg: MonaChatMessage = {
          id: genId(),
          role: "mona",
          content: data.content || "I couldn't generate a response. Please try again.",
          timestamp: Date.now(),
          toolsUsed: data.toolsUsed,
        };

        // Replace typing indicator with actual response
        setMessages((prev) =>
          prev.filter((m) => m.id !== "mona-typing").concat(monaMsg)
        );
      } catch {
        setError("Failed to reach Mona. Please check your connection.");
        setMessages((prev) => prev.filter((m) => m.id !== "mona-typing"));
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, pathname]
  );

  const clearChat = useCallback(async () => {
    setMessages([WELCOME_MESSAGE]);
    setError(null);
    hasLoadedInsightsRef.current = false;

    // Clear server-side history
    try {
      await fetch("/api/mona/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "clear",
          sessionId: sessionIdRef.current,
        }),
      });
    } catch {
      // Silent fail — client state is already cleared
    }

    // Generate new session ID
    sessionIdRef.current = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }, []);

  const switchModel = useCallback(async (modelId: string) => {
    try {
      const res = await fetch("/api/mona/model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId }),
      });
      const data = await res.json();
      if (data.current) {
        cachedModelPayload = {
          models,
          current: data.current,
        };
        setCurrentModel(data.current);
        setError(null);
        // Add a system notification in chat
        setMessages((prev) => [
          ...prev,
          {
            id: genId(),
            role: "mona" as const,
            content: `Switched to **${models.find((m) => m.id === modelId)?.name || modelId}**. Try your question again! 🔄`,
            timestamp: Date.now(),
          },
        ]);
      }
    } catch {
      setError("Failed to switch model");
    }
  }, [models]);

  const value = useMemo<MonaChatContextValue>(
    () => ({
      isOpen,
      messages,
      isLoading,
      error,
      models,
      currentModel,
      toggleChat,
      openChat,
      closeChat,
      sendMessage,
      clearChat,
      switchModel,
    }),
    [
      isOpen,
      messages,
      isLoading,
      error,
      models,
      currentModel,
      toggleChat,
      openChat,
      closeChat,
      sendMessage,
      clearChat,
      switchModel,
    ]
  );

  return (
    <MonaChatContext.Provider value={value}>
      {children}
    </MonaChatContext.Provider>
  );
}
