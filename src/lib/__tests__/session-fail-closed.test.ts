import { describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    userSession: {
      findUnique: (...a: unknown[]) => findUnique(...a),
      update: vi.fn().mockResolvedValue({}),
    },
    securityEvent: { create: vi.fn().mockResolvedValue({}) },
  },
}));

import { validateSession, invalidateValidatedSessionCache } from "@/lib/session-service";

describe("validateSession fail-closed on DB error (MON-S1-012)", () => {
  it("returns { valid: false } when the datastore throws", async () => {
    invalidateValidatedSessionCache();
    findUnique.mockRejectedValueOnce(new Error("connection terminated unexpectedly"));
    const result = await validateSession("11111111-1111-1111-1111-111111111111");
    expect(result.valid).toBe(false);
  });

  it("still returns { valid: false } for a genuinely missing session", async () => {
    invalidateValidatedSessionCache();
    findUnique.mockResolvedValueOnce(null);
    const result = await validateSession("22222222-2222-2222-2222-222222222222");
    expect(result).toEqual({ valid: false, reason: "NOT_FOUND" });
  });
});
