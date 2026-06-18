import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLmsCourses, enrollInCourse, updateCourseProgress } from "@/modules/hrms/service";
import { requirePermission, apiError } from "@/lib/rbac";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await requirePermission(session.user.id, "lms.access");

    const data = await getLmsCourses(session.user.orgId!, session.user.id);
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

    await requirePermission(session.user.id, "lms.learning.self");

    const { courseId } = await req.json();
    if (!courseId) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Missing courseId" } }, { status: 400 });
    }

    const data = await enrollInCourse(session.user.id, courseId);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    await requirePermission(session.user.id, "lms.learning.self");

    const { courseId, progress } = await req.json();
    if (!courseId || progress === undefined) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Missing courseId or progress" } }, { status: 400 });
    }

    const data = await updateCourseProgress(session.user.id, courseId, progress);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}
