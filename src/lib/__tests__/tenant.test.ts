import { describe, expect, it } from "vitest";
import {
  assertFound,
  assertOrgMatchesSession,
  assertSameOrg,
  TenantAccessError,
  tenantWhere,
} from "@/lib/tenant";

describe("tenantWhere", () => {
  it("returns an orgId filter", () => {
    expect(tenantWhere("org1")).toEqual({ orgId: "org1" });
  });
  it("throws 403 without an org", () => {
    expect(() => tenantWhere("")).toThrow(TenantAccessError);
  });
});

describe("assertSameOrg", () => {
  it("returns the record when the org matches", () => {
    const rec = { id: "x", orgId: "org1" };
    expect(assertSameOrg(rec, "org1")).toBe(rec);
  });

  it("throws 404 on a cross-org record (indistinguishable from missing)", () => {
    const cross = () => assertSameOrg({ id: "x", orgId: "org2" }, "org1");
    const missing = () => assertSameOrg(null, "org1");
    expect(cross).toThrow(TenantAccessError);
    expect(missing).toThrow(TenantAccessError);
    try {
      cross();
    } catch (e) {
      expect((e as TenantAccessError).status).toBe(404);
      expect((e as TenantAccessError).message).toBe("Not found");
    }
  });

  it("supports a nested org accessor", () => {
    const row = { id: "x", job: { orgId: "org1" } };
    expect(assertSameOrg(row, "org1", (r) => r.job.orgId)).toBe(row);
    expect(() => assertSameOrg(row, "org2", (r) => r.job.orgId)).toThrow(
      TenantAccessError,
    );
  });

  it("throws 403 when the session has no org", () => {
    try {
      assertSameOrg({ id: "x", orgId: "org1" }, "");
    } catch (e) {
      expect((e as TenantAccessError).status).toBe(403);
    }
  });
});

describe("assertFound", () => {
  it("passes through a value and throws on null/undefined", () => {
    expect(assertFound(5)).toBe(5);
    expect(() => assertFound(null)).toThrow(TenantAccessError);
    expect(() => assertFound(undefined)).toThrow(TenantAccessError);
  });
});

describe("assertOrgMatchesSession", () => {
  it("allows an absent or matching supplied org id", () => {
    expect(() => assertOrgMatchesSession(undefined, "org1")).not.toThrow();
    expect(() => assertOrgMatchesSession("org1", "org1")).not.toThrow();
  });
  it("rejects a mismatching supplied org id with a 404", () => {
    try {
      assertOrgMatchesSession("org2", "org1");
    } catch (e) {
      expect((e as TenantAccessError).status).toBe(404);
    }
  });
});
