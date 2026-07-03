"use server";

import { cookies } from "next/headers";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  LEGACY_COOKIE_NAMES,
  MONOLITH_COOKIE_NAMES,
} from "@/lib/session-config";
import { logSecurityEvent } from "@/lib/session-service";

/**
 * Secure server-side logout:
 * 1. Revokes the current UserSession row in the database
 * 2. Audit-logs the logout
 * 3. Signs out of NextAuth (clears the Monolith session cookie)
 * 4. Purges all Monolith cookies plus every legacy/foreign auth cookie
 *    (old next-auth/authjs defaults, AMS cookies) that may linger on
 *    localhost or the shared domain.
 *
 * Client code must call this (via performLogout) — never signOut() directly.
 */
export async function secureLogoutAction(): Promise<void> {
  const session = await auth().catch(() => null);

  if (session?.user?.sessionNonce) {
    try {
      await db.userSession.updateMany({
        where: { token: session.user.sessionNonce, status: "ACTIVE" },
        data: {
          status: "REVOKED",
          logoutAt: new Date(),
          revokedAt: new Date(),
          revokeReason: "LOGOUT",
        },
      });
      await logSecurityEvent({
        event: "LOGOUT",
        outcome: "SUCCESS",
        userId: session.user.id,
        email: session.user.email,
        sessionToken: session.user.sessionNonce,
      });
    } catch (e) {
      console.error("[auth] Logout DB revocation failed:", e);
    }
  }

  try {
    await signOut({ redirect: false });
  } catch {
    // Cookie purge below still runs
  }

  const cookieStore = await cookies();
  for (const name of [...MONOLITH_COOKIE_NAMES, ...LEGACY_COOKIE_NAMES]) {
    try {
      cookieStore.delete(name);
    } catch {
      // Some cookies may not be deletable from this scope (e.g. wrong
      // domain attribute) — best effort.
    }
  }
}
