import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { InvoiceDetailsPage, type InvoiceDetailRecord, type SidebarInvoiceRecord } from "../_components/InvoiceDetailsPage";
import type { ApprovalCaps } from "@/components/crm/ApprovalActionBar";

export default async function CrmInvoiceDetailsPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const orgId = session.user.orgId;
  if (!orgId) redirect("/login");

  // Fetch the specific invoice/sales order
  const invoice = await db.crmInvoice.findFirst({
    where: { id: invoiceId, orgId },
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

  if (!invoice) notFound();

  // If the document is a Quote, redirect to the Quote details page
  if (invoice.type === "QUOTE") {
    redirect(`/crm/quotes/${invoice.id}`);
  }

  // Determine capabilities depending on document type
  let caps: ApprovalCaps = {
    canSubmit: false,
    canApprove: false,
    canSend: false,
    canManage: false,
    canAdminRestore: false,
  };

  if (invoice.type === "SALES_ORDER") {
    const [canSubmit, canApprove, canManage] = await Promise.all([
      can(userId, "crm.sales_order.submit"),
      can(userId, "crm.sales_order.approve"),
      can(userId, "crm.sales_order.manage"),
    ]);
    caps = {
      canSubmit,
      canApprove,
      canSend: false,
      canManage,
      canAdminRestore: false,
    };
  } else if (invoice.type === "INVOICE") {
    const [canSubmit, canApprove, canSend, canManage, canAdminRestore] = await Promise.all([
      can(userId, "crm.invoice.submit"),
      can(userId, "crm.invoice.approve"),
      can(userId, "crm.invoice.send"),
      can(userId, "crm.invoice.manage"),
      can(userId, "crm.invoice.admin_restore"),
    ]);
    caps = {
      canSubmit,
      canApprove,
      canSend,
      canManage,
      canAdminRestore,
    };
  }

  // Fetch all Invoices & Sales Orders for organization
  const dbInvoices = await db.crmInvoice.findMany({
    where: { orgId, type: { in: ["INVOICE", "SALES_ORDER"] } },
    include: { account: true },
    orderBy: { createdAt: "desc" },
  });

  const allInvoices: SidebarInvoiceRecord[] = dbInvoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    type: inv.type as "INVOICE" | "SALES_ORDER",
    customerName: inv.account?.name || "Cash Customer",
    status: inv.status,
    approvalStatus: inv.approvalStatus,
    total: inv.total,
    date: inv.date.toISOString(),
  }));

  const invoiceDetail: InvoiceDetailRecord = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    type: invoice.type as "INVOICE" | "SALES_ORDER",
    date: invoice.date.toISOString(),
    dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
    status: invoice.status,
    approvalStatus: invoice.approvalStatus,
    discount: invoice.discount,
    tax: invoice.tax,
    total: invoice.total,
    customerName: invoice.account?.name || "Cash Customer",
    billingAddress: invoice.account?.billingAddress || undefined,
    shippingAddress: invoice.account?.shippingAddress || undefined,
    notes: invoice.manualNotes || undefined,
    salesperson: invoice.owner?.name || "Unassigned",
    items: invoice.items.map((item) => ({
      id: item.id,
      name: item.productName,
      qty: item.qty,
      rate: item.rate,
      taxPercent: item.taxPercent,
      amount: item.amount,
    })),
    approvalLogs: invoice.approvalLogs,
    slaDeadline: invoice.slaDeadline ? invoice.slaDeadline.toISOString() : null,
    reworkNote: invoice.reworkNote,
  };

  return (
    <InvoiceDetailsPage
      invoice={invoiceDetail}
      caps={caps}
      allInvoices={allInvoices}
    />
  );
}
