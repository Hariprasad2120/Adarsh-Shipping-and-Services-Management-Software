type ServiceEnquiryRef = {
  serviceType: "FREIGHT_FORWARDING" | "CUSTOMS_CLEARANCE";
  enquiryRef?: string | null;
  departmentRef?: string | null;
};

type LeadEnquiryReferenceSource = {
  enquiryRef?: string | null;
  enquiryDetails?: unknown;
  serviceEnquiries?: ServiceEnquiryRef[] | null;
};

function cleanReference(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getDepartmentRefsFromDetails(enquiryDetails: unknown) {
  if (!enquiryDetails || typeof enquiryDetails !== "object") {
    return {};
  }

  const candidate = (enquiryDetails as { departmentRefs?: unknown }).departmentRefs;
  if (!candidate || typeof candidate !== "object") {
    return {};
  }

  const record = candidate as Record<string, unknown>;
  return {
    freight: cleanReference(typeof record.FREIGHT_FORWARDING === "string" ? record.FREIGHT_FORWARDING : null),
    clearance: cleanReference(typeof record.CUSTOMS_CLEARANCE === "string" ? record.CUSTOMS_CLEARANCE : null),
  };
}

export function getQuoteEnquiryNumber(source: LeadEnquiryReferenceSource) {
  const departmentRefs = getDepartmentRefsFromDetails(source.enquiryDetails);
  const freightServiceRef = source.serviceEnquiries?.find(
    (item) => item.serviceType === "FREIGHT_FORWARDING",
  );
  const clearanceServiceRef = source.serviceEnquiries?.find(
    (item) => item.serviceType === "CUSTOMS_CLEARANCE",
  );

  const freightRef =
    cleanReference(freightServiceRef?.departmentRef) ??
    cleanReference(freightServiceRef?.enquiryRef) ??
    departmentRefs.freight ??
    null;
  const clearanceRef =
    cleanReference(clearanceServiceRef?.departmentRef) ??
    cleanReference(clearanceServiceRef?.enquiryRef) ??
    departmentRefs.clearance ??
    null;

  if (freightRef && clearanceRef) {
    return freightRef === clearanceRef
      ? freightRef
      : `Freight: ${freightRef} | Clearance: ${clearanceRef}`;
  }

  return freightRef ?? clearanceRef ?? cleanReference(source.enquiryRef) ?? "";
}
