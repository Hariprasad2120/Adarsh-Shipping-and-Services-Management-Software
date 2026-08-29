import { TransactionLockingClient } from "./transaction-locking-client";
import {
  AccountingActionLink,
  AccountingRoutePageHeader,
} from "@/components/monolith";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getAccountingConfigurationOverview } from "@/modules/accounting/operational-queries";
import { getTransactionLock } from "@/modules/accounting/service";

export default async function TransactionLockingPage() {
  const { caps, orgId } = await requireAccountingRouteAccess(
    "/accounting/transaction-locking",
  );
  const [configuration, initialPeriodLock] = await Promise.all([
    getAccountingConfigurationOverview(orgId),
    getTransactionLock(orgId),
  ]);

  return (
    <>
      <AccountingRoutePageHeader
        actions={
          <>
            <AccountingActionLink href="/accounting/configuration">
              Accounting configuration
            </AccountingActionLink>
            {caps["accounting.settings.manage"] ? (
              <AccountingActionLink href="/accounting/configuration/admin">
                Config admin
              </AccountingActionLink>
            ) : null}
          </>
        }
      />
      <TransactionLockingClient
        canManage={
          Boolean(caps["accounting.period_lock.request"]) ||
          Boolean(caps["accounting.settings.manage"])
        }
        initialPeriodLock={initialPeriodLock}
        periods={configuration.periods}
      />
    </>
  );
}
