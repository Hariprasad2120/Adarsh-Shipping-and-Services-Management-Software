export const GST_PUBLIC_SEARCH_URL =
  "https://services.gst.gov.in/services/searchtp";

export function isGstLookupConfigurationError(message: string | null | undefined) {
  return String(message || "")
    .toLowerCase()
    .includes("gst portal integration is not configured");
}
