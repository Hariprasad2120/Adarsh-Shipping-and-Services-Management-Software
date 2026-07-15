import { describe, expect, it } from "vitest";
import { hashPortalToken, validatePortalPassword } from "../auth";

describe("customer portal auth helpers", () => {
  it("hashes portal tokens deterministically", () => {
    expect(hashPortalToken("abc123")).toBe(hashPortalToken("abc123"));
    expect(hashPortalToken("abc123")).not.toBe(hashPortalToken("xyz789"));
  });

  it("rejects weak passwords", () => {
    expect(() => validatePortalPassword("password123")).toThrow();
    expect(() => validatePortalPassword("short1A")).toThrow();
    expect(() => validatePortalPassword("alllowercase123")).toThrow();
  });

  it("accepts strong passwords", () => {
    expect(() => validatePortalPassword("MonolithPortal2026")).not.toThrow();
    expect(() => validatePortalPassword("password@123")).not.toThrow();
  });
});
