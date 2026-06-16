import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listLeads } from "@/modules/crm/service";
import { requirePermission } from "@/lib/rbac";
import {
  UserPlus,
  Briefcase,
  Mail,
  Phone,
  Eye,
  ShieldAlert,
  ArrowRight,
  Users
} from "lucide-react";
import { deleteLeadAction } from "@/modules/crm/actions";
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
import { LeadsFilters } from "./leads-filters";

interface SearchParams {
  search?: string;
  status?: string;
}

export default async function CrmLeadsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
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
    await requirePermission(session.user.id, "crm.lead.read");
  } catch {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm mt-1">You do not have permission to view CRM leads.</p>
      </div>
    );
  }

  const awaitedParams = await searchParams;
  const search = awaitedParams.search || "";
  const status = awaitedParams.status || "";

  // Fetch leads from db
  const leads = await listLeads(orgId, { search, status });

  // Standard lead statuses for dropdown/filters
  const leadStatuses = ["NEW", "CONTACTED", "QUALIFIED", "LOST", "ATTEMPTED_TO_CONTACT"];

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-4 border-b border-outline-variant/30 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface">Leads Module</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Manage and qualify fresh enquiries from customer and logistics channels.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/crm/leads/new"
            className="flex items-center gap-2 bg-[#00c4b6] hover:bg-[#00b0a3] text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md shadow-[#00c4b6]/10 cursor-pointer"
          >
            <UserPlus className="size-4" />
            <span>Create Lead</span>
          </Link>
        </div>
      </div>

      <LeadsFilters leadStatuses={leadStatuses} resultCount={leads.length} />

      {/* Leads Data Table */}
      <DataTable>
        <DataTableHeader>
          <tr>
            <DataTableHead>Lead Name</DataTableHead>
            <DataTableHead>Company</DataTableHead>
            <DataTableHead>Contact Info</DataTableHead>
            <DataTableHead>Source</DataTableHead>
            <DataTableHead>Lead Status</DataTableHead>
            <DataTableHead>Owner</DataTableHead>
            <DataTableHead className="text-right">Actions</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {leads.length === 0 ? (
            <DataTableEmpty
              colSpan={7}
              className="px-6 py-12"
              message={
                <div className="space-y-4 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
                    <Users className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-on-surface">No active leads found</h3>
                    <p className="mx-auto max-w-sm text-xs text-on-surface-variant">
                      Either refine your filters or create a fresh lead record to get started with validation.
                    </p>
                  </div>
                  <Link
                    href="/crm/leads/new"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00c4b6] hover:underline"
                  >
                    <span>Onboard a new lead</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              }
            />
          ) : (
            leads.map((lead) => (
              <DataTableRow key={lead.id}>
                <DataTableCell className="font-bold">
                  <Link href={`/crm/leads/${lead.id}`} className="block text-on-surface transition-all hover:text-[#00c4b6]">
                    {lead.firstName ? `${lead.firstName} ` : ""}{lead.lastName}
                  </Link>
                  {lead.designation && (
                    <span className="block text-[11px] font-normal text-on-surface-variant">{lead.designation}</span>
                  )}
                </DataTableCell>
                <DataTableCell>
                  <div className="flex items-center gap-1.5 text-on-surface">
                    <Briefcase className="size-3.5 text-on-surface-variant" />
                    <span>{lead.company}</span>
                  </div>
                </DataTableCell>
                <DataTableCell className="space-y-1">
                  {lead.email && (
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                      <Mail className="size-3.5 text-on-surface-variant" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                      <Phone className="size-3.5 text-on-surface-variant" />
                      <span>{lead.phone}</span>
                    </div>
                  )}
                </DataTableCell>
                <DataTableCell className="text-xs font-semibold uppercase text-on-surface-variant">
                  {lead.source || "Cold Call"}
                </DataTableCell>
                <DataTableCell>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    lead.status === "NEW"
                      ? "bg-blue-500/10 text-blue-600"
                      : lead.status === "LOST"
                      ? "bg-red-500/10 text-red-500"
                      : lead.status === "QUALIFIED"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-amber-500/10 text-amber-600"
                  }`}>
                    {lead.status.replaceAll("_", " ")}
                  </span>
                </DataTableCell>
                <DataTableCell className="text-sm font-medium text-on-surface">
                  {lead.owner.name}
                </DataTableCell>
                <DataTableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/crm/leads/${lead.id}`}
                      className="rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                      title="View Details"
                    >
                      <Eye className="size-4" />
                    </Link>
                    <DeleteRecordButton
                      recordId={lead.id}
                      deleteAction={deleteLeadAction}
                      confirmMessage="Are you sure you want to delete this lead?"
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
