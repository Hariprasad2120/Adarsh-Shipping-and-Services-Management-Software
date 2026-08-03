import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { createSalesInvoice } from "@/modules/accounting/service";

type RecurringProfileStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PAUSED"
  | "CANCELLED"
  | "COMPLETED"
  | "EXPIRED";

type RecurringFrequency =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "YEARLY";

type RecurringRunStatus = "GENERATED" | "SKIPPED" | "FAILED";

type RecurringProfileLineInput = {
  itemName: string;
  description?: string | null;
  qty: string;
  rate: string;
  taxRate: string;
  unit?: string | null;
};

export type CreateRecurringSalesInvoiceProfileInput = {
  orgId: string;
  actorId: string;
  profileName: string;
  branchId?: string | null;
  customerId: string;
  frequency: RecurringFrequency;
  timezone?: string | null;
  startDate: string | Date;
  endDate?: string | Date | null;
  nextInvoiceDate?: string | Date | null;
  currencyCode?: string | null;
  autoSend?: boolean;
  approvalRequired?: boolean;
  autoChargeTokenRef?: string | null;
  paymentTermName?: string | null;
  subject?: string | null;
  remarks?: string | null;
  lines: RecurringProfileLineInput[];
};

function optionalText(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function parseDate(value: string | Date | null | undefined, field: string) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field.toUpperCase()}_INVALID`);
  }
  return date;
}

function normalizeDecimal(value: string, field: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`${field.toUpperCase()}_REQUIRED`);
  try {
    return new Prisma.Decimal(normalized);
  } catch {
    throw new Error(`${field.toUpperCase()}_INVALID`);
  }
}

function normalizeLineInput(lines: RecurringProfileLineInput[]) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new Error("RECURRING_PROFILE_LINES_REQUIRED");
  }
  return lines.map((line, index) => {
    const itemName = String(line.itemName ?? "").trim();
    if (!itemName) {
      throw new Error(`RECURRING_PROFILE_LINE_${index + 1}_ITEM_REQUIRED`);
    }
    const qty = normalizeDecimal(line.qty, `recurring_profile_line_${index + 1}_qty`);
    const rate = normalizeDecimal(line.rate, `recurring_profile_line_${index + 1}_rate`);
    const taxRate = normalizeDecimal(
      line.taxRate,
      `recurring_profile_line_${index + 1}_tax_rate`,
    );
    if (qty.lte(0) || rate.lt(0) || taxRate.lt(0)) {
      throw new Error("RECURRING_PROFILE_LINE_VALUES_INVALID");
    }
    return {
      itemName,
      description: optionalText(line.description),
      qty,
      rate,
      taxRate,
      unit: optionalText(line.unit),
    };
  });
}

function addFrequency(date: Date, frequency: RecurringFrequency) {
  const next = new Date(date);
  switch (frequency) {
    case "DAILY":
      next.setDate(next.getDate() + 1);
      break;
    case "WEEKLY":
      next.setDate(next.getDate() + 7);
      break;
    case "MONTHLY":
      next.setMonth(next.getMonth() + 1);
      break;
    case "QUARTERLY":
      next.setMonth(next.getMonth() + 3);
      break;
    case "YEARLY":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

async function refreshRecurringProfileStatuses(orgId: string) {
  const profiles = await db.recurringSalesInvoiceProfile.findMany({
    where: {
      orgId,
      status: { in: ["ACTIVE", "PAUSED", "DRAFT"] },
      endDate: { not: null },
    },
    select: {
      id: true,
      endDate: true,
      nextInvoiceDate: true,
      status: true,
    },
  });

  for (const profile of profiles) {
    if (!profile.endDate) continue;
    if (profile.nextInvoiceDate.getTime() > profile.endDate.getTime()) {
      await db.recurringSalesInvoiceProfile.update({
        where: { id: profile.id },
        data: { status: "COMPLETED" },
      });
    }
  }
}

export async function listRecurringSalesInvoiceProfiles(orgId: string) {
  await refreshRecurringProfileStatuses(orgId);
  const profiles = await db.recurringSalesInvoiceProfile.findMany({
    where: { orgId },
    include: {
      customer: {
        select: { id: true, name: true, email: true },
      },
      branch: {
        select: { id: true, name: true },
      },
      lines: {
        orderBy: { sortOrder: "asc" },
      },
      runs: {
        orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
        take: 5,
      },
    },
    orderBy: [{ nextInvoiceDate: "asc" }, { createdAt: "desc" }],
  });

  const today = new Date();
  const summary = {
    total: profiles.length,
    active: profiles.filter((profile) => profile.status === "ACTIVE").length,
    paused: profiles.filter((profile) => profile.status === "PAUSED").length,
    dueNow: profiles.filter(
      (profile) =>
        profile.status === "ACTIVE" &&
        profile.nextInvoiceDate.getTime() <= today.getTime(),
    ).length,
  };

  return { profiles, summary };
}

export async function createRecurringSalesInvoiceProfile(
  input: CreateRecurringSalesInvoiceProfileInput,
) {
  const startDate = parseDate(input.startDate, "start_date");
  if (!startDate) throw new Error("START_DATE_REQUIRED");
  const endDate = parseDate(input.endDate, "end_date");
  const nextInvoiceDate =
    parseDate(input.nextInvoiceDate, "next_invoice_date") ?? startDate;
  if (endDate && nextInvoiceDate.getTime() > endDate.getTime()) {
    throw new Error("RECURRING_PROFILE_NEXT_DATE_AFTER_END_DATE");
  }

  const lines = normalizeLineInput(input.lines);
  const customer = await db.crmAccount.findFirst({
    where: { orgId: input.orgId, id: input.customerId },
    select: { id: true },
  });
  if (!customer) throw new Error("RECURRING_PROFILE_CUSTOMER_NOT_FOUND");

  if (input.branchId) {
    const branch = await db.branch.findFirst({
      where: { orgId: input.orgId, id: input.branchId },
      select: { id: true },
    });
    if (!branch) throw new Error("RECURRING_PROFILE_BRANCH_NOT_FOUND");
  }

  return db.recurringSalesInvoiceProfile.create({
    data: {
      orgId: input.orgId,
      branchId: input.branchId || null,
      customerId: input.customerId,
      profileName: input.profileName.trim(),
      status: "ACTIVE",
      frequency: input.frequency,
      timezone: optionalText(input.timezone) || "Asia/Kolkata",
      startDate,
      endDate,
      nextInvoiceDate,
      currencyCode: optionalText(input.currencyCode) || "INR",
      autoSend: Boolean(input.autoSend),
      approvalRequired: input.approvalRequired ?? true,
      autoChargeTokenRef: optionalText(input.autoChargeTokenRef),
      paymentTermName: optionalText(input.paymentTermName),
      subject: optionalText(input.subject),
      remarks: optionalText(input.remarks),
      createdById: input.actorId,
      updatedById: input.actorId,
      lines: {
        create: lines.map((line, index) => ({
          sortOrder: index,
          itemName: line.itemName,
          description: line.description,
          qty: line.qty,
          rate: line.rate,
          taxRate: line.taxRate,
          unit: line.unit,
          currencyCode: optionalText(input.currencyCode) || "INR",
          exchangeRate: new Prisma.Decimal(1),
        })),
      },
    },
    include: {
      lines: true,
      customer: { select: { id: true, name: true, email: true } },
      branch: { select: { id: true, name: true } },
    },
  });
}

async function queueRecurringInvoiceEmail(input: {
  orgId: string;
  customerId: string;
  salesInvoiceId: string;
  invoiceNumber: string;
}) {
  const customer = await db.crmAccount.findFirst({
    where: { orgId: input.orgId, id: input.customerId },
    select: { name: true, email: true },
  });
  const email = optionalText(customer?.email);
  if (!email) return false;
  await db.emailQueue.create({
    data: {
      to: email,
      subject: `Recurring invoice ${input.invoiceNumber}`,
      html: `<p>Hello ${customer?.name || "Customer"},</p><p>Your recurring invoice <strong>${input.invoiceNumber}</strong> has been generated.</p>`,
      text: `Recurring invoice ${input.invoiceNumber} has been generated.`,
      metadata: {
        kind: "RECURRING_SALES_INVOICE",
        salesInvoiceId: input.salesInvoiceId,
        customerId: input.customerId,
      } as Prisma.InputJsonValue,
    },
  });
  return true;
}

export async function generateRecurringSalesInvoiceOccurrence(input: {
  orgId: string;
  actorId: string;
  profileId: string;
}) {
  const profile = await db.recurringSalesInvoiceProfile.findFirst({
    where: { orgId: input.orgId, id: input.profileId },
    include: {
      lines: { orderBy: { sortOrder: "asc" } },
      customer: { select: { id: true, name: true, email: true } },
    },
  });
  if (!profile) throw new Error("RECURRING_PROFILE_NOT_FOUND");
  if (profile.status !== "ACTIVE") {
    throw new Error("RECURRING_PROFILE_NOT_ACTIVE");
  }
  if (!profile.lines.length) {
    throw new Error("RECURRING_PROFILE_LINES_REQUIRED");
  }
  if (profile.endDate && profile.nextInvoiceDate.getTime() > profile.endDate.getTime()) {
    await db.recurringSalesInvoiceProfile.update({
      where: { id: profile.id },
      data: { status: "COMPLETED" },
    });
    throw new Error("RECURRING_PROFILE_COMPLETED");
  }

  const dueDate = new Date(profile.nextInvoiceDate);
  const today = new Date();
  if (dueDate.getTime() > today.getTime()) {
    throw new Error("RECURRING_PROFILE_NOT_DUE");
  }

  const idempotencyKey = `RSI:${profile.id}:${dueDate.toISOString().slice(0, 10)}`;
  const existingRun = await db.recurringSalesInvoiceRun.findFirst({
    where: {
      orgId: input.orgId,
      profileId: profile.id,
      dueDate,
    },
  });
  if (existingRun?.runStatus === "GENERATED" || existingRun?.runStatus === "SKIPPED") {
    return existingRun;
  }

  const taxRates = Array.from(
    new Set(profile.lines.map((line) => line.taxRate.toString())),
  );
  if (taxRates.length !== 1) {
    throw new Error("RECURRING_PROFILE_MIXED_TAX_RATES_NOT_SUPPORTED");
  }

  try {
    const invoice = await createSalesInvoice(input.orgId, input.actorId, {
      customerId: profile.customerId,
      branchId: profile.branchId,
      postingDate: dueDate,
      dueDate,
      discountAmount: 0,
      taxRate: Number(taxRates[0]),
      remarks:
        optionalText(profile.remarks) ||
        `Generated from recurring profile ${profile.profileName}`,
      manualNotes: optionalText(profile.subject),
      terms: optionalText(profile.paymentTermName),
      items: profile.lines.map((line) => ({
        itemName: line.itemName,
        qty: line.qty.toString(),
        rate: line.rate.toString(),
        currency: line.currencyCode,
        exchangeRate: line.exchangeRate.toString(),
      })),
    });

    const nextInvoiceDate = addFrequency(dueDate, profile.frequency as RecurringFrequency);
    const nextStatus: RecurringProfileStatus =
      profile.endDate && nextInvoiceDate.getTime() > profile.endDate.getTime()
        ? "COMPLETED"
        : "ACTIVE";

    const resultJson: Prisma.InputJsonValue = {
      generatedSalesInvoiceId: invoice.id,
      generatedInvoiceNumber: invoice.invoiceNumber,
      autoSendRequested: profile.autoSend,
      approvalRequired: profile.approvalRequired,
    };

    await db.$transaction(async (tx) => {
      await tx.recurringSalesInvoiceRun.upsert({
        where: {
          orgId_profileId_dueDate: {
            orgId: input.orgId,
            profileId: profile.id,
            dueDate,
          },
        },
        update: {
          runStatus: "GENERATED",
          generatedSalesInvoiceId: invoice.id,
          idempotencyKey,
          resultJson,
          failureReason: null,
        },
        create: {
          orgId: input.orgId,
          profileId: profile.id,
          dueDate,
          runStatus: "GENERATED",
          generatedSalesInvoiceId: invoice.id,
          idempotencyKey,
          resultJson,
        },
      });
      await tx.recurringSalesInvoiceProfile.update({
        where: { id: profile.id },
        data: {
          lastInvoiceDate: dueDate,
          nextInvoiceDate,
          status: nextStatus,
          failureCount: 0,
          lastFailureAt: null,
          lastFailureReason: null,
          updatedById: input.actorId,
        },
      });
    });

    if (profile.autoSend) {
      await queueRecurringInvoiceEmail({
        orgId: input.orgId,
        customerId: profile.customerId,
        salesInvoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      });
    }

    return invoice;
  } catch (error) {
    const failureReason =
      error instanceof Error ? error.message : "Recurring invoice generation failed";
    await db.$transaction(async (tx) => {
      await tx.recurringSalesInvoiceRun.upsert({
        where: {
          orgId_profileId_dueDate: {
            orgId: input.orgId,
            profileId: profile.id,
            dueDate,
          },
        },
        update: {
          runStatus: "FAILED",
          idempotencyKey,
          failureReason,
          resultJson: {
            failedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
        create: {
          orgId: input.orgId,
          profileId: profile.id,
          dueDate,
          runStatus: "FAILED",
          idempotencyKey,
          failureReason,
          resultJson: {
            failedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue,
        },
      });
      await tx.recurringSalesInvoiceProfile.update({
        where: { id: profile.id },
        data: {
          failureCount: { increment: 1 },
          lastFailureAt: new Date(),
          lastFailureReason: failureReason,
          updatedById: input.actorId,
        },
      });
    });
    throw error;
  }
}

export async function generateDueRecurringSalesInvoices(input: {
  orgId: string;
  actorId: string;
}) {
  const dueProfiles = await db.recurringSalesInvoiceProfile.findMany({
    where: {
      orgId: input.orgId,
      status: "ACTIVE",
      nextInvoiceDate: { lte: new Date() },
    },
    select: { id: true },
    orderBy: { nextInvoiceDate: "asc" },
  });

  const results: Array<{ profileId: string; status: RecurringRunStatus; reason?: string }> =
    [];
  for (const profile of dueProfiles) {
    try {
      await generateRecurringSalesInvoiceOccurrence({
        orgId: input.orgId,
        actorId: input.actorId,
        profileId: profile.id,
      });
      results.push({ profileId: profile.id, status: "GENERATED" });
    } catch (error) {
      results.push({
        profileId: profile.id,
        status: "FAILED",
        reason: error instanceof Error ? error.message : "Generation failed",
      });
    }
  }
  return results;
}

export async function pauseRecurringSalesInvoiceProfile(input: {
  orgId: string;
  actorId: string;
  profileId: string;
}) {
  return db.recurringSalesInvoiceProfile.updateMany({
    where: { orgId: input.orgId, id: input.profileId, status: "ACTIVE" },
    data: { status: "PAUSED", updatedById: input.actorId },
  });
}

export async function resumeRecurringSalesInvoiceProfile(input: {
  orgId: string;
  actorId: string;
  profileId: string;
}) {
  const profile = await db.recurringSalesInvoiceProfile.findFirst({
    where: { orgId: input.orgId, id: input.profileId },
    select: { id: true, endDate: true, nextInvoiceDate: true },
  });
  if (!profile) throw new Error("RECURRING_PROFILE_NOT_FOUND");
  const nextStatus: RecurringProfileStatus =
    profile.endDate && profile.nextInvoiceDate.getTime() > profile.endDate.getTime()
      ? "COMPLETED"
      : "ACTIVE";
  return db.recurringSalesInvoiceProfile.update({
    where: { id: profile.id },
    data: { status: nextStatus, updatedById: input.actorId },
  });
}

export async function skipRecurringSalesInvoiceOccurrence(input: {
  orgId: string;
  actorId: string;
  profileId: string;
}) {
  const profile = await db.recurringSalesInvoiceProfile.findFirst({
    where: { orgId: input.orgId, id: input.profileId },
  });
  if (!profile) throw new Error("RECURRING_PROFILE_NOT_FOUND");
  if (!["ACTIVE", "PAUSED"].includes(profile.status)) {
    throw new Error("RECURRING_PROFILE_SKIP_UNAVAILABLE");
  }
  const dueDate = new Date(profile.nextInvoiceDate);
  const nextInvoiceDate = addFrequency(dueDate, profile.frequency as RecurringFrequency);
  const nextStatus: RecurringProfileStatus =
    profile.endDate && nextInvoiceDate.getTime() > profile.endDate.getTime()
      ? "COMPLETED"
      : profile.status === "PAUSED"
        ? "PAUSED"
        : "ACTIVE";

  await db.$transaction(async (tx) => {
    await tx.recurringSalesInvoiceRun.upsert({
      where: {
        orgId_profileId_dueDate: {
          orgId: input.orgId,
          profileId: profile.id,
          dueDate,
        },
      },
      update: {
        runStatus: "SKIPPED",
        idempotencyKey: `RSI:${profile.id}:${dueDate.toISOString().slice(0, 10)}:SKIP`,
        resultJson: {
          skippedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        failureReason: null,
      },
      create: {
        orgId: input.orgId,
        profileId: profile.id,
        dueDate,
        runStatus: "SKIPPED",
        idempotencyKey: `RSI:${profile.id}:${dueDate.toISOString().slice(0, 10)}:SKIP`,
        resultJson: {
          skippedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });
    await tx.recurringSalesInvoiceProfile.update({
      where: { id: profile.id },
      data: {
        nextInvoiceDate,
        status: nextStatus,
        updatedById: input.actorId,
      },
    });
  });
}

export async function cancelRecurringSalesInvoiceProfile(input: {
  orgId: string;
  actorId: string;
  profileId: string;
}) {
  return db.recurringSalesInvoiceProfile.update({
    where: { id: input.profileId },
    data: { status: "CANCELLED", updatedById: input.actorId },
  });
}
