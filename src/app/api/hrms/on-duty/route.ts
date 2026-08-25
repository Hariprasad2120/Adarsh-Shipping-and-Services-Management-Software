/**
 * On-Duty Admin API
 *
 * GET: List pending approvals, active trips
 * POST: Approve/reject on-duty requests
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  listPendingApprovals,
  approveOnDutyRequest,
  rejectOnDutyRequest,
  getOnDutyRouteHistory,
} from "@/modules/hrms/on-duty";

const reportUserSelect = {
  id: true,
  name: true,
  email: true,
  designation: true,
} as const;

function getOrgIdFromSessionUser(user: { orgId?: string } | null | undefined) {
  return user?.orgId ?? null;
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = getOrgIdFromSessionUser(session.user as { orgId?: string });
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    if (type === "route") {
      const requestId = url.searchParams.get("requestId");
      if (!requestId) return NextResponse.json({ error: "Request ID required" }, { status: 400 });

      const route = await getOnDutyRouteHistory(requestId, orgId);
      return NextResponse.json({ ok: true, data: route });
    }

    const directReports = await db.user.findMany({
      where: { managerId: session.user.id, orgId },
      select: { id: true },
    });
    const reportIds = directReports.map((report) => report.id);

    if (reportIds.length === 0) {
      return NextResponse.json({
        ok: true,
        data: {
          summary: {
            directReports: 0,
            totalRequests: 0,
            pendingApprovals: 0,
            approvedAwaitingStart: 0,
            activeTrips: 0,
            openAlerts: 0,
            claimsInFlight: 0,
            settlementExposure: 0,
            completedThisMonth: 0,
            averageDistanceKm: 0,
          },
          pendingApprovals: [],
          activeTrips: [],
          recentRequests: [],
          trackingAlerts: [],
          reimbursementClaims: [],
        },
      });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      pendingApprovals,
      activeTrips,
      recentRequests,
      trackingAlerts,
      reimbursementClaims,
      totalRequests,
      approvedAwaitingStart,
      completedThisMonth,
      claimsInFlightCount,
      claimsInFlightAggregate,
    ] =
      await Promise.all([
        listPendingApprovals(session.user.id, orgId),
        db.onDutyRequest.findMany({
          where: { orgId, userId: { in: reportIds }, status: "ACTIVE" },
          include: {
            user: { select: reportUserSelect },
            trackingSessions: {
              where: { status: "ACTIVE" },
              include: {
                locationPoints: {
                  orderBy: { timestamp: "desc" },
                  take: 1,
                },
              },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
          orderBy: { startedAt: "desc" },
        }),
        db.onDutyRequest.findMany({
          where: { orgId, userId: { in: reportIds } },
          include: {
            user: { select: reportUserSelect },
            trackingSessions: {
              include: {
                locationPoints: {
                  orderBy: { timestamp: "desc" },
                  take: 1,
                },
              },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
          orderBy: { createdAt: "desc" },
          take: 24,
        }),
        db.trackingAlert.findMany({
          where: {
            orgId,
            userId: { in: reportIds },
            resolvedAt: null,
            onDutyRequestId: { not: null },
          },
          include: {
            user: { select: reportUserSelect },
          },
          orderBy: { createdAt: "desc" },
          take: 12,
        }),
        db.fuelReimbursementClaim.findMany({
          where: { orgId, userId: { in: reportIds } },
          include: {
            user: { select: reportUserSelect },
            onDutyRequest: {
              select: {
                id: true,
                fromDate: true,
                toDate: true,
                purpose: true,
                reason: true,
                totalDistanceKm: true,
                status: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 12,
        }),
        db.onDutyRequest.count({
          where: { orgId, userId: { in: reportIds } },
        }),
        db.onDutyRequest.count({
          where: { orgId, userId: { in: reportIds }, status: "APPROVED" },
        }),
        db.onDutyRequest.count({
          where: {
            orgId,
            userId: { in: reportIds },
            status: "COMPLETED",
            completedAt: { gte: monthStart },
          },
        }),
        db.fuelReimbursementClaim.count({
          where: {
            orgId,
            userId: { in: reportIds },
            status: { in: ["PENDING", "APPROVED"] },
          },
        }),
        db.fuelReimbursementClaim.aggregate({
          where: {
            orgId,
            userId: { in: reportIds },
            status: { in: ["PENDING", "APPROVED"] },
          },
          _sum: { amount: true },
        }),
      ]);

    const completedRequests = recentRequests.filter(
      (item) => item.status === "COMPLETED",
    );
    const averageDistanceKm =
      completedRequests.length > 0
        ? Number(
            (
              completedRequests.reduce(
                (sum, item) => sum + (item.totalDistanceKm ?? 0),
                0,
              ) / completedRequests.length
            ).toFixed(1),
          )
        : 0;
    const settlementExposure = Number(
      Number(claimsInFlightAggregate._sum.amount ?? 0).toFixed(2),
    );

    return NextResponse.json({
      ok: true,
      data: {
        summary: {
          directReports: reportIds.length,
          totalRequests,
          pendingApprovals: pendingApprovals.length,
          approvedAwaitingStart,
          activeTrips: activeTrips.length,
          openAlerts: trackingAlerts.length,
          claimsInFlight: claimsInFlightCount,
          settlementExposure,
          completedThisMonth,
          averageDistanceKm,
        },
        pendingApprovals,
        activeTrips,
        recentRequests,
        trackingAlerts,
        reimbursementClaims,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load on-duty data" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = getOrgIdFromSessionUser(session.user as { orgId?: string });
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const body = await request.json();
    const { action, requestId, reason } = body;

    if (!requestId) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
    }

    if (action === "approve") {
      const result = await approveOnDutyRequest(requestId, orgId, session.user.id);
      return NextResponse.json({ ok: true, data: result });
    }

    if (action === "reject") {
      const result = await rejectOnDutyRequest(requestId, orgId, session.user.id, reason);
      return NextResponse.json({ ok: true, data: result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("on-duty admin API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update on-duty request" },
      { status: 500 },
    );
  }
}
