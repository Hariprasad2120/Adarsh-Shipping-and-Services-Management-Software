import React from "react";
import { db } from "@/lib/db";
import { listAccounts } from "@/modules/accounting/service";
import { NewJVClient } from "./new-jv-client";
import { AccountingRoutePageHeader } from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";

export default async function NewJournalEntryPage() {
  const { orgId } = await requireAccountingRouteAccess(
    "/accounting/journal-entries/new",
    ["accounting.journal.prepare"],
  );

  // Fetch leaf accounts and branches
  const [accounts, branches] = await Promise.all([
    listAccounts(orgId),
    db.branch.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
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
      <AccountingRoutePageHeader
        eyebrow="General journal"
        title="New journal"
        description="Prepare a balanced manual journal draft with branch-scoped narration and exact line totals."
      />
      <NewJVClient accounts={leafAccounts} branches={branches} />
    </>
  );
}
