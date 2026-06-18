import React from "react";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/navigation";
import NextLink from "next/link";
import { getAsset } from "@/modules/accounting/service";
import { ShieldAlert, ArrowLeft, Calendar, FileText, Settings, ShieldCheck } from "lucide-react";

interface AssetDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AssetDetailPage({ params }: AssetDetailPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <div className="p-8 text-center text-red-400">
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
      <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-5">
        <NextLink
          href="/ams/assets"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-xl transition-all cursor-pointer border border-[#1c212a]/30"
          title="Back to Register"
        >
          <ArrowLeft className="size-5" />
        </NextLink>
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">{asset.assetName}</h2>
          <span className="text-[10px] font-mono text-slate-400 block tracking-wider mt-0.5">Asset Code: {asset.assetCode}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Asset profile card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4 card-left-accent">
            <div className="flex items-center gap-3 border-b border-[#1c212a]/30 pb-3 mb-2">
              <Settings className="size-4.5 text-[#00cec4]" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">Asset Profile</h3>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-[#1c212a]/20 pb-1.5">
                <span className="text-slate-400">Acquisition Date:</span>
                <span className="text-white font-medium">{asset.purchaseDate.toLocaleDateString("en-IN")}</span>
              </div>
              <div className="flex justify-between border-b border-[#1c212a]/20 pb-1.5">
                <span className="text-slate-400">Original Cost:</span>
                <span className="text-white font-bold font-mono">₹{purchaseValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-b border-[#1c212a]/20 pb-1.5">
                <span className="text-slate-400">Depr. Rate (S/L):</span>
                <span className="text-white font-medium">{asset.depreciationRate}% p.a.</span>
              </div>
              <div className="flex justify-between border-b border-[#1c212a]/20 pb-1.5">
                <span className="text-slate-400">Total Accrued Depr:</span>
                <span className="text-white font-semibold font-mono">₹{accumulatedDepreciation.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-b border-[#1c212a]/20 pb-1.5 font-bold">
                <span className="text-[#00cec4]">Net Book Value:</span>
                <span className="text-[#00cec4] font-mono">₹{bookValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Status:</span>
                <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                  asset.status === "ACTIVE"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                }`}>
                  {asset.status.replace("_", " ")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Historical Depreciation Ledger */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
            <div className="flex items-center gap-3 border-b border-[#1c212a]/30 pb-3">
              <Calendar className="size-4.5 text-[#00cec4]" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">Depreciation Journal Listings</h3>
            </div>

            {asset.depreciationEntries.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No depreciation postings registered yet. Apply monthly runs from the Asset Register.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="ds-table">
                  <thead>
                    <tr>
                      <th>Depreciation Date</th>
                      <th>Applied Amount</th>
                      <th>Linked Journal entry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asset.depreciationEntries.map((entry) => {
                      const depDate = new Date(entry.depreciationDate);
                      const monthStr = depDate.toLocaleString("en-IN", { month: "long", year: "numeric" });
                      return (
                        <tr key={entry.id} className="hover:bg-[#161f28]/10 transition-all">
                          <td className="font-semibold text-white">{monthStr}</td>
                          <td className="ds-numeric font-bold text-[#00cec4]">
                            ₹{Number(entry.depreciationAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td>
                            {entry.journalEntry ? (
                              <NextLink
                                href={`/accounting/journal-entries/${entry.journalEntry.id}`}
                                className="text-[#00cec4] hover:underline font-mono text-xs font-bold"
                              >
                                {entry.journalEntry.voucherNo}
                              </NextLink>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
