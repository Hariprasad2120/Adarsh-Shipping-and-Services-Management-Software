import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/accounting/banking",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams("dateFrom=2026-07-01&dateTo=2026-08-01"),
}));

vi.mock("@/modules/accounting/banking-actions", () => ({
  saveManualBankAccountAction: vi.fn(),
  markBankAccountInactiveAction: vi.fn(),
}));

import { BankAccountClient } from "./[bankAccountId]/bank-account-client";
import { BankingClient } from "./banking-client";
import BankingLoading from "./loading";

const ledgerAccounts = [
  {
    id: "ledger-1",
    legalEntityId: "legal-1",
    branchId: "branch-1",
    accountCode: "1120",
    accountName: "Primary Bank",
    branch: { name: "Chennai" },
  },
];

const bankAccounts = [
  {
    id: "bank-1",
    name: "Main operations bank",
    bankName: "Operations Bank",
    currencyCode: "INR",
    isActive: true,
  },
];

const statementHistory = [
  {
    id: "import-1",
    bankAccountId: "bank-1",
    bankAccountName: "Main operations bank",
    sourceFileName: "operations-july.csv",
    sourceFileKeyLabel: "bank-1/operations-july.csv",
    sourceFormat: "CSV",
    statementStart: "2026-07-01",
    statementEnd: "2026-07-31",
    importDate: "2026-08-01T00:00:00.000Z",
    importedBy: "Finance User",
    status: "COMPLETED",
    totalRows: 12,
    importedRows: 10,
    invalidRows: 1,
    duplicateRows: 1,
    closingBalance: "3000.00",
    currencyCode: "INR",
    failureReason: null,
  },
];

describe("BankingClient", () => {
  it("renders a loading state for the Banking route", () => {
    const markup = renderToStaticMarkup(<BankingLoading />);

    expect(markup).toContain("Loading finance operations");
  });

  it("renders separate Amount in Bank and Amount in Books labels with a masked identifier", () => {
    const markup = renderToStaticMarkup(
      <BankingClient
        bankAccounts={bankAccounts}
        canManageBankAccounts
        functionalCurrencyCode="INR"
        ledgerAccounts={ledgerAccounts}
        mappedLedgerAccountIds={[]}
        overview={{
          filters: {
            dateFrom: "2026-07-01",
            dateTo: "2026-08-01",
            page: 1,
            search: "",
            status: "active",
          },
          pageSize: 25,
          pageCount: 1,
          total: 1,
          functionalCurrencyCode: "INR",
          summary: {
            cashInHand: [{ currencyCode: "INR", amount: "1500.00" }],
            bankBalance: [{ currencyCode: "INR", amount: "3200.50" }],
          },
          statementHistory,
          rows: [
            {
              id: "bank-1",
              code: "1120",
              name: "Main operations bank",
              bankName: "Operations Bank",
              branchName: "Chennai",
              maskedIdentifier: "••••9088",
              currencyCode: "INR",
              accountKind: "CURRENT",
              description: "Primary collections account",
              isActive: true,
              isPrimary: true,
              ledgerAccountId: "ledger-1",
              ledgerAccountCode: "1120",
              ledgerAccountName: "Primary Bank",
              locationName: "Chennai",
              uncategorizedCount: 2,
              amountInBooks: "3200.50",
              amountInBank: "3000.00",
              amountInBankAsOf: "2026-07-31T00:00:00.000Z",
              lastImportStatus: "IMPORTED",
              rowVersion: 3,
            },
          ],
        }}
      />,
    );

    expect(markup).toContain("Amount in Bank");
    expect(markup).toContain("Amount in Books");
    expect(markup).toContain("••••9088");
    expect(markup).toContain("Open actions for Main operations bank");
  });

  it("renders an empty-state message when no bank accounts match", () => {
    const markup = renderToStaticMarkup(
      <BankingClient
        bankAccounts={[]}
        canManageBankAccounts={false}
        functionalCurrencyCode="INR"
        ledgerAccounts={[]}
        mappedLedgerAccountIds={[]}
        overview={{
          filters: {
            dateFrom: "2026-07-01",
            dateTo: "2026-08-01",
            page: 1,
            search: "",
            status: "active",
          },
          pageSize: 25,
          pageCount: 1,
          total: 0,
          functionalCurrencyCode: "INR",
          summary: { cashInHand: [], bankBalance: [] },
          statementHistory: [],
          rows: [],
        }}
      />,
    );

    expect(markup).toContain("No Banking accounts are available in your current scope.");
  });

  it("renders a read-only Banking overview without manage controls", () => {
    const markup = renderToStaticMarkup(
      <BankingClient
        bankAccounts={bankAccounts}
        canManageBankAccounts={false}
        functionalCurrencyCode="INR"
        ledgerAccounts={ledgerAccounts}
        mappedLedgerAccountIds={[]}
        overview={{
          filters: {
            dateFrom: "2026-07-01",
            dateTo: "2026-08-01",
            page: 1,
            search: "Main",
            status: "active",
          },
          pageSize: 25,
          pageCount: 1,
          total: 1,
          functionalCurrencyCode: "INR",
          summary: {
            cashInHand: [],
            bankBalance: [{ currencyCode: "INR", amount: "2000.00" }],
          },
          statementHistory,
          rows: [
            {
              id: "bank-1",
              code: "1120",
              name: "Main operations bank",
              bankName: "Operations Bank",
              branchName: "Chennai",
              maskedIdentifier: "••••9088",
              currencyCode: "INR",
              accountKind: "CURRENT",
              description: null,
              isActive: true,
              isPrimary: true,
              ledgerAccountId: "ledger-1",
              ledgerAccountCode: "1120",
              ledgerAccountName: "Primary Bank",
              locationName: "Chennai",
              uncategorizedCount: 0,
              amountInBooks: "2000.00",
              amountInBank: null,
              amountInBankAsOf: null,
              lastImportStatus: null,
              rowVersion: 2,
            },
          ],
        }}
      />,
    );

    expect(markup).not.toContain("Add bank account");
    expect(markup).toContain("Unavailable");
    expect(markup).toContain("Search");
  });

  it("renders the account workspace with transactions and inactivation controls", () => {
    const markup = renderToStaticMarkup(
      <BankAccountClient
        canManageBankAccounts
        functionalCurrencyCode="INR"
        workspace={{
          bankAccount: {
            id: "bank-1",
            ledgerAccountId: "ledger-1",
            code: "1120",
            name: "Main operations bank",
            bankName: "Operations Bank",
            branchName: "Chennai",
            maskedIdentifier: "••••9088",
            currencyCode: "INR",
            accountKind: "CURRENT",
            description: "Primary collections account",
            isActive: true,
            locationName: "Chennai",
            ledgerAccountCode: "1120",
            ledgerAccountName: "Primary Bank",
            rowVersion: 3,
          },
          filters: {
            dateFrom: "2026-07-01",
            dateTo: "2026-08-01",
            page: 1,
            search: "",
            view: "transactions",
            direction: "all",
          },
          pageSize: 50,
          pageCount: 1,
          total: 1,
          amountInBooks: "3200.50",
          amountInBank: "3000.00",
          amountInBankAsOf: "2026-07-31T00:00:00.000Z",
          uncategorizedCount: 2,
          openingBalance: "3000.00",
          currentView: "transactions",
          direction: "all",
          rows: [
            {
              id: "gle-1",
              postingDate: "2026-07-31T00:00:00.000Z",
              reference: "JV-051",
              voucherType: "PAYMENT_ENTRY",
              voucherId: "voucher_1",
              status: "POSTED",
              locationName: "Chennai",
              deposits: "250.00",
              withdrawals: "0",
              runningBalance: "3250.50",
              remarks: "Deposit",
              href: "/accounting/payment-entries/voucher_1",
            },
          ],
          uncategorizedRows: [],
          statementHistory,
        }}
      />,
    );

    expect(markup).toContain("All transactions");
    expect(markup).toContain("Mark inactive");
    expect(markup).toContain("JV-051");
    expect(markup).toContain("Amount in Books");
    expect(markup).toContain("Amount in Bank");
  });
});
