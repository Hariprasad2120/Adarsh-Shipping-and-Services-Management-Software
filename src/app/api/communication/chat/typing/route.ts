import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// In-app-only typing signal — see ChatTypingState in schema.prisma for why
// this can't reflect typing in the native Google Chat client.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const spaceId: string | undefined = body?.spaceId;
  if (!spaceId) {
    return NextResponse.json({ error: "Missing spaceId" }, { status: 400 });
  }

  await db.chatTypingState.upsert({
    where: {
      spaceResourceName_userId: {
        spaceResourceName: spaceId,
        userId: session.user.id,
      },
    },
    update: { updatedAt: new Date() },
    create: {
      spaceResourceName: spaceId,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ success: true });
}
