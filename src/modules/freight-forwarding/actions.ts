"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import {
  createInitialFreightBookingPayload,
  type FreightBookingCreationMode,
  type FreightBookingFormData,
  type FreightContainerRow,
  type FreightTransactionType,
} from "@/modules/freight-forwarding/booking-shared";
import {
  appendFreightBookingAuditLog,
  type FreightBookingAuditEntry,
  groupFreightBookingTransactions,
  listFreightBookingTransactions,
} from "@/modules/freight-forwarding/service";

function ensureArray<T>(value: T[] | undefined, fallback: T[]) {
  return Array.isArray(value) && value.length > 0 ? value : fallback;
}

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function requireSessionContext() {
  const session = await getSession();
  if (!session?.user?.id || !session.user.orgId) {
    throw new Error("Authentication required.");
  }

  return {
    actorId: session.user.id,
    actorName: session.user.name || session.user.email || "User",
    orgId: session.user.orgId,
  };
}

function revalidateFreightForwardingRoutes() {
  revalidatePath("/freight-forwarding");
  revalidatePath("/freight-forwarding/create-booking");
  revalidatePath("/freight-forwarding/mbl");
  revalidatePath("/freight-forwarding/hbl");
  revalidatePath("/freight-forwarding/settings");
  revalidatePath("/freight-forwarding/settings/data");
}

function buildAuditEntry(params: {
  action: FreightBookingAuditEntry["action"];
  actorId: string;
  actorName: string;
  note: string;
}) {
  return {
    action: params.action,
    actorId: params.actorId,
    actorName: params.actorName,
    at: new Date().toISOString(),
    note: params.note,
  } satisfies FreightBookingAuditEntry;
}

function buildSnapshot(params: {
  auditTrail: FreightBookingAuditEntry[];
  bookingGroupId: string | null;
  bookingMode: FreightBookingCreationMode | null;
  containers: FreightContainerRow[];
  equipmentTypes: string[];
  formData: FreightBookingFormData;
  linkedTransactionIds: string[];
  transactionType: FreightTransactionType;
}) {
  return {
    freightForwarding: {
      transactionType: params.transactionType,
      bookingGroupId: params.bookingGroupId,
      bookingMode: params.bookingMode,
      linkedTransactionIds: params.linkedTransactionIds,
      formData: params.formData,
      equipmentTypes: params.equipmentTypes,
      containers: params.containers,
      auditTrail: params.auditTrail,
    },
  };
}

async function createFreightTransaction(params: {
  actorId: string;
  actorName: string;
  bookingGroupId: string | null;
  bookingMode: FreightBookingCreationMode | null;
  containers?: FreightContainerRow[];
  equipmentTypes?: string[];
  formData?: FreightBookingFormData;
  linkedTransactionIds: string[];
  orgId: string;
  transactionType: FreightTransactionType;
}) {
  const now = new Date();
  const payload = createInitialFreightBookingPayload(params.transactionType);
  const formData = params.formData || payload.formData;
  const equipmentTypes = ensureArray(params.equipmentTypes, payload.equipmentTypes);
  const containers = ensureArray(params.containers, payload.containers);
  const transactionNumber = `${params.transactionType}-${now
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "")}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const auditEntry = buildAuditEntry({
    action: "CREATED",
    actorId: params.actorId,
    actorName: params.actorName,
    note:
      params.bookingGroupId
        ? `${params.transactionType} transaction created from Workspace Home booking workflow`
        : `${params.transactionType} transaction created from the dedicated sidebar tab`,
  });

  const record = await db.crmInvoice.create({
    data: {
      orgId: params.orgId,
      ownerId: params.actorId,
      createdById: params.actorId,
      updatedById: params.actorId,
      invoiceNumber: transactionNumber,
      type: "FREIGHT_BOOKING",
      date: now,
      status: "DRAFT",
      approvalStatus: "DRAFT",
      sourceQuotationSnapshot: buildSnapshot({
        auditTrail: [auditEntry],
        bookingGroupId: params.bookingGroupId,
        bookingMode: params.bookingMode,
        containers,
        equipmentTypes,
        formData,
        linkedTransactionIds: params.linkedTransactionIds,
        transactionType: params.transactionType,
      }),
    },
    select: { id: true, invoiceNumber: true },
  });

  await appendFreightBookingAuditLog({
    actorId: params.actorId,
    invoiceId: record.id,
    note: auditEntry.note,
    orgId: params.orgId,
  });

  return record;
}

type FreightCreateTransactionInput = {
  containers: FreightContainerRow[];
  equipmentTypes: string[];
  formData: FreightBookingFormData;
};

export async function createFreightBookingWithDetailsAction(input: {
  hbl?: FreightCreateTransactionInput;
  mbl?: FreightCreateTransactionInput;
  mode: FreightBookingCreationMode;
}): Promise<
  ActionResult<{
    bookingGroupId: string | null;
    hblTransactionId: string | null;
    mblTransactionId: string | null;
    mode: FreightBookingCreationMode;
  }>
> {
  try {
    const { actorId, actorName, orgId } = await requireSessionContext();
    const bookingGroupId = randomUUID();

    let mblTransactionId: string | null = null;
    let hblTransactionId: string | null = null;

    if (input.mode === "MBL_ONLY" || input.mode === "BOTH") {
      if (!input.mbl) {
        return { ok: false, error: "MBL transaction details are required." };
      }

      const mbl = await createFreightTransaction({
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
      mblTransactionId = mbl.id;
    }

    if (input.mode === "HBL_ONLY" || input.mode === "BOTH") {
      if (!input.hbl) {
        return { ok: false, error: "HBL transaction details are required." };
      }

      const hbl = await createFreightTransaction({
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
      hblTransactionId = hbl.id;
    }

    const linkedIds = [mblTransactionId, hblTransactionId].filter(
      (value): value is string => Boolean(value),
    );

    if (linkedIds.length > 1) {
      for (const id of linkedIds) {
        const existing = await db.crmInvoice.findUnique({
          where: { id },
          select: { sourceQuotationSnapshot: true },
        });
        if (!existing) continue;
        const snapshot =
          existing.sourceQuotationSnapshot &&
          typeof existing.sourceQuotationSnapshot === "object" &&
          !Array.isArray(existing.sourceQuotationSnapshot)
            ? (existing.sourceQuotationSnapshot as Record<string, unknown>)
            : {};
        const freightForwarding =
          snapshot.freightForwarding &&
          typeof snapshot.freightForwarding === "object" &&
          !Array.isArray(snapshot.freightForwarding)
            ? (snapshot.freightForwarding as Record<string, unknown>)
            : {};
        await db.crmInvoice.update({
          where: { id },
          data: {
            sourceQuotationSnapshot: {
              ...snapshot,
              freightForwarding: {
                ...freightForwarding,
                linkedTransactionIds: linkedIds.filter((linkedId) => linkedId !== id),
              },
            },
            updatedById: actorId,
          },
        });
      }
    }

    revalidatePath("/freight-forwarding");
    revalidatePath("/freight-forwarding/create-booking");
    revalidatePath("/freight-forwarding/mbl");
    revalidatePath("/freight-forwarding/hbl");

    return {
      ok: true,
      data: {
        bookingGroupId,
        hblTransactionId,
        mblTransactionId,
        mode: input.mode,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create booking transactions.",
    };
  }
}

export async function createFreightBookingTransactionsAction(
  mode: FreightBookingCreationMode,
): Promise<
  ActionResult<{
    bookingGroupId: string | null;
    hblTransactionId: string | null;
    mblTransactionId: string | null;
    mode: FreightBookingCreationMode;
  }>
> {
  try {
    const { actorId, actorName, orgId } = await requireSessionContext();
    const bookingGroupId = mode === "BOTH" || mode.endsWith("_ONLY") ? randomUUID() : null;

    let mblTransactionId: string | null = null;
    let hblTransactionId: string | null = null;

    if (mode === "MBL_ONLY" || mode === "BOTH") {
      const mbl = await createFreightTransaction({
        actorId,
        actorName,
        bookingGroupId,
        bookingMode: mode,
        linkedTransactionIds: [],
        orgId,
        transactionType: "MBL",
      });
      mblTransactionId = mbl.id;
    }

    if (mode === "HBL_ONLY" || mode === "BOTH") {
      const hbl = await createFreightTransaction({
        actorId,
        actorName,
        bookingGroupId,
        bookingMode: mode,
        linkedTransactionIds: [],
        orgId,
        transactionType: "HBL",
      });
      hblTransactionId = hbl.id;
    }

    const linkedIds = [mblTransactionId, hblTransactionId].filter(
      (value): value is string => Boolean(value),
    );

    if (linkedIds.length > 1) {
      for (const id of linkedIds) {
        const existing = await db.crmInvoice.findUnique({
          where: { id },
          select: { sourceQuotationSnapshot: true },
        });
        if (!existing) continue;
        const snapshot =
          existing.sourceQuotationSnapshot &&
          typeof existing.sourceQuotationSnapshot === "object" &&
          !Array.isArray(existing.sourceQuotationSnapshot)
            ? (existing.sourceQuotationSnapshot as Record<string, unknown>)
            : {};
        const freightForwarding =
          snapshot.freightForwarding &&
          typeof snapshot.freightForwarding === "object" &&
          !Array.isArray(snapshot.freightForwarding)
            ? (snapshot.freightForwarding as Record<string, unknown>)
            : {};
        await db.crmInvoice.update({
          where: { id },
          data: {
            sourceQuotationSnapshot: {
              ...snapshot,
              freightForwarding: {
                ...freightForwarding,
                linkedTransactionIds: linkedIds.filter((linkedId) => linkedId !== id),
              },
            },
            updatedById: actorId,
          },
        });
      }
    }

    revalidateFreightForwardingRoutes();

    return {
      ok: true,
      data: {
        bookingGroupId,
        hblTransactionId,
        mblTransactionId,
        mode,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to create booking transactions.",
    };
  }
}

export async function saveFreightBookingTransactionAction(input: {
  accountId?: string | null;
  containers: FreightContainerRow[];
  equipmentTypes: string[];
  formData: FreightBookingFormData;
  transactionId: string;
}): Promise<ActionResult<{ updatedAt: string }>> {
  try {
    const { actorId, actorName, orgId } = await requireSessionContext();

    const existing = await db.crmInvoice.findFirst({
      where: { id: input.transactionId, orgId, type: "FREIGHT_BOOKING" },
      select: {
        id: true,
        sourceQuotationSnapshot: true,
      },
    });

    if (!existing) {
      return { ok: false, error: "Transaction not found." };
    }

    const snapshot =
      existing.sourceQuotationSnapshot &&
      typeof existing.sourceQuotationSnapshot === "object" &&
      !Array.isArray(existing.sourceQuotationSnapshot)
        ? (existing.sourceQuotationSnapshot as Record<string, unknown>)
        : {};
    const freightForwarding =
      snapshot.freightForwarding &&
      typeof snapshot.freightForwarding === "object" &&
      !Array.isArray(snapshot.freightForwarding)
        ? (snapshot.freightForwarding as Record<string, unknown>)
        : {};

    const auditTrail = ensureArray(
      freightForwarding.auditTrail as FreightBookingAuditEntry[] | undefined,
      [],
    );

    auditTrail.push(
      buildAuditEntry({
        action: "UPDATED",
        actorId,
        actorName,
        note: "Transaction details updated.",
      }),
    );

    const updatedAt = new Date().toISOString();

    await db.crmInvoice.update({
      where: { id: input.transactionId },
      data: {
        accountId: input.accountId || null,
        location: input.formData.origin || null,
        portOfLoading: input.formData.portOfLoad || null,
        portOfDischarge: input.formData.portOfDischarge || null,
        portOfDestinationCountry: input.formData.finalDestination || null,
        incoterm: input.formData.term || null,
        ownerId: input.formData.salespersonId || actorId,
        updatedById: actorId,
        sourceQuotationSnapshot: {
          ...snapshot,
          freightForwarding: {
            ...freightForwarding,
            formData: input.formData,
            equipmentTypes: input.equipmentTypes,
            containers: input.containers,
            auditTrail,
          },
        },
      },
    });

    await appendFreightBookingAuditLog({
      actorId,
      invoiceId: input.transactionId,
      note: "Freight booking transaction updated",
      orgId,
    });

    revalidateFreightForwardingRoutes();

    return { ok: true, data: { updatedAt } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to save transaction.",
    };
  }
}

export async function connectFreightBookingTransactionAction(input: {
  bookingGroupId: string;
  transactionId: string;
}): Promise<ActionResult<{ bookingGroupId: string }>> {
  try {
    const { actorId, actorName, orgId } = await requireSessionContext();

    const [transaction, related] = await Promise.all([
      db.crmInvoice.findFirst({
        where: { id: input.transactionId, orgId, type: "FREIGHT_BOOKING" },
        select: { id: true, sourceQuotationSnapshot: true },
      }),
      db.crmInvoice.findMany({
        where: { orgId, type: "FREIGHT_BOOKING" },
        select: { id: true, sourceQuotationSnapshot: true },
      }),
    ]);

    if (!transaction) return { ok: false, error: "Transaction not found." };

    const linkedIds = related
      .filter((row) => {
        const snapshot =
          row.sourceQuotationSnapshot &&
          typeof row.sourceQuotationSnapshot === "object" &&
          !Array.isArray(row.sourceQuotationSnapshot)
            ? (row.sourceQuotationSnapshot as Record<string, unknown>)
            : {};
        const freightForwarding =
          snapshot.freightForwarding &&
          typeof snapshot.freightForwarding === "object" &&
          !Array.isArray(snapshot.freightForwarding)
            ? (snapshot.freightForwarding as Record<string, unknown>)
            : null;
        return freightForwarding?.bookingGroupId === input.bookingGroupId;
      })
      .map((row) => row.id);

    const snapshot =
      transaction.sourceQuotationSnapshot &&
      typeof transaction.sourceQuotationSnapshot === "object" &&
      !Array.isArray(transaction.sourceQuotationSnapshot)
        ? (transaction.sourceQuotationSnapshot as Record<string, unknown>)
        : {};
    const freightForwarding =
      snapshot.freightForwarding &&
      typeof snapshot.freightForwarding === "object" &&
      !Array.isArray(snapshot.freightForwarding)
        ? (snapshot.freightForwarding as Record<string, unknown>)
        : {};

    const auditTrail = ensureArray(
      freightForwarding.auditTrail as FreightBookingAuditEntry[] | undefined,
      [],
    );
    auditTrail.push(
      buildAuditEntry({
        action: "CONNECTED",
        actorId,
        actorName,
        note: `Connected to booking ${input.bookingGroupId}.`,
      }),
    );

    await db.crmInvoice.update({
      where: { id: input.transactionId },
      data: {
        updatedById: actorId,
        sourceQuotationSnapshot: {
          ...snapshot,
          freightForwarding: {
            ...freightForwarding,
            bookingGroupId: input.bookingGroupId,
            linkedTransactionIds: linkedIds,
            auditTrail,
          },
        },
      },
    });

    await appendFreightBookingAuditLog({
      actorId,
      invoiceId: input.transactionId,
      note: `Connected transaction to booking group ${input.bookingGroupId}`,
      orgId,
    });

    revalidateFreightForwardingRoutes();

    return { ok: true, data: { bookingGroupId: input.bookingGroupId } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to connect transaction.",
    };
  }
}

export async function disconnectFreightBookingTransactionAction(
  transactionId: string,
): Promise<ActionResult<null>> {
  try {
    const { actorId, actorName, orgId } = await requireSessionContext();
    const transaction = await db.crmInvoice.findFirst({
      where: { id: transactionId, orgId, type: "FREIGHT_BOOKING" },
      select: { id: true, sourceQuotationSnapshot: true },
    });

    if (!transaction) return { ok: false, error: "Transaction not found." };

    const snapshot =
      transaction.sourceQuotationSnapshot &&
      typeof transaction.sourceQuotationSnapshot === "object" &&
      !Array.isArray(transaction.sourceQuotationSnapshot)
        ? (transaction.sourceQuotationSnapshot as Record<string, unknown>)
        : {};
    const freightForwarding =
      snapshot.freightForwarding &&
      typeof snapshot.freightForwarding === "object" &&
      !Array.isArray(snapshot.freightForwarding)
        ? (snapshot.freightForwarding as Record<string, unknown>)
        : {};
    const auditTrail = ensureArray(
      freightForwarding.auditTrail as FreightBookingAuditEntry[] | undefined,
      [],
    );
    auditTrail.push(
      buildAuditEntry({
        action: "DISCONNECTED",
        actorId,
        actorName,
        note: "Disconnected from booking.",
      }),
    );

    await db.crmInvoice.update({
      where: { id: transactionId },
      data: {
        updatedById: actorId,
        sourceQuotationSnapshot: {
          ...snapshot,
          freightForwarding: {
            ...freightForwarding,
            bookingGroupId: null,
            bookingMode: null,
            linkedTransactionIds: [],
            auditTrail,
          },
        },
      },
    });

    await appendFreightBookingAuditLog({
      actorId,
      invoiceId: transactionId,
      note: "Disconnected transaction from booking group",
      orgId,
    });

    revalidateFreightForwardingRoutes();

    return { ok: true, data: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to disconnect transaction.",
    };
  }
}

export async function deleteAllFreightForwardingDataAction(
  confirmationPhrase: string,
): Promise<
  ActionResult<{
    deletedAuditLogs: number;
    deletedBookingGroups: number;
    deletedTransactions: number;
  }>
> {
  try {
    const { actorId, orgId } = await requireSessionContext();

    if (!(await can(actorId, "admin.org.manage"))) {
      return {
        ok: false,
        error:
          "Only organisation administrators can delete Freight Forwarding data.",
      };
    }

    if (confirmationPhrase.trim() !== "DELETE ALL FREIGHT DATA") {
      return {
        ok: false,
        error:
          "Confirmation phrase mismatch. Type DELETE ALL FREIGHT DATA to continue.",
      };
    }

    const transactions = await listFreightBookingTransactions(orgId);
    const deletedBookingGroups =
      groupFreightBookingTransactions(transactions).length;
    const transactionIds = transactions.map((transaction) => transaction.id);

    if (transactionIds.length === 0) {
      return {
        ok: true,
        data: {
          deletedAuditLogs: 0,
          deletedBookingGroups,
          deletedTransactions: 0,
        },
      };
    }

    const result = await db.$transaction(async (tx) => {
      const deletedAuditLogs = await tx.crmApprovalLog.deleteMany({
        where: {
          orgId,
          invoiceId: { in: transactionIds },
        },
      });
      const deletedTransactions = await tx.crmInvoice.deleteMany({
        where: {
          orgId,
          id: { in: transactionIds },
          type: "FREIGHT_BOOKING",
        },
      });

      return {
        deletedAuditLogs: deletedAuditLogs.count,
        deletedTransactions: deletedTransactions.count,
      };
    });

    revalidateFreightForwardingRoutes();

    return {
      ok: true,
      data: {
        deletedAuditLogs: result.deletedAuditLogs,
        deletedBookingGroups,
        deletedTransactions: result.deletedTransactions,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to delete Freight Forwarding data.",
    };
  }
}
