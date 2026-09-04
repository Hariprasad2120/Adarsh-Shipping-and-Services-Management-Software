"use client";

import {
  CrmButton,
  CrmDialogLayer,
  CrmInput,
  CrmTextarea,
} from "@/modules/crm/components/workspace/crm-workspace";

import { NativeSelect } from "@/components/ui/native-select";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/modules/notifications/client";
import {
  createDirectEnquiryAction,
  createLeadAction,
  updateLeadAction,
} from "@/modules/crm/actions";
import { Save, X, Briefcase, Mail, MapPin, Tag } from "lucide-react";

interface UserOption {
  id: string;
  name: string;
}

interface LeadPerishableDetails {
  perishableType?: string | null;
  tempRequired?: string | null;
  humidityControl?: string | null;
  ventilation?: string | null;
  perishableRemarks?: string | null;
}

interface LeadFormInitialData {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  designation?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  fax?: string | null;
  website?: string | null;
  source?: string | null;
  status?: string | null;
  rating?: string | null;
  industry?: string | null;
  annualRevenue?: number | string | null;
  ownerId?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  description?: string | null;
  isPerishable?: boolean;
  tags?: string[];
  perishableDetails?: unknown | null;
}

interface LeadFormProps {
  initialData?: LeadFormInitialData;
  employees: UserOption[];
  customers?: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  }>;
  leadSources?: string[];
  mode?: "lead" | "direct-enquiry";
}

export function LeadForm({
  initialData,
  employees,
  customers = [],
  leadSources = [],
  mode = "lead",
}: LeadFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;
  const isDirectEnquiry = mode === "direct-enquiry";
  const initialPerishableDetails =
    initialData?.perishableDetails &&
    typeof initialData.perishableDetails === "object" &&
    !Array.isArray(initialData.perishableDetails)
      ? (initialData.perishableDetails as LeadPerishableDetails)
      : undefined;
  const editRecordId = initialData?.id;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastName, setLastName] = useState(initialData?.lastName || "");
  const [company, setCompany] = useState(initialData?.company || "");
  const [isPerishable, setIsPerishable] = useState(
    initialData?.isPerishable || false,
  );
  const [showPerishablesDialog, setShowPerishablesDialog] = useState(false);
  const [perishableType, setPerishableType] = useState(
    initialPerishableDetails?.perishableType || "",
  );
  const [tempRequired, setTempRequired] = useState(
    initialPerishableDetails?.tempRequired || "",
  );
  const [humidityControl, setHumidityControl] = useState(
    initialPerishableDetails?.humidityControl || "",
  );
  const [ventilation, setVentilation] = useState(
    initialPerishableDetails?.ventilation || "",
  );
  const [perishableRemarks, setPerishableRemarks] = useState(
    initialPerishableDetails?.perishableRemarks || "",
  );
  const sources =
    leadSources.length > 0
      ? leadSources
      : [
          "Cold Call",
          "Web Site",
          "Partner Referral",
          "Employee Referral",
          "Trade Show",
          "External Agency",
          "Existing Client",
          "Web Enquiry",
        ];
  const initialSource = initialData?.source || "Cold Call";
  const initialSourceIsPreset = sources.includes(initialSource);
  const [source, setSource] = useState(
    initialSourceIsPreset ? initialSource : "CUSTOM",
  );
  const [customSource, setCustomSource] = useState(
    initialSourceIsPreset ? "" : initialSource,
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [shipmentMode, setShipmentMode] = useState<"SEA" | "AIR">("SEA");
  const [shipmentDirection, setShipmentDirection] = useState<"IMP" | "EXP">("IMP");
  const [serviceScope, setServiceScope] = useState<
    "BOTH_FREIGHT_AND_CLEARANCE" | "ONLY_FREIGHT" | "ONLY_CLEARANCE"
  >("BOTH_FREIGHT_AND_CLEARANCE");
  const [originPoint, setOriginPoint] = useState("");
  const [destinationPoint, setDestinationPoint] = useState("");
  const [commodity, setCommodity] = useState("");
  const [weight, setWeight] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [packages, setPackages] = useState("");
  const [incoterm, setIncoterm] = useState("FOB");
  const [seaLoadType, setSeaLoadType] = useState<"LCL" | "FCL">("LCL");
  const [directEnquiryRequestKey] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `direct-enquiry-${Date.now()}`,
  );

  const handleFillDemo = () => {
    // Set controlled states
    setLastName("Hari");
    setCompany("Adarsh Shipping Logistics");
    setSource("Partner Referral");
    setCustomSource("");

    // Set other inputs
    const formEl = document.querySelector("form");
    if (formEl) {
      const setVal = (name: string, val: string) => {
        const el = formEl.elements.namedItem(name) as
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        if (el) el.value = val;
      };
      setVal("firstName", "Adarsh");
      setVal("designation", "Operations Manager");
      setVal("email", "adarsh.hari@example.com");
      setVal("phone", "+91 44 2819 1234");
      setVal("mobile", "+91 98840 12345");
      setVal("fax", "+91 44 2819 5678");
      setVal("website", "https://www.adarshshipping.in");
      setVal("status", isDirectEnquiry ? "INTERESTED" : "NEW");
      setVal("rating", "Hot");
      setVal("industry", "Logistics & Supply Chain");
      setVal("annualRevenue", "15000000");
      setVal("address", "14 East Coast Road, Thiruvanmiyur");
      setVal("city", "Chennai");
      setVal("state", "Tamil Nadu");
      setVal("pincode", "600041");
      setVal("country", "India");
      setVal("tags", "VIP Customer, Custom Clearance");
      setVal(
        "description",
        "Requires regular import shipments of automotive parts from Shanghai to Chennai Port. Expects LCL consolidation and custom clearing CHA support.",
      );
      if (isDirectEnquiry) {
        setShipmentMode("SEA");
        setShipmentDirection("IMP");
        setServiceScope("BOTH_FREIGHT_AND_CLEARANCE");
        setOriginPoint("Shanghai, China");
        setDestinationPoint("Chennai, India");
        setCommodity("Automotive Parts");
        setWeight("1500 KG");
        setDimensions("20FT General");
        setPackages("12 boxes");
        setIncoterm("FOB");
        setSeaLoadType("LCL");
      }
      toast.success("Lead form demo data filled!");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!lastName.trim() || !company.trim()) {
      toast.error("Lead Name/Last Name and Company are required");
      return;
    }
    if (isEdit && !editRecordId) {
      toast.error("Unable to update this record because the lead ID is missing");
      return;
    }

    setIsSubmitting(true);
    const fd = new FormData(e.currentTarget);

    const res = isEdit
      ? await updateLeadAction(editRecordId!, fd)
      : isDirectEnquiry
        ? await createDirectEnquiryAction(fd)
        : await createLeadAction(fd);

    setIsSubmitting(false);

    if (res.ok) {
      toast.success(
        isEdit
          ? isDirectEnquiry
            ? "Enquiry updated successfully"
            : "Lead updated successfully"
          : isDirectEnquiry
            ? "Enquiry created successfully"
            : "Lead created successfully",
      );
        router.push(
        isEdit
          ? isDirectEnquiry
            ? `/crm/enquiries/${editRecordId}`
            : `/crm/leads/${editRecordId}`
          : isDirectEnquiry
            ? `/crm/enquiries/${res.data?.leadId ?? ""}`
            : "/crm/leads",
      );
    } else {
      toast.error(res.error);
    }
  };

  const statuses = [
    "NEW",
    "ATTEMPTED_TO_CONTACT",
    "CONTACTED",
    "QUALIFIED",
    "LOST",
  ];
  const ratings = ["Hot", "Warm", "Cold"];
  const resolvedSource =
    source === "CUSTOM" ? customSource.trim() : source || "Cold Call";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8 max-w-5xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/60 rounded-xl p-6 shadow-2xl"
    >
      {isDirectEnquiry ? (
        <>
          <CrmInput
            type="hidden"
            name="directEnquiryRequestKey"
            value={directEnquiryRequestKey}
          />
          <CrmInput type="hidden" name="customerId" value={selectedCustomerId} />
          <CrmInput type="hidden" name="serviceScope" value={serviceScope} />
          <CrmInput type="hidden" name="shipmentMode" value={shipmentMode} />
          <CrmInput
            type="hidden"
            name="shipmentDirection"
            value={shipmentDirection}
          />
          <CrmInput type="hidden" name="originPoint" value={originPoint} />
          <CrmInput
            type="hidden"
            name="destinationPoint"
            value={destinationPoint}
          />
          <CrmInput type="hidden" name="commodity" value={commodity} />
          <CrmInput type="hidden" name="weight" value={weight} />
          <CrmInput type="hidden" name="dimensions" value={dimensions} />
          <CrmInput type="hidden" name="packages" value={packages} />
          <CrmInput type="hidden" name="incoterm" value={incoterm} />
          <CrmInput type="hidden" name="seaLoadType" value={seaLoadType} />
        </>
      ) : null}

      {isDirectEnquiry ? (
        <div className="space-y-4 rounded-xl border border-[var(--mnx-border)]/50 bg-[var(--mnx-surface)]/45 p-5">
          <h3 className="text-sm font-bold text-[var(--mnx-text-strong)] uppercase tracking-wider border-b border-[var(--mnx-border)]/30 pb-2">
            Direct Enquiry Routing
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
                Existing Customer
              </label>
              <NativeSelect
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)]"
              >
                <option value="">Select existing customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
                Requested Services *
              </label>
              <NativeSelect
                value={serviceScope}
                onChange={(e) =>
                  setServiceScope(
                    e.target.value as
                      | "BOTH_FREIGHT_AND_CLEARANCE"
                      | "ONLY_FREIGHT"
                      | "ONLY_CLEARANCE",
                  )
                }
                className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)]"
              >
                <option value="BOTH_FREIGHT_AND_CLEARANCE">
                  Both Freight and Clearance
                </option>
                <option value="ONLY_FREIGHT">Freight Forwarding only</option>
                <option value="ONLY_CLEARANCE">Customs Clearance only</option>
              </NativeSelect>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
                Shipment Mode *
              </label>
              <NativeSelect
                value={shipmentMode}
                onChange={(e) => setShipmentMode(e.target.value as "SEA" | "AIR")}
                className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)]"
              >
                <option value="SEA">Sea</option>
                <option value="AIR">Air</option>
              </NativeSelect>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
                Direction *
              </label>
              <NativeSelect
                value={shipmentDirection}
                onChange={(e) => setShipmentDirection(e.target.value as "IMP" | "EXP")}
                className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)]"
              >
                <option value="IMP">Import</option>
                <option value="EXP">Export</option>
              </NativeSelect>
            </div>
            {shipmentMode === "SEA" ? (
              <div>
                <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
                  Sea Load Type
                </label>
                <NativeSelect
                  value={seaLoadType}
                  onChange={(e) => setSeaLoadType(e.target.value as "LCL" | "FCL")}
                  className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)]"
                >
                  <option value="LCL">LCL</option>
                  <option value="FCL">FCL</option>
                </NativeSelect>
              </div>
            ) : null}
            <div>
              <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
                Origin *
              </label>
              <CrmInput
                type="text"
                value={originPoint}
                onChange={(e) => setOriginPoint(e.target.value)}
                placeholder={shipmentMode === "SEA" ? "Port of loading" : "Airport of loading"}
                className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                required={isDirectEnquiry}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
                Destination *
              </label>
              <CrmInput
                type="text"
                value={destinationPoint}
                onChange={(e) => setDestinationPoint(e.target.value)}
                placeholder={shipmentMode === "SEA" ? "Port of discharge" : "Airport of discharge"}
                className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                required={isDirectEnquiry}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
                Commodity *
              </label>
              <CrmInput
                type="text"
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                placeholder="Cargo / commodity"
                className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                required={isDirectEnquiry}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
                Weight *
              </label>
              <CrmInput
                type="text"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 1500 KG"
                className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                required={isDirectEnquiry}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
                Dimensions
              </label>
              <CrmInput
                type="text"
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                placeholder="Container type / dimensions"
                className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
                Packages
              </label>
              <CrmInput
                type="text"
                value={packages}
                onChange={(e) => setPackages(e.target.value)}
                placeholder="e.g. 12 boxes"
                className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
                Incoterm
              </label>
              <CrmInput
                type="text"
                value={incoterm}
                onChange={(e) => setIncoterm(e.target.value)}
                placeholder="e.g. FOB"
                className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* ─── SECTION: BASIC INFO ────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[var(--mnx-text-strong)] uppercase tracking-wider border-b border-[var(--mnx-border)]/30 pb-2 flex items-center gap-2">
          <Briefcase className="size-4 text-[var(--mnx-accent)]" />
          <span>Lead & Company Information</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
              First Name
            </label>
            <CrmInput
              type="text"
              name="firstName"
              defaultValue={initialData?.firstName || ""}
              placeholder="e.g. Adarsh"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
              Last Name / Lead Name *
            </label>
            <CrmInput
              type="text"
              name="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Hari"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
              Company Name *
            </label>
            <CrmInput
              type="text"
              name="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Adarsh Shipping Ltd"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
              Designation
            </label>
            <CrmInput
              type="text"
              name="designation"
              defaultValue={initialData?.designation || ""}
              placeholder="e.g. Logistics Director"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
        </div>
      </div>

      {/* ─── SECTION: CONTACT CHANNELS ───────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[var(--mnx-text-strong)] uppercase tracking-wider border-b border-[var(--mnx-border)]/30 pb-2 flex items-center gap-2">
          <Mail className="size-4 text-[var(--mnx-accent)]" />
          <span>Contact Channels</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
              Email Address
            </label>
            <CrmInput
              type="email"
              name="email"
              defaultValue={initialData?.email || ""}
              placeholder="e.g. client@domain.com"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
              Phone (Office)
            </label>
            <CrmInput
              type="text"
              name="phone"
              defaultValue={initialData?.phone || ""}
              placeholder="e.g. +91 44 2819 1234"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
              Mobile Number
            </label>
            <CrmInput
              type="text"
              name="mobile"
              defaultValue={initialData?.mobile || ""}
              placeholder="e.g. +91 98840 12345"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
              Fax Number
            </label>
            <CrmInput
              type="text"
              name="fax"
              defaultValue={initialData?.fax || ""}
              placeholder="e.g. +91 44 2819 5678"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
              Website URL
            </label>
            <CrmInput
              type="url"
              name="website"
              defaultValue={initialData?.website || ""}
              placeholder="e.g. https://www.company.com"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
        </div>
      </div>

      {/* ─── SECTION: CLASSIFICATION ────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[var(--mnx-text-strong)] uppercase tracking-wider border-b border-[var(--mnx-border)]/30 pb-2 flex items-center gap-2">
          <Tag className="size-4 text-[var(--mnx-accent)]" />
          <span>Classification & Scoring</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
              {isDirectEnquiry ? "Enquiry Source" : "Lead Source"}
            </label>
            <div className="space-y-2">
              <input type="hidden" name="source" value={resolvedSource} />
              <NativeSelect
                value={source}
                onChange={(e) => {
                  const nextValue = e.target.value;
                  setSource(nextValue);
                  if (nextValue !== "CUSTOM") {
                    setCustomSource("");
                  }
                }}
                className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)]"
              >
                {sources.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
                <option value="CUSTOM">+ Add new source</option>
              </NativeSelect>
              {source === "CUSTOM" ? (
                <div className="space-y-2">
                  <CrmInput
                    type="text"
                    value={customSource}
                    onChange={(e) => setCustomSource(e.target.value)}
                    placeholder="Enter a new enquiry source"
                    className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    required
                  />
                  <CrmButton
                    type="button"
                    onClick={() => {
                      setSource("Cold Call");
                      setCustomSource("");
                    }}
                    className="text-xs font-semibold text-[var(--mnx-accent)]"
                  >
                    Use a preset source instead
                  </CrmButton>
                </div>
              ) : null}
            </div>
          </div>
          {isDirectEnquiry ? (
            <div>
              <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
                Enquiry Status
              </label>
              <CrmInput type="hidden" name="status" value="INTERESTED" />
              <div className="flex min-h-10 items-center rounded-lg border border-[var(--mnx-accent)]/30 bg-[var(--mnx-accent)]/10 px-3.5 text-sm font-semibold text-[var(--mnx-accent)]">
                Interested
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
                Lead Status
              </label>
              <NativeSelect
                name="status"
                defaultValue={initialData?.status || "NEW"}
                className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)]"
              >
                {statuses.map((st) => (
                  <option key={st} value={st}>
                    {st.replace("_", " ")}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
              Rating
            </label>
            <NativeSelect
              name="rating"
              defaultValue={initialData?.rating || "Warm"}
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)]"
            >
              {ratings.map((rt) => (
                <option key={rt} value={rt}>
                  {rt}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
              Industry Segment
            </label>
            <CrmInput
              type="text"
              name="industry"
              defaultValue={initialData?.industry || ""}
              placeholder="e.g. Shipping / Logistics"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
              Annual Revenue (INR)
            </label>
            <CrmInput
              type="number"
              name="annualRevenue"
              defaultValue={initialData?.annualRevenue || ""}
              placeholder="e.g. 5000000"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
              Lead Owner (HRMS Linked) *
            </label>
            <NativeSelect
              name="ownerId"
              defaultValue={initialData?.ownerId || ""}
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)]"
              required
            >
              <option value="">Select Owner</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
      </div>

      {/* ─── SECTION: PERISHABLE CARGO ───────────────────────────────────── */}
      <div className="space-y-4 p-5 rounded-xl bg-[var(--mnx-surface)]/45 border border-[var(--mnx-border)] mnx-crm-hover transition-all">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-[var(--mnx-text-strong)] uppercase tracking-wider">
              Perishable Cargo Handling
            </h4>
            <p className="text-[11px] text-[var(--mnx-muted)]">
              Specify if this client requires temperature-controlled or
              perishable cargo shipping
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <CrmInput
              type="checkbox"
              checked={isPerishable}
              onChange={(e) => {
                const checked = e.target.checked;
                setIsPerishable(checked);
                if (checked) {
                  setShowPerishablesDialog(true);
                }
              }}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-[var(--mnx-border)] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--mnx-soft)] peer-checked:after:bg-[var(--mnx-accent)] after:border-[var(--mnx-border)] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--mnx-accent)]/10 peer-checked:border-[var(--mnx-accent)]/40"></div>
          </label>
        </div>

        {/* Hidden inputs to be caught by FormData */}
        <CrmInput
          type="hidden"
          name="isPerishable"
          value={isPerishable ? "true" : "false"}
        />
        <CrmInput type="hidden" name="perishableType" value={perishableType} />
        <CrmInput type="hidden" name="tempRequired" value={tempRequired} />
        <CrmInput
          type="hidden"
          name="humidityControl"
          value={humidityControl}
        />
        <CrmInput type="hidden" name="ventilation" value={ventilation} />
        <CrmInput
          type="hidden"
          name="perishableRemarks"
          value={perishableRemarks}
        />

        {isPerishable && (
          <div className="p-4 bg-[var(--mnx-surface)]/60 rounded-lg border border-[var(--mnx-border)]/50 text-xs grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-200">
            <div>
              <span className="text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide block mb-0.5">
                Cargo Type
              </span>
              <span className="text-[var(--mnx-text-strong)] font-medium">
                {perishableType || "Not specified"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide block mb-0.5">
                Temperature Range
              </span>
              <span className="text-[var(--mnx-text-strong)] font-medium">
                {tempRequired || "Not specified"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide block mb-0.5">
                Humidity / Vent
              </span>
              <span className="text-[var(--mnx-text-strong)] font-medium">
                H: {humidityControl || "N/A"} / V: {ventilation || "N/A"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide block mb-0.5">
                Remarks
              </span>
              <span className="text-[var(--mnx-text-strong)] font-medium block truncate">
                {perishableRemarks || "None"}
              </span>
            </div>
            <div className="col-span-2 md:col-span-4 flex justify-end pt-1">
              <CrmButton
                type="button"
                onClick={() => setShowPerishablesDialog(true)}
                className="px-3 py-1 bg-[var(--mnx-surface)] hover:bg-[var(--mnx-text-muted)] border border-[var(--mnx-border)] text-[var(--mnx-accent)] rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Edit Perishable Info
              </CrmButton>
            </div>
          </div>
        )}
      </div>

      {showPerishablesDialog && (
        <CrmDialogLayer
          open={showPerishablesDialog}
          onClose={() => setShowPerishablesDialog(false)}
          size="default"
          labelledBy="perishable-cargo-title"
        >
          <div className="w-full max-w-md bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--mnx-border)]/50 bg-[var(--mnx-surface)]">
              <span
                id="perishable-cargo-title"
                className="font-bold text-xs text-[var(--mnx-text-strong)] uppercase tracking-wider"
              >
                Perishable Cargo Specification
              </span>
              <CrmButton
                type="button"
                onClick={() => setShowPerishablesDialog(false)}
                className="p-1 hover:bg-[var(--mnx-soft)] rounded text-[var(--mnx-muted)] hover:text-[var(--mnx-text-strong)] cursor-pointer"
              >
                <X className="size-4" />
              </CrmButton>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                  Cargo Type (e.g. Fresh Fruits, Seafood, Vaccines)
                </label>
                <CrmInput
                  type="text"
                  placeholder="e.g. Chilled Blueberries"
                  value={perishableType}
                  onChange={(e) => setPerishableType(e.target.value)}
                  className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/40 rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                    Required Temp (°C)
                  </label>
                  <CrmInput
                    type="text"
                    placeholder="e.g. 2°C to 4°C"
                    value={tempRequired}
                    onChange={(e) => setTempRequired(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/40 rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                    Humidity (%)
                  </label>
                  <CrmInput
                    type="text"
                    placeholder="e.g. 85%"
                    value={humidityControl}
                    onChange={(e) => setHumidityControl(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/40 rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                    Ventilation
                  </label>
                  <CrmInput
                    type="text"
                    placeholder="e.g. 25 cbm/h"
                    value={ventilation}
                    onChange={(e) => setVentilation(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[var(--mnx-surface)] border border-[var(--mnx-accent)]/40 rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1">
                  Special Remarks & Instructions
                </label>
                <CrmTextarea
                  rows={3}
                  placeholder="Provide remarks regarding temperature logging, reefer power connection, or pre-cooling needs..."
                  value={perishableRemarks}
                  onChange={(e) => setPerishableRemarks(e.target.value)}
                  className="w-full p-2.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-xs text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)] placeholder:text-[var(--mnx-muted)] resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 bg-[var(--mnx-surface)] border-t border-[var(--mnx-border)]/30">
              <CrmButton
                type="button"
                onClick={() => {
                  setShowPerishablesDialog(false);
                }}
                className="px-4 py-2 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] text-[var(--mnx-text-strong)] rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Save Details
              </CrmButton>
            </div>
          </div>
        </CrmDialogLayer>
      )}

      {/* ─── SECTION: ADDRESS ───────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[var(--mnx-text-strong)] uppercase tracking-wider border-b border-[var(--mnx-border)]/30 pb-2 flex items-center gap-2">
          <MapPin className="size-4 text-[var(--mnx-accent)]" />
          <span>Address Details</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
              Street Address
            </label>
            <CrmInput
              type="text"
              name="address"
              defaultValue={initialData?.address || ""}
              placeholder="e.g. 14 East Coast Road, Thiruvanmiyur"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
              City
            </label>
            <CrmInput
              type="text"
              name="city"
              defaultValue={initialData?.city || ""}
              placeholder="e.g. Chennai"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
              State
            </label>
            <CrmInput
              type="text"
              name="state"
              defaultValue={initialData?.state || ""}
              placeholder="e.g. Tamil Nadu"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
              Pincode
            </label>
            <CrmInput
              type="text"
              name="pincode"
              defaultValue={initialData?.pincode || ""}
              placeholder="e.g. 600041"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
              Country
            </label>
            <CrmInput
              type="text"
              name="country"
              defaultValue={initialData?.country || ""}
              placeholder="e.g. India"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
              Comma-separated Tags
            </label>
            <CrmInput
              type="text"
              name="tags"
              defaultValue={initialData?.tags?.join(", ") || ""}
              placeholder="e.g. VIP, Customs Clearance, CHA"
              className="w-full px-3.5 py-2 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-bold text-[var(--mnx-muted)] uppercase tracking-wide mb-1.5">
          Enquiry / Description
        </label>
        <CrmTextarea
          name="description"
          defaultValue={initialData?.description || ""}
          placeholder="Enter details of customer enquiry, freight needs, or meeting notes..."
          rows={4}
          className="w-full p-3.5 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3.5 pt-4 border-t border-[var(--mnx-border)]/30">
        <CrmButton
          type="button"
          onClick={handleFillDemo}
          className="px-5 py-2 bg-[var(--mnx-accent)]/10 hover:bg-[var(--mnx-accent)]/20 border border-[var(--mnx-accent)]/35 text-[var(--mnx-accent)] rounded-lg text-sm font-semibold cursor-pointer"
        >
          Fill Demo Data
        </CrmButton>
        <CrmButton
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2 bg-[var(--mnx-surface)] hover:bg-[var(--mnx-text-muted)] text-[var(--mnx-muted)] border border-[var(--mnx-border)]/80 rounded-lg text-sm font-semibold cursor-pointer"
        >
          Cancel
        </CrmButton>
        <CrmButton
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-2 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] disabled:opacity-50 text-[var(--mnx-text-strong)] rounded-lg text-sm font-bold transition-all mnx-shadow-panel cursor-pointer"
        >
          <Save className="size-4.5" />
          <span>
            {isSubmitting
              ? "Saving..."
              : isEdit
                ? isDirectEnquiry
                  ? "Update Enquiry"
                  : "Update Lead"
                : isDirectEnquiry
                  ? "Save Enquiry"
                  : "Save Lead"}
          </span>
        </CrmButton>
      </div>
    </form>
  );
}
