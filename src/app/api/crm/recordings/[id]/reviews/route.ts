import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { addTimelineEvent } from "@/modules/crm/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { rating, comments } = body;

    if (rating === undefined || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5 stars" }, { status: 400 });
    }

    const recording = await db.crmCallRecording.findUnique({
      where: { id },
      include: {
        callAttempt: true,
      },
    });

    if (!recording) {
      return NextResponse.json({ error: "Recording not found" }, { status: 404 });
    }

    // RBAC logic - only managers/admins can review calls
    const userRoles = await db.userRole.findMany({
      where: { userId: session.user.id },
      include: { role: true },
    });
    const isManagerOrAdmin =
      session.user.isPlatformAdmin ||
      userRoles.some((ur) =>
        ["admin", "manager", "crm manager", "hr", "director", "management"].includes(
          ur.role.name.toLowerCase()
        )
      );

    if (!isManagerOrAdmin) {
      return NextResponse.json({ error: "Forbidden: Only managers and admins can review call recordings" }, { status: 403 });
    }

    // Save review
    const review = await db.crmCallReview.create({
      data: {
        orgId: recording.orgId,
        recordingId: recording.id,
        reviewerId: session.user.id,
        rating: parseInt(rating),
        comments: comments || "",
      },
    });

    // Write audit log for transcript view since managers review transcripts during call reviews
    await db.crmCallRecordingAuditLog.create({
      data: {
        orgId: recording.orgId,
        recordingId: recording.id,
        userId: session.user.id,
        action: "TRANSCRIPT_VIEW",
        ipAddress: request.headers.get("x-forwarded-for") ?? undefined,
        userAgent: request.headers.get("user-agent") ?? undefined,
      },
    });

    // Add lead timeline event
    await addTimelineEvent(recording.orgId, {
      relatedToType: "LEAD",
      relatedToId: recording.leadId,
      eventType: "CALL_REVIEWED",
      description: `Call recording reviewed by manager ${session.user.name}. Quality Rating: ${rating}/5.`,
      details: {
        callAttemptId: recording.callAttemptId,
        recordingId: recording.id,
        reviewId: review.id,
        rating,
      },
      createdById: session.user.id,
    });

    return NextResponse.json({
      success: true,
      review,
    });
  } catch (error: any) {
    console.error("review API error:", error);
    return NextResponse.json({ error: error.message ?? "Internal Server Error" }, { status: 500 });
  }
}
