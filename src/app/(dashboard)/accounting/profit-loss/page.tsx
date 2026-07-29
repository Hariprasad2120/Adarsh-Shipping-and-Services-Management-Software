import { Filter } from "lucide-react";
import { redirect } from "next/navigation";
import { DateInput } from "@/components/monolith/date-input";
import {
  AccountingAction,
  AccountingField,
  AccountingMetric,
  AccountingMetrics,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingSelect,
  AccountingToolbar,
} from "@/components/monolith/accounting-workspace";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProfitAndLoss } from "@/modules/accounting/reports";

interface PLPageProps {
  searchParams: Promise<{
    branchId?: string;
    fromDate?: string;
    toDate?: string;
  }>;
}

function ReportLines({
  accounts,
  empty,
}: {
  accounts: Array<{ name: string; code: string; amount: number }>;
  empty: string;
}) {
  if (accounts.length === 0) return <p>{empty}</p>;

  return (
    <ul className="mnx-accounting-list">
      {accounts.map((account) => (
        <li
          className="mnx-accounting-list-row"
          key={`${account.code}-${account.name}`}
        >
          <div>
            <b>{account.name}</b>
            <small>{account.code}</small>
          </div>
          <span className="mnx-accounting-amount">
            ₹
            {account.amount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function ProfitLossReportPage({
  searchParams,
}: PLPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const branchId = params.branchId || undefined;
  const fromDate = params.fromDate ? new Date(params.fromDate) : undefined;
  const toDate = params.toDate ? new Date(params.toDate) : undefined;
  const [branches, pl] = await Promise.all([
    db.branch.findMany({ where: { orgId: session.user.orgId! } }),
    getProfitAndLoss(session.user.orgId!, { branchId, fromDate, toDate }),
  ]);

  return (
    <>
      <AccountingRoutePageHeader />
      <AccountingToolbar>
        <form method="GET">
          <AccountingField label="Branch" htmlFor="pl-branch">
            <AccountingSelect
              id="pl-branch"
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
          <AccountingField label="From date" htmlFor="pl-from">
            <DateInput
              id="pl-from"
              name="fromDate"
              defaultValue={params.fromDate || ""}
            />
          </AccountingField>
          <AccountingField label="To date" htmlFor="pl-to">
            <DateInput
              id="pl-to"
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
      <AccountingMetrics>
        <AccountingMetric
          label="Total revenue"
          value={`₹${pl.income.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          detail="Income posted for the selected period"
        />
        <AccountingMetric
          label="Operating expense"
          value={`₹${pl.expense.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          detail="Expenses posted for the selected period"
        />
        <AccountingMetric
          label={pl.netProfit >= 0 ? "Net profit" : "Net loss"}
          value={`₹${pl.netProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          detail="Revenue less operating expense"
        />
      </AccountingMetrics>
      <AccountingSection
        eyebrow="01"
        title="Revenue and income"
        description="Posted income accounts for the selected reporting scope."
      >
        <ReportLines
          accounts={pl.income.accounts}
          empty="No revenue was recorded in this period."
        />
      </AccountingSection>
      <AccountingSection
        eyebrow="02"
        title="Operating expenses"
        description="Posted expense accounts for the selected reporting scope."
      >
        <ReportLines
          accounts={pl.expense.accounts}
          empty="No expenses were recorded in this period."
        />
      </AccountingSection>
    </>
  );
}
