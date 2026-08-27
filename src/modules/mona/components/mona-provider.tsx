"use client";

import type { MonaGuidanceTarget } from "@/modules/mona/guidance";
import {
  buildGuidancePrompts,
  getGuidanceTargetById,
  getGuidanceTargetsForPath,
} from "@/modules/mona/guidance";
import type { MonaPendingAction } from "@/modules/mona/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

export type MonaChatMessage = {
  actions?: MonaPendingAction[];
  id: string;
  role: "user" | "mona";
  content: string;
  timestamp: number;
  toolsUsed?: string[];
  citations?: Array<{
    id: string;
    kind: "tool" | "guide" | "faq" | "module" | "document";
    label: string;
    detail?: string;
    href?: string;
  }>;
  isTyping?: boolean;
};

export type MonaModel = {
  id: string;
  name: string;
  description: string;
};

export type MonaPetDockPosition =
  | "auto"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type MonaPetAnimationMode = "full" | "reduced" | "disabled";
export type MonaPetPersonality = "professional" | "friendly" | "playful" | "silent";
export type MonaPetAppearance = "classic" | "aurora";
export type MonaPetType = "orb" | "scout";
export type MonaPetBehaviorIntensity = "quiet" | "balanced" | "expressive";
export type MonaPetProactiveLevel =
  | "silent"
  | "important-only"
  | "balanced"
  | "proactive";

export type MonaPetPreferences = {
  animationMode: MonaPetAnimationMode;
  appearance: MonaPetAppearance;
  behaviorIntensity: MonaPetBehaviorIntensity;
  dockPosition: MonaPetDockPosition;
  personality: MonaPetPersonality;
  petName: string;
  petType: MonaPetType;
  proactiveLevel: MonaPetProactiveLevel;
  voiceEnabled: boolean;
};

export type MonaContextRouteSnapshot = {
  breadcrumbs: string[];
  channel: "web" | "mobile" | "google_chat";
  moduleId: string;
  moduleLabel: string;
  pageLabel: string;
  pageSummary: string;
  path: string;
  routeKey: string;
  view: "dashboard" | "list" | "detail" | "create" | "edit" | "settings" | "workspace";
};

export type MonaContextWorkspaceSnapshot = {
  accessibleModules: string[];
  permissionCount: number;
  roleSummary: string;
};

export type MonaContextEntitySnapshot = {
  kind: "crm_lead" | "crm_deal" | "crm_contact" | "crm_account" | "crm_invoice";
  label: string;
  summary: string;
  metadata: Record<string, string | number | boolean | string[] | null>;
};

export type MonaContextSnapshot = {
  entity: MonaContextEntitySnapshot | null;
  route: MonaContextRouteSnapshot;
  workspace: MonaContextWorkspaceSnapshot;
};

export type MonaSuggestedPrompt = {
  id: string;
  label: string;
  prompt: string;
};

export type MonaConversationSummary = {
  channel: string;
  id: string;
  lastMessageAt: string;
  lastPageLabel: string;
  lastPath: string;
  preview: string;
  previewRole: string;
  sessionKey: string;
  title: string;
};

type MonaChatState = {
  isOpen: boolean;
  messages: MonaChatMessage[];
  isLoading: boolean;
  error: string | null;
  models: MonaModel[];
  currentModel: string;
  conversations: MonaConversationSummary[];
  isConversationListLoading: boolean;
  activeConversationId: string | null;
  contextSnapshot: MonaContextSnapshot | null;
  isContextLoading: boolean;
  guidanceTargets: MonaGuidanceTarget[];
  activeGuidanceTarget: MonaGuidanceTarget | null;
  preferences: MonaPetPreferences;
  suggestedPrompts: MonaSuggestedPrompt[];
};

type MonaChatActions = {
  toggleChat: () => void;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (text: string) => Promise<void>;
  executeAction: (messageId: string, action: MonaPendingAction) => Promise<void>;
  submitFeedback: (params: {
    feedback: "helpful" | "unhelpful";
    reason?: string;
    responseExcerpt: string;
  }) => Promise<void>;
  startGuidance: (targetId?: string) => void;
  clearGuidance: () => void;
  clearChat: () => void;
  loadConversation: (conversationId: string) => Promise<void>;
  switchModel: (modelId: string) => Promise<void>;
  updatePreferences: (updates: Partial<MonaPetPreferences>) => void;
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
const MONA_PREFERENCES_STORAGE_KEY = "mona-pet-preferences";

const DEFAULT_MONA_PREFERENCES: MonaPetPreferences = {
  animationMode: "full",
  appearance: "classic",
  behaviorIntensity: "balanced",
  dockPosition: "auto",
  personality: "friendly",
  petName: "Mona",
  petType: "orb",
  proactiveLevel: "balanced",
  voiceEnabled: false,
};

const CONTEXT_PROMPT_CACHE = new Map<string, MonaContextSnapshot>();

function buildSuggestedPrompts(
  snapshot: MonaContextSnapshot | null,
): MonaSuggestedPrompt[] {
  if (!snapshot) {
    return [
      {
        id: "workspace-summary",
        label: "Summarize page",
        prompt: "Summarize this workspace and tell me what needs attention first.",
      },
    ];
  }

  const prompts: MonaSuggestedPrompt[] = [
    {
      id: "page-summary",
      label: "Summarize page",
      prompt: `Summarize ${snapshot.route.pageLabel} and tell me what needs attention first.`,
    },
  ];

  if (snapshot.entity) {
    prompts.push({
      id: "record-brief",
      label: "Review record",
      prompt: `Review ${snapshot.entity.label} and tell me the key context, current risk, and next best step.`,
    });
  }

  if (snapshot.route.moduleId === "dashboard") {
    prompts.push({
      id: "my-work-today",
      label: "My work today",
      prompt: "Use my current dashboard context and summarize my most important work today in priority order.",
    });
  } else if (snapshot.route.moduleId === "crm") {
    prompts.push({
      id: "crm-risks",
      label: "CRM risks",
      prompt: "Use this CRM page and tell me the most important pipeline risks, blockers, and follow-ups.",
    });
  } else if (snapshot.route.moduleId === "attendance") {
    prompts.push({
      id: "attendance-exceptions",
      label: "Exceptions",
      prompt: "Use this attendance page and summarize any exceptions, approvals, or follow-ups I should handle.",
    });
  } else if (snapshot.route.moduleId === "hrms") {
    prompts.push({
      id: "people-ops",
      label: "People ops",
      prompt: "Use this HRMS page and summarize the most important employee, approval, or compliance work here.",
    });
  } else if (snapshot.route.moduleId === "accounting") {
    prompts.push({
      id: "finance-focus",
      label: "Finance focus",
      prompt: "Use this accounting page and summarize the open finance tasks, approval needs, and next best step.",
    });
  } else {
    prompts.push({
      id: "next-step",
      label: "Next step",
      prompt: `Based on ${snapshot.route.pageLabel}, tell me the most useful next step to take right now.`,
    });
  }

  prompts.push({
    id: "navigate",
    label: "Guide me",
    prompt: `Guide me through ${snapshot.route.pageLabel} and explain what this page is for and how to use it well.`,
  });

  return prompts.slice(0, 4);
}

function parsePreferenceValue<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && allowedValues.includes(value as T)
    ? (value as T)
    : fallback;
}

function parseMonaPreferences(value: unknown): MonaPetPreferences {
  if (!value || typeof value !== "object") {
    return DEFAULT_MONA_PREFERENCES;
  }

  const input = value as Record<string, unknown>;
  const allowedNames = ["Mona", "Moni", "Orbit", "Pixel"] as const;

  return {
    animationMode: parsePreferenceValue(
      input.animationMode,
      ["full", "reduced", "disabled"] as const,
      DEFAULT_MONA_PREFERENCES.animationMode,
    ),
    appearance: parsePreferenceValue(
      input.appearance,
      ["classic", "aurora"] as const,
      DEFAULT_MONA_PREFERENCES.appearance,
    ),
    behaviorIntensity: parsePreferenceValue(
      input.behaviorIntensity,
      ["quiet", "balanced", "expressive"] as const,
      DEFAULT_MONA_PREFERENCES.behaviorIntensity,
    ),
    dockPosition: parsePreferenceValue(
      input.dockPosition,
      ["auto", "bottom-left", "bottom-center", "bottom-right"] as const,
      DEFAULT_MONA_PREFERENCES.dockPosition,
    ),
    personality: parsePreferenceValue(
      input.personality,
      ["professional", "friendly", "playful", "silent"] as const,
      DEFAULT_MONA_PREFERENCES.personality,
    ),
    petName:
      typeof input.petName === "string" &&
      allowedNames.includes(input.petName as (typeof allowedNames)[number])
        ? input.petName
        : DEFAULT_MONA_PREFERENCES.petName,
    petType: parsePreferenceValue(
      input.petType,
      ["orb", "scout"] as const,
      DEFAULT_MONA_PREFERENCES.petType,
    ),
    proactiveLevel: parsePreferenceValue(
      input.proactiveLevel,
      ["silent", "important-only", "balanced", "proactive"] as const,
      DEFAULT_MONA_PREFERENCES.proactiveLevel,
    ),
    voiceEnabled:
      typeof input.voiceEnabled === "boolean"
        ? input.voiceEnabled
        : DEFAULT_MONA_PREFERENCES.voiceEnabled,
  };
}

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
  const [conversations, setConversations] = useState<MonaConversationSummary[]>([]);
  const [isConversationListLoading, setIsConversationListLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [contextState, setContextState] = useState<{
    path: string;
    snapshot: MonaContextSnapshot | null;
  }>(() => ({
    path: pathname || "/dashboard",
    snapshot: CONTEXT_PROMPT_CACHE.get(pathname || "/dashboard") ?? null,
  }));
  const [activeGuidanceTargetId, setActiveGuidanceTargetId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<MonaPetPreferences>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_MONA_PREFERENCES;
    }

    try {
      const raw = window.localStorage.getItem(MONA_PREFERENCES_STORAGE_KEY);
      return raw ? parseMonaPreferences(JSON.parse(raw)) : DEFAULT_MONA_PREFERENCES;
    } catch {
      return DEFAULT_MONA_PREFERENCES;
    }
  });
  const sessionIdRef = useRef(`session-${reactSessionId}`);
  const hasLoadedInsightsRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      MONA_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences),
    );
  }, [preferences]);

  useEffect(() => {
    const cacheKey = pathname || "/dashboard";
    const controller = new AbortController();

    fetch(`/api/mona/context?currentPath=${encodeURIComponent(cacheKey)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Context request failed with ${response.status}`);
        }
        return response.json() as Promise<MonaContextSnapshot>;
      })
      .then((snapshot) => {
        CONTEXT_PROMPT_CACHE.set(cacheKey, snapshot);
        setContextState({ path: cacheKey, snapshot });
      })
      .catch((fetchError) => {
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          return;
        }
      });

    return () => controller.abort();
  }, [pathname]);

  const contextSnapshot = useMemo(() => {
    const activePath = pathname || "/dashboard";
    if (contextState.path === activePath) {
      return contextState.snapshot;
    }
    return CONTEXT_PROMPT_CACHE.get(activePath) ?? null;
  }, [contextState.path, contextState.snapshot, pathname]);

  const isContextLoading = useMemo(() => {
    const activePath = pathname || "/dashboard";
    return contextState.path !== activePath && !CONTEXT_PROMPT_CACHE.has(activePath);
  }, [contextState.path, pathname]);

  const guidanceTargets = useMemo(
    () => getGuidanceTargetsForPath(pathname || "/dashboard"),
    [pathname],
  );

  const activeGuidanceTarget = useMemo(
    () =>
      activeGuidanceTargetId
        ? getGuidanceTargetById(pathname || "/dashboard", activeGuidanceTargetId)
        : null,
    [activeGuidanceTargetId, pathname],
  );

  const loadModelConfig = useCallback(async () => {
    const data = await fetchModelPayload();
    if (data.models) setModels(data.models);
    if (data.current) setCurrentModel(data.current);
  }, []);

  const loadConversationList = useCallback(async () => {
    setIsConversationListLoading(true);
    try {
      const res = await fetch("/api/mona/conversations?channel=web&limit=10");
      if (!res.ok) {
        throw new Error(`Conversation list failed with ${res.status}`);
      }
      const data = await res.json() as { conversations?: MonaConversationSummary[] };
      const nextConversations = data.conversations ?? [];
      setConversations(nextConversations);
      setActiveConversationId((current) => {
        if (current && nextConversations.some((conversation) => conversation.id === current)) {
          return current;
        }
        const matchingConversation = nextConversations.find(
          (conversation) => conversation.sessionKey === sessionIdRef.current,
        );
        return matchingConversation?.id ?? current;
      });
    } catch {
      setConversations((current) => current);
    } finally {
      setIsConversationListLoading(false);
    }
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
          citations: data.citations,
          actions: data.actions,
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
        void loadConversationList();
        loadWelcomeInsights();
      }
      return next;
    });
  }, [loadConversationList, loadModelConfig, loadWelcomeInsights]);

  const openChat = useCallback(() => {
    setIsOpen(true);
    void loadModelConfig();
    void loadConversationList();
    loadWelcomeInsights();
  }, [loadConversationList, loadModelConfig, loadWelcomeInsights]);

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
          citations: data.citations,
          toolsUsed: data.toolsUsed,
          actions: data.actions,
        };

        // Replace typing indicator with actual response
        setMessages((prev) =>
          prev.filter((m) => m.id !== "mona-typing").concat(monaMsg)
        );
        void loadConversationList();
      } catch {
        setError("Failed to reach Mona. Please check your connection.");
        setMessages((prev) => prev.filter((m) => m.id !== "mona-typing"));
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, loadConversationList, pathname]
  );

  const executeAction = useCallback(
    async (messageId: string, action: MonaPendingAction) => {
      setError(null);

      setMessages((prev) =>
        prev.map((message) =>
          message.id !== messageId
            ? message
            : {
                ...message,
                actions: message.actions?.filter((item) => item.id !== action.id),
              },
        ),
      );

      try {
        const res = await fetch("/api/mona/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: action.token,
            currentPath: pathname,
            sessionId: sessionIdRef.current,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to execute action");
        }

        setMessages((prev) => [
          ...prev,
          {
            id: genId(),
            role: "mona",
            content:
              data.content || "The action completed successfully.",
            timestamp: Date.now(),
          },
        ]);
        void loadConversationList();
      } catch (actionError) {
        setMessages((prev) =>
          prev.map((message) =>
            message.id !== messageId
              ? message
              : {
                  ...message,
                  actions: [...(message.actions ?? []), action],
                },
          ),
        );
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Failed to execute the requested action.",
        );
      }
    },
    [loadConversationList, pathname],
  );

  const submitFeedback = useCallback(
    async (params: {
      feedback: "helpful" | "unhelpful";
      reason?: string;
      responseExcerpt: string;
    }) => {
      await fetch("/api/mona/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId,
          currentPath: pathname,
          feedback: params.feedback,
          reason: params.reason,
          responseExcerpt: params.responseExcerpt,
          sessionId: sessionIdRef.current,
        }),
      });
    },
    [activeConversationId, pathname],
  );

  const startGuidance = useCallback((targetId?: string) => {
    const targets = getGuidanceTargetsForPath(pathname || "/dashboard");
    if (targets.length === 0) {
      return;
    }

    if (targetId && targets.some((target) => target.id === targetId)) {
      setActiveGuidanceTargetId(targetId);
      return;
    }

    setActiveGuidanceTargetId(targets[0]?.id ?? null);
  }, [pathname]);

  const clearGuidance = useCallback(() => {
    setActiveGuidanceTargetId(null);
  }, []);

  const clearChat = useCallback(async () => {
    setMessages([WELCOME_MESSAGE]);
    setError(null);
    setActiveConversationId(null);
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
    void loadConversationList();
  }, [loadConversationList]);

  const loadConversation = useCallback(
    async (conversationId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/mona/conversations/${conversationId}`);
        if (!res.ok) {
          throw new Error(`Conversation load failed with ${res.status}`);
        }

        const data = await res.json() as {
          conversation?: {
            id: string;
            messages: MonaChatMessage[];
            sessionKey: string;
          };
        };

        if (!data.conversation) {
          throw new Error("Conversation payload missing");
        }

        setMessages(data.conversation.messages.length > 0 ? data.conversation.messages : [WELCOME_MESSAGE]);
        sessionIdRef.current = data.conversation.sessionKey;
        setActiveConversationId(data.conversation.id);
        hasLoadedInsightsRef.current = true;
        setIsOpen(true);
      } catch {
        setError("Failed to load conversation history.");
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

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

  const updatePreferences = useCallback(
    (updates: Partial<MonaPetPreferences>) => {
      setPreferences((current) => ({
        ...current,
        ...parseMonaPreferences({
          ...current,
          ...updates,
        }),
      }));
    },
    [],
  );

  const suggestedPrompts = useMemo(() => {
    const routePath = pathname || "/dashboard";
    const basePrompts = buildSuggestedPrompts(contextSnapshot);
    const guidancePrompts = buildGuidancePrompts(routePath, contextSnapshot);
    return [...basePrompts, ...guidancePrompts].slice(0, 6);
  }, [contextSnapshot, pathname]);

  const value = useMemo<MonaChatContextValue>(
    () => ({
      isOpen,
      messages,
      isLoading,
      error,
      models,
      currentModel,
      conversations,
      isConversationListLoading,
      activeConversationId,
      contextSnapshot,
      isContextLoading,
      guidanceTargets,
      activeGuidanceTarget,
      preferences,
      suggestedPrompts,
      toggleChat,
      openChat,
      closeChat,
      sendMessage,
      clearChat,
      executeAction,
      submitFeedback,
      startGuidance,
      clearGuidance,
      loadConversation,
      switchModel,
      updatePreferences,
    }),
    [
      isOpen,
      messages,
      isLoading,
      error,
      models,
      currentModel,
      conversations,
      isConversationListLoading,
      activeConversationId,
      contextSnapshot,
      isContextLoading,
      guidanceTargets,
      activeGuidanceTarget,
      preferences,
      suggestedPrompts,
      toggleChat,
      openChat,
      closeChat,
      sendMessage,
      clearChat,
      executeAction,
      submitFeedback,
      startGuidance,
      clearGuidance,
      loadConversation,
      switchModel,
      updatePreferences,
    ]
  );

  return (
    <MonaChatContext.Provider value={value}>
      {children}
    </MonaChatContext.Provider>
  );
}
