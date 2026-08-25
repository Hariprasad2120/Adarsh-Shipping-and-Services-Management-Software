"use client";

import {
  CrmActionLink,
  CrmButton,
  CrmField,
  CrmInput,
  CrmPanel,
  CrmSection,
  CrmStatus,
  CrmTabs,
  CrmTextarea,
} from "@/modules/crm/components/workspace/crm-workspace";

import { NativeSelect } from "@/components/ui/native-select";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  assignLeadOwnerAction,
  updateLeadStatusAction,
  updatePerishableDetailsAction,
  simulateInboundEmailAction,
  updateLeadAction,
  getCallAttemptsAction,
} from "@/modules/crm/actions";
import { NotesPanel } from "@/modules/crm/components/records/notes-panel";
import { ActivitiesPanel } from "@/modules/crm/components/records/activities-panel";
import { TimelinePanel } from "@/modules/crm/components/records/timeline-panel";
import { ServiceRateWorkflowPanel } from "@/modules/crm/components/service-enquiries/service-rate-workflow-panel";
import {
  ArrowLeft,
  Clock,

  Edit2,
  Save,
  Mail,
  X,
} from "lucide-react";

interface EnquiryDetailClientProps {
  lead: any;
  users: any[];
  notes: any[];
  attachments: any[];
  activities: any[];
  timeline: any[];
  workTimeLogs: any[];
  calls: any[];
  isManager: boolean;
  backHref?: string;
  backLabel?: string;
  serviceType?: "FREIGHT_FORWARDING" | "CUSTOMS_CLEARANCE";
}

export function EnquiryDetailClient({
  lead,
  users,
  notes,
  activities,
  timeline,
  workTimeLogs,
  calls,
  isManager,
  backHref = "/crm/enquiries",
  backLabel = "Back to Enquiries",
  serviceType,
}: EnquiryDetailClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | "OVERVIEW"
    | "NOTES"
    | "ACTIVITIES"
    | "ATTACHMENTS"
    | "TIMELINE"
    | "TIME_TRACKER"
    | "CALLS"
  >("OVERVIEW");
  const [selectedCallIndex, setSelectedCallIndex] = useState<number | null>(
    null,
  );
  const [callSubTab, setCallSubTab] = useState<
    "TRANSCRIPT" | "SUMMARY" | "REVIEW"
  >("TRANSCRIPT");

  const [localCalls, setLocalCalls] = useState(calls);

  useEffect(() => {
    setLocalCalls(calls);
  }, [calls]);

  useEffect(() => {
    const hasUploading = localCalls.some((c: any) =>
      c.recordings?.some((r: any) => r.uploadStatus === "UPLOADING"),
    );

    const intervalTime = hasUploading
      ? 3000
      : activeTab === "CALLS"
        ? 10000
        : null;

    if (!intervalTime) return;

    const interval = setInterval(async () => {
      const res = await getCallAttemptsAction(lead.id);
      if (res.ok && res.data) {
        setLocalCalls(res.data);
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [localCalls, activeTab, lead.id]);

  // Status management states
  const [isMarkingFollowUp, setIsMarkingFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpRemarks, setFollowUpRemarks] = useState("");

  // Manager Owner Assignment state
  const [selectedOwnerId, setSelectedOwnerId] = useState(lead.ownerId || "");
  const [isAssigning, setIsAssigning] = useState(false);

  // Perishable Cargo Edit state
  const [isEditingPerishables, setIsEditingPerishables] = useState(false);
  const perishableDetails = (lead.perishableDetails as any) || {};
  const [perishableType, setPerishableType] = useState(
    perishableDetails.cargoType || "Fruit/Vegetables",
  );
  const [temperature, setTemperature] = useState(
    perishableDetails.tempCelsius || "",
  );
  const [humidity, setHumidity] = useState(
    perishableDetails.humidityPercent || "",
  );
  const [perishableRemarks, setPerishableRemarks] = useState(
    perishableDetails.specialRemarks || "",
  );

  // Contact & Enquiry Details Edit state
  const [isEditingCargoDetails, setIsEditingCargoDetails] = useState(false);
  const enquiryDetails = (lead.enquiryDetails as any) || {};
  const [clientName, setClientName] = useState(
    enquiryDetails.clientName ||
      `${lead.firstName || ""} ${lead.lastName || ""}`.trim(),
  );
  const [company, setCompany] = useState(lead.company || "");
  const [email, setEmail] = useState(lead.email || "");
  const [phone, setPhone] = useState(lead.phone || "");
  const [mobile, setMobile] = useState(lead.mobile || "");

  const [enquiryType, setEnquiryType] = useState<"Sea" | "Air">(
    enquiryDetails.type || "Sea",
  );
  const [pol, setPol] = useState(enquiryDetails.pol || "");
  const [pod, setPod] = useState(enquiryDetails.pod || "");
  const [aol, setAol] = useState(enquiryDetails.aol || "");
  const [aod, setAod] = useState(enquiryDetails.aod || "");
  const [commodity, setCommodity] = useState(enquiryDetails.commodity || "");
  const [weight, setWeight] = useState(enquiryDetails.weight || "");
  const [incoterm, setIncoterm] = useState(enquiryDetails.incoterm || "FOB");
  const [planning, setPlanning] = useState(
    enquiryDetails.shipmentPlanning || "30 days",
  );
  const [purpose, setPurpose] = useState(
    enquiryDetails.purpose || "Commercial",
  );

  // Email simulation states
  const [simSubject, setSimSubject] = useState(
    `Re: Rates request [${lead.enquiryRef || "GEN-ENQ"}]`,
  );
  const [simFromEmail, setSimFromEmail] = useState(
    "agent.pricing@freightpartner.com",
  );
  const [simBody, setSimBody] = useState(
    `Hello Team,\n\nHere are the rates matching your request ${lead.enquiryRef || "ADR-ENQ-XXXXX"}:\n\nOcean Freight charges is USD 1,200\nCFS Charges is Rs. 4,500\nCustoms Clearance rate is Rs. 3,500\nDO Charges is Rs. 1,800\n\nRegards,\nAgent Team`,
  );
  const [isSimulatingEmail, setIsSimulatingEmail] = useState(false);

  // Manual Paste parsing states
  const [pasteText, setPasteText] = useState("");
  const [isParsingPaste, setIsParsingPaste] = useState(false);
  // Handle Mark as Follow-up status update
  const handleMarkAsFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpDate) {
      toast.error("Please provide a reminder date and time for the follow up.");
      return;
    }
    if (!followUpRemarks.trim()) {
      toast.error("Call remarks are required to schedule a follow up.");
      return;
    }

    setIsSubmitting(true);
    const res = await updateLeadStatusAction(lead.id, "FOLLOW_UP", {
      remarks: followUpRemarks,
      isFutureFollowUp: true,
      followUpReminderDate: followUpDate,
      isPerishable: lead.isPerishable,
      enquiry: lead.enquiryDetails,
    });
    setIsSubmitting(false);

    if (res.ok) {
      toast.success("Enquiry marked as Follow Up successfully!");
      setIsMarkingFollowUp(false);
      router.refresh();
    } else {
      toast.error(res.error || "Failed to update status");
    }
  };

  // Handle Manager assignment
  const handleAssignOwner = async () => {
    setIsAssigning(true);
    const res = await assignLeadOwnerAction(lead.id, selectedOwnerId);
    setIsAssigning(false);

    if (res.ok) {
      toast.success("Salesperson assigned successfully!");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to assign owner");
    }
  };

  // Handle Perishable details save
  const handleSavePerishables = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const res = await updatePerishableDetailsAction(lead.id, true, {
      cargoType: perishableType,
      tempCelsius: temperature,
      humidityPercent: humidity,
      specialRemarks: perishableRemarks,
    });
    setIsSubmitting(false);

    if (res.ok) {
      toast.success("Perishable details updated successfully!");
      setIsEditingPerishables(false);
      router.refresh();
    } else {
      toast.error(res.error || "Failed to update details");
    }
  };

  // Handle general Cargo and Contact details save
  const handleSaveCargoDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("firstName", clientName.split(" ")[0] || "");
    formData.append("lastName", clientName.split(" ").slice(1).join(" ") || "");
    formData.append("company", company);
    formData.append("email", email);
    formData.append("phone", phone);
    formData.append("mobile", mobile);
    formData.append("isPerishable", lead.isPerishable ? "true" : "false");

    // Maintain enquiry structure
    const updatedEnquiry = {
      ...enquiryDetails,
      type: enquiryType,
      clientName,
      pol: enquiryType === "Sea" ? pol : undefined,
      pod: enquiryType === "Sea" ? pod : undefined,
      aol: enquiryType === "Air" ? aol : undefined,
      aod: enquiryType === "Air" ? aod : undefined,
      commodity,
      weight,
      incoterm,
      shipmentPlanning: planning,
      purpose,
    };

    // The updateLeadAction in actions expects standard form fields, and can parse extra fields or we can pass additional parameters.
    // Let's pass the updated lead details
    const res = await updateLeadAction(lead.id, formData);

    if (res.ok) {
      // Save details to lead status as well to sync the enquiry json block
      const syncRes = await updateLeadStatusAction(lead.id, lead.status, {
        enquiry: updatedEnquiry,
        isPerishable: lead.isPerishable,
        isFutureFollowUp: lead.isFutureFollowUp,
        followUpReminderDate: lead.followUpReminderDate,
      });

      if (syncRes.ok) {
        toast.success("Cargo and contact details updated!");
        setIsEditingCargoDetails(false);
        router.refresh();
      } else {
        toast.error(syncRes.error || "Failed to sync enquiry details");
      }
    } else {
      toast.error(res.error || "Failed to update contact info");
    }
    setIsSubmitting(false);
  };

  // Handle email simulation
  const handleSimulateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulatingEmail(true);
    const res = await simulateInboundEmailAction(
      simSubject,
      simBody,
      simFromEmail,
    );
    setIsSimulatingEmail(false);

    if (res.ok) {
      toast.success("Simulated reply processed successfully!");
      const data = (res as any).data;
      if (data && data.parsedRates) {
        toast.info(`Parsed rates: ${Object.keys(data.parsedRates).join(", ")}`);
      }
      router.refresh();
    } else {
      toast.error(res.error || "Failed to simulate email");
    }
  };

  // Client side regex rate parsing test
  const handleParsePasteText = () => {
    setIsParsingPaste(true);

    // Regular expressions matching pricing rates
    const regexRules = [
      { key: "oceanFreight", keywords: ["ocean", "freight", "sea"] },
      { key: "airFreight", keywords: ["air", "flight", "airfreight"] },
      { key: "cfsCharges", keywords: ["cfs", "container freight station"] },
      { key: "customsClearance", keywords: ["customs", "clearance", "cha"] },
      { key: "blCharges", keywords: ["bl", "bill of lading"] },
      { key: "doCharges", keywords: ["do", "delivery order"] },
      { key: "awbCharges", keywords: ["awb", "airway bill"] },
    ];

    const results: any = {};
    regexRules.forEach((rule) => {
      for (const keyword of rule.keywords) {
        const pattern = new RegExp(
          `${keyword}\\s*(?:charges|freight)?\\s*(?:[:=-]|\\bis\\b)\\s*(?:rs\\.?|inr|usd|\\$)?\\s*([\\d,]+(?:\\.\\d+)?)`,
          "i",
        );
        const match = pasteText.match(pattern);
        if (match && match[1]) {
          const val = parseFloat(match[1].replace(/,/g, ""));
          results[rule.key] = val;
          break;
        }
      }
    });

    setIsParsingPaste(false);
    if (Object.keys(results).length > 0) {
      toast.success(
        `Successfully parsed ${Object.keys(results).length} rates!`,
      );
      // Update local rates states if saved in lead rates sheet or prompt save
      const displayParsed = Object.entries(results)
        .map(([k, v]) => `${k}: ₹${v}`)
        .join("\n");
      alert(
        `Parsed Rates Results:\n\n${displayParsed}\n\nYou can input these below or trigger the simulated email to update the database.`,
      );
    } else {
      toast.error(
        "Could not parse any charges. Make sure the text matches patterns like 'Ocean Freight: 1200' or 'cfs charges is Rs. 3500'",
      );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <CrmSection
        eyebrow="Demand record"
        title="Enquiry detail"
        description="Review the enquiry, complete the next operational step, and only then unlock the following commercial stage."
        actions={
          <CrmActionLink href={backHref}>
            <ArrowLeft className="size-4" />
            <span>{backLabel}</span>
          </CrmActionLink>
        }
      >
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
          <div className="min-w-0 space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <CrmStatus variant="accent">{lead.enquiryRef || "GEN-ENQ"}</CrmStatus>
                <CrmStatus variant={lead.status === "FOLLOW_UP" ? "warning" : "success"}>
                  {lead.status === "FOLLOW_UP" ? "Follow Up Active" : "Interested Enquiry"}
                </CrmStatus>
                {serviceType ? (
                  <CrmStatus variant="neutral">
                    {serviceType === "FREIGHT_FORWARDING"
                      ? "Freight Forwarding"
                      : "Customs Clearance"}
                  </CrmStatus>
                ) : null}
              </div>
              <div className="space-y-2">
                <h2 className="text-[clamp(1.6rem,2.2vw,2.2rem)] font-semibold leading-tight text-[var(--mnx-text-strong)]">
                  {lead.firstName ? `${lead.firstName} ` : ""}
                  {lead.lastName}
                </h2>
                <p className="max-w-3xl text-sm leading-6 text-[var(--mnx-text-muted)]">
                  {company || "Direct client"} · {email || "Email pending"} ·{" "}
                  {mobile || phone || "Phone pending"}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[var(--mn-radius-control)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] px-4 py-3">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
                  Current owner
                </span>
                <strong className="mt-2 block text-sm font-semibold text-[var(--mnx-text-strong)]">
                  {lead.owner?.name || "Unassigned"}
                </strong>
                <span className="mt-1 block text-xs text-[var(--mnx-text-muted)]">
                  {lead.owner?.email || "No email available"}
                </span>
              </div>
              <div className="rounded-[var(--mn-radius-control)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] px-4 py-3">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
                  Qualified on
                </span>
                <strong className="mt-2 block text-sm font-semibold text-[var(--mnx-text-strong)]">
                  {new Date(lead.updatedAt).toLocaleDateString("en-IN")}
                </strong>
                <span className="mt-1 block text-xs text-[var(--mnx-text-muted)]">
                  {lead.source || "Direct source"}
                </span>
              </div>
              <div className="rounded-[var(--mn-radius-control)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] px-4 py-3">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
                  Cargo mode
                </span>
                <strong className="mt-2 block text-sm font-semibold text-[var(--mnx-text-strong)]">
                  {enquiryType}
                </strong>
                <span className="mt-1 block text-xs text-[var(--mnx-text-muted)]">
                  {commodity || "Commodity pending"}
                </span>
              </div>
              <div className="rounded-[var(--mn-radius-control)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] px-4 py-3">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
                  Next action
                </span>
                <strong className="mt-2 block text-sm font-semibold text-[var(--mnx-text-strong)]">
                  {lead.status === "FOLLOW_UP" ? "Close follow up" : "Send rate request"}
                </strong>
                <span className="mt-1 block text-xs text-[var(--mnx-text-muted)]">
                  Workflow stays progressive from this step onward.
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {lead.isFutureFollowUp && lead.followUpReminderDate ? (
              <div className="rounded-[var(--mn-radius-control)] border border-[var(--mnx-warning)]/25 bg-[var(--mnx-warning-bg)]/35 px-4 py-4">
                <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mnx-warning)]">
                  Follow-up alarm
                </span>
                <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-[var(--mnx-text-strong)]">
                  <Clock className="size-4 text-[var(--mnx-warning)]" />
                  <span>{new Date(lead.followUpReminderDate).toLocaleString("en-IN")}</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--mnx-text-muted)]">
                  A reminder is active for this enquiry. Clear it by completing the follow-up outcome.
                </p>
              </div>
            ) : null}

            <div className="rounded-[var(--mn-radius-control)] border border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] px-4 py-4">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
                Action lane
              </span>
              <div className="mt-3 flex flex-wrap gap-2">
                {lead.status === "INTERESTED" ? (
                  <CrmButton
                    onClick={() => setIsMarkingFollowUp(true)}
                    variant="secondary"
                    size="compact"
                    className="gap-2"
                  >
                    <Clock className="size-4" />
                    <span>Schedule Follow Up</span>
                  </CrmButton>
                ) : null}
              </div>

              {lead.status === "FOLLOW_UP" && isManager ? (
                <div className="mt-4 grid gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mnx-text-muted)]">
                    Assign owner
                  </span>
                  <NativeSelect
                    value={selectedOwnerId}
                    onChange={(e) => setSelectedOwnerId(e.target.value)}
                    className="min-w-0"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </NativeSelect>
                  <CrmButton
                    onClick={handleAssignOwner}
                    disabled={isAssigning}
                    variant="secondary"
                    size="compact"
                  >
                    {isAssigning ? "Saving..." : "Apply owner"}
                  </CrmButton>
                </div>
              ) : (
                <p className="mt-3 text-xs leading-5 text-[var(--mnx-text-muted)]">
                  Commercial controls open further down the page only as each prior step is completed.
                </p>
              )}
            </div>
          </div>
        </div>
      </CrmSection>

      {/* Mark as Follow Up Popup / Expandable Area */}
      {isMarkingFollowUp ? (
        <CrmPanel className="border-[var(--mnx-warning)]/25 bg-[var(--mnx-warning-bg)]/35">
          <form onSubmit={handleMarkAsFollowUp} className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--mnx-border)]/30 pb-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--mnx-warning)]">
                  Follow Up Workflow
                </p>
                <h3 className="mt-1 flex items-center gap-2 text-base font-semibold text-[var(--mnx-text-strong)]">
                  <Clock className="size-4" />
                  <span>Schedule sales follow up</span>
                </h3>
              </div>
              <CrmButton
                type="button"
                variant="secondary"
                size="compact"
                onClick={() => setIsMarkingFollowUp(false)}
              >
                <X className="size-4" />
              </CrmButton>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <CrmField label="Follow up reminder date and time" required>
                <CrmInput
                  type="datetime-local"
                  required
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              </CrmField>
              <CrmField label="Follow up call remarks and directives" required>
                <CrmTextarea
                  rows={2}
                  required
                  value={followUpRemarks}
                  onChange={(e) => setFollowUpRemarks(e.target.value)}
                  placeholder="Call outcome, notes, and specific follow-up actions required..."
                />
              </CrmField>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <CrmButton type="button" variant="secondary" onClick={() => setIsMarkingFollowUp(false)}>
                Cancel
              </CrmButton>
              <CrmButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Scheduling..." : "Confirm Schedule & Save"}
              </CrmButton>
            </div>
          </form>
        </CrmPanel>
      ) : null}

      <CrmSection
        eyebrow="Qualified enquiry"
        title="Enquiry and cargo details"
        description="Use the full page width to review client, contact, route, and shipment intent before moving into commercial work."
        actions={
          <CrmButton
            onClick={() => setIsEditingCargoDetails(!isEditingCargoDetails)}
            variant="secondary"
            size="compact"
            className="gap-1.5"
          >
            {isEditingCargoDetails ? (
              <X className="size-3.5" />
            ) : (
              <Edit2 className="size-3.5" />
            )}
            <span>{isEditingCargoDetails ? "Cancel" : "Edit Details"}</span>
          </CrmButton>
        }
      >

        {isEditingCargoDetails ? (
          <form onSubmit={handleSaveCargoDetails} className="space-y-5">
                {/* Contact Sub-Grid */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-[var(--mnx-accent)] uppercase tracking-wide block font-sans border-b border-[var(--mnx-border)]/20 pb-1">
                    Client Contact Info
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-normal text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                        Client Name
                      </label>
                      <CrmInput
                        type="text"
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-normal text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                        Company
                      </label>
                      <CrmInput
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-normal text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                        Email
                      </label>
                      <CrmInput
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-normal text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                          Phone
                        </label>
                        <CrmInput
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-normal text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                          Mobile
                        </label>
                        <CrmInput
                          type="text"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cargo Details Sub-Grid */}
                <div className="space-y-3 pt-2">
                  <span className="text-[10px] font-bold text-[var(--mnx-accent)] uppercase tracking-wide block font-sans border-b border-[var(--mnx-border)]/20 pb-1">
                    Cargo Details & Route
                  </span>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-normal text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                        Cargo Mode
                      </label>
                      <NativeSelect
                        value={enquiryType}
                        onChange={(e) => setEnquiryType(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)]"
                      >
                        <option value="Sea">Sea Enquiry</option>
                        <option value="Air">Air Enquiry</option>
                      </NativeSelect>
                    </div>
                    <div>
                      <label className="block text-[10px] font-normal text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                        Commodity
                      </label>
                      <CrmInput
                        type="text"
                        value={commodity}
                        onChange={(e) => setCommodity(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-normal text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                        Weight / Packages
                      </label>
                      <CrmInput
                        type="text"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)]"
                      />
                    </div>
                  </div>

                  {enquiryType === "Sea" ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-normal text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                          POL (Port of Loading)
                        </label>
                        <CrmInput
                          type="text"
                          value={pol}
                          onChange={(e) => setPol(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-normal text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                          POD (Port of Discharge)
                        </label>
                        <CrmInput
                          type="text"
                          value={pod}
                          onChange={(e) => setPod(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                          AOL (Airport of Loading)
                        </label>
                        <CrmInput
                          type="text"
                          value={aol}
                          onChange={(e) => setAol(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                          AOD (Airport of Discharge)
                        </label>
                        <CrmInput
                          type="text"
                          value={aod}
                          onChange={(e) => setAod(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-normal text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                        Incoterm
                      </label>
                      <CrmInput
                        type="text"
                        value={incoterm}
                        onChange={(e) => setIncoterm(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-normal text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                        Shipment Planning
                      </label>
                      <CrmInput
                        type="text"
                        value={planning}
                        onChange={(e) => setPlanning(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-normal text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                        Purpose of Cargo
                      </label>
                      <CrmInput
                        type="text"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[var(--mnx-border)]/30">
                  <CrmButton
                    type="button"
                    onClick={() => setIsEditingCargoDetails(false)}
                    className="px-4 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] text-[var(--mnx-muted)] rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </CrmButton>
                  <CrmButton
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-5 py-2 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] text-[var(--mnx-text-strong)] rounded-lg text-xs font-bold transition-all mnx-shadow-panel"
                  >
                    <Save className="size-3.5" />
                    <span>{isSubmitting ? "Saving..." : "Save Details"}</span>
                  </CrmButton>
                </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 lg:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-normal text-[var(--mnx-muted)] uppercase tracking-wider block">
                    Client Name
                  </span>
                  <span className="block pl-1 text-base font-normal text-[var(--mnx-text-strong)]">
                    {clientName}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-normal text-[var(--mnx-muted)] uppercase tracking-wider block">
                    Company
                  </span>
                  <span className="block pl-1 text-base font-normal text-[var(--mnx-text-strong)]">
                    {company || "Direct Client"}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-normal text-[var(--mnx-muted)] uppercase tracking-wider block">
                    Email
                  </span>
                  <span className="block pl-1 text-base font-normal text-[var(--mnx-text-primary)]">
                    {email || "Not Specified"}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-normal text-[var(--mnx-muted)] uppercase tracking-wider block">
                    Phone Number
                  </span>
                  <span className="block pl-1 text-base font-normal text-[var(--mnx-text-primary)]">
                    {phone || "Not Specified"}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-normal text-[var(--mnx-muted)] uppercase tracking-wider block">
                    Mobile Number
                  </span>
                  <span className="block pl-1 text-base font-normal text-[var(--mnx-text-primary)]">
                    {mobile || "Not Specified"}
                  </span>
                </div>

                <div className="border-t border-[var(--mnx-border)]/30 pt-4 lg:col-span-2 xl:col-span-3">
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-normal text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Cargo Mode
                    </span>
                    <span className="block pl-1 text-base font-normal text-[var(--mnx-text-strong)]">
                      {enquiryType}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-normal text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Commodity
                    </span>
                    <span className="block pl-1 text-[var(--mnx-text-strong)] font-normal">
                      {commodity || "Not Specified"} •{" "}
                      {weight || "Not Specified"}
                    </span>
                  </div>

                  {enquiryType === "Sea" ? (
                    <div className="space-y-1 md:col-span-2 xl:col-span-2">
                      <span className="text-[11px] font-normal text-[var(--mnx-accent)] uppercase tracking-wider block font-mono">
                        Routing (Sea POL ➔ POD)
                      </span>
                      <span className="block pl-1 text-[var(--mnx-text-strong)] font-normal text-sm">
                        {pol || "N/A"} ➔ {pod || "N/A"}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1 md:col-span-2 xl:col-span-2">
                      <span className="text-[11px] font-normal text-[var(--mnx-accent)] uppercase tracking-wider block font-mono">
                        Routing (Air AOL ➔ AOD)
                      </span>
                      <span className="block pl-1 text-[var(--mnx-text-strong)] font-normal text-sm">
                        {aol || "N/A"} ➔ {aod || "N/A"}
                      </span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="text-[11px] font-normal text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Shipment Planning
                    </span>
                    <span className="block pl-1 text-base font-normal text-[var(--mnx-text-primary)]">
                      {planning}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-normal text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Purpose of Cargo
                    </span>
                    <span className="block pl-1 text-base font-normal text-[var(--mnx-text-primary)]">
                      {purpose}
                    </span>
                  </div>
                </div>
              </div>
            </div>
        )}
      </CrmSection>

      {/* Perishable Cargo Card (displays always if lead.isPerishable is true, or provides toggle) */}
      {lead.isPerishable && (
        <div className="rounded-xl border border-[var(--mnx-accent)]/40 bg-[var(--mnx-surface)] p-6 mnx-crm-panel-surface mnx-tone-warning">
          <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--mnx-border)]/30 pb-3 mb-2">
                <div className="flex items-center gap-3">
                  <span className="size-8 rounded-lg bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)] flex items-center justify-center text-base">
                    ❄️
                  </span>
                  <h3 className="font-bold text-sm text-[var(--mnx-text-strong)] uppercase tracking-wider">
                    Perishable Cargo Parameters
                  </h3>
                </div>
                <CrmButton
                  onClick={() => setIsEditingPerishables(!isEditingPerishables)}
                  className="flex items-center gap-1.5 bg-[var(--mnx-surface)] hover:bg-[var(--mnx-text-muted)] border border-[var(--mnx-border)] hover:border-[var(--mnx-accent)]/50 text-[var(--mnx-muted)] px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  {isEditingPerishables ? (
                    <X className="size-3.5" />
                  ) : (
                    <Edit2 className="size-3.5" />
                  )}
                  <span>
                    {isEditingPerishables ? "Cancel" : "Edit Parameters"}
                  </span>
                </CrmButton>
              </div>

              {isEditingPerishables ? (
                <form onSubmit={handleSavePerishables} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-normal text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                        Cargo Category
                      </label>
                      <NativeSelect
                        value={perishableType}
                        onChange={(e) => setPerishableType(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                      >
                        <option value="Fruit/Vegetables">
                          Fruit & Vegetables
                        </option>
                        <option value="Meat/Poultry">Meat & Poultry</option>
                        <option value="Seafood">Fresh Seafood</option>
                        <option value="Pharmaceuticals">
                          Pharmaceuticals / Medicine
                        </option>
                        <option value="Chemicals">
                          Temperature-sensitive Chemicals
                        </option>
                        <option value="Dairy">Dairy Products</option>
                      </NativeSelect>
                    </div>
                    <div>
                      <label className="block text-[10px] font-normal text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                        Required Temp (°C)
                      </label>
                      <CrmInput
                        type="text"
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value)}
                        placeholder="e.g. 2 to 8"
                        className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-normal text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                        Humidity Control (%)
                      </label>
                      <CrmInput
                        type="text"
                        value={humidity}
                        onChange={(e) => setHumidity(e.target.value)}
                        placeholder="e.g. 85%"
                        className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      Special Handling Remarks / Ventilation
                    </label>
                    <CrmTextarea
                      rows={2}
                      value={perishableRemarks}
                      onChange={(e) => setPerishableRemarks(e.target.value)}
                      placeholder="Specify container ventilation settings, pre-cooling requirements, or emergency instructions..."
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)] placeholder:text-[var(--mnx-muted)]"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <CrmButton
                      type="button"
                      onClick={() => setIsEditingPerishables(false)}
                      className="px-4 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] text-[var(--mnx-muted)] rounded-lg text-xs font-semibold"
                    >
                      Cancel
                    </CrmButton>
                    <CrmButton
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-1.5 px-5 py-2 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-warning)] text-[var(--mnx-text-strong)] rounded-lg text-xs font-bold transition-all mnx-shadow-panel"
                    >
                      <Save className="size-3.5" />
                      <span>
                        {isSubmitting ? "Saving..." : "Save Parameters"}
                      </span>
                    </CrmButton>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-[11px] font-normal text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Cargo Category
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-normal">
                      {perishableType}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-normal text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Operating Temp
                    </span>
                    <span className="text-[var(--mnx-accent)] font-normal block mnx-numeric">
                      {temperature || "Ambient"} °C
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-normal text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Humidity Target
                    </span>
                    <span className="text-[var(--mnx-text-strong)] font-normal block mnx-numeric">
                      {humidity || "N/A"}
                    </span>
                  </div>
                  <div className="col-span-3 border-t border-[var(--mnx-border)]/30 pt-3 mt-1 space-y-1">
                    <span className="text-[11px] font-normal text-[var(--mnx-muted)] uppercase tracking-wider block">
                      Ventilation & Airflow Remarks
                    </span>
                    <p className="text-xs text-[var(--mnx-muted)] bg-[var(--mnx-surface)]/40 p-2.5 rounded-lg border border-[var(--mnx-border)]/20 leading-relaxed italic">
                      {perishableRemarks ||
                        "No special handling instructions logged."}
                    </p>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      {false && (
        <CrmSection
          eyebrow="Automation checks"
          title="Inbound email rate parser and simulator"
          description="Verify automatic pricing extraction by pasting pricing feedback or simulating agent inbound email replies."
        >

            {/* Paste box tool */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-[var(--mnx-accent)] uppercase tracking-wide block font-mono">
                1. Direct Text Paste Parser (Test Regex)
              </span>
              <div className="space-y-2">
                <CrmTextarea
                  rows={3}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste raw quote email text here. E.g., 'Ocean Freight: 1500 USD, CFS Charges: 4000 INR...'"
                  className="w-full px-3 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)] placeholder:text-[var(--mnx-muted)]"
                />
                <CrmButton
                  type="button"
                  onClick={handleParsePasteText}
                  disabled={isParsingPaste || !pasteText.trim()}
                  className="px-4 py-2 bg-[var(--mnx-surface)] hover:bg-[var(--mnx-text-muted)] border border-[var(--mnx-border)] hover:border-[var(--mnx-accent)] text-[var(--mnx-muted)] rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {isParsingPaste ? "Extracting..." : "Parse Text & Test"}
                </CrmButton>
              </div>
            </div>

            {/* Simulation form */}
            <div className="space-y-3 border-t border-[var(--mnx-border)]/30 pt-3">
              <span className="text-[10px] font-bold text-[var(--mnx-accent)] uppercase tracking-wide block font-mono">
                2. Simulate Inbound Agent Reply Email (Database Update)
              </span>
              <form
                onSubmit={handleSimulateEmail}
                className="space-y-3 bg-[var(--mnx-surface)]/40 p-4 rounded-xl border border-[var(--mnx-border)]/40"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      From Address
                    </label>
                    <CrmInput
                      type="text"
                      required
                      value={simFromEmail}
                      onChange={(e) => setSimFromEmail(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      Email Subject Line (Ref Required)
                    </label>
                    <CrmInput
                      type="text"
                      required
                      value={simSubject}
                      onChange={(e) => setSimSubject(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                    Email Body Content
                  </label>
                  <CrmTextarea
                    rows={4}
                    required
                    value={simBody}
                    onChange={(e) => setSimBody(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)] font-mono leading-relaxed"
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <CrmButton
                    type="submit"
                    disabled={isSimulatingEmail}
                    className="flex items-center gap-2 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-warning)] text-[var(--mnx-text-strong)] px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    <Mail className="size-3.5" />
                    <span>
                      {isSimulatingEmail
                        ? "Processing Simulation..."
                        : "Trigger Simulation"}
                    </span>
                  </CrmButton>
                </div>
              </form>
            </div>
        </CrmSection>
      )}

      <CrmSection
        eyebrow="Shared context"
        title="Notes, activity, audit, and calls"
        description="Keep secondary information in one full-width section so the primary workflow stays readable."
      >
        <CrmTabs className="flex-wrap gap-2 border-none bg-transparent p-0">
          <CrmButton
            onClick={() => setActiveTab("OVERVIEW")}
            variant={activeTab === "OVERVIEW" ? "primary" : "secondary"}
            size="compact"
            role="tab"
            aria-selected={activeTab === "OVERVIEW"}
          >
            Summary
          </CrmButton>
          <CrmButton
            onClick={() => setActiveTab("NOTES")}
            variant={activeTab === "NOTES" ? "primary" : "secondary"}
            size="compact"
            role="tab"
            aria-selected={activeTab === "NOTES"}
          >
            Notes ({notes.length})
          </CrmButton>
          <CrmButton
            onClick={() => setActiveTab("ACTIVITIES")}
            variant={activeTab === "ACTIVITIES" ? "primary" : "secondary"}
            size="compact"
            role="tab"
            aria-selected={activeTab === "ACTIVITIES"}
          >
            Tasks ({activities.length})
          </CrmButton>
          <CrmButton
            onClick={() => setActiveTab("TIMELINE")}
            variant={activeTab === "TIMELINE" ? "primary" : "secondary"}
            size="compact"
            role="tab"
            aria-selected={activeTab === "TIMELINE"}
          >
            Audit
          </CrmButton>
          <CrmButton
            onClick={() => setActiveTab("TIME_TRACKER")}
            variant={activeTab === "TIME_TRACKER" ? "primary" : "secondary"}
            size="compact"
            role="tab"
            aria-selected={activeTab === "TIME_TRACKER"}
          >
            Time Tracker ({workTimeLogs.length})
          </CrmButton>
          <CrmButton
            onClick={() => setActiveTab("CALLS")}
            variant={activeTab === "CALLS" ? "primary" : "secondary"}
            size="compact"
            role="tab"
            aria-selected={activeTab === "CALLS"}
          >
            Calls ({calls.length})
          </CrmButton>
        </CrmTabs>

        <div className="space-y-3 px-1 text-xs">
              {activeTab === "OVERVIEW" && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-[var(--mnx-border)]/30 bg-[var(--mnx-surface)]/50 p-3.5 space-y-2">
                    <span className="font-normal text-[var(--mnx-text-strong)] block uppercase tracking-wider">
                      Enquiry Logging Details
                    </span>
                    <p className="text-[var(--mnx-muted)] leading-relaxed">
                      This enquiry record was qualified on{" "}
                      {new Date(lead.updatedAt).toLocaleDateString("en-IN")}.
                      Standard validation rules apply before quoting.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[var(--mnx-muted)]">
                    <div>
                      <span className="font-normal text-[var(--mnx-muted)] block uppercase text-[9px]">
                        Source
                      </span>
                      <span className="text-[var(--mnx-muted)]">
                        {lead.source || "Direct"}
                      </span>
                    </div>
                    <div>
                      <span className="font-normal text-[var(--mnx-muted)] block uppercase text-[9px]">
                        Qualified At
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

              {activeTab === "TIMELINE" && <TimelinePanel events={timeline} />}

              {/* ── TIME TRACKER TAB ── */}
              {activeTab === "TIME_TRACKER" && (
                <div className="space-y-3">
                  {workTimeLogs.length === 0 ? (
                    <p className="text-[var(--mnx-muted)] italic py-4 text-center">
                      No time logs recorded for this enquiry yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {workTimeLogs.map((log: any, i: number) => (
                        <div
                          key={log.id || i}
                          className="p-3 bg-[var(--mnx-surface)]/50 rounded-lg border border-[var(--mnx-border)]/30 flex items-start justify-between"
                        >
                          <div>
                            <span className="text-[var(--mnx-text-strong)] font-bold text-xs">
                              {log.user?.name || "Unknown"}
                            </span>
                            <span className="text-[var(--mnx-muted)] text-[10px] ml-2">
                              {log.activityType || "General"}
                            </span>
                            {log.description && (
                              <p className="text-[var(--mnx-muted)] text-[11px] mt-1">
                                {log.description}
                              </p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[var(--mnx-accent)] font-bold font-mono text-sm">
                              {log.durationHours}h
                            </span>
                            <span className="text-[var(--mnx-muted)] text-[10px] block">
                              {new Date(log.loggedAt).toLocaleDateString(
                                "en-IN",
                              )}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div className="text-right pt-2 border-t border-[var(--mnx-border)]/30">
                        <span className="text-[var(--mnx-muted)] text-[10px] uppercase font-bold">
                          Total:{" "}
                        </span>
                        <span className="text-[var(--mnx-text-strong)] font-bold font-mono">
                          {workTimeLogs
                            .reduce(
                              (sum: number, l: any) =>
                                sum + (l.durationHours || 0),
                              0,
                            )
                            .toFixed(1)}
                          h
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── CALLS TAB ── */}
              {activeTab === "CALLS" && (
                <div className="space-y-3">
                  {localCalls.length === 0 ? (
                    <p className="text-[var(--mnx-muted)] italic py-4 text-center">
                      No call recordings for this enquiry yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {/* Call attempt list */}
                      {localCalls.map((call: any, idx: number) => {
                        const recording = call.recordings?.[0];
                        const transcript = recording?.transcript;
                        const isExpanded = selectedCallIndex === idx;

                        return (
                          <div
                            key={call.id}
                            className="rounded-lg border border-[var(--mnx-border)]/40 overflow-hidden"
                          >
                            {/* Call header */}
                            <CrmButton
                              onClick={() =>
                                setSelectedCallIndex(isExpanded ? null : idx)
                              }
                              className="w-full p-3 bg-[var(--mnx-surface)]/50 flex items-center justify-between text-left hover:bg-[var(--mnx-surface)] transition-all cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <span className="size-8 rounded-lg bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)] flex items-center justify-center text-xs">
                                  📞
                                </span>
                                <div>
                                  <span className="text-[var(--mnx-text-strong)] font-bold text-xs block">
                                    {call.salesperson?.name || "Salesperson"}
                                  </span>
                                  <span className="text-[var(--mnx-muted)] text-[10px]">
                                    {call.customerPhone} •{" "}
                                    {new Date(
                                      call.callStartedAt,
                                    ).toLocaleString("en-IN")}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {call.durationSeconds && (
                                  <span className="text-[var(--mnx-accent)] font-mono font-bold text-xs">
                                    {Math.floor(call.durationSeconds / 60)}:
                                    {String(call.durationSeconds % 60).padStart(
                                      2,
                                      "0",
                                    )}
                                  </span>
                                )}
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    call.status === "COMPLETED" ||
                                    recording?.uploadStatus === "UPLOADED"
                                      ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]"
                                      : recording?.uploadStatus === "UPLOADING"
                                        ? "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent)]"
                                        : recording?.uploadStatus ===
                                            "CANCELLED"
                                          ? "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]"
                                          : recording?.uploadStatus === "FAILED"
                                            ? "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]"
                                            : call.status === "PENDING"
                                              ? "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]"
                                              : "bg-[var(--mnx-soft)] text-[var(--mnx-muted)]"
                                  }`}
                                >
                                  {recording?.uploadStatus === "UPLOADED"
                                    ? "COMPLETED"
                                    : recording?.uploadStatus === "UPLOADING"
                                      ? "UPLOADING"
                                      : recording?.uploadStatus === "CANCELLED"
                                        ? "CANCELLED"
                                        : recording?.uploadStatus === "FAILED"
                                          ? "FAILED"
                                          : call.status}
                                </span>
                                <span className="text-[var(--mnx-muted)]">
                                  {isExpanded ? "▲" : "▼"}
                                </span>
                              </div>
                            </CrmButton>

                            {/* Expanded: recording + transcript */}
                            {isExpanded && (
                              <div className="p-3 bg-[var(--mnx-surface)] border-t border-[var(--mnx-border)] space-y-3">
                                {recording ? (
                                  <>
                                    {/* Audio player */}
                                    <div className="space-y-2 p-2 bg-[var(--mnx-soft)] rounded-lg border border-[var(--mnx-border)]/40">
                                      <div className="flex items-center justify-between gap-3 min-w-0">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                          <span className="text-[9px] font-bold text-[var(--mnx-muted)] uppercase shrink-0">
                                            Recording:
                                          </span>
                                          <span
                                            className="text-[var(--mnx-muted)] text-[11px] truncate"
                                            title={recording.fileName}
                                          >
                                            {recording.fileName}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                              recording.uploadStatus ===
                                              "UPLOADED"
                                                ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]"
                                                : recording.uploadStatus ===
                                                    "UPLOADING"
                                                  ? "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent)] animate-pulse"
                                                  : recording.uploadStatus ===
                                                      "CANCELLED"
                                                    ? "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]"
                                                    : "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]"
                                            }`}
                                          >
                                            {recording.uploadStatus ===
                                            "UPLOADED"
                                              ? "UPLOADED SUCCESSFULLY"
                                              : recording.uploadStatus}
                                          </span>
                                          {recording.uploadStatus ===
                                            "UPLOADED" && (
                                            <a
                                              href={`/api/crm/recordings/${recording.id}/download`}
                                              className="text-[10px] text-[var(--mnx-accent)] font-bold uppercase hover:underline transition-all cursor-pointer"
                                              title="Download recording"
                                            >
                                              Download
                                            </a>
                                          )}
                                        </div>
                                      </div>

                                      {/* Audio playback component */}
                                      {recording.uploadStatus ===
                                        "UPLOADED" && (
                                        <audio
                                          src={`/api/crm/recordings/${recording.id}/playback`}
                                          controls
                                          className="w-full h-9 rounded-lg mt-1"
                                        />
                                      )}

                                      {/* Live Upload Progress Bar */}
                                      {recording.uploadStatus ===
                                        "UPLOADING" && (
                                        <div className="space-y-1">
                                          <div className="w-full bg-[var(--mnx-border)] h-1.5 rounded-full overflow-hidden">
                                            <div
                                              className="bg-[var(--mnx-accent)] h-1.5 rounded-full transition-all duration-300"
                                              style={{
                                                width: `${recording.uploadProgress || 0}%`,
                                              }}
                                            />
                                          </div>
                                          <div className="flex justify-between text-[9px] text-[var(--mnx-accent)] font-mono">
                                            <span>
                                              Uploading from mobile...
                                            </span>
                                            <span>
                                              {recording.uploadProgress || 0}%
                                            </span>
                                          </div>
                                        </div>
                                      )}

                                      {/* Error or Cancelled Notice */}
                                      {(recording.uploadStatus === "FAILED" ||
                                        recording.uploadStatus ===
                                          "CANCELLED") && (
                                        <div
                                          className={`text-[10px] p-2 rounded border space-y-1 ${
                                            recording.uploadStatus ===
                                            "CANCELLED"
                                              ? "text-[var(--mnx-warning)] bg-[var(--mnx-warning-bg)] border-[var(--mnx-warning)]"
                                              : "text-[var(--mnx-danger)] bg-[var(--mnx-danger-bg)] border-[var(--mnx-danger)]"
                                          }`}
                                        >
                                          <span className="font-bold uppercase text-[9px] block">
                                            {recording.uploadStatus ===
                                            "CANCELLED"
                                              ? "Upload Cancelled:"
                                              : "Upload Failure:"}
                                          </span>
                                          <p>
                                            {recording.errorMessage ||
                                              (recording.uploadStatus ===
                                              "CANCELLED"
                                                ? "The upload was cancelled by the user."
                                                : "The upload has failed.")}
                                          </p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Transcript sub-tabs */}
                                    <div className="flex gap-3 border-b border-[var(--mnx-border)]/30 pb-1">
                                      <CrmButton
                                        onClick={() =>
                                          setCallSubTab("TRANSCRIPT")
                                        }
                                        className={`text-[10px] font-bold uppercase tracking-wider pb-1 border-b-2 cursor-pointer ${
                                          callSubTab === "TRANSCRIPT"
                                            ? "border-[var(--mnx-accent)] text-[var(--mnx-text-strong)]"
                                            : "border-transparent text-[var(--mnx-muted)] hover:text-[var(--mnx-muted)]"
                                        }`}
                                      >
                                        AI Transcript
                                      </CrmButton>
                                      <CrmButton
                                        onClick={() => setCallSubTab("SUMMARY")}
                                        className={`text-[10px] font-bold uppercase tracking-wider pb-1 border-b-2 cursor-pointer ${
                                          callSubTab === "SUMMARY"
                                            ? "border-[var(--mnx-accent)] text-[var(--mnx-text-strong)]"
                                            : "border-transparent text-[var(--mnx-muted)] hover:text-[var(--mnx-muted)]"
                                        }`}
                                      >
                                        AI Summary
                                      </CrmButton>
                                    </div>

                                    {callSubTab === "TRANSCRIPT" && (
                                      <div>
                                        {transcript ? (
                                          <div className="p-3 bg-[var(--mnx-surface)] rounded-lg border border-[var(--mnx-border)]/30 max-h-[200px] overflow-y-auto whitespace-pre-line leading-relaxed text-[var(--mnx-muted)] text-[11px]">
                                            {transcript.transcriptText}
                                          </div>
                                        ) : (
                                          <p className="text-[var(--mnx-muted)] italic text-[11px]">
                                            Transcription{" "}
                                            {recording.transcriptionStatus?.toLowerCase() ||
                                              "pending"}
                                            ...
                                          </p>
                                        )}
                                      </div>
                                    )}

                                    {callSubTab === "SUMMARY" && (
                                      <div>
                                        {transcript ? (
                                          <div className="space-y-2">
                                            <div>
                                              <span className="font-bold text-[var(--mnx-muted)] uppercase text-[9px] block">
                                                AI Summary
                                              </span>
                                              <p className="text-[var(--mnx-muted)] text-[11px] mt-1 leading-normal">
                                                {transcript.summary}
                                              </p>
                                            </div>
                                            <div>
                                              <span className="font-bold text-[var(--mnx-muted)] uppercase text-[9px] block">
                                                Objections
                                              </span>
                                              <p
                                                className={`text-[11px] mt-1 font-bold ${transcript.objections === "None" ? "text-[var(--mnx-success)]" : "text-[var(--mnx-accent)]"}`}
                                              >
                                                {transcript.objections}
                                              </p>
                                            </div>
                                            <div>
                                              <span className="font-bold text-[var(--mnx-muted)] uppercase text-[9px] block">
                                                Follow-up Actions
                                              </span>
                                              <p className="text-[var(--mnx-muted)] text-[11px] mt-1">
                                                {transcript.followUpActions}
                                              </p>
                                            </div>
                                            <div className="flex gap-4">
                                              <div>
                                                <span className="font-bold text-[var(--mnx-muted)] uppercase text-[9px] block">
                                                  Sentiment
                                                </span>
                                                <span
                                                  className={`inline-block mt-1 font-extrabold uppercase text-[10px] px-2 py-0.5 rounded ${
                                                    transcript.sentiment ===
                                                    "POSITIVE"
                                                      ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)] border border-[var(--mnx-success)]"
                                                      : transcript.sentiment ===
                                                          "NEGATIVE"
                                                        ? "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)] border border-[var(--mnx-danger)]"
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
                                        ) : (
                                          <p className="text-[var(--mnx-muted)] italic text-[11px]">
                                            AI analysis pending transcription.
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-[var(--mnx-muted)] italic text-[11px]">
                                    No recording uploaded for this call attempt.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
        </div>
      </CrmSection>

      <CrmSection
        eyebrow="Commercial worksheet"
        title="Commercial workflow"
        description="The worksheet now unlocks stage by stage so users see only the next action instead of the whole process at once."
        actions={<CrmStatus variant="accent">Worksheet calculator</CrmStatus>}
      >
        <ServiceRateWorkflowPanel lead={lead} serviceType={serviceType} />
      </CrmSection>
    </div>
  );
}
