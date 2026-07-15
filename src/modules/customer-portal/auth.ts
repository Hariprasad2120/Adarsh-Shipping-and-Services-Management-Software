import { compare, hash } from "bcryptjs";
import { cookies, headers } from "next/headers";
import { randomUUID, createHash } from "crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { maskIp, deviceLabel, extractRequestMeta } from "@/lib/session-service";
import type { Prisma } from "@/generated/prisma/client";

const IS_PROD = process.env.NODE_ENV === "production";
const PORTAL_COOKIE_NAME = IS_PROD
  ? "__Host-monolith.customer-portal-session"
  : "monolith.dev.customer-portal-session";
const PORTAL_SESSION_MAX_AGE_S = 7 * 24 * 60 * 60;
const PORTAL_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const PORTAL_ABSOLUTE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000;
const PORTAL_LOGIN_MAX_ATTEMPTS = 5;

const COMMON_PASSWORDS = new Set([
  "password",
  "password123",
  "12345678",
  "123456789",
  "qwerty123",
  "welcome123",
  "admin123",
  "letmein123",
  "monolith123",
]);

function portalSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "monolith-customer-portal";
}

export function hashPortalToken(token: string) {
  return createHash("sha256").update(`${token}:${portalSecret()}`).digest("hex");
}

export function buildPortalLink(path: string) {
  const base = (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function getPortalRequestMeta() {
  try {
    const requestHeaders = await headers();
    const mockRequest = new Request("http://localhost", { headers: requestHeaders });
    return extractRequestMeta(mockRequest);
  } catch {
    return { ip: null, userAgent: null };
  }
}

export function validatePortalPassword(password: string) {
  if (password.length < 12) {
    throw new Error("Password must be at least 12 characters long.");
  }
  if (!/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error("Password must include lower-case and numeric characters.");
  }
  if (!/[A-Z]/.test(password) && !/[^A-Za-z0-9]/.test(password)) {
    throw new Error("Password must include either an upper-case or special character.");
  }
  if (COMMON_PASSWORDS.has(password.trim().toLowerCase())) {
    throw new Error("Choose a less common password.");
  }
}

export async function hashPortalPassword(password: string) {
  validatePortalPassword(password);
  return hash(password, 12);
}

export async function createPortalSession(params: {
  portalUserId: string;
  orgId: string;
  customerId: string;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const token = randomUUID();
  const now = await getNow();
  await db.customerPortalSession.create({
    data: {
      orgId: params.orgId,
      customerId: params.customerId,
      portalUserId: params.portalUserId,
      token,
      ipAddress: maskIp(params.ip),
      ipHash: params.ip ? hashPortalToken(params.ip) : null,
      userAgent: params.userAgent ?? null,
      device: deviceLabel(params.userAgent),
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + PORTAL_ABSOLUTE_TIMEOUT_MS),
    },
  });
  return token;
}

export async function setPortalSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(PORTAL_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PROD,
    path: "/",
    maxAge: PORTAL_SESSION_MAX_AGE_S,
  });
}

export async function clearPortalSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(PORTAL_COOKIE_NAME);
}

export async function getPortalSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(PORTAL_COOKIE_NAME)?.value ?? null;
}

export async function getPortalSession() {
  const token = await getPortalSessionToken();
  if (!token) return null;

  const session = await db.customerPortalSession.findUnique({
    where: { token },
    include: {
      portalUser: {
        include: {
          notificationPreference: true,
          customer: { select: { id: true, name: true, isPortalEnabled: true } },
          contact: { select: { id: true, email: true, firstName: true, lastName: true, designation: true } },
        },
      },
    },
  });

  if (!session || session.status !== "ACTIVE") return null;

  const now = await getNow();
  if (session.expiresAt.getTime() < now.getTime()) {
    await db.customerPortalSession.update({
      where: { token },
      data: { status: "EXPIRED", revokedAt: now, revokeReason: "ABSOLUTE_TIMEOUT" },
    }).catch(() => null);
    return null;
  }

  if (now.getTime() - session.lastSeenAt.getTime() > PORTAL_IDLE_TIMEOUT_MS) {
    await db.customerPortalSession.update({
      where: { token },
      data: { status: "EXPIRED", revokedAt: now, revokeReason: "IDLE_TIMEOUT" },
    }).catch(() => null);
    return null;
  }

  if (
    session.portalUser.status !== "ACTIVE" ||
    !session.portalUser.customer.isPortalEnabled ||
    session.portalUser.revokedAt ||
    session.portalUser.suspendedAt
  ) {
    await db.customerPortalSession.update({
      where: { token },
      data: { status: "REVOKED", revokedAt: now, revokeReason: "ACCOUNT_DISABLED" },
    }).catch(() => null);
    return null;
  }

  if (now.getTime() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
    db.customerPortalSession.update({
      where: { token },
      data: { lastSeenAt: now },
    }).catch(() => null);
  }

  return session;
}

export async function requirePortalSession() {
  const session = await getPortalSession();
  if (!session) {
    redirect("/customer-portal/login");
  }
  return session;
}

export async function revokePortalSession(token: string, reason = "LOGOUT") {
  const now = await getNow();
  await db.customerPortalSession.updateMany({
    where: { token, status: "ACTIVE" },
    data: { status: "REVOKED", revokedAt: now, revokeReason: reason },
  });
}

export async function revokeAllPortalSessions(portalUserId: string, exceptToken?: string | null) {
  const now = await getNow();
  await db.customerPortalSession.updateMany({
    where: {
      portalUserId,
      status: "ACTIVE",
      ...(exceptToken ? { token: { not: exceptToken } } : {}),
    },
    data: { status: "REVOKED", revokedAt: now, revokeReason: "LOGOUT_ALL" },
  });
}

export async function verifyPortalPassword(portalUserId: string, password: string) {
  const portalUser = await db.customerPortalUser.findUnique({
    where: { id: portalUserId },
    select: { passwordHash: true },
  });
  if (!portalUser?.passwordHash) return false;
  return compare(password, portalUser.passwordHash);
}

export async function shouldLockPortalAccount(failedLoginCount: number) {
  return failedLoginCount + 1 >= PORTAL_LOGIN_MAX_ATTEMPTS;
}

export async function recordPortalAuthAudit(input: {
  orgId: string;
  customerId: string;
  portalUserId?: string | null;
  event: string;
  remarks?: string;
  metadata?: Record<string, unknown>;
  actorUserId?: string | null;
}) {
  const { ip, userAgent } = await getPortalRequestMeta();
  await db.customerPortalAuditLog.create({
    data: {
      orgId: input.orgId,
      customerId: input.customerId,
      portalUserId: input.portalUserId ?? undefined,
      actorUserId: input.actorUserId ?? undefined,
      entityType: "CustomerPortalAuth",
      entityId: input.portalUserId ?? input.customerId,
      event: input.event,
      remarks: input.remarks,
      ipAddress: maskIp(ip),
      userAgent,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
