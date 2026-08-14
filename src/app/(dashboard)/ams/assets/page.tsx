import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { listAssets, listAccounts } from "@/modules/accounting/service";
import { AssetsClient } from "./assets-client";
import { ShieldAlert } from "lucide-react";
import {
  PerformanceSection,
  PerformanceSectionHeader,
} from "@/modules/performance/components/performance-workspace";
import { WorkspaceAlert, WorkspaceBadge, WorkspaceState } from "@/components/layout/workspace";

export default async function AssetsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <WorkspaceState
        variant="danger"
        eyebrow="Asset operations"
        title="Configuration error"
        description="Missing organisation context."
        icon={<ShieldAlert aria-hidden="true" />}
      />
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
      <PerformanceSection>
        <PerformanceSectionHeader
          eyebrow="Asset operations"
          title="Fixed asset register"
          description="Manage corporate fixed assets, onboard capital items, and calculate monthly straight-line depreciation schedules."
          actions={
            <WorkspaceBadge variant="accent">
              {serializedAssets.length} assets
            </WorkspaceBadge>
          }
        />

        {!settingsConfigured ? (
          <WorkspaceAlert className="mx-5 mb-5" variant="warning">
            <ShieldAlert className="size-5 shrink-0" />
            <span>
              Configure default Depreciation Expense and Accumulated Depreciation
              accounts in Accounting Settings or map them directly on each
              asset before running monthly depreciation.
            </span>
          </WorkspaceAlert>
        ) : null}

        <div className="px-5 pb-5">
          <AssetsClient
            initialAssets={serializedAssets}
            accounts={serializedAccounts}
            branches={branches}
            settingsConfigured={settingsConfigured}
          />
        </div>
      </PerformanceSection>
    </div>
  );
}
