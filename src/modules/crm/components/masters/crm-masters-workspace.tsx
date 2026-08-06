"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, FileSpreadsheet, LoaderCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  CrmButton,
  CrmDialog,
  CrmEmptyTableRow,
  CrmField,
  CrmInput,
  CrmPanel,
  CrmSection,
  CrmSelect,
  CrmStatus,
  CrmTable,
  CrmTabs,
  CrmTextarea,
} from "@/modules/crm/components/workspace/crm-workspace";
import { ItemsListPage } from "@/modules/items/components/ItemsListPage";

type ImportLogStatus = "success" | "failed" | "skipped";
type MasterRecord = Record<string, string>;

type ImportLogEntry = {
  rowNumber: number;
  status: ImportLogStatus;
  remark: string;
};

type MasterImportRun = {
  fileName: string;
  completedAt: string;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  logs: ImportLogEntry[];
};

type StructuredMasterTab = {
  id: string;
  label: string;
  summary: string;
  description: string;
  focusAreas: string[];
  view: "structured";
  headings: readonly string[];
  badge: string;
  fileStem: string;
};

type ItemMasterTab = {
  id: string;
  label: string;
  summary: string;
  description: string;
  focusAreas: string[];
  view: "items";
};

type MasterTab = ItemMasterTab | StructuredMasterTab;

type PendingImport = {
  tabId: StructuredMasterTab["id"];
  fileName: string;
  rows: MasterRecord[];
  sourceHeaders: string[];
  mapping: Record<string, string>;
};

type ActiveImport = {
  tabId: StructuredMasterTab["id"];
  fileName: string;
  phase: "processing" | "complete";
  totalRows: number;
  processedRows: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  logs: ImportLogEntry[];
};

const AGENT_MASTER_HEADINGS = [
  "AG_ID",
  "Agent Code",
  "Agent Name",
  "Country",
  "Status",
  "Notes",
] as const;

const CHARGE_MASTER_HEADINGS = [
  "CHG_ID",
  "Charge Code",
  "Charge Description",
  "Charge Group",
  "Category",
  "Applicability",
  "Charge Type",
  "Unit",
  "HSN SAC Code",
  "NVOCC Flag",
  "Forwarding Flag",
  "Clearance Flag",
  "Transport Flag",
  "Air Cargo Flag",
  "Warehouse Flag",
  "Deposit Flag",
  "Order",
  "Valid From",
  "Valid To",
  "Status",
  "Notes",
  "Charge F Code",
  "Charge F Description",
] as const;

const PORT_MASTER_HEADINGS = [
  "PT_ID",
  "Port Code",
  "Port Name",
  "Country",
  "Status",
  "Port F Code",
  "Port F Name",
  "Sea Port",
  "Airport",
] as const;

const STATE_MASTER_HEADINGS = [
  "STM_ID",
  "State Code",
  "State GST Code",
  "State Name",
  "Country",
  "Status",
  "State Type",
] as const;

const TERMINAL_MASTER_HEADINGS = [
  "TR_ID",
  "Terminal Code",
  "Terminal Name",
  "Port",
  "Vendor Name",
  "Status",
] as const;

const VESSEL_MASTER_HEADINGS = [
  "VS_ID",
  "Vessel Name",
  "Vessel Call Sign",
  "Imo Number",
  "Vessel Owner",
  "Nationality",
  "Flag",
  "Vessel ID",
  "Status",
] as const;

const MASTER_TABS: MasterTab[] = [
  {
    id: "item-master",
    label: "Item Master",
    summary: "Maintain the shared CRM item register from the new Masters workspace.",
    description:
      "Use the existing item catalogue here so commercial, inventory, pricing, and logistics records remain reachable from the consolidated Masters area.",
    focusAreas: ["Item catalogue", "Pricing setup", "Inventory metadata"],
    view: "items",
  },
  {
    id: "agent-master",
    label: "Agent Master",
    summary: "Manage partner agents used across customer and logistics workflows.",
    description:
      "Centralize agent identities, operating locations, ownership, and onboarding readiness before they are referenced in downstream CRM work.",
    focusAreas: ["Agent profiles", "Branch coverage", "Commercial ownership"],
    view: "structured",
    headings: AGENT_MASTER_HEADINGS,
    badge: "Agent setup",
    fileStem: "agent-master",
  },
  {
    id: "charge-master",
    label: "Charge Master",
    summary: "Standardize commercial charge lines used in quotes and service work.",
    description:
      "Maintain the shared list of billable charges, charging logic, and reuse-ready commercial definitions for CRM operations.",
    focusAreas: ["Charge catalogue", "Pricing references", "Tax applicability"],
    view: "structured",
    headings: CHARGE_MASTER_HEADINGS,
    badge: "Charge setup",
    fileStem: "charge-master",
  },
  {
    id: "port-master",
    label: "Port Master",
    summary: "Keep shipping-port references aligned for sales and service workflows.",
    description:
      "Track port identities, geographies, and operating references so CRM records can consistently point to the right maritime locations.",
    focusAreas: ["Port codes", "Location mapping", "Route readiness"],
    view: "structured",
    headings: PORT_MASTER_HEADINGS,
    badge: "Port setup",
    fileStem: "port-master",
  },
  {
    id: "state-master",
    label: "State Master",
    summary: "Maintain shared state and regional references for CRM records.",
    description:
      "Control state-level reference data used by customer, vendor, and operational forms throughout the CRM workspace.",
    focusAreas: ["State registry", "Regional grouping", "Address standardization"],
    view: "structured",
    headings: STATE_MASTER_HEADINGS,
    badge: "State setup",
    fileStem: "state-master",
  },
  {
    id: "terminal-master",
    label: "Terminal Master",
    summary: "Coordinate terminal references tied to shipping and customs operations.",
    description:
      "Keep terminal identities, mapped ports, and operating references ready for reuse across CRM commercial and service flows.",
    focusAreas: ["Terminal directory", "Port linkage", "Operational notes"],
    view: "structured",
    headings: TERMINAL_MASTER_HEADINGS,
    badge: "Terminal setup",
    fileStem: "terminal-master",
  },
  {
    id: "vessel-master",
    label: "Vessel Master",
    summary: "Track vessel references used in customer-facing logistics workflows.",
    description:
      "Maintain reusable vessel records, service references, and supporting identifiers needed by CRM shipping activity.",
    focusAreas: ["Vessel profiles", "Carrier references", "Service identifiers"],
    view: "structured",
    headings: VESSEL_MASTER_HEADINGS,
    badge: "Vessel setup",
    fileStem: "vessel-master",
  },
];

function toNormalizedKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildEmptyRecord(headings: readonly string[]) {
  return Object.fromEntries(headings.map((heading) => [heading, ""])) as MasterRecord;
}

function chooseFieldControl(heading: string) {
  if (heading === "Status") return "status";
  if (heading.includes("Flag") || heading === "Sea Port" || heading === "Airport") return "flag";
  if (heading.includes("Valid From") || heading.includes("Valid To")) return "date";
  if (heading === "Notes") return "textarea";
  return "text";
}

function buildInitialMapping(headings: readonly string[], sourceHeaders: string[]) {
  const sourceLookup = new Map(sourceHeaders.map((header) => [toNormalizedKey(header), header]));
  return Object.fromEntries(
    headings.map((heading) => [heading, sourceLookup.get(toNormalizedKey(heading)) ?? ""]),
  ) as Record<string, string>;
}

async function parseSpreadsheet(file: File) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("The uploaded workbook does not contain any sheets.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const grid = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });

  if (grid.length === 0) {
    throw new Error("The uploaded workbook is empty.");
  }

  const sourceHeaders = (grid[0] ?? [])
    .map((cell) => String(cell ?? "").trim())
    .filter((header) => header.length > 0);

  if (sourceHeaders.length === 0) {
    throw new Error("The first row must contain column headings.");
  }

  const rows = grid
    .slice(1)
    .filter((row) => row.some((cell) => String(cell ?? "").trim().length > 0))
    .map((row) => {
      const mappedRow: MasterRecord = {};
      sourceHeaders.forEach((header, index) => {
        mappedRow[header] = String(row[index] ?? "").trim();
      });
      return mappedRow;
    });

  return { fileName: file.name, rows, sourceHeaders };
}

function downloadWorkbook(
  fileName: string,
  headings: readonly string[],
  rows: MasterRecord[],
  sheetName: string,
) {
  const sheetData = [
    [...headings],
    ...rows.map((row) => headings.map((heading) => row[heading] ?? "")),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  XLSX.writeFile(workbook, fileName);
}

export function CrmMastersWorkspace() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTabId = searchParams.get("tab");
  const uploadInputRef = React.useRef<HTMLInputElement | null>(null);

  const activeTab = MASTER_TABS.find((tab) => tab.id === requestedTabId) ?? MASTER_TABS[0];
  const activeStructuredTab = activeTab.view === "structured" ? activeTab : null;

  const [masterRecords, setMasterRecords] = React.useState<Record<string, MasterRecord[]>>(() =>
    Object.fromEntries(
      MASTER_TABS.filter((tab): tab is StructuredMasterTab => tab.view === "structured").map((tab) => [
        tab.id,
        [],
      ]),
    ),
  );
  const [pendingImport, setPendingImport] = React.useState<PendingImport | null>(null);
  const [activeImport, setActiveImport] = React.useState<ActiveImport | null>(null);
  const [lastImportRuns, setLastImportRuns] = React.useState<Record<string, MasterImportRun | null>>(
    () =>
      Object.fromEntries(
        MASTER_TABS.filter((tab): tab is StructuredMasterTab => tab.view === "structured").map((tab) => [
          tab.id,
          null,
        ]),
      ),
  );
  const [singleEntryTabId, setSingleEntryTabId] = React.useState<string | null>(null);
  const [singleEntryValues, setSingleEntryValues] = React.useState<MasterRecord>({});

  const handleTabChange = React.useCallback(
    (tabId: string) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("tab", tabId);
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleUploadClick = React.useCallback(() => {
    if (!activeStructuredTab) return;
    uploadInputRef.current?.click();
  }, [activeStructuredTab]);

  const handleUploadFileChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file || !activeStructuredTab) return;

      try {
        const parsed = await parseSpreadsheet(file);
        if (parsed.rows.length === 0) {
          toast.error("The uploaded workbook does not contain any data rows.");
          return;
        }

        setPendingImport({
          tabId: activeStructuredTab.id,
          fileName: parsed.fileName,
          rows: parsed.rows,
          sourceHeaders: parsed.sourceHeaders,
          mapping: buildInitialMapping(activeStructuredTab.headings, parsed.sourceHeaders),
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "The workbook could not be read.");
      }
    },
    [activeStructuredTab],
  );

  const updateMapping = React.useCallback((targetHeading: string, sourceHeading: string) => {
    setPendingImport((current) =>
      current
        ? {
            ...current,
            mapping: {
              ...current.mapping,
              [targetHeading]: sourceHeading,
            },
          }
        : current,
    );
  }, []);

  const closeMappingDialog = React.useCallback(() => {
    setPendingImport(null);
  }, []);

  const closeImportDialog = React.useCallback(() => {
    if (activeImport?.phase === "processing") return;
    setActiveImport(null);
  }, [activeImport]);

  const openSingleEntryDialog = React.useCallback(() => {
    if (!activeStructuredTab) return;
    setSingleEntryTabId(activeStructuredTab.id);
    setSingleEntryValues(buildEmptyRecord(activeStructuredTab.headings));
  }, [activeStructuredTab]);

  const closeSingleEntryDialog = React.useCallback(() => {
    setSingleEntryTabId(null);
    setSingleEntryValues({});
  }, []);

  const handleSingleEntryValueChange = React.useCallback((heading: string, value: string) => {
    setSingleEntryValues((current) => ({
      ...current,
      [heading]: value,
    }));
  }, []);

  const runImport = React.useCallback(async () => {
    if (!pendingImport) return;

    const tab = MASTER_TABS.find(
      (entry): entry is StructuredMasterTab =>
        entry.id === pendingImport.tabId && entry.view === "structured",
    );

    if (!tab) return;

    const mappedHeadings = tab.headings.filter((heading) => pendingImport.mapping[heading]);
    if (mappedHeadings.length === 0) {
      toast.error("Map at least one target field before proceeding.");
      return;
    }

    const existingRecords = masterRecords[tab.id] ?? [];
    const identifierHeading = tab.headings[0];
    const seenIdentifiers = new Set(
      existingRecords
        .map((record) => toNormalizedKey(record[identifierHeading] ?? ""))
        .filter((value) => value.length > 0),
    );

    setPendingImport(null);
    setActiveImport({
      tabId: tab.id,
      fileName: pendingImport.fileName,
      phase: "processing",
      totalRows: pendingImport.rows.length,
      processedRows: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      logs: [],
    });

    const successfulRecords: MasterRecord[] = [];
    const logs: ImportLogEntry[] = [];
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (let index = 0; index < pendingImport.rows.length; index += 1) {
      const sourceRow = pendingImport.rows[index];
      const mappedRecord = buildEmptyRecord(tab.headings);

      tab.headings.forEach((heading) => {
        const sourceHeading = pendingImport.mapping[heading];
        mappedRecord[heading] = sourceHeading ? (sourceRow[sourceHeading] ?? "").trim() : "";
      });

      const populatedValues = tab.headings.filter((heading) => mappedRecord[heading]?.trim().length > 0);
      const identifierValue = mappedRecord[identifierHeading]?.trim() ?? "";
      const normalizedIdentifier = toNormalizedKey(identifierValue);

      let status: ImportLogStatus;
      let remark: string;

      if (populatedValues.length === 0) {
        status = "skipped";
        skippedCount += 1;
        remark = "Skipped because the mapped row did not contain any values.";
      } else if (!identifierValue) {
        status = "failed";
        failedCount += 1;
        remark = `Failed because ${identifierHeading} is required.`;
      } else if (seenIdentifiers.has(normalizedIdentifier)) {
        status = "skipped";
        skippedCount += 1;
        remark = `Skipped because ${identifierHeading} ${identifierValue} already exists.`;
      } else {
        status = "success";
        successCount += 1;
        remark = "Imported successfully.";
        seenIdentifiers.add(normalizedIdentifier);
        successfulRecords.push(mappedRecord);
      }

      logs.push({
        rowNumber: index + 2,
        status,
        remark,
      });

      setActiveImport({
        tabId: tab.id,
        fileName: pendingImport.fileName,
        phase: "processing",
        totalRows: pendingImport.rows.length,
        processedRows: index + 1,
        successCount,
        failedCount,
        skippedCount,
        logs: [...logs],
      });

      await new Promise((resolve) => {
        window.setTimeout(resolve, 45);
      });
    }

    if (successfulRecords.length > 0) {
      setMasterRecords((current) => ({
        ...current,
        [tab.id]: [...(current[tab.id] ?? []), ...successfulRecords],
      }));
    }

    const completedRun: MasterImportRun = {
      fileName: pendingImport.fileName,
      completedAt: new Date().toISOString(),
      successCount,
      failedCount,
      skippedCount,
      logs,
    };

    setLastImportRuns((current) => ({
      ...current,
      [tab.id]: completedRun,
    }));

    setActiveImport({
      tabId: tab.id,
      fileName: pendingImport.fileName,
      phase: "complete",
      totalRows: pendingImport.rows.length,
      processedRows: pendingImport.rows.length,
      successCount,
      failedCount,
      skippedCount,
      logs,
    });
  }, [masterRecords, pendingImport]);

  const saveSingleEntry = React.useCallback(() => {
    if (!activeStructuredTab || singleEntryTabId !== activeStructuredTab.id) return;

    const headings = activeStructuredTab.headings;
    const identifierHeading = headings[0];
    const nextRecord = buildEmptyRecord(headings);

    headings.forEach((heading) => {
      nextRecord[heading] = (singleEntryValues[heading] ?? "").trim();
    });

    if (headings.every((heading) => nextRecord[heading].length === 0)) {
      toast.error("Add at least one value before saving the entry.");
      return;
    }

    if (!nextRecord[identifierHeading]) {
      toast.error(`${identifierHeading} is required.`);
      return;
    }

    const currentRecords = masterRecords[activeStructuredTab.id] ?? [];
    const duplicate = currentRecords.some(
      (record) =>
        toNormalizedKey(record[identifierHeading] ?? "") ===
        toNormalizedKey(nextRecord[identifierHeading] ?? ""),
    );

    if (duplicate) {
      toast.error(`${identifierHeading} ${nextRecord[identifierHeading]} already exists.`);
      return;
    }

    setMasterRecords((current) => ({
      ...current,
      [activeStructuredTab.id]: [...(current[activeStructuredTab.id] ?? []), nextRecord],
    }));

    toast.success(`${activeStructuredTab.label} entry added.`);
    closeSingleEntryDialog();
  }, [activeStructuredTab, closeSingleEntryDialog, masterRecords, singleEntryTabId, singleEntryValues]);

  const downloadTemplate = React.useCallback(() => {
    if (!activeStructuredTab) return;
    downloadWorkbook(
      `${activeStructuredTab.fileStem}-template.xlsx`,
      activeStructuredTab.headings,
      [],
      activeStructuredTab.label,
    );
    toast.success(`${activeStructuredTab.label} template downloaded.`);
  }, [activeStructuredTab]);

  const exportRecords = React.useCallback(() => {
    if (!activeStructuredTab) return;
    downloadWorkbook(
      `${activeStructuredTab.fileStem}-export.xlsx`,
      activeStructuredTab.headings,
      masterRecords[activeStructuredTab.id] ?? [],
      activeStructuredTab.label,
    );
    toast.success(`${activeStructuredTab.label} export downloaded.`);
  }, [activeStructuredTab, masterRecords]);

  const currentRecords =
    activeStructuredTab && activeTab.view === "structured" ? masterRecords[activeStructuredTab.id] ?? [] : [];
  const currentImportRun =
    activeStructuredTab && activeTab.view === "structured" ? lastImportRuns[activeStructuredTab.id] : null;

  return (
    <>
      <CrmSection
        title="Master workspaces"
        description="Switch between the CRM master-data areas used by commercial, relationship, and operational records."
      >
        <CrmTabs aria-label="CRM masters tabs">
          {MASTER_TABS.map((tab) => {
            const isActive = tab.id === activeTab.id;

            return (
              <CrmButton
                key={tab.id}
                id={`${tab.id}-tab`}
                role="tab"
                type="button"
                variant={isActive ? "primary" : "secondary"}
                aria-selected={isActive}
                aria-controls={`${tab.id}-panel`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
              </CrmButton>
            );
          })}
        </CrmTabs>

        {activeTab.view === "items" ? (
          <div
            id={`${activeTab.id}-panel`}
            role="tabpanel"
            aria-labelledby={`${activeTab.id}-tab`}
            className="mnx-crm-masters-embedded-workspace"
          >
            <ItemsListPage basePath="/crm/items" />
          </div>
        ) : (
          <CrmPanel
            id={`${activeTab.id}-panel`}
            role="tabpanel"
            aria-labelledby={`${activeTab.id}-tab`}
            className="mnx-crm-panel-surface mnx-crm-masters-panel"
          >
            <div className="mnx-crm-masters-panel-copy">
              <div className="mnx-crm-masters-panel-copy-block">
                <CrmStatus variant="success">{activeTab.badge}</CrmStatus>
                <div className="mnx-crm-masters-panel-copy-stack">
                  <h3>{activeTab.label}</h3>
                  <p>{activeTab.summary}</p>
                  <p>{activeTab.description}</p>
                </div>
              </div>

              <div className="mnx-crm-masters-action-row">
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  hidden
                  onChange={handleUploadFileChange}
                />
                <CrmButton type="button" variant="secondary" onClick={handleUploadClick}>
                  <FileSpreadsheet aria-hidden="true" />
                  Bulk Upload Excel
                </CrmButton>
                <CrmButton type="button" variant="secondary" onClick={downloadTemplate}>
                  Download Template
                </CrmButton>
                <CrmButton type="button" variant="secondary" onClick={exportRecords}>
                  Export
                </CrmButton>
                <CrmButton type="button" variant="secondary" onClick={openSingleEntryDialog}>
                  <Plus aria-hidden="true" />
                  Add Entry
                </CrmButton>
              </div>
            </div>

            <div className="mnx-crm-masters-table-wrap">
              <CrmTable className="mnx-crm-masters-table">
                <thead>
                  <tr>
                    {activeTab.headings.map((heading) => (
                      <th key={heading} className="mnx-crm-masters-header-cell">
                        <span>{heading}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.length > 0 ? (
                    currentRecords.map((record, index) => (
                      <tr key={`${activeTab.id}-row-${index}`}>
                        {activeTab.headings.map((heading) => (
                          <td key={`${activeTab.id}-${index}-${heading}`} className="mnx-crm-masters-data-cell">
                            {record[heading] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <CrmEmptyTableRow colSpan={activeTab.headings.length}>
                      No records yet. Add a single entry or bulk upload an Excel file to populate this master.
                    </CrmEmptyTableRow>
                  )}
                </tbody>
              </CrmTable>
            </div>

            {currentImportRun ? (
              <div className="mnx-crm-masters-import-summary">
                <div className="mnx-crm-masters-import-summary-header">
                  <div>
                    <h4>Last import run</h4>
                    <p>
                      {currentImportRun.fileName} completed on{" "}
                      {new Date(currentImportRun.completedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mnx-crm-masters-result-grid">
                  <div className="mnx-crm-masters-result-card is-success">
                    <strong>{currentImportRun.successCount}</strong>
                    <span>Success</span>
                  </div>
                  <div className="mnx-crm-masters-result-card is-warning">
                    <strong>{currentImportRun.skippedCount}</strong>
                    <span>Skipped</span>
                  </div>
                  <div className="mnx-crm-masters-result-card is-danger">
                    <strong>{currentImportRun.failedCount}</strong>
                    <span>Failed</span>
                  </div>
                </div>

                <div className="mnx-crm-masters-log-wrap">
                  <CrmTable className="mnx-crm-masters-log-table">
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Status</th>
                        <th>Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentImportRun.logs.map((log) => (
                        <tr key={`${currentImportRun.fileName}-${log.rowNumber}-${log.status}`}>
                          <td>{log.rowNumber}</td>
                          <td>
                            <span className={`mnx-crm-masters-log-badge is-${log.status}`}>
                              {log.status}
                            </span>
                          </td>
                          <td>{log.remark}</td>
                        </tr>
                      ))}
                    </tbody>
                  </CrmTable>
                </div>
              </div>
            ) : null}
          </CrmPanel>
        )}
      </CrmSection>

      {pendingImport && activeStructuredTab ? (
        <CrmDialog
          open
          onClose={closeMappingDialog}
          title={`${activeStructuredTab.label} field mapping`}
          description={`Map the uploaded workbook columns from ${pendingImport.fileName} before starting the import.`}
          size="workspace"
          footer={
            <div className="mnx-crm-masters-dialog-footer">
              <CrmButton type="button" variant="secondary" onClick={closeMappingDialog}>
                Cancel
              </CrmButton>
              <CrmButton type="button" variant="primary" onClick={() => void runImport()}>
                Start Import
              </CrmButton>
            </div>
          }
        >
          <div className="mnx-crm-masters-upload-meta">
            <div>
              <strong>Uploaded file</strong>
              <span>{pendingImport.fileName}</span>
            </div>
            <div>
              <strong>Rows detected</strong>
              <span>{pendingImport.rows.length}</span>
            </div>
            <div>
              <strong>Source columns</strong>
              <span>{pendingImport.sourceHeaders.length}</span>
            </div>
          </div>

          <div className="mnx-crm-masters-mapping-grid">
            {activeStructuredTab.headings.map((heading) => (
              <CrmField key={heading} label={heading}>
                <CrmSelect
                  value={pendingImport.mapping[heading] ?? ""}
                  onChange={(event) => updateMapping(heading, event.target.value)}
                >
                  <option value="">Ignore this field</option>
                  {pendingImport.sourceHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </CrmSelect>
              </CrmField>
            ))}
          </div>
        </CrmDialog>
      ) : null}

      {activeImport ? (
        <CrmDialog
          open
          onClose={closeImportDialog}
          title={
            activeImport.phase === "processing"
              ? "Import in progress"
              : `${MASTER_TABS.find((tab) => tab.id === activeImport.tabId)?.label ?? "Master"} import results`
          }
          description={
            activeImport.phase === "processing"
              ? "Rows are being validated and imported now."
              : "Review the completed import summary and row-level remarks."
          }
          size="workspace"
          footer={
            <div className="mnx-crm-masters-dialog-footer">
              <CrmButton
                type="button"
                variant={activeImport.phase === "processing" ? "secondary" : "primary"}
                onClick={closeImportDialog}
                disabled={activeImport.phase === "processing"}
              >
                {activeImport.phase === "processing" ? "Import Running..." : "Close"}
              </CrmButton>
            </div>
          }
        >
          <div className="mnx-crm-masters-progress-shell">
            <div className="mnx-crm-masters-progress-copy">
              <div className="mnx-crm-masters-progress-title">
                {activeImport.phase === "processing" ? (
                  <LoaderCircle className="mnx-crm-masters-spinner" aria-hidden="true" />
                ) : (
                  <CheckCircle2 aria-hidden="true" />
                )}
                <strong>{activeImport.fileName}</strong>
              </div>
              <span>
                Processed {activeImport.processedRows} of {activeImport.totalRows} rows
              </span>
            </div>

            <div className="mnx-crm-masters-progress-bar" aria-hidden="true">
              <span
                style={{
                  width: `${Math.max(
                    6,
                    Math.round((activeImport.processedRows / Math.max(activeImport.totalRows, 1)) * 100),
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="mnx-crm-masters-result-grid">
            <div className="mnx-crm-masters-result-card is-success">
              <strong>{activeImport.successCount}</strong>
              <span>Success</span>
            </div>
            <div className="mnx-crm-masters-result-card is-warning">
              <strong>{activeImport.skippedCount}</strong>
              <span>Skipped</span>
            </div>
            <div className="mnx-crm-masters-result-card is-danger">
              <strong>{activeImport.failedCount}</strong>
              <span>Failed</span>
            </div>
          </div>

          <div className="mnx-crm-masters-log-wrap">
            <CrmTable className="mnx-crm-masters-log-table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Status</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {activeImport.logs.length > 0 ? (
                  activeImport.logs.map((log) => (
                    <tr key={`${activeImport.fileName}-${log.rowNumber}-${log.status}`}>
                      <td>{log.rowNumber}</td>
                      <td>
                        <span className={`mnx-crm-masters-log-badge is-${log.status}`}>{log.status}</span>
                      </td>
                      <td>{log.remark}</td>
                    </tr>
                  ))
                ) : (
                  <CrmEmptyTableRow colSpan={3}>
                    Waiting for the first rows to be processed.
                  </CrmEmptyTableRow>
                )}
              </tbody>
            </CrmTable>
          </div>
        </CrmDialog>
      ) : null}

      {singleEntryTabId && activeStructuredTab ? (
        <CrmDialog
          open
          onClose={closeSingleEntryDialog}
          title={`Add ${activeStructuredTab.label} entry`}
          description="Create one record manually for this master register."
          size="workspace"
          footer={
            <div className="mnx-crm-masters-dialog-footer">
              <CrmButton type="button" variant="secondary" onClick={closeSingleEntryDialog}>
                Cancel
              </CrmButton>
              <CrmButton type="button" variant="primary" onClick={saveSingleEntry}>
                Save Entry
              </CrmButton>
            </div>
          }
        >
          <div className="mnx-crm-masters-entry-grid">
            {activeStructuredTab.headings.map((heading) => {
              const control = chooseFieldControl(heading);

              if (control === "textarea") {
                return (
                  <CrmField key={heading} label={heading}>
                    <CrmTextarea
                      value={singleEntryValues[heading] ?? ""}
                      onChange={(event) => handleSingleEntryValueChange(heading, event.target.value)}
                    />
                  </CrmField>
                );
              }

              if (control === "status") {
                return (
                  <CrmField key={heading} label={heading}>
                    <CrmSelect
                      value={singleEntryValues[heading] ?? ""}
                      onChange={(event) => handleSingleEntryValueChange(heading, event.target.value)}
                    >
                      <option value="">Select status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </CrmSelect>
                  </CrmField>
                );
              }

              if (control === "flag") {
                return (
                  <CrmField key={heading} label={heading}>
                    <CrmSelect
                      value={singleEntryValues[heading] ?? ""}
                      onChange={(event) => handleSingleEntryValueChange(heading, event.target.value)}
                    >
                      <option value="">Select value</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </CrmSelect>
                  </CrmField>
                );
              }

              return (
                <CrmField key={heading} label={heading}>
                  <CrmInput
                    type={control === "date" ? "date" : "text"}
                    value={singleEntryValues[heading] ?? ""}
                    onChange={(event) => handleSingleEntryValueChange(heading, event.target.value)}
                  />
                </CrmField>
              );
            })}
          </div>
        </CrmDialog>
      ) : null}
    </>
  );
}
