import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getChartOfAccounts } from "@/modules/accounting/service";
import { AccountsClient } from "./accounts-client";
import { ShieldAlert } from "lucide-react";

export default async function ChartOfAccountsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;

  const [coa, branches] = await Promise.all([
    getChartOfAccounts(orgId),
    db.branch.findMany({ where: { orgId } }),
  ]);

  return (
    <div className="p-8 space-y-6 max-w-[1400px] mx-auto animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline-variant/20 pb-5">
        <div>
          <h2 className="ds-h1 text-white">Chart of Accounts</h2>
          <p className="text-slate-400 text-xs mt-1">
            Browse, group, and register corporate ledger accounts across Asset, Liability, Equity, Income, and Expense classifications.
          </p>
        </div>
      </div>

      <AccountsClient initialCoa={coa} branches={branches} />
    </div>
  );
}
