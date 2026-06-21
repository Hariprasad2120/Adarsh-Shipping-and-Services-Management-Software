import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
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
  ShieldAlert,
  ArrowRight,
  Users
} from "lucide-react";
import { deleteLeadAction } from "@/modules/crm/actions";
import { DeleteRecordButton } from "../_components/delete-record-button";

interface SearchParams {
  search?: string;
  status?: string;
  tab?: string;
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
  } catch (e) {
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
    <div className="space-y-6 max-w-[1600px] mx-auto">

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#0f1319] p-4 rounded-xl border border-[#1c212a]/50">
        <form method="GET" className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
          <input type="hidden" name="tab" value={tab} />
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-500" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search leads by name, email, company..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:border-[#00c4b6] text-white"
            />
          </div>

          {/* Status Filter */}
          <div className="relative min-w-[200px]">
            <select
              name="status"
              defaultValue={status}
              className="w-full pl-3 pr-8 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm text-slate-300 focus:outline-none focus:border-[#00c4b6]"
            >
              <option value="">All Statuses</option>
              {leadStatuses.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-1.5 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Apply Filters
          </button>
          
          {(search || status) && (
            <Link
              href={`/crm/leads?tab=${tab}`}
              className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-semibold flex items-center justify-center"
            >
              Reset
            </Link>
          )}
        </form>
        
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-xs text-slate-400 font-bold">
            Showing {displayedLeads.length} leads
          </div>
          <Link
            href="/crm/leads/new"
            className="flex items-center gap-2 bg-[#00c4b6] hover:bg-[#00b0a3] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <UserPlus className="size-3.5" />
            <span>Create Lead</span>
          </Link>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-[#1c212a]/80 pb-px">
        <Link
          href={`/crm/leads?tab=unopened${search ? `&search=${search}` : ""}${status ? `&status=${status}` : ""}`}
          className={`px-4 py-3 text-xs uppercase tracking-wider font-bold transition-all border-b-2 -mb-px flex items-center ${
            tab === "unopened"
              ? "border-[#00cec4] text-[#00cec4]"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <span>Unopened / Due</span>
          <span className={`ml-2 px-1.5 py-0.5 text-[10px] rounded-full font-mono ds-numeric ${
            tab === "unopened" ? "bg-[#00cec4]/10 text-[#00cec4]" : "bg-[#1c212a] text-slate-400"
          }`}>
            {unopenedLeads.length}
          </span>
        </Link>
        <Link
          href={`/crm/leads?tab=not_interested${search ? `&search=${search}` : ""}${status ? `&status=${status}` : ""}`}
          className={`px-4 py-3 text-xs uppercase tracking-wider font-bold transition-all border-b-2 -mb-px flex items-center ${
            tab === "not_interested"
              ? "border-[#00cec4] text-[#00cec4]"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <span>Not Interested</span>
          <span className={`ml-2 px-1.5 py-0.5 text-[10px] rounded-full font-mono ds-numeric ${
            tab === "not_interested" ? "bg-[#00cec4]/10 text-[#00cec4]" : "bg-[#1c212a] text-slate-400"
          }`}>
            {notInterestedLeads.length}
          </span>
        </Link>
        <Link
          href={`/crm/leads?tab=unreachable${search ? `&search=${search}` : ""}${status ? `&status=${status}` : ""}`}
          className={`px-4 py-3 text-xs uppercase tracking-wider font-bold transition-all border-b-2 -mb-px flex items-center ${
            tab === "unreachable"
              ? "border-[#00cec4] text-[#00cec4]"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          <span>Unreachable</span>
          <span className={`ml-2 px-1.5 py-0.5 text-[10px] rounded-full font-mono ds-numeric ${
            tab === "unreachable" ? "bg-[#00cec4]/10 text-[#00cec4]" : "bg-[#1c212a] text-slate-400"
          }`}>
            {unreachableLeads.length}
          </span>
        </Link>
      </div>

      {/* Leads Data Table */}
      <div className="bg-[#0f1319] border border-[#1c212a]/50 rounded-xl overflow-hidden shadow-2xl">
        {displayedLeads.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-4">
            <div className="size-12 rounded-full bg-slate-800/40 text-slate-600 flex items-center justify-center mx-auto">
              <Users className="size-6" />
            </div>
            <h3 className="font-bold text-base text-white">
              {tab === "unopened" ? "No active leads found" : tab === "not_interested" ? "No uninterested leads found" : "No unreachable leads found"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
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
                className="inline-flex items-center gap-1.5 text-[#00c4b6] hover:underline text-xs font-bold"
              >
                <span>Onboard a new lead</span>
                <ArrowRight className="size-3.5" />
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-slate-200">
              <thead>
                <tr className="border-b border-[#1c212a]/80 bg-[#0c0f14]/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Lead Name</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">Contact Info</th>
                  <th className="px-6 py-4">Source</th>
                  <th className="px-6 py-4">{tab === "unreachable" ? "Timer Window" : "Lead Status"}</th>
                  <th className="px-6 py-4">Owner</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c212a]/30">
                {displayedLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[#161f28]/35 transition-colors">
                    <td className="px-6 py-4 text-white">
                      <Link href={`/crm/leads/${lead.id}`} className="hover:text-[#00c4b6] transition-all block">
                        {lead.firstName ? `${lead.firstName} ` : ""}{lead.lastName}
                      </Link>
                      {lead.designation && (
                        <span className="text-[11px] text-slate-400 block font-normal">{lead.designation}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Briefcase className="size-3.5 text-slate-500" />
                        <span>{lead.company}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      {lead.email && (
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                          <Mail className="size-3.5 text-slate-500" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                          <Phone className="size-3.5 text-slate-500" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 font-semibold uppercase">
                      {lead.source || "Cold Call"}
                    </td>
                    <td className="px-6 py-4">
                      {tab === "unreachable" ? (
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400">
                            {lead.status.replace("_", " ")}
                          </span>
                          <span className="block text-[11px] text-orange-400/80 font-mono ds-numeric">
                            {formatTimer(lead.updatedAt)}
                          </span>
                        </div>
                      ) : (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          lead.status === "NEW"
                            ? "bg-blue-500/10 text-blue-400"
                            : lead.status === "LOST"
                            ? "bg-red-500/10 text-red-400"
                            : lead.status === "QUALIFIED"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : lead.status === "NOT_INTERESTED"
                            ? "bg-rose-500/10 text-rose-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}>
                          {lead.status.replace("_", " ")}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-300 font-medium">
                      {lead.owner.name}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/crm/leads/${lead.id}`}
                          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800/40 cursor-pointer"
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
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
