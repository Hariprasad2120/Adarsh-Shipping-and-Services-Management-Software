import { describe, expect, it } from "vitest";

import {
  normalizeStatementRows,
  summarizePreviewRows,
  type ParsedStatementFile,
} from "../banking-import";

function buildParsedFile(headers: string[], rows: string[][]): ParsedStatementFile {
  return {
    displayName: "statement.csv",
    fileHash: "hash-1",
    fileKey: "org/bank/statement.csv",
    headers,
    rows,
    headerRowIndex: 1,
    sampleRows: [],
  };
}

describe("banking-import", () => {
  it("normalizes CSV rows that use separate debit and credit columns", () => {
    const rows = normalizeStatementRows({
      orgId: "org_1",
      bankAccountId: "bank_1",
      accountCurrencyCode: "INR",
      parsedFile: buildParsedFile(
        ["Date", "Description", "Reference", "Debit", "Credit", "Balance"],
        [["31/07/2026", "Cash deposit", "REF-1", "250.00", "", "1250.00"]],
      ),
      config: {
        headerRowIndex: 1,
        dateFormat: "DD/MM/YYYY",
        decimalSeparator: ".",
        columns: {
          dateColumn: "Date",
          descriptionColumn: "Description",
          referenceColumn: "Reference",
          debitColumn: "Debit",
          creditColumn: "Credit",
          balanceColumn: "Balance",
        },
      },
    });

    expect(rows[0]).toMatchObject({
      transactionDate: "2026-07-31",
      description: "Cash deposit",
      deposit: "250.00",
      withdrawal: "0",
      amount: "250.00",
      runningBalance: "1250.00",
      duplicateState: "NONE",
      errors: [],
    });
  });

  it("normalizes signed amount CSV rows into deposits and withdrawals", () => {
    const rows = normalizeStatementRows({
      orgId: "org_1",
      bankAccountId: "bank_1",
      accountCurrencyCode: "INR",
      parsedFile: buildParsedFile(
        ["Date", "Narration", "Amount"],
        [
          ["2026-07-31", "Customer receipt", "125.50"],
          ["2026-07-31", "Vendor payment", "-12.25"],
        ],
      ),
      config: {
        headerRowIndex: 1,
        dateFormat: "YYYY-MM-DD",
        decimalSeparator: ".",
        columns: {
          dateColumn: "Date",
          descriptionColumn: "Narration",
          amountColumn: "Amount",
        },
      },
    });

    expect(rows[0]).toMatchObject({
      deposit: "125.50",
      withdrawal: "0",
      amount: "125.50",
      errors: [],
    });
    expect(rows[1]).toMatchObject({
      deposit: "0",
      withdrawal: "12.25",
      amount: "-12.25",
      errors: [],
    });
  });

  it("flags ambiguous dates and zero-amount rows as invalid", () => {
    const rows = normalizeStatementRows({
      orgId: "org_1",
      bankAccountId: "bank_1",
      accountCurrencyCode: "INR",
      parsedFile: buildParsedFile(
        ["Date", "Description", "Amount"],
        [["07/08/2026", "Ambiguous import", "0"]],
      ),
      config: {
        headerRowIndex: 1,
        dateFormat: null,
        decimalSeparator: ".",
        columns: {
          dateColumn: "Date",
          descriptionColumn: "Description",
          amountColumn: "Amount",
        },
      },
    });

    expect(rows[0].errors).toEqual(
      expect.arrayContaining([
        "Ambiguous dates require an explicit date format.",
        "Zero-amount rows cannot be imported.",
      ]),
    );
  });

  it("marks duplicate rows within the uploaded file and summarizes importable rows", () => {
    const rows = normalizeStatementRows({
      orgId: "org_1",
      bankAccountId: "bank_1",
      accountCurrencyCode: "INR",
      parsedFile: buildParsedFile(
        ["Date", "Description", "Amount"],
        [
          ["2026-07-31", "Transfer in", "75.00"],
          ["2026-07-31", "Transfer in", "75.00"],
          ["2026-07-31", "Distinct same-day item", "75.00"],
        ],
      ),
      config: {
        headerRowIndex: 1,
        dateFormat: "YYYY-MM-DD",
        decimalSeparator: ".",
        columns: {
          dateColumn: "Date",
          descriptionColumn: "Description",
          amountColumn: "Amount",
        },
      },
    });

    expect(rows[0].duplicateState).toBe("WITHIN_FILE");
    expect(rows[1].duplicateState).toBe("WITHIN_FILE");
    expect(rows[2].duplicateState).toBe("NONE");

    const summary = summarizePreviewRows(
      rows.map((row) => ({
        sourceRowNumber: row.sourceRowNumber,
        transactionDate: row.transactionDate,
        description: row.description,
        reference: row.reference,
        deposit: row.deposit,
        withdrawal: row.withdrawal,
        amount: row.amount,
        runningBalance: row.runningBalance,
        currencyCode: row.currencyCode,
        fingerprint: row.fingerprint,
        duplicateState: row.duplicateState,
        errors: row.errors,
      })),
    );

    expect(summary.duplicateRows).toBe(2);
    expect(summary.rowsToImport).toBe(1);
  });
});
