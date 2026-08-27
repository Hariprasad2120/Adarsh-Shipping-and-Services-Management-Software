// ─── Mona – Monolith Companion AI Types ─────────────────────────────────────

/** Roles in the conversation */
export type MonaRole = "user" | "model" | "system";

/** A single message in the Mona conversation */
export type MonaCitation = {
  id: string;
  kind: "tool" | "guide" | "faq" | "module" | "document";
  label: string;
  detail?: string;
  href?: string;
};

export type MonaActionId =
  | "create_task"
  | "create_reminder"
  | "draft_email";

export type MonaPendingAction = {
  id: string;
  actionId: MonaActionId;
  title: string;
  description: string;
  confirmationLabel: string;
  confirmationLevel: "explicit_confirm";
  token: string;
  expiresAt: number;
  fields: Array<{
    label: string;
    value: string;
  }>;
};

export type MonaMessage = {
  id: string;
  role: MonaRole;
  content: string;
  timestamp: number;
  /** If Mona invoked tools to answer, list them here for transparency */
  toolsUsed?: string[];
  citations?: MonaCitation[];
  actions?: MonaPendingAction[];
};

/** Context sent with every chat request so Mona knows where the user is */
export type MonaRouteContext = {
  channel: "web" | "mobile" | "google_chat";
  path: string;
  moduleId: string;
  moduleLabel: string;
  pageLabel: string;
  pageSummary: string;
  breadcrumbs: string[];
  view: "dashboard" | "list" | "detail" | "create" | "edit" | "settings" | "workspace";
  routeKey: string;
};

export type MonaWorkspaceContext = {
  permissionCount: number;
  accessibleModules: string[];
  roleSummary: string;
};

export type MonaContextEntity = {
  kind: "crm_lead" | "crm_deal" | "crm_contact" | "crm_account" | "crm_invoice";
  label: string;
  summary: string;
  metadata: Record<string, string | number | boolean | string[] | null>;
};

export type MonaContext = {
  userId: string;
  userName: string;
  orgId?: string;
  currentPath: string;
  permissions: string[];
  isAdmin: boolean;
  route: MonaRouteContext;
  workspace: MonaWorkspaceContext;
  entity: MonaContextEntity | null;
};

export type MonaContextInput = {
  userId: string;
  userName: string;
  orgId?: string;
  currentPath?: string;
  permissions: string[];
  isAdmin: boolean;
  channel: "web" | "mobile" | "google_chat";
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
  citations?: MonaCitation[];
  actions?: MonaPendingAction[];
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
