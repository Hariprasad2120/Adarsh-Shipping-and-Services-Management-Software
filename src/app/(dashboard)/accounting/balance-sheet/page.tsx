import { Filter } from "lucide-react";
import { redirect } from "next/navigation";
import { DateInput } from "@/components/monolith/date-input";
import {
  AccountingAction,
  AccountingAlert,
  AccountingField,
  AccountingMetric,
  AccountingMetrics,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingSelect,
  AccountingToolbar,
} from "@/components/monolith/accounting-workspace";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBalanceSheet } from "@/modules/accounting/reports";

interface BSPageProps {
  searchParams: Promise<{ branchId?: string; toDate?: string }>;
}

function StatementLines({
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
        <li className="mnx-accounting-list-row" key={`${account.code}-${account.name}`}>
          <div>
            <b>{account.name}</b>
            <small>{account.code}</small>
          </div>
          <span className="mnx-accounting-amount">
            ₹{account.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function BalanceSheetReportPage({
  searchParams,
}: BSPageProps) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const branchId = params.branchId || undefined;
  const toDate = params.toDate ? new Date(params.toDate) : undefined;
  const [branches, bs] = await Promise.all([
    db.branch.findMany({ where: { orgId: session.user.orgId! } }),
    getBalanceSheet(session.user.orgId!, { branchId, toDate }),
  ]);

  return (
    <>
      <AccountingRoutePageHeader />
      <AccountingToolbar>
        <form method="GET">
          <AccountingField label="Branch" htmlFor="bs-branch">
            <AccountingSelect
              id="bs-branch"
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
          <AccountingField label="As of date" htmlFor="bs-date">
            <DateInput
              id="bs-date"
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
      <AccountingAlert variant={bs.isBalanced ? "success" : "warning"}>
        {bs.isBalanced
          ? "The statement is balanced: total assets equal liabilities and equity."
          : "The statement is out of balance. Review the underlying ledger postings."}
      </AccountingAlert>
      <AccountingMetrics>
        <AccountingMetric
          label="Total assets"
          value={`₹${bs.totalAssets.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
        />
        <AccountingMetric
          label="Total liabilities"
          value={`₹${bs.liabilities.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
        />
        <AccountingMetric
          label="Total equity"
          value={`₹${bs.equity.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
        />
        <AccountingMetric
          label="Liabilities and equity"
          value={`₹${bs.totalLiabilitiesAndEquity.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
        />
      </AccountingMetrics>
      <AccountingSection
        eyebrow="01"
        title="Assets"
        description="Resources controlled by the organisation at the reporting date."
      >
        <StatementLines accounts={bs.assets.accounts} empty="No asset balances." />
      </AccountingSection>
      <AccountingSection
        eyebrow="02"
        title="Liabilities"
        description="Current and non-current obligations at the reporting date."
      >
        <StatementLines
          accounts={bs.liabilities.accounts}
          empty="No liability balances."
        />
      </AccountingSection>
      <AccountingSection
        eyebrow="03"
        title="Owner's equity"
        description="Capital, reserves, and current-year retained performance."
      >
        <StatementLines accounts={bs.equity.accounts} empty="No equity balances." />
        {bs.currentYearProfit !== 0 ? (
          <p className="mnx-accounting-list-row">
            <span>Retained surplus (current-year profit/loss)</span>
            <strong className="mnx-accounting-amount">
              ₹
              {bs.currentYearProfit.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </strong>
          </p>
        ) : null}
      </AccountingSection>
    </>
  );
}
