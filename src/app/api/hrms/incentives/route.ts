import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  listIncentiveEntries,
  updateIncentiveEntry,
} from "@/modules/incentives/service";
import { IncentiveUpdateSchema } from "@/modules/incentives/validators";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 },
      );
    }

    await requirePermission(session.user.id, "hrms.salary.read");

    const data = await listIncentiveEntries(session.user.orgId);
    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to load incentives";
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 },
      );
    }

    await requirePermission(session.user.id, "hrms.salary.read");

    const { searchParams } = new URL(request.url);
    const incentiveId = searchParams.get("id");
    if (!incentiveId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Incentive ID is required",
          },
        },
        { status: 400 },
      );
    }

    const parsed = IncentiveUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid incentive update",
            details: parsed.error.format(),
          },
        },
        { status: 400 },
      );
    }

    const data = await updateIncentiveEntry(
      session.user.orgId,
      incentiveId,
      session.user.id,
      parsed.data,
    );
    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to update incentive";
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
