// ─── Google Chat Admin API ────────────────────────────────────────────────────
// Returns stats + linked users + recent deliveries for admin dashboard.

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { loadUserPermissions } from "@/lib/rbac";
import { db } from "@/lib/db";
import { listDeliveries } from "@/modules/google-chat/delivery";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = await loadUserPermissions(session.user.id);
  if (!permissions.has("admin.org.manage") && !session.user.isPlatformAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.orgId;

  const [linkedUsers, spaces, deliveries, pendingDeliveries] = await Promise.all([
    db.googleChatUserLink.findMany({
      where: { orgId: orgId ?? undefined, linkStatus: "active" },
      include: {
        user: {
          select: { id: true, name: true, email: true, designation: true },
        },
      },
      orderBy: { linkedAt: "desc" },
    }),
    db.googleChatSpace.findMany({
      where: { orgId: orgId ?? undefined },
      orderBy: { createdAt: "desc" },
    }),
    listDeliveries({ orgId: orgId ?? undefined, limit: 20 }),
    db.googleChatDelivery.count({
      where: {
        orgId: orgId ?? undefined,
        status: { in: ["queued", "processing", "failed_retryable"] },
      },
    }),
  ]);

  const deliveryStats = await db.googleChatDelivery.groupBy({
    by: ["status"],
    where: { orgId: orgId ?? undefined },
    _count: true,
  });

  return NextResponse.json({
    linkedUsers: linkedUsers.map((l) => ({
      id: l.id,
      userId: l.userId,
      userName: l.user.name,
      userEmail: l.user.email,
      designation: l.user.designation,
      googleEmail: l.googleEmail,
      googleDisplayName: l.googleDisplayName,
      linkedAt: l.linkedAt,
      lastUsedAt: l.lastUsedAt,
      linkStatus: l.linkStatus,
    })),
    spaces,
    recentDeliveries: deliveries,
    pendingDeliveries,
    deliveryStats: deliveryStats.map((s) => ({
      status: s.status,
      count: s._count,
    })),
    totalLinkedUsers: linkedUsers.length,
    totalSpaces: spaces.length,
  });
}
