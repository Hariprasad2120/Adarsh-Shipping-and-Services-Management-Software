"use client";

import React, { useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  Scale,
  Percent,
  RefreshCw,
} from "lucide-react";
import {
  getARAgeingAction,
  getAPAgeingAction,
  getSalesRegisterAction,
  getPurchaseRegisterAction,
  getGSTR1SummaryAction,
  getGSTR2BSummaryAction,
  getConsolidatedGSTLedgerAction,
  getDayBookAction,
  getJournalRegisterAction,
  getJobProfitabilityAction,
  getCashAndBankLedgerAction,
  getProfitAndLossAction,
  getBalanceSheetAction,
  getTrialBalanceAction,
} from "@/modules/accounting/actions";

interface Partner {
  id: string;
  partnerName: string;
}

interface ReportsClientProps {
  partners: Partner[];
}

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
];

export function ReportsClient({ partners }: ReportsClientProps) {
  const [selectedReportId, setSelectedReportId] = useState("pnl");
  const [fromDate, setFromDate] = useState("2026-04-01");
  const [toDate, setToDate] = useState("2026-06-30");
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split("T")[0]);

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedReport = REPORT_LIST.find((r) => r.id === selectedReportId) || REPORT_LIST[0];

  const handleRunReport = async () => {
    setLoading(true);
    setError(null);
    setReportData(null);

    try {
      let res: any;

      if (selectedReportId === "pnl") {
        res = await getProfitAndLossAction({ fromDate, toDate });
      } else if (selectedReportId === "balance-sheet") {
        res = await getBalanceSheetAction({ toDate: asOfDate });
      } else if (selectedReportId === "trial-balance") {
        res = await getTrialBalanceAction({ fromDate, toDate, includeZero: true });
      } else if (selectedReportId === "day-book") {
        res = await getDayBookAction(singleDate);
      } else if (selectedReportId === "cash-bank") {
        res = await getCashAndBankLedgerAction({ fromDate, toDate });
      } else if (selectedReportId === "ar-ageing") {
        res = await getARAgeingAction(asOfDate);
      } else if (selectedReportId === "ap-ageing") {
        res = await getAPAgeingAction(asOfDate);
      } else if (selectedReportId === "sales-reg") {
        res = await getSalesRegisterAction({ fromDate, toDate });
      } else if (selectedReportId === "purchase-reg") {
        res = await getPurchaseRegisterAction({ fromDate, toDate });
      } else if (selectedReportId === "journal-reg") {
        res = await getJournalRegisterAction({ fromDate, toDate });
      } else if (selectedReportId === "gstr1") {
        res = await getGSTR1SummaryAction({ fromDate, toDate });
      } else if (selectedReportId === "gstr2b") {
        res = await getGSTR2BSummaryAction({ fromDate, toDate });
      } else if (selectedReportId === "gst-ledger") {
        res = await getConsolidatedGSTLedgerAction({ fromDate, toDate });
      } else if (selectedReportId === "job-profit") {
        res = await getJobProfitabilityAction();
      }

      if (res && res.ok) {
        setReportData(res.data);
      } else {
        setError(res?.error || "Failed to generate report.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    // Basic flat JSON parser to CSV
    if (Array.isArray(reportData)) {
      if (reportData.length === 0) {
        alert("No data to export");
        return;
      }
      const headers = Object.keys(reportData[0]);
      csvContent += headers.join(",") + "\n";
      reportData.forEach((row) => {
        const values = headers.map((header) => {
          const val = row[header];
          return typeof val === "string" ? `"${val.replace(/"/g, '""')}"` : val;
        });
        csvContent += values.join(",") + "\n";
      });
    } else {
      // For structured reports like Profit/Loss or GSTR-1, export keys
      csvContent += "Category,Key,Value\n";
      Object.keys(reportData).forEach((category) => {
        const item = reportData[category];
        if (typeof item === "object" && item !== null) {
          Object.keys(item).forEach((key) => {
            csvContent += `${category},${key},"${JSON.stringify(item[key]).replace(/"/g, '""')}"\n`;
          });
        } else {
          csvContent += `Summary,${category},"${item}"\n`;
        }
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedReport.id}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group report list by category
  const categories = Array.from(new Set(REPORT_LIST.map((r) => r.category)));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* ─── Left Sidebar Menu ────────────────────────────────────────────────── */}
      <div className="lg:col-span-3 space-y-4">
        <h3 className="ds-h2 text-white">Report Index</h3>
        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat} className="space-y-1">
              <span className="ds-label text-[9px] block text-slate-500 uppercase tracking-widest px-2 py-1">
                {cat}
              </span>
              <div className="space-y-0.5">
                {REPORT_LIST.filter((r) => r.category === cat).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelectedReportId(r.id);
                      setReportData(null);
                      setError(null);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-lg uppercase tracking-wide transition-all flex justify-between items-center ${
                      selectedReportId === r.id
                        ? "bg-[#00cec4]/10 text-[#00cec4] font-semibold border-l-4 border-[#00cec4]"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/10"
                    }`}
                  >
                    <span>{r.name}</span>
                    <ChevronRight size={12} className={selectedReportId === r.id ? "text-[#00cec4]" : "text-slate-600"} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Right Configuration & Display Panel ─────────────────────────────── */}
      <div className="lg:col-span-9 space-y-6">
        {/* Configurations Header */}
        <div className="card-top-accent bg-[var(--color-surface)] p-6 rounded-xl border border-outline-variant/10 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-outline-variant/10 pb-4">
            <h3 className="ds-h2 text-white uppercase tracking-wider">{selectedReport.name}</h3>
            {reportData && (
              <button
                onClick={handleExportCSV}
                className="border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl text-xs uppercase tracking-wide transition-all flex items-center gap-1.5"
              >
                <Download size={12} /> Export CSV
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-4 items-end">
            {selectedReport.dateType === "range" && (
              <>
                <div className="space-y-1.5">
                  <span className="ds-label block">From Date</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="bg-[var(--color-background)] text-white p-2.5 rounded-xl text-xs ds-numeric border border-outline-variant/10"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="ds-label block">To Date</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="bg-[var(--color-background)] text-white p-2.5 rounded-xl text-xs ds-numeric border border-outline-variant/10"
                  />
                </div>
              </>
            )}

            {selectedReport.dateType === "asOf" && (
              <div className="space-y-1.5">
                <span className="ds-label block">As Of Date</span>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="bg-[var(--color-background)] text-white p-2.5 rounded-xl text-xs ds-numeric border border-outline-variant/10"
                />
              </div>
            )}

            {selectedReport.dateType === "single" && (
              <div className="space-y-1.5">
                <span className="ds-label block">Statement Date</span>
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="bg-[var(--color-background)] text-white p-2.5 rounded-xl text-xs ds-numeric border border-outline-variant/10"
                />
              </div>
            )}

            <button
              onClick={handleRunReport}
              disabled={loading}
              className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2.5 rounded-xl text-xs uppercase tracking-wide transition-all font-semibold flex items-center gap-1.5 disabled:opacity-50"
            >
              <FileSpreadsheet size={14} /> {loading ? "Generating..." : "Run Report"}
            </button>
          </div>
        </div>

        {/* Report Output Content */}
        {error && (
          <div className="p-4 bg-red-950/40 border border-red-500/30 text-red-200 text-xs rounded-xl">
            {error}
          </div>
        )}

        {!reportData && !loading && !error && (
          <div className="bg-[var(--color-surface)] p-12 rounded-xl border border-outline-variant/10 text-center text-slate-500 text-xs uppercase tracking-widest">
            Configure dates and click "Run Report" to populate statements
          </div>
        )}

        {loading && (
          <div className="bg-[var(--color-surface)] p-12 rounded-xl border border-outline-variant/10 text-center text-slate-400 text-xs uppercase tracking-widest flex justify-center items-center gap-2">
            <RefreshCw className="animate-spin text-[#00cec4]" size={16} /> Generating report calculations...
          </div>
        )}

        {reportData && (
          <div className="bg-[var(--color-surface)] rounded-xl border border-outline-variant/10 shadow-sm overflow-hidden p-6 space-y-6">
            {/* ─── DYNAMIC REPORT CALCULATIONS RENDERING ─────────────────────── */}

            {/* A. Profit and Loss Statement */}
            {selectedReportId === "pnl" && (
              <div className="space-y-6">
                <div>
                  <h4 className="ds-h3 text-white border-b border-outline-variant/10 pb-2">Operating Revenues</h4>
                  <table className="ds-table mt-2">
                    <tbody>
                      {reportData.income.accounts.map((acc: any) => (
                        <tr key={acc.code}>
                          <td>{acc.name} ({acc.code})</td>
                          <td className="text-right ds-numeric font-medium text-white">
                            ₹{acc.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-bold border-t border-outline-variant/20 bg-slate-900/10">
                        <td>TOTAL INCOME</td>
                        <td className="text-right ds-numeric text-emerald-400">
                          ₹{reportData.income.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <h4 className="ds-h3 text-white border-b border-outline-variant/10 pb-2">Operating Expenses</h4>
                  <table className="ds-table mt-2">
                    <tbody>
                      {reportData.expense.accounts.map((acc: any) => (
                        <tr key={acc.code}>
                          <td>{acc.name} ({acc.code})</td>
                          <td className="text-right ds-numeric font-medium text-white">
                            ₹{acc.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-bold border-t border-outline-variant/20 bg-slate-900/10">
                        <td>TOTAL EXPENSES</td>
                        <td className="text-right ds-numeric text-rose-400">
                          ₹{reportData.expense.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-[var(--color-surface-container)] rounded-xl border border-outline-variant/10 flex justify-between items-center">
                  <span className="ds-h3 text-white">NET PROFIT / LOSS</span>
                  <span className="text-xl font-bold ds-numeric text-[#00cec4]">
                    ₹{reportData.netProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {/* B. Balance Sheet */}
            {selectedReportId === "balance-sheet" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Assets */}
                  <div className="space-y-3">
                    <h4 className="ds-h3 text-white border-b border-[#00cec4]/20 pb-2">Assets</h4>
                    <table className="ds-table">
                      <tbody>
                        {reportData.assets.accounts.map((acc: any) => (
                          <tr key={acc.code}>
                            <td>{acc.name}</td>
                            <td className="text-right ds-numeric text-white">
                              ₹{acc.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                        <tr className="font-bold border-t border-outline-variant/10 bg-slate-900/10">
                          <td>TOTAL ASSETS</td>
                          <td className="text-right ds-numeric text-[#00cec4]">
                            ₹{reportData.assets.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Liabilities & Equity */}
                  <div className="space-y-3">
                    <h4 className="ds-h3 text-white border-b border-orange-500/20 pb-2">Liabilities &amp; Equity</h4>
                    <table className="ds-table">
                      <tbody>
                        <tr className="font-semibold text-slate-400">
                          <td colSpan={2}>Liabilities</td>
                        </tr>
                        {reportData.liabilities.accounts.map((acc: any) => (
                          <tr key={acc.code}>
                            <td className="pl-4">{acc.name}</td>
                            <td className="text-right ds-numeric text-white">
                              ₹{acc.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                        <tr className="font-semibold text-slate-400">
                          <td colSpan={2}>Partner Capital &amp; Reserves</td>
                        </tr>
                        {reportData.equity.accounts.map((acc: any) => (
                          <tr key={acc.code}>
                            <td className="pl-4">{acc.name}</td>
                            <td className="text-right ds-numeric text-white">
                              ₹{acc.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td className="pl-4 italic">Current Net Profit (YTD)</td>
                          <td className="text-right ds-numeric text-emerald-400">
                            ₹{reportData.currentYearProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                        <tr className="font-bold border-t border-outline-variant/10 bg-slate-900/10">
                          <td>TOTAL LIABILITIES &amp; RESERVES</td>
                          <td className="text-right ds-numeric text-[#00cec4]">
                            ₹{reportData.totalLiabilitiesAndEquity.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border flex justify-between items-center ${
                  reportData.isBalanced
                    ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                    : "bg-red-950/40 border-red-500/30 text-red-300"
                }`}>
                  <span className="text-xs uppercase tracking-wider font-semibold">
                    {reportData.isBalanced ? "Balance Sheet Balanced Successfully" : "Balance Sheet Out of Balance"}
                  </span>
                  <span className="ds-numeric font-bold">
                    Diff: ₹{Math.abs(reportData.totalAssets - reportData.totalLiabilitiesAndEquity).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* C. Trial Balance */}
            {selectedReportId === "trial-balance" && (
              <div className="overflow-x-auto">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Account Code</th>
                      <th>Account Name</th>
                      <th className="text-right">Opening Dr</th>
                      <th className="text-right">Opening Cr</th>
                      <th className="text-right">Debit</th>
                      <th className="text-right">Credit</th>
                      <th className="text-right">Closing Dr</th>
                      <th className="text-right">Closing Cr</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row: any) => (
                      <tr key={row.accountId} className="hover:bg-slate-800/10">
                        <td className="ds-numeric text-xs">{row.accountCode}</td>
                        <td className="text-xs text-white uppercase">{row.accountName}</td>
                        <td className="text-right ds-numeric text-xs text-slate-400">
                          {row.openingDebit > 0 ? `₹${row.openingDebit.toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="text-right ds-numeric text-xs text-slate-400">
                          {row.openingCredit > 0 ? `₹${row.openingCredit.toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="text-right ds-numeric text-xs text-emerald-400">
                          {row.debit > 0 ? `₹${row.debit.toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="text-right ds-numeric text-xs text-rose-400">
                          {row.credit > 0 ? `₹${row.credit.toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="text-right ds-numeric text-xs font-semibold text-white">
                          {row.closingDebit > 0 ? `₹${row.closingDebit.toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="text-right ds-numeric text-xs font-semibold text-white">
                          {row.closingCredit > 0 ? `₹${row.closingCredit.toLocaleString("en-IN")}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* D. AR / AP Ageing Summaries */}
            {(selectedReportId === "ar-ageing" || selectedReportId === "ap-ageing") && (
              <div className="overflow-x-auto">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Party Name</th>
                      <th className="text-right">Total Outstanding</th>
                      <th className="text-right">0 - 30 Days</th>
                      <th className="text-right">31 - 60 Days</th>
                      <th className="text-right">61 - 90 Days</th>
                      <th className="text-right">90+ Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/10">
                        <td className="text-xs uppercase text-white font-medium">
                          {row.customerName || row.supplierName}
                        </td>
                        <td className="text-right ds-numeric text-xs font-semibold text-white">
                          ₹{row.totalOutstanding.toLocaleString("en-IN")}
                        </td>
                        <td className="text-right ds-numeric text-xs text-emerald-400">
                          ₹{row.bucket0To30.toLocaleString("en-IN")}
                        </td>
                        <td className="text-right ds-numeric text-xs text-slate-300">
                          ₹{row.bucket31To60.toLocaleString("en-IN")}
                        </td>
                        <td className="text-right ds-numeric text-xs text-slate-400">
                          ₹{row.bucket61To90.toLocaleString("en-IN")}
                        </td>
                        <td className="text-right ds-numeric text-xs text-rose-400">
                          ₹{row.bucket90Plus.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* E. Sales / Purchase Registers / GST Ledgers / Day Book */}
            {(selectedReportId === "sales-reg" ||
              selectedReportId === "purchase-reg" ||
              selectedReportId === "gst-ledger" ||
              selectedReportId === "day-book" ||
              selectedReportId === "cash-bank") && (
              <div className="overflow-x-auto">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Ref / Voucher</th>
                      <th>Account / Party</th>
                      <th className="text-right">Taxable</th>
                      <th className="text-right">Dr / Tax</th>
                      <th className="text-right">Cr / Total</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row: any, idx: number) => (
                      <tr key={row.id || idx} className="hover:bg-slate-800/10">
                        <td className="ds-numeric text-xs">
                          {new Date(row.postingDate).toLocaleDateString("en-IN")}
                        </td>
                        <td className="text-xs ds-label font-bold">
                          {row.invoiceNumber || row.billNumber || row.voucherType || "—"}
                        </td>
                        <td>
                          <div className="text-xs text-white uppercase">
                            {row.customerName || row.supplierName || row.accountName || "—"}
                          </div>
                          {row.accountCode && (
                            <span className="text-[9px] text-slate-500 uppercase">
                              {row.accountCode}
                            </span>
                          )}
                        </td>
                        <td className="text-right ds-numeric text-xs text-slate-400">
                          {row.taxableValue !== undefined ? `₹${row.taxableValue.toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="text-right ds-numeric text-xs text-emerald-400">
                          {row.taxAmount !== undefined
                            ? `₹${row.taxAmount.toLocaleString("en-IN")}`
                            : row.debit !== undefined
                            ? `₹${row.debit.toLocaleString("en-IN")}`
                            : "—"}
                        </td>
                        <td className="text-right ds-numeric text-xs text-white">
                          {row.grandTotal !== undefined
                            ? `₹${row.grandTotal.toLocaleString("en-IN")}`
                            : row.credit !== undefined
                            ? `₹${row.credit.toLocaleString("en-IN")}`
                            : "—"}
                        </td>
                        <td className="text-slate-400 text-xs">{row.remarks || row.status || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* F. Journal Entries Register */}
            {selectedReportId === "journal-reg" && (
              <div className="space-y-6">
                {reportData.map((jv: any) => (
                  <div key={jv.id} className="p-4 bg-[var(--color-surface-container)] rounded-xl border border-outline-variant/10 space-y-3">
                    <div className="flex justify-between items-center border-b border-outline-variant/5 pb-2">
                      <span className="text-xs font-bold text-[#00cec4] uppercase">Voucher: {jv.voucherNo}</span>
                      <span className="ds-numeric text-[11px] text-slate-400">
                        Date: {new Date(jv.postingDate).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                    <table className="ds-table">
                      <thead>
                        <tr>
                          <th>Account</th>
                          <th className="text-right">Debit (Dr)</th>
                          <th className="text-right">Credit (Cr)</th>
                          <th>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jv.lines.map((ln: any) => (
                          <tr key={ln.id}>
                            <td>
                              <div className="text-xs text-white uppercase">{ln.accountName}</div>
                              <span className="text-[9px] text-slate-500 tracking-wider">{ln.accountCode}</span>
                            </td>
                            <td className="text-right ds-numeric text-xs text-emerald-400">
                              {ln.debit > 0 ? `₹${ln.debit.toLocaleString("en-IN")}` : "—"}
                            </td>
                            <td className="text-right ds-numeric text-xs text-rose-400">
                              {ln.credit > 0 ? `₹${ln.credit.toLocaleString("en-IN")}` : "—"}
                            </td>
                            <td className="text-slate-400 text-xs">{ln.remarks || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}

            {/* G. GSTR-1 Return Sheet */}
            {selectedReportId === "gstr1" && (
              <div className="space-y-6">
                {/* Summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 bg-[var(--color-background)] rounded-xl border border-outline-variant/10">
                    <p className="ds-label text-slate-400">B2B (Registered Sales)</p>
                    <h4 className="text-xl font-bold text-white ds-numeric mt-1">₹{reportData.b2b.taxableValue.toLocaleString("en-IN")}</h4>
                    <p className="text-[10px] text-slate-500 mt-2">GST Payable: ₹{reportData.b2b.taxAmount.toLocaleString("en-IN")} ({reportData.b2b.count} invoices)</p>
                  </div>
                  <div className="p-4 bg-[var(--color-background)] rounded-xl border border-outline-variant/10">
                    <p className="ds-label text-slate-400">B2C (Consumer Sales)</p>
                    <h4 className="text-xl font-bold text-white ds-numeric mt-1">₹{reportData.b2c.taxableValue.toLocaleString("en-IN")}</h4>
                    <p className="text-[10px] text-slate-500 mt-2">GST Payable: ₹{reportData.b2c.taxAmount.toLocaleString("en-IN")} ({reportData.b2c.count} invoices)</p>
                  </div>
                  <div className="p-4 bg-[var(--color-background)] rounded-xl border border-[#00cec4]/20">
                    <p className="ds-label text-[#00cec4]">Total Sales GST Liability</p>
                    <h4 className="text-xl font-bold text-[#00cec4] ds-numeric mt-1">₹{reportData.total.taxAmount.toLocaleString("en-IN")}</h4>
                    <p className="text-[10px] text-slate-400 mt-2">Taxable Base: ₹{reportData.total.taxableValue.toLocaleString("en-IN")}</p>
                  </div>
                </div>

                {/* GSTR B2B Invoices */}
                <div>
                  <h4 className="ds-h3 text-white mb-2">B2B Invoices Details</h4>
                  <table className="ds-table">
                    <thead>
                      <tr>
                        <th>Inv Number</th>
                        <th>Customer</th>
                        <th>GSTIN</th>
                        <th className="text-right">Taxable Base</th>
                        <th className="text-right">CGST</th>
                        <th className="text-right">SGST</th>
                        <th className="text-right">IGST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.b2b.invoices.map((inv: any, idx: number) => (
                        <tr key={idx}>
                          <td className="ds-numeric text-xs font-semibold text-white">{inv.invoiceNumber}</td>
                          <td className="text-xs uppercase">{inv.customerName}</td>
                          <td className="ds-numeric text-xs text-[#00cec4]">{inv.customerGstin}</td>
                          <td className="text-right ds-numeric text-xs">₹{inv.taxableValue.toLocaleString("en-IN")}</td>
                          <td className="text-right ds-numeric text-xs text-emerald-400">₹{inv.cgst.toLocaleString("en-IN")}</td>
                          <td className="text-right ds-numeric text-xs text-emerald-400">₹{inv.sgst.toLocaleString("en-IN")}</td>
                          <td className="text-right ds-numeric text-xs text-emerald-400">₹{inv.igst.toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* H. GSTR-2B Summary */}
            {selectedReportId === "gstr2b" && (
              <div className="space-y-6">
                <div className="p-4 bg-[var(--color-surface-container)] rounded-xl border border-[#00cec4]/20 flex justify-between items-center">
                  <div>
                    <h5 className="ds-label text-[#00cec4]">Consolidated Input Tax Credit (ITC)</h5>
                    <p className="text-xs text-slate-400 mt-1">Available for GSTR-3B reconciliation</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold ds-numeric text-white">
                      ₹{reportData.taxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-500 block uppercase mt-1">From {reportData.count} bills</span>
                  </div>
                </div>

                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Bill Number</th>
                      <th>Supplier Name</th>
                      <th>Supplier GSTIN</th>
                      <th className="text-right">Taxable Value</th>
                      <th className="text-right">CGST Claim</th>
                      <th className="text-right">SGST Claim</th>
                      <th className="text-right">IGST Claim</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.bills.map((bill: any, idx: number) => (
                      <tr key={idx}>
                        <td className="ds-numeric text-xs font-semibold text-white">{bill.billNumber}</td>
                        <td className="text-xs uppercase">{bill.supplierName}</td>
                        <td className="ds-numeric text-xs text-[#00cec4]">{bill.supplierGstin}</td>
                        <td className="text-right ds-numeric text-xs">₹{bill.taxableValue.toLocaleString("en-IN")}</td>
                        <td className="text-right ds-numeric text-xs text-emerald-400">₹{bill.cgst.toLocaleString("en-IN")}</td>
                        <td className="text-right ds-numeric text-xs text-emerald-400">₹{bill.sgst.toLocaleString("en-IN")}</td>
                        <td className="text-right ds-numeric text-xs text-emerald-400">₹{bill.igst.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* I. Job Profitability Report */}
            {selectedReportId === "job-profit" && (
              <div className="overflow-x-auto">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Job Code</th>
                      <th>Cargo Title</th>
                      <th className="text-right">Contract Value</th>
                      <th className="text-right">Actual Revenues</th>
                      <th className="text-right">Actual Expenses</th>
                      <th className="text-right">Net Profit</th>
                      <th className="text-right">Margin %</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((job: any) => {
                      const profitable = job.netProfit >= 0;
                      return (
                        <tr key={job.id} className="hover:bg-slate-800/10">
                          <td className="ds-numeric text-xs font-bold text-white">{job.jobNo}</td>
                          <td className="text-xs uppercase">{job.title}</td>
                          <td className="text-right ds-numeric text-xs">
                            ₹{job.contractValue.toLocaleString("en-IN")}
                          </td>
                          <td className="text-right ds-numeric text-xs text-emerald-400">
                            ₹{job.actualRevenue.toLocaleString("en-IN")}
                          </td>
                          <td className="text-right ds-numeric text-xs text-rose-400">
                            ₹{job.actualExpense.toLocaleString("en-IN")}
                          </td>
                          <td className={`text-right ds-numeric text-xs font-semibold ${
                            profitable ? "text-emerald-400" : "text-orange-400"
                          }`}>
                            ₹{job.netProfit.toLocaleString("en-IN")}
                          </td>
                          <td className={`text-right ds-numeric text-xs font-bold ${
                            profitable ? "text-emerald-400" : "text-orange-400"
                          }`}>
                            {job.marginPercent.toFixed(1)}%
                          </td>
                          <td>
                            <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wide ${
                              job.status === "OPEN" ? "bg-sky-950/40 text-sky-400" : "bg-slate-900/60 text-slate-400"
                            }`}>
                              {job.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
