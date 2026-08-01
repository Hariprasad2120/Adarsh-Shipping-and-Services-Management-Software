import { CrmConfigurationState, CrmPermissionState } from "@/modules/crm/components/workspace/crm-workspace";
import React, { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import {
  getAccount,
  getNotes,
  getAttachments,
  listActivities,
  getTimelineEvents,
  listInvoices,
  listAccounts,
} from "@/modules/crm/service";
import { AccountDetailWrapper } from "./account-detail-wrapper";
interface AccountDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ search?: string }>;
}

export default async function AccountDetailPage({ params, searchParams }: AccountDetailPageProps) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context." />;
  }

  // Permission check
  try {
    await requirePermission(session.user.id, "crm.contact.manage");
  } catch {
    return <CrmPermissionState description="You do not have permission to view CRM accounts." />;
  }

  const { id } = await params;
  const awaitedSearchParams = await searchParams;
  const search = awaitedSearchParams.search || "";

  // Fetch account and related details in parallel, including the list of all accounts
  const [account, notes, attachments, activities, timeline, invoices, accounts] = await Promise.all([
    getAccount(orgId, id),
    getNotes(orgId, "ACCOUNT", id),
    getAttachments(orgId, "ACCOUNT", id),
    listActivities(orgId, { relatedToType: "ACCOUNT", relatedToId: id }),
    getTimelineEvents(orgId, "ACCOUNT", id),
    listInvoices(orgId, { customerId: id }),
    listAccounts(orgId, { search }),
  ]);

  if (!account) notFound();

  return (
    <Suspense fallback={<div className="p-8 text-center text-mono-muted text-xs animate-pulse">Loading Customer Profile...</div>}>
      <AccountDetailWrapper
        account={account}
        notes={notes}
        attachments={attachments}
        activities={activities}
        timeline={timeline}
        invoices={invoices}
        accounts={accounts as any}
        search={search}
      />
    </Suspense>
  );
}
