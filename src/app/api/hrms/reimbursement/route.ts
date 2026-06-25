/**
 * Fuel Reimbursement Admin API
 *
 * GET: List claims, get rate
 * POST: Approve/reject/pay claims, update rate
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  listReimbursementClaims,
  approveReimbursementClaim,
  rejectReimbursementClaim,
  markReimbursementPaid,
  getActiveReimbursementRate,
} from "@/modules/hrms/on-duty";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (session.user as any).orgId;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    if (type === "rate") {
      const rate = await getActiveReimbursementRate(orgId);
      return NextResponse.json({ ok: true, data: rate });
    }

    if (type === "history") {
      const policies = await db.fuelReimbursementPolicy.findMany({
        where: { orgId },
        orderBy: { effectiveFrom: "desc" },
      });
      return NextResponse.json({ ok: true, data: policies });
    }

    const status = url.searchParams.get("status") || undefined;
    const claims = await listReimbursementClaims(orgId, status);
    return NextResponse.json({ ok: true, data: claims });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = (session.user as any).orgId;
    if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 });

    const body = await request.json();
    const { action, claimId, reason, ratePerKm } = body;

    // Update reimbursement rate
    if (action === "update_rate") {
      if (!ratePerKm || ratePerKm <= 0) {
        return NextResponse.json({ error: "Valid rate per km is required" }, { status: 400 });
      }

      // Deactivate old rates
      await db.fuelReimbursementPolicy.updateMany({
        where: { orgId, isActive: true },
        data: { isActive: false, effectiveTo: new Date() },
      });

      const policy = await db.fuelReimbursementPolicy.create({
        data: {
          orgId,
          ratePerKm,
          isActive: true,
          createdById: session.user.id,
        },
      });

      return NextResponse.json({ ok: true, data: policy });
    }

    if (!claimId) {
      return NextResponse.json({ error: "Claim ID is required" }, { status: 400 });
    }

    if (action === "approve") {
      const result = await approveReimbursementClaim(claimId, orgId, session.user.id);
      return NextResponse.json({ ok: true, data: result });
    }

    if (action === "reject") {
      const result = await rejectReimbursementClaim(claimId, orgId, session.user.id, reason);
      return NextResponse.json({ ok: true, data: result });
    }

    if (action === "pay") {
      const result = await markReimbursementPaid(claimId, orgId, session.user.id);
      return NextResponse.json({ ok: true, data: result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("reimbursement API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
