import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { requirePermission } from "@/lib/rbac";
import { notify, getUsersWithPermission } from "@/modules/notifications/service";

// ─── Status type unions ───────────────────────────────────────────────────────

export type QuoteApprovalStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REWORK"
  | "SENT"
  | "CUSTOMER_VIEWED"
  | "ACCEPTED"
  | "INVOICED"
  | "DECLINED";

export type SalesOrderApprovalStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "ACTIVE"
  | "COMPLETED";

export type InvoiceApprovalStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "SENT"
  | "PAID";

export type ApprovalStatus =
  | QuoteApprovalStatus
  | SalesOrderApprovalStatus
  | InvoiceApprovalStatus;

export type CrmEntityType = "QUOTE" | "SALES_ORDER" | "INVOICE";

// ─── Permission keys ──────────────────────────────────────────────────────────

export const APPROVAL_PERMISSIONS = {
  QUOTE: {
    submit: "crm.quote.submit",
    approve: "crm.quote.approve",
    send: "crm.quote.send",
    manage: "crm.quote.manage",
  },
  SALES_ORDER: {
    submit: "crm.sales_order.submit",
    approve: "crm.sales_order.approve",
    manage: "crm.sales_order.manage",
  },
  INVOICE: {
    submit: "crm.invoice.submit",
    approve: "crm.invoice.approve",
    send: "crm.invoice.send",
    manage: "crm.invoice.manage",
    adminRestore: "crm.invoice.admin_restore",
  },
} as const;

// ─── SLA helpers ─────────────────────────────────────────────────────────────

function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}

export function calcSoSlaDeadline(approvedAt: Date): Date {
  return addBusinessDays(approvedAt, 30);
}

// ─── Audit log helper ─────────────────────────────────────────────────────────

async function logTransition(params: {
  orgId: string;
  invoiceId: string;
  actorId: string;
  fromStatus: string;
  toStatus: string;
  note?: string;
}) {
  await db.crmApprovalLog.create({ data: params });
}

// ─── Core workflow functions ──────────────────────────────────────────────────

async function loadInvoice(id: string, orgId: string) {
  const inv = await db.crmInvoice.findFirst({
    where: { id, orgId },
  });
  if (!inv) throw new Error("Document not found");
  return inv;
}

// Submit for approval (owner/creator action)
export async function submitForApproval(params: {
  invoiceId: string;
  orgId: string;
  actorId: string;
  note?: string;
}) {
  const { invoiceId, orgId, actorId, note } = params;
  const inv = await loadInvoice(invoiceId, orgId);

  const perm = APPROVAL_PERMISSIONS[inv.type as CrmEntityType]?.submit;
  if (!perm) throw new Error("Unknown entity type");
  await requirePermission(actorId, perm);

  if (inv.approvalStatus !== "DRAFT" && inv.approvalStatus !== "REWORK") {
    throw new Error(`Cannot submit from status: ${inv.approvalStatus}`);
  }

  const now = await getNow();
  await db.crmInvoice.update({
    where: { id: invoiceId },
    data: {
      approvalStatus: "PENDING_APPROVAL",
      submittedAt: now,
      updatedById: actorId,
    },
  });

  await logTransition({
    orgId,
    invoiceId,
    actorId,
    fromStatus: inv.approvalStatus,
    toStatus: "PENDING_APPROVAL",
    note,
  });

  // Notify all approvers
  const entityLabel = inv.type === "QUOTE" ? "Quote" : inv.type === "SALES_ORDER" ? "Sales Order" : "Invoice";
  const approverIds = await getUsersWithPermission(
    orgId,
    APPROVAL_PERMISSIONS[inv.type as CrmEntityType].approve
  );
  await Promise.all(
    approverIds.map((uid) =>
      notify({
        userId: uid,
        orgId,
        kind: "APPROVAL_REQUESTED",
        title: `${entityLabel} ${inv.invoiceNumber} awaiting approval`,
        body: note || `${entityLabel} submitted for your review`,
        link: `/crm/approvals`,
        priority: "important",
        requiresAck: false,
        variant: "warning",
      })
    )
  );
}

// Approve
export async function approveDocument(params: {
  invoiceId: string;
  orgId: string;
  actorId: string;
  note?: string;
}) {
  const { invoiceId, orgId, actorId, note } = params;
  const inv = await loadInvoice(invoiceId, orgId);

  const perm = APPROVAL_PERMISSIONS[inv.type as CrmEntityType]?.approve;
  if (!perm) throw new Error("Unknown entity type");
  await requirePermission(actorId, perm);

  if (inv.approvalStatus !== "PENDING_APPROVAL") {
    throw new Error(`Cannot approve from status: ${inv.approvalStatus}`);
  }

  const now = await getNow();
  const slaDeadline =
    inv.type === "SALES_ORDER" ? calcSoSlaDeadline(now) : undefined;

  await db.crmInvoice.update({
    where: { id: invoiceId },
    data: {
      approvalStatus: "APPROVED",
      approvedAt: now,
      approvedById: actorId,
      approvalNote: note ?? null,
      slaDeadline: slaDeadline ?? null,
      updatedById: actorId,
    },
  });

  await logTransition({
    orgId,
    invoiceId,
    actorId,
    fromStatus: "PENDING_APPROVAL",
    toStatus: "APPROVED",
    note,
  });

  // Notify owner
  const entityLabel = inv.type === "QUOTE" ? "Quote" : inv.type === "SALES_ORDER" ? "Sales Order" : "Invoice";
  await notify({
    userId: inv.ownerId,
    orgId,
    kind: "APPROVAL_APPROVED",
    title: `${entityLabel} ${inv.invoiceNumber} approved`,
    body: note || `Your ${entityLabel.toLowerCase()} has been approved`,
    link: `/crm/invoices`,
    priority: "normal",
    variant: "success",
  });
}

// Request rework (send back to creator)
export async function requestRework(params: {
  invoiceId: string;
  orgId: string;
  actorId: string;
  note: string;
}) {
  const { invoiceId, orgId, actorId, note } = params;
  if (!note?.trim()) throw new Error("Rework reason required");

  const inv = await loadInvoice(invoiceId, orgId);
  const perm = APPROVAL_PERMISSIONS[inv.type as CrmEntityType]?.approve;
  if (!perm) throw new Error("Unknown entity type");
  await requirePermission(actorId, perm);

  if (inv.approvalStatus !== "PENDING_APPROVAL") {
    throw new Error(`Cannot request rework from status: ${inv.approvalStatus}`);
  }

  await db.crmInvoice.update({
    where: { id: invoiceId },
    data: {
      approvalStatus: "REWORK",
      reworkNote: note,
      updatedById: actorId,
    },
  });

  await logTransition({
    orgId,
    invoiceId,
    actorId,
    fromStatus: "PENDING_APPROVAL",
    toStatus: "REWORK",
    note,
  });

  const entityLabel = inv.type === "QUOTE" ? "Quote" : inv.type === "SALES_ORDER" ? "Sales Order" : "Invoice";
  await notify({
    userId: inv.ownerId,
    orgId,
    kind: "APPROVAL_REWORK",
    title: `${entityLabel} ${inv.invoiceNumber} needs rework`,
    body: note,
    link: `/crm/invoices`,
    priority: "important",
    requiresAck: true,
    variant: "warning",
  });
}

// Decline (for quotes: customer declines and sends back for rework; for invoices: hard rejection by admin)
export async function declineDocument(params: {
  invoiceId: string;
  orgId: string;
  actorId: string;
  note?: string;
}) {
  const { invoiceId, orgId, actorId, note } = params;
  const inv = await loadInvoice(invoiceId, orgId);

  // Approvers can decline from PENDING_APPROVAL; manage perm can mark customer decline
  const approvePerm = APPROVAL_PERMISSIONS[inv.type as CrmEntityType]?.approve;
  const managePerm = APPROVAL_PERMISSIONS[inv.type as CrmEntityType]?.manage;
  if (!approvePerm) throw new Error("Unknown entity type");

  const validFrom = ["PENDING_APPROVAL", "SENT", "CUSTOMER_VIEWED", "APPROVED", "ACCEPTED"];
  if (!validFrom.includes(inv.approvalStatus)) {
    throw new Error(`Cannot decline from status: ${inv.approvalStatus}`);
  }

  // From PENDING_APPROVAL → need approve perm. From SENT/CUSTOMER_VIEWED/ACCEPTED → need manage perm.
  const needsApprovePerm = inv.approvalStatus === "PENDING_APPROVAL";
  await requirePermission(actorId, needsApprovePerm ? approvePerm : managePerm);

  if (inv.type === "QUOTE") {
    // If it's a quote, transition to REWORK and notify
    await db.crmInvoice.update({
      where: { id: invoiceId },
      data: {
        approvalStatus: "REWORK",
        reworkNote: note ?? "Customer declined quote",
        updatedById: actorId,
      },
    });

    await logTransition({
      orgId,
      invoiceId,
      actorId,
      fromStatus: inv.approvalStatus,
      toStatus: "REWORK",
      note: note ?? "Customer declined quote",
    });

    // Notify salesperson (owner) and manager
    await notify({
      userId: inv.ownerId,
      orgId,
      kind: "QUOTE_REWORK",
      title: `Quote ${inv.invoiceNumber} needs rework`,
      body: note || "Quotation needs rework as customer declined.",
      link: `/crm/quotes/${invoiceId}`,
      priority: "important",
      requiresAck: true,
      variant: "warning",
    });

    const managerIds = await getUsersWithPermission(orgId, APPROVAL_PERMISSIONS.QUOTE.approve);
    await Promise.all(
      managerIds
        .filter((uid) => uid !== inv.ownerId)
        .map((uid) =>
          notify({
            userId: uid,
            orgId,
            kind: "QUOTE_REWORK",
            title: `Quote ${inv.invoiceNumber} declined - needs rework`,
            body: note || "Quote needs rework as customer declined.",
            link: `/crm/quotes/${invoiceId}`,
            priority: "normal",
            variant: "warning",
          })
        )
    );
  } else {
    // If it's an Invoice or Sales Order
    await db.crmInvoice.update({
      where: { id: invoiceId },
      data: {
        approvalStatus: "DECLINED",
        approvalNote: note ?? null,
        updatedById: actorId,
      },
    });

    await logTransition({
      orgId,
      invoiceId,
      actorId,
      fromStatus: inv.approvalStatus,
      toStatus: "DECLINED",
      note,
    });

    const entityLabel = inv.type === "SALES_ORDER" ? "Sales Order" : "Invoice";
    await notify({
      userId: inv.ownerId,
      orgId,
      kind: "APPROVAL_DECLINED",
      title: `${entityLabel} ${inv.invoiceNumber} declined`,
      body: note || `${entityLabel} has been declined`,
      link: `/crm/invoices`,
      priority: "normal",
      variant: "destructive",
    });
  }
}

// Send to customer (quote only, after APPROVED)
export async function sendToCustomer(params: {
  invoiceId: string;
  orgId: string;
  actorId: string;
}) {
  const { invoiceId, orgId, actorId } = params;
  const inv = await loadInvoice(invoiceId, orgId);

  if (inv.type !== "QUOTE") throw new Error("Only quotes can be sent to customer");
  await requirePermission(actorId, APPROVAL_PERMISSIONS.QUOTE.send);

  if (inv.approvalStatus !== "APPROVED") {
    throw new Error(`Quote must be approved before sending. Current: ${inv.approvalStatus}`);
  }

  const now = await getNow();
  const slaDeadline = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days SLA

  await db.crmInvoice.update({
    where: { id: invoiceId },
    data: {
      approvalStatus: "SENT",
      status: "SENT",
      updatedById: actorId,
      updatedAt: now,
      slaDeadline,
    },
  });

  await logTransition({
    orgId,
    invoiceId,
    actorId,
    fromStatus: "APPROVED",
    toStatus: "SENT",
  });

  // Mock sending email and queue it
  const account = inv.accountId ? await db.crmAccount.findUnique({ where: { id: inv.accountId } }) : null;
  const emailTo = account?.email || "customer@example.com";
  
  await db.emailQueue.create({
    data: {
      to: emailTo,
      subject: `Quotation CHN-Quote-${inv.invoiceNumber} from Adarsh Shipping`,
      html: `<p>Dear Customer,</p><p>Please find attached our quotation <strong>${inv.invoiceNumber}</strong> for your review.</p><p>Total Amount: ₹${inv.total.toLocaleString("en-IN")}</p>`,
    }
  });

  // Log to timeline event
  await db.crmTimelineEvent.create({
    data: {
      orgId,
      relatedToType: "QUOTE",
      relatedToId: invoiceId,
      eventType: "QUOTE_SENT",
      description: `Quotation automatically sent to customer via mail to ${emailTo}`,
      createdById: actorId,
    }
  });
}

// Mark customer viewed (track when customer opens the quote)
export async function markCustomerViewed(params: {
  invoiceId: string;
  orgId: string;
  actorId: string;
}) {
  const { invoiceId, orgId, actorId } = params;
  const inv = await loadInvoice(invoiceId, orgId);

  if (inv.approvalStatus !== "SENT") {
    throw new Error(`Quote must be SENT before marking viewed`);
  }

  await db.crmInvoice.update({
    where: { id: invoiceId },
    data: { approvalStatus: "CUSTOMER_VIEWED", updatedById: actorId },
  });

  await logTransition({
    orgId,
    invoiceId,
    actorId,
    fromStatus: "SENT",
    toStatus: "CUSTOMER_VIEWED",
  });
}

// Customer accepts quote
export async function acceptQuote(params: {
  invoiceId: string;
  orgId: string;
  actorId: string;
}) {
  const { invoiceId, orgId, actorId } = params;
  const inv = await loadInvoice(invoiceId, orgId);

  if (inv.type !== "QUOTE") throw new Error("Only quotes can be accepted");
  await requirePermission(actorId, APPROVAL_PERMISSIONS.QUOTE.manage);

  const validFrom = ["SENT", "CUSTOMER_VIEWED"];
  if (!validFrom.includes(inv.approvalStatus)) {
    throw new Error(`Cannot accept from status: ${inv.approvalStatus}`);
  }

  const now = await getNow();
  await db.crmInvoice.update({
    where: { id: invoiceId },
    data: {
      approvalStatus: "ACCEPTED",
      status: "PAID", // Marks quote transaction internally complete
      updatedById: actorId,
      updatedAt: now,
    },
  });

  await logTransition({
    orgId,
    invoiceId,
    actorId,
    fromStatus: inv.approvalStatus,
    toStatus: "ACCEPTED",
  });

  // Calculate approval duration efficiency metric
  const durationMs = inv.approvedAt && inv.submittedAt ? inv.approvedAt.getTime() - inv.submittedAt.getTime() : 0;
  const durationHours = (durationMs / 3600000).toFixed(2);

  await db.crmTimelineEvent.create({
    data: {
      orgId,
      relatedToType: "QUOTE",
      relatedToId: invoiceId,
      eventType: "QUOTE_ACCEPTED",
      description: `Quote accepted by customer. Approval cycle time: ${durationHours} hours.`,
      createdById: actorId,
    }
  });

  // Automatically generate Sales Order (type: SALES_ORDER) in db
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const soNumber = `SO-${inv.invoiceNumber.replace(/^QT-/, "").replace(/^CHN-Quote-/, "")}-${randomSuffix}`;
  const soSlaDeadline = calcSoSlaDeadline(now);

  const salesOrder = await db.crmInvoice.create({
    data: {
      orgId,
      ownerId: inv.ownerId,
      invoiceNumber: soNumber,
      type: "SALES_ORDER",
      date: now,
      dueDate: soSlaDeadline,
      status: "APPROVED",
      approvalStatus: "APPROVED",
      discount: inv.discount,
      tax: inv.tax,
      total: inv.total,
      accountId: inv.accountId,
      contactId: inv.contactId,
      dealId: inv.dealId,
      createdById: actorId,
      updatedById: actorId,
      slaDeadline: soSlaDeadline,
      approvedAt: now,
      submittedAt: now,
    }
  });

  // Copy line items to Sales Order
  const quoteItems = await db.crmInvoiceItem.findMany({ where: { invoiceId } });
  if (quoteItems.length > 0) {
    await db.crmInvoiceItem.createMany({
      data: quoteItems.map((item) => ({
        invoiceId: salesOrder.id,
        productName: item.productName,
        qty: item.qty,
        rate: item.rate,
        taxPercent: item.taxPercent,
        amount: item.amount,
        currency: item.currency,
        exchangeRate: item.exchangeRate,
      }))
    });
  }

  // Log logTransition for the newly generated Sales Order
  await logTransition({
    orgId,
    invoiceId: salesOrder.id,
    actorId,
    fromStatus: "DRAFT",
    toStatus: "APPROVED",
    note: `Automatically generated from accepted Quote ${inv.invoiceNumber}`,
  });
}

// Convert Sales Order to Invoice
export async function convertToInvoice(params: {
  salesOrderId: string;
  orgId: string;
  actorId: string;
}) {
  const { salesOrderId, orgId, actorId } = params;
  const so = await db.crmInvoice.findFirst({
    where: { id: salesOrderId, orgId, type: "SALES_ORDER" },
    include: { items: true },
  });
  if (!so) throw new Error("Sales Order not found");

  if (so.approvalStatus !== "APPROVED" && so.approvalStatus !== "ACTIVE") {
    throw new Error(`Cannot convert Sales Order from status: ${so.approvalStatus}`);
  }

  const now = await getNow();
  let isBreached = false;
  if (so.slaDeadline && now > so.slaDeadline) {
    isBreached = true;
  }

  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const invNumber = `INV-${so.invoiceNumber.replace(/^SO-/, "")}-${randomSuffix}`;

  // 1. Create Invoice Draft
  const invoice = await db.crmInvoice.create({
    data: {
      orgId,
      ownerId: so.ownerId,
      invoiceNumber: invNumber,
      type: "INVOICE",
      date: now,
      status: "DRAFT",
      approvalStatus: "DRAFT",
      discount: so.discount,
      tax: so.tax,
      total: so.total,
      accountId: so.accountId,
      contactId: so.contactId,
      dealId: so.dealId,
      createdById: actorId,
      updatedById: actorId,
    }
  });

  // 2. Create items
  if (so.items.length > 0) {
    await db.crmInvoiceItem.createMany({
      data: so.items.map((item) => ({
        invoiceId: invoice.id,
        productName: item.productName,
        qty: item.qty,
        rate: item.rate,
        taxPercent: item.taxPercent,
        amount: item.amount,
        currency: item.currency,
        exchangeRate: item.exchangeRate,
      }))
    });
  }

  // 3. Mark Sales Order as completed
  await db.crmInvoice.update({
    where: { id: salesOrderId },
    data: {
      approvalStatus: "COMPLETED",
      status: "SENT",
      updatedById: actorId,
    }
  });

  // 4. Log transitions
  await logTransition({
    orgId,
    invoiceId: salesOrderId,
    actorId,
    fromStatus: so.approvalStatus,
    toStatus: "COMPLETED",
    note: `Converted to Invoice ${invNumber}`,
  });
  
  await logTransition({
    orgId,
    invoiceId: invoice.id,
    actorId,
    fromStatus: "DRAFT",
    toStatus: "DRAFT",
    note: `Automatically generated from Sales Order ${so.invoiceNumber}`,
  });

  // 5. Notify if SLA is breached
  if (isBreached) {
    const mgrIds = await getUsersWithPermission(orgId, "crm.invoice.approve");
    await Promise.all(
      mgrIds.map((uid) =>
        notify({
          userId: uid,
          orgId,
          kind: "SALES_ORDER_SLA_BREACH",
          title: `Sales Order ${so.invoiceNumber} SLA breach`,
          body: `Sales Order was converted to invoice after the 30-business-day deadline.`,
          link: `/crm/invoices/${invoice.id}`,
          priority: "important",
          variant: "destructive",
        })
      )
    );
  }

  // 6. Log timeline event for conversion
  const conversionDurationMs = so.approvedAt ? now.getTime() - so.approvedAt.getTime() : 0;
  const conversionDays = (conversionDurationMs / 86400000).toFixed(1);
  await db.crmTimelineEvent.create({
    data: {
      orgId,
      relatedToType: "SALES_ORDER",
      relatedToId: salesOrderId,
      eventType: "SO_CONVERTED",
      description: `Sales Order converted to Invoice in ${conversionDays} days (SLA breached: ${isBreached ? "Yes" : "No"})`,
      createdById: actorId,
    }
  });

  return invoice;
}

// Raise Direct Sales Order from Rejected Invoice
export async function raiseDirectSalesOrder(params: {
  invoiceId: string;
  orgId: string;
  actorId: string;
}) {
  const { invoiceId, orgId, actorId } = params;
  const inv = await db.crmInvoice.findFirst({
    where: { id: invoiceId, orgId, type: "INVOICE" },
    include: { items: true },
  });
  if (!inv) throw new Error("Invoice not found");

  if (inv.approvalStatus !== "DECLINED") {
    throw new Error("Can only raise direct sales order from declined invoices.");
  }

  const now = await getNow();
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const soNumber = `SO-DIR-${inv.invoiceNumber.replace(/^INV-/, "")}-${randomSuffix}`;
  const soSlaDeadline = calcSoSlaDeadline(now);

  const salesOrder = await db.crmInvoice.create({
    data: {
      orgId,
      ownerId: inv.ownerId,
      invoiceNumber: soNumber,
      type: "SALES_ORDER",
      date: now,
      dueDate: soSlaDeadline,
      status: "APPROVED",
      approvalStatus: "APPROVED",
      discount: inv.discount,
      tax: inv.tax,
      total: inv.total,
      accountId: inv.accountId,
      contactId: inv.contactId,
      dealId: inv.dealId,
      createdById: actorId,
      updatedById: actorId,
      slaDeadline: soSlaDeadline,
      approvedAt: now,
      submittedAt: now,
    }
  });

  if (inv.items.length > 0) {
    await db.crmInvoiceItem.createMany({
      data: inv.items.map((item) => ({
        invoiceId: salesOrder.id,
        productName: item.productName,
        qty: item.qty,
        rate: item.rate,
        taxPercent: item.taxPercent,
        amount: item.amount,
        currency: item.currency,
        exchangeRate: item.exchangeRate,
      }))
    });
  }

  await logTransition({
    orgId,
    invoiceId: salesOrder.id,
    actorId,
    fromStatus: "DRAFT",
    toStatus: "APPROVED",
    note: `Raised directly from rejected Invoice ${inv.invoiceNumber}`,
  });

  return salesOrder;
}

// Mark quote as invoiced (convert to invoice)
export async function markInvoiced(params: {
  invoiceId: string;
  orgId: string;
  actorId: string;
}) {
  const { invoiceId, orgId, actorId } = params;
  const inv = await loadInvoice(invoiceId, orgId);

  if (inv.type !== "QUOTE") throw new Error("Only quotes can be marked invoiced");
  await requirePermission(actorId, APPROVAL_PERMISSIONS.QUOTE.manage);

  if (inv.approvalStatus !== "ACCEPTED") {
    throw new Error(`Quote must be ACCEPTED before invoicing`);
  }

  await db.crmInvoice.update({
    where: { id: invoiceId },
    data: { approvalStatus: "INVOICED", status: "SENT", updatedById: actorId },
  });

  await logTransition({
    orgId,
    invoiceId,
    actorId,
    fromStatus: "ACCEPTED",
    toStatus: "INVOICED",
  });
}


// Admin restore declined/rework invoice back to DRAFT
export async function adminRestoreToDraft(params: {
  invoiceId: string;
  orgId: string;
  actorId: string;
  note?: string;
}) {
  const { invoiceId, orgId, actorId, note } = params;
  const inv = await loadInvoice(invoiceId, orgId);

  if (inv.type === "INVOICE") {
    await requirePermission(actorId, APPROVAL_PERMISSIONS.INVOICE.adminRestore);
  } else {
    await requirePermission(actorId, APPROVAL_PERMISSIONS[inv.type as CrmEntityType].manage);
  }

  const validFrom = ["DECLINED", "REWORK"];
  if (!validFrom.includes(inv.approvalStatus)) {
    throw new Error(`Can only restore from DECLINED or REWORK. Current: ${inv.approvalStatus}`);
  }

  await db.crmInvoice.update({
    where: { id: invoiceId },
    data: {
      approvalStatus: "DRAFT",
      approvalNote: null,
      reworkNote: null,
      approvedAt: null,
      approvedById: null,
      submittedAt: null,
      updatedById: actorId,
    },
  });

  await logTransition({
    orgId,
    invoiceId,
    actorId,
    fromStatus: inv.approvalStatus,
    toStatus: "DRAFT",
    note: note || "Admin restored to draft",
  });
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getPendingApprovals(orgId: string) {
  return db.crmInvoice.findMany({
    where: { orgId, approvalStatus: "PENDING_APPROVAL" },
    orderBy: { submittedAt: "asc" },
    select: {
      id: true,
      invoiceNumber: true,
      type: true,
      approvalStatus: true,
      total: true,
      submittedAt: true,
      owner: { select: { id: true, name: true } },
      account: { select: { id: true, name: true } },
    },
  });
}

export async function getApprovalLogs(invoiceId: string) {
  return db.crmApprovalLog.findMany({
    where: { invoiceId },
    orderBy: { createdAt: "desc" },
    include: {
      actor: { select: { id: true, name: true } },
    },
  });
}

export async function getApprovalMetrics(orgId: string) {
  const [pending, approvedThisMonth, declinedThisMonth, avgApprovalTime] = await Promise.all([
    db.crmInvoice.count({ where: { orgId, approvalStatus: "PENDING_APPROVAL" } }),
    db.crmInvoice.count({
      where: {
        orgId,
        approvalStatus: "APPROVED",
        approvedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
    db.crmInvoice.count({
      where: {
        orgId,
        approvalStatus: "DECLINED",
        updatedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
    // Avg hours from submit to approve (last 30 days)
    db.crmInvoice.findMany({
      where: {
        orgId,
        approvalStatus: "APPROVED",
        approvedAt: { not: null },
        submittedAt: { not: null },
        updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { submittedAt: true, approvedAt: true },
      take: 100,
    }),
  ]);

  let avgHours: number | null = null;
  if (Array.isArray(avgApprovalTime) && avgApprovalTime.length > 0) {
    const total = avgApprovalTime.reduce((sum, inv) => {
      if (!inv.submittedAt || !inv.approvedAt) return sum;
      return sum + (inv.approvedAt.getTime() - inv.submittedAt.getTime());
    }, 0);
    avgHours = total / avgApprovalTime.length / 3_600_000;
  }

  return { pending, approvedThisMonth, declinedThisMonth, avgHours };
}

// Automatically scan and send SLA breach notifications for Quotes and Sales Orders
export async function checkAndTriggerSlaNotifications(orgId: string) {
  const now = await getNow();

  // 1. Scan for Quotes (type: QUOTE) in SENT/CUSTOMER_VIEWED status where slaDeadline is breached
  const quotes = await db.crmInvoice.findMany({
    where: {
      orgId,
      type: "QUOTE",
      approvalStatus: { in: ["SENT", "CUSTOMER_VIEWED"] },
      slaDeadline: { lt: now },
    },
    include: { owner: true }
  });

  for (const quote of quotes) {
    // Check if SLA breach event was already logged to prevent double alerts
    const breachEvent = await db.crmTimelineEvent.findFirst({
      where: {
        orgId,
        relatedToType: "QUOTE",
        relatedToId: quote.id,
        eventType: "QUOTE_SLA_BREACH",
      }
    });

    if (!breachEvent) {
      // Create breach timeline event
      await db.crmTimelineEvent.create({
        data: {
          orgId,
          relatedToType: "QUOTE",
          relatedToId: quote.id,
          eventType: "QUOTE_SLA_BREACH",
          description: `Quote ${quote.invoiceNumber} customer response SLA breached (no response in 2 days)`,
          createdById: quote.ownerId,
        }
      });

      // Notify owner (salesperson)
      await notify({
        userId: quote.ownerId,
        orgId,
        kind: "QUOTE_SLA_BREACH",
        title: `Quote ${quote.invoiceNumber} SLA breach`,
        body: `No update from customer on Quote in 2 days.`,
        link: `/crm/quotes/${quote.id}`,
        priority: "important",
        variant: "warning",
      });

      // Notify accounts people (users with crm.invoice.approve)
      const accountsPeople = await getUsersWithPermission(orgId, APPROVAL_PERMISSIONS.INVOICE.approve);
      await Promise.all(
        accountsPeople.map((uid) =>
          notify({
            userId: uid,
            orgId,
            kind: "QUOTE_SLA_BREACH",
            title: `Quote ${quote.invoiceNumber} SLA breach`,
            body: `No update from customer on Quote in 2 days.`,
            link: `/crm/quotes/${quote.id}`,
            priority: "normal",
            variant: "warning",
          })
        )
      );
    }
  }

  // 2. Scan for Sales Orders (type: SALES_ORDER) where slaDeadline is breached
  const salesOrders = await db.crmInvoice.findMany({
    where: {
      orgId,
      type: "SALES_ORDER",
      approvalStatus: { in: ["APPROVED", "ACTIVE"] },
      slaDeadline: { lt: now },
    },
    include: { owner: true }
  });

  for (const so of salesOrders) {
    const breachEvent = await db.crmTimelineEvent.findFirst({
      where: {
        orgId,
        relatedToType: "SALES_ORDER",
        relatedToId: so.id,
        eventType: "SO_SLA_BREACH",
      }
    });

    if (!breachEvent) {
      // Create breach event
      await db.crmTimelineEvent.create({
        data: {
          orgId,
          relatedToType: "SALES_ORDER",
          relatedToId: so.id,
          eventType: "SO_SLA_BREACH",
          description: `Sales Order ${so.invoiceNumber} SLA breached (not converted to invoice within 30 business days)`,
          createdById: so.ownerId,
        }
      });

      // Notify accounts managers
      const mgrIds = await getUsersWithPermission(orgId, "crm.invoice.approve");
      await Promise.all(
        mgrIds.map((uid) =>
          notify({
            userId: uid,
            orgId,
            kind: "SALES_ORDER_SLA_BREACH",
            title: `Sales Order ${so.invoiceNumber} SLA breach`,
            body: `Sales Order not converted to invoice in 30 business days.`,
            link: `/crm/invoices/${so.id}`,
            priority: "important",
            variant: "destructive",
          })
        )
      );
    }
  }
}

