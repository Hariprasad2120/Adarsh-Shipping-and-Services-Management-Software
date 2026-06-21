// ─── Gemini REST API Client ──────────────────────────────────────────────────
import type {
  GeminiRequest,
  GeminiResponse,
  GeminiContent,
  GeminiFunctionDeclaration,
  GeminiPart,
} from "./types";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Available models — shown in the UI dropdown */
export const AVAILABLE_MODELS = [
  { id: "models/gemini-2.0-flash", name: "Gemini 2.0 Flash", description: "Fast & capable" },
  { id: "models/gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite", description: "Lighter, higher quota" },
  { id: "models/gemini-1.5-flash", name: "Gemini 1.5 Flash", description: "Previous gen, separate quota" },
] as const;

/** Currently preferred model — set by the user via settings */
let preferredModelId: string = AVAILABLE_MODELS[0].id;

export function setPreferredModel(modelId: string) {
  const valid = AVAILABLE_MODELS.find((m) => m.id === modelId);
  if (valid) preferredModelId = modelId;
}

export function getPreferredModel(): string {
  return preferredModelId;
}

// Cooldown: once quota is exhausted, stop making API calls for 60s
let quotaCooldownUntil = 0;
const QUOTA_COOLDOWN_MS = 60_000;

/** Reset cooldown — called when user switches models */
export function resetQuotaCooldown() {
  quotaCooldownUntil = 0;
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "[Mona] GEMINI_API_KEY is not set. Add it to your .env file."
    );
  }
  return key;
}

/**
 * Call the Gemini generateContent endpoint.
 * Tries models in order, with retry + exponential backoff for transient errors.
 */
export async function callGemini(opts: {
  contents: GeminiContent[];
  systemInstruction?: string;
  tools?: GeminiFunctionDeclaration[];
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<GeminiResponse> {
  const apiKey = getApiKey();

  const body: GeminiRequest = {
    contents: opts.contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      topP: 0.95,
      maxOutputTokens: opts.maxOutputTokens ?? 2048,
    },
  };

  if (opts.systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: opts.systemInstruction }],
    };
  }

  if (opts.tools && opts.tools.length > 0) {
    body.tools = [{ functionDeclarations: opts.tools }];
  }

  let lastError: Error | null = null;

  // If we recently hit quota exhaustion, fail fast — don't burn more requests
  if (quotaCooldownUntil > Date.now()) {
    throw new Error("[Mona] 429 quota exhausted — cooling down");
  }

  // Use only the user's preferred model (no auto-fallback to avoid burning quota)
  const modelId = preferredModelId;
  const url = `${GEMINI_API_BASE}/${modelId}:generateContent?key=${apiKey}`;
  const MAX_RETRIES = 1; // Single attempt — don't retry on quota errors

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errorText = await res.text();

          // Quota exhausted — activate cooldown, fail immediately
          if (res.status === 429 && errorText.includes("RESOURCE_EXHAUSTED")) {
            console.warn(`[Mona] ${modelId} quota exhausted, cooldown activated`);
            quotaCooldownUntil = Date.now() + QUOTA_COOLDOWN_MS;
            throw new Error(`[Mona] 429 quota exhausted: ${errorText.slice(0, 300)}`);
          }

          // Transient rate limit (not quota exhaustion) — retry with backoff
          if (res.status === 429 && attempt < MAX_RETRIES - 1) {
            const backoff = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
            console.warn(`[Mona] ${modelId} rate limited, retrying in ${Math.round(backoff)}ms...`);
            await sleep(backoff);
            continue;
          }

          // Server errors — retry
          if (res.status >= 500 && attempt < MAX_RETRIES - 1) {
            const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 500;
            await sleep(backoff);
            continue;
          }

          throw new Error(
            `[Mona] Gemini API error ${res.status}: ${errorText.slice(0, 500)}`
          );
        }

        const data: GeminiResponse = await res.json();

        if (!data.candidates || data.candidates.length === 0) {
          throw new Error("[Mona] Gemini returned no candidates");
        }

        // Log token usage in dev
        if (process.env.NODE_ENV === "development" && data.usageMetadata) {
          console.debug(
            `[Mona] ${modelId} → Tokens: prompt=${data.usageMetadata.promptTokenCount} response=${data.usageMetadata.candidatesTokenCount} total=${data.usageMetadata.totalTokenCount}`
          );
        }

        return data;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < MAX_RETRIES) {
          const backoff = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          await sleep(backoff);
        }
      }
    }

  throw lastError ?? new Error("[Mona] Gemini API call failed — all models exhausted");
}

/**
 * Extract text content from a Gemini response.
 */
export function extractTextFromResponse(response: GeminiResponse): string {
  const parts = response.candidates[0]?.content?.parts ?? [];
  return parts
    .filter((p): p is { text: string } => "text" in p)
    .map((p) => p.text)
    .join("");
}

/**
 * Extract function calls from a Gemini response.
 */
export function extractFunctionCalls(
  response: GeminiResponse
): { name: string; args: Record<string, unknown> }[] {
  const parts = response.candidates[0]?.content?.parts ?? [];
  return parts
    .filter(
      (p): p is { functionCall: { name: string; args: Record<string, unknown> } } =>
        "functionCall" in p
    )
    .map((p) => p.functionCall);
}

/**
 * Check if the response contains function calls (meaning we need to execute tools).
 */
export function hasFunctionCalls(response: GeminiResponse): boolean {
  return extractFunctionCalls(response).length > 0;
}

/**
 * Build a function response content object for sending tool results back to Gemini.
 */
export function buildFunctionResponseContent(
  results: { name: string; result: unknown }[]
): GeminiContent {
  return {
    role: "model" as const,
    parts: results.map((r) => ({
      functionResponse: {
        name: r.name,
        response: { result: r.result },
      },
    })),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
