import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import {
  clearPortalSessionCookie,
  createPortalSession,
  getPortalRequestMeta,
  getPortalSessionToken,
  recordPortalAuthAudit,
  revokePortalSession,
  setPortalSessionCookie,
  shouldLockPortalAccount,
} from "./auth";

export async function loginCustomerPortal(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
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

  const passwordMatches = portalUser.passwordHash
    ? await compare(password, portalUser.passwordHash)
    : false;

  if (!passwordMatches) {
    const now = await getNow();
    const shouldLock = await shouldLockPortalAccount(portalUser.failedLoginCount);

    await db.customerPortalUser.update({
      where: { id: portalUser.id },
      data: {
        failedLoginCount: portalUser.failedLoginCount + 1,
        lockedAt: shouldLock ? now : portalUser.lockedAt,
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
    portalUser.lockedAt ||
    !portalUser.customer.isPortalEnabled
  ) {
    throw new Error("This portal account is not active.");
  }

  const now = await getNow();
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
        lockedAt: null,
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
