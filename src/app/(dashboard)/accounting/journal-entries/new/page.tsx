import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { listAccounts } from "@/modules/accounting/service";
import { NewJVClient } from "./new-jv-client";
import { AccountingRoutePageHeader } from "@/modules/accounting/components/accounting-workspace";

export default async function NewJournalEntryPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId!;

  // Fetch leaf accounts and branches
  const [accounts, branches] = await Promise.all([
    listAccounts(orgId),
    db.branch.findMany({ where: { orgId } }),
  ]);

  const leafAccounts = accounts
    .filter((a) => !a.isGroup && a.isActive)
    .map((a) => ({
      id: a.id,
      accountCode: a.accountCode,
      accountName: a.accountName,
    }));

  return (
    <>
      <AccountingRoutePageHeader />
      <NewJVClient accounts={leafAccounts} branches={branches} />
    </>
  );
}
