import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { listUsers } from "@/modules/core/user/service";
import {
  createEmployeeDirectoryExport,
  type EmployeeDirectoryExportUser,
} from "@/modules/hrms/employee-directory-export";

const exportQuerySchema = z.object({
  active: z.enum(["true", "false", "all", "invited"]).optional(),
  branchId: z.string().trim().max(100).optional(),
  departmentId: z.string().trim().max(100).optional(),
  employeeStatus: z.enum(["ACTIVE", "EXITED"]).optional(),
  format: z.enum(["xls", "xlsx", "csv", "tsv"]).default("xlsx"),
  onboardingStatus: z.string().trim().max(100).optional(),
  roleId: z.string().trim().max(100).optional(),
  search: z.string().trim().max(200).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.orgId) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        },
        { status: 401 },
      );
    }

    await requirePermission(session.user.id, "hrms.employee.read");

    const parsed = exportQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid export query",
          },
        },
        { status: 400 },
      );
    }

    const query = parsed.data;
    const active =
      query.active === undefined || query.active === "all"
        ? undefined
        : query.active === "true"
          ? true
          : false;
    const users = await listUsers(session.user.orgId, {
      active,
      invitationStatus: query.active === "invited" ? "INVITED" : undefined,
      branchId: query.branchId || undefined,
      departmentId: query.departmentId || undefined,
      employeeStatus: query.employeeStatus,
      onboardingStatus: query.onboardingStatus || undefined,
      roleId: query.roleId || undefined,
      search: query.search || undefined,
      take: 10_000,
    });
    const file = await createEmployeeDirectoryExport(
      users as EmployeeDirectoryExportUser[],
      query.format,
    );
    const date = new Date().toISOString().slice(0, 10);

    return new NextResponse(new Uint8Array(file.body), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="employee-profiles-${date}.${query.format}"`,
        "Content-Type": file.contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to export employee profiles";

    return NextResponse.json(
      {
        ok: false,
        error: { code: "INTERNAL_ERROR", message },
      },
      { status: 500 },
    );
  }
}
