import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !session.user.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const connection = await db.googleWorkspaceConnection.findUnique({
      where: { userId: session.user.id }
    });

    if (connection) {
      await db.googleWorkspaceConnection.delete({
        where: { userId: session.user.id }
      });

      await db.communicationAuditEvent.create({
        data: {
          orgId: session.user.orgId,
          userId: session.user.id,
          action: "OAUTH_DISCONNECT",
          details: `Disconnected Google Workspace account: ${connection.googleEmail}`
        }
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to disconnect" }, { status: 500 });
  }
}
