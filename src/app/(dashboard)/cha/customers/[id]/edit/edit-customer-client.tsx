"use client";

import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ChaNativeSelect as NativeSelect,
  ChaPanel,
  ChaRoutePageHeader,
} from "@/modules/cha/components/workspace/cha-workspace";
import {
  GST_PUBLIC_SEARCH_URL,
  isGstLookupConfigurationError,
} from "@/lib/gst-public-search";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  updateAccountAction,
  fetchGstDetailsAction,
  lookupIndianPincodeAction,
} from "@/modules/crm/actions";
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
  FileText,
  ExternalLink,
} from "lucide-react";

interface UserOption {
  id: string;
  name: string;
}

interface CustomerAddressDetails {
  attention?: string | null;
  country?: string | null;
  street1?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  fax?: string | null;
}

interface CustomerInitialData {
  id: string;
  name?: string | null;
  companyName?: string | null;
  salutation?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  industry?: string | null;
  language?: string | null;
  gstTreatment?: string | null;
  placeOfSupply?: string | null;
  pan?: string | null;
  gstin?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  communicationChannels?: string[] | null;
  customerSubType?: string | null;
  creditLimit?: string | number | null;
  currency?: string | null;
  openingBalanceBranch?: string | null;
  openingBalanceAmount?: string | number | null;
  paymentTerms?: string | null;
  ownerId?: string | null;
  remarks?: string | null;
  isPortalEnabled?: boolean | null;
  taxPreference?: string | null;
  billingAddressDetails?: CustomerAddressDetails | null;
  shippingAddressDetails?: CustomerAddressDetails | null;
  contacts?: Array<{
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    designation?: string | null;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    isPrimary?: boolean | null;
    isActive?: boolean | null;
  }> | null;
}

interface EditCustomerClientProps {
  initialData: CustomerInitialData;
  employees: UserOption[];
}

type AddressKey = "billing" | "shipping" | "courier";

type ContactDraft = {
  id: string;
  fullName: string;
  designation: string;
  email: string;
  phone: string;
  isPrimary: boolean;
};

type LookupState = {
  loading: boolean;
  error: string | null;
};

type OpeningBalanceDraft = {
  id: string;
  branch: string;
  amount: string;
};

function splitContactName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: "", lastName: "Contact" };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "Contact" };
  }
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts.at(-1) ?? "Contact",
  };
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

export function EditCustomerClient({
  initialData,
  employees,
}: EditCustomerClientProps) {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Parse Existing Remarks / KYC JSON
  const remarksText = initialData.remarks || "";
  let initialKyc: Record<
    string,
    { fileKey: string; fileName: string; fileSize: number; uploadedAt: string }
  > = {};
  let initialUserRemarks = "";
  let initialCourierAddress: CustomerAddressDetails = {};
  let initialShippingSameAsBilling = false;
  let initialCourierSameAsBilling = false;
  let initialOpeningBalances: OpeningBalanceDraft[] = [];
  try {
    const parsed = JSON.parse(remarksText);
    if (parsed && typeof parsed === "object") {
      initialKyc = parsed.kyc || {};
      initialUserRemarks = parsed.userRemarks || "";
      initialCourierAddress = parsed.courierAddressDetails || {};
      initialShippingSameAsBilling = Boolean(parsed.shippingSameAsBilling);
      initialCourierSameAsBilling = Boolean(parsed.courierSameAsBilling);
      initialOpeningBalances = Array.isArray(parsed.openingBalancesByBranch)
        ? parsed.openingBalancesByBranch.map(
            (
              row: { branch?: string; amount?: string | number },
              index: number,
            ) => ({
              id: `opening-balance-${index + 1}`,
              branch: String(row.branch || "Chennai"),
              amount: String(row.amount ?? "0"),
            }),
          )
        : [];
    } else {
      initialUserRemarks = remarksText;
    }
  } catch {
    initialUserRemarks = remarksText;
  }

  // Address Parsing
  const billingAddr = initialData.billingAddressDetails || {};
  const shippingAddr = initialData.shippingAddressDetails || {};
  const activeContacts = (initialData.contacts || []).filter(
    (contact) => contact.isActive !== false,
  );
  const primaryContactRecord =
    activeContacts.find((contact) => contact.isPrimary) || activeContacts[0];
  const extraContactRecords = activeContacts.filter(
    (contact) => contact.id !== primaryContactRecord?.id,
  );

  // Form Fields State
  const [customerSubType, setCustomerSubType] = useState(
    initialData.customerSubType || "Business",
  );
  const [companyName, setCompanyName] = useState(initialData.companyName || "");
  const [displayName, setDisplayName] = useState(initialData.name || "");
  const [salutation, setSalutation] = useState(initialData.salutation || "");
  const [firstName, setFirstName] = useState(initialData.firstName || "");
  const [lastName, setLastName] = useState(initialData.lastName || "");
  const [industry, setIndustry] = useState(
    initialData.industry || "Logistics & Freight Forwarding",
  );
  const [language, setLanguage] = useState(initialData.language || "English");
  const [gstTreatment, setGstTreatment] = useState(
    initialData.gstTreatment || "Registered Business - Regular",
  );
  const [placeOfSupply, setPlaceOfSupply] = useState(
    initialData.placeOfSupply || "Tamil Nadu",
  );
  const [pan, setPan] = useState(initialData.pan || "");
  const [gstin, setGstin] = useState(initialData.gstin || "");

  const [email, setEmail] = useState(initialData.email || "");
  const [phone, setPhone] = useState(initialData.phone || "");
  const [website, setWebsite] = useState(initialData.website || "");
  const [primaryContactName, setPrimaryContactName] = useState(
    [primaryContactRecord?.firstName, primaryContactRecord?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim(),
  );
  const [primaryContactDesignation, setPrimaryContactDesignation] = useState(
    primaryContactRecord?.designation || "",
  );
  const [additionalContacts, setAdditionalContacts] = useState<ContactDraft[]>(
    extraContactRecords.map((contact) => ({
      id: contact.id,
      fullName: [contact.firstName, contact.lastName].filter(Boolean).join(" "),
      designation: contact.designation || "",
      email: contact.email || "",
      phone: contact.phone || contact.mobile || "",
      isPrimary: false,
    })),
  );
  const [channelEmail, setChannelEmail] = useState(
    initialData.communicationChannels?.includes("EMAIL") ?? true,
  );
  const [channelSms, setChannelSms] = useState(
    initialData.communicationChannels?.includes("SMS") ?? false,
  );

  // Address
  const [billingAttention, setBillingAttention] = useState(
    billingAddr.attention || "",
  );
  const [billingCountry, setBillingCountry] = useState(
    billingAddr.country || "India",
  );
  const [billingStreet1, setBillingStreet1] = useState(
    billingAddr.street1 || "",
  );
  const [billingStreet2, setBillingStreet2] = useState(
    billingAddr.street2 || "",
  );
  const [billingCity, setBillingCity] = useState(billingAddr.city || "");
  const [billingState, setBillingState] = useState(billingAddr.state || "");
  const [billingPincode, setBillingPincode] = useState(
    billingAddr.pincode || "",
  );
  const [billingPhone, setBillingPhone] = useState(billingAddr.phone || "");
  const [billingFax, setBillingFax] = useState(billingAddr.fax || "");

  const [shippingAttention, setShippingAttention] = useState(
    shippingAddr.attention || "",
  );
  const [shippingCountry, setShippingCountry] = useState(
    shippingAddr.country || "India",
  );
  const [shippingStreet1, setShippingStreet1] = useState(
    shippingAddr.street1 || "",
  );
  const [shippingStreet2, setShippingStreet2] = useState(
    shippingAddr.street2 || "",
  );
  const [shippingCity, setShippingCity] = useState(shippingAddr.city || "");
  const [shippingState, setShippingState] = useState(shippingAddr.state || "");
  const [shippingPincode, setShippingPincode] = useState(
    shippingAddr.pincode || "",
  );
  const [shippingPhone, setShippingPhone] = useState(shippingAddr.phone || "");
  const [shippingFax, setShippingFax] = useState(shippingAddr.fax || "");
  const [shippingSameAsBilling, setShippingSameAsBilling] = useState(
    initialShippingSameAsBilling,
  );

  const [courierAttention, setCourierAttention] = useState(
    initialCourierAddress.attention || "",
  );
  const [courierCountry, setCourierCountry] = useState(
    initialCourierAddress.country || "India",
  );
  const [courierStreet1, setCourierStreet1] = useState(
    initialCourierAddress.street1 || "",
  );
  const [courierStreet2, setCourierStreet2] = useState(
    initialCourierAddress.street2 || "",
  );
  const [courierCity, setCourierCity] = useState(
    initialCourierAddress.city || "",
  );
  const [courierState, setCourierState] = useState(
    initialCourierAddress.state || "",
  );
  const [courierPincode, setCourierPincode] = useState(
    initialCourierAddress.pincode || "",
  );
  const [courierPhone, setCourierPhone] = useState(
    initialCourierAddress.phone || "",
  );
  const [courierFax, setCourierFax] = useState(initialCourierAddress.fax || "");
  const [courierSameAsBilling, setCourierSameAsBilling] = useState(
    initialCourierSameAsBilling || !initialCourierAddress.street1,
  );
  const [lookupState, setLookupState] = useState<Record<AddressKey, LookupState>>({
    billing: { loading: false, error: null },
    shipping: { loading: false, error: null },
    courier: { loading: false, error: null },
  });
  const lastLookupRef = useRef<Record<AddressKey, string>>({
    billing: "",
    shipping: "",
    courier: "",
  });

  // Finance
  const [creditLimit, setCreditLimit] = useState(
    String(initialData.creditLimit || "0"),
  );
  const [currency, setCurrency] = useState(initialData.currency || "INR");
  const [openingBalances, setOpeningBalances] = useState<OpeningBalanceDraft[]>(
    initialOpeningBalances.length > 0
      ? initialOpeningBalances
      : [
          {
            id: "opening-balance-1",
            branch: initialData.openingBalanceBranch || "Chennai",
            amount: String(initialData.openingBalanceAmount || "0"),
          },
        ],
  );
  const [paymentTerms, setPaymentTerms] = useState(
    initialData.paymentTerms || "Net 30",
  );
  const [ownerId, setOwnerId] = useState(
    initialData.ownerId || employees[0]?.id || "",
  );
  const [remarks, setRemarks] = useState(initialUserRemarks);

  // Portal
  const [isPortalEnabled, setIsPortalEnabled] = useState(
    initialData.isPortalEnabled || false,
  );
  const [taxPreference, setTaxPreference] = useState(
    initialData.taxPreference || "Taxable",
  );

  // KYC Files (New uploads)
  const [iecFile, setIecFile] = useState<File | null>(null);
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [adCodeFile, setAdCodeFile] = useState<File | null>(null);
  const [fssaiLicenceFile, setFssaiLicenceFile] = useState<File | null>(null);
  const [companyAddressProofFile, setCompanyAddressProofFile] =
    useState<File | null>(null);
  const [partnerAddressProofFile, setPartnerAddressProofFile] =
    useState<File | null>(null);
  const [authorisationLetterFile, setAuthorisationLetterFile] =
    useState<File | null>(null);
  const [cancelledChequeFile, setCancelledChequeFile] = useState<File | null>(null);
  const [gstManualFallback, setGstManualFallback] = useState(false);

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
        error: (err) => err.message || "Failed to fetch GST details"
      });
    }
  };

  const addAdditionalContact = () => {
    setAdditionalContacts((current) => [
      ...current,
      {
        id: `new-${Date.now()}-${current.length}`,
        fullName: "",
        designation: "",
        email: "",
        phone: "",
        isPrimary: false,
      },
    ]);
  };

  const addOpeningBalanceRow = () => {
    setOpeningBalances((current) => [
      ...current,
      { id: `opening-balance-${Date.now()}-${current.length}`, branch: "Chennai", amount: "0" },
    ]);
  };

  const updateOpeningBalanceRow = (
    id: string,
    field: "branch" | "amount",
    value: string,
  ) => {
    setOpeningBalances((current) =>
      current.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const removeOpeningBalanceRow = (id: string) => {
    setOpeningBalances((current) =>
      current.length === 1
        ? [{ ...current[0], branch: "Chennai", amount: "0" }]
        : current.filter((row) => row.id !== id),
    );
  };

  const updateAdditionalContact = (
    id: string,
    field: keyof Omit<ContactDraft, "id" | "isPrimary">,
    value: string,
  ) => {
    setAdditionalContacts((current) =>
      current.map((contact) =>
        contact.id === id ? { ...contact, [field]: value } : contact,
      ),
    );
  };

  const removeAdditionalContact = (id: string) => {
    setAdditionalContacts((current) =>
      current.filter((contact) => contact.id !== id),
    );
  };

  const runPincodeLookup = async (kind: AddressKey, pincode: string) => {
    const normalized = pincode.replace(/\D/g, "").slice(0, 6);
    if (normalized.length !== 6 || lastLookupRef.current[kind] === normalized) {
      return;
    }

    setLookupState((current) => ({
      ...current,
      [kind]: { loading: true, error: null },
    }));

    const result = await lookupIndianPincodeAction(normalized);
    if (!result.ok) {
      setLookupState((current) => ({
        ...current,
        [kind]: { loading: false, error: result.error },
      }));
      if (kind === "billing") {
        setBillingCity("");
        setBillingState("");
      } else if (kind === "shipping") {
        setShippingCity("");
        setShippingState("");
      } else {
        setCourierCity("");
        setCourierState("");
      }
      lastLookupRef.current[kind] = "";
      return;
    }

    const city = String(result.data?.city ?? "");
    const state = String(result.data?.state ?? "");
    if (kind === "billing") {
      setBillingCity(city);
      setBillingState(state);
    } else if (kind === "shipping") {
      setShippingCity(city);
      setShippingState(state);
    } else {
      setCourierCity(city);
      setCourierState(state);
    }

    lastLookupRef.current[kind] = normalized;
    setLookupState((current) => ({
      ...current,
      [kind]: { loading: false, error: null },
    }));
  };

  useEffect(() => {
    if (shippingSameAsBilling) {
      const timer = window.setTimeout(() => {
        setShippingAttention(billingAttention);
        setShippingCountry(billingCountry);
        setShippingStreet1(billingStreet1);
        setShippingStreet2(billingStreet2);
        setShippingCity(billingCity);
        setShippingState(billingState);
        setShippingPincode(billingPincode);
        setShippingPhone(billingPhone);
        setShippingFax(billingFax);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [
    shippingSameAsBilling,
    billingAttention,
    billingCountry,
    billingStreet1,
    billingStreet2,
    billingCity,
    billingState,
    billingPincode,
    billingPhone,
    billingFax,
  ]);

  useEffect(() => {
    if (courierSameAsBilling) {
      const timer = window.setTimeout(() => {
        setCourierAttention(billingAttention);
        setCourierCountry(billingCountry);
        setCourierStreet1(billingStreet1);
        setCourierStreet2(billingStreet2);
        setCourierCity(billingCity);
        setCourierState(billingState);
        setCourierPincode(billingPincode);
        setCourierPhone(billingPhone);
        setCourierFax(billingFax);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [
    courierSameAsBilling,
    billingAttention,
    billingCountry,
    billingStreet1,
    billingStreet2,
    billingCity,
    billingState,
    billingPincode,
    billingPhone,
    billingFax,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void runPincodeLookup("billing", billingPincode);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [billingPincode]);

  useEffect(() => {
    if (!shippingSameAsBilling) {
      const timer = window.setTimeout(() => {
        void runPincodeLookup("shipping", shippingPincode);
      }, 150);
      return () => window.clearTimeout(timer);
    }
  }, [shippingPincode, shippingSameAsBilling]);

  useEffect(() => {
    if (!courierSameAsBilling) {
      const timer = window.setTimeout(() => {
        void runPincodeLookup("courier", courierPincode);
      }, 150);
      return () => window.clearTimeout(timer);
    }
  }, [courierPincode, courierSameAsBilling]);

  const handleNameFieldBlur = () => {
    if (!displayName) {
      if (companyName) setDisplayName(companyName);
      else if (firstName || lastName)
        setDisplayName(`${firstName} ${lastName}`.trim());
    }
  };

  const validateStep = () => {
    if (currentStep === 1) {
      const computedName =
        displayName || companyName || `${firstName} ${lastName}`.trim();
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
    fd.set("shippingSameAsBilling", shippingSameAsBilling ? "true" : "false");
    fd.set("courierSameAsBilling", courierSameAsBilling ? "true" : "false");
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

    fd.set("courierAttention", courierAttention);
    fd.set("courierCountry", courierCountry);
    fd.set("courierStreet1", courierStreet1);
    fd.set("courierStreet2", courierStreet2);
    fd.set("courierCity", courierCity);
    fd.set("courierState", courierState);
    fd.set("courierPincode", courierPincode);
    fd.set("courierPhone", courierPhone);
    fd.set("courierFax", courierFax);

    fd.set("creditLimit", creditLimit);
    fd.set("currency", currency);
    const normalizedOpeningBalances = openingBalances
      .map((row) => ({
        branch: row.branch.trim(),
        amount: row.amount.trim(),
      }))
      .filter((row) => row.branch || row.amount);
    fd.set("openingBalancesPayload", JSON.stringify(normalizedOpeningBalances));
    fd.set("openingBalanceBranch", normalizedOpeningBalances[0]?.branch || "Chennai");
    fd.set("openingBalanceAmount", normalizedOpeningBalances[0]?.amount || "0");
    fd.set("paymentTerms", paymentTerms);
    fd.set("ownerId", ownerId);
    fd.set("taxPreference", taxPreference);
    fd.set("remarks", remarks);
    fd.set("isPortalEnabled", isPortalEnabled ? "true" : "false");

    fd.set("type", "Customer");

    // set primary name
    const nameToSave =
      displayName.trim() ||
      companyName.trim() ||
      `${firstName} ${lastName}`.trim() ||
      "Unnamed Customer";
    fd.set("name", nameToSave);

    const contactsPayload = [
      {
        id: primaryContactRecord?.id,
        ...splitContactName(primaryContactName),
        designation: primaryContactDesignation.trim(),
        email: email.trim(),
        phone: phone.trim(),
        isPrimary: true,
      },
      ...additionalContacts.map((contact) => ({
        id: contact.id.startsWith("new-") ? undefined : contact.id,
        ...splitContactName(contact.fullName),
        designation: contact.designation.trim(),
        email: contact.email.trim(),
        phone: contact.phone.trim(),
        isPrimary: false,
      })),
    ];
    fd.set("contactsPayload", JSON.stringify(contactsPayload));

    // Set KYC Files
    if (iecFile) fd.set("kycFile_IEC", iecFile);
    if (gstFile) fd.set("kycFile_GST", gstFile);
    if (adCodeFile) fd.set("kycFile_AD_Code", adCodeFile);
    if (fssaiLicenceFile) fd.set("kycFile_FSSAI_Licence", fssaiLicenceFile);
    if (companyAddressProofFile)
      fd.set("kycFile_Company_Address_Proof", companyAddressProofFile);
    if (partnerAddressProofFile)
      fd.set(
        "kycFile_Partner_/_Proprietor_Address_Proof",
        partnerAddressProofFile,
      );
    if (authorisationLetterFile)
      fd.set("kycFile_Authorisation_Letter", authorisationLetterFile);
    if (cancelledChequeFile) {
      fd.set("kycFile_Cancelled_Cheque", cancelledChequeFile);
    }

    try {
      const res = await updateAccountAction(initialData.id, fd);
      if (res.ok) {
        toast.success("Customer profile updated successfully");
        router.push("/cha/customers");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to save customer");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "An error occurred",
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const renderExistingKycRow = (
    type: string,
    fileInputNode: React.ReactNode,
  ) => {
    const existing = initialKyc[type];
    return (
      <div className="p-4 border mnx-border mnx-bg-surface rounded-xl space-y-2.5 mnx-border">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block">
            {type}
          </label>
          {existing && (
            <a
              href={existing.fileKey}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] mnx-text-accent hover:underline flex items-center gap-1 font-bold font-sans uppercase"
            >
              View Document <ExternalLink size={10} />
            </a>
          )}
        </div>
        {existing ? (
          <div className="mnx-bg-soft p-2.5 rounded-lg border mnx-border mnx-border text-xs space-y-1">
            <p className="font-semibold mnx-text-primary">
              Current file:{" "}
              <span className="font-mono mnx-text-muted font-medium">
                {existing.fileName}
              </span>
            </p>
            <p className="text-[10px] mnx-text-muted">
              Uploaded: {new Date(existing.uploadedAt).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <p className="text-[10px] mnx-text-muted italic">
            No document currently uploaded
          </p>
        )}
        <div className="pt-1">
          <span className="text-[10px] mnx-text-muted font-semibold block mb-1">
            Replace Document:
          </span>
          {fileInputNode}
        </div>
      </div>
    );
  };

  return (
    <div className="min-w-0 space-y-8">
      {/* Wizard Header */}
      <ChaRoutePageHeader
        description={`Modify details and verification files for ${initialData.name}.`}
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
      <form
        onSubmit={handleSubmit}
        className="mnx-bg-surface rounded-2xl border mnx-border p-6 shadow-sm mnx-border space-y-6"
      >
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
                <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-2">
                  Customer Type
                </label>
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
                    <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                      Company Name *
                    </label>
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
                    <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                      Display Name *
                    </label>
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
                      <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                        Salutation
                      </label>
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
                      <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                        First Name *
                      </label>
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
                      <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                        Last Name
                      </label>
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
                    <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                      Display Name *
                    </label>
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
                  <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                    Industry Segment
                  </label>
                  <NativeSelect
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                  >
                    <option value="Logistics & Freight Forwarding">
                      Logistics & Freight Forwarding
                    </option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Trading & Retail">Trading & Retail</option>
                    <option value="Imports / Exports">Imports / Exports</option>
                    <option value="Chemicals">Chemicals</option>
                  </NativeSelect>
                </div>
                <div>
                  <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                    Customer Language
                  </label>
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
                  <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                    GST Treatment
                  </label>
                  <NativeSelect
                    value={gstTreatment}
                    onChange={(e) => setGstTreatment(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
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
                  <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                    GSTIN
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. 33AABCA1234F1Z1"
                    value={gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
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
                  <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                    PAN Card Number
                  </label>
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

            <div className="rounded-2xl border mnx-border p-5 mnx-bg-soft space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold mnx-text-primary uppercase">
                    Primary Contact
                  </h3>
                  <p className="text-xs mnx-text-muted">
                    This contact will be used as the main customer contact.
                  </p>
                </div>
                <span className="rounded-full mnx-bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] mnx-text-muted">
                  Primary
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                <div className="xl:col-span-2">
                  <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                    Contact Person Name
                  </label>
                  <Input
                    type="text"
                    value={primaryContactName}
                    onChange={(e) => setPrimaryContactName(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                    Designation
                  </label>
                  <Input
                    type="text"
                    value={primaryContactDesignation}
                    onChange={(e) => setPrimaryContactDesignation(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                    Phone Number
                  </label>
                  <Input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border mnx-border p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold mnx-text-primary uppercase">
                    Additional Contacts
                  </h3>
                  <p className="text-xs mnx-text-muted">
                    Add or update additional contact people for this customer.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={addAdditionalContact}>
                  Add Contact
                </Button>
              </div>

              {additionalContacts.length === 0 ? (
                <div className="rounded-xl border border-dashed mnx-border p-4 text-sm mnx-text-muted">
                  No additional contacts added yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {additionalContacts.map((contact, index) => (
                    <div key={contact.id} className="rounded-xl border mnx-border p-4 mnx-bg-soft space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] mnx-text-muted">
                          Contact {index + 2}
                        </p>
                        <Button type="button" variant="outline" onClick={() => removeAdditionalContact(contact.id)}>
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <Input value={contact.fullName} onChange={(e) => updateAdditionalContact(contact.id, "fullName", e.target.value)} placeholder="Contact Person Name" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                        <Input value={contact.designation} onChange={(e) => updateAdditionalContact(contact.id, "designation", e.target.value)} placeholder="Designation" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                        <Input type="email" value={contact.email} onChange={(e) => updateAdditionalContact(contact.id, "email", e.target.value)} placeholder="Email Address" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                        <Input value={contact.phone} onChange={(e) => updateAdditionalContact(contact.id, "phone", e.target.value)} placeholder="Phone Number" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                  Website URL
                </label>
                <Input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-2">
                  Notification Channels
                </label>
                <div className="flex flex-wrap gap-6 pt-2">
                  <label className="flex items-center gap-2 text-sm mnx-text-primary cursor-pointer font-medium">
                    <Input type="checkbox" checked={channelEmail} onChange={(e) => setChannelEmail(e.target.checked)} className="mnx-choice-control size-4" />
                    Email Notifications
                  </label>
                  <label className="flex items-center gap-2 text-sm mnx-text-primary cursor-pointer font-medium">
                    <Input type="checkbox" checked={channelSms} onChange={(e) => setChannelSms(e.target.checked)} className="mnx-choice-control size-4" />
                    SMS Alerts
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Address */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="border-b mnx-border pb-3 mnx-border">
              <h2 className="text-base font-bold mnx-text-primary uppercase font-display flex items-center gap-2">
                <MapPin className="mnx-text-accent size-5" /> Addresses
              </h2>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="space-y-4 rounded-2xl border mnx-border p-5">
                <h3 className="text-sm font-bold mnx-text-primary uppercase">Billing Address</h3>
                <div className="space-y-3">
                  <Input value={billingAttention} onChange={(e) => setBillingAttention(e.target.value)} placeholder="Attention" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                  <Input value={billingStreet1} onChange={(e) => setBillingStreet1(e.target.value)} placeholder="Street 1" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                  <Input value={billingStreet2} onChange={(e) => setBillingStreet2(e.target.value)} placeholder="Street 2" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input value={billingCity} disabled placeholder={lookupState.billing.loading ? "Loading city..." : "City"} className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-soft text-sm mnx-text-primary" />
                    <Input value={billingState} disabled placeholder={lookupState.billing.loading ? "Loading state..." : "State"} className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-soft text-sm mnx-text-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input value={billingPincode} onChange={(e) => setBillingPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="PIN Code" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                    <Input value={billingCountry} onChange={(e) => setBillingCountry(e.target.value)} placeholder="Country" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input value={billingPhone} onChange={(e) => setBillingPhone(e.target.value)} placeholder="Phone" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                    <Input value={billingFax} onChange={(e) => setBillingFax(e.target.value)} placeholder="Fax" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                  </div>
                  {lookupState.billing.error ? <p className="text-xs text-red-600">{lookupState.billing.error}</p> : null}
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border mnx-border p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold mnx-text-primary uppercase">Shipping Address</h3>
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mnx-text-muted">
                    <Input type="checkbox" checked={shippingSameAsBilling} onChange={(e) => setShippingSameAsBilling(e.target.checked)} className="mnx-choice-control size-4" />
                    Billing As Shipping
                  </label>
                </div>
                <div className="space-y-3">
                  <Input disabled={shippingSameAsBilling} value={shippingAttention} onChange={(e) => setShippingAttention(e.target.value)} placeholder="Attention" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                  <Input disabled={shippingSameAsBilling} value={shippingStreet1} onChange={(e) => setShippingStreet1(e.target.value)} placeholder="Street 1" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                  <Input disabled={shippingSameAsBilling} value={shippingStreet2} onChange={(e) => setShippingStreet2(e.target.value)} placeholder="Street 2" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input value={shippingCity} disabled placeholder={lookupState.shipping.loading ? "Loading city..." : "City"} className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-soft text-sm mnx-text-primary" />
                    <Input value={shippingState} disabled placeholder={lookupState.shipping.loading ? "Loading state..." : "State"} className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-soft text-sm mnx-text-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input disabled={shippingSameAsBilling} value={shippingPincode} onChange={(e) => setShippingPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="PIN Code" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                    <Input disabled={shippingSameAsBilling} value={shippingCountry} onChange={(e) => setShippingCountry(e.target.value)} placeholder="Country" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input disabled={shippingSameAsBilling} value={shippingPhone} onChange={(e) => setShippingPhone(e.target.value)} placeholder="Phone" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                    <Input disabled={shippingSameAsBilling} value={shippingFax} onChange={(e) => setShippingFax(e.target.value)} placeholder="Fax" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                  </div>
                  {lookupState.shipping.error && !shippingSameAsBilling ? <p className="text-xs text-red-600">{lookupState.shipping.error}</p> : null}
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border mnx-border p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold mnx-text-primary uppercase">Courier Address</h3>
                  <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mnx-text-muted">
                    <Input type="checkbox" checked={courierSameAsBilling} onChange={(e) => setCourierSameAsBilling(e.target.checked)} className="mnx-choice-control size-4" />
                    Billing As Courier
                  </label>
                </div>
                <div className="space-y-3">
                  <Input disabled={courierSameAsBilling} value={courierAttention} onChange={(e) => setCourierAttention(e.target.value)} placeholder="Attention" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                  <Input disabled={courierSameAsBilling} value={courierStreet1} onChange={(e) => setCourierStreet1(e.target.value)} placeholder="Street 1" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                  <Input disabled={courierSameAsBilling} value={courierStreet2} onChange={(e) => setCourierStreet2(e.target.value)} placeholder="Street 2" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input value={courierCity} disabled placeholder={lookupState.courier.loading ? "Loading city..." : "City"} className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-soft text-sm mnx-text-primary" />
                    <Input value={courierState} disabled placeholder={lookupState.courier.loading ? "Loading state..." : "State"} className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-soft text-sm mnx-text-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input disabled={courierSameAsBilling} value={courierPincode} onChange={(e) => setCourierPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="PIN Code" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                    <Input disabled={courierSameAsBilling} value={courierCountry} onChange={(e) => setCourierCountry(e.target.value)} placeholder="Country" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input disabled={courierSameAsBilling} value={courierPhone} onChange={(e) => setCourierPhone(e.target.value)} placeholder="Phone" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                    <Input disabled={courierSameAsBilling} value={courierFax} onChange={(e) => setCourierFax(e.target.value)} placeholder="Fax" className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary" />
                  </div>
                  {lookupState.courier.error && !courierSameAsBilling ? <p className="text-xs text-red-600">{lookupState.courier.error}</p> : null}
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
                <DollarSign className="mnx-text-accent size-5" /> Financial
                Parameters
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                  Credit Limit (INR)
                </label>
                <Input
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                  Currency Preference
                </label>
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

            <div className="rounded-2xl border mnx-border p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold mnx-text-primary uppercase">
                    Opening Balances By Branch
                  </h3>
                  <p className="text-xs mnx-text-muted">
                    Maintain one opening balance row for each customer branch relationship.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={addOpeningBalanceRow}>
                  Add Branch
                </Button>
              </div>

              <div className="space-y-4">
                {openingBalances.map((row, index) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 items-end"
                  >
                    <div>
                      <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                        Branch {index + 1}
                      </label>
                      <NativeSelect
                        value={row.branch}
                        onChange={(e) =>
                          updateOpeningBalanceRow(row.id, "branch", e.target.value)
                        }
                        className="w-full h-10 px-3 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                      >
                        <option value="Chennai">Chennai</option>
                        <option value="Mumbai">Mumbai</option>
                        <option value="Delhi">Delhi</option>
                      </NativeSelect>
                    </div>
                    <div>
                      <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                        Opening Balance Amount
                      </label>
                      <Input
                        type="number"
                        value={row.amount}
                        onChange={(e) =>
                          updateOpeningBalanceRow(row.id, "amount", e.target.value)
                        }
                        className="w-full h-10 px-3.5 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeOpeningBalanceRow(row.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                  Payment Terms
                </label>
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
              <div />
              <div />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                  Account Owner / Account Manager
                </label>
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
              <div>
                <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                  Tax Preference
                </label>
                <NativeSelect
                  value={taxPreference}
                  onChange={(e) => setTaxPreference(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                >
                  <option value="Taxable">Taxable</option>
                  <option value="Tax Exempt">Tax Exempt</option>
                </NativeSelect>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold mnx-text-muted uppercase tracking-wider block mb-1.5">
                Customer Remarks / General Comments
              </label>
              <Textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full h-24 p-3 rounded-xl border mnx-border mnx-bg-surface text-sm mnx-text-primary focus:outline-none"
                placeholder="Enter any customer specific remarks..."
              />
            </div>
          </div>
        )}

        {/* Step 5: KYC Documents */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="border-b mnx-border pb-3 mnx-border">
              <h2 className="text-base font-bold mnx-text-primary uppercase font-display flex items-center gap-2">
                <FileText className="mnx-text-accent size-5" /> KYC Documents
                Upload
              </h2>
            </div>

            <div className="space-y-4">
              <p className="text-xs mnx-text-muted leading-relaxed mb-4">
                Review, view, or replace customer KYC documents. These files
                sync automatically with custom clearance workflows.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* IEC */}
                {renderExistingKycRow(
                  "IEC",
                  <Input
                    type="file"
                    onChange={(e) => setIecFile(e.target.files?.[0] || null)}
                    className="w-full text-xs mnx-text-muted file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold mnx-bg-accent mnx-text-accent mnx-hover-accent"
                    accept=".pdf,.png,.jpg,.jpeg"
                  />,
                )}

                {/* GST */}
                {renderExistingKycRow(
                  "GST",
                  <Input
                    type="file"
                    onChange={(e) => setGstFile(e.target.files?.[0] || null)}
                    className="w-full text-xs mnx-text-muted file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold mnx-bg-accent mnx-text-accent mnx-hover-accent"
                    accept=".pdf,.png,.jpg,.jpeg"
                  />,
                )}

                {/* AD Code */}
                {renderExistingKycRow(
                  "AD Code",
                  <Input
                    type="file"
                    onChange={(e) => setAdCodeFile(e.target.files?.[0] || null)}
                    className="w-full text-xs mnx-text-muted file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold mnx-bg-accent mnx-text-accent mnx-hover-accent"
                    accept=".pdf,.png,.jpg,.jpeg"
                  />,
                )}

                {/* FSSAI Licence */}
                {renderExistingKycRow(
                  "FSSAI Licence",
                  <Input
                    type="file"
                    onChange={(e) =>
                      setFssaiLicenceFile(e.target.files?.[0] || null)
                    }
                    className="w-full text-xs mnx-text-muted file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold mnx-bg-accent mnx-text-accent mnx-hover-accent"
                    accept=".pdf,.png,.jpg,.jpeg"
                  />,
                )}

                {/* Company Address Proof */}
                {renderExistingKycRow(
                  "Company Address Proof",
                  <Input
                    type="file"
                    onChange={(e) =>
                      setCompanyAddressProofFile(e.target.files?.[0] || null)
                    }
                    className="w-full text-xs mnx-text-muted file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold mnx-bg-accent mnx-text-accent mnx-hover-accent"
                    accept=".pdf,.png,.jpg,.jpeg"
                  />,
                )}

                {/* Partner Address Proof */}
                {renderExistingKycRow(
                  "Partner / Proprietor Address Proof",
                  <Input
                    type="file"
                    onChange={(e) =>
                      setPartnerAddressProofFile(e.target.files?.[0] || null)
                    }
                    className="w-full text-xs mnx-text-muted file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold mnx-bg-accent mnx-text-accent mnx-hover-accent"
                    accept=".pdf,.png,.jpg,.jpeg"
                  />,
                )}

                {/* Authorisation Letter */}
                <div className="md:col-span-2">
                  {renderExistingKycRow(
                    "Authorisation Letter",
                    <Input
                      type="file"
                      onChange={(e) =>
                        setAuthorisationLetterFile(e.target.files?.[0] || null)
                      }
                      className="w-full text-xs mnx-text-muted file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold mnx-bg-accent mnx-text-accent mnx-hover-accent"
                      accept=".pdf,.png,.jpg,.jpeg"
                    />,
                  )}
                </div>

                <div className="md:col-span-2">
                  {renderExistingKycRow(
                    "Cancelled Cheque",
                    <Input
                      type="file"
                      onChange={(e) =>
                        setCancelledChequeFile(e.target.files?.[0] || null)
                      }
                      className="w-full text-xs mnx-text-muted file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold mnx-bg-accent mnx-text-accent mnx-hover-accent"
                      accept=".pdf,.png,.jpg,.jpeg"
                    />,
                  )}
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
                <Globe className="mnx-text-accent size-5" /> Customer Portal
                Access
              </h2>
            </div>

            <div className="rounded-xl border mnx-border p-5 mnx-bg-soft mnx-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold mnx-text-primary">
                    Enable Customer Portal
                  </h3>
                  <p className="text-xs mnx-text-muted mt-1">
                    Allows the customer to log in directly to track shipments,
                    approve expenses, and upload documents.
                  </p>
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
                Changes
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3 rounded-xl border mnx-border p-4 mnx-bg-soft mnx-border">
                <h3 className="text-xs font-bold uppercase mnx-text-muted">
                  Primary Profile
                </h3>
                <div className="space-y-1.5 text-sm">
                  <p>
                    <span className="font-semibold mnx-text-muted">Type:</span>{" "}
                    {customerSubType}
                  </p>
                  <p>
                    <span className="font-semibold mnx-text-muted">Name:</span>{" "}
                    {displayName}
                  </p>
                  {companyName && (
                    <p>
                      <span className="font-semibold mnx-text-muted">
                        Company:
                      </span>{" "}
                      {companyName}
                    </p>
                  )}
                  <p>
                    <span className="font-semibold mnx-text-muted">
                      Industry:
                    </span>{" "}
                    {industry}
                  </p>
                  <p>
                    <span className="font-semibold mnx-text-muted">
                      Branch Balances:
                    </span>{" "}
                    {openingBalances
                      .map((row) => `${row.branch}: ${row.amount || "0"}`)
                      .join(" · ")}
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border mnx-border p-4 mnx-bg-soft mnx-border">
                <h3 className="text-xs font-bold uppercase mnx-text-muted">
                  Contact Info
                </h3>
                <div className="space-y-1.5 text-sm">
                  <p>
                    <span className="font-semibold mnx-text-muted">Email:</span>{" "}
                    {email || "—"}
                  </p>
                  <p>
                    <span className="font-semibold mnx-text-muted">Phone:</span>{" "}
                    {phone || "—"}
                  </p>
                  <p>
                    <span className="font-semibold mnx-text-muted">
                      Portal:
                    </span>{" "}
                    {isPortalEnabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border mnx-border p-4 mnx-bg-soft mnx-border md:col-span-2">
                <h3 className="text-xs font-bold uppercase mnx-text-muted">
                  KYC Documents Status
                </h3>
                <div className="space-y-2 text-xs font-mono">
                  {Object.keys(initialKyc).length === 0 &&
                  !iecFile &&
                  !gstFile &&
                  !adCodeFile &&
                  !fssaiLicenceFile &&
                  !companyAddressProofFile &&
                  !partnerAddressProofFile &&
                  !authorisationLetterFile &&
                  !cancelledChequeFile ? (
                    <p className="mnx-text-muted italic">
                      No KYC documents registered or selected.
                    </p>
                  ) : (
                    <>
                      <p>
                        <span className="font-semibold mnx-text-muted font-sans uppercase">
                          IEC:
                        </span>{" "}
                        {iecFile ? (
                          <span className="mnx-text-success font-bold">
                            Replacing with: {iecFile.name}
                          </span>
                        ) : initialKyc["IEC"] ? (
                          <span className="mnx-text-primary">
                            Current file: {initialKyc["IEC"].fileName}
                          </span>
                        ) : (
                          <span className="mnx-text-muted">Not uploaded</span>
                        )}
                      </p>
                      <p>
                        <span className="font-semibold mnx-text-muted font-sans uppercase">
                          GST:
                        </span>{" "}
                        {gstFile ? (
                          <span className="mnx-text-success font-bold">
                            Replacing with: {gstFile.name}
                          </span>
                        ) : initialKyc["GST"] ? (
                          <span className="mnx-text-primary">
                            Current file: {initialKyc["GST"].fileName}
                          </span>
                        ) : (
                          <span className="mnx-text-muted">Not uploaded</span>
                        )}
                      </p>
                      <p>
                        <span className="font-semibold mnx-text-muted font-sans uppercase">
                          AD Code:
                        </span>{" "}
                        {adCodeFile ? (
                          <span className="mnx-text-success font-bold">
                            Replacing with: {adCodeFile.name}
                          </span>
                        ) : initialKyc["AD Code"] ? (
                          <span className="mnx-text-primary">
                            Current file: {initialKyc["AD Code"].fileName}
                          </span>
                        ) : (
                          <span className="mnx-text-muted">Not uploaded</span>
                        )}
                      </p>
                      <p>
                        <span className="font-semibold mnx-text-muted font-sans uppercase">
                          FSSAI Licence:
                        </span>{" "}
                        {fssaiLicenceFile ? (
                          <span className="mnx-text-success font-bold">
                            Replacing with: {fssaiLicenceFile.name}
                          </span>
                        ) : initialKyc["FSSAI Licence"] ? (
                          <span className="mnx-text-primary">
                            Current file: {initialKyc["FSSAI Licence"].fileName}
                          </span>
                        ) : (
                          <span className="mnx-text-muted">Not uploaded</span>
                        )}
                      </p>
                      <p>
                        <span className="font-semibold mnx-text-muted font-sans uppercase">
                          Company Address Proof:
                        </span>{" "}
                        {companyAddressProofFile ? (
                          <span className="mnx-text-success font-bold">
                            Replacing with: {companyAddressProofFile.name}
                          </span>
                        ) : initialKyc["Company Address Proof"] ? (
                          <span className="mnx-text-primary">
                            Current file:{" "}
                            {initialKyc["Company Address Proof"].fileName}
                          </span>
                        ) : (
                          <span className="mnx-text-muted">Not uploaded</span>
                        )}
                      </p>
                      <p>
                        <span className="font-semibold mnx-text-muted font-sans uppercase">
                          Partner Address Proof:
                        </span>{" "}
                        {partnerAddressProofFile ? (
                          <span className="mnx-text-success font-bold">
                            Replacing with: {partnerAddressProofFile.name}
                          </span>
                        ) : initialKyc["Partner / Proprietor Address Proof"] ? (
                          <span className="mnx-text-primary">
                            Current file:{" "}
                            {
                              initialKyc["Partner / Proprietor Address Proof"]
                                .fileName
                            }
                          </span>
                        ) : (
                          <span className="mnx-text-muted">Not uploaded</span>
                        )}
                      </p>
                      <p>
                        <span className="font-semibold mnx-text-muted font-sans uppercase">
                          Authorisation Letter:
                        </span>{" "}
                        {authorisationLetterFile ? (
                          <span className="mnx-text-success font-bold">
                            Replacing with: {authorisationLetterFile.name}
                          </span>
                        ) : initialKyc["Authorisation Letter"] ? (
                          <span className="mnx-text-primary">
                            Current file:{" "}
                            {initialKyc["Authorisation Letter"].fileName}
                          </span>
                        ) : (
                          <span className="mnx-text-muted">Not uploaded</span>
                        )}
                      </p>
                      <p>
                        <span className="font-semibold mnx-text-muted font-sans uppercase">
                          Cancelled Cheque:
                        </span>{" "}
                        {cancelledChequeFile ? (
                          <span className="mnx-text-success font-bold">
                            Replacing with: {cancelledChequeFile.name}
                          </span>
                        ) : initialKyc["Cancelled Cheque"] ? (
                          <span className="mnx-text-primary">
                            Current file:{" "}
                            {initialKyc["Cancelled Cheque"].fileName}
                          </span>
                        ) : (
                          <span className="mnx-text-muted">Not uploaded</span>
                        )}
                      </p>
                    </>
                  )}
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
