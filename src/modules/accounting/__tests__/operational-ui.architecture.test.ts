import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const accountingRoutes = join(root, "src/app/(dashboard)/accounting");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory()
      ? sourceFiles(path)
      : /\.(?:ts|tsx)$/.test(name)
        ? [path]
        : [];
  });
}

describe("Phase 5 operational UI architecture", () => {
  it("ships every declared operational destination", () => {
    const routes = [
      "",
      "approvals",
      "communications",
      "customization",
      "sales-invoices",
      "purchase-invoices",
      "customer-receipts",
      "vendor-payments",
      "payments",
      "allocations",
      "credit-notes",
      "debit-notes",
      "journal-entries",
      "general-ledger",
      "recurring",
      "depreciation",
      "partners",
      "report-builder",
      "tax-settlement",
      "outbox",
      "integrations",
      "manual-review",
      "configuration",
    ];
    expect(
      routes.filter(
        (route) => !existsSync(join(accountingRoutes, route, "page.tsx")),
      ),
    ).toEqual([]);
  });

  it("keeps Prisma financial mutation syntax out of UI routes and components", () => {
    const roots = [
      accountingRoutes,
      join(root, "src/components/monolith"),
    ];
    const violations = roots
      .flatMap(sourceFiles)
      .flatMap((path) => {
        const source = readFileSync(path, "utf8");
        return /\b(?:journalEntry|journalEntryLine|generalLedgerEntry|accountingDocument|accountingPayment|accountingPaymentAllocation)\.(?:create|createMany|update|updateMany|delete|deleteMany|upsert)\s*\(/.test(
          source,
        )
          ? [relative(root, path).replaceAll("\\", "/")]
          : [];
      });
    expect(violations).toEqual([]);
  });

  it("keeps operational server actions on accepted service boundaries", () => {
    const actions = readFileSync(
      join(root, "src/modules/accounting/operational-actions.ts"),
      "utf8",
    );
    expect(actions).toContain("approveAndPostAccountingDocument");
    expect(actions).toContain("approveAndPostAccountingPayment");
    expect(actions).toContain("submitJournalEntry");
    expect(actions).toContain("retryAccountingOutbox");
    expect(actions).not.toMatch(
      /\b(?:journalEntry|journalEntryLine|generalLedgerEntry)\.(?:create|createMany|update|updateMany|delete|deleteMany|upsert)\s*\(/,
    );
  });
});
