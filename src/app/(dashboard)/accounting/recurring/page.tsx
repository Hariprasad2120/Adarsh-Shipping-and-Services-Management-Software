import {
  AccountingRoutePageHeader,
} from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { db } from "@/lib/db";
import { listRecurringSalesInvoiceProfiles } from "@/modules/accounting/recurring-sales-invoices";
import { listRecurringExpenseProfiles } from "@/modules/accounting/recurring-expenses";
import { RecurringSalesClient } from "./recurring-sales-client";
import { RecurringExpenseClient } from "./recurring-expense-client";

type RecurringProfileData = Awaited<
  ReturnType<typeof listRecurringSalesInvoiceProfiles>
>["profiles"][number];
type RecurringExpenseProfileData = Awaited<
  ReturnType<typeof listRecurringExpenseProfiles>
>["profiles"][number];

export default async function RecurringTransactionsPage({
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { orgId, caps } = await requireAccountingRouteAccess(
    "/accounting/recurring",
    [
      "accounting.recurring-template.admin",
      "accounting.recurring-occurrence.process",
    ],
  );
  const [profileData, expenseProfileData, customers, vendors, branches, expenseAccounts] = await Promise.all([
    listRecurringSalesInvoiceProfiles(orgId),
    listRecurringExpenseProfiles(orgId),
    db.crmAccount.findMany({
      where: { orgId, status: "ACTIVE" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    db.crmVendor.findMany({
      where: { orgId, status: "ACTIVE" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    db.branch.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.account.findMany({
      where: {
        orgId,
        isActive: true,
        isGroup: false,
        rootType: "EXPENSE",
      },
      select: { id: true, accountCode: true, accountName: true },
      orderBy: [{ accountCode: "asc" }],
    }),
  ]);
  return (
    <>
      <AccountingRoutePageHeader
        title="Recurring Operations"
        description="Manage recurring sales invoices and recurring bills with guarded draft generation, pause or skip controls, and generated record lineage."
      />
      <RecurringSalesClient
        customers={customers}
        branches={branches}
        profiles={profileData.profiles.map((profile: RecurringProfileData) => ({
          ...profile,
          startDate: profile.startDate.toISOString(),
          endDate: profile.endDate?.toISOString() ?? null,
          nextInvoiceDate: profile.nextInvoiceDate.toISOString(),
          lastInvoiceDate: profile.lastInvoiceDate?.toISOString() ?? null,
          lastFailureAt: profile.lastFailureAt?.toISOString() ?? null,
          lines: profile.lines.map((line: RecurringProfileData["lines"][number]) => ({
            ...line,
            qty: line.qty.toString(),
            rate: line.rate.toString(),
            taxRate: line.taxRate.toString(),
          })),
          runs: profile.runs.map((run: RecurringProfileData["runs"][number]) => ({
            ...run,
            dueDate: run.dueDate.toISOString(),
            createdAt: run.createdAt.toISOString(),
          })),
        }))}
        summary={profileData.summary}
        canManageTemplates={Boolean(caps["accounting.recurring-template.admin"])}
        canProcessOccurrences={Boolean(caps["accounting.recurring-occurrence.process"])}
      />
      <RecurringExpenseClient
        vendors={vendors}
        branches={branches}
        expenseAccounts={expenseAccounts}
        profiles={expenseProfileData.profiles.map((profile: RecurringExpenseProfileData) => ({
          ...profile,
          amount: profile.amount.toString(),
          startDate: profile.startDate.toISOString(),
          endDate: profile.endDate?.toISOString() ?? null,
          nextDueDate: profile.nextDueDate.toISOString(),
          runs: profile.runs.map((run: RecurringExpenseProfileData["runs"][number]) => ({
            ...run,
            dueDate: run.dueDate.toISOString(),
            createdAt: run.createdAt.toISOString(),
          })),
        }))}
        summary={expenseProfileData.summary}
        canManageTemplates={Boolean(caps["accounting.recurring-template.admin"])}
        canProcessOccurrences={Boolean(caps["accounting.recurring-occurrence.process"])}
      />
    </>
  );
}
