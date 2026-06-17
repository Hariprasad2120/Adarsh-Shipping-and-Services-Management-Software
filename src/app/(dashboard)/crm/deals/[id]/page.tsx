import React from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import { getDeal, getNotes, getAttachments, listActivities, getTimelineEvents } from "@/modules/crm/service";
import { DealDetailWrapper } from "./deal-detail-wrapper";
import { ShieldAlert } from "lucide-react";

interface DealDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DealDetailPage({ params }: DealDetailPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Configuration Error</h2>
        <p className="text-sm mt-1">Missing organisation context.</p>
      </div>
    );
  }

  // Permission check
  try {
    await requirePermission(session.user.id, "crm.deal.manage");
  } catch (e) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm mt-1">You do not have permission to view CRM deals.</p>
      </div>
    );
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
