import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listAccounts } from "@/modules/crm/service";
import { requirePermission } from "@/lib/rbac";
import {
  Building,
  Plus,
  Phone,
  Mail,
  Eye,
  Globe,
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { deleteAccountAction } from "@/modules/crm/actions";
import { DeleteRecordButton } from "../_components/delete-record-button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-table";
import { CrmListFilters } from "../_components/crm-list-filters";

interface SearchParams {
  search?: string;
}

export default async function CrmAccountsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
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

  // Permission Guard
  try {
    await requirePermission(session.user.id, "crm.contact.manage"); // maps to manage contacts/accounts in RBAC
  } catch {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm mt-1">You do not have permission to view CRM accounts.</p>
      </div>
    );
  }

  const awaitedParams = await searchParams;
  const search = awaitedParams.search || "";

  // Fetch accounts from db
  const accounts = await listAccounts(orgId, { search });

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-4 border-b border-outline-variant/30 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-on-surface">Accounts</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Manage partner organizations, clients, and suppliers in your logistics network.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/crm/accounts/new"
            className="flex items-center gap-2 bg-[#00c4b6] hover:bg-[#00b0a3] text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md shadow-[#00c4b6]/10 cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Create Account</span>
          </Link>
        </div>
      </div>

      <CrmListFilters
        resultCount={accounts.length}
        searchPlaceholder="Search accounts by name, website, tax ID..."
        singularLabel="account"
      />

      <DataTable>
        <DataTableHeader>
          <tr>
            <DataTableHead>Account Name</DataTableHead>
            <DataTableHead>Type</DataTableHead>
            <DataTableHead>Website</DataTableHead>
            <DataTableHead>Contact Info</DataTableHead>
            <DataTableHead>Status</DataTableHead>
            <DataTableHead>Owner</DataTableHead>
            <DataTableHead className="text-right">Actions</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {accounts.length === 0 ? (
            <DataTableEmpty
              colSpan={7}
              className="px-6 py-12"
              message={
                <div className="space-y-4 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
                    <Building className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-on-surface">No active accounts found</h3>
                    <p className="mx-auto max-w-sm text-xs text-on-surface-variant">
                      Create a fresh customer account to track deals and financial activity.
                    </p>
                  </div>
                  <Link href="/crm/accounts/new" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00c4b6] hover:underline">
                    <span>Create first account</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              }
            />
          ) : (
            accounts.map((account) => (
              <DataTableRow key={account.id}>
                <DataTableCell>
                  <Link href={`/crm/accounts/${account.id}`} className="block font-medium text-on-surface transition-all hover:text-[#00c4b6]">
                    {account.name}
                  </Link>
                  {account.industry ? <span className="block text-[11px] text-on-surface-variant">{account.industry}</span> : null}
                </DataTableCell>
                <DataTableCell className="text-xs font-medium text-on-surface-variant">
                  {account.type || "Customer"}
                </DataTableCell>
                <DataTableCell className="text-xs">
                  {account.website ? (
                    <a href={account.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#00c4b6] hover:underline">
                      <Globe className="size-3.5" />
                      <span>Visit Web</span>
                    </a>
                  ) : (
                    <span className="italic text-on-surface-variant">No website</span>
                  )}
                </DataTableCell>
                <DataTableCell className="space-y-1">
                  {account.email ? (
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                      <Mail className="size-3.5 text-on-surface-variant" />
                      <span className="truncate">{account.email}</span>
                    </div>
                  ) : null}
                  {account.phone ? (
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                      <Phone className="size-3.5 text-on-surface-variant" />
                      <span>{account.phone}</span>
                    </div>
                  ) : null}
                </DataTableCell>
                <DataTableCell>
                  <span className="inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                    {account.status || "ACTIVE"}
                  </span>
                </DataTableCell>
                <DataTableCell className="text-sm font-medium text-on-surface">
                  {account.owner.name}
                </DataTableCell>
                <DataTableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/crm/accounts/${account.id}`}
                      className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                      title="View 360 Details"
                    >
                      <Eye className="size-4" />
                    </Link>
                    <DeleteRecordButton
                      recordId={account.id}
                      deleteAction={deleteAccountAction}
                      confirmMessage="Are you sure you want to delete this account? This will cascade-delete child contacts too."
                      className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-red-500/10 hover:text-red-500"
                    />
                  </div>
                </DataTableCell>
              </DataTableRow>
            ))
          )}
        </DataTableBody>
      </DataTable>
    </div>
  );
}
