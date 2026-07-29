import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError, requirePermission } from "@/lib/rbac";
import {
  deleteWorkReportField,
  updateWorkReportField,
} from "@/modules/hrms/service";
import { WorkReportFieldSchema } from "@/modules/hrms/validators";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const data = await updateWorkReportField(
      session!.user.orgId!,
      id,
      parsed.data,
    );
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, response } = await getAdminSession();
    if (response) return response;

    const { id } = await params;
    await deleteWorkReportField(session!.user.orgId!, id);
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (error) {
    return apiError(error);
  }
}
