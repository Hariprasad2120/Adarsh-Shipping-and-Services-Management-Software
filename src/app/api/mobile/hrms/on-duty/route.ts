/**
 * On-Duty Request API — Mobile
 *
 * GET: List user's on-duty requests
 * POST: Create on-duty request / start trip / complete trip
 */
import { getMobileUser } from "@/lib/mobile-auth";
import { mobileJson, mobileOptions } from "@/lib/mobile-cors";
import {
  createOnDutyRequest,
  startOnDutyTrip,
  completeOnDutyTrip,
  listOnDutyRequests,
  createFuelReimbursementClaim,
  listUserReimbursements,
  getActiveReimbursementRate,
} from "@/modules/hrms/on-duty";

export async function OPTIONS() {
  return mobileOptions();
}

export async function GET(request: Request) {
  try {
    const user = await getMobileUser(request);
    if (!user) return mobileJson({ error: "Unauthorized" }, 401);
    if (!user.orgId) return mobileJson({ error: "No organization" }, 400);

    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    if (type === "reimbursements") {
      const claims = await listUserReimbursements(user.id, user.orgId);
      return mobileJson({ ok: true, data: claims });
    }

    if (type === "rate") {
      const rate = await getActiveReimbursementRate(user.orgId);
      return mobileJson({ ok: true, data: rate });
    }

    const requests = await listOnDutyRequests(user.id, user.orgId);
    return mobileJson({ ok: true, data: requests });
  } catch (error: any) {
    return mobileJson({ error: error.message ?? "Failed to fetch on-duty data" }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getMobileUser(request);
    if (!user) return mobileJson({ error: "Unauthorized" }, 401);
    if (!user.orgId) return mobileJson({ error: "No organization" }, 400);

    const body = await request.json();
    const { action } = body;

    // Start Trip
    if (action === "start") {
      let { requestId, location } = body;
      if (!location && (body.latitude !== undefined) && (body.longitude !== undefined)) {
        location = {
          lat: body.latitude,
          lng: body.longitude,
          accuracy: body.accuracy,
          timestamp: body.timestamp || new Date().toISOString(),
        };
      }
      if (!requestId) return mobileJson({ error: "Request ID required" }, 400);
      if (!location?.lat || !location?.lng) return mobileJson({ error: "Location required" }, 400);

      const result = await startOnDutyTrip(requestId, user.id, user.orgId, location);
      return mobileJson({ ok: true, data: result });
    }

    // Complete Trip
    if (action === "complete") {
      let { requestId, location } = body;
      if (!location && (body.latitude !== undefined) && (body.longitude !== undefined)) {
        location = {
          lat: body.latitude,
          lng: body.longitude,
          accuracy: body.accuracy,
          timestamp: body.timestamp || new Date().toISOString(),
        };
      }
      if (!requestId) return mobileJson({ error: "Request ID required" }, 400);
      if (!location?.lat || !location?.lng) return mobileJson({ error: "Location required" }, 400);

      const result = await completeOnDutyTrip(requestId, user.id, user.orgId, location);
      return mobileJson({ ok: true, data: result });
    }

    // Claim Reimbursement
    if (action === "claim_reimbursement") {
      const { requestId } = body;
      if (!requestId) return mobileJson({ error: "Request ID required" }, 400);

      const claim = await createFuelReimbursementClaim(requestId, user.id, user.orgId);
      return mobileJson({ ok: true, data: claim });
    }

    // Create Request (default action)
    const { fromDate, toDate, startTime, endTime, reason, purpose, clientReference, visitLocation, visitAddress, remarks, attachmentUrl } = body;

    if (!fromDate || !toDate || !reason) {
      return mobileJson({ error: "fromDate, toDate, and reason are required" }, 400);
    }

    const result = await createOnDutyRequest({
      orgId: user.orgId,
      userId: user.id,
      fromDate,
      toDate,
      startTime,
      endTime,
      reason,
      purpose,
      clientReference,
      visitLocation,
      visitAddress,
      remarks,
      attachmentUrl,
    });

    return mobileJson({ ok: true, data: result });
  } catch (error: any) {
    console.error("on-duty API error:", error);
    return mobileJson({ error: error.message ?? "On-duty action failed" }, 500);
  }
}
