import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { BANKING_ACCOUNT_KIND_OPTIONS } from "./banking-shared";
import { BANK_STATEMENT_COMPLETED_STATUSES } from "./banking-import";
import {
  listBankStatementImportHistory,
} from "./banking-statements-service";

import {
  addDecimalStrings,
  compareDecimalStrings,
  formatAccountingMoney,
  subtractDecimalStrings,
} from "./operational-helpers";
import { saveAccountingBankAccount } from "./configuration-admin";

const OVERVIEW_PAGE_SIZE = 25;
const WORKSPACE_PAGE_SIZE = 50;

export type BankingOverviewFilters = {
  dateFrom: string;
  dateTo: string;
  page: number;
  search: string;
  status: "active" | "inactive" | "all";
};

export type BankingWorkspaceFilters = {
  dateFrom: string;
  dateTo: string;
  page: number;
  search: string;
  view: "transactions" | "uncategorized";
  direction: "all" | "deposits" | "withdrawals";
};

export type BankingManageInput = {
  bankAccountId?: string;
  expectedVersion?: number;
  ledgerAccountId: string;
  name: string;
  bankName: string;
  branchName?: string | null;
  accountNumberMasked: string;
  ifsc?: string | null;
  currencyCode: string;
  accountKind: string;
  description?: string | null;
  isActive: boolean;
  reason: string;
};

type MoneyBucket = Record<string, string>;
type BankAccountConfiguration = {
  accountKind?: string;
  description?: string | null;
};

const BANKING_ACCOUNT_KINDS: ReadonlySet<string> = new Set(
  BANKING_ACCOUNT_KIND_OPTIONS.map((option) => option.value),
);

export function clampPage(page: number | string | null | undefined) {
  const numeric = Number(page);
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 1;
}

export function sanitizeSearchTerm(value: string | null | undefined) {
  return String(value ?? "").trim();
}

export function normalizeMaskedAccountIdentifier(value: string | null | undefined) {
  const source = String(value ?? "").trim();
  if (!source) return "";
  const digits = source.replace(/\D/g, "");
  if (/^[xX*•\s-]+$/.test(source)) return source.replace(/[xX*]/g, "•");
  if (source.startsWith("••••")) return source;
  if (/^[xX]{4,}/.test(source)) return `••••${source.replace(/\D/g, "").slice(-4)}`;
  if (digits.length >= 4) {
    return `••••${digits.slice(-4)}`;
  }
  return source;
}

export function accumulateMoney(bucket: MoneyBucket, currencyCode: string, amount: string) {
  bucket[currencyCode] = addDecimalStrings(bucket[currencyCode] ?? "0", amount);
}

export function bucketEntries(bucket: MoneyBucket) {
  return Object.entries(bucket)
    .map(([currencyCode, amount]) => ({ currencyCode, amount }))
    .sort((left, right) => left.currencyCode.localeCompare(right.currencyCode));
}

export function formatMoneyBuckets(bucket: MoneyBucket) {
  const entries = bucketEntries(bucket);
  if (entries.length === 0) return "—";
  return entries
    .map(({ currencyCode, amount }) => formatAccountingMoney(amount, currencyCode))
    .join(" · ");
}

export function deriveRunningBalances(
  openingBalance: string,
  rows: Array<{ debit: string; credit: string }>,
) {
  let running = openingBalance;
  return rows.map((row) => {
    running = addDecimalStrings(running, row.debit);
    running = subtractDecimalStrings(running, row.credit);
    return running;
  });
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseDateInput(value: string | null | undefined, fallback: Date) {
  const normalized = String(value ?? "").trim();
  const parsed = normalized ? new Date(`${normalized}T00:00:00.000Z`) : fallback;
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed;
}

function buildScopedBranchFilter(branchId: string | null | undefined) {
  if (!branchId) return undefined;
  return [{ branchId }, { branchId: null }];
}

function buildDateRange(dateFrom: string, dateTo: string) {
  const from = parseDateInput(dateFrom, new Date("2000-01-01"));
  const to = parseDateInput(dateTo, new Date());
  return { from, to };
}

function buildPostedLedgerWhere(
  orgId: string,
  accountIds: string[],
  branchId: string | null | undefined,
  to?: Date,
): Prisma.GeneralLedgerEntryWhereInput {
  return {
    orgId,
    accountId: { in: accountIds },
    isCancelled: false,
    ...(to ? { postingDate: { lte: to } } : {}),
    ...(branchId ? { OR: buildScopedBranchFilter(branchId) } : {}),
    OR: [{ journalEntryId: null }, { journalEntry: { status: "POSTED" } }],
  };
}

function parseBankAccountConfiguration(
  configuration: Prisma.JsonValue | null | undefined,
): BankAccountConfiguration {
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) {
    return {};
  }
  return configuration as BankAccountConfiguration;
}

function statementLineDateWhere(dateFrom: string, dateTo: string) {
  const { from, to } = buildDateRange(dateFrom, dateTo);
  return { gte: from, lte: to };
}

function buildVoucherHref(voucherType: string, voucherId: string) {
  switch (voucherType) {
    case "JOURNAL_ENTRY":
      return `/accounting/journal-entries/${voucherId}`;
    case "PAYMENT_ENTRY":
      return `/accounting/payment-entries/${voucherId}`;
    case "SALES_INVOICE":
      return `/accounting/sales-invoices/${voucherId}`;
    case "PURCHASE_INVOICE":
      return `/accounting/purchase-invoices/${voucherId}`;
    default:
      return null;
  }
}

function getBankAccountKind(configuration: Prisma.JsonValue | null | undefined) {
  const accountKind = parseBankAccountConfiguration(configuration).accountKind;
  return typeof accountKind === "string" && BANKING_ACCOUNT_KINDS.has(accountKind)
    ? accountKind
    : "BANK";
}

function getBankAccountDescription(configuration: Prisma.JsonValue | null | undefined) {
  const description = parseBankAccountConfiguration(configuration).description;
  return typeof description === "string" && description.trim() ? description.trim() : null;
}

function defaultBankAccountCode(ledgerAccountCode: string) {
  return `BANK_${String(ledgerAccountCode ?? "").trim().toUpperCase()}`;
}

function assertBankAccountKind(value: string) {
  if (!BANKING_ACCOUNT_KINDS.has(value)) {
    throw new Error("Unsupported bank account type.");
  }
  return value;
}

export function defaultBankingOverviewFilters(input: {
  dateFrom?: string | null;
  dateTo?: string | null;
  page?: string | null;
  search?: string | null;
  status?: string | null;
}): BankingOverviewFilters {
  const today = new Date();
  const last30 = new Date(today);
  last30.setDate(today.getDate() - 29);
  const status =
    input.status === "inactive" || input.status === "all" ? input.status : "active";
  return {
    dateFrom: input.dateFrom?.trim() || isoDate(last30),
    dateTo: input.dateTo?.trim() || isoDate(today),
    page: clampPage(input.page),
    search: sanitizeSearchTerm(input.search),
    status,
  };
}

export function defaultBankingWorkspaceFilters(input: {
  dateFrom?: string | null;
  dateTo?: string | null;
  page?: string | null;
  search?: string | null;
  view?: string | null;
  direction?: string | null;
}): BankingWorkspaceFilters {
  const today = new Date();
  const last90 = new Date(today);
  last90.setDate(today.getDate() - 89);
  return {
    dateFrom: input.dateFrom?.trim() || isoDate(last90),
    dateTo: input.dateTo?.trim() || isoDate(today),
    page: clampPage(input.page),
    search: sanitizeSearchTerm(input.search),
    view: input.view === "uncategorized" ? "uncategorized" : "transactions",
    direction:
      input.direction === "deposits" || input.direction === "withdrawals"
        ? input.direction
        : "all",
  };
}

export async function listBankingLedgerOptions(orgId: string, branchId?: string | null) {
  return db.account.findMany({
    where: {
      orgId,
      isActive: true,
      isGroup: false,
      accountType: "BANK",
      ...(branchId
        ? {
            OR: buildScopedBranchFilter(branchId),
          }
        : {}),
    },
    orderBy: [{ accountCode: "asc" }, { accountName: "asc" }],
    select: {
      id: true,
      legalEntityId: true,
      branchId: true,
      accountCode: true,
      accountName: true,
      branch: { select: { name: true } },
    },
  });
}

export async function listBankingAccountOptions(
  orgId: string,
  branchId?: string | null,
  includeInactive = false,
) {
  return db.accountingBankAccount.findMany({
    where: {
      orgId,
      ...(includeInactive ? {} : { isActive: true }),
      ...(branchId
        ? {
            ledgerAccount: {
              OR: buildScopedBranchFilter(branchId),
            },
          }
        : {}),
    },
    orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
    select: {
      id: true,
      ledgerAccountId: true,
      name: true,
      bankName: true,
      currencyCode: true,
      isActive: true,
    },
  });
}

function supportsImportedBankBalance(status: string | null | undefined) {
  return status ? BANK_STATEMENT_COMPLETED_STATUSES.has(status) : false;
}

function statementImportStatusWhere() {
  return { in: Array.from(BANK_STATEMENT_COMPLETED_STATUSES) };
}

export async function listBankingReferenceData(orgId: string, branchId?: string | null) {
  const [organisationProfile, legalEntities, ledgerAccounts, bankAccounts] = await Promise.all([
    db.accountingOrganisationProfile.findUnique({
      where: { orgId },
      select: { functionalCurrencyCode: true },
    }),
    db.accountingLegalEntity.findMany({
      where: { orgId, status: "ACTIVE" },
      orderBy: [{ isDefault: "desc" }, { code: "asc" }],
      select: { id: true, code: true, legalName: true, isDefault: true },
    }),
    listBankingLedgerOptions(orgId, branchId),
    listBankingAccountOptions(orgId, branchId, true),
  ]);

  return {
    functionalCurrencyCode: organisationProfile?.functionalCurrencyCode ?? "INR",
    legalEntities,
    ledgerAccounts,
    bankAccounts,
    mappedLedgerAccountIds: bankAccounts
      .map((account) => account.ledgerAccountId)
      .filter((ledgerAccountId): ledgerAccountId is string => Boolean(ledgerAccountId)),
    accountKinds: BANKING_ACCOUNT_KIND_OPTIONS,
  };
}

export async function getBankingOverviewData(
  orgId: string,
  branchId: string | null | undefined,
  filters: BankingOverviewFilters,
) {
  const scopedBranches = buildScopedBranchFilter(branchId);
  const { to } = buildDateRange(filters.dateFrom, filters.dateTo);
  const search = filters.search;
  const skip = (filters.page - 1) * OVERVIEW_PAGE_SIZE;
  const activeWhere =
    filters.status === "all"
      ? undefined
      : filters.status === "inactive"
        ? false
        : true;

  const baseWhere: Prisma.AccountingBankAccountWhereInput = {
    orgId,
    ...(activeWhere === undefined ? {} : { isActive: activeWhere }),
    ...(search
      ? {
          OR: [
            { code: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            { bankName: { contains: search, mode: "insensitive" } },
            { accountNumberMasked: { contains: search, mode: "insensitive" } },
            { ledgerAccount: { accountCode: { contains: search, mode: "insensitive" } } },
            { ledgerAccount: { accountName: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(branchId
      ? {
          ledgerAccount: {
            OR: scopedBranches,
          },
        }
      : {}),
  };

  const [profile, total, bankAccounts, cashAccounts] = await Promise.all([
    db.accountingOrganisationProfile.findUnique({
      where: { orgId },
      select: { functionalCurrencyCode: true },
    }),
    db.accountingBankAccount.count({ where: baseWhere }),
    db.accountingBankAccount.findMany({
      where: baseWhere,
      orderBy: [
        { isPrimary: "desc" },
        { name: "asc" },
        { createdAt: "asc" },
      ],
      skip,
      take: OVERVIEW_PAGE_SIZE,
      include: {
        ledgerAccount: {
          select: {
            id: true,
            accountCode: true,
            accountName: true,
            branchId: true,
            branch: { select: { name: true } },
            openingDebit: true,
            openingCredit: true,
          },
        },
        statementImports: {
          where: {
            statementEnd: { lte: to },
            importStatus: statementImportStatusWhere(),
          },
          orderBy: [{ statementEnd: "desc" }, { createdAt: "desc" }],
          take: 1,
          select: {
            id: true,
            statementEnd: true,
            closingBalance: true,
            importStatus: true,
          },
        },
      },
    }),
    db.account.findMany({
      where: {
        orgId,
        isActive: true,
        isGroup: false,
        accountType: "CASH",
        ...(branchId ? { OR: scopedBranches } : {}),
      },
      select: {
        id: true,
        openingDebit: true,
        openingCredit: true,
      },
    }),
  ]);

  const bankLedgerIds = bankAccounts.map((account) => account.ledgerAccountId);
  const cashLedgerIds = cashAccounts.map((account) => account.id);
  const allLedgerIds = [...bankLedgerIds, ...cashLedgerIds];

  const [ledgerSums, uncategorizedGroups] = await Promise.all([
    allLedgerIds.length
      ? db.generalLedgerEntry.groupBy({
          by: ["accountId"],
          where: buildPostedLedgerWhere(orgId, allLedgerIds, branchId, to),
          _sum: { debit: true, credit: true },
        })
      : Promise.resolve([]),
    bankAccounts.length
      ? db.accountingBankStatementLine.groupBy({
          by: ["bankAccountId"],
          where: {
            orgId,
            bankAccountId: { in: bankAccounts.map((account) => account.id) },
            reconciliationStatus: "UNMATCHED",
            lineDate: statementLineDateWhere(filters.dateFrom, filters.dateTo),
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  const ledgerMap = new Map(
    ledgerSums.map((row) => [
      row.accountId,
      {
        debit: row._sum.debit?.toString() ?? "0",
        credit: row._sum.credit?.toString() ?? "0",
      },
    ]),
  );
  const uncategorizedMap = new Map(
    uncategorizedGroups.map((row) => [row.bankAccountId, row._count._all]),
  );

  const cashSummary: MoneyBucket = {};
  const bankSummary: MoneyBucket = {};

  for (const cashAccount of cashAccounts) {
    const sums = ledgerMap.get(cashAccount.id);
    const balance = subtractDecimalStrings(
      addDecimalStrings(
        cashAccount.openingDebit.toString(),
        sums?.debit ?? "0",
      ),
      addDecimalStrings(
        cashAccount.openingCredit.toString(),
        sums?.credit ?? "0",
      ),
    );
    accumulateMoney(
      cashSummary,
      profile?.functionalCurrencyCode ?? "INR",
      balance,
    );
  }

  const rows = bankAccounts.map((account) => {
    const sums = ledgerMap.get(account.ledgerAccountId);
    const amountInBooks = subtractDecimalStrings(
      addDecimalStrings(
        account.ledgerAccount.openingDebit.toString(),
        sums?.debit ?? "0",
      ),
      addDecimalStrings(
        account.ledgerAccount.openingCredit.toString(),
        sums?.credit ?? "0",
      ),
    );
    accumulateMoney(bankSummary, account.currencyCode, amountInBooks);

    const latestStatement =
      account.statementImports.find(
        (statement) =>
          supportsImportedBankBalance(statement.importStatus) &&
          statement.closingBalance != null,
      ) ?? null;

    return {
      id: account.id,
      code: account.code,
      name: account.name,
      bankName: account.bankName,
      branchName: account.branchName,
      maskedIdentifier: normalizeMaskedAccountIdentifier(account.accountNumberMasked),
      currencyCode: account.currencyCode,
      accountKind: getBankAccountKind(account.configuration),
      description: getBankAccountDescription(account.configuration),
      isActive: account.isActive,
      isPrimary: account.isPrimary,
      ledgerAccountId: account.ledgerAccountId,
      ledgerAccountCode: account.ledgerAccount.accountCode,
      ledgerAccountName: account.ledgerAccount.accountName,
      locationName: account.ledgerAccount.branch?.name ?? "All locations",
      uncategorizedCount: uncategorizedMap.get(account.id) ?? 0,
      amountInBooks,
      amountInBank: latestStatement?.closingBalance?.toString() ?? null,
      amountInBankAsOf: latestStatement?.statementEnd
        ? latestStatement.statementEnd.toISOString()
        : null,
      lastImportStatus: latestStatement?.importStatus ?? null,
      rowVersion: account.rowVersion,
    };
  });

  const statementHistory = await listBankStatementImportHistory({
    orgId,
    branchId,
    limit: 20,
  });

  return {
    filters,
    pageSize: OVERVIEW_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / OVERVIEW_PAGE_SIZE)),
    total,
    summary: {
      cashInHand: bucketEntries(cashSummary),
      bankBalance: bucketEntries(bankSummary),
    },
    rows,
    statementHistory,
    functionalCurrencyCode: profile?.functionalCurrencyCode ?? "INR",
  };
}

export async function getBankAccountById(
  orgId: string,
  branchId: string | null | undefined,
  bankAccountId: string,
) {
  return db.accountingBankAccount.findFirst({
    where: {
      id: bankAccountId,
      orgId,
      ...(branchId
        ? {
            ledgerAccount: {
              OR: buildScopedBranchFilter(branchId),
            },
          }
        : {}),
    },
    include: {
      ledgerAccount: {
        select: {
          id: true,
          legalEntityId: true,
          branchId: true,
          accountCode: true,
          accountName: true,
          openingDebit: true,
          openingCredit: true,
          branch: { select: { name: true } },
        },
      },
    },
  });
}

export async function saveManualBankAccount(
  orgId: string,
  actorId: string,
  branchId: string | null | undefined,
  input: BankingManageInput,
) {
  const currencyCode = String(input.currencyCode ?? "").trim().toUpperCase();
  const accountKind = assertBankAccountKind(String(input.accountKind ?? "").trim());
  let ledgerAccount = await db.account.findFirst({
    where: {
      id: input.ledgerAccountId,
      orgId,
      isActive: true,
      isGroup: false,
      accountType: "BANK",
      ...(branchId ? { OR: buildScopedBranchFilter(branchId) } : {}),
    },
    select: {
      id: true,
      legalEntityId: true,
      accountCode: true,
    },
  });
  if (!ledgerAccount) {
    throw new Error("Selected bank ledger account is not available.");
  }
  const defaultLegalEntity = !ledgerAccount.legalEntityId
    ? await db.accountingLegalEntity.findFirst({
        where: { orgId, status: "ACTIVE", isDefault: true },
      select: { id: true },
      })
    : null;

  if (!ledgerAccount?.legalEntityId && defaultLegalEntity?.id) {
    ledgerAccount = await db.account.update({
      where: { id: ledgerAccount.id },
      data: { legalEntityId: defaultLegalEntity.id },
      select: {
        id: true,
        legalEntityId: true,
        accountCode: true,
      },
    });
  }

  const existing =
    input.bankAccountId != null
      ? await getBankAccountById(orgId, branchId, input.bankAccountId)
      : null;
  if (input.bankAccountId && !existing) {
    throw new Error("Bank account not found.");
  }
  const duplicateLedgerMapping = await db.accountingBankAccount.findFirst({
    where: {
      orgId,
      ledgerAccountId: input.ledgerAccountId,
      ...(input.bankAccountId ? { id: { not: input.bankAccountId } } : {}),
    },
    select: { id: true },
  });
  if (duplicateLedgerMapping) {
    throw new Error("This bank ledger is already mapped to another Banking account.");
  }

  if (
    existing &&
    (existing.ledgerAccountId !== input.ledgerAccountId ||
      existing.currencyCode !== currencyCode)
  ) {
    const dependentActivityCount = await Promise.all([
      db.generalLedgerEntry.count({
        where: buildPostedLedgerWhere(orgId, [existing.ledgerAccountId], branchId),
      }),
      db.accountingBankStatementImport.count({
        where: { orgId, bankAccountId: existing.id },
      }),
      db.accountingBankStatementLine.count({
        where: { orgId, bankAccountId: existing.id },
      }),
    ]).then((counts) => counts.reduce((sum, count) => sum + count, 0));

    if (dependentActivityCount > 0) {
      throw new Error(
        "Currency and ledger mapping cannot be changed after Banking activity exists.",
      );
    }
  }

  const configuration = JSON.stringify({
    accountKind,
    description: String(input.description ?? "").trim() || null,
  });

  return saveAccountingBankAccount({
    id: input.bankAccountId,
    orgId,
    actorId,
    legalEntityId:
      ledgerAccount.legalEntityId ??
      existing?.legalEntityId ??
      defaultLegalEntity?.id ??
      "",
    taxRegistrationId: existing?.taxRegistrationId ?? null,
    ledgerAccountId: input.ledgerAccountId,
    expectedVersion: input.expectedVersion,
    code: existing?.code ?? defaultBankAccountCode(ledgerAccount.accountCode),
    name: input.name,
    bankName: input.bankName,
    branchName: input.branchName,
    accountNumberMasked: normalizeMaskedAccountIdentifier(input.accountNumberMasked),
    ifsc: input.ifsc,
    currencyCode,
    isPrimary: existing?.isPrimary ?? false,
    configurationJson: configuration,
    statutoryValidated: existing?.statutoryValidated ?? false,
    effectiveFrom: existing?.effectiveFrom
      ? dateOnly(existing.effectiveFrom)
      : dateOnly(new Date()),
    effectiveTo: existing?.effectiveTo
      ? dateOnly(existing.effectiveTo)
      : null,
    isActive: input.isActive,
    reason: input.reason,
  });
}

export async function markBankAccountInactive(
  orgId: string,
  actorId: string,
  branchId: string | null | undefined,
  bankAccountId: string,
  reason: string,
) {
  const existing = await getBankAccountById(orgId, branchId, bankAccountId);
  if (!existing) throw new Error("Bank account not found.");
  if (!existing.isActive) {
    return existing;
  }

  return saveAccountingBankAccount({
    id: existing.id,
    orgId,
    actorId,
    legalEntityId: existing.legalEntityId,
    taxRegistrationId: existing.taxRegistrationId,
    ledgerAccountId: existing.ledgerAccountId,
    expectedVersion: existing.rowVersion,
    code: existing.code,
    name: existing.name,
    bankName: existing.bankName,
    branchName: existing.branchName,
    accountNumberMasked: existing.accountNumberMasked,
    ifsc: existing.ifsc,
    currencyCode: existing.currencyCode,
    isPrimary: existing.isPrimary,
    configurationJson: existing.configuration ? JSON.stringify(existing.configuration) : null,
    statutoryValidated: existing.statutoryValidated,
    effectiveFrom: dateOnly(existing.effectiveFrom),
    effectiveTo: existing.effectiveTo
      ? dateOnly(existing.effectiveTo)
      : null,
    isActive: false,
    reason,
  });
}

export async function getBankAccountWorkspaceData(
  orgId: string,
  branchId: string | null | undefined,
  bankAccountId: string,
  filters: BankingWorkspaceFilters,
) {
  const bankAccount = await getBankAccountById(orgId, branchId, bankAccountId);
  if (!bankAccount) {
    throw new Error("Bank account not found.");
  }

  const { from, to } = buildDateRange(filters.dateFrom, filters.dateTo);
  const skip = (filters.page - 1) * WORKSPACE_PAGE_SIZE;
  const search = filters.search;

  const rowWhere: Prisma.GeneralLedgerEntryWhereInput = {
    ...buildPostedLedgerWhere(orgId, [bankAccount.ledgerAccountId], branchId),
    accountId: bankAccount.ledgerAccountId,
    postingDate: { gte: from, lte: to },
    ...(search
      ? {
          OR: [
            { voucherType: { contains: search, mode: "insensitive" } },
            { voucherId: { contains: search, mode: "insensitive" } },
            { remarks: { contains: search, mode: "insensitive" } },
            {
              journalEntry: {
                voucherNo: { contains: search, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };
  const beforeWhere: Prisma.GeneralLedgerEntryWhereInput = {
    ...buildPostedLedgerWhere(orgId, [bankAccount.ledgerAccountId], branchId),
    accountId: bankAccount.ledgerAccountId,
    postingDate: { lt: from },
  };

  const uncategorizedWhere: Prisma.AccountingBankStatementLineWhereInput = {
    orgId,
    bankAccountId,
    reconciliationStatus: "UNMATCHED",
    lineDate: statementLineDateWhere(filters.dateFrom, filters.dateTo),
    import: {
      importStatus: statementImportStatusWhere(),
    },
    ...(search
      ? {
          OR: [
            { description: { contains: search, mode: "insensitive" } },
            { reference: { contains: search, mode: "insensitive" } },
            { import: { sourceFileName: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(filters.direction === "deposits"
      ? { debitAmount: { gt: 0 } }
      : filters.direction === "withdrawals"
        ? { creditAmount: { gt: 0 } }
        : {}),
  };

  const [
    total,
    rows,
    openingHistory,
    amountInBankGroup,
    uncategorizedCount,
    uncategorizedTotal,
    uncategorizedRows,
    statementHistory,
  ] =
    await Promise.all([
      db.generalLedgerEntry.count({ where: rowWhere }),
      filters.view === "transactions"
        ? db.generalLedgerEntry.findMany({
            where: rowWhere,
            orderBy: [{ postingDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
            skip,
            take: WORKSPACE_PAGE_SIZE,
            include: {
              branch: { select: { name: true } },
              journalEntry: { select: { id: true, voucherNo: true, status: true } },
            },
          })
        : Promise.resolve([]),
      db.generalLedgerEntry.aggregate({
        where: beforeWhere,
        _sum: { debit: true, credit: true },
      }),
      db.accountingBankStatementImport.findFirst({
        where: {
          orgId,
          bankAccountId,
          statementEnd: { lte: to },
          importStatus: statementImportStatusWhere(),
        },
        orderBy: [{ statementEnd: "desc" }, { createdAt: "desc" }],
        select: {
          closingBalance: true,
          statementEnd: true,
          importStatus: true,
        },
      }),
      db.accountingBankStatementLine.count({
        where: {
          orgId,
          bankAccountId,
          reconciliationStatus: "UNMATCHED",
          import: {
            importStatus: statementImportStatusWhere(),
          },
          lineDate: statementLineDateWhere(filters.dateFrom, filters.dateTo),
        },
      }),
      filters.view === "uncategorized"
        ? db.accountingBankStatementLine.count({ where: uncategorizedWhere })
        : Promise.resolve(0),
      filters.view === "uncategorized"
        ? db.accountingBankStatementLine.findMany({
            where: uncategorizedWhere,
            orderBy: [{ lineDate: "desc" }, { sequenceNumber: "desc" }, { id: "desc" }],
            skip,
            take: WORKSPACE_PAGE_SIZE,
            include: {
              import: {
                select: {
                  id: true,
                  sourceFileName: true,
                  statementEnd: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      listBankStatementImportHistory({
        orgId,
        branchId,
        bankAccountId,
        limit: 10,
      }),
    ]);

  const pageCarry =
    skip > 0 && rows[0]
      ? await db.generalLedgerEntry.aggregate({
          where: {
            AND: [
              rowWhere,
              {
                OR: [
                  { postingDate: { lt: rows[0].postingDate } },
                  {
                    postingDate: rows[0].postingDate,
                    createdAt: { lt: rows[0].createdAt },
                  },
                  {
                    postingDate: rows[0].postingDate,
                    createdAt: rows[0].createdAt,
                    id: { lt: rows[0].id },
                  },
                ],
              },
            ],
          },
          _sum: { debit: true, credit: true },
        })
      : null;

  const openingBalance = subtractDecimalStrings(
    addDecimalStrings(
      bankAccount.ledgerAccount.openingDebit.toString(),
      openingHistory._sum.debit?.toString() ?? "0",
    ),
    addDecimalStrings(
      bankAccount.ledgerAccount.openingCredit.toString(),
      openingHistory._sum.credit?.toString() ?? "0",
    ),
  );
  const pageOpeningBalance = pageCarry
    ? subtractDecimalStrings(
        addDecimalStrings(
          openingBalance,
          pageCarry._sum.debit?.toString() ?? "0",
        ),
        pageCarry._sum.credit?.toString() ?? "0",
      )
    : openingBalance;
  const runningBalances = deriveRunningBalances(
    pageOpeningBalance,
    rows.map((row) => ({
      debit: row.debit.toString(),
      credit: row.credit.toString(),
    })),
  );
  const currentBookBalance = runningBalances.at(-1) ?? pageOpeningBalance;
  const latestImportedBalance =
    amountInBankGroup && supportsImportedBankBalance(amountInBankGroup.importStatus)
      ? amountInBankGroup
      : null;

  return {
    bankAccount: {
      id: bankAccount.id,
      ledgerAccountId: bankAccount.ledgerAccountId,
      code: bankAccount.code,
      name: bankAccount.name,
      bankName: bankAccount.bankName,
      branchName: bankAccount.branchName,
      maskedIdentifier: normalizeMaskedAccountIdentifier(bankAccount.accountNumberMasked),
      currencyCode: bankAccount.currencyCode,
      accountKind: getBankAccountKind(bankAccount.configuration),
      description: getBankAccountDescription(bankAccount.configuration),
      isActive: bankAccount.isActive,
      locationName: bankAccount.ledgerAccount.branch?.name ?? "All locations",
      ledgerAccountCode: bankAccount.ledgerAccount.accountCode,
      ledgerAccountName: bankAccount.ledgerAccount.accountName,
      rowVersion: bankAccount.rowVersion,
    },
    filters,
    pageSize: WORKSPACE_PAGE_SIZE,
    pageCount: Math.max(
      1,
      Math.ceil(
        (filters.view === "uncategorized" ? uncategorizedTotal : total) /
          WORKSPACE_PAGE_SIZE,
      ),
    ),
    total: filters.view === "uncategorized" ? uncategorizedTotal : total,
    amountInBooks: currentBookBalance,
    amountInBank: latestImportedBalance?.closingBalance?.toString() ?? null,
    amountInBankAsOf: latestImportedBalance?.statementEnd?.toISOString() ?? null,
    uncategorizedCount,
    openingBalance: pageOpeningBalance,
    currentView: filters.view,
    direction: filters.direction,
    rows: rows.map((row, index) => ({
      id: row.id,
      postingDate: row.postingDate.toISOString(),
      reference:
        row.journalEntry?.voucherNo ??
        `${row.voucherType}-${row.voucherId.slice(-8).toUpperCase()}`,
      voucherType: row.voucherType,
      voucherId: row.voucherId,
      status:
        row.journalEntry?.status ??
        (compareDecimalStrings(row.credit.toString(), "0") > 0 ? "POSTED" : "POSTED"),
      locationName: row.branch?.name ?? bankAccount.ledgerAccount.branch?.name ?? "All locations",
      deposits: row.debit.toString(),
      withdrawals: row.credit.toString(),
      runningBalance: runningBalances[index] ?? pageOpeningBalance,
      remarks: row.remarks,
      href: buildVoucherHref(row.voucherType, row.voucherId),
    })),
    uncategorizedRows: uncategorizedRows.map((row) => ({
      id: row.id,
      lineDate: row.lineDate.toISOString(),
      description: row.description,
      reference: row.reference,
      deposits: row.debitAmount?.toString() ?? "0",
      withdrawals: row.creditAmount?.toString() ?? "0",
      reviewStatus: row.reconciliationStatus,
      sourceFileName: row.import.sourceFileName,
      sourceImportId: row.import.id,
      sourceStatementEnd: row.import.statementEnd?.toISOString() ?? null,
    })),
    statementHistory,
  };
}
