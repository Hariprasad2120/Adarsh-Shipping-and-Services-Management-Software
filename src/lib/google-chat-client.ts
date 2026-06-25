import { createSign } from "crypto";
import { getValidAccessToken } from "./workspace-oauth";
import { db } from "@/lib/db";

const SA_EMAIL = process.env.GOOGLE_CHAT_SA_EMAIL!;
const PRIVATE_KEY = (process.env.GOOGLE_CHAT_SA_PRIVATE_KEY ?? "").replace(
  /\\n/g,
  "\n"
);
const CHAT_API_BASE = "https://chat.googleapis.com/v1";
const SCOPES = [
  "https://www.googleapis.com/auth/chat.bot",
  "https://www.googleapis.com/auth/chat.app.spaces.create",
  "https://www.googleapis.com/auth/chat.app.spaces",
  "https://www.googleapis.com/auth/chat.app.memberships"
];
const SKIP_VERIFY =
  process.env.GOOGLE_CHAT_SKIP_AUTH_VERIFY === "true";

// ─── Token cache ──────────────────────────────────────────────────────────────
let cachedToken: { token: string; expiresAt: number } | null = null;

function base64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64url");
}

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
  sender?: { name: string; displayName: string; type: string; email?: string };
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

// ─── Helper: get a user or service account token ─────────────────────────────
async function resolveToken(userId?: string): Promise<string> {
  if (userId) {
    return getValidAccessToken(userId);
  }
  return getAccessToken();
}

// ─── Send Message ────────────────────────────────────────────────────────────
export async function sendMessage(params: {
  spaceResourceName: string;
  text?: string;
  cardsV2?: ChatCard[];
  threadKey?: string;
  threadResourceName?: string;
  messageId?: string;
  userId?: string;
}): Promise<ChatMessage> {
  const token = await resolveToken(params.userId);

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

// ─── Update Message ──────────────────────────────────────────────────────────
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

// ─── Get Space ───────────────────────────────────────────────────────────────
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

// ─── Create DM ───────────────────────────────────────────────────────────────
export async function createDmWithUser(
  googleUserResourceName: string,
  userId?: string
): Promise<{ name: string; spaceType: string }> {
  const token = await resolveToken(userId);

  // Try to find existing DM first
  const findRes = await fetch(
    `${CHAT_API_BASE}/spaces:findDirectMessage?name=${encodeURIComponent(googleUserResourceName)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (findRes.ok) {
    return findRes.json() as Promise<{ name: string; spaceType: string }>;
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

// ─── List Memberships ────────────────────────────────────────────────────────
export async function listMemberships(
  spaceResourceName: string,
  userId?: string
): Promise<{ memberships: { name: string; member?: { name: string; displayName?: string; type: string; email?: string }; role?: string }[] }> {
  const token = await resolveToken(userId);

  const res = await fetch(`${CHAT_API_BASE}/${spaceResourceName}/members?pageSize=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Chat API listMemberships failed (${res.status}): ${err}`);
  }

  return res.json() as Promise<{ memberships: { name: string; member?: { name: string; displayName?: string; type: string; email?: string }; role?: string }[] }>;
}

// ─── List Messages ───────────────────────────────────────────────────────────
export async function listMessages(
  spaceResourceName: string,
  userId?: string,
  pageSize = 50
): Promise<ChatMessage[]> {
  const token = await resolveToken(userId);

  // orderBy=createTime desc fetches the LATEST messages first.
  // Without this, the API returns oldest-first, and pageSize=50 would give
  // the first 50 messages from the space's history (potentially years old).
  const params = new URLSearchParams({
    pageSize: String(pageSize),
    orderBy: "createTime desc",
  });

  const res = await fetch(`${CHAT_API_BASE}/${spaceResourceName}/messages?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Chat API listMessages failed (${res.status}): ${err}`);
  }

  const data = (await res.json()) as { messages?: ChatMessage[] };
  const messages = data.messages || [];

  // Reverse to chronological order (oldest first → newest last) for display
  return messages.reverse();
}

// ─── List Spaces (all DMs + Spaces the user is a member of) ──────────────────
export async function listSpaces(
  userId: string
): Promise<{ name: string; displayName?: string; spaceType: string }[]> {
  const token = await getValidAccessToken(userId);

  const dbUser = await db.user.findUnique({
    where: { id: userId },
    select: { orgId: true }
  });
  const orgId = dbUser?.orgId || "";

  // Fetch the user's own Google identity for DM name resolution
  const connection = await db.googleWorkspaceConnection.findUnique({
    where: { userId },
    select: { googleUserId: true, googleEmail: true }
  });
  const myGoogleUserId = connection?.googleUserId;
  const myGoogleEmail = connection?.googleEmail?.toLowerCase();

  // Paginate through all spaces from Google Chat API
  const allApiSpaces: { name: string; displayName?: string; spaceType: string }[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${CHAT_API_BASE}/spaces`);
    url.searchParams.set("pageSize", "200");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Chat API listSpaces failed (${res.status}): ${err}`);
    }

    const data = (await res.json()) as { spaces?: { name: string; displayName?: string; spaceType: string }[]; nextPageToken?: string };
    if (data.spaces) {
      allApiSpaces.push(...data.spaces);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  // Build email/googleId lookup maps for DM name resolution
  const allUsers = await db.user.findMany({
    where: { orgId, active: true },
    select: { id: true, name: true, email: true }
  });
  const emailToUser = new Map<string, { id: string; name: string }>();
  for (const u of allUsers) {
    if (u.email && u.name) emailToUser.set(u.email.toLowerCase(), { id: u.id, name: u.name });
  }

  const connections = await db.googleWorkspaceConnection.findMany({
    select: { googleUserId: true, googleEmail: true, user: { select: { id: true, name: true, email: true } } }
  });
  const googleIdToUser = new Map<string, { id: string; name: string }>();
  for (const conn of connections) {
    if (conn.googleUserId && conn.user?.name) {
      googleIdToUser.set(conn.googleUserId, { id: conn.user.id, name: conn.user.name });
    }
    if (conn.googleEmail && conn.user?.name) {
      emailToUser.set(conn.googleEmail.toLowerCase(), { id: conn.user.id, name: conn.user.name });
    }
  }

  // Resolve DM display names — Google Chat API returns org profile name
  // (e.g. "Adarsh Operations") for all members on the same domain.
  // We must ALWAYS resolve DM names from our database, never trust the API value.
  const resolvedSpaces = await Promise.all(
    allApiSpaces.map(async (space) => {
      // For DMs, ALWAYS resolve the other member's real name
      if (space.spaceType === "DIRECT_MESSAGE") {
        try {
          const membersData = await listMemberships(space.name, userId);
          // Identify the "other" member by excluding the calling user by both googleUserId and email
          const otherMember = membersData.memberships?.find((m) => {
            if (!m.member) return false;
            if (myGoogleUserId && m.member.name === `users/${myGoogleUserId}`) return false;
            if (myGoogleEmail && m.member.email?.toLowerCase() === myGoogleEmail) return false;
            return true;
          });

          if (otherMember?.member) {
            const otherGoogleId = otherMember.member.name?.replace("users/", "");
            const otherEmail = otherMember.member.email?.toLowerCase();
            let resolvedName: string | undefined;
            let resolvedUserId: string | null = null;

            // Priority 1: Match by Google User ID → Monolith User
            if (otherGoogleId && googleIdToUser.has(otherGoogleId)) {
              const found = googleIdToUser.get(otherGoogleId)!;
              resolvedName = found.name;
              resolvedUserId = found.id;
            }
            // Priority 2: Match by email → Monolith User
            else if (otherEmail && emailToUser.has(otherEmail)) {
              const found = emailToUser.get(otherEmail)!;
              resolvedName = found.name;
              resolvedUserId = found.id;
            }
            // Priority 3: Use Google profile name only if it's NOT the org name
            else if (
              otherMember.member.displayName &&
              otherMember.member.displayName !== "Adarsh Operations" &&
              otherMember.member.displayName !== space.displayName
            ) {
              resolvedName = otherMember.member.displayName;
            }
            // Priority 4: Use email username as last resort
            else if (otherEmail) {
              resolvedName = otherEmail.split("@")[0].replace(/[._]/g, " ")
                .split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
            }

            if (resolvedName) {
              // Update cache with the correct name
              await db.googleChatSpace.upsert({
                where: { spaceResourceName: space.name },
                update: {
                  displayName: resolvedName,
                  spaceType: "DIRECT_MESSAGE",
                  linkedRecordType: resolvedUserId ? "User" : null,
                  linkedRecordId: resolvedUserId || otherGoogleId,
                  linkStatus: "active",
                  lastVerifiedAt: new Date()
                },
                create: {
                  orgId,
                  spaceResourceName: space.name,
                  displayName: resolvedName,
                  spaceType: "DIRECT_MESSAGE",
                  linkedRecordType: resolvedUserId ? "User" : null,
                  linkedRecordId: resolvedUserId || otherGoogleId,
                  linkStatus: "active",
                  lastVerifiedAt: new Date()
                }
              });

              return { ...space, displayName: resolvedName };
            }
          }
        } catch (err) {
          console.warn(`[GoogleChat] Failed to resolve DM name for ${space.name}:`, err);
          const badDisplayNames = new Set(["Adarsh Operations", "Google Chat DM", "Google User"]);
          try {
            const cached = await db.googleChatSpace.findUnique({
              where: { spaceResourceName: space.name },
              select: { displayName: true }
            });
            if (cached?.displayName && !badDisplayNames.has(cached.displayName)) {
              return { ...space, displayName: cached.displayName };
            }
          } catch { /* ignore cache lookup error */ }
        }

        // All resolution failed — try DB cache before falling back to a generic label
        try {
          const cached = await db.googleChatSpace.findUnique({
            where: { spaceResourceName: space.name },
            select: { displayName: true }
          });
          const badDisplayNames = new Set(["Adarsh Operations", "Google Chat DM", "Google User"]);
          if (cached?.displayName && !badDisplayNames.has(cached.displayName)) {
            return { ...space, displayName: cached.displayName };
          }
        } catch { /* ignore cache lookup error */ }

        if (space.displayName === "Adarsh Operations") {
          return { ...space, displayName: "Google Chat DM" };
        }
      }

      // For non-DM spaces, cache in DB
      if (space.name && space.spaceType !== "DIRECT_MESSAGE") {
        await db.googleChatSpace.upsert({
          where: { spaceResourceName: space.name },
          update: {
            displayName: space.displayName || null,
            spaceType: space.spaceType,
            linkStatus: "active",
            lastVerifiedAt: new Date()
          },
          create: {
            orgId,
            spaceResourceName: space.name,
            displayName: space.displayName || null,
            spaceType: space.spaceType,
            linkStatus: "active",
            lastVerifiedAt: new Date()
          }
        });
      }

      return space;
    })
  );

  return resolvedSpaces;
}

// ─── Create Space ────────────────────────────────────────────────────────────
export async function createSpace(params: {
  displayName: string;
  spaceType?: string;
  userId?: string;
}): Promise<{ name: string; displayName?: string; spaceType: string }> {
  const token = await resolveToken(params.userId);

  const res = await fetch(`${CHAT_API_BASE}/spaces`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      displayName: params.displayName,
      spaceType: params.spaceType || "SPACE"
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Chat API createSpace failed (${res.status}): ${err}`);
  }

  return res.json() as Promise<{ name: string; displayName?: string; spaceType: string }>;
}

// ─── Create Membership ───────────────────────────────────────────────────────
export async function createMembership(params: {
  spaceResourceName: string;
  googleUserId: string;
  userId?: string;
}): Promise<{ name: string; state: string }> {
  const token = await resolveToken(params.userId);

  const res = await fetch(`${CHAT_API_BASE}/${params.spaceResourceName}/members`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      member: {
        name: `users/${params.googleUserId}`,
        type: "HUMAN"
      }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Chat API createMembership failed (${res.status}): ${err}`);
  }

  return res.json() as Promise<{ name: string; state: string }>;
}

// ─── Delete Membership ───────────────────────────────────────────────────────
export async function deleteMembership(params: {
  spaceResourceName: string;
  memberResourceName: string;
  userId?: string;
}): Promise<{ name: string }> {
  const token = await resolveToken(params.userId);

  const res = await fetch(`${CHAT_API_BASE}/${params.memberResourceName}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Chat API deleteMembership failed (${res.status}): ${err}`);
  }

  return res.json() as Promise<{ name: string }>;
}

// ─── Update Space ────────────────────────────────────────────────────────────
export async function updateSpace(params: {
  spaceResourceName: string;
  spaceBody: Record<string, unknown>;
  updateMask: string;
  userId?: string;
}): Promise<{ name: string; displayName?: string; spaceType?: string }> {
  const token = await resolveToken(params.userId);

  const res = await fetch(`${CHAT_API_BASE}/${params.spaceResourceName}?updateMask=${params.updateMask}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(params.spaceBody)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Chat API updateSpace failed (${res.status}): ${err}`);
  }

  return res.json() as Promise<{ name: string; displayName?: string; spaceType?: string }>;
}
