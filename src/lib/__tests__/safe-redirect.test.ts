import { describe, expect, it } from "vitest";
import { safeRedirectPath, safeRedirectUrl } from "@/lib/safe-redirect";

describe("safeRedirectPath", () => {
  it("allows same-origin relative paths", () => {
    expect(safeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(safeRedirectPath("/cha/jobs?tab=open")).toBe("/cha/jobs?tab=open");
  });

  it("falls back for empty / non-string", () => {
    expect(safeRedirectPath("")).toBe("/dashboard");
    expect(safeRedirectPath(undefined)).toBe("/dashboard");
    expect(safeRedirectPath(123 as unknown)).toBe("/dashboard");
    expect(safeRedirectPath("relative/no/slash")).toBe("/dashboard");
  });

  it("blocks open-redirect payloads", () => {
    for (const evil of [
      "//evil.example",
      "https://evil.example",
      "http://evil.example/path",
      "/\\evil.example",
      "\\\\evil.example",
      "javascript:alert(1)",
      "https://evil.example\n/dashboard",
      " //evil.example",
      "/dashboard\t../admin",
    ]) {
      expect(safeRedirectPath(evil), evil).toBe("/dashboard");
    }
  });

  it("honours an explicit origin allowlist", () => {
    expect(
      safeRedirectPath("https://portal.partner.test/x", "/dashboard", [
        "https://portal.partner.test",
      ]),
    ).toBe("/x");
    expect(
      safeRedirectPath("https://other.test/x", "/dashboard", [
        "https://portal.partner.test",
      ]),
    ).toBe("/dashboard");
  });

  it("safeRedirectUrl always returns an absolute app-origin URL", () => {
    expect(safeRedirectUrl("//evil.example")).toMatch(/\/dashboard$/);
    expect(safeRedirectUrl("/x")).toMatch(/\/x$/);
  });
});
