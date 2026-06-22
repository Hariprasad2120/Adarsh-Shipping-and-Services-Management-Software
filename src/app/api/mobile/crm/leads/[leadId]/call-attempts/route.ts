import { db } from "@/lib/db";
import { getMobileUser } from "@/lib/mobile-auth";
import { mobileJson, mobileOptions } from "@/lib/mobile-cors";

export async function OPTIONS() {
  return mobileOptions();
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;
    const user = await getMobileUser(request);
    if (!user) {
      return mobileJson({ error: "Unauthorized" }, 401);
    }

    const lead = await db.crmLead.findFirst({
      where: {
        id: leadId,
        orgId: user.orgId ?? undefined,
      },
    });

    if (!lead) {
      return mobileJson({ error: "Lead not found" }, 404);
    }

    const body = await request.json().catch(() => ({}));
    const customerPhone = body.customerPhone || lead.mobile || lead.phone || "";

    if (!customerPhone) {
      return mobileJson({ error: "Customer phone number is required" }, 400);
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

    return mobileJson({ callAttemptId: attempt.id });
  } catch (error: any) {
    console.error("mobile call attempts API error:", error);
    return mobileJson({ error: error.message ?? "Internal Server Error" }, 500);
  }
}
