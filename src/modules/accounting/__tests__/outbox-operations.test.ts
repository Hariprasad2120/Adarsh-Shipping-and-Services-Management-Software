import { describe, expect, it } from "vitest";

import { accountingOutboxRetryDelayMs } from "../outbox-operations";

describe("Phase 4 outbox retry policy", () => {
  it("uses bounded exponential backoff", () => {
    expect(accountingOutboxRetryDelayMs(1)).toBe(1_000);
    expect(accountingOutboxRetryDelayMs(2)).toBe(2_000);
    expect(accountingOutboxRetryDelayMs(8)).toBe(128_000);
    expect(accountingOutboxRetryDelayMs(50)).toBe(900_000);
  });

  it("rejects invalid attempt numbers", () => {
    expect(() => accountingOutboxRetryDelayMs(0)).toThrow(/positive safe integer/);
    expect(() => accountingOutboxRetryDelayMs(1.5)).toThrow(/positive safe integer/);
  });
});
