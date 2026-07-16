import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import {
  clearPortalSessionCookie,
  createPortalSession,
  getPortalLockoutUntil,
  getPortalRequestMeta,
  getPortalSessionToken,
  recordPortalAuthAudit,
  revokePortalSession,
  setPortalSessionCookie,
  shouldLockPortalAccount,
} from "./auth";

export async function loginCustomerPortal(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const now = await getNow();
  const portalUser = await db.customerPortalUser.findFirst({
    where: { email: normalizedEmail },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          isPortalEnabled: true,
        },
      },
    },
  });

  if (!portalUser) {
    throw new Error("Invalid email or password.");
  }

  if (portalUser.lockedUntil && portalUser.lockedUntil.getTime() > now.getTime()) {
    throw new Error("This portal account is temporarily locked. Please try again later.");
  }

  const passwordMatches = portalUser.passwordHash
    ? await compare(password, portalUser.passwordHash)
    : false;

  if (!passwordMatches) {
    const shouldLock = await shouldLockPortalAccount(portalUser.failedLoginCount);

    await db.customerPortalUser.update({
      where: { id: portalUser.id },
      data: {
        failedLoginCount: portalUser.failedLoginCount + 1,
        lockedUntil: shouldLock ? getPortalLockoutUntil(now) : null,
      },
    });

    await recordPortalAuthAudit({
      orgId: portalUser.orgId,
      customerId: portalUser.customerId,
      portalUserId: portalUser.id,
      event: "LOGIN_FAILED",
      remarks: "Invalid password",
    });

    throw new Error("Invalid email or password.");
  }

  if (
    portalUser.status !== "ACTIVE" ||
    portalUser.revokedAt ||
    portalUser.suspendedAt ||
    (portalUser.lockedUntil && portalUser.lockedUntil.getTime() > now.getTime()) ||
    !portalUser.customer.isPortalEnabled
  ) {
    throw new Error("This portal account is not active.");
  }

  const { ip, userAgent } = await getPortalRequestMeta();
  const token = await createPortalSession({
    portalUserId: portalUser.id,
    orgId: portalUser.orgId,
    customerId: portalUser.customerId,
    ip,
    userAgent,
  });

  await Promise.all([
    setPortalSessionCookie(token),
    db.customerPortalUser.update({
      where: { id: portalUser.id },
      data: {
        failedLoginCount: 0,
        lastLoginAt: now,
        lockedUntil: null,
      },
    }),
    recordPortalAuthAudit({
      orgId: portalUser.orgId,
      customerId: portalUser.customerId,
      portalUserId: portalUser.id,
      event: "LOGIN_SUCCESS",
      remarks: "Portal shell login",
    }),
  ]);
}

export async function logoutCustomerPortal() {
  const token = await getPortalSessionToken();
  if (token) {
    await revokePortalSession(token);
  }
  await clearPortalSessionCookie();
}
