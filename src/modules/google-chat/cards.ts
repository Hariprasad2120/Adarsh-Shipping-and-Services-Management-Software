// ─── Google Chat Card Renderers ───────────────────────────────────────────────
// All renderers return cardsV2 arrays ready for the Chat API.

import type { ChatCard, ChatWidget } from "@/lib/google-chat-client";

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
const CYAN = { red: 0, green: 0.808, blue: 0.769, alpha: 1 };
const ORANGE = { red: 0.984, green: 0.573, blue: 0.235, alpha: 1 };
const RED = { red: 0.937, green: 0.267, blue: 0.267, alpha: 1 };
const GREY = { red: 0.42, green: 0.42, blue: 0.42, alpha: 1 };

// ─── Connect Account Card (no identity linked) ────────────────────────────────

export function buildConnectCard(params: {
  linkToken: string;
  googleDisplayName?: string;
}): ChatCard[] {
  const linkUrl = `${APP_URL}/google-chat-link?token=${params.linkToken}`;
  return [
    {
      cardId: "connect-card",
      card: {
        header: {
          title: "Monolith AI Assistant",
          subtitle: "Connect your account to get started",
          imageUrl: `${APP_URL}/favicon.ico`,
          imageType: "CIRCLE",
        },
        sections: [
          {
            header: "Connect Identity",
            widgets: [
              {
                decoratedText: {
                  topLabel: "Google Chat",
                  text: params.googleDisplayName
                    ? `Hi ${params.googleDisplayName}`
                    : "Hi there",
                  bottomLabel: "Link your Google Chat identity to Monolith Engine",
                  startIcon: { knownIcon: "PERSON" },
                },
              },
              { divider: {} },
              {
                textParagraph: {
                  text:
                    "*What you get:*\n• Permission-aware answers\n• Personal tasks, approvals, and alerts\n• Secure identity matching without sharing passwords",
                },
              },
            ],
          },
          {
            header: "Privacy",
            widgets: [
              {
                textParagraph: {
                  text:
                    "_Only you can authorise this connection. Your chat identity is linked securely, and you can disconnect later with `/connect`._",
                },
              },
            ],
          },
          {
            widgets: [
              {
                buttonList: {
                  buttons: [
                    {
                      text: "Connect Monolith Account",
                      color: CYAN,
                      onClick: { openLink: { url: linkUrl } },
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    },
  ];
}

// ─── Help Card ────────────────────────────────────────────────────────────────

export function buildHelpCard(userName: string): ChatCard[] {
  return [
    {
      cardId: "help-card",
      card: {
        header: {
          title: "Monolith AI Assistant",
          subtitle: `Logged in as ${userName}`,
          imageUrl: `${APP_URL}/favicon.ico`,
          imageType: "CIRCLE",
        },
        sections: [
          {
            header: "💬 Natural Language",
            widgets: [
              {
                textParagraph: {
                  text: "Ask anything in plain language:\n• _What tasks are due today?_\n• _Show my pending approvals_\n• _Search for employee Ravi Kumar_\n• _Summarize my notifications_",
                },
              },
            ],
          },
          {
            header: "⚡ Quick Commands",
            widgets: [
              {
                textParagraph: {
                  text: "`/tasks` — Pending tasks\n`/approvals` — Pending approvals\n`/status` — Connection health\n`/search <query>` — Search records\n`/link-job <number>` — Link this space to a job\n`/summary` — Context summary\n`/reset` — Reset conversation\n`/privacy` — Data & retention info\n`/connect` — Manage account link",
                },
              },
            ],
          },
          {
            widgets: [
              {
                buttonList: {
                  buttons: [
                    {
                      text: "Open Monolith",
                      color: CYAN,
                      onClick: { openLink: { url: APP_URL } },
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    },
  ];
}

// ─── Status Card ──────────────────────────────────────────────────────────────

export function buildStatusCard(params: {
  userName: string;
  googleEmail?: string;
  linkedAt?: Date;
  orgId?: string;
  spaceLinkedJob?: string | null;
}): ChatCard[] {
  return [
    {
      cardId: "status-card",
      card: {
        header: { title: "Monolith AI — Connection Status" },
        sections: [
          {
            header: "✅ Identity",
            widgets: [
              { decoratedText: { topLabel: "Monolith User", text: params.userName } },
              { decoratedText: { topLabel: "Google Account", text: params.googleEmail ?? "Workspace account" } },
              { decoratedText: { topLabel: "Linked Since", text: params.linkedAt?.toLocaleDateString("en-IN") ?? "–" } },
            ],
          },
          ...(params.spaceLinkedJob
            ? [
                {
                  header: "🔗 Space Context",
                  widgets: [
                    { decoratedText: { topLabel: "Linked Job/Project", text: params.spaceLinkedJob } } as ChatWidget,
                  ],
                },
              ]
            : []),
          {
            widgets: [
              {
                buttonList: {
                  buttons: [
                    {
                      text: "Open Monolith",
                      color: CYAN,
                      onClick: { openLink: { url: APP_URL } },
                    },
                    {
                      text: "Disconnect",
                      color: GREY,
                      onClick: {
                        action: {
                          function: "disconnect_account",
                          parameters: [],
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    },
  ];
}

// ─── Task List Card ───────────────────────────────────────────────────────────

export function buildTasksCard(params: {
  tasks: { title: string; dueDate: string; status: string; priority?: string }[];
  totalCount: number;
}): ChatCard[] {
  const widgets: ChatWidget[] = params.tasks.slice(0, 8).flatMap((t) => [
    {
      decoratedText: {
        topLabel: t.dueDate,
        text: t.title,
        bottomLabel: t.priority ? `Priority: ${t.priority}` : undefined,
        startIcon: { knownIcon: "CLOCK" },
      },
    } satisfies ChatWidget,
    { divider: {} } satisfies ChatWidget,
  ]);

  if (params.totalCount > 8) {
    widgets.push({
      textParagraph: {
        text: `_… and ${params.totalCount - 8} more tasks in Monolith_`,
      },
    });
  }

  return [
    {
      cardId: "tasks-card",
      card: {
        header: {
          title: `📋 Pending Tasks (${params.totalCount})`,
          subtitle: "Your active to-do items",
        },
        sections: [
          {
            widgets:
              params.tasks.length > 0
                ? widgets
                : [{ textParagraph: { text: "✅ No pending tasks. All clear!" } }],
          },
          {
            widgets: [
              {
                buttonList: {
                  buttons: [
                    {
                      text: "View All in Monolith",
                      color: CYAN,
                      onClick: { openLink: { url: `${APP_URL}/todo` } },
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    },
  ];
}

// ─── AI Response Card ─────────────────────────────────────────────────────────

export function buildAiResponseCard(params: {
  content: string;
  toolsUsed?: string[];
  hasMore?: boolean;
}): ChatCard[] {
  const widgets: ChatWidget[] = [
    { textParagraph: { text: params.content } },
  ];

  if (params.toolsUsed?.length) {
    widgets.push({ divider: {} });
    widgets.push({
      textParagraph: {
        text: `_ℹ️ Data retrieved using: ${params.toolsUsed.join(", ")}_`,
      },
    });
  }

  return [
    {
      cardId: "ai-response",
      card: {
        sections: [{ widgets }],
      },
    },
  ];
}

// ─── Error Card ───────────────────────────────────────────────────────────────

export function buildErrorCard(params: {
  title?: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
}): ChatCard[] {
  const widgets: ChatWidget[] = [
    { textParagraph: { text: params.message } },
  ];

  if (params.actionLabel && params.actionUrl) {
    widgets.push({
      buttonList: {
        buttons: [
          {
            text: params.actionLabel,
            color: CYAN,
            onClick: { openLink: { url: params.actionUrl } },
          },
        ],
      },
    });
  }

  return [
    {
      cardId: "error-card",
      card: {
        header: {
          title: params.title ?? "⚠️ Something went wrong",
        },
        sections: [{ widgets }],
      },
    },
  ];
}

// ─── Notification Card ────────────────────────────────────────────────────────

export function buildNotificationCard(params: {
  title: string;
  body?: string;
  kind: string;
  link?: string;
  priority?: string;
  requiresAck?: boolean;
  notificationId?: string;
}): ChatCard[] {
  const icon = params.priority === "critical" ? "⚠️" :
               params.priority === "high" ? "🔴" :
               params.priority === "normal" ? "🔔" : "ℹ️";

  const widgets: ChatWidget[] = [
    { textParagraph: { text: params.body ?? "No details provided." } },
  ];

  const buttons: ChatCard["card"]["sections"][0]["widgets"][0] = {
    buttonList: {
      buttons: [
        ...(params.link
          ? [{ text: "Open in Monolith", color: CYAN, onClick: { openLink: { url: `${APP_URL}${params.link}` } } }]
          : []),
        ...(params.requiresAck && params.notificationId
          ? [{
              text: "✓ Acknowledge",
              color: ORANGE,
              onClick: {
                action: {
                  function: "acknowledge_notification",
                  parameters: [{ key: "notificationId", value: params.notificationId }],
                },
              },
            }]
          : []),
      ],
    },
  };

  if ((buttons as { buttonList: { buttons: unknown[] } }).buttonList.buttons.length > 0) {
    widgets.push(buttons as ChatWidget);
  }

  return [
    {
      cardId: `notif-${params.notificationId ?? Date.now()}`,
      card: {
        header: { title: `${icon} ${params.title}` },
        sections: [{ widgets }],
      },
    },
  ];
}

// ─── Space Linked Card ────────────────────────────────────────────────────────

export function buildSpaceLinkedCard(params: {
  recordType: string;
  recordId: string;
  recordLabel: string;
  linkedBy: string;
}): ChatCard[] {
  return [
    {
      cardId: "space-linked",
      card: {
        header: {
          title: "✅ Space Linked",
          subtitle: `This space is now linked to a Monolith record`,
        },
        sections: [
          {
            widgets: [
              { decoratedText: { topLabel: "Record Type", text: params.recordType } },
              { decoratedText: { topLabel: "Reference", text: params.recordLabel } },
              { decoratedText: { topLabel: "Linked By", text: params.linkedBy } },
            ],
          },
          {
            widgets: [
              {
                textParagraph: {
                  text: "Notifications for this record will now be posted to this space. Use `/subscribe` to configure which events you want.",
                },
              },
            ],
          },
          {
            widgets: [
              {
                buttonList: {
                  buttons: [
                    {
                      text: "Open in Monolith",
                      color: CYAN,
                      onClick: { openLink: { url: `${APP_URL}` } },
                    },
                    {
                      text: "Unlink Space",
                      color: RED,
                      onClick: {
                        action: {
                          function: "unlink_space",
                          parameters: [],
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    },
  ];
}

// ─── Privacy Card ─────────────────────────────────────────────────────────────

export function buildPrivacyCard(): ChatCard[] {
  return [
    {
      cardId: "privacy-card",
      card: {
        header: { title: "🔒 Data & Privacy" },
        sections: [
          {
            widgets: [
              {
                textParagraph: {
                  text: "*What we store:*\n• Your Google account ID (for identity verification)\n• Conversation session metadata (not message content)\n• Notification delivery records\n• Space-to-record link configuration\n\n*What we do NOT store:*\n• Message content in Google Chat\n• Your Google password or tokens\n• Private conversation history beyond your session\n\n*Data retention:*\n• Session context expires after 30 minutes of inactivity\n• Delivery logs are kept for 90 days\n• Account link persists until you disconnect\n\nUse `/connect` to disconnect your account.",
                },
              },
            ],
          },
        ],
      },
    },
  ];
}

// ─── Processing card (sent immediately for async responses) ──────────────────

export function buildProcessingCard(): { text: string } {
  return { text: "⏳ Working on it — I'll reply in a moment..." };
}
