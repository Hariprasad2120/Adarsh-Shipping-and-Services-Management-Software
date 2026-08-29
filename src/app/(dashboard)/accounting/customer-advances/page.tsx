import {
  AccountingActionLink,
  AccountingRoutePageHeader,
  AccountingSection,
} from "@/components/monolith";
import { db } from "@/lib/db";
import { listAccounts } from "@/modules/accounting/service";
import { listCustomerAdvanceRequests } from "@/modules/accounting/customer-advances";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { CustomerAdvancesClient } from "./customer-advances-client";

export default async function CustomerAdvancesPage() {
  const { orgId, caps } = await requireAccountingRouteAccess(
    "/accounting/customer-advances",
    ["accounting.payment.read", "accounting.payment.create"],
  );

  const [advanceData, customers, branches, accounts] = await Promise.all([
    listCustomerAdvanceRequests(orgId),
    db.crmAccount.findMany({
      where: { orgId, status: "ACTIVE" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    db.branch.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    listAccounts(orgId),
  ]);

  const bankAccounts = accounts
    .filter(
      (account) =>
        !account.isGroup &&
        account.isActive &&
        (account.accountType === "BANK" || account.accountType === "CASH"),
    )
    .map((account) => ({
      id: account.id,
      accountCode: account.accountCode,
      accountName: account.accountName,
    }));

  return (
    <>
      <AccountingRoutePageHeader
        actions={
          <div className="mnx-accounting-inline-actions">
            <AccountingActionLink href="/accounting/customer-receipts">
              Customer receipts
            </AccountingActionLink>
            <AccountingActionLink href="/accounting/sales-receipts">
              Sales receipts
            </AccountingActionLink>
          </div>
        }
      />
      <AccountingSection
        eyebrow="Accounts receivable"
        title="Retainers and customer advances"
        description="Track advance requests, retainer billing asks, draft receipt preparation, and canonical receipt coverage before independent approval."
      >
        <CustomerAdvancesClient
          customers={customers.map((customer) => ({
            id: customer.id,
            name: customer.name,
            email: customer.email,
          }))}
          branches={branches}
          bankAccounts={bankAccounts}
          requests={advanceData.requests}
          summary={advanceData.summary}
          canManage={Boolean(caps["accounting.payment.create"])}
        />
      </AccountingSection>
    </>
  );
}
