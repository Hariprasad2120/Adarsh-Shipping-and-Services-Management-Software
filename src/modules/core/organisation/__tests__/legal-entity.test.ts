import { describe, expect, it } from "vitest";
import {
  assertCanDeleteLegalEntity,
  LegalEntityError,
} from "../legal-entity";

describe("assertCanDeleteLegalEntity", () => {
  it("rejects deleting the default entity", () => {
    try {
      assertCanDeleteLegalEntity({ isDefault: true }, { branchCount: 0, entityCount: 3 });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(LegalEntityError);
      expect((e as LegalEntityError).code).toBe("DEFAULT_ENTITY");
    }
  });

  it("rejects deleting the last entity", () => {
    try {
      assertCanDeleteLegalEntity({ isDefault: false }, { branchCount: 0, entityCount: 1 });
      expect.unreachable();
    } catch (e) {
      expect((e as LegalEntityError).code).toBe("LAST_ENTITY");
    }
  });

  it("rejects deleting an entity that still owns branches", () => {
    try {
      assertCanDeleteLegalEntity({ isDefault: false }, { branchCount: 2, entityCount: 4 });
      expect.unreachable();
    } catch (e) {
      expect((e as LegalEntityError).code).toBe("HAS_BRANCHES");
    }
  });

  it("allows deleting a non-default, non-last, branch-free entity", () => {
    expect(() =>
      assertCanDeleteLegalEntity({ isDefault: false }, { branchCount: 0, entityCount: 2 }),
    ).not.toThrow();
  });
});
