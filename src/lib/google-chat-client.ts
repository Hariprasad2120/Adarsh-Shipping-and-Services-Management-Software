import { createSign } from "crypto";
import { getValidAccessToken } from "./workspace-oauth";
import { db } from "@/lib/db";

const SA_EMAIL = process.env.GOOGLE_CHAT_SA_EMAIL!;
const PRIVATE_KEY = (process.env.GOOGLE_CHAT_SA_PRIVATE_KEY ?? "").replace(
  /\\n/g,
  "\n"
);
const CHAT_API_BASE = "https://chat.googleapis.com/v1";
const CHAT_DELETE_AUTH_MODE =
  (process.env.GOOGLE_CHAT_DELETE_AUTH_MODE ?? "admin_oauth").toLowerCase();
const GOOGLE_CHAT_ADMIN_USE_ADMIN_ACCESS =
  process.env.GOOGLE_CHAT_ADMIN_USE_ADMIN_ACCESS !== "false";
const SCOPES = [
  "https://www.googleapis.com/auth/chat.bot",
  "https://www.googleapis.com/auth/chat.app.spaces.create",
  "https://www.googleapis.com/auth/chat.app.spaces",
  "https://www.googleapis.com/auth/chat.app.memberships",
  "https://www.googleapis.com/auth/chat.app.delete"
];
const SKIP_VERIFY =
  process.env.GOOGLE_CHAT_SKIP_AUTH_VERIFY === "true";

// ─── Admin SDK Directory lookup (domain-wide delegation) ─────────────────────
// Resolves a Chat `users/<id>` resource to a real Workspace name/email for
// members who have never done the app's own Google OAuth connect flow.
// Requires the service account (GOOGLE_CHAT_SA_EMAIL) to have domain-wide
// delegation configured in the Workspace Admin console, authorized for scope
// `admin.directory.user.readonly`, and GOOGLE_WORKSPACE_ADMIN_IMPERSONATE_EMAIL
// set to a super-admin (or delegated-admin) mailbox in the domain — Admin SDK
// only accepts requests impersonating an admin via the `sub` JWT claim, it
// does not work with the bare service-account identity.
const ADMIN_DIRECTORY_SCOPE = "https://www.googleapis.com/auth/admin.directory.user.readonly";
const ADMIN_IMPERSONATE_EMAIL = process.env.GOOGLE_WORKSPACE_ADMIN_IMPERSONATE_EMAIL ?? "";

const GENERIC_CHAT_DISPLAY_NAMES = new Set([
  "Adarsh Operations",
  "adarsh operations",
  "ADARSH OPERATIONS",
  "Adarsh Shipping",
  "adarsh shipping",
  "Google Chat DM",
  "Google User",
  "Direct message",
  "Chat Member",
]);

export function isGenericChatDisplayName(value?: string | null): boolean {
  return !value || GENERIC_CHAT_DISPLAY_NAMES.has(value.trim());
}

function normalizeGoogleChatUserKey(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("users/") ? trimmed.slice("users/".length) : trimmed;
}

export function isCurrentGoogleChatUser(params: {
  memberName?: string | null;
  memberEmail?: string | null;
  googleUserId?: string | null;
  googleEmail?: string | null;
  userEmail?: string | null;
}): boolean {
  const normalizedMemberName = normalizeGoogleChatUserKey(params.memberName)?.toLowerCase() || null;
  const normalizedMemberEmail = params.memberEmail?.trim().toLowerCase() || null;
  const normalizedGoogleUserId = params.googleUserId?.trim().toLowerCase() || null;
  const normalizedGoogleEmail = params.googleEmail?.trim().toLowerCase() || null;
  const normalizedUserEmail = params.userEmail?.trim().toLowerCase() || null;

  if (normalizedMemberName === "me" || normalizedMemberName === "current-user") {
    return true;
  }

  const candidateNames = new Set(
    [
      normalizedGoogleUserId,
      normalizedGoogleEmail,
      normalizedUserEmail,
    ].filter(Boolean) as string[],
  );

  if (normalizedMemberName && candidateNames.has(normalizedMemberName)) {
    return true;
  }

  if (
    normalizedMemberEmail &&
    [normalizedGoogleEmail, normalizedUserEmail].filter(Boolean).includes(normalizedMemberEmail)
  ) {
    return true;
  }

  return false;
}

function humanizeEmailLocalPart(email: string): string {
  return email
    .split("@")[0]
    .replace(/[._]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

type ResolvedGooglePerson = {
  name: string | null;
  email: string | null;
  userId: string | null;
  googleUserId: string | null;
};

// ─── Identity resolution cache ────────────────────────────────────────────────
// Avoids re-hitting DB + Google APIs for the same googleUserId on every
// /chat/list, /check-new, /messages and SSE poll.
const RESOLVED_TTL_MS = 5 * 60 * 1000; // 5 min for a resolved identity
const UNRESOLVED_TTL_MS = 60 * 1000; // 1 min for an unresolved identity — retry sooner
const identityCache = new Map<string, { value: ResolvedGooglePerson; expiresAt: number }>();

function getCachedIdentity(googleUserId: string): ResolvedGooglePerson | null {
  const entry = identityCache.get(googleUserId);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    identityCache.delete(googleUserId);
    return null;
  }
  return entry.value;
}

function setCachedIdentity(googleUserId: string, value: ResolvedGooglePerson): void {
  const ttl = value.name ? RESOLVED_TTL_MS : UNRESOLVED_TTL_MS;
  identityCache.set(googleUserId, { value, expiresAt: Date.now() + ttl });
}

// Throttle the noisy "unresolved identity" warning to once per TTL window per user.
const unresolvedWarnedAt = new Map<string, number>();
function shouldLogUnresolved(googleUserId: string): boolean {
  const last = unresolvedWarnedAt.get(googleUserId);
  const now = Date.now();
  if (last && now - last < UNRESOLVED_TTL_MS) return false;
  unresolvedWarnedAt.set(googleUserId, now);
  return true;
}

// People API resourceName for a Workspace directory profile shares the same
// numeric ID as the Chat `users/<id>` resource for members on the same domain.
// NOTE: this must be the People API (`people.googleapis.com`), not the Admin
// SDK Directory API (`admin.googleapis.com`) — the app's OAuth scopes are
// `contacts.readonly` / `directory.readonly`, which are People API scopes and
// do NOT grant Admin SDK access (that requires `admin.directory.user.readonly`
// plus domain-admin privileges). Calling the Admin SDK endpoint here always
// returned 403 and was silently swallowed, which is why names never resolved.
async function fetchPeopleDirectoryProfile(
  token: string,
  googleUserId: string,
): Promise<{ name: string | null; email: string | null } | null> {
  try {
    const res = await fetch(
      `https://people.googleapis.com/v1/people/${encodeURIComponent(googleUserId)}?personFields=names,emailAddresses`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      names?: { displayName?: string; metadata?: { primary?: boolean } }[];
      emailAddresses?: { value?: string; metadata?: { primary?: boolean } }[];
    };

    const name =
      data.names?.find((n) => n.metadata?.primary)?.displayName ||
      data.names?.[0]?.displayName ||
      null;
    const email =
      data.emailAddresses?.find((e) => e.metadata?.primary)?.value ||
      data.emailAddresses?.[0]?.value ||
      null;

    if (!name && !email) return null;
    return { name, email: email?.toLowerCase() || null };
  } catch {
    return null;
  }
}

// Admin SDK Directory lookup via domain-wide delegation — resolves ANY
// Workspace member by Google user ID, including members who have never
// completed the app's own OAuth connect flow. Returns null (not throw) if
// domain-wide delegation isn't configured, so callers can fall through to
// the People API instead.
async function fetchAdminDirectoryProfile(
  googleUserId: string,
): Promise<{ name: string | null; email: string | null } | null> {
  try {
    const token = await getAdminDirectoryAccessToken();
    if (!token) return null;

    const res = await fetch(
      `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(googleUserId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      primaryEmail?: string;
      name?: { fullName?: string };
    };

    if (!data.name?.fullName && !data.primaryEmail) return null;
    return {
      name: data.name?.fullName || null,
      email: data.primaryEmail?.toLowerCase() || null,
    };
  } catch {
    return null;
  }
}

export async function resolveGoogleWorkspacePerson(params: {
  actorUserId: string;
  googleUserId?: string | null;
  email?: string | null;
  displayName?: string | null;
  orgId?: string | null;
}): Promise<ResolvedGooglePerson> {
  const rawGoogleUserId = normalizeGoogleChatUserKey(params.googleUserId);
  const cached = rawGoogleUserId ? getCachedIdentity(rawGoogleUserId) : null;
  if (cached) return cached;
  const normalizedGoogleUserId = rawGoogleUserId?.trim() || null;
  const normalizedEmail =
    params.email?.trim().toLowerCase() ||
    (normalizedGoogleUserId?.includes("@") ? normalizedGoogleUserId.toLowerCase() : null);
  const normalizedDisplayName = params.displayName?.trim() || null;

  const finish = (result: ResolvedGooglePerson): ResolvedGooglePerson => {
    if (normalizedGoogleUserId) setCachedIdentity(normalizedGoogleUserId, result);
    return result;
  };

  const connection = await db.googleWorkspaceConnection.findFirst({
    where: {
      OR: [
        normalizedGoogleUserId ? { googleUserId: normalizedGoogleUserId } : undefined,
        normalizedEmail ? { googleEmail: normalizedEmail } : undefined,
      ].filter(Boolean) as { googleUserId?: string; googleEmail?: string }[],
    },
    select: {
      googleUserId: true,
      googleEmail: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (connection?.user?.name) {
    return finish({
      name: connection.user.name,
      email: connection.user.email || connection.googleEmail || normalizedEmail,
      userId: connection.user.id,
      googleUserId: connection.googleUserId || normalizedGoogleUserId,
    });
  }

  if (normalizedEmail) {
    const localUser = await db.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: "insensitive" },
        ...(params.orgId ? { orgId: params.orgId } : {}),
      },
      select: { id: true, name: true, email: true },
    });
    if (localUser?.name) {
      return finish({
        name: localUser.name,
        email: localUser.email,
        userId: localUser.id,
        googleUserId: normalizedGoogleUserId,
      });
    }
  }

  if (normalizedDisplayName && !isGenericChatDisplayName(normalizedDisplayName)) {
    return finish({
      name: normalizedDisplayName,
      email: normalizedEmail,
      userId: null,
      googleUserId: normalizedGoogleUserId,
    });
  }

  // Member/message resolution above found nothing local. Fall back to the
  // Workspace directory: Admin SDK (domain-wide delegation) first — resolves
  // ANY member, not just ones who OAuth-connected — then People API as a
  // secondary path if DWD isn't configured.
  if (normalizedGoogleUserId) {
    try {
      const profile =
        (await fetchAdminDirectoryProfile(normalizedGoogleUserId)) ??
        (await fetchPeopleDirectoryProfile(
          await getValidAccessToken(params.actorUserId),
          normalizedGoogleUserId,
        ));
      if (profile?.name) {
        const directoryEmail = profile.email || normalizedEmail;
        let localUser: { id: string; name: string; email: string } | null = null;

        if (directoryEmail) {
          localUser = await db.user.findFirst({
            where: {
              email: { equals: directoryEmail, mode: "insensitive" },
              ...(params.orgId ? { orgId: params.orgId } : {}),
            },
            select: { id: true, name: true, email: true },
          });
        }

        return finish({
          name: localUser?.name || profile.name,
          email: localUser?.email || directoryEmail,
          userId: localUser?.id || null,
          googleUserId: normalizedGoogleUserId,
        });
      }
    } catch {
      // Ignore directory lookup errors and continue through lower-confidence fallbacks.
    }
  }

  if (normalizedEmail) {
    return finish({
      name: humanizeEmailLocalPart(normalizedEmail),
      email: normalizedEmail,
      userId: null,
      googleUserId: normalizedGoogleUserId,
    });
  }

  return finish({
    name: null,
    email: normalizedEmail,
    userId: null,
    googleUserId: normalizedGoogleUserId,
  });
}

// ─── Token cache ──────────────────────────────────────────────────────────────
let cachedToken: { token: string; expiresAt: number } | null = null;
let cachedAdminDirectoryToken: { token: string; expiresAt: number } | null = null;

function base64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64url");
}

// Mints a service-account access token via the JWT-bearer flow. Pass
// `subject` to impersonate a Workspace user — required for domain-wide
// delegation (Admin SDK); omit it for the service account's own identity
// (Chat bot API calls).
async function mintServiceAccountToken(scope: string, subject?: string): Promise<{
  token: string;
  expiresIn: number;
}> {
  if (!SA_EMAIL || !PRIVATE_KEY) {
    throw new Error(
      "Google Chat service account credentials not configured. " +
        "Set GOOGLE_CHAT_SA_EMAIL and GOOGLE_CHAT_SA_PRIVATE_KEY."
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload: Record<string, unknown> = {
    iss: SA_EMAIL,
    scope,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  if (subject) payload.sub = subject;

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

  const data = (await res.json()) as { access_token: string; expires_in: number };
  return { token: data.access_token, expiresIn: data.expires_in };
}

export async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return cachedToken.token;
  }

  const { token, expiresIn } = await mintServiceAccountToken(SCOPES.join(" "));
  cachedToken = { token, expiresAt: now + expiresIn };
  return token;
}

// Domain-wide-delegated token impersonating GOOGLE_WORKSPACE_ADMIN_IMPERSONATE_EMAIL,
// scoped only to read-only Directory access. Returns null if impersonation
// isn't configured — callers must treat that as "feature unavailable", not fail.
async function getAdminDirectoryAccessToken(): Promise<string | null> {
  if (!ADMIN_IMPERSONATE_EMAIL) return null;

  const now = Math.floor(Date.now() / 1000);
  if (cachedAdminDirectoryToken && cachedAdminDirectoryToken.expiresAt > now + 60) {
    return cachedAdminDirectoryToken.token;
  }

  const { token, expiresIn } = await mintServiceAccountToken(
    ADMIN_DIRECTORY_SCOPE,
    ADMIN_IMPERSONATE_EMAIL,
  );
  cachedAdminDirectoryToken = { token, expiresAt: now + expiresIn };
  return token;
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

export type ChatAttachment = {
  name?: string;
  contentName?: string;
  contentType?: string;
  thumbnailUri?: string;
  downloadUri?: string;
  source?: string;
  attachmentDataRef?: { resourceName?: string };
  driveDataRef?: { driveFileId?: string };
};

export type ChatMessage = {
  name?: string;
  text?: string;
  cardsV2?: unknown[];
  attachment?: ChatAttachment[];
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

export type GoogleChatDeleteAuthMode = "user_oauth" | "admin_oauth" | "app_auth";

export type DeleteGoogleChatSpaceOptions = {
  authMode?: GoogleChatDeleteAuthMode;
  useAdminAccess?: boolean;
  userId?: string;
};

export type DeleteGoogleChatSpaceResult = {
  authMode: GoogleChatDeleteAuthMode;
  status: "deleted" | "missing";
  useAdminAccess: boolean;
};

export class GoogleChatDeleteError extends Error {
  status: number;
  authMode: GoogleChatDeleteAuthMode;
  googleCode?: number;
  googleMessage?: string;

  constructor(params: {
    authMode: GoogleChatDeleteAuthMode;
    status: number;
    message: string;
    googleCode?: number;
    googleMessage?: string;
  }) {
    super(params.message);
    this.name = "GoogleChatDeleteError";
    this.status = params.status;
    this.authMode = params.authMode;
    this.googleCode = params.googleCode;
    this.googleMessage = params.googleMessage;
  }
}

function resolveDeleteAuthMode(mode?: string): GoogleChatDeleteAuthMode {
  if (mode === "user_oauth" || mode === "admin_oauth" || mode === "app_auth") {
    return mode;
  }
  return "admin_oauth";
}

async function resolveDeleteToken(options: {
  authMode: GoogleChatDeleteAuthMode;
  userId?: string;
}): Promise<string> {
  if (options.authMode === "app_auth") {
    return getAccessToken();
  }
  if (!options.userId) {
    throw new Error(`Google Chat delete with ${options.authMode} requires a connected userId.`);
  }
  return getValidAccessToken(options.userId);
}

async function buildDeleteError(
  res: Response,
  authMode: GoogleChatDeleteAuthMode,
): Promise<GoogleChatDeleteError> {
  const raw = await res.text();
  let googleCode: number | undefined;
  let googleMessage: string | undefined;
  let message = raw || `Google Chat delete failed with status ${res.status}.`;

  try {
    const parsed = JSON.parse(raw) as {
      error?: { code?: number; message?: string; status?: string };
    };
    googleCode = parsed.error?.code;
    googleMessage = parsed.error?.message;
    if (parsed.error?.message) {
      message = parsed.error.message;
    }
  } catch {
    // Keep raw text message when Google does not return JSON.
  }

  return new GoogleChatDeleteError({
    authMode,
    status: res.status,
    message,
    googleCode,
    googleMessage,
  });
}

export async function deleteGoogleChatSpace(
  spaceName: string,
  options?: DeleteGoogleChatSpaceOptions,
): Promise<DeleteGoogleChatSpaceResult> {
  const authMode = resolveDeleteAuthMode(options?.authMode ?? CHAT_DELETE_AUTH_MODE);
  const useAdminAccess =
    options?.useAdminAccess ??
    (authMode === "admin_oauth" ? GOOGLE_CHAT_ADMIN_USE_ADMIN_ACCESS : false);
  const token = await resolveDeleteToken({ authMode, userId: options?.userId });

  const url = new URL(`${CHAT_API_BASE}/${spaceName}`);
  if (useAdminAccess) {
    url.searchParams.set("useAdminAccess", "true");
  }

  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) {
    return { authMode, status: "missing", useAdminAccess };
  }

  if (!res.ok) {
    throw await buildDeleteError(res, authMode);
  }

  return { authMode, status: "deleted", useAdminAccess };
}

export async function deleteSpace(spaceResourceName: string): Promise<void> {
  await deleteGoogleChatSpace(spaceResourceName, { authMode: "app_auth" });
}

export async function deleteSpaceWithAdminAccess(params: {
  spaceResourceName: string;
  userId: string;
}): Promise<void> {
  await deleteGoogleChatSpace(params.spaceResourceName, {
    authMode: "admin_oauth",
    useAdminAccess: true,
    userId: params.userId,
  });
}

// ─── Space read state (real Chat API read receipts) ───────────────────────────
// Chat API only exposes a per-user "last read up to this time" marker for a
// space, not a per-message delivered/read ack. `getSpaceReadState` reads the
// given user's own marker (requires that user's own OAuth token — you cannot
// read someone else's read state with your own token). `markSpaceRead` moves
// the caller's own marker forward, normally called when they view a space.
export async function getSpaceReadState(
  spaceResourceName: string,
  userId: string,
): Promise<{ lastReadTime: string | null }> {
  const token = await getValidAccessToken(userId);
  const res = await fetch(
    `${CHAT_API_BASE}/users/me/${spaceResourceName}/spaceReadState`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return { lastReadTime: null };
  const data = (await res.json()) as { lastReadTime?: string };
  return { lastReadTime: data.lastReadTime || null };
}

export async function markSpaceRead(
  spaceResourceName: string,
  userId: string,
  lastReadTime: string = new Date().toISOString(),
): Promise<void> {
  const token = await getValidAccessToken(userId);
  await fetch(
    `${CHAT_API_BASE}/users/me/${spaceResourceName}/spaceReadState?updateMask=lastReadTime`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ lastReadTime }),
    },
  );
}

// ─── Attachment media download ────────────────────────────────────────────────
// Attachment thumbnailUri/downloadUri returned inline on a message are
// short-lived Google-signed URLs that still require the same OAuth bearer
// token to fetch — a plain <img src> from the browser gets 401. Route media
// bytes through this (called from a same-origin proxy API route) so the
// browser only ever needs its own session cookie.
export async function fetchAttachmentMedia(params: {
  resourceName: string;
  userId: string;
}): Promise<Response> {
  const token = await getValidAccessToken(params.userId);
  const url = `${CHAT_API_BASE}/media/${params.resourceName}?alt=media`;
  return fetch(url, { headers: { Authorization: `Bearer ${token}` } });
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
): Promise<{
  name: string;
  displayName?: string;
  spaceType: string;
  participantUserId?: string | null;
  participantGoogleUserId?: string | null;
  participantEmail?: string | null;
}[]> {
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

  // Cache-first DM resolution — resolving a DM's real name needs a
  // membership fetch, an identity resolution (DB + Admin SDK), and sometimes
  // a message-history fallback: 2-3 network round trips per DM. Redoing that
  // for every DM on every single page load is what made this endpoint take
  // ~9s with 40+ DMs. Instead: batch-load the DB cache once, and only pay
  // the network cost for DMs whose cache is missing or stale. A resolved
  // name is cached for POSITIVE_CACHE_TTL_MS (names rarely change); an
  // unresolved DM is cached too, for the shorter NEGATIVE_CACHE_TTL_MS, so
  // an unresolvable user doesn't get hammered on every reload — it just
  // retries periodically instead of never.
  const POSITIVE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
  const NEGATIVE_CACHE_TTL_MS = 30 * 60 * 1000;
  const badDisplayNames = new Set(["Adarsh Operations", "Google Chat DM", "Google User"]);

  const spaceNames = allApiSpaces.map((s) => s.name);
  const cachedRows = spaceNames.length > 0
    ? await db.googleChatSpace.findMany({ where: { spaceResourceName: { in: spaceNames } } })
    : [];
  const cacheByName = new Map(cachedRows.map((r) => [r.spaceResourceName, r]));

  // Resolve DM display names — Google Chat API returns org profile name
  // (e.g. "Adarsh Operations") for all members on the same domain.
  // We must ALWAYS resolve DM names from our database, never trust the API value.
  const resolvedSpaces = await Promise.all(
    allApiSpaces.map(async (space) => {
      // For DMs, ALWAYS resolve the other member's real name
      if (space.spaceType === "DIRECT_MESSAGE") {
        const cached = cacheByName.get(space.name);
        if (cached?.lastVerifiedAt) {
          const age = Date.now() - cached.lastVerifiedAt.getTime();
          const isResolved = Boolean(cached.displayName && !isGenericChatDisplayName(cached.displayName));
          const ttl = isResolved ? POSITIVE_CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS;
          if (age < ttl) {
            return {
              ...space,
              displayName: isResolved ? cached.displayName! : undefined,
              participantUserId: cached.linkedRecordType === "User" ? cached.linkedRecordId : null,
              participantGoogleUserId: cached.participantGoogleUserId ?? null,
              participantEmail: cached.participantEmail ?? null,
            };
          }
        }

        try {
          const membersData = await listMemberships(space.name, userId);
          // Identify the "other" member by excluding the calling user by both googleUserId and email
          const otherMember = membersData.memberships?.find((m) => {
            if (!m.member) return false;
            return !isCurrentGoogleChatUser({
              memberName: m.member.name,
              memberEmail: m.member.email,
              googleUserId: myGoogleUserId,
              googleEmail: myGoogleEmail,
            });
          });

          if (otherMember?.member) {
            const otherGoogleId = otherMember.member.name?.replace("users/", "");
            const otherEmail = otherMember.member.email?.toLowerCase();
            const resolved = await resolveGoogleWorkspacePerson({
              actorUserId: userId,
              googleUserId: otherGoogleId,
              email: otherEmail,
              displayName: otherMember.member.displayName,
              orgId,
            });

            let resolvedName = resolved.name || undefined;
            let resolvedUserId = resolved.userId;

            if (!resolvedName && otherGoogleId && googleIdToUser.has(otherGoogleId)) {
              const found = googleIdToUser.get(otherGoogleId)!;
              resolvedName = found.name;
              resolvedUserId = found.id;
            } else if (!resolvedName && otherEmail && emailToUser.has(otherEmail)) {
              const found = emailToUser.get(otherEmail)!;
              resolvedName = found.name;
              resolvedUserId = found.id;
            }

            if (!resolvedName) {
              const recentMessages = await listMessages(space.name, userId, 15);
              const inferredSender = recentMessages.find((message) => {
                const senderResourceName = message.sender?.name;
                if (myGoogleUserId && senderResourceName === `users/${myGoogleUserId}`) {
                  return false;
                }
                return !isGenericChatDisplayName(message.sender?.displayName);
              });
              if (inferredSender?.sender?.displayName) {
                resolvedName = inferredSender.sender.displayName;
              }
            }

            if (resolvedName) {
              // Update cache with the correct name — including the raw participant
              // identity, so the next call's fast path can serve this DM with zero
              // network calls instead of redoing this whole resolution chain.
              await db.googleChatSpace.upsert({
                where: { spaceResourceName: space.name },
                update: {
                  displayName: resolvedName,
                  spaceType: "DIRECT_MESSAGE",
                  linkedRecordType: resolvedUserId ? "User" : null,
                  linkedRecordId: resolvedUserId || resolved.googleUserId || otherGoogleId,
                  participantGoogleUserId: resolved.googleUserId || otherGoogleId || null,
                  participantEmail: resolved.email || otherEmail || null,
                  linkStatus: "active",
                  lastVerifiedAt: new Date()
                },
                create: {
                  orgId,
                  spaceResourceName: space.name,
                  displayName: resolvedName,
                  spaceType: "DIRECT_MESSAGE",
                  linkedRecordType: resolvedUserId ? "User" : null,
                  linkedRecordId: resolvedUserId || resolved.googleUserId || otherGoogleId,
                  participantGoogleUserId: resolved.googleUserId || otherGoogleId || null,
                  participantEmail: resolved.email || otherEmail || null,
                  linkStatus: "active",
                  lastVerifiedAt: new Date()
                }
              });

              return {
                ...space,
                displayName: resolvedName,
                participantUserId: resolvedUserId,
                participantGoogleUserId: resolved.googleUserId || otherGoogleId || null,
                participantEmail: resolved.email || otherEmail || null,
              };
            }

            if (otherGoogleId && shouldLogUnresolved(otherGoogleId)) {
              console.warn("[GoogleChat][DMIdentityUnresolved]", {
                spaceId: space.name,
                actorUserId: userId,
                actorGoogleUserId: myGoogleUserId,
                otherMemberName: otherMember.member.name,
                otherMemberEmail: otherMember.member.email,
                otherMemberDisplayName: otherMember.member.displayName,
                localAccountFound: Boolean(otherGoogleId && googleIdToUser.has(otherGoogleId)),
              });
            }
          }
        } catch (err) {
          console.warn(`[GoogleChat] Failed to resolve DM name for ${space.name}:`, err);
          if (cached?.displayName && !badDisplayNames.has(cached.displayName)) {
            return { ...space, displayName: cached.displayName };
          }
        }

        // All resolution failed — fall back to whatever's cached, or a generic label.
        // Either way, record that this attempt failed (short TTL) so a genuinely
        // unresolvable user doesn't get retried on every single page load.
        if (cached?.displayName && !badDisplayNames.has(cached.displayName)) {
          return { ...space, displayName: cached.displayName };
        }

        try {
          await db.googleChatSpace.upsert({
            where: { spaceResourceName: space.name },
            update: { spaceType: "DIRECT_MESSAGE", linkStatus: "unresolved", lastVerifiedAt: new Date() },
            create: { orgId, spaceResourceName: space.name, spaceType: "DIRECT_MESSAGE", linkStatus: "unresolved", lastVerifiedAt: new Date() },
          });
        } catch { /* non-critical — worst case this DM gets re-resolved next load */ }

        if (isGenericChatDisplayName(space.displayName)) {
          return { ...space, displayName: undefined };
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
