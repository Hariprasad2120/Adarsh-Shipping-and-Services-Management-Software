"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteContactAction } from "@/modules/crm/actions";
import { NotesPanel } from "../../_components/notes-panel";
import { AttachmentsPanel } from "../../_components/attachments-panel";
import { ActivitiesPanel } from "../../_components/activities-panel";
import { TimelinePanel } from "../../_components/timeline-panel";
import {
  ChevronLeft,
  Edit2,
  Trash2,
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  Plus,
  Eye,
  Info
} from "lucide-react";

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
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      
      {/* ─── RECORD HEADER ACTIONS ─────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1c212a]/30 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/crm/contacts"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded transition-all cursor-pointer"
            title="Back to Contacts"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight text-white">{contactName}</h2>
              {contact.isDecisionMaker && (
                <span className="px-2 py-0.5 text-[9px] font-bold bg-[#00c4b6]/10 text-[#00c4b6] border border-[#00c4b6]/30 rounded uppercase tracking-wider">
                  Key Decision Maker
                </span>
              )}
            </div>
            {contact.account && (
              <p className="text-slate-400 text-xs mt-1">
                Company:{" "}
                <Link href={`/crm/accounts/${contact.account.id}`} className="hover:underline text-[#00c4b6]">
                  {contact.account.name}
                </Link>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/crm/contacts/${contact.id}/edit`}
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
          
          {/* Contact Details Card */}
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 space-y-4">
            <div className="flex items-center gap-3 border-b border-[#1c212a]/30 pb-3 mb-2">
              <Info className="size-4.5 text-[#00c4b6]" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">Contact Profile Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Full Name</span>
                <span className="text-white font-medium">{contactName}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Linked Company</span>
                <span className="text-white font-medium">
                  {contact.account ? (
                    <Link href={`/crm/accounts/${contact.account.id}`} className="hover:underline text-[#00c4b6] font-bold">
                      {contact.account.name}
                    </Link>
                  ) : (
                    "Not Specified"
                  )}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Email</span>
                <span className="text-white font-medium">{contact.email || "Not Specified"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Designation</span>
                <span className="text-white font-medium">{contact.designation || "Not Specified"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Department</span>
                <span className="text-white font-medium">{contact.department || "Not Specified"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Direct Line</span>
                <span className="text-white font-medium">{contact.phone || "Not Specified"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Mobile Number</span>
                <span className="text-white font-medium">{contact.mobile || "Not Specified"}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Contact Owner</span>
                <span className="text-white font-medium">{contact.owner.name}</span>
              </div>
              <div className="md:col-span-2 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Office Address</span>
                <span className="text-white font-medium">{contact.address || "Not Specified"}</span>
              </div>
            </div>
          </div>

          {/* Description Section */}
          {contact.description && (
            <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/50 space-y-3">
              <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider border-b border-[#1c212a]/30 pb-2">Internal Profile Notes</h3>
              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                {contact.description}
              </p>
            </div>
          )}

        </div>

        {/* Right Column: Related Lists & Timeline Activities */}
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
                    <span className="font-bold text-white block uppercase tracking-wider">Contact Status</span>
                    <p className="text-slate-400 leading-relaxed font-medium">
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
