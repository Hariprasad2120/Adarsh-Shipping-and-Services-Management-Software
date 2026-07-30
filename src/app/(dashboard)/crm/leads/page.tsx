import { CrmButton, CrmInput, CrmTable, CrmConfigurationState, CrmPermissionState } from "@/modules/crm/components/workspace/crm-workspace";
import { NativeSelect } from "@/components/ui/native-select";
import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listLeads } from "@/modules/crm/service";
import { requirePermission } from "@/lib/rbac";
import {
  Search,
  UserPlus,
  Briefcase,
  Mail,
  Phone,
  Tag,
  Eye,
  Trash2,
  Filter,
  ArrowRight,
  Users
} from "lucide-react";
import { deleteLeadAction } from "@/modules/crm/actions";
import { DeleteRecordButton } from "@/modules/crm/components/delete-record-button";

interface SearchParams {
  search?: string;
  status?: string;
  tab?: string;
}

export default async function CrmLeadsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <CrmConfigurationState description="Missing organisation context." />;
  }

  // Permission Guard
  try {
    await requirePermission(session.user.id, "crm.lead.read");
  } catch (e) {
    return <CrmPermissionState description="You do not have permission to view CRM leads." />;
  }

  const awaitedParams = await searchParams;
  const search = awaitedParams.search || "";
  const status = awaitedParams.status || "";
  const tab = awaitedParams.tab || "unopened";

  // Fetch leads from db
  const leads = await listLeads(orgId, { search, status });

  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  // Partition leads:
  // 1. Unopened / Active: NEW status (or anything other than INTERESTED, FOLLOW_UP, NOT_INTERESTED, NOT_PICKED, NOT_REACHABLE)
  //    OR (NOT_PICKED / NOT_REACHABLE status AND 2-hour window has expired, i.e., updatedAt <= twoHoursAgo)
  const unopenedLeads = leads.filter((lead) => {
    if (lead.status === "NOT_INTERESTED") return false;
    if (lead.status === "NOT_PICKED" || lead.status === "NOT_REACHABLE") {
      return new Date(lead.updatedAt) <= twoHoursAgo;
    }
    return true;
  });

  const notInterestedLeads = leads.filter((lead) => lead.status === "NOT_INTERESTED");

  const unreachableLeads = leads.filter((lead) => {
    if (lead.status === "NOT_PICKED" || lead.status === "NOT_REACHABLE") {
      return new Date(lead.updatedAt) > twoHoursAgo;
    }
    return false;
  });

  let displayedLeads = unopenedLeads;
  if (tab === "not_interested") {
    displayedLeads = notInterestedLeads;
  } else if (tab === "unreachable") {
    displayedLeads = unreachableLeads;
  }

  // Helper function to format the remaining timer window
  function formatTimer(updatedAt: Date): string {
    const diffMs = (new Date(updatedAt).getTime() + 2 * 60 * 60 * 1000) - now.getTime();
    if (diffMs <= 0) return "Ready";
    const mins = Math.ceil(diffMs / (60 * 1000));
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}h ${remMins}m left`;
    }
    return `${mins}m left`;
  }

  // Standard lead statuses for dropdown/filters
  const leadStatuses = ["NEW", "CONTACTED", "QUALIFIED", "LOST", "ATTEMPTED_TO_CONTACT", "NOT_INTERESTED", "NOT_PICKED", "NOT_REACHABLE"];

  return (
    <div className="space-y-6">

      {/* Unified Table Shell — toolbar + tabs + table in one rounded container */}
      <div className="overflow-hidden rounded-xl border border-mono-border bg-mono-card shadow-sm">

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 border-b border-mono-border">
          <form method="GET" className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
            <CrmInput type="hidden" name="tab" value={tab} />
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-mono-muted" />
              <CrmInput
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search leads by name, email, company..."
                className="w-full pl-9 pr-3 py-1.5 bg-mono-soft rounded-lg text-sm text-mono-text placeholder:text-placeholder focus:outline-none"
              />
            </div>

            {/* Status Filter */}
            <div className="relative min-w-[200px]">
              <NativeSelect
                name="status"
                defaultValue={status}
                className="w-full pl-3 pr-8 py-1.5 bg-mono-soft rounded-lg text-sm text-mono-text focus:outline-none"
              >
                <option value="">All Statuses</option>
                {leadStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <CrmButton
              type="submit"
              className="px-4 py-1.5 bg-mono-soft hover:bg-mono-soft border border-mono-border text-mono-text rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              Apply Filters
            </CrmButton>
            
            {(search || status) && (
              <Link
                href={`/crm/leads?tab=${tab}`}
                className="px-3 py-1.5 text-mono-muted hover:text-mono-text text-xs font-semibold flex items-center justify-center"
              >
                Reset
              </Link>
            )}
          </form>
          
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-xs text-mono-muted font-bold">
              Showing {displayedLeads.length} leads
            </div>
            <Link
              href="/crm/leads/new"
              className="flex items-center gap-2 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] text-mono-text px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <UserPlus className="size-3.5" />
              <span>Create Lead</span>
            </Link>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex border-b border-mono-border px-2">
          <Link
            href={`/crm/leads?tab=unopened${search ? `&search=${search}` : ""}${status ? `&status=${status}` : ""}`}
            className={`px-4 py-3 text-xs uppercase tracking-wider font-bold transition-all border-b-2 -mb-px flex items-center ${
              tab === "unopened"
                ? "border-[var(--mnx-accent)] text-[var(--mnx-accent)]"
                : "border-transparent text-mono-muted hover:text-mono-text"
            }`}
          >
            <span>Unopened / Due</span>
            <span className={`ml-2 px-1.5 py-0.5 text-[10px] rounded-full font-mono mnx-numeric ${
              tab === "unopened" ? "bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)]" : "bg-mono-soft text-mono-muted"
            }`}>
              {unopenedLeads.length}
            </span>
          </Link>
          <Link
            href={`/crm/leads?tab=not_interested${search ? `&search=${search}` : ""}${status ? `&status=${status}` : ""}`}
            className={`px-4 py-3 text-xs uppercase tracking-wider font-bold transition-all border-b-2 -mb-px flex items-center ${
              tab === "not_interested"
                ? "border-[var(--mnx-accent)] text-[var(--mnx-accent)]"
                : "border-transparent text-mono-muted hover:text-mono-text"
            }`}
          >
            <span>Not Interested</span>
            <span className={`ml-2 px-1.5 py-0.5 text-[10px] rounded-full font-mono mnx-numeric ${
              tab === "not_interested" ? "bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)]" : "bg-mono-soft text-mono-muted"
            }`}>
              {notInterestedLeads.length}
            </span>
          </Link>
          <Link
            href={`/crm/leads?tab=unreachable${search ? `&search=${search}` : ""}${status ? `&status=${status}` : ""}`}
            className={`px-4 py-3 text-xs uppercase tracking-wider font-bold transition-all border-b-2 -mb-px flex items-center ${
              tab === "unreachable"
                ? "border-[var(--mnx-accent)] text-[var(--mnx-accent)]"
                : "border-transparent text-mono-muted hover:text-mono-text"
            }`}
          >
            <span>Unreachable</span>
            <span className={`ml-2 px-1.5 py-0.5 text-[10px] rounded-full font-mono mnx-numeric ${
              tab === "unreachable" ? "bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)]" : "bg-mono-soft text-mono-muted"
            }`}>
              {unreachableLeads.length}
            </span>
          </Link>
        </div>

        {/* Table Content */}
        {displayedLeads.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="size-12 rounded-full bg-mono-soft text-mono-muted flex items-center justify-center mx-auto">
              <Users className="size-6" />
            </div>
            <h3 className="font-bold text-base text-mono-text">
              {tab === "unopened" ? "No active leads found" : tab === "not_interested" ? "No uninterested leads found" : "No unreachable leads found"}
            </h3>
            <p className="text-xs text-mono-muted max-w-sm mx-auto">
              {tab === "unopened" 
                ? "Either refine your filters or create a fresh lead record to get started with validation."
                : tab === "not_interested"
                ? "Leads marked as Not Interested will show up here."
                : "Leads marked as Not Picked or Unreachable will appear here during their 2-hour cooldown window."
              }
            </p>
            {tab === "unopened" && (
              <Link
                href="/crm/leads/new"
                className="inline-flex items-center gap-1.5 text-[var(--mnx-accent)] hover:underline text-xs font-bold"
              >
                <span>Onboard a new lead</span>
                <ArrowRight className="size-3.5" />
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <CrmTable className="mnx-crm-table">
              <thead>
                <tr>
                  <th className="px-6 py-3">Lead Name</th>
                  <th className="px-6 py-3">Company</th>
                  <th className="px-6 py-3">Contact Info</th>
                  <th className="px-6 py-3">Source</th>
                  <th className="px-6 py-3">{tab === "unreachable" ? "Timer Window" : "Lead Status"}</th>
                  <th className="px-6 py-3">Owner</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedLeads.map((lead) => (
                  <tr key={lead.id} className="mnx-row-link">
                    <td className="px-6 py-4 font-medium">
                      <Link href={`/crm/leads/${lead.id}`} className="hover:text-[var(--mnx-accent)] transition-colors block">
                        {lead.firstName ? `${lead.firstName} ` : ""}{lead.lastName}
                      </Link>
                      {lead.designation && (
                        <span className="mnx-label block mt-0.5 font-normal">{lead.designation}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="size-3.5 text-mono-muted" />
                        <span>{lead.company}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      {lead.email && (
                        <div className="flex items-center gap-1.5 text-mono-muted text-xs">
                          <Mail className="size-3.5" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-1.5 text-mono-muted text-xs">
                          <Phone className="size-3.5" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs uppercase">
                      {lead.source || "Cold Call"}
                    </td>
                    <td className="px-6 py-4">
                      {tab === "unreachable" ? (
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]">
                            {lead.status.replace("_", " ")}
                          </span>
                          <span className="block text-[11px] text-[var(--mnx-warning)] font-mono mnx-numeric">
                            {formatTimer(lead.updatedAt)}
                          </span>
                        </div>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          lead.status === "NEW"
                            ? "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent-text)]"
                            : lead.status === "LOST"
                            ? "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]"
                            : lead.status === "QUALIFIED"
                            ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]"
                            : lead.status === "NOT_INTERESTED"
                            ? "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]"
                            : "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]"
                        }`}>
                          {lead.status.replace("_", " ")}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {lead.owner.name}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/crm/leads/${lead.id}`}
                          className="p-1.5 text-mono-muted hover:text-mono-text rounded hover:bg-mono-soft cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="size-4" />
                        </Link>
                        <DeleteRecordButton
                          recordId={lead.id}
                          deleteAction={deleteLeadAction}
                          confirmMessage="Are you sure you want to delete this lead?"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </CrmTable>
          </div>
        )}
      </div>
    </div>
  );
}
