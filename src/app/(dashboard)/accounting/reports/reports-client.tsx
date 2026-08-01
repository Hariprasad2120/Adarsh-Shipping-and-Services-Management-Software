"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Download, Loader2, Play } from "lucide-react";
import { useState } from "react";
import { DateInput } from "@/components/ui/date-input";
import {
  AccountingAction,
  AccountingAlert,
  AccountingEmptyTableRow,
  AccountingField,
  AccountingSection,
  AccountingTable,
} from "@/modules/accounting/components/accounting-workspace";
import {
  getAPAgeingAction,
  getARAgeingAction,
  getBalanceSheetAction,
  getCashAndBankLedgerAction,
  getConsolidatedGSTLedgerAction,
  getDayBookAction,
  getGSTR1SummaryAction,
  getGSTR2BSummaryAction,
  getJobProfitabilityAction,
  getJournalRegisterAction,
  getProfitAndLossAction,
  getPurchaseRegisterAction,
  getSalesRegisterAction,
  getTrialBalanceAction,
} from "@/modules/accounting/actions";

const REPORT_LIST = [
  { id: "pnl", name: "Profit & Loss Statement", category: "Financial Statements", dateType: "range" },
  { id: "balance-sheet", name: "Balance Sheet", category: "Financial Statements", dateType: "asOf" },
  { id: "trial-balance", name: "Trial Balance", category: "Financial Statements", dateType: "range" },
  { id: "day-book", name: "Day Book Ledger", category: "Financial Statements", dateType: "single" },
  { id: "cash-bank", name: "Cash & Bank Ledger", category: "Financial Statements", dateType: "range" },
  { id: "ar-ageing", name: "AR Ageing Summary", category: "Receivables & Payables", dateType: "asOf" },
  { id: "ap-ageing", name: "AP Ageing Summary", category: "Receivables & Payables", dateType: "asOf" },
  { id: "sales-reg", name: "Sales Invoice Register", category: "Registers & Journals", dateType: "range" },
  { id: "purchase-reg", name: "Purchase Bill Register", category: "Registers & Journals", dateType: "range" },
  { id: "journal-reg", name: "Journal Entry Register", category: "Registers & Journals", dateType: "range" },
  { id: "gstr1", name: "GSTR-1 (Sales Tax Return)", category: "GST Tax Return Sheets", dateType: "range" },
  { id: "gstr2b", name: "GSTR-2B (Purchase Inputs)", category: "GST Tax Return Sheets", dateType: "range" },
  { id: "gst-ledger", name: "Consolidated GST Ledger", category: "GST Tax Return Sheets", dateType: "range" },
  { id: "job-profit", name: "Job Profitability Summary", category: "Cargo Job Costing", dateType: "none" },
] as const;

function humanize(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") {
    return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (
      Number.isFinite(parsed) &&
      /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value)
    ) {
      return new Date(parsed).toLocaleDateString("en-IN");
    }
    return value;
  }
  return JSON.stringify(value);
}

function ObjectSummary({
  data,
  title,
}: {
  data: Record<string, any>;
  title: string;
}) {
  const scalarEntries = Object.entries(data).filter(
    ([, value]) => typeof value !== "object" || value === null,
  );
  const nestedEntries = Object.entries(data).filter(
    ([, value]) => typeof value === "object" && value !== null,
  );

  return (
    <div className="mnx-accounting-form">
      {scalarEntries.length > 0 ? (
        <div className="mnx-accounting-detail-list">
          {scalarEntries.map(([key, value]) => (
            <div key={key}>
              <dt>{humanize(key)}</dt>
              <dd>{displayValue(value)}</dd>
            </div>
          ))}
        </div>
      ) : null}
      {nestedEntries.map(([key, value]) => (
        <AccountingSection
          eyebrow={title}
          title={humanize(key)}
          description={`Detailed ${humanize(key).toLowerCase()} values from the generated report.`}
          key={key}
        >
          <ReportDataView data={value} title={humanize(key)} />
        </AccountingSection>
      ))}
    </div>
  );
}

function ArrayTable({ rows }: { rows: any[] }) {
  if (rows.length === 0) {
    return (
      <AccountingTable>
        <tbody>
          <AccountingEmptyTableRow colSpan={1}>
            The report returned no rows.
          </AccountingEmptyTableRow>
        </tbody>
      </AccountingTable>
    );
  }
  const keys = Array.from(
    new Set(
      rows.flatMap((row) =>
        row && typeof row === "object" ? Object.keys(row) : ["value"],
      ),
    ),
  );

  return (
    <AccountingTable>
      <thead>
        <tr>
          {keys.map((key) => (
            <th key={key}>{humanize(key)}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={row?.id || `${index}-${JSON.stringify(row)}`}>
            {keys.map((key) => {
              const value = row && typeof row === "object" ? row[key] : row;
              return (
                <td key={key}>
                  {typeof value === "object" && value !== null
                    ? displayValue(
                        Array.isArray(value)
                          ? `${value.length} record${value.length === 1 ? "" : "s"}`
                          : Object.fromEntries(
                              Object.entries(value).filter(
                                ([, item]) => typeof item !== "object",
                              ),
                            ),
                      )
                    : displayValue(value)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </AccountingTable>
  );
}

function ReportDataView({ data, title }: { data: any; title: string }) {
  if (Array.isArray(data)) return <ArrayTable rows={data} />;
  if (data && typeof data === "object")
    return <ObjectSummary data={data} title={title} />;
  return <AccountingAlert>{displayValue(data)}</AccountingAlert>;
}

export function ReportsClient({ partners }: { partners: any[] }) {
  void partners;
  const [selectedReportId, setSelectedReportId] = useState("pnl");
  const [fromDate, setFromDate] = useState("2026-04-01");
  const [toDate, setToDate] = useState("2026-06-30");
  const [asOfDate, setAsOfDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [singleDate, setSingleDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedReport =
    REPORT_LIST.find((report) => report.id === selectedReportId) ||
    REPORT_LIST[0];

  async function runReport() {
    setLoading(true);
    setError(null);
    setReportData(null);
    try {
      let result: any;
      if (selectedReportId === "pnl")
        result = await getProfitAndLossAction({ fromDate, toDate });
      else if (selectedReportId === "balance-sheet")
        result = await getBalanceSheetAction({ toDate: asOfDate });
      else if (selectedReportId === "trial-balance")
        result = await getTrialBalanceAction({
          fromDate,
          toDate,
          includeZero: true,
        });
      else if (selectedReportId === "day-book")
        result = await getDayBookAction(singleDate);
      else if (selectedReportId === "cash-bank")
        result = await getCashAndBankLedgerAction({ fromDate, toDate });
      else if (selectedReportId === "ar-ageing")
        result = await getARAgeingAction(asOfDate);
      else if (selectedReportId === "ap-ageing")
        result = await getAPAgeingAction(asOfDate);
      else if (selectedReportId === "sales-reg")
        result = await getSalesRegisterAction({ fromDate, toDate });
      else if (selectedReportId === "purchase-reg")
        result = await getPurchaseRegisterAction({ fromDate, toDate });
      else if (selectedReportId === "journal-reg")
        result = await getJournalRegisterAction({ fromDate, toDate });
      else if (selectedReportId === "gstr1")
        result = await getGSTR1SummaryAction({ fromDate, toDate });
      else if (selectedReportId === "gstr2b")
        result = await getGSTR2BSummaryAction({ fromDate, toDate });
      else if (selectedReportId === "gst-ledger")
        result = await getConsolidatedGSTLedgerAction({ fromDate, toDate });
      else result = await getJobProfitabilityAction();

      if (result?.ok) setReportData(result.data);
      else setError(result?.error || "Failed to generate report.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    if (!reportData) return;
    let csv = "data:text/csv;charset=utf-8,";
    if (Array.isArray(reportData)) {
      if (reportData.length === 0) return alert("No data to export");
      const headers = Object.keys(reportData[0]);
      csv += `${headers.join(",")}\n`;
      for (const row of reportData) {
        csv += `${headers
          .map((header) => {
            const value = row[header];
            return typeof value === "string"
              ? `"${value.replace(/"/g, '""')}"`
              : JSON.stringify(value);
          })
          .join(",")}\n`;
      }
    } else {
      csv += "Category,Key,Value\n";
      for (const [category, item] of Object.entries(reportData)) {
        if (typeof item === "object" && item !== null) {
          for (const [key, value] of Object.entries(item)) {
            csv += `${category},${key},"${JSON.stringify(value).replace(/"/g, '""')}"\n`;
          }
        } else csv += `Summary,${category},"${item}"\n`;
      }
    }
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `${selectedReport.id}_report.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  const categories = Array.from(
    new Set(REPORT_LIST.map((report) => report.category)),
  );

  return (
    <div className="mnx-accounting-report-grid">
      <nav className="mnx-accounting-report-nav" aria-label="Accounting reports">
        {categories.flatMap((category) => [
          <span className="mnx-label" key={`${category}-label`}>
            {category}
          </span>,
          ...REPORT_LIST.filter((report) => report.category === category).map(
            (report) => (
              <AccountingAction
                aria-pressed={selectedReportId === report.id}
                key={report.id}
                type="button"
                variant={
                  selectedReportId === report.id ? "primary" : "secondary"
                }
                onClick={() => {
                  setSelectedReportId(report.id);
                  setReportData(null);
                  setError(null);
                }}
              >
                {report.name}
              </AccountingAction>
            ),
          ),
        ])}
      </nav>

      <div className="mnx-accounting-form">
        <AccountingSection
          eyebrow={selectedReport.category}
          title={selectedReport.name}
          description="Choose the reporting period, run the live query, and export the resulting dataset."
          actions={
            reportData ? (
              <AccountingAction variant="secondary" onClick={exportCsv}>
                <Download aria-hidden="true" size={16} />
                Export CSV
              </AccountingAction>
            ) : null
          }
        >
          <div className="mnx-accounting-form-grid">
            {selectedReport.dateType === "range" ? (
              <>
                <AccountingField label="From date">
                  <DateInput
                    value={fromDate}
                    onChange={(event) => setFromDate(event.target.value)}
                  />
                </AccountingField>
                <AccountingField label="To date">
                  <DateInput
                    value={toDate}
                    onChange={(event) => setToDate(event.target.value)}
                  />
                </AccountingField>
              </>
            ) : null}
            {selectedReport.dateType === "asOf" ? (
              <AccountingField label="As of date">
                <DateInput
                  value={asOfDate}
                  onChange={(event) => setAsOfDate(event.target.value)}
                />
              </AccountingField>
            ) : null}
            {selectedReport.dateType === "single" ? (
              <AccountingField label="Report date">
                <DateInput
                  value={singleDate}
                  onChange={(event) => setSingleDate(event.target.value)}
                />
              </AccountingField>
            ) : null}
            <AccountingAction disabled={loading} onClick={runReport}>
              {loading ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={16} />
              ) : (
                <Play aria-hidden="true" size={16} />
              )}
              {loading ? "Generating…" : "Run report"}
            </AccountingAction>
          </div>
        </AccountingSection>

        {error ? <AccountingAlert variant="danger">{error}</AccountingAlert> : null}
        {!reportData && !loading && !error ? (
          <AccountingAlert>
            Run the report to load current accounting data.
          </AccountingAlert>
        ) : null}
        {reportData ? (
          <AccountingSection
            eyebrow="Generated report"
            title={selectedReport.name}
            description="Live data returned by the accounting reporting service."
          >
            <ReportDataView data={reportData} title={selectedReport.name} />
          </AccountingSection>
        ) : null}
      </div>
    </div>
  );
}
