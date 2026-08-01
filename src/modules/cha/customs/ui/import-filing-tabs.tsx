"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/monolith/button";
import { ChaTable } from "@/components/monolith/cha-workspace";
import {
  WorkspaceAlert,
  WorkspaceBadge,
  WorkspaceCheckbox,
  WorkspaceField,
  WorkspaceInput,
  WorkspaceSelect,
  WorkspaceTextarea,
} from "@/components/monolith/workspace";
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
import {
  generateImportChecklistSnapshotAction,
  generateImportFlatFileSnapshotAction,
  saveImportBeMainDraftAction,
  saveImportIgmDraftAction,
  saveImportRemainingDraftAction,
} from "../filing/actions";
import type {
  ImportBeMainDraftView,
  ImportFilingDraftView,
  ImportIgmDraftView,
} from "../filing/import-drafts";

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

type ImportFilingTabsProps = {
  activeSubtab: string;
  draft: ImportFilingDraftView;
  job: JobSnapshotSource;
  profile: {
    currentDraftVersion: number;
    lockVersion: number;
    isLocked: boolean;
  };
  readOnly: boolean;
};

type ValidationIssue = { fieldId: string; label: string; message: string };

function emptyIgmRow(sequenceNo: number): ImportIgmDraftView["billRows"][number] {
  return {
    sequenceNo,
    mblNo: "",
    noMbl: false,
    mblDate: "",
    hblNo: "",
    hblDate: "",
    packageCount: "",
    packageCode: "",
    grossWeight: "",
    netWeight: "",
    uom: "",
  };
}

function emptyContainer(sequenceNo: number): ImportIgmDraftView["containers"][number] {
  return {
    sequenceNo,
    containerNo: "",
    containerSize: "",
    sealNo: "",
    packageCount: "",
    grossWeight: "",
    netWeight: "",
  };
}

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

export function ImportFilingTabs({
  activeSubtab,
  draft,
  job,
  profile,
  readOnly,
}: ImportFilingTabsProps) {
  const router = useRouter();
  const [lockVersion, setLockVersion] = useState(profile.lockVersion);
  const [beMain, setBeMain] = useState<ImportBeMainDraftView>({
    ...draft.beMain,
    jobDate: draft.beMain.jobDate || toDateInput(job.createdAt),
  });
  const [igm, setIgm] = useState<ImportIgmDraftView>({
    ...draft.igm,
    billRows: draft.igm.billRows.length ? draft.igm.billRows : [emptyIgmRow(1)],
  });
  const [remaining, setRemaining] = useState({
    invoices: draft.invoices,
    items: draft.items,
    declarations: draft.declarations,
    supportingDocuments: draft.supportingDocuments,
  });
  const [saveState, setSaveState] = useState<CustomsSaveState>("idle");
  const [dirtyTab, setDirtyTab] = useState<"be-main" | "igm" | "remaining" | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [, startTransition] = useTransition();
  const hydrated = useRef(false);

  const saveDraft = useCallback(async (tab: "be-main" | "igm" | "remaining") => {
    if (readOnly) return;
    setSaveState("saving");
    const response =
      tab === "be-main"
        ? await saveImportBeMainDraftAction(job.id, { ...beMain, lockVersion })
        : tab === "igm"
          ? await saveImportIgmDraftAction(job.id, { ...igm, lockVersion })
          : await saveImportRemainingDraftAction(job.id, { ...remaining, lockVersion });
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
  }, [beMain, igm, job.id, lockVersion, readOnly, remaining, router, startTransition]);

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
  }, [beMain, igm, dirtyTab, readOnly, saveDraft]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirtyTab) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirtyTab]);

  const beIssues = useMemo(
    () =>
      requiredIssues("import-be", [
        { field: "jobDate", label: "Job Date", value: beMain.jobDate },
        { field: "beType", label: "BE Type", value: beMain.beType },
        { field: "transportMode", label: "Transport Mode", value: beMain.transportMode },
        { field: "filingType", label: "Filing Type", value: beMain.filingType },
        { field: "customsHouse", label: "Customs House", value: beMain.customsHouse },
        { field: "customsHouseCode", label: "Customs House Code", value: beMain.customsHouseCode },
        { field: "importerNameSnapshot", label: "Importer Name", value: beMain.importerNameSnapshot },
        { field: "importerIecSnapshot", label: "IEC No", value: beMain.importerIecSnapshot },
        { field: "portOfShipment", label: "Port of Shipment", value: beMain.portOfShipment },
        { field: "countryOfShipment", label: "Country of Shipment", value: beMain.countryOfShipment },
        { field: "portOfOrigin", label: "Port of Origin", value: beMain.portOfOrigin },
        { field: "countryOfOrigin", label: "Country of Origin", value: beMain.countryOfOrigin },
      ]),
    [beMain],
  );
  const igmIssues = useMemo(() => {
    const issues = requiredIssues("import-igm", [
      { field: "igmNo", label: "IGM No", value: igm.igmNo },
      { field: "fileType", label: "File Type", value: igm.fileType },
      { field: "igmDate", label: "IGM Date", value: igm.igmDate },
      { field: "inwardDate", label: "Inward Date", value: igm.inwardDate },
      { field: "gatewayPort", label: "Gateway Port", value: igm.gatewayPort },
      { field: "gatewayMode", label: "Gateway Mode", value: igm.gatewayMode },
    ]);
    for (const [index, row] of igm.billRows.entries()) {
      if (!row.noMbl && !row.mblNo) {
        issues.push({
          fieldId: `import-igm-row-${index}-mblNo`,
          label: `Row ${row.sequenceNo} MBL No`,
          message: "Required unless No MBL is selected.",
        });
      }
      if (row.noMbl && row.mblNo) {
        issues.push({
          fieldId: `import-igm-row-${index}-mblNo`,
          label: `Row ${row.sequenceNo} MBL No`,
          message: "Must be empty when No MBL is selected.",
        });
      }
      if (row.hblDate && !row.hblNo) {
        issues.push({
          fieldId: `import-igm-row-${index}-hblNo`,
          label: `Row ${row.sequenceNo} HBL No`,
          message: "Required when HBL Date is present.",
        });
      }
    }
    return issues;
  }, [igm]);

  function updateBe<K extends keyof ImportBeMainDraftView>(key: K, value: ImportBeMainDraftView[K]) {
    setBeMain((current) => ({ ...current, [key]: value }));
    markDirty("be-main");
  }

  function updateIgm<K extends keyof ImportIgmDraftView>(key: K, value: ImportIgmDraftView[K]) {
    setIgm((current) => ({ ...current, [key]: value }));
    markDirty("igm");
  }

  function markDirty(tab: "be-main" | "igm") {
    setDirtyTab(tab);
    setSaveState("dirty");
    setSaveError(null);
  }

  function markRemainingDirty() {
    setDirtyTab("remaining");
    setSaveState("dirty");
    setSaveError(null);
  }

  function snapshotJobCustomer() {
    const customer = job.customer;
    if (!customer) return;
    setBeMain((current) => ({
      ...current,
      importerNameSnapshot: current.importerNameSnapshot || customer.name || "",
      importerIecSnapshot: current.importerIecSnapshot || customer.iecCode || "",
      chaPanSnapshot: current.chaPanSnapshot || customer.pan || "",
      importerAddressSnapshot: current.importerAddressSnapshot || customer.addressLine1 || "",
      importerCitySnapshot: current.importerCitySnapshot || customer.city || "",
      importerStateSnapshot: current.importerStateSnapshot || customer.state || "",
      importerPinCodeSnapshot: current.importerPinCodeSnapshot || customer.postalCode || "",
      importerTaxRegistrationNo: current.importerTaxRegistrationNo || customer.gstin || "",
    }));
    markDirty("be-main");
  }

  if (activeSubtab === "be-main") {
    return (
      <div className="space-y-4">
        <CustomsDirtyStateWarning active={dirtyTab === "be-main"} />
        <CustomsValidationSummary errors={beIssues} />
        {saveError ? (
          <WorkspaceAlert variant="danger">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{saveError}</span>
          </WorkspaceAlert>
        ) : null}
        <CustomsFilingSection
          title="BE Main Details"
          description={`Draft v${profile.currentDraftVersion} - concurrency ${lockVersion}`}
          readonly={readOnly}
          actions={<ToolbarSave state={saveState} onSave={() => void saveDraft("be-main")} disabled={readOnly} />}
        >
          <SectionTitle title="Job Details" issues={beIssues.length} />
          <CustomsFormGrid columns={4}>
            <ReadonlyField id="import-be-jobNo" label="Job No" value={job.jobNumber} />
            <ReadonlyField id="import-be-jobDate" label="Job Date" value={beMain.jobDate} />
            <TextField id="import-be-beType" label="BE Type" value={beMain.beType} onChange={(value) => updateBe("beType", value)} disabled={readOnly} />
            <TextField id="import-be-transportMode" label="Transport Mode" value={beMain.transportMode} onChange={(value) => updateBe("transportMode", value)} disabled={readOnly} />
            <TextField id="import-be-filingType" label="Filing Type" value={beMain.filingType} onChange={(value) => updateBe("filingType", value)} disabled={readOnly} />
            <TextField id="import-be-customsHouse" label="Customs House" value={beMain.customsHouse} onChange={(value) => updateBe("customsHouse", value)} disabled={readOnly} />
            <TextField id="import-be-customsHouseCode" label="Customs House Code" value={beMain.customsHouseCode} onChange={(value) => updateBe("customsHouseCode", value)} disabled={readOnly} />
            <TextField id="import-be-warehouseCode" label="Warehouse Code" value={beMain.warehouseCode} onChange={(value) => updateBe("warehouseCode", value)} disabled={readOnly} />
            <TextField id="import-be-warehouseCustomsSiteId" label="Warehouse Customs Site ID" value={beMain.warehouseCustomsSiteId} onChange={(value) => updateBe("warehouseCustomsSiteId", value)} disabled={readOnly} />
            <TextField id="import-be-packageCount" label="Number of Packages" value={beMain.packageCount} onChange={(value) => updateBe("packageCount", value)} disabled={readOnly} inputMode="decimal" />
            <TextField id="import-be-packageCode" label="Package Code" value={beMain.packageCode} onChange={(value) => updateBe("packageCode", value)} disabled={readOnly} />
            <TextField id="import-be-grossWeight" label="Gross Weight" value={beMain.grossWeight} onChange={(value) => updateBe("grossWeight", value)} disabled={readOnly} inputMode="decimal" />
            <TextField id="import-be-uom" label="UOM" value={beMain.uom} onChange={(value) => updateBe("uom", value)} disabled={readOnly} />
          </CustomsFormGrid>

          <SectionTitle title="BE Details" issues={0} />
          <WorkspaceAlert variant="info">
            <Check size={16} aria-hidden="true" />
            <span>BE status fields are currently manual draft values. Source: {beMain.beStatusSource}; updated {beMain.beStatusUpdatedAt || "after first save"}.</span>
          </WorkspaceAlert>
          <CustomsFormGrid columns={3}>
            <TextField id="import-be-beNumber" label="BE No" value={beMain.beNumber} onChange={(value) => updateBe("beNumber", value)} disabled={readOnly} />
            <DateField id="import-be-beDate" label="BE Date" value={beMain.beDate} onChange={(value) => updateBe("beDate", value)} disabled={readOnly} />
            <DateField id="import-be-examinationDate" label="Examination Date" value={beMain.examinationDate} onChange={(value) => updateBe("examinationDate", value)} disabled={readOnly} />
            <DateField id="import-be-outOfChargeDate" label="Out of Charge date/status" value={beMain.outOfChargeDate} onChange={(value) => updateBe("outOfChargeDate", value)} disabled={readOnly} />
            <DateField id="import-be-dutyPaidDate" label="Duty Paid date/status" value={beMain.dutyPaidDate} onChange={(value) => updateBe("dutyPaidDate", value)} disabled={readOnly} />
            <DateField id="import-be-deliveredDate" label="Delivered date/status" value={beMain.deliveredDate} onChange={(value) => updateBe("deliveredDate", value)} disabled={readOnly} />
          </CustomsFormGrid>

          <SectionTitle title="CHA Details" issues={0} />
          <CustomsFormGrid columns={4}>
            <TextField id="import-be-icegateIdSnapshot" label="ICEGATE ID/Profile" value={beMain.icegateIdSnapshot} onChange={(value) => updateBe("icegateIdSnapshot", value)} disabled={readOnly} />
            <TextField id="import-be-chaPanSnapshot" label="CHA PAN" value={beMain.chaPanSnapshot} onChange={(value) => updateBe("chaPanSnapshot", value)} disabled={readOnly} />
            <TextField id="import-be-atpNameSnapshot" label="ATP Name" value={beMain.atpNameSnapshot} onChange={(value) => updateBe("atpNameSnapshot", value)} disabled={readOnly} />
            <TextField id="import-be-atpPanSnapshot" label="ATP PAN" value={beMain.atpPanSnapshot} onChange={(value) => updateBe("atpPanSnapshot", value)} disabled={readOnly} />
          </CustomsFormGrid>

          <SectionTitle
            title="Importer Details"
            issues={beIssues.filter((issue) => issue.fieldId.includes("importer")).length}
            action={
              <Button type="button" size="sm" variant="outline" onClick={snapshotJobCustomer} disabled={readOnly || !job.customer}>
                Snapshot job customer
              </Button>
            }
          />
          <CustomsFormGrid columns={4}>
            <CheckboxField id="import-be-standardIec" label="Standard IEC flag" checked={beMain.standardIec} onChange={(checked) => updateBe("standardIec", checked)} disabled={readOnly} />
            <TextField id="import-be-importerNameSnapshot" label="Importer Name" value={beMain.importerNameSnapshot} onChange={(value) => updateBe("importerNameSnapshot", value)} disabled={readOnly} />
            <TextField id="import-be-importerIecSnapshot" label="IEC No" value={beMain.importerIecSnapshot} onChange={(value) => updateBe("importerIecSnapshot", value)} disabled={readOnly} />
            <TextField id="import-be-importerBranchSerialNo" label="Branch Serial No" value={beMain.importerBranchSerialNo} onChange={(value) => updateBe("importerBranchSerialNo", value)} disabled={readOnly} />
            <TextField id="import-be-importerCategory" label="Importer Category" value={beMain.importerCategory} onChange={(value) => updateBe("importerCategory", value)} disabled={readOnly} />
            <TextField id="import-be-importerType" label="Importer Type" value={beMain.importerType} onChange={(value) => updateBe("importerType", value)} disabled={readOnly} />
            <TextField id="import-be-importerClass" label="Class" value={beMain.importerClass} onChange={(value) => updateBe("importerClass", value)} disabled={readOnly} />
            <TextField id="import-be-importerCitySnapshot" label="City" value={beMain.importerCitySnapshot} onChange={(value) => updateBe("importerCitySnapshot", value)} disabled={readOnly} />
            <TextField id="import-be-importerStateSnapshot" label="State" value={beMain.importerStateSnapshot} onChange={(value) => updateBe("importerStateSnapshot", value)} disabled={readOnly} />
            <TextField id="import-be-importerPinCodeSnapshot" label="PIN Code" value={beMain.importerPinCodeSnapshot} onChange={(value) => updateBe("importerPinCodeSnapshot", value)} disabled={readOnly} />
            <TextField id="import-be-importerAdCodeSnapshot" label="AD Code" value={beMain.importerAdCodeSnapshot} onChange={(value) => updateBe("importerAdCodeSnapshot", value)} disabled={readOnly} />
            <TextField id="import-be-importerOriginState" label="State of Origin" value={beMain.importerOriginState} onChange={(value) => updateBe("importerOriginState", value)} disabled={readOnly} />
            <TextField id="import-be-importerGstnType" label="GSTN Type" value={beMain.importerGstnType} onChange={(value) => updateBe("importerGstnType", value)} disabled={readOnly} />
            <TextField id="import-be-importerTaxRegistrationNo" label="Tax Registration No" value={beMain.importerTaxRegistrationNo} onChange={(value) => updateBe("importerTaxRegistrationNo", value)} disabled={readOnly} />
            <TextareaField id="import-be-importerAddressSnapshot" label="Address" value={beMain.importerAddressSnapshot} onChange={(value) => updateBe("importerAddressSnapshot", value)} disabled={readOnly} />
          </CustomsFormGrid>

          <SectionTitle title="Import Flags / Additional Details" issues={0} />
          <CustomsFormGrid columns={4}>
            {([
              ["firstCheck", "First Check"],
              ["greenChannel", "Green Channel"],
              ["kacchaBe", "Kaccha BE"],
              ["provisionalAssessment", "Provisional Assessment"],
              ["highSeaSale", "High Sea Sale"],
              ["exBond", "Ex-Bond"],
            ] as const).map(([key, label]) => (
              <CheckboxField key={key} id={`import-be-${key}`} label={label} checked={beMain[key]} onChange={(checked) => updateBe(key, checked)} disabled={readOnly} />
            ))}
            <TextField id="import-be-ucrType" label="UCR Type" value={beMain.ucrType} onChange={(value) => updateBe("ucrType", value)} disabled={readOnly} />
            <TextField id="import-be-ucrNo" label="UCR No" value={beMain.ucrNo} onChange={(value) => updateBe("ucrNo", value)} disabled={readOnly} />
            <TextField id="import-be-paymentMethod" label="Payment Method" value={beMain.paymentMethod} onChange={(value) => updateBe("paymentMethod", value)} disabled={readOnly} />
            <TextareaField id="import-be-bondDetailsText" label="Bond Details" value={beMain.bondDetailsText} onChange={(value) => updateBe("bondDetailsText", value)} disabled={readOnly} />
            <TextareaField id="import-be-certificateDetailsText" label="Certificate Details" value={beMain.certificateDetailsText} onChange={(value) => updateBe("certificateDetailsText", value)} disabled={readOnly} />
          </CustomsFormGrid>

          <SectionTitle title="Shipment Details" issues={beIssues.filter((issue) => issue.fieldId.includes("port") || issue.fieldId.includes("country")).length} />
          <CustomsFormGrid columns={4}>
            <TextField id="import-be-portOfShipment" label="Port of Shipment" value={beMain.portOfShipment} onChange={(value) => updateBe("portOfShipment", value)} disabled={readOnly} />
            <TextField id="import-be-portOfShipmentCode" label="Port of Shipment Code" value={beMain.portOfShipmentCode} onChange={(value) => updateBe("portOfShipmentCode", value)} disabled={readOnly} />
            <TextField id="import-be-countryOfShipment" label="Country of Shipment" value={beMain.countryOfShipment} onChange={(value) => updateBe("countryOfShipment", value)} disabled={readOnly} />
            <TextField id="import-be-countryOfShipmentCode" label="Country of Shipment Code" value={beMain.countryOfShipmentCode} onChange={(value) => updateBe("countryOfShipmentCode", value)} disabled={readOnly} />
            <TextField id="import-be-portOfOrigin" label="Port of Origin" value={beMain.portOfOrigin} onChange={(value) => updateBe("portOfOrigin", value)} disabled={readOnly} />
            <TextField id="import-be-portOfOriginCode" label="Port of Origin Code" value={beMain.portOfOriginCode} onChange={(value) => updateBe("portOfOriginCode", value)} disabled={readOnly} />
            <TextField id="import-be-countryOfOrigin" label="Country of Origin" value={beMain.countryOfOrigin} onChange={(value) => updateBe("countryOfOrigin", value)} disabled={readOnly} />
            <TextField id="import-be-countryOfOriginCode" label="Country of Origin Code" value={beMain.countryOfOriginCode} onChange={(value) => updateBe("countryOfOriginCode", value)} disabled={readOnly} />
          </CustomsFormGrid>
        </CustomsFilingSection>
        <CustomsConcurrencyConflictDialog open={conflictOpen} onClose={() => setConflictOpen(false)} onReload={() => router.refresh()} />
      </div>
    );
  }

  if (activeSubtab === "igm") {
    const container20Count = igm.containers.filter((container) => container.containerSize === "20FT").length;
    const container40Count = igm.containers.filter((container) => container.containerSize === "40FT").length;
    return (
      <div className="space-y-4">
        <CustomsDirtyStateWarning active={dirtyTab === "igm"} />
        <CustomsValidationSummary errors={igmIssues} />
        {!igm.igmCapability.supported ? (
          <WorkspaceAlert variant="info">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{igm.igmCapability.reason ?? "IGM retrieval is not configured. Manual entry remains available."}</span>
          </WorkspaceAlert>
        ) : null}
        {saveError ? (
          <WorkspaceAlert variant="danger">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{saveError}</span>
          </WorkspaceAlert>
        ) : null}
        <CustomsFilingSection
          title="IGM"
          description={`Draft v${profile.currentDraftVersion} - concurrency ${lockVersion}`}
          readonly={readOnly}
          actions={<ToolbarSave state={saveState} onSave={() => void saveDraft("igm")} disabled={readOnly} />}
        >
          <CustomsFormGrid columns={4}>
            <TextField id="import-igm-igmNo" label="IGM No" value={igm.igmNo} onChange={(value) => updateIgm("igmNo", value)} disabled={readOnly} />
            <TextField id="import-igm-fileType" label="File Type" value={igm.fileType} onChange={(value) => updateIgm("fileType", value)} disabled={readOnly} />
            <DateField id="import-igm-igmDate" label="IGM Date" value={igm.igmDate} onChange={(value) => updateIgm("igmDate", value)} disabled={readOnly} />
            <DateField id="import-igm-inwardDate" label="Inward Date" value={igm.inwardDate} onChange={(value) => updateIgm("inwardDate", value)} disabled={readOnly} />
            <TextField id="import-igm-gatewayPort" label="Gateway Port" value={igm.gatewayPort} onChange={(value) => updateIgm("gatewayPort", value)} disabled={readOnly} />
            <TextField id="import-igm-gatewayMode" label="Gateway Mode" value={igm.gatewayMode} onChange={(value) => updateIgm("gatewayMode", value)} disabled={readOnly} />
            <TextField id="import-igm-marksAndNos" label="Marks and Numbers" value={igm.marksAndNos} onChange={(value) => updateIgm("marksAndNos", value)} disabled={readOnly} />
            <CheckboxField id="import-igm-section48" label="Section 48" checked={igm.section48} onChange={(checked) => updateIgm("section48", checked)} disabled={readOnly} />
            <TextareaField id="import-igm-section48Text" label="Section 48 Text" value={igm.section48Text} onChange={(value) => updateIgm("section48Text", value)} disabled={readOnly} />
            <ReadonlyField id="import-igm-container20Count" label="20-foot container count" value={String(container20Count)} />
            <ReadonlyField id="import-igm-container40Count" label="40-foot container count" value={String(container40Count)} />
          </CustomsFormGrid>
          <IgmRowsTable
            rows={igm.billRows}
            readOnly={readOnly}
            onAdd={() => {
              setIgm((current) => ({ ...current, billRows: [...current.billRows, emptyIgmRow(current.billRows.length + 1)] }));
              markDirty("igm");
            }}
            onRemove={(index) => {
              setIgm((current) => ({ ...current, billRows: current.billRows.filter((_, rowIndex) => rowIndex !== index).map((row, rowIndex) => ({ ...row, sequenceNo: rowIndex + 1 })) }));
              markDirty("igm");
            }}
            onUpdate={(index, row) => {
              setIgm((current) => ({
                ...current,
                billRows: current.billRows.map((existing, rowIndex) => (rowIndex === index ? row : existing)),
              }));
              markDirty("igm");
            }}
          />
          <ContainerRowsTable
            rows={igm.containers}
            readOnly={readOnly}
            onAdd={() => {
              setIgm((current) => ({ ...current, containers: [...current.containers, emptyContainer(current.containers.length + 1)] }));
              markDirty("igm");
            }}
            onRemove={(index) => {
              setIgm((current) => ({ ...current, containers: current.containers.filter((_, rowIndex) => rowIndex !== index).map((row, rowIndex) => ({ ...row, sequenceNo: rowIndex + 1 })) }));
              markDirty("igm");
            }}
            onUpdate={(index, row) => {
              setIgm((current) => ({
                ...current,
                containers: current.containers.map((existing, rowIndex) => (rowIndex === index ? row : existing)),
              }));
              markDirty("igm");
            }}
          />
        </CustomsFilingSection>
        <CustomsConcurrencyConflictDialog open={conflictOpen} onClose={() => setConflictOpen(false)} onReload={() => router.refresh()} />
      </div>
    );
  }

  if (activeSubtab === "invoice") {
    return (
      <RemainingSection title="Import Invoice" state={saveState} readOnly={readOnly} dirty={dirtyTab === "remaining"} onSave={() => void saveDraft("remaining")}>
        <CustomsLineItemTable title="Invoice table" actions={<Button type="button" size="sm" variant="outline" disabled={readOnly} onClick={() => {
          setRemaining((current) => ({
            ...current,
            invoices: [...current.invoices, {
              sequenceNo: current.invoices.length + 1,
              invoiceNo: "",
              invoiceDate: "",
              natureOfPayment: "",
              natureOfTransaction: "",
              currency: "",
              exchangeRate: "",
              invoiceValue: "",
              invoiceValueInr: "",
              incoTerms: "",
              valuationMethod: "",
              supplierNameSnapshot: "",
              supplierAddressSnapshot: "",
              supplierCountrySnapshot: "",
              supplierZipCodeSnapshot: "",
              useForAllInvoice: false,
              useAsDefaultManufacturer: false,
              sellerText: "",
              brokerText: "",
              thirdPartyText: "",
              aeoText: "",
              svbText: "",
              singleFreightInsurance: false,
              actualFreight: false,
              assessableValueFc: "",
              assessableValueInr: "",
              charges: defaultInvoiceCharges(),
            }],
          }));
          markRemainingDirty();
        }}><Plus size={14} aria-hidden="true" /> New invoice</Button>}>
          <ChaTable>
            <thead><tr><th>Serial</th><th>Invoice</th><th>Payment</th><th>Currency</th><th>Value</th><th>Supplier</th><th>Valuation rows</th><th>Actions</th></tr></thead>
            <tbody>
              {remaining.invoices.length === 0 ? <tr><td colSpan={8}>No import invoices yet.</td></tr> : remaining.invoices.map((invoice, index) => (
                <tr key={invoice.sequenceNo}>
                  <td>{invoice.sequenceNo}</td>
                  <td><Stacked><WorkspaceInput value={invoice.invoiceNo} placeholder="Invoice No" disabled={readOnly} onChange={(event) => updateInvoice(index, { invoiceNo: event.target.value })} /><WorkspaceInput type="date" value={invoice.invoiceDate} disabled={readOnly} onChange={(event) => updateInvoice(index, { invoiceDate: event.target.value })} /><WorkspaceInput value={invoice.incoTerms} placeholder="Incoterm" disabled={readOnly} onChange={(event) => updateInvoice(index, { incoTerms: event.target.value })} /></Stacked></td>
                  <td><Stacked><WorkspaceInput value={invoice.natureOfPayment} placeholder="Nature of payment" disabled={readOnly} onChange={(event) => updateInvoice(index, { natureOfPayment: event.target.value })} /><WorkspaceInput value={invoice.natureOfTransaction} placeholder="Nature of transaction" disabled={readOnly} onChange={(event) => updateInvoice(index, { natureOfTransaction: event.target.value })} /></Stacked></td>
                  <td><Stacked><WorkspaceInput value={invoice.currency} placeholder="Currency" disabled={readOnly} onChange={(event) => updateInvoice(index, { currency: event.target.value })} /><WorkspaceInput value={invoice.exchangeRate} placeholder="Exchange rate" inputMode="decimal" disabled={readOnly} onChange={(event) => updateInvoice(index, { exchangeRate: event.target.value })} /></Stacked></td>
                  <td><Stacked><WorkspaceInput value={invoice.invoiceValue} placeholder="Amount FC" inputMode="decimal" disabled={readOnly} onChange={(event) => updateInvoice(index, { invoiceValue: event.target.value })} /><WorkspaceInput value={invoice.invoiceValueInr} placeholder="Amount INR" inputMode="decimal" disabled={readOnly} onChange={(event) => updateInvoice(index, { invoiceValueInr: event.target.value })} /><WorkspaceInput value={invoice.valuationMethod} placeholder="Valuation method" disabled={readOnly} onChange={(event) => updateInvoice(index, { valuationMethod: event.target.value })} /></Stacked></td>
                  <td><Stacked><WorkspaceInput value={invoice.supplierNameSnapshot} placeholder="Supplier name" disabled={readOnly} onChange={(event) => updateInvoice(index, { supplierNameSnapshot: event.target.value })} /><WorkspaceInput value={invoice.supplierCountrySnapshot} placeholder="Country" disabled={readOnly} onChange={(event) => updateInvoice(index, { supplierCountrySnapshot: event.target.value })} /><WorkspaceTextarea value={invoice.supplierAddressSnapshot} placeholder="Address" disabled={readOnly} onChange={(event) => updateInvoice(index, { supplierAddressSnapshot: event.target.value })} /></Stacked></td>
                  <td><Stacked>{invoice.charges.map((charge, chargeIndex) => <WorkspaceInput key={charge.sequenceNo} value={`${charge.chargeType}: ${charge.amountInr || charge.amount || ""}`} placeholder={charge.chargeType} disabled={readOnly} onChange={(event) => updateInvoiceCharge(index, chargeIndex, { amount: event.target.value.replace(/^.*: /, "") })} />)}<WorkspaceInput value={invoice.assessableValueInr} placeholder="Assessable INR" inputMode="decimal" disabled={readOnly} onChange={(event) => updateInvoice(index, { assessableValueInr: event.target.value })} /></Stacked></td>
                  <td><Button type="button" size="sm" variant="outline" disabled={readOnly} onClick={() => removeInvoice(index)}><Trash2 size={14} aria-hidden="true" /></Button></td>
                </tr>
              ))}
            </tbody>
          </ChaTable>
        </CustomsLineItemTable>
      </RemainingSection>
    );
  }

  if (activeSubtab === "item-details") {
    return (
      <RemainingSection title="Import Item Details" state={saveState} readOnly={readOnly} dirty={dirtyTab === "remaining"} onSave={() => void saveDraft("remaining")}>
        <WorkspaceAlert variant="info"><Check size={16} aria-hidden="true" /><span>Item fields are limited to the approved transaction schema and existing customs master lookup contracts until an official BE item schema is supplied.</span></WorkspaceAlert>
        <SimpleRowsTable
          title="Invoice-linked items"
          actionLabel="New item"
          readOnly={readOnly}
          rows={remaining.items}
          columns={["Serial", "Invoice", "RITC/CTH", "Description", "Qty/UOM", "Value", "Duty snapshot", "Actions"]}
          onAdd={() => {
            setRemaining((current) => ({ ...current, items: [...current.items, { sequenceNo: current.items.length + 1, invoiceSequenceNo: current.invoices[0]?.sequenceNo ?? null, ritcNo: "", itemDescription: "", schemeCode: "", quantity: "", unit: "", unitPrice: "", per: "", itemAmount: "", itemAmountInr: "", assessableValue: "", totalPmv: "", endUse: "", countryOfOrigin: "", notificationNo: "", notificationSerialNo: "", notificationSubSerialNo: "", bcdRate: "", aidcRate: "", cessRate: "", otherDutyText: "", bondCode: "", licenseNo: "" }] }));
            markRemainingDirty();
          }}
          render={(item, index) => [
            item.sequenceNo,
            <WorkspaceInput key="invoice" value={item.invoiceSequenceNo ?? ""} inputMode="numeric" disabled={readOnly} onChange={(event) => updateItem(index, { invoiceSequenceNo: Number(event.target.value) || null })} />,
            <Stacked key="ritc"><WorkspaceInput value={item.ritcNo} placeholder="RITC/CTH" disabled={readOnly} onChange={(event) => updateItem(index, { ritcNo: event.target.value })} /><WorkspaceInput value={item.schemeCode} placeholder="Scheme/Bond" disabled={readOnly} onChange={(event) => updateItem(index, { schemeCode: event.target.value })} /></Stacked>,
            <WorkspaceTextarea key="desc" value={item.itemDescription} disabled={readOnly} onChange={(event) => updateItem(index, { itemDescription: event.target.value })} />,
            <Stacked key="qty"><WorkspaceInput value={item.quantity} placeholder="Quantity" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { quantity: event.target.value })} /><WorkspaceInput value={item.unit} placeholder="UOM" disabled={readOnly} onChange={(event) => updateItem(index, { unit: event.target.value })} /></Stacked>,
            <Stacked key="value"><WorkspaceInput value={item.unitPrice} placeholder="Unit price" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { unitPrice: event.target.value })} /><WorkspaceInput value={item.itemAmountInr} placeholder="INR" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { itemAmountInr: event.target.value })} /></Stacked>,
            <Stacked key="duty"><WorkspaceInput value={item.notificationNo} placeholder="Notification" disabled={readOnly} onChange={(event) => updateItem(index, { notificationNo: event.target.value })} /><WorkspaceInput value={item.bcdRate} placeholder="BCD %" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { bcdRate: event.target.value })} /><WorkspaceInput value={item.aidcRate} placeholder="AIDC %" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { aidcRate: event.target.value })} /><WorkspaceInput value={item.cessRate} placeholder="Cess %" inputMode="decimal" disabled={readOnly} onChange={(event) => updateItem(index, { cessRate: event.target.value })} /></Stacked>,
            <Button key="remove" type="button" size="sm" variant="outline" disabled={readOnly} onClick={() => removeItem(index)}><Trash2 size={14} aria-hidden="true" /></Button>,
          ]}
        />
      </RemainingSection>
    );
  }

  if (activeSubtab === "declaration") {
    return (
      <RemainingSection title="Declaration" state={saveState} readOnly={readOnly} dirty={dirtyTab === "remaining"} onSave={() => void saveDraft("remaining")}>
        <SimpleRowsTable
          title="Declaration rows"
          actionLabel="Add declaration"
          readOnly={readOnly}
          rows={remaining.declarations}
          columns={["Serial", "Statement", "Declaration", "Date", "Invoice/Item", "Actions"]}
          onAdd={() => {
            setRemaining((current) => ({ ...current, declarations: [...current.declarations, { sequenceNo: current.declarations.length + 1, statementType: "", statementCode: "", statementText: "", declarationType: "", declarationNo: "", declarationDate: "", invoiceSequenceNo: null, itemSequenceNo: null }] }));
            markRemainingDirty();
          }}
          render={(row, index) => [
            row.sequenceNo,
            <Stacked key="statement"><WorkspaceInput value={row.statementType} placeholder="Type" disabled={readOnly} onChange={(event) => updateDeclaration(index, { statementType: event.target.value })} /><WorkspaceInput value={row.statementCode} placeholder="Code" disabled={readOnly} onChange={(event) => updateDeclaration(index, { statementCode: event.target.value })} /><WorkspaceTextarea value={row.statementText} placeholder="Text" disabled={readOnly} onChange={(event) => updateDeclaration(index, { statementText: event.target.value })} /></Stacked>,
            <Stacked key="declaration"><WorkspaceInput value={row.declarationType} placeholder="Type" disabled={readOnly} onChange={(event) => updateDeclaration(index, { declarationType: event.target.value })} /><WorkspaceInput value={row.declarationNo} placeholder="No" disabled={readOnly} onChange={(event) => updateDeclaration(index, { declarationNo: event.target.value })} /></Stacked>,
            <WorkspaceInput key="date" type="date" value={row.declarationDate} disabled={readOnly} onChange={(event) => updateDeclaration(index, { declarationDate: event.target.value })} />,
            <Stacked key="refs"><WorkspaceInput value={row.invoiceSequenceNo ?? ""} placeholder="Invoice Sl No" inputMode="numeric" disabled={readOnly} onChange={(event) => updateDeclaration(index, { invoiceSequenceNo: Number(event.target.value) || null })} /><WorkspaceInput value={row.itemSequenceNo ?? ""} placeholder="Item Sl No" inputMode="numeric" disabled={readOnly} onChange={(event) => updateDeclaration(index, { itemSequenceNo: Number(event.target.value) || null })} /></Stacked>,
            <Button key="remove" type="button" size="sm" variant="outline" disabled={readOnly} onClick={() => removeDeclaration(index)}><Trash2 size={14} aria-hidden="true" /></Button>,
          ]}
        />
      </RemainingSection>
    );
  }

  if (activeSubtab === "supporting-documents") {
    return (
      <RemainingSection title="Supporting Documents" state={saveState} readOnly={readOnly} dirty={dirtyTab === "remaining"} onSave={() => void saveDraft("remaining")}>
        <WorkspaceAlert variant="info"><Check size={16} aria-hidden="true" /><span>Rows link to existing CHA document versions by ID; file blobs stay in the job document store.</span></WorkspaceAlert>
        <SimpleRowsTable
          title="Customs document metadata"
          actionLabel="Add document row"
          readOnly={readOnly}
          rows={remaining.supportingDocuments}
          columns={["Serial", "Document", "IRN/DRN", "Dates", "References", "Existing upload", "Actions"]}
          onAdd={() => {
            setRemaining((current) => ({ ...current, supportingDocuments: [...current.supportingDocuments, { sequenceNo: current.supportingDocuments.length + 1, documentCode: "", documentNameSnapshot: "", irnNo: "", drnNo: "", issueDate: "", expiryDate: "", declarationType: "", fileType: "", placeOfIssue: "", invoiceSequenceNo: null, itemSequenceNo: null, icegateIdSnapshot: "", documentVersionId: "", issuingPartyText: "" }] }));
            markRemainingDirty();
          }}
          render={(row, index) => [
            row.sequenceNo,
            <Stacked key="doc"><WorkspaceInput value={row.documentCode} placeholder="Code" disabled={readOnly} onChange={(event) => updateDocument(index, { documentCode: event.target.value })} /><WorkspaceInput value={row.documentNameSnapshot} placeholder="Description/name" disabled={readOnly} onChange={(event) => updateDocument(index, { documentNameSnapshot: event.target.value })} /></Stacked>,
            <Stacked key="irn"><WorkspaceInput value={row.irnNo} placeholder="IRN" disabled={readOnly} onChange={(event) => updateDocument(index, { irnNo: event.target.value })} /><WorkspaceInput value={row.drnNo} placeholder="DRN" disabled={readOnly} onChange={(event) => updateDocument(index, { drnNo: event.target.value })} /></Stacked>,
            <Stacked key="dates"><WorkspaceInput type="date" value={row.issueDate} disabled={readOnly} onChange={(event) => updateDocument(index, { issueDate: event.target.value })} /><WorkspaceInput type="date" value={row.expiryDate} disabled={readOnly} onChange={(event) => updateDocument(index, { expiryDate: event.target.value })} /></Stacked>,
            <Stacked key="refs"><WorkspaceInput value={row.invoiceSequenceNo ?? ""} placeholder="Invoice Sl No" inputMode="numeric" disabled={readOnly} onChange={(event) => updateDocument(index, { invoiceSequenceNo: Number(event.target.value) || null })} /><WorkspaceInput value={row.itemSequenceNo ?? ""} placeholder="Item Sl No" inputMode="numeric" disabled={readOnly} onChange={(event) => updateDocument(index, { itemSequenceNo: Number(event.target.value) || null })} /></Stacked>,
            <Stacked key="upload"><WorkspaceInput value={row.documentVersionId} placeholder="ChaDocumentVersion ID" disabled={readOnly} onChange={(event) => updateDocument(index, { documentVersionId: event.target.value })} /><WorkspaceInput value={row.icegateIdSnapshot} placeholder="ICEGATE profile" disabled={readOnly} onChange={(event) => updateDocument(index, { icegateIdSnapshot: event.target.value })} /></Stacked>,
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
        description="Versioned customs filing snapshot that reuses the existing CHA checklist approval workflow for review."
        validation={draft.checklist.validation}
        rows={draft.checklist.generations.map((row) => [row.versionNo, row.status, row.checksum ?? "Pending", row.generatedAt, row.checklistId ?? "Existing approval link pending"])}
        actionLabel="Generate checklist snapshot"
        onGenerate={async () => {
          const response = await generateImportChecklistSnapshotAction(job.id, lockVersion);
          if (!response.ok) {
            setSaveError(response.error);
            if (response.code === "CONCURRENCY_CONFLICT") setConflictOpen(true);
            return;
          }
          router.refresh();
        }}
        readOnly={readOnly}
      />
    );
  }

  if (activeSubtab === "flat-file") {
    return (
      <ArtifactSection
        title="Flat File"
        description="Deterministic Bill of Entry fixture generated from the current validated draft snapshot. Live submission remains off."
        validation={draft.flatFile.validation}
        rows={draft.flatFile.generations.map((row) => [row.versionNo, row.status, row.contentHash, row.generatedAt, row.fileName ?? "Download metadata"])}
        actionLabel="Generate flat file"
        onGenerate={async () => {
          const response = await generateImportFlatFileSnapshotAction(job.id, lockVersion);
          if (!response.ok) {
            setSaveError(response.error);
            if (response.code === "CONCURRENCY_CONFLICT") setConflictOpen(true);
            return;
          }
          router.refresh();
        }}
        readOnly={readOnly}
      />
    );
  }

  return null;

  function updateInvoice(index: number, patch: Partial<typeof remaining.invoices[number]>) {
    setRemaining((current) => ({ ...current, invoices: current.invoices.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) }));
    markRemainingDirty();
  }
  function updateInvoiceCharge(index: number, chargeIndex: number, patch: Partial<typeof remaining.invoices[number]["charges"][number]>) {
    setRemaining((current) => ({ ...current, invoices: current.invoices.map((row, rowIndex) => rowIndex === index ? { ...row, charges: row.charges.map((charge, currentChargeIndex) => currentChargeIndex === chargeIndex ? { ...charge, ...patch } : charge) } : row) }));
    markRemainingDirty();
  }
  function removeInvoice(index: number) {
    setRemaining((current) => ({ ...current, invoices: current.invoices.filter((_, rowIndex) => rowIndex !== index).map((row, rowIndex) => ({ ...row, sequenceNo: rowIndex + 1 })) }));
    markRemainingDirty();
  }
  function updateItem(index: number, patch: Partial<typeof remaining.items[number]>) {
    setRemaining((current) => ({ ...current, items: current.items.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) }));
    markRemainingDirty();
  }
  function removeItem(index: number) {
    setRemaining((current) => ({ ...current, items: current.items.filter((_, rowIndex) => rowIndex !== index).map((row, rowIndex) => ({ ...row, sequenceNo: rowIndex + 1 })) }));
    markRemainingDirty();
  }
  function updateDeclaration(index: number, patch: Partial<typeof remaining.declarations[number]>) {
    setRemaining((current) => ({ ...current, declarations: current.declarations.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row) }));
    markRemainingDirty();
  }
  function removeDeclaration(index: number) {
    setRemaining((current) => ({ ...current, declarations: current.declarations.filter((_, rowIndex) => rowIndex !== index).map((row, rowIndex) => ({ ...row, sequenceNo: rowIndex + 1 })) }));
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

function RemainingSection({
  children,
  dirty,
  onSave,
  readOnly,
  state,
  title,
}: {
  children: React.ReactNode;
  dirty: boolean;
  onSave: () => void;
  readOnly: boolean;
  state: CustomsSaveState;
  title: string;
}) {
  return (
    <div className="space-y-4">
      <CustomsDirtyStateWarning active={dirty} />
      <CustomsFilingSection
        title={title}
        description="Import filing draft rows are persisted under the existing CHA job aggregate."
        readonly={readOnly}
        actions={<ToolbarSave state={state} onSave={onSave} disabled={readOnly} />}
      >
        {children}
      </CustomsFilingSection>
    </div>
  );
}

function Stacked({ children }: { children: React.ReactNode }) {
  return <div className="grid min-w-48 gap-2">{children}</div>;
}

function defaultInvoiceCharges() {
  return ["MISCELLANEOUS", "FREIGHT", "INSURANCE", "AGENCY", "LOADING", "DISCOUNT", "HIGH_SEA_SALE"].map((chargeType, index) => ({
    sequenceNo: index + 1,
    chargeType,
    currency: "",
    exchangeRate: "",
    rate: "",
    amount: "",
    amountInr: "",
    isActual: false,
  }));
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
  description,
  onGenerate,
  readOnly,
  rows,
  title,
  validation,
}: {
  actionLabel: string;
  description: string;
  onGenerate: () => Promise<void>;
  readOnly: boolean;
  rows: Array<Array<React.ReactNode>>;
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
        </div>
      }
    >
      {validation.length ? (
        <WorkspaceAlert variant="warning">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{validation.length} validation item(s) must be reviewed before approval/submission.</span>
        </WorkspaceAlert>
      ) : (
        <WorkspaceAlert variant="success">
          <Check size={16} aria-hidden="true" />
          <span>Current import filing snapshot has no blocking validation messages.</span>
        </WorkspaceAlert>
      )}
      <CustomsLineItemTable title={`${title} history`}>
        <ChaTable>
          <thead><tr><th>Version</th><th>Status</th><th>Hash / Checksum</th><th>Generated At</th><th>Reference</th></tr></thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={5}>No generated versions yet.</td></tr> : rows.map((row, index) => (
              <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </ChaTable>
      </CustomsLineItemTable>
    </CustomsFilingSection>
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

function TextField({
  disabled,
  id,
  inputMode,
  label,
  onChange,
  value,
}: {
  disabled?: boolean;
  id: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
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

function IgmRowsTable({
  onAdd,
  onRemove,
  onUpdate,
  readOnly,
  rows,
}: {
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, row: ImportIgmDraftView["billRows"][number]) => void;
  readOnly: boolean;
  rows: ImportIgmDraftView["billRows"];
}) {
  return (
    <CustomsLineItemTable
      title="IGM house/master bill rows"
      actions={
        <Button type="button" variant="outline" size="sm" onClick={onAdd} disabled={readOnly}>
          <Plus size={14} aria-hidden="true" />
          Add row
        </Button>
      }
    >
      <ChaTable>
        <thead>
          <tr>
            <th>Serial No</th>
            <th>MBL No/Date</th>
            <th>No MBL</th>
            <th>HBL No/Date</th>
            <th>No. of Packages</th>
            <th>Package Code</th>
            <th>Gross Weight</th>
            <th>Net Weight</th>
            <th>UOM</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.sequenceNo}>
              <td>{row.sequenceNo}</td>
              <td>
                <div className="grid gap-2">
                  <WorkspaceInput id={`import-igm-row-${index}-mblNo`} value={row.mblNo} onChange={(event) => onUpdate(index, { ...row, mblNo: event.target.value })} disabled={readOnly || row.noMbl} />
                  <WorkspaceInput type="date" value={row.mblDate} onChange={(event) => onUpdate(index, { ...row, mblDate: event.target.value })} disabled={readOnly || row.noMbl} />
                </div>
              </td>
              <td><WorkspaceCheckbox checked={row.noMbl} onChange={(event) => onUpdate(index, { ...row, noMbl: event.target.checked, mblNo: event.target.checked ? "" : row.mblNo, mblDate: event.target.checked ? "" : row.mblDate })} disabled={readOnly} label="No" /></td>
              <td>
                <div className="grid gap-2">
                  <WorkspaceInput id={`import-igm-row-${index}-hblNo`} value={row.hblNo} onChange={(event) => onUpdate(index, { ...row, hblNo: event.target.value })} disabled={readOnly} />
                  <WorkspaceInput type="date" value={row.hblDate} onChange={(event) => onUpdate(index, { ...row, hblDate: event.target.value })} disabled={readOnly} />
                </div>
              </td>
              <td><WorkspaceInput value={row.packageCount} inputMode="decimal" onChange={(event) => onUpdate(index, { ...row, packageCount: event.target.value })} disabled={readOnly} /></td>
              <td><WorkspaceInput value={row.packageCode} onChange={(event) => onUpdate(index, { ...row, packageCode: event.target.value })} disabled={readOnly} /></td>
              <td><WorkspaceInput value={row.grossWeight} inputMode="decimal" onChange={(event) => onUpdate(index, { ...row, grossWeight: event.target.value })} disabled={readOnly} /></td>
              <td><WorkspaceInput value={row.netWeight} inputMode="decimal" onChange={(event) => onUpdate(index, { ...row, netWeight: event.target.value })} disabled={readOnly} /></td>
              <td><WorkspaceInput value={row.uom} onChange={(event) => onUpdate(index, { ...row, uom: event.target.value })} disabled={readOnly} /></td>
              <td>
                <Button type="button" size="sm" variant="outline" onClick={() => onRemove(index)} disabled={readOnly || rows.length <= 1} aria-label="Remove IGM row">
                  <Trash2 size={14} aria-hidden="true" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </ChaTable>
    </CustomsLineItemTable>
  );
}

function ContainerRowsTable({
  onAdd,
  onRemove,
  onUpdate,
  readOnly,
  rows,
}: {
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, row: ImportIgmDraftView["containers"][number]) => void;
  readOnly: boolean;
  rows: ImportIgmDraftView["containers"];
}) {
  return (
    <CustomsLineItemTable
      title="Container Details"
      actions={
        <Button type="button" variant="outline" size="sm" onClick={onAdd} disabled={readOnly}>
          <Plus size={14} aria-hidden="true" />
          Add container
        </Button>
      }
    >
      <ChaTable>
        <thead>
          <tr>
            <th>Serial No</th>
            <th>Container No</th>
            <th>Size</th>
            <th>Seal No</th>
            <th>Packages</th>
            <th>Gross Weight</th>
            <th>Net Weight</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={8}>No container rows yet.</td></tr>
          ) : rows.map((row, index) => (
            <tr key={row.sequenceNo}>
              <td>{row.sequenceNo}</td>
              <td><WorkspaceInput value={row.containerNo} onChange={(event) => onUpdate(index, { ...row, containerNo: event.target.value })} disabled={readOnly} /></td>
              <td>
                <WorkspaceSelect value={row.containerSize} onChange={(event) => onUpdate(index, { ...row, containerSize: event.target.value })} disabled={readOnly}>
                  <option value="">Select</option>
                  <option value="20FT">20 FT</option>
                  <option value="40FT">40 FT</option>
                  <option value="45FT">45 FT</option>
                </WorkspaceSelect>
              </td>
              <td><WorkspaceInput value={row.sealNo} onChange={(event) => onUpdate(index, { ...row, sealNo: event.target.value })} disabled={readOnly} /></td>
              <td><WorkspaceInput value={row.packageCount} inputMode="decimal" onChange={(event) => onUpdate(index, { ...row, packageCount: event.target.value })} disabled={readOnly} /></td>
              <td><WorkspaceInput value={row.grossWeight} inputMode="decimal" onChange={(event) => onUpdate(index, { ...row, grossWeight: event.target.value })} disabled={readOnly} /></td>
              <td><WorkspaceInput value={row.netWeight} inputMode="decimal" onChange={(event) => onUpdate(index, { ...row, netWeight: event.target.value })} disabled={readOnly} /></td>
              <td>
                <Button type="button" size="sm" variant="outline" onClick={() => onRemove(index)} disabled={readOnly} aria-label="Remove container row">
                  <Trash2 size={14} aria-hidden="true" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </ChaTable>
    </CustomsLineItemTable>
  );
}
