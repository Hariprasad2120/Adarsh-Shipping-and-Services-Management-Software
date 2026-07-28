import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { listAssets, listAccounts } from "@/modules/accounting/service";
import { AssetsClient } from "./assets-client";
import { ShieldAlert } from "lucide-react";

export default async function AssetsPage() {
  const session = await auth();
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

  // Fetch data
  const [assets, accounts, branches, settings] = await Promise.all([
    listAssets(orgId),
    listAccounts(orgId),
    db.branch.findMany({ where: { orgId } }),
    db.accountingSettings.findUnique({ where: { orgId } }),
  ]);

  // Serialize values for Client component
  const serializedAssets = assets.map((asset) => ({
    ...asset,
    purchaseValue: Number(asset.purchaseValue),
    accumulatedDepreciation: Number(asset.accumulatedDepreciation),
    bookValue: Number(asset.bookValue),
    purchaseDate: asset.purchaseDate.toISOString(),
  }));

  const serializedAccounts = accounts.map((acc) => ({
    id: acc.id,
    accountName: acc.accountName,
    accountCode: acc.accountCode,
    accountType: acc.accountType,
  }));

  const settingsConfigured = !!(
    settings?.defaultDepreciationExpenseAccountId &&
    settings?.defaultAccumulatedDepreciationAccountId
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-mono-border/20 pb-5">
        <div>
          <h2 className="mnx-title-1 text-mono-text">Fixed Asset Register</h2>
          <p className="text-mono-muted text-xs mt-1">
            Manage corporate fixed assets, onboard capital items, and calculate
            monthly straight-line depreciation schedules.
          </p>
        </div>
      </div>

      {!settingsConfigured && (
        <div className="p-4 rounded-xl border border-mono-border bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] text-xs flex gap-3 items-start mnx-performance-surface mnx-accent-edge-warning">
          <ShieldAlert className="size-5 shrink-0" />
          <div>
            <span className="font-bold uppercase tracking-wider block mb-1">
              Accounting Config Required
            </span>
            To process monthly depreciation, configure default Depreciation
            Expense & Accumulated Depreciation accounts in{" "}
            <span className="font-bold underline">Accounting Settings</span> or
            map them directly on each asset.
          </div>
        </div>
      )}

      <AssetsClient
        initialAssets={serializedAssets}
        accounts={serializedAccounts}
        branches={branches}
        settingsConfigured={settingsConfigured}
      />
    </div>
  );
}
