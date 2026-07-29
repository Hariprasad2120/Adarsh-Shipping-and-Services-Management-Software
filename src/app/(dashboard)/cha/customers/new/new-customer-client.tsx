"use client";

import { Input } from "@/components/monolith/input";
import React, { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createAccountAction } from "@/modules/crm/actions";
import {
  User,
  Mail,
  MapPin,
  DollarSign,
  Globe,
  Check,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Building2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/monolith/button";
import {
  ChaNativeSelect as NativeSelect,
  ChaPanel,
  ChaRoutePageHeader,
} from "@/components/monolith/cha-workspace";

interface UserOption {
  id: string;
  name: string;
}

interface NewCustomerClientProps {
  employees: UserOption[];
}

const steps = [
  { id: 1, label: "Profile", icon: <User size={16} /> },
  { id: 2, label: "Contact", icon: <Mail size={16} /> },
  { id: 3, label: "Address", icon: <MapPin size={16} /> },
  { id: 4, label: "Finance", icon: <DollarSign size={16} /> },
  { id: 5, label: "KYC Documents", icon: <FileText size={16} /> },
  { id: 6, label: "Portal", icon: <Globe size={16} /> },
  { id: 7, label: "Review", icon: <Check size={16} /> },
];

export function NewCustomerClient({ employees }: NewCustomerClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect_to");

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Form Fields State
  const [customerSubType, setCustomerSubType] = useState("Business");
  const [companyName, setCompanyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [salutation, setSalutation] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [industry, setIndustry] = useState("Logistics & Freight Forwarding");
  const [language, setLanguage] = useState("English");
  const [gstTreatment, setGstTreatment] = useState("Registered Business - Regular");
  const [placeOfSupply, setPlaceOfSupply] = useState("Tamil Nadu");
  const [pan, setPan] = useState("");
  const [gstin, setGstin] = useState("");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [channelEmail, setChannelEmail] = useState(true);
  const [channelSms, setChannelSms] = useState(false);

  // Address
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

  // Finance
  const [creditLimit, setCreditLimit] = useState("0");
  const [currency, setCurrency] = useState("INR");
  const [openingBalanceBranch, setOpeningBalanceBranch] = useState("Chennai");
  const [openingBalanceAmount, setOpeningBalanceAmount] = useState("0");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [ownerId, setOwnerId] = useState(employees[0]?.id || "");

  // Portal
  const [isPortalEnabled, setIsPortalEnabled] = useState(false);

  // KYC Files
  const [iecFile, setIecFile] = useState<File | null>(null);
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [adCodeFile, setAdCodeFile] = useState<File | null>(null);
  const [fssaiLicenceFile, setFssaiLicenceFile] = useState<File | null>(null);
  const [companyAddressProofFile, setCompanyAddressProofFile] = useState<File | null>(null);
  const [partnerAddressProofFile, setPartnerAddressProofFile] = useState<File | null>(null);
  const [authorisationLetterFile, setAuthorisationLetterFile] = useState<File | null>(null);

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
      else if (firstName || lastName) setDisplayName(`${firstName} ${lastName}`.trim());
    }
  };

  const validateStep = () => {
    if (currentStep === 1) {
      const computedName = displayName || companyName || `${firstName} ${lastName}`.trim();
      if (!computedName) {
        toast.error("Please enter a Customer Display Name or Company Name.");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    const fd = new FormData();
    fd.set("customerSubType", customerSubType);
    fd.set("companyName", companyName);
    fd.set("displayName", displayName);
    fd.set("salutation", salutation);
    fd.set("firstName", firstName);
    fd.set("lastName", lastName);
    fd.set("industry", industry);
    fd.set("language", language);
    fd.set("gstTreatment", gstTreatment);
    fd.set("placeOfSupply", placeOfSupply);
    fd.set("pan", pan);
    fd.set("gstin", gstin);

    fd.set("email", email);
    fd.set("phone", phone);
    fd.set("website", website);
    fd.set("channelEmail", channelEmail ? "true" : "false");
    fd.set("channelSms", channelSms ? "true" : "false");

    fd.set("billingAttention", billingAttention);
    fd.set("billingCountry", billingCountry);
    fd.set("billingStreet1", billingStreet1);
    fd.set("billingStreet2", billingStreet2);
    fd.set("billingCity", billingCity);
    fd.set("billingState", billingState);
    fd.set("billingPincode", billingPincode);
    fd.set("billingPhone", billingPhone);
    fd.set("billingFax", billingFax);

    fd.set("shippingAttention", shippingAttention);
    fd.set("shippingCountry", shippingCountry);
    fd.set("shippingStreet1", shippingStreet1);
    fd.set("shippingStreet2", shippingStreet2);
    fd.set("shippingCity", shippingCity);
    fd.set("shippingState", shippingState);
    fd.set("shippingPincode", shippingPincode);
    fd.set("shippingPhone", shippingPhone);
    fd.set("shippingFax", shippingFax);

    fd.set("creditLimit", creditLimit);
    fd.set("currency", currency);
    fd.set("openingBalanceBranch", openingBalanceBranch);
    fd.set("openingBalanceAmount", openingBalanceAmount);
    fd.set("paymentTerms", paymentTerms);
    fd.set("ownerId", ownerId);
    fd.set("isPortalEnabled", isPortalEnabled ? "true" : "false");

    // Set KYC Files
    if (iecFile) fd.set("kycFile_IEC", iecFile);
    if (gstFile) fd.set("kycFile_GST", gstFile);
    if (adCodeFile) fd.set("kycFile_AD_Code", adCodeFile);
    if (fssaiLicenceFile) fd.set("kycFile_FSSAI_Licence", fssaiLicenceFile);
    if (companyAddressProofFile) fd.set("kycFile_Company_Address_Proof", companyAddressProofFile);
    if (partnerAddressProofFile) fd.set("kycFile_Partner_/_Proprietor_Address_Proof", partnerAddressProofFile);
    if (authorisationLetterFile) fd.set("kycFile_Authorisation_Letter", authorisationLetterFile);

    fd.set("type", "Customer");

    // set primary name
    const nameToSave = displayName.trim() || companyName.trim() || `${firstName} ${lastName}`.trim() || "Unnamed Customer";
    fd.set("name", nameToSave);

    try {
      const res = await createAccountAction(fd);
      if (res.ok) {
        toast.success("Customer created successfully");
        if (redirectTo) {
          const targetUrl = new URL(redirectTo, window.location.origin);
          targetUrl.searchParams.set("customerId", res.data?.id || "");
          targetUrl.searchParams.set("customerName", res.data?.name || nameToSave);
          targetUrl.searchParams.set("new", "true");
          router.push(`${targetUrl.pathname}${targetUrl.search}`);
        } else {
          router.push("/cha/customers");
        }
      } else {
        toast.error(res.error || "Failed to create customer");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Wizard Header */}
      <ChaRoutePageHeader
        actions={
          <>
            <Button
              variant="outline"
              type="button"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={currentStep === 7 ? handleSubmit : handleNext}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {currentStep === 7 ? "Save Customer" : "Continue"}
            </Button>
          </>
        }
      />

      <ChaPanel className="p-6">
        {/* Stepper Steps UI */}
        <div className="relative mt-8 select-none">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 mnx-bg-muted -translate-y-1/2 mnx-bg-muted hidden md:block" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
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
                          : "mnx-bg-surface mnx-border mnx-text-muted mnx-border"
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

      {/* Main Form Fields Container */}
      <form onSubmit={handleSubmit} className="mnx-bg-surface rounded-2xl border mnx-border p-6 shadow-sm mnx-border space-y-6">
        
        {/* Step 1: Profile */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="border-b mnx-border pb-3 mnx-border">
              <h2 className="text-base font-bold mnx-text-primary uppercase font-display flex items-center gap-2">
                <User className="mnx-text-accent size-5" /> Customer Profile
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-2">Customer Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm mnx-text-primary cursor-pointer font-medium">
                    <Input
                      type="radio"
                      name="customerSubType"
                      value="Business"
                      checked={customerSubType === "Business"}
                      onChange={() => setCustomerSubType("Business")}
                      className="mnx-choice-control size-4"
                    />
                    Business
                  </label>
                  <label className="flex items-center gap-2 text-sm mnx-text-primary cursor-pointer font-medium">
                    <Input
                      type="radio"
                      name="customerSubType"
                      value="Individual"
                      checked={customerSubType === "Individual"}
                      onChange={() => setCustomerSubType("Individual")}
                      className="mnx-choice-control size-4"
                    />
                    Individual
                  </label>
                </div>
              </div>

              {customerSubType === "Business" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">Company Name *</label>
                    <Input
                      type="text"
                      placeholder="e.g. Adarsh Shipping Ltd"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      onBlur={handleNameFieldBlur}
                      className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none focus:ring-2 mnx-focus-accent"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">Display Name *</label>
                    <Input
                      type="text"
                      placeholder="Customer display name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm font-semibold mnx-text-primary focus:outline-none focus:ring-2 mnx-focus-accent"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-3">
                      <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">Salutation</label>
                      <NativeSelect
                        value={salutation}
                        onChange={(e) => setSalutation(e.target.value)}
                        className="w-full h-10 px-3 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                      >
                        <option value="">Select</option>
                        <option value="Mr.">Mr.</option>
                        <option value="Mrs.">Mrs.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Dr.">Dr.</option>
                      </NativeSelect>
                    </div>
                    <div className="col-span-4">
                      <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">First Name *</label>
                      <Input
                        type="text"
                        placeholder="First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        onBlur={handleNameFieldBlur}
                        className="w-full h-10 px-3 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                      />
                    </div>
                    <div className="col-span-5">
                      <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">Last Name</label>
                      <Input
                        type="text"
                        placeholder="Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        onBlur={handleNameFieldBlur}
                        className="w-full h-10 px-3 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">Display Name *</label>
                    <Input
                      type="text"
                      placeholder="Display Name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm font-semibold mnx-text-primary focus:outline-none"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">Industry Segment</label>
                  <NativeSelect
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                  >
                    <option value="Logistics & Freight Forwarding">Logistics & Freight Forwarding</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Trading & Retail">Trading & Retail</option>
                    <option value="Imports / Exports">Imports / Exports</option>
                    <option value="Chemicals">Chemicals</option>
                  </NativeSelect>
                </div>
                <div>
                  <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">Customer Language</label>
                  <NativeSelect
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Tamil">Tamil</option>
                    <option value="Telugu">Telugu</option>
                  </NativeSelect>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">GST Treatment</label>
                  <NativeSelect
                    value={gstTreatment}
                    onChange={(e) => setGstTreatment(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                  >
                    <option value="Registered Business - Regular">Registered Business - Regular</option>
                    <option value="Registered Business - Composition">Registered Business - Composition</option>
                    <option value="Unregistered Business">Unregistered Business</option>
                    <option value="Consumer">Consumer</option>
                    <option value="Overseas">Overseas</option>
                    <option value="SEZ">SEZ</option>
                  </NativeSelect>
                </div>
                <div>
                  <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">GSTIN</label>
                  <Input
                    type="text"
                    placeholder="e.g. 33AABCA1234F1Z1"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">PAN Card Number</label>
                  <Input
                    type="text"
                    placeholder="e.g. ABCDE1234F"
                    value={pan}
                    onChange={(e) => setPan(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Contact */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="border-b mnx-border pb-3 mnx-border">
              <h2 className="text-base font-bold mnx-text-primary uppercase font-display flex items-center gap-2">
                <Mail className="mnx-text-accent size-5" /> Contact Details
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">Email Address</label>
                <Input
                  type="email"
                  placeholder="e.g. contact@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">Phone Number</label>
                <Input
                  type="text"
                  placeholder="e.g. +91 44 1234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">Website URL</label>
                <Input
                  type="url"
                  placeholder="e.g. https://domain.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-2">Notification Channels</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm mnx-text-primary cursor-pointer font-medium">
                  <Input
                    type="checkbox"
                    checked={channelEmail}
                    onChange={(e) => setChannelEmail(e.target.checked)}
                    className="mnx-choice-control size-4"
                  />
                  Email Notifications
                </label>
                <label className="flex items-center gap-2 text-sm mnx-text-primary cursor-pointer font-medium">
                  <Input
                    type="checkbox"
                    checked={channelSms}
                    onChange={(e) => setChannelSms(e.target.checked)}
                    className="mnx-choice-control size-4"
                  />
                  SMS Alerts
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Address */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="border-b mnx-border pb-3 mnx-border flex items-center justify-between">
              <h2 className="text-base font-bold mnx-text-primary uppercase font-display flex items-center gap-2">
                <MapPin className="mnx-text-accent size-5" /> Addresses
              </h2>
              <Button
                type="button"
                onClick={handleCopyAddress}
                className="text-xs font-bold mnx-text-accent hover:underline bg-transparent border-0"
              >
                Copy Billing to Shipping
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Billing */}
              <div className="space-y-4 border-r mnx-border pr-6 mnx-border">
                <h3 className="text-sm font-bold mnx-text-primary uppercase">Billing Address</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-semibold mnx-text-muted uppercase block mb-1">Attention</label>
                    <Input
                      type="text"
                      value={billingAttention}
                      onChange={(e) => setBillingAttention(e.target.value)}
                      className="w-full h-8 px-3 rounded-lg border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold mnx-text-muted uppercase block mb-1">Street 1</label>
                    <Input
                      type="text"
                      value={billingStreet1}
                      onChange={(e) => setBillingStreet1(e.target.value)}
                      className="w-full h-8 px-3 rounded-lg border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold mnx-text-muted uppercase block mb-1">Street 2</label>
                    <Input
                      type="text"
                      value={billingStreet2}
                      onChange={(e) => setBillingStreet2(e.target.value)}
                      className="w-full h-8 px-3 rounded-lg border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold mnx-text-muted uppercase block mb-1">City</label>
                      <Input
                        type="text"
                        value={billingCity}
                        onChange={(e) => setBillingCity(e.target.value)}
                        className="w-full h-8 px-3 rounded-lg border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold mnx-text-muted uppercase block mb-1">State</label>
                      <Input
                        type="text"
                        value={billingState}
                        onChange={(e) => setBillingState(e.target.value)}
                        className="w-full h-8 px-3 rounded-lg border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold mnx-text-muted uppercase block mb-1">Pin Code</label>
                      <Input
                        type="text"
                        value={billingPincode}
                        onChange={(e) => setBillingPincode(e.target.value)}
                        className="w-full h-8 px-3 rounded-lg border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold mnx-text-muted uppercase block mb-1">Country</label>
                      <Input
                        type="text"
                        value={billingCountry}
                        onChange={(e) => setBillingCountry(e.target.value)}
                        className="w-full h-8 px-3 rounded-lg border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold mnx-text-primary uppercase">Shipping Address</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-semibold mnx-text-muted uppercase block mb-1">Attention</label>
                    <Input
                      type="text"
                      value={shippingAttention}
                      onChange={(e) => setShippingAttention(e.target.value)}
                      className="w-full h-8 px-3 rounded-lg border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold mnx-text-muted uppercase block mb-1">Street 1</label>
                    <Input
                      type="text"
                      value={shippingStreet1}
                      onChange={(e) => setShippingStreet1(e.target.value)}
                      className="w-full h-8 px-3 rounded-lg border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold mnx-text-muted uppercase block mb-1">Street 2</label>
                    <Input
                      type="text"
                      value={shippingStreet2}
                      onChange={(e) => setShippingStreet2(e.target.value)}
                      className="w-full h-8 px-3 rounded-lg border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold mnx-text-muted uppercase block mb-1">City</label>
                      <Input
                        type="text"
                        value={shippingCity}
                        onChange={(e) => setShippingCity(e.target.value)}
                        className="w-full h-8 px-3 rounded-lg border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold mnx-text-muted uppercase block mb-1">State</label>
                      <Input
                        type="text"
                        value={shippingState}
                        onChange={(e) => setShippingState(e.target.value)}
                        className="w-full h-8 px-3 rounded-lg border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold mnx-text-muted uppercase block mb-1">Pin Code</label>
                      <Input
                        type="text"
                        value={shippingPincode}
                        onChange={(e) => setShippingPincode(e.target.value)}
                        className="w-full h-8 px-3 rounded-lg border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold mnx-text-muted uppercase block mb-1">Country</label>
                      <Input
                        type="text"
                        value={shippingCountry}
                        onChange={(e) => setShippingCountry(e.target.value)}
                        className="w-full h-8 px-3 rounded-lg border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Finance */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="border-b mnx-border pb-3 mnx-border">
              <h2 className="text-base font-bold mnx-text-primary uppercase font-display flex items-center gap-2">
                <DollarSign className="mnx-text-accent size-5" /> Financial Parameters
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">Credit Limit (INR)</label>
                <Input
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">Currency Preference</label>
                <NativeSelect
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                >
                  <option value="INR">INR- Indian Rupee</option>
                  <option value="USD">USD- US Dollar</option>
                  <option value="EUR">EUR- Euro</option>
                </NativeSelect>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">Opening Balance Branch</label>
                <NativeSelect
                  value={openingBalanceBranch}
                  onChange={(e) => setOpeningBalanceBranch(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                >
                  <option value="Chennai">Chennai</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Delhi">Delhi</option>
                </NativeSelect>
              </div>
              <div>
                <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">Opening Balance Amount</label>
                <Input
                  type="number"
                  value={openingBalanceAmount}
                  onChange={(e) => setOpeningBalanceAmount(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">Payment Terms</label>
                <NativeSelect
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                >
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 45">Net 45</option>
                  <option value="Due on Receipt">Due on Receipt</option>
                </NativeSelect>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">Account Owner / Account Manager</label>
              <NativeSelect
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
        )}

        {/* Step 5: KYC Documents */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="border-b mnx-border pb-3 mnx-border">
              <h2 className="text-base font-bold mnx-text-primary uppercase font-display flex items-center gap-2">
                <FileText className="mnx-text-accent size-5" /> KYC Documents Upload
              </h2>
            </div>

            <div className="space-y-4">
              <p className="text-xs mnx-text-muted leading-relaxed mb-4">
                Upload customer verification documents. These files will be automatically pre-populated during custom clearance job document collection workflows.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* IEC */}
                <div className="p-4 border mnx-border mnx-bg-surface rounded-xl space-y-2 mnx-border">
                  <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block">Import Export Code (IEC) *</label>
                  <Input
                    type="file"
                    onChange={(e) => setIecFile(e.target.files?.[0] || null)}
                    className="w-full text-xs mnx-text-muted file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold mnx-bg-accent mnx-text-accent mnx-hover-accent"
                    accept=".pdf,.png,.jpg,.jpeg"
                  />
                  {iecFile && <p className="text-[10px] mnx-text-success font-semibold font-mono">Selected: {iecFile.name}</p>}
                </div>

                {/* GST */}
                <div className="p-4 border mnx-border mnx-bg-surface rounded-xl space-y-2 mnx-border">
                  <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block">GST Registration *</label>
                  <Input
                    type="file"
                    onChange={(e) => setGstFile(e.target.files?.[0] || null)}
                    className="w-full text-xs mnx-text-muted file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold mnx-bg-accent mnx-text-accent mnx-hover-accent"
                    accept=".pdf,.png,.jpg,.jpeg"
                  />
                  {gstFile && <p className="text-[10px] mnx-text-success font-semibold font-mono">Selected: {gstFile.name}</p>}
                </div>

                {/* AD Code */}
                <div className="p-4 border mnx-border mnx-bg-surface rounded-xl space-y-2 mnx-border">
                  <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block">AD Code Letter *</label>
                  <Input
                    type="file"
                    onChange={(e) => setAdCodeFile(e.target.files?.[0] || null)}
                    className="w-full text-xs mnx-text-muted file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold mnx-bg-accent mnx-text-accent mnx-hover-accent"
                    accept=".pdf,.png,.jpg,.jpeg"
                  />
                  {adCodeFile && <p className="text-[10px] mnx-text-success font-semibold font-mono">Selected: {adCodeFile.name}</p>}
                </div>

                {/* FSSAI Licence */}
                <div className="p-4 border mnx-border mnx-bg-surface rounded-xl space-y-2 mnx-border">
                  <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block">FSSAI License Document</label>
                  <Input
                    type="file"
                    onChange={(e) => setFssaiLicenceFile(e.target.files?.[0] || null)}
                    className="w-full text-xs mnx-text-muted file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold mnx-bg-accent mnx-text-accent mnx-hover-accent"
                    accept=".pdf,.png,.jpg,.jpeg"
                  />
                  {fssaiLicenceFile && <p className="text-[10px] mnx-text-success font-semibold font-mono">Selected: {fssaiLicenceFile.name}</p>}
                </div>

                {/* Company Address Proof */}
                <div className="p-4 border mnx-border mnx-bg-surface rounded-xl space-y-2 mnx-border">
                  <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block">Company Address Proof</label>
                  <Input
                    type="file"
                    onChange={(e) => setCompanyAddressProofFile(e.target.files?.[0] || null)}
                    className="w-full text-xs mnx-text-muted file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold mnx-bg-accent mnx-text-accent mnx-hover-accent"
                    accept=".pdf,.png,.jpg,.jpeg"
                  />
                  {companyAddressProofFile && <p className="text-[10px] mnx-text-success font-semibold font-mono">Selected: {companyAddressProofFile.name}</p>}
                </div>

                {/* Partner Address Proof */}
                <div className="p-4 border mnx-border mnx-bg-surface rounded-xl space-y-2 mnx-border">
                  <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block">Partner / Proprietor Address Proof</label>
                  <Input
                    type="file"
                    onChange={(e) => setPartnerAddressProofFile(e.target.files?.[0] || null)}
                    className="w-full text-xs mnx-text-muted file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold mnx-bg-accent mnx-text-accent mnx-hover-accent"
                    accept=".pdf,.png,.jpg,.jpeg"
                  />
                  {partnerAddressProofFile && <p className="text-[10px] mnx-text-success font-semibold font-mono">Selected: {partnerAddressProofFile.name}</p>}
                </div>

                {/* Authorisation Letter */}
                <div className="p-4 border mnx-border mnx-bg-surface rounded-xl space-y-2 mnx-border md:col-span-2">
                  <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block">Authorisation Letter (Signed)</label>
                  <Input
                    type="file"
                    onChange={(e) => setAuthorisationLetterFile(e.target.files?.[0] || null)}
                    className="w-full text-xs mnx-text-muted file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold mnx-bg-accent mnx-text-accent mnx-hover-accent"
                    accept=".pdf,.png,.jpg,.jpeg"
                  />
                  {authorisationLetterFile && <p className="text-[10px] mnx-text-success font-semibold font-mono">Selected: {authorisationLetterFile.name}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Portal */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="border-b mnx-border pb-3 mnx-border">
              <h2 className="text-base font-bold mnx-text-primary uppercase font-display flex items-center gap-2">
                <Globe className="mnx-text-accent size-5" /> Customer Portal Access
              </h2>
            </div>

            <div className="rounded-xl border mnx-border p-5 mnx-bg-soft mnx-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold mnx-text-primary">Enable Customer Portal</h3>
                  <p className="text-xs mnx-text-muted mt-1">Allows the customer to log in directly to track shipments, approve expenses, and upload documents.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <Input
                    type="checkbox"
                    checked={isPortalEnabled}
                    onChange={(e) => setIsPortalEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 mnx-bg-muted peer-focus:outline-none rounded-full peer mnx-bg-muted peer-checked:after:translate-x-full mnx-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] mnx-bg-soft mnx-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all mnx-bg-accent"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 7: Review */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div className="border-b mnx-border pb-3 mnx-border">
              <h2 className="text-base font-bold mnx-text-primary uppercase font-display flex items-center gap-2">
                <Check className="mnx-text-accent size-5" /> Review and Confirm
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3 rounded-xl border mnx-border p-4 mnx-bg-soft mnx-border">
                <h3 className="text-xs font-bold uppercase mnx-text-muted">Primary Profile</h3>
                <div className="space-y-1.5 text-sm">
                  <p><span className="font-semibold mnx-text-muted">Type:</span> {customerSubType}</p>
                  <p><span className="font-semibold mnx-text-muted">Name:</span> {displayName}</p>
                  {companyName && <p><span className="font-semibold mnx-text-muted">Company:</span> {companyName}</p>}
                  <p><span className="font-semibold mnx-text-muted">Industry:</span> {industry}</p>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border mnx-border p-4 mnx-bg-soft mnx-border">
                <h3 className="text-xs font-bold uppercase mnx-text-muted">Contact Info</h3>
                <div className="space-y-1.5 text-sm">
                  <p><span className="font-semibold mnx-text-muted">Email:</span> {email || "—"}</p>
                  <p><span className="font-semibold mnx-text-muted">Phone:</span> {phone || "—"}</p>
                  <p><span className="font-semibold mnx-text-muted">Portal:</span> {isPortalEnabled ? "Enabled" : "Disabled"}</p>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border mnx-border p-4 mnx-bg-soft mnx-border md:col-span-2">
                <h3 className="text-xs font-bold uppercase mnx-text-muted">Uploaded KYC Documents</h3>
                <div className="space-y-1.5 text-xs font-mono">
                  <p>
                    <span className="font-semibold mnx-text-muted font-sans uppercase">IEC:</span>{" "}
                    {iecFile ? iecFile.name : <span className="mnx-text-muted">No document uploaded</span>}
                  </p>
                  <p>
                    <span className="font-semibold mnx-text-muted font-sans uppercase">GST:</span>{" "}
                    {gstFile ? gstFile.name : <span className="mnx-text-muted">No document uploaded</span>}
                  </p>
                  <p>
                    <span className="font-semibold mnx-text-muted font-sans uppercase">AD Code:</span>{" "}
                    {adCodeFile ? adCodeFile.name : <span className="mnx-text-muted">No document uploaded</span>}
                  </p>
                  <p>
                    <span className="font-semibold mnx-text-muted font-sans uppercase">FSSAI Licence:</span>{" "}
                    {fssaiLicenceFile ? fssaiLicenceFile.name : <span className="mnx-text-muted">No document uploaded</span>}
                  </p>
                  <p>
                    <span className="font-semibold mnx-text-muted font-sans uppercase">Company Address:</span>{" "}
                    {companyAddressProofFile ? companyAddressProofFile.name : <span className="mnx-text-muted">No document uploaded</span>}
                  </p>
                  <p>
                    <span className="font-semibold mnx-text-muted font-sans uppercase">Partner Address:</span>{" "}
                    {partnerAddressProofFile ? partnerAddressProofFile.name : <span className="mnx-text-muted">No document uploaded</span>}
                  </p>
                  <p>
                    <span className="font-semibold mnx-text-muted font-sans uppercase">Authorisation Letter:</span>{" "}
                    {authorisationLetterFile ? authorisationLetterFile.name : <span className="mnx-text-muted">No document uploaded</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t mnx-border mnx-border">
          {currentStep > 1 ? (
            <Button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1 px-4 py-2 border mnx-border mnx-hover-accent rounded-xl text-sm font-medium transition-colors mnx-text-muted"
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
              className="flex items-center gap-1 px-5 py-2 mnx-bg-accent mnx-hover-accent mnx-text-muted rounded-xl text-sm font-medium transition-colors ml-auto"
            >
              Next <ChevronRight size={16} />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 mnx-bg-accent mnx-hover-accent mnx-text-muted rounded-xl text-sm font-bold transition-all disabled:opacity-50 ml-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Saving...
                </>
              ) : (
                "Save Customer"
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
