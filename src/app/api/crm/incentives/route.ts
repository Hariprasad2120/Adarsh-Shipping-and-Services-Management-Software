import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  createIncentiveEntry,
  listIncentiveEntries,
} from "@/modules/incentives/service";
import { IncentiveCreateSchema } from "@/modules/incentives/validators";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 },
      );
    }

    await requirePermission(session.user.id, "crm.access");

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

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 },
      );
    }

    await requirePermission(session.user.id, "crm.access");

    const parsed = IncentiveCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid incentive input",
            details: parsed.error.format(),
          },
        },
        { status: 400 },
      );
    }

    const data = await createIncentiveEntry(
      session.user.orgId,
      session.user.id,
      parsed.data,
    );

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unable to create incentive";
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
