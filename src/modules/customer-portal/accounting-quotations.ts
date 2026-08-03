import { db } from "@/lib/db";
import {
  acceptQuotationDraft,
  declineQuotationDraft,
} from "@/modules/accounting/service";

function isPortalPublishedQuotation(sendDelivery: unknown) {
  return Boolean(
    sendDelivery &&
      typeof sendDelivery === "object" &&
      !Array.isArray(sendDelivery) &&
      (sendDelivery as Record<string, unknown>).mode === "PORTAL",
  );
}

function optionalText(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

export async function listPortalAccountingQuotations(input: {
  orgId: string;
  customerId: string;
}) {
  const quotations = await db.quotation.findMany({
    where: {
      orgId: input.orgId,
      customerId: input.customerId,
      status: {
        notIn: ["DRAFT", "PENDING_APPROVAL"],
      },
    },
    include: {
      items: true,
    },
    orderBy: [{ sentAt: "desc" }, { postingDate: "desc" }, { quotationNumber: "desc" }],
  });

  return quotations.filter((quotation) =>
    isPortalPublishedQuotation(quotation.sendDelivery),
  );
}

export async function getPortalAccountingQuotation(input: {
  orgId: string;
  customerId: string;
  quotationId: string;
}) {
  const quotation = await db.quotation.findFirst({
    where: {
      orgId: input.orgId,
      customerId: input.customerId,
      id: input.quotationId,
      status: {
        notIn: ["DRAFT", "PENDING_APPROVAL"],
      },
    },
    include: {
      items: true,
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          gstin: true,
        },
      },
    },
  });
  if (!quotation || !isPortalPublishedQuotation(quotation.sendDelivery)) {
    throw new Error("PORTAL_QUOTATION_NOT_FOUND");
  }
  return quotation;
}

export async function submitPortalAccountingQuotationDecision(input: {
  orgId: string;
  customerId: string;
  portalUserId: string;
  quotationId: string;
  decision: "ACCEPTED" | "DECLINED";
  remarks?: string | null;
  expectedVersion?: number;
}) {
  const quotation = await db.quotation.findFirst({
    where: {
      orgId: input.orgId,
      customerId: input.customerId,
      id: input.quotationId,
    },
    select: {
      id: true,
      orgId: true,
      customerId: true,
      rowVersion: true,
      status: true,
      validUntil: true,
      sendDelivery: true,
    },
  });

  if (!quotation || !isPortalPublishedQuotation(quotation.sendDelivery)) {
    throw new Error("PORTAL_QUOTATION_NOT_FOUND");
  }

  if (quotation.validUntil.getTime() < Date.now()) {
    throw new Error("PORTAL_QUOTATION_EXPIRED");
  }

  if (quotation.status !== "SENT") {
    if (
      quotation.status === "ACCEPTED" ||
      quotation.status === "PARTIALLY_CONVERTED" ||
      quotation.status === "CONVERTED"
    ) {
      throw new Error("PORTAL_QUOTATION_ALREADY_ACCEPTED");
    }
    if (quotation.status === "DECLINED") {
      throw new Error("PORTAL_QUOTATION_ALREADY_DECLINED");
    }
    if (quotation.status === "EXPIRED") {
      throw new Error("PORTAL_QUOTATION_EXPIRED");
    }
    throw new Error("PORTAL_QUOTATION_DECISION_UNAVAILABLE");
  }

  const expectedVersion = input.expectedVersion ?? quotation.rowVersion;
  if (input.decision === "ACCEPTED") {
    return acceptQuotationDraft(
      input.orgId,
      input.quotationId,
      input.portalUserId,
      {
        expectedVersion,
        source: "PORTAL",
        customerReference: optionalText(input.remarks),
      },
    );
  }

  return declineQuotationDraft(input.orgId, input.quotationId, input.portalUserId, {
    expectedVersion,
    source: "PORTAL",
    reason: optionalText(input.remarks) || "",
  });
}
