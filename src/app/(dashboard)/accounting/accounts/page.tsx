import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getChartOfAccounts } from "@/modules/accounting/service";
import { AccountsClient } from "./accounts-client";
import { AccountingRoutePageHeader } from "@/modules/accounting/components/accounting-workspace";

export default async function ChartOfAccountsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;

  const [coa, branches] = await Promise.all([
    getChartOfAccounts(orgId),
    db.branch.findMany({ where: { orgId } }),
  ]);

  return (
    <>
      <AccountingRoutePageHeader />
      <AccountsClient initialCoa={coa} branches={branches} />
    </>
  );
}
