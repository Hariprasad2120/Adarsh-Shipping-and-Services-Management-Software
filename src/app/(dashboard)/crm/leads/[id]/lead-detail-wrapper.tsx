"use client";

import {
  CrmButton,
  CrmInput,
  CrmTabs,
  CrmTextarea,
} from "@/modules/crm/components/workspace/crm-workspace";

import { NativeSelect } from "@/components/ui/native-select";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  deleteLeadAction,
  updateLeadStatusAction,
  logWorkTimeAction,
  deleteWorkTimeAction,
  getCallAttemptsAction,
} from "@/modules/crm/actions";
import { ConvertModal } from "./convert-modal";
import { RemarksModal } from "./remarks-modal";
import { InterestedModal } from "./interested-modal";
import { FollowUpModal } from "./follow-up-modal";
import { NotesPanel } from "@/modules/crm/components/records/notes-panel";
import { AttachmentsPanel } from "@/modules/crm/components/records/attachments-panel";
import { ActivitiesPanel } from "@/modules/crm/components/records/activities-panel";
import { TimelinePanel } from "@/modules/crm/components/records/timeline-panel";
import { ServiceRateWorkflowPanel } from "@/modules/crm/components/service-enquiries/service-rate-workflow-panel";
import {
  Edit2,
  RefreshCcw,
  Trash2,
  MapPin,
  Info,
  Ship,
  Plane,
  Clock,
  Timer,
  History,
  TrendingUp,
  Plus,
} from "lucide-react";

interface LeadDetailWrapperProps {
  lead: any;
  notes: any[];
  attachments: any[];
  activities: any[];
  timeline: any[];
  workTimeLogs?: any[];
  quotes?: any[];
  calls?: any[];
  isManagerOrAdmin?: boolean;
}

export function LeadDetailWrapper({
  lead,
  notes,
  attachments,
  activities,
  timeline,
  workTimeLogs = [],
  quotes = [],
  calls = [],
  isManagerOrAdmin = false,
}: LeadDetailWrapperProps) {
  const router = useRouter();
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showInterestedModal, setShowInterestedModal] = useState(false);
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpStatus, setFollowUpStatus] = useState<
    "NOT_PICKED" | "NOT_REACHABLE" | null
  >(null);
  const [activeTab, setActiveTab] = useState<
    | "OVERVIEW"
    | "NOTES"
    | "ACTIVITIES"
    | "ATTACHMENTS"
    | "TIMELINE"
    | "TIME_TRACKER"
    | "CALLS"
  >("OVERVIEW");

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

  const leadName = `${lead.firstName || ""} ${lead.lastName}`.trim();
  const creator = lead.createdBy ?? lead.owner;
  const creatorName = creator?.name || "Unknown user";
  const creatorEmail = creator?.email || "Not Specified";
  const creatorDesignation = creator?.designation || "Not Specified";
  const creatorPhone = creator?.personalPhone || "Not Specified";
  const creatorOrganisation = creator?.org?.name || "Not Specified";
  const creatorEmployeeId =
    creator?.employeeNumber !== null && creator?.employeeNumber !== undefined
      ? String(creator.employeeNumber)
      : "Not Specified";

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ─── SPLIT VIEW LAYOUT ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Business Card & Structured Fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* 3D Call Action & Operations Panel */}
          <div className="p-6 rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)] mnx-shadow-panel transition-all duration-200 mnx-crm-panel-surface">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(260px,1fr)]">
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-[var(--mnx-accent)] uppercase tracking-widest block font-sans">
                  Call Action / Lead Status
                </span>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <CrmButton
                  onClick={() => setShowInterestedModal(true)}
                  className={`w-full justify-center px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 cursor-pointer ${
                    lead.status === "INTERESTED"
                      ? "bg-[var(--mnx-accent)] text-[var(--mnx-text-strong)] border-[var(--mnx-accent)] shadow-none translate-y-[2px] translate-x-[2px]"
                      : "bg-[var(--mnx-surface)] text-[var(--mnx-accent)] border-[var(--mnx-accent)]/40 hover:border-[var(--mnx-accent)] mnx-shadow-panel hover:translate-y-[-1px] hover:translate-x-[-1px]  active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
                  }`}
                >
                  Interested
                </CrmButton>
                <CrmButton
                  onClick={() => setShowRemarksModal(true)}
                  className={`w-full justify-center px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 cursor-pointer ${
                    lead.status === "NOT_INTERESTED"
                      ? "bg-[var(--mnx-danger-bg)] text-[var(--mnx-text-strong)] border-[var(--mnx-danger)] shadow-none translate-y-[2px] translate-x-[2px]"
                      : "bg-[var(--mnx-surface)] text-[var(--mnx-danger)] border-[var(--mnx-danger)] hover:border-[var(--mnx-danger)] mnx-shadow-panel hover:translate-y-[-1px] hover:translate-x-[-1px]  active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
                  }`}
                >
                  Not Interested
                </CrmButton>
                <CrmButton
                  onClick={() => {
                    setFollowUpStatus("NOT_PICKED");
                    setShowFollowUpModal(true);
                  }}
                  className={`w-full justify-center px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 cursor-pointer ${
                    lead.status === "NOT_PICKED"
                      ? "bg-[var(--mnx-accent)] text-[var(--mnx-text-strong)] border-[var(--mnx-accent)] shadow-none translate-y-[2px] translate-x-[2px]"
                      : "bg-[var(--mnx-surface)] text-[var(--mnx-accent)] border-[var(--mnx-accent)]/40 hover:border-[var(--mnx-accent)]/80 mnx-shadow-panel hover:translate-y-[-1px] hover:translate-x-[-1px]  active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
                  }`}
                >
                  Not Picked
                </CrmButton>
                <CrmButton
                  onClick={() => {
                    setFollowUpStatus("NOT_REACHABLE");
                    setShowFollowUpModal(true);
                  }}
                  className={`w-full justify-center px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 cursor-pointer ${
                    lead.status === "NOT_REACHABLE"
                      ? "bg-[var(--mnx-accent)] text-[var(--mnx-text-strong)] border-[var(--mnx-accent)] shadow-none translate-y-[2px] translate-x-[2px]"
                      : "bg-[var(--mnx-surface)] text-[var(--mnx-accent)] border-[var(--mnx-accent)]/40 hover:border-[var(--mnx-accent)]/80 mnx-shadow-panel hover:translate-y-[-1px] hover:translate-x-[-1px]  active:translate-y-[2px] active:translate-x-[2px] active:shadow-none"
                  }`}
                >
                  Not Reachable
                </CrmButton>
                </div>
              </div>
              <div className="space-y-3 rounded-xl border border-[var(--mnx-border)]/50 bg-[var(--mnx-surface)]/35 p-4">
                <span className="text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-widest block font-sans">
                  Operations
                </span>
                <div className="grid gap-3">
                <CrmButton
                  onClick={() => setShowConvertModal(true)}
                  className="flex w-full items-center justify-center gap-2 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] text-[var(--mnx-text-strong)] px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 border-[var(--mnx-accent)] mnx-shadow-panel hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none cursor-pointer"
                >
                  <RefreshCcw className="size-3.5" />
                  <span>Convert Lead</span>
                </CrmButton>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Link
                      href={`/crm/leads/${lead.id}/edit`}
                      className="flex items-center justify-center gap-2 bg-[var(--mnx-surface)] hover:bg-[var(--mnx-text-muted)] border-2 border-[var(--mnx-border)] text-[var(--mnx-muted)] px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all mnx-shadow-panel hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none cursor-pointer"
                    >
                      <Edit2 className="size-3.5" />
                      <span>Edit</span>
                    </Link>
                    <CrmButton
                      onClick={handleDelete}
                      className="flex items-center justify-center gap-2 bg-[var(--mnx-surface)] hover:bg-[var(--mnx-danger-bg)] border-2 border-[var(--mnx-danger)] text-[var(--mnx-danger)] hover:text-[var(--mnx-danger)] hover:border-[var(--mnx-danger)] px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all mnx-shadow-panel hover:translate-y-[-1px] hover:translate-x-[-1px] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                      <span>Delete</span>
                    </CrmButton>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Business Card Section */}
          <div className="p-6 rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 space-y-4">
            <div className="flex items-center gap-3 border-b border-[var(--mnx-border)]/30 pb-3 mb-2">
              <Info className="size-4.5 text-[var(--mnx-accent)]" />
              <h3 className="font-bold text-sm text-[var(--mnx-text-strong)] uppercase tracking-wider">
                Business Card Details
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                  Created By
                </span>
                <span className="text-[var(--mnx-text-strong)] font-medium">
                  {creatorName}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                  Employee ID
                </span>
                <span className="text-[var(--mnx-text-strong)] font-medium">
                  {creatorEmployeeId}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                  Email
                </span>
                <span className="text-[var(--mnx-text-strong)] font-medium">
                  {creatorEmail}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                  Designation
                </span>
                <span className="text-[var(--mnx-text-strong)] font-medium">
                  {creatorDesignation}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                  Organisation
                </span>
                <span className="text-[var(--mnx-text-strong)] font-medium">
                  {creatorOrganisation}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                  Mobile
                </span>
                <span className="text-[var(--mnx-text-strong)] font-medium">
                  {creatorPhone}
                </span>
              </div>
            </div>
          </div>

          {/* Enquiry & Rates Worksheet Card */}
          {lead.status === "INTERESTED" && lead.enquiryDetails && (
            <div className="p-6 rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/40 space-y-6">
              <div className="flex items-center justify-between border-b border-[var(--mnx-border)]/30 pb-3 mb-2">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)] flex items-center justify-center font-bold text-sm">
                    {lead.enquiryDetails.type === "Sea" ? (
                      <Ship className="size-4.5" />
                    ) : (
                      <Plane className="size-4.5" />
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-[var(--mnx-text-strong)] uppercase tracking-wider">
                    Customer Enquiry Details ({lead.enquiryDetails.type})
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)] border border-[var(--mnx-accent)]/10">
                  Active Enquiry
                </span>
              </div>

              {lead.enquiryDetails.type === "Sea" ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm text-[var(--mnx-muted)]">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Sea Type
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-medium">
                      {lead.enquiryDetails.seaType} (
                      {lead.enquiryDetails.seaLclFcl})
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                      POL
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-medium">
                      {lead.enquiryDetails.pol}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                      POD
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-medium">
                      {lead.enquiryDetails.pod}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Commodity
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-medium">
                      {lead.enquiryDetails.commodity}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Weight
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-medium">
                      {lead.enquiryDetails.weight}
                    </span>
                  </div>
                  {lead.enquiryDetails.seaLclFcl === "LCL" ? (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                        Volume
                      </span>
                      <span className="text-[var(--mnx-text-strong)] font-medium">
                        {lead.enquiryDetails.cbm} CBM
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                        Dimensions / Container
                      </span>
                      <span className="text-[var(--mnx-text-strong)] font-medium">
                        {lead.enquiryDetails.containerType}
                      </span>
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Packages / Containers
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-medium">
                      {lead.enquiryDetails.containerCount}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Incoterm
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-medium">
                      {lead.enquiryDetails.incoterm}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Planning
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-medium">
                      {lead.enquiryDetails.shipmentPlanning}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Purpose
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-medium">
                      {lead.enquiryDetails.purpose}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Client Name
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-medium">
                      {lead.enquiryDetails.clientName}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Location
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-medium">
                      {lead.enquiryDetails.location}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-sm text-[var(--mnx-muted)]">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                      AOL
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-medium">
                      {lead.enquiryDetails.aol}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                      AOD
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-medium">
                      {lead.enquiryDetails.aod}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Commodity
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-medium">
                      {lead.enquiryDetails.commodity}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Weight
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-medium">
                      {lead.enquiryDetails.weight}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Dimensions
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-medium">
                      {lead.enquiryDetails.dimensions}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Packages
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-medium">
                      {lead.enquiryDetails.packages}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Incoterm
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-medium">
                      {lead.enquiryDetails.incoterm}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Planning
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-medium">
                      {lead.enquiryDetails.shipmentPlanning}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Purpose
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-medium">
                      {lead.enquiryDetails.purpose}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Client Name
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-medium">
                      {lead.enquiryDetails.clientName}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Location
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-medium">
                      {lead.enquiryDetails.location}
                    </span>
                  </div>
                </div>
              )}

              {/* Rates worksheet section */}
              <div className="pt-4 border-t border-[var(--mnx-border)]/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                    Rates Worksheet (In-call rates & calculations)
                  </span>
                  {lead.enquiryDetails.seaType === "Import" &&
                    lead.enquiryDetails.seaLclFcl === "LCL" && (
                      <span className="text-[10px] font-bold text-[var(--mnx-accent)] uppercase tracking-wide bg-[var(--mnx-accent)]/5 px-2 py-0.5 rounded border border-[var(--mnx-accent)]/15">
                        Auto-Calculated Import LCL Rule Active
                      </span>
                    )}
                </div>

                <ServiceRateWorkflowPanel lead={lead} />
              </div>
            </div>
          )}

          {/* Justdial Original Enquiry Section */}
          {lead.crmExternalLead && (
            <div className="p-6 rounded-xl bg-gradient-to-br from-[var(--mnx-surface)] to-[var(--mnx-text-muted)] border border-[var(--mnx-warning)] shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--mnx-border)]/30 pb-3 mb-2">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] flex items-center justify-center font-black text-sm">
                    JD
                  </div>
                  <h3 className="font-bold text-sm text-[var(--mnx-text-strong)] uppercase tracking-wider">
                    Justdial Original Enquiry
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] border border-[var(--mnx-warning)]">
                  Imported Inbound
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                    Customer Name
                  </span>
                  <span className="text-[var(--mnx-text-strong)] font-medium">
                    {lead.crmExternalLead.customerName}
                  </span>
                </div>
                {lead.crmExternalLead.rawPayload &&
                  typeof lead.crmExternalLead.rawPayload === "object" &&
                  (lead.crmExternalLead.rawPayload as any).intentScore && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                        Intent Score
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          (lead.crmExternalLead.rawPayload as any).intentScore
                            .toLowerCase()
                            .includes("very high")
                            ? "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)] border border-[var(--mnx-danger)] animate-pulse"
                            : (
                                  lead.crmExternalLead.rawPayload as any
                                ).intentScore
                                  .toLowerCase()
                                  .includes("high")
                              ? "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] border border-[var(--mnx-warning)]"
                              : "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] border border-[var(--mnx-warning)]"
                        }`}
                      >
                        🔥{" "}
                        {(lead.crmExternalLead.rawPayload as any).intentScore}
                      </span>
                    </div>
                  )}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                    Mobile Number
                  </span>
                  <span className="text-[var(--mnx-text-strong)] font-medium">
                    {lead.crmExternalLead.mobileNumber}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                    City / Location
                  </span>
                  <span className="text-[var(--mnx-text-strong)] font-medium">
                    {lead.crmExternalLead.city || "Not provided"}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                    Category / Query
                  </span>
                  <span className="text-[var(--mnx-text-strong)] font-medium">
                    {lead.crmExternalLead.category || "Not provided"}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                    Enquiry Source
                  </span>
                  <span className="text-[var(--mnx-text-strong)] font-medium">
                    {lead.crmExternalLead.enquirySource ||
                      "Justdial Web Dashboard"}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                    Original Status
                  </span>
                  <span className="text-[var(--mnx-text-strong)] font-medium">
                    {lead.crmExternalLead.enquiryStatus || "N/A"} (
                    {lead.crmExternalLead.jdLeadStatus || "N/A"})
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                    Enquiry Time
                  </span>
                  <span className="text-[var(--mnx-text-strong)] font-medium">
                    {lead.crmExternalLead.enquiryDateTime
                      ? new Date(
                          lead.crmExternalLead.enquiryDateTime,
                        ).toLocaleString("en-IN")
                      : "N/A"}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                    Imported At
                  </span>
                  <span className="text-[var(--mnx-text-strong)] font-medium">
                    {new Date(lead.crmExternalLead.importedAt).toLocaleString(
                      "en-IN",
                    )}
                  </span>
                </div>

                {/* Collapsible raw data payload */}
                <div className="md:col-span-2 pt-2">
                  <details className="group border border-[var(--mnx-border)]/30 rounded-lg p-3 bg-[var(--mnx-surface)]/40">
                    <summary className="text-[10px] font-bold uppercase tracking-wider text-[var(--mnx-muted)] cursor-pointer list-none flex items-center justify-between select-none">
                      <span>View Raw Snapshot Payload</span>
                      <span className="text-[var(--mnx-accent)] group-open:hidden">
                        + Expand
                      </span>
                      <span className="text-[var(--mnx-muted)] hidden group-open:inline">
                        - Collapse
                      </span>
                    </summary>
                    <div className="mt-3 text-[10px] font-mono text-[var(--mnx-muted)] bg-[var(--mnx-overlay)] p-2 rounded max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed border border-[var(--mnx-border)]/20">
                      {JSON.stringify(lead.crmExternalLead.rawPayload, null, 2)}
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}

          {/* Address & Tags Section */}
          <div className="p-6 rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 space-y-4">
            <div className="flex items-center gap-3 border-b border-[var(--mnx-border)]/30 pb-3 mb-2">
              <MapPin className="size-4.5 text-[var(--mnx-accent)]" />
              <h3 className="font-bold text-sm text-[var(--mnx-text-strong)] uppercase tracking-wider">
                Address & Tags
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div className="md:col-span-2 space-y-1">
                <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                  Street Address
                </span>
                <span className="text-[var(--mnx-text-strong)] font-medium block">
                  {lead.address || "Not Specified"}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                  City & State
                </span>
                <span className="text-[var(--mnx-text-strong)] font-medium">
                  {lead.city || ""}
                  {lead.city && lead.state ? ", " : ""}
                  {lead.state || "Not Specified"}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                  Pincode & Country
                </span>
                <span className="text-[var(--mnx-text-strong)] font-medium">
                  {lead.pincode || ""}
                  {lead.pincode && lead.country ? ", " : ""}
                  {lead.country || "Not Specified"}
                </span>
              </div>
              <div className="md:col-span-2 space-y-2">
                <span className="text-[11px] font-bold text-[var(--mnx-muted)] uppercase tracking-wider block">
                  Record Tags
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {lead.tags && lead.tags.length > 0 ? (
                    lead.tags.map((tg: string) => (
                      <span
                        key={tg}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--mnx-surface)] text-[var(--mnx-accent)] border border-[var(--mnx-border)]"
                      >
                        {tg}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[var(--mnx-muted)] italic">
                      No tags associated
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="p-6 rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50 space-y-3">
            <h3 className="font-bold text-xs text-[var(--mnx-muted)] uppercase tracking-wider border-b border-[var(--mnx-border)]/30 pb-2">
              Description / Enquiry Details
            </h3>
            <p className="text-sm text-[var(--mnx-muted)] whitespace-pre-wrap leading-relaxed">
              {lead.description || "No description logged for this lead."}
            </p>
          </div>
        </div>

        {/* Right Column: Related Lists & Timeline Activities */}
        <div className="space-y-6">
          {/* Tabs Navigation Card */}
          <div className="p-6 rounded-xl bg-[var(--mnx-card)] border border-[var(--mnx-border)]/50 space-y-6">
            {/* Horizontal Tabs Selection */}
            <CrmTabs className="flex-wrap overflow-visible rounded-none border-x-0 border-t-0 bg-transparent p-0 pb-3">
              <CrmButton
                onClick={() => setActiveTab("OVERVIEW")}
                variant={activeTab === "OVERVIEW" ? "primary" : "secondary"}
                size="compact"
                className="shrink-0 font-normal"
              >
                Summary
              </CrmButton>
              <CrmButton
                onClick={() => setActiveTab("NOTES")}
                variant={activeTab === "NOTES" ? "primary" : "secondary"}
                size="compact"
                className="shrink-0 font-normal"
              >
                Notes ({notes.length})
              </CrmButton>
              <CrmButton
                onClick={() => setActiveTab("ACTIVITIES")}
                variant={activeTab === "ACTIVITIES" ? "primary" : "secondary"}
                size="compact"
                className="shrink-0 font-normal"
              >
                Tasks ({activities.length})
              </CrmButton>
              <CrmButton
                onClick={() => setActiveTab("ATTACHMENTS")}
                variant={activeTab === "ATTACHMENTS" ? "primary" : "secondary"}
                size="compact"
                className="shrink-0 font-normal"
              >
                Files ({attachments.length})
              </CrmButton>
              <CrmButton
                onClick={() => setActiveTab("TIMELINE")}
                variant={activeTab === "TIMELINE" ? "primary" : "secondary"}
                size="compact"
                className="shrink-0 font-normal"
              >
                Audit
              </CrmButton>
              <CrmButton
                onClick={() => setActiveTab("TIME_TRACKER")}
                variant={activeTab === "TIME_TRACKER" ? "primary" : "secondary"}
                size="compact"
                className="shrink-0 font-normal"
              >
                Time Tracker ({workTimeLogs.length})
              </CrmButton>
              <CrmButton
                onClick={() => setActiveTab("CALLS")}
                variant={activeTab === "CALLS" ? "primary" : "secondary"}
                size="compact"
                className="shrink-0 font-normal"
              >
                Calls ({calls.length})
              </CrmButton>
            </CrmTabs>

            {/* Tab Rendering Content */}
            <div className="space-y-4">
              {activeTab === "OVERVIEW" && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-[var(--mnx-surface)]/60 rounded-lg space-y-2 border border-[var(--mnx-border)]/30">
                    <span className="font-bold text-[var(--mnx-text-strong)] block uppercase tracking-wider">
                      Lead Summary
                    </span>
                    <p className="text-[var(--mnx-muted)] leading-relaxed">
                      This lead was logged on{" "}
                      {new Date(lead.createdAt).toLocaleDateString("en-IN")}. If
                      this contact has been fully qualified, convert this record
                      using the Convert Lead button in the top action panel.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[var(--mnx-muted)]">
                    <div>
                      <span className="font-semibold text-[var(--mnx-muted)] block uppercase text-[10px]">
                        Created By
                      </span>
                      <span className="text-[var(--mnx-muted)]">
                        {lead.createdBy?.name ||
                          lead.createdBy?.email ||
                          (lead.createdById ? "Unknown user" : "Unknown")}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-[var(--mnx-muted)] block uppercase text-[10px]">
                        Updated At
                      </span>
                      <span className="text-[var(--mnx-muted)]">
                        {new Date(lead.updatedAt).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "NOTES" && (
                <NotesPanel
                  relatedToType="LEAD"
                  relatedToId={lead.id}
                  initialNotes={notes}
                />
              )}

              {activeTab === "ACTIVITIES" && (
                <ActivitiesPanel
                  relatedToType="LEAD"
                  relatedToId={lead.id}
                  initialActivities={activities}
                />
              )}

              {activeTab === "ATTACHMENTS" && (
                <AttachmentsPanel
                  relatedToType="LEAD"
                  relatedToId={lead.id}
                  initialAttachments={attachments}
                />
              )}

              {activeTab === "TIMELINE" && <TimelinePanel events={timeline} />}

              {activeTab === "TIME_TRACKER" && (
                <TimeTrackerPanel
                  lead={lead}
                  workTimeLogs={workTimeLogs}
                  quotes={quotes}
                  timeline={timeline}
                />
              )}

              {activeTab === "CALLS" && (
                <CallsPanel
                  calls={calls}
                  isManagerOrAdmin={isManagerOrAdmin}
                  leadId={lead.id}
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

function TimeTrackerPanel({
  lead,
  workTimeLogs,
  quotes,
  timeline,
}: {
  lead: any;
  workTimeLogs: any[];
  quotes: any[];
  timeline: any[];
}) {
  const router = useRouter();
  const [activityType, setActivityType] = useState("LEAD_PROCESSING");
  const [durationHours, setDurationHours] = useState("1.0");
  const [description, setDescription] = useState("");
  const [loggedAt, setLoggedAt] = useState(
    new Date().toISOString().slice(0, 16),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const firstResponseEvent = [...timeline]
    .reverse()
    .find(
      (e) => e.eventType !== "LEAD_CREATED" && e.eventType !== "LEAD_IMPORT",
    );
  let responseDurationStr = "Pending Contact";
  if (firstResponseEvent) {
    const ms =
      new Date(firstResponseEvent.createdAt).getTime() -
      new Date(lead.createdAt).getTime();
    const hours = ms / 3600000;
    responseDurationStr =
      hours < 1 ? `${Math.round(hours * 60)} mins` : `${hours.toFixed(1)} hrs`;
  }

  let conversionDurationStr = "Unconverted";
  if (lead.isConverted && lead.convertedAt) {
    const ms =
      new Date(lead.convertedAt).getTime() - new Date(lead.createdAt).getTime();
    const days = ms / 86400000;
    conversionDurationStr =
      days < 1 ? `${(days * 24).toFixed(1)} hrs` : `${days.toFixed(1)} days`;
  }

  let quotePrepDurationStr = "No Quotes Yet";
  const firstQuote = quotes.length > 0 ? quotes[quotes.length - 1] : null;
  if (lead.isConverted && lead.convertedAt && firstQuote) {
    const ms =
      new Date(firstQuote.createdAt || firstQuote.date).getTime() -
      new Date(lead.convertedAt).getTime();
    const days = ms / 86400000;
    quotePrepDurationStr =
      days < 1 ? `${(days * 24).toFixed(1)} hrs` : `${days.toFixed(1)} days`;
  }

  let submissionDurationStr = "Not Submitted";
  const submittedQuote = quotes.find((q) => q.submittedAt);
  if (firstQuote && submittedQuote && submittedQuote.submittedAt) {
    const ms =
      new Date(submittedQuote.submittedAt).getTime() -
      new Date(firstQuote.createdAt || firstQuote.date).getTime();
    const days = ms / 86400000;
    submissionDurationStr =
      days < 1 ? `${(days * 24).toFixed(1)} hrs` : `${days.toFixed(1)} days`;
  }

  const totalLoggedHours = workTimeLogs.reduce(
    (sum, log) => sum + (log.durationHours || 0),
    0,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityType) return toast.error("Please select an activity type");
    const hours = parseFloat(durationHours);
    if (isNaN(hours) || hours <= 0)
      return toast.error("Please enter a valid duration greater than 0");

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
    <div className="space-y-6 text-[var(--mnx-muted)]">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[var(--mnx-surface)]/50 border border-[var(--mnx-border)]/50 rounded-xl space-y-1.5 mnx-crm-hover transition-all">
          <span className="text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide flex items-center gap-1.5">
            <Timer className="size-3.5 text-[var(--mnx-accent)]" />
            Response Time
          </span>
          <div className="text-lg font-black text-[var(--mnx-text-strong)]">
            {responseDurationStr}
          </div>
          <span className="text-[9px] text-[var(--mnx-muted)] block truncate">
            Capture to first response
          </span>
        </div>
        <div className="p-4 bg-[var(--mnx-surface)]/50 border border-[var(--mnx-border)]/50 rounded-xl space-y-1.5 mnx-crm-hover transition-all">
          <span className="text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide flex items-center gap-1.5">
            <TrendingUp className="size-3.5 text-[var(--mnx-accent)]" />
            Conversion Time
          </span>
          <div className="text-lg font-black text-[var(--mnx-text-strong)]">
            {conversionDurationStr}
          </div>
          <span className="text-[9px] text-[var(--mnx-muted)] block truncate">
            Capture to account conversion
          </span>
        </div>
        <div className="p-4 bg-[var(--mnx-surface)]/50 border border-[var(--mnx-border)]/50 rounded-xl space-y-1.5 mnx-crm-hover transition-all">
          <span className="text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="size-3.5 text-[var(--mnx-accent)]" />
            Quote Prep Time
          </span>
          <div className="text-lg font-black text-[var(--mnx-text-strong)]">
            {quotePrepDurationStr}
          </div>
          <span className="text-[9px] text-[var(--mnx-muted)] block truncate">
            Conversion to first quote draft
          </span>
        </div>
        <div className="p-4 bg-[var(--mnx-surface)]/50 border border-[var(--mnx-border)]/50 rounded-xl space-y-1.5 mnx-crm-hover transition-all">
          <span className="text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="size-3.5 text-[var(--mnx-accent)]" />
            Submission SLA
          </span>
          <div className="text-lg font-black text-[var(--mnx-text-strong)]">
            {submissionDurationStr}
          </div>
          <span className="text-[9px] text-[var(--mnx-muted)] block truncate">
            Quote creation to submit approval
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 p-5 bg-[var(--mnx-surface)]/30 border border-[var(--mnx-border)]/40 rounded-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--mnx-border)]/30 pb-2.5">
            <Plus className="size-4 text-[var(--mnx-accent)]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--mnx-text-strong)]">
              Log Work Hours
            </h4>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                Activity Type *
              </label>
              <NativeSelect
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)]"
              >
                {Object.entries(activityLabels).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                  Duration (Hours) *
                </label>
                <CrmInput
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                  Work Date *
                </label>
                <CrmInput
                  type="datetime-local"
                  value={loggedAt}
                  onChange={(e) => setLoggedAt(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                Description / Notes
              </label>
              <CrmTextarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What details did you gather or process?"
                rows={3}
                className="w-full p-2.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
              />
            </div>

            <CrmButton
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] disabled:opacity-50 text-[var(--mnx-text-strong)] rounded-lg text-xs font-bold transition-all cursor-pointer mnx-shadow-panel"
            >
              <span>{isSubmitting ? "Logging Hours..." : "Log Work Time"}</span>
            </CrmButton>
          </form>
        </div>

        <div className="xl:col-span-2 p-5 bg-[var(--mnx-surface)]/30 border border-[var(--mnx-border)]/40 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--mnx-border)]/30 pb-2.5">
            <div className="flex items-center gap-2">
              <History className="size-4 text-[var(--mnx-accent)]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--mnx-text-strong)]">
                Work Time Logs History
              </h4>
            </div>
            <span className="text-[10px] font-bold text-[var(--mnx-accent)] uppercase bg-[var(--mnx-accent)]/10 px-2 py-0.5 rounded border border-[var(--mnx-accent)]/10">
              Total: {totalLoggedHours.toFixed(1)} hours
            </span>
          </div>

          {workTimeLogs.length === 0 ? (
            <div className="p-8 text-center text-[var(--mnx-muted)] text-xs italic">
              No time logs recorded for this client yet.
            </div>
          ) : (
            <div className="max-h-[350px] overflow-y-auto space-y-3 pr-1.5 scrollbar-thin scrollbar-thumb-[var(--mnx-border)]">
              {workTimeLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-[var(--mnx-surface)]/60 border border-[var(--mnx-border)]/30 rounded-lg flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[var(--mnx-text-strong)] uppercase text-[10px] bg-[var(--mnx-surface)] border border-[var(--mnx-border)] px-2 py-0.5 rounded">
                        {activityLabels[log.activityType] || log.activityType}
                      </span>
                      <span className="text-[var(--mnx-accent)] font-black">
                        {log.durationHours} hr
                        {log.durationHours === 1 ? "" : "s"}
                      </span>
                      <span className="text-[var(--mnx-muted)] font-semibold">•</span>
                      <span className="text-[var(--mnx-muted)] font-medium">
                        {log.user.name}
                      </span>
                    </div>
                    {log.description && (
                      <p className="text-[var(--mnx-muted)] leading-normal font-normal pl-0.5">
                        {log.description}
                      </p>
                    )}
                    <div className="text-[9px] text-[var(--mnx-muted)] font-medium pl-0.5">
                      Performed:{" "}
                      {new Date(log.loggedAt).toLocaleString("en-IN")}
                    </div>
                  </div>
                  <CrmButton
                    onClick={() => handleDeleteLog(log.id)}
                    disabled={isDeleting === log.id}
                    className="p-1 bg-[var(--mnx-surface)]/60 hover:bg-[var(--mnx-danger-bg)] hover:text-[var(--mnx-danger)] border border-[var(--mnx-border)] text-[var(--mnx-muted)] rounded cursor-pointer transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </CrmButton>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CALLS & RECORDINGS PANEL ───────────────────────────────────────────────────

import { useEffect } from "react";

function CallsPanel({
  calls = [],
  isManagerOrAdmin = false,
  leadId,
}: {
  calls: any[];
  isManagerOrAdmin: boolean;
  leadId: string;
}) {
  const [selectedCallId, setSelectedCallId] = useState<string | null>(
    calls[0]?.id || null,
  );
  const [subTab, setSubTab] = useState<"TRANSCRIPT" | "SUMMARY" | "REVIEW">(
    "TRANSCRIPT",
  );
  const [rating, setRating] = useState<number>(5);
  const [comments, setComments] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [localCalls, setLocalCalls] = useState(calls);

  useEffect(() => {
    setLocalCalls(calls);
    if (calls.length > 0 && !selectedCallId) {
      setSelectedCallId(calls[0].id);
    }
  }, [calls]);

  useEffect(() => {
    const hasUploading = localCalls.some((c: any) =>
      c.recordings?.some((r: any) => r.uploadStatus === "UPLOADING"),
    );

    const intervalTime = hasUploading ? 3000 : 10000;

    const interval = setInterval(async () => {
      const res = await getCallAttemptsAction(leadId);
      if (res.ok && res.data) {
        setLocalCalls(res.data);
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [localCalls, leadId]);

  const selectedCall = localCalls.find((c) => c.id === selectedCallId);
  const recording = selectedCall?.recordings?.[0];
  const transcript = recording?.transcript;

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recording) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/crm/recordings/${recording.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comments }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit review");

      toast.success("Call quality review logged successfully!");

      // Update local state to show review immediately
      setLocalCalls((prevCalls) =>
        prevCalls.map((c) => {
          if (c.id === selectedCall.id) {
            const reviews = c.recordings[0].reviews || [];
            const newReview = {
              id: data.review.id,
              rating,
              comments,
              createdAt: new Date().toISOString(),
              reviewer: { name: "You" },
            };
            return {
              ...c,
              recordings: [
                {
                  ...c.recordings[0],
                  reviews: [newReview, ...reviews],
                },
              ],
            };
          }
          return c;
        }),
      );
      setComments("");
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  if (calls.length === 0) {
    return (
      <div className="p-8 text-center text-[var(--mnx-muted)] text-xs italic">
        No call attempts tracked for this client yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-[var(--mnx-muted)]">
      {/* Calls List */}
      <div className="space-y-3 md:col-span-1 border-r border-[var(--mnx-border)]/30 pr-0 md:pr-4 max-h-[500px] overflow-y-auto">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--mnx-muted)] mb-2">
          Call Log History
        </h4>
        {localCalls.map((call) => {
          const hasRecording = call.recordings && call.recordings.length > 0;
          const rec = call.recordings?.[0];
          const quality = rec?.transcript?.qualityScore;

          return (
            <div
              key={call.id}
              onClick={() => setSelectedCallId(call.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedCallId === call.id
                  ? "bg-[var(--mnx-surface)] border-[var(--mnx-accent)]/70 mnx-shadow-panel"
                  : "bg-[var(--mnx-surface)]/50 border-[var(--mnx-border)]/55 hover:border-[var(--mnx-border)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--mnx-muted)]">
                  {call.salesperson?.name || "Agent"}
                </span>
                {hasRecording && quality && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[8px] font-black tracking-wider ${
                      quality >= 80
                        ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)] border border-[var(--mnx-success)]"
                        : "bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)] border border-[var(--mnx-accent)]/20"
                    }`}
                  >
                    AI {quality}%
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[var(--mnx-muted)] mt-1">
                {new Date(call.callStartedAt).toLocaleString("en-IN")}
              </p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--mnx-border)]/30">
                <span className="text-[9px] uppercase tracking-wider font-semibold text-[var(--mnx-muted)]">
                  {call.durationSeconds
                    ? `${Math.floor(call.durationSeconds / 60)}m ${call.durationSeconds % 60}s`
                    : "Pending"}
                </span>
                <span
                  className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    call.status === "COMPLETED" ||
                    rec?.uploadStatus === "UPLOADED"
                      ? "text-[var(--mnx-success)]"
                      : rec?.uploadStatus === "UPLOADING"
                        ? "text-[var(--mnx-accent)]"
                        : rec?.uploadStatus === "CANCELLED"
                          ? "text-[var(--mnx-warning)]"
                          : rec?.uploadStatus === "FAILED"
                            ? "text-[var(--mnx-danger)]"
                            : "text-[var(--mnx-warning)]"
                  }`}
                >
                  {rec?.uploadStatus === "UPLOADED"
                    ? "COMPLETED"
                    : rec?.uploadStatus === "UPLOADING"
                      ? "UPLOADING"
                      : rec?.uploadStatus === "CANCELLED"
                        ? "CANCELLED"
                        : rec?.uploadStatus === "FAILED"
                          ? "FAILED"
                          : call.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Call Details / Analytics Panel */}
      <div className="md:col-span-2 space-y-4">
        {selectedCall ? (
          <>
            <div className="p-4 bg-[var(--mnx-surface)]/60 rounded-xl border border-[var(--mnx-border)]/55 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-bold text-[var(--mnx-text-strong)] uppercase tracking-wide">
                    Call Details
                  </h4>
                  <p className="text-[var(--mnx-muted)] text-[10px] mt-0.5">
                    ID: <span className="font-mono">{selectedCall.id}</span> •
                    Customer Number:{" "}
                    <span className="font-mono">
                      {selectedCall.customerPhone}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase block text-[var(--mnx-muted)]">
                    Duration
                  </span>
                  <span className="text-[var(--mnx-muted)] font-bold">
                    {selectedCall.durationSeconds
                      ? `${selectedCall.durationSeconds} seconds`
                      : "N/A"}
                  </span>
                </div>
              </div>

              {/* Audio Playback Section */}
              {recording ? (
                <div className="p-3 bg-[var(--mnx-surface)] rounded-lg border border-[var(--mnx-border)]/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--mnx-text-strong)] uppercase text-[10px] tracking-wide flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          recording.uploadStatus === "UPLOADED"
                            ? "bg-[var(--mnx-success-bg)]"
                            : recording.uploadStatus === "UPLOADING"
                              ? "bg-[var(--mnx-accent)] animate-pulse"
                              : recording.uploadStatus === "CANCELLED"
                                ? "bg-[var(--mnx-warning-bg)]"
                                : "bg-[var(--mnx-danger-bg)]"
                        }`}
                      ></span>
                      Audio Call Recording
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                          recording.uploadStatus === "UPLOADED"
                            ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]"
                            : recording.uploadStatus === "UPLOADING"
                              ? "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent)] animate-pulse"
                              : recording.uploadStatus === "CANCELLED"
                                ? "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]"
                                : "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]"
                        }`}
                      >
                        {recording.uploadStatus === "UPLOADED"
                          ? "UPLOADED SUCCESSFULLY"
                          : recording.uploadStatus}
                      </span>
                      {recording.uploadStatus === "UPLOADED" && (
                        <a
                          href={`/api/crm/recordings/${recording.id}/download`}
                          className="text-[10px] text-[var(--mnx-accent)] font-bold uppercase hover:underline transition-all cursor-pointer"
                        >
                          Download MP3
                        </a>
                      )}
                    </div>
                  </div>

                  {recording.uploadStatus === "UPLOADED" ? (
                    <audio
                      src={`/api/crm/recordings/${recording.id}/playback`}
                      controls
                      className="w-full h-9 rounded-lg"
                    />
                  ) : recording.uploadStatus === "UPLOADING" ? (
                    <div className="space-y-1 py-1">
                      <div className="w-full bg-[var(--mnx-border)] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[var(--mnx-accent)] h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${recording.uploadProgress || 0}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-[var(--mnx-accent)] font-mono">
                        <span>Uploading from mobile...</span>
                        <span>{recording.uploadProgress || 0}%</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`text-[10px] p-2 rounded border space-y-1 ${
                        recording.uploadStatus === "CANCELLED"
                          ? "text-[var(--mnx-warning)] bg-[var(--mnx-warning-bg)] border-[var(--mnx-warning)]"
                          : "text-[var(--mnx-danger)] bg-[var(--mnx-danger-bg)] border-[var(--mnx-danger)]"
                      }`}
                    >
                      <span className="font-bold uppercase text-[9px] block">
                        {recording.uploadStatus === "CANCELLED"
                          ? "Upload Cancelled:"
                          : "Upload Failure:"}
                      </span>
                      <p>
                        {recording.errorMessage ||
                          (recording.uploadStatus === "CANCELLED"
                            ? "The upload was cancelled by the user."
                            : "The upload has failed.")}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[9px] text-[var(--mnx-muted)]">
                    <span>
                      File size: {(recording.fileSize / 1024 / 1024).toFixed(2)}{" "}
                      MB
                    </span>
                    <span>
                      Matched by: {recording.matchReason} (Confidence:{" "}
                      {recording.matchConfidence}%)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[var(--mnx-soft)] rounded-lg border border-dashed border-[var(--mnx-border)] text-center text-[var(--mnx-muted)] italic">
                  No recording uploaded for this call attempt.
                </div>
              )}
            </div>

            {/* AI Analysis Tab Panel */}
            {recording && (
              <div className="p-4 bg-[var(--mnx-surface)]/60 rounded-xl border border-[var(--mnx-border)]/55 space-y-4">
                {/* Detail Tabs */}
                <div className="flex border-b border-[var(--mnx-border)]/50 pb-1 gap-4 select-none">
                  <CrmButton
                    onClick={() => setSubTab("TRANSCRIPT")}
                    className={`pb-1.5 text-[10px] font-bold uppercase tracking-wider border-b transition-all cursor-pointer ${
                      subTab === "TRANSCRIPT"
                        ? "border-[var(--mnx-accent)] text-[var(--mnx-text-strong)]"
                        : "border-transparent text-[var(--mnx-muted)] hover:text-[var(--mnx-muted)]"
                    }`}
                  >
                    AI Transcript
                  </CrmButton>
                  <CrmButton
                    onClick={() => setSubTab("SUMMARY")}
                    className={`pb-1.5 text-[10px] font-bold uppercase tracking-wider border-b transition-all cursor-pointer ${
                      subTab === "SUMMARY"
                        ? "border-[var(--mnx-accent)] text-[var(--mnx-text-strong)]"
                        : "border-transparent text-[var(--mnx-muted)] hover:text-[var(--mnx-muted)]"
                    }`}
                  >
                    AI Analysis & Actions
                  </CrmButton>
                  <CrmButton
                    onClick={() => setSubTab("REVIEW")}
                    className={`pb-1.5 text-[10px] font-bold uppercase tracking-wider border-b transition-all cursor-pointer ${
                      subTab === "REVIEW"
                        ? "border-[var(--mnx-accent)] text-[var(--mnx-text-strong)]"
                        : "border-transparent text-[var(--mnx-muted)] hover:text-[var(--mnx-muted)]"
                    }`}
                  >
                    Manager Quality Review ({recording.reviews?.length || 0})
                  </CrmButton>
                </div>

                <div className="pt-1">
                  {/* AI Transcript View */}
                  {subTab === "TRANSCRIPT" && (
                    <div className="space-y-3">
                      {transcript ? (
                        <div className="p-3 bg-[var(--mnx-surface)] rounded-lg border border-[var(--mnx-border)]/30 max-h-[250px] overflow-y-auto whitespace-pre-line leading-relaxed text-[var(--mnx-muted)] animate-in fade-in duration-200">
                          {transcript.transcriptText}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-[var(--mnx-muted)] italic">
                          AI Transcription is currently{" "}
                          {recording.transcriptionStatus.toLowerCase()}...
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI Analysis View */}
                  {subTab === "SUMMARY" && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      {transcript ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3 col-span-1">
                            <div>
                              <span className="font-bold text-[var(--mnx-muted)] uppercase text-[9px] block">
                                AI Summary
                              </span>
                              <p className="text-[var(--mnx-muted)] mt-1 leading-normal font-medium">
                                {transcript.summary}
                              </p>
                            </div>
                            <div>
                              <span className="font-bold text-[var(--mnx-muted)] uppercase text-[9px] block">
                                Objections Raised
                              </span>
                              <p
                                className={`mt-1 font-bold ${transcript.objections === "None" ? "text-[var(--mnx-success)]" : "text-[var(--mnx-accent)]"}`}
                              >
                                {transcript.objections}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3 col-span-1">
                            <div>
                              <span className="font-bold text-[var(--mnx-muted)] uppercase text-[9px] block">
                                Follow-up Actions
                              </span>
                              <p className="text-[var(--mnx-muted)] mt-1 font-medium leading-normal">
                                {transcript.followUpActions}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <span className="font-bold text-[var(--mnx-muted)] uppercase text-[9px] block">
                                  Sentiment
                                </span>
                                <span
                                  className={`inline-block mt-1 font-extrabold uppercase text-[10px] px-2 py-0.5 rounded ${
                                    transcript.sentiment === "POSITIVE"
                                      ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)] border border-[var(--mnx-success)]"
                                      : "bg-[var(--mnx-soft)] text-[var(--mnx-muted)] border border-[var(--mnx-border)]"
                                  }`}
                                >
                                  {transcript.sentiment}
                                </span>
                              </div>
                              <div>
                                <span className="font-bold text-[var(--mnx-muted)] uppercase text-[9px] block">
                                  Quality Score
                                </span>
                                <span className="text-[var(--mnx-text-strong)] mt-1 font-extrabold text-[13px] block font-mono">
                                  {transcript.qualityScore}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-[var(--mnx-muted)] italic">
                          AI Analysis is pending transcription completion.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manager Quality Review Tab */}
                  {subTab === "REVIEW" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      {/* Review Submission Form (Only for Managers/Admins) */}
                      {isManagerOrAdmin ? (
                        <form
                          onSubmit={handleSubmitReview}
                          className="p-3 bg-[var(--mnx-surface)] rounded-lg border border-[var(--mnx-border)]/30 space-y-3"
                        >
                          <span className="font-bold text-[var(--mnx-text-strong)] uppercase text-[10px] tracking-wide block">
                            Log Quality Review
                          </span>

                          <div className="grid grid-cols-3 items-center gap-3">
                            <div className="col-span-1">
                              <label className="text-[var(--mnx-muted)] font-bold uppercase text-[9px] block mb-1">
                                Quality Rating
                              </label>
                              <NativeSelect
                                value={rating}
                                onChange={(e) =>
                                  setRating(parseInt(e.target.value))
                                }
                                className="w-full bg-[var(--mnx-surface)] border border-[var(--mnx-border)] text-[var(--mnx-text-strong)] px-2 py-1 rounded text-xs focus:outline-none"
                              >
                                <option value={5}>⭐⭐⭐⭐⭐ (5/5)</option>
                                <option value={4}>⭐⭐⭐⭐ (4/5)</option>
                                <option value={3}>⭐⭐⭐ (3/5)</option>
                                <option value={2}>⭐⭐ (2/5)</option>
                                <option value={1}>⭐ (1/5)</option>
                              </NativeSelect>
                            </div>
                            <div className="col-span-2">
                              <label className="text-[var(--mnx-muted)] font-bold uppercase text-[9px] block mb-1">
                                Comments / Action items
                              </label>
                              <CrmInput
                                type="text"
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                placeholder="Provide audit feedback or training directives..."
                                className="w-full bg-[var(--mnx-surface)] border border-[var(--mnx-border)] text-[var(--mnx-muted)] px-3 py-1 rounded text-xs focus:outline-none placeholder:text-[var(--mnx-muted)]"
                                required
                              />
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <CrmButton
                              type="submit"
                              disabled={submitting}
                              className="bg-[var(--mnx-accent)] text-[var(--mnx-text-strong)] hover:bg-[var(--mnx-accent)]  px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide cursor-pointer transition-all disabled:opacity-50"
                            >
                              {submitting
                                ? "Submitting..."
                                : "Submit Call Audit"}
                            </CrmButton>
                          </div>
                        </form>
                      ) : (
                        <div className="p-3 bg-[var(--mnx-surface)] rounded-lg border border-[var(--mnx-border)]/30 text-center text-[var(--mnx-muted)] italic">
                          Manager call reviews are read-only for
                          representatives.
                        </div>
                      )}

                      {/* Logged Reviews list */}
                      <div className="space-y-2">
                        <span className="font-bold text-[var(--mnx-muted)] uppercase text-[9px] block">
                          Audit Log History
                        </span>
                        {recording.reviews && recording.reviews.length > 0 ? (
                          <div className="space-y-2.5 max-h-[200px] overflow-y-auto">
                            {recording.reviews.map((rev: any) => (
                              <div
                                key={rev.id}
                                className="p-2.5 bg-[var(--mnx-surface)]/40 rounded border border-[var(--mnx-border)]/30 flex flex-col gap-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-[var(--mnx-muted)]">
                                    {rev.reviewer?.name || "Manager"}
                                  </span>
                                  <span className="text-[var(--mnx-accent)] font-bold">
                                    {"⭐".repeat(rev.rating)}
                                  </span>
                                </div>
                                {rev.comments && (
                                  <p className="text-[var(--mnx-muted)] text-xs font-normal pl-0.5 leading-normal">
                                    {rev.comments}
                                  </p>
                                )}
                                <span className="text-[8px] text-[var(--mnx-muted)] text-right pr-0.5">
                                  {new Date(rev.createdAt).toLocaleString(
                                    "en-IN",
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-[var(--mnx-muted)] italic">
                            No manager audits logged for this call recording.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center bg-[var(--mnx-surface)]/30 border border-[var(--mnx-border)]/40 rounded-xl text-[var(--mnx-muted)] italic">
            Select a call attempt from the left to view metrics.
          </div>
        )}
      </div>
    </div>
  );
}
