import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getPortalSession } from "@/modules/customer-portal/auth";
import { submitPortalChecklistDecision } from "@/modules/customer-portal/service";

const schema = z.object({
  jobId: z.string().min(1),
  checklistId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  remarks: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = schema.parse(await request.json());
    await submitPortalChecklistDecision({
      portalUserId: session.portalUserId,
      ...body,
    });
    revalidatePath(`/customer-portal/shipments/${body.jobId}`);
    revalidatePath("/customer-portal/shipments");
    revalidatePath("/customer-portal/dashboard");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checklist response failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
