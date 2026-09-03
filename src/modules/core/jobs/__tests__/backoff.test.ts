import { describe, expect, it } from "vitest";
import { backoffDelayMs, nextRunAfter } from "../backoff";

describe("backoffDelayMs", () => {
  it("grows exponentially from the base", () => {
    const noJitter = { jitter: 0, baseMs: 1000, capMs: 10_000_000 };
    expect(backoffDelayMs(1, noJitter)).toBe(1000);
    expect(backoffDelayMs(2, noJitter)).toBe(2000);
    expect(backoffDelayMs(3, noJitter)).toBe(4000);
    expect(backoffDelayMs(5, noJitter)).toBe(16000);
  });

  it("is capped", () => {
    expect(backoffDelayMs(20, { jitter: 0, baseMs: 1000, capMs: 5000 })).toBe(5000);
  });

  it("treats attempts < 1 as 1", () => {
    expect(backoffDelayMs(0, { jitter: 0, baseMs: 1000 })).toBe(1000);
  });

  it("jitter stays within +/- fraction and never negative", () => {
    for (let i = 0; i < 200; i++) {
      const d = backoffDelayMs(3, { baseMs: 1000, capMs: 1_000_000, jitter: 0.2 });
      expect(d).toBeGreaterThanOrEqual(3200); // 4000 - 20%
      expect(d).toBeLessThanOrEqual(4800); // 4000 + 20%
    }
  });

  it("nextRunAfter offsets from the given base time", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    const next = nextRunAfter(1, { jitter: 0, baseMs: 60_000 }, from);
    expect(next.toISOString()).toBe("2026-01-01T00:01:00.000Z");
  });
});
