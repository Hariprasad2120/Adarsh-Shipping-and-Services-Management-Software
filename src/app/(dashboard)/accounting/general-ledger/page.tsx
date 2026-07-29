import { Filter } from "lucide-react";
import { redirect } from "next/navigation";
import { DateInput } from "@/components/monolith/date-input";
import {
  AccountingAction,
  AccountingActionLink,
  AccountingEmptyTableRow,
  AccountingField,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingSelect,
  AccountingTable,
  AccountingToolbar,
} from "@/components/monolith/accounting-workspace";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getGeneralLedger } from "@/modules/accounting/reports";
import { listAccounts } from "@/modules/accounting/service";

interface GLPageProps {
  searchParams: Promise<{
    accountId?: string;
    branchId?: string;
    fromDate?: string;
    toDate?: string;
  }>;
}

function voucherPath(voucherType: string, voucherId: string) {
  if (voucherType === "SALES_INVOICE")
    return `/accounting/sales-invoices/${voucherId}`;
  if (voucherType === "PURCHASE_INVOICE")
    return `/accounting/purchase-invoices/${voucherId}`;
  if (voucherType === "PAYMENT_ENTRY")
    return `/accounting/payment-entries/${voucherId}`;
  return `/accounting/journal-entries/${voucherId}`;
}

export default async function GeneralLedgerReportPage({
  searchParams,
}: GLPageProps) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const accountId = params.accountId || undefined;
  const branchId = params.branchId || undefined;
  const fromDate = params.fromDate ? new Date(params.fromDate) : undefined;
  const toDate = params.toDate ? new Date(params.toDate) : undefined;
  const [accounts, branches, entries] = await Promise.all([
    listAccounts(session.user.orgId!),
    db.branch.findMany({ where: { orgId: session.user.orgId! } }),
    getGeneralLedger(session.user.orgId!, {
      accountId,
      branchId,
      fromDate,
      toDate,
    }),
  ]);
  const leafAccounts = accounts.filter(
    (account) => !account.isGroup && account.isActive,
  );
  const totals = entries.reduce(
    (result, entry) =>
      entry.isCancelled
        ? result
        : {
            debit: result.debit + entry.debit,
            credit: result.credit + entry.credit,
          },
    { debit: 0, credit: 0 },
  );

  return (
    <>
      <AccountingRoutePageHeader />
      <AccountingToolbar>
        <form method="GET">
          <AccountingField label="Ledger account" htmlFor="gl-account">
            <AccountingSelect
              id="gl-account"
              name="accountId"
              defaultValue={accountId || ""}
            >
              <option value="">All accounts</option>
              {leafAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountCode} — {account.accountName}
                </option>
              ))}
            </AccountingSelect>
          </AccountingField>
          <AccountingField label="Branch" htmlFor="gl-branch">
            <AccountingSelect
              id="gl-branch"
              name="branchId"
              defaultValue={branchId || ""}
            >
              <option value="">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </AccountingSelect>
          </AccountingField>
          <AccountingField label="From date" htmlFor="gl-from">
            <DateInput
              id="gl-from"
              name="fromDate"
              defaultValue={params.fromDate || ""}
            />
          </AccountingField>
          <AccountingField label="To date" htmlFor="gl-to">
            <DateInput
              id="gl-to"
              name="toDate"
              defaultValue={params.toDate || ""}
            />
          </AccountingField>
          <AccountingAction type="submit">
            <Filter aria-hidden="true" size={16} />
            Apply filters
          </AccountingAction>
        </form>
      </AccountingToolbar>
      <AccountingSection
        eyebrow="Posting audit"
        title="General ledger records"
        description={`${entries.length} posting ${entries.length === 1 ? "record" : "records"} match the selected scope.`}
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Posting date</th>
              <th>Account</th>
              <th>Voucher</th>
              <th>Remarks</th>
              <th>Debit</th>
              <th>Credit</th>
              <th>Running balance</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <AccountingEmptyTableRow colSpan={7}>
                No general ledger postings match the selected filters.
              </AccountingEmptyTableRow>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} data-cancelled={entry.isCancelled || undefined}>
                  <td>{new Date(entry.postingDate).toLocaleDateString("en-IN")}</td>
                  <td>
                    <strong>{entry.accountName}</strong>
                    <small>{entry.accountCode}</small>
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={voucherPath(entry.voucherType, entry.voucherId)}
                    >
                      {entry.voucherType.replaceAll("_", " ")}
                    </AccountingActionLink>
                  </td>
                  <td>{entry.remarks || "—"}</td>
                  <td className="mnx-accounting-amount">
                    {entry.debit > 0
                      ? `₹${entry.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                      : "—"}
                  </td>
                  <td className="mnx-accounting-amount">
                    {entry.credit > 0
                      ? `₹${entry.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                      : "—"}
                  </td>
                  <td className="mnx-accounting-amount">
                    ₹
                    {entry.runningBalance.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <th>Period summary</th>
              <td colSpan={3} />
              <td className="mnx-accounting-amount">
                ₹{totals.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </td>
              <td className="mnx-accounting-amount">
                ₹{totals.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </td>
              <td />
            </tr>
          </tfoot>
        </AccountingTable>
      </AccountingSection>
    </>
  );
}
