import { db } from "@/lib/db";
import { getMobileUser } from "@/lib/mobile-auth";
import { mobileJson, mobileOptions } from "@/lib/mobile-cors";

export async function OPTIONS() {
  return mobileOptions();
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const { leadId } = await params;
    const user = await getMobileUser(request);
    if (!user) {
      return mobileJson({ error: "Unauthorized" }, 401);
    }

    const body = await request.json().catch(() => ({}));
    const { status, reason, enquiryDetails } = body;

    const validStatuses = ["INTERESTED", "NOT_INTERESTED", "NOT_PICKED", "NOT_REACHABLE", "CONTACTED", "NEW"];
    if (!status || !validStatuses.includes(status)) {
      return mobileJson(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        400
      );
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

    // Build the update data
    const updateData: any = {
      status,
      updatedById: user.id,
    };

    if (status === "NOT_INTERESTED" && reason) {
      updateData.notInterestedReason = reason;
    }

    if (status === "INTERESTED" && enquiryDetails) {
      updateData.enquiryDetails = enquiryDetails;
    }

    // Update the lead
    const updatedLead = await db.crmLead.update({
      where: { id: leadId },
      data: updateData,
    });

    // For NOT_PICKED / NOT_REACHABLE — create a 2-hour follow-up reminder
    if (status === "NOT_PICKED" || status === "NOT_REACHABLE") {
      const twoHoursLater = new Date(Date.now() + 2 * 60 * 60 * 1000);

      await db.crmLeadReminder.create({
        data: {
          orgId: user.orgId ?? "",
          leadId,
          userId: lead.ownerId,
          alertAt: twoHoursLater,
          status: "PENDING",
        },
      });
    }

    return mobileJson({ success: true, lead: updatedLead });
  } catch (error: any) {
    console.error("mobile lead status update API error:", error);
    return mobileJson(
      { error: error.message ?? "Internal Server Error" },
      500
    );
  }
}
