import { submitPortalCustomerChecklistDecision } from "@/modules/cha/service";
import type { getPortalSession } from "./auth";

type PortalSession = NonNullable<Awaited<ReturnType<typeof getPortalSession>>>;

export async function submitPortalChecklistDecision(
  session: Pick<PortalSession, "orgId" | "portalUser">,
  checklistId: string,
  decision: "APPROVED" | "REJECTED",
  remarks?: string,
) {
  return submitPortalCustomerChecklistDecision({
    orgId: session.orgId,
    customerId: session.portalUser.customerId,
    portalUserId: session.portalUser.id,
    checklistId,
    decision,
    remarks,
  });
}
