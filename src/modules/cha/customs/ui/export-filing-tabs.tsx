"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Plus, Save, Send, Signature, Trash2 } from "lucide-react";
import { Button } from "@/components/monolith/button";
import { ChaTable } from "@/components/monolith/cha-workspace";
import {
  WorkspaceAlert,
  WorkspaceBadge,
  WorkspaceCheckbox,
  WorkspaceField,
  WorkspaceInput,
  WorkspaceTextarea,
} from "@/components/monolith/workspace";
import type { ExportFilingDraftView, ExportSbMainDraftView } from "../filing/export-drafts";
import {
  generateExportChecklistSnapshotAction,
  generateExportFlatFileSnapshotAction,
  registerExportFlatFileSignatureAction,
  requestExportFlatFileSigningAction,
  saveExportInvoiceDraftAction,
  saveExportRemainingDraftAction,
  saveExportSbMainDraftAction,
  submitExportFlatFileAction,
} from "../filing/actions";
import {
  CustomsConcurrencyConflictDialog,
  CustomsDirtyStateWarning,
  CustomsFilingSection,
  CustomsFormGrid,
  CustomsLineItemTable,
  CustomsSaveIndicator,
  CustomsValidationSummary,
  type CustomsSaveState,
} from "./customs-workspace";

type JobSnapshotSource = {
  id: string;
  jobNumber: string;
  createdAt?: string | Date;
  customer?: {
    name?: string | null;
    iecCode?: string | null;
    pan?: string | null;
    addressLine1?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    gstin?: string | null;
  } | null;
};

type Props = {
  activeSubtab: string;
  draft: ExportFilingDraftView;
  job: JobSnapshotSource;
  profile: {
    currentDraftVersion: number;
    lockVersion: number;
    isLocked: boolean;
  };
  readOnly: boolean;
};

type ValidationIssue = { fieldId: string; label: string; message: string };

function toDateInput(value: string | Date | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function requiredIssues(prefix: string, values: { field: string; label: string; value: unknown }[]): ValidationIssue[] {
  return values
    .filter((entry) => !String(entry.value ?? "").trim())
    .map((entry) => ({
      fieldId: `${prefix}-${entry.field}`,
      label: entry.label,
      message: "Required for section completion.",
    }));
}

function emptyPackageRow(sequenceNo: number): ExportSbMainDraftView["packageRows"][number] {
  return { sequenceNo, packageType: "", packageCode: "", packageCount: "", loosePackageCount: "", marksAndNos: "" };
}

function emptyContainerRow(sequenceNo: number): ExportSbMainDraftView["containerRows"][number] {
  return { sequenceNo, containerNo: "", containerSize: "", sealNo: "", packageCount: "", grossWeight: "", netWeight: "" };
}

function defaultExportCharges() {
  return ["FREIGHT", "INSURANCE", "PACKING_CHARGES", "COMMISSION", "FOB_DISCOUNT", "OTHER_DEDUCTIONS"].map((chargeType, index) => ({
    sequenceNo: index + 1,
    chargeType,
    currency: "",
    exchangeRate: "",
    rate: "",
    amount: "",
    amountInr: "",
    isDeduction: chargeType === "FOB_DISCOUNT" || chargeType === "OTHER_DEDUCTIONS",
  }));
}

export function ExportFilingTabs({ activeSubtab, draft, job, profile, readOnly }: Props) {
  const router = useRouter();
  const [lockVersion, setLockVersion] = useState(profile.lockVersion);
  const [sbMain, setSbMain] = useState<ExportSbMainDraftView>({
    ...draft.sbMain,
    jobDate: draft.sbMain.jobDate || toDateInput(job.createdAt),
  });
  const [invoices, setInvoices] = useState(draft.invoices);
  const [remaining, setRemaining] = useState({
    items: draft.items,
    supportingDocuments: draft.supportingDocuments,
  });
  const [withDeclaration, setWithDeclaration] = useState(true);
  const [dummyJob, setDummyJob] = useState(true);
  const [signatureReference, setSignatureReference] = useState("");
  const [dirtyTab, setDirtyTab] = useState<"sb-main" | "invoice-details" | "remaining" | null>(null);
  const [saveState, setSaveState] = useState<CustomsSaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const hydrated = useRef(false);
  const [, startTransition] = useTransition();

  const saveDraft = useCallback(async (tab: "sb-main" | "invoice-details" | "remaining") => {
    if (readOnly) return;
    setSaveState("saving");
    const response =
      tab === "sb-main"
        ? await saveExportSbMainDraftAction(job.id, { ...sbMain, lockVersion })
        : tab === "invoice-details"
          ? await saveExportInvoiceDraftAction(job.id, { invoices, lockVersion })
          : await saveExportRemainingDraftAction(job.id, { ...remaining, lockVersion });
    if (!response.ok) {
      setSaveState("error");
      setSaveError(response.error);
      if (response.code === "CONCURRENCY_CONFLICT") setConflictOpen(true);
      return;
    }
    setLockVersion(response.data.lockVersion);
    setDirtyTab((current) => (current === tab ? null : current));
    setSaveState("saved");
    startTransition(() => router.refresh());
  }, [invoices, job.id, lockVersion, readOnly, remaining, router, sbMain, startTransition]);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    if (!dirtyTab || readOnly) return;
    const timeout = window.setTimeout(() => {
      void saveDraft(dirtyTab);
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [dirtyTab, readOnly, saveDraft, sbMain, invoices, remaining]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirtyTab) event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirtyTab]);

  const sbIssues = useMemo(
    () =>
      requiredIssues("export-sb", [
        { field: "jobDate", label: "Date", value: sbMain.jobDate },
        { field: "sbType", label: "SB Type", value: sbMain.sbType },
        { field: "transportMode", label: "Transport Mode", value: sbMain.transportMode },
        { field: "customsHouse", label: "Customs House", value: sbMain.customsHouse },
        { field: "customsHouseCode", label: "Customs House Code", value: sbMain.customsHouseCode },
        { field: "exporterNameSnapshot", label: "Exporter Name", value: sbMain.exporterNameSnapshot },
        { field: "exporterIecSnapshot", label: "IEC No", value: sbMain.exporterIecSnapshot },
        { field: "consigneeNameSnapshot", label: "Consignee Name", value: sbMain.consigneeNameSnapshot },
        { field: "consigneeCountrySnapshot", label: "Consignee Country", value: sbMain.consigneeCountrySnapshot },
        { field: "portOfDischarge", label: "Port of Discharge", value: sbMain.portOfDischarge },
        { field: "portOfDestination", label: "Port of Destination", value: sbMain.portOfDestination },
        { field: "destinationCountry", label: "Destination Country", value: sbMain.destinationCountry },
      ]),
    [sbMain],
  );
  const exportValidationMessages = draft.checklist.validation;

  function markDirty(tab: "sb-main" | "invoice-details" | "remaining") {
    setDirtyTab(tab);
    setSaveState("dirty");
    setSaveError(null);
  }

  function updateSb<K extends keyof ExportSbMainDraftView>(key: K, value: ExportSbMainDraftView[K]) {
    setSbMain((current) => ({ ...current, [key]: value }));
    markDirty("sb-main");
  }

  function markRemainingDirty() {
    markDirty("remaining");
  }

  function snapshotJobCustomer() {
    const customer = job.customer;
    if (!customer) return;
    setSbMain((current) => ({
      ...current,
      exporterNameSnapshot: current.exporterNameSnapshot || customer.name || "",
      exporterIecSnapshot: current.exporterIecSnapshot || customer.iecCode || "",
      chaExporterPanSnapshot: current.chaExporterPanSnapshot || customer.pan || "",
      exporterAddressSnapshot: current.exporterAddressSnapshot || customer.addressLine1 || "",
      exporterCitySnapshot: current.exporterCitySnapshot || customer.city || "",
      exporterStateSnapshot: current.exporterStateSnapshot || customer.state || "",
      exporterPinCodeSnapshot: current.exporterPinCodeSnapshot || customer.postalCode || "",
      exporterTaxRegistrationNo: current.exporterTaxRegistrationNo || customer.gstin || "",
    }));
    markDirty("sb-main");
  }

  if (activeSubtab === "sb-main") {
    return (
      <div className="space-y-4">
        <CustomsDirtyStateWarning active={dirtyTab === "sb-main"} />
        <CustomsValidationSummary errors={sbIssues} />
        {saveError ? <ErrorAlert error={saveError} /> : null}
        <CustomsFilingSection
          title="SB Main Details"
          description={`Draft v${profile.currentDraftVersion} - concurrency ${lockVersion}`}
          readonly={readOnly}
          actions={<ToolbarSave state={saveState} onSave={() => void saveDraft("sb-main")} disabled={readOnly} />}
        >
          <SectionTitle title="Job Details" issues={sbIssues.length} />
          <CustomsFormGrid columns={4}>
            <ReadonlyField id="export-sb-jobNo" label="Job No" value={job.jobNumber} />
            <ReadonlyField id="export-sb-jobDate" label="Date" value={sbMain.jobDate} />
            <TextField id="export-sb-sbType" label="SB Type" value={sbMain.sbType} onChange={(value) => updateSb("sbType", value)} disabled={readOnly} />
            <TextField id="export-sb-transportMode" label="Transport Mode" value={sbMain.transportMode} onChange={(value) => updateSb("transportMode", value)} disabled={readOnly} />
            <TextField id="export-sb-bookingNo" label="Booking No" value={sbMain.bookingNo} onChange={(value) => updateSb("bookingNo", value)} disabled={readOnly} />
            <DateField id="export-sb-bookingDate" label="Booking Date" value={sbMain.bookingDate} onChange={(value) => updateSb("bookingDate", value)} disabled={readOnly} />
            <TextField id="export-sb-customsHouse" label="Customs House" value={sbMain.customsHouse} onChange={(value) => updateSb("customsHouse", value)} disabled={readOnly} />
            <TextField id="export-sb-customsHouseCode" label="Customs House Code" value={sbMain.customsHouseCode} onChange={(value) => updateSb("customsHouseCode", value)} disabled={readOnly} />
          </CustomsFormGrid>

          <SectionTitle title="SB Details" issues={0} />
          <WorkspaceAlert variant="info">
            <Check size={16} aria-hidden="true" />
            <span>SB and LEO status fields remain source-marked draft values. External ICEGATE events will be shown separately when they arrive.</span>
          </WorkspaceAlert>
          <CustomsFormGrid columns={4}>
            <TextField id="export-sb-sbNumber" label="SB No" value={sbMain.sbNumber} onChange={(value) => updateSb("sbNumber", value)} disabled={readOnly} />
            <DateField id="export-sb-sbDate" label="SB Date" value={sbMain.sbDate} onChange={(value) => updateSb("sbDate", value)} disabled={readOnly} />
            <DateField id="export-sb-examinationDate" label="Examination date/status" value={sbMain.examinationDate} onChange={(value) => updateSb("examinationDate", value)} disabled={readOnly} />
            <DateField id="export-sb-leoDate" label="LEO date/status" value={sbMain.leoDate} onChange={(value) => updateSb("leoDate", value)} disabled={readOnly} />
            <TextField id="export-sb-icegateIdSnapshot" label="ICEGATE ID/Profile" value={sbMain.icegateIdSnapshot} onChange={(value) => updateSb("icegateIdSnapshot", value)} disabled={readOnly} />
            <TextField id="export-sb-chaExporterPanSnapshot" label="CHA/Exporter PAN" value={sbMain.chaExporterPanSnapshot} onChange={(value) => updateSb("chaExporterPanSnapshot", value)} disabled={readOnly} />
          </CustomsFormGrid>

          <SectionTitle
            title="Exporter Details"
            issues={sbIssues.filter((issue) => issue.fieldId.includes("exporter")).length}
            action={<Button type="button" size="sm" variant="outline" onClick={snapshotJobCustomer} disabled={readOnly || !job.customer}>Snapshot job customer</Button>}
          />
          <CustomsFormGrid columns={4}>
            <CheckboxField id="export-sb-standardIec" label="Standard IEC" checked={sbMain.standardIec} onChange={(checked) => updateSb("standardIec", checked)} disabled={readOnly} />
            <TextField id="export-sb-exporterNameSnapshot" label="Exporter Name" value={sbMain.exporterNameSnapshot} onChange={(value) => updateSb("exporterNameSnapshot", value)} disabled={readOnly} />
            <TextField id="export-sb-exporterIecSnapshot" label="IEC No" value={sbMain.exporterIecSnapshot} onChange={(value) => updateSb("exporterIecSnapshot", value)} disabled={readOnly} />
            <TextField id="export-sb-exporterBranchSerialNo" label="Branch Serial No" value={sbMain.exporterBranchSerialNo} onChange={(value) => updateSb("exporterBranchSerialNo", value)} disabled={readOnly} />
            <TextField id="export-sb-exporterType" label="Exporter Type" value={sbMain.exporterType} onChange={(value) => updateSb("exporterType", value)} disabled={readOnly} />
            <TextField id="export-sb-exporterClass" label="Class" value={sbMain.exporterClass} onChange={(value) => updateSb("exporterClass", value)} disabled={readOnly} />
            <TextField id="export-sb-exporterAdCodeSnapshot" label="AD Code" value={sbMain.exporterAdCodeSnapshot} onChange={(value) => updateSb("exporterAdCodeSnapshot", value)} disabled={readOnly} />
            <TextField id="export-sb-exporterCitySnapshot" label="City" value={sbMain.exporterCitySnapshot} onChange={(value) => updateSb("exporterCitySnapshot", value)} disabled={readOnly} />
            <TextField id="export-sb-exporterStateSnapshot" label="State" value={sbMain.exporterStateSnapshot} onChange={(value) => updateSb("exporterStateSnapshot", value)} disabled={readOnly} />
            <TextField id="export-sb-exporterPinCodeSnapshot" label="PIN Code" value={sbMain.exporterPinCodeSnapshot} onChange={(value) => updateSb("exporterPinCodeSnapshot", value)} disabled={readOnly} />
            <TextField id="export-sb-nfei" label="NFEI" value={sbMain.nfei} onChange={(value) => updateSb("nfei", value)} disabled={readOnly} />
            <TextField id="export-sb-benefitTo" label="Benefit To" value={sbMain.benefitTo} onChange={(value) => updateSb("benefitTo", value)} disabled={readOnly} />
            <TextField id="export-sb-exporterOriginState" label="State of Origin" value={sbMain.exporterOriginState} onChange={(value) => updateSb("exporterOriginState", value)} disabled={readOnly} />
            <TextField id="export-sb-exporterGstnType" label="GSTN Type" value={sbMain.exporterGstnType} onChange={(value) => updateSb("exporterGstnType", value)} disabled={readOnly} />
            <TextField id="export-sb-exporterTaxRegistrationNo" label="Tax Registration No" value={sbMain.exporterTaxRegistrationNo} onChange={(value) => updateSb("exporterTaxRegistrationNo", value)} disabled={readOnly} />
            <TextField id="export-sb-moowr" label="MOOWR" value={sbMain.moowr} onChange={(value) => updateSb("moowr", value)} disabled={readOnly} />
            <TextareaField id="export-sb-exporterAddressSnapshot" label="Address" value={sbMain.exporterAddressSnapshot} onChange={(value) => updateSb("exporterAddressSnapshot", value)} disabled={readOnly} />
          </CustomsFormGrid>

          <SectionTitle title="Consignee Details" issues={sbIssues.filter((issue) => issue.fieldId.includes("consignee")).length} />
          <CustomsFormGrid columns={3}>
            <TextField id="export-sb-consigneeNameSnapshot" label="Consignee Name" value={sbMain.consigneeNameSnapshot} onChange={(value) => updateSb("consigneeNameSnapshot", value)} disabled={readOnly} />
            <TextField id="export-sb-consigneeCountrySnapshot" label="Consignee Country" value={sbMain.consigneeCountrySnapshot} onChange={(value) => updateSb("consigneeCountrySnapshot", value)} disabled={readOnly} />
            <TextareaField id="export-sb-consigneeAddressSnapshot" label="Address" value={sbMain.consigneeAddressSnapshot} onChange={(value) => updateSb("consigneeAddressSnapshot", value)} disabled={readOnly} />
          </CustomsFormGrid>

          <SectionTitle title="Shipment Details" issues={sbIssues.filter((issue) => issue.fieldId.includes("port") || issue.fieldId.includes("destination")).length} />
          <CustomsFormGrid columns={4}>
            <TextField id="export-sb-portOfDischarge" label="Port of Discharge" value={sbMain.portOfDischarge} onChange={(value) => updateSb("portOfDischarge", value)} disabled={readOnly} />
            <TextField id="export-sb-portOfDischargeCode" label="Port of Discharge Code" value={sbMain.portOfDischargeCode} onChange={(value) => updateSb("portOfDischargeCode", value)} disabled={readOnly} />
            <TextField id="export-sb-dischargeCountry" label="Discharge Country" value={sbMain.dischargeCountry} onChange={(value) => updateSb("dischargeCountry", value)} disabled={readOnly} />
            <TextField id="export-sb-dischargeCountryCode" label="Discharge Country Code" value={sbMain.dischargeCountryCode} onChange={(value) => updateSb("dischargeCountryCode", value)} disabled={readOnly} />
            <TextField id="export-sb-portOfDestination" label="Port of Destination" value={sbMain.portOfDestination} onChange={(value) => updateSb("portOfDestination", value)} disabled={readOnly} />
            <TextField id="export-sb-portOfDestinationCode" label="Port of Destination Code" value={sbMain.portOfDestinationCode} onChange={(value) => updateSb("portOfDestinationCode", value)} disabled={readOnly} />
            <TextField id="export-sb-destinationCountry" label="Destination Country" value={sbMain.destinationCountry} onChange={(value) => updateSb("destinationCountry", value)} disabled={readOnly} />
            <TextField id="export-sb-destinationCountryCode" label="Destination Country Code" value={sbMain.destinationCountryCode} onChange={(value) => updateSb("destinationCountryCode", value)} disabled={readOnly} />
          </CustomsFormGrid>

          <SectionTitle title="Annexure C / Cargo" issues={0} />
          <CustomsFormGrid columns={4}>
            <TextField id="export-sb-natureOfCargo" label="Nature of Cargo" value={sbMain.natureOfCargo} onChange={(value) => updateSb("natureOfCargo", value)} disabled={readOnly} />
            <TextField id="export-sb-sealType" label="Seal Type" value={sbMain.sealType} onChange={(value) => updateSb("sealType", value)} disabled={readOnly} />
            <TextField id="export-sb-numberOfContainers" label="Number of Containers" value={sbMain.numberOfContainers} onChange={(value) => updateSb("numberOfContainers", value)} disabled={readOnly} inputMode="decimal" />
            <TextField id="export-sb-grossWeight" label="Gross Weight" value={sbMain.grossWeight} onChange={(value) => updateSb("grossWeight", value)} disabled={readOnly} inputMode="decimal" />
            <TextField id="export-sb-netWeight" label="Net Weight" value={sbMain.netWeight} onChange={(value) => updateSb("netWeight", value)} disabled={readOnly} inputMode="decimal" />
            <TextField id="export-sb-uom" label="UOM" value={sbMain.uom} onChange={(value) => updateSb("uom", value)} disabled={readOnly} />
            <TextField id="export-sb-numberOfPackages" label="Number of Packages" value={sbMain.numberOfPackages} onChange={(value) => updateSb("numberOfPackages", value)} disabled={readOnly} inputMode="decimal" />
            <TextField id="export-sb-packageCode" label="Package Code" value={sbMain.packageCode} onChange={(value) => updateSb("packageCode", value)} disabled={readOnly} />
            <TextField id="export-sb-loosePackage" label="Loose Package" value={sbMain.loosePackage} onChange={(value) => updateSb("loosePackage", value)} disabled={readOnly} inputMode="decimal" />
            <TextField id="export-sb-mawbNo" label="MAWB No" value={sbMain.mawbNo} onChange={(value) => updateSb("mawbNo", value)} disabled={readOnly} />
            <DateField id="export-sb-mawbDate" label="MAWB Date" value={sbMain.mawbDate} onChange={(value) => updateSb("mawbDate", value)} disabled={readOnly} />
            <TextField id="export-sb-hawbNo" label="HAWB No" value={sbMain.hawbNo} onChange={(value) => updateSb("hawbNo", value)} disabled={readOnly} />
            <DateField id="export-sb-hawbDate" label="HAWB Date" value={sbMain.hawbDate} onChange={(value) => updateSb("hawbDate", value)} disabled={readOnly} />
            <TextareaField id="export-sb-marksAndNos" label="Marks and Numbers" value={sbMain.marksAndNos} onChange={(value) => updateSb("marksAndNos", value)} disabled={readOnly} />
            <TextareaField id="export-sb-rotationStuffingText" label="Rotation and Stuffing" value={sbMain.rotationStuffingText} onChange={(value) => updateSb("rotationStuffingText", value)} disabled={readOnly} />
            <TextareaField id="export-sb-eouDetailsText" label="EOU Details" value={sbMain.eouDetailsText} onChange={(value) => updateSb("eouDetailsText", value)} disabled={readOnly} />
          </CustomsFormGrid>

          <PackageRows rows={sbMain.packageRows} readOnly={readOnly} onChange={(rows) => updateSb("packageRows", rows)} />
          <ContainerRows rows={sbMain.containerRows} readOnly={readOnly} onChange={(rows) => updateSb("containerRows", rows)} />
        </CustomsFilingSection>
        <CustomsConcurrencyConflictDialog open={conflictOpen} onClose={() => setConflictOpen(false)} onReload={() => router.refresh()} />
      </div>
    );
  }

  if (activeSubtab === "invoice-details") {
    return (
      <RemainingSection
        title="Invoice Details"
        dirty={dirtyTab === "invoice-details"}
        onSave={() => void saveDraft("invoice-details")}
        readOnly={readOnly}
        saveState={saveState}
      >
        {saveError ? <ErrorAlert error={saveError} /> : null}
        {exportValidationMessages.length ? (
          <WorkspaceAlert variant="warning">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{exportValidationMessages.length} export filing validation item(s) remain.</span>
          </WorkspaceAlert>
        ) : null}
        <SimpleRowsTable
          title="Export invoices"
          actionLabel="New invoice"
          columns={["Serial", "Invoice", "Payment", "Currency", "Values", "Buyer", "Contract rows", "Actions"]}
          rows={invoices}
          readOnly={readOnly}
          onAdd={() => {
            setInvoices((current) => [
              ...current,
              {
                sequenceNo: current.length + 1,
                invoiceNo: "",
                invoiceDate: "",
                contractNo: "",
                natureOfPayment: "",
                periodOfPayment: "",
                currency: "",
                exchangeRate: "",
                productValue: "",
                productValueInr: "",
                incoTerms: "",
                addFreight: "",
                sameAsConsignee: false,
                buyerNameSnapshot: "",
                buyerAddressSnapshot: "",
                buyerCountrySnapshot: "",
                thirdPartyText: "",
                aeoText: "",
                invoiceValueFc: "",
                invoiceValueInr: "",
                fobValueFc: "",
                fobValueInr: "",
                calculationOverrideReason: "",
                charges: defaultExportCharges(),
              },
            ]);
            markDirty("invoice-details");
          }}
          render={(row, index) => [
            row.sequenceNo,
            <Stacked key="invoice"><WorkspaceInput value={row.invoiceNo} placeholder="Invoice No" disabled={readOnly} onChange={(event) => updateInvoice(index, { invoiceNo: event.target.value })} /><WorkspaceInput type="date" value={row.invoiceDate} disabled={readOnly} onChange={(event) => updateInvoice(index, { invoiceDate: event.target.value })} /><WorkspaceInput value={row.contractNo} placeholder="Contract No" disabled={readOnly} onChange={(event) => updateInvoice(index, { contractNo: event.target.value })} /></Stacked>,
            <Stacked key="payment"><WorkspaceInput value={row.natureOfPayment} placeholder="Nature of Payment" disabled={readOnly} onChange={(event) => updateInvoice(index, { natureOfPayment: event.target.value })} /><WorkspaceInput value={row.periodOfPayment} placeholder="Period of Payment" disabled={readOnly} onChange={(event) => updateInvoice(index, { periodOfPayment: event.target.value })} /><WorkspaceInput value={row.incoTerms} placeholder="Incoterm" disabled={readOnly} onChange={(event) => updateInvoice(index, { incoTerms: event.target.value })} /><WorkspaceInput value={row.addFreight} placeholder="Add Freight" disabled={readOnly} onChange={(event) => updateInvoice(index, { addFreight: event.target.value })} /></Stacked>,
            <Stacked key="currency"><WorkspaceInput value={row.currency} placeholder="Currency" disabled={readOnly} onChange={(event) => updateInvoice(index, { currency: event.target.value })} /><WorkspaceInput value={row.exchangeRate} placeholder="Exchange Rate" inputMode="decimal" disabled={readOnly} onChange={(event) => updateInvoice(index, { exchangeRate: event.target.value })} /></Stacked>,
            <Stacked key="values"><WorkspaceInput value={row.productValue} placeholder="Product FC" inputMode="decimal" disabled={readOnly} onChange={(event) => updateInvoice(index, { productValue: event.target.value })} /><WorkspaceInput value={row.productValueInr} placeholder="Product INR" inputMode="decimal" disabled={readOnly} onChange={(event) => updateInvoice(index, { productValueInr: event.target.value })} /><WorkspaceInput value={row.invoiceValueFc} placeholder="Invoice FC" inputMode="decimal" disabled={readOnly} onChange={(event) => updateInvoice(index, { invoiceValueFc: event.target.value })} /><WorkspaceInput value={row.invoiceValueInr} placeholder="Invoice INR" inputMode="decimal" disabled={readOnly} onChange={(event) => updateInvoice(index, { invoiceValueInr: event.target.value })} /><WorkspaceInput value={row.fobValueFc} placeholder="FOB FC" inputMode="decimal" disabled={readOnly} onChange={(event) => updateInvoice(index, { fobValueFc: event.target.value })} /><WorkspaceInput value={row.fobValueInr} placeholder="FOB INR" inputMode="decimal" disabled={readOnly} onChange={(event) => updateInvoice(index, { fobValueInr: event.target.value })} /></Stacked>,
            <Stacked key="buyer"><WorkspaceCheckbox checked={row.sameAsConsignee} label="Same as consignee" disabled={readOnly} onChange={(event) => updateInvoice(index, { sameAsConsignee: event.target.checked, buyerNameSnapshot: event.target.checked ? sbMain.consigneeNameSnapshot : row.buyerNameSnapshot, buyerAddressSnapshot: event.target.checked ? sbMain.consigneeAddressSnapshot : row.buyerAddressSnapshot, buyerCountrySnapshot: event.target.checked ? sbMain.consigneeCountrySnapshot : row.buyerCountrySnapshot })} /><WorkspaceInput value={row.buyerNameSnapshot} placeholder="Buyer Name" disabled={readOnly || row.sameAsConsignee} onChange={(event) => updateInvoice(index, { buyerNameSnapshot: event.target.value })} /><WorkspaceInput value={row.buyerCountrySnapshot} placeholder="Buyer Country" disabled={readOnly || row.sameAsConsignee} onChange={(event) => updateInvoice(index, { buyerCountrySnapshot: event.target.value })} /><WorkspaceTextarea value={row.buyerAddressSnapshot} placeholder="Buyer Address" disabled={readOnly || row.sameAsConsignee} onChange={(event) => updateInvoice(index, { buyerAddressSnapshot: event.target.value })} /><WorkspaceTextarea value={row.thirdPartyText} placeholder="Third Party" disabled={readOnly} onChange={(event) => updateInvoice(index, { thirdPartyText: event.target.value })} /><WorkspaceTextarea value={row.aeoText} placeholder="AEO" disabled={readOnly} onChange={(event) => updateInvoice(index, { aeoText: event.target.value })} /></Stacked>,
            <Stacked key="charges">{row.charges.map((charge, chargeIndex) => <div key={charge.sequenceNo} className="grid gap-1"><WorkspaceInput value={charge.chargeType} disabled={readOnly} onChange={(event) => updateCharge(index, chargeIndex, { chargeType: event.target.value })} /><WorkspaceInput value={charge.currency} placeholder="Currency" disabled={readOnly} onChange={(event) => updateCharge(index, chargeIndex, { currency: event.target.value })} /><WorkspaceInput value={charge.exchangeRate} placeholder="Ex rate" inputMode="decimal" disabled={readOnly} onChange={(event) => updateCharge(index, chargeIndex, { exchangeRate: event.target.value })} /><WorkspaceInput value={charge.rate} placeholder="Rate" inputMode="decimal" disabled={readOnly} onChange={(event) => updateCharge(index, chargeIndex, { rate: event.target.value })} /><WorkspaceInput value={charge.amount} placeholder="Amount FC" inputMode="decimal" disabled={readOnly} onChange={(event) => updateCharge(index, chargeIndex, { amount: event.target.value })} /><WorkspaceInput value={charge.amountInr} placeholder="Amount INR" inputMode="decimal" disabled={readOnly} onChange={(event) => updateCharge(index, chargeIndex, { amountInr: event.target.value })} /><WorkspaceCheckbox checked={charge.isDeduction} label="Deduction" disabled={readOnly} onChange={(event) => updateCharge(index, chargeIndex, { isDeduction: event.target.checked })} /></div>)}</Stacked>,
            <Button key="remove" type="button" size="sm" variant="outline" disabled={readOnly} onClick={() => removeInvoice(index)}><Trash2 size={14} aria-hidden="true" /></Button>,
          ]}
        />
      </RemainingSection>
    );
  }

  if (activeSubtab === "item-details") {
    return (
      <RemainingSection
        title="Item Details"
        dirty={dirtyTab === "remaining"}
        onSave={() => void saveDraft("remaining")}
        readOnly={readOnly}
        saveState={saveState}
      >
        {saveError ? <ErrorAlert error={saveError} /> : null}
        <SimpleRowsTable
          title="Export items"
          actionLabel="New item"
          columns={["Serial", "Core item", "GST", "Drawback / RoSCTL / RoDTEP", "Additional info", "Actions"]}
          rows={remaining.items}
          readOnly={readOnly}
          onAdd={() => {
            setRemaining((current) => ({
              ...current,
              items: [
                ...current.items,
                {
                  sequenceNo: current.items.length + 1,
                  invoiceSequenceNo: null,
                  invoiceNoSnapshot: "",
                  totalProductCount: current.items.length + 1,
                  productSequenceNo: current.items.length + 1,
                  ritcNo: "",
                  itemDescription: "",
                  schemeCode: "",
                  quantity: "",
                  unit: "",
                  measurementUqc: "",
                  unitPrice: "",
                  priceUnit: "",
                  per: "",
                  itemAmount: "",
                  itemAmountInr: "",
                  totalPmv: "",
                  endUse: "",
                  state: "",
                  district: "",
                  fta: "",
                  cess: "",
                  additionalDetails: "",
                  rodtepCode: "",
                  singleWindowType: "",
                  singleWindowQfr: "",
                  singleWindowCode: "",
                  singleWindowText: "",
                  singleWindowMeasurement: "",
                  singleWindowUqc: "",
                  gstPaymentStatus: "",
                  gstIgstOn: "",
                  taxableValue: "",
                  igstRate: "",
                  igstAmount: "",
                  drawbackScheduleNo: "",
                  drawbackQuantity: "",
                  drawbackRatePercent: "",
                  drawbackCapInInr: "",
                  drawbackUqc: "",
                  drawbackAmount: "",
                  rosctlRate: "",
                  rosctlSpecificRate: "",
                  rosctlAmount: "",
                  rodtepRate: "",
                  rodtepCap: "",
                  rodtepQuantity: "",
                  rodtepUqc: "",
                  rodtepAmount: "",
                  reward: "",
                  thirdParty: "",
                  manufacturer: "",
                  quota: "",
                  ar4: "",
                  jobWork: "",
                  reExport: "",
                  license: "",
                  eouDetails: "",
                  declaration: "",
                  cessOption: "",
                },
              ],
            }));
            markRemainingDirty();
          }}
          render={(row, index) => [
            row.sequenceNo,
            <Stacked key="core">
              <WorkspaceInput value={row.invoiceSequenceNo ?? ""} placeholder="Invoice Sl No" inputMode="numeric" disabled={readOnly} onChange={(event) => updateItem(index, { invoiceSequenceNo: Number(event.target.value) || null })} />
              <WorkspaceInput value={row.invoiceNoSnapshot} placeholder="Invoice No" disabled={readOnly} onChange={(event) => updateItem(index, { invoiceNoSnapshot: event.target.value })} />
              <WorkspaceInput value={row.productSequenceNo ?? ""} placeholder="Product Sl No" inputMode="numeric" disabled={readOnly} onChange={(event) => updateItem(index, { productSequenceNo: Number(event.target.value) || null })} />
              <WorkspaceInput value={row.ritcNo} placeholder="RITC No" disabled={readOnly} onChange={(event) => updateItem(index, { ritcNo: event.target.value })} />
              <WorkspaceInput value={row.schemeCode} placeholder="Scheme Code" disabled={readOnly} onChange={(event) => updateItem(index, { schemeCode: event.target.value })} />
              <WorkspaceTextarea value={row.itemDescription} placeholder="Item Description" disabled={readOnly} onChange={(event) => updateItem(index, { itemDescription: event.target.value })} />
              <WorkspaceInput value={row.quantity} placeholder="Quantity" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { quantity: event.target.value })} />
              <WorkspaceInput value={row.unit} placeholder="Unit/UQC" disabled={readOnly} onChange={(event) => updateItem(index, { unit: event.target.value })} />
              <WorkspaceInput value={row.unitPrice} placeholder="Unit Price" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { unitPrice: event.target.value })} />
              <WorkspaceInput value={row.priceUnit} placeholder="Price Unit" disabled={readOnly} onChange={(event) => updateItem(index, { priceUnit: event.target.value })} />
              <WorkspaceInput value={row.per} placeholder="Per" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { per: event.target.value })} />
              <WorkspaceInput value={row.itemAmount} placeholder="Amount FC" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { itemAmount: event.target.value })} />
              <WorkspaceInput value={row.itemAmountInr} placeholder="Amount INR" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { itemAmountInr: event.target.value })} />
              <WorkspaceInput value={row.totalPmv} placeholder="Total PMV" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { totalPmv: event.target.value })} />
              <WorkspaceInput value={row.endUse} placeholder="End Use" disabled={readOnly} onChange={(event) => updateItem(index, { endUse: event.target.value })} />
            </Stacked>,
            <Stacked key="gst">
              <WorkspaceInput value={row.gstPaymentStatus} placeholder="Payment Status" disabled={readOnly} onChange={(event) => updateItem(index, { gstPaymentStatus: event.target.value })} />
              <WorkspaceInput value={row.gstIgstOn} placeholder="IGST On" disabled={readOnly} onChange={(event) => updateItem(index, { gstIgstOn: event.target.value })} />
              <WorkspaceInput value={row.taxableValue} placeholder="Taxable Value" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { taxableValue: event.target.value })} />
              <WorkspaceInput value={row.igstRate} placeholder="Rate %" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { igstRate: event.target.value })} />
              <WorkspaceInput value={row.igstAmount} placeholder="IGST Amount" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { igstAmount: event.target.value })} />
            </Stacked>,
            <Stacked key="rates">
              <WorkspaceInput value={row.drawbackScheduleNo} placeholder="Drawback Schedule No" disabled={readOnly} onChange={(event) => updateItem(index, { drawbackScheduleNo: event.target.value })} />
              <WorkspaceInput value={row.drawbackQuantity} placeholder="Drawback Qty" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { drawbackQuantity: event.target.value })} />
              <WorkspaceInput value={row.drawbackRatePercent} placeholder="Drawback Rate %" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { drawbackRatePercent: event.target.value })} />
              <WorkspaceInput value={row.drawbackCapInInr} placeholder="Cap in INR" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { drawbackCapInInr: event.target.value })} />
              <WorkspaceInput value={row.drawbackUqc} placeholder="Drawback UQC" disabled={readOnly} onChange={(event) => updateItem(index, { drawbackUqc: event.target.value })} />
              <WorkspaceInput value={row.drawbackAmount} placeholder="Drawback Amount" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { drawbackAmount: event.target.value })} />
              <WorkspaceInput value={row.rosctlRate} placeholder="RoSCTL Rate" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { rosctlRate: event.target.value })} />
              <WorkspaceInput value={row.rosctlSpecificRate} placeholder="RoSCTL Specific Rate" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { rosctlSpecificRate: event.target.value })} />
              <WorkspaceInput value={row.rosctlAmount} placeholder="RoSCTL Amount" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { rosctlAmount: event.target.value })} />
              <WorkspaceInput value={row.rodtepCode} placeholder="RoDTEP Code" disabled={readOnly} onChange={(event) => updateItem(index, { rodtepCode: event.target.value })} />
              <WorkspaceInput value={row.rodtepRate} placeholder="RoDTEP Rate" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { rodtepRate: event.target.value })} />
              <WorkspaceInput value={row.rodtepCap} placeholder="RoDTEP Cap" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { rodtepCap: event.target.value })} />
              <WorkspaceInput value={row.rodtepQuantity} placeholder="RoDTEP Qty" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { rodtepQuantity: event.target.value })} />
              <WorkspaceInput value={row.rodtepUqc} placeholder="RoDTEP UQC" disabled={readOnly} onChange={(event) => updateItem(index, { rodtepUqc: event.target.value })} />
              <WorkspaceInput value={row.rodtepAmount} placeholder="RoDTEP Amount" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { rodtepAmount: event.target.value })} />
            </Stacked>,
            <Stacked key="extra">
              <WorkspaceInput value={row.measurementUqc} placeholder="Measurement / UQC" disabled={readOnly} onChange={(event) => updateItem(index, { measurementUqc: event.target.value })} />
              <WorkspaceInput value={row.state} placeholder="State" disabled={readOnly} onChange={(event) => updateItem(index, { state: event.target.value })} />
              <WorkspaceInput value={row.district} placeholder="District" disabled={readOnly} onChange={(event) => updateItem(index, { district: event.target.value })} />
              <WorkspaceInput value={row.fta} placeholder="FTA" disabled={readOnly} onChange={(event) => updateItem(index, { fta: event.target.value })} />
              <WorkspaceInput value={row.cess} placeholder="Cess" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { cess: event.target.value })} />
              <WorkspaceInput value={row.singleWindowType} placeholder="Single Window Type" disabled={readOnly} onChange={(event) => updateItem(index, { singleWindowType: event.target.value })} />
              <WorkspaceInput value={row.singleWindowQfr} placeholder="QFR" disabled={readOnly} onChange={(event) => updateItem(index, { singleWindowQfr: event.target.value })} />
              <WorkspaceInput value={row.singleWindowCode} placeholder="Code" disabled={readOnly} onChange={(event) => updateItem(index, { singleWindowCode: event.target.value })} />
              <WorkspaceInput value={row.singleWindowMeasurement} placeholder="Measurement" disabled={readOnly} onChange={(event) => updateItem(index, { singleWindowMeasurement: event.target.value })} />
              <WorkspaceInput value={row.singleWindowUqc} placeholder="SW UQC" disabled={readOnly} onChange={(event) => updateItem(index, { singleWindowUqc: event.target.value })} />
              <WorkspaceTextarea value={row.singleWindowText} placeholder="Single Window Text" disabled={readOnly} onChange={(event) => updateItem(index, { singleWindowText: event.target.value })} />
              <WorkspaceTextarea value={row.additionalDetails} placeholder="Additional details" disabled={readOnly} onChange={(event) => updateItem(index, { additionalDetails: event.target.value })} />
              <WorkspaceInput value={row.reward} placeholder="Reward" disabled={readOnly} onChange={(event) => updateItem(index, { reward: event.target.value })} />
              <WorkspaceInput value={row.thirdParty} placeholder="Third Party" disabled={readOnly} onChange={(event) => updateItem(index, { thirdParty: event.target.value })} />
              <WorkspaceInput value={row.manufacturer} placeholder="Manufacturer" disabled={readOnly} onChange={(event) => updateItem(index, { manufacturer: event.target.value })} />
              <WorkspaceInput value={row.quota} placeholder="Quota" disabled={readOnly} onChange={(event) => updateItem(index, { quota: event.target.value })} />
              <WorkspaceInput value={row.ar4} placeholder="AR4" disabled={readOnly} onChange={(event) => updateItem(index, { ar4: event.target.value })} />
              <WorkspaceInput value={row.jobWork} placeholder="Job work" disabled={readOnly} onChange={(event) => updateItem(index, { jobWork: event.target.value })} />
              <WorkspaceInput value={row.reExport} placeholder="Re-export" disabled={readOnly} onChange={(event) => updateItem(index, { reExport: event.target.value })} />
              <WorkspaceInput value={row.license} placeholder="License" disabled={readOnly} onChange={(event) => updateItem(index, { license: event.target.value })} />
              <WorkspaceTextarea value={row.eouDetails} placeholder="EOU details" disabled={readOnly} onChange={(event) => updateItem(index, { eouDetails: event.target.value })} />
              <WorkspaceInput value={row.declaration} placeholder="Declaration" disabled={readOnly} onChange={(event) => updateItem(index, { declaration: event.target.value })} />
              <WorkspaceInput value={row.cessOption} placeholder="Cess option" disabled={readOnly} onChange={(event) => updateItem(index, { cessOption: event.target.value })} />
            </Stacked>,
            <Button key="remove" type="button" size="sm" variant="outline" disabled={readOnly} onClick={() => removeItem(index)}><Trash2 size={14} aria-hidden="true" /></Button>,
          ]}
        />
      </RemainingSection>
    );
  }

  if (activeSubtab === "supporting-documents") {
    return (
      <RemainingSection
        title="Supporting Documents"
        dirty={dirtyTab === "remaining"}
        onSave={() => void saveDraft("remaining")}
        readOnly={readOnly}
        saveState={saveState}
      >
        {saveError ? <ErrorAlert error={saveError} /> : null}
        <WorkspaceAlert variant="info">
          <Check size={16} aria-hidden="true" />
          <span>These rows link customs metadata to the existing CHA job document store through `documentVersionId`; no file blob is duplicated here.</span>
        </WorkspaceAlert>
        <SimpleRowsTable
          title="Supporting document metadata"
          actionLabel="New document row"
          columns={["Serial", "Document", "Dates / refs", "Parties", "Linked job doc", "Actions"]}
          rows={remaining.supportingDocuments}
          readOnly={readOnly}
          onAdd={() => {
            setRemaining((current) => ({
              ...current,
              supportingDocuments: [
                ...current.supportingDocuments,
                {
                  sequenceNo: current.supportingDocuments.length + 1,
                  documentCode: "",
                  documentNameSnapshot: "",
                  irnNo: "",
                  drnNo: "",
                  issueDate: "",
                  declarationType: "",
                  fileType: "",
                  placeOfIssue: "",
                  invoiceSequenceNo: null,
                  itemSequenceNo: null,
                  expiryDate: "",
                  invoiceNoSnapshot: "",
                  icegateIdSnapshot: "",
                  issuingPartyCode: "",
                  issuingPartyNameSnapshot: "",
                  issuingPartyAddressSnapshot: "",
                  issuingPartyCitySnapshot: "",
                  issuingPartyPinSnapshot: "",
                  beneficiaryCode: "",
                  beneficiaryNameSnapshot: "",
                  beneficiaryAddressSnapshot: "",
                  beneficiaryCitySnapshot: "",
                  beneficiaryPinSnapshot: "",
                  documentVersionId: "",
                },
              ],
            }));
            markRemainingDirty();
          }}
          render={(row, index) => [
            row.sequenceNo,
            <Stacked key="document">
              <WorkspaceInput value={row.documentCode} placeholder="Document type code" disabled={readOnly} onChange={(event) => updateDocument(index, { documentCode: event.target.value })} />
              <WorkspaceInput value={row.documentNameSnapshot} placeholder="Document name" disabled={readOnly} onChange={(event) => updateDocument(index, { documentNameSnapshot: event.target.value })} />
              <WorkspaceInput value={row.declarationType} placeholder="Declaration type" disabled={readOnly} onChange={(event) => updateDocument(index, { declarationType: event.target.value })} />
              <WorkspaceInput value={row.fileType} placeholder="File type" disabled={readOnly} onChange={(event) => updateDocument(index, { fileType: event.target.value })} />
              <WorkspaceInput value={row.placeOfIssue} placeholder="Place of issue" disabled={readOnly} onChange={(event) => updateDocument(index, { placeOfIssue: event.target.value })} />
            </Stacked>,
            <Stacked key="dates">
              <WorkspaceInput value={row.irnNo} placeholder="IRN" disabled={readOnly} onChange={(event) => updateDocument(index, { irnNo: event.target.value })} />
              <WorkspaceInput value={row.drnNo} placeholder="DRN" disabled={readOnly} onChange={(event) => updateDocument(index, { drnNo: event.target.value })} />
              <WorkspaceInput type="date" value={row.issueDate} disabled={readOnly} onChange={(event) => updateDocument(index, { issueDate: event.target.value })} />
              <WorkspaceInput type="date" value={row.expiryDate} disabled={readOnly} onChange={(event) => updateDocument(index, { expiryDate: event.target.value })} />
              <WorkspaceInput value={row.invoiceSequenceNo ?? ""} placeholder="Invoice Sl No" inputMode="numeric" disabled={readOnly} onChange={(event) => updateDocument(index, { invoiceSequenceNo: Number(event.target.value) || null })} />
              <WorkspaceInput value={row.itemSequenceNo ?? ""} placeholder="Item Sl No" inputMode="numeric" disabled={readOnly} onChange={(event) => updateDocument(index, { itemSequenceNo: Number(event.target.value) || null })} />
              <WorkspaceInput value={row.invoiceNoSnapshot} placeholder="Invoice No" disabled={readOnly} onChange={(event) => updateDocument(index, { invoiceNoSnapshot: event.target.value })} />
              <WorkspaceInput value={row.icegateIdSnapshot} placeholder="ICEGATE profile" disabled={readOnly} onChange={(event) => updateDocument(index, { icegateIdSnapshot: event.target.value })} />
            </Stacked>,
            <Stacked key="parties">
              <WorkspaceInput value={row.issuingPartyCode} placeholder="Issuing party code" disabled={readOnly} onChange={(event) => updateDocument(index, { issuingPartyCode: event.target.value })} />
              <WorkspaceInput value={row.issuingPartyNameSnapshot} placeholder="Issuing party name" disabled={readOnly} onChange={(event) => updateDocument(index, { issuingPartyNameSnapshot: event.target.value })} />
              <WorkspaceTextarea value={row.issuingPartyAddressSnapshot} placeholder="Issuing party address" disabled={readOnly} onChange={(event) => updateDocument(index, { issuingPartyAddressSnapshot: event.target.value })} />
              <WorkspaceInput value={row.issuingPartyCitySnapshot} placeholder="Issuing party city" disabled={readOnly} onChange={(event) => updateDocument(index, { issuingPartyCitySnapshot: event.target.value })} />
              <WorkspaceInput value={row.issuingPartyPinSnapshot} placeholder="Issuing party PIN" disabled={readOnly} onChange={(event) => updateDocument(index, { issuingPartyPinSnapshot: event.target.value })} />
              <WorkspaceInput value={row.beneficiaryCode} placeholder="Beneficiary code" disabled={readOnly} onChange={(event) => updateDocument(index, { beneficiaryCode: event.target.value })} />
              <WorkspaceInput value={row.beneficiaryNameSnapshot} placeholder="Beneficiary name" disabled={readOnly} onChange={(event) => updateDocument(index, { beneficiaryNameSnapshot: event.target.value })} />
              <WorkspaceTextarea value={row.beneficiaryAddressSnapshot} placeholder="Beneficiary address" disabled={readOnly} onChange={(event) => updateDocument(index, { beneficiaryAddressSnapshot: event.target.value })} />
              <WorkspaceInput value={row.beneficiaryCitySnapshot} placeholder="Beneficiary city" disabled={readOnly} onChange={(event) => updateDocument(index, { beneficiaryCitySnapshot: event.target.value })} />
              <WorkspaceInput value={row.beneficiaryPinSnapshot} placeholder="Beneficiary PIN" disabled={readOnly} onChange={(event) => updateDocument(index, { beneficiaryPinSnapshot: event.target.value })} />
            </Stacked>,
            <Stacked key="link">
              <WorkspaceInput value={row.documentVersionId} placeholder="Existing ChaDocumentVersion ID" disabled={readOnly} onChange={(event) => updateDocument(index, { documentVersionId: event.target.value })} />
            </Stacked>,
            <Button key="remove" type="button" size="sm" variant="outline" disabled={readOnly} onClick={() => removeDocument(index)}><Trash2 size={14} aria-hidden="true" /></Button>,
          ]}
        />
      </RemainingSection>
    );
  }

  if (activeSubtab === "checklist") {
    return (
      <ArtifactSection
        title="Checklist"
        description="The checklist summary is derived from the saved export draft and versioned for the existing CHA approval workflow."
        validation={draft.checklist.validation}
        rows={draft.checklist.generations.map((row) => [row.versionNo, row.status, row.checksum ?? "Pending", row.generatedAt, row.checklistId ?? row.fileName ?? "Pending workflow link"])}
        actionLabel="Generate checklist snapshot"
        readOnly={readOnly}
        controls={
          <WorkspaceCheckbox checked={withDeclaration} label="With declaration" disabled={readOnly} onChange={(event) => setWithDeclaration(event.target.checked)} />
        }
        summary={Object.entries(draft.checklist.summary)}
        onGenerate={async () => {
          const response = await generateExportChecklistSnapshotAction(job.id, lockVersion, withDeclaration);
          if (!response.ok) {
            setSaveError(response.error);
            if (response.code === "CONCURRENCY_CONFLICT") setConflictOpen(true);
            return;
          }
          router.refresh();
        }}
      />
    );
  }

  if (activeSubtab === "flat-file") {
    return (
      <ArtifactSection
        title="Flat File / Signing"
        description="Shipping Bill generations are deterministic and versioned. Dummy/test generations are explicit, signing is separate, and live submission still needs permission plus the live flag."
        validation={draft.flatFile.validation}
        rows={draft.flatFile.generations.map((row) => [row.versionNo, row.status, row.contentHash, row.generatedAt, row.fileName ?? "Generated payload", row.signingStatus ?? "Unsigned", row.signatureReference ?? "-", row.submissionStatuses.join(", ") || "Not submitted"])}
        actionLabel="Generate flat file"
        readOnly={readOnly}
        controls={
          <div className="grid gap-3 md:grid-cols-3">
            <WorkspaceCheckbox checked={dummyJob} label="Dummy / test generation" disabled={readOnly} onChange={(event) => setDummyJob(event.target.checked)} />
            <WorkspaceInput value={signatureReference} placeholder="Manual signature reference" disabled={readOnly} onChange={(event) => setSignatureReference(event.target.value)} />
            <WorkspaceBadge variant={draft.flatFile.signingConnector.status === "AVAILABLE" ? "success" : "warning"}>
              {draft.flatFile.signingConnector.status === "AVAILABLE"
                ? `Signing connector ${draft.flatFile.signingConnector.mode.toLowerCase()}`
                : "Signing connector unavailable"}
            </WorkspaceBadge>
          </div>
        }
        summary={[
          ["Connector", draft.flatFile.signingConnector.status],
          ["Connector detail", draft.flatFile.signingConnector.status === "AVAILABLE" ? draft.flatFile.signingConnector.mode : draft.flatFile.signingConnector.reason],
          ["Mode", dummyJob ? "Dummy / test" : "Ready for signed live flow"],
        ]}
        extraActions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={readOnly || draft.flatFile.generations.length === 0}
              onClick={async () => {
                const latest = draft.flatFile.generations[0];
                const response = await requestExportFlatFileSigningAction(job.id, latest.id);
                if (!response.ok) {
                  setSaveError(response.error);
                  return;
                }
                router.refresh();
              }}
            >
              <Signature size={14} aria-hidden="true" />
              Request sign
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={readOnly || draft.flatFile.generations.length === 0 || !signatureReference.trim()}
              onClick={async () => {
                const latest = draft.flatFile.generations[0];
                const response = await registerExportFlatFileSignatureAction(job.id, latest.id, signatureReference.trim());
                if (!response.ok) {
                  setSaveError(response.error);
                  return;
                }
                setSignatureReference("");
                router.refresh();
              }}
            >
              <Check size={14} aria-hidden="true" />
              Register sign
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={readOnly || draft.flatFile.generations.length === 0 || dummyJob}
              onClick={async () => {
                const latest = draft.flatFile.generations[0];
                const response = await submitExportFlatFileAction(job.id, latest.id, true);
                if (!response.ok) {
                  setSaveError(response.error);
                  return;
                }
                router.refresh();
              }}
            >
              <Send size={14} aria-hidden="true" />
              Submit live
            </Button>
          </div>
        }
        onGenerate={async () => {
          const response = await generateExportFlatFileSnapshotAction(job.id, lockVersion, dummyJob);
          if (!response.ok) {
            setSaveError(response.error);
            if (response.code === "CONCURRENCY_CONFLICT") setConflictOpen(true);
            return;
          }
          router.refresh();
        }}
      />
    );
  }

  return null;

  function updateInvoice(index: number, patch: Partial<typeof invoices[number]>) {
    setInvoices((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
    markDirty("invoice-details");
  }

  function updateCharge(index: number, chargeIndex: number, patch: Partial<typeof invoices[number]["charges"][number]>) {
    setInvoices((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? { ...row, charges: row.charges.map((charge, currentChargeIndex) => currentChargeIndex === chargeIndex ? { ...charge, ...patch } : charge) }
          : row,
      ),
    );
    markDirty("invoice-details");
  }

  function removeInvoice(index: number) {
    setInvoices((current) => current.filter((_, rowIndex) => rowIndex !== index).map((row, rowIndex) => ({ ...row, sequenceNo: rowIndex + 1 })));
    markDirty("invoice-details");
  }

  function updateItem(index: number, patch: Partial<typeof remaining.items[number]>) {
    setRemaining((current) => ({ ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) }));
    markRemainingDirty();
  }

  function removeItem(index: number) {
    setRemaining((current) => ({ ...current, items: current.items.filter((_, rowIndex) => rowIndex !== index).map((row, rowIndex) => ({ ...row, sequenceNo: rowIndex + 1 })) }));
    markRemainingDirty();
  }

  function updateDocument(index: number, patch: Partial<typeof remaining.supportingDocuments[number]>) {
    setRemaining((current) => ({ ...current, supportingDocuments: current.supportingDocuments.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) }));
    markRemainingDirty();
  }

  function removeDocument(index: number) {
    setRemaining((current) => ({ ...current, supportingDocuments: current.supportingDocuments.filter((_, rowIndex) => rowIndex !== index).map((row, rowIndex) => ({ ...row, sequenceNo: rowIndex + 1 })) }));
    markRemainingDirty();
  }
}

function ToolbarSave({ disabled, onSave, state }: { disabled?: boolean; onSave: () => void; state: CustomsSaveState }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CustomsSaveIndicator state={state} />
      <Button type="button" size="sm" onClick={onSave} disabled={disabled || state === "saving"}>
        <Save size={14} aria-hidden="true" />
        Save
      </Button>
    </div>
  );
}

function ErrorAlert({ error }: { error: string }) {
  return (
    <WorkspaceAlert variant="danger">
      <AlertTriangle size={16} aria-hidden="true" />
      <span>{error}</span>
    </WorkspaceAlert>
  );
}

function SectionTitle({ action, issues, title }: { action?: React.ReactNode; issues: number; title: string }) {
  return (
    <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-base font-semibold mnx-text-primary">{title}</h3>
      <div className="flex items-center gap-2">
        <WorkspaceBadge variant={issues ? "warning" : "success"}>{issues ? `${issues} open` : "complete"}</WorkspaceBadge>
        {action}
      </div>
    </div>
  );
}

function ReadonlyField({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <WorkspaceField htmlFor={id} label={label}>
      <WorkspaceInput id={id} value={value} readOnly />
    </WorkspaceField>
  );
}

function TextField({ disabled, id, inputMode, label, onChange, value }: { disabled?: boolean; id: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]; label: string; onChange: (value: string) => void; value: string }) {
  return (
    <WorkspaceField htmlFor={id} label={label}>
      <WorkspaceInput id={id} value={value} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
    </WorkspaceField>
  );
}

function DateField({ disabled, id, label, onChange, value }: { disabled?: boolean; id: string; label: string; onChange: (value: string) => void; value: string }) {
  return (
    <WorkspaceField htmlFor={id} label={label}>
      <WorkspaceInput id={id} type="date" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
    </WorkspaceField>
  );
}

function TextareaField({ disabled, id, label, onChange, value }: { disabled?: boolean; id: string; label: string; onChange: (value: string) => void; value: string }) {
  return (
    <WorkspaceField htmlFor={id} label={label}>
      <WorkspaceTextarea id={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
    </WorkspaceField>
  );
}

function CheckboxField({ checked, disabled, id, label, onChange }: { checked: boolean; disabled?: boolean; id: string; label: string; onChange: (checked: boolean) => void }) {
  return (
    <WorkspaceField label={label}>
      <WorkspaceCheckbox id={id} checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} label={label} />
    </WorkspaceField>
  );
}

function Stacked({ children }: { children: React.ReactNode }) {
  return <div className="grid min-w-48 gap-2">{children}</div>;
}

function RemainingSection({
  children,
  dirty,
  onSave,
  readOnly,
  saveState,
  title,
}: {
  children: React.ReactNode;
  dirty: boolean;
  onSave: () => void;
  readOnly: boolean;
  saveState: CustomsSaveState;
  title: string;
}) {
  return (
    <div className="space-y-4">
      <CustomsDirtyStateWarning active={dirty} />
      <CustomsFilingSection
        title={title}
        description="Export filing draft rows remain linked to the existing CHA job aggregate."
        readonly={readOnly}
        actions={<ToolbarSave state={saveState} onSave={onSave} disabled={readOnly} />}
      >
        {children}
      </CustomsFilingSection>
      <CustomsConcurrencyConflictDialog open={false} onClose={() => undefined} />
    </div>
  );
}

function SimpleRowsTable<T>({
  actionLabel,
  columns,
  onAdd,
  readOnly,
  render,
  rows,
  title,
}: {
  actionLabel: string;
  columns: string[];
  onAdd: () => void;
  readOnly: boolean;
  render: (row: T, index: number) => React.ReactNode[];
  rows: T[];
  title: string;
}) {
  return (
    <CustomsLineItemTable
      title={title}
      actions={
        <Button type="button" size="sm" variant="outline" disabled={readOnly} onClick={onAdd}>
          <Plus size={14} aria-hidden="true" />
          {actionLabel}
        </Button>
      }
    >
      <ChaTable>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length}>No rows yet.</td></tr>
          ) : rows.map((row, index) => (
            <tr key={index}>
              {render(row, index).map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </ChaTable>
    </CustomsLineItemTable>
  );
}

function ArtifactSection({
  actionLabel,
  controls,
  description,
  extraActions,
  onGenerate,
  readOnly,
  rows,
  summary,
  title,
  validation,
}: {
  actionLabel: string;
  controls?: React.ReactNode;
  description: string;
  extraActions?: React.ReactNode;
  onGenerate: () => Promise<void>;
  readOnly: boolean;
  rows: Array<Array<React.ReactNode>>;
  summary?: Array<[string, React.ReactNode]>;
  title: string;
  validation: string[];
}) {
  const [state, setState] = useState<CustomsSaveState>("idle");
  return (
    <CustomsFilingSection
      title={title}
      description={description}
      readonly={readOnly}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <CustomsSaveIndicator state={state} />
          <Button
            type="button"
            size="sm"
            disabled={readOnly || state === "saving"}
            onClick={async () => {
              setState("saving");
              await onGenerate();
              setState("saved");
            }}
          >
            <Save size={14} aria-hidden="true" />
            {actionLabel}
          </Button>
          {extraActions}
        </div>
      }
    >
      {controls ? <div className="mb-4">{controls}</div> : null}
      {validation.length ? (
        <WorkspaceAlert variant="warning">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{validation.length} validation item(s) must be reviewed before approval, signing, or submission.</span>
        </WorkspaceAlert>
      ) : (
        <WorkspaceAlert variant="success">
          <Check size={16} aria-hidden="true" />
          <span>Current export filing snapshot has no blocking validation messages.</span>
        </WorkspaceAlert>
      )}
      {summary?.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {summary.map(([label, value]) => (
            <div key={label} className="rounded-[var(--mn-radius-control)] border mnx-border mnx-bg-soft p-3">
              <p className="mnx-label">{label}</p>
              <p className="mt-1 text-sm mnx-text-primary">{value || "-"}</p>
            </div>
          ))}
        </div>
      ) : null}
      <CustomsLineItemTable title={`${title} history`}>
        <ChaTable>
          <thead>
            <tr>
              {rows[0]?.map((_, index) => <th key={index}>Column {index + 1}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={8}>No generated versions yet.</td></tr> : rows.map((row, index) => (
              <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </ChaTable>
      </CustomsLineItemTable>
    </CustomsFilingSection>
  );
}

function PackageRows({ onChange, readOnly, rows }: { onChange: (rows: ExportSbMainDraftView["packageRows"]) => void; readOnly: boolean; rows: ExportSbMainDraftView["packageRows"] }) {
  return (
    <SimpleRowsTable
      title="Package Details"
      actionLabel="Add package"
      columns={["Serial", "Type", "Code", "Packages", "Loose", "Marks", "Actions"]}
      rows={rows}
      readOnly={readOnly}
      onAdd={() => onChange([...rows, emptyPackageRow(rows.length + 1)])}
      render={(row, index) => [
        row.sequenceNo,
        <WorkspaceInput key="type" value={row.packageType} disabled={readOnly} onChange={(event) => onChange(rows.map((current, rowIndex) => rowIndex === index ? { ...current, packageType: event.target.value } : current))} />,
        <WorkspaceInput key="code" value={row.packageCode} disabled={readOnly} onChange={(event) => onChange(rows.map((current, rowIndex) => rowIndex === index ? { ...current, packageCode: event.target.value } : current))} />,
        <WorkspaceInput key="count" value={row.packageCount} inputMode="decimal" disabled={readOnly} onChange={(event) => onChange(rows.map((current, rowIndex) => rowIndex === index ? { ...current, packageCount: event.target.value } : current))} />,
        <WorkspaceInput key="loose" value={row.loosePackageCount} inputMode="decimal" disabled={readOnly} onChange={(event) => onChange(rows.map((current, rowIndex) => rowIndex === index ? { ...current, loosePackageCount: event.target.value } : current))} />,
        <WorkspaceTextarea key="marks" value={row.marksAndNos} disabled={readOnly} onChange={(event) => onChange(rows.map((current, rowIndex) => rowIndex === index ? { ...current, marksAndNos: event.target.value } : current))} />,
        <Button key="remove" type="button" size="sm" variant="outline" disabled={readOnly} onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index).map((current, rowIndex) => ({ ...current, sequenceNo: rowIndex + 1 })))}><Trash2 size={14} aria-hidden="true" /></Button>,
      ]}
    />
  );
}

function ContainerRows({ onChange, readOnly, rows }: { onChange: (rows: ExportSbMainDraftView["containerRows"]) => void; readOnly: boolean; rows: ExportSbMainDraftView["containerRows"] }) {
  return (
    <SimpleRowsTable
      title="Container Details"
      actionLabel="Add container"
      columns={["Serial", "Container", "Size", "Seal", "Packages", "Gross", "Net", "Actions"]}
      rows={rows}
      readOnly={readOnly}
      onAdd={() => onChange([...rows, emptyContainerRow(rows.length + 1)])}
      render={(row, index) => [
        row.sequenceNo,
        <WorkspaceInput key="no" value={row.containerNo} disabled={readOnly} onChange={(event) => onChange(rows.map((current, rowIndex) => rowIndex === index ? { ...current, containerNo: event.target.value } : current))} />,
        <WorkspaceInput key="size" value={row.containerSize} disabled={readOnly} onChange={(event) => onChange(rows.map((current, rowIndex) => rowIndex === index ? { ...current, containerSize: event.target.value } : current))} />,
        <WorkspaceInput key="seal" value={row.sealNo} disabled={readOnly} onChange={(event) => onChange(rows.map((current, rowIndex) => rowIndex === index ? { ...current, sealNo: event.target.value } : current))} />,
        <WorkspaceInput key="packages" value={row.packageCount} inputMode="decimal" disabled={readOnly} onChange={(event) => onChange(rows.map((current, rowIndex) => rowIndex === index ? { ...current, packageCount: event.target.value } : current))} />,
        <WorkspaceInput key="gross" value={row.grossWeight} inputMode="decimal" disabled={readOnly} onChange={(event) => onChange(rows.map((current, rowIndex) => rowIndex === index ? { ...current, grossWeight: event.target.value } : current))} />,
        <WorkspaceInput key="net" value={row.netWeight} inputMode="decimal" disabled={readOnly} onChange={(event) => onChange(rows.map((current, rowIndex) => rowIndex === index ? { ...current, netWeight: event.target.value } : current))} />,
        <Button key="remove" type="button" size="sm" variant="outline" disabled={readOnly} onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index).map((current, rowIndex) => ({ ...current, sequenceNo: rowIndex + 1 })))}><Trash2 size={14} aria-hidden="true" /></Button>,
      ]}
    />
  );
}
