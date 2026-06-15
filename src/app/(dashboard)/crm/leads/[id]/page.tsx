import React from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  getLead,
  getNotes,
  getAttachments,
  listActivities,
  getTimelineEvents,
} from "@/modules/crm/service";
import { LeadDetailWrapper } from "./lead-detail-wrapper";
import { ShieldAlert } from "lucide-react";

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
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
    await requirePermission(session.user.id, "crm.lead.read");
  } catch (e) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm mt-1">You do not have permission to view CRM leads.</p>
      </div>
    );
  }

  const { id } = await params;

  // Parallel fetches for Lead and all related list items
  const [lead, notes, attachments, activities, timeline] = await Promise.all([
    getLead(orgId, id),
    getNotes(orgId, "LEAD", id),
    getAttachments(orgId, "LEAD", id),
    listActivities(orgId, { relatedToType: "LEAD", relatedToId: id }),
    getTimelineEvents(orgId, "LEAD", id),
  ]);

  if (!lead) notFound();

  return (
    <LeadDetailWrapper
      lead={lead}
      notes={notes}
      attachments={attachments}
      activities={activities}
      timeline={timeline}
    />
  );
}
