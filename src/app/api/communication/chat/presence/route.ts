import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const ACTIVE_WINDOW_MS = 30 * 1000;
const IDLE_WINDOW_MS = 5 * 60 * 1000;

export type PresenceStatus = "active" | "idle" | "offline";

function statusFromLastSeen(lastSeenAt: Date | null): PresenceStatus {
  if (!lastSeenAt) return "offline";
  const age = Date.now() - lastSeenAt.getTime();
  if (age < ACTIVE_WINDOW_MS) return "active";
  if (age < IDLE_WINDOW_MS) return "idle";
  return "offline";
}

// GET /api/communication/chat/presence?userIds=a,b,c
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userIds = (req.nextUrl.searchParams.get("userIds") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 200);

  if (userIds.length === 0) {
    return NextResponse.json({ presence: {} });
  }

  const rows = await db.userPresenceState.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, lastSeenAt: true },
  });
  const byUserId = new Map(rows.map((r) => [r.userId, r.lastSeenAt]));

  const presence: Record<string, PresenceStatus> = {};
  for (const id of userIds) {
    presence[id] = statusFromLastSeen(byUserId.get(id) || null);
  }

  return NextResponse.json({ presence });
}
