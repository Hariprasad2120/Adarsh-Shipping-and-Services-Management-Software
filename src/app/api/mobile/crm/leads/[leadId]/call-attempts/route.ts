import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMobileUser } from "@/lib/mobile-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;
    const user = await getMobileUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lead = await db.crmLead.findFirst({
      where: {
        id: leadId,
        orgId: user.orgId ?? undefined,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const customerPhone = body.customerPhone || lead.mobile || lead.phone || "";

    if (!customerPhone) {
      return NextResponse.json({ error: "Customer phone number is required" }, { status: 400 });
    }

    const attempt = await db.crmCallAttempt.create({
      data: {
        orgId: user.orgId ?? "",
        leadId,
        salespersonId: user.id,
        customerPhone,
        status: "PENDING",
      },
    });

    return NextResponse.json({ callAttemptId: attempt.id });
  } catch (error: any) {
    console.error("mobile call attempts API error:", error);
    return NextResponse.json({ error: error.message ?? "Internal Server Error" }, { status: 500 });
  }
}
