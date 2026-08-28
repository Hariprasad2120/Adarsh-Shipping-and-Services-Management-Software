import { describe, expect, it } from "vitest";
import {
  computeArrear,
  computeArrearAmount,
  computeArrearPeriod,
  isArrearEligible,
} from "@/modules/ams/arrears";

const BUFFER = 7;

describe("isArrearEligible", () => {
  it("is false when the meeting is inside the buffer window", () => {
    const submitted = new Date("2026-01-01T00:00:00Z");
    const meeting = new Date("2026-01-07T00:00:00Z");
    expect(isArrearEligible(submitted, meeting, BUFFER)).toBe(false);
  });

  it("is true when the meeting is past the buffer window", () => {
    const submitted = new Date("2026-01-01T00:00:00Z");
    const meeting = new Date("2026-01-20T00:00:00Z");
    expect(isArrearEligible(submitted, meeting, BUFFER)).toBe(true);
  });
});

describe("computeArrearPeriod", () => {
  it("returns null when no days are owed", () => {
    const submitted = new Date("2026-01-01T00:00:00Z");
    const meeting = new Date("2026-01-05T00:00:00Z");
    expect(computeArrearPeriod(submitted, meeting, BUFFER)).toBeNull();
  });

  it("counts calendar days from buffer end to the meeting date", () => {
    const submitted = new Date("2026-01-01T00:00:00Z");
    const meeting = new Date("2026-01-20T00:00:00Z");
    const period = computeArrearPeriod(submitted, meeting, BUFFER);
    expect(period).not.toBeNull();
    expect(period?.arrearDays).toBe(12); // 8th -> 20th
  });
});

describe("computeArrearAmount", () => {
  it("uses annualIncrement / 365 as the daily rate and rounds to paise", () => {
    const { dailyRate, arrearAmount } = computeArrearAmount(36500, 10);
    expect(dailyRate).toBeCloseTo(100, 5);
    expect(arrearAmount).toBe(1000);
  });
});

describe("computeArrear", () => {
  it("returns null when the increment is zero or negative", () => {
    expect(
      computeArrear({
        selfSubmittedAt: new Date("2026-01-01T00:00:00Z"),
        scheduledDate: new Date("2026-02-01T00:00:00Z"),
        bufferDays: BUFFER,
        annualIncrement: 0,
      }),
    ).toBeNull();
  });

  it("produces a full arrear record for a late meeting", () => {
    const result = computeArrear({
      selfSubmittedAt: new Date("2026-01-01T00:00:00Z"),
      scheduledDate: new Date("2026-01-20T00:00:00Z"),
      bufferDays: BUFFER,
      annualIncrement: 36500,
    });
    expect(result).not.toBeNull();
    expect(result?.arrearDays).toBe(12);
    expect(result?.dailyRate).toBeCloseTo(100, 5);
    expect(result?.amount).toBe(1200);
  });
});
