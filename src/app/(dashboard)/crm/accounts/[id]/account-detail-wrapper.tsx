"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteAccountAction } from "@/modules/crm/actions";
import { NotesPanel } from "../../_components/notes-panel";
import { AttachmentsPanel } from "../../_components/attachments-panel";
import { ActivitiesPanel } from "../../_components/activities-panel";
import { TimelinePanel } from "../../_components/timeline-panel";
import {
  Edit2,
  Trash2,
  Users,
  Briefcase,
  FileText,
  Plus,
  Eye,
} from "lucide-react";

interface AccountDetailWrapperProps {
  account: any;
  notes: any[];
  attachments: any[];
  activities: any[];
  timeline: any[];
  invoices: any[];
}

export function AccountDetailWrapper({
  account,
  notes,
  attachments,
  activities,
  timeline,
  invoices,
}: AccountDetailWrapperProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "NOTES" | "ACTIVITIES" | "ATTACHMENTS" | "TIMELINE">("OVERVIEW");

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this account? This will delete all linked contacts too!")) return;

    const res = await deleteAccountAction(account.id);
    if (res.ok) {
      toast.success("Account deleted successfully");
      router.push("/crm/accounts");
    } else {
      toast.error(res.error);
    }
  };

  // Integration Calculations
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const unpaidInvoices = invoices.filter(inv => inv.status !== "PAID" && inv.status !== "CANCELLED");
  const overdueTotal = unpaidInvoices.reduce((sum, inv) => sum + inv.total, 0);

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* ─── SPLIT VIEW LAYOUT ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Account 360 View Cards */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Financial summary banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[#161f28]/30 border border-[#1c212a]/50">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Credit Limit</span>
              <span className="text-white font-bold text-lg">₹{account.creditLimit ? account.creditLimit.toLocaleString("en-IN") : "0"}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Overdue Invoices</span>
              <span className={`font-bold text-lg ${overdueTotal > 0 ? "text-red-400" : "text-white"}`}>
                ₹{overdueTotal.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Billed</span>
              <span className="text-[#00c4b6] font-bold text-lg">₹{totalInvoiced.toLocaleString("en-IN")}</span>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/crm/accounts/${account.id}/edit`}
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

          {/* Related Contacts */}
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-3">
              <div className="flex items-center gap-2">
                <Users className="size-4.5 text-[#00c4b6]" />
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">Contacts ({account.contacts?.length || 0})</h3>
              </div>
              <Link
                href={`/crm/contacts?accountId=${account.id}`}
                className="flex items-center gap-1 text-xs text-[#00c4b6] font-bold hover:underline cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>Add Contact</span>
              </Link>
            </div>
            {(!account.contacts || account.contacts.length === 0) ? (
              <div className="p-4 text-center text-slate-500 text-xs italic">No contacts registered under this account.</div>
            ) : (
              <div className="space-y-2">
                {account.contacts.map((c: any) => (
                  <div key={c.id} className="p-3 bg-[#0a0d12]/50 border border-[#1c212a]/30 rounded-lg flex items-center justify-between gap-4">
                    <div>
                      <Link href={`/crm/contacts/${c.id}`} className="font-bold text-white text-sm hover:underline hover:text-[#00c4b6]">
                        {c.firstName ? `${c.firstName} ` : ""}{c.lastName}
                      </Link>
                      <span className="text-[11px] text-slate-400 block mt-0.5">{c.designation || "No title"} • {c.phone || c.email || "No details"}</span>
                    </div>
                    <Link href={`/crm/contacts/${c.id}`} className="text-slate-400 hover:text-white cursor-pointer"><Eye className="size-4" /></Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Related Deals */}
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="size-4.5 text-[#00c4b6]" />
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">Deals & Opportunities ({account.deals?.length || 0})</h3>
              </div>
              <Link
                href={`/crm/deals?accountId=${account.id}`}
                className="flex items-center gap-1 text-xs text-[#00c4b6] font-bold hover:underline cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>Create Deal</span>
              </Link>
            </div>
            {(!account.deals || account.deals.length === 0) ? (
              <div className="p-4 text-center text-slate-500 text-xs italic">No deals tracked for this customer.</div>
            ) : (
              <div className="space-y-2">
                {account.deals.map((d: any) => (
                  <div key={d.id} className="p-3 bg-[#0a0d12]/50 border border-[#1c212a]/30 rounded-lg flex items-center justify-between gap-4">
                    <div>
                      <Link href={`/crm/deals/${d.id}`} className="font-bold text-white text-sm hover:underline hover:text-[#00c4b6]">
                        {d.name}
                      </Link>
                      <span className="text-[11px] text-slate-400 block mt-0.5">Stage: {d.stage} • Value: ₹{d.amount.toLocaleString("en-IN")}</span>
                    </div>
                    <Link href={`/crm/deals/${d.id}`} className="text-slate-400 hover:text-white cursor-pointer"><Eye className="size-4" /></Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Related Invoices & Quotes */}
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="size-4.5 text-[#00c4b6]" />
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">Invoices & Quotes ({invoices.length})</h3>
              </div>
              <Link
                href={`/accounting/invoices-sales?accountId=${account.id}`}
                className="flex items-center gap-1 text-xs text-[#00c4b6] font-bold hover:underline cursor-pointer"
              >
                <Plus className="size-3.5" />
                <span>New Invoice/Quote</span>
              </Link>
            </div>
            {invoices.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-xs italic">No invoice sheets issued.</div>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv: any) => (
                  <div key={inv.id} className="p-3 bg-[#0a0d12]/50 border border-[#1c212a]/30 rounded-lg flex items-center justify-between gap-4">
                    <div>
                      <span className="font-bold text-white text-sm">{inv.invoiceNumber}</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {inv.type} • Date: {new Date(inv.date).toLocaleDateString("en-IN")} • Amount: ₹{inv.total.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                      inv.status === "PAID" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {inv.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Tabbed related panels */}
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
                    <span className="font-bold text-white block uppercase tracking-wider">Account Information</span>
                    <div className="space-y-1 text-slate-400">
                      <div><strong className="text-white">Phone: </strong>{account.phone || "Not Specified"}</div>
                      <div><strong className="text-white">Email: </strong>{account.email || "Not Specified"}</div>
                      <div><strong className="text-white">GSTIN: </strong>{account.gstin || "Not Specified"}</div>
                      <div><strong className="text-white">Billing Address: </strong>{account.billingAddress || "Not Specified"}</div>
                      <div><strong className="text-white">Shipping Address: </strong>{account.shippingAddress || "Not Specified"}</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "NOTES" && (
                <NotesPanel relatedToType="ACCOUNT" relatedToId={account.id} initialNotes={notes} />
              )}

              {activeTab === "ACTIVITIES" && (
                <ActivitiesPanel relatedToType="ACCOUNT" relatedToId={account.id} initialActivities={activities} />
              )}

              {activeTab === "ATTACHMENTS" && (
                <AttachmentsPanel relatedToType="ACCOUNT" relatedToId={account.id} initialAttachments={attachments} />
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
