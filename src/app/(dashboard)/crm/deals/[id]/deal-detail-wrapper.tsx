"use client";

import { CrmButton } from "@/modules/crm/components/workspace/crm-workspace";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteDealAction } from "@/modules/crm/actions";
import { generateInvoiceFromDealAction } from "@/modules/accounting/actions";
import { NotesPanel } from "@/modules/crm/components/records/notes-panel";
import { AttachmentsPanel } from "@/modules/crm/components/records/attachments-panel";
import { ActivitiesPanel } from "@/modules/crm/components/records/activities-panel";
import { TimelinePanel } from "@/modules/crm/components/records/timeline-panel";
import {Edit2,Trash2,Truck,Info,Receipt} from "lucide-react";

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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─── SPLIT VIEW LAYOUT ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Deal overview fields */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Deal Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[var(--mnx-surface)]/30 border border-[var(--mnx-border)]/55 text-center">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-mono-muted uppercase tracking-wider block">Deal Value</span>
              <span className="text-mono-text font-bold text-lg">₹{deal.amount.toLocaleString("en-IN")}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-mono-muted uppercase tracking-wider block">Win Probability</span>
              <span className="text-[var(--mnx-accent)] font-bold text-lg">{deal.probability}%</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-mono-muted uppercase tracking-wider block">Close Target</span>
              <span className="text-mono-text font-bold text-sm leading-8">{formattedCloseDate}</span>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/crm/deals/${deal.id}/edit`}
              className="flex items-center gap-1.5 bg-[var(--mnx-surface)] hover:bg-[var(--mnx-text-muted)] border border-[var(--mnx-border)] text-mono-muted px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              <Edit2 className="size-3.5" />
              <span>Edit</span>
            </Link>
            <CrmButton
              onClick={handleDelete}
              className="flex items-center gap-1.5 bg-[var(--mnx-surface)] hover:bg-[var(--mnx-danger-bg)] hover:text-[var(--mnx-danger)] border border-[var(--mnx-border)] text-mono-muted px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              <Trash2 className="size-3.5" />
              <span>Delete</span>
            </CrmButton>
          </div>

          {/* Deal Details */}
          <div className="p-6 rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 space-y-4">
            <div className="flex items-center gap-3 border-b border-[var(--mnx-border)]/30 pb-3 mb-2">
              <Info className="size-4.5 text-[var(--mnx-accent)]" />
              <h3 className="font-bold text-sm text-mono-text uppercase tracking-wider">Deal Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-mono-muted uppercase tracking-wider block">Customer Company</span>
                <span className="text-mono-text font-medium">
                  {deal.account ? (
                    <Link href={`/crm/customers/${deal.account.id}`} className="hover:underline text-[var(--mnx-accent)] font-bold">
                      {deal.account.name}
                    </Link>
                  ) : (
                    "Not Specified"
                  )}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-mono-muted uppercase tracking-wider block">Primary Contact</span>
                <span className="text-mono-text font-medium">
                  {deal.contact ? (
                    <Link href={`/crm/contacts/${deal.contact.id}`} className="hover:underline text-mono-muted">
                      {deal.contact.firstName ? `${deal.contact.firstName} ` : ""}{deal.contact.lastName}
                    </Link>
                  ) : (
                    "Not Specified"
                  )}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-mono-muted uppercase tracking-wider block">Next Follow-Up Date</span>
                <span className="text-mono-text font-medium">{formattedFollowUp}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-mono-muted uppercase tracking-wider block">Deal Owner</span>
                <span className="text-mono-text font-medium">{deal.owner.name}</span>
              </div>
            </div>
          </div>

          {/* Logistics Categorization */}
          <div className="p-6 rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 space-y-4">
            <div className="flex items-center gap-3 border-b border-[var(--mnx-border)]/30 pb-3 mb-2">
              <Truck className="size-4.5 text-[var(--mnx-accent)]" />
              <h3 className="font-bold text-sm text-mono-text uppercase tracking-wider">Logistics & Service Profile</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-mono-muted uppercase tracking-wider block">Service Category</span>
                <span className="text-mono-text font-medium">{deal.serviceType || "Freight Forwarding"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-mono-muted uppercase tracking-wider block">Logistics Type</span>
                <span className="text-mono-text font-medium">{deal.logisticsCategory || "Import"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-mono-muted uppercase tracking-wider block">Competitor</span>
                <span className="text-mono-text font-medium">{deal.competitor || "None Tracked"}</span>
              </div>
            </div>
          </div>

          {/* Description & Lost reason / Invoice details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 space-y-2">
              <span className="text-[11px] font-bold text-mono-muted uppercase tracking-wider block border-b border-[var(--mnx-border)]/30 pb-1.5">Description</span>
              <p className="text-sm text-mono-muted whitespace-pre-wrap leading-relaxed">
                {deal.description || "No deal description details provided."}
              </p>
            </div>
            {deal.stage === "LOST" && (
              <div className="p-6 rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 space-y-2 border-[var(--mnx-danger)]">
                <span className="text-[11px] font-bold text-[var(--mnx-danger)] uppercase tracking-wider block border-b border-[var(--mnx-danger)] pb-1.5">Reason for Loss</span>
                <p className="text-sm text-[var(--mnx-danger)] whitespace-pre-wrap leading-relaxed">
                  {deal.lostReason || "No loss details provided."}
                </p>
              </div>
            )}
            {deal.stage === "WON" && (
              <div className="p-6 rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 space-y-4 mnx-crm-panel-surface ">
                <div className="flex items-center gap-3 border-b border-[var(--mnx-border)]/30 pb-3 mb-2">
                  <Receipt className="size-4.5 text-[var(--mnx-accent)]" />
                  <h3 className="font-bold text-sm text-mono-text uppercase tracking-wider">Billing & Invoice</h3>
                </div>
                {invoice ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-mono-muted">Invoice Number:</span>
                      <Link href={`/accounting/sales-invoices/${invoice.id}`} className="text-[var(--mnx-accent)] hover:underline font-mono font-bold">
                        {invoice.invoiceNumber}
                      </Link>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-mono-muted">Amount:</span>
                      <span className="text-mono-text font-bold font-mono">₹{Number(invoice.grandTotal).toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-mono-muted">Status:</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                        invoice.status === "PAID"
                          ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]"
                          : invoice.status === "CANCELLED"
                          ? "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]"
                          : "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]"
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                    <div className="pt-2">
                      <Link
                        href={`/accounting/sales-invoices/${invoice.id}`}
                        className="inline-block text-center bg-[var(--mnx-accent)] text-mono-text hover:bg-[var(--mnx-accent)] hover:shadow-[0_0_0_3px_var(--mnx-accent-soft)] px-4 py-2 rounded-xl text-xs uppercase tracking-wide transition-all w-full"
                      >
                        View Invoice Detail
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <p className="text-mono-muted">
                      This deal is won. Prepare an immutable invoice request for Accounting to validate, approve, and number.
                    </p>
                    <CrmButton
                      disabled={isGeneratingInvoice}
                      onClick={async () => {
                        try {
                          setIsGeneratingInvoice(true);
                          const res = await generateInvoiceFromDealAction(deal.id);
                          if (res.ok) {
                            toast.success("Accounting invoice request prepared.");
                            router.refresh();
                          } else {
                            toast.error(res.error);
                          }
                        } catch (err: any) {
                          toast.error(err.message || "Failed to prepare invoice request");
                        } finally {
                          setIsGeneratingInvoice(false);
                        }
                      }}
                      className="bg-[var(--mnx-accent)] text-mono-text hover:bg-[var(--mnx-accent)] hover:shadow-[0_0_0_3px_var(--mnx-accent-soft)] px-4 py-2.5 rounded-xl text-xs uppercase tracking-wide transition-all w-full cursor-pointer disabled:opacity-50"
                    >
                      {isGeneratingInvoice ? "Preparing Request..." : "Prepare Invoice Request"}
                    </CrmButton>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Related Lists & Timeline activities */}
        <div className="space-y-6">
          
          <div className="p-6 rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 space-y-6">
            
            <div className="flex border-b border-[var(--mnx-border)]/50 pb-1 gap-4 overflow-x-auto select-none">
              <CrmButton
                onClick={() => setActiveTab("OVERVIEW")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === "OVERVIEW" ? "border-[var(--mnx-accent)] text-mono-text" : "border-transparent text-mono-muted hover:text-mono-text"
                }`}
              >
                Overview
              </CrmButton>
              <CrmButton
                onClick={() => setActiveTab("NOTES")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === "NOTES" ? "border-[var(--mnx-accent)] text-mono-text" : "border-transparent text-mono-muted hover:text-mono-text"
                }`}
              >
                Notes ({notes.length})
              </CrmButton>
              <CrmButton
                onClick={() => setActiveTab("ACTIVITIES")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === "ACTIVITIES" ? "border-[var(--mnx-accent)] text-mono-text" : "border-transparent text-mono-muted hover:text-mono-text"
                }`}
              >
                Activities ({activities.length})
              </CrmButton>
              <CrmButton
                onClick={() => setActiveTab("ATTACHMENTS")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === "ATTACHMENTS" ? "border-[var(--mnx-accent)] text-mono-text" : "border-transparent text-mono-muted hover:text-mono-text"
                }`}
              >
                Files ({attachments.length})
              </CrmButton>
              <CrmButton
                onClick={() => setActiveTab("TIMELINE")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === "TIMELINE" ? "border-[var(--mnx-accent)] text-mono-text" : "border-transparent text-mono-muted hover:text-mono-text"
                }`}
              >
                Audit
              </CrmButton>
            </div>

            <div className="space-y-4">
              {activeTab === "OVERVIEW" && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-[var(--mnx-surface)]/60 rounded-lg space-y-2 border border-[var(--mnx-border)]/30">
                    <span className="font-bold text-mono-text block uppercase tracking-wider">Opportunity Stats</span>
                    <div className="space-y-1 text-mono-muted">
                      <div><strong className="text-mono-text">Service Type: </strong>{deal.serviceType || "Freight Forwarding"}</div>
                      <div><strong className="text-mono-text">Category: </strong>{deal.logisticsCategory || "Import"}</div>
                      <div><strong className="text-mono-text">Close Date: </strong>{formattedCloseDate}</div>
                      <div><strong className="text-mono-text">Probability: </strong>{deal.probability}%</div>
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
