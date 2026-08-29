import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const requirePermission = vi.fn();

vi.mock("@/lib/auth", () => ({ getSession: () => getSession() }));
vi.mock("@/lib/rbac", () => ({
  requirePermission: (...a: unknown[]) => requirePermission(...a),
}));

import {
  ApiAuthError,
  requireApiActor,
  requireApiPermission,
  withApiAuth,
} from "@/lib/api-auth";

const fullSession = {
  user: {
    id: "u1",
    email: "u1@example.com",
    orgId: "org1",
    isPlatformAdmin: false,
    roleIds: ["r1"],
    sessionNonce: "n1",
  },
};

beforeEach(() => {
  getSession.mockReset();
  requirePermission.mockReset();
});

describe("requireApiActor", () => {
  it("throws 401 when not signed in", async () => {
    getSession.mockResolvedValue(null);
    await expect(requireApiActor()).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
  });

  it("throws 403 when the user has no org (default requireOrg)", async () => {
    getSession.mockResolvedValue({ user: { ...fullSession.user, orgId: undefined } });
    await expect(requireApiActor()).rejects.toMatchObject({ status: 403, code: "NO_ORG" });
  });

  it("allows a no-org user when requireOrg:false", async () => {
    getSession.mockResolvedValue({ user: { ...fullSession.user, orgId: undefined } });
    const actor = await requireApiActor({ requireOrg: false });
    expect(actor.userId).toBe("u1");
    expect(actor.orgId).toBe("");
  });

  it("throws 403 when platformAdmin required but not held", async () => {
    getSession.mockResolvedValue(fullSession);
    await expect(requireApiActor({ platformAdmin: true })).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("returns the actor for a valid session", async () => {
    getSession.mockResolvedValue(fullSession);
    await expect(requireApiActor()).resolves.toMatchObject({
      userId: "u1",
      orgId: "org1",
      email: "u1@example.com",
      isPlatformAdmin: false,
      roleIds: ["r1"],
      sessionNonce: "n1",
    });
  });
});

describe("requireApiPermission", () => {
  it("checks the permission after resolving the actor", async () => {
    getSession.mockResolvedValue(fullSession);
    requirePermission.mockResolvedValue(undefined);
    await requireApiPermission("hrms.employee.read");
    expect(requirePermission).toHaveBeenCalledWith("u1", "hrms.employee.read");
  });

  it("propagates a permission failure", async () => {
    getSession.mockResolvedValue(fullSession);
    requirePermission.mockRejectedValue(new Error("Forbidden: missing permission x"));
    await expect(requireApiPermission("x")).rejects.toThrow(/Forbidden/);
  });
});

describe("withApiAuth", () => {
  it("converts ApiAuthError into its response", async () => {
    const handler = withApiAuth(async () => {
      throw new ApiAuthError(401, "UNAUTHENTICATED", "nope");
    });
    const res = await handler(new Request("https://app.test/api/x"), {});
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({
      ok: false,
      error: { code: "UNAUTHENTICATED" },
    });
  });

  it("passes non-auth errors through", async () => {
    const handler = withApiAuth(async () => {
      throw new Error("boom");
    });
    await expect(
      handler(new Request("https://app.test/api/x"), {}),
    ).rejects.toThrow("boom");
  });
});
