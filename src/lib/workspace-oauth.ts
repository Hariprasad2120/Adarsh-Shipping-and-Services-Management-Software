import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { db } from "@/lib/db";

const ALGORITHM = "aes-256-gcm";
const ENCRYPTION_KEY = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY
  ? Buffer.from(process.env.GOOGLE_TOKEN_ENCRYPTION_KEY, "hex")
  : Buffer.alloc(32, 0); // Development fallback

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET!;
const REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/communication/oauth/callback`;
const WORKSPACE_DOMAIN = process.env.GOOGLE_WORKSPACE_DOMAIN || "adarshshipping.in";

// Encrypt a token
export function encryptToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

// Decrypt a token
export function decryptToken(encryptedText: string): string {
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid token encryption format");
  }
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// Generate the authorization URL
export function getAuthorizationUrl(state: string): string {
  const scopes = [
    // Gmail — full read/write/send/delete
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.labels",

    // Calendar — full read/write/create/delete events
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",

    // Chat — full CRUD for spaces, memberships, messages
    "https://www.googleapis.com/auth/chat.spaces",
    "https://www.googleapis.com/auth/chat.spaces.create",
    "https://www.googleapis.com/auth/chat.spaces.readonly",
    "https://www.googleapis.com/auth/chat.memberships",
    "https://www.googleapis.com/auth/chat.memberships.readonly",
    "https://www.googleapis.com/auth/chat.messages",
    "https://www.googleapis.com/auth/chat.messages.create",
    "https://www.googleapis.com/auth/chat.messages.readonly",

    // Drive — full read/write/create/delete files and folders
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/drive.file",

    // Contacts — read directory for people/user lookup
    "https://www.googleapis.com/auth/contacts.readonly",
    "https://www.googleapis.com/auth/directory.readonly",

    // Tasks — full read/write
    "https://www.googleapis.com/auth/tasks",

    // Identity
    "openid",
    "email",
    "profile"
  ];

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state: state,
    include_granted_scopes: "true",
    hd: WORKSPACE_DOMAIN
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  googleEmail: string;
  googleUserId: string;
  scopes: string[];
}> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code"
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google token exchange failed: ${err}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    id_token: string;
  };

  if (!data.refresh_token) {
    throw new Error("No refresh token returned. Make sure to prompt for consent.");
  }

  // Decode ID token to get user info (email and sub/googleUserId)
  const idTokenParts = data.id_token.split(".");
  if (idTokenParts.length < 2) {
    throw new Error("Invalid id_token returned from Google");
  }
  const payload = JSON.parse(Buffer.from(idTokenParts[1], "base64").toString("utf8")) as {
    email: string;
    sub: string;
    email_verified: boolean;
  };

  if (!payload.email_verified) {
    throw new Error("Google email address is not verified.");
  }

  const scopes = data.scope ? data.scope.split(" ") : [];
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
    googleEmail: payload.email,
    googleUserId: payload.sub,
    scopes
  };
}

// Get a valid access token for a user, refreshing if expired
export async function getValidAccessToken(userId: string): Promise<string> {
  const connection = await db.googleWorkspaceConnection.findUnique({
    where: { userId }
  });

  if (!connection) {
    throw new Error("Google Workspace is not connected.");
  }

  const now = new Date();
  // If token is valid for another 60 seconds, return it
  if (connection.tokenExpiresAt.getTime() > now.getTime() + 60000) {
    return connection.accessToken;
  }

  // Otherwise, refresh the token
  const refreshToken = decryptToken(connection.refreshToken);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  if (!res.ok) {
    const err = await res.text();
    // If the grant is revoked, mark connection as expired
    await db.googleWorkspaceConnection.update({
      where: { userId },
      data: { status: "expired" }
    });
    throw new Error(`Failed to refresh Google access token: ${err}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    scope?: string;
  };

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  const updated = await db.googleWorkspaceConnection.update({
    where: { userId },
    data: {
      accessToken: data.access_token,
      tokenExpiresAt: expiresAt,
      status: "connected",
      ...(data.scope ? { scopes: data.scope.split(" ") } : {})
    }
  });

  return updated.accessToken;
}
