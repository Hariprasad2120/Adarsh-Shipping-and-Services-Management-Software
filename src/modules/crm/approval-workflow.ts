import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { requirePermission } from "@/lib/rbac";
import { notify, getUsersWithPermission } from "@/modules/notifications/service";
import * as chaService from "@/modules/cha/service";
import {
  createInitialFreightBookingPayload,
  type FreightBookingFormData,
  type FreightContainerRow,
} from "@/modules/freight-forwarding/booking-shared";
import type {
  QuotePricingTrace,
  QuoteApprovalFlowState,
  QuoteConversionState,
  QuoteWorkflowContext,
} from "@/modules/crm/components/quotes/lib/types";
import {
  buildQuotePricingTrace,
  isQuotePricingGovernanceBlocked,
} from "@/modules/crm/services/quote-pricing-governance.service";

// ─── Status type unions ───────────────────────────────────────────────────────

export type QuoteApprovalStatus =
  | "DRAFT"
  | "PENDING_MANAGER_APPROVAL"
  | "PENDING_CUSTOMER_APPROVAL"
  | "CUSTOMER_APPROVED"
  | "BOOKING_CREATED"
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

type QuoteSnapshot = QuoteWorkflowContext & {
  approvalFlow?: QuoteApprovalFlowState | null;
  conversion?: QuoteConversionState | null;
};

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

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readQuoteSnapshot(snapshot: unknown): QuoteSnapshot {
  if (!isObjectRecord(snapshot)) {
    return {
      mode: "combined",
      includedDepartments: [],
      pendingDepartments: [],
    };
  }

  return {
    ...snapshot,
    mode:
      snapshot.mode === "freight-only" ||
      snapshot.mode === "customs-only" ||
      snapshot.mode === "combined" ||
      snapshot.mode === "newly-added-only"
        ? snapshot.mode
        : "combined",
    includedDepartments: Array.isArray(snapshot.includedDepartments)
      ? (snapshot.includedDepartments.filter(
          (item): item is "FREIGHT_FORWARDING" | "CUSTOMS_CLEARANCE" =>
            item === "FREIGHT_FORWARDING" || item === "CUSTOMS_CLEARANCE",
        ) as QuoteWorkflowContext["includedDepartments"])
      : [],
    pendingDepartments: Array.isArray(snapshot.pendingDepartments)
      ? (snapshot.pendingDepartments.filter(
          (item): item is "FREIGHT_FORWARDING" | "CUSTOMS_CLEARANCE" =>
            item === "FREIGHT_FORWARDING" || item === "CUSTOMS_CLEARANCE",
        ) as QuoteWorkflowContext["pendingDepartments"])
      : [],
    latestQuoteId:
      typeof snapshot.latestQuoteId === "string" ? snapshot.latestQuoteId : null,
    latestQuoteVersion:
      typeof snapshot.latestQuoteVersion === "number"
        ? snapshot.latestQuoteVersion
        : null,
    quoteBaseNumber:
      typeof snapshot.quoteBaseNumber === "string"
        ? snapshot.quoteBaseNumber
        : null,
    recreateRequired: snapshot.recreateRequired === true,
    pricingSnapshotId:
      typeof snapshot.pricingSnapshotId === "string"
        ? snapshot.pricingSnapshotId
        : null,
    pricingSnapshotVersionLabel:
      typeof snapshot.pricingSnapshotVersionLabel === "string"
        ? snapshot.pricingSnapshotVersionLabel
        : null,
    pricingSellTotal:
      typeof snapshot.pricingSellTotal === "number"
        ? snapshot.pricingSellTotal
        : null,
    pricingBuyTotal:
      typeof snapshot.pricingBuyTotal === "number"
        ? snapshot.pricingBuyTotal
        : null,
    pricingMarginAmount:
      typeof snapshot.pricingMarginAmount === "number"
        ? snapshot.pricingMarginAmount
        : null,
    pricingMarginPercent:
      typeof snapshot.pricingMarginPercent === "number"
        ? snapshot.pricingMarginPercent
        : null,
    pricingTrace: isObjectRecord(snapshot.pricingTrace)
      ? (snapshot.pricingTrace as QuotePricingTrace)
      : null,
    approvalFlow: isObjectRecord(snapshot.approvalFlow)
      ? (snapshot.approvalFlow as QuoteApprovalFlowState)
      : null,
    conversion: isObjectRecord(snapshot.conversion)
      ? (snapshot.conversion as QuoteConversionState)
      : null,
  };
}

function withQuoteSnapshot(
  invoice: { sourceQuotationSnapshot: unknown },
  mutate: (snapshot: QuoteSnapshot) => QuoteSnapshot,
) {
  return mutate(readQuoteSnapshot(invoice.sourceQuotationSnapshot));
}

export function normalizeQuoteApprovalStatus(status: string | null | undefined) {
  switch ((status || "DRAFT").toUpperCase()) {
    case "PENDING_APPROVAL":
      return "PENDING_MANAGER_APPROVAL" as const;
    case "APPROVED":
    case "SENT":
    case "CUSTOMER_VIEWED":
      return "PENDING_CUSTOMER_APPROVAL" as const;
    case "ACCEPTED":
      return "CUSTOMER_APPROVED" as const;
    case "INVOICED":
      return "BOOKING_CREATED" as const;
    case "REWORK":
    case "DECLINED":
      return "DRAFT" as const;
    case "PENDING_MANAGER_APPROVAL":
    case "PENDING_CUSTOMER_APPROVAL":
    case "CUSTOMER_APPROVED":
    case "BOOKING_CREATED":
    case "DRAFT":
      return status!.toUpperCase() as
        | "DRAFT"
        | "PENDING_MANAGER_APPROVAL"
        | "PENDING_CUSTOMER_APPROVAL"
        | "CUSTOMER_APPROVED"
        | "BOOKING_CREATED";
    default:
      return "DRAFT" as const;
  }
}

export function mapQuoteApprovalStatusToListStatus(
  status: string | null | undefined,
) {
  switch (normalizeQuoteApprovalStatus(status)) {
    case "PENDING_MANAGER_APPROVAL":
      return "pending-manager-approval" as const;
    case "PENDING_CUSTOMER_APPROVAL":
      return "pending-customer-approval" as const;
    case "CUSTOMER_APPROVED":
      return "customer-approved" as const;
    case "BOOKING_CREATED":
      return "booking-created" as const;
    case "DRAFT":
    default:
      return "draft" as const;
  }
}

async function getUserName(userId: string | null | undefined) {
  if (!userId) return null;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  return user?.name ?? null;
}

async function buildQuoteNotificationMessage(managerId: string, quoteNumber: string) {
  const managerName = await getUserName(managerId);
  return managerName
    ? `Awaiting manager approval from ${managerName}.`
    : `Awaiting manager approval for ${quoteNumber}.`;
}

async function assertQuotePricingApprovalReady(params: {
  invoice: Awaited<ReturnType<typeof loadInvoice>>;
  orgId: string;
}) {
  const { invoice, orgId } = params;
  if (invoice.type !== "QUOTE") {
    return;
  }

  const snapshot = readQuoteSnapshot(invoice.sourceQuotationSnapshot);
  const linkedLeadId =
    invoice.crmLeadId ||
    ((snapshot as Record<string, unknown>).leadId as string | null | undefined) ||
    null;

  if (!linkedLeadId) {
    return;
  }

  const lead = await db.crmLead.findFirst({
    where: { id: linkedLeadId, orgId },
    select: { enquiryDetails: true },
  });

  const pricingTrace = buildQuotePricingTrace({
    workflowContext: snapshot,
    linkedLeadEnquiryDetails: lead?.enquiryDetails,
  });

  if (!isQuotePricingGovernanceBlocked(pricingTrace)) {
    return;
  }

  throw new Error(
    pricingTrace.message ||
      "Refresh the linked pricing worksheet and recreate this quotation before approval can continue.",
  );
}

function appendApprovalAudit(
  approvalFlow: QuoteApprovalFlowState | null | undefined,
  entry: NonNullable<QuoteApprovalFlowState["auditTrail"]>[number],
): QuoteApprovalFlowState {
  return {
    ...(approvalFlow ?? {}),
    auditTrail: [...(approvalFlow?.auditTrail ?? []), entry],
  };
}

function buildFreightBookingNumberBase(invoiceNumber: string, createdAt: Date) {
  const compactDate = createdAt.toISOString().slice(0, 10).replace(/-/g, "");
  const normalizedQuote = invoiceNumber.replace(/[^A-Z0-9]/gi, "").slice(-8);
  return `FFB-${compactDate}-${normalizedQuote}`;
}

async function buildUniqueFreightBookingNumber(params: {
  invoiceNumber: string;
  createdAt: Date;
}) {
  const baseNumber = buildFreightBookingNumberBase(
    params.invoiceNumber,
    params.createdAt,
  );

  const existingBase = await db.crmInvoice.findUnique({
    where: { invoiceNumber: baseNumber },
    select: { id: true },
  });

  if (!existingBase) {
    return baseNumber;
  }

  for (let attempt = 1; attempt < 1000; attempt += 1) {
    const candidate = `${baseNumber}-${String(attempt).padStart(2, "0")}`;
    const existingCandidate = await db.crmInvoice.findUnique({
      where: { invoiceNumber: candidate },
      select: { id: true },
    });

    if (!existingCandidate) {
      return candidate;
    }
  }

  throw new Error(
    `Unable to generate a unique freight booking number for quotation ${params.invoiceNumber}.`,
  );
}

// Reserved for the next CRM quote-to-freight conversion phase.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function createFreightBookingFromQuote(params: {
  actorId: string;
  actorName: string | null;
  invoice: Awaited<ReturnType<typeof loadInvoice>>;
  now: Date;
  orgId: string;
}) {
  const { actorId, actorName, invoice, now, orgId } = params;
  const payload = createInitialFreightBookingPayload(null);
  const transactionNumber = await buildUniqueFreightBookingNumber({
    invoiceNumber: invoice.invoiceNumber,
    createdAt: now,
  });
  const account = invoice.accountId
    ? await db.crmAccount.findUnique({
        where: { id: invoice.accountId },
        select: { name: true },
      })
    : null;
  const quoteReference = invoice.referenceNumber || invoice.invoiceNumber;
  const freightAuditNote = `Freight booking draft created from CRM quotation ${invoice.invoiceNumber}.`;
  const formData = {
    ...payload.formData,
    attachmentName: invoice.invoiceNumber,
    bookingPartyId: invoice.accountId ?? "",
    comments: freightAuditNote,
    consignee: account?.name ?? "",
    cargoDescription: invoice.commodity ?? "",
    finalDestination:
      invoice.portOfDestinationCountry ||
      invoice.portOfDischarge ||
      invoice.location ||
      "",
    handledById: invoice.ownerId ?? actorId,
    internalNotes: `Continue freight processing from quotation ${invoice.invoiceNumber}.`,
    jobNumber: quoteReference,
    notifyParty: account?.name ?? "",
    origin: invoice.location || "",
    portOfDischarge: invoice.portOfDischarge || "",
    portOfLoad: invoice.portOfLoading || "",
    salespersonId: invoice.ownerId ?? actorId,
    shipper: account?.name ?? "",
    term: invoice.incoterm || payload.formData.term,
  };

  const freightForwardingSnapshot = {
    transactionType: "HBL" as const,
    bookingGroupId: null,
    bookingMode: null,
    linkedTransactionIds: [],
    formData,
    equipmentTypes: payload.equipmentTypes,
    containers: payload.containers,
    auditTrail: [
      {
        action: "CREATED",
        actorId,
        actorName: actorName || "User",
        at: now.toISOString(),
        note: freightAuditNote,
      },
    ],
  };

  const freightBooking = await db.crmInvoice.create({
    data: {
      orgId,
      ownerId: invoice.ownerId ?? actorId,
      createdById: actorId,
      updatedById: actorId,
      invoiceNumber: transactionNumber,
      type: "FREIGHT_BOOKING",
      date: now,
      status: "DRAFT",
      approvalStatus: "DRAFT",
      accountId: invoice.accountId ?? null,
      contactId: invoice.contactId ?? null,
      location: invoice.location ?? null,
      portOfLoading: invoice.portOfLoading ?? null,
      portOfDischarge: invoice.portOfDischarge ?? null,
      portOfDestinationCountry: invoice.portOfDestinationCountry ?? null,
      incoterm: invoice.incoterm ?? null,
      commodity: invoice.commodity ?? null,
      weight: invoice.weight ?? null,
      sourceQuotationSnapshot: {
        freightForwarding: freightForwardingSnapshot,
      },
    },
    select: {
      id: true,
      invoiceNumber: true,
    },
  });

  await db.crmApprovalLog.create({
    data: {
      orgId,
      invoiceId: freightBooking.id,
      actorId,
      fromStatus: "FREIGHT_BOOKING",
      toStatus: "FREIGHT_BOOKING",
      note: freightAuditNote,
    },
  });

  return {
    bookingGroupId: null,
    transactionId: freightBooking.id,
    transactionNumber: freightBooking.invoiceNumber,
    transactionType: freightForwardingSnapshot.transactionType,
  };
}

type QuoteFreightProcessInput = {
  mode: "MBL_ONLY" | "HBL_ONLY" | "BOTH";
  mbl?: {
    containers: FreightContainerRow[];
    equipmentTypes: string[];
    formData: FreightBookingFormData;
  };
  hbl?: {
    containers: FreightContainerRow[];
    equipmentTypes: string[];
    formData: FreightBookingFormData;
  };
};

async function createFreightProcessTransaction(params: {
  actorId: string;
  actorName: string | null;
  bookingGroupId: string;
  bookingMode: "MBL_ONLY" | "HBL_ONLY" | "BOTH";
  containers?: FreightContainerRow[];
  equipmentTypes?: string[];
  formData?: FreightBookingFormData;
  linkedTransactionIds: string[];
  orgId: string;
  transactionType: "MBL" | "HBL";
}) {
  const now = await getNow();
  const payload = createInitialFreightBookingPayload(params.transactionType);
  const formData = params.formData || payload.formData;
  const equipmentTypes =
    params.equipmentTypes && params.equipmentTypes.length > 0
      ? params.equipmentTypes
      : payload.equipmentTypes;
  const containers =
    params.containers && params.containers.length > 0
      ? params.containers
      : payload.containers;
  const transactionNumber = `${params.transactionType}-${now
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "")}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const auditNote = `Freight ${params.transactionType} transaction created from quotation process handoff.`;

  const record = await db.crmInvoice.create({
    data: {
      orgId: params.orgId,
      ownerId: formData.salespersonId || params.actorId,
      createdById: params.actorId,
      updatedById: params.actorId,
      invoiceNumber: transactionNumber,
      type: "FREIGHT_BOOKING",
      date: now,
      status: "DRAFT",
      approvalStatus: "DRAFT",
      accountId: formData.bookingPartyId || null,
      location: formData.origin || null,
      portOfLoading: formData.portOfLoad || null,
      portOfDischarge: formData.portOfDischarge || null,
      portOfDestinationCountry: formData.finalDestination || null,
      incoterm: formData.term || null,
      sourceQuotationSnapshot: {
        freightForwarding: {
          transactionType: params.transactionType,
          bookingGroupId: params.bookingGroupId,
          bookingMode: params.bookingMode,
          linkedTransactionIds: params.linkedTransactionIds,
          formData,
          equipmentTypes,
          containers,
          auditTrail: [
            {
              action: "CREATED",
              actorId: params.actorId,
              actorName: params.actorName || "User",
              at: now.toISOString(),
              note: auditNote,
            },
          ],
        },
      },
    },
    select: {
      id: true,
      invoiceNumber: true,
    },
  });

  await db.crmApprovalLog.create({
    data: {
      orgId: params.orgId,
      invoiceId: record.id,
      actorId: params.actorId,
      fromStatus: "FREIGHT_BOOKING",
      toStatus: "FREIGHT_BOOKING",
      note: auditNote,
    },
  });

  return record;
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

async function resolveQuoteManager(
  orgId: string,
  selectedManagerId: string | null | undefined,
) {
  if (!selectedManagerId) return null;
  return db.user.findFirst({
    where: { id: selectedManagerId, orgId },
    select: { id: true, name: true },
  });
}

// Reserved for the next CRM quote-to-CHA conversion phase.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function createChaJobFromQuote(params: {
  actorId: string;
  orgId: string;
  invoice: Awaited<ReturnType<typeof loadInvoice>>;
  managerId: string | null | undefined;
}) {
  const { actorId, orgId, invoice, managerId } = params;

  if (!invoice.accountId) {
    throw new Error("Customer must be linked before creating a CHA job.");
  }

  const [branch, jobType, shipmentType] = await Promise.all([
    db.branch.findFirst({
      where: { orgId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.chaJobType.findFirst({
      where: { orgId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.chaShipmentType.findFirst({
      where: { orgId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true },
    }),
  ]);

  if (!branch) {
    throw new Error(
      "No branch is configured for CHA conversion. Please configure a branch first.",
    );
  }
  if (!jobType) {
    throw new Error(
      "No active CHA job type is configured for conversion. Please configure CHA job types first.",
    );
  }
  if (!managerId) {
    throw new Error(
      "Select a manager before converting this quotation into a CHA job.",
    );
  }

  const customer = invoice.accountId
    ? await db.crmAccount.findUnique({
        where: { id: invoice.accountId },
        select: { name: true },
      })
    : null;

  const job = await chaService.createJob(actorId, orgId, {
    title: `${customer?.name ?? "Customer"} - ${invoice.invoiceNumber}`,
    customerId: invoice.accountId,
    customerRef: invoice.referenceNumber || invoice.invoiceNumber,
    jobTypeId: jobType.id,
    shipmentTypeId: shipmentType?.id,
    branchId: branch.id,
    priority: "MEDIUM",
    remarks:
      "Created from approved quotation conversion. Continue processing from the CHA workspace.",
    primaryOwnerId: invoice.ownerId,
    assignedManagerId: managerId,
    assignments: [],
  });

  return job;
}

// Submit for approval (owner/creator action)
export async function submitForApproval(params: {
  invoiceId: string;
  orgId: string;
  actorId: string;
  note?: string;
  managerId?: string;
}) {
  const { invoiceId, orgId, actorId, note, managerId } = params;
  const inv = await loadInvoice(invoiceId, orgId);

  const perm = APPROVAL_PERMISSIONS[inv.type as CrmEntityType]?.submit;
  if (!perm) throw new Error("Unknown entity type");
  await requirePermission(actorId, perm);

  if (inv.type === "QUOTE") {
    const normalizedStatus = normalizeQuoteApprovalStatus(inv.approvalStatus);
    if (normalizedStatus !== "DRAFT") {
      throw new Error(`Cannot submit from status: ${inv.approvalStatus}`);
    }

    await assertQuotePricingApprovalReady({ invoice: inv, orgId });

    if (!managerId) {
      throw new Error("Select the approving manager before submitting.");
    }

    const selectedManager = await resolveQuoteManager(orgId, managerId);
    if (!selectedManager) {
      throw new Error("The selected approving manager could not be found.");
    }

    const actorName = await getUserName(actorId);
    const now = await getNow();
    const notificationMessage = await buildQuoteNotificationMessage(
      selectedManager.id,
      inv.invoiceNumber,
    );
    const sourceQuotationSnapshot = withQuoteSnapshot(inv, (snapshot) => {
      const approvalFlow = appendApprovalAudit(snapshot.approvalFlow, {
        stage: "MANAGER",
        decision: "SUBMITTED",
        remarks: note ?? null,
        actedAt: now.toISOString(),
        actedById: actorId,
        actedByName: actorName,
      });

      return {
        ...snapshot,
        approvalFlow: {
          ...approvalFlow,
          selectedManagerId: selectedManager.id,
          selectedManagerName: selectedManager.name,
          submittedAt: now.toISOString(),
          submittedById: actorId,
          submittedByName: actorName,
          managerStatus: "PENDING",
          managerDecisionAt: null,
          managerDecisionById: null,
          managerDecisionByName: null,
          managerRemarks: null,
          customerStatus: null,
          customerDecisionAt: null,
          customerDecisionById: null,
          customerDecisionByName: null,
          customerRemarks: null,
          lastRejectedStage: null,
          rejectionReturnedToDraftAt: null,
          notifications: [notificationMessage],
        },
      };
    });

    await db.crmInvoice.update({
      where: { id: invoiceId },
      data: {
        approvalStatus: "PENDING_MANAGER_APPROVAL",
        submittedAt: now,
        approvedAt: null,
        approvedById: null,
        approvalNote: null,
        reworkNote: null,
        sourceQuotationSnapshot,
        updatedById: actorId,
      },
    });

    await logTransition({
      orgId,
      invoiceId,
      actorId,
      fromStatus: inv.approvalStatus,
      toStatus: "PENDING_MANAGER_APPROVAL",
      note: note
        ? `Manager: ${selectedManager.name}. ${note}`
        : `Manager: ${selectedManager.name}`,
    });

    await notify({
      userId: selectedManager.id,
      orgId,
      kind: "APPROVAL_REQUESTED",
      title: `Quotation ${inv.invoiceNumber} awaiting your approval`,
      body:
        note ||
        `Review quotation ${inv.invoiceNumber} and record your approval decision.`,
      link: `/crm/quotes/${invoiceId}`,
      priority: "important",
      requiresAck: false,
      variant: "warning",
    });
    return;
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

  if (inv.type === "QUOTE") {
    const normalizedStatus = normalizeQuoteApprovalStatus(inv.approvalStatus);
    if (normalizedStatus !== "PENDING_MANAGER_APPROVAL") {
      throw new Error(`Cannot approve from status: ${inv.approvalStatus}`);
    }

    await assertQuotePricingApprovalReady({ invoice: inv, orgId });

    const snapshot = readQuoteSnapshot(inv.sourceQuotationSnapshot);
    const selectedManagerId = snapshot.approvalFlow?.selectedManagerId;
    if (selectedManagerId && selectedManagerId !== actorId) {
      throw new Error("Only the selected approving manager can approve this quotation.");
    }

    const now = await getNow();
    const actorName = await getUserName(actorId);
    const sourceQuotationSnapshot = withQuoteSnapshot(inv, (current) => {
      const approvalFlow = appendApprovalAudit(current.approvalFlow, {
        stage: "MANAGER",
        decision: "APPROVED",
        remarks: note ?? null,
        actedAt: now.toISOString(),
        actedById: actorId,
        actedByName: actorName,
      });

      return {
        ...current,
        approvalFlow: {
          ...approvalFlow,
          managerStatus: "APPROVED",
          managerDecisionAt: now.toISOString(),
          managerDecisionById: actorId,
          managerDecisionByName: actorName,
          managerRemarks: note ?? null,
          customerStatus: "PENDING",
          notifications: [
            "Customer approval is now pending. Authorised users can record the decision on behalf of the customer during testing.",
          ],
        },
      };
    });

    await db.crmInvoice.update({
      where: { id: invoiceId },
      data: {
        approvalStatus: "PENDING_CUSTOMER_APPROVAL",
        approvedAt: now,
        approvedById: actorId,
        approvalNote: note ?? null,
        sourceQuotationSnapshot,
        updatedById: actorId,
      },
    });

    await logTransition({
      orgId,
      invoiceId,
      actorId,
      fromStatus: inv.approvalStatus,
      toStatus: "PENDING_CUSTOMER_APPROVAL",
      note,
    });

    await notify({
      userId: inv.ownerId,
      orgId,
      kind: "APPROVAL_APPROVED",
      title: `Quotation ${inv.invoiceNumber} approved by manager`,
      body:
        note ||
        "Manager approval is complete. Customer approval can now be recorded.",
      link: `/crm/quotes/${invoiceId}`,
      priority: "normal",
      variant: "success",
    });
    return;
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

  if (inv.type === "QUOTE") {
    const normalizedStatus = normalizeQuoteApprovalStatus(inv.approvalStatus);
    if (normalizedStatus !== "PENDING_MANAGER_APPROVAL") {
      throw new Error(`Cannot request rework from status: ${inv.approvalStatus}`);
    }

    const snapshot = readQuoteSnapshot(inv.sourceQuotationSnapshot);
    const selectedManagerId = snapshot.approvalFlow?.selectedManagerId;
    if (selectedManagerId && selectedManagerId !== actorId) {
      throw new Error("Only the selected approving manager can reject this quotation.");
    }

    const now = await getNow();
    const actorName = await getUserName(actorId);
    const sourceQuotationSnapshot = withQuoteSnapshot(inv, (current) => {
      const approvalFlow = appendApprovalAudit(current.approvalFlow, {
        stage: "MANAGER",
        decision: "REJECTED",
        remarks: note,
        actedAt: now.toISOString(),
        actedById: actorId,
        actedByName: actorName,
      });

      return {
        ...current,
        approvalFlow: {
          ...approvalFlow,
          managerStatus: "REJECTED",
          managerDecisionAt: now.toISOString(),
          managerDecisionById: actorId,
          managerDecisionByName: actorName,
          managerRemarks: note,
          customerStatus: null,
          lastRejectedStage: "MANAGER",
          rejectionReturnedToDraftAt: now.toISOString(),
          notifications: [
            "Manager rejected the quotation. Update the draft and resubmit for approval.",
          ],
        },
      };
    });

    await db.crmInvoice.update({
      where: { id: invoiceId },
      data: {
        approvalStatus: "DRAFT",
        reworkNote: note,
        approvalNote: note,
        submittedAt: null,
        sourceQuotationSnapshot,
        updatedById: actorId,
      },
    });

    await logTransition({
      orgId,
      invoiceId,
      actorId,
      fromStatus: inv.approvalStatus,
      toStatus: "DRAFT",
      note: `Manager rejected: ${note}`,
    });

    await notify({
      userId: inv.ownerId,
      orgId,
      kind: "APPROVAL_REWORK",
      title: `Quotation ${inv.invoiceNumber} rejected by manager`,
      body: note,
      link: `/crm/quotes/${invoiceId}`,
      priority: "important",
      requiresAck: true,
      variant: "warning",
    });
    return;
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

export async function recordCustomerDecision(params: {
  invoiceId: string;
  orgId: string;
  actorId: string;
  decision: "APPROVED" | "REJECTED";
  note?: string;
  actedAt?: string;
}) {
  const { invoiceId, orgId, actorId, decision, note, actedAt } = params;
  const inv = await loadInvoice(invoiceId, orgId);

  if (inv.type !== "QUOTE") {
    throw new Error("Customer decisions are supported only for quotations.");
  }

  await requirePermission(actorId, APPROVAL_PERMISSIONS.QUOTE.manage);

  const normalizedStatus = normalizeQuoteApprovalStatus(inv.approvalStatus);
  if (normalizedStatus !== "PENDING_CUSTOMER_APPROVAL") {
    throw new Error(`Cannot record a customer decision from status: ${inv.approvalStatus}`);
  }

  await assertQuotePricingApprovalReady({ invoice: inv, orgId });

  const actorName = await getUserName(actorId);
  const decisionDate = actedAt ? new Date(actedAt) : await getNow();
  const decisionTimestamp = decisionDate.toISOString();
  const customerNote = note?.trim() || null;
  const targetStatus = decision === "APPROVED" ? "CUSTOMER_APPROVED" : "DRAFT";

  const sourceQuotationSnapshot = withQuoteSnapshot(inv, (current) => {
    const approvalFlow = appendApprovalAudit(current.approvalFlow, {
      stage: "CUSTOMER",
      decision,
      remarks: customerNote,
      actedAt: decisionTimestamp,
      actedById: actorId,
      actedByName: actorName,
    });

    return {
      ...current,
      approvalFlow: {
        ...approvalFlow,
        customerStatus: decision,
        customerDecisionAt: decisionTimestamp,
        customerDecisionById: actorId,
        customerDecisionByName: actorName,
        customerRemarks: customerNote,
        lastRejectedStage: decision === "REJECTED" ? "CUSTOMER" : null,
        rejectionReturnedToDraftAt:
          decision === "REJECTED" ? decisionTimestamp : null,
        notifications:
          decision === "APPROVED"
            ? [
                "Customer approval is complete. Create booking to continue into Freight Forwarding and CHA operations.",
              ]
            : [
                "Customer rejected the quotation. Update the draft and send it through manager and customer approval again.",
              ],
      },
    };
  });

  await db.crmInvoice.update({
    where: { id: invoiceId },
    data: {
      approvalStatus: targetStatus,
      reworkNote:
        decision === "REJECTED"
          ? customerNote || "Customer rejected the quotation."
          : null,
      sourceQuotationSnapshot,
      updatedById: actorId,
    },
  });

  await logTransition({
    orgId,
    invoiceId,
    actorId,
    fromStatus: inv.approvalStatus,
    toStatus: targetStatus,
    note: customerNote ?? `Customer ${decision.toLowerCase()} via authorised user`,
  });

  await notify({
    userId: inv.ownerId,
    orgId,
    kind: decision === "APPROVED" ? "APPROVAL_APPROVED" : "QUOTE_REWORK",
    title:
      decision === "APPROVED"
        ? `Customer approved quotation ${inv.invoiceNumber}`
        : `Customer rejected quotation ${inv.invoiceNumber}`,
    body:
      customerNote ||
      (decision === "APPROVED"
        ? "Customer approval has been recorded."
        : "Customer rejection has been recorded and the quotation has returned to draft."),
    link: `/crm/quotes/${invoiceId}`,
    priority: "important",
    requiresAck: decision === "REJECTED",
    variant: decision === "APPROVED" ? "success" : "warning",
  });
}

export async function createQuoteBooking(params: {
  invoiceId: string;
  orgId: string;
  actorId: string;
}) {
  const { invoiceId, orgId, actorId } = params;
  const inv = await loadInvoice(invoiceId, orgId);

  if (inv.type !== "QUOTE") {
    throw new Error("Only quotations can be converted into bookings.");
  }

  await requirePermission(actorId, APPROVAL_PERMISSIONS.QUOTE.manage);

  const normalizedStatus = normalizeQuoteApprovalStatus(inv.approvalStatus);
  if (normalizedStatus !== "CUSTOMER_APPROVED" && normalizedStatus !== "BOOKING_CREATED") {
    throw new Error("Customer approval is required before creating bookings.");
  }

  const actorName = await getUserName(actorId);
  const now = await getNow();
  const existingSnapshot = readQuoteSnapshot(inv.sourceQuotationSnapshot);
  const departmentsToCreate = Array.from(
    new Set([
      ...existingSnapshot.includedDepartments,
      ...existingSnapshot.pendingDepartments,
    ]),
  );
  const resolvedDepartments =
    departmentsToCreate.length > 0
      ? departmentsToCreate
      : ["FREIGHT_FORWARDING", "CUSTOMS_CLEARANCE"];

  const nextConversion: QuoteConversionState = {
    ...(existingSnapshot.conversion ?? {}),
    createdAt: existingSnapshot.conversion?.createdAt ?? now.toISOString(),
    createdById: existingSnapshot.conversion?.createdById ?? actorId,
    createdByName: existingSnapshot.conversion?.createdByName ?? actorName,
    linkedLeadId: inv.crmLeadId ?? existingSnapshot.conversion?.linkedLeadId ?? null,
  };

  if (
    resolvedDepartments.includes("CUSTOMS_CLEARANCE") &&
    !nextConversion.chaJobId
  ) {
    nextConversion.chaJobId = null;
    nextConversion.chaJobNumber = null;
    nextConversion.chaStatus = "PROCESSING_PENDING";
  }

  if (
    resolvedDepartments.includes("FREIGHT_FORWARDING") &&
    !nextConversion.freightTransactionId
  ) {
    nextConversion.freightBookingNumber = null;
    nextConversion.freightTransactionId = null;
    nextConversion.freightBookingGroupId = null;
    nextConversion.freightTransactionType = null;
    nextConversion.freightStatus = "PROCESSING_PENDING";
  }

  const sourceQuotationSnapshot = withQuoteSnapshot(inv, (current) => {
    const approvalFlow = appendApprovalAudit(current.approvalFlow, {
      stage: "BOOKING",
      decision: "PROCESSING_PENDING",
      remarks: [
        nextConversion.chaStatus === "PROCESSING_PENDING"
          ? "CHA queued for processing"
          : null,
        nextConversion.freightStatus === "PROCESSING_PENDING"
          ? "Freight queued for processing"
          : null,
      ]
        .filter(Boolean)
        .join(" | "),
      actedAt: now.toISOString(),
      actedById: actorId,
      actedByName: actorName,
    });

    return {
      ...current,
      approvalFlow: {
        ...approvalFlow,
        notifications: [
          "Operational handoff is queued. Teams can continue from the dedicated Freight Forwarding and CHA process pages.",
        ],
      },
      conversion: nextConversion,
    };
  });

  await db.crmInvoice.update({
    where: { id: invoiceId },
    data: {
      approvalStatus: "BOOKING_CREATED",
      sourceQuotationSnapshot,
      updatedById: actorId,
    },
  });

  await logTransition({
    orgId,
    invoiceId,
    actorId,
    fromStatus: inv.approvalStatus,
    toStatus: "BOOKING_CREATED",
    note: [
      nextConversion.chaStatus === "PROCESSING_PENDING"
        ? "CHA queued for processing"
        : null,
      nextConversion.freightStatus === "PROCESSING_PENDING"
        ? "Freight queued for processing"
        : null,
    ]
      .filter(Boolean)
      .join(" | "),
  });

  await notify({
    userId: inv.ownerId,
    orgId,
    kind: "APPROVAL_APPROVED",
    title: `Operational booking created from quotation ${inv.invoiceNumber}`,
    body: [
      nextConversion.chaJobNumber
        ? `CHA job ${nextConversion.chaJobNumber}`
        : null,
      nextConversion.freightBookingNumber
        ? `Freight booking ${nextConversion.freightBookingNumber}`
        : null,
    ]
      .filter(Boolean)
      .join(" · "),
    link: `/crm/quotes/${invoiceId}`,
    priority: "normal",
    variant: "success",
  });

  return nextConversion;
}

export async function completeQuoteFreightProcess(params: {
  actorId: string;
  invoiceId: string;
  orgId: string;
  input: QuoteFreightProcessInput;
}) {
  const { actorId, invoiceId, orgId, input } = params;
  const inv = await loadInvoice(invoiceId, orgId);

  if (inv.type !== "QUOTE") {
    throw new Error("Only quotations can complete freight processing.");
  }

  await requirePermission(actorId, APPROVAL_PERMISSIONS.QUOTE.manage);

  const existingSnapshot = readQuoteSnapshot(inv.sourceQuotationSnapshot);
  if (existingSnapshot.conversion?.freightStatus !== "PROCESSING_PENDING") {
    throw new Error("This quotation is not waiting in the freight process queue.");
  }

  const actorName = await getUserName(actorId);
  const bookingGroupId = randomUUID();
  let mblTransaction: { id: string; invoiceNumber: string } | null = null;
  let hblTransaction: { id: string; invoiceNumber: string } | null = null;

  if (input.mode === "MBL_ONLY" || input.mode === "BOTH") {
    if (!input.mbl) {
      throw new Error("MBL transaction details are required.");
    }
    mblTransaction = await createFreightProcessTransaction({
      actorId,
      actorName,
      bookingGroupId,
      bookingMode: input.mode,
      containers: input.mbl.containers,
      equipmentTypes: input.mbl.equipmentTypes,
      formData: input.mbl.formData,
      linkedTransactionIds: [],
      orgId,
      transactionType: "MBL",
    });
  }

  if (input.mode === "HBL_ONLY" || input.mode === "BOTH") {
    if (!input.hbl) {
      throw new Error("HBL transaction details are required.");
    }
    hblTransaction = await createFreightProcessTransaction({
      actorId,
      actorName,
      bookingGroupId,
      bookingMode: input.mode,
      containers: input.hbl.containers,
      equipmentTypes: input.hbl.equipmentTypes,
      formData: input.hbl.formData,
      linkedTransactionIds: [],
      orgId,
      transactionType: "HBL",
    });
  }

  const linkedIds = [mblTransaction?.id, hblTransaction?.id].filter(
    (value): value is string => Boolean(value),
  );

  if (linkedIds.length > 1) {
    for (const linkedId of linkedIds) {
      const record = await db.crmInvoice.findUnique({
        where: { id: linkedId },
        select: { sourceQuotationSnapshot: true },
      });
      if (!record) continue;
      const snapshot =
        record.sourceQuotationSnapshot &&
        typeof record.sourceQuotationSnapshot === "object" &&
        !Array.isArray(record.sourceQuotationSnapshot)
          ? (record.sourceQuotationSnapshot as Record<string, unknown>)
          : {};
      const freightForwarding =
        snapshot.freightForwarding &&
        typeof snapshot.freightForwarding === "object" &&
        !Array.isArray(snapshot.freightForwarding)
          ? (snapshot.freightForwarding as Record<string, unknown>)
          : {};
      await db.crmInvoice.update({
        where: { id: linkedId },
        data: {
          sourceQuotationSnapshot: {
            ...snapshot,
            freightForwarding: {
              ...freightForwarding,
              linkedTransactionIds: linkedIds.filter((id) => id !== linkedId),
            },
          },
          updatedById: actorId,
        },
      });
    }
  }

  const primaryTransaction =
    input.mode === "MBL_ONLY" ? mblTransaction : hblTransaction || mblTransaction;
  const nextConversion: QuoteConversionState = {
    ...(existingSnapshot.conversion ?? {}),
    freightBookingGroupId: bookingGroupId,
    freightBookingNumber: primaryTransaction?.invoiceNumber ?? null,
    freightTransactionId: primaryTransaction?.id ?? null,
    freightTransactionType: input.mode === "MBL_ONLY" ? "MBL" : "HBL",
    freightStatus: "CREATED",
  };

  await db.crmInvoice.update({
    where: { id: invoiceId },
    data: {
      sourceQuotationSnapshot: withQuoteSnapshot(inv, (current) => ({
        ...current,
        conversion: nextConversion,
      })),
      updatedById: actorId,
    },
  });

  await logTransition({
    orgId,
    invoiceId,
    actorId,
    fromStatus: "BOOKING_CREATED",
    toStatus: "BOOKING_CREATED",
    note: `Freight process completed with ${input.mode.replaceAll("_", " ")} transaction creation.`,
  });

  return {
    bookingGroupId,
    hblTransactionId: hblTransaction?.id ?? null,
    mblTransactionId: mblTransaction?.id ?? null,
    mode: input.mode,
  };
}

export async function completeQuoteChaProcess(params: {
  actorId: string;
  chaJobId: string;
  chaJobNumber: string;
  invoiceId: string;
  orgId: string;
}) {
  const { actorId, chaJobId, chaJobNumber, invoiceId, orgId } = params;
  const inv = await loadInvoice(invoiceId, orgId);

  if (inv.type !== "QUOTE") {
    throw new Error("Only quotations can complete CHA processing.");
  }

  await requirePermission(actorId, APPROVAL_PERMISSIONS.QUOTE.manage);

  const existingSnapshot = readQuoteSnapshot(inv.sourceQuotationSnapshot);
  if (existingSnapshot.conversion?.chaStatus !== "PROCESSING_PENDING") {
    throw new Error("This quotation is not waiting in the CHA process queue.");
  }

  const nextConversion: QuoteConversionState = {
    ...(existingSnapshot.conversion ?? {}),
    chaJobId,
    chaJobNumber,
    chaStatus: "CREATED",
  };

  await db.crmInvoice.update({
    where: { id: invoiceId },
    data: {
      sourceQuotationSnapshot: withQuoteSnapshot(inv, (current) => ({
        ...current,
        conversion: nextConversion,
      })),
      updatedById: actorId,
    },
  });

  await logTransition({
    orgId,
    invoiceId,
    actorId,
    fromStatus: "BOOKING_CREATED",
    toStatus: "BOOKING_CREATED",
    note: `CHA process completed with job ${chaJobNumber}.`,
  });

  return nextConversion;
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
    where: {
      orgId,
      OR: [
        { type: "QUOTE", approvalStatus: { in: ["PENDING_APPROVAL", "PENDING_MANAGER_APPROVAL"] } },
        { type: { in: ["INVOICE", "SALES_ORDER"] }, approvalStatus: "PENDING_APPROVAL" },
      ],
    },
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
    db.crmInvoice.count({
      where: {
        orgId,
        OR: [
          { type: "QUOTE", approvalStatus: { in: ["PENDING_APPROVAL", "PENDING_MANAGER_APPROVAL"] } },
          { type: { in: ["INVOICE", "SALES_ORDER"] }, approvalStatus: "PENDING_APPROVAL" },
        ],
      },
    }),
    db.crmInvoice.count({
      where: {
        orgId,
        OR: [
          { type: "QUOTE", approvalStatus: "CUSTOMER_APPROVED" },
          { type: { in: ["INVOICE", "SALES_ORDER"] }, approvalStatus: "APPROVED" },
        ],
        approvedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
    db.crmInvoice.count({
      where: {
        orgId,
        OR: [
          { type: "QUOTE", reworkNote: { not: null } },
          { type: { in: ["INVOICE", "SALES_ORDER"] }, approvalStatus: "DECLINED" },
        ],
        updatedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
    // Avg hours from submit to approve (last 30 days)
    db.crmInvoice.findMany({
      where: {
        orgId,
        OR: [
          { type: "QUOTE", approvalStatus: "PENDING_CUSTOMER_APPROVAL" },
          { type: { in: ["INVOICE", "SALES_ORDER"] }, approvalStatus: "APPROVED" },
        ],
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

