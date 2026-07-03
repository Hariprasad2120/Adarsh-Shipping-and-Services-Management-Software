"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  revokeAllSessionsForUser,
  revokeSessionById,
} from "@/lib/session-service";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Revoke one of the current user's OTHER sessions. The current session
 * cannot be revoked from here — that path is normal logout.
 */
export async function revokeMySessionAction(
  sessionId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "Unauthorized" };

  const target = await db.userSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, token: true },
  });
  if (!target || target.userId !== session.user.id) {
    return { ok: false, error: "Session not found" };
  }
  if (target.token === session.user.sessionNonce) {
    return { ok: false, error: "Use logout to end your current session" };
  }

  await revokeSessionById({
    sessionId,
    actorUserId: session.user.id,
    reason: "USER_REVOKED",
  });
  revalidatePath("/account/security");
  return { ok: true };
}

/** "Logout from all other devices" — keeps the current session alive. */
export async function revokeAllOtherSessionsAction(): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { ok: false, error: "Unauthorized" };

  await revokeAllSessionsForUser({
    userId: session.user.id,
    actorUserId: session.user.id,
    reason: "USER_REVOKED",
    exceptToken: session.user.sessionNonce,
  });
  revalidatePath("/account/security");
  return { ok: true };
}
