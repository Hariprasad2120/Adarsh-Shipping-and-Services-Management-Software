"use client";

import {
  PerformanceControlButton,
  PerformanceControlInput,
  PerformanceTable,
  PerformanceTableBody,
  PerformanceTableCell,
  PerformanceTableHead,
  PerformanceTableHeader,
  PerformanceTableRow,
} from "@/components/monolith/performance-workspace";
import { NativeSelect } from "@/components/monolith/native-select";
import { DateInput } from "@/components/monolith/date-input";
import React, { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Calendar,
  Settings,
  FolderOpen,
  DollarSign,
  Activity,
  Calculator,
  Loader2,
  ChevronRight,
  Sparkles,
  Eye,
} from "lucide-react";
import {
  createAssetAction,
  runDepreciationAction,
} from "@/modules/accounting/actions";

interface AssetsClientProps {
  initialAssets: any[];
  accounts: any[];
  branches: any[];
  settingsConfigured: boolean;
}

export function AssetsClient({
  initialAssets,
  accounts,
  branches,
  settingsConfigured,
}: AssetsClientProps) {
  const router = useRouter();
  const [assets, setAssets] = useState<any[]>(initialAssets);
  const [activeTab, setActiveTab] = useState<"LIST" | "NEW">("LIST");
  const [isSaving, setIsSaving] = useState(false);
  const [runningDepreciationAssetId, setRunningDepreciationAssetId] = useState<
    string | null
  >(null);

  // Depreciation month controls
  const [deprecYear, setDeprecYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [deprecMonth, setDeprecMonth] = useState<number>(new Date().getMonth());

  // Form states
  const [formData, setFormData] = useState({
    assetName: "",
    assetCode: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    purchaseValue: "",
    depreciationRate: "10",
    branchId: "",
    assetAccount: "",
    depreciationAccount: "",
    accumulatedDepreciationAccount: "",
  });

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assetName || !formData.assetCode || !formData.purchaseValue) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await createAssetAction({
        ...formData,
        purchaseValue: parseFloat(formData.purchaseValue),
        depreciationRate: parseFloat(formData.depreciationRate),
      });

      if (res.ok) {
        toast.success("Asset onboarded successfully!");
        setFormData({
          assetName: "",
          assetCode: "",
          purchaseDate: new Date().toISOString().split("T")[0],
          purchaseValue: "",
          depreciationRate: "10",
          branchId: "",
          assetAccount: "",
          depreciationAccount: "",
          accumulatedDepreciationAccount: "",
        });
        setActiveTab("LIST");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to onboard asset");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunDepreciation = async (assetId: string) => {
    const selectedMonthName = months[deprecMonth];
    if (
      !confirm(
        `Run straight-line depreciation for ${selectedMonthName} ${deprecYear}? This will post a General Ledger Journal Entry.`,
      )
    )
      return;

    setRunningDepreciationAssetId(assetId);
    try {
      const monthDate = new Date(Date.UTC(deprecYear, deprecMonth, 1));
      const res = await runDepreciationAction(assetId, monthDate);
      if (res.ok) {
        toast.success(
          "Depreciation run completed and journal entry posted successfully!",
        );
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process depreciation");
    } finally {
      setRunningDepreciationAssetId(null);
    }
  };

  const fixedAssetAccounts = accounts.filter(
    (a) => a.accountType === "FIXED_ASSET",
  );
  const expenseAccounts = accounts.filter((a) => a.accountType === "EXPENSE");
  const accumulatedAccounts = accounts.filter(
    (a) => a.accountType === "DEPRECIATION",
  );

  return (
    <div className="space-y-6">
      {/* ─── TABS ──────────────────────────────────────────────────────── */}
      <div className="flex border-b border-mono-border pb-1 gap-6 select-none">
        <PerformanceControlButton
          onClick={() => setActiveTab("LIST")}
          className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "LIST"
              ? "border-mono-border text-mono-text"
              : "border-transparent text-mono-muted hover:text-mono-text"
          }`}
        >
          Asset Register ({assets.length})
        </PerformanceControlButton>
        <PerformanceControlButton
          onClick={() => setActiveTab("NEW")}
          className={`pb-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "NEW"
              ? "border-mono-border text-mono-text"
              : "border-transparent text-mono-muted hover:text-mono-text"
          }`}
        >
          Onboard New Asset
        </PerformanceControlButton>
      </div>

      {/* ─── TAB CONTENT ────────────────────────────────────────────────── */}
      <div className="space-y-6">
        {activeTab === "LIST" && (
          <div className="space-y-4">
            {/* Depreciation batch runner configs */}
            <div className="p-4 rounded-xl bg-mono-card border border-mono-border flex flex-col md:flex-row md:items-center justify-between gap-4 mnx-performance-surface mnx-accent-edge">
              <div className="flex items-center gap-3">
                <Calculator className="size-5 text-mono-accent shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-mono-text uppercase tracking-wider">
                    Depreciation Period Selection
                  </h4>
                  <p className="text-[11px] text-mono-muted">
                    Choose the month to compute and apply the monthly
                    depreciation run.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <NativeSelect
                  value={deprecMonth}
                  onChange={(e) => setDeprecMonth(parseInt(e.target.value))}
                  className="bg-mono-card border border-mono-border text-mono-text rounded-xl px-3 py-1.5 text-xs font-semibold"
                >
                  {months.map((m, idx) => (
                    <option key={m} value={idx}>
                      {m}
                    </option>
                  ))}
                </NativeSelect>
                <NativeSelect
                  value={deprecYear}
                  onChange={(e) => setDeprecYear(parseInt(e.target.value))}
                  className="bg-mono-card border border-mono-border text-mono-text rounded-xl px-3 py-1.5 text-xs font-semibold"
                >
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </NativeSelect>
              </div>
            </div>

            {/* Assets Table */}
            <div className="p-6 rounded-xl bg-mono-card border border-mono-border">
              {assets.length === 0 ? (
                <div className="text-center py-12 text-mono-muted text-sm">
                  No assets found in the register. Onboard capital equipment to
                  start tracking depreciation.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <PerformanceTable className="mnx-workspace-table">
                    <PerformanceTableHeader>
                      <PerformanceTableRow>
                        <PerformanceTableHead>
                          Asset Code / Name
                        </PerformanceTableHead>
                        <PerformanceTableHead>
                          Purchase Date
                        </PerformanceTableHead>
                        <PerformanceTableHead>
                          Acquisition Value
                        </PerformanceTableHead>
                        <PerformanceTableHead>
                          Accumulated Depr.
                        </PerformanceTableHead>
                        <PerformanceTableHead>
                          Net Book Value
                        </PerformanceTableHead>
                        <PerformanceTableHead>Status</PerformanceTableHead>
                        <PerformanceTableHead className="text-right">
                          Actions
                        </PerformanceTableHead>
                      </PerformanceTableRow>
                    </PerformanceTableHeader>
                    <PerformanceTableBody>
                      {assets.map((asset) => (
                        <PerformanceTableRow
                          key={asset.id}
                          className="hover:bg-mono-card transition-all"
                        >
                          <PerformanceTableCell>
                            <div>
                              <Link
                                href={`/ams/assets/${asset.id}`}
                                className="text-mono-text hover:text-mono-accent font-semibold block transition-colors"
                              >
                                {asset.assetName}
                              </Link>
                              <span className="text-[10px] font-mono text-mono-muted block tracking-wider mt-0.5">
                                {asset.assetCode}
                              </span>
                            </div>
                          </PerformanceTableCell>
                          <PerformanceTableCell className="text-mono-muted text-xs">
                            {new Date(asset.purchaseDate).toLocaleDateString(
                              "en-IN",
                            )}
                          </PerformanceTableCell>
                          <PerformanceTableCell className="mnx-numeric text-mono-text">
                            ₹
                            {asset.purchaseValue.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </PerformanceTableCell>
                          <PerformanceTableCell className="mnx-numeric text-mono-muted">
                            ₹
                            {asset.accumulatedDepreciation.toLocaleString(
                              "en-IN",
                              { minimumFractionDigits: 2 },
                            )}
                          </PerformanceTableCell>
                          <PerformanceTableCell className="mnx-numeric font-bold text-mono-accent">
                            ₹
                            {asset.bookValue.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </PerformanceTableCell>
                          <PerformanceTableCell>
                            <span
                              className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                                asset.status === "ACTIVE"
                                  ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]"
                                  : "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]"
                              }`}
                            >
                              {asset.status.replace("_", " ")}
                            </span>
                          </PerformanceTableCell>
                          <PerformanceTableCell className="text-right">
                            <div className="flex justify-end gap-2 items-center">
                              <Link
                                href={`/ams/assets/${asset.id}`}
                                className="p-1.5 text-mono-muted hover:text-mono-accent hover:bg-mono-accent/5 rounded-lg transition-all"
                                title="View History"
                              >
                                <Eye className="size-4" />
                              </Link>
                              {asset.status === "ACTIVE" && (
                                <PerformanceControlButton
                                  disabled={
                                    runningDepreciationAssetId === asset.id
                                  }
                                  onClick={() =>
                                    handleRunDepreciation(asset.id)
                                  }
                                  className="flex items-center gap-1 bg-mono-accent/10 hover:bg-mono-accent/10 text-mono-text px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wide transition-all disabled:opacity-50 cursor-pointer"
                                >
                                  {runningDepreciationAssetId === asset.id ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <>
                                      <Calculator className="size-3" />
                                      <span>Depreciate</span>
                                    </>
                                  )}
                                </PerformanceControlButton>
                              )}
                            </div>
                          </PerformanceTableCell>
                        </PerformanceTableRow>
                      ))}
                    </PerformanceTableBody>
                  </PerformanceTable>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "NEW" && (
          <div className="p-6 rounded-xl bg-mono-card border border-mono-border max-w-[800px] mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="mnx-form-section space-y-4">
                <h3 className="text-mono-text">Asset Core Profiler</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="mnx-label">Asset Name *</label>
                    <PerformanceControlInput
                      type="text"
                      required
                      placeholder="e.g. MacBook Pro 16"
                      value={formData.assetName}
                      onChange={(e) =>
                        setFormData({ ...formData, assetName: e.target.value })
                      }
                      className="w-full bg-mono-card border border-mono-border text-mono-text rounded-xl p-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="mnx-label">Asset Code / Serial *</label>
                    <PerformanceControlInput
                      type="text"
                      required
                      placeholder="e.g. COMP-2026-003"
                      value={formData.assetCode}
                      onChange={(e) =>
                        setFormData({ ...formData, assetCode: e.target.value })
                      }
                      className="w-full bg-mono-card border border-mono-border text-mono-text rounded-xl p-2.5 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="mnx-label">Purchase Date *</label>
                    <DateInput
                      required
                      value={formData.purchaseDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          purchaseDate: e.target.value,
                        })
                      }
                      className="w-full bg-mono-card border border-mono-border text-mono-text rounded-xl p-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="mnx-label">Purchase Value (₹) *</label>
                    <PerformanceControlInput
                      type="number"
                      required
                      step="0.01"
                      placeholder="0.00"
                      value={formData.purchaseValue}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          purchaseValue: e.target.value,
                        })
                      }
                      className="w-full bg-mono-card border border-mono-border text-mono-text rounded-xl p-2.5 text-sm font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="mnx-label">
                      Depreciation Rate (% per annum)
                    </label>
                    <PerformanceControlInput
                      type="number"
                      step="0.1"
                      value={formData.depreciationRate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          depreciationRate: e.target.value,
                        })
                      }
                      className="w-full bg-mono-card border border-mono-border text-mono-text rounded-xl p-2.5 text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="mnx-label">Branch Mapping</label>
                    <NativeSelect
                      value={formData.branchId}
                      onChange={(e) =>
                        setFormData({ ...formData, branchId: e.target.value })
                      }
                      className="w-full bg-mono-card border border-mono-border text-mono-text rounded-xl p-2.5 text-sm"
                    >
                      <option value="">Global / Head Office</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>
              </div>

              <div className="mnx-form-section space-y-4 pt-4 border-t border-mono-border">
                <h3 className="text-mono-text">
                  Custom Accounting Bindings (Optional)
                </h3>
                <p className="text-[10px] text-mono-muted -mt-2">
                  Override default accounts. If left blank, settings configured
                  in Accounting Settings are applied.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="mnx-label">
                      Asset Account (Fixed Asset)
                    </label>
                    <NativeSelect
                      value={formData.assetAccount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          assetAccount: e.target.value,
                        })
                      }
                      className="w-full bg-mono-card border border-mono-border text-mono-text rounded-xl p-2.5 text-sm"
                    >
                      <option value="">Use Default</option>
                      {fixedAssetAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.accountName} ({a.accountCode})
                        </option>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className="space-y-1">
                    <label className="mnx-label">
                      Depreciation Account (Expense)
                    </label>
                    <NativeSelect
                      value={formData.depreciationAccount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          depreciationAccount: e.target.value,
                        })
                      }
                      className="w-full bg-mono-card border border-mono-border text-mono-text rounded-xl p-2.5 text-sm"
                    >
                      <option value="">Use Default</option>
                      {expenseAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.accountName} ({a.accountCode})
                        </option>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className="space-y-1">
                    <label className="mnx-label">
                      Accumulated Depr. (Asset Offset)
                    </label>
                    <NativeSelect
                      value={formData.accumulatedDepreciationAccount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          accumulatedDepreciationAccount: e.target.value,
                        })
                      }
                      className="w-full bg-mono-card border border-mono-border text-mono-text rounded-xl p-2.5 text-sm"
                    >
                      <option value="">Use Default</option>
                      {accumulatedAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.accountName} ({a.accountCode})
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <PerformanceControlButton
                  type="submit"
                  disabled={isSaving}
                  className="bg-mono-accent/10 text-mono-text hover:bg-mono-accent/10  px-6 py-2.5 rounded-xl text-xs uppercase tracking-wide font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? "Onboarding..." : "Register Fixed Asset"}
                </PerformanceControlButton>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
