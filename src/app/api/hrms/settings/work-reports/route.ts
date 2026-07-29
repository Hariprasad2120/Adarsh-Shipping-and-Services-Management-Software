import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError, requirePermission } from "@/lib/rbac";
import {
  createWorkReportField,
  getWorkReportSettings,
  updateWorkReportSettings,
} from "@/modules/hrms/service";
import {
  WorkReportFieldSchema,
  WorkReportSettingsSchema,
} from "@/modules/hrms/validators";

async function getAdminSession() {
  const session = await auth();
  if (!session?.user?.orgId) {
    return {
      session: null,
      response: NextResponse.json(
        {
          ok: false,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        },
        { status: 401 },
      ),
    };
  }

  await requirePermission(session.user.id, "hrms.settings.manage");
  return { session, response: null };
}

export async function GET() {
  try {
    const { session, response } = await getAdminSession();
    if (response) return response;

    const data = await getWorkReportSettings(session!.user.orgId!);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { session, response } = await getAdminSession();
    if (response) return response;

    const parsed = WorkReportSettingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              parsed.error.issues[0]?.message ?? "Invalid work report settings",
          },
        },
        { status: 400 },
      );
    }

    const data = await updateWorkReportSettings(
      session!.user.orgId!,
      parsed.data,
    );
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, response } = await getAdminSession();
    if (response) return response;

    const parsed = WorkReportFieldSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              parsed.error.issues[0]?.message ?? "Invalid work report field",
          },
        },
        { status: 400 },
      );
    }

    const data = await createWorkReportField(session!.user.orgId!, parsed.data);
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
