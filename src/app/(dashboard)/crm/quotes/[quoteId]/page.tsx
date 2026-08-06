import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { MOCK_ITEMS } from "@/lib/items/mock-data";
import { QuoteDetailsPage } from "@/modules/crm/components/quotes/QuoteDetailsPage";
import type { ApprovalCaps, ApprovalLogEntry } from "@/modules/crm/components/ApprovalActionBar";
import type {
  QuoteDetailRecord,
  QuoteListStatus,
  QuoteRecord,
} from "@/modules/crm/components/quotes/lib/types";
import { getStateCodeForLocation } from "@/modules/crm/components/quotes/lib/gst-states";
import type { QuoteWorkflowContext } from "@/modules/crm/components/quotes/lib/types";
import {
  mapQuoteApprovalStatusToListStatus,
} from "@/modules/crm/approval-workflow";

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
  const dbQuote = await db.crmInvoice.findFirst({
    where: { id: quoteId, orgId, type: "QUOTE" },
    include: {
      account: { select: { id: true, name: true, phone: true, email: true, billingAddress: true, shippingAddress: true, gstin: true } },
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      deal: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
      items: true,
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
    id: dbQuote.id,
    date: dbQuote.date.toISOString().split("T")[0],
    location: dbQuote.location || "Chennai",
    quoteNumber: dbQuote.invoiceNumber,
    referenceNumber: dbQuote.referenceNumber || dbQuote.invoiceNumber,
    customerName: dbQuote.account?.name || "Cash Customer",
    status: mapQuoteApprovalStatusToListStatus(
      dbQuote.approvalStatus || dbQuote.status || "draft",
    ) as Exclude<QuoteListStatus, "all">,
    amount: dbQuote.total,
    creationDate: dbQuote.createdAt.toISOString().split("T")[0],
    salesperson: dbQuote.owner?.name || "Admin User",
    placeOfSupply: dbQuote.placeOfSupply || "33",
    pdfTemplate: "Spreadsheet Template",
    customerInitial: (dbQuote.account?.name || "C").charAt(0).toUpperCase(),
    billingAddress: dbQuote.account?.billingAddress || "",
    shippingAddress: dbQuote.account?.shippingAddress || "",
    notes: dbQuote.manualNotes || "",
    terms: dbQuote.terms || "",
    bankDetailsId: dbQuote.bankDetails || "",
    items: dbQuote.items.map((item) => ({
      id: item.id,
      name: item.productName,
      description: item.productName,
      hsnSac: MOCK_ITEMS.find((catalogItem) => catalogItem.name === item.productName)?.hsnSac || "",
      quantity: item.qty,
      unit: item.unit || "PCS",
      price: item.rate,
      tax: item.taxLabel || `GST ${item.taxPercent}%`,
      tds: item.tds || "None",
      amount: item.amount,
      currency: item.currency || "INR",
      exchangeRate: item.exchangeRate || 1,
    })),
    taxes: (() => {
      const supplierStateCode = getStateCodeForLocation(dbQuote.location || "Chennai");
      const isSameState = supplierStateCode && supplierStateCode === dbQuote.placeOfSupply;
      if (isSameState) {
        return [
          { label: "CGST", amount: dbQuote.tax / 2 },
          { label: "SGST", amount: dbQuote.tax / 2 },
        ];
      }
      return [
        { label: "IGST", amount: dbQuote.tax },
      ];
    })(),
    discount: dbQuote.discount,
    discountType: dbQuote.discountType || "percentage",
    adjustment: 0,
    roundOff: 0,
    subtotal: dbQuote.total - dbQuote.tax,
    total: dbQuote.total,
    portOfLoading: dbQuote.portOfLoading || "",
    portOfLoadingCountry: dbQuote.portOfLoadingCountry || "",
    portOfDischarge: dbQuote.portOfDischarge || "",
    portOfDestinationCountry: dbQuote.portOfDestinationCountry || "",
    incoterm: dbQuote.incoterm || "",
    containerType: dbQuote.containerType || "",
    numberOfContainers: dbQuote.numberOfContainers || 0,
    commodity: dbQuote.commodity || "",
    weight: dbQuote.weight || "",
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
