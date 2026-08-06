export type FreightTransactionType = "MBL" | "HBL";
export type FreightBookingCreationMode =
  | "MBL_ONLY"
  | "HBL_ONLY"
  | "BOTH";

export type FreightBookingFormData = {
  bookingPartyId: string;
  salespersonId: string;
  origin: string;
  portOfLoad: string;
  portOfDischarge: string;
  finalDestination: string;
  blNumber: string;
  linerBooking: string;
  linerBlNumber: string;
  blType: string;
  serviceType: string;
  masterBlNumber: string;
  notes: string;
  freeDaysOrigin: string;
  freeDaysDestination: string;
  customsVoyageType: string;
  customsVoyage: string;
  transshipmentVoyage: string;
  transshipmentVessel: string;
  linerName: string;
  linerVessel: string;
  linerVoyage: string;
  eta: string;
  etd: string;
  importVessel: string;
  importVoyage: string;
  freightTerm: string;
  cargo: string;
  surrenderStatus: string;
  term: string;
  csPersonId: string;
  handledById: string;
  depot: string;
  terminal: string;
  jobNumber: string;
  shipper: string;
  consignee: string;
  notifyParty: string;
  bookingAgentId: string;
  destinationAgentId: string;
  cargoDescription: string;
  marksAndNumbers: string;
  comments: string;
  internalNotes: string;
  attachmentName: string;
};

export type FreightContainerRow = {
  id: string;
  containerNo: string;
  containerType: string;
  harmonizedCode: string;
  hazardous: boolean;
};

export type FreightBookingReferenceData = {
  bookingParties: Array<{ value: string; label: string }>;
  branches: Array<{ value: string; label: string }>;
  countries: Array<{ value: string; label: string }>;
  jobNumbers: Array<{ value: string; label: string }>;
  ports: Array<{ value: string; label: string }>;
  users: Array<{ value: string; label: string }>;
};

export const initialFreightBookingFormData: FreightBookingFormData = {
  bookingPartyId: "",
  salespersonId: "",
  origin: "",
  portOfLoad: "",
  portOfDischarge: "",
  finalDestination: "",
  blNumber: "",
  linerBooking: "",
  linerBlNumber: "",
  blType: "MASTER_BL",
  serviceType: "PORT_TO_PORT",
  masterBlNumber: "",
  notes: "",
  freeDaysOrigin: "0",
  freeDaysDestination: "0",
  customsVoyageType: "DIRECT",
  customsVoyage: "",
  transshipmentVoyage: "",
  transshipmentVessel: "",
  linerName: "",
  linerVessel: "",
  linerVoyage: "",
  eta: "",
  etd: "",
  importVessel: "",
  importVoyage: "",
  freightTerm: "PREPAID",
  cargo: "GENERAL",
  surrenderStatus: "ORIGINAL",
  term: "FOB",
  csPersonId: "",
  handledById: "",
  depot: "",
  terminal: "",
  jobNumber: "",
  shipper: "",
  consignee: "",
  notifyParty: "",
  bookingAgentId: "",
  destinationAgentId: "",
  cargoDescription: "",
  marksAndNumbers: "",
  comments: "",
  internalNotes: "",
  attachmentName: "",
};

function createEmptyContainerRow(): FreightContainerRow {
  return {
    id: crypto.randomUUID(),
    containerNo: "",
    containerType: "20GP",
    harmonizedCode: "",
    hazardous: false,
  };
}

export function createInitialFreightBookingPayload(
  transactionType?: FreightTransactionType | null,
): {
  formData: FreightBookingFormData;
  equipmentTypes: string[];
  containers: FreightContainerRow[];
} {
  return {
    formData: {
      ...initialFreightBookingFormData,
      blType:
        transactionType === "MBL"
          ? "MASTER_BL"
          : transactionType === "HBL"
            ? "HOUSE_BL"
            : "",
    },
    equipmentTypes: ["FCL"],
    containers: [createEmptyContainerRow()],
  };
}
