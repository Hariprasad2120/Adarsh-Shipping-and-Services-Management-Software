import { NextResponse } from "next/server";
import { z } from "zod";
import { getPortalSession } from "@/modules/customer-portal/auth";
import { submitPortalShipmentRating } from "@/modules/customer-portal/service";

const schema = z.object({
  jobId: z.string().min(1),
  overallRating: z.number().min(1).max(5),
  remarks: z.string().optional(),
  categoryRatings: z.record(z.string(), z.number().min(1).max(5)),
});

export async function POST(request: Request) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = schema.parse(await request.json());
    const result = await submitPortalShipmentRating({
      portalUserId: session.portalUserId,
      ...body,
    });
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rating submission failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
