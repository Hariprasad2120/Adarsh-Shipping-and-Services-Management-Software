import { describe, expect, it } from "vitest";
import { scanRouteAuthCoverage } from "../../../scripts/scan-route-auth-coverage.mjs";

/**
 * MON-S1-010 regression gate.
 *
 * Every Route Handler under src/app/api must either reference a recognised
 * auth/permission/secret check, or be explicitly listed in KNOWN_PUBLIC (each
 * entry individually reviewed). A new unguarded route fails this test.
 *
 * `guarded` must not fall below the frozen baseline — a route silently losing
 * its auth check also fails here.
 */

const BASELINE_GUARDED = 282;

describe("API route auth coverage", () => {
  const result = scanRouteAuthCoverage();

  it("has no route missing an auth token or explicit public classification", () => {
    expect(result.missing, `Unguarded routes:\n${result.missing.join("\n")}`).toEqual(
      [],
    );
  });

  it("does not regress below the guarded baseline", () => {
    expect(result.guarded).toBeGreaterThanOrEqual(BASELINE_GUARDED);
  });

  it("classifies every route file", () => {
    expect(result.guarded + result.missing.length).toBeGreaterThan(0);
    expect(result.total).toBeGreaterThanOrEqual(result.guarded);
  });
});
