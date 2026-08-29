import { describe, expect, it } from "vitest";
import { scanTenantScopeCoverage } from "../../../scripts/scan-tenant-scope-coverage.mjs";

/**
 * MON-S1 sections 9 & 10 regression gate.
 *
 * Any API route / server-action file that calls `db.<model>.findUnique(...)`
 * (which cannot filter by a non-unique `orgId`) must also carry an
 * organisation-scoping signal in the same file, or be explicitly listed in
 * REVIEWED_OK with a justification. A new by-id lookup with no tenant scope
 * fails here.
 */
describe("tenant-scope coverage", () => {
  const result = scanTenantScopeCoverage();

  it("flags no unscoped by-id lookups", () => {
    expect(
      result.flagged,
      `Unscoped findUnique in:\n${result.flagged.join("\n")}`,
    ).toEqual([]);
  });

  it("still scans a meaningful number of files", () => {
    expect(result.scanned).toBeGreaterThan(20);
  });
});
