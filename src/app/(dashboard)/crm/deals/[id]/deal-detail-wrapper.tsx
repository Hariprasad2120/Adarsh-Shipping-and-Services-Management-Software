"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteDealAction } from "@/modules/crm/actions";
import { NotesPanel } from "../../_components/notes-panel";
import { AttachmentsPanel } from "../../_components/attachments-panel";
import { ActivitiesPanel } from "../../_components/activities-panel";
import { TimelinePanel } from "../../_components/timeline-panel";
import {
  ChevronLeft,
  Edit2,
  Trash2,
  Landmark,
  Building,
  User,
  Calendar,
  Clock,
  MapPin,
  Tag,
  DollarSign,
  AlertCircle,
  Truck,
  Info
} from "lucide-react";

interface DealDetailWrapperProps {
  deal: any;
  notes: any[];
  attachments: any[];
  activities: any[];
  timeline: any[];
}

export function DealDetailWrapper({
  deal,
  notes,
  attachments,
  activities,
  timeline,
}: DealDetailWrapperProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "NOTES" | "ACTIVITIES" | "ATTACHMENTS" | "TIMELINE">("OVERVIEW");

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this deal?")) return;

    const res = await deleteDealAction(deal.id);
    if (res.ok) {
      toast.success("Deal deleted successfully");
      router.push("/crm/deals");
    } else {
      toast.error(res.error);
    }
  };

  const formattedCloseDate = deal.expectedCloseDate
    ? new Date(deal.expectedCloseDate).toLocaleDateString("en-IN")
    : "Not Specified";

  const formattedFollowUp = deal.nextFollowUpDate
    ? new Date(deal.nextFollowUpDate).toLocaleDateString("en-IN")
    : "Not Scheduled";

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      
      {/* ─── RECORD HEADER ACTIONS ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1c212a]/30 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/crm/deals"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded transition-all cursor-pointer"
            title="Back to Deals"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight text-white">{deal.name}</h2>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                deal.stage === "WON"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : deal.stage === "LOST"
                  ? "bg-red-500/10 text-red-400"
                  : "bg-[#00c4b6]/10 text-[#00c4b6]"
              }`}>
                {deal.stage.replace("_", " ")}
              </span>
            </div>
            {deal.account && (
              <p className="text-slate-400 text-xs mt-1">
                Account:{" "}
                <Link href={`/crm/accounts/${deal.account.id}`} className="hover:underline text-[#00c4b6]">
                  {deal.account.name}
                </Link>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/crm/deals/${deal.id}/edit`}
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
        
        {/* Left Column: Deal overview fields */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Deal Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[#161f28]/30 border border-[#1c212a]/55 text-center">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Deal Value</span>
              <span className="text-white font-bold text-lg">₹{deal.amount.toLocaleString("en-IN")}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Win Probability</span>
              <span className="text-[#00c4b6] font-bold text-lg">{deal.probability}%</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Close Target</span>
              <span className="text-white font-bold text-sm leading-8">{formattedCloseDate}</span>
            </div>
          </div>

          {/* Deal Details */}
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 space-y-4">
            <div className="flex items-center gap-3 border-b border-[#1c212a]/30 pb-3 mb-2">
              <Info className="size-4.5 text-[#00c4b6]" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">Deal Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Customer Company</span>
                <span className="text-white font-medium">
                  {deal.account ? (
                    <Link href={`/crm/accounts/${deal.account.id}`} className="hover:underline text-[#00c4b6] font-bold">
                      {deal.account.name}
                    </Link>
                  ) : (
                    "Not Specified"
                  )}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Primary Contact</span>
                <span className="text-white font-medium">
                  {deal.contact ? (
                    <Link href={`/crm/contacts/${deal.contact.id}`} className="hover:underline text-slate-200">
                      {deal.contact.firstName ? `${deal.contact.firstName} ` : ""}{deal.contact.lastName}
                    </Link>
                  ) : (
                    "Not Specified"
                  )}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Next Follow-Up Date</span>
                <span className="text-white font-medium">{formattedFollowUp}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Deal Owner</span>
                <span className="text-white font-medium">{deal.owner.name}</span>
              </div>
            </div>
          </div>

          {/* Logistics Categorization */}
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 space-y-4">
            <div className="flex items-center gap-3 border-b border-[#1c212a]/30 pb-3 mb-2">
              <Truck className="size-4.5 text-[#00c4b6]" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">Logistics & Service Profile</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Service Category</span>
                <span className="text-white font-medium">{deal.serviceType || "Freight Forwarding"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Logistics Type</span>
                <span className="text-white font-medium">{deal.logisticsCategory || "Import"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Competitor</span>
                <span className="text-white font-medium">{deal.competitor || "None Tracked"}</span>
              </div>
            </div>
          </div>

          {/* Description & Lost reason */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block border-b border-[#1c212a]/30 pb-1.5">Description</span>
              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                {deal.description || "No deal description details provided."}
              </p>
            </div>
            {deal.stage === "LOST" && (
              <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 space-y-2 border-red-900/30">
                <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider block border-b border-red-900/30 pb-1.5">Reason for Loss</span>
                <p className="text-sm text-red-300 whitespace-pre-wrap leading-relaxed">
                  {deal.lostReason || "No loss details provided."}
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Related Lists & Timeline activities */}
        <div className="space-y-6">
          
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 space-y-6">
            
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

            <div className="space-y-4">
              {activeTab === "OVERVIEW" && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-[#0a0d12]/60 rounded-lg space-y-2 border border-[#1c212a]/30">
                    <span className="font-bold text-white block uppercase tracking-wider">Opportunity Stats</span>
                    <div className="space-y-1 text-slate-400">
                      <div><strong className="text-white">Service Type: </strong>{deal.serviceType || "Freight Forwarding"}</div>
                      <div><strong className="text-white">Category: </strong>{deal.logisticsCategory || "Import"}</div>
                      <div><strong className="text-white">Close Date: </strong>{formattedCloseDate}</div>
                      <div><strong className="text-white">Probability: </strong>{deal.probability}%</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "NOTES" && (
                <NotesPanel relatedToType="DEAL" relatedToId={deal.id} initialNotes={notes} />
              )}

              {activeTab === "ACTIVITIES" && (
                <ActivitiesPanel relatedToType="DEAL" relatedToId={deal.id} initialActivities={activities} />
              )}

              {activeTab === "ATTACHMENTS" && (
                <AttachmentsPanel relatedToType="DEAL" relatedToId={deal.id} initialAttachments={attachments} />
              )}

              {activeTab === "TIMELINE" && (
                <TimelinePanel events={timeline} />
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
