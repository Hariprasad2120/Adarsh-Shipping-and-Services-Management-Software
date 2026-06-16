import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getPerformanceData,
  createPerformanceGoal,
  updateGoalProgress,
  submitPerformanceFeedback
} from "@/modules/hrms/peopleplus/service";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const data = await getPerformanceData(session.user.id, session.user.orgId!);
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "create_goal") {
      const { title, target, dueDate } = body;
      const data = await createPerformanceGoal(session.user.id, session.user.orgId!, title, target, new Date(dueDate));
      return NextResponse.json({ ok: true, data });
    }

    if (action === "update_goal_progress") {
      const { goalId, progress } = body;
      const data = await updateGoalProgress(goalId, progress);
      return NextResponse.json({ ok: true, data });
    }

    if (action === "submit_feedback") {
      const { toUserId, content, feedbackType } = body;
      const data = await submitPerformanceFeedback(session.user.id, toUserId, session.user.orgId!, content, feedbackType);
      return NextResponse.json({ ok: true, data });
    }

    return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Invalid action" } }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}
