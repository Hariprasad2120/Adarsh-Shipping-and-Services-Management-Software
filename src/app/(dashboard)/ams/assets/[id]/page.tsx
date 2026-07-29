import {
  PerformanceTable,
  PerformanceTableBody,
  PerformanceTableCell,
  PerformanceTableHead,
  PerformanceTableHeader,
  PerformanceTableRow,
} from "@/components/monolith/performance-workspace";
import React from "react";
import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/navigation";
import NextLink from "next/link";
import { getAsset } from "@/modules/accounting/service";
import {
  ShieldAlert,
  ArrowLeft,
  Calendar,
  FileText,
  Settings,
  ShieldCheck,
} from "lucide-react";

interface AssetDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AssetDetailPage({
  params,
}: AssetDetailPageProps) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <div className="p-8 text-center text-[var(--mnx-danger)]">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Configuration Error</h2>
        <p className="text-sm mt-1">Missing organisation context.</p>
      </div>
    );
  }

  const { id } = await params;
  const asset = await getAsset(orgId, id);

  if (!asset) notFound();

  const purchaseValue = Number(asset.purchaseValue);
  const accumulatedDepreciation = Number(asset.accumulatedDepreciation);
  const bookValue = Number(asset.bookValue);

  return (
    <div className="p-8 space-y-6 max-w-[1200px] mx-auto animate-in fade-in duration-200">
      {/* ─── HEADER ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-mono-border/20 pb-5">
        <NextLink
          href="/ams/assets"
          className="p-1.5 text-mono-muted hover:text-mono-text hover:bg-mono-card rounded-xl transition-all cursor-pointer border border-mono-border"
          title="Back to Register"
        >
          <ArrowLeft className="size-5" />
        </NextLink>
        <div>
          <h2 className="text-xl font-bold text-mono-text uppercase tracking-wider">
            {asset.assetName}
          </h2>
          <span className="text-[10px] font-mono text-mono-muted block tracking-wider mt-0.5">
            Asset Code: {asset.assetCode}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Asset profile card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-xl bg-mono-card border border-mono-border space-y-4 mnx-performance-surface mnx-accent-edge">
            <div className="flex items-center gap-3 border-b border-mono-border pb-3 mb-2">
              <Settings className="size-4.5 text-mono-accent" />
              <h3 className="font-bold text-sm text-mono-text uppercase tracking-wider">
                Asset Profile
              </h3>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-mono-border pb-1.5">
                <span className="text-mono-muted">Acquisition Date:</span>
                <span className="text-mono-text font-medium">
                  {asset.purchaseDate.toLocaleDateString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between border-b border-mono-border pb-1.5">
                <span className="text-mono-muted">Original Cost:</span>
                <span className="text-mono-text font-bold font-mono">
                  ₹
                  {purchaseValue.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between border-b border-mono-border pb-1.5">
                <span className="text-mono-muted">Depr. Rate (S/L):</span>
                <span className="text-mono-text font-medium">
                  {asset.depreciationRate}% p.a.
                </span>
              </div>
              <div className="flex justify-between border-b border-mono-border pb-1.5">
                <span className="text-mono-muted">Total Accrued Depr:</span>
                <span className="text-mono-text font-semibold font-mono">
                  ₹
                  {accumulatedDepreciation.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between border-b border-mono-border pb-1.5 font-bold">
                <span className="text-mono-accent">Net Book Value:</span>
                <span className="text-mono-accent font-mono">
                  ₹
                  {bookValue.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-mono-muted">Status:</span>
                <span
                  className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                    asset.status === "ACTIVE"
                      ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]"
                      : "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]"
                  }`}
                >
                  {asset.status.replace("_", " ")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Historical Depreciation Ledger */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-xl bg-mono-card border border-mono-border space-y-4">
            <div className="flex items-center gap-3 border-b border-mono-border pb-3">
              <Calendar className="size-4.5 text-mono-accent" />
              <h3 className="font-bold text-sm text-mono-text uppercase tracking-wider">
                Depreciation Journal Listings
              </h3>
            </div>

            {asset.depreciationEntries.length === 0 ? (
              <div className="text-center py-12 text-mono-muted text-sm">
                No depreciation postings registered yet. Apply monthly runs from
                the Asset Register.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <PerformanceTable className="mnx-workspace-table">
                  <PerformanceTableHeader>
                    <PerformanceTableRow>
                      <PerformanceTableHead>
                        Depreciation Date
                      </PerformanceTableHead>
                      <PerformanceTableHead>
                        Applied Amount
                      </PerformanceTableHead>
                      <PerformanceTableHead>
                        Linked Journal entry
                      </PerformanceTableHead>
                    </PerformanceTableRow>
                  </PerformanceTableHeader>
                  <PerformanceTableBody>
                    {asset.depreciationEntries.map((entry) => {
                      const depDate = new Date(entry.depreciationDate);
                      const monthStr = depDate.toLocaleString("en-IN", {
                        month: "long",
                        year: "numeric",
                      });
                      return (
                        <PerformanceTableRow
                          key={entry.id}
                          className="hover:bg-mono-card transition-all"
                        >
                          <PerformanceTableCell className="font-semibold text-mono-text">
                            {monthStr}
                          </PerformanceTableCell>
                          <PerformanceTableCell className="mnx-numeric font-bold text-mono-accent">
                            ₹
                            {Number(entry.depreciationAmount).toLocaleString(
                              "en-IN",
                              { minimumFractionDigits: 2 },
                            )}
                          </PerformanceTableCell>
                          <PerformanceTableCell>
                            {entry.journalEntry ? (
                              <NextLink
                                href={`/accounting/journal-entries/${entry.journalEntry.id}`}
                                className="text-mono-accent hover:underline font-mono text-xs font-bold"
                              >
                                {entry.journalEntry.voucherNo}
                              </NextLink>
                            ) : (
                              <span className="text-mono-muted">—</span>
                            )}
                          </PerformanceTableCell>
                        </PerformanceTableRow>
                      );
                    })}
                  </PerformanceTableBody>
                </PerformanceTable>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
