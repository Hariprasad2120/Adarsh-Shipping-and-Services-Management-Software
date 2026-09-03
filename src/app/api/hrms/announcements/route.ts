import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized access" } },
        { status: 401 },
      );
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { orgId: true },
    });

    if (!user || !user.orgId) {
      return NextResponse.json(
        { ok: false, error: { code: "NO_ORG", message: "User organisation not found" } },
        { status: 400 },
      );
    }

    const announcements = await db.announcement.findMany({
      where: { orgId: user.orgId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ ok: true, data: announcements });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch announcements";
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized access" } },
        { status: 401 },
      );
    }
    if (!(await can(session.user.id, "hrms.settings.manage"))) {
      return NextResponse.json(
        { ok: false, error: { code: "FORBIDDEN", message: "Not permitted to publish announcements" } },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { title, content, isDraft } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { ok: false, error: { code: "BAD_REQUEST", message: "Announcement title is required" } },
        { status: 400 },
      );
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { ok: false, error: { code: "BAD_REQUEST", message: "Announcement content body is required" } },
        { status: 400 },
      );
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { orgId: true },
    });

    if (!user || !user.orgId) {
      return NextResponse.json(
        { ok: false, error: { code: "NO_ORG", message: "User organisation not found" } },
        { status: 400 },
      );
    }

    const announcement = await db.announcement.create({
      data: {
        orgId: user.orgId,
        title: title.trim(),
        body: content.trim(),
        createdById: session.user.id,
        publishedAt: isDraft ? null : new Date(),
      },
    });

    return NextResponse.json({ ok: true, data: announcement });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save announcement";
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  }
}
