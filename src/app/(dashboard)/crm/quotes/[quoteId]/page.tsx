import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { QuoteDetailsPage } from "../_components/QuoteDetailsPage";
import type { ApprovalCaps, ApprovalLogEntry } from "@/components/crm/ApprovalActionBar";
import type { QuoteDetailRecord, QuoteListStatus, QuoteRecord } from "../_lib/types";

export default async function CrmQuoteDetailsPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId } = await params;
  
  const session = await auth();
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

  const allQuotes: QuoteRecord[] = dbQuotes.map((q) => {
    const status = (q.approvalStatus || q.status || "draft").toLowerCase().replace("_", "-") as Exclude<QuoteListStatus, "all">;
    return {
      id: q.id,
      date: q.date.toISOString().split("T")[0],
      location: (q as any).location || "Chennai",
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
      account: { select: { id: true, name: true, phone: true, email: true, billingAddress: true, shippingAddress: true } },
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

  const q = dbQuote as any;
  const quote: QuoteDetailRecord & { approvalLogs?: ApprovalLogEntry[]; reworkNote?: string | null; slaDeadline?: string | null } = {
    id: dbQuote.id,
    date: dbQuote.date.toISOString().split("T")[0],
    location: q.location || "Chennai",
    quoteNumber: dbQuote.invoiceNumber,
    referenceNumber: q.referenceNumber || dbQuote.invoiceNumber,
    customerName: dbQuote.account?.name || "Cash Customer",
    status: (dbQuote.approvalStatus || dbQuote.status || "draft").toLowerCase().replace(/_/g, "-") as Exclude<QuoteListStatus, "all">,
    amount: dbQuote.total,
    creationDate: dbQuote.createdAt.toISOString().split("T")[0],
    salesperson: dbQuote.owner?.name || "Admin User",
    placeOfSupply: q.location || "Chennai",
    pdfTemplate: "Spreadsheet Template",
    customerInitial: (dbQuote.account?.name || "C").charAt(0).toUpperCase(),
    billingAddress: dbQuote.account?.billingAddress || "",
    shippingAddress: dbQuote.account?.shippingAddress || "",
    notes: dbQuote.manualNotes || "",
    terms: q.terms || "",
    bankDetailsId: dbQuote.bankDetails || "",
    items: dbQuote.items.map((item) => ({
      id: item.id,
      name: item.productName,
      description: item.productName,
      quantity: item.qty,
      unit: (item as any).unit || "PCS",
      price: item.rate,
      tax: (item as any).taxLabel || `GST ${item.taxPercent}%`,
      tds: (item as any).tds || "None",
      amount: item.amount,
    })),
    taxes: [
      { label: "GST", amount: dbQuote.tax },
    ],
    discount: dbQuote.discount,
    discountType: q.discountType || "percentage",
    adjustment: 0,
    roundOff: 0,
    subtotal: dbQuote.total - dbQuote.tax,
    total: dbQuote.total,
    portOfLoading: q.portOfLoading || "",
    portOfDischarge: q.portOfDischarge || "",
    incoterm: q.incoterm || "",
    containerType: q.containerType || "",
    numberOfContainers: q.numberOfContainers || 0,
    commodity: q.commodity || "",
    weight: q.weight || "",
    approvalLogs: dbQuote.approvalLogs,
    reworkNote: dbQuote.reworkNote,
    slaDeadline: dbQuote.slaDeadline ? dbQuote.slaDeadline.toISOString() : null,
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
