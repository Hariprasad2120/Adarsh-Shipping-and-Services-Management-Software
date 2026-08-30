import { describe, expect, it } from "vitest";
import {
  assertStepUp,
  evaluateStepUp,
  StepUpRequiredError,
} from "@/lib/step-up";

describe("step-up policy", () => {
  const now = 10_000_000_000;

  it("allows a sensitive action right after re-auth", () => {
    const r = evaluateStepUp("mfa.disable", now - 60_000, now);
    expect(r.ok).toBe(true);
  });

  it("blocks it once the re-auth is stale", () => {
    const r = evaluateStepUp("mfa.disable", now - 6 * 60_000, now); // >5 min
    expect(r.ok).toBe(false);
  });

  it("treats a missing last-verified time as infinitely stale", () => {
    expect(evaluateStepUp("password.change", null, now).ok).toBe(false);
    expect(evaluateStepUp("password.change", undefined, now).ageSeconds).toBe(Infinity);
  });

  it("uses per-action freshness windows", () => {
    // mfa.enroll allows 10 min, mfa.disable only 5.
    const eightMinAgo = now - 8 * 60_000;
    expect(evaluateStepUp("mfa.enroll", eightMinAgo, now).ok).toBe(true);
    expect(evaluateStepUp("mfa.disable", eightMinAgo, now).ok).toBe(false);
  });

  it("assertStepUp throws StepUpRequiredError when stale", () => {
    expect(() => assertStepUp("api_credentials.generate", now - 60 * 60_000, now)).toThrow(
      StepUpRequiredError,
    );
    expect(() => assertStepUp("api_credentials.generate", now - 60_000, now)).not.toThrow();
  });
});
