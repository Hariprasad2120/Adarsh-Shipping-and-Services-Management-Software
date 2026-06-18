import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getHrmsTasks, createHrmsTask, updateHrmsTaskStatus } from "@/modules/hrms/service";
import { requirePermission, apiError } from "@/lib/rbac";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await requirePermission(session.user.id, "hrms.tasks.manage");

    const data = await getHrmsTasks(session.user.id, session.user.orgId!);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await requirePermission(session.user.id, "hrms.tasks.manage");

    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { title, description, dueDate, assigneeId, priority } = body;
      const data = await createHrmsTask(
        session.user.orgId!,
        session.user.id,
        title,
        description || null,
        new Date(dueDate),
        assigneeId,
        priority
      );
      return NextResponse.json({ ok: true, data });
    }

    if (action === "toggle") {
      const { taskId, status } = body;
      const data = await updateHrmsTaskStatus(taskId, status);
      return NextResponse.json({ ok: true, data });
    }

    return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Invalid action" } }, { status: 400 });
  } catch (error) {
    return apiError(error);
  }
}
