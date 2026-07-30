import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { Prisma } from "@/generated/prisma/client";
import { RootType, AccountType } from "./types";
import {
  postApprovedPayrollRun,
  resolveCanonicalPostingConfiguration,
} from "./integration-adapters";
import { add, decimal, serialize } from "./money";
import {
  postCanonicalAccountingRequest,
  reverseCanonicalJournal,
} from "./posting-engine";

// ─── Chart of Accounts Seeding ──────────────────────────────────────────────────

export async function seedChartOfAccounts(orgId: string) {
  // Check if accounts exist
  const existingCount = await db.account.count({ where: { orgId } });
  if (existingCount > 0) return;

  const now = await getNow();

  // Create group root accounts
  const assetRoot = await db.account.create({
    data: { orgId, accountCode: "1000", accountName: "ASSETS", rootType: "ASSET", accountType: "OTHER", isGroup: true, isActive: true },
  });
  const liabilityRoot = await db.account.create({
    data: { orgId, accountCode: "2000", accountName: "LIABILITIES", rootType: "LIABILITY", accountType: "OTHER", isGroup: true, isActive: true },
  });
  const equityRoot = await db.account.create({
    data: { orgId, accountCode: "3000", accountName: "EQUITY", rootType: "EQUITY", accountType: "OTHER", isGroup: true, isActive: true },
  });
  const incomeRoot = await db.account.create({
    data: { orgId, accountCode: "4000", accountName: "INCOME", rootType: "INCOME", accountType: "OTHER", isGroup: true, isActive: true },
  });
  const expenseRoot = await db.account.create({
    data: { orgId, accountCode: "5000", accountName: "EXPENSES", rootType: "EXPENSE", accountType: "OTHER", isGroup: true, isActive: true },
  });

  // Assets subgroups
  const currentAssets = await db.account.create({
    data: { orgId, parentAccountId: assetRoot.id, accountCode: "1100", accountName: "CURRENT ASSETS", rootType: "ASSET", accountType: "OTHER", isGroup: true, isActive: true },
  });
  const fixedAssets = await db.account.create({
    data: { orgId, parentAccountId: assetRoot.id, accountCode: "1200", accountName: "FIXED ASSETS", rootType: "ASSET", accountType: "OTHER", isGroup: true, isActive: true },
  });

  // Current Assets leaves
  const cash = await db.account.create({
    data: { orgId, parentAccountId: currentAssets.id, accountCode: "1110", accountName: "CASH", rootType: "ASSET", accountType: "CASH", isGroup: false, isActive: true },
  });
  const bank = await db.account.create({
    data: { orgId, parentAccountId: currentAssets.id, accountCode: "1120", accountName: "BANK", rootType: "ASSET", accountType: "BANK", isGroup: false, isActive: true },
  });
  const receivable = await db.account.create({
    data: { orgId, parentAccountId: currentAssets.id, accountCode: "1130", accountName: "ACCOUNTS RECEIVABLE", rootType: "ASSET", accountType: "RECEIVABLE", isGroup: false, isActive: true },
  });
  const inputTax = await db.account.create({
    data: { orgId, parentAccountId: currentAssets.id, accountCode: "1140", accountName: "INPUT TAX RECEIVABLE (GST)", rootType: "ASSET", accountType: "TAX", isGroup: false, isActive: true },
  });
  const advances = await db.account.create({
    data: { orgId, parentAccountId: currentAssets.id, accountCode: "1150", accountName: "EMPLOYEE ADVANCES", rootType: "ASSET", accountType: "RECEIVABLE", isGroup: false, isActive: true },
  });

  // Fixed Assets leaves
  const equipment = await db.account.create({
    data: { orgId, parentAccountId: fixedAssets.id, accountCode: "1210", accountName: "OFFICE EQUIPMENT", rootType: "ASSET", accountType: "FIXED_ASSET", isGroup: false, isActive: true },
  });
  const vehicles = await db.account.create({
    data: { orgId, parentAccountId: fixedAssets.id, accountCode: "1220", accountName: "VEHICLES", rootType: "ASSET", accountType: "FIXED_ASSET", isGroup: false, isActive: true },
  });
  const computers = await db.account.create({
    data: { orgId, parentAccountId: fixedAssets.id, accountCode: "1230", accountName: "COMPUTERS", rootType: "ASSET", accountType: "FIXED_ASSET", isGroup: false, isActive: true },
  });
  const accDeprec = await db.account.create({
    data: { orgId, parentAccountId: fixedAssets.id, accountCode: "1240", accountName: "ACCUMULATED DEPRECIATION", rootType: "ASSET", accountType: "DEPRECIATION", isGroup: false, isActive: true },
  });

  // Liabilities subgroups
  const currentLiabilities = await db.account.create({
    data: { orgId, parentAccountId: liabilityRoot.id, accountCode: "2100", accountName: "CURRENT LIABILITIES", rootType: "LIABILITY", accountType: "OTHER", isGroup: true, isActive: true },
  });

  // Current Liabilities leaves
  const payable = await db.account.create({
    data: { orgId, parentAccountId: currentLiabilities.id, accountCode: "2110", accountName: "ACCOUNTS PAYABLE", rootType: "LIABILITY", accountType: "PAYABLE", isGroup: false, isActive: true },
  });
  const outputTax = await db.account.create({
    data: { orgId, parentAccountId: currentLiabilities.id, accountCode: "2120", accountName: "OUTPUT TAX PAYABLE (GST)", rootType: "LIABILITY", accountType: "TAX", isGroup: false, isActive: true },
  });
  const salaryPayable = await db.account.create({
    data: { orgId, parentAccountId: currentLiabilities.id, accountCode: "2130", accountName: "SALARY PAYABLE", rootType: "LIABILITY", accountType: "PAYABLE", isGroup: false, isActive: true },
  });
  const statutoryPayables = await db.account.create({
    data: { orgId, parentAccountId: currentLiabilities.id, accountCode: "2140", accountName: "STATUTORY PAYABLES (PF/ESI)", rootType: "LIABILITY", accountType: "PAYABLE", isGroup: false, isActive: true },
  });

  // Equity leaves
  const ownerEquity = await db.account.create({
    data: { orgId, parentAccountId: equityRoot.id, accountCode: "3100", accountName: "OWNER EQUITY", rootType: "EQUITY", accountType: "EQUITY", isGroup: false, isActive: true },
  });
  const retainedEarnings = await db.account.create({
    data: { orgId, parentAccountId: equityRoot.id, accountCode: "3200", accountName: "RETAINED EARNINGS", rootType: "EQUITY", accountType: "EQUITY", isGroup: false, isActive: true },
  });

  // Income leaves
  const salesIncome = await db.account.create({
    data: { orgId, parentAccountId: incomeRoot.id, accountCode: "4100", accountName: "SALES INCOME", rootType: "INCOME", accountType: "SALES", isGroup: false, isActive: true },
  });
  const serviceIncome = await db.account.create({
    data: { orgId, parentAccountId: incomeRoot.id, accountCode: "4200", accountName: "SERVICE INCOME", rootType: "INCOME", accountType: "SALES", isGroup: false, isActive: true },
  });
  const freightIncome = await db.account.create({
    data: { orgId, parentAccountId: incomeRoot.id, accountCode: "4300", accountName: "FREIGHT INCOME", rootType: "INCOME", accountType: "SALES", isGroup: false, isActive: true },
  });
  const customsIncome = await db.account.create({
    data: { orgId, parentAccountId: incomeRoot.id, accountCode: "4400", accountName: "CUSTOMS CLEARANCE INCOME", rootType: "INCOME", accountType: "SALES", isGroup: false, isActive: true },
  });
  const otherIncome = await db.account.create({
    data: { orgId, parentAccountId: incomeRoot.id, accountCode: "4500", accountName: "OTHER INCOME", rootType: "INCOME", accountType: "OTHER", isGroup: false, isActive: true },
  });

  // Expense leaves
  const salaryExpense = await db.account.create({
    data: { orgId, parentAccountId: expenseRoot.id, accountCode: "5100", accountName: "SALARY EXPENSE", rootType: "EXPENSE", accountType: "EXPENSE", isGroup: false, isActive: true },
  });
  const rentExpense = await db.account.create({
    data: { orgId, parentAccountId: expenseRoot.id, accountCode: "5200", accountName: "RENT EXPENSE", rootType: "EXPENSE", accountType: "EXPENSE", isGroup: false, isActive: true },
  });
  const fuelExpense = await db.account.create({
    data: { orgId, parentAccountId: expenseRoot.id, accountCode: "5300", accountName: "FUEL EXPENSE", rootType: "EXPENSE", accountType: "EXPENSE", isGroup: false, isActive: true },
  });
  const travelExpense = await db.account.create({
    data: { orgId, parentAccountId: expenseRoot.id, accountCode: "5400", accountName: "TRAVEL EXPENSE", rootType: "EXPENSE", accountType: "EXPENSE", isGroup: false, isActive: true },
  });
  const officeExpense = await db.account.create({
    data: { orgId, parentAccountId: expenseRoot.id, accountCode: "5500", accountName: "OFFICE EXPENSE", rootType: "EXPENSE", accountType: "EXPENSE", isGroup: false, isActive: true },
  });
  const deprecExpense = await db.account.create({
    data: { orgId, parentAccountId: expenseRoot.id, accountCode: "5600", accountName: "DEPRECIATION EXPENSE", rootType: "EXPENSE", accountType: "EXPENSE", isGroup: false, isActive: true },
  });
  const purchaseExpense = await db.account.create({
    data: { orgId, parentAccountId: expenseRoot.id, accountCode: "5700", accountName: "PURCHASE EXPENSE", rootType: "EXPENSE", accountType: "PURCHASE", isGroup: false, isActive: true },
  });
  const bankCharges = await db.account.create({
    data: { orgId, parentAccountId: expenseRoot.id, accountCode: "5800", accountName: "BANK CHARGES", rootType: "EXPENSE", accountType: "EXPENSE", isGroup: false, isActive: true },
  });
  const roundOff = await db.account.create({
    data: { orgId, parentAccountId: expenseRoot.id, accountCode: "5900", accountName: "ROUND OFF", rootType: "EXPENSE", accountType: "ROUND_OFF", isGroup: false, isActive: true },
  });

  // Seed default settings
  await db.accountingSettings.upsert({
    where: { orgId },
    update: {
      defaultReceivableAccountId: receivable.id,
      defaultPayableAccountId: payable.id,
      defaultCashAccountId: cash.id,
      defaultBankAccountId: bank.id,
      defaultSalesAccountId: salesIncome.id,
      defaultPurchaseAccountId: purchaseExpense.id,
      defaultTaxAccountId: outputTax.id,
      defaultRoundOffAccountId: roundOff.id,
      defaultSalaryExpenseAccountId: salaryExpense.id,
      defaultSalaryPayableAccountId: salaryPayable.id,
      defaultDepreciationExpenseAccountId: deprecExpense.id,
      defaultAccumulatedDepreciationAccountId: accDeprec.id,
    },
    create: {
      orgId,
      defaultReceivableAccountId: receivable.id,
      defaultPayableAccountId: payable.id,
      defaultCashAccountId: cash.id,
      defaultBankAccountId: bank.id,
      defaultSalesAccountId: salesIncome.id,
      defaultPurchaseAccountId: purchaseExpense.id,
      defaultTaxAccountId: outputTax.id,
      defaultRoundOffAccountId: roundOff.id,
      defaultSalaryExpenseAccountId: salaryExpense.id,
      defaultSalaryPayableAccountId: salaryPayable.id,
      defaultDepreciationExpenseAccountId: deprecExpense.id,
      defaultAccumulatedDepreciationAccountId: accDeprec.id,
    },
  });

  // Seed default fiscal year for 2026
  await db.fiscalYear.upsert({
    where: { orgId_name: { orgId, name: "2026-2027" } },
    update: {},
    create: {
      orgId,
      name: "2026-2027",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
    },
  });
}

// ─── Audit Logging ──────────────────────────────────────────────────────────────

export async function createAuditLog(
  orgId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  beforeValues?: any,
  afterValues?: any
) {
  return db.accountingAuditLog.create({
    data: {
      orgId,
      userId,
      action,
      entityType,
      entityId,
      beforeValues: beforeValues ? JSON.parse(JSON.stringify(beforeValues)) : undefined,
      afterValues: afterValues ? JSON.parse(JSON.stringify(afterValues)) : undefined,
    },
  });
}

// ─── Chart of Accounts Functions ───────────────────────────────────────────────

export async function listAccounts(orgId: string, branchId?: string | null) {
  const where: Prisma.AccountWhereInput = { orgId };
  if (branchId) where.branchId = branchId;
  return db.account.findMany({
    where,
    orderBy: { accountCode: "asc" },
  });
}

export async function getChartOfAccounts(orgId: string): Promise<any[]> {
  const accounts = await db.account.findMany({
    where: { orgId },
    orderBy: { accountCode: "asc" },
  });

  // Build tree hierarchy
  const accountMap = new Map<string, any>();
  accounts.forEach((acc) => {
    accountMap.set(acc.id, {
      ...acc,
      openingDebit: Number(acc.openingDebit),
      openingCredit: Number(acc.openingCredit),
      children: [],
    });
  });

  const roots: any[] = [];
  accountMap.forEach((acc) => {
    if (acc.parentAccountId) {
      const parent = accountMap.get(acc.parentAccountId);
      if (parent) {
        parent.children.push(acc);
      } else {
        roots.push(acc);
      }
    } else {
      roots.push(acc);
    }
  });

  return roots;
}

export async function createAccount(orgId: string, createdById: string, data: any) {
  // Validate parent
  if (data.parentAccountId) {
    const parent = await db.account.findFirst({ where: { id: data.parentAccountId, orgId } });
    if (!parent) throw new Error("Parent account not found");
    if (!parent.isGroup) throw new Error("Parent account must be a group account");
  }

  // Check unique code
  const existingCode = await db.account.findFirst({ where: { orgId, accountCode: data.accountCode } });
  if (existingCode) throw new Error(`Account code ${data.accountCode} already exists`);

  const account = await db.account.create({
    data: {
      orgId,
      accountCode: data.accountCode,
      accountName: data.accountName,
      parentAccountId: data.parentAccountId || null,
      rootType: data.rootType,
      accountType: data.accountType,
      isGroup: data.isGroup || false,
      isActive: data.isActive !== false,
      openingDebit: new Prisma.Decimal(data.openingDebit ?? 0),
      openingCredit: new Prisma.Decimal(data.openingCredit ?? 0),
      branchId: data.branchId || null,
    },
  });

  await createAuditLog(orgId, createdById, "CREATE_ACCOUNT", "Account", account.id, null, account);
  return account;
}

export async function updateAccount(orgId: string, id: string, updatedById: string, data: any) {
  const account = await db.account.findFirst({ where: { id, orgId } });
  if (!account) throw new Error("Account not found");

  const updatedAccount = await db.account.update({
    where: { id },
    data: {
      accountName: data.accountName,
      isActive: data.isActive,
      openingDebit: data.openingDebit != null ? new Prisma.Decimal(data.openingDebit) : undefined,
      openingCredit: data.openingCredit != null ? new Prisma.Decimal(data.openingCredit) : undefined,
      branchId: data.branchId !== undefined ? (data.branchId || null) : undefined,
    },
  });

  await createAuditLog(orgId, updatedById, "UPDATE_ACCOUNT", "Account", id, account, updatedAccount);
  return updatedAccount;
}

// ─── Double-Entry Posting Engine ───────────────────────────────────────────────

export function validateBalancedEntry(lines: { debit: number; credit: number }[]) {
  let totalDebit = 0;
  let totalCredit = 0;
  for (const line of lines) {
    totalDebit += line.debit;
    totalCredit += line.credit;
  }
  const diff = Math.abs(totalDebit - totalCredit);
  if (diff > 0.01) {
    throw new Error(`Transaction is unbalanced: Total Debits (₹${totalDebit.toFixed(2)}) must equal Total Credits (₹${totalCredit.toFixed(2)}). Diff: ₹${diff.toFixed(4)}`);
  }
}

export async function validateAccountPostingAllowed(tx: Prisma.TransactionClient, orgId: string, accountId: string) {
  const account = await tx.account.findFirst({
    where: { id: accountId, orgId },
  });
  if (!account) {
    throw new Error(`Account not found inside this organisation context.`);
  }
  if (account.isGroup) {
    throw new Error(`Cannot post directly to group account: ${account.accountName} (${account.accountCode}).`);
  }
  if (!account.isActive) {
    throw new Error(`Cannot post directly to inactive account: ${account.accountName} (${account.accountCode}).`);
  }
  return account;
}

export async function postGLTransactions(
  tx: Prisma.TransactionClient,
  orgId: string,
  voucherType: string,
  voucherId: string,
  postingDate: Date,
  lines: { accountId: string; debit: number; credit: number; partyType?: string | null; partyId?: string | null; remarks?: string | null }[],
  branchId?: string | null,
  createdById?: string
) {
  void tx;
  void orgId;
  void voucherType;
  void voucherId;
  void postingDate;
  void lines;
  void branchId;
  void createdById;
  throw new Error(
    "LEGACY_DIRECT_LEDGER_WRITE_BLOCKED: prepare an immutable Accounting request and use the canonical posting engine",
  );
}

export async function reverseGLTransactions(
  tx: Prisma.TransactionClient,
  orgId: string,
  voucherType: string,
  voucherId: string,
  reversalRemarks: string,
  createdById: string
) {
  void tx;
  void orgId;
  void voucherType;
  void voucherId;
  void reversalRemarks;
  void createdById;
  throw new Error(
    "LEGACY_DIRECT_LEDGER_REVERSAL_BLOCKED: use the canonical journal reversal workflow",
  );
}

// ─── Journal Entries ──────────────────────────────────────────────────────────

export async function listJournalEntries(orgId: string, branchId?: string | null) {
  const where: Prisma.JournalEntryWhereInput = { orgId };
  if (branchId) where.branchId = branchId;
  return db.journalEntry.findMany({
    where,
    orderBy: { postingDate: "desc" },
    include: {
      branch: { select: { name: true } },
    },
  });
}

export async function getJournalEntry(orgId: string, id: string) {
  return db.journalEntry.findFirst({
    where: { id, orgId },
    include: {
      lines: {
        include: {
          account: { select: { accountCode: true, accountName: true } },
        },
      },
      branch: true,
      glEntries: {
        include: {
          account: { select: { accountCode: true, accountName: true } },
        },
      },
    },
  });
}

export async function createJournalEntry(orgId: string, createdById: string, data: any) {
  const lines = data.lines || [];
  if (lines.length < 2) throw new Error("A journal draft requires at least two lines");
  const parsedLines = lines.map((line: any, index: number) => {
    const debit = decimal(line.debit ?? "0", `line ${index + 1} debit`);
    const credit = decimal(line.credit ?? "0", `line ${index + 1} credit`);
    if (debit.isNegative() || credit.isNegative()) {
      throw new Error("Journal draft amounts cannot be negative");
    }
    if ((!debit.isZero() && !credit.isZero()) || (debit.isZero() && credit.isZero())) {
      throw new Error("Each journal draft line must contain exactly one positive debit or credit");
    }
    return { ...line, debit, credit };
  });
  const totalDebit = parsedLines.reduce((total: Prisma.Decimal, line: any) => add(total, line.debit), add());
  const totalCredit = parsedLines.reduce((total: Prisma.Decimal, line: any) => add(total, line.credit), add());

  const postingDate = data.postingDate ? new Date(data.postingDate) : await getNow();
  if (Number.isNaN(postingDate.getTime())) throw new Error("Posting date is invalid");

  const voucherNo = `DRAFT-${globalThis.crypto.randomUUID()}`;

  const entry = await db.$transaction(async (tx) => {
    const journal = await tx.journalEntry.create({
      data: {
        orgId,
        branchId: data.branchId || null,
        voucherNo,
        postingDate,
        remarks: data.remarks || null,
        status: "DRAFT",
        totalDebit,
        totalCredit,
        createdById,
        lines: {
          create: parsedLines.map((l: any) => ({
            accountId: l.accountId,
            debit: l.debit,
            credit: l.credit,
            partyType: l.partyType || null,
            partyId: l.partyId || null,
            remarks: l.remarks || null,
          })),
        },
      },
    });
    return journal;
  });

  await createAuditLog(orgId, createdById, "CREATE_JOURNAL", "JournalEntry", entry.id, null, entry);
  return entry;
}

export async function submitJournalEntry(orgId: string, id: string, userId: string) {
  const journal = await db.journalEntry.findFirst({
    where: { id, orgId, status: "DRAFT" },
    include: { lines: true },
  });

  if (!journal) throw new Error("Draft Journal Entry not found");
  const configuration = await resolveCanonicalPostingConfiguration(orgId, journal.postingDate);
  const now = await getNow();
  const requestId = `ACCOUNTING:MANUAL_JOURNAL:${journal.id}:${journal.rowVersion}`;
  const result = await postCanonicalAccountingRequest({
    requestId,
    requestVersion: 1,
    idempotencyKey: requestId,
    orgId,
    legalEntityId: configuration.legalEntity.id,
    source: {
      system: "ACCOUNTING",
      type: "MANUAL_JOURNAL_DRAFT",
      id: journal.id,
      version: journal.rowVersion,
      occurredAt: journal.createdAt,
      payload: {
        draftId: journal.id,
        draftVoucherNo: journal.voucherNo,
        postingDate: journal.postingDate,
        remarks: journal.remarks,
        lines: journal.lines.map((line) => ({
          accountId: line.accountId,
          debit: serialize(line.debit),
          credit: serialize(line.credit),
          partyType: line.partyType,
          partyId: line.partyId,
          remarks: line.remarks,
        })),
      },
    },
    actor: { kind: "USER", actorId: userId, authenticatedOrgId: orgId },
    makerId: journal.createdById,
    postingDate: journal.postingDate,
    documentDate: journal.postingDate,
    journalType: "JOURNAL_ENTRY",
    ruleId: "GL-MANUAL-JOURNAL-v1",
    narration: journal.remarks || `Manual journal draft ${journal.voucherNo}`,
    branchId: journal.branchId,
    transactionCurrencyCode: configuration.profile.functionalCurrencyCode,
    baseCurrencyCode: configuration.profile.functionalCurrencyCode,
    exchangeRate: null,
    approval: {
      policyId: configuration.approvalPolicy.id,
      policyVersion: configuration.approvalPolicy.version,
      approvedById: userId,
      approvedAt: now,
    },
    numberSeriesId: configuration.numberSeries.id,
    roundingPolicy: {
      id: configuration.roundingPolicy.id,
      version: configuration.roundingPolicy.version,
    },
    lines: journal.lines.map((line) => ({
      accountId: line.accountId,
      debit: line.debit,
      credit: line.credit,
      partyType: line.partyType,
      partyId: line.partyId,
      remarks: line.remarks,
    })),
    correlationId: requestId,
  });
  await db.journalEntry.updateMany({
    where: { id: journal.id, orgId, status: "DRAFT" },
    data: { status: "SUPERSEDED" },
  });
  const posted = await db.journalEntry.findUniqueOrThrow({ where: { id: result.journalEntryId } });
  await createAuditLog(orgId, userId, "POST_MANUAL_JOURNAL", "JournalEntry", posted.id, journal, posted);
  return posted;
}

export async function cancelJournalEntry(orgId: string, id: string, userId: string) {
  const journal = await db.journalEntry.findFirst({
    where: { id, orgId, status: { in: ["POSTED", "SUBMITTED"] } },
  });

  if (!journal) throw new Error("Posted Journal Entry not found");
  const configuration = await resolveCanonicalPostingConfiguration(orgId, await getNow());
  const requestId = `ACCOUNTING:JOURNAL_REVERSAL:${journal.id}`;
  const result = await reverseCanonicalJournal({
    orgId,
    legalEntityId: journal.legalEntityId ?? configuration.legalEntity.id,
    journalEntryId: journal.id,
    reason: `Cancellation requested for ${journal.voucherNo}`,
    requestId,
    idempotencyKey: requestId,
    actor: { kind: "USER", actorId: userId, authenticatedOrgId: orgId },
    makerId: journal.createdById,
    approval: {
      policyId: configuration.approvalPolicy.id,
      policyVersion: configuration.approvalPolicy.version,
      approvedById: userId,
      approvedAt: await getNow(),
    },
    numberSeriesId: configuration.numberSeries.id,
    roundingPolicy: {
      id: configuration.roundingPolicy.id,
      version: configuration.roundingPolicy.version,
    },
    correlationId: journal.correlationId ?? journal.requestId ?? journal.id,
  });
  return db.journalEntry.findUniqueOrThrow({ where: { id: result.journalEntryId } });
}

// ─── Sales Invoices ──────────────────────────────────────────────────────────

export async function listSalesInvoices(orgId: string, branchId?: string | null) {
  const where: Prisma.SalesInvoiceWhereInput = { orgId };
  if (branchId) where.branchId = branchId;
  return db.salesInvoice.findMany({
    where,
    orderBy: { postingDate: "desc" },
    include: {
      customer: { select: { name: true } },
      branch: { select: { name: true } },
    },
  });
}

export async function getSalesInvoice(orgId: string, id: string) {
  const invoice = await db.salesInvoice.findFirst({
    where: { id, orgId },
    include: {
      customer: { select: { name: true, billingAddress: true, shippingAddress: true, email: true, phone: true } },
      items: true,
      taxLines: {
        include: {
          account: { select: { accountCode: true, accountName: true } },
        },
      },
      branch: true,
      deal: true,
      payments: {
        include: {
          paymentEntry: {
            select: { id: true, referenceNo: true, postingDate: true, paidFrom: { select: { accountName: true } } },
          },
        },
      },
    },
  });

  if (!invoice) return null;

  const glEntries = await db.generalLedgerEntry.findMany({
    where: { orgId, voucherType: "SALES_INVOICE", voucherId: id },
    include: {
      account: { select: { accountCode: true, accountName: true } },
    },
  });

  return {
    ...invoice,
    glEntries,
  };
}

export async function createSalesInvoice(orgId: string, createdById: string, data: any) {
  if (data.submit) {
    throw new Error(
      "LEGACY_SALES_INVOICE_POSTING_BLOCKED: create a draft, then use the canonical approval workflow",
    );
  }
  if (data.taxRate == null) throw new Error("A configured tax rate or explicit zero-tax treatment is required");
  if (!data.dueDate) throw new Error("A configured invoice due date is required");
  const items = data.items || [];
  let subtotal = 0;
  for (const it of items) {
    subtotal += parseFloat(it.qty) * parseFloat(it.rate) * parseFloat(it.exchangeRate || 1);
  }

  const discountAmount = data.discountAmount || 0;
  const taxableAmount = Math.max(0, subtotal - discountAmount);

  const taxRate = data.taxRate;
  const taxAmount = taxableAmount * (taxRate / 100);
  const grandTotal = taxableAmount + taxAmount;

  const count = await db.salesInvoice.count({ where: { orgId } });
  const invoiceNumber = `SINV-${1001 + count}`;

  const postingDate = data.postingDate ? new Date(data.postingDate) : await getNow();
  const dueDate = new Date(data.dueDate);

  const invoice = await db.$transaction(async (tx) => {
    const settings = await tx.accountingSettings.findUnique({ where: { orgId } });
    if (!settings?.defaultSalesAccountId || !settings?.defaultTaxAccountId) {
      throw new Error("Default Sales or Tax accounts not configured in Accounting Settings");
    }

    const inv = await tx.salesInvoice.create({
      data: {
        orgId,
        branchId: data.branchId || null,
        invoiceNumber,
        customerId: data.customerId,
        crmDealId: data.crmDealId || null,
        postingDate,
        dueDate,
        status: data.submit ? "UNPAID" : "DRAFT",
        grandTotal: new Prisma.Decimal(grandTotal),
        outstandingAmount: new Prisma.Decimal(grandTotal),
        discountAmount: new Prisma.Decimal(discountAmount),
        taxAmount: new Prisma.Decimal(taxAmount),
        remarks: data.remarks || null,
        bankDetails: data.bankDetails || null,
        manualNotes: data.manualNotes || null,
        createdById,
        items: {
          create: items.map((it: any) => ({
            itemName: it.itemName,
            qty: parseFloat(it.qty),
            rate: new Prisma.Decimal(it.rate),
            amount: new Prisma.Decimal(parseFloat(it.qty) * parseFloat(it.rate) * parseFloat(it.exchangeRate || 1)),
            currency: it.currency || "INR",
            exchangeRate: parseFloat(it.exchangeRate || 1),
          })),
        },
        taxLines: taxRate > 0 ? {
          create: [
            {
              accountId: settings.defaultTaxAccountId!,
              taxRate: parseFloat(taxRate),
              taxAmount: new Prisma.Decimal(taxAmount),
            },
          ],
        } : undefined,
      },
    });

    if (data.submit) {
      // Create postings
      const glLines = [
        // DEBIT Accounts Receivable
        {
          accountId: settings.defaultReceivableAccountId!,
          debit: grandTotal,
          credit: 0,
          partyType: "CUSTOMER",
          partyId: data.customerId,
          remarks: `Sales Invoice ${invoiceNumber}`,
        },
        // CREDIT Sales Revenue
        {
          accountId: settings.defaultSalesAccountId!,
          debit: 0,
          credit: taxableAmount,
          remarks: `Sales Income from ${invoiceNumber}`,
        },
      ];

      if (taxAmount > 0) {
        // CREDIT Output Tax
        glLines.push({
          accountId: settings.defaultTaxAccountId!,
          debit: 0,
          credit: taxAmount,
          remarks: `Output GST for ${invoiceNumber}`,
        });
      }

      await postGLTransactions(
        tx,
        orgId,
        "SALES_INVOICE",
        inv.id,
        postingDate,
        glLines,
        data.branchId,
        createdById
      );

      // Post to Customer Ledger
      await tx.customerLedgerEntry.create({
        data: {
          orgId,
          branchId: data.branchId || null,
          customerId: data.customerId,
          postingDate,
          voucherType: "SALES_INVOICE",
          voucherId: inv.id,
          debit: new Prisma.Decimal(grandTotal),
          credit: new Prisma.Decimal(0),
          remarks: `Outstanding Invoice ${invoiceNumber}`,
        },
      });
    }

    return inv;
  });

  await createAuditLog(orgId, createdById, "CREATE_SALES_INVOICE", "SalesInvoice", invoice.id, null, invoice);
  return invoice;
}

export async function submitSalesInvoice(orgId: string, id: string, userId: string) {
  const invoice = await db.salesInvoice.findFirst({
    where: { id, orgId, status: "DRAFT" },
    include: { items: true, taxLines: true },
  });

  if (!invoice) throw new Error("Draft Sales Invoice not found");

  const settings = await db.accountingSettings.findUnique({ where: { orgId } });
  if (!settings?.defaultSalesAccountId || !settings?.defaultTaxAccountId || !settings?.defaultReceivableAccountId) {
    throw new Error("Default Receivables, Sales or Tax accounts not configured in Accounting Settings");
  }

  const grandTotal = Number(invoice.grandTotal);
  const taxAmount = Number(invoice.taxAmount);
  const taxableAmount = grandTotal - taxAmount;

  const inv = await db.$transaction(async (tx) => {
    const glLines = [
      // DEBIT Receivables
      {
        accountId: settings.defaultReceivableAccountId!,
        debit: grandTotal,
        credit: 0,
        partyType: "CUSTOMER",
        partyId: invoice.customerId,
        remarks: `Sales Invoice ${invoice.invoiceNumber}`,
      },
      // CREDIT Sales Revenue
      {
        accountId: settings.defaultSalesAccountId!,
        debit: 0,
        credit: taxableAmount,
        remarks: `Sales Income from ${invoice.invoiceNumber}`,
      },
    ];

    if (taxAmount > 0) {
      glLines.push({
        accountId: settings.defaultTaxAccountId!,
        debit: 0,
        credit: taxAmount,
        remarks: `Output GST for ${invoice.invoiceNumber}`,
      });
    }

    await postGLTransactions(
      tx,
      orgId,
      "SALES_INVOICE",
      invoice.id,
      invoice.postingDate,
      glLines,
      invoice.branchId,
      userId
    );

    // Customer Ledger
    await tx.customerLedgerEntry.create({
      data: {
        orgId,
        branchId: invoice.branchId,
        customerId: invoice.customerId,
        postingDate: invoice.postingDate,
        voucherType: "SALES_INVOICE",
        voucherId: invoice.id,
        debit: invoice.grandTotal,
        credit: new Prisma.Decimal(0),
        remarks: `Outstanding Invoice ${invoice.invoiceNumber}`,
      },
    });

    return tx.salesInvoice.update({
      where: { id },
      data: { status: "UNPAID" },
    });
  });

  await createAuditLog(orgId, userId, "SUBMIT_SALES_INVOICE", "SalesInvoice", id, invoice, inv);
  return inv;
}

export async function cancelSalesInvoice(orgId: string, id: string, userId: string) {
  const invoice = await db.salesInvoice.findFirst({
    where: { id, orgId, status: { in: ["UNPAID", "PARTLY_PAID", "PAID"] } },
    include: { payments: true },
  });

  if (!invoice) throw new Error("Invoice not found or already cancelled");

  // Prevent direct cancellation if payment allocations exist
  const activeAllocations = invoice.payments.length;
  if (activeAllocations > 0) {
    throw new Error("Cannot cancel invoice with active payment allocations. Cancel payment entries first.");
  }

  const inv = await db.$transaction(async (tx) => {
    // Reverse GL entries
    await reverseGLTransactions(tx, orgId, "SALES_INVOICE", invoice.id, `Cancellation of Sales Invoice: ${invoice.invoiceNumber}`, userId);

    // Post customer ledger reversal
    await tx.customerLedgerEntry.create({
      data: {
        orgId,
        branchId: invoice.branchId,
        customerId: invoice.customerId,
        postingDate: await getNow(),
        voucherType: "SALES_INVOICE",
        voucherId: invoice.id,
        debit: new Prisma.Decimal(0),
        credit: invoice.grandTotal, // CREDIT to reverse
        remarks: `Reversal of Sales Invoice: ${invoice.invoiceNumber}`,
      },
    });

    return tx.salesInvoice.update({
      where: { id },
      data: { status: "CANCELLED", outstandingAmount: new Prisma.Decimal(0) },
    });
  });

  await createAuditLog(orgId, userId, "CANCEL_SALES_INVOICE", "SalesInvoice", id, invoice, inv);
  return inv;
}

// ─── Purchase Invoices ───────────────────────────────────────────────────────

export async function listPurchaseInvoices(orgId: string, branchId?: string | null) {
  const where: Prisma.PurchaseInvoiceWhereInput = { orgId };
  if (branchId) where.branchId = branchId;
  return db.purchaseInvoice.findMany({
    where,
    orderBy: { postingDate: "desc" },
    include: {
      supplier: { select: { name: true } },
      branch: { select: { name: true } },
    },
  });
}

export async function getPurchaseInvoice(orgId: string, id: string) {
  const invoice = await db.purchaseInvoice.findFirst({
    where: { id, orgId },
    include: {
      supplier: { select: { name: true, address: true, email: true, phone: true } },
      items: true,
      taxLines: {
        include: {
          account: { select: { accountCode: true, accountName: true } },
        },
      },
      branch: true,
      payments: {
        include: {
          paymentEntry: {
            select: { id: true, referenceNo: true, postingDate: true, paidTo: { select: { accountName: true } } },
          },
        },
      },
    },
  });

  if (!invoice) return null;

  const glEntries = await db.generalLedgerEntry.findMany({
    where: { orgId, voucherType: "PURCHASE_INVOICE", voucherId: id },
    include: {
      account: { select: { accountCode: true, accountName: true } },
    },
  });

  return {
    ...invoice,
    glEntries,
  };
}

export async function createPurchaseInvoice(orgId: string, createdById: string, data: any) {
  if (data.submit) {
    throw new Error(
      "LEGACY_PURCHASE_INVOICE_POSTING_BLOCKED: create a draft, then use the canonical approval workflow",
    );
  }
  if (data.taxRate == null) throw new Error("A configured tax rate or explicit zero-tax treatment is required");
  if (!data.dueDate) throw new Error("A configured bill due date is required");
  const items = data.items || [];
  let subtotal = 0;
  for (const it of items) {
    subtotal += parseFloat(it.qty) * parseFloat(it.rate);
  }

  const discountAmount = data.discountAmount || 0;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxRate = data.taxRate;
  const taxAmount = taxableAmount * (taxRate / 100);
  const grandTotal = taxableAmount + taxAmount;

  const count = await db.purchaseInvoice.count({ where: { orgId } });
  const invoiceNumber = `PINV-${1001 + count}`;

  const postingDate = data.postingDate ? new Date(data.postingDate) : await getNow();
  const dueDate = new Date(data.dueDate);

  const invoice = await db.$transaction(async (tx) => {
    const settings = await tx.accountingSettings.findUnique({ where: { orgId } });
    if (!settings?.defaultPurchaseAccountId || !settings?.defaultPayableAccountId || !settings?.defaultTaxAccountId) {
      throw new Error("Default Accounts Payable, Expense or Tax accounts not configured in Accounting Settings");
    }

    const inv = await tx.purchaseInvoice.create({
      data: {
        orgId,
        branchId: data.branchId || null,
        invoiceNumber,
        supplierId: data.supplierId,
        postingDate,
        dueDate,
        status: data.submit ? "UNPAID" : "DRAFT",
        grandTotal: new Prisma.Decimal(grandTotal),
        outstandingAmount: new Prisma.Decimal(grandTotal),
        discountAmount: new Prisma.Decimal(discountAmount),
        taxAmount: new Prisma.Decimal(taxAmount),
        remarks: data.remarks || null,
        createdById,
        items: {
          create: items.map((it: any) => ({
            itemName: it.itemName,
            qty: parseFloat(it.qty),
            rate: new Prisma.Decimal(it.rate),
            amount: new Prisma.Decimal(parseFloat(it.qty) * parseFloat(it.rate)),
          })),
        },
        taxLines: taxRate > 0 ? {
          create: [
            {
              accountId: settings.defaultTaxAccountId!,
              taxRate: parseFloat(taxRate),
              taxAmount: new Prisma.Decimal(taxAmount),
            },
          ],
        } : undefined,
      },
    });

    if (data.submit) {
      // Create postings
      const glLines = [
        // DEBIT Expense
        {
          accountId: settings.defaultPurchaseAccountId!,
          debit: taxableAmount,
          credit: 0,
          remarks: `Purchase Expense ${invoiceNumber}`,
        },
        // CREDIT Accounts Payable
        {
          accountId: settings.defaultPayableAccountId!,
          debit: 0,
          credit: grandTotal,
          partyType: "SUPPLIER",
          partyId: data.supplierId,
          remarks: `Purchase invoice ${invoiceNumber}`,
        },
      ];

      if (taxAmount > 0) {
        // DEBIT Input Tax
        glLines.push({
          accountId: settings.defaultTaxAccountId!, // fallback output tax is fine, or input tax if defined
          debit: taxAmount,
          credit: 0,
          remarks: `Input GST for ${invoiceNumber}`,
        });
      }

      await postGLTransactions(
        tx,
        orgId,
        "PURCHASE_INVOICE",
        inv.id,
        postingDate,
        glLines,
        data.branchId,
        createdById
      );

      // Post Supplier Ledger
      await tx.supplierLedgerEntry.create({
        data: {
          orgId,
          branchId: data.branchId || null,
          supplierId: data.supplierId,
          postingDate,
          voucherType: "PURCHASE_INVOICE",
          voucherId: inv.id,
          debit: new Prisma.Decimal(0),
          credit: new Prisma.Decimal(grandTotal),
          remarks: `Outstanding Invoice ${invoiceNumber}`,
        },
      });
    }

    return inv;
  });

  await createAuditLog(orgId, createdById, "CREATE_PURCHASE_INVOICE", "PurchaseInvoice", invoice.id, null, invoice);
  return invoice;
}

export async function submitPurchaseInvoice(orgId: string, id: string, userId: string) {
  const invoice = await db.purchaseInvoice.findFirst({
    where: { id, orgId, status: "DRAFT" },
    include: { items: true, taxLines: true },
  });

  if (!invoice) throw new Error("Draft Purchase Invoice not found");

  const settings = await db.accountingSettings.findUnique({ where: { orgId } });
  if (!settings?.defaultPurchaseAccountId || !settings?.defaultPayableAccountId || !settings?.defaultTaxAccountId) {
    throw new Error("Default Accounts Payable, Expense or Tax accounts not configured in Accounting Settings");
  }

  const grandTotal = Number(invoice.grandTotal);
  const taxAmount = Number(invoice.taxAmount);
  const taxableAmount = grandTotal - taxAmount;

  const inv = await db.$transaction(async (tx) => {
    const glLines = [
      // DEBIT Expense
      {
        accountId: settings.defaultPurchaseAccountId!,
        debit: taxableAmount,
        credit: 0,
        remarks: `Purchase Expense ${invoice.invoiceNumber}`,
      },
      // CREDIT Accounts Payable
      {
        accountId: settings.defaultPayableAccountId!,
        debit: 0,
        credit: grandTotal,
        partyType: "SUPPLIER",
        partyId: invoice.supplierId,
        remarks: `Purchase invoice ${invoice.invoiceNumber}`,
      },
    ];

    if (taxAmount > 0) {
      glLines.push({
        accountId: settings.defaultTaxAccountId!,
        debit: taxAmount,
        credit: 0,
        remarks: `Input GST for ${invoice.invoiceNumber}`,
      });
    }

    await postGLTransactions(
      tx,
      orgId,
      "PURCHASE_INVOICE",
      invoice.id,
      invoice.postingDate,
      glLines,
      invoice.branchId,
      userId
    );

    // Supplier Ledger
    await tx.supplierLedgerEntry.create({
      data: {
        orgId,
        branchId: invoice.branchId,
        supplierId: invoice.supplierId,
        postingDate: invoice.postingDate,
        voucherType: "PURCHASE_INVOICE",
        voucherId: invoice.id,
        debit: new Prisma.Decimal(0),
        credit: invoice.grandTotal,
        remarks: `Outstanding Invoice ${invoice.invoiceNumber}`,
      },
    });

    return tx.purchaseInvoice.update({
      where: { id },
      data: { status: "UNPAID" },
    });
  });

  await createAuditLog(orgId, userId, "SUBMIT_PURCHASE_INVOICE", "PurchaseInvoice", id, invoice, inv);
  return inv;
}

export async function cancelPurchaseInvoice(orgId: string, id: string, userId: string) {
  const invoice = await db.purchaseInvoice.findFirst({
    where: { id, orgId, status: { in: ["UNPAID", "PARTLY_PAID", "PAID"] } },
    include: { payments: true },
  });

  if (!invoice) throw new Error("Invoice not found or already cancelled");

  const activeAllocations = invoice.payments.length;
  if (activeAllocations > 0) {
    throw new Error("Cannot cancel purchase invoice with active payment allocations. Cancel payment entries first.");
  }

  const inv = await db.$transaction(async (tx) => {
    // Reverse GL entries
    await reverseGLTransactions(tx, orgId, "PURCHASE_INVOICE", invoice.id, `Cancellation of Purchase Invoice: ${invoice.invoiceNumber}`, userId);

    // Supplier Ledger reversal
    await tx.supplierLedgerEntry.create({
      data: {
        orgId,
        branchId: invoice.branchId,
        supplierId: invoice.supplierId,
        postingDate: await getNow(),
        voucherType: "PURCHASE_INVOICE",
        voucherId: invoice.id,
        debit: invoice.grandTotal, // DEBIT to reverse
        credit: new Prisma.Decimal(0),
        remarks: `Reversal of Purchase Invoice: ${invoice.invoiceNumber}`,
      },
    });

    return tx.purchaseInvoice.update({
      where: { id },
      data: { status: "CANCELLED", outstandingAmount: new Prisma.Decimal(0) },
    });
  });

  await createAuditLog(orgId, userId, "CANCEL_PURCHASE_INVOICE", "PurchaseInvoice", id, invoice, inv);
  return inv;
}

// ─── Payment Entries ──────────────────────────────────────────────────────────

export async function listPaymentEntries(orgId: string, branchId?: string | null) {
  const where: Prisma.PaymentEntryWhereInput = { orgId };
  if (branchId) where.branchId = branchId;
  return db.paymentEntry.findMany({
    where,
    orderBy: { postingDate: "desc" },
    include: {
      branch: { select: { name: true } },
      paidFrom: { select: { accountName: true } },
      paidTo: { select: { accountName: true } },
    },
  });
}

export async function getPaymentEntry(orgId: string, id: string) {
  const pe = await db.paymentEntry.findFirst({
    where: { id, orgId },
    include: {
      paidFrom: { select: { id: true, accountName: true, accountCode: true } },
      paidTo: { select: { id: true, accountName: true, accountCode: true } },
      branch: true,
      allocations: {
        include: {
          salesInvoice: true,
          purchaseInvoice: true,
        },
      },
    },
  });

  if (!pe) return null;

  // Map party details dynamically
  let partyName = "Unknown";
  if (pe.partyType === "CUSTOMER") {
    const customer = await db.crmAccount.findFirst({ where: { id: pe.partyId, orgId } });
    if (customer) partyName = customer.name;
  } else if (pe.partyType === "SUPPLIER") {
    const supplier = await db.crmVendor.findFirst({ where: { id: pe.partyId, orgId } });
    if (supplier) partyName = supplier.name;
  }

  return { ...pe, partyName };
}

export async function createPaymentEntry(orgId: string, createdById: string, data: any) {
  if (data.submit) {
    throw new Error(
      "LEGACY_PAYMENT_POSTING_BLOCKED: create a draft, then use the canonical approval workflow",
    );
  }
  const amount = parseFloat(data.amount);
  const allocations = data.allocations || [];

  const postingDate = data.postingDate ? new Date(data.postingDate) : await getNow();

  const payment = await db.$transaction(async (tx) => {
    const pe = await tx.paymentEntry.create({
      data: {
        orgId,
        branchId: data.branchId || null,
        paymentType: data.paymentType,
        postingDate,
        partyType: data.partyType,
        partyId: data.partyId,
        paidFromAccountId: data.paidFromAccountId,
        paidToAccountId: data.paidToAccountId,
        amount: new Prisma.Decimal(amount),
        referenceNo: data.referenceNo || null,
        remarks: data.remarks || null,
        status: data.submit ? "SUBMITTED" : "DRAFT",
        createdById,
        allocations: {
          create: allocations.map((al: any) => ({
            salesInvoiceId: al.salesInvoiceId || null,
            purchaseInvoiceId: al.purchaseInvoiceId || null,
            allocatedAmount: new Prisma.Decimal(al.allocatedAmount),
          })),
        },
      },
    });

    if (data.submit) {
      // Create postings
      const glLines = [
        // DEBIT Destination Account
        {
          accountId: data.paidToAccountId,
          debit: amount,
          credit: 0,
          partyType: data.partyType === "CUSTOMER" ? null : "SUPPLIER",
          partyId: data.partyType === "CUSTOMER" ? null : data.partyId,
          remarks: `Payment entry ref ${data.referenceNo || pe.id}`,
        },
        // CREDIT Source Account
        {
          accountId: data.paidFromAccountId,
          debit: 0,
          credit: amount,
          partyType: data.partyType === "CUSTOMER" ? "CUSTOMER" : null,
          partyId: data.partyType === "CUSTOMER" ? data.partyId : null,
          remarks: `Payment entry ref ${data.referenceNo || pe.id}`,
        },
      ];

      await postGLTransactions(
        tx,
        orgId,
        "PAYMENT_ENTRY",
        pe.id,
        postingDate,
        glLines,
        data.branchId,
        createdById
      );

      // Customer Ledger or Supplier Ledger entry
      if (data.partyType === "CUSTOMER") {
        await tx.customerLedgerEntry.create({
          data: {
            orgId,
            branchId: data.branchId || null,
            customerId: data.partyId,
            postingDate,
            voucherType: "PAYMENT_ENTRY",
            voucherId: pe.id,
            debit: new Prisma.Decimal(0),
            credit: new Prisma.Decimal(amount), // CREDIT client ledger
            remarks: `Payment received: Ref ${data.referenceNo || pe.id}`,
          },
        });

        // Apply allocations to update sales invoices outstanding balance
        for (const al of allocations) {
          if (!al.salesInvoiceId) continue;
          const invoice = await tx.salesInvoice.findUnique({
            where: { id: al.salesInvoiceId },
          });
          if (invoice) {
            const newPaid = Number(invoice.paidAmount) + al.allocatedAmount;
            const newOutstanding = Math.max(0, Number(invoice.grandTotal) - newPaid);
            let status = "PARTLY_PAID";
            if (newOutstanding <= 0.01) status = "PAID";

            await tx.salesInvoice.update({
              where: { id: al.salesInvoiceId },
              data: {
                paidAmount: new Prisma.Decimal(newPaid),
                outstandingAmount: new Prisma.Decimal(newOutstanding),
                status,
              },
            });
          }
        }
      } else {
        await tx.supplierLedgerEntry.create({
          data: {
            orgId,
            branchId: data.branchId || null,
            supplierId: data.partyId,
            postingDate,
            voucherType: "PAYMENT_ENTRY",
            voucherId: pe.id,
            debit: new Prisma.Decimal(amount), // DEBIT vendor ledger to reduce payables
            credit: new Prisma.Decimal(0),
            remarks: `Payment paid: Ref ${data.referenceNo || pe.id}`,
          },
        });

        // Apply allocations to update purchase invoices outstanding balance
        for (const al of allocations) {
          if (!al.purchaseInvoiceId) continue;
          const invoice = await tx.purchaseInvoice.findUnique({
            where: { id: al.purchaseInvoiceId },
          });
          if (invoice) {
            const newPaid = Number(invoice.paidAmount) + al.allocatedAmount;
            const newOutstanding = Math.max(0, Number(invoice.grandTotal) - newPaid);
            let status = "PARTLY_PAID";
            if (newOutstanding <= 0.01) status = "PAID";

            await tx.purchaseInvoice.update({
              where: { id: al.purchaseInvoiceId },
              data: {
                paidAmount: new Prisma.Decimal(newPaid),
                outstandingAmount: new Prisma.Decimal(newOutstanding),
                status,
              },
            });
          }
        }
      }
    }

    return pe;
  });

  await createAuditLog(orgId, createdById, "CREATE_PAYMENT", "PaymentEntry", payment.id, null, payment);
  return payment;
}

export async function submitPaymentEntry(orgId: string, id: string, userId: string) {
  const pe = await db.paymentEntry.findFirst({
    where: { id, orgId, status: "DRAFT" },
    include: { allocations: true },
  });

  if (!pe) throw new Error("Draft Payment Entry not found");

  const amount = Number(pe.amount);

  const payment = await db.$transaction(async (tx) => {
    const glLines = [
      // DEBIT Destination Account
      {
        accountId: pe.paidToAccountId,
        debit: amount,
        credit: 0,
        partyType: pe.partyType === "CUSTOMER" ? null : "SUPPLIER",
        partyId: pe.partyType === "CUSTOMER" ? null : pe.partyId,
        remarks: `Payment entry ref ${pe.referenceNo || pe.id}`,
      },
      // CREDIT Source Account
      {
        accountId: pe.paidFromAccountId,
        debit: 0,
        credit: amount,
        partyType: pe.partyType === "CUSTOMER" ? "CUSTOMER" : null,
        partyId: pe.partyType === "CUSTOMER" ? pe.partyId : null,
        remarks: `Payment entry ref ${pe.referenceNo || pe.id}`,
      },
    ];

    await postGLTransactions(
      tx,
      orgId,
      "PAYMENT_ENTRY",
      pe.id,
      pe.postingDate,
      glLines,
      pe.branchId,
      userId
    );

    if (pe.partyType === "CUSTOMER") {
      await tx.customerLedgerEntry.create({
        data: {
          orgId,
          branchId: pe.branchId,
          customerId: pe.partyId,
          postingDate: pe.postingDate,
          voucherType: "PAYMENT_ENTRY",
          voucherId: pe.id,
          debit: new Prisma.Decimal(0),
          credit: pe.amount,
          remarks: `Payment received: Ref ${pe.referenceNo || pe.id}`,
        },
      });

      // Apply allocations
      for (const al of pe.allocations) {
        if (!al.salesInvoiceId) continue;
        const invoice = await tx.salesInvoice.findUnique({
          where: { id: al.salesInvoiceId },
        });
        if (invoice) {
          const newPaid = Number(invoice.paidAmount) + Number(al.allocatedAmount);
          const newOutstanding = Math.max(0, Number(invoice.grandTotal) - newPaid);
          let status = "PARTLY_PAID";
          if (newOutstanding <= 0.01) status = "PAID";

          await tx.salesInvoice.update({
            where: { id: al.salesInvoiceId },
            data: {
              paidAmount: new Prisma.Decimal(newPaid),
              outstandingAmount: new Prisma.Decimal(newOutstanding),
              status,
            },
          });
        }
      }
    } else {
      await tx.supplierLedgerEntry.create({
        data: {
          orgId,
          branchId: pe.branchId,
          supplierId: pe.partyId,
          postingDate: pe.postingDate,
          voucherType: "PAYMENT_ENTRY",
          voucherId: pe.id,
          debit: pe.amount,
          credit: new Prisma.Decimal(0),
          remarks: `Payment paid: Ref ${pe.referenceNo || pe.id}`,
        },
      });

      // Apply allocations
      for (const al of pe.allocations) {
        if (!al.purchaseInvoiceId) continue;
        const invoice = await tx.purchaseInvoice.findUnique({
          where: { id: al.purchaseInvoiceId },
        });
        if (invoice) {
          const newPaid = Number(invoice.paidAmount) + Number(al.allocatedAmount);
          const newOutstanding = Math.max(0, Number(invoice.grandTotal) - newPaid);
          let status = "PARTLY_PAID";
          if (newOutstanding <= 0.01) status = "PAID";

          await tx.purchaseInvoice.update({
            where: { id: al.purchaseInvoiceId },
            data: {
              paidAmount: new Prisma.Decimal(newPaid),
              outstandingAmount: new Prisma.Decimal(newOutstanding),
              status,
            },
          });
        }
      }
    }

    return tx.paymentEntry.update({
      where: { id },
      data: { status: "SUBMITTED" },
    });
  });

  await createAuditLog(orgId, userId, "SUBMIT_PAYMENT", "PaymentEntry", id, pe, payment);
  return payment;
}

export async function cancelPaymentEntry(orgId: string, id: string, userId: string) {
  const pe = await db.paymentEntry.findFirst({
    where: { id, orgId, status: "SUBMITTED" },
    include: { allocations: true },
  });

  if (!pe) throw new Error("Submitted Payment Entry not found");

  const payment = await db.$transaction(async (tx) => {
    // Reverse GL entries
    await reverseGLTransactions(tx, orgId, "PAYMENT_ENTRY", pe.id, `Cancellation of Payment Entry Ref: ${pe.referenceNo || pe.id}`, userId);

    // Revert customer ledger or supplier ledger entry
    if (pe.partyType === "CUSTOMER") {
      await tx.customerLedgerEntry.create({
        data: {
          orgId,
          branchId: pe.branchId,
          customerId: pe.partyId,
          postingDate: await getNow(),
          voucherType: "PAYMENT_ENTRY",
          voucherId: pe.id,
          debit: pe.amount, // DEBIT to reverse credit
          credit: new Prisma.Decimal(0),
          remarks: `Reversal of Payment: Ref ${pe.referenceNo || pe.id}`,
        },
      });

      // Revert allocations from sales invoices
      for (const al of pe.allocations) {
        if (!al.salesInvoiceId) continue;
        const invoice = await tx.salesInvoice.findUnique({
          where: { id: al.salesInvoiceId },
        });
        if (invoice) {
          const newPaid = Math.max(0, Number(invoice.paidAmount) - Number(al.allocatedAmount));
          const newOutstanding = Math.max(0, Number(invoice.grandTotal) - newPaid);
          let status = "UNPAID";
          if (newPaid > 0) status = "PARTLY_PAID";

          await tx.salesInvoice.update({
            where: { id: al.salesInvoiceId },
            data: {
              paidAmount: new Prisma.Decimal(newPaid),
              outstandingAmount: new Prisma.Decimal(newOutstanding),
              status,
            },
          });
        }
      }
    } else {
      await tx.supplierLedgerEntry.create({
        data: {
          orgId,
          branchId: pe.branchId,
          supplierId: pe.partyId,
          postingDate: await getNow(),
          voucherType: "PAYMENT_ENTRY",
          voucherId: pe.id,
          debit: new Prisma.Decimal(0),
          credit: pe.amount, // CREDIT to reverse debit
          remarks: `Reversal of Payment: Ref ${pe.referenceNo || pe.id}`,
        },
      });

      // Revert allocations from purchase invoices
      for (const al of pe.allocations) {
        if (!al.purchaseInvoiceId) continue;
        const invoice = await tx.purchaseInvoice.findUnique({
          where: { id: al.purchaseInvoiceId },
        });
        if (invoice) {
          const newPaid = Math.max(0, Number(invoice.paidAmount) - Number(al.allocatedAmount));
          const newOutstanding = Math.max(0, Number(invoice.grandTotal) - newPaid);
          let status = "UNPAID";
          if (newPaid > 0) status = "PARTLY_PAID";

          await tx.purchaseInvoice.update({
            where: { id: al.purchaseInvoiceId },
            data: {
              paidAmount: new Prisma.Decimal(newPaid),
              outstandingAmount: new Prisma.Decimal(newOutstanding),
              status,
            },
          });
        }
      }
    }

    return tx.paymentEntry.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
  });

  await createAuditLog(orgId, userId, "CANCEL_PAYMENT", "PaymentEntry", id, pe, payment);
  return payment;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export async function getAccountingSettings(orgId: string) {
  // Ensure seed accounts exist
  await seedChartOfAccounts(orgId);
  return db.accountingSettings.findUnique({ where: { orgId } });
}

export async function updateAccountingSettings(orgId: string, userId: string, data: any) {
  const oldSettings = await db.accountingSettings.findUnique({ where: { orgId } });

  const settings = await db.accountingSettings.upsert({
    where: { orgId },
    update: data,
    create: { orgId, ...data },
  });

  await createAuditLog(orgId, userId, "UPDATE_SETTINGS", "AccountingSettings", settings.id, oldSettings, settings);
  return settings;
}

// ─── HRMS Payroll Integration ──────────────────────────────────────────────────

export async function compilePayrollBatch(orgId: string, monthDate: Date) {
  void orgId;
  void monthDate;
  throw new Error(
    "Accounting no longer compiles payroll. HRMS must submit an immutable approved payroll-run snapshot.",
  );
}

export async function getPayrollBatches(orgId: string) {
  return db.payrollBatch.findMany({
    where: { orgId },
    orderBy: { month: "desc" },
    include: {
      journalEntry: true,
    },
  });
}

export async function createPayrollBatch(orgId: string, userId: string, monthDate: Date) {
  void orgId;
  void userId;
  void monthDate;
  throw new Error(
    "Accounting cannot originate payroll batches. Accept an approved immutable HRMS payroll-run event instead.",
  );
}

export async function finalizePayrollBatch(orgId: string, batchId: string, userId: string) {
  const batch = await db.payrollBatch.findFirst({
    where: { id: batchId, orgId, status: "APPROVED_HRMS" },
  });

  if (!batch?.sourceRunId || !batch.sourceRunVersion) {
    throw new Error("Approved immutable HRMS payroll batch not found");
  }
  await postApprovedPayrollRun({
    orgId,
    runId: batch.sourceRunId,
    runVersion: batch.sourceRunVersion,
    posterId: userId,
    approval: { approvedById: userId, approvedAt: await getNow() },
  });
  return db.payrollBatch.findUniqueOrThrow({ where: { id: batchId } });
}

export async function payPayrollBatch(orgId: string, batchId: string, userId: string) {
  void orgId;
  void batchId;
  void userId;
  throw new Error(
    "Payroll payment requires a separately approved immutable HRMS payment event and canonical Accounting posting request.",
  );
}

// ─── AMS Asset Management Integration ──────────────────────────────────────────

export async function listAssets(orgId: string) {
  return db.asset.findMany({
    where: { orgId },
    orderBy: { purchaseDate: "desc" },
    include: {
      branch: { select: { name: true } },
    },
  });
}

export async function getAsset(orgId: string, id: string) {
  return db.asset.findFirst({
    where: { id, orgId },
    include: {
      branch: true,
      depreciationEntries: {
        orderBy: { depreciationDate: "desc" },
        include: {
          journalEntry: true,
        },
      },
    },
  });
}

export async function createAsset(orgId: string, createdById: string, data: any) {
  // Check code uniqueness
  const existing = await db.asset.findUnique({
    where: { orgId_assetCode: { orgId, assetCode: data.assetCode } },
  });
  if (existing) {
    throw new Error(`Asset with code ${data.assetCode} already exists.`);
  }

  const purchaseValue = parseFloat(data.purchaseValue);

  const asset = await db.asset.create({
    data: {
      orgId,
      branchId: data.branchId || null,
      assetName: data.assetName,
      assetCode: data.assetCode,
      purchaseDate: new Date(data.purchaseDate),
      purchaseValue: new Prisma.Decimal(purchaseValue),
      depreciationMethod: "STRAIGHT_LINE",
      depreciationRate: parseFloat(data.depreciationRate || 10.0),
      accumulatedDepreciation: new Prisma.Decimal(0.0),
      bookValue: new Prisma.Decimal(purchaseValue),
      assetAccount: data.assetAccount || null,
      depreciationAccount: data.depreciationAccount || null,
      accumulatedDepreciationAccount: data.accumulatedDepreciationAccount || null,
      status: "ACTIVE",
    },
  });

  await createAuditLog(orgId, createdById, "CREATE_ASSET", "Asset", asset.id, null, asset);
  return asset;
}

export async function runDepreciationForAsset(orgId: string, assetId: string, monthDate: Date, userId: string) {
  void orgId;
  void assetId;
  void monthDate;
  void userId;
  throw new Error(
    "DEPRECIATION_POSTING_GATED: configure and validate the versioned depreciation and statutory rounding policy before canonical posting",
  );
  /*
  const asset = await db.asset.findFirst({
    where: { id: assetId, orgId, status: "ACTIVE" },
  });

  if (!asset) throw new Error("Active asset not found");

  const depreciationDate = new Date(Date.UTC(monthDate.getFullYear(), monthDate.getMonth(), 1));

  const existing = await db.assetDepreciationEntry.findUnique({
    where: {
      assetId_depreciationDate: { assetId, depreciationDate },
    },
  });
  if (existing) {
    throw new Error(`Depreciation has already been processed for this asset in ${monthDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`);
  }

  const purchaseValue = Number(asset.purchaseValue);
  const depreciationRate = asset.depreciationRate;
  const bookValue = Number(asset.bookValue);

  if (bookValue <= 0.01) {
    throw new Error("Asset is already fully depreciated");
  }

  let depreciationAmount = parseFloat(((purchaseValue * (depreciationRate / 100)) / 12).toFixed(2));
  if (depreciationAmount > bookValue) {
    depreciationAmount = bookValue;
  }

  if (depreciationAmount <= 0) {
    throw new Error("Depreciation amount is zero or negative");
  }

  const settings = await db.accountingSettings.findUnique({ where: { orgId } });
  const depreciationExpenseAccount = asset.depreciationAccount || settings?.defaultDepreciationExpenseAccountId;
  const accumulatedDepreciationAccount = asset.accumulatedDepreciationAccount || settings?.defaultAccumulatedDepreciationAccountId;

  if (!depreciationExpenseAccount || !accumulatedDepreciationAccount) {
    throw new Error("Depreciation expense or accumulated depreciation accounts are not configured. Check asset settings or default accounting settings.");
  }

  const monthStr = depreciationDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  const resultEntry = await db.$transaction(async (tx) => {
    const count = await tx.journalEntry.count({ where: { orgId } });
    const voucherNo = `JV-${1001 + count}`;

    const jv = await tx.journalEntry.create({
      data: {
        orgId,
        branchId: asset.branchId,
        voucherNo,
        postingDate: depreciationDate,
        remarks: `Monthly depreciation for ${asset.assetName} (${asset.assetCode}) - ${monthStr}`,
        status: "SUBMITTED",
        totalDebit: new Prisma.Decimal(depreciationAmount),
        totalCredit: new Prisma.Decimal(depreciationAmount),
        createdById: userId,
        lines: {
          create: [
            {
              accountId: depreciationExpenseAccount,
              debit: new Prisma.Decimal(depreciationAmount),
              credit: new Prisma.Decimal(0),
              remarks: `Depreciation expense for ${asset.assetName}`,
            },
            {
              accountId: accumulatedDepreciationAccount,
              debit: new Prisma.Decimal(0),
              credit: new Prisma.Decimal(depreciationAmount),
              remarks: `Accumulated depreciation credit for ${asset.assetName}`,
            },
          ],
        },
      },
    });

    const glLines = [
      {
        accountId: depreciationExpenseAccount,
        debit: depreciationAmount,
        credit: 0,
        remarks: `Depreciation expense for ${asset.assetName}`,
      },
      {
        accountId: accumulatedDepreciationAccount,
        debit: 0,
        credit: depreciationAmount,
        remarks: `Accumulated depreciation credit for ${asset.assetName}`,
      },
    ];

    await postGLTransactions(
      tx,
      orgId,
      "JOURNAL_ENTRY",
      jv.id,
      depreciationDate,
      glLines,
      asset.branchId,
      userId
    );

    const depEntry = await tx.assetDepreciationEntry.create({
      data: {
        orgId,
        assetId,
        depreciationDate,
        depreciationAmount: new Prisma.Decimal(depreciationAmount),
        journalEntryId: jv.id,
      },
    });

    const newAccumulated = Number(asset.accumulatedDepreciation) + depreciationAmount;
    const newBookValue = Math.max(0, purchaseValue - newAccumulated);
    const status = newBookValue <= 0.01 ? "FULLY_DEPRECIATED" : "ACTIVE";

    await tx.asset.update({
      where: { id: assetId },
      data: {
        accumulatedDepreciation: new Prisma.Decimal(newAccumulated),
        bookValue: new Prisma.Decimal(newBookValue),
        status,
      },
    });

    return depEntry;
  });

  await createAuditLog(orgId, userId, "RUN_DEPRECIATION", "Asset", assetId, null, resultEntry);
  return resultEntry;
  */
}

// ─── Rebuild & Expanded Accounting Module Services ──────────────────────────────────

// 1. Period Locking Validation
export async function getTransactionLock(orgId: string) {
  return db.transactionLock.findUnique({
    where: { orgId }
  });
}

export async function updateTransactionLock(orgId: string, data: any) {
  return db.transactionLock.upsert({
    where: { orgId },
    update: {
      lockDate: new Date(data.lockDate),
      lockType: data.lockType || "FULL",
      password: data.password || null,
      lockedBy: data.lockedBy || "Admin",
    },
    create: {
      orgId,
      lockDate: new Date(data.lockDate),
      lockType: data.lockType || "FULL",
      password: data.password || null,
      lockedBy: data.lockedBy || "Admin",
    }
  });
}

export async function validatePostingDateNotLocked(orgId: string, date: Date | string) {
  const lock = await db.transactionLock.findUnique({ where: { orgId } });
  if (lock) {
    const lockDate = new Date(lock.lockDate);
    const checkDate = new Date(date);
    if (checkDate <= lockDate) {
      throw new Error(`Period Locked: Posting date ${checkDate.toLocaleDateString('en-IN')} is locked. Lock date is set to ${lockDate.toLocaleDateString('en-IN')}`);
    }
  }
}

// 2. Quotation Preparation Services
export async function listQuotations(orgId: string) {
  return db.quotation.findMany({
    where: { orgId },
    include: { customer: { select: { name: true } } },
    orderBy: { postingDate: "desc" }
  });
}

export async function getQuotation(orgId: string, id: string) {
  return db.quotation.findFirst({
    where: { id, orgId },
    include: { customer: true, items: true }
  });
}

export async function createQuotation(orgId: string, createdById: string, data: any) {
  if (!data.validUntil) throw new Error("A configured quotation validity date is required");
  const count = await db.quotation.count({ where: { orgId } });
  const quotationNumber = `QUOT-${1001 + count}`;
  const postingDate = data.postingDate ? new Date(data.postingDate) : new Date();
  const validUntil = new Date(data.validUntil);

  const items = data.items || [];
  let subTotal = 0;
  let taxAmount = 0;
  for (const it of items) {
    if (it.taxRate == null) throw new Error("Every quotation line requires configured tax treatment");
    const qty = parseFloat(it.qty || 1);
    const rate = parseFloat(it.rate || 0);
    const disc = parseFloat(it.discount || 0);
    const taxRate = parseFloat(it.taxRate);
    const amt = qty * rate - disc;
    subTotal += amt;
    taxAmount += amt * (taxRate / 100);
  }
  const grandTotal = subTotal + taxAmount;

  return db.quotation.create({
    data: {
      orgId,
      branchId: data.branchId || null,
      quotationNumber,
      customerId: data.customerId,
      postingDate,
      validUntil,
      status: "OPEN",
      subTotal: new Prisma.Decimal(subTotal),
      discountAmount: new Prisma.Decimal(data.discountAmount || 0),
      taxAmount: new Prisma.Decimal(taxAmount),
      grandTotal: new Prisma.Decimal(grandTotal),
      terms: data.terms || null,
      remarks: data.remarks || null,
      createdById,
      items: {
        create: items.map((it: any) => ({
          itemName: it.itemName,
          hsnSac: it.hsnSac || null,
          qty: parseFloat(it.qty || 1),
          uom: it.uom || "Nos",
          rate: new Prisma.Decimal(parseFloat(it.rate || 0)),
          discount: new Prisma.Decimal(parseFloat(it.discount || 0)),
          taxRate: parseFloat(it.taxRate),
          taxAmount: new Prisma.Decimal(parseFloat(it.qty || 1) * parseFloat(it.rate || 0) * (parseFloat(it.taxRate) / 100)),
          amount: new Prisma.Decimal((parseFloat(it.qty || 1) * parseFloat(it.rate || 0)) - parseFloat(it.discount || 0)),
        }))
      }
    }
  });
}

export async function convertQuotationToInvoice(orgId: string, quotationId: string, createdById: string) {
  void orgId;
  void quotationId;
  void createdById;
  throw new Error(
    "QUOTATION_CONVERSION_GATED: prepare a versioned invoice request and resolve configured due-date, tax, account, numbering and approval policies",
  );
}

// 3. Debit & Credit Notes (Customer)
export async function listCustomerNotes(orgId: string) {
  return db.customerNote.findMany({
    where: { orgId },
    include: { customer: { select: { name: true } } },
    orderBy: { postingDate: "desc" }
  });
}

export async function getCustomerNote(orgId: string, id: string) {
  return db.customerNote.findFirst({
    where: { id, orgId },
    include: { customer: true, items: true, originalInvoice: true }
  });
}

export async function createCustomerNote(orgId: string, createdById: string, data: any) {
  const count = await db.customerNote.count({ where: { orgId } });
  const noteNumber = `${data.noteType === "DEBIT" ? "CDN" : "CCN"}-${1001 + count}`;
  const postingDate = data.postingDate ? new Date(data.postingDate) : new Date();

  const items = data.items || [];
  let taxableAmount = 0;
  let taxAmount = 0;
  for (const it of items) {
    if (it.taxRate == null) throw new Error("Every customer note line requires configured tax treatment");
    taxableAmount += parseFloat(it.qty) * parseFloat(it.rate);
    taxAmount += parseFloat(it.qty) * parseFloat(it.rate) * (parseFloat(it.taxRate) / 100);
  }
  const grandTotal = taxableAmount + taxAmount;

  return db.customerNote.create({
    data: {
      orgId,
      branchId: data.branchId || null,
      noteNumber,
      noteType: data.noteType,
      customerId: data.customerId,
      originalInvoiceId: data.originalInvoiceId || null,
      postingDate,
      reason: data.reason || null,
      taxableAmount: new Prisma.Decimal(taxableAmount),
      taxAmount: new Prisma.Decimal(taxAmount),
      grandTotal: new Prisma.Decimal(grandTotal),
      status: "DRAFT",
      remarks: data.remarks || null,
      createdById,
      items: {
        create: items.map((it: any) => ({
          itemName: it.itemName,
          qty: parseFloat(it.qty),
          rate: new Prisma.Decimal(parseFloat(it.rate)),
          amount: new Prisma.Decimal(parseFloat(it.qty) * parseFloat(it.rate)),
          taxRate: parseFloat(it.taxRate),
          taxAmount: new Prisma.Decimal(parseFloat(it.qty) * parseFloat(it.rate) * (parseFloat(it.taxRate) / 100)),
        }))
      }
    }
  });
}

export async function submitCustomerNote(orgId: string, id: string, userId: string) {
  void orgId;
  void id;
  void userId;
  throw new Error(
    "LEGACY_CUSTOMER_NOTE_POSTING_BLOCKED: use the canonical correction-document adapter",
  );
  /*
  const note = await db.customerNote.findFirst({
    where: { id, orgId, status: "DRAFT" },
    include: { items: true }
  });
  if (!note) throw new Error("Customer Note not found or already submitted.");

  await validatePostingDateNotLocked(orgId, note.postingDate);

  const settings = await db.accountingSettings.findUnique({ where: { orgId } });
  if (!settings?.defaultReceivableAccountId || !settings?.defaultSalesAccountId || !settings?.defaultTaxAccountId) {
    throw new Error("Default accounting settings are missing.");
  }

  return db.$transaction(async (tx) => {
    const isDebit = note.noteType === "DEBIT";
    const total = Number(note.grandTotal);
    const tax = Number(note.taxAmount);
    const taxable = total - tax;

    const glLines = [];
    if (isDebit) {
      glLines.push({
        accountId: settings.defaultReceivableAccountId!,
        debit: total,
        credit: 0,
        partyType: "CUSTOMER",
        partyId: note.customerId,
        remarks: `Debit Note ${note.noteNumber}`,
      });
      glLines.push({
        accountId: settings.defaultSalesAccountId!,
        debit: 0,
        credit: taxable,
        remarks: `Additional income from Debit Note ${note.noteNumber}`,
      });
      if (tax > 0) {
        glLines.push({
          accountId: settings.defaultTaxAccountId!,
          debit: 0,
          credit: tax,
          remarks: `Additional Output GST for Debit Note ${note.noteNumber}`,
        });
      }
    } else {
      glLines.push({
        accountId: settings.defaultReceivableAccountId!,
        debit: 0,
        credit: total,
        partyType: "CUSTOMER",
        partyId: note.customerId,
        remarks: `Credit Note ${note.noteNumber}`,
      });
      glLines.push({
        accountId: settings.defaultSalesAccountId!,
        debit: taxable,
        credit: 0,
        remarks: `Sales Reversal for Credit Note ${note.noteNumber}`,
      });
      if (tax > 0) {
        glLines.push({
          accountId: settings.defaultTaxAccountId!,
          debit: tax,
          credit: 0,
          remarks: `GST Reversal for Credit Note ${note.noteNumber}`,
        });
      }
    }

    await postGLTransactions(tx, orgId, "CUSTOMER_NOTE", note.id, note.postingDate, glLines, note.branchId, userId);

    await tx.customerLedgerEntry.create({
      data: {
        orgId,
        customerId: note.customerId,
        postingDate: note.postingDate,
        voucherType: "CUSTOMER_NOTE",
        voucherId: note.id,
        debit: new Prisma.Decimal(isDebit ? total : 0),
        credit: new Prisma.Decimal(isDebit ? 0 : total),
        remarks: `${note.noteType} Note ${note.noteNumber}`,
      }
    });

    return tx.customerNote.update({
      where: { id },
      data: { status: "SUBMITTED" }
    });
  });
  */
}

// 4. Debit & Credit Notes (Vendor)
export async function listVendorNotes(orgId: string) {
  return db.vendorNote.findMany({
    where: { orgId },
    include: { vendor: { select: { name: true } } },
    orderBy: { postingDate: "desc" }
  });
}

export async function getVendorNote(orgId: string, id: string) {
  return db.vendorNote.findFirst({
    where: { id, orgId },
    include: { vendor: true, items: true, originalInvoice: true }
  });
}

export async function createVendorNote(orgId: string, createdById: string, data: any) {
  const count = await db.vendorNote.count({ where: { orgId } });
  const noteNumber = `${data.noteType === "DEBIT" ? "VDN" : "VCN"}-${1001 + count}`;
  const postingDate = data.postingDate ? new Date(data.postingDate) : new Date();

  const items = data.items || [];
  let taxableAmount = 0;
  let taxAmount = 0;
  for (const it of items) {
    if (it.taxRate == null) throw new Error("Every vendor note line requires configured tax treatment");
    taxableAmount += parseFloat(it.qty) * parseFloat(it.rate);
    taxAmount += parseFloat(it.qty) * parseFloat(it.rate) * (parseFloat(it.taxRate) / 100);
  }
  const grandTotal = taxableAmount + taxAmount;

  return db.vendorNote.create({
    data: {
      orgId,
      branchId: data.branchId || null,
      noteNumber,
      noteType: data.noteType,
      vendorId: data.vendorId,
      originalInvoiceId: data.originalInvoiceId || null,
      postingDate,
      reason: data.reason || null,
      taxableAmount: new Prisma.Decimal(taxableAmount),
      taxAmount: new Prisma.Decimal(taxAmount),
      grandTotal: new Prisma.Decimal(grandTotal),
      status: "DRAFT",
      remarks: data.remarks || null,
      createdById,
      items: {
        create: items.map((it: any) => ({
          itemName: it.itemName,
          qty: parseFloat(it.qty),
          rate: new Prisma.Decimal(parseFloat(it.rate)),
          amount: new Prisma.Decimal(parseFloat(it.qty) * parseFloat(it.rate)),
          taxRate: parseFloat(it.taxRate),
          taxAmount: new Prisma.Decimal(parseFloat(it.qty) * parseFloat(it.rate) * (parseFloat(it.taxRate) / 100)),
        }))
      }
    }
  });
}

export async function submitVendorNote(orgId: string, id: string, userId: string) {
  void orgId;
  void id;
  void userId;
  throw new Error(
    "LEGACY_VENDOR_NOTE_POSTING_BLOCKED: use the canonical correction-document adapter",
  );
  /*
  const note = await db.vendorNote.findFirst({
    where: { id, orgId, status: "DRAFT" },
    include: { items: true }
  });
  if (!note) throw new Error("Vendor Note not found or already submitted.");

  await validatePostingDateNotLocked(orgId, note.postingDate);

  const settings = await db.accountingSettings.findUnique({ where: { orgId } });
  if (!settings?.defaultPayableAccountId || !settings?.defaultPurchaseAccountId || !settings?.defaultTaxAccountId) {
    throw new Error("Default accounting settings are missing.");
  }

  return db.$transaction(async (tx) => {
    const isDebit = note.noteType === "DEBIT";
    const total = Number(note.grandTotal);
    const tax = Number(note.taxAmount);
    const taxable = total - tax;

    const glLines = [];
    if (isDebit) {
      glLines.push({
        accountId: settings.defaultPayableAccountId!,
        debit: total,
        credit: 0,
        partyType: "SUPPLIER",
        partyId: note.vendorId,
        remarks: `Vendor Debit Note ${note.noteNumber}`,
      });
      glLines.push({
        accountId: settings.defaultPurchaseAccountId!,
        debit: 0,
        credit: taxable,
        remarks: `Purchase Return from Debit Note ${note.noteNumber}`,
      });
      if (tax > 0) {
        glLines.push({
          accountId: settings.defaultTaxAccountId!,
          debit: 0,
          credit: tax,
          remarks: `Input GST Reversal for Debit Note ${note.noteNumber}`,
        });
      }
    } else {
      glLines.push({
        accountId: settings.defaultPayableAccountId!,
        debit: total,
        credit: 0,
        partyType: "SUPPLIER",
        partyId: note.vendorId,
        remarks: `Vendor Credit Note ${note.noteNumber}`,
      });
      glLines.push({
        accountId: settings.defaultPurchaseAccountId!,
        debit: 0,
        credit: taxable,
        remarks: `Rebate/Discount from Credit Note ${note.noteNumber}`,
      });
      if (tax > 0) {
        glLines.push({
          accountId: settings.defaultTaxAccountId!,
          debit: 0,
          credit: tax,
          remarks: `Input GST adjustment for Credit Note ${note.noteNumber}`,
        });
      }
    }

    await postGLTransactions(tx, orgId, "VENDOR_NOTE", note.id, note.postingDate, glLines, note.branchId, userId);

    await tx.supplierLedgerEntry.create({
      data: {
        orgId,
        supplierId: note.vendorId,
        postingDate: note.postingDate,
        voucherType: "VENDOR_NOTE",
        voucherId: note.id,
        debit: new Prisma.Decimal(total),
        credit: new Prisma.Decimal(0),
        remarks: `${note.noteType} Note ${note.noteNumber}`,
      }
    });

    return tx.vendorNote.update({
      where: { id },
      data: { status: "SUBMITTED" }
    });
  });
  */
}

// 5. Recurring Entries Processing
function calculateNextDueDate(current: Date, frequency: string): Date {
  const next = new Date(current);
  switch (frequency.toUpperCase()) {
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
    default:
      next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export async function processRecurringExpenses(orgId: string, userId: string) {
  void orgId;
  void userId;
  throw new Error(
    "RECURRING_EXPENSE_POSTING_GATED: emit an approved immutable canonical Accounting request before generating financial effects",
  );
  /*
  const now = new Date();
  const templates = await db.recurringExpense.findMany({
    where: { orgId, isActive: true, nextDueDate: { lte: now } }
  });

  const settings = await db.accountingSettings.findUnique({ where: { orgId } });
  if (!settings?.defaultPayableAccountId) return;

  for (const t of templates) {
    const postingDate = new Date(t.nextDueDate);
    const count = await db.purchaseInvoice.count({ where: { orgId } });
    const billNumber = `REC-BILL-${1001 + count}`;
    const amountVal = Number(t.amount);
    const taxAmt = amountVal * (t.taxRate / 100);
    const grandTotal = amountVal + taxAmt;

    await db.$transaction(async (tx) => {
      if (t.autoPost) {
        const bill = await tx.purchaseInvoice.create({
          data: {
            orgId,
            branchId: t.branchId,
            invoiceNumber: billNumber,
            supplierId: t.vendorId,
            postingDate,
            dueDate: postingDate,
            status: "UNPAID",
            grandTotal: new Prisma.Decimal(grandTotal),
            paidAmount: new Prisma.Decimal(0),
            outstandingAmount: new Prisma.Decimal(grandTotal),
            discountAmount: new Prisma.Decimal(0),
            taxAmount: new Prisma.Decimal(taxAmt),
            remarks: t.narration || `Recurring expense template: ${t.templateName}`,
            createdById: userId,
            items: {
              create: [
                {
                  itemName: t.templateName,
                  qty: 1,
                  rate: t.amount,
                  amount: t.amount
                }
              ]
            }
          }
        });

        const glLines = [
          {
            accountId: settings.defaultPayableAccountId!,
            debit: 0,
            credit: grandTotal,
            partyType: "SUPPLIER",
            partyId: t.vendorId,
            remarks: `Recurring bill ${billNumber}`,
          },
          {
            accountId: t.expenseAccountId,
            debit: amountVal,
            credit: 0,
            remarks: `Periodic Expense ${billNumber}`,
          }
        ];

        if (taxAmt > 0 && settings.defaultTaxAccountId) {
          glLines.push({
            accountId: settings.defaultTaxAccountId,
            debit: taxAmt,
            credit: 0,
            remarks: `Input tax for recurring ${billNumber}`,
          });
        }

        await postGLTransactions(tx, orgId, "PURCHASE_INVOICE", bill.id, postingDate, glLines, t.branchId, userId);

        await tx.supplierLedgerEntry.create({
          data: {
            orgId,
            supplierId: t.vendorId,
            postingDate,
            voucherType: "PURCHASE_INVOICE",
            voucherId: bill.id,
            debit: new Prisma.Decimal(0),
            credit: new Prisma.Decimal(grandTotal),
            remarks: `Recurring bill ${billNumber}`,
          }
        });
      }

      const nextDate = calculateNextDueDate(postingDate, t.frequency);
      await tx.recurringExpense.update({
        where: { id: t.id },
        data: {
          nextDueDate: nextDate,
          isActive: t.endDate ? nextDate <= new Date(t.endDate) : true
        }
      });
    });
  }
  */
}

export async function processRecurringJournals(orgId: string, userId: string) {
  void orgId;
  void userId;
  throw new Error(
    "RECURRING_JOURNAL_POSTING_GATED: legacy auto-posting is blocked until the template emits an approved canonical Accounting request",
  );
  /*
  const now = new Date();
  const templates = await db.recurringJournal.findMany({
    where: { orgId, isActive: true, nextDueDate: { lte: now } }
  });

  for (const t of templates) {
    const postingDate = new Date(t.nextDueDate);
    const count = await db.journalEntry.count({ where: { orgId } });
    const voucherNo = `REC-JV-${1001 + count}`;
    const amountVal = Number(t.amount);

    await db.$transaction(async (tx) => {
      if (t.autoPost) {
        const jv = await tx.journalEntry.create({
          data: {
            orgId,
            branchId: t.branchId,
            voucherNo,
            postingDate,
            remarks: t.narration || `Recurring journal template: ${t.templateName}`,
            status: "SUBMITTED",
            totalDebit: t.amount,
            totalCredit: t.amount,
            createdById: userId,
            lines: {
              create: [
                {
                  accountId: t.debitAccountId,
                  debit: t.amount,
                  credit: new Prisma.Decimal(0),
                  remarks: t.narration
                },
                {
                  accountId: t.creditAccountId,
                  debit: new Prisma.Decimal(0),
                  credit: t.amount,
                  remarks: t.narration
                }
              ]
            }
          }
        });

        const glLines = [
          {
            accountId: t.debitAccountId,
            debit: amountVal,
            credit: 0,
            remarks: t.narration
          },
          {
            accountId: t.creditAccountId,
            debit: 0,
            credit: amountVal,
            remarks: t.narration
          }
        ];

        await postGLTransactions(tx, orgId, "JOURNAL_ENTRY", jv.id, postingDate, glLines, t.branchId, userId);
      }

      const nextDate = calculateNextDueDate(postingDate, t.frequency);
      await tx.recurringJournal.update({
        where: { id: t.id },
        data: {
          nextDueDate: nextDate,
          isActive: t.endDate ? nextDate <= new Date(t.endDate) : true
        }
      });
    });
  }
  */
}

// 6. Partner Accounts Services
export async function listPartnerAccounts(orgId: string) {
  return db.partnerAccount.findMany({
    where: { orgId },
    include: {
      capitalAccount: { select: { accountName: true, accountCode: true } },
      currentAccount: { select: { accountName: true, accountCode: true } }
    }
  });
}

export async function createPartnerAccount(orgId: string, data: any) {
  return db.partnerAccount.create({
    data: {
      orgId,
      partnerName: data.partnerName,
      partnerCode: data.partnerCode,
      capitalAccountId: data.capitalAccountId,
      currentAccountId: data.currentAccountId,
      profitSharingRatio: parseFloat(data.profitSharingRatio),
      interestOnCapital: parseFloat(data.interestOnCapital || 0),
      salary: new Prisma.Decimal(parseFloat(data.salary || 0)),
      drawings: new Prisma.Decimal(parseFloat(data.drawings || 0)),
      interestOnDrawings: parseFloat(data.interestOnDrawings || 0),
    }
  });
}

export async function updatePartnerAccount(orgId: string, id: string, data: any) {
  return db.partnerAccount.update({
    where: { id },
    data: {
      partnerName: data.partnerName,
      profitSharingRatio: parseFloat(data.profitSharingRatio),
      interestOnCapital: parseFloat(data.interestOnCapital || 0),
      salary: new Prisma.Decimal(parseFloat(data.salary || 0)),
      interestOnDrawings: parseFloat(data.interestOnDrawings || 0)
    }
  });
}

async function getOrCreateAccount(tx: any, orgId: string, name: string, code: string): Promise<string> {
  const cleanName = name.trim();
  const cleanCode = code.trim();

  const existing = await tx.account.findUnique({
    where: { orgId_accountCode: { orgId, accountCode: cleanCode } },
  });
  if (existing) return existing.id;

  const existingByName = await tx.account.findFirst({
    where: { orgId, accountName: { equals: cleanName, mode: "insensitive" } },
  });
  if (existingByName) return existingByName.id;

  let rootType = "EXPENSE";
  let accountType = "EXPENSE";
  if (cleanCode.startsWith("4")) {
    rootType = "INCOME";
    accountType = "SALES";
  } else if (cleanCode.startsWith("5")) {
    rootType = "EXPENSE";
    accountType = "EXPENSE";
  }

  const parent = await tx.account.findFirst({
    where: { orgId, rootType, isGroup: true },
    orderBy: { accountCode: "asc" },
  });

  const created = await tx.account.create({
    data: {
      orgId,
      accountCode: cleanCode,
      accountName: cleanName,
      rootType,
      accountType,
      isGroup: false,
      parentAccountId: parent?.id || null,
    },
  });
  return created.id;
}

export async function recordPartnerTransaction(orgId: string, partnerId: string, type: "DRAWINGS" | "CAPITAL_INTRODUCED" | "SALARY" | "INTEREST_ON_CAPITAL" | "INTEREST_ON_DRAWINGS", amount: number, userId: string) {
  void orgId;
  void partnerId;
  void type;
  void amount;
  void userId;
  throw new Error(
    "PARTNER_POSTING_GATED: configure versioned partner-account and approval policies before canonical posting",
  );
  /*
  const partner = await db.partnerAccount.findUnique({
    where: { id: partnerId },
    include: { capitalAccount: true, currentAccount: true }
  });
  if (!partner) throw new Error("Partner not found");

  const postingDate = new Date();
  const count = await db.journalEntry.count({ where: { orgId } });
  const voucherNo = `PARTNER-JV-${1001 + count}`;

  return db.$transaction(async (tx) => {
    let drAccountId = "";
    let crAccountId = "";
    let remarks = "";

    const settings = await db.accountingSettings.findUnique({ where: { orgId } });

    if (type === "DRAWINGS") {
      drAccountId = partner.currentAccountId;
      crAccountId = settings?.defaultBankAccountId || "";
      remarks = `Partner drawings: ${partner.partnerName}`;
      await tx.partnerAccount.update({
        where: { id: partnerId },
        data: { drawings: { increment: amount } }
      });
    } else if (type === "CAPITAL_INTRODUCED") {
      drAccountId = settings?.defaultBankAccountId || "";
      crAccountId = partner.capitalAccountId;
      remarks = `Partner capital introduction: ${partner.partnerName}`;
    } else if (type === "SALARY") {
      drAccountId = await getOrCreateAccount(tx, orgId, "Partner Remuneration Expense", "5810");
      crAccountId = partner.currentAccountId;
      remarks = `Partner salary allocation: ${partner.partnerName}`;
    } else if (type === "INTEREST_ON_CAPITAL") {
      drAccountId = await getOrCreateAccount(tx, orgId, "Interest on Partner Capital", "5820");
      crAccountId = partner.currentAccountId;
      remarks = `Interest on Capital: ${partner.partnerName}`;
    } else if (type === "INTEREST_ON_DRAWINGS") {
      drAccountId = partner.currentAccountId;
      crAccountId = await getOrCreateAccount(tx, orgId, "Interest on Drawings Income", "4610");
      remarks = `Interest charged on Drawings: ${partner.partnerName}`;
    }

    if (!drAccountId || !crAccountId) {
      throw new Error("Invalid accounts resolved for partner transaction. Please check bank/cash and partner settings.");
    }

    const jv = await tx.journalEntry.create({
      data: {
        orgId,
        voucherNo,
        postingDate,
        remarks,
        status: "SUBMITTED",
        totalDebit: new Prisma.Decimal(amount),
        totalCredit: new Prisma.Decimal(amount),
        createdById: userId,
        lines: {
          create: [
            {
              accountId: drAccountId,
              debit: new Prisma.Decimal(amount),
              credit: new Prisma.Decimal(0),
              remarks
            },
            {
              accountId: crAccountId,
              debit: new Prisma.Decimal(0),
              credit: new Prisma.Decimal(amount),
              remarks
            }
          ]
        }
      }
    });

    const glLines = [
      { accountId: drAccountId, debit: amount, credit: 0, remarks },
      { accountId: crAccountId, debit: 0, credit: amount, remarks }
    ];

    await postGLTransactions(tx, orgId, "JOURNAL_ENTRY", jv.id, postingDate, glLines, null, userId);
    return jv;
  });
  */
}

// 7. Job Costing & Register Services
export async function listJobCostings(orgId: string) {
  return db.jobCosting.findMany({
    where: { orgId },
    include: { customer: { select: { name: true } } },
    orderBy: { startDate: "desc" }
  });
}

export async function getJobCosting(orgId: string, id: string) {
  return db.jobCosting.findFirst({
    where: { id, orgId },
    include: {
      customer: true,
      salesInvoices: true,
      purchaseInvoices: true,
      glEntries: {
        include: { account: { select: { accountName: true, accountCode: true } } }
      }
    }
  });
}

export async function createJobCosting(orgId: string, data: any) {
  const count = await db.jobCosting.count({ where: { orgId } });
  const jobCode = `JOB-${1001 + count}`;
  return db.jobCosting.create({
    data: {
      orgId,
      branchId: data.branchId || null,
      jobCode,
      jobName: data.jobName,
      customerId: data.customerId,
      startDate: new Date(data.startDate),
      expectedEndDate: data.expectedEndDate ? new Date(data.expectedEndDate) : null,
      contractValue: new Prisma.Decimal(parseFloat(data.contractValue || 0)),
      status: "OPEN",
      costCentre: data.costCentre || null
    }
  });
}

export async function updateJobCosting(orgId: string, id: string, data: any) {
  return db.jobCosting.update({
    where: { id },
    data: {
      jobName: data.jobName,
      expectedEndDate: data.expectedEndDate ? new Date(data.expectedEndDate) : null,
      actualEndDate: data.actualEndDate ? new Date(data.actualEndDate) : null,
      contractValue: new Prisma.Decimal(parseFloat(data.contractValue || 0)),
      status: data.status,
      costCentre: data.costCentre || null
    }
  });
}

