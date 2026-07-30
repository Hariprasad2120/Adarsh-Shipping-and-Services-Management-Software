"use client";

import {
  CrmButton,
  CrmDialogLayer,
  CrmInput,
  CrmTextarea,
} from "@/components/monolith/crm-workspace";

import { NativeSelect } from "@/components/monolith/native-select";
import React, { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { updateLeadStatusAction } from "@/modules/crm/actions";
import { X, Ship, Plane, Info } from "lucide-react";

interface InterestedModalProps {
  leadId: string;
  lead: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function InterestedModal({
  leadId,
  lead,
  onClose,
  onSuccess,
}: InterestedModalProps) {
  const [activeTab, setActiveTab] = useState<"Sea" | "Air">("Sea");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPerishable, setIsPerishable] = useState(false);
  const [isFutureFollowUp, setIsFutureFollowUp] = useState(false);
  const [followUpReminderDate, setFollowUpReminderDate] = useState("");

  // Sea Enquiry States
  const [seaType, setSeaType] = useState<"Import" | "Export">("Import");
  const [seaLclFcl, setSeaLclFcl] = useState<"LCL" | "FCL">("LCL");
  const [pol, setPol] = useState("");
  const [pod, setPod] = useState("");
  const [seaCommodity, setSeaCommodity] = useState("");
  const [seaWeight, setSeaWeight] = useState("");
  const [seaCbm, setSeaCbm] = useState(""); // CBM field for LCL rates calculation
  const [seaDimensions, setSeaDimensions] = useState("");
  const [seaPackages, setSeaPackages] = useState("");
  const [seaIncoterm, setSeaIncoterm] = useState("FOB");
  const [seaClientName, setSeaClientName] = useState(
    `${lead.firstName || ""} ${lead.lastName || ""}`.trim(),
  );
  const [seaBusinessName, setSeaBusinessName] = useState(lead.company || "");
  const [seaLocation, setSeaLocation] = useState(lead.city || "");
  const [seaShipmentPlanning, setSeaShipmentPlanning] = useState("30 days");
  const [seaShipmentsDone, setSeaShipmentsDone] = useState<"Yes" | "No">("Yes");
  const [seaPurpose, setSeaPurpose] = useState("Commercial");

  // Air Enquiry States
  const [aol, setAol] = useState("");
  const [aod, setAod] = useState("");
  const [airCommodity, setAirCommodity] = useState("");
  const [airWeight, setAirWeight] = useState("");
  const [airWeightUnit, setAirWeightUnit] = useState("KG");
  const [airDimensions, setAirDimensions] = useState("");
  const [airDimensionsUnit, setAirDimensionsUnit] = useState("Cm");
  const [airPackages, setAirPackages] = useState("");
  const [airPackagesUnit, setAirPackagesUnit] = useState("PKG");
  const [airIncoterm, setAirIncoterm] = useState("EXW");
  const [airClientName, setAirClientName] = useState(
    `${lead.firstName || ""} ${lead.lastName || ""}`.trim(),
  );
  const [airBusinessName, setAirBusinessName] = useState(lead.company || "");
  const [airLocation, setAirLocation] = useState(lead.city || "");
  const [airShipmentPlanning, setAirShipmentPlanning] = useState("30 days");
  const [airShipmentsDone, setAirShipmentsDone] = useState<"Yes" | "No">("Yes");
  const [airPurpose, setAirPurpose] = useState("Commercial");
  const [changeRemarks, setChangeRemarks] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [changeRemarks]);

  const handleFillDemo = () => {
    if (activeTab === "Sea") {
      setPol("Shanghai, China");
      setPod("Chennai, India");
      setSeaCommodity("Automotive Parts");
      setSeaWeight("1500 KG");
      setSeaCbm("2.5");
      setSeaDimensions("20FT General");
      setSeaPackages("12 boxes");
      setSeaIncoterm("FOB");
      setSeaLocation("Chennai Port");
      setSeaShipmentPlanning("30 days");
      setSeaShipmentsDone("Yes");
      setSeaPurpose("Commercial Manufacturing");
      toast.success("Sea enquiry demo data filled!");
    } else {
      setAol("London Heathrow (LHR)");
      setAod("Chennai International (MAA)");
      setAirCommodity("Electronic Components");
      setAirWeight("250");
      setAirWeightUnit("KG");
      setAirDimensions("120x80x80");
      setAirDimensionsUnit("Cm");
      setAirPackages("3");
      setAirPackagesUnit("pallet");
      setAirIncoterm("EXW");
      setAirLocation("Chennai Air Cargo");
      setAirShipmentPlanning("7 days");
      setAirShipmentsDone("Yes");
      setAirPurpose("Retail Distribution");
      toast.success("Air enquiry demo data filled!");
    }
  };

  const incotermOptions = [
    "EXW",
    "FOB",
    "CIF",
    "CFR",
    "DDP",
    "DAP",
    "FCA",
    "CPT",
    "CIP",
  ];
  const planningOptions = ["7 days", "15 days", "30 days", "45 days +"];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if ((isPerishable || isFutureFollowUp) && !changeRemarks.trim()) {
      toast.error(
        "Call remarks are required when Perishable Cargo or Future Follow Up is toggled.",
      );
      setIsSubmitting(false);
      return;
    }

    if (isFutureFollowUp && !followUpReminderDate) {
      toast.error("Follow up reminder date is required.");
      setIsSubmitting(false);
      return;
    }

    let payload: any = {};
    if (activeTab === "Sea") {
      payload = {
        type: "Sea",
        seaType,
        seaLclFcl,
        pol: pol || "Not Specified",
        pod: pod || "Not Specified",
        commodity: seaCommodity || "Not Specified",
        weight: seaWeight || "Not Specified",
        cbm: seaLclFcl === "LCL" ? parseFloat(seaCbm) || 0 : undefined,
        containerType: seaDimensions || "Not Specified",
        containerCount: seaPackages || "Not Specified",
        incoterm: seaIncoterm,
        clientName: seaClientName,
        businessName: seaBusinessName,
        location: seaLocation,
        shipmentPlanning: seaShipmentPlanning,
        shipmentsDoneBefore: seaShipmentsDone,
        purpose: seaPurpose,
        rates: {
          oceanFreight: 0,
          cfsCharges: 0,
          customsClearance: 0,
          blCharges: 0,
          vgmCharges: 0,
          lclCharges: 0,
          doCharges: 0,
          cfsCustoms: 0,
        },
      };
    } else {
      payload = {
        type: "Air",
        aol: aol || "Not Specified",
        aod: aod || "Not Specified",
        commodity: airCommodity || "Not Specified",
        weight: airWeight ? `${airWeight} ${airWeightUnit}` : "Not Specified",
        dimensions: airDimensions
          ? `${airDimensions} ${airDimensionsUnit}`
          : "Not Specified",
        packages: airPackages
          ? `${airPackages} ${airPackagesUnit}`
          : "Not Specified",
        incoterm: airIncoterm,
        clientName: airClientName,
        businessName: airBusinessName,
        location: airLocation,
        shipmentPlanning: airShipmentPlanning,
        shipmentsDoneBefore: airShipmentsDone,
        purpose: airPurpose,
        rates: {
          airFreight: 0,
          handlingCharges: 0,
          customsClearance: 0,
          awbCharges: 0,
          deliveryCharges: 0,
        },
      };
    }

    const res = await updateLeadStatusAction(leadId, "INTERESTED", {
      enquiry: payload,
      remarks: changeRemarks,
      isPerishable,
      isFutureFollowUp,
      followUpReminderDate: isFutureFollowUp ? followUpReminderDate : null,
    });
    setIsSubmitting(false);

    if (res.ok) {
      toast.success("Enquiry details saved successfully!");
      onSuccess();
    } else {
      toast.error(res.error || "Failed to update lead status");
    }
  };

  return (
    <CrmDialogLayer
      open
      onClose={onClose}
      size="wide"
      labelledBy="interested-enquiry-title"
    >
      <div className="w-full max-w-2xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--mnx-border)]/50 bg-[var(--mnx-surface)]">
          <div className="flex items-center gap-2">
            <Info className="size-4.5 text-[var(--mnx-accent)]" />
            <span
              id="interested-enquiry-title"
              className="font-bold text-sm text-mono-text uppercase tracking-wider"
            >
              In-Call Enquiry Form
            </span>
          </div>
          <div className="flex items-center gap-3">
            <CrmButton
              type="button"
              onClick={handleFillDemo}
              className="px-2.5 py-1 bg-[var(--mnx-accent)]/10 hover:bg-[var(--mnx-accent)]/20 border border-[var(--mnx-accent)]/35 text-[var(--mnx-accent)] rounded text-[10px] font-bold uppercase tracking-wider transition-all"
            >
              Fill Demo
            </CrmButton>
            <CrmButton
              onClick={onClose}
              className="p-1 hover:bg-mono-soft rounded text-mono-muted hover:text-mono-text cursor-pointer"
            >
              <X className="size-4" />
            </CrmButton>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex bg-[var(--mnx-surface)] border-b border-[var(--mnx-border)]/40">
          <CrmButton
            type="button"
            onClick={() => setActiveTab("Sea")}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "Sea"
                ? "border-[var(--mnx-accent)] text-mono-text bg-[var(--mnx-surface)]/30"
                : "border-transparent text-mono-muted hover:text-mono-text"
            }`}
          >
            <Ship className="size-4" />
            <span>Sea Enquiry</span>
          </CrmButton>
          <CrmButton
            type="button"
            onClick={() => setActiveTab("Air")}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "Air"
                ? "border-[var(--mnx-accent)] text-mono-text bg-[var(--mnx-surface)]/30"
                : "border-transparent text-mono-muted hover:text-mono-text"
            }`}
          >
            <Plane className="size-4" />
            <span>Air Enquiry</span>
          </CrmButton>
        </div>

        <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 pr-4">
            {/* Toggles Panel */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[var(--mnx-surface)]/35 border border-[var(--mnx-border)]/60 mb-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-mono-text uppercase tracking-wider block">
                    Perishable Cargo
                  </span>
                  <span className="text-[9px] text-mono-muted block">
                    Marks cargo as perishable (remarks mandatory)
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <CrmInput
                    type="checkbox"
                    checked={isPerishable}
                    onChange={(e) => {
                      setIsPerishable(e.target.checked);
                      if (e.target.checked) {
                        setIsFutureFollowUp(false);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-mono-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-mono-soft peer-checked:after:bg-[var(--mnx-accent)] after:border-mono-border after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--mnx-accent)]/10 peer-checked:border-[var(--mnx-accent)]/40"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-mono-text uppercase tracking-wider block">
                    Future Follow Up
                  </span>
                  <span className="text-[9px] text-mono-muted block">
                    Schedule a call reminder (date required)
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <CrmInput
                    type="checkbox"
                    checked={isFutureFollowUp}
                    onChange={(e) => {
                      setIsFutureFollowUp(e.target.checked);
                      if (e.target.checked) {
                        setIsPerishable(false);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-mono-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-mono-soft peer-checked:after:bg-[var(--mnx-accent)] after:border-mono-border after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--mnx-accent)]/10 peer-checked:border-[var(--mnx-accent)]/40"></div>
                </label>
              </div>
            </div>

            {isFutureFollowUp && (
              <div className="p-4 rounded-xl bg-[var(--mnx-accent)]/5 border border-[var(--mnx-accent)]/20 space-y-2 animate-in fade-in duration-200 mb-2">
                <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide">
                  Reminder Date & Time *
                </label>
                <CrmInput
                  type="datetime-local"
                  required
                  value={followUpReminderDate}
                  onChange={(e) => setFollowUpReminderDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/40 rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                />
              </div>
            )}

            {activeTab === "Sea" ? (
              // SEA ENQUIRY FORM FIELDS
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      Direction
                    </label>
                    <NativeSelect
                      value={seaType}
                      onChange={(e) => setSeaType(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    >
                      <option value="Import">Import</option>
                      <option value="Export">Export</option>
                    </NativeSelect>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      Load Type
                    </label>
                    <NativeSelect
                      value={seaLclFcl}
                      onChange={(e) => setSeaLclFcl(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    >
                      <option value="LCL">
                        LCL (Less than Container Load)
                      </option>
                      <option value="FCL">FCL (Full Container Load)</option>
                    </NativeSelect>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      POL (Port of Loading){" "}
                      {!isPerishable && !isFutureFollowUp && "*"}
                    </label>
                    <CrmInput
                      type="text"
                      required={!isPerishable && !isFutureFollowUp}
                      placeholder="e.g. Shanghai, China"
                      value={pol}
                      onChange={(e) => setPol(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      POD (Port of Discharge){" "}
                      {!isPerishable && !isFutureFollowUp && "*"}
                    </label>
                    <CrmInput
                      type="text"
                      required={!isPerishable && !isFutureFollowUp}
                      placeholder="e.g. Chennai, India"
                      value={pod}
                      onChange={(e) => setPod(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      Commodity {!isPerishable && !isFutureFollowUp && "*"}
                    </label>
                    <CrmInput
                      type="text"
                      required={!isPerishable && !isFutureFollowUp}
                      placeholder="e.g. Auto Parts"
                      value={seaCommodity}
                      onChange={(e) => setSeaCommodity(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      Weight {!isPerishable && !isFutureFollowUp && "*"}
                    </label>
                    <CrmInput
                      type="text"
                      required={!isPerishable && !isFutureFollowUp}
                      placeholder="e.g. 1500 KG"
                      value={seaWeight}
                      onChange={(e) => setSeaWeight(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                  {seaLclFcl === "LCL" ? (
                    <div>
                      <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                        CBM (Volume) {!isPerishable && !isFutureFollowUp && "*"}
                      </label>
                      <CrmInput
                        type="number"
                        step="any"
                        required={!isPerishable && !isFutureFollowUp}
                        placeholder="e.g. 2.5"
                        value={seaCbm}
                        onChange={(e) => setSeaCbm(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                        Dimensions / Container type
                      </label>
                      <CrmInput
                        type="text"
                        placeholder="e.g. 20FT General"
                        value={seaDimensions}
                        onChange={(e) => setSeaDimensions(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      {seaLclFcl === "LCL"
                        ? "No. of Packages"
                        : "No. of Containers"}{" "}
                      {!isPerishable && !isFutureFollowUp && "*"}
                    </label>
                    <CrmInput
                      type="text"
                      required={!isPerishable && !isFutureFollowUp}
                      placeholder={
                        seaLclFcl === "LCL"
                          ? "e.g. 12 boxes"
                          : "e.g. 2 containers"
                      }
                      value={seaPackages}
                      onChange={(e) => setSeaPackages(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      Incoterm
                    </label>
                    <NativeSelect
                      value={seaIncoterm}
                      onChange={(e) => setSeaIncoterm(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    >
                      {incotermOptions.map((inc) => (
                        <option key={inc} value={inc}>
                          {inc}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      Location / Port of Entry
                    </label>
                    <CrmInput
                      type="text"
                      placeholder="e.g. Chennai Port"
                      value={seaLocation}
                      onChange={(e) => setSeaLocation(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      Client Actual Name
                    </label>
                    <CrmInput
                      type="text"
                      value={seaClientName}
                      onChange={(e) => setSeaClientName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      Business Name
                    </label>
                    <CrmInput
                      type="text"
                      value={seaBusinessName}
                      onChange={(e) => setSeaBusinessName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      Shipment Planning
                    </label>
                    <NativeSelect
                      value={seaShipmentPlanning}
                      onChange={(e) => setSeaShipmentPlanning(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    >
                      {planningOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      Shipments Done Before?
                    </label>
                    <NativeSelect
                      value={seaShipmentsDone}
                      onChange={(e) =>
                        setSeaShipmentsDone(e.target.value as any)
                      }
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </NativeSelect>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      Purpose of Cargo
                    </label>
                    <CrmInput
                      type="text"
                      value={seaPurpose}
                      onChange={(e) => setSeaPurpose(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                </div>
              </div>
            ) : (
              // AIR ENQUIRY FORM FIELDS
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      AOL (Airport of Loading){" "}
                      {!isPerishable && !isFutureFollowUp && "*"}
                    </label>
                    <CrmInput
                      type="text"
                      required={!isPerishable && !isFutureFollowUp}
                      placeholder="e.g. London Heathrow (LHR)"
                      value={aol}
                      onChange={(e) => setAol(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      AOD (Airport of Discharge){" "}
                      {!isPerishable && !isFutureFollowUp && "*"}
                    </label>
                    <CrmInput
                      type="text"
                      required={!isPerishable && !isFutureFollowUp}
                      placeholder="e.g. Chennai International (MAA)"
                      value={aod}
                      onChange={(e) => setAod(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      Commodity {!isPerishable && !isFutureFollowUp && "*"}
                    </label>
                    <CrmInput
                      type="text"
                      required={!isPerishable && !isFutureFollowUp}
                      placeholder="e.g. Electronics"
                      value={airCommodity}
                      onChange={(e) => setAirCommodity(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      Weight {!isPerishable && !isFutureFollowUp && "*"}
                    </label>
                    <div className="flex gap-1.5">
                      <CrmInput
                        type="number"
                        required={!isPerishable && !isFutureFollowUp}
                        placeholder="e.g. 250"
                        value={airWeight}
                        onChange={(e) => setAirWeight(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                      />
                      <NativeSelect
                        value={airWeightUnit}
                        onChange={(e) => setAirWeightUnit(e.target.value)}
                        className="bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-mono-muted px-1 focus:outline-none"
                      >
                        <option value="KG">KG</option>
                        <option value="Lbs">Lbs</option>
                      </NativeSelect>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      Dimensions {!isPerishable && !isFutureFollowUp && "*"}
                    </label>
                    <div className="flex gap-1.5">
                      <CrmInput
                        type="text"
                        required={!isPerishable && !isFutureFollowUp}
                        placeholder="e.g. 50x50x40"
                        value={airDimensions}
                        onChange={(e) => setAirDimensions(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                      />
                      <NativeSelect
                        value={airDimensionsUnit}
                        onChange={(e) => setAirDimensionsUnit(e.target.value)}
                        className="bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-mono-muted px-1 focus:outline-none"
                      >
                        <option value="Cm">Cm</option>
                        <option value="mm">mm</option>
                        <option value="inch">inch</option>
                        <option value="meter">meter</option>
                      </NativeSelect>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      No. of Packages{" "}
                      {!isPerishable && !isFutureFollowUp && "*"}
                    </label>
                    <div className="flex gap-1.5">
                      <CrmInput
                        type="number"
                        required={!isPerishable && !isFutureFollowUp}
                        placeholder="e.g. 5"
                        value={airPackages}
                        onChange={(e) => setAirPackages(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                      />
                      <NativeSelect
                        value={airPackagesUnit}
                        onChange={(e) => setAirPackagesUnit(e.target.value)}
                        className="bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-mono-muted px-1 focus:outline-none"
                      >
                        <option value="PKG">PKG</option>
                        <option value="Box">Box</option>
                        <option value="pallet">pallet</option>
                        <option value="cartons">cartons</option>
                      </NativeSelect>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      Incoterm
                    </label>
                    <NativeSelect
                      value={airIncoterm}
                      onChange={(e) => setAirIncoterm(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    >
                      {incotermOptions.map((inc) => (
                        <option key={inc} value={inc}>
                          {inc}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      Location
                    </label>
                    <CrmInput
                      type="text"
                      placeholder="e.g. Chennai airport"
                      value={airLocation}
                      onChange={(e) => setAirLocation(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      Client Actual Name
                    </label>
                    <CrmInput
                      type="text"
                      value={airClientName}
                      onChange={(e) => setAirClientName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      Business Name
                    </label>
                    <CrmInput
                      type="text"
                      value={airBusinessName}
                      onChange={(e) => setAirBusinessName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      Shipment Planning
                    </label>
                    <NativeSelect
                      value={airShipmentPlanning}
                      onChange={(e) => setAirShipmentPlanning(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    >
                      {planningOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      Shipments Done Before?
                    </label>
                    <NativeSelect
                      value={airShipmentsDone}
                      onChange={(e) =>
                        setAirShipmentsDone(e.target.value as any)
                      }
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </NativeSelect>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                      Purpose of Cargo
                    </label>
                    <CrmInput
                      type="text"
                      value={airPurpose}
                      onChange={(e) => setAirPurpose(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Reason for status change field */}
            <div className="pt-2 border-t border-[var(--mnx-border)]/30">
              <label className="block text-[10px] font-bold text-mono-muted uppercase tracking-wide mb-1">
                Reason for Status Change / Call Remarks{" "}
                {lead.status === "NOT_PICKED" ||
                lead.status === "NOT_REACHABLE" ||
                isPerishable ||
                isFutureFollowUp
                  ? "(Required) *"
                  : "(Optional)"}
              </label>
              <CrmTextarea
                ref={textareaRef}
                rows={2}
                style={{ resize: "none", overflow: "hidden" }}
                required={
                  lead.status === "NOT_PICKED" ||
                  lead.status === "NOT_REACHABLE" ||
                  isPerishable ||
                  isFutureFollowUp
                }
                placeholder="Provide a brief reason for changing the status of this lead..."
                value={changeRemarks}
                onChange={(e) => setChangeRemarks(e.target.value)}
                className="w-full p-2.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-mono-text focus:outline-none focus:border-[var(--mnx-accent)] placeholder:text-mono-muted min-h-[50px]"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex-shrink-0 flex justify-end gap-3 p-4 bg-[var(--mnx-surface)] border-t border-[var(--mnx-border)]/30">
            <CrmButton
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[var(--mnx-surface)] hover:bg-[var(--mnx-text-muted)] border border-[var(--mnx-border)] text-mono-muted rounded-lg text-xs font-semibold cursor-pointer"
            >
              Cancel
            </CrmButton>
            <CrmButton
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] disabled:opacity-50 text-mono-text rounded-lg text-xs font-bold transition-all mnx-shadow-panel cursor-pointer"
            >
              {isSubmitting ? "Saving..." : "Save Enquiry Details"}
            </CrmButton>
          </div>
        </form>
      </div>
    </CrmDialogLayer>
  );
}
