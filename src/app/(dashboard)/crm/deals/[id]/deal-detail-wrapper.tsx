"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteDealAction } from "@/modules/crm/actions";
import { generateInvoiceFromDealAction } from "@/modules/accounting/actions";
import { NotesPanel } from "../../_components/notes-panel";
import { AttachmentsPanel } from "../../_components/attachments-panel";
import { ActivitiesPanel } from "../../_components/activities-panel";
import { TimelinePanel } from "../../_components/timeline-panel";
import {
  Edit2,
  Trash2,
  Truck,
  Info,
  Receipt
} from "lucide-react";

interface DealDetailWrapperProps {
  deal: any;
  notes: any[];
  attachments: any[];
  activities: any[];
  timeline: any[];
  invoice?: any;
}

export function DealDetailWrapper({
  deal,
  notes,
  attachments,
  activities,
  timeline,
  invoice,
}: DealDetailWrapperProps) {
  const router = useRouter();
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
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
    <div className="space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
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
          <div className="flex items-center justify-end gap-2">
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
                    <Link href={`/crm/customers/${deal.account.id}`} className="hover:underline text-[#00c4b6] font-bold">
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

          {/* Description & Lost reason / Invoice details */}
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
            {deal.stage === "WON" && (
              <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 space-y-4 card-left-accent">
                <div className="flex items-center gap-3 border-b border-[#1c212a]/30 pb-3 mb-2">
                  <Receipt className="size-4.5 text-[#00cec4]" />
                  <h3 className="font-bold text-sm text-white uppercase tracking-wider">Billing & Invoice</h3>
                </div>
                {invoice ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Invoice Number:</span>
                      <Link href={`/accounting/sales-invoices/${invoice.id}`} className="text-[#00cec4] hover:underline font-mono font-bold">
                        {invoice.invoiceNumber}
                      </Link>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Amount:</span>
                      <span className="text-white font-bold font-mono">₹{Number(invoice.grandTotal).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Status:</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                        invoice.status === "PAID"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : invoice.status === "CANCELLED"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                    <div className="pt-2">
                      <Link
                        href={`/accounting/sales-invoices/${invoice.id}`}
                        className="inline-block text-center bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2 rounded-xl text-xs uppercase tracking-wide transition-all w-full"
                      >
                        View Invoice Detail
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <p className="text-slate-400">
                      This deal is won! You can now generate a Sales Invoice to record accounts receivable and request payment.
                    </p>
                    <button
                      disabled={isGeneratingInvoice}
                      onClick={async () => {
                        try {
                          setIsGeneratingInvoice(true);
                          const res = await generateInvoiceFromDealAction(deal.id);
                          if (res.ok) {
                            toast.success("Sales Invoice generated successfully!");
                            router.refresh();
                          } else {
                            toast.error(res.error);
                          }
                        } catch (err: any) {
                          toast.error(err.message || "Failed to generate invoice");
                        } finally {
                          setIsGeneratingInvoice(false);
                        }
                      }}
                      className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2.5 rounded-xl text-xs uppercase tracking-wide transition-all w-full cursor-pointer disabled:opacity-50"
                    >
                      {isGeneratingInvoice ? "Generating Invoice..." : "Generate Sales Invoice"}
                    </button>
                  </div>
                )}
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
