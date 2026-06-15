"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteLeadAction } from "@/modules/crm/actions";
import { ConvertModal } from "./convert-modal";
import { NotesPanel } from "../../_components/notes-panel";
import { AttachmentsPanel } from "../../_components/attachments-panel";
import { ActivitiesPanel } from "../../_components/activities-panel";
import { TimelinePanel } from "../../_components/timeline-panel";
import {
  ChevronLeft,
  Edit2,
  RefreshCcw,
  Trash2,
  User,
  Building,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  MessageSquare,
  Paperclip,
  Activity,
  History,
  Info
} from "lucide-react";

interface LeadDetailWrapperProps {
  lead: any;
  notes: any[];
  attachments: any[];
  activities: any[];
  timeline: any[];
}

export function LeadDetailWrapper({ lead, notes, attachments, activities, timeline }: LeadDetailWrapperProps) {
  const router = useRouter();
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "NOTES" | "ACTIVITIES" | "ATTACHMENTS" | "TIMELINE">("OVERVIEW");

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
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      
      {/* ─── RECORD HEADER ACTIONS ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1c212a]/30 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/crm/leads"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded transition-all cursor-pointer"
            title="Back to Leads"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight text-white">{leadName}</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold bg-[#161f28] text-slate-300 rounded uppercase tracking-wider">
                {lead.status}
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-1">{lead.company} • Owner: {lead.owner.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConvertModal(true)}
            className="flex items-center gap-1.5 bg-[#00c4b6] hover:bg-[#00b0a3] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md shadow-[#00c4b6]/10 cursor-pointer"
          >
            <RefreshCcw className="size-3.5" />
            <span>Convert Lead</span>
          </button>
          <Link
            href={`/crm/leads/${lead.id}/edit`}
            className="flex items-center gap-1.5 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-slate-200 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <Edit2 className="size-3.5" />
            <span>Edit</span>
          </Link>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 bg-[#161f28] hover:bg-red-500/10 hover:text-red-400 border border-[#1c212a] text-slate-400 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
          >
            <Trash2 className="size-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* ─── SPLIT VIEW LAYOUT ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Business Card & Structured Fields */}
        <div className="lg:col-span-2 space-y-6">
          
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

    </div>
  );
}
