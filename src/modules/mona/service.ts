// ─── Mona Chat Service ───────────────────────────────────────────────────────
//
// Orchestrates the AI pipeline: builds context → calls Gemini → executes tools
// → returns final response. Handles the multi-turn tool-calling loop.
//
import type {
  MonaContext,
  MonaChatResponse,
  GeminiContent,
  MonaPendingAction,
  RateLimitEntry,
} from "./types";
import {
  callGemini,
  extractTextFromResponse,
  extractFunctionCalls,
  hasFunctionCalls,
} from "./gemini-client";
import { buildSystemPrompt } from "./system-prompt";
import { getAvailableTools, executeTool } from "./tools";
import { handleOfflineQuery } from "./local-engine";
import { isMonaActionProposalResult } from "./actions";
import {
  appendMonaConversationMessage,
  clearPersistedMonaConversation,
  createSerializableContextSnapshot,
  getOrCreateMonaConversation,
  loadMonaConversationHistory,
  recordMonaAuditEvent,
} from "./persistence";
import { createToolCitations } from "./citations";
import { getEffectiveMonaModelForUser } from "./settings";
import { resolveMonaSkillSelection } from "./skills";

// ─── In-memory rate limiting ─────────────────────────────────────────────────
const rateLimits = new Map<string, RateLimitEntry>();
const RATE_LIMIT_MAX = 15; // requests per window
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// ─── In-memory conversation store (session-only) ─────────────────────────────
type ConversationEntry = {
  geminiHistory: GeminiContent[];
  lastAccessed: number;
};

const conversations = new Map<string, ConversationEntry>();
const MAX_HISTORY_LENGTH = 40; // max turns to keep
const CONVERSATION_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Periodic cleanup of stale conversations (every 5 minutes)
if (typeof globalThis !== "undefined") {
  const g = globalThis as unknown as { monaCleanupStarted?: boolean };
  if (!g.monaCleanupStarted) {
    g.monaCleanupStarted = true;
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of conversations.entries()) {
        if (now - entry.lastAccessed > CONVERSATION_TTL_MS) {
          conversations.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }
}

function getConversationKey(userId: string, sessionId: string): string {
  return `${userId}:${sessionId}`;
}

function getOrCreateConversation(
  userId: string,
  sessionId: string
): GeminiContent[] {
  const key = getConversationKey(userId, sessionId);
  const entry = conversations.get(key);

  if (entry) {
    entry.lastAccessed = Date.now();
    return entry.geminiHistory;
  }

  const history: GeminiContent[] = [];
  conversations.set(key, {
    geminiHistory: history,
    lastAccessed: Date.now(),
  });
  return history;
}

function appendToHistory(
  userId: string,
  sessionId: string,
  ...contents: GeminiContent[]
) {
  const key = getConversationKey(userId, sessionId);
  const entry = conversations.get(key);
  if (!entry) return;

  entry.geminiHistory.push(...contents);
  entry.lastAccessed = Date.now();

  // Trim to max length (keep system-inserted content)
  while (entry.geminiHistory.length > MAX_HISTORY_LENGTH) {
    entry.geminiHistory.shift();
  }
}

// ─── Main Chat Function ──────────────────────────────────────────────────────

const MAX_TOOL_ROUNDS = 5;

export async function chatWithMona(
  ctx: MonaContext,
  userMessage: string,
  sessionId: string
): Promise<MonaChatResponse> {
  const startedAt = Date.now();
  const channel = ctx.route.channel;
  const contextSnapshot = createSerializableContextSnapshot(ctx);
  const skillSelection = resolveMonaSkillSelection(ctx, userMessage);
  let conversationId: string | undefined;
  let usedPersistentHistory = false;
  let auditStatus = "success";
  let auditEventType = "chat.response";
  let auditResponseMessage: string | undefined;

  // Rate limit check
  if (!checkRateLimit(ctx.userId)) {
    auditStatus = "rate_limited";
    auditResponseMessage =
      "I'm receiving too many requests right now. Please wait a moment and try again. 🕐";
    void safeRecordAudit({
      channel,
      ctx,
      details: {
        reason: "service_rate_limit",
        skillId: skillSelection.skill.id,
        skillReason: skillSelection.reason,
      },
      eventType: "chat.rate_limited",
      latencyMs: Date.now() - startedAt,
      requestMessage: userMessage,
      responseMessage: auditResponseMessage,
      sessionKey: sessionId,
      status: auditStatus,
      toolNames: [],
      conversationId,
    });
    return {
      content: auditResponseMessage,
      toolsUsed: [],
    };
  }

  // Build system prompt
  const systemPrompt = buildSystemPrompt(ctx, skillSelection);
  const preferredModelId = await getEffectiveMonaModelForUser({
    orgId: ctx.orgId,
    userId: ctx.userId,
  });

  // Get permission-filtered tools constrained by the selected skill.
  const availableTools = getAvailableTools(
    ctx.permissions,
    skillSelection.allowedToolNames,
  );

  const userContent: GeminiContent = {
    role: "user",
    parts: [{ text: userMessage }],
  };

  let history = getOrCreateConversation(ctx.userId, sessionId);

  try {
    const conversation = await getOrCreateMonaConversation({
      userId: ctx.userId,
      orgId: ctx.orgId,
      channel,
      sessionKey: sessionId,
      currentPath: ctx.currentPath,
      pageLabel: ctx.route.pageLabel,
    });
    conversationId = conversation.id;

    history = await loadMonaConversationHistory(conversation.id);
    usedPersistentHistory = true;

    await appendMonaConversationMessage({
      conversationId: conversation.id,
      role: "user",
      content: userMessage,
      contextSnapshot,
      metadata: {
        pageLabel: ctx.route.pageLabel,
        routeKey: ctx.route.routeKey,
        skillId: skillSelection.skill.id,
        skillReason: skillSelection.reason,
      },
    });
  } catch (error) {
    console.warn("[Mona] Persistent conversation unavailable, using in-memory history.", error);
    appendToHistory(ctx.userId, sessionId, userContent);
    history = getOrCreateConversation(ctx.userId, sessionId);
  }

  // Build contents array for Gemini (full history)
  const contents = usedPersistentHistory ? [...history, userContent] : [...history];
  const toolsUsed: string[] = [];
  const pendingActions = new Map<string, MonaPendingAction>();

  try {
    // Multi-round tool calling loop
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const geminiResponse = await callGemini({
        contents,
        modelId: preferredModelId,
        systemInstruction: systemPrompt,
        tools: availableTools.length > 0 ? availableTools : undefined,
        temperature: 0.7,
        maxOutputTokens: 2048,
      });

      // Check if Gemini wants to call tools
      if (hasFunctionCalls(geminiResponse)) {
        const functionCalls = extractFunctionCalls(geminiResponse);

        // Add Gemini's response (with function calls) to contents
        const modelContent: GeminiContent = {
          role: "model",
          parts: functionCalls.map((fc) => ({
            functionCall: { name: fc.name, args: fc.args },
          })),
        };
        contents.push(modelContent);
        appendToHistory(ctx.userId, sessionId, modelContent);

        // Execute each tool and collect results
        const toolResults = await Promise.all(
          functionCalls.map(async (fc) => {
            toolsUsed.push(fc.name);
            try {
              const result = await executeTool(fc.name, fc.args, ctx);
              if (isMonaActionProposalResult(result)) {
                pendingActions.set(result.actionProposal.id, result.actionProposal);
              }
              return { name: fc.name, result };
            } catch (err) {
              console.error(`[Mona] Tool ${fc.name} failed:`, err);
              return {
                name: fc.name,
                result: {
                  error: `Tool execution failed: ${err instanceof Error ? err.message : "Unknown error"}`,
                },
              };
            }
          })
        );

        // Add tool results as a user message (Gemini expects function responses from user role)
        const toolResponseContent: GeminiContent = {
          role: "user",
          parts: toolResults.map((tr) => ({
            functionResponse: {
              name: tr.name,
              response: { result: tr.result },
            },
          })),
        };
        contents.push(toolResponseContent);
        appendToHistory(ctx.userId, sessionId, toolResponseContent);

        // Continue loop — Gemini will process tool results and may call more tools
        continue;
      }

      // No function calls — extract final text response
      const text = extractTextFromResponse(geminiResponse);

      // Add Mona's response to history
      const monaContent: GeminiContent = {
        role: "model",
        parts: [{ text }],
      };
      appendToHistory(ctx.userId, sessionId, monaContent);
      const responseCitations = createToolCitations([...new Set(toolsUsed)], ctx);
      const responseActions = [...pendingActions.values()];
      if (conversationId) {
        await safeAppendConversationMessage({
          conversationId,
          role: "model",
          content: text,
          toolNames: [...new Set(toolsUsed)],
          metadata: {
            finish: "complete",
            source: "gemini",
            citations: responseCitations,
            actions: responseActions,
            skillId: skillSelection.skill.id,
            skillReason: skillSelection.reason,
          },
        });
      }
      auditResponseMessage = text;

      const chatResponse: MonaChatResponse = {
        content: text,
        toolsUsed: [...new Set(toolsUsed)],
        citations: responseCitations,
        actions: responseActions,
      };

      await safeRecordAudit({
        channel,
        ctx,
        details: {
          modelId: preferredModelId,
          promptTokenCount: geminiResponse.usageMetadata?.promptTokenCount ?? 0,
          responseTokenCount: geminiResponse.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokenCount: geminiResponse.usageMetadata?.totalTokenCount ?? 0,
          source: "gemini",
          usedPersistentHistory,
          skillId: skillSelection.skill.id,
          skillReason: skillSelection.reason,
        },
        eventType: auditEventType,
        latencyMs: Date.now() - startedAt,
        requestMessage: userMessage,
        responseMessage: auditResponseMessage,
        sessionKey: sessionId,
        status: auditStatus,
        toolNames: chatResponse.toolsUsed,
        conversationId,
      });

      return chatResponse;
    }

    // If we exceeded max tool rounds
    auditStatus = "max_tool_rounds";
    auditEventType = "chat.incomplete";
    auditResponseMessage =
      "I gathered a lot of data but couldn't quite piece it together. Could you rephrase your question? 🤔";
    if (conversationId) {
      await safeAppendConversationMessage({
        conversationId,
        role: "model",
        content: auditResponseMessage,
        toolNames: [...new Set(toolsUsed)],
        metadata: {
          finish: "max_tool_rounds",
          source: "gemini",
          citations: createToolCitations([...new Set(toolsUsed)], ctx),
          actions: [...pendingActions.values()],
          skillId: skillSelection.skill.id,
          skillReason: skillSelection.reason,
        },
      });
    }
    await safeRecordAudit({
      channel,
      ctx,
      details: {
        modelId: preferredModelId,
        source: "gemini",
        usedPersistentHistory,
        skillId: skillSelection.skill.id,
        skillReason: skillSelection.reason,
      },
      eventType: auditEventType,
      latencyMs: Date.now() - startedAt,
      requestMessage: userMessage,
      responseMessage: auditResponseMessage,
      sessionKey: sessionId,
      status: auditStatus,
      toolNames: [...new Set(toolsUsed)],
      conversationId,
    });
    return {
      content: auditResponseMessage,
      toolsUsed,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn(`[Mona] Gemini API failed (${errMsg}). Falling back to local offline engine.`);

    try {
      const offlineRes = await handleOfflineQuery(userMessage, ctx);

      // Save local response in conversation history
      const monaContent: GeminiContent = {
        role: "model",
        parts: [{ text: offlineRes.content }],
      };
      appendToHistory(ctx.userId, sessionId, monaContent);
      if (conversationId) {
        await safeAppendConversationMessage({
          conversationId,
          role: "model",
          content: offlineRes.content,
          toolNames: offlineRes.toolsUsed,
          metadata: {
            finish: "offline_fallback",
            source: "offline",
            fallbackReason: errMsg,
            citations: offlineRes.citations,
            actions: offlineRes.actions,
            skillId: skillSelection.skill.id,
            skillReason: skillSelection.reason,
          },
        });
      }
      auditStatus = "fallback";
      auditEventType = "chat.fallback";
      auditResponseMessage = offlineRes.content;
      await safeRecordAudit({
        channel,
        ctx,
        details: {
          modelId: preferredModelId,
          source: "offline",
          fallbackReason: errMsg,
          usedPersistentHistory,
          skillId: skillSelection.skill.id,
          skillReason: skillSelection.reason,
        },
        eventType: auditEventType,
        latencyMs: Date.now() - startedAt,
        requestMessage: userMessage,
        responseMessage: auditResponseMessage,
        sessionKey: sessionId,
        status: auditStatus,
        toolNames: offlineRes.toolsUsed,
        conversationId,
      });

      return offlineRes;
    } catch (fallbackErr) {
      console.error("[Mona] Offline fallback engine failed:", fallbackErr);
      auditStatus = "error";
      auditEventType = "chat.error";
      auditResponseMessage =
        "I ran into an unexpected issue and offline fallback also failed. Please try again later.";
      await safeRecordAudit({
        channel,
        ctx,
        details: {
          modelId: preferredModelId,
          source: "offline",
          fallbackReason: errMsg,
          finalError: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr),
          usedPersistentHistory,
          skillId: skillSelection.skill.id,
          skillReason: skillSelection.reason,
        },
        eventType: auditEventType,
        latencyMs: Date.now() - startedAt,
        requestMessage: userMessage,
        responseMessage: auditResponseMessage,
        sessionKey: sessionId,
        status: auditStatus,
        toolNames: [],
        conversationId,
      });
      return {
        content: auditResponseMessage,
        toolsUsed: [],
      };
    }
  }
}

/**
 * Clear a user's conversation history.
 */
export async function clearConversation(
  userId: string,
  sessionId: string,
  channel: MonaContext["route"]["channel"] = "web",
): Promise<void> {
  const key = getConversationKey(userId, sessionId);
  conversations.delete(key);
  await safeClearPersistedConversation({ userId, sessionKey: sessionId, channel });
}

async function safeAppendConversationMessage(params: {
  content: string;
  conversationId: string;
  metadata?: Record<string, unknown>;
  role: "user" | "model";
  toolNames?: string[];
}) {
  try {
    await appendMonaConversationMessage(params);
  } catch (error) {
    console.warn("[Mona] Failed to persist conversation message.", error);
  }
}

async function safeClearPersistedConversation(params: {
  channel: string;
  sessionKey: string;
  userId: string;
}) {
  try {
    await clearPersistedMonaConversation(params);
  } catch (error) {
    console.warn("[Mona] Failed to clear persisted conversation.", error);
  }
}

async function safeRecordAudit(params: {
  channel: string;
  conversationId?: string;
  ctx: MonaContext;
  details?: Record<string, unknown>;
  eventType: string;
  latencyMs: number;
  requestMessage: string;
  responseMessage?: string;
  sessionKey: string;
  status: string;
  toolNames: string[];
}) {
  try {
    await recordMonaAuditEvent({
      orgId: params.ctx.orgId,
      userId: params.ctx.userId,
      conversationId: params.conversationId,
      channel: params.channel,
      sessionKey: params.sessionKey,
      eventType: params.eventType,
      status: params.status,
      requestMessage: params.requestMessage,
      responseMessage: params.responseMessage,
      routePath: params.ctx.currentPath,
      toolNames: params.toolNames,
      latencyMs: params.latencyMs,
      details: {
        moduleId: params.ctx.route.moduleId,
        routeKey: params.ctx.route.routeKey,
        view: params.ctx.route.view,
        entityKind: params.ctx.entity?.kind ?? null,
        ...params.details,
      },
    });
  } catch (error) {
    console.warn("[Mona] Failed to record audit event.", error);
  }
}
