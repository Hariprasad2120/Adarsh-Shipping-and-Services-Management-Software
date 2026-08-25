import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// In-app-only presence heartbeat — see UserPresenceState in schema.prisma for
// why this can't reflect presence in the native Google Chat client.
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.userPresenceState.upsert({
    where: { userId: session.user.id },
    update: { lastSeenAt: new Date() },
    create: { userId: session.user.id },
  });

  return NextResponse.json({ success: true });
}
