import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getAccountingSettings, listAccounts } from "@/modules/accounting/service";
import { SettingsClient } from "./settings-client";
import { AccountingRoutePageHeader } from "@/components/monolith/accounting-workspace";

export default async function AccountingSettingsPage() {
  const { orgId } = await requireAccountingRouteAccess("/accounting/settings");

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
