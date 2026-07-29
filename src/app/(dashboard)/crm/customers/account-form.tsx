"use client";

import { CrmButton, CrmInput, CrmTextarea } from "@/components/monolith/crm-workspace";

import { NativeSelect } from "@/components/monolith/native-select";
import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { createAccountAction, updateAccountAction } from "@/modules/crm/actions";
import { Save, Mail, MapPin, Notebook, User, ArrowDown } from "lucide-react";

interface UserOption {
  id: string;
  name: string;
}

type AddressDetails = {
  attention?: string | null;
  country?: string | null;
  street1?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  fax?: string | null;
};

type AccountFormInitialData = {
  id?: string;
  billingAddressDetails?: AddressDetails | null;
  communicationChannels?: string[] | null;
  companyName?: string | null;
  creditLimit?: number | string | null;
  currency?: string | null;
  customerSubType?: string | null;
  email?: string | null;
  firstName?: string | null;
  gstin?: string | null;
  gstTreatment?: string | null;
  industry?: string | null;
  language?: string | null;
  lastName?: string | null;
  name?: string | null;
  openingBalanceAmount?: number | string | null;
  openingBalanceBranch?: string | null;
  ownerId?: string | null;
  pan?: string | null;
  paymentTerms?: string | null;
  phone?: string | null;
  placeOfSupply?: string | null;
  remarks?: string | null;
  salutation?: string | null;
  shippingAddressDetails?: AddressDetails | null;
  taxPreference?: string | null;
  website?: string | null;
};

interface AccountFormProps {
  initialData?: AccountFormInitialData;
  employees: UserOption[];
}

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const gstTreatments = [
  "Registered Business - Regular",
  "Registered Business - Composition",
  "Unregistered Business",
  "Consumer",
  "Overseas",
  "SEZ"
];

const currencies = [
  "INR- Indian Rupee",
  "USD- US Dollar",
  "EUR- Euro",
  "GBP- British Pound",
  "SGD- Singapore Dollar",
  "AED- UAE Dirham"
];

const locations = ["Chennai", "Mumbai", "Delhi", "Kolkata", "Bangalore", "Hyderabad"];
const paymentTermsList = ["Net 15", "Net 30", "Net 45", "Net 60", "Due on Receipt"];

export function AccountForm({ initialData, employees }: AccountFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect_to");
  const isEdit = !!initialData;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerSubType, setCustomerSubType] = useState(initialData?.customerSubType || "Business");
  const [activeTab, setActiveTab] = useState<"OTHER_DETAILS" | "ADDRESS" | "REMARKS">("OTHER_DETAILS");

  // Local state for name to track display name
  const [displayName, setDisplayName] = useState(initialData?.name || "");
  const [companyName, setCompanyName] = useState(initialData?.companyName || "");
  const [firstName, setFirstName] = useState(initialData?.firstName || "");
  const [lastName, setLastName] = useState(initialData?.lastName || "");

  // Local state for address form inputs (to support Billing -> Shipping copy)
  const billingDetails = initialData?.billingAddressDetails || {};
  const shippingDetails = initialData?.shippingAddressDetails || {};

  const [billingAttention, setBillingAttention] = useState(billingDetails.attention || "");
  const [billingCountry, setBillingCountry] = useState(billingDetails.country || "India");
  const [billingStreet1, setBillingStreet1] = useState(billingDetails.street1 || "");
  const [billingStreet2, setBillingStreet2] = useState(billingDetails.street2 || "");
  const [billingCity, setBillingCity] = useState(billingDetails.city || "");
  const [billingState, setBillingState] = useState(billingDetails.state || "");
  const [billingPincode, setBillingPincode] = useState(billingDetails.pincode || "");
  const [billingPhone, setBillingPhone] = useState(billingDetails.phone || "");
  const [billingFax, setBillingFax] = useState(billingDetails.fax || "");

  const [shippingAttention, setShippingAttention] = useState(shippingDetails.attention || "");
  const [shippingCountry, setShippingCountry] = useState(shippingDetails.country || "India");
  const [shippingStreet1, setShippingStreet1] = useState(shippingDetails.street1 || "");
  const [shippingStreet2, setShippingStreet2] = useState(shippingDetails.street2 || "");
  const [shippingCity, setShippingCity] = useState(shippingDetails.city || "");
  const [shippingState, setShippingState] = useState(shippingDetails.state || "");
  const [shippingPincode, setShippingPincode] = useState(shippingDetails.pincode || "");
  const [shippingPhone, setShippingPhone] = useState(shippingDetails.phone || "");
  const [shippingFax, setShippingFax] = useState(shippingDetails.fax || "");

  const handleCopyBillingAddress = () => {
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

  const handleDemoFill = () => {
    // 1. Set state-controlled fields
    setCustomerSubType("Business");
    setCompanyName("Alpha Shipping Solutions Ltd");
    setFirstName("Rajesh");
    setLastName("Kumar");
    setDisplayName("Alpha Shipping Solutions Ltd");
    
    setBillingAttention("Rajesh Kumar - Logistics Manager");
    setBillingCountry("India");
    setBillingStreet1("No. 12, Harbour Way");
    setBillingStreet2("George Town");
    setBillingCity("Chennai");
    setBillingState("Tamil Nadu");
    setBillingPincode("600001");
    setBillingPhone("+91 44 2534 8899");
    setBillingFax("+91 44 2534 8890");

    setShippingAttention("Rajesh Kumar - Delivery Gate 2");
    setShippingCountry("India");
    setShippingStreet1("Warehouse Sector 4");
    setShippingStreet2("Ennore Port Area");
    setShippingCity("Chennai");
    setShippingState("Tamil Nadu");
    setShippingPincode("600057");
    setShippingPhone("+91 44 2575 1122");
    setShippingFax("");

    // 2. Set uncontrolled fields directly in the DOM
    const setVal = (name: string, value: string) => {
      const el = document.getElementsByName(name)[0] as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (el) el.value = value;
    };

    setVal("salutation", "Mr.");
    setVal("email", "rajesh.kumar@alphashipping.in");
    setVal("phone", "+91 44 2534 8899");
    setVal("website", "https://www.alphashipping.in");
    setVal("industry", "Logistics & Maritime Freight");
    setVal("language", "English");
    setVal("gstTreatment", "Registered Business - Regular");
    setVal("placeOfSupply", "Tamil Nadu");
    setVal("pan", "AABCA1234F");
    setVal("gstin", "33AABCA1234F1Z1");
    setVal("currency", "INR- Indian Rupee");
    setVal("openingBalanceBranch", "Chennai");
    setVal("openingBalanceAmount", "150000");
    setVal("creditLimit", "1000000");
    setVal("paymentTerms", "Net 30");
    setVal("remarks", "Highly active logistics contractor. Prefers digital invoicing and email alerts.");
    
    // Checkbox elements
    const emailCh = document.getElementsByName("channelEmail")[0] as HTMLInputElement;
    if (emailCh) emailCh.checked = true;

    const smsCh = document.getElementsByName("channelSms")[0] as HTMLInputElement;
    if (smsCh) smsCh.checked = true;

    // Set tax preference radio
    const taxPrefR = document.querySelector('input[name="taxPreference"][value="Taxable"]') as HTMLInputElement;
    if (taxPrefR) taxPrefR.checked = true;
    
    // Choose the first employee as owner if available
    const ownerEl = document.getElementsByName("ownerId")[0] as HTMLSelectElement;
    if (ownerEl && ownerEl.options.length > 1) {
      ownerEl.selectedIndex = 1;
    }

    toast.success("Demo customer profile data loaded!");
  };

  // Generate suggested display name
  const handleNameFieldBlur = () => {
    if (!displayName.trim()) {
      if (customerSubType === "Business" && companyName.trim()) {
        setDisplayName(companyName.trim());
      } else if (customerSubType === "Individual" && (firstName.trim() || lastName.trim())) {
        setDisplayName(`${firstName.trim()} ${lastName.trim()}`.trim());
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nameToSave = displayName.trim() || companyName.trim() || `${firstName} ${lastName}`.trim();
    if (!nameToSave.trim()) {
      toast.error("Customer display name is required");
      return;
    }

    setIsSubmitting(true);
    const fd = new FormData(e.currentTarget);
    
    // Inject display name explicitly
    fd.set("name", nameToSave);

    const res = isEdit
      ? await updateAccountAction(initialData.id!, fd)
      : await createAccountAction(fd);

    setIsSubmitting(false);

    if (res.ok) {
      toast.success(isEdit ? "Customer updated successfully" : "Customer created successfully");
      if (redirectTo) {
        const targetUrl = new URL(redirectTo, window.location.origin);
        if (!isEdit && res.data?.id) {
          targetUrl.searchParams.set("customerId", res.data.id);
          targetUrl.searchParams.set("customerName", res.data.name ?? nameToSave);
          targetUrl.searchParams.set("new", "true");
        }
        router.push(`${targetUrl.pathname}${targetUrl.search}`);
      } else {
        router.push(isEdit ? `/crm/customers/${initialData.id}` : "/crm/customers");
      }
    } else {
      toast.error(res.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl bg-[var(--color-surface)] border-2 border-[var(--color-outline)] rounded-xl p-6 shadow-[4px_4px_0px_0px_var(--mnx-accent-soft)] animate-in fade-in duration-200">
      
      {/* ─── SECTION 1: CUSTOMER TYPE ───────────────────────────────────── */}
      <div className="mnx-crm-panel-surface  bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--color-outline-variant)] pb-2 mb-2">
          <h3 className="mnx-title-3 text-[var(--color-on-surface)] flex items-center gap-2 border-0 pb-0">
            <User className="size-4.5 text-[var(--mnx-accent)]" />
            <span>Customer Profile</span>
          </h3>
          {!isEdit && (
            <CrmButton
              type="button"
              onClick={handleDemoFill}
              className="px-3 py-1 bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)]/20 border border-[var(--mnx-accent)]/40 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm hover:shadow-[0_0_8px_var(--mnx-accent-soft)]"
            >
              Demo Fill
            </CrmButton>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div>
            <label className="mnx-label mb-2 block">Customer Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-[var(--color-on-surface)] cursor-pointer">
                <CrmInput
                  type="radio"
                  name="customerSubType"
                  value="Business"
                  checked={customerSubType === "Business"}
                  onChange={() => setCustomerSubType("Business")}
                  className="accent-[var(--mnx-accent)] size-4"
                />
                <span>Business</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--color-on-surface)] cursor-pointer">
                <CrmInput
                  type="radio"
                  name="customerSubType"
                  value="Individual"
                  checked={customerSubType === "Individual"}
                  onChange={() => setCustomerSubType("Individual")}
                  className="accent-[var(--mnx-accent)] size-4"
                />
                <span>Individual</span>
              </label>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="mnx-label mb-1.5 block">Primary Contact Name</label>
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-3">
                <NativeSelect
                  name="salutation"
                  defaultValue={initialData?.salutation || ""}
                  className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[var(--mnx-accent-soft)]"
                >
                  <option value="">Salutation</option>
                  <option value="Mr.">Mr.</option>
                  <option value="Mrs.">Mrs.</option>
                  <option value="Ms.">Ms.</option>
                  <option value="Miss">Miss</option>
                  <option value="Dr.">Dr.</option>
                </NativeSelect>
              </div>
              <div className="col-span-4">
                <CrmInput
                  type="text"
                  name="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onBlur={handleNameFieldBlur}
                  placeholder="First Name"
                  className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[var(--mnx-accent-soft)]"
                />
              </div>
              <div className="col-span-5">
                <CrmInput
                  type="text"
                  name="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onBlur={handleNameFieldBlur}
                  placeholder="Last Name"
                  className="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[var(--mnx-accent-soft)]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="mnx-label mb-1.5 block">Company Name</label>
            <CrmInput
              type="text"
              name="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onBlur={handleNameFieldBlur}
              placeholder="e.g. Adarsh Shipping Ltd"
              className="w-full px-3.5 py-2 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[var(--mnx-accent-soft)]"
            />
          </div>
          <div>
            <label className="mnx-label mb-1.5 block">Customer Display Name *</label>
            <CrmInput
              type="text"
              name="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Select or type display name"
              className="w-full px-3.5 py-2 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[var(--mnx-accent-soft)] font-semibold"
              required
            />
          </div>
        </div>
      </div>

      {/* ─── SECTION 2: CONTACT DETAILS ────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="mnx-title-3 text-[var(--color-on-surface)] flex items-center gap-2 border-b border-[var(--color-outline-variant)] pb-2">
          <Mail className="size-4 text-[var(--mnx-accent)]" />
          <span>Contact Information</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="mnx-label mb-1.5 block">Email Address</label>
            <CrmInput
              type="email"
              name="email"
              defaultValue={initialData?.email || ""}
              placeholder="e.g. office@domain.com"
              className="w-full px-3.5 py-2 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[var(--mnx-accent-soft)]"
            />
          </div>
          <div>
            <label className="mnx-label mb-1.5 block">Phone Number</label>
            <CrmInput
              type="text"
              name="phone"
              defaultValue={initialData?.phone || ""}
              placeholder="e.g. +91 44 2819 1234"
              className="w-full px-3.5 py-2 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[var(--mnx-accent-soft)]"
            />
          </div>
          <div>
            <label className="mnx-label mb-1.5 block">Website</label>
            <CrmInput
              type="url"
              name="website"
              defaultValue={initialData?.website || ""}
              placeholder="e.g. https://www.company.com"
              className="w-full px-3.5 py-2 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[var(--mnx-accent-soft)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="mnx-label mb-1.5 block">Industry Segment</label>
            <CrmInput
              type="text"
              name="industry"
              defaultValue={initialData?.industry || ""}
              placeholder="e.g. Shipping / Logistics"
              className="w-full px-3.5 py-2 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[var(--mnx-accent-soft)]"
            />
          </div>
          <div>
            <label className="mnx-label mb-1.5 block">Customer Language</label>
            <NativeSelect
              name="language"
              defaultValue={initialData?.language || "English"}
              className="w-full px-3.5 py-2 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[var(--mnx-accent-soft)]"
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi</option>
              <option value="Tamil">Tamil</option>
              <option value="Telugu">Telugu</option>
              <option value="Spanish">Spanish</option>
            </NativeSelect>
          </div>
          <div>
            <label className="mnx-label mb-1.5 block">Communication Channels</label>
            <div className="flex gap-4 pt-2.5">
              <label className="flex items-center gap-1.5 text-xs text-[var(--color-on-surface)] cursor-pointer">
                <CrmInput
                  type="checkbox"
                  name="channelEmail"
                  defaultChecked={initialData?.communicationChannels?.includes("EMAIL") ?? true}
                  className="accent-[var(--mnx-accent)] rounded"
                />
                <span>Email Notifications</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-[var(--color-on-surface)] cursor-pointer">
                <CrmInput
                  type="checkbox"
                  name="channelSms"
                  defaultChecked={initialData?.communicationChannels?.includes("SMS") ?? false}
                  className="accent-[var(--mnx-accent)] rounded"
                />
                <span>SMS Alert</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION 3: TABS FOR DETAILS, ADDRESS & REMARKS ─────────────── */}
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b-2 border-[var(--color-outline-variant)] select-none">
          <CrmButton
            type="button"
            onClick={() => setActiveTab("OTHER_DETAILS")}
            className={`pb-3 px-5 text-xs font-bold uppercase tracking-wider border-b-3 -mb-[3px] transition-all cursor-pointer ${
              activeTab === "OTHER_DETAILS" ? "border-[var(--mnx-accent)] text-[var(--color-on-surface)]" : "border-transparent text-mono-muted hover:text-[var(--color-on-surface)]"
            }`}
          >
            Other Details
          </CrmButton>
          <CrmButton
            type="button"
            onClick={() => setActiveTab("ADDRESS")}
            className={`pb-3 px-5 text-xs font-bold uppercase tracking-wider border-b-3 -mb-[3px] transition-all cursor-pointer ${
              activeTab === "ADDRESS" ? "border-[var(--mnx-accent)] text-[var(--color-on-surface)]" : "border-transparent text-mono-muted hover:text-[var(--color-on-surface)]"
            }`}
          >
            Address
          </CrmButton>
          <CrmButton
            type="button"
            onClick={() => setActiveTab("REMARKS")}
            className={`pb-3 px-5 text-xs font-bold uppercase tracking-wider border-b-3 -mb-[3px] transition-all cursor-pointer ${
              activeTab === "REMARKS" ? "border-[var(--mnx-accent)] text-[var(--color-on-surface)]" : "border-transparent text-mono-muted hover:text-[var(--color-on-surface)]"
            }`}
          >
            Remarks
          </CrmButton>
        </div>

        {/* Tab Panel: Other Details */}
        {activeTab === "OTHER_DETAILS" && (
          <div className="p-6 bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] rounded-xl space-y-4 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mnx-label mb-1.5 block">GST Treatment *</label>
                <NativeSelect
                  name="gstTreatment"
                  defaultValue={initialData?.gstTreatment || "Registered Business - Regular"}
                  className="w-full px-3.5 py-2 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[var(--mnx-accent-soft)]"
                >
                  {gstTreatments.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <label className="mnx-label mb-1.5 block">Place of Supply *</label>
                <NativeSelect
                  name="placeOfSupply"
                  defaultValue={initialData?.placeOfSupply || "Tamil Nadu"}
                  className="w-full px-3.5 py-2 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[var(--mnx-accent-soft)]"
                >
                  {indianStates.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </NativeSelect>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="mnx-label mb-1.5 block">PAN ID / Tax Number</label>
                <CrmInput
                  type="text"
                  name="pan"
                  defaultValue={initialData?.pan || ""}
                  placeholder="e.g. ABCDE1234F"
                  className="w-full px-3.5 py-2 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[var(--mnx-accent-soft)]"
                />
              </div>
              <div>
                <label className="mnx-label mb-1.5 block">GSTIN / Tax ID</label>
                <CrmInput
                  type="text"
                  name="gstin"
                  defaultValue={initialData?.gstin || ""}
                  placeholder="e.g. 33AABCA1234F1Z1"
                  className="w-full px-3.5 py-2 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[var(--mnx-accent-soft)]"
                />
              </div>
              <div>
                <label className="mnx-label mb-1.5 block">Tax Preference</label>
                <div className="flex gap-4 pt-2">
                  <label className="flex items-center gap-1.5 text-xs text-[var(--color-on-surface)] cursor-pointer">
                    <CrmInput
                      type="radio"
                      name="taxPreference"
                      value="Taxable"
                      defaultChecked={initialData?.taxPreference !== "Tax Exempt"}
                      className="accent-[var(--mnx-accent)] size-4"
                    />
                    <span>Taxable</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-[var(--color-on-surface)] cursor-pointer">
                    <CrmInput
                      type="radio"
                      name="taxPreference"
                      value="Tax Exempt"
                      defaultChecked={initialData?.taxPreference === "Tax Exempt"}
                      className="accent-[var(--mnx-accent)] size-4"
                    />
                    <span>Tax Exempt</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[var(--color-outline-variant)]">
              <div>
                <label className="mnx-label mb-1.5 block">Currency</label>
                <NativeSelect
                  name="currency"
                  defaultValue={initialData?.currency || "INR- Indian Rupee"}
                  className="w-full px-3.5 py-2 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[var(--mnx-accent-soft)]"
                >
                  {currencies.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </NativeSelect>
              </div>

              <div>
                <label className="mnx-label mb-1.5 block">Opening Balance Branch</label>
                <NativeSelect
                  name="openingBalanceBranch"
                  defaultValue={initialData?.openingBalanceBranch || "Chennai"}
                  className="w-full px-3.5 py-2 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[var(--mnx-accent-soft)]"
                >
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </NativeSelect>
              </div>

              <div>
                <label className="mnx-label mb-1.5 block">Opening Balance Amount (INR)</label>
                <CrmInput
                  type="number"
                  step="0.01"
                  name="openingBalanceAmount"
                  defaultValue={initialData?.openingBalanceAmount || 0}
                  className="w-full px-3.5 py-2 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[var(--mnx-accent-soft)]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[var(--color-outline-variant)]">
              <div>
                <label className="mnx-label mb-1.5 block">Credit Limit (INR)</label>
                <CrmInput
                  type="number"
                  name="creditLimit"
                  defaultValue={initialData?.creditLimit || ""}
                  placeholder="e.g. 500000"
                  className="w-full px-3.5 py-2 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[var(--mnx-accent-soft)]"
                />
              </div>
              <div>
                <label className="mnx-label mb-1.5 block">Payment Terms</label>
                <NativeSelect
                  name="paymentTerms"
                  defaultValue={initialData?.paymentTerms || "Net 30"}
                  className="w-full px-3.5 py-2 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[var(--mnx-accent-soft)]"
                >
                  {paymentTermsList.map((term) => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </NativeSelect>
              </div>
              <div>
                <label className="mnx-label mb-1.5 block">Account Owner *</label>
                <NativeSelect
                  name="ownerId"
                  defaultValue={initialData?.ownerId || ""}
                  className="w-full px-3.5 py-2 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[var(--mnx-accent-soft)]"
                  required
                >
                  <option value="">Select Owner</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </NativeSelect>
              </div>
            </div>

          </div>
        )}

        {/* Tab Panel: Address */}
        {activeTab === "ADDRESS" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-150">
            {/* Billing Address Card */}
            <div className="mnx-crm-panel-surface  bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--color-outline-variant)] pb-2">
                <h4 className="mnx-title-3 text-xs text-[var(--color-on-surface)] flex items-center gap-2">
                  <MapPin className="size-4 text-[var(--mnx-accent)]" />
                  <span>Billing Address</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-3 text-xs">
                <div>
                  <label className="mnx-label block mb-1 text-[9px]">Attention</label>
                  <CrmInput
                    type="text"
                    name="billingAttention"
                    value={billingAttention}
                    onChange={(e) => setBillingAttention(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mnx-label block mb-1 text-[9px]">Country/Region</label>
                  <CrmInput
                    type="text"
                    name="billingCountry"
                    value={billingCountry}
                    onChange={(e) => setBillingCountry(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mnx-label block mb-1 text-[9px]">Address Line 1</label>
                  <CrmInput
                    type="text"
                    name="billingStreet1"
                    value={billingStreet1}
                    onChange={(e) => setBillingStreet1(e.target.value)}
                    placeholder="Street 1"
                    className="w-full px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mnx-label block mb-1 text-[9px]">Address Line 2</label>
                  <CrmInput
                    type="text"
                    name="billingStreet2"
                    value={billingStreet2}
                    onChange={(e) => setBillingStreet2(e.target.value)}
                    placeholder="Street 2"
                    className="w-full px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mnx-label block mb-1 text-[9px]">City</label>
                    <CrmInput
                      type="text"
                      name="billingCity"
                      value={billingCity}
                      onChange={(e) => setBillingCity(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mnx-label block mb-1 text-[9px]">State</label>
                    <CrmInput
                      type="text"
                      name="billingState"
                      value={billingState}
                      onChange={(e) => setBillingState(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mnx-label block mb-1 text-[9px]">Pin Code</label>
                    <CrmInput
                      type="text"
                      name="billingPincode"
                      value={billingPincode}
                      onChange={(e) => setBillingPincode(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mnx-label block mb-1 text-[9px]">Phone</label>
                    <CrmInput
                      type="text"
                      name="billingPhone"
                      value={billingPhone}
                      onChange={(e) => setBillingPhone(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mnx-label block mb-1 text-[9px]">Fax Number</label>
                  <CrmInput
                    type="text"
                    name="billingFax"
                    value={billingFax}
                    onChange={(e) => setBillingFax(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Shipping Address Card */}
            <div className="mnx-crm-panel-surface  bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--color-outline-variant)] pb-2">
                <h4 className="mnx-title-3 text-xs text-[var(--color-on-surface)] flex items-center gap-2">
                  <MapPin className="size-4 text-[var(--mnx-accent)]" />
                  <span>Shipping Address</span>
                </h4>
                <CrmButton
                  type="button"
                  onClick={handleCopyBillingAddress}
                  className="flex items-center gap-1 text-[10px] text-[var(--mnx-accent)] font-bold hover:underline cursor-pointer bg-transparent border-0"
                >
                  <ArrowDown className="size-3" />
                  <span>Copy Billing Address</span>
                </CrmButton>
              </div>

              <div className="grid grid-cols-1 gap-3 text-xs">
                <div>
                  <label className="mnx-label block mb-1 text-[9px]">Attention</label>
                  <CrmInput
                    type="text"
                    name="shippingAttention"
                    value={shippingAttention}
                    onChange={(e) => setShippingAttention(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mnx-label block mb-1 text-[9px]">Country/Region</label>
                  <CrmInput
                    type="text"
                    name="shippingCountry"
                    value={shippingCountry}
                    onChange={(e) => setShippingCountry(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mnx-label block mb-1 text-[9px]">Address Line 1</label>
                  <CrmInput
                    type="text"
                    name="shippingStreet1"
                    value={shippingStreet1}
                    onChange={(e) => setShippingStreet1(e.target.value)}
                    placeholder="Street 1"
                    className="w-full px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mnx-label block mb-1 text-[9px]">Address Line 2</label>
                  <CrmInput
                    type="text"
                    name="shippingStreet2"
                    value={shippingStreet2}
                    onChange={(e) => setShippingStreet2(e.target.value)}
                    placeholder="Street 2"
                    className="w-full px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mnx-label block mb-1 text-[9px]">City</label>
                    <CrmInput
                      type="text"
                      name="shippingCity"
                      value={shippingCity}
                      onChange={(e) => setShippingCity(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mnx-label block mb-1 text-[9px]">State</label>
                    <CrmInput
                      type="text"
                      name="shippingState"
                      value={shippingState}
                      onChange={(e) => setShippingState(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mnx-label block mb-1 text-[9px]">Pin Code</label>
                    <CrmInput
                      type="text"
                      name="shippingPincode"
                      value={shippingPincode}
                      onChange={(e) => setShippingPincode(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mnx-label block mb-1 text-[9px]">Phone</label>
                    <CrmInput
                      type="text"
                      name="shippingPhone"
                      value={shippingPhone}
                      onChange={(e) => setShippingPhone(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mnx-label block mb-1 text-[9px]">Fax Number</label>
                  <CrmInput
                    type="text"
                    name="shippingFax"
                    value={shippingFax}
                    onChange={(e) => setShippingFax(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Panel: Remarks */}
        {activeTab === "REMARKS" && (
          <div className="p-6 bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] rounded-xl space-y-4 animate-in fade-in duration-150">
            <h4 className="mnx-title-3 text-xs text-[var(--color-on-surface)] flex items-center gap-2 border-b border-[var(--color-outline-variant)] pb-2">
              <Notebook className="size-4.5 text-[var(--mnx-accent)]" />
              <span>Customer Remarks & Notes</span>
            </h4>
            <div>
              <label className="mnx-label block mb-1.5">Remarks (For internal CRM use)</label>
              <CrmTextarea
                name="remarks"
                defaultValue={initialData?.remarks || ""}
                placeholder="Enter remarks or specific instructions..."
                rows={5}
                className="w-full p-3 bg-[var(--color-surface)] border border-[var(--mnx-accent-soft)] rounded-lg text-sm text-[var(--color-on-surface)] focus:outline-none focus:ring-3 focus:ring-[var(--mnx-accent-soft)]"
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── ACTION BUTTONS (Tactile 3D Styling) ────────────────────────── */}
      <div className="flex justify-end gap-4 pt-4 border-t border-[var(--color-outline-variant)]">
        <CrmButton
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2 bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] border border-[var(--color-outline-variant)] rounded-xl text-sm font-semibold cursor-pointer shadow-[2px_2px_0px_0px_var(--mnx-border)] transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
        >
          Cancel
        </CrmButton>
        <CrmButton
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-2 bg-[var(--mnx-accent)] text-mono-text rounded-xl text-sm font-bold transition-all shadow-[2px_2px_0px_0px_var(--mnx-accent-soft)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--mnx-accent-soft)] hover:bg-[var(--mnx-accent)] active:translate-y-0 active:shadow-none disabled:opacity-50 cursor-pointer"
        >
          <Save className="size-4" />
          <span>{isSubmitting ? "Saving..." : isEdit ? "Update Customer" : "Save Customer"}</span>
        </CrmButton>
      </div>
    </form>
  );
}
