import { getPortalSession } from "@/modules/customer-portal/auth";
import { submitPortalChecklistDecision } from "@/modules/customer-portal/checklists";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ checklistId: string }> },
) {
  const session = await getPortalSession();
  if (!session?.portalUser?.id || !session.portalUser.customerId || !session.orgId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { decision?: string; remarks?: string }
    | null;

  const decision = body?.decision;
  if (decision !== "APPROVED" && decision !== "REJECTED") {
    return Response.json({ error: "Choose a valid checklist decision." }, { status: 400 });
  }

  const { checklistId } = await params;

  try {
    const result = await submitPortalChecklistDecision(session, checklistId, decision, body?.remarks);
    return Response.json({
      ok: true,
      outcome: result.outcome,
      checklistId: result.checklistId,
      jobId: result.jobId,
      jobNumber: result.jobNumber,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checklist decision failed.";
    if (message === "Checklist not found.") {
      return Response.json({ error: message }, { status: 404 });
    }
    if (
      message === "Checklist is not awaiting customer approval." ||
      message === "Checklist is not visible in the customer portal yet." ||
      message === "Checklist approval is not available yet." ||
      message === "This checklist already has a customer decision."
    ) {
      return Response.json({ error: message }, { status: 409 });
    }
    return Response.json({ error: "Checklist decision failed." }, { status: 500 });
  }
}
