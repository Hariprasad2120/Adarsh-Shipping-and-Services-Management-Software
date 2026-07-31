import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAccountingSettings, listAccounts } from "@/modules/accounting/service";
import { SettingsClient } from "./settings-client";
import { AccountingRoutePageHeader } from "@/components/monolith/accounting-workspace";

export default async function AccountingSettingsPage() {
  const session = await getSession();
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
    <>
      <AccountingRoutePageHeader />
      <SettingsClient initialSettings={settings} accounts={leafAccounts} />
    </>
  );
}
