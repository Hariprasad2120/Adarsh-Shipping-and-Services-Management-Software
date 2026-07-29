import { CrmConfigurationState, CrmPermissionState } from "@/components/monolith/crm-workspace";
import React from "react";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getDeal, getNotes, getAttachments, listActivities, getTimelineEvents } from "@/modules/crm/service";
import { DealDetailWrapper } from "./deal-detail-wrapper";
interface DealDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DealDetailPage({ params }: DealDetailPageProps) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context." />;
  }

  // Permission check
  try {
    await requirePermission(session.user.id, "crm.deal.manage");
  } catch (e) {
    return <CrmPermissionState description="You do not have permission to view CRM deals." />;
  }

  const { id } = await params;

  // Fetch deal, related list items, and linked sales invoice in parallel
  const [deal, notes, attachments, activities, timeline, invoice] = await Promise.all([
    getDeal(orgId, id),
    getNotes(orgId, "DEAL", id),
    getAttachments(orgId, "DEAL", id),
    listActivities(orgId, { relatedToType: "DEAL", relatedToId: id }),
    getTimelineEvents(orgId, "DEAL", id),
    db.salesInvoice.findFirst({ where: { orgId, crmDealId: id } }),
  ]);

  if (!deal) notFound();

  return (
    <DealDetailWrapper
      deal={deal}
      notes={notes}
      attachments={attachments}
      activities={activities}
      timeline={timeline}
      invoice={invoice}
    />
  );
}
