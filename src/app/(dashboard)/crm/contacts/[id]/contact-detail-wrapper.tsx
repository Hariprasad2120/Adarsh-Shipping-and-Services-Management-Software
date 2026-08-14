"use client";

import { CrmButton } from "@/modules/crm/components/workspace/crm-workspace";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteContactAction } from "@/modules/crm/actions";
import { NotesPanel } from "@/modules/crm/components/records/notes-panel";
import { AttachmentsPanel } from "@/modules/crm/components/records/attachments-panel";
import { ActivitiesPanel } from "@/modules/crm/components/records/activities-panel";
import { TimelinePanel } from "@/modules/crm/components/records/timeline-panel";
import {Edit2,Trash2,Info,Building} from "lucide-react";

interface ContactDetailWrapperProps {
  contact: any;
  notes: any[];
  attachments: any[];
  activities: any[];
  timeline: any[];
}

export function ContactDetailWrapper({
  contact,
  notes,
  attachments,
  activities,
  timeline,
}: ContactDetailWrapperProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "NOTES" | "ACTIVITIES" | "ATTACHMENTS" | "TIMELINE">("OVERVIEW");

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this contact?")) return;

    const res = await deleteContactAction(contact.id);
    if (res.ok) {
      toast.success("Contact deleted successfully");
      router.push("/crm/contacts");
    } else {
      toast.error(res.error);
    }
  };

  const contactName = `${contact.firstName || ""} ${contact.lastName}`.trim();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─── SPLIT VIEW LAYOUT ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Business Card & Structured Fields */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Contact Details Card */}
          <div className="p-6 rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 space-y-4">
            <div className="flex items-center justify-end gap-2">
              <Link
                href={`/crm/contacts/${contact.id}/edit`}
                className="flex items-center gap-1.5 bg-[var(--mnx-surface)] hover:bg-[var(--mnx-text-muted)] border border-[var(--mnx-border)] text-[var(--mnx-muted)] px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                <Edit2 className="size-3.5" />
                <span>Edit</span>
              </Link>
              <CrmButton
                onClick={handleDelete}
                className="flex items-center gap-1.5 bg-[var(--mnx-surface)] hover:bg-[var(--mnx-danger-bg)] hover:text-[var(--mnx-danger)] border border-[var(--mnx-border)] text-[var(--mnx-muted)] px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>Delete</span>
              </CrmButton>
            </div>
            <div className="flex items-center gap-3 border-b border-[var(--mnx-border)]/30 pb-3 mb-2">
              <Info className="size-4.5 text-[var(--mnx-accent)]" />
              <h3 className="font-bold text-sm text-[var(--mnx-text-strong)] uppercase tracking-wider">Contact Profile Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">Full Name</span>
                <span className="text-[var(--mnx-text-strong)] font-medium">{contactName}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">Linked Company</span>
                <span className="text-[var(--mnx-text-strong)] font-medium">
                  {contact.account ? (
                    <Link href={`/crm/customers/${contact.account.id}`} className="hover:underline text-[var(--mnx-accent)] font-bold">
                      {contact.account.name}
                    </Link>
                  ) : (
                    "Not Specified"
                  )}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">Email</span>
                <span className="text-[var(--mnx-text-strong)] font-medium">{contact.email || "Not Specified"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">Designation</span>
                <span className="text-[var(--mnx-text-strong)] font-medium">{contact.designation || "Not Specified"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">Department</span>
                <span className="text-[var(--mnx-text-strong)] font-medium">{contact.department || "Not Specified"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">Direct Line</span>
                <span className="text-[var(--mnx-text-strong)] font-medium">{contact.phone || "Not Specified"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">Mobile Number</span>
                <span className="text-[var(--mnx-text-strong)] font-medium">{contact.mobile || "Not Specified"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">Contact Owner</span>
                <span className="text-[var(--mnx-text-strong)] font-medium">{contact.owner.name}</span>
              </div>
              <div className="md:col-span-2 space-y-1">
                <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">Office Address</span>
                <span className="text-[var(--mnx-text-strong)] font-medium">{contact.address || "Not Specified"}</span>
              </div>
            </div>
          </div>

          {/* Customer Account Details Card (Combined View) */}
          {contact.account && (
            <div className="p-6 rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--mnx-border)]/30 pb-3 mb-2">
                <div className="flex items-center gap-3">
                  <Building className="size-4.5 text-[var(--mnx-accent)]" />
                  <h3 className="font-bold text-sm text-[var(--mnx-text-strong)] uppercase tracking-wider">Customer Account Details</h3>
                </div>
                <Link
                  href={`/crm/customers/${contact.account.id}`}
                  className="text-xs text-[var(--mnx-accent)] hover:underline font-bold"
                >
                  View Full Profile
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">Company Name</span>
                  <span className="text-[var(--mnx-text-strong)] font-medium">{contact.account.name}</span>
                </div>
                {contact.account.customerSubType && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">Customer Sub-Type</span>
                    <span className="text-[var(--mnx-text-strong)] font-medium">{contact.account.customerSubType}</span>
                  </div>
                )}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">Account Email</span>
                  <span className="text-[var(--mnx-text-strong)] font-medium">{contact.account.email || "Not Specified"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">Account Phone</span>
                  <span className="text-[var(--mnx-text-strong)] font-medium">{contact.account.phone || "Not Specified"}</span>
                </div>
                {contact.account.website && (
                  <div className="space-y-1 md:col-span-2">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">Website</span>
                    <a href={contact.account.website} target="_blank" rel="noopener noreferrer" className="text-[var(--mnx-accent)] hover:underline font-medium">
                      {contact.account.website}
                    </a>
                  </div>
                )}
                {contact.account.billingAddress && (
                  <div className="space-y-1 md:col-span-2">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">Billing Address</span>
                    <span className="text-[var(--mnx-muted)] font-medium whitespace-pre-line">{contact.account.billingAddress}</span>
                  </div>
                )}
                {contact.account.shippingAddress && (
                  <div className="space-y-1 md:col-span-2">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">Shipping Address</span>
                    <span className="text-[var(--mnx-muted)] font-medium whitespace-pre-line">{contact.account.shippingAddress}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description Section */}
          {contact.description && (
            <div className="p-6 rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 space-y-3">
              <h3 className="font-bold text-xs text-[var(--mnx-muted)] uppercase tracking-wider border-b border-[var(--mnx-border)]/30 pb-2">Internal Profile Notes</h3>
              <p className="text-sm text-[var(--mnx-muted)] whitespace-pre-wrap leading-relaxed">
                {contact.description}
              </p>
            </div>
          )}

        </div>

        {/* Right Column: Related Lists & Timeline Activities */}
        <div className="space-y-6">
          
          <div className="p-6 rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 space-y-6">
            
            <div className="flex border-b border-[var(--mnx-border)]/50 pb-1 gap-4 overflow-x-auto select-none">
              <CrmButton
                onClick={() => setActiveTab("OVERVIEW")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === "OVERVIEW" ? "border-[var(--mnx-accent)] text-[var(--mnx-text-strong)]" : "border-transparent text-[var(--mnx-muted)] hover:text-[var(--mnx-text-strong)]"
                }`}
              >
                Overview
              </CrmButton>
              <CrmButton
                onClick={() => setActiveTab("NOTES")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === "NOTES" ? "border-[var(--mnx-accent)] text-[var(--mnx-text-strong)]" : "border-transparent text-[var(--mnx-muted)] hover:text-[var(--mnx-text-strong)]"
                }`}
              >
                Notes ({notes.length})
              </CrmButton>
              <CrmButton
                onClick={() => setActiveTab("ACTIVITIES")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === "ACTIVITIES" ? "border-[var(--mnx-accent)] text-[var(--mnx-text-strong)]" : "border-transparent text-[var(--mnx-muted)] hover:text-[var(--mnx-text-strong)]"
                }`}
              >
                Activities ({activities.length})
              </CrmButton>
              <CrmButton
                onClick={() => setActiveTab("ATTACHMENTS")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === "ATTACHMENTS" ? "border-[var(--mnx-accent)] text-[var(--mnx-text-strong)]" : "border-transparent text-[var(--mnx-muted)] hover:text-[var(--mnx-text-strong)]"
                }`}
              >
                Files ({attachments.length})
              </CrmButton>
              <CrmButton
                onClick={() => setActiveTab("TIMELINE")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === "TIMELINE" ? "border-[var(--mnx-accent)] text-[var(--mnx-text-strong)]" : "border-transparent text-[var(--mnx-muted)] hover:text-[var(--mnx-text-strong)]"
                }`}
              >
                Audit
              </CrmButton>
            </div>

            <div className="space-y-4">
              {activeTab === "OVERVIEW" && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-[var(--mnx-surface)]/60 rounded-lg space-y-2 border border-[var(--mnx-border)]/30">
                    <span className="font-bold text-[var(--mnx-text-strong)] block uppercase tracking-wider">Contact Status</span>
                    <p className="text-[var(--mnx-muted)] leading-relaxed font-medium">
                      This contact represents the {contact.isDecisionMaker ? "primary decision-making" : "liaison"} authority for {contact.account?.name || "their company"}.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "NOTES" && (
                <NotesPanel relatedToType="CONTACT" relatedToId={contact.id} initialNotes={notes} />
              )}

              {activeTab === "ACTIVITIES" && (
                <ActivitiesPanel relatedToType="CONTACT" relatedToId={contact.id} initialActivities={activities} />
              )}

              {activeTab === "ATTACHMENTS" && (
                <AttachmentsPanel relatedToType="CONTACT" relatedToId={contact.id} initialAttachments={attachments} />
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
