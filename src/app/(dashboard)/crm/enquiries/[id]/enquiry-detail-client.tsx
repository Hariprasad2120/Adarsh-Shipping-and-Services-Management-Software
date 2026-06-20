"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  assignLeadOwnerAction,
  updateLeadStatusAction,
  updatePerishableDetailsAction,
  saveEnquiryRatesAction,
  simulateInboundEmailAction,
  updateLeadAction,
  getCallAttemptsAction
} from "@/modules/crm/actions";
import { NotesPanel } from "../../_components/notes-panel";
import { AttachmentsPanel } from "../../_components/attachments-panel";
import { ActivitiesPanel } from "../../_components/activities-panel";
import { TimelinePanel } from "../../_components/timeline-panel";
import {
  ArrowLeft,
  Ship,
  Plane,
  Calendar,
  AlertTriangle,
  Clock,
  Sparkles,
  Eye,
  Briefcase,
  User,
  Info,
  RefreshCcw,
  Edit2,
  Trash2,
  Save,
  Mail,
  X,
  Plus
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
}

export function EnquiryDetailClient({
  lead,
  users,
  notes,
  attachments,
  activities,
  timeline,
  workTimeLogs,
  calls,
  isManager
}: EnquiryDetailClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "NOTES" | "ACTIVITIES" | "ATTACHMENTS" | "TIMELINE" | "TIME_TRACKER" | "CALLS">("OVERVIEW");
  const [selectedCallIndex, setSelectedCallIndex] = useState<number | null>(null);
  const [callSubTab, setCallSubTab] = useState<"TRANSCRIPT" | "SUMMARY" | "REVIEW">("TRANSCRIPT");

  const [localCalls, setLocalCalls] = useState(calls);

  useEffect(() => {
    setLocalCalls(calls);
  }, [calls]);

  useEffect(() => {
    const hasUploading = localCalls.some((c: any) => 
      c.recordings?.some((r: any) => r.uploadStatus === "UPLOADING")
    );

    const intervalTime = hasUploading ? 3000 : activeTab === "CALLS" ? 10000 : null;

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
  const [perishableType, setPerishableType] = useState(perishableDetails.cargoType || "Fruit/Vegetables");
  const [temperature, setTemperature] = useState(perishableDetails.tempCelsius || "");
  const [humidity, setHumidity] = useState(perishableDetails.humidityPercent || "");
  const [perishableRemarks, setPerishableRemarks] = useState(perishableDetails.specialRemarks || "");

  // Contact & Enquiry Details Edit state
  const [isEditingCargoDetails, setIsEditingCargoDetails] = useState(false);
  const enquiryDetails = (lead.enquiryDetails as any) || {};
  const [clientName, setClientName] = useState(enquiryDetails.clientName || `${lead.firstName || ""} ${lead.lastName || ""}`.trim());
  const [company, setCompany] = useState(lead.company || "");
  const [email, setEmail] = useState(lead.email || "");
  const [phone, setPhone] = useState(lead.phone || "");
  const [mobile, setMobile] = useState(lead.mobile || "");
  
  const [enquiryType, setEnquiryType] = useState<"Sea" | "Air">(enquiryDetails.type || "Sea");
  const [pol, setPol] = useState(enquiryDetails.pol || "");
  const [pod, setPod] = useState(enquiryDetails.pod || "");
  const [aol, setAol] = useState(enquiryDetails.aol || "");
  const [aod, setAod] = useState(enquiryDetails.aod || "");
  const [commodity, setCommodity] = useState(enquiryDetails.commodity || "");
  const [weight, setWeight] = useState(enquiryDetails.weight || "");
  const [incoterm, setIncoterm] = useState(enquiryDetails.incoterm || "FOB");
  const [planning, setPlanning] = useState(enquiryDetails.shipmentPlanning || "30 days");
  const [purpose, setPurpose] = useState(enquiryDetails.purpose || "Commercial");

  // Email simulation states
  const [simSubject, setSimSubject] = useState(`Re: Rates request [${lead.enquiryRef || "GEN-ENQ"}]`);
  const [simFromEmail, setSimFromEmail] = useState("agent.pricing@freightpartner.com");
  const [simBody, setSimBody] = useState(
    `Hello Team,\n\nHere are the rates matching your request ${lead.enquiryRef || "ADR-ENQ-XXXXX"}:\n\nOcean Freight charges is USD 1,200\nCFS Charges is Rs. 4,500\nCustoms Clearance rate is Rs. 3,500\nDO Charges is Rs. 1,800\n\nRegards,\nAgent Team`
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
      enquiry: lead.enquiryDetails
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
      specialRemarks: perishableRemarks
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
        followUpReminderDate: lead.followUpReminderDate
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
    const res = await simulateInboundEmailAction(simSubject, simBody, simFromEmail);
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
          "i"
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
      toast.success(`Successfully parsed ${Object.keys(results).length} rates!`);
      // Update local rates states if saved in lead rates sheet or prompt save
      const displayParsed = Object.entries(results)
        .map(([k, v]) => `${k}: ₹${v}`)
        .join("\n");
      alert(`Parsed Rates Results:\n\n${displayParsed}\n\nYou can input these below or trigger the simulated email to update the database.`);
    } else {
      toast.error("Could not parse any charges. Make sure the text matches patterns like 'Ocean Freight: 1200' or 'cfs charges is Rs. 3500'");
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-200">
      
      {/* Back button and page link bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/crm/enquiries"
          className="flex items-center gap-2 bg-[#161f28] hover:bg-[#1f2d3a] border-2 border-slate-700/30 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] hover:translate-y-[-1px] hover:translate-x-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          <span>Back to Enquiries</span>
        </Link>
        
        {/* Conversion to Quote Button */}
        <Link
          href={`/crm/quotes/new?leadId=${lead.id}`}
          className="flex items-center gap-2 bg-[#00cec4] hover:bg-[#00b8af] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 border-[#00cec4] shadow-[2px_2px_0px_0px_#008f88] hover:translate-y-[-1px] hover:translate-x-[-1px] hover:shadow-[3px_3px_0px_0px_#008f88] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none cursor-pointer"
        >
          <RefreshCcw className="size-4" />
          <span>Convert as Quote</span>
        </Link>
      </div>

      {/* ─── STATUS CONTROL & ASSIGNMENT PANEL ─── */}
      <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a] shadow-[4px_4px_0px_0px_rgba(0,206,196,0.15)] hover:shadow-[6px_6px_0px_0px_rgba(0,206,196,0.22)] transition-all duration-200 flex flex-col xl:flex-row xl:items-center justify-between gap-6 card-left-accent">
        
        {/* Left Side: status info */}
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#00cec4]/10 text-[#00cec4] border border-[#00cec4]/20 font-mono">
              Ref: {lead.enquiryRef || "GEN-ENQ"}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              lead.status === "FOLLOW_UP"
                ? "bg-[#fb923c]/15 text-[#fb923c] border border-[#fb923c]/20"
                : "bg-[#00cec4]/15 text-[#00cec4] border border-[#00cec4]/20"
            }`}>
              {lead.status === "FOLLOW_UP" ? "Follow Up Active" : "Interested Enquiry"}
            </span>
          </div>
          <h2 className="text-xl font-bold uppercase text-white font-sans tracking-wide">
            {lead.firstName ? `${lead.firstName} ` : ""}{lead.lastName}
          </h2>
          <p className="text-xs text-slate-400">
            Current Owner: <span className="text-white font-medium">{lead.owner?.name || "Unassigned"}</span> ({lead.owner?.email || "N/A"})
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Status conversion button */}
          {lead.status === "INTERESTED" && (
            <button
              onClick={() => setIsMarkingFollowUp(true)}
              className="flex items-center gap-2 bg-[#fb923c] hover:bg-[#f97316] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 border-[#fb923c] shadow-[2px_2px_0px_0px_#c2410c] hover:translate-y-[-1px] hover:translate-x-[-1px] hover:shadow-[3px_3px_0px_0px_#c2410c] active:translate-y-[2px] active:translate-x-[2px] active:shadow-none cursor-pointer"
            >
              <Clock className="size-4" />
              <span>Schedule Follow Up</span>
            </button>
          )}

          {/* Manager Reassignment Dropdown */}
          {lead.status === "FOLLOW_UP" && isManager && (
            <div className="flex items-center gap-2 p-2 bg-[#161f28] rounded-xl border border-[#1c212a] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-2">Assign Owner:</span>
              <select
                value={selectedOwnerId}
                onChange={(e) => setSelectedOwnerId(e.target.value)}
                className="bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white px-2 py-1.5 focus:outline-none focus:border-[#00cec4]"
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAssignOwner}
                disabled={isAssigning}
                className="px-3 py-1.5 bg-[#00cec4] hover:bg-[#00b8af] disabled:opacity-50 text-white rounded-lg text-xs font-bold uppercase tracking-wide cursor-pointer"
              >
                {isAssigning ? "Saving..." : "Apply"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mark as Follow Up Popup / Expandable Area */}
      {isMarkingFollowUp && (
        <form onSubmit={handleMarkAsFollowUp} className="p-6 rounded-xl bg-[#0f1319] border border-[#fb923c]/40 space-y-4 animate-in slide-in-from-top-4 duration-200 card-left-accent-orange">
          <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-2">
            <h3 className="font-bold text-xs text-[#fb923c] uppercase tracking-wider flex items-center gap-2">
              <Clock className="size-4" />
              <span>Schedule Sales Follow Up</span>
            </h3>
            <button type="button" onClick={() => setIsMarkingFollowUp(false)} className="text-slate-500 hover:text-white p-1">
              <X className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Follow up Reminder Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#fb923c]/40 rounded-lg text-xs text-white focus:outline-none focus:border-[#fb923c]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Follow up Call Remarks / Directives *</label>
              <textarea
                rows={2}
                required
                value={followUpRemarks}
                onChange={(e) => setFollowUpRemarks(e.target.value)}
                placeholder="Call outcome, notes, and specific follow-up actions required..."
                className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#fb923c]/40 rounded-lg text-xs text-white focus:outline-none focus:border-[#fb923c] placeholder-slate-600"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsMarkingFollowUp(false)}
              className="px-4 py-2 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] text-slate-300 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#fb923c] hover:bg-[#f97316] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-[#fb923c]/15"
            >
              {isSubmitting ? "Scheduling..." : "Confirm Schedule & Save"}
            </button>
          </div>
        </form>
      )}

      {/* Split detail grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column details (Cargo, Rates, Simulation) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* General Cargo & Client details card */}
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a] shadow-[4px_4px_0px_0px_rgba(0,206,196,0.1)] space-y-4">
            <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-3 mb-2">
              <div className="flex items-center gap-3">
                <Info className="size-4.5 text-[#00cec4]" />
                <h3 className="font-bold text-sm text-white uppercase tracking-wider">Enquiry & Cargo Details</h3>
              </div>
              <button
                onClick={() => setIsEditingCargoDetails(!isEditingCargoDetails)}
                className="flex items-center gap-1.5 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] hover:border-[#00cec4]/50 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                {isEditingCargoDetails ? <X className="size-3.5" /> : <Edit2 className="size-3.5" />}
                <span>{isEditingCargoDetails ? "Cancel" : "Edit Details"}</span>
              </button>
            </div>

            {isEditingCargoDetails ? (
              <form onSubmit={handleSaveCargoDetails} className="space-y-4">
                
                {/* Contact Sub-Grid */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-[#00cec4] uppercase tracking-wide block font-sans border-b border-[#1c212a]/20 pb-1">Client Contact Info</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Client Name</label>
                      <input
                        type="text"
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Company</label>
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Phone</label>
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Mobile</label>
                        <input
                          type="text"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cargo Details Sub-Grid */}
                <div className="space-y-3 pt-2">
                  <span className="text-[10px] font-bold text-[#00cec4] uppercase tracking-wide block font-sans border-b border-[#1c212a]/20 pb-1">Cargo Details & Route</span>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Cargo Mode</label>
                      <select
                        value={enquiryType}
                        onChange={(e) => setEnquiryType(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white"
                      >
                        <option value="Sea">Sea Enquiry</option>
                        <option value="Air">Air Enquiry</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Commodity</label>
                      <input
                        type="text"
                        value={commodity}
                        onChange={(e) => setCommodity(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Weight / Packages</label>
                      <input
                        type="text"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>
                  
                  {enquiryType === "Sea" ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">POL (Port of Loading)</label>
                        <input
                          type="text"
                          value={pol}
                          onChange={(e) => setPol(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">POD (Port of Discharge)</label>
                        <input
                          type="text"
                          value={pod}
                          onChange={(e) => setPod(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">AOL (Airport of Loading)</label>
                        <input
                          type="text"
                          value={aol}
                          onChange={(e) => setAol(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">AOD (Airport of Discharge)</label>
                        <input
                          type="text"
                          value={aod}
                          onChange={(e) => setAod(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Incoterm</label>
                      <input
                        type="text"
                        value={incoterm}
                        onChange={(e) => setIncoterm(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Shipment Planning</label>
                      <input
                        type="text"
                        value={planning}
                        onChange={(e) => setPlanning(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Purpose of Cargo</label>
                      <input
                        type="text"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[#1c212a]/30">
                  <button
                    type="button"
                    onClick={() => setIsEditingCargoDetails(false)}
                    className="px-4 py-2 bg-[#161f28] border border-[#1c212a] text-slate-300 rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-5 py-2 bg-[#00cec4] hover:bg-[#00b8af] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-[#00cec4]/15"
                  >
                    <Save className="size-3.5" />
                    <span>{isSubmitting ? "Saving..." : "Save Details"}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Client Actual Name</span>
                  <span className="text-white font-medium">{clientName}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Business Name</span>
                  <span className="text-white font-medium">{company || "Direct Client"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Email Address</span>
                  <span className="text-white font-medium">{email || "Not Specified"}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Phone & Mobile</span>
                  <span className="text-white font-medium">
                    {phone && `Phone: ${phone}`}{phone && mobile && " | "}{mobile && `Mobile: ${mobile}`}{!phone && !mobile && "Not Specified"}
                  </span>
                </div>
                
                <div className="md:col-span-2 border-t border-[#1c212a]/30 pt-3 mt-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Cargo Mode & Incoterm</span>
                    <span className="text-white font-medium uppercase">{enquiryType} ({incoterm})</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Commodity & Weight</span>
                    <span className="text-white font-medium">{commodity || "Not Specified"} • {weight || "Not Specified"}</span>
                  </div>
                  
                  {enquiryType === "Sea" ? (
                    <div className="md:col-span-2 space-y-1">
                      <span className="text-[11px] font-bold text-[#00cec4] uppercase tracking-wider block font-mono">Routing (Sea POL ➔ POD)</span>
                      <span className="text-white font-bold text-sm">{pol || "N/A"} ➔ {pod || "N/A"}</span>
                    </div>
                  ) : (
                    <div className="md:col-span-2 space-y-1">
                      <span className="text-[11px] font-bold text-[#00cec4] uppercase tracking-wider block font-mono">Routing (Air AOL ➔ AOD)</span>
                      <span className="text-white font-bold text-sm">{aol || "N/A"} ➔ {aod || "N/A"}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Shipment Planning Window</span>
                    <span className="text-white font-medium">{planning}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Purpose of Shipment</span>
                    <span className="text-white font-medium">{purpose}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Perishable Cargo Card (displays always if lead.isPerishable is true, or provides toggle) */}
          {lead.isPerishable && (
            <div className="p-6 rounded-xl bg-[#0f1319] border border-[#fb923c]/40 shadow-[4px_4px_0px_0px_rgba(251,146,60,0.15)] space-y-4 card-left-accent-orange">
              <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-3 mb-2">
                <div className="flex items-center gap-3">
                  <span className="size-8 rounded-lg bg-[#fb923c]/10 text-[#fb923c] flex items-center justify-center text-base">
                    ❄️
                  </span>
                  <h3 className="font-bold text-sm text-white uppercase tracking-wider">Perishable Cargo Parameters</h3>
                </div>
                <button
                  onClick={() => setIsEditingPerishables(!isEditingPerishables)}
                  className="flex items-center gap-1.5 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] hover:border-[#fb923c]/50 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  {isEditingPerishables ? <X className="size-3.5" /> : <Edit2 className="size-3.5" />}
                  <span>{isEditingPerishables ? "Cancel" : "Edit Parameters"}</span>
                </button>
              </div>

              {isEditingPerishables ? (
                <form onSubmit={handleSavePerishables} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Cargo Category</label>
                      <select
                        value={perishableType}
                        onChange={(e) => setPerishableType(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#fb923c]"
                      >
                        <option value="Fruit/Vegetables">Fruit & Vegetables</option>
                        <option value="Meat/Poultry">Meat & Poultry</option>
                        <option value="Seafood">Fresh Seafood</option>
                        <option value="Pharmaceuticals">Pharmaceuticals / Medicine</option>
                        <option value="Chemicals">Temperature-sensitive Chemicals</option>
                        <option value="Dairy">Dairy Products</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Required Temp (°C)</label>
                      <input
                        type="text"
                        value={temperature}
                        onChange={(e) => setTemperature(e.target.value)}
                        placeholder="e.g. 2 to 8"
                        className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#fb923c]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Humidity Control (%)</label>
                      <input
                        type="text"
                        value={humidity}
                        onChange={(e) => setHumidity(e.target.value)}
                        placeholder="e.g. 85%"
                        className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#fb923c]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Special Handling Remarks / Ventilation</label>
                    <textarea
                      rows={2}
                      value={perishableRemarks}
                      onChange={(e) => setPerishableRemarks(e.target.value)}
                      placeholder="Specify container ventilation settings, pre-cooling requirements, or emergency instructions..."
                      className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#fb923c] placeholder-slate-600"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditingPerishables(false)}
                      className="px-4 py-2 bg-[#161f28] border border-[#1c212a] text-slate-300 rounded-lg text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center gap-1.5 px-5 py-2 bg-[#fb923c] hover:bg-[#f97316] text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-[#fb923c]/15"
                    >
                      <Save className="size-3.5" />
                      <span>{isSubmitting ? "Saving..." : "Save Parameters"}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Cargo Category</span>
                    <span className="text-white font-semibold">{perishableType}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Operating Temp</span>
                    <span className="text-[#fb923c] font-bold block ds-numeric">{temperature || "Ambient"} °C</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Humidity Target</span>
                    <span className="text-white font-medium block ds-numeric">{humidity || "N/A"}</span>
                  </div>
                  <div className="col-span-3 border-t border-[#1c212a]/30 pt-3 mt-1 space-y-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Ventilation & Airflow Remarks</span>
                    <p className="text-xs text-slate-300 bg-[#0a0d12]/40 p-2.5 rounded-lg border border-[#1c212a]/20 leading-relaxed italic">
                      {perishableRemarks || "No special handling instructions logged."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pricing Worksheet Card */}
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a] shadow-[4px_4px_0px_0px_rgba(0,206,196,0.1)] space-y-4">
            <div className="flex items-center justify-between border-b border-[#1c212a]/30 pb-3 mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Rates & Costing Worksheet
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#00cec4]/10 text-[#00cec4] border border-[#00cec4]/20 font-mono">
                Worksheet Calculator
              </span>
            </div>

            <LocalRatesWorksheet lead={lead} />
          </div>

          {/* Email Parsing & Simulation Panel */}
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a] shadow-[4px_4px_0px_0px_rgba(0,206,196,0.1)] space-y-6">
            
            {/* Headers */}
            <div className="border-b border-[#1c212a]/30 pb-3">
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">Inbound Email Rate Parser & Simulator</h3>
              <p className="text-xs text-slate-500 mt-1">
                Verify automatic pricing extraction by pasting pricing feedback or simulating agent inbound email threads containing reference code.
              </p>
            </div>

            {/* Paste box tool */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-[#00cec4] uppercase tracking-wide block font-mono">1. Direct Text Paste Parser (Test Regex)</span>
              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste raw quote email text here. E.g., 'Ocean Freight: 1500 USD, CFS Charges: 4000 INR...'"
                  className="w-full px-3 py-2 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#00cec4] placeholder-slate-600"
                />
                <button
                  type="button"
                  onClick={handleParsePasteText}
                  disabled={isParsingPaste || !pasteText.trim()}
                  className="px-4 py-2 bg-[#161f28] hover:bg-[#1f2d3a] border border-[#1c212a] hover:border-[#00cec4] text-slate-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  {isParsingPaste ? "Extracting..." : "Parse Text & Test"}
                </button>
              </div>
            </div>

            {/* Simulation form */}
            <div className="space-y-3 pt-3 border-t border-[#1c212a]/30">
              <span className="text-[10px] font-bold text-[#fb923c] uppercase tracking-wide block font-mono">2. Simulate Inbound Agent Reply Email (Database Update)</span>
              <form onSubmit={handleSimulateEmail} className="space-y-3 bg-[#0a0d12]/40 p-4 rounded-xl border border-[#1c212a]/40">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">From Address</label>
                    <input
                      type="text"
                      required
                      value={simFromEmail}
                      onChange={(e) => setSimFromEmail(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#fb923c]"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Email Subject Line (Ref Required)</label>
                    <input
                      type="text"
                      required
                      value={simSubject}
                      onChange={(e) => setSimSubject(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#fb923c]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide mb-1">Email Body Content</label>
                  <textarea
                    rows={4}
                    required
                    value={simBody}
                    onChange={(e) => setSimBody(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-xs text-white focus:outline-none focus:border-[#fb923c] font-mono leading-relaxed"
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSimulatingEmail}
                    className="flex items-center gap-2 bg-[#fb923c] hover:bg-[#f97316] text-white px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    <Mail className="size-3.5" />
                    <span>{isSimulatingEmail ? "Processing Simulation..." : "Trigger Simulation"}</span>
                  </button>
                </div>
              </form>
            </div>

          </div>

        </div>

        {/* Right column details (Timeline, Activities, Notes) */}
        <div className="space-y-6 col-span-1">
          
          {/* Follow-up Reminder Details Card */}
          {lead.isFutureFollowUp && lead.followUpReminderDate && (
            <div className="p-6 rounded-xl bg-[#0f1319] border border-[#fb923c]/40 shadow-[4px_4px_0px_0px_rgba(251,146,60,0.15)] space-y-3 card-top-accent-orange">
              <span className="text-[10px] font-bold text-[#fb923c] uppercase tracking-widest block font-sans">Follow-up Alarm</span>
              <div className="flex items-center gap-2 text-white">
                <Clock className="size-4.5 text-[#fb923c] shrink-0" />
                <span className="font-bold text-sm ds-numeric">
                  {new Date(lead.followUpReminderDate).toLocaleString("en-IN")}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 italic">
                A sales reminder is active. Mark the lead interested or converted to clear active follow-up directives.
              </p>
            </div>
          )}

          {/* Related lists tabs container */}
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a] shadow-[4px_4px_0px_0px_rgba(0,206,196,0.08)] space-y-6">
            
            {/* Nav pills */}
            <div className="flex border-b border-[#1c212a]/40 pb-1 gap-4 overflow-x-auto select-none">
              <button
                onClick={() => setActiveTab("OVERVIEW")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === "OVERVIEW" ? "border-[#00cec4] text-white" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Summary
              </button>
              <button
                onClick={() => setActiveTab("NOTES")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === "NOTES" ? "border-[#00cec4] text-white" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Notes ({notes.length})
              </button>
              <button
                onClick={() => setActiveTab("ACTIVITIES")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === "ACTIVITIES" ? "border-[#00cec4] text-white" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Tasks ({activities.length})
              </button>
              <button
                onClick={() => setActiveTab("TIMELINE")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === "TIMELINE" ? "border-[#00cec4] text-white" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Audit
              </button>
              <button
                onClick={() => setActiveTab("TIME_TRACKER")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === "TIME_TRACKER" ? "border-[#00cec4] text-white" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Time Tracker ({workTimeLogs.length})
              </button>
              <button
                onClick={() => setActiveTab("CALLS")}
                className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${
                  activeTab === "CALLS" ? "border-[#00cec4] text-white" : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Calls ({calls.length})
              </button>
            </div>

            {/* Content areas */}
            <div className="space-y-4 text-xs">
              {activeTab === "OVERVIEW" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-[#0a0d12]/50 rounded-xl space-y-2 border border-[#1c212a]/30">
                    <span className="font-bold text-white block uppercase tracking-wider">Enquiry Logging Details</span>
                    <p className="text-slate-400 leading-relaxed">
                      This enquiry record was qualified on {new Date(lead.updatedAt).toLocaleDateString("en-IN")}. Standard validation rules apply before quoting.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-slate-400">
                    <div>
                      <span className="font-semibold text-slate-500 block uppercase text-[9px]">Source</span>
                      <span className="text-slate-200">{lead.source || "Direct"}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500 block uppercase text-[9px]">Qualified At</span>
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

              {activeTab === "TIMELINE" && (
                <TimelinePanel events={timeline} />
              )}

              {/* ── TIME TRACKER TAB ── */}
              {activeTab === "TIME_TRACKER" && (
                <div className="space-y-3">
                  {workTimeLogs.length === 0 ? (
                    <p className="text-slate-500 italic py-4 text-center">No time logs recorded for this enquiry yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {workTimeLogs.map((log: any, i: number) => (
                        <div key={log.id || i} className="p-3 bg-[#0a0d12]/50 rounded-lg border border-[#1c212a]/30 flex items-start justify-between">
                          <div>
                            <span className="text-white font-bold text-xs">{log.user?.name || "Unknown"}</span>
                            <span className="text-slate-500 text-[10px] ml-2">{log.activityType || "General"}</span>
                            {log.description && (
                              <p className="text-slate-400 text-[11px] mt-1">{log.description}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[#00cec4] font-bold font-mono text-sm">{log.durationHours}h</span>
                            <span className="text-slate-500 text-[10px] block">
                              {new Date(log.loggedAt).toLocaleDateString("en-IN")}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div className="text-right pt-2 border-t border-[#1c212a]/30">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Total: </span>
                        <span className="text-white font-bold font-mono">
                          {workTimeLogs.reduce((sum: number, l: any) => sum + (l.durationHours || 0), 0).toFixed(1)}h
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
                    <p className="text-slate-500 italic py-4 text-center">No call recordings for this enquiry yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {/* Call attempt list */}
                      {localCalls.map((call: any, idx: number) => {
                        const recording = call.recordings?.[0];
                        const transcript = recording?.transcript;
                        const isExpanded = selectedCallIndex === idx;

                        return (
                          <div key={call.id} className="rounded-lg border border-[#1c212a]/40 overflow-hidden">
                            {/* Call header */}
                            <button
                              onClick={() => setSelectedCallIndex(isExpanded ? null : idx)}
                              className="w-full p-3 bg-[#0a0d12]/50 flex items-center justify-between text-left hover:bg-[#161f28] transition-all cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <span className="size-8 rounded-lg bg-[#00cec4]/10 text-[#00cec4] flex items-center justify-center text-xs">📞</span>
                                <div>
                                  <span className="text-white font-bold text-xs block">
                                    {call.salesperson?.name || "Salesperson"}
                                  </span>
                                  <span className="text-slate-500 text-[10px]">
                                    {call.customerPhone} • {new Date(call.callStartedAt).toLocaleString("en-IN")}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {call.durationSeconds && (
                                  <span className="text-[#00cec4] font-mono font-bold text-xs">
                                    {Math.floor(call.durationSeconds / 60)}:{String(call.durationSeconds % 60).padStart(2, "0")}
                                  </span>
                                )}
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  (call.status === "COMPLETED" || recording?.uploadStatus === "UPLOADED") ? "bg-emerald-400/10 text-emerald-400" :
                                  recording?.uploadStatus === "UPLOADING" ? "bg-cyan-400/10 text-[#00cec4]" :
                                  recording?.uploadStatus === "CANCELLED" ? "bg-amber-400/10 text-amber-400" :
                                  recording?.uploadStatus === "FAILED" ? "bg-red-400/10 text-red-400" :
                                  call.status === "PENDING" ? "bg-amber-400/10 text-amber-400" :
                                  "bg-slate-400/10 text-slate-400"
                                }`}>
                                  {
                                    recording?.uploadStatus === "UPLOADED" ? "COMPLETED" :
                                    recording?.uploadStatus === "UPLOADING" ? "UPLOADING" :
                                    recording?.uploadStatus === "CANCELLED" ? "CANCELLED" :
                                    recording?.uploadStatus === "FAILED" ? "FAILED" :
                                    call.status
                                  }
                                </span>
                                <span className="text-slate-500">{isExpanded ? "▲" : "▼"}</span>
                              </div>
                            </button>

                            {/* Expanded: recording + transcript */}
                            {isExpanded && (
                              <div className="p-3 bg-[#0f1319] border-t border-[#1c212a]/30 space-y-3">
                                {recording ? (
                                  <>
                                    {/* Audio player */}
                                    <div className="space-y-2 p-2 bg-[#11161d] rounded-lg border border-[#1c212a]/30">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[9px] font-bold text-slate-500 uppercase">Recording:</span>
                                          <span className="text-slate-300 text-[11px]">{recording.fileName}</span>
                                        </div>
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                          recording.uploadStatus === "UPLOADED" ? "bg-emerald-400/10 text-emerald-400" :
                                          recording.uploadStatus === "UPLOADING" ? "bg-cyan-400/10 text-[#00cec4] animate-pulse" :
                                          recording.uploadStatus === "CANCELLED" ? "bg-amber-400/10 text-amber-400" :
                                          "bg-red-400/10 text-red-400"
                                        }`}>
                                          {recording.uploadStatus === "UPLOADED" ? "UPLOADED SUCCESSFULLY" : recording.uploadStatus}
                                        </span>
                                      </div>

                                      {/* Live Upload Progress Bar */}
                                      {recording.uploadStatus === "UPLOADING" && (
                                        <div className="space-y-1">
                                          <div className="w-full bg-[#1c212a] h-1.5 rounded-full overflow-hidden">
                                            <div
                                              className="bg-[#00cec4] h-1.5 rounded-full transition-all duration-300"
                                              style={{ width: `${recording.uploadProgress || 0}%` }}
                                            />
                                          </div>
                                          <div className="flex justify-between text-[9px] text-[#00cec4] font-mono">
                                            <span>Uploading from mobile...</span>
                                            <span>{recording.uploadProgress || 0}%</span>
                                          </div>
                                        </div>
                                      )}

                                      {/* Error or Cancelled Notice */}
                                      {(recording.uploadStatus === "FAILED" || recording.uploadStatus === "CANCELLED") && (
                                        <div className={`text-[10px] p-2 rounded border space-y-1 ${
                                          recording.uploadStatus === "CANCELLED"
                                            ? "text-amber-400 bg-amber-400/5 border-amber-400/10"
                                            : "text-red-400 bg-red-400/5 border-red-400/10"
                                        }`}>
                                          <span className="font-bold uppercase text-[9px] block">
                                            {recording.uploadStatus === "CANCELLED" ? "Upload Cancelled:" : "Upload Failure:"}
                                          </span>
                                          <p>{recording.errorMessage || (recording.uploadStatus === "CANCELLED" ? "The upload was cancelled by the user." : "The upload has failed.")}</p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Transcript sub-tabs */}
                                    <div className="flex gap-3 border-b border-[#1c212a]/30 pb-1">
                                      <button
                                        onClick={() => setCallSubTab("TRANSCRIPT")}
                                        className={`text-[10px] font-bold uppercase tracking-wider pb-1 border-b-2 cursor-pointer ${
                                          callSubTab === "TRANSCRIPT" ? "border-[#00cec4] text-white" : "border-transparent text-slate-500 hover:text-slate-300"
                                        }`}
                                      >
                                        AI Transcript
                                      </button>
                                      <button
                                        onClick={() => setCallSubTab("SUMMARY")}
                                        className={`text-[10px] font-bold uppercase tracking-wider pb-1 border-b-2 cursor-pointer ${
                                          callSubTab === "SUMMARY" ? "border-[#00cec4] text-white" : "border-transparent text-slate-500 hover:text-slate-300"
                                        }`}
                                      >
                                        AI Summary
                                      </button>
                                    </div>

                                    {callSubTab === "TRANSCRIPT" && (
                                      <div>
                                        {transcript ? (
                                          <div className="p-3 bg-[#11161d] rounded-lg border border-[#1c212a]/30 max-h-[200px] overflow-y-auto whitespace-pre-line leading-relaxed text-slate-300 text-[11px]">
                                            {transcript.transcriptText}
                                          </div>
                                        ) : (
                                          <p className="text-slate-500 italic text-[11px]">Transcription {recording.transcriptionStatus?.toLowerCase() || "pending"}...</p>
                                        )}
                                      </div>
                                    )}

                                    {callSubTab === "SUMMARY" && (
                                      <div>
                                        {transcript ? (
                                          <div className="space-y-2">
                                            <div>
                                              <span className="font-bold text-slate-500 uppercase text-[9px] block">AI Summary</span>
                                              <p className="text-slate-200 text-[11px] mt-1 leading-normal">{transcript.summary}</p>
                                            </div>
                                            <div>
                                              <span className="font-bold text-slate-500 uppercase text-[9px] block">Objections</span>
                                              <p className={`text-[11px] mt-1 font-bold ${transcript.objections === "None" ? "text-emerald-400" : "text-[#fb923c]"}`}>
                                                {transcript.objections}
                                              </p>
                                            </div>
                                            <div>
                                              <span className="font-bold text-slate-500 uppercase text-[9px] block">Follow-up Actions</span>
                                              <p className="text-slate-200 text-[11px] mt-1">{transcript.followUpActions}</p>
                                            </div>
                                            <div className="flex gap-4">
                                              <div>
                                                <span className="font-bold text-slate-500 uppercase text-[9px] block">Sentiment</span>
                                                <span className={`inline-block mt-1 font-extrabold uppercase text-[10px] px-2 py-0.5 rounded ${
                                                  transcript.sentiment === "POSITIVE"
                                                    ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                                                    : transcript.sentiment === "NEGATIVE"
                                                    ? "bg-red-400/10 text-red-400 border border-red-400/20"
                                                    : "bg-slate-400/10 text-slate-400 border border-slate-400/20"
                                                }`}>
                                                  {transcript.sentiment}
                                                </span>
                                              </div>
                                              <div>
                                                <span className="font-bold text-slate-500 uppercase text-[9px] block">Quality Score</span>
                                                <span className="text-white mt-1 font-extrabold text-[13px] block font-mono">
                                                  {transcript.qualityScore}%
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <p className="text-slate-500 italic text-[11px]">AI analysis pending transcription.</p>
                                        )}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-slate-500 italic text-[11px]">No recording uploaded for this call attempt.</p>
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
          </div>

        </div>

      </div>

    </div>
  );
}

// Internal rates sheet client rendering with manual saves
function LocalRatesWorksheet({ lead }: { lead: any }) {
  const router = useRouter();
  const isSea = lead.enquiryDetails.type === "Sea";
  const isImportLcl = isSea && lead.enquiryDetails.seaType === "Import" && lead.enquiryDetails.seaLclFcl === "LCL";
  const volume = parseFloat(lead.enquiryDetails.cbm) || 0;

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
  useEffect(() => {
    if (isImportLcl && !initialRates.doCharges) {
      setDoCharges(volume < 3 ? 1000 : parseInt(lclDoOption));
    }
  }, [lclDoOption, isImportLcl, volume, initialRates.doCharges]);

  useEffect(() => {
    if (isImportLcl && !initialRates.lclCharges) {
      setLclCharges(calculatedLclAmount);
    }
  }, [calculatedLclAmount, isImportLcl, initialRates.lclCharges]);

  // Sync state values when database gets updated in background (e.g. from simulated email replies)
  useEffect(() => {
    if (initialRates) {
      setOceanFreight(initialRates.oceanFreight ?? 0);
      setCfsCharges(initialRates.cfsCharges ?? 0);
      setCustomsClearance(initialRates.customsClearance ?? 0);
      setBlCharges(initialRates.blCharges ?? 0);
      setVgmCharges(initialRates.vgmCharges ?? 0);
      setLclCharges(initialRates.lclCharges ?? (isImportLcl ? calculatedLclAmount : 0));
      setDoCharges(initialRates.doCharges ?? (isImportLcl ? calculatedDoAmount : 0));
      setCfsCustoms(initialRates.cfsCustoms ?? 0);
      setAirFreight(initialRates.airFreight ?? 0);
      setHandlingCharges(initialRates.handlingCharges ?? 0);
      setAwbCharges(initialRates.awbCharges ?? 0);
      setDeliveryCharges(initialRates.deliveryCharges ?? 0);
    }
  }, [lead.enquiryDetails]);

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
                  <span className="text-[9px] text-[#00cec4] font-medium font-sans">
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
                        name="do_option_local"
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
                        name="do_option_local"
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
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">CFS Customs (INR)</label>
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
          Total Estimated Rates: <span className="text-[#00cec4] font-bold ds-numeric">₹{calculateTotal().toLocaleString("en-IN")}</span>
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2 bg-[#00cec4] hover:bg-[#00b8af] disabled:opacity-50 text-white rounded-lg text-xs font-bold uppercase tracking-wide transition-all cursor-pointer shadow-md shadow-[#00cec4]/15 hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)]"
        >
          {isSaving ? "Saving Worksheet..." : "Save Worksheet Rates"}
        </button>
      </div>
    </form>
  );
}
