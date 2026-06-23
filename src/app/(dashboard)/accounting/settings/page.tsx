import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getAccountingSettings, listAccounts } from "@/modules/accounting/service";
import { SettingsClient } from "./settings-client";

export default async function AccountingSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;

  // Fetch accounts and settings (seeds automatically if empty)
  const [accounts, settings] = await Promise.all([
    listAccounts(orgId),
    getAccountingSettings(orgId),
  ]);

  const leafAccounts = accounts
    .filter((a) => !a.isGroup && a.isActive)
    .map((a) => ({
      id: a.id,
      accountCode: a.accountCode,
      accountName: a.accountName,
      accountType: a.accountType,
    }));

  return (
    <div className="mx-auto max-w-[1000px] space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline-variant/20 pb-5">
        <div>
          <h2 className="ds-h1 text-white">Accounting Configuration</h2>
          <p className="text-slate-400 text-xs mt-1">
            Map default ledger accounts for automated invoice posting, tax calculation, payroll batches, and depreciation.
          </p>
        </div>
      </div>

      <SettingsClient initialSettings={settings} accounts={leafAccounts} />
    </div>
  );
}
