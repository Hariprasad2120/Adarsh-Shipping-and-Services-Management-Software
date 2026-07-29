import { CrmConfigurationState, CrmPermissionState } from "@/components/monolith/crm-workspace";
import React from "react";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import {
  getLead,
  getNotes,
  getAttachments,
  listActivities,
  getTimelineEvents,
} from "@/modules/crm/service";
import { LeadDetailWrapper } from "./lead-detail-wrapper";
interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context." />;
  }

  // Permission check
  try {
    await requirePermission(session.user.id, "crm.lead.read");
  } catch (e) {
    return <CrmPermissionState description="You do not have permission to view CRM leads." />;
  }

  const { id } = await params;
  const lead = await getLead(orgId, id);
  if (!lead) notFound();

  if (lead.status === "INTERESTED" || lead.status === "FOLLOW_UP") {
    redirect(`/crm/enquiries/${id}`);
  }

  // Check manager status for playback and rating access
  const userRoles = await db.userRole.findMany({
    where: { userId: session.user.id },
    include: { role: true },
  });
  const isManagerOrAdmin =
    session.user.isPlatformAdmin ||
    userRoles.some((ur) =>
      ["admin", "manager", "crm manager", "hr", "director", "management"].includes(
        ur.role.name.toLowerCase()
      )
    );

  // Parallel fetches for related list items, work logs, quotes, and call logs
  const [notes, attachments, activities, timeline, workTimeLogs, quotes, calls] = await Promise.all([
    getNotes(orgId, "LEAD", id),
    getAttachments(orgId, "LEAD", id),
    listActivities(orgId, { relatedToType: "LEAD", relatedToId: id }),
    getTimelineEvents(orgId, "LEAD", id),
    db.crmWorkTimeLog.findMany({
      where: {
        orgId,
        OR: [
          { leadId: id },
          lead.convertedAccountId ? { accountId: lead.convertedAccountId } : undefined,
        ].filter(Boolean) as any,
      },
      include: { user: { select: { name: true } } },
      orderBy: { loggedAt: "desc" },
    }),
    db.crmInvoice.findMany({
      where: {
        orgId,
        OR: [
          { crmLeadId: id },
          lead.convertedAccountId ? { accountId: lead.convertedAccountId, type: "QUOTE" } : undefined,
        ].filter(Boolean) as any,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.crmCallAttempt.findMany({
      where: {
        orgId,
        leadId: id,
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

  return (
    <LeadDetailWrapper
      lead={lead}
      notes={notes}
      attachments={attachments}
      activities={activities}
      timeline={timeline}
      workTimeLogs={workTimeLogs}
      quotes={quotes}
      calls={calls}
      isManagerOrAdmin={isManagerOrAdmin}
    />
  );
}
