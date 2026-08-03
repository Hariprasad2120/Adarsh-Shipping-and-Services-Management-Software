import { db } from "@/lib/db";

export type IncentiveListItem = Awaited<ReturnType<typeof listIncentiveEntries>>[number];

export async function listIncentiveEntries(orgId: string) {
  return db.incentiveEntry.findMany({
    where: { orgId },
    orderBy: [{ eligibleDate: "desc" }, { createdAt: "desc" }],
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          employeeNumber: true,
          department: { select: { name: true } },
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      processedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function createIncentiveEntry(
  orgId: string,
  createdById: string,
  data: {
    employeeId: string;
    incentiveType: string;
    referenceLabel: string;
    customerName?: string;
    amount: number;
    currency: string;
    eligibleDate: Date;
    notes?: string;
  },
) {
  return db.incentiveEntry.create({
    data: {
      orgId,
      createdById,
      employeeId: data.employeeId,
      incentiveType: data.incentiveType,
      referenceLabel: data.referenceLabel,
      customerName: data.customerName || null,
      amount: data.amount,
      currency: data.currency,
      eligibleDate: data.eligibleDate,
      notes: data.notes || null,
    },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          employeeNumber: true,
          department: { select: { name: true } },
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      processedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function updateIncentiveEntry(
  orgId: string,
  incentiveId: string,
  processedById: string,
  data: {
    status: "REVIEWED" | "APPROVED" | "REJECTED" | "PAID";
    hrNotes?: string;
  },
) {
  return db.incentiveEntry.update({
    where: {
      id: incentiveId,
      orgId,
    },
    data: {
      status: data.status,
      hrNotes: data.hrNotes || null,
      processedById,
      processedAt: new Date(),
    },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          employeeNumber: true,
          department: { select: { name: true } },
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      processedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}
