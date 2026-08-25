import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission, apiError } from "@/lib/rbac";
import { listExceptions } from "@/modules/hrms/location-tracking";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = (session.user as any).orgId;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });
    await requirePermission(session.user.id, "hrms.tracking.admin");

    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? undefined;
    const exceptionType = url.searchParams.get("exceptionType") ?? undefined;
    const exceptions = await listExceptions(orgId, { status, exceptionType });

    const userIds = [...new Set(exceptions.map((e) => e.userId))];
    const users = userIds.length ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, designation: true } }) : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return NextResponse.json({
      ok: true,
      data: exceptions.map((e) => ({ ...e, employee: userMap.get(e.userId) ?? null })),
    });
  } catch (error) {
    return apiError(error);
  }
}
