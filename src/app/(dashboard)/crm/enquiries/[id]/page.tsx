import React from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";
import {
  getLead,
  getNotes,
  getAttachments,
  listActivities,
  getTimelineEvents,
} from "@/modules/crm/service";
import { ShieldAlert } from "lucide-react";
import { EnquiryDetailClient } from "./enquiry-detail-client";

interface EnquiryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EnquiryDetailPage({ params }: EnquiryDetailPageProps) {
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
        <p className="text-sm mt-1">You do not have permission to view CRM enquiries.</p>
      </div>
    );
  }

  const { id } = await params;
  const lead = await getLead(orgId, id);
  if (!lead) notFound();

  if (lead.status !== "INTERESTED" && lead.status !== "FOLLOW_UP") {
    redirect(`/crm/leads/${id}`);
  }

  // Fetch active users for the manager assignment dropdown
  const users = await db.user.findMany({
    where: { orgId, active: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" }
  });

  // Check if current user is manager or admin
  const userRoles = await db.userRole.findMany({
    where: { userId: session.user.id },
    include: { role: true }
  });

  const isManager = userRoles.some(
    (ur) =>
      ur.role.name.toLowerCase() === "admin" ||
      ur.role.name.toLowerCase() === "manager" ||
      ur.role.name.toLowerCase() === "crm manager"
  );

  // Parallel fetches for notes, attachments, activities, timeline, work logs, and calls
  const [notes, attachments, activities, timeline, workTimeLogs, calls] = await Promise.all([
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
    <EnquiryDetailClient
      lead={lead}
      users={users}
      notes={notes}
      attachments={attachments}
      activities={activities}
      timeline={timeline}
      workTimeLogs={workTimeLogs}
      calls={calls}
      isManager={isManager}
    />
  );
}
