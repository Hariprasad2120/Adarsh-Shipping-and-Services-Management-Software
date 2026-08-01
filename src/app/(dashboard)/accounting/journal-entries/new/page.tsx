import React from "react";
import { db } from "@/lib/db";
import { listAccounts } from "@/modules/accounting/service";
import { NewJVClient } from "./new-jv-client";
import { AccountingRoutePageHeader } from "@/modules/accounting/components/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";

export default async function NewJournalEntryPage() {
  const { orgId } = await requireAccountingRouteAccess(
    "/accounting/journal-entries/new",
    ["accounting.journal.prepare"],
  );

  // Fetch leaf accounts and branches
  const [accounts, branches, customers, vendors, employees] = await Promise.all([
    listAccounts(orgId),
    db.branch.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.crmAccount.findMany({
      where: { orgId, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.crmVendor.findMany({
      where: { orgId, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { orgId, active: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const leafAccounts = accounts
    .filter((a) => !a.isGroup && a.isActive)
    .map((a) => ({
      id: a.id,
      accountCode: a.accountCode,
      accountName: a.accountName,
      allowJournalContact: a.allowJournalContact,
    }));

  return (
    <>
      <AccountingRoutePageHeader
        eyebrow="General journal"
        title="New journal"
        description="Prepare a balanced manual journal draft with branch-scoped narration and exact line totals."
      />
      <NewJVClient
        accounts={leafAccounts}
        branches={branches}
        contacts={[
          ...customers.map((customer) => ({
            id: customer.id,
            label: customer.name,
            type: "CUSTOMER" as const,
          })),
          ...vendors.map((vendor) => ({
            id: vendor.id,
            label: vendor.name,
            type: "SUPPLIER" as const,
          })),
          ...employees.map((employee) => ({
            id: employee.id,
            label: employee.name || employee.email || employee.id,
            type: "EMPLOYEE" as const,
          })),
        ]}
      />
    </>
  );
}
