"use client";

import {
  CrmDialog,
  CrmInput,
  CrmTextarea,
} from "@/modules/crm/components/workspace/crm-workspace";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import React, { useState, useRef, useEffect } from "react";
import { toast } from "@/modules/notifications/client";
import { updateLeadStatusAction } from "@/modules/crm/actions";
import { Ship, Plane } from "lucide-react";

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
  type ServiceScope =
    | "BOTH_FREIGHT_AND_CLEARANCE"
    | "ONLY_FREIGHT"
    | "ONLY_CLEARANCE";

  const [activeTab, setActiveTab] = useState<"Sea" | "Air">("Sea");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceScope, setServiceScope] =
    useState<ServiceScope>("BOTH_FREIGHT_AND_CLEARANCE");
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
  const [airType, setAirType] = useState<"Import" | "Export">("Import");
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
      setServiceScope("BOTH_FREIGHT_AND_CLEARANCE");
      toast.success("Sea enquiry demo data filled!");
    } else {
      setAol("London Heathrow (LHR)");
      setAod("Chennai International (MAA)");
      setAirType("Export");
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
      setServiceScope("BOTH_FREIGHT_AND_CLEARANCE");
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
        dimensions:
          seaLclFcl === "LCL"
            ? seaDimensions || "Not Specified"
            : undefined,
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
        serviceScope,
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
        airType,
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
        serviceScope,
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
    <CrmDialog
      open
      onClose={onClose}
      className="mnx-crm-enquiry-dialog"
      title="In-Call Enquiry Form"
      description="Capture the enquiry details discussed during the call and convert the lead into an active enquiry."
      size="workspace"
      footer={
        <>
          <Button
            type="button"
            onClick={handleFillDemo}
            variant="outline"
            className="mr-auto mnx-button-compact"
          >
            Fill Demo
          </Button>
          <Button type="button" onClick={onClose} variant="outline">
            Cancel
          </Button>
          <Button
            type="submit"
            form="interested-enquiry-form"
            disabled={isSubmitting}
            variant="accent"
            className="disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Enquiry Details"}
          </Button>
        </>
      }
    >
      <form
        id="interested-enquiry-form"
        onSubmit={handleSave}
        className="mnx-crm-enquiry-form"
      >
        {/* Modal Navigation Tabs */}
        <div className="mnx-crm-enquiry-tabs flex flex-wrap items-center justify-center gap-3 border-b border-[var(--mnx-border)]/40 bg-[var(--mnx-surface)] px-6 py-4">
          <Button
            type="button"
            onClick={() => setActiveTab("Sea")}
            variant={activeTab === "Sea" ? "accent" : "outline"}
            className={`min-w-[220px] justify-center gap-2 px-8 ${
              activeTab === "Sea"
                ? ""
                : ""
            }`}
          >
            <Ship className="size-4" />
            <span>Sea Enquiry</span>
          </Button>
          <Button
            type="button"
            onClick={() => setActiveTab("Air")}
            variant={activeTab === "Air" ? "accent" : "outline"}
            className={`min-w-[220px] justify-center gap-2 px-8 ${
              activeTab === "Air"
                ? ""
                : ""
            }`}
          >
            <Plane className="size-4" />
            <span>Air Enquiry</span>
          </Button>
        </div>

        <div className="mnx-crm-enquiry-body space-y-5 pt-6">
            <div className="mnx-crm-enquiry-card space-y-3 rounded-xl border border-[var(--mnx-border)]/60 bg-[var(--mnx-surface)]/35 p-4">
              <div className="space-y-1">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[var(--mnx-text-strong)]">
                  Scope of Work
                </span>
                <span className="block text-[9px] text-[var(--mnx-muted)]">
                  Choose whether the customer needs freight, clearance, or both.
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant={
                    serviceScope === "BOTH_FREIGHT_AND_CLEARANCE"
                      ? "accent"
                      : "outline"
                  }
                  className="min-w-[220px] justify-center gap-2"
                  onClick={() =>
                    setServiceScope("BOTH_FREIGHT_AND_CLEARANCE")
                  }
                >
                  Both Freight and Clearance
                </Button>
                <Button
                  type="button"
                  variant={
                    serviceScope === "ONLY_FREIGHT" ? "accent" : "outline"
                  }
                  className="min-w-[180px] justify-center gap-2"
                  onClick={() => setServiceScope("ONLY_FREIGHT")}
                >
                  Only Freight
                </Button>
                <Button
                  type="button"
                  variant={
                    serviceScope === "ONLY_CLEARANCE" ? "accent" : "outline"
                  }
                  className="min-w-[180px] justify-center gap-2"
                  onClick={() => setServiceScope("ONLY_CLEARANCE")}
                >
                  Only Clearance
                </Button>
              </div>
            </div>

            {/* Toggles Panel */}
            <div className="mnx-crm-enquiry-card grid grid-cols-1 gap-4 rounded-xl bg-[var(--mnx-surface)]/35 p-4 md:grid-cols-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-[var(--mnx-text-strong)] uppercase tracking-wider block">
                    Perishable Cargo
                  </span>
                  <span className="text-[9px] text-[var(--mnx-muted)] block">
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
                  <div className="w-8 h-4.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[var(--mnx-border)] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--mnx-soft)] peer-checked:after:bg-[var(--mnx-accent)] after:border-[var(--mnx-border)] after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--mnx-accent)]/10 peer-checked:border-[var(--mnx-accent)]/40"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-[var(--mnx-text-strong)] uppercase tracking-wider block">
                    Future Follow Up
                  </span>
                  <span className="text-[9px] text-[var(--mnx-muted)] block">
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
                  <div className="w-8 h-4.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[var(--mnx-border)] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--mnx-soft)] peer-checked:after:bg-[var(--mnx-accent)] after:border-[var(--mnx-border)] after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[var(--mnx-accent)]/10 peer-checked:border-[var(--mnx-accent)]/40"></div>
                </label>
              </div>
            </div>

            {isFutureFollowUp && (
              <div className="mnx-crm-enquiry-card p-4 rounded-xl bg-[var(--mnx-accent)]/5 border border-[var(--mnx-accent)]/20 space-y-2 animate-in fade-in duration-200 mb-2">
                <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide">
                  Reminder Date & Time *
                </label>
                <CrmInput
                  type="datetime-local"
                  required
                  value={followUpReminderDate}
                  onChange={(e) => setFollowUpReminderDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/40 rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                />
              </div>
            )}

            {activeTab === "Sea" ? (
              // SEA ENQUIRY FORM FIELDS
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      Direction
                    </label>
                    <NativeSelect
                      value={seaType}
                      onChange={(e) => setSeaType(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    >
                      <option value="Import">Import</option>
                      <option value="Export">Export</option>
                    </NativeSelect>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      Load Type
                    </label>
                    <NativeSelect
                      value={seaLclFcl}
                      onChange={(e) => setSeaLclFcl(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    >
                      <option value="LCL">
                        LCL (Less than Container Load)
                      </option>
                      <option value="FCL">FCL (Full Container Load)</option>
                    </NativeSelect>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      POL (Port of Loading){" "}
                      {!isPerishable && !isFutureFollowUp && "*"}
                    </label>
                    <CrmInput
                      type="text"
                      required={!isPerishable && !isFutureFollowUp}
                      placeholder="e.g. Shanghai, China"
                      value={pol}
                      onChange={(e) => setPol(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      POD (Port of Discharge){" "}
                      {!isPerishable && !isFutureFollowUp && "*"}
                    </label>
                    <CrmInput
                      type="text"
                      required={!isPerishable && !isFutureFollowUp}
                      placeholder="e.g. Chennai, India"
                      value={pod}
                      onChange={(e) => setPod(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                </div>

                <div
                  className={`grid grid-cols-1 gap-4 ${
                    seaLclFcl === "LCL" ? "md:grid-cols-4" : "md:grid-cols-3"
                  }`}
                >
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      Commodity {!isPerishable && !isFutureFollowUp && "*"}
                    </label>
                    <CrmInput
                      type="text"
                      required={!isPerishable && !isFutureFollowUp}
                      placeholder="e.g. Auto Parts"
                      value={seaCommodity}
                      onChange={(e) => setSeaCommodity(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      Weight {!isPerishable && !isFutureFollowUp && "*"}
                    </label>
                    <CrmInput
                      type="text"
                      required={!isPerishable && !isFutureFollowUp}
                      placeholder="e.g. 1500 KG"
                      value={seaWeight}
                      onChange={(e) => setSeaWeight(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                  {seaLclFcl === "LCL" ? (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                          Dimensions {!isPerishable && !isFutureFollowUp && "*"}
                        </label>
                        <CrmInput
                          type="text"
                          required={!isPerishable && !isFutureFollowUp}
                          placeholder="e.g. 120x80x60 cm"
                          value={seaDimensions}
                          onChange={(e) => setSeaDimensions(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                          CBM (Volume) {!isPerishable && !isFutureFollowUp && "*"}
                        </label>
                        <CrmInput
                          type="number"
                          step="any"
                          required={!isPerishable && !isFutureFollowUp}
                          placeholder="e.g. 2.5"
                          value={seaCbm}
                          onChange={(e) => setSeaCbm(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                        Dimensions / Container type
                      </label>
                      <CrmInput
                        type="text"
                        placeholder="e.g. 20FT General"
                        value={seaDimensions}
                        onChange={(e) => setSeaDimensions(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
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
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      Incoterm
                    </label>
                    <NativeSelect
                      value={seaIncoterm}
                      onChange={(e) => setSeaIncoterm(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    >
                      {incotermOptions.map((inc) => (
                        <option key={inc} value={inc}>
                          {inc}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      Location / Port of Entry
                    </label>
                    <CrmInput
                      type="text"
                      placeholder="e.g. Chennai Port"
                      value={seaLocation}
                      onChange={(e) => setSeaLocation(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      Client Actual Name
                    </label>
                    <CrmInput
                      type="text"
                      value={seaClientName}
                      onChange={(e) => setSeaClientName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      Business Name
                    </label>
                    <CrmInput
                      type="text"
                      value={seaBusinessName}
                      onChange={(e) => setSeaBusinessName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      Shipment Planning
                    </label>
                    <NativeSelect
                      value={seaShipmentPlanning}
                      onChange={(e) => setSeaShipmentPlanning(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    >
                      {planningOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      Shipments Done Before?
                    </label>
                    <NativeSelect
                      value={seaShipmentsDone}
                      onChange={(e) =>
                        setSeaShipmentsDone(e.target.value as any)
                      }
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </NativeSelect>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      Purpose of Cargo
                    </label>
                    <CrmInput
                      type="text"
                      value={seaPurpose}
                      onChange={(e) => setSeaPurpose(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                </div>
              </div>
            ) : (
              // AIR ENQUIRY FORM FIELDS
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      AOL (Airport of Loading){" "}
                      {!isPerishable && !isFutureFollowUp && "*"}
                    </label>
                    <CrmInput
                      type="text"
                      required={!isPerishable && !isFutureFollowUp}
                      placeholder="e.g. London Heathrow (LHR)"
                      value={aol}
                      onChange={(e) => setAol(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      AOD (Airport of Discharge){" "}
                      {!isPerishable && !isFutureFollowUp && "*"}
                    </label>
                    <CrmInput
                      type="text"
                      required={!isPerishable && !isFutureFollowUp}
                      placeholder="e.g. Chennai International (MAA)"
                      value={aod}
                      onChange={(e) => setAod(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      Commodity {!isPerishable && !isFutureFollowUp && "*"}
                    </label>
                    <CrmInput
                      type="text"
                      required={!isPerishable && !isFutureFollowUp}
                      placeholder="e.g. Electronics"
                      value={airCommodity}
                      onChange={(e) => setAirCommodity(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      Weight {!isPerishable && !isFutureFollowUp && "*"}
                    </label>
                    <div className="flex gap-1.5">
                      <CrmInput
                        type="number"
                        required={!isPerishable && !isFutureFollowUp}
                        placeholder="e.g. 250"
                        value={airWeight}
                        onChange={(e) => setAirWeight(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                      />
                      <NativeSelect
                        value={airWeightUnit}
                        onChange={(e) => setAirWeightUnit(e.target.value)}
                        className="bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-muted)] px-1 focus:outline-none"
                      >
                        <option value="KG">KG</option>
                        <option value="Lbs">Lbs</option>
                      </NativeSelect>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      Dimensions {!isPerishable && !isFutureFollowUp && "*"}
                    </label>
                    <div className="flex gap-1.5">
                      <CrmInput
                        type="text"
                        required={!isPerishable && !isFutureFollowUp}
                        placeholder="e.g. 50x50x40"
                        value={airDimensions}
                        onChange={(e) => setAirDimensions(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                      />
                      <NativeSelect
                        value={airDimensionsUnit}
                        onChange={(e) => setAirDimensionsUnit(e.target.value)}
                        className="bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-muted)] px-1 focus:outline-none"
                      >
                        <option value="Cm">Cm</option>
                        <option value="mm">mm</option>
                        <option value="inch">inch</option>
                        <option value="meter">meter</option>
                      </NativeSelect>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
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
                        className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/55 rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                      />
                      <NativeSelect
                        value={airPackagesUnit}
                        onChange={(e) => setAirPackagesUnit(e.target.value)}
                        className="bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-muted)] px-1 focus:outline-none"
                      >
                        <option value="PKG">PKG</option>
                        <option value="Box">Box</option>
                        <option value="pallet">pallet</option>
                        <option value="cartons">cartons</option>
                      </NativeSelect>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      Incoterm
                    </label>
                    <NativeSelect
                      value={airIncoterm}
                      onChange={(e) => setAirIncoterm(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    >
                      {incotermOptions.map((inc) => (
                        <option key={inc} value={inc}>
                          {inc}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      Location
                    </label>
                    <CrmInput
                      type="text"
                      placeholder="e.g. Chennai airport"
                      value={airLocation}
                      onChange={(e) => setAirLocation(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      Client Actual Name
                    </label>
                    <CrmInput
                      type="text"
                      value={airClientName}
                      onChange={(e) => setAirClientName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      Business Name
                    </label>
                    <CrmInput
                      type="text"
                      value={airBusinessName}
                      onChange={(e) => setAirBusinessName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      Shipment Planning
                    </label>
                    <NativeSelect
                      value={airShipmentPlanning}
                      onChange={(e) => setAirShipmentPlanning(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    >
                      {planningOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      Shipments Done Before?
                    </label>
                    <NativeSelect
                      value={airShipmentsDone}
                      onChange={(e) =>
                        setAirShipmentsDone(e.target.value as any)
                      }
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </NativeSelect>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                      Purpose of Cargo
                    </label>
                    <CrmInput
                      type="text"
                      value={airPurpose}
                      onChange={(e) => setAirPurpose(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Reason for status change field */}
            <div className="pt-2 border-t border-[var(--mnx-border)]/30">
              <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
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
                className="w-full p-2.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)] placeholder:text-[var(--mnx-muted)] min-h-[50px]"
              />
            </div>
        </div>
      </form>
    </CrmDialog>
  );
}
