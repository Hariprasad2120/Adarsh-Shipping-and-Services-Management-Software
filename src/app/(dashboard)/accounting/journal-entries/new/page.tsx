import React from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getJournalEntry, listAccounts } from "@/modules/accounting/service";
import { NewJVClient } from "./new-jv-client";
import { AccountingRoutePageHeader } from "@/modules/accounting/components/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";

export default async function NewJournalEntryPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;
  const { orgId } = await requireAccountingRouteAccess(
    "/accounting/journal-entries/new",
    ["accounting.journal.prepare"],
  );

  // Fetch leaf accounts and branches
  const [accounts, branches, customers, vendors, employees, draft] = await Promise.all([
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
    edit ? getJournalEntry(orgId, edit) : Promise.resolve(null),
  ]);

  if (edit && (!draft || draft.status !== "DRAFT")) {
    notFound();
  }

  const leafAccounts = accounts
    .filter((a) => !a.isGroup && a.isActive)
    .map((a) => ({
      id: a.id,
      accountCode: a.accountCode,
      accountName: a.accountName,
      allowJournalContact: a.allowJournalContact,
      }));

  const initialDraft =
    draft && draft.status === "DRAFT"
      ? {
          id: draft.id,
          branchId: draft.branchId ?? "",
          postingDate: draft.postingDate.toISOString().slice(0, 10),
          remarks: draft.remarks ?? "",
          lines: draft.lines.map((line) => ({
            accountId: line.accountId,
            debit: line.debit.toString(),
            credit: line.credit.toString(),
            remarks: line.remarks ?? "",
            partyKey:
              line.partyType && line.partyId
                ? `${line.partyType}::${line.partyId}`
                : "",
          })),
        }
      : null;

  return (
    <>
      <AccountingRoutePageHeader
        eyebrow="General journal"
        title={initialDraft ? "Edit journal draft" : "New journal"}
        description={
          initialDraft
            ? "Revise the draft journal before you submit it for independent approval."
            : "Prepare a balanced manual journal draft with branch-scoped narration and exact line totals."
        }
      />
      <NewJVClient
        accounts={leafAccounts}
        branches={branches}
        initialDraft={initialDraft}
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
