import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { QuotesIndexPage } from "./_components/QuotesIndexPage";
import { quoteRecords } from "./_lib/quote-list-data";
import { checkAndTriggerSlaNotifications } from "@/modules/crm/approval-workflow";
import type { QuoteListStatus, QuoteRecord } from "./_lib/types";

export const metadata = { title: "Quotations — CRM" };

function getSeedSlaDeadline(dbStatus: string): Date | null {
  return dbStatus === "SENT" ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) : null;
}

export default async function CrmQuotesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <div className="p-8 text-center text-red-500">Missing organisation context.</div>;
  }

  // Trigger SLA alert checks dynamically on list view load
  await checkAndTriggerSlaNotifications(orgId);

  // Fetch quotes from the database
  let dbQuotes = await db.crmInvoice.findMany({
    where: { orgId, type: "QUOTE" },
    include: { account: true, owner: true },
    orderBy: { createdAt: "desc" },
  });

  // Seed default mock quotes if database is empty
  if (dbQuotes.length === 0) {
    const defaultAccount = await db.crmAccount.findFirst({ where: { orgId } });
    const defaultUser = await db.user.findFirst({ where: { orgId } });
    
    if (defaultAccount && defaultUser) {
      for (const rec of quoteRecords) {
        const subtotal = Math.round(rec.amount / 1.18);
        const tax = rec.amount - subtotal;
        const dbStatus = rec.status.toUpperCase().replace("-", "_");

        await db.crmInvoice.create({
          data: {
            id: rec.id,
            orgId,
            ownerId: defaultUser.id,
            invoiceNumber: rec.quoteNumber,
            type: "QUOTE",
            date: new Date(rec.date),
            status: dbStatus === "PENDING_APPROVAL" ? "DRAFT" : dbStatus, // Map draft/sent
            approvalStatus: dbStatus,
            discount: 0,
            tax,
            total: rec.amount,
            accountId: defaultAccount.id,
            createdById: defaultUser.id,
            updatedById: defaultUser.id,
            slaDeadline: getSeedSlaDeadline(dbStatus),
          }
        });
      }

      // Re-fetch
      dbQuotes = await db.crmInvoice.findMany({
        where: { orgId, type: "QUOTE" },
        include: { account: true, owner: true },
        orderBy: { createdAt: "desc" },
      });
    }
  }

  // Map database entries to QuoteRecord shape for frontend compatibility
  const initialQuotes: QuoteRecord[] = dbQuotes.map((q) => {
    const status = (q.approvalStatus || q.status || "draft").toLowerCase().replace("_", "-") as Exclude<QuoteListStatus, "all">;
    return {
      id: q.id,
      date: q.date.toISOString().split("T")[0],
      location: q.manualNotes ? "Chennai" : "Chennai", // default fallback
      quoteNumber: q.invoiceNumber,
      customerName: q.account?.name || "Cash Customer",
      status,
      amount: q.total,
    };
  });

  return <QuotesIndexPage initialQuotes={initialQuotes} />;
}
