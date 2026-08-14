import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { QuoteDetailsPage } from "@/modules/crm/components/quotes/QuoteDetailsPage";
import type { ApprovalCaps, ApprovalLogEntry } from "@/modules/crm/components/ApprovalActionBar";
import type {
  QuoteDetailRecord,
  QuoteListStatus,
  QuoteRecord,
} from "@/modules/crm/components/quotes/lib/types";
import type { QuoteWorkflowContext } from "@/modules/crm/components/quotes/lib/types";
import {
  mapQuoteApprovalStatusToListStatus,
} from "@/modules/crm/approval-workflow";
import { loadQuoteDetailRecord } from "@/modules/crm/quote-loader";

function getQuoteRootId(record: {
  id: string;
  sourceQuotationId?: string | null;
}) {
  return record.sourceQuotationId || record.id;
}

function getQuoteVersion(record: {
  sourceQuotationVersion?: number | null;
}) {
  return record.sourceQuotationVersion || 1;
}

export default async function CrmQuoteDetailsPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId } = await params;
  
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const orgId = session.user.orgId;
  if (!orgId) redirect("/login");

  // Fetch all quotes for sidebar list
  const dbQuotes = await db.crmInvoice.findMany({
    where: { orgId, type: "QUOTE" },
    include: { account: true },
    orderBy: { createdAt: "desc" },
  });

  const latestQuotes = dbQuotes.reduce<typeof dbQuotes>((latest, quote) => {
    const rootId = getQuoteRootId(quote);
    const current = latest.find((item) => getQuoteRootId(item) === rootId);
    if (!current || getQuoteVersion(quote) > getQuoteVersion(current)) {
      return [...latest.filter((item) => getQuoteRootId(item) !== rootId), quote];
    }
    return latest;
  }, []);

  const allQuotes: QuoteRecord[] = latestQuotes.map((q) => {
    const status = mapQuoteApprovalStatusToListStatus(
      q.approvalStatus || q.status || "draft",
    ) as Exclude<QuoteListStatus, "all">;
    return {
      id: q.id,
      date: q.date.toISOString().split("T")[0],
      location: q.location || "Chennai",
      quoteNumber: q.invoiceNumber,
      customerName: q.account?.name || "Cash Customer",
      status,
      amount: q.total,
    };
  });

  // Fetch current quote details
  const baseQuote = await loadQuoteDetailRecord(quoteId, orgId);
  if (!baseQuote) notFound();

  const dbQuote = await db.crmInvoice.findFirst({
    where: { id: quoteId, orgId, type: "QUOTE" },
    select: {
      id: true,
      sourceQuotationId: true,
      sourceQuotationNumber: true,
      sourceQuotationVersion: true,
      sourceQuotationSnapshot: true,
      reworkNote: true,
      slaDeadline: true,
      invoiceNumber: true,
      approvalLogs: {
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { id: true, name: true } } },
      },
    },
  });

  if (!dbQuote) notFound();

  const managerOptions = await db.user.findMany({
    where: {
      orgId,
      active: true,
      OR: [
        { isPlatformAdmin: true },
        {
          roles: {
            some: {
              role: {
                name: {
                  in: ["Admin", "Manager"],
                },
              },
            },
          },
        },
      ],
    },
    orderBy: [{ isPlatformAdmin: "desc" }, { name: "asc" }],
    select: { id: true, name: true },
  });

  const rootQuoteId = dbQuote.sourceQuotationId || dbQuote.id;
  const versionHistoryRows = await db.crmInvoice.findMany({
    where: {
      orgId,
      type: "QUOTE",
      OR: [{ id: rootQuoteId }, { sourceQuotationId: rootQuoteId }],
    },
    select: {
      id: true,
      invoiceNumber: true,
      sourceQuotationVersion: true,
      approvalStatus: true,
      status: true,
      createdAt: true,
      createdById: true,
      owner: { select: { name: true } },
    },
    orderBy: [{ sourceQuotationVersion: "asc" }, { createdAt: "asc" }],
  });

  const quote: QuoteDetailRecord & { approvalLogs?: ApprovalLogEntry[]; reworkNote?: string | null; slaDeadline?: string | null } = {
    ...baseQuote,
    approvalLogs: dbQuote.approvalLogs,
    reworkNote: dbQuote.reworkNote,
    slaDeadline: dbQuote.slaDeadline ? dbQuote.slaDeadline.toISOString() : null,
    versionNumber: dbQuote.sourceQuotationVersion || 1,
    rootQuoteNumber: dbQuote.sourceQuotationNumber || dbQuote.invoiceNumber,
    workflowContext: (dbQuote.sourceQuotationSnapshot as QuoteWorkflowContext | null) || null,
    managerOptions,
    versionHistory: versionHistoryRows.map((entry) => ({
      id: entry.id,
      quoteNumber: entry.invoiceNumber,
      versionNumber: entry.sourceQuotationVersion || 1,
      status: mapQuoteApprovalStatusToListStatus(
        entry.approvalStatus || entry.status || "draft",
      ) as Exclude<QuoteListStatus, "all">,
      createdAt: entry.createdAt.toISOString(),
      createdBy: entry.owner?.name || null,
    })),
  };

  const [canSubmit, canApprove, canSend, canManage, canAdminRestore] =
    await Promise.all([
      can(userId, "crm.quote.submit"),
      can(userId, "crm.quote.approve"),
      can(userId, "crm.quote.send"),
      can(userId, "crm.quote.manage"),
      can(userId, "crm.invoice.admin_restore"),
    ]);

  const caps: ApprovalCaps = {
    canSubmit,
    canApprove,
    canSend,
    canManage,
    canAdminRestore,
  };

  return <QuoteDetailsPage quote={quote} caps={caps} allQuotes={allQuotes} />;
}
