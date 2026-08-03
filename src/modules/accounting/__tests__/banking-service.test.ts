import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockedDb, saveAccountingBankAccount } = vi.hoisted(() => ({
  mockedDb: {
    account: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    accountingBankAccount: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    accountingBankStatementImport: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    accountingBankStatementLine: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    accountingLegalEntity: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    accountingOrganisationProfile: {
      findUnique: vi.fn(),
    },
    generalLedgerEntry: {
      aggregate: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
  },
  saveAccountingBankAccount: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: mockedDb,
}));

vi.mock("../configuration-admin", () => ({
  saveAccountingBankAccount,
}));

import {
  accumulateMoney,
  bucketEntries,
  defaultBankingOverviewFilters,
  defaultBankingWorkspaceFilters,
  deriveRunningBalances,
  formatMoneyBuckets,
  getBankAccountWorkspaceData,
  getBankingOverviewData,
  markBankAccountInactive,
  normalizeMaskedAccountIdentifier,
  saveManualBankAccount,
} from "../banking-service";

describe("banking-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveAccountingBankAccount.mockReset();
    mockedDb.accountingBankStatementImport.findMany.mockResolvedValue([]);
  });

  it("masks account identifiers for null, blank, short, masked, and malformed inputs", () => {
    expect(normalizeMaskedAccountIdentifier(null)).toBe("");
    expect(normalizeMaskedAccountIdentifier("   ")).toBe("");
    expect(normalizeMaskedAccountIdentifier("12")).toBe("12");
    expect(normalizeMaskedAccountIdentifier("1234567890")).toBe("••••7890");
    expect(normalizeMaskedAccountIdentifier("xxxx-0088")).toBe("••••0088");
    expect(normalizeMaskedAccountIdentifier("••••175")).toBe("••••175");
    expect(normalizeMaskedAccountIdentifier("****----")).toBe("••••----");
  });

  it("aggregates totals by currency without floating-point arithmetic", () => {
    const bucket: Record<string, string> = {};
    accumulateMoney(bucket, "INR", "10.25");
    accumulateMoney(bucket, "INR", "2.75");
    accumulateMoney(bucket, "USD", "4.50");

    expect(bucketEntries(bucket)).toEqual([
      { currencyCode: "INR", amount: "13" },
      { currencyCode: "USD", amount: "4.5" },
    ]);
    expect(formatMoneyBuckets(bucket)).toContain("INR 13.00");
    expect(formatMoneyBuckets(bucket)).toContain("USD 4.50");
  });

  it("calculates stable running balances from an opening carry-forward", () => {
    expect(
      deriveRunningBalances("100.00", [
        { debit: "25.00", credit: "0" },
        { debit: "0", credit: "12.50" },
        { debit: "5.00", credit: "0" },
      ]),
    ).toEqual(["125", "112.5", "117.5"]);
  });

  it("normalizes default Banking filters", () => {
    const overview = defaultBankingOverviewFilters({
      page: "3",
      search: " Axis ",
      status: "inactive",
    });
    const workspace = defaultBankingWorkspaceFilters({
      page: "2",
      search: " opening ",
    });

    expect(overview.page).toBe(3);
    expect(overview.search).toBe("Axis");
    expect(overview.status).toBe("inactive");
    expect(overview.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(workspace.page).toBe(2);
    expect(workspace.search).toBe("opening");
    expect(workspace.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("keeps Amount in Bank distinct from Amount in Books and groups summaries by currency", async () => {
    mockedDb.accountingOrganisationProfile.findUnique.mockResolvedValue({
      functionalCurrencyCode: "INR",
    });
    mockedDb.accountingBankAccount.count.mockResolvedValue(1);
    mockedDb.accountingBankAccount.findMany.mockResolvedValue([
      {
        id: "bank_1",
        orgId: "org_1",
        legalEntityId: "legal_1",
        taxRegistrationId: null,
        ledgerAccountId: "ledger_bank_1",
        code: "BANK001",
        name: "Operations Bank",
        bankName: "Operations Bank",
        branchName: "Chennai",
        accountNumberMasked: "1234567890",
        ifsc: null,
        currencyCode: "USD",
        isPrimary: true,
        configuration: { accountKind: "CURRENT", description: "Primary account" },
        statutoryValidated: true,
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        effectiveTo: null,
        isActive: true,
        rowVersion: 3,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        ledgerAccount: {
          id: "ledger_bank_1",
          accountCode: "1120",
          accountName: "Operations Bank Ledger",
          branchId: "branch_1",
          branch: { name: "Chennai" },
          openingDebit: { toString: () => "100.00" },
          openingCredit: { toString: () => "0" },
        },
        statementImports: [
          {
            id: "import_1",
            statementEnd: new Date("2026-07-31T00:00:00.000Z"),
            closingBalance: { toString: () => "95.00" },
            importStatus: "VERIFIED",
          },
        ],
      },
    ]);
    mockedDb.account.findMany.mockResolvedValue([
      {
        id: "cash_1",
        openingDebit: { toString: () => "50.00" },
        openingCredit: { toString: () => "0" },
      },
    ]);
    mockedDb.generalLedgerEntry.groupBy.mockResolvedValue([
      {
        accountId: "ledger_bank_1",
        _sum: {
          debit: { toString: () => "20.00" },
          credit: { toString: () => "5.00" },
        },
      },
      {
        accountId: "cash_1",
        _sum: {
          debit: { toString: () => "10.00" },
          credit: { toString: () => "2.00" },
        },
      },
    ]);
    mockedDb.accountingBankStatementLine.groupBy.mockResolvedValue([
      { bankAccountId: "bank_1", _count: { _all: 4 } },
    ]);

    const overview = await getBankingOverviewData("org_1", "branch_1", {
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
      page: 1,
      search: "",
      status: "active",
    });

    expect(overview.summary.cashInHand).toEqual([{ currencyCode: "INR", amount: "58" }]);
    expect(overview.summary.bankBalance).toEqual([{ currencyCode: "USD", amount: "115" }]);
    expect(overview.rows[0]).toMatchObject({
      maskedIdentifier: "••••7890",
      amountInBooks: "115",
      amountInBank: "95.00",
      uncategorizedCount: 4,
      currencyCode: "USD",
    });
    expect(mockedDb.generalLedgerEntry.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ journalEntryId: null }, { journalEntry: { status: "POSTED" } }],
        }),
      }),
    );
  });

  it("filters overview rows to active accounts by default", async () => {
    mockedDb.accountingOrganisationProfile.findUnique.mockResolvedValue({
      functionalCurrencyCode: "INR",
    });
    mockedDb.accountingBankAccount.count.mockResolvedValue(0);
    mockedDb.accountingBankAccount.findMany.mockResolvedValue([]);
    mockedDb.account.findMany.mockResolvedValue([]);
    mockedDb.generalLedgerEntry.groupBy.mockResolvedValue([]);
    mockedDb.accountingBankStatementLine.groupBy.mockResolvedValue([]);

    await getBankingOverviewData("org_1", null, {
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
      page: 1,
      search: "",
      status: "active",
    });

    expect(mockedDb.accountingBankAccount.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ orgId: "org_1", isActive: true }),
      }),
    );
  });

  it("rejects duplicate ledger mappings before persistence", async () => {
    mockedDb.account.findFirst.mockResolvedValue({
      id: "ledger_1",
      legalEntityId: "legal_1",
      accountCode: "1120",
    });
    mockedDb.accountingBankAccount.findFirst.mockResolvedValueOnce({
      id: "duplicate_bank",
    });

    await expect(
      saveManualBankAccount("org_1", "user_1", "branch_1", {
        ledgerAccountId: "ledger_1",
        name: "Bank Alpha",
        bankName: "Bank Alpha",
        branchName: "Chennai",
        accountNumberMasked: "1234567890",
        ifsc: "ABCD0001",
        currencyCode: "INR",
        accountKind: "CURRENT",
        description: "",
        isActive: true,
        reason: "create",
      }),
    ).rejects.toThrow(/already mapped/i);
    expect(saveAccountingBankAccount).not.toHaveBeenCalled();
  });

  it("rejects unsafe currency changes after dependent Banking activity exists", async () => {
    mockedDb.account.findFirst.mockResolvedValue({
      id: "ledger_1",
      legalEntityId: "legal_1",
      accountCode: "1120",
    });
    mockedDb.accountingBankAccount.findFirst
      .mockResolvedValueOnce({
        id: "bank_1",
        orgId: "org_1",
        legalEntityId: "legal_1",
        taxRegistrationId: null,
        ledgerAccountId: "ledger_1",
        code: "BANK001",
        name: "Bank Alpha",
        bankName: "Bank Alpha",
        branchName: "Chennai",
        accountNumberMasked: "••••7890",
        ifsc: null,
        currencyCode: "INR",
        isPrimary: false,
        configuration: { accountKind: "CURRENT" },
        statutoryValidated: true,
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        effectiveTo: null,
        isActive: true,
        rowVersion: 4,
        ledgerAccount: {
          id: "ledger_1",
          legalEntityId: "legal_1",
          branchId: "branch_1",
          accountCode: "1120",
          accountName: "Bank Ledger",
          openingDebit: { toString: () => "0" },
          openingCredit: { toString: () => "0" },
          branch: { name: "Chennai" },
        },
      })
      .mockResolvedValueOnce(null);
    mockedDb.generalLedgerEntry.count.mockResolvedValue(1);
    mockedDb.accountingBankStatementImport.count.mockResolvedValue(0);
    mockedDb.accountingBankStatementLine.count.mockResolvedValue(0);

    await expect(
      saveManualBankAccount("org_1", "user_1", "branch_1", {
        bankAccountId: "bank_1",
        expectedVersion: 4,
        ledgerAccountId: "ledger_1",
        name: "Bank Alpha",
        bankName: "Bank Alpha",
        branchName: "Chennai",
        accountNumberMasked: "••••7890",
        ifsc: "",
        currencyCode: "USD",
        accountKind: "CURRENT",
        description: "",
        isActive: true,
        reason: "edit",
      }),
    ).rejects.toThrow(/cannot be changed/i);
  });

  it("persists a manual bank account with a masked identifier and validated type", async () => {
    mockedDb.account.findFirst.mockResolvedValue({
      id: "ledger_1",
      legalEntityId: "legal_1",
      accountCode: "1120",
    });
    mockedDb.accountingBankAccount.findFirst.mockResolvedValue(null);
    saveAccountingBankAccount.mockResolvedValue({ id: "bank_1" });

    await saveManualBankAccount("org_1", "user_1", null, {
      ledgerAccountId: "ledger_1",
      name: "Bank Alpha",
      bankName: "Bank Alpha",
      branchName: "Chennai",
      accountNumberMasked: "1234567890",
      ifsc: "",
      currencyCode: "inr",
      accountKind: "CURRENT",
      description: "Primary",
      isActive: true,
      reason: "create",
    });

    expect(saveAccountingBankAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "BANK_1120",
        accountNumberMasked: "••••7890",
        currencyCode: "INR",
        configurationJson: JSON.stringify({
          accountKind: "CURRENT",
          description: "Primary",
        }),
      }),
    );
  });

  it("marks an already inactive bank account idempotently", async () => {
    const existing = {
      id: "bank_1",
      orgId: "org_1",
      legalEntityId: "legal_1",
      taxRegistrationId: null,
      ledgerAccountId: "ledger_1",
      code: "BANK001",
      name: "Bank Alpha",
      bankName: "Bank Alpha",
      branchName: "Chennai",
      accountNumberMasked: "••••7890",
      ifsc: null,
      currencyCode: "INR",
      isPrimary: false,
      configuration: { accountKind: "CURRENT" },
      statutoryValidated: true,
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      effectiveTo: null,
      isActive: false,
      rowVersion: 4,
      ledgerAccount: {
        id: "ledger_1",
        legalEntityId: "legal_1",
        branchId: "branch_1",
        accountCode: "1120",
        accountName: "Bank Ledger",
        openingDebit: { toString: () => "0" },
        openingCredit: { toString: () => "0" },
        branch: { name: "Chennai" },
      },
    };
    mockedDb.accountingBankAccount.findFirst.mockResolvedValue(existing);

    const result = await markBankAccountInactive(
      "org_1",
      "user_1",
      "branch_1",
      "bank_1",
      "inactive",
    );

    expect(result).toBe(existing);
    expect(saveAccountingBankAccount).not.toHaveBeenCalled();
  });

  it("calculates running balances with an opening carry-forward across pages", async () => {
    mockedDb.accountingBankAccount.findFirst.mockResolvedValue({
      id: "bank_1",
      orgId: "org_1",
      legalEntityId: "legal_1",
      taxRegistrationId: null,
      ledgerAccountId: "ledger_1",
      code: "BANK001",
      name: "Operations Bank",
      bankName: "Operations Bank",
      branchName: "Chennai",
      accountNumberMasked: "1234567890",
      ifsc: null,
      currencyCode: "INR",
      isPrimary: true,
      configuration: { accountKind: "CURRENT", description: "Primary account" },
      statutoryValidated: true,
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      effectiveTo: null,
      isActive: true,
      rowVersion: 3,
      ledgerAccount: {
        id: "ledger_1",
        legalEntityId: "legal_1",
        branchId: "branch_1",
        accountCode: "1120",
        accountName: "Operations Bank Ledger",
        openingDebit: { toString: () => "100.00" },
        openingCredit: { toString: () => "0" },
        branch: { name: "Chennai" },
      },
    });
    mockedDb.generalLedgerEntry.count.mockResolvedValue(52);
    mockedDb.generalLedgerEntry.findMany.mockResolvedValue([
      {
        id: "gle_51",
        postingDate: new Date("2026-07-15T00:00:00.000Z"),
        createdAt: new Date("2026-07-15T09:00:00.000Z"),
        voucherType: "PAYMENT_ENTRY",
        voucherId: "voucher_51",
        debit: { toString: () => "5.00" },
        credit: { toString: () => "0" },
        remarks: "Deposit",
        branch: { name: "Chennai" },
        journalEntry: { id: "journal_51", voucherNo: "JV-051", status: "POSTED" },
      },
      {
        id: "gle_52",
        postingDate: new Date("2026-07-15T00:00:00.000Z"),
        createdAt: new Date("2026-07-15T09:00:00.000Z"),
        voucherType: "PAYMENT_ENTRY",
        voucherId: "voucher_52",
        debit: { toString: () => "0" },
        credit: { toString: () => "2.00" },
        remarks: "Withdrawal",
        branch: { name: "Chennai" },
        journalEntry: { id: "journal_52", voucherNo: "JV-052", status: "POSTED" },
      },
    ]);
    mockedDb.generalLedgerEntry.aggregate
      .mockResolvedValueOnce({
        _sum: {
          debit: { toString: () => "20.00" },
          credit: { toString: () => "5.00" },
        },
      })
      .mockResolvedValueOnce({
        _sum: {
          debit: { toString: () => "10.00" },
          credit: { toString: () => "3.00" },
        },
      });
    mockedDb.accountingBankStatementImport.findFirst.mockResolvedValue({
      closingBalance: { toString: () => "140.00" },
      statementEnd: new Date("2026-07-31T00:00:00.000Z"),
      importStatus: "COMPLETED",
    });
    mockedDb.accountingBankStatementLine.count.mockResolvedValue(2);

    const workspace = await getBankAccountWorkspaceData("org_1", "branch_1", "bank_1", {
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
      page: 2,
      search: "",
      view: "transactions",
      direction: "all",
    });

    expect(workspace.openingBalance).toBe("122");
    expect(workspace.rows.map((row) => row.runningBalance)).toEqual(["127", "125"]);
    expect(workspace.amountInBooks).toBe("125");
    expect(workspace.amountInBank).toBe("140.00");
    expect(mockedDb.generalLedgerEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ postingDate: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      }),
    );
    expect(mockedDb.generalLedgerEntry.aggregate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.any(Object),
            {
              OR: [
                { postingDate: { lt: new Date("2026-07-15T00:00:00.000Z") } },
                {
                  postingDate: new Date("2026-07-15T00:00:00.000Z"),
                  createdAt: { lt: new Date("2026-07-15T09:00:00.000Z") },
                },
                {
                  postingDate: new Date("2026-07-15T00:00:00.000Z"),
                  createdAt: new Date("2026-07-15T09:00:00.000Z"),
                  id: { lt: "gle_51" },
                },
              ],
            },
          ]),
        }),
      }),
    );
  });
});
