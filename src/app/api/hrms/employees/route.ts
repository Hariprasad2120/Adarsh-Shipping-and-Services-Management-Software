import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listUsers, updateUser } from "@/modules/core/user/service";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { z } from "zod";

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

    const safeUsers = users.map((user) => {
      const { passwordHash, ...safeUser } = user;
      void passwordHash;
      return safeUser;
    });

    return NextResponse.json({ ok: true, data: safeUsers });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to load employees";
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message } }, { status: 500 });
  }
}

const accountStatusSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1).max(200),
  status: z.enum(["LOGIN_ENABLED", "LOGIN_DISABLED"]),
});

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.orgId) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await requirePermission(session.user.id, "hrms.employee.deactivate");

    const parsed = accountStatusSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "User IDs are required" } }, { status: 400 });
    }

    const users = await db.user.findMany({
      where: {
        id: { in: parsed.data.userIds },
        orgId: session.user.orgId,
        NOT: { id: session.user.id },
      },
      select: { id: true },
    });
    if (users.length === 0) {
      return NextResponse.json({ ok: false, error: { code: "VALIDATION_ERROR", message: "No eligible employees found" } }, { status: 400 });
    }

    const active = parsed.data.status === "LOGIN_ENABLED";
    await Promise.all(
      users.map((user) => updateUser(user.id, { active })),
    );

    return NextResponse.json({
      ok: true,
      data: { success: true, updated: users.length },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to update login access";
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message } }, { status: 500 });
  }
}
