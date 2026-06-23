import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createDmWithUser } from "@/lib/google-chat-client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { targetGoogleUserId } = body;

    if (!targetGoogleUserId) {
      return NextResponse.json({ error: "Missing targetGoogleUserId" }, { status: 400 });
    }

    const dmSpace = await createDmWithUser(`users/${targetGoogleUserId}`);

    return NextResponse.json({
      success: true,
      spaceId: dmSpace.name,
      spaceType: dmSpace.spaceType
    });
  } catch (err: any) {
    console.error("[ChatDmAPI] Error creating direct message space:", err);
    return NextResponse.json({ error: err.message || "Failed to create DM space" }, { status: 500 });
  }
}
