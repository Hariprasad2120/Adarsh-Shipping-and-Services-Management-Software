import { Filter } from "lucide-react";
import { redirect } from "next/navigation";
import { DateInput } from "@/components/monolith/date-input";
import {
  AccountingAction,
  AccountingAlert,
  AccountingEmptyTableRow,
  AccountingField,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingSelect,
  AccountingTable,
  AccountingToolbar,
} from "@/components/monolith/accounting-workspace";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTrialBalance } from "@/modules/accounting/reports";

interface TBPageProps {
  searchParams: Promise<{
    branchId?: string;
    fromDate?: string;
    toDate?: string;
  }>;
}

function money(value: number) {
  return value > 0
    ? `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
    : "—";
}

export default async function TrialBalanceReportPage({
  searchParams,
}: TBPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const branchId = params.branchId || undefined;
  const fromDate = params.fromDate ? new Date(params.fromDate) : undefined;
  const toDate = params.toDate ? new Date(params.toDate) : undefined;
  const [branches, rows] = await Promise.all([
    db.branch.findMany({ where: { orgId: session.user.orgId! } }),
    getTrialBalance(session.user.orgId!, {
      branchId,
      fromDate,
      toDate,
      includeZero: false,
    }),
  ]);

  const totals = rows.reduce(
    (result, row) => ({
      openingDebit: result.openingDebit + row.openingDebit,
      openingCredit: result.openingCredit + row.openingCredit,
      debit: result.debit + row.debit,
      credit: result.credit + row.credit,
      closingDebit: result.closingDebit + row.closingDebit,
      closingCredit: result.closingCredit + row.closingCredit,
    }),
    {
      openingDebit: 0,
      openingCredit: 0,
      debit: 0,
      credit: 0,
      closingDebit: 0,
      closingCredit: 0,
    },
  );
  const closingBalanced =
    Math.abs(totals.closingDebit - totals.closingCredit) <= 0.05;

  return (
    <>
      <AccountingRoutePageHeader />
      <AccountingToolbar>
        <form method="GET">
          <AccountingField label="Branch" htmlFor="tb-branch">
            <AccountingSelect
              id="tb-branch"
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
          <AccountingField label="From date" htmlFor="tb-from">
            <DateInput
              id="tb-from"
              name="fromDate"
              defaultValue={params.fromDate || ""}
            />
          </AccountingField>
          <AccountingField label="To date" htmlFor="tb-to">
            <DateInput
              id="tb-to"
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
      <AccountingAlert variant={closingBalanced ? "success" : "warning"}>
        {closingBalanced
          ? "Closing debits and credits are balanced."
          : `Closing balance difference: ₹${Math.abs(totals.closingDebit - totals.closingCredit).toFixed(2)}.`}
      </AccountingAlert>
      <AccountingSection
        eyebrow="Ledger check"
        title="Period balances worksheet"
        description="Opening balances, period movement, and closing position for active ledger accounts."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Account</th>
              <th>Root type</th>
              <th>Opening debit</th>
              <th>Opening credit</th>
              <th>Period debit</th>
              <th>Period credit</th>
              <th>Closing debit</th>
              <th>Closing credit</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <AccountingEmptyTableRow colSpan={8}>
                No accounts have active balances during this period.
              </AccountingEmptyTableRow>
            ) : (
              rows.map((row) => (
                <tr key={row.accountId}>
                  <td>
                    <strong>{row.accountName}</strong>
                    <small>{row.accountCode}</small>
                  </td>
                  <td>{row.rootType}</td>
                  <td className="mnx-accounting-amount">{money(row.openingDebit)}</td>
                  <td className="mnx-accounting-amount">{money(row.openingCredit)}</td>
                  <td className="mnx-accounting-amount">{money(row.debit)}</td>
                  <td className="mnx-accounting-amount">{money(row.credit)}</td>
                  <td className="mnx-accounting-amount">{money(row.closingDebit)}</td>
                  <td className="mnx-accounting-amount">{money(row.closingCredit)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <th>Summary totals</th>
              <td />
              <td className="mnx-accounting-amount">{money(totals.openingDebit)}</td>
              <td className="mnx-accounting-amount">{money(totals.openingCredit)}</td>
              <td className="mnx-accounting-amount">{money(totals.debit)}</td>
              <td className="mnx-accounting-amount">{money(totals.credit)}</td>
              <td className="mnx-accounting-amount">{money(totals.closingDebit)}</td>
              <td className="mnx-accounting-amount">{money(totals.closingCredit)}</td>
            </tr>
          </tfoot>
        </AccountingTable>
      </AccountingSection>
    </>
  );
}
