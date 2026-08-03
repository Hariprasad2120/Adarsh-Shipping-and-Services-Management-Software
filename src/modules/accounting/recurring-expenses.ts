import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { createPurchaseInvoice } from "@/modules/accounting/service";

type RecurringFrequency =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "YEARLY";

export type CreateRecurringExpenseProfileInput = {
  orgId: string;
  actorId: string;
  templateName: string;
  vendorId: string;
  expenseAccountId: string;
  amount: string;
  taxRate?: string | number | null;
  frequency: RecurringFrequency;
  branchId?: string | null;
  startDate: string | Date;
  endDate?: string | Date | null;
  nextDueDate?: string | Date | null;
  narration?: string | null;
  paymentMethod?: string | null;
  paymentTermName?: string | null;
};

function optionalText(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function parseDate(value: string | Date | null | undefined, field: string) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${field.toUpperCase()}_INVALID`);
  return date;
}

function normalizeDecimal(value: string | number | null | undefined, field: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`${field.toUpperCase()}_REQUIRED`);
  try {
    return new Prisma.Decimal(normalized);
  } catch {
    throw new Error(`${field.toUpperCase()}_INVALID`);
  }
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

function dueKey(templateId: string, dueDate: Date) {
  return `REXP:${templateId}:${dueDate.toISOString().slice(0, 10)}`;
}

async function validateRecurringExpenseActors(input: {
  orgId: string;
  vendorId: string;
  expenseAccountId: string;
  branchId?: string | null;
}) {
  const [vendor, account, branch] = await Promise.all([
    db.crmVendor.findFirst({
      where: { orgId: input.orgId, id: input.vendorId },
      select: { id: true, name: true },
    }),
    db.account.findFirst({
      where: {
        orgId: input.orgId,
        id: input.expenseAccountId,
        isActive: true,
        isGroup: false,
        rootType: "EXPENSE",
      },
      select: { id: true, accountName: true },
    }),
    input.branchId
      ? db.branch.findFirst({
          where: { orgId: input.orgId, id: input.branchId },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);
  if (!vendor) throw new Error("RECURRING_EXPENSE_VENDOR_NOT_FOUND");
  if (!account) throw new Error("RECURRING_EXPENSE_ACCOUNT_NOT_FOUND");
  if (input.branchId && !branch) throw new Error("RECURRING_EXPENSE_BRANCH_NOT_FOUND");
}

export async function listRecurringExpenseProfiles(orgId: string) {
  const profiles = await db.recurringExpense.findMany({
    where: { orgId },
    include: {
      vendor: { select: { id: true, name: true, email: true } },
      branch: { select: { id: true, name: true } },
      expenseAccount: { select: { id: true, accountName: true, accountCode: true } },
      runs: {
        orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
        take: 5,
      },
    },
    orderBy: [{ nextDueDate: "asc" }, { createdAt: "desc" }],
  });

  const today = new Date();
  return {
    profiles,
    summary: {
      total: profiles.length,
      active: profiles.filter((profile) => profile.isActive).length,
      paused: profiles.filter((profile) => !profile.isActive).length,
      dueNow: profiles.filter(
        (profile) =>
          profile.isActive && profile.nextDueDate.getTime() <= today.getTime(),
      ).length,
    },
  };
}

export async function createRecurringExpenseProfile(
  input: CreateRecurringExpenseProfileInput,
) {
  const startDate = parseDate(input.startDate, "start_date");
  if (!startDate) throw new Error("START_DATE_REQUIRED");
  const endDate = parseDate(input.endDate, "end_date");
  const nextDueDate = parseDate(input.nextDueDate, "next_due_date") ?? startDate;
  if (endDate && nextDueDate.getTime() > endDate.getTime()) {
    throw new Error("RECURRING_EXPENSE_NEXT_DATE_AFTER_END_DATE");
  }
  await validateRecurringExpenseActors(input);
  const amount = normalizeDecimal(input.amount, "amount");
  const taxRate = normalizeDecimal(input.taxRate ?? "0", "tax_rate");
  if (amount.lte(0)) throw new Error("RECURRING_EXPENSE_AMOUNT_INVALID");
  if (taxRate.lt(0)) throw new Error("RECURRING_EXPENSE_TAX_RATE_INVALID");

  return db.recurringExpense.create({
    data: {
      orgId: input.orgId,
      branchId: input.branchId || null,
      templateName: input.templateName.trim(),
      vendorId: input.vendorId,
      expenseAccountId: input.expenseAccountId,
      amount,
      taxRate: Number(taxRate.toString()),
      frequency: input.frequency,
      startDate,
      endDate,
      nextDueDate,
      narration: optionalText(input.narration),
      paymentMethod: optionalText(input.paymentMethod),
      paymentTermName: optionalText(input.paymentTermName),
      autoPost: false,
      isActive: true,
    },
  });
}

export async function generateRecurringExpenseOccurrence(input: {
  orgId: string;
  actorId: string;
  templateId: string;
}) {
  const template = await db.recurringExpense.findFirst({
    where: { orgId: input.orgId, id: input.templateId },
    include: { vendor: { select: { id: true, name: true } } },
  });
  if (!template) throw new Error("RECURRING_EXPENSE_TEMPLATE_NOT_FOUND");
  if (!template.isActive) throw new Error("RECURRING_EXPENSE_TEMPLATE_INACTIVE");

  const idempotencyKey = dueKey(template.id, template.nextDueDate);
  const existingRun = await db.recurringExpenseRun.findFirst({
    where: { orgId: input.orgId, idempotencyKey },
    select: {
      id: true,
      runStatus: true,
      generatedPurchaseInvoiceId: true,
    },
  });
  if (existingRun) {
    if (existingRun.generatedPurchaseInvoiceId) {
      const existingInvoice = await db.purchaseInvoice.findFirst({
        where: { orgId: input.orgId, id: existingRun.generatedPurchaseInvoiceId },
        select: { id: true },
      });
      if (existingInvoice) return existingInvoice;
    }
    throw new Error("RECURRING_EXPENSE_RUN_ALREADY_RECORDED");
  }

  try {
    const invoice = await createPurchaseInvoice(input.orgId, input.actorId, {
      supplierId: template.vendorId,
      branchId: template.branchId,
      postingDate: template.nextDueDate,
      dueDate: template.nextDueDate,
      discountAmount: "0",
      taxRate: template.taxRate,
      remarks:
        template.narration ||
        `Recurring bill template: ${template.templateName}`,
      paymentMethod: template.paymentMethod || null,
      terms: template.paymentTermName || null,
      orderNumber: `RECURRING-BILL:${template.id}`,
      items: [
        {
          itemName: template.templateName,
          qty: 1,
          rate: template.amount.toString(),
          unit: null,
          taxRate: template.taxRate,
          tdsRate: null,
        },
      ],
    });

    const nextDueDate = addFrequency(template.nextDueDate, template.frequency as RecurringFrequency);
    const activeAfterRun = template.endDate
      ? nextDueDate.getTime() <= template.endDate.getTime()
      : true;

    await db.$transaction([
      db.recurringExpenseRun.create({
        data: {
          orgId: input.orgId,
          templateId: template.id,
          dueDate: template.nextDueDate,
          runStatus: "GENERATED",
          generatedPurchaseInvoiceId: invoice.id,
          idempotencyKey,
        },
      }),
      db.recurringExpense.update({
        where: { id: template.id },
        data: {
          nextDueDate,
          isActive: activeAfterRun,
        },
      }),
    ]);

    return invoice;
  } catch (error) {
    await db.recurringExpenseRun.create({
      data: {
        orgId: input.orgId,
        templateId: template.id,
        dueDate: template.nextDueDate,
        runStatus: "FAILED",
        failureReason:
          error instanceof Error ? error.message : "Recurring bill generation failed",
        idempotencyKey,
      },
    });
    throw error;
  }
}

export async function generateDueRecurringExpenses(input: {
  orgId: string;
  actorId: string;
}) {
  const today = new Date();
  const templates = await db.recurringExpense.findMany({
    where: {
      orgId: input.orgId,
      isActive: true,
      nextDueDate: { lte: today },
    },
    orderBy: [{ nextDueDate: "asc" }, { createdAt: "asc" }],
  });

  const results: Array<{
    templateId: string;
    status: "GENERATED" | "FAILED";
    generatedPurchaseInvoiceId?: string;
    error?: string;
  }> = [];

  for (const template of templates) {
    try {
      const invoice = await generateRecurringExpenseOccurrence({
        orgId: input.orgId,
        actorId: input.actorId,
        templateId: template.id,
      });
      results.push({
        templateId: template.id,
        status: "GENERATED",
        generatedPurchaseInvoiceId: invoice.id,
      });
    } catch (error) {
      results.push({
        templateId: template.id,
        status: "FAILED",
        error: error instanceof Error ? error.message : "Recurring bill generation failed",
      });
    }
  }
  return results;
}

export async function pauseRecurringExpenseProfile(input: {
  orgId: string;
  profileId: string;
}) {
  return db.recurringExpense.updateMany({
    where: { orgId: input.orgId, id: input.profileId, isActive: true },
    data: { isActive: false },
  });
}

export async function resumeRecurringExpenseProfile(input: {
  orgId: string;
  profileId: string;
}) {
  return db.recurringExpense.updateMany({
    where: { orgId: input.orgId, id: input.profileId, isActive: false },
    data: { isActive: true },
  });
}

export async function skipRecurringExpenseOccurrence(input: {
  orgId: string;
  profileId: string;
}) {
  const template = await db.recurringExpense.findFirst({
    where: { orgId: input.orgId, id: input.profileId },
  });
  if (!template) throw new Error("RECURRING_EXPENSE_TEMPLATE_NOT_FOUND");
  const idempotencyKey = dueKey(template.id, template.nextDueDate);
  const existing = await db.recurringExpenseRun.findFirst({
    where: { orgId: input.orgId, idempotencyKey },
    select: { id: true },
  });
  if (existing) throw new Error("RECURRING_EXPENSE_RUN_ALREADY_RECORDED");
  const nextDueDate = addFrequency(template.nextDueDate, template.frequency as RecurringFrequency);
  const activeAfterSkip = template.endDate
    ? nextDueDate.getTime() <= template.endDate.getTime()
    : template.isActive;
  await db.$transaction([
    db.recurringExpenseRun.create({
      data: {
        orgId: input.orgId,
        templateId: template.id,
        dueDate: template.nextDueDate,
        runStatus: "SKIPPED",
        idempotencyKey,
      },
    }),
    db.recurringExpense.update({
      where: { id: template.id },
      data: {
        nextDueDate,
        isActive: activeAfterSkip,
      },
    }),
  ]);
}

export async function cancelRecurringExpenseProfile(input: {
  orgId: string;
  profileId: string;
}) {
  return db.recurringExpense.updateMany({
    where: { orgId: input.orgId, id: input.profileId },
    data: { isActive: false, endDate: new Date() },
  });
}
