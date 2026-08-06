import "server-only";

import { db } from "@/lib/db";
import {
  createInitialFreightBookingPayload,
  type FreightBookingCreationMode,
  type FreightBookingFormData,
  type FreightBookingReferenceData,
  type FreightContainerRow,
  type FreightTransactionType,
} from "@/modules/freight-forwarding/booking-shared";

export type FreightBookingAuditEntry = {
  action:
    | "CREATED"
    | "UPDATED"
    | "CONNECTED"
    | "DISCONNECTED";
  actorId: string;
  actorName: string;
  at: string;
  note: string;
};

type FreightBookingSnapshot = {
  freightForwarding?: {
    transactionType: FreightTransactionType;
    bookingGroupId: string | null;
    bookingMode: FreightBookingCreationMode | null;
    linkedTransactionIds: string[];
    formData: FreightBookingFormData;
    equipmentTypes: string[];
    containers: FreightContainerRow[];
    auditTrail: FreightBookingAuditEntry[];
  };
};

export type FreightBookingTransaction = {
  id: string;
  transactionNumber: string;
  transactionType: FreightTransactionType;
  bookingGroupId: string | null;
  bookingMode: FreightBookingCreationMode | null;
  linkedTransactionIds: string[];
  formData: FreightBookingFormData;
  equipmentTypes: string[];
  containers: FreightContainerRow[];
  customerName: string;
  status: string;
  updatedAt: string;
  auditTrail: FreightBookingAuditEntry[];
};

export type FreightBookingGroup = {
  bookingGroupId: string;
  bookingMode: FreightBookingCreationMode;
  mblTransaction: FreightBookingTransaction | null;
  hblTransaction: FreightBookingTransaction | null;
  updatedAt: string;
  customerName: string;
};

function readSnapshot(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return {} as FreightBookingSnapshot;
  }

  return snapshot as FreightBookingSnapshot;
}

function getFreightSnapshot(transaction: {
  sourceQuotationSnapshot: unknown;
}) {
  return readSnapshot(transaction.sourceQuotationSnapshot).freightForwarding;
}

function toIso(value: Date) {
  return value.toISOString();
}

export async function listFreightBookingTransactions(orgId: string) {
  const rows = await db.crmInvoice.findMany({
    where: {
      orgId,
      type: "FREIGHT_BOOKING",
    },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      updatedAt: true,
      account: { select: { name: true } },
      sourceQuotationSnapshot: true,
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return rows
    .map((row) => {
      const snapshot = getFreightSnapshot(row);
      if (!snapshot) return null;

      return {
        id: row.id,
        transactionNumber: row.invoiceNumber,
        transactionType: snapshot.transactionType,
        bookingGroupId: snapshot.bookingGroupId,
        bookingMode: snapshot.bookingMode,
        linkedTransactionIds: snapshot.linkedTransactionIds || [],
        formData: snapshot.formData,
        equipmentTypes: snapshot.equipmentTypes || ["FCL"],
        containers:
          snapshot.containers && snapshot.containers.length > 0
            ? snapshot.containers
            : createInitialFreightBookingPayload(snapshot.transactionType).containers,
        customerName: row.account?.name || "Unassigned customer",
        status: row.status,
        updatedAt: toIso(row.updatedAt),
        auditTrail: snapshot.auditTrail || [],
      } satisfies FreightBookingTransaction;
    })
    .filter(
      (row): row is FreightBookingTransaction => row !== null,
    );
}

export function groupFreightBookingTransactions(
  transactions: FreightBookingTransaction[],
) {
  const grouped = new Map<string, FreightBookingGroup>();

  for (const transaction of transactions) {
    if (!transaction.bookingGroupId || !transaction.bookingMode) continue;

    const current =
      grouped.get(transaction.bookingGroupId) ||
      ({
        bookingGroupId: transaction.bookingGroupId,
        bookingMode: transaction.bookingMode,
        mblTransaction: null,
        hblTransaction: null,
        updatedAt: transaction.updatedAt,
        customerName: transaction.customerName,
      } satisfies FreightBookingGroup);

    if (transaction.transactionType === "MBL") {
      current.mblTransaction = transaction;
    } else {
      current.hblTransaction = transaction;
    }

    if (transaction.updatedAt > current.updatedAt) {
      current.updatedAt = transaction.updatedAt;
      current.customerName = transaction.customerName;
    }

    grouped.set(transaction.bookingGroupId, current);
  }

  return Array.from(grouped.values()).sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export async function appendFreightBookingAuditLog(params: {
  actorId: string;
  invoiceId: string;
  note: string;
  orgId: string;
}) {
  await db.crmApprovalLog.create({
    data: {
      orgId: params.orgId,
      invoiceId: params.invoiceId,
      actorId: params.actorId,
      fromStatus: "FREIGHT_BOOKING",
      toStatus: "FREIGHT_BOOKING",
      note: params.note,
    },
  });
}

export async function buildFreightBookingReferenceData(orgId: string) {
  const [users, accounts, branches, leads] = await Promise.all([
    db.user.findMany({
      where: {
        orgId,
        active: true,
        department: {
          is: {
            OR: [
              {
                name: {
                  equals: "Freight Forwarding",
                  mode: "insensitive",
                },
              },
              {
                code: {
                  equals: "FREIGHT_FORWARDING",
                  mode: "insensitive",
                },
              },
              {
                code: {
                  equals: "FREIGHT FORWARDING",
                  mode: "insensitive",
                },
              },
            ],
          },
        },
      },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: "asc" }],
    }),
    db.crmAccount.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: [{ name: "asc" }],
      take: 100,
    }),
    db.branch.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: [{ name: "asc" }],
    }),
    db.crmLead.findMany({
      where: { orgId },
      select: {
        enquiryRef: true,
        company: true,
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 100,
    }),
  ]);

  return {
    bookingParties: accounts.map((account) => ({
      value: account.id,
      label: account.name,
    })),
    users: users.map((user) => ({
      value: user.id,
      label: user.name || user.email,
    })),
    branches: branches.map((branch) => ({
      value: branch.name,
      label: branch.name,
    })),
    jobNumbers: leads
      .filter((lead) => lead.enquiryRef)
      .map((lead) => ({
        value: lead.enquiryRef as string,
        label: `${lead.enquiryRef} · ${lead.company || "Unassigned customer"}`,
      })),
    ports: [],
    countries: [],
  } satisfies FreightBookingReferenceData;
}
