import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLmsCourses, enrollInCourse, updateCourseProgress } from "@/modules/hrms/peopleplus/service";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const data = await getLmsCourses(session.user.orgId!, session.user.id);
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

    const { courseId } = await req.json();
    if (!courseId) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Missing courseId" } }, { status: 400 });
    }

    const data = await enrollInCourse(session.user.id, courseId);
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
    }

    const { courseId, progress } = await req.json();
    if (!courseId || progress === undefined) {
      return NextResponse.json({ ok: false, error: { code: "BAD_REQUEST", message: "Missing courseId or progress" } }, { status: 400 });
    }

    const data = await updateCourseProgress(session.user.id, courseId, progress);
    return NextResponse.json({ ok: true, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: { code: "INTERNAL_ERROR", message: error.message } }, { status: 500 });
  }
}
