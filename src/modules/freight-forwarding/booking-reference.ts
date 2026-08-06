import { importMasterData } from "@/modules/cha/labs/import-job-creation/fixtures/import-master-data";

type Option = {
  value: string;
  label: string;
};

function uniqueOptions(options: Option[]) {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = option.value.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const freightForwardingIncoterms = uniqueOptions([
  { value: "EXW", label: "EXW" },
  { value: "FCA", label: "FCA" },
  { value: "FAS", label: "FAS" },
  { value: "FOB", label: "FOB" },
  { value: "CFR", label: "CFR" },
  { value: "CIF", label: "CIF" },
  { value: "CPT", label: "CPT" },
  { value: "CIP", label: "CIP" },
  { value: "DAP", label: "DAP" },
  { value: "DPU", label: "DPU" },
  { value: "DDP", label: "DDP" },
  ...importMasterData.incoterms,
]);

export const freightForwardingPorts = uniqueOptions([
  ...importMasterData.ports,
  { value: "Chennai", label: "Chennai" },
  { value: "Mundra", label: "Mundra" },
  { value: "Nhava Sheva", label: "Nhava Sheva" },
  { value: "Tuticorin", label: "Tuticorin" },
  { value: "Singapore", label: "Singapore" },
  { value: "Colombo", label: "Colombo" },
  { value: "Port Klang", label: "Port Klang" },
  { value: "Jebel Ali", label: "Jebel Ali" },
  { value: "Rotterdam", label: "Rotterdam" },
]);

export const freightForwardingCountries = uniqueOptions([
  ...importMasterData.countries,
  { value: "United Arab Emirates", label: "United Arab Emirates" },
  { value: "Singapore", label: "Singapore" },
  { value: "Netherlands", label: "Netherlands" },
  { value: "Malaysia", label: "Malaysia" },
  { value: "Sri Lanka", label: "Sri Lanka" },
]);

export const freightForwardingContainerTypes = [
  { value: "20GP", label: "20' General Purpose" },
  { value: "40GP", label: "40' General Purpose" },
  { value: "40HC", label: "40' High Cube" },
  { value: "45HC", label: "45' High Cube" },
  { value: "20RF", label: "20' Reefer" },
  { value: "40RF", label: "40' Reefer" },
  { value: "LCL", label: "LCL / Consolidation" },
] as const;

export const freightForwardingFreightTerms = [
  { value: "PREPAID", label: "Prepaid" },
  { value: "COLLECT", label: "Collect" },
  { value: "THIRD_PARTY", label: "Third Party" },
] as const;

export const freightForwardingBlTypes = [
  { value: "MASTER_BL", label: "Master BL" },
  { value: "HOUSE_BL", label: "House BL" },
  { value: "SEA_WAYBILL", label: "Sea Waybill" },
] as const;

export const freightForwardingServiceTypes = [
  { value: "PORT_TO_PORT", label: "Port to Port" },
  { value: "DOOR_TO_PORT", label: "Door to Port" },
  { value: "PORT_TO_DOOR", label: "Port to Door" },
  { value: "DOOR_TO_DOOR", label: "Door to Door" },
] as const;

export const freightForwardingCargoTypes = [
  { value: "GENERAL", label: "General Cargo" },
  { value: "HAZARDOUS", label: "Hazardous Cargo" },
  { value: "REEFER", label: "Reefer Cargo" },
  { value: "OVERSIZED", label: "Oversized Cargo" },
] as const;

export const freightForwardingSurrenderStatuses = [
  { value: "ORIGINAL", label: "Original BL" },
  { value: "SURRENDERED", label: "Surrendered" },
  { value: "TELEX_RELEASE", label: "Telex Release" },
] as const;

export const freightForwardingVoyageTypes = [
  { value: "DIRECT", label: "Direct" },
  { value: "TRANSSHIPMENT", label: "Transshipment" },
  { value: "MOTHER_VESSEL", label: "Mother Vessel" },
] as const;

export const freightForwardingEquipmentTypes = [
  { value: "FCL", label: "FCL" },
  { value: "LCL", label: "LCL" },
  { value: "REEFER", label: "Reefer" },
  { value: "BREAK_BULK", label: "Break Bulk" },
  { value: "AIR", label: "Air Freight" },
] as const;

export const freightForwardingLinerNames = [
  { value: "MAERSK", label: "Maersk" },
  { value: "MSC", label: "MSC" },
  { value: "CMA_CGM", label: "CMA CGM" },
  { value: "HAPAG_LLOYD", label: "Hapag-Lloyd" },
  { value: "ONE", label: "ONE" },
  { value: "EVERGREEN", label: "Evergreen" },
  { value: "COSCO", label: "COSCO" },
] as const;
