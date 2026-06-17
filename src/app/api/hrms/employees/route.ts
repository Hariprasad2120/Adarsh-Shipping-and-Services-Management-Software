import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listUsers } from "@/modules/core/user/service";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId") || undefined;
    const departmentId = searchParams.get("departmentId") || undefined;
    const search = searchParams.get("search") || undefined;
    const activeVal = searchParams.get("active");
    const active = activeVal !== null ? activeVal === "true" : undefined;

    const users = await listUsers(session.user.orgId, {
      branchId,
      departmentId,
      search,
      active,
    });

    const safeUsers = users.map(({ passwordHash, ...u }) => u);

    return NextResponse.json({ ok: true, data: safeUsers });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await requirePermission(session.user.id, "hrms.employee.deactivate");

    const body = await request.json();
    const { userIds, status } = body; // status: "LOGIN_ENABLED" | "LOGIN_DISABLED"

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "User IDs are required" } }, { status: 400 });
    }

    const active = status === "LOGIN_ENABLED";
    await db.user.updateMany({
      where: { id: { in: userIds }, orgId: session.user.orgId },
      data: { active },
    });

    return NextResponse.json({ ok: true, data: { success: true } });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}
