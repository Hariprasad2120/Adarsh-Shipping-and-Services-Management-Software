import { describe, expect, it } from "vitest";
import { applyRounding } from "../calculation";

describe("applyRounding", () => {
  it("returns value unchanged when mode is NONE", () => {
    expect(applyRounding(2.3, "NONE", 0.5)).toBe(2.3);
  });

  it("returns value unchanged when increment is missing", () => {
    expect(applyRounding(2.3, "NEAREST", undefined)).toBe(2.3);
  });

  it("rounds to nearest increment", () => {
    expect(applyRounding(2.3, "NEAREST", 0.5)).toBe(2.5);
    expect(applyRounding(2.2, "NEAREST", 0.5)).toBe(2);
  });

  it("rounds up to increment", () => {
    expect(applyRounding(2.1, "UP", 0.5)).toBe(2.5);
  });

  it("rounds down to increment", () => {
    expect(applyRounding(2.9, "DOWN", 0.5)).toBe(2.5);
  });

  it("handles quarter-day increments", () => {
    expect(applyRounding(1.1, "NEAREST", 0.25)).toBe(1);
    expect(applyRounding(1.4, "NEAREST", 0.25)).toBe(1.5);
  });
});
