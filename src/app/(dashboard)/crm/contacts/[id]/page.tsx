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
import { ShieldAlert } from "lucide-react";

interface ContactDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
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
    await requirePermission(session.user.id, "crm.contact.manage");
  } catch (e) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm mt-1">You do not have permission to view CRM contacts.</p>
      </div>
    );
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
