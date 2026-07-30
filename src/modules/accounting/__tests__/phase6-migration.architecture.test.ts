import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

describe("Accounting Phase 6 architecture", () => {
  it("contains no direct journal, journal-line or ledger mutation", () => {
    const migrationFiles = files(
      resolve(root, "src/modules/accounting/migration"),
    ).filter((path) => path.endsWith(".ts"));
    const forbidden =
      /\b(?:generalLedgerEntry|journalEntryLine|journalEntry)\s*\.\s*(?:create|createMany|update|updateMany|delete|deleteMany|upsert)\s*\(/;
    for (const path of migrationFiles) {
      expect(readFileSync(path, "utf8")).not.toMatch(forbidden);
    }
  });

  it("uses canonical services and keeps execution server-only", () => {
    const source = readFileSync(
      resolve(root, "src/modules/accounting/migration/canonical-executor.ts"),
      "utf8",
    );
    expect(source).toContain('import "server-only"');
    expect(source).toContain("prepareLegacySalesInvoice");
    expect(source).toContain("prepareLegacyPurchaseInvoice");
    expect(source).toContain("prepareLegacyPayment");
    expect(source).toContain("legalEntityId: input.legalEntityId");
    expect(source).toContain("SCOPE_VIOLATION:CANONICAL_TARGET");
  });

  it("keeps production and provider execution disabled", () => {
    const pipeline = readFileSync(
      resolve(root, "src/modules/accounting/migration/pipeline.ts"),
      "utf8",
    );
    const provider = readFileSync(
      resolve(root, "src/modules/accounting/migration/provider-adapter.ts"),
      "utf8",
    );
    expect(pipeline).toContain('target === "production"');
    expect(pipeline).toContain("PRODUCTION_BLOCKED");
    expect(provider).toContain("readonly enabled = false");
  });

  it("scopes every Phase 6 mutation and never uses an id-only update", () => {
    const repository = readFileSync(
      resolve(root, "src/modules/accounting/migration/repository.ts"),
      "utf8",
    );
    expect(repository).not.toMatch(
      /accountingMigration(?:Batch|Record|Mapping|Exception)\.update\(\s*\{\s*where:\s*\{\s*id:/,
    );
    expect(repository).not.toMatch(
      /accountingMigration(?:Batch|Record|Mapping|Exception)\.(?:delete|deleteMany)\(/,
    );
    expect(repository).toContain("MIGRATION_BATCH_FINALIZATION_SCOPE_MISMATCH");
    expect(repository).toContain("legalEntityId: input.legalEntityId");
    expect(repository).toContain("MIGRATION_APPROVED_MAPPING_STALE_OR_INVALID");
  });

  it("passes the mapped legal entity through canonical adapter resolution", () => {
    const adapters = readFileSync(
      resolve(root, "src/modules/accounting/document-adapters.ts"),
      "utf8",
    );
    const configuration = readFileSync(
      resolve(root, "src/modules/accounting/integration-adapters.ts"),
      "utf8",
    );
    expect(adapters).toContain("input.legalEntityId");
    expect(configuration).toContain(
      "? { id: explicitLegalEntityId, orgId, status: \"ACTIVE\" }",
    );
    expect(configuration).toContain(
      "Requested Accounting legal entity is not active in this organization",
    );
  });
});
