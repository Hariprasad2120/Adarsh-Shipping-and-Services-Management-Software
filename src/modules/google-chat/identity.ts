import { createHmac, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { loadUserPermissions } from "@/lib/rbac";
import type { ResolvedChatIdentity } from "./types";

const LINK_SECRET = process.env.GOOGLE_CHAT_LINK_SECRET ?? "changeme";
const LINK_TTL_MINUTES = parseInt(
  process.env.GOOGLE_CHAT_LINK_TOKEN_TTL_MINUTES ?? "15",
  10
);
const WORKSPACE_DOMAIN = process.env.GOOGLE_WORKSPACE_DOMAIN ?? "";

// ─── Resolve identity for inbound Chat event ──────────────────────────────────

export async function resolveIdentity(
  googleUserId: string,
  googleEmail?: string,
  googleDisplayName?: string
): Promise<ResolvedChatIdentity> {
  if (!googleUserId) {
    return {
      linked: false,
      googleUserId: "",
      googleEmail: undefined,
      googleDisplayName: undefined,
    };
  }

  const link = await db.googleChatUserLink.findUnique({
    where: { googleUserId },
    include: { user: { select: { id: true, name: true, orgId: true, active: true } } },
  });

  if (!link || link.linkStatus !== "active" || !link.user.active) {
    return {
      linked: false,
      googleUserId,
      googleEmail: googleEmail ?? link?.googleEmail ?? undefined,
      googleDisplayName: googleDisplayName ?? link?.googleDisplayName ?? undefined,
    };
  }

  // Update lastUsedAt non-blocking
  db.googleChatUserLink
    .update({ where: { id: link.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  const permissions = await loadUserPermissions(link.userId);

  return {
    linked: true,
    userId: link.userId,
    userName: link.user.name,
    orgId: link.user.orgId ?? undefined,
    permissions: [...permissions],
    googleUserId,
    googleEmail: link.googleEmail ?? undefined,
    linkRecord: { id: link.id },
  };
}

// ─── Auto-link by verified Workspace email ───────────────────────────────────

export async function tryAutoLink(
  googleUserId: string,
  googleEmail: string,
  googleDisplayName: string
): Promise<{ linked: boolean; userId?: string }> {
  if (!WORKSPACE_DOMAIN || !googleEmail.endsWith(`@${WORKSPACE_DOMAIN}`)) {
    return { linked: false };
  }

  const existingLink = await db.googleChatUserLink.findUnique({
    where: { googleUserId },
  });
  if (existingLink) return { linked: false };

  const user = await db.user.findUnique({
    where: { email: googleEmail },
    select: { id: true, active: true },
  });
  if (!user || !user.active) return { linked: false };

  const existingUserLink = await db.googleChatUserLink.findUnique({
    where: { userId: user.id },
  });
  if (existingUserLink) return { linked: false };

  await db.googleChatUserLink.create({
    data: {
      userId: user.id,
      orgId: undefined,
      googleUserId,
      googleEmail,
      googleDisplayName,
      googleWorkspaceDomain: WORKSPACE_DOMAIN,
      linkStatus: "active",
      verifiedAt: new Date(),
    },
  });

  return { linked: true, userId: user.id };
}

// ─── Generate a signed link token ─────────────────────────────────────────────

export async function generateLinkToken(params: {
  googleUserId: string;
  googleEmail?: string;
  googleDisplayName?: string;
  spaceResourceName?: string;
}): Promise<string> {
  const raw = randomBytes(24).toString("hex");
  const hmac = createHmac("sha256", LINK_SECRET)
    .update(raw)
    .digest("hex");
  const token = `${raw}.${hmac}`;

  const expiresAt = new Date(Date.now() + LINK_TTL_MINUTES * 60 * 1000);

  await db.googleChatLinkToken.create({
    data: {
      token,
      googleUserId: params.googleUserId,
      googleEmail: params.googleEmail,
      googleDisplayName: params.googleDisplayName,
      spaceResourceName: params.spaceResourceName,
      expectedDomain: WORKSPACE_DOMAIN || undefined,
      expiresAt,
    },
  });

  return token;
}

// ─── Verify and consume a link token ─────────────────────────────────────────

export async function verifyLinkToken(
  token: string
): Promise<{
  valid: boolean;
  googleUserId?: string;
  googleEmail?: string;
  googleDisplayName?: string;
  spaceResourceName?: string;
}> {
  const record = await db.googleChatLinkToken.findUnique({ where: { token } });
  if (!record) return { valid: false };
  if (record.used) return { valid: false };
  if (record.expiresAt < new Date()) return { valid: false };

  const [raw, sig] = token.split(".");
  const expectedSig = createHmac("sha256", LINK_SECRET).update(raw).digest("hex");
  if (sig !== expectedSig) return { valid: false };

  return {
    valid: true,
    googleUserId: record.googleUserId,
    googleEmail: record.googleEmail ?? undefined,
    googleDisplayName: record.googleDisplayName ?? undefined,
    spaceResourceName: record.spaceResourceName ?? undefined,
  };
}

// ─── Consume token and create link ───────────────────────────────────────────

export async function completeLinking(params: {
  token: string;
  monolithUserId: string;
}): Promise<{ success: boolean; error?: string }> {
  const tokenData = await verifyLinkToken(params.token);
  if (!tokenData.valid || !tokenData.googleUserId) {
    return { success: false, error: "Invalid or expired link token." };
  }

  const user = await db.user.findUnique({
    where: { id: params.monolithUserId },
    select: { id: true, orgId: true, active: true },
  });
  if (!user || !user.active) {
    return { success: false, error: "User not found." };
  }

  const existingForGoogle = await db.googleChatUserLink.findUnique({
    where: { googleUserId: tokenData.googleUserId },
  });
  if (existingForGoogle && existingForGoogle.userId !== params.monolithUserId) {
    return { success: false, error: "This Google account is already linked to another Monolith user." };
  }

  const existingForUser = await db.googleChatUserLink.findUnique({
    where: { userId: params.monolithUserId },
  });
  if (existingForUser && existingForUser.googleUserId !== tokenData.googleUserId) {
    return { success: false, error: "Your Monolith account is already linked to a different Google account." };
  }

  await db.$transaction([
    db.googleChatLinkToken.update({
      where: { token: params.token },
      data: { used: true, usedAt: new Date() },
    }),
    existingForGoogle
      ? db.googleChatUserLink.update({
          where: { id: existingForGoogle.id },
          data: { userId: params.monolithUserId, linkStatus: "active", verifiedAt: new Date() },
        })
      : db.googleChatUserLink.create({
          data: {
            userId: params.monolithUserId,
            orgId: user.orgId ?? undefined,
            googleUserId: tokenData.googleUserId,
            googleEmail: tokenData.googleEmail,
            googleDisplayName: tokenData.googleDisplayName,
            googleWorkspaceDomain: WORKSPACE_DOMAIN || undefined,
            linkStatus: "active",
            verifiedAt: new Date(),
          },
        }),
  ]);

  return { success: true };
}

// ─── Revoke a link ────────────────────────────────────────────────────────────

export async function revokeLink(userId: string): Promise<void> {
  await db.googleChatUserLink.updateMany({
    where: { userId },
    data: { linkStatus: "revoked", revokedAt: new Date() },
  });
}

// ─── Admin: get all links for org ────────────────────────────────────────────

export async function getOrgLinks(orgId: string) {
  return db.googleChatUserLink.findMany({
    where: { orgId },
    include: {
      user: {
        select: { id: true, name: true, email: true, designation: true },
      },
    },
    orderBy: { linkedAt: "desc" },
  });
}
