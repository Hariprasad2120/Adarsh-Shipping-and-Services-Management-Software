import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission, apiError } from "@/lib/rbac";
import { listVisits, createPlannedVisit, promoteDwellingVisits } from "@/modules/hrms/location-tracking";
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
    const userId = url.searchParams.get("userId") ?? undefined;
    const crmAccountId = url.searchParams.get("crmAccountId") ?? undefined;

    const [visits, readyForConfirmation] = await Promise.all([
      listVisits(orgId, { status, userId, crmAccountId }),
      promoteDwellingVisits(orgId),
    ]);

    const accountIds = [...new Set(visits.map((v) => v.crmAccountId))];
    const userIds = [...new Set(visits.map((v) => v.userId))];
    const [accounts, users] = await Promise.all([
      accountIds.length ? db.crmAccount.findMany({ where: { id: { in: accountIds } }, select: { id: true, name: true } }) : [],
      userIds.length ? db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [],
    ]);
    const accountMap = new Map(accounts.map((a) => [a.id, a]));
    const userMap = new Map(users.map((u) => [u.id, u]));

    return NextResponse.json({
      ok: true,
      data: {
        visits: visits.map((v) => ({ ...v, account: accountMap.get(v.crmAccountId) ?? null, employee: userMap.get(v.userId) ?? null })),
        readyForConfirmation,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = (session.user as any).orgId;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });
    await requirePermission(session.user.id, "hrms.tracking.visits.manage");

    const body = await request.json();
    if (!body?.userId || !body?.crmAccountId) {
      return NextResponse.json({ error: "userId and crmAccountId are required" }, { status: 400 });
    }
    const account = await db.crmAccount.findFirst({ where: { id: body.crmAccountId, orgId } });
    if (!account) return NextResponse.json({ error: "Customer account not found in this organization" }, { status: 404 });

    const visit = await createPlannedVisit({
      orgId,
      userId: body.userId,
      crmAccountId: body.crmAccountId,
      createdById: session.user.id,
      purpose: body.purpose,
      contactPerson: body.contactPerson,
      notes: body.notes,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
    });
    return NextResponse.json({ ok: true, data: visit });
  } catch (error) {
    return apiError(error);
  }
}
