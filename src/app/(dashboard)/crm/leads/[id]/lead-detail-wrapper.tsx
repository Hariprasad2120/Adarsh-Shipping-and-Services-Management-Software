"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteLeadAction, updateLeadStatusAction, saveEnquiryRatesAction, logWorkTimeAction, deleteWorkTimeAction } from "@/modules/crm/actions";
import { ConvertModal } from "./convert-modal";
import { RemarksModal } from "./remarks-modal";
import { InterestedModal } from "./interested-modal";
import { FollowUpModal } from "./follow-up-modal";
import { NotesPanel } from "../../_components/notes-panel";
import { AttachmentsPanel } from "../../_components/attachments-panel";
import { ActivitiesPanel } from "../../_components/activities-panel";
import { TimelinePanel } from "../../_components/timeline-panel";
import {
  Edit2,
  RefreshCcw,
  Trash2,
  Building,
  MapPin,
  Info,
  Ship,
  Plane,
  Clock,
  Timer,
  History,
  TrendingUp,
  Plus
} from "lucide-react";

interface LeadDetailWrapperProps {
  lead: any;
  notes: any[];
  attachments: any[];
  activities: any[];
  timeline: any[];
  workTimeLogs?: any[];
  quotes?: any[];
}

export function LeadDetailWrapper({ lead, notes, attachments, activities, timeline, workTimeLogs = [], quotes = [] }: LeadDetailWrapperProps) {
  const router = useRouter();
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showInterestedModal, setShowInterestedModal] = useState(false);
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpStatus, setFollowUpStatus] = useState<"NOT_PICKED" | "NOT_REACHABLE" | null>(null);
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "NOTES" | "ACTIVITIES" | "ATTACHMENTS" | "TIMELINE" | "TIME_TRACKER">("OVERVIEW");

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this lead?")) return;

    const res = await deleteLeadAction(lead.id);
    if (res.ok) {
      toast.success("Lead deleted successfully");
      router.push("/crm/leads");
    } else {
      toast.error(res.error);
    }
  };

  const formatRevenue = (value: number | null) => {
    if (value === null) return "Not Specified";
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
  };

  const leadName = `${lead.firstName || ""} ${lead.lastName}`.trim();

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* ─── SPLIT VIEW LAYOUT ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Business Card & Structured Fields */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 3D Call Action & Operations Panel */}
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a] shadow-[4px_4px_0px_0px_rgba(0,206,196,0.15)] hover:shadow-[6px_6px_0px_0px_rgba(0,206,196,0.22)] transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-6 card-left-accent">
            <div className="space-y-2 flex-1">
              <span className="text-[10px] font-bold text-[#00cec4] uppercase tracking-widest block font-sans">Call Action / Lead Status</span>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setShowInterestedModal(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 cursor-pointer ${
                    lead.status === "INTERESTED"
                      ? "bg-[#00cec4] text-white border-[#00cec4] shadow-none translate-y-[2px] translate-x-[2px]"
                      : "bg-[#161f28] text-[#00cec4] border-[#00cec4]/40 hover:border-[#00cec4] shadow-[2px_2px_0px_0px_rgba(0,206,196,0.15)] hover:translate-y-[-1px] hover:translate-x-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,206,196,0.25)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
                  }`}
                >
                  Interested
                </button>
                <button
                  onClick={() => setShowRemarksModal(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 cursor-pointer ${
                    lead.status === "NOT_INTERESTED"
                      ? "bg-red-500 text-white border-red-500 shadow-none translate-y-[2px] translate-x-[2px]"
                      : "bg-[#161f28] text-red-500 border-red-500/40 hover:border-red-500/80 shadow-[2px_2px_0px_0px_rgba(239,68,68,0.15)] hover:translate-y-[-1px] hover:translate-x-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(239,68,68,0.25)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
                  }`}
                >
                  Not Interested
                </button>
                <button
                  onClick={() => {
                    setFollowUpStatus("NOT_PICKED");
                    setShowFollowUpModal(true);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 cursor-pointer ${
                    lead.status === "NOT_PICKED"
                      ? "bg-[#fb923c] text-white border-[#fb923c] shadow-none translate-y-[2px] translate-x-[2px]"
                      : "bg-[#161f28] text-[#fb923c] border-[#fb923c]/40 hover:border-[#fb923c]/80 shadow-[2px_2px_0px_0px_rgba(251,146,60,0.15)] hover:translate-y-[-1px] hover:translate-x-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(251,146,60,0.25)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
                  }`}
                >
                  Not Picked
                </button>
                <button
                  onClick={() => {
                    setFollowUpStatus("NOT_REACHABLE");
                    setShowFollowUpModal(true);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 cursor-pointer ${
                    lead.status === "NOT_REACHABLE"
                      ? "bg-[#fb923c] text-white border-[#fb923c] shadow-none translate-y-[2px] translate-x-[2px]"
                      : "bg-[#161f28] text-[#fb923c] border-[#fb923c]/40 hover:border-[#fb923c]/80 shadow-[2px_2px_0px_0px_rgba(251,146,60,0.15)] hover:translate-y-[-1px] hover:translate-x-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(251,146,60,0.25)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
                  }`}
                >
                  Not Reachable
                </button>
              </div>
            </div>

            <div className="space-y-2 flex-shrink-0 md:text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Operations</span>
              <div className="flex flex-wrap items-center gap-3 justify-start md:justify-end">
                <button
                  onClick={() => setShowConvertModal(true)}
                  className="flex items-center gap-2 bg-[#00cec4] hover:bg-[#00b8af] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 border-[#00cec4] shadow-[2px_2px_0px_0px_#008f88] hover:translate-y-[-1px] hover:translate-x-[-1px] hover:shadow-[3px_3px_0px_0px_#008f88] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none cursor-pointer"
                >
                  <RefreshCcw className="size-3.5" />
                  <span>Convert Lead</span>
                </button>
                <Link
                  href={`/crm/leads/${lead.id}/edit`}
                  className="flex items-center gap-2 bg-[#161f28] hover:bg-[#1f2d3a] border-2 border-slate-700/35 text-slate-200 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] hover:translate-y-[-1px] hover:translate-x-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none cursor-pointer"
                >
                  <Edit2 className="size-3.5" />
                  <span>Edit</span>
                </Link>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 bg-[#161f28] hover:bg-red-500/10 border-2 border-red-500/20 text-red-400/80 hover:text-red-400 hover:border-red-500/40 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(239,68,68,0.05)] hover:translate-y-[-1px] hover:translate-x-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(239,68,68,0.15)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>

          {/* Business Card Section */}
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 space-y-4">
            <div className="flex items-center gap-3 border-b border-[#1c212a]/30 pb-3 mb-2">
              <Info className="size-4.5 text-[#00c4b6]" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">Business Card Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Lead Owner</span>
                <span className="text-white font-medium">{lead.owner.name} ({lead.owner.email})</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Company</span>
                <span className="text-white font-medium">{lead.company}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Email</span>
                <span className="text-white font-medium">{lead.email || "Not Specified"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Designation</span>
                <span className="text-white font-medium">{lead.designation || "Not Specified"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Phone</span>
                <span className="text-white font-medium">{lead.phone || "Not Specified"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Mobile</span>
                <span className="text-white font-medium">{lead.mobile || "Not Specified"}</span>
              </div>
            </div>
          </div>

          {/* Lead Information Section */}
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 space-y-4">
            <div className="flex items-center gap-3 border-b border-[#1c212a]/30 pb-3 mb-2">
              <Building className="size-4.5 text-[#00c4b6]" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">Lead Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Lead Source</span>
                <span className="text-white font-medium">{lead.source || "Cold Call"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Lead Status</span>
                <span className="text-white font-medium">{lead.status}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Industry</span>
                <span className="text-white font-medium">{lead.industry || "Not Specified"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Rating</span>
                <span className="text-white font-medium">{lead.rating || "Warm"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Annual Revenue</span>
                <span className="text-white font-medium">{formatRevenue(lead.annualRevenue)}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Employee Count</span>
                <span className="text-white font-medium">{lead.employeeCount || "Not Specified"}</span>
              </div>
            </div>
          </div>

          {/* Enquiry & Rates Worksheet Card */}
          {lead.status === "INTERESTED" && lead.enquiryDetails && (
            <div className="p-6 rounded-xl bg-[#0f1319] border border-[#00cec4]/40 space-y-6">
              <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-3 mb-2">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-[#00cec4]/10 text-[#00cec4] flex items-center justify-center font-bold text-sm">
                    {lead.enquiryDetails.type === "Sea" ? <Ship className="size-4.5" /> : <Plane className="size-4.5" />}
                  </div>
                  <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                    Customer Enquiry Details ({lead.enquiryDetails.type})
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#00cec4]/10 text-[#00cec4] border border-[#00cec4]/10">
                  Active Enquiry
                </span>
              </div>

              {lead.enquiryDetails.type === "Sea" ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm text-slate-300">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Sea Type</span>
                    <span className="text-white font-medium">{lead.enquiryDetails.seaType} ({lead.enquiryDetails.seaLclFcl})</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">POL</span>
                    <span className="text-white font-medium">{lead.enquiryDetails.pol}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">POD</span>
                    <span className="text-white font-medium">{lead.enquiryDetails.pod}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Commodity</span>
                    <span className="text-white font-medium">{lead.enquiryDetails.commodity}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Weight</span>
                    <span className="text-white font-medium">{lead.enquiryDetails.weight}</span>
                  </div>
                  {lead.enquiryDetails.seaLclFcl === "LCL" ? (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Volume</span>
                      <span className="text-white font-medium">{lead.enquiryDetails.cbm} CBM</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Dimensions / Container</span>
                      <span className="text-white font-medium">{lead.enquiryDetails.containerType}</span>
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Packages / Containers</span>
                    <span className="text-white font-medium">{lead.enquiryDetails.containerCount}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Incoterm</span>
                    <span className="text-white font-medium">{lead.enquiryDetails.incoterm}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Planning</span>
                    <span className="text-white font-medium">{lead.enquiryDetails.shipmentPlanning}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Purpose</span>
                    <span className="text-white font-medium">{lead.enquiryDetails.purpose}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Client Name</span>
                    <span className="text-white font-medium">{lead.enquiryDetails.clientName}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Location</span>
                    <span className="text-white font-medium">{lead.enquiryDetails.location}</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm text-slate-300">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">AOL</span>
                    <span className="text-white font-medium">{lead.enquiryDetails.aol}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">AOD</span>
                    <span className="text-white font-medium">{lead.enquiryDetails.aod}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Commodity</span>
                    <span className="text-white font-medium">{lead.enquiryDetails.commodity}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Weight</span>
                    <span className="text-white font-medium">{lead.enquiryDetails.weight}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Dimensions</span>
                    <span className="text-white font-medium">{lead.enquiryDetails.dimensions}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Packages</span>
                    <span className="text-white font-medium">{lead.enquiryDetails.packages}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Incoterm</span>
                    <span className="text-white font-medium">{lead.enquiryDetails.incoterm}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Planning</span>
                    <span className="text-white font-medium">{lead.enquiryDetails.shipmentPlanning}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Purpose</span>
                    <span className="text-white font-medium">{lead.enquiryDetails.purpose}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Client Name</span>
                    <span className="text-white font-medium">{lead.enquiryDetails.clientName}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Location</span>
                    <span className="text-white font-medium">{lead.enquiryDetails.location}</span>
                  </div>
                </div>
              )}

              {/* Rates worksheet section */}
              <div className="pt-4 border-t border-[#1c212a]/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Rates Worksheet (In-call rates & calculations)
                  </span>
                  {lead.enquiryDetails.seaType === "Import" && lead.enquiryDetails.seaLclFcl === "LCL" && (
                    <span className="text-[10px] font-bold text-[#00cec4] uppercase tracking-wide bg-[#00cec4]/5 px-2 py-0.5 rounded border border-[#00cec4]/15">
                      Auto-Calculated Import LCL Rule Active
                    </span>
                  )}
                </div>

                <LeadRatesWorksheet lead={lead} />
              </div>
            </div>
          )}

          {/* Justdial Original Enquiry Section */}
          {lead.crmExternalLead && (
            <div className="p-6 rounded-xl bg-gradient-to-br from-[#0f1319] to-[#141b24] border border-orange-500/20 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-3 mb-2">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center font-black text-sm">
                    JD
                  </div>
                  <h3 className="font-bold text-sm text-white uppercase tracking-wider">Justdial Original Enquiry</h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/10">
                  Imported Inbound
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Customer Name</span>
                  <span className="text-white font-medium">{lead.crmExternalLead.customerName}</span>
                </div>
                {lead.crmExternalLead.rawPayload && typeof lead.crmExternalLead.rawPayload === "object" && (lead.crmExternalLead.rawPayload as any).intentScore && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Intent Score</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      (lead.crmExternalLead.rawPayload as any).intentScore.toLowerCase().includes("very high")
                        ? "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse"
                        : (lead.crmExternalLead.rawPayload as any).intentScore.toLowerCase().includes("high")
                        ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}>
                      🔥 {(lead.crmExternalLead.rawPayload as any).intentScore}
                    </span>
                  </div>
                )}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Mobile Number</span>
                  <span className="text-white font-medium">{lead.crmExternalLead.mobileNumber}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">City / Location</span>
                  <span className="text-white font-medium">{lead.crmExternalLead.city || "Not provided"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Category / Query</span>
                  <span className="text-white font-medium">{lead.crmExternalLead.category || "Not provided"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Enquiry Source</span>
                  <span className="text-white font-medium">{lead.crmExternalLead.enquirySource || "Justdial Web Dashboard"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Original Status</span>
                  <span className="text-white font-medium">{lead.crmExternalLead.enquiryStatus || "N/A"} ({lead.crmExternalLead.jdLeadStatus || "N/A"})</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Enquiry Time</span>
                  <span className="text-white font-medium">
                    {lead.crmExternalLead.enquiryDateTime ? new Date(lead.crmExternalLead.enquiryDateTime).toLocaleString("en-IN") : "N/A"}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Imported At</span>
                  <span className="text-white font-medium">
                    {new Date(lead.crmExternalLead.importedAt).toLocaleString("en-IN")}
                  </span>
                </div>

                {/* Collapsible raw data payload */}
                <div className="md:col-span-2 pt-2">
                  <details className="group border border-[#1c212a]/30 rounded-lg p-3 bg-[#0a0d12]/40">
                    <summary className="text-[10px] font-bold uppercase tracking-wider text-slate-400 cursor-pointer list-none flex items-center justify-between select-none">
                      <span>View Raw Snapshot Payload</span>
                      <span className="text-[#00c4b6] group-open:hidden">+ Expand</span>
                      <span className="text-slate-500 hidden group-open:inline">- Collapse</span>
                    </summary>
                    <div className="mt-3 text-[10px] font-mono text-slate-400 bg-black/30 p-2 rounded max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-[#1c212a]/20">
                      {JSON.stringify(lead.crmExternalLead.rawPayload, null, 2)}
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}

          {/* Address & Tags Section */}
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 space-y-4">
            <div className="flex items-center gap-3 border-b border-[#1c212a]/30 pb-3 mb-2">
              <MapPin className="size-4.5 text-[#00c4b6]" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">Address & Tags</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div className="md:col-span-2 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Street Address</span>
                <span className="text-white font-medium block">{lead.address || "Not Specified"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">City & State</span>
                <span className="text-white font-medium">
                  {lead.city || ""}{lead.city && lead.state ? ", " : ""}{lead.state || "Not Specified"}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pincode & Country</span>
                <span className="text-white font-medium">
                  {lead.pincode || ""}{lead.pincode && lead.country ? ", " : ""}{lead.country || "Not Specified"}
                </span>
              </div>
              <div className="md:col-span-2 space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Record Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {lead.tags && lead.tags.length > 0 ? (
                    lead.tags.map((tg: string) => (
                      <span key={tg} className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#161f28] text-[#00c4b6] border border-[#1c212a]">
                        {tg}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">No tags associated</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 space-y-3">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider border-b border-[#1c212a]/30 pb-2">Description / Enquiry Details</h3>
            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
              {lead.description || "No description logged for this lead."}
            </p>
          </div>

        </div>

        {/* Right Column: Related Lists & Timeline Activities */}
        <div className="space-y-6">
          
          {/* Tabs Navigation Card */}
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 space-y-6">
            
            {/* Horizontal Tabs Selection */}
            <div className="flex border-b border-[#1c212a]/50 pb-1 gap-4 overflow-x-auto select-none">
              <button
                onClick={() => setActiveTab("OVERVIEW")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === "OVERVIEW" ? "border-[#00c4b6] text-white" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("NOTES")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === "NOTES" ? "border-[#00c4b6] text-white" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Notes ({notes.length})
              </button>
              <button
                onClick={() => setActiveTab("ACTIVITIES")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === "ACTIVITIES" ? "border-[#00c4b6] text-white" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Activities ({activities.length})
              </button>
              <button
                onClick={() => setActiveTab("ATTACHMENTS")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === "ATTACHMENTS" ? "border-[#00c4b6] text-white" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Files ({attachments.length})
              </button>
              <button
                onClick={() => setActiveTab("TIMELINE")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === "TIMELINE" ? "border-[#00c4b6] text-white" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Audit
              </button>
              <button
                onClick={() => setActiveTab("TIME_TRACKER")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === "TIME_TRACKER" ? "border-[#00c4b6] text-white" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Time Tracker ({workTimeLogs.length})
              </button>
            </div>

            {/* Tab Rendering Content */}
            <div className="space-y-4">
              {activeTab === "OVERVIEW" && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-[#0a0d12]/60 rounded-lg space-y-2 border border-[#1c212a]/30">
                    <span className="font-bold text-white block uppercase tracking-wider">Lead Summary</span>
                    <p className="text-slate-400 leading-relaxed">
                      This lead was logged on {new Date(lead.createdAt).toLocaleDateString("en-IN")}. If this contact has been fully qualified, convert this record using the Convert Lead button in the top action panel.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-slate-400">
                    <div>
                      <span className="font-semibold text-slate-500 block uppercase text-[10px]">Created By</span>
                      <span className="text-slate-200">{lead.createdById ? "Site Admin" : "Unknown"}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 block uppercase text-[10px]">Updated At</span>
                      <span className="text-slate-200">{new Date(lead.updatedAt).toLocaleDateString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "NOTES" && (
                <NotesPanel relatedToType="LEAD" relatedToId={lead.id} initialNotes={notes} />
              )}

              {activeTab === "ACTIVITIES" && (
                <ActivitiesPanel relatedToType="LEAD" relatedToId={lead.id} initialActivities={activities} />
              )}

              {activeTab === "ATTACHMENTS" && (
                <AttachmentsPanel relatedToType="LEAD" relatedToId={lead.id} initialAttachments={attachments} />
              )}

              {activeTab === "TIMELINE" && (
                <TimelinePanel events={timeline} />
              )}

              {activeTab === "TIME_TRACKER" && (
                <TimeTrackerPanel
                  lead={lead}
                  workTimeLogs={workTimeLogs}
                  quotes={quotes}
                  timeline={timeline}
                />
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Convert Lead Modal */}
      {showConvertModal && (
        <ConvertModal
          leadId={lead.id}
          leadName={leadName}
          companyName={lead.company}
          onClose={() => setShowConvertModal(false)}
        />
      )}

      {/* Interested Modal */}
      {showInterestedModal && (
        <InterestedModal
          leadId={lead.id}
          lead={lead}
          onClose={() => setShowInterestedModal(false)}
          onSuccess={() => {
            setShowInterestedModal(false);
            router.refresh();
          }}
        />
      )}

      {/* Remarks Modal */}
      {showRemarksModal && (
        <RemarksModal
          leadId={lead.id}
          onClose={() => setShowRemarksModal(false)}
          onSuccess={() => {
            setShowRemarksModal(false);
            router.refresh();
          }}
        />
      )}

      {/* Follow Up Modal */}
      {showFollowUpModal && followUpStatus && (
        <FollowUpModal
          leadId={lead.id}
          status={followUpStatus}
          onClose={() => {
            setShowFollowUpModal(false);
            setFollowUpStatus(null);
          }}
          onSuccess={() => {
            setShowFollowUpModal(false);
            setFollowUpStatus(null);
            router.refresh();
          }}
        />
      )}

    </div>
  );
}

function LeadRatesWorksheet({ lead }: { lead: any }) {
  const router = useRouter();
  const isSea = lead.enquiryDetails.type === "Sea";
  const isImportLcl = isSea && lead.enquiryDetails.seaType === "Import" && lead.enquiryDetails.seaLclFcl === "LCL";
  const volume = parseFloat(lead.enquiryDetails.cbm) || 0;

  // Auto-calculated LCL & DO rates
  const calculatedLclRate = volume < 3 ? 300 : 150;
  const calculatedLclAmount = volume * calculatedLclRate;
  
  const [lclDoOption, setLclDoOption] = useState<"750" | "500">("750");
  const calculatedDoAmount = volume < 3 ? 1000 : parseInt(lclDoOption);

  const initialRates = lead.enquiryDetails.rates || {};

  // Form states
  const [oceanFreight, setOceanFreight] = useState(initialRates.oceanFreight ?? 0);
  const [cfsCharges, setCfsCharges] = useState(initialRates.cfsCharges ?? 0);
  const [customsClearance, setCustomsClearance] = useState(initialRates.customsClearance ?? 0);
  const [blCharges, setBlCharges] = useState(initialRates.blCharges ?? 0);
  const [vgmCharges, setVgmCharges] = useState(initialRates.vgmCharges ?? 0);
  const [lclCharges, setLclCharges] = useState(initialRates.lclCharges ?? (isImportLcl ? calculatedLclAmount : 0));
  const [doCharges, setDoCharges] = useState(initialRates.doCharges ?? (isImportLcl ? calculatedDoAmount : 0));
  const [cfsCustoms, setCfsCustoms] = useState(initialRates.cfsCustoms ?? 0);

  // Air states
  const [airFreight, setAirFreight] = useState(initialRates.airFreight ?? 0);
  const [handlingCharges, setHandlingCharges] = useState(initialRates.handlingCharges ?? 0);
  const [awbCharges, setAwbCharges] = useState(initialRates.awbCharges ?? 0);
  const [deliveryCharges, setDeliveryCharges] = useState(initialRates.deliveryCharges ?? 0);

  const [isSaving, setIsSaving] = useState(false);

  // Sync DO/LCL if volume or option changes and it hasn't been custom saved yet
  React.useEffect(() => {
    if (isImportLcl && !initialRates.doCharges) {
      setDoCharges(volume < 3 ? 1000 : parseInt(lclDoOption));
    }
  }, [lclDoOption, isImportLcl, volume, initialRates.doCharges]);

  React.useEffect(() => {
    if (isImportLcl && !initialRates.lclCharges) {
      setLclCharges(calculatedLclAmount);
    }
  }, [calculatedLclAmount, isImportLcl, initialRates.lclCharges]);

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    let ratesData: any = {};
    if (isSea) {
      ratesData = {
        oceanFreight: parseFloat(oceanFreight as any) || 0,
        cfsCharges: parseFloat(cfsCharges as any) || 0,
        customsClearance: parseFloat(customsClearance as any) || 0,
        blCharges: parseFloat(blCharges as any) || 0,
        vgmCharges: parseFloat(vgmCharges as any) || 0,
        lclCharges: parseFloat(lclCharges as any) || 0,
        doCharges: parseFloat(doCharges as any) || 0,
        cfsCustoms: parseFloat(cfsCustoms as any) || 0,
      };
    } else {
      ratesData = {
        airFreight: parseFloat(airFreight as any) || 0,
        handlingCharges: parseFloat(handlingCharges as any) || 0,
        customsClearance: parseFloat(customsClearance as any) || 0,
        awbCharges: parseFloat(awbCharges as any) || 0,
        deliveryCharges: parseFloat(deliveryCharges as any) || 0,
      };
    }

    const res = await saveEnquiryRatesAction(lead.id, ratesData);
    setIsSaving(false);

    if (res.ok) {
      toast.success("Rates worksheet saved successfully!");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to save rates");
    }
  };

  const calculateTotal = () => {
    if (isSea) {
      return (
        parseFloat(oceanFreight as any || 0) +
        parseFloat(cfsCharges as any || 0) +
        parseFloat(customsClearance as any || 0) +
        parseFloat(blCharges as any || 0) +
        parseFloat(vgmCharges as any || 0) +
        parseFloat(lclCharges as any || 0) +
        parseFloat(doCharges as any || 0) +
        parseFloat(cfsCustoms as any || 0)
      );
    } else {
      return (
        parseFloat(airFreight as any || 0) +
        parseFloat(handlingCharges as any || 0) +
        parseFloat(customsClearance as any || 0) +
        parseFloat(awbCharges as any || 0) +
        parseFloat(deliveryCharges as any || 0)
      );
    }
  };

  return (
    <form onSubmit={handleSaveRates} className="space-y-4">
      {isSea ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Ocean Freight (INR)</label>
              <input
                type="number"
                value={oceanFreight}
                onChange={(e) => setOceanFreight(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#00cec4]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">CFS Charges (INR)</label>
              <input
                type="number"
                value={cfsCharges}
                onChange={(e) => setCfsCharges(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#00cec4]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Custom Clearance Charges (INR)</label>
              <input
                type="number"
                value={customsClearance}
                onChange={(e) => setCustomsClearance(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#00cec4]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">BL Charges (INR)</label>
              <input
                type="number"
                value={blCharges}
                onChange={(e) => setBlCharges(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#00cec4]"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">VGM Charges (INR)</label>
              <input
                type="number"
                value={vgmCharges}
                onChange={(e) => setVgmCharges(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#00cec4]"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  LCL Charges (INR)
                </label>
                {isImportLcl && (
                  <span className="text-[9px] text-[#00cec4] font-medium">
                    Calculated: {volume} CBM × {calculatedLclRate}/CBM
                  </span>
                )}
              </div>
              <input
                type="number"
                value={lclCharges}
                onChange={(e) => setLclCharges(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#00cec4]"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  DO Charges (INR)
                </label>
                {isImportLcl && volume >= 3 && (
                  <div className="flex gap-2">
                    <label className="inline-flex items-center text-[9px] text-slate-400 cursor-pointer">
                      <input
                        type="radio"
                        name="do_option"
                        value="750"
                        checked={lclDoOption === "750"}
                        onChange={() => setLclDoOption("750")}
                        className="mr-1 size-3 bg-[#0a0d12] text-[#00cec4] border-[#1c212a]"
                      />
                      750
                    </label>
                    <label className="inline-flex items-center text-[9px] text-slate-400 cursor-pointer">
                      <input
                        type="radio"
                        name="do_option"
                        value="500"
                        checked={lclDoOption === "500"}
                        onChange={() => setLclDoOption("500")}
                        className="mr-1 size-3 bg-[#0a0d12] text-[#00cec4] border-[#1c212a]"
                      />
                      500
                    </label>
                  </div>
                )}
              </div>
              <input
                type="number"
                value={doCharges}
                onChange={(e) => setDoCharges(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#00cec4]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">CFS Charges (INR)</label>
              <input
                type="number"
                value={cfsCustoms}
                onChange={(e) => setCfsCustoms(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#00cec4]"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Air Freight (INR)</label>
              <input
                type="number"
                value={airFreight}
                onChange={(e) => setAirFreight(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#00cec4]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Handling Charges (INR)</label>
              <input
                type="number"
                value={handlingCharges}
                onChange={(e) => setHandlingCharges(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#00cec4]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Custom Clearance Charges (INR)</label>
              <input
                type="number"
                value={customsClearance}
                onChange={(e) => setCustomsClearance(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#00cec4]"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">AWB Charges (INR)</label>
              <input
                type="number"
                value={awbCharges}
                onChange={(e) => setAwbCharges(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#00cec4]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Delivery Charges (INR)</label>
              <input
                type="number"
                value={deliveryCharges}
                onChange={(e) => setDeliveryCharges(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#00cec4]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Summary & Save Action */}
      <div className="flex items-center justify-between pt-3 border-t border-[#1c212a]/30">
        <div className="text-sm font-semibold text-white">
          Total Estimated Rates: <span className="text-[#00cec4] font-bold">₹{calculateTotal().toLocaleString("en-IN")}</span>
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2 bg-[#00cec4] hover:bg-[#00b8af] disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md shadow-[#00cec4]/15"
        >
          {isSaving ? "Saving Worksheet..." : "Save Worksheet Rates"}
        </button>
      </div>
    </form>
  );
}

function TimeTrackerPanel({ lead, workTimeLogs, quotes, timeline }: { lead: any; workTimeLogs: any[]; quotes: any[]; timeline: any[] }) {
  const router = useRouter();
  const [activityType, setActivityType] = useState("LEAD_PROCESSING");
  const [durationHours, setDurationHours] = useState("1.0");
  const [description, setDescription] = useState("");
  const [loggedAt, setLoggedAt] = useState(new Date().toISOString().slice(0, 16));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const firstResponseEvent = [...timeline].reverse().find(
    (e) => e.eventType !== "LEAD_CREATED" && e.eventType !== "LEAD_IMPORT"
  );
  let responseDurationStr = "Pending Contact";
  if (firstResponseEvent) {
    const ms = new Date(firstResponseEvent.createdAt).getTime() - new Date(lead.createdAt).getTime();
    const hours = ms / 3600000;
    responseDurationStr = hours < 1 ? `${Math.round(hours * 60)} mins` : `${hours.toFixed(1)} hrs`;
  }

  let conversionDurationStr = "Unconverted";
  if (lead.isConverted && lead.convertedAt) {
    const ms = new Date(lead.convertedAt).getTime() - new Date(lead.createdAt).getTime();
    const days = ms / 86400000;
    conversionDurationStr = days < 1 ? `${(days * 24).toFixed(1)} hrs` : `${days.toFixed(1)} days`;
  }

  let quotePrepDurationStr = "No Quotes Yet";
  const firstQuote = quotes.length > 0 ? quotes[quotes.length - 1] : null;
  if (lead.isConverted && lead.convertedAt && firstQuote) {
    const ms = new Date(firstQuote.createdAt || firstQuote.date).getTime() - new Date(lead.convertedAt).getTime();
    const days = ms / 86400000;
    quotePrepDurationStr = days < 1 ? `${(days * 24).toFixed(1)} hrs` : `${days.toFixed(1)} days`;
  }

  let submissionDurationStr = "Not Submitted";
  const submittedQuote = quotes.find((q) => q.submittedAt);
  if (firstQuote && submittedQuote && submittedQuote.submittedAt) {
    const ms = new Date(submittedQuote.submittedAt).getTime() - new Date(firstQuote.createdAt || firstQuote.date).getTime();
    const days = ms / 86400000;
    submissionDurationStr = days < 1 ? `${(days * 24).toFixed(1)} hrs` : `${days.toFixed(1)} days`;
  }

  const totalLoggedHours = workTimeLogs.reduce((sum, log) => sum + (log.durationHours || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityType) return toast.error("Please select an activity type");
    const hours = parseFloat(durationHours);
    if (isNaN(hours) || hours <= 0) return toast.error("Please enter a valid duration greater than 0");

    setIsSubmitting(true);
    const res = await logWorkTimeAction({
      leadId: lead.id,
      activityType,
      durationHours: hours,
      description,
      loggedAt,
    });
    setIsSubmitting(false);

    if (res.ok) {
      toast.success("Work hours logged successfully");
      setDescription("");
      setDurationHours("1.0");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to log work hours");
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm("Are you sure you want to delete this work log?")) return;
    setIsDeleting(logId);
    const res = await deleteWorkTimeAction(logId);
    setIsDeleting(null);

    if (res.ok) {
      toast.success("Work log deleted");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to delete work log");
    }
  };

  const activityLabels: Record<string, string> = {
    LEAD_PROCESSING: "Lead Processing",
    IN_CALL_ENQUIRY: "In-Call Enquiry",
    RATES_PREPARATION: "Rates Preparation",
    QUOTE_DRAFTING: "Quote Drafting",
    SUBMITTED_FOR_APPROVAL: "Quote Approval Prep",
    CLIENT_MEETING: "Client Meeting",
    FOLLOW_UP: "Follow-up",
    OTHER: "Other",
  };

  return (
    <div className="space-y-6 text-slate-300">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#0a0d12]/50 border border-[#1c212a]/50 rounded-xl space-y-1.5 hover-cyan transition-all">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <Timer className="size-3.5 text-[#00cec4]" />
            Response Time
          </span>
          <div className="text-lg font-black text-white">{responseDurationStr}</div>
          <span className="text-[9px] text-slate-500 block truncate">Capture to first response</span>
        </div>
        <div className="p-4 bg-[#0a0d12]/50 border border-[#1c212a]/50 rounded-xl space-y-1.5 hover-cyan transition-all">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-[#00cec4]" />
            Conversion Time
          </span>
          <div className="text-lg font-black text-white">{conversionDurationStr}</div>
          <span className="text-[9px] text-slate-500 block truncate">Capture to account conversion</span>
        </div>
        <div className="p-4 bg-[#0a0d12]/50 border border-[#1c212a]/50 rounded-xl space-y-1.5 hover-cyan transition-all">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="size-3.5 text-[#00cec4]" />
            Quote Prep Time
          </span>
          <div className="text-lg font-black text-white">{quotePrepDurationStr}</div>
          <span className="text-[9px] text-slate-500 block truncate">Conversion to first quote draft</span>
        </div>
        <div className="p-4 bg-[#0a0d12]/50 border border-[#1c212a]/50 rounded-xl space-y-1.5 hover-cyan transition-all">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="size-3.5 text-[#00cec4]" />
            Submission SLA
          </span>
          <div className="text-lg font-black text-white">{submissionDurationStr}</div>
          <span className="text-[9px] text-slate-500 block truncate">Quote creation to submit approval</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 p-5 bg-[#0a0d12]/30 border border-[#1c212a]/40 rounded-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-[#1c212a]/30 pb-2.5">
            <Plus className="size-4 text-[#00cec4]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">Log Work Hours</h4>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Activity Type *</label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-slate-300 focus:outline-none focus:border-[#00cec4]"
              >
                {Object.entries(activityLabels).map(([key, value]) => (
                  <option key={key} value={key}>{value}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Duration (Hours) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#00cec4]"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Work Date *</label>
                <input
                  type="datetime-local"
                  value={loggedAt}
                  onChange={(e) => setLoggedAt(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-slate-300 focus:outline-none focus:border-[#00cec4]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Description / Notes</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What details did you gather or process?"
                rows={3}
                className="w-full p-2.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#00cec4]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#00cec4] hover:bg-[#00b8af] disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md shadow-[#00cec4]/15"
            >
              <span>{isSubmitting ? "Logging Hours..." : "Log Work Time"}</span>
            </button>
          </form>
        </div>

        <div className="xl:col-span-2 p-5 bg-[#0a0d12]/30 border border-[#1c212a]/40 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-2.5">
            <div className="flex items-center gap-2">
              <History className="size-4 text-[#00cec4]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Work Time Logs History</h4>
            </div>
            <span className="text-[10px] font-bold text-[#00cec4] uppercase bg-[#00cec4]/10 px-2 py-0.5 rounded border border-[#00cec4]/10">
              Total: {totalLoggedHours.toFixed(1)} hours
            </span>
          </div>

          {workTimeLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs italic">
              No time logs recorded for this client yet.
            </div>
          ) : (
            <div className="max-h-[350px] overflow-y-auto space-y-3 pr-1.5 scrollbar-thin scrollbar-thumb-[#1c212a]">
              {workTimeLogs.map((log) => (
                <div key={log.id} className="p-3 bg-[#0a0d12]/60 border border-[#1c212a]/30 rounded-lg flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white uppercase text-[10px] bg-[#161f28] border border-[#1c212a] px-2 py-0.5 rounded">
                        {activityLabels[log.activityType] || log.activityType}
                      </span>
                      <span className="text-[#00cec4] font-black">{log.durationHours} hr{log.durationHours === 1 ? "" : "s"}</span>
                      <span className="text-slate-500 font-semibold">•</span>
                      <span className="text-slate-400 font-medium">{log.user.name}</span>
                    </div>
                    {log.description && (
                      <p className="text-slate-300 leading-normal font-normal pl-0.5">{log.description}</p>
                    )}
                    <div className="text-[9px] text-slate-500 font-medium pl-0.5">
                      Performed: {new Date(log.loggedAt).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteLog(log.id)}
                    disabled={isDeleting === log.id}
                    className="p-1 bg-[#161f28]/60 hover:bg-red-500/10 hover:text-red-400 border border-[#1c212a] text-slate-500 rounded cursor-pointer transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

