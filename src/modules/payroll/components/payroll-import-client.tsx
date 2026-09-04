"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import { toast } from "@/modules/notifications/client";
import { Button } from "@/components/ui/button";
import {
  WorkspaceAlert,
  WorkspacePanel,
  WorkspaceSectionHeading,
} from "@/components/layout/workspace";
import {
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";
import {
  importPayrollEmployeeDataAction,
  type PayrollImportResult,
  type PayrollImportRow,
} from "@/modules/payroll/import-actions";

const COLUMN_MAP: Record<string, keyof PayrollImportRow> = {
  "employee number": "employeeNumber",
  "employee_number": "employeeNumber",
  "employee id": "employeeNumber",
  "annual ctc": "ctc",
  "ctc": "ctc",
  "basic": "basic",
  "house rent allowance": "hra",
  "hra": "hra",
  "conveyance allowance": "conveyance",
  "conveyance": "conveyance",
  "transport allowance": "transport",
  "transport": "transport",
  "travelling allowance": "travelling",
  "travelling": "travelling",
  "fixed allowance": "fixedAllowance",
  "payment mode": "paymentMode",
  "bank name": "bankName",
  "account number": "bankAccount",
  "bank account": "bankAccount",
  "ifsc": "ifsc",
  "pan": "pan",
  "uan": "uan",
};

function parseRows(headers: string[], raw: Record<string, string>[]): PayrollImportRow[] {
  const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());
  return raw.map((rawRow) => {
    const row: Partial<PayrollImportRow> = {};
    normalizedHeaders.forEach((header, index) => {
      const field = COLUMN_MAP[header];
      if (!field) return;
      const value = rawRow[headers[index]!];
      if (value != null && value !== "") (row as Record<string, string>)[field] = String(value);
    });
    return { employeeNumber: "", ...row } as PayrollImportRow;
  });
}

export function PayrollImportClient() {
  const [step, setStep] = React.useState<"select" | "preview" | "result">("select");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<PayrollImportRow[]>([]);
  const [duplicateMode, setDuplicateMode] = React.useState<"skip" | "overwrite">("skip");
  const [result, setResult] = React.useState<PayrollImportResult | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("The file has no worksheet.");
      const sheet = workbook.Sheets[sheetName]!;
      const table = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
        header: 1,
        defval: "",
        raw: false,
      });
      const headerRow = (table[0] ?? []).map((cell) => String(cell ?? "").trim());
      if (headerRow.length === 0) throw new Error("Could not find a header row.");
      const dataRows = table.slice(1).filter((r) => r.some((cell) => String(cell ?? "").trim() !== ""));
      const objectRows = dataRows.map((r) => {
        const obj: Record<string, string> = {};
        headerRow.forEach((header, index) => {
          obj[header] = String(r[index] ?? "");
        });
        return obj;
      });
      const parsed = parseRows(headerRow, objectRows);
      if (parsed.length === 0) throw new Error("No data rows found in the file.");
      setRows(parsed);
      setStep("preview");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to read the file");
    }
  };

  const invalidRowCount = rows.filter((r) => !r.employeeNumber?.trim()).length;

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const response = await importPayrollEmployeeDataAction(rows, duplicateMode);
      if (!response.ok) {
        toast.error(response.error);
        return;
      }
      setResult(response.data);
      setStep("result");
    } finally {
      setIsImporting(false);
    }
  };

  if (step === "select") {
    return (
      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="01"
          title="Employee Basic Details - Select File"
          description="Download a sample CSV format file and compare it with your import file to ensure that the file is ready to import."
        />
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--mn-radius-panel)] border border-dashed border-[var(--mnx-border)] bg-[var(--mnx-surface-soft)] p-10 text-center">
          <span className="text-sm font-medium text-[var(--mnx-text)]">
            Drop files here or click here to upload
          </span>
          <span className="text-xs text-[var(--mnx-muted)]">
            Maximum File Size: 5 MB | File Format: CSV or XLS
          </span>
          {/* eslint-disable-next-line no-restricted-syntax -- visually-hidden file input behind a styled drop-zone label, not a standard text field */}
          <input
            type="file"
            accept=".csv,.xls,.xlsx"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </label>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-[var(--mnx-text)]">
            How should duplicate entries be handled?*
          </legend>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              {/* eslint-disable-next-line no-restricted-syntax -- native radio group, not a text field */}
              <input
                type="radio"
                name="duplicateMode"
                checked={duplicateMode === "skip"}
                onChange={() => setDuplicateMode("skip")}
              />
              Skip (only fill fields that aren&apos;t already configured)
            </label>
            <label className="flex items-center gap-2">
              {/* eslint-disable-next-line no-restricted-syntax -- native radio group, not a text field */}
              <input
                type="radio"
                name="duplicateMode"
                checked={duplicateMode === "overwrite"}
                onChange={() => setDuplicateMode("overwrite")}
              />
              Overwrite
            </label>
          </div>
        </fieldset>
        <WorkspaceAlert variant="info">
          This imports payroll fields (compensation breakup, payment/tax
          identity) onto existing HRMS employees, matched by employee number.
          It never creates a new employee — use the HRMS bulk onboarding
          import for that.
        </WorkspaceAlert>
      </WorkspacePanel>
    );
  }

  if (step === "preview") {
    return (
      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="02"
          title="Preview"
          description={`${fileName} — ${rows.length} rows detected`}
        />
        {invalidRowCount > 0 ? (
          <WorkspaceAlert variant="warning">
            {invalidRowCount} row(s) are missing an employee number and will
            be reported as errors.
          </WorkspaceAlert>
        ) : null}
        <div className="max-h-96 overflow-auto">
          <PeopleTable>
            <PeopleTableHeader>
              <PeopleTableRow>
                <PeopleTableHead>Employee #</PeopleTableHead>
                <PeopleTableHead>CTC</PeopleTableHead>
                <PeopleTableHead>Basic</PeopleTableHead>
                <PeopleTableHead>HRA</PeopleTableHead>
                <PeopleTableHead>Payment mode</PeopleTableHead>
              </PeopleTableRow>
            </PeopleTableHeader>
            <PeopleTableBody>
              {rows.slice(0, 200).map((row, index) => (
                <PeopleTableRow key={`${row.employeeNumber}-${index}`}>
                  <PeopleTableCell>{row.employeeNumber || "—"}</PeopleTableCell>
                  <PeopleTableCell>{row.ctc ?? "—"}</PeopleTableCell>
                  <PeopleTableCell>{row.basic ?? "—"}</PeopleTableCell>
                  <PeopleTableCell>{row.hra ?? "—"}</PeopleTableCell>
                  <PeopleTableCell>{row.paymentMode ?? "—"}</PeopleTableCell>
                </PeopleTableRow>
              ))}
            </PeopleTableBody>
          </PeopleTable>
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={() => void handleImport()} disabled={isImporting}>
            {isImporting ? "Importing…" : `Import ${rows.length} rows`}
          </Button>
          <Button type="button" variant="inverse" onClick={() => setStep("select")}>
            Cancel
          </Button>
        </div>
      </WorkspacePanel>
    );
  }

  return (
    <WorkspacePanel className="space-y-4 p-5">
      <WorkspaceSectionHeading index="03" title="Import result" />
      {result ? (
        <>
          <div className="flex gap-6 text-sm">
            <span className="text-[var(--mnx-success)]">{result.imported} imported</span>
            <span className="text-[var(--mnx-muted)]">{result.skipped} skipped</span>
            <span className="text-[var(--mnx-danger)]">{result.errors} errors</span>
          </div>
          {result.errors > 0 ? (
            <div className="max-h-72 overflow-auto">
              <PeopleTable>
                <PeopleTableHeader>
                  <PeopleTableRow>
                    <PeopleTableHead>Employee #</PeopleTableHead>
                    <PeopleTableHead>Status</PeopleTableHead>
                    <PeopleTableHead>Message</PeopleTableHead>
                  </PeopleTableRow>
                </PeopleTableHeader>
                <PeopleTableBody>
                  {result.rows
                    .filter((r) => r.status === "ERROR")
                    .map((r, index) => (
                      <PeopleTableRow key={`${r.employeeNumber}-${index}`}>
                        <PeopleTableCell>{r.employeeNumber || "—"}</PeopleTableCell>
                        <PeopleTableCell>{r.status}</PeopleTableCell>
                        <PeopleTableCell>{r.message}</PeopleTableCell>
                      </PeopleTableRow>
                    ))}
                </PeopleTableBody>
              </PeopleTable>
            </div>
          ) : null}
        </>
      ) : null}
      <Button
        type="button"
        variant="inverse"
        onClick={() => {
          setStep("select");
          setRows([]);
          setResult(null);
          setFileName(null);
        }}
      >
        Import another file
      </Button>
    </WorkspacePanel>
  );
}
