import { CrmConfigurationState, CrmPermissionState } from "@/components/monolith/crm-workspace";
import React from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  getContact,
  getNotes,
  getAttachments,
  listActivities,
  getTimelineEvents,
} from "@/modules/crm/service";
import { ContactDetailWrapper } from "./contact-detail-wrapper";
interface ContactDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context." />;
  }

  // Permission check
  try {
    await requirePermission(session.user.id, "crm.contact.manage");
  } catch (e) {
    return <CrmPermissionState description="You do not have permission to view CRM contacts." />;
  }

  const { id } = await params;

  // Fetch contact and related items in parallel
  const [contact, notes, attachments, activities, timeline] = await Promise.all([
    getContact(orgId, id),
    getNotes(orgId, "CONTACT", id),
    getAttachments(orgId, "CONTACT", id),
    listActivities(orgId, { relatedToType: "CONTACT", relatedToId: id }),
    getTimelineEvents(orgId, "CONTACT", id),
  ]);

  if (!contact) notFound();

  return (
    <ContactDetailWrapper
      contact={contact}
      notes={notes}
      attachments={attachments}
      activities={activities}
      timeline={timeline}
    />
  );
}
