// ─── Mona – Monolith Companion AI Types ─────────────────────────────────────

/** Roles in the conversation */
export type MonaRole = "user" | "model" | "system";

/** A single message in the Mona conversation */
export type MonaMessage = {
  id: string;
  role: MonaRole;
  content: string;
  timestamp: number;
  /** If Mona invoked tools to answer, list them here for transparency */
  toolsUsed?: string[];
};

/** Context sent with every chat request so Mona knows where the user is */
export type MonaContext = {
  userId: string;
  userName: string;
  orgId?: string;
  currentPath: string;
  permissions: string[];
  isAdmin: boolean;
};

/** Request body for POST /api/mona/chat */
export type MonaChatRequest = {
  messages: { role: "user" | "model"; content: string }[];
  context: {
    currentPath: string;
  };
};

/** Response shape from the chat endpoint (streamed as SSE) */
export type MonaChatResponse = {
  content: string;
  toolsUsed: string[];
  proactiveInsights?: string[];
};

/** Tool definition for Gemini function calling */
export type MonaToolDef = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  /** Permission keys required — if user lacks ANY, tool is omitted */
  requiredPermissions?: string[];
  /** If true, tool is always available regardless of permissions */
  alwaysAvailable?: boolean;
};

/** Result of executing a tool */
export type MonaToolResult = {
  name: string;
  result: unknown;
  error?: string;
};

/** Gemini API message format */
export type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

export type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: { result: unknown } } };

/** Gemini function declaration format */
export type GeminiFunctionDeclaration = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

/** Gemini API request body */
export type GeminiRequest = {
  contents: GeminiContent[];
  tools?: { functionDeclarations: GeminiFunctionDeclaration[] }[];
  systemInstruction?: { parts: { text: string }[] };
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
  };
};

/** Gemini API response */
export type GeminiResponse = {
  candidates: {
    content: {
      role: string;
      parts: GeminiPart[];
    };
    finishReason: string;
  }[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
};

/** Rate limit entry */
export type RateLimitEntry = {
  count: number;
  resetAt: number;
};
