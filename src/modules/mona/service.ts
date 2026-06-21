// ─── Mona Chat Service ───────────────────────────────────────────────────────
//
// Orchestrates the AI pipeline: builds context → calls Gemini → executes tools
// → returns final response. Handles the multi-turn tool-calling loop.
//
import type {
  MonaContext,
  MonaChatRequest,
  MonaChatResponse,
  GeminiContent,
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
  // Rate limit check
  if (!checkRateLimit(ctx.userId)) {
    return {
      content:
        "I'm receiving too many requests right now. Please wait a moment and try again. 🕐",
      toolsUsed: [],
    };
  }

  // Build system prompt
  const systemPrompt = buildSystemPrompt(ctx);

  // Get permission-filtered tools
  const availableTools = getAvailableTools(ctx.permissions);

  // Get or create conversation history
  const history = getOrCreateConversation(ctx.userId, sessionId);

  // Add user message to history
  const userContent: GeminiContent = {
    role: "user",
    parts: [{ text: userMessage }],
  };
  appendToHistory(ctx.userId, sessionId, userContent);

  // Build contents array for Gemini (full history)
  let contents = [...history];
  const toolsUsed: string[] = [];

  try {
    // Multi-round tool calling loop
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await callGemini({
        contents,
        systemInstruction: systemPrompt,
        tools: availableTools.length > 0 ? availableTools : undefined,
        temperature: 0.7,
        maxOutputTokens: 2048,
      });

      // Check if Gemini wants to call tools
      if (hasFunctionCalls(response)) {
        const functionCalls = extractFunctionCalls(response);

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
      const text = extractTextFromResponse(response);

      // Add Mona's response to history
      const monaContent: GeminiContent = {
        role: "model",
        parts: [{ text }],
      };
      appendToHistory(ctx.userId, sessionId, monaContent);

      return {
        content: text,
        toolsUsed: [...new Set(toolsUsed)],
      };
    }

    // If we exceeded max tool rounds
    return {
      content:
        "I gathered a lot of data but couldn't quite piece it together. Could you rephrase your question? 🤔",
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

      return offlineRes;
    } catch (fallbackErr) {
      console.error("[Mona] Offline fallback engine failed:", fallbackErr);
      return {
        content: "I ran into an unexpected issue and offline fallback also failed. Please try again later.",
        toolsUsed: [],
      };
    }
  }
}

/**
 * Clear a user's conversation history.
 */
export function clearConversation(
  userId: string,
  sessionId: string
): void {
  const key = getConversationKey(userId, sessionId);
  conversations.delete(key);
}
