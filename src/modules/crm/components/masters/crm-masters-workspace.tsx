"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Boxes,
  CheckCircle2,
  CircleAlert,
  FileSpreadsheet,
  LoaderCircle,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "@/modules/notifications/client";
import * as XLSX from "xlsx";
import { getAllItems } from "@/lib/items/item-store";
import { cn } from "@/lib/utils";
import {
  CrmButton,
  CrmDialog,
  CrmEmptyTableRow,
  CrmField,
  CrmInput,
  CrmMetric,
  CrmMetrics,
  CrmPanel,
  CrmSection,
  CrmSelect,
  CrmStatus,
  CrmTable,
  CrmTextarea,
} from "@/modules/crm/components/workspace/crm-workspace";
import { ItemsListPage } from "@/modules/items/components";

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

type MasterStatusFilter = "all" | "active" | "inactive" | "attention";

const MASTER_RECORDS_STORAGE_KEY = "crm_structured_master_records_v1";
const MASTER_IMPORT_RUNS_STORAGE_KEY = "crm_structured_master_import_runs_v1";

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

function getRelevantHeadings(headings: readonly string[]) {
  return headings.filter((heading) => heading !== "Notes");
}

function getRecordCompletionPercent(headings: readonly string[], record: MasterRecord) {
  const relevantHeadings = getRelevantHeadings(headings);
  if (relevantHeadings.length === 0) return 100;
  const completedFields = relevantHeadings.filter((heading) => (record[heading] ?? "").trim().length > 0).length;
  return Math.round((completedFields / relevantHeadings.length) * 100);
}

function isAttentionRecord(headings: readonly string[], record: MasterRecord) {
  const status = (record.Status ?? "").trim().toLowerCase();
  return status === "inactive" || getRecordCompletionPercent(headings, record) < 65;
}

function getRecordTitle(tab: StructuredMasterTab, record: MasterRecord) {
  const preferredHeadings = tab.headings.slice(1);
  return (
    preferredHeadings.map((heading) => record[heading]?.trim()).find((value) => value && value.length > 0) ??
    record[tab.headings[0]] ??
    "Untitled record"
  );
}

function getRecordSubtitle(tab: StructuredMasterTab, record: MasterRecord) {
  const metadata = tab.headings
    .filter((heading) => heading !== tab.headings[0] && heading !== "Notes")
    .map((heading) => record[heading]?.trim())
    .filter((value): value is string => Boolean(value))
    .slice(0, 2);
  return metadata.join(" · ");
}

function getStatusCount(records: MasterRecord[], expectedStatus: "active" | "inactive") {
  return records.filter((record) => (record.Status ?? "").trim().toLowerCase() === expectedStatus).length;
}

function getImportSuccessRate(run: MasterImportRun | null) {
  if (!run) return 0;
  const total = run.successCount + run.failedCount + run.skippedCount;
  if (total === 0) return 0;
  return Math.round((run.successCount / total) * 100);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "No imports yet";
  return new Date(value).toLocaleString("en-IN");
}

function readStoredJson<T>(storageKey: string, fallback: T) {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredJson<T>(storageKey: string, value: T) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // Ignore storage quota or serialization failures and keep the UI usable.
  }
}

function sanitizeMasterRecords(
  candidate: unknown,
  structuredTabs: StructuredMasterTab[],
): Record<string, MasterRecord[]> {
  const fallback = Object.fromEntries(structuredTabs.map((tab) => [tab.id, []])) as Record<string, MasterRecord[]>;

  if (!candidate || typeof candidate !== "object") {
    return fallback;
  }

  const source = candidate as Record<string, unknown>;

  return Object.fromEntries(
    structuredTabs.map((tab) => {
      const rawRecords = source[tab.id];
      if (!Array.isArray(rawRecords)) {
        return [tab.id, []];
      }

      const records = rawRecords
        .filter((record): record is Record<string, unknown> => Boolean(record) && typeof record === "object")
        .map((record) =>
          Object.fromEntries(
            tab.headings.map((heading) => [heading, String(record[heading] ?? "").trim()]),
          ) as MasterRecord,
        );

      return [tab.id, records];
    }),
  ) as Record<string, MasterRecord[]>;
}

function sanitizeImportRuns(
  candidate: unknown,
  structuredTabs: StructuredMasterTab[],
): Record<string, MasterImportRun | null> {
  const fallback = Object.fromEntries(structuredTabs.map((tab) => [tab.id, null])) as Record<
    string,
    MasterImportRun | null
  >;

  if (!candidate || typeof candidate !== "object") {
    return fallback;
  }

  const source = candidate as Record<string, unknown>;

  return Object.fromEntries(
    structuredTabs.map((tab) => {
      const rawRun = source[tab.id];

      if (!rawRun || typeof rawRun !== "object") {
        return [tab.id, null];
      }

      const run = rawRun as Record<string, unknown>;
      const rawLogs = Array.isArray(run.logs) ? run.logs : [];

      return [
        tab.id,
        {
          fileName: String(run.fileName ?? ""),
          completedAt: String(run.completedAt ?? ""),
          successCount: Number(run.successCount ?? 0),
          failedCount: Number(run.failedCount ?? 0),
          skippedCount: Number(run.skippedCount ?? 0),
          logs: rawLogs
            .filter((log): log is Record<string, unknown> => Boolean(log) && typeof log === "object")
            .map((log) => ({
              rowNumber: Number(log.rowNumber ?? 0),
              status:
                log.status === "success" || log.status === "failed" || log.status === "skipped"
                  ? log.status
                  : "failed",
              remark: String(log.remark ?? ""),
            })),
        } satisfies MasterImportRun,
      ];
    }),
  ) as Record<string, MasterImportRun | null>;
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
  const structuredTabs = React.useMemo(
    () => MASTER_TABS.filter((tab): tab is StructuredMasterTab => tab.view === "structured"),
    [],
  );
  const emptyStructuredRecords = React.useMemo(
    () => Object.fromEntries(structuredTabs.map((tab) => [tab.id, []])) as Record<string, MasterRecord[]>,
    [structuredTabs],
  );
  const emptyImportRuns = React.useMemo(
    () =>
      Object.fromEntries(structuredTabs.map((tab) => [tab.id, null])) as Record<string, MasterImportRun | null>,
    [structuredTabs],
  );

  const [masterRecords, setMasterRecords] = React.useState<Record<string, MasterRecord[]>>(() =>
    sanitizeMasterRecords(readStoredJson(MASTER_RECORDS_STORAGE_KEY, emptyStructuredRecords), structuredTabs),
  );
  const [pendingImport, setPendingImport] = React.useState<PendingImport | null>(null);
  const [activeImport, setActiveImport] = React.useState<ActiveImport | null>(null);
  const [lastImportRuns, setLastImportRuns] = React.useState<Record<string, MasterImportRun | null>>(
    () => sanitizeImportRuns(readStoredJson(MASTER_IMPORT_RUNS_STORAGE_KEY, emptyImportRuns), structuredTabs),
  );
  const [singleEntryTabId, setSingleEntryTabId] = React.useState<string | null>(null);
  const [singleEntryValues, setSingleEntryValues] = React.useState<MasterRecord>({});
  const [recordSearch, setRecordSearch] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(MASTER_TABS.map((tab) => [tab.id, ""])),
  );
  const [statusFilters, setStatusFilters] = React.useState<Record<string, MasterStatusFilter>>(() =>
    Object.fromEntries(MASTER_TABS.map((tab) => [tab.id, "all"])),
  );

  React.useEffect(() => {
    writeStoredJson(MASTER_RECORDS_STORAGE_KEY, masterRecords);
  }, [masterRecords]);

  React.useEffect(() => {
    writeStoredJson(MASTER_IMPORT_RUNS_STORAGE_KEY, lastImportRuns);
  }, [lastImportRuns]);

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

  const handleRecordSearchChange = React.useCallback((tabId: string, value: string) => {
    setRecordSearch((current) => ({
      ...current,
      [tabId]: value,
    }));
  }, []);

  const handleStatusFilterChange = React.useCallback((tabId: string, value: MasterStatusFilter) => {
    setStatusFilters((current) => ({
      ...current,
      [tabId]: value,
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
  const itemMasterCount = React.useMemo(() => getAllItems().length, []);
  const workspaceCounts = React.useMemo(
    () =>
      Object.fromEntries(
        MASTER_TABS.map((tab) => [
          tab.id,
          tab.view === "items" ? itemMasterCount : (masterRecords[tab.id] ?? []).length,
        ]),
      ),
    [itemMasterCount, masterRecords],
  );
  const totalStructuredRecords = React.useMemo(
    () => structuredTabs.reduce((sum, tab) => sum + (masterRecords[tab.id] ?? []).length, 0),
    [masterRecords, structuredTabs],
  );
  const readyStructuredMasters = React.useMemo(
    () => structuredTabs.filter((tab) => (masterRecords[tab.id] ?? []).length > 0).length,
    [masterRecords, structuredTabs],
  );
  const latestImportAt = React.useMemo(() => {
    const timestamps = Object.values(lastImportRuns)
      .flatMap((run) => (run?.completedAt ? [new Date(run.completedAt).getTime()] : []))
      .sort((left, right) => right - left);
    return timestamps[0] ? new Date(timestamps[0]).toISOString() : null;
  }, [lastImportRuns]);
  const activeSearch = recordSearch[activeTab.id] ?? "";
  const activeStatusFilter = statusFilters[activeTab.id] ?? "all";
  const filteredRecords =
    activeStructuredTab && activeTab.view === "structured"
      ? currentRecords.filter((record) => {
          const query = activeSearch.trim().toLowerCase();
          const searchableText = activeStructuredTab.headings
            .map((heading) => record[heading] ?? "")
            .join(" ")
            .toLowerCase();

          if (query && !searchableText.includes(query)) {
            return false;
          }

          if (activeStatusFilter === "active") {
            return (record.Status ?? "").trim().toLowerCase() === "active";
          }

          if (activeStatusFilter === "inactive") {
            return (record.Status ?? "").trim().toLowerCase() === "inactive";
          }

          if (activeStatusFilter === "attention") {
            return isAttentionRecord(activeStructuredTab.headings, record);
          }

          return true;
        })
      : [];
  const activeAttentionRecords =
    activeStructuredTab && activeTab.view === "structured"
      ? currentRecords.filter((record) => isAttentionRecord(activeStructuredTab.headings, record)).slice(0, 4)
      : [];
  const activeAverageCompletion =
    activeStructuredTab && activeTab.view === "structured" && currentRecords.length > 0
      ? Math.round(
          currentRecords.reduce(
            (sum, record) => sum + getRecordCompletionPercent(activeStructuredTab.headings, record),
            0,
          ) / currentRecords.length,
        )
      : 0;

  return (
    <>
      <CrmSection
        title="Master workspaces"
        description="Switch between the CRM master-data areas used by commercial, relationship, and operational records."
      >
        <CrmMetrics className="mnx-crm-masters-summary-strip">
          <CrmMetric
            icon={<Boxes aria-hidden="true" />}
            label="Structured masters"
            value={structuredTabs.length}
            detail={`${readyStructuredMasters} with records`}
          />
          <CrmMetric
            icon={<ShieldCheck aria-hidden="true" />}
            label="Managed records"
            value={totalStructuredRecords}
            detail="Across structured registers"
          />
          <CrmMetric
            icon={<CheckCircle2 aria-hidden="true" />}
            label="Item catalogue"
            value={itemMasterCount}
            detail="Embedded live item master"
          />
          <CrmMetric
            icon={<FileSpreadsheet aria-hidden="true" />}
            label="Latest import"
            value={latestImportAt ? "Tracked" : "Pending"}
            detail={formatDateTime(latestImportAt)}
          />
        </CrmMetrics>

        <div className="mnx-crm-masters-workspace-grid" role="tablist" aria-label="CRM masters tabs">
          {MASTER_TABS.map((tab) => {
            const isActive = tab.id === activeTab.id;
            const tabCount = workspaceCounts[tab.id] ?? 0;

            return (
              // eslint-disable-next-line no-restricted-syntax -- This is an intentional tab widget, not a form/action button.
              <button
                key={tab.id}
                id={`${tab.id}-tab`}
                role="tab"
                type="button"
                className={cn("mnx-crm-masters-workspace-card", isActive && "is-active")}
                aria-selected={isActive}
                aria-controls={`${tab.id}-panel`}
                onClick={() => handleTabChange(tab.id)}
              >
                <div className="mnx-crm-masters-workspace-card-topline">
                  <span>{tab.label}</span>
                  <strong>{tabCount}</strong>
                </div>
                <p>{tab.summary}</p>
                <div className="mnx-crm-masters-workspace-card-footer">
                  <small>{tab.view === "items" ? "Transaction-ready item register" : "Structured reference master"}</small>
                  <div className="mnx-crm-masters-tag-row">
                    {tab.focusAreas.slice(0, 2).map((focus) => (
                      <span key={`${tab.id}-${focus}`}>{focus}</span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {activeTab.view === "items" ? (
          <div
            id={`${activeTab.id}-panel`}
            role="tabpanel"
            aria-labelledby={`${activeTab.id}-tab`}
            className="mnx-crm-masters-embedded-workspace"
          >
            <CrmPanel className="mnx-crm-masters-panel mnx-crm-masters-item-shell">
              <div className="mnx-crm-masters-panel-copy">
                <div className="mnx-crm-masters-panel-copy-block">
                  <CrmStatus variant="success">Commercial item control</CrmStatus>
                  <div className="mnx-crm-masters-panel-copy-stack">
                    <h3>{activeTab.label}</h3>
                    <p>{activeTab.summary}</p>
                    <p>{activeTab.description}</p>
                  </div>
                </div>
              </div>

              <div className="mnx-crm-masters-governance-grid mnx-crm-masters-item-governance-grid">
                <div className="mnx-crm-masters-governance-card">
                  <span>Record scale</span>
                  <strong>{itemMasterCount} live items</strong>
                  <p>Use the embedded item workspace to manage pricing, HSN or SAC mapping, stock posture, and commercial readiness.</p>
                </div>
                <div className="mnx-crm-masters-governance-card">
                  <span>Operator posture</span>
                  <strong>Direct register control</strong>
                  <p>Filters, actions, and pagination stay available inside the catalogue so users can manage items without leaving Masters.</p>
                </div>
              </div>
            </CrmPanel>
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
                <CrmInput
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

            <div className="mnx-crm-masters-governance-grid">
              <div className="mnx-crm-masters-governance-card">
                <span>Coverage</span>
                <strong>{currentRecords.length} records</strong>
                <p>{getStatusCount(currentRecords, "active")} active and ready for downstream CRM references.</p>
              </div>
              <div className="mnx-crm-masters-governance-card">
                <span>Data quality</span>
                <strong>{activeAverageCompletion}% average completion</strong>
                <p>{activeAttentionRecords.length} records currently need attention because they are inactive or only partially filled.</p>
              </div>
              <div className="mnx-crm-masters-governance-card">
                <span>Import discipline</span>
                <strong>{getImportSuccessRate(currentImportRun)}% last success rate</strong>
                <p>{currentImportRun ? `${currentImportRun.fileName} on ${formatDateTime(currentImportRun.completedAt)}` : "No spreadsheet import has been completed for this master yet."}</p>
              </div>
            </div>

            <div className="mnx-crm-masters-ops-grid">
              <div className="mnx-crm-masters-ops-card">
                <div className="mnx-crm-masters-ops-card-header">
                  <div>
                    <span>Management workbench</span>
                    <h4>Control records without leaving the master</h4>
                  </div>
                </div>

                <div className="mnx-crm-masters-filter-row">
                  <label className="mnx-crm-masters-search-field" htmlFor={`${activeTab.id}-search`}>
                    <Search aria-hidden="true" />
                    <CrmInput
                      id={`${activeTab.id}-search`}
                      type="search"
                      value={activeSearch}
                      onChange={(event) => handleRecordSearchChange(activeTab.id, event.target.value)}
                      placeholder={`Search ${activeTab.label.toLowerCase()} records`}
                    />
                  </label>

                  <CrmField label="View">
                    <CrmSelect
                      value={activeStatusFilter}
                      onChange={(event) =>
                        handleStatusFilterChange(activeTab.id, event.target.value as MasterStatusFilter)
                      }
                    >
                      <option value="all">All records</option>
                      <option value="active">Active only</option>
                      <option value="inactive">Inactive only</option>
                      <option value="attention">Attention queue</option>
                    </CrmSelect>
                  </CrmField>
                </div>

                <div className="mnx-crm-masters-table-caption">
                  <strong>{filteredRecords.length}</strong>
                  <span>records visible in the current operating view</span>
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
                      {filteredRecords.length > 0 ? (
                        filteredRecords.map((record, index) => (
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
                          No records match the current search or status view.
                        </CrmEmptyTableRow>
                      )}
                    </tbody>
                  </CrmTable>
                </div>
              </div>

              <div className="mnx-crm-masters-ops-rail">
                <div className="mnx-crm-masters-ops-card">
                  <div className="mnx-crm-masters-ops-card-header">
                    <div>
                      <span>Attention queue</span>
                      <h4>Records needing cleanup</h4>
                    </div>
                    <CircleAlert aria-hidden="true" />
                  </div>

                  {activeAttentionRecords.length > 0 ? (
                    <div className="mnx-crm-masters-watchlist">
                      {activeAttentionRecords.map((record, index) => (
                        <div key={`${activeTab.id}-attention-${index}`} className="mnx-crm-masters-watchlist-card">
                          <div className="mnx-crm-masters-watchlist-copy">
                            <strong>{getRecordTitle(activeTab, record)}</strong>
                            <p>{getRecordSubtitle(activeTab, record) || record[activeTab.headings[0]] || "Reference pending"}</p>
                          </div>
                          <div className="mnx-crm-masters-watchlist-meta">
                            <CrmStatus variant={(record.Status ?? "").trim().toLowerCase() === "inactive" ? "warning" : "accent"}>
                              {(record.Status ?? "").trim() || "Incomplete"}
                            </CrmStatus>
                            <small>{getRecordCompletionPercent(activeTab.headings, record)}% complete</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mnx-crm-masters-note">
                      No records are currently flagged for attention in this master.
                    </p>
                  )}
                </div>

                <div className="mnx-crm-masters-ops-card">
                  <div className="mnx-crm-masters-ops-card-header">
                    <div>
                      <span>Reference framing</span>
                      <h4>How this master should be managed</h4>
                    </div>
                    <ShieldCheck aria-hidden="true" />
                  </div>

                  <div className="mnx-crm-masters-tag-row">
                    {activeTab.focusAreas.map((focus) => (
                      <span key={`${activeTab.id}-focus-${focus}`}>{focus}</span>
                    ))}
                  </div>

                  <p className="mnx-crm-masters-note">
                    Maintain a clean identifier on the first column, keep Status current, and use mapped spreadsheet imports when doing bulk refreshes from external systems.
                  </p>
                </div>
              </div>
            </div>

            {currentImportRun ? (
              <div className="mnx-crm-masters-import-summary">
                <div className="mnx-crm-masters-import-summary-header">
                  <div>
                    <h4>Last import run</h4>
                    <p>
                      {currentImportRun.fileName} completed on {formatDateTime(currentImportRun.completedAt)}
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
                            <span className={`mnx-crm-masters-log-badge is-${log.status}`}>{log.status}</span>
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
