// ─── Monolith AI Gateway — channel-neutral wrapper ───────────────────────────
// Routes chat requests through the existing chatWithMona() orchestrator.
// Adds Google Chat channel context without touching the core AI logic.

import { buildMonaContext } from "@/modules/mona/context";
import { chatWithMona, clearConversation } from "@/modules/mona/service";

export type GatewayRequest = {
  userId: string;
  userName: string;
  orgId: string | undefined;
  permissions: string[];
  isAdmin: boolean;
  message: string;
  sessionId: string;
  channel: "web" | "google_chat";
  spaceResourceName?: string;
  spaceLinkedRecordType?: string | null;
  spaceLinkedRecordId?: string | null;
};

export type GatewayResponse = {
  content: string;
  toolsUsed: string[];
};

export async function processMessage(req: GatewayRequest): Promise<GatewayResponse> {
  const ctx = await buildMonaContext({
    userId: req.userId,
    userName: req.userName,
    orgId: req.orgId,
    currentPath: req.spaceLinkedRecordId
      ? `/google-chat/${req.spaceLinkedRecordType}/${req.spaceLinkedRecordId}`
      : "/google-chat",
    permissions: req.permissions,
    isAdmin: req.isAdmin,
    channel: "google_chat",
  });

  const sessionKey = req.channel === "google_chat"
    ? `gchat:${req.spaceResourceName ?? "dm"}:${req.userId}`
    : req.sessionId;

  return chatWithMona(ctx, req.message, sessionKey);
}

export async function resetSession(params: {
  userId: string;
  channel: "web" | "google_chat";
  spaceResourceName?: string;
}): Promise<void> {
  const sessionKey = params.channel === "google_chat"
    ? `gchat:${params.spaceResourceName ?? "dm"}:${params.userId}`
    : `${params.userId}:reset`;
  await clearConversation(params.userId, sessionKey, params.channel);
}
