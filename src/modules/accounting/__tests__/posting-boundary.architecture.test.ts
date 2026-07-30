import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();
const sourceRoot = join(root, "src");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory()
      ? sourceFiles(path)
      : /\.(?:ts|tsx|js|mjs|cjs)$/.test(name)
        ? [path]
        : [];
  });
}

function withoutComments(source: string) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("canonical Accounting posting boundary", () => {
  it("keeps posted journal and ledger creation inside the canonical engine", () => {
    const violations: string[] = [];

    for (const path of sourceFiles(sourceRoot)) {
      const file = relative(root, path).replaceAll("\\", "/");
      if (file.includes("/__tests__/") || file.startsWith("src/generated/")) continue;
      const source = withoutComments(readFileSync(path, "utf8"));
      const directJournalCreates = source.match(/\bjournalEntry\.create\s*\(/g)?.length ?? 0;
      const directLineCreates = source.match(/\bjournalEntryLine\.create(?:Many)?\s*\(/g)?.length ?? 0;
      const directLedgerCreates = source.match(/\bgeneralLedgerEntry\.create(?:Many)?\s*\(/g)?.length ?? 0;
      const directJournalMutations =
        source.match(/\bjournalEntry\.(?:update|updateMany|delete|deleteMany|upsert)\s*\(/g)?.length ??
        0;
      const directLineMutations =
        source.match(/\bjournalEntryLine\.(?:update|updateMany|delete|deleteMany|upsert)\s*\(/g)
          ?.length ?? 0;
      const directLedgerMutations =
        source.match(/\bgeneralLedgerEntry\.(?:update|updateMany|delete|deleteMany|upsert)\s*\(/g)
          ?.length ?? 0;
      const rawLedgerMutation =
        /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+["'`]*(?:JournalEntry|JournalEntryLine|GeneralLedgerEntry)\b/i.test(
          source,
        );
      const canonicalSwitches =
        source.match(/monolith\.accounting_canonical_posting/g)?.length ?? 0;

      if (file === "src/modules/accounting/posting-engine.ts") {
        if (
          directJournalCreates !== 1 ||
          directLineCreates !== 0 ||
          directLedgerCreates !== 1 ||
          directJournalMutations !== 0 ||
          directLineMutations !== 0 ||
          directLedgerMutations !== 0 ||
          rawLedgerMutation ||
          canonicalSwitches !== 1
        ) {
          violations.push(`${file}: canonical writer shape changed`);
        }
        continue;
      }

      if (file === "src/modules/accounting/service.ts") {
        const draftCreate = /journalEntry\.create\s*\([\s\S]*?status:\s*"DRAFT"/.test(source);
        if (directJournalCreates !== 1 || !draftCreate) {
          violations.push(`${file}: only one explicit DRAFT journal create is allowed`);
        }
        const draftSupersede =
          /journalEntry\.updateMany\s*\([\s\S]*?status:\s*"DRAFT"[\s\S]*?status:\s*"SUPERSEDED"/.test(
            source,
          );
        if (directJournalMutations !== 1 || !draftSupersede) {
          violations.push(`${file}: only the DRAFT-to-SUPERSEDED compatibility update is allowed`);
        }
        if (
          directLineCreates !== 0 ||
          directLedgerCreates !== 0 ||
          directLineMutations !== 0 ||
          directLedgerMutations !== 0 ||
          rawLedgerMutation ||
          canonicalSwitches !== 0
        ) {
          violations.push(`${file}: legacy direct journal-line or ledger writer is active`);
        }
        continue;
      }

      if (
        directJournalCreates ||
        directLineCreates ||
        directLedgerCreates ||
        directJournalMutations ||
        directLineMutations ||
        directLedgerMutations ||
        rawLedgerMutation ||
        canonicalSwitches
      ) {
        violations.push(`${file}: unauthorized direct financial writer`);
      }
    }

    expect(violations).toEqual([]);
  });

  it("retains fail-closed blockers for legacy GL posting and reversal helpers", () => {
    const service = withoutComments(
      readFileSync(join(sourceRoot, "modules/accounting/service.ts"), "utf8"),
    );
    expect(service).toContain("LEGACY_DIRECT_LEDGER_WRITE_BLOCKED");
    expect(service).toContain("LEGACY_DIRECT_LEDGER_REVERSAL_BLOCKED");
  });
});
