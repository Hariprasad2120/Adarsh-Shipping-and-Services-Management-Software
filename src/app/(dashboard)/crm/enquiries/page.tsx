// Trigger recompilation: 2026-06-19
import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listEnquiries } from "@/modules/crm/service";
import { requirePermission } from "@/lib/rbac";
import {
  Search,
  ShieldAlert,
  ArrowRight,
  Ship,
  Plane,
  Calendar,
  AlertTriangle,
  Clock,
  Sparkles,
  Eye,
  Briefcase,
  User
} from "lucide-react";
import { db } from "@/lib/db";

interface SearchParams {
  search?: string;
  type?: "all" | "perishable" | "future_follow";
}

export default async function CrmEnquiriesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
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
        <p className="text-sm mt-1">You do not have permission to view CRM enquiries.</p>
      </div>
    );
  }

  const awaitedParams = await searchParams;
  const search = awaitedParams.search || "";
  const type = awaitedParams.type || "all";

  // Fetch all INTERESTED and FOLLOW_UP leads for counting
  const allEnquiriesCount = await db.crmLead.count({
    where: { orgId, isConverted: false, status: { in: ["INTERESTED", "FOLLOW_UP"] } }
  });

  const perishableCount = await db.crmLead.count({
    where: { orgId, isConverted: false, status: { in: ["INTERESTED", "FOLLOW_UP"] }, isPerishable: true }
  });

  const futureFollowCount = await db.crmLead.count({
    where: { orgId, isConverted: false, status: { in: ["INTERESTED", "FOLLOW_UP"] }, isFutureFollowUp: true }
  });

  // Fetch active enquiries based on type and search
  const enquiries = await listEnquiries(orgId, { search, type });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1c212a]/30 pb-4">
        <div className="space-y-1">
          <h1 className="ds-h1 text-white">Enquiries Management</h1>
          <p className="text-xs text-slate-400">Manage active shipping enquiries, perishable cargo logs, and customer follow-up actions.</p>
        </div>
      </div>

      {/* KPI Cards Grid - Elegant 3D Look */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Active Enquiries */}
        <Link 
          href="?type=all"
          className={`p-6 rounded-xl bg-[#0f1319] border-2 transition-all duration-200 block cursor-pointer ${
            type === "all"
              ? "border-[#00cec4] shadow-[4px_4px_0px_0px_rgba(0,206,196,0.2)] translate-y-[2px] translate-x-[2px]"
              : "border-[#1c212a] hover:border-[#00cec4]/40 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] hover:translate-y-[-2px] hover:translate-x-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,206,196,0.1)]"
          } card-left-accent`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Active Enquiries</span>
              <span className="text-3xl font-bold text-white block ds-numeric">{allEnquiriesCount}</span>
            </div>
            <div className="size-10 rounded-lg bg-[#00cec4]/10 text-[#00cec4] flex items-center justify-center font-bold">
              ALL
            </div>
          </div>
        </Link>

        {/* Perishable Cargo */}
        <Link 
          href="?type=perishable"
          className={`p-6 rounded-xl bg-[#0f1319] border-2 transition-all duration-200 block cursor-pointer ${
            type === "perishable"
              ? "border-[#fb923c] shadow-[4px_4px_0px_0px_rgba(251,146,60,0.2)] translate-y-[2px] translate-x-[2px]"
              : "border-[#1c212a] hover:border-[#fb923c]/40 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] hover:translate-y-[-2px] hover:translate-x-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(251,146,60,0.1)]"
          } card-left-accent-orange`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Perishable Cargo</span>
              <span className="text-3xl font-bold text-white block ds-numeric">{perishableCount}</span>
            </div>
            <div className="size-10 rounded-lg bg-[#fb923c]/10 text-[#fb923c] flex items-center justify-center font-bold">
              ❄️
            </div>
          </div>
        </Link>

        {/* Future Follow Ups */}
        <Link 
          href="?type=future_follow"
          className={`p-6 rounded-xl bg-[#0f1319] border-2 transition-all duration-200 block cursor-pointer ${
            type === "future_follow"
              ? "border-[#fb923c] shadow-[4px_4px_0px_0px_rgba(251,146,60,0.2)] translate-y-[2px] translate-x-[2px]"
              : "border-[#1c212a] hover:border-[#fb923c]/40 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] hover:translate-y-[-2px] hover:translate-x-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(251,146,60,0.1)]"
          } card-left-accent-orange`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-sans">Future Follow-ups</span>
              <span className="text-3xl font-bold text-white block ds-numeric">{futureFollowCount}</span>
            </div>
            <div className="size-10 rounded-lg bg-[#fb923c]/10 text-[#fb923c] flex items-center justify-center">
              <Calendar className="size-5" />
            </div>
          </div>
        </Link>

      </div>

      {/* 3D Tab Switchers & Search bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-[#0f1319] p-4 rounded-xl border border-[#1c212a]/50">
        
        {/* Type / Tab Buttons with 3D tactile feel */}
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <Link
            href={`?type=all${search ? `&search=${search}` : ""}`}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 cursor-pointer ${
              type === "all"
                ? "bg-[#00cec4] text-white border-[#00cec4] shadow-none translate-y-[2px] translate-x-[2px]"
                : "bg-[#161f28] text-[#00cec4] border-[#00cec4]/40 hover:border-[#00cec4] shadow-[2px_2px_0px_0px_rgba(0,206,196,0.15)] hover:translate-y-[-1px] hover:translate-x-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,206,196,0.25)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
            }`}
          >
            All Enquiries
          </Link>
          <Link
            href={`?type=perishable${search ? `&search=${search}` : ""}`}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 cursor-pointer ${
              type === "perishable"
                ? "bg-[#fb923c] text-white border-[#fb923c] shadow-none translate-y-[2px] translate-x-[2px]"
                : "bg-[#161f28] text-[#fb923c] border-[#fb923c]/40 hover:border-[#fb923c]/85 shadow-[2px_2px_0px_0px_rgba(251,146,60,0.15)] hover:translate-y-[-1px] hover:translate-x-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(251,146,60,0.25)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
            }`}
          >
            Perishables Only
          </Link>
          <Link
            href={`?type=future_follow${search ? `&search=${search}` : ""}`}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 cursor-pointer ${
              type === "future_follow"
                ? "bg-[#fb923c] text-white border-[#fb923c] shadow-none translate-y-[2px] translate-x-[2px]"
                : "bg-[#161f28] text-[#fb923c] border-[#fb923c]/40 hover:border-[#fb923c]/85 shadow-[2px_2px_0px_0px_rgba(251,146,60,0.15)] hover:translate-y-[-1px] hover:translate-x-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(251,146,60,0.25)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
            }`}
          >
            Future Follow Ups
          </Link>
        </div>

        {/* Search Filter Form */}
        <form method="GET" className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:flex-1 justify-end">
          <input type="hidden" name="type" value={type} />
          
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-500" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search enquiries by name, ref, company..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:border-[#00cec4] text-white"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-1.5 bg-[#161f28] hover:bg-[#1f2d3a] border-2 border-slate-700/40 text-slate-200 rounded-lg text-xs font-bold uppercase tracking-wide cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] hover:translate-y-[-1px] hover:translate-x-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
          >
            Apply
          </button>
          
          {(search) && (
            <Link
              href={`?type=${type}`}
              className="px-3 py-1.5 text-slate-400 hover:text-white text-xs font-semibold flex items-center justify-center"
            >
              Reset
            </Link>
          )}
        </form>

      </div>

      {/* Main List Card Container */}
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
        {enquiries.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="size-12 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center mx-auto">
              <AlertTriangle className="size-6" />
            </div>
            <h3 className="font-bold text-base text-on-surface">No active enquiries found</h3>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
              {type === "perishable" 
                ? "No perishable cargo enquiries logged yet." 
                : type === "future_follow" 
                ? "No future follow-up items scheduled yet." 
                : "Active enquiries will populate here when leads are updated to interested/follow-up status."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ds-table">
              <thead>
                <tr>
                  <th className="px-6 py-3">Reference No</th>
                  <th className="px-6 py-3">Client / Company</th>
                  <th className="px-6 py-3">Route & Cargo Details</th>
                  <th className="px-6 py-3">Ownership</th>
                  <th className="px-6 py-3">Flags</th>
                  <th className="px-6 py-3">Lead Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((enquiry) => {
                  const details: any = enquiry.enquiryDetails || {};
                  const isSea = details.type === "Sea";
                  const isAir = details.type === "Air";
                  
                  return (
                    <tr key={enquiry.id} className="ds-row-link">
                      {/* Ref No */}
                      <td className="px-6 py-4 ds-numeric font-medium">
                        <Link href={`/crm/enquiries/${enquiry.id}`} className="hover:text-[#00cec4] transition-colors">
                          {enquiry.enquiryRef || "GEN-ENQ"}
                        </Link>
                      </td>
                      
                      {/* Client / Company */}
                      <td className="px-6 py-4">
                        <div className="font-medium">
                          {enquiry.firstName ? `${enquiry.firstName} ` : ""}{enquiry.lastName}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-on-surface-variant font-normal">
                          <Briefcase className="size-3" />
                          <span>{enquiry.company || "Direct Client"}</span>
                        </div>
                      </td>

                      {/* Route & Cargo */}
                      <td className="px-6 py-4">
                        {isSea ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-xs font-medium">
                              <Ship className="size-3.5 text-[#00cec4]" />
                              <span>{details.pol} ➔ {details.pod}</span>
                            </div>
                            <span className="text-[11px] text-on-surface-variant block">
                              {details.commodity} • {details.weight} • {details.seaLclFcl}
                            </span>
                          </div>
                        ) : isAir ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-xs font-medium">
                              <Plane className="size-3.5 text-[#00cec4]" />
                              <span>{details.aol} ➔ {details.aod}</span>
                            </div>
                            <span className="text-[11px] text-on-surface-variant block">
                              {details.commodity} • {details.weight} • {details.packages}
                            </span>
                          </div>
                        ) : (
                          <span className="text-on-surface-variant italic text-xs">No specific route logged</span>
                        )}
                      </td>

                      {/* Owner / Assigned */}
                      <td className="px-6 py-4 text-xs">
                        <div className="flex items-center gap-1.5 text-on-surface-variant">
                          <User className="size-3" />
                          <span>{enquiry.owner?.name || "Unassigned"}</span>
                        </div>
                      </td>

                      {/* Flags */}
                      <td className="px-6 py-4 space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {enquiry.isPerishable && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#fb923c]/10 text-[#fb923c] border border-[#fb923c]/20 uppercase">
                              ❄️ Perishable
                            </span>
                          )}
                          {enquiry.isFutureFollowUp && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#fb923c]/10 text-[#fb923c] border border-[#fb923c]/20 uppercase flex items-center gap-1" title={enquiry.followUpReminderDate ? `Remind at: ${new Date(enquiry.followUpReminderDate).toLocaleString("en-IN")}` : ""}>
                              <Clock className="size-2.5" />
                              <span>Follow-up</span>
                            </span>
                          )}
                          {!enquiry.isPerishable && !enquiry.isFutureFollowUp && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#00cec4]/10 text-[#00cec4] border border-[#00cec4]/20 uppercase">
                              Standard
                            </span>
                          )}
                        </div>
                        {enquiry.isFutureFollowUp && enquiry.followUpReminderDate && (
                          <span className="text-[9px] text-[#fb923c] font-bold block ds-numeric">
                            ⏰ {new Date(enquiry.followUpReminderDate).toLocaleDateString("en-IN")}
                          </span>
                        )}
                      </td>

                      {/* Lead Status */}
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          enquiry.status === "FOLLOW_UP"
                            ? "bg-[#fb923c]/15 text-[#fb923c]"
                            : "bg-[#00cec4]/15 text-[#00cec4]"
                        }`}>
                          {enquiry.status === "FOLLOW_UP" ? "Follow Up" : "Interested"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/crm/enquiries/${enquiry.id}`}
                          className="inline-flex items-center gap-1 bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface-variant px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                        >
                          <Eye className="size-3.5" />
                          <span>View Detail</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
