import { createSign } from "crypto";

const SA_EMAIL = process.env.GOOGLE_CHAT_SA_EMAIL!;
const PRIVATE_KEY = (process.env.GOOGLE_CHAT_SA_PRIVATE_KEY ?? "").replace(
  /\\n/g,
  "\n"
);
const CHAT_API_BASE = "https://chat.googleapis.com/v1";
const SCOPES = ["https://www.googleapis.com/auth/chat.bot"];
const SKIP_VERIFY =
  process.env.GOOGLE_CHAT_SKIP_AUTH_VERIFY === "true";

// ─── Token cache ──────────────────────────────────────────────────────────────
let cachedToken: { token: string; expiresAt: number } | null = null;

function base64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64url");
}

// Simple in-memory storage for mock messages in development mode
const mockMessagesStore: Record<string, ChatMessage[]> = {};

export async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return cachedToken.token;
  }

  if (!SA_EMAIL || !PRIVATE_KEY) {
    throw new Error(
      "Google Chat service account credentials not configured. " +
        "Set GOOGLE_CHAT_SA_EMAIL and GOOGLE_CHAT_SA_PRIVATE_KEY."
    );
  }

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: SA_EMAIL,
    scope: SCOPES.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const toSign = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

  const sign = createSign("RSA-SHA256");
  sign.update(toSign);
  const signature = sign.sign(PRIVATE_KEY).toString("base64url");
  const jwt = `${toSign}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google OAuth token exchange failed: ${err}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = { token: data.access_token, expiresAt: now + data.expires_in };
  return data.access_token;
}

// ─── Webhook bearer-token verification ───────────────────────────────────────

export async function verifyWebhookToken(bearerToken: string): Promise<{
  valid: boolean;
  googleUserId?: string;
  email?: string;
}> {
  if (SKIP_VERIFY) return { valid: true };

  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${bearerToken}`
    );
    if (!res.ok) return { valid: false };

    const info = (await res.json()) as {
      iss?: string;
      aud?: string;
      sub?: string;
      email?: string;
      exp?: string;
    };

    const now = Math.floor(Date.now() / 1000);
    if (info.exp && parseInt(info.exp) < now) return { valid: false };

    const validIssuers = [
      "chat@system.gserviceaccount.com",
      "https://accounts.google.com",
      "accounts.google.com",
    ];
    if (!info.iss || !validIssuers.includes(info.iss)) {
      console.warn("[GoogleChat] Invalid token issuer:", info.iss);
      return { valid: false };
    }

    return { valid: true, googleUserId: info.sub, email: info.email };
  } catch (err) {
    console.error("[GoogleChat] Token verification failed:", err);
    return { valid: false };
  }
}

// ─── Chat API helpers ─────────────────────────────────────────────────────────

export type ChatMessage = {
  name?: string;
  text?: string;
  cardsV2?: unknown[];
  thread?: { name?: string; threadKey?: string };
  sender?: { name: string; displayName: string; type: string };
  createTime?: string;
};

export type ChatCard = {
  cardId: string;
  card: {
    header?: {
      title: string;
      subtitle?: string;
      imageUrl?: string;
      imageType?: "CIRCLE" | "SQUARE";
    };
    sections: ChatCardSection[];
  };
};

export type ChatCardSection = {
  header?: string;
  collapsible?: boolean;
  widgets: ChatWidget[];
};

export type ChatWidget =
  | { textParagraph: { text: string } }
  | { decoratedText: { topLabel?: string; text: string; bottomLabel?: string; startIcon?: { knownIcon: string }; button?: ChatButton } }
  | { buttonList: { buttons: ChatButton[] } }
  | { divider: Record<string, never> }
  | { columns: { columnItems: unknown[] } };

export type ChatButton = {
  text: string;
  color?: { red: number; green: number; blue: number; alpha: number };
  onClick: {
    action?: { function: string; parameters?: { key: string; value: string }[] };
    openLink?: { url: string };
  };
};

export async function sendMessage(params: {
  spaceResourceName: string;
  text?: string;
  cardsV2?: ChatCard[];
  threadKey?: string;
  threadResourceName?: string;
  messageId?: string;
}): Promise<ChatMessage> {
  if (
    process.env.NODE_ENV === "development" &&
    (params.spaceResourceName.includes("mock-") || !SA_EMAIL || !PRIVATE_KEY)
  ) {
    const newMessage: ChatMessage = {
      name: `${params.spaceResourceName}/messages/mock-msg-${Date.now()}`,
      sender: {
        name: "users/current-user",
        displayName: "You (Dev)",
        type: "HUMAN"
      },
      text: params.text || "",
      createTime: new Date().toISOString()
    };

    if (!mockMessagesStore[params.spaceResourceName]) {
      mockMessagesStore[params.spaceResourceName] = [];
    }
    mockMessagesStore[params.spaceResourceName].push(newMessage);

    // Simulate bot response after a brief delay for realistic interaction
    setTimeout(() => {
      if (mockMessagesStore[params.spaceResourceName]) {
        mockMessagesStore[params.spaceResourceName].push({
          name: `${params.spaceResourceName}/messages/mock-reply-${Date.now()}`,
          sender: {
            name: "users/mock-bot",
            displayName: "Workspace Bot",
            type: "BOT"
          },
          text: `[Mock Bot] Message received. In development mode, actions are simulated.`,
          createTime: new Date().toISOString()
        });
      }
    }, 1000);

    return newMessage;
  }

  const token = await getAccessToken();

  const body: Record<string, unknown> = {};
  if (params.text) body.text = params.text;
  if (params.cardsV2?.length) body.cardsV2 = params.cardsV2;

  if (params.threadKey) {
    body.thread = { threadKey: params.threadKey };
  } else if (params.threadResourceName) {
    body.thread = { name: params.threadResourceName };
  }

  const url = new URL(
    `${CHAT_API_BASE}/${params.spaceResourceName}/messages`
  );
  if (params.messageId) url.searchParams.set("messageId", params.messageId);
  if (params.threadKey || params.threadResourceName) {
    url.searchParams.set("messageReplyOption", "REPLY_MESSAGE_OR_FAIL");
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Chat API sendMessage failed (${res.status}): ${err}`);
  }

  return res.json() as Promise<ChatMessage>;
}

export async function updateMessage(params: {
  messageName: string;
  text?: string;
  cardsV2?: ChatCard[];
}): Promise<ChatMessage> {
  const token = await getAccessToken();

  const body: Record<string, unknown> = {};
  const updateMask: string[] = [];
  if (params.text !== undefined) {
    body.text = params.text;
    updateMask.push("text");
  }
  if (params.cardsV2 !== undefined) {
    body.cardsV2 = params.cardsV2;
    updateMask.push("cardsV2");
  }

  const res = await fetch(
    `${CHAT_API_BASE}/${params.messageName}?updateMask=${updateMask.join(",")}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Chat API updateMessage failed (${res.status}): ${err}`);
  }

  return res.json() as Promise<ChatMessage>;
}

export async function getSpace(
  spaceResourceName: string
): Promise<{ name: string; displayName: string; spaceType: string }> {
  const token = await getAccessToken();

  const res = await fetch(`${CHAT_API_BASE}/${spaceResourceName}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Chat API getSpace failed (${res.status}): ${err}`);
  }

  return res.json() as Promise<{ name: string; displayName: string; spaceType: string }>;
}

export async function createDmWithUser(googleUserResourceName: string): Promise<{
  name: string;
  spaceType: string;
}> {
  if (
    process.env.NODE_ENV === "development" &&
    (!SA_EMAIL || !PRIVATE_KEY || googleUserResourceName.includes("mock"))
  ) {
    return {
      name: `spaces/mock-dm-${googleUserResourceName.replace("users/", "")}`,
      spaceType: "DIRECT_MESSAGE"
    };
  }

  const token = await getAccessToken();

  const res = await fetch(`${CHAT_API_BASE}/spaces:findDirectMessage?name=${encodeURIComponent(googleUserResourceName)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.ok) {
    return res.json() as Promise<{ name: string; spaceType: string }>;
  }

  // Create DM if it doesn't exist
  const createRes = await fetch(`${CHAT_API_BASE}/spaces:setup`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      space: { spaceType: "DIRECT_MESSAGE" },
      memberships: [{ member: { name: googleUserResourceName, type: "HUMAN" } }],
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Chat API createDM failed (${createRes.status}): ${err}`);
  }

  return createRes.json() as Promise<{ name: string; spaceType: string }>;
}

export async function listMemberships(
  spaceResourceName: string
): Promise<{ memberships: { name: string; member?: { name: string; type: string } }[] }> {
  const token = await getAccessToken();

  const res = await fetch(`${CHAT_API_BASE}/${spaceResourceName}/members?pageSize=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Chat API listMemberships failed (${res.status}): ${err}`);
  }

  return res.json() as Promise<{ memberships: { name: string; member?: { name: string; type: string } }[] }>;
}

// List messages in a space
export async function listMessages(
  spaceResourceName: string,
  pageSize = 50
): Promise<ChatMessage[]> {
  if (
    process.env.NODE_ENV === "development" &&
    (spaceResourceName.includes("mock-") || !SA_EMAIL || !PRIVATE_KEY)
  ) {
    if (!mockMessagesStore[spaceResourceName]) {
      mockMessagesStore[spaceResourceName] = [
        {
          name: `${spaceResourceName}/messages/mock-msg-1`,
          sender: {
            name: "users/mock-user-1",
            displayName: "System Bot",
            type: "BOT"
          },
          text: `🚀 *Job Space Provisioned*\n\nWelcome to the communication space. Drive folder and workspace structure have been initialized.`,
          createTime: new Date(Date.now() - 3600000).toISOString()
        },
        {
          name: `${spaceResourceName}/messages/mock-msg-2`,
          sender: {
            name: "users/mock-user-2",
            displayName: "Adarsh Operations",
            type: "HUMAN"
          },
          text: "Hi team, I have uploaded the draft Bill of Lading to folder '02 Job Documents'. Please review.",
          createTime: new Date(Date.now() - 1800000).toISOString()
        }
      ];
    }
    return mockMessagesStore[spaceResourceName];
  }

  const token = await getAccessToken();

  const res = await fetch(`${CHAT_API_BASE}/${spaceResourceName}/messages?pageSize=${pageSize}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Chat API listMessages failed (${res.status}): ${err}`);
  }

  const data = (await res.json()) as { messages?: ChatMessage[] };
  return data.messages || [];
}
