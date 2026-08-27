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
  createOnDutyRequest,
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
      select: { id: true, name: true, email: true, designation: true },
      orderBy: { name: "asc" },
    });
    const reportIds = directReports.map((report) => report.id);
    const scopeIds = Array.from(new Set([session.user.id, ...reportIds]));
    const requestUsers = [
      {
        id: session.user.id,
        name: session.user.name ?? "Me",
        email: session.user.email ?? "",
        designation: "Self",
      },
      ...directReports,
    ];

    if (reportIds.length === 0) {
      const ownRequests = await db.onDutyRequest.findMany({
        where: { orgId, userId: session.user.id },
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
      });

      return NextResponse.json({
        ok: true,
        data: {
          summary: {
            directReports: 0,
            totalRequests: ownRequests.length,
            pendingApprovals: 0,
            approvedAwaitingStart: ownRequests.filter((request) => request.status === "APPROVED").length,
            activeTrips: ownRequests.filter((request) => request.status === "ACTIVE").length,
            openAlerts: 0,
            claimsInFlight: 0,
            settlementExposure: 0,
            completedThisMonth: ownRequests.filter((request) => request.status === "COMPLETED" && request.completedAt && request.completedAt >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length,
            averageDistanceKm: 0,
          },
          requestUsers,
          pendingApprovals: [],
          activeTrips: ownRequests.filter((request) => request.status === "ACTIVE"),
          recentRequests: ownRequests,
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
          where: { orgId, userId: { in: scopeIds }, status: "ACTIVE" },
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
          where: { orgId, userId: { in: scopeIds } },
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
            userId: { in: scopeIds },
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
          where: { orgId, userId: { in: scopeIds } },
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
          where: { orgId, userId: { in: scopeIds } },
        }),
        db.onDutyRequest.count({
          where: { orgId, userId: { in: scopeIds }, status: "APPROVED" },
        }),
        db.onDutyRequest.count({
          where: {
            orgId,
            userId: { in: scopeIds },
            status: "COMPLETED",
            completedAt: { gte: monthStart },
          },
        }),
        db.fuelReimbursementClaim.count({
          where: {
            orgId,
            userId: { in: scopeIds },
            status: { in: ["PENDING", "APPROVED"] },
          },
        }),
        db.fuelReimbursementClaim.aggregate({
          where: {
            orgId,
            userId: { in: scopeIds },
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
        requestUsers,
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

    if (action === "create") {
      const {
        userId,
        fromDate,
        toDate,
        startTime,
        endTime,
        purpose,
        reason: requestReason,
        clientReference,
        visitLocation,
        visitAddress,
        remarks,
      } = body;
      const targetUserId = userId || session.user.id;

      if (!fromDate || !toDate || !requestReason) {
        return NextResponse.json(
          { error: "From date, to date, and reason are required" },
          { status: 400 },
        );
      }

      if (targetUserId !== session.user.id) {
        const report = await db.user.findFirst({
          where: { id: targetUserId, orgId, managerId: session.user.id },
          select: { id: true },
        });
        if (!report) {
          return NextResponse.json(
            { error: "You can only create on-duty requests for yourself or your direct reports" },
            { status: 403 },
          );
        }
      }

      const result = await createOnDutyRequest({
        orgId,
        userId: targetUserId,
        fromDate,
        toDate,
        startTime,
        endTime,
        reason: requestReason,
        purpose,
        clientReference,
        visitLocation,
        visitAddress,
        remarks,
      });
      return NextResponse.json({ ok: true, data: result });
    }

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
