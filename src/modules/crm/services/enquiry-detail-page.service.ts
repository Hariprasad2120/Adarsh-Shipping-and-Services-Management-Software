import { db } from "@/lib/db";
import {
  getAttachments,
  getLead,
  getNotes,
  getTimelineEvents,
  listActivities,
} from "@/modules/crm/service";

export async function loadEnquiryDetailPageData(params: {
  orgId: string;
  userId: string;
  leadId: string;
}) {
  const lead = await getLead(params.orgId, params.leadId);
  if (!lead) {
    return null;
  }

  const users = await db.user.findMany({
    where: { orgId: params.orgId, active: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const userRoles = await db.userRole.findMany({
    where: { userId: params.userId },
    include: { role: true },
  });

  const isManager = userRoles.some((ur) => {
    const roleName = ur.role.name.toLowerCase();
    return (
      roleName === "admin" ||
      roleName === "manager" ||
      roleName === "crm manager"
    );
  });

  const [notes, attachments, activities, timeline, workTimeLogs, calls] =
    await Promise.all([
      getNotes(params.orgId, "LEAD", params.leadId),
      getAttachments(params.orgId, "LEAD", params.leadId),
      listActivities(params.orgId, {
        relatedToType: "LEAD",
        relatedToId: params.leadId,
      }),
      getTimelineEvents(params.orgId, "LEAD", params.leadId),
      db.crmWorkTimeLog.findMany({
        where: {
          orgId: params.orgId,
          OR: [
            { leadId: params.leadId },
            lead.convertedAccountId
              ? { accountId: lead.convertedAccountId }
              : undefined,
          ].filter(Boolean) as Array<{ leadId?: string; accountId?: string }>,
        },
        include: { user: { select: { name: true } } },
        orderBy: { loggedAt: "desc" },
      }),
      db.crmCallAttempt.findMany({
        where: {
          orgId: params.orgId,
          leadId: params.leadId,
        },
        include: {
          salesperson: { select: { id: true, name: true, email: true } },
          recordings: {
            include: {
              transcript: true,
              reviews: {
                include: {
                  reviewer: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
        orderBy: { callStartedAt: "desc" },
      }),
    ]);

  return {
    lead,
    users,
    notes,
    attachments,
    activities,
    timeline,
    workTimeLogs,
    calls,
    isManager,
  };
}
