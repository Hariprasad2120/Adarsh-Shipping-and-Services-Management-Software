import React from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  getAccount,
  getNotes,
  getAttachments,
  listActivities,
  getTimelineEvents,
  listInvoices,
} from "@/modules/crm/service";
import { AccountDetailWrapper } from "./account-detail-wrapper";
import { ShieldAlert } from "lucide-react";

interface AccountDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AccountDetailPage({ params }: AccountDetailPageProps) {
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
        <p className="text-sm mt-1">You do not have permission to view CRM accounts.</p>
      </div>
    );
  }

  const { id } = await params;

  // Fetch account and related details in parallel
  const [account, notes, attachments, activities, timeline, invoices] = await Promise.all([
    getAccount(orgId, id),
    getNotes(orgId, "ACCOUNT", id),
    getAttachments(orgId, "ACCOUNT", id),
    listActivities(orgId, { relatedToType: "ACCOUNT", relatedToId: id }),
    getTimelineEvents(orgId, "ACCOUNT", id),
    listInvoices(orgId, { customerId: id }),
  ]);

  if (!account) notFound();

  return (
    <AccountDetailWrapper
      account={account}
      notes={notes}
      attachments={attachments}
      activities={activities}
      timeline={timeline}
      invoices={invoices}
    />
  );
}
