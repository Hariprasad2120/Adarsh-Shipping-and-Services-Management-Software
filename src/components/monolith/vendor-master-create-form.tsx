"use client";

import Link from "next/link";
import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/monolith/button";
import { Input } from "@/components/monolith/input";
import {
  ChaNativeSelect as NativeSelect,
  ChaPanel,
  ChaRoutePageHeader,
} from "@/components/monolith/cha-workspace";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  DollarSign,
  FileText,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Truck,
  User,
} from "lucide-react";
import {
  createVendorAction,
  fetchGstDetailsAction,
} from "@/modules/crm/actions";
import {
  GST_PUBLIC_SEARCH_URL,
  isGstLookupConfigurationError,
} from "@/lib/gst-public-search";

type EmployeeOption = {
  id: string;
  name: string;
};

type VendorMasterCreateFormProps = {
  employees: EmployeeOption[];
  basePath?: string;
};

const steps = [
  { id: 1, label: "Profile", icon: <User size={16} /> },
  { id: 2, label: "Contact", icon: <Mail size={16} /> },
  { id: 3, label: "Address", icon: <MapPin size={16} /> },
  { id: 4, label: "Finance", icon: <DollarSign size={16} /> },
  { id: 5, label: "KYC Documents", icon: <FileText size={16} /> },
  { id: 6, label: "Portal", icon: <Globe size={16} /> },
  { id: 7, label: "Review", icon: <Check size={16} /> },
];

export function VendorMasterCreateForm({
  employees,
  basePath = "/accounting/vendor-master",
}: VendorMasterCreateFormProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [gstManualFallback, setGstManualFallback] = useState(false);

  const [vendorSubType, setVendorSubType] = useState("Business");
  const [companyName, setCompanyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [industry, setIndustry] = useState("Customs & Logistics Services");
  const [language, setLanguage] = useState("English");
  const [gstTreatment, setGstTreatment] = useState(
    "Registered Business - Regular",
  );
  const [placeOfSupply, setPlaceOfSupply] = useState("Tamil Nadu");
  const [pan, setPan] = useState("");
  const [gstin, setGstin] = useState("");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [channelEmail, setChannelEmail] = useState(true);
  const [channelSms, setChannelSms] = useState(false);

  const [billingAttention, setBillingAttention] = useState("");
  const [billingCountry, setBillingCountry] = useState("India");
  const [billingStreet1, setBillingStreet1] = useState("");
  const [billingStreet2, setBillingStreet2] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingPincode, setBillingPincode] = useState("");
  const [billingPhone, setBillingPhone] = useState("");
  const [billingFax, setBillingFax] = useState("");

  const [shippingAttention, setShippingAttention] = useState("");
  const [shippingCountry, setShippingCountry] = useState("India");
  const [shippingStreet1, setShippingStreet1] = useState("");
  const [shippingStreet2, setShippingStreet2] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [shippingPincode, setShippingPincode] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingFax, setShippingFax] = useState("");

  const [serviceCategory, setServiceCategory] = useState(
    "Custom Clearance & Forwarding",
  );
  const [currency, setCurrency] = useState("INR");
  const [openingBalanceBranch, setOpeningBalanceBranch] = useState("Chennai");
  const [openingBalanceAmount, setOpeningBalanceAmount] = useState("0");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [ownerId, setOwnerId] = useState(employees[0]?.id || "");
  const [taxPreference, setTaxPreference] = useState("Taxable");

  const [isPortalEnabled, setIsPortalEnabled] = useState(false);

  const [gstFile, setGstFile] = useState<File | null>(null);
  const [panFile, setPanFile] = useState<File | null>(null);
  const [msmeFile, setMsmeFile] = useState<File | null>(null);
  const [bankProofFile, setBankProofFile] = useState<File | null>(null);
  const [addressProofFile, setAddressProofFile] = useState<File | null>(null);

  const handleGstinChange = async (val: string) => {
    const cleanGst = val.trim().toUpperCase();
    setGstin(cleanGst);

    if (cleanGst.length >= 12) {
      setPan(cleanGst.substring(2, 12));
    }

    if (cleanGst.length === 15) {
      setGstManualFallback(false);
      const promise = fetchGstDetailsAction(cleanGst).then((res) => {
        if (!res.ok) {
          if (isGstLookupConfigurationError(res.error)) {
            setGstManualFallback(true);
            throw new Error(
              "Automatic GST lookup is unavailable right now. Use Verify on GST Portal to confirm and copy the details manually.",
            );
          }
          throw new Error(res.error || "GST fetch failed");
        }

        const d = res.data as
          | {
              legalName: string;
              tradeName?: string;
              gstTreatment: string;
              placeOfSupply: string;
              billingAddress?: {
                attention?: string;
                country?: string;
                street1?: string;
                street2?: string;
                city?: string;
                state?: string;
                pincode?: string;
                phone?: string;
                fax?: string;
              };
            }
          | undefined;

        if (!d) {
          throw new Error("GST registration details were empty");
        }

        setCompanyName(d.legalName);
        setDisplayName(d.tradeName || d.legalName);
        setGstTreatment(d.gstTreatment);
        setPlaceOfSupply(d.placeOfSupply);

        if (d.billingAddress) {
          setBillingAttention(d.billingAddress.attention ?? "");
          setBillingCountry(d.billingAddress.country ?? "");
          setBillingStreet1(d.billingAddress.street1 ?? "");
          setBillingStreet2(d.billingAddress.street2 ?? "");
          setBillingCity(d.billingAddress.city ?? "");
          setBillingState(d.billingAddress.state ?? "");
          setBillingPincode(d.billingAddress.pincode ?? "");
          setBillingPhone(d.billingAddress.phone ?? "");
          setBillingFax(d.billingAddress.fax ?? "");

          setShippingAttention(d.billingAddress.attention ?? "");
          setShippingCountry(d.billingAddress.country ?? "");
          setShippingStreet1(d.billingAddress.street1 ?? "");
          setShippingStreet2(d.billingAddress.street2 ?? "");
          setShippingCity(d.billingAddress.city ?? "");
          setShippingState(d.billingAddress.state ?? "");
          setShippingPincode(d.billingAddress.pincode ?? "");
          setShippingPhone(d.billingAddress.phone ?? "");
          setShippingFax(d.billingAddress.fax ?? "");
        }

        return `Auto-populated details for ${d.legalName}`;
      });

      toast.promise(promise, {
        loading: "Fetching GST registration details...",
        success: (msg) => msg,
        error: (err) => err.message || "Failed to fetch GST details",
      });
    }
  };

  const handleCopyAddress = () => {
    setShippingAttention(billingAttention);
    setShippingCountry(billingCountry);
    setShippingStreet1(billingStreet1);
    setShippingStreet2(billingStreet2);
    setShippingCity(billingCity);
    setShippingState(billingState);
    setShippingPincode(billingPincode);
    setShippingPhone(billingPhone);
    setShippingFax(billingFax);
    toast.success("Billing address copied to Shipping address");
  };

  const handleNameFieldBlur = () => {
    if (!displayName) {
      if (companyName) setDisplayName(companyName);
      else if (contactPerson) setDisplayName(contactPerson);
    }
  };

  const validateStep = () => {
    if (currentStep === 1) {
      const computedName = displayName || companyName || contactPerson;
      if (!computedName) {
        toast.error("Please enter a Vendor Display Name or Company Name.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const formatAddressString = () => {
    const parts = [];
    if (billingAttention) parts.push(`Attention: ${billingAttention}`);
    if (billingStreet1) parts.push(billingStreet1);
    if (billingStreet2) parts.push(billingStreet2);

    const cityStateZip = [];
    if (billingCity) cityStateZip.push(billingCity);
    if (billingState) cityStateZip.push(billingState);
    if (billingPincode) cityStateZip.push(billingPincode);
    if (cityStateZip.length > 0) parts.push(cityStateZip.join(", "));

    if (billingCountry) parts.push(billingCountry);
    if (billingPhone) parts.push(`Phone: ${billingPhone}`);
    if (billingFax) parts.push(`Fax: ${billingFax}`);

    return parts.join("\n").trim();
  };

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    const payload = new FormData();
    const nameToSave =
      displayName.trim() ||
      companyName.trim() ||
      contactPerson.trim() ||
      "Unnamed Vendor";

    payload.set("name", nameToSave);
    payload.set("contactName", contactPerson.trim());
    payload.set("phone", phone.trim());
    payload.set("email", email.trim());
    payload.set("gstin", gstin.trim().toUpperCase());
    payload.set("services", serviceCategory.trim() || industry.trim());
    payload.set("address", formatAddressString());
    payload.set("ownerId", ownerId);
    payload.set("status", "ACTIVE");

    try {
      const result = await createVendorAction(payload);
      if (!result.ok) {
        toast.error(result.error || "Failed to save vendor");
        return;
      }

      toast.success("Vendor master saved");
      router.push(basePath);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save vendor",
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-w-0 space-y-8">
      <ChaRoutePageHeader
        eyebrow="Vendor onboarding"
        title="New vendor"
        description="Create a supplier profile with contact, finance, KYC, and portal settings."
        actions={
          <>
            <Button
              variant="outline"
              type="button"
              onClick={() => router.push(basePath)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (currentStep === 7) {
                  void handleSubmit();
                  return;
                }
                handleNext();
              }}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {currentStep === 7 ? "Save Vendor" : "Continue"}
            </Button>
          </>
        }
      />

      <ChaPanel className="p-6">
        <div className="relative mt-8 select-none">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 mnx-bg-muted -translate-y-1/2 hidden md:block" />
          <div className="relative z-10 flex flex-col items-center justify-between gap-4 md:flex-row">
            {steps.map((s) => {
              const isActive = s.id === currentStep;
              const isCompleted = s.id < currentStep;
              return (
                <div key={s.id} className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
                      isActive
                        ? "mnx-bg-accent mnx-border-accent mnx-text-muted mnx-shadow-panel"
                        : isCompleted
                          ? "mnx-bg-accent mnx-border-accent mnx-text-muted"
                          : "mnx-bg-surface mnx-border mnx-text-muted"
                    }`}
                  >
                    {isCompleted ? <Check size={18} /> : s.id}
                  </div>
                  <span
                    className={`mt-2 text-xs font-semibold uppercase tracking-wider ${
                      isActive ? "mnx-text-accent font-bold" : "mnx-text-muted"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </ChaPanel>

      <form
        onSubmit={handleSubmit}
        className="mnx-bg-surface space-y-6 rounded-2xl border mnx-border p-6 shadow-sm"
      >
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="border-b mnx-border pb-3">
              <h2 className="flex items-center gap-2 text-base font-bold uppercase font-display mnx-text-primary">
                <Truck className="mnx-text-accent size-5" /> Vendor Profile
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider mnx-text-muted">
                  Vendor Type
                </label>
                <div className="flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium mnx-text-primary">
                    <Input
                      type="radio"
                      name="vendorSubType"
                      value="Business"
                      checked={vendorSubType === "Business"}
                      onChange={() => setVendorSubType("Business")}
                      className="mnx-choice-control size-4"
                    />
                    Business
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium mnx-text-primary">
                    <Input
                      type="radio"
                      name="vendorSubType"
                      value="Individual"
                      checked={vendorSubType === "Individual"}
                      onChange={() => setVendorSubType("Individual")}
                      className="mnx-choice-control size-4"
                    />
                    Individual
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider mnx-text-muted">
                    Vendor Company Name *
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. South Linehaul Packers"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    onBlur={handleNameFieldBlur}
                    className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface mnx-text-primary focus:outline-none focus:ring-2 mnx-focus-accent"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider mnx-text-muted">
                    Display Name *
                  </label>
                  <Input
                    type="text"
                    placeholder="Vendor display name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full h-10 rounded-xl border px-3.5 text-sm font-semibold mnx-border mnx-bg-surface mnx-text-primary focus:outline-none focus:ring-2 mnx-focus-accent"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider mnx-text-muted">
                    Service Segment
                  </label>
                  <Input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface mnx-text-primary focus:outline-none focus:ring-2 mnx-focus-accent"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider mnx-text-muted">
                    Vendor Language
                  </label>
                  <NativeSelect
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full h-10 rounded-xl border px-3 mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Telugu">Telugu</option>
                  </NativeSelect>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider mnx-text-muted">
                    GST Treatment
                  </label>
                  <NativeSelect
                    value={gstTreatment}
                    onChange={(e) => setGstTreatment(e.target.value)}
                    className="w-full h-10 rounded-xl border px-3 mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                  >
                    <option value="Registered Business - Regular">
                      Registered Business - Regular
                    </option>
                    <option value="Registered Business - Composition">
                      Registered Business - Composition
                    </option>
                    <option value="Unregistered Business">
                      Unregistered Business
                    </option>
                    <option value="Consumer">Consumer</option>
                    <option value="Overseas">Overseas</option>
                    <option value="SEZ">SEZ</option>
                  </NativeSelect>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider mnx-text-muted">
                    GSTIN
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. 33AABCA1234F1Z1"
                    value={gstin}
                    onChange={(e) => void handleGstinChange(e.target.value)}
                    className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface mnx-text-primary focus:outline-none"
                  />
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                    <Link
                      href={GST_PUBLIC_SEARCH_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold mnx-text-accent hover:underline"
                    >
                      Verify on GST Portal
                    </Link>
                    <span className="mnx-text-muted">
                      Public portal lookup requires manual captcha verification.
                    </span>
                  </div>
                  {gstManualFallback ? (
                    <p className="mt-1 text-[11px] mnx-text-muted">
                      Auto-fetch is not configured for this environment yet. Use
                      the GST Portal link above to verify the GSTIN and enter the
                      details manually.
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider mnx-text-muted">
                    PAN Card Number
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. ABCDE1234F"
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface mnx-text-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="border-b mnx-border pb-3">
              <h2 className="flex items-center gap-2 text-base font-bold uppercase font-display mnx-text-primary">
                <Mail className="mnx-text-accent size-5" /> Vendor Contact
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider mnx-text-muted">
                  Contact Person
                </label>
                <Input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface mnx-text-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider mnx-text-muted">
                  Website
                </label>
                <Input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="e.g. https://vendor.com"
                  className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface mnx-text-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider mnx-text-muted">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. ops@vendor.com"
                  className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface mnx-text-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider mnx-text-muted">
                  Phone
                </label>
                <Input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 94440 12345"
                  className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface mnx-text-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider mnx-text-muted">
                Communication Preferences
              </label>
              <div className="flex gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium mnx-text-primary">
                  <Input
                    type="checkbox"
                    checked={channelEmail}
                    onChange={(e) => setChannelEmail(e.target.checked)}
                    className="mnx-choice-control size-4"
                  />
                  Email updates
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium mnx-text-primary">
                  <Input
                    type="checkbox"
                    checked={channelSms}
                    onChange={(e) => setChannelSms(e.target.checked)}
                    className="mnx-choice-control size-4"
                  />
                  SMS updates
                </label>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="border-b mnx-border pb-3">
              <h2 className="flex items-center gap-2 text-base font-bold uppercase font-display mnx-text-primary">
                <MapPin className="mnx-text-accent size-5" /> Vendor Address
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider mnx-text-muted">
                  Billing Address
                </h3>
                <Input
                  placeholder="Attention"
                  value={billingAttention}
                  onChange={(e) => setBillingAttention(e.target.value)}
                  className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface"
                />
                <Input
                  placeholder="Street 1"
                  value={billingStreet1}
                  onChange={(e) => setBillingStreet1(e.target.value)}
                  className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface"
                />
                <Input
                  placeholder="Street 2"
                  value={billingStreet2}
                  onChange={(e) => setBillingStreet2(e.target.value)}
                  className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="City"
                    value={billingCity}
                    onChange={(e) => setBillingCity(e.target.value)}
                    className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface"
                  />
                  <Input
                    placeholder="State"
                    value={billingState}
                    onChange={(e) => setBillingState(e.target.value)}
                    className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Pincode"
                    value={billingPincode}
                    onChange={(e) => setBillingPincode(e.target.value)}
                    className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface"
                  />
                  <Input
                    placeholder="Country"
                    value={billingCountry}
                    onChange={(e) => setBillingCountry(e.target.value)}
                    className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Phone"
                    value={billingPhone}
                    onChange={(e) => setBillingPhone(e.target.value)}
                    className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface"
                  />
                  <Input
                    placeholder="Fax"
                    value={billingFax}
                    onChange={(e) => setBillingFax(e.target.value)}
                    className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider mnx-text-muted">
                    Shipping Address
                  </h3>
                  <Button type="button" variant="outline" onClick={handleCopyAddress}>
                    Copy Billing
                  </Button>
                </div>
                <Input
                  placeholder="Attention"
                  value={shippingAttention}
                  onChange={(e) => setShippingAttention(e.target.value)}
                  className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface"
                />
                <Input
                  placeholder="Street 1"
                  value={shippingStreet1}
                  onChange={(e) => setShippingStreet1(e.target.value)}
                  className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface"
                />
                <Input
                  placeholder="Street 2"
                  value={shippingStreet2}
                  onChange={(e) => setShippingStreet2(e.target.value)}
                  className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="City"
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                    className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface"
                  />
                  <Input
                    placeholder="State"
                    value={shippingState}
                    onChange={(e) => setShippingState(e.target.value)}
                    className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Pincode"
                    value={shippingPincode}
                    onChange={(e) => setShippingPincode(e.target.value)}
                    className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface"
                  />
                  <Input
                    placeholder="Country"
                    value={shippingCountry}
                    onChange={(e) => setShippingCountry(e.target.value)}
                    className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Phone"
                    value={shippingPhone}
                    onChange={(e) => setShippingPhone(e.target.value)}
                    className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface"
                  />
                  <Input
                    placeholder="Fax"
                    value={shippingFax}
                    onChange={(e) => setShippingFax(e.target.value)}
                    className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="border-b mnx-border pb-3">
              <h2 className="flex items-center gap-2 text-base font-bold uppercase font-display mnx-text-primary">
                <DollarSign className="mnx-text-accent size-5" /> Vendor Finance
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider mnx-text-muted">
                  Services Provided
                </label>
                <Input
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                  placeholder="e.g. Custom clearance, linehaul trucking"
                  className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider mnx-text-muted">
                  Currency
                </label>
                <NativeSelect
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-10 rounded-xl border px-3 mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </NativeSelect>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider mnx-text-muted">
                  Opening Balance Branch
                </label>
                <Input
                  value={openingBalanceBranch}
                  onChange={(e) => setOpeningBalanceBranch(e.target.value)}
                  className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider mnx-text-muted">
                  Opening Balance Amount
                </label>
                <Input
                  type="number"
                  value={openingBalanceAmount}
                  onChange={(e) => setOpeningBalanceAmount(e.target.value)}
                  className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider mnx-text-muted">
                  Payment Terms
                </label>
                <NativeSelect
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full h-10 rounded-xl border px-3 mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                >
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 45">Net 45</option>
                  <option value="Due on Receipt">Due on Receipt</option>
                </NativeSelect>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider mnx-text-muted">
                  Vendor Owner / Account Manager
                </label>
                <NativeSelect
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="w-full h-10 rounded-xl border px-3 mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider mnx-text-muted">
                  Tax Preference
                </label>
                <NativeSelect
                  value={taxPreference}
                  onChange={(e) => setTaxPreference(e.target.value)}
                  className="w-full h-10 rounded-xl border px-3 mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                >
                  <option value="Taxable">Taxable</option>
                  <option value="Tax Exempt">Tax Exempt</option>
                </NativeSelect>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider mnx-text-muted">
                  Place of Supply
                </label>
                <Input
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  className="w-full h-10 rounded-xl border px-3.5 text-sm mnx-border mnx-bg-surface"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="border-b mnx-border pb-3">
              <h2 className="flex items-center gap-2 text-base font-bold uppercase font-display mnx-text-primary">
                <FileText className="mnx-text-accent size-5" /> Vendor KYC Documents
              </h2>
            </div>

            <p className="text-xs mnx-text-muted">
              Capture the same onboarding checklist visually as customer
              creation. These selections are currently reviewed in the wizard
              but are not yet persisted into a vendor document store.
            </p>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {[
                { label: "GST Registration", file: gstFile, setter: setGstFile },
                { label: "PAN Card", file: panFile, setter: setPanFile },
                {
                  label: "MSME Certificate",
                  file: msmeFile,
                  setter: setMsmeFile,
                },
                {
                  label: "Bank Proof",
                  file: bankProofFile,
                  setter: setBankProofFile,
                },
                {
                  label: "Address Proof",
                  file: addressProofFile,
                  setter: setAddressProofFile,
                },
              ].map(({ label, file, setter }) => (
                <div
                  key={label}
                  className="space-y-2 rounded-xl border p-4 mnx-border mnx-bg-surface"
                >
                  <label className="block text-xs font-bold uppercase tracking-wider mnx-text-muted">
                    {label}
                  </label>
                  <Input
                    type="file"
                    onChange={(e) => setter(e.target.files?.[0] || null)}
                    className="w-full text-xs mnx-text-muted file:mr-4 file:rounded-xl file:border-0 file:px-3 file:py-1.5 file:text-xs file:font-semibold mnx-bg-accent mnx-text-accent"
                    accept=".pdf,.png,.jpg,.jpeg"
                  />
                  {file ? (
                    <p className="text-[10px] font-semibold mnx-text-success">
                      Selected: {(file as File).name}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="border-b mnx-border pb-3">
              <h2 className="flex items-center gap-2 text-base font-bold uppercase font-display mnx-text-primary">
                <Globe className="mnx-text-accent size-5" /> Vendor Portal Access
              </h2>
            </div>

            <div className="space-y-4 rounded-xl border p-5 mnx-border mnx-bg-soft">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold mnx-text-primary">
                    Enable Vendor Portal
                  </h3>
                  <p className="mt-1 text-xs mnx-text-muted">
                    Keep the vendor onboarding workflow aligned with customer
                    master. This toggle is currently informational and is not yet
                    persisted for vendor records.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer select-none items-center">
                  <Input
                    type="checkbox"
                    checked={isPortalEnabled}
                    onChange={(e) => setIsPortalEnabled(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full mnx-bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:transition-all after:content-[''] peer-checked:after:translate-x-full mnx-border mnx-bg-soft" />
                </label>
              </div>
            </div>
          </div>
        )}

        {currentStep === 7 && (
          <div className="space-y-6">
            <div className="border-b mnx-border pb-3">
              <h2 className="flex items-center gap-2 text-base font-bold uppercase font-display mnx-text-primary">
                <Check className="mnx-text-accent size-5" /> Review and Confirm
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3 rounded-xl border p-4 mnx-border mnx-bg-soft">
                <h3 className="text-xs font-bold uppercase mnx-text-muted">
                  Primary Profile
                </h3>
                <div className="space-y-1.5 text-sm">
                  <p>
                    <span className="font-semibold mnx-text-muted">Type:</span>{" "}
                    {vendorSubType}
                  </p>
                  <p>
                    <span className="font-semibold mnx-text-muted">Name:</span>{" "}
                    {displayName || companyName || "—"}
                  </p>
                  <p>
                    <span className="font-semibold mnx-text-muted">
                      Services:
                    </span>{" "}
                    {serviceCategory}
                  </p>
                  <p>
                    <span className="font-semibold mnx-text-muted">GSTIN:</span>{" "}
                    {gstin || "—"}
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border p-4 mnx-border mnx-bg-soft">
                <h3 className="text-xs font-bold uppercase mnx-text-muted">
                  Contact Info
                </h3>
                <div className="space-y-1.5 text-sm">
                  <p>
                    <span className="font-semibold mnx-text-muted">Contact:</span>{" "}
                    {contactPerson || "—"}
                  </p>
                  <p>
                    <span className="font-semibold mnx-text-muted">Email:</span>{" "}
                    {email || "—"}
                  </p>
                  <p>
                    <span className="font-semibold mnx-text-muted">Phone:</span>{" "}
                    {phone || "—"}
                  </p>
                  <p>
                    <span className="font-semibold mnx-text-muted">Portal:</span>{" "}
                    {isPortalEnabled ? "Enabled (informational)" : "Disabled"}
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border p-4 md:col-span-2 mnx-border mnx-bg-soft">
                <h3 className="text-xs font-bold uppercase mnx-text-muted">
                  Selected KYC Documents
                </h3>
                <div className="space-y-1.5 text-xs font-mono">
                  {[
                    { label: "GST", file: gstFile },
                    { label: "PAN", file: panFile },
                    { label: "MSME", file: msmeFile },
                    { label: "Bank", file: bankProofFile },
                    { label: "Address", file: addressProofFile },
                  ].map(({ label, file }) => (
                    <p key={label}>
                      <span className="font-semibold uppercase font-sans mnx-text-muted">
                        {label}:
                      </span>{" "}
                      {file ? (
                        (file as File).name
                      ) : (
                        <span className="mnx-text-muted">No document uploaded</span>
                      )}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-4 mnx-border">
          {currentStep > 1 ? (
            <Button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1 rounded-xl border px-4 py-2 text-sm font-medium transition-colors mnx-border mnx-text-muted"
            >
              <ArrowLeft size={16} /> Back
            </Button>
          ) : (
            <div />
          )}

          {currentStep < 7 ? (
            <Button
              type="button"
              onClick={handleNext}
              className="ml-auto flex items-center gap-1 rounded-xl px-5 py-2 text-sm font-medium transition-colors mnx-bg-accent mnx-hover-accent mnx-text-muted"
            >
              Next <ChevronRight size={16} />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isSubmitting}
              className="ml-auto flex items-center gap-2 rounded-xl px-6 py-2 text-sm font-bold transition-all disabled:opacity-50 mnx-bg-accent mnx-hover-accent mnx-text-muted"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Vendor"
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
