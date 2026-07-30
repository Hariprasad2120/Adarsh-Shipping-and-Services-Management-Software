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

describe("Accounting Phase 7 rollout architecture", () => {
  it("contains no database client, provider client, direct financial write, or arbitrary SQL", () => {
    const rolloutFiles = files(
      resolve(root, "src/modules/accounting/rollout"),
    ).filter((path) => path.endsWith(".ts"));
    for (const path of rolloutFiles) {
      const source = readFileSync(path, "utf8");
      expect(source).not.toMatch(/from\s+["']@\/lib\/db["']/);
      expect(source).not.toMatch(
        /\b(?:generalLedgerEntry|journalEntryLine|journalEntry)\s*\.\s*(?:create|createMany|update|updateMany|delete|deleteMany|upsert)\s*\(/,
      );
      expect(source).not.toMatch(/\$(?:queryRaw|executeRaw)(?:Unsafe)?/);
      expect(source).not.toMatch(/\b(?:fetch|axios)\s*\(/);
    }
  });

  it("keeps production execution and provider delivery disabled", () => {
    const configuration = readFileSync(
      resolve(
        root,
        "src/modules/accounting/rollout/production-configuration.ts",
      ),
      "utf8",
    );
    const rehearsal = readFileSync(
      resolve(root, "src/modules/accounting/rollout/rehearsal.ts"),
      "utf8",
    );
    expect(configuration).toContain("PHASE7_PRODUCTION_EXECUTION_DISABLED");
    expect(configuration).toContain("ACCOUNTING_PROVIDER_MODE");
    expect(configuration).toContain("ACCOUNTING_OUTBOUND_DELIVERY_MODE");
    expect(rehearsal).toContain('databaseAccess: "NONE"');
    expect(rehearsal).toContain('storageTarget: "EPHEMERAL_IN_MEMORY"');
  });

  it("prevents client code from importing rollout execution internals", () => {
    for (const directory of ["src/app", "src/components"]) {
      for (const path of files(resolve(root, directory)).filter((entry) =>
        /\.[cm]?[jt]sx?$/.test(entry),
      )) {
        expect(readFileSync(path, "utf8")).not.toMatch(
          /from\s+["']@\/modules\/accounting\/rollout\/(?:rehearsal|production-configuration|cutover-state-machine)["']/,
        );
      }
    }
  });

  it("tracks the policy register, manifest, runbook, readiness report, and traceability", () => {
    for (const path of [
      "docs/accounting/contracts/accounting-phase7-policy-register.v1.json",
      "docs/accounting/contracts/accounting-phase7-manifest.synthetic.v1.json",
      "docs/accounting/phase-7-rollout-readiness.md",
      "docs/accounting/phase-7-operational-runbook.md",
      "docs/accounting/phase-7-traceability.md",
    ]) {
      expect(() => readFileSync(resolve(root, path), "utf8")).not.toThrow();
    }
  });
});
