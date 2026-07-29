import { CrmButton, CrmInput, CrmTable, CrmConfigurationState, CrmPermissionState } from "@/components/monolith/crm-workspace";
// Trigger recompilation: 2026-06-19
import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listEnquiries } from "@/modules/crm/service";
import { requirePermission } from "@/lib/rbac";
import {
  Search,
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
    return <CrmConfigurationState description="Missing organisation context." />;
  }

  // Permission Guard
  try {
    await requirePermission(session.user.id, "crm.lead.read");
  } catch (e) {
    return <CrmPermissionState description="You do not have permission to view CRM enquiries." />;
  }

  const awaitedParams = await searchParams;
  const search = awaitedParams.search || "";
  const type = awaitedParams.type || "all";

  // Parallelize all independent queries
  const [allEnquiriesCount, perishableCount, futureFollowCount, enquiries] = await Promise.all([
    db.crmLead.count({
      where: { orgId, isConverted: false, status: { in: ["INTERESTED", "FOLLOW_UP"] } }
    }),
    db.crmLead.count({
      where: { orgId, isConverted: false, status: { in: ["INTERESTED", "FOLLOW_UP"] }, isPerishable: true }
    }),
    db.crmLead.count({
      where: { orgId, isConverted: false, status: { in: ["INTERESTED", "FOLLOW_UP"] }, isFutureFollowUp: true }
    }),
    listEnquiries(orgId, { search, type }),
  ]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--mnx-border)]/30 pb-4">
        <div className="space-y-1">
          <h1 className="mnx-title-1 text-mono-text">Enquiries Management</h1>
          <p className="text-xs text-mono-muted">Manage active shipping enquiries, perishable cargo logs, and customer follow-up actions.</p>
        </div>
      </div>

      {/* KPI Cards Grid - Elegant 3D Look */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Active Enquiries */}
        <Link 
          href="?type=all"
          className={`p-6 rounded-xl bg-[var(--mnx-surface)] border-2 transition-all duration-200 block cursor-pointer ${
            type === "all"
              ? "border-[var(--mnx-accent)] shadow-[4px_4px_0px_0px_var(--mnx-accent-soft)] translate-y-[2px] translate-x-[2px]"
              : "border-[var(--mnx-border)] hover:border-[var(--mnx-accent)]/40 shadow-[2px_2px_0px_0px_var(--mnx-border)] hover:translate-y-[-2px] hover:translate-x-[-2px] hover:shadow-[4px_4px_0px_0px_var(--mnx-accent-soft)]"
          } mnx-crm-panel-surface `}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-mono-muted uppercase tracking-widest block font-sans">Active Enquiries</span>
              <span className="text-3xl font-bold text-mono-text block mnx-numeric">{allEnquiriesCount}</span>
            </div>
            <div className="size-10 rounded-lg bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)] flex items-center justify-center font-bold">
              ALL
            </div>
          </div>
        </Link>

        {/* Perishable Cargo */}
        <Link 
          href="?type=perishable"
          className={`p-6 rounded-xl bg-[var(--mnx-surface)] border-2 transition-all duration-200 block cursor-pointer ${
            type === "perishable"
              ? "border-[var(--mnx-accent)] shadow-[4px_4px_0px_0px_var(--mnx-warning-bg)] translate-y-[2px] translate-x-[2px]"
              : "border-[var(--mnx-border)] hover:border-[var(--mnx-accent)]/40 shadow-[2px_2px_0px_0px_var(--mnx-border)] hover:translate-y-[-2px] hover:translate-x-[-2px] hover:shadow-[4px_4px_0px_0px_var(--mnx-warning-bg)]"
          } mnx-crm-panel-surface mnx-tone-warning`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-mono-muted uppercase tracking-widest block font-sans">Perishable Cargo</span>
              <span className="text-3xl font-bold text-mono-text block mnx-numeric">{perishableCount}</span>
            </div>
            <div className="size-10 rounded-lg bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)] flex items-center justify-center font-bold">
              ❄️
            </div>
          </div>
        </Link>

        {/* Future Follow Ups */}
        <Link 
          href="?type=future_follow"
          className={`p-6 rounded-xl bg-[var(--mnx-surface)] border-2 transition-all duration-200 block cursor-pointer ${
            type === "future_follow"
              ? "border-[var(--mnx-accent)] shadow-[4px_4px_0px_0px_var(--mnx-warning-bg)] translate-y-[2px] translate-x-[2px]"
              : "border-[var(--mnx-border)] hover:border-[var(--mnx-accent)]/40 shadow-[2px_2px_0px_0px_var(--mnx-border)] hover:translate-y-[-2px] hover:translate-x-[-2px] hover:shadow-[4px_4px_0px_0px_var(--mnx-warning-bg)]"
          } mnx-crm-panel-surface mnx-tone-warning`}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-mono-muted uppercase tracking-widest block font-sans">Future Follow-ups</span>
              <span className="text-3xl font-bold text-mono-text block mnx-numeric">{futureFollowCount}</span>
            </div>
            <div className="size-10 rounded-lg bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)] flex items-center justify-center">
              <Calendar className="size-5" />
            </div>
          </div>
        </Link>

      </div>

      {/* 3D Tab Switchers & Search bar */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-[var(--mnx-surface)] p-4 rounded-xl border border-[var(--mnx-border)]/50">
        
        {/* Type / Tab Buttons with 3D tactile feel */}
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <Link
            href={`?type=all${search ? `&search=${search}` : ""}`}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 cursor-pointer ${
              type === "all"
                ? "bg-[var(--mnx-accent)] text-mono-text border-[var(--mnx-accent)] shadow-none translate-y-[2px] translate-x-[2px]"
                : "bg-[var(--mnx-surface)] text-[var(--mnx-accent)] border-[var(--mnx-accent)]/40 hover:border-[var(--mnx-accent)] shadow-[2px_2px_0px_0px_var(--mnx-accent-soft)] hover:translate-y-[-1px] hover:translate-x-[-1px] hover:shadow-[3px_3px_0px_0px_var(--mnx-accent-soft)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
            }`}
          >
            All Enquiries
          </Link>
          <Link
            href={`?type=perishable${search ? `&search=${search}` : ""}`}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 cursor-pointer ${
              type === "perishable"
                ? "bg-[var(--mnx-accent)] text-mono-text border-[var(--mnx-accent)] shadow-none translate-y-[2px] translate-x-[2px]"
                : "bg-[var(--mnx-surface)] text-[var(--mnx-accent)] border-[var(--mnx-accent)]/40 hover:border-[var(--mnx-accent)]/85 shadow-[2px_2px_0px_0px_var(--mnx-warning-bg)] hover:translate-y-[-1px] hover:translate-x-[-1px] hover:shadow-[3px_3px_0px_0px_var(--mnx-warning-bg)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
            }`}
          >
            Perishables Only
          </Link>
          <Link
            href={`?type=future_follow${search ? `&search=${search}` : ""}`}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 cursor-pointer ${
              type === "future_follow"
                ? "bg-[var(--mnx-accent)] text-mono-text border-[var(--mnx-accent)] shadow-none translate-y-[2px] translate-x-[2px]"
                : "bg-[var(--mnx-surface)] text-[var(--mnx-accent)] border-[var(--mnx-accent)]/40 hover:border-[var(--mnx-accent)]/85 shadow-[2px_2px_0px_0px_var(--mnx-warning-bg)] hover:translate-y-[-1px] hover:translate-x-[-1px] hover:shadow-[3px_3px_0px_0px_var(--mnx-warning-bg)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
            }`}
          >
            Future Follow Ups
          </Link>
        </div>

        {/* Search Filter Form */}
        <form method="GET" className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:flex-1 justify-end">
          <CrmInput type="hidden" name="type" value={type} />
          
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-2.5 size-4 text-mono-muted" />
            <CrmInput
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search enquiries by name, ref, company..."
              className="w-full pl-9 pr-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm placeholder:text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)] text-mono-text"
            />
          </div>

          <CrmButton
            type="submit"
            className="px-5 py-1.5 bg-[var(--mnx-surface)] hover:bg-[var(--mnx-text-muted)] border-2 border-mono-border text-mono-muted rounded-lg text-xs font-bold uppercase tracking-wide cursor-pointer shadow-[2px_2px_0px_0px_var(--mnx-border)] hover:translate-y-[-1px] hover:translate-x-[-1px] hover:shadow-[3px_3px_0px_0px_var(--mnx-border)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none transition-all"
          >
            Apply
          </CrmButton>
          
          {(search) && (
            <Link
              href={`?type=${type}`}
              className="px-3 py-1.5 text-mono-muted hover:text-mono-text text-xs font-semibold flex items-center justify-center"
            >
              Reset
            </Link>
          )}
        </form>

      </div>

      {/* Main List Card Container */}
      <div className="overflow-hidden rounded-xl border border-mono-border bg-mono-card shadow-sm">
        {enquiries.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="size-12 rounded-full bg-mono-soft text-mono-muted flex items-center justify-center mx-auto">
              <AlertTriangle className="size-6" />
            </div>
            <h3 className="font-bold text-base text-mono-text">No active enquiries found</h3>
            <p className="text-xs text-mono-muted max-w-sm mx-auto">
              {type === "perishable" 
                ? "No perishable cargo enquiries logged yet." 
                : type === "future_follow" 
                ? "No future follow-up items scheduled yet." 
                : "Active enquiries will populate here when leads are updated to interested/follow-up status."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <CrmTable className="mnx-crm-table">
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
                    <tr key={enquiry.id} className="mnx-row-link">
                      {/* Ref No */}
                      <td className="px-6 py-4 mnx-numeric font-medium">
                        <Link href={`/crm/enquiries/${enquiry.id}`} className="hover:text-[var(--mnx-accent)] transition-colors">
                          {enquiry.enquiryRef || "GEN-ENQ"}
                        </Link>
                      </td>
                      
                      {/* Client / Company */}
                      <td className="px-6 py-4">
                        <div className="font-medium">
                          {enquiry.firstName ? `${enquiry.firstName} ` : ""}{enquiry.lastName}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-mono-muted font-normal">
                          <Briefcase className="size-3" />
                          <span>{enquiry.company || "Direct Client"}</span>
                        </div>
                      </td>

                      {/* Route & Cargo */}
                      <td className="px-6 py-4">
                        {isSea ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-xs font-medium">
                              <Ship className="size-3.5 text-[var(--mnx-accent)]" />
                              <span>{details.pol} ➔ {details.pod}</span>
                            </div>
                            <span className="text-[11px] text-mono-muted block">
                              {details.commodity} • {details.weight} • {details.seaLclFcl}
                            </span>
                          </div>
                        ) : isAir ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-xs font-medium">
                              <Plane className="size-3.5 text-[var(--mnx-accent)]" />
                              <span>{details.aol} ➔ {details.aod}</span>
                            </div>
                            <span className="text-[11px] text-mono-muted block">
                              {details.commodity} • {details.weight} • {details.packages}
                            </span>
                          </div>
                        ) : (
                          <span className="text-mono-muted italic text-xs">No specific route logged</span>
                        )}
                      </td>

                      {/* Owner / Assigned */}
                      <td className="px-6 py-4 text-xs">
                        <div className="flex items-center gap-1.5 text-mono-muted">
                          <User className="size-3" />
                          <span>{enquiry.owner?.name || "Unassigned"}</span>
                        </div>
                      </td>

                      {/* Flags */}
                      <td className="px-6 py-4 space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {enquiry.isPerishable && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)] border border-[var(--mnx-accent)]/20 uppercase">
                              ❄️ Perishable
                            </span>
                          )}
                          {enquiry.isFutureFollowUp && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)] border border-[var(--mnx-accent)]/20 uppercase flex items-center gap-1" title={enquiry.followUpReminderDate ? `Remind at: ${new Date(enquiry.followUpReminderDate).toLocaleString("en-IN")}` : ""}>
                              <Clock className="size-2.5" />
                              <span>Follow-up</span>
                            </span>
                          )}
                          {!enquiry.isPerishable && !enquiry.isFutureFollowUp && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)] border border-[var(--mnx-accent)]/20 uppercase">
                              Standard
                            </span>
                          )}
                        </div>
                        {enquiry.isFutureFollowUp && enquiry.followUpReminderDate && (
                          <span className="text-[9px] text-[var(--mnx-accent)] font-bold block mnx-numeric">
                            ⏰ {new Date(enquiry.followUpReminderDate).toLocaleDateString("en-IN")}
                          </span>
                        )}
                      </td>

                      {/* Lead Status */}
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          enquiry.status === "FOLLOW_UP"
                            ? "bg-[var(--mnx-accent)]/15 text-[var(--mnx-accent)]"
                            : "bg-[var(--mnx-accent)]/15 text-[var(--mnx-accent)]"
                        }`}>
                          {enquiry.status === "FOLLOW_UP" ? "Follow Up" : "Interested"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/crm/enquiries/${enquiry.id}`}
                          className="inline-flex items-center gap-1 bg-mono-soft hover:bg-mono-soft border border-mono-border text-mono-muted px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                        >
                          <Eye className="size-3.5" />
                          <span>View Detail</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </CrmTable>
          </div>
        )}
      </div>

    </div>
  );
}
