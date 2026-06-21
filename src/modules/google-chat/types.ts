// ─── Google Chat Integration Types ───────────────────────────────────────────

export type ChatEventType =
  | "MESSAGE"
  | "ADDED_TO_SPACE"
  | "REMOVED_FROM_SPACE"
  | "CARD_CLICKED"
  | "SLASH_COMMAND"
  | "APP_HOME";

export type ChatSpaceType = "DM" | "ROOM" | "GROUP_CHAT" | "DIRECT_MESSAGE" | "SPACE";

export type ChatInteractionEvent = {
  type: ChatEventType;
  eventTime?: string;
  message?: ChatEventMessage;
  space?: ChatEventSpace;
  user?: ChatEventUser;
  action?: ChatEventAction;
  isAsyncResponse?: boolean;
  dialogEventType?: string;
  dialog?: unknown;
};

export type ChatEventMessage = {
  name: string;
  text?: string;
  sender?: ChatEventUser;
  space?: ChatEventSpace;
  thread?: { name: string; threadKey?: string };
  createTime?: string;
  slashCommand?: { commandId: string; commandName: string; type?: string };
  annotations?: unknown[];
  argumentText?: string;
};

export type ChatEventSpace = {
  name: string;
  displayName?: string;
  type?: string;
  spaceType?: string;
};

export type ChatEventUser = {
  name: string;
  displayName?: string;
  email?: string;
  type?: string;
};

export type ChatEventAction = {
  actionMethodName?: string;
  parameters?: { key: string; value: string }[];
};

// ─── Resolved identity for an inbound Chat event ─────────────────────────────

export type ResolvedChatIdentity =
  | {
      linked: true;
      userId: string;
      userName: string;
      orgId: string | undefined;
      permissions: string[];
      googleUserId: string;
      googleEmail: string | undefined;
      linkRecord: { id: string };
    }
  | {
      linked: false;
      googleUserId: string;
      googleEmail: string | undefined;
      googleDisplayName: string | undefined;
    };

// ─── Delivery target ─────────────────────────────────────────────────────────

export type DeliveryTarget =
  | { type: "dm"; googleUserId: string }
  | { type: "space"; spaceResourceName: string; threadKey?: string };

// ─── Notification routing result ─────────────────────────────────────────────

export type RoutingDecision = {
  deliver: boolean;
  targets: DeliveryTarget[];
  suppressReason?: string;
};

// ─── Command definitions ──────────────────────────────────────────────────────

export type CommandId =
  | "help"
  | "connect"
  | "status"
  | "tasks"
  | "approvals"
  | "search"
  | "link_job"
  | "unlink_job"
  | "subscribe"
  | "unsubscribe"
  | "summary"
  | "reset"
  | "privacy"
  | "feedback";

export const COMMAND_IDS: Record<string, CommandId> = {
  "/help": "help",
  "/connect": "connect",
  "/status": "status",
  "/tasks": "tasks",
  "/approvals": "approvals",
  "/search": "search",
  "/link-job": "link_job",
  "/unlink-job": "unlink_job",
  "/subscribe": "subscribe",
  "/unsubscribe": "unsubscribe",
  "/summary": "summary",
  "/reset": "reset",
  "/privacy": "privacy",
  "/feedback": "feedback",
};
