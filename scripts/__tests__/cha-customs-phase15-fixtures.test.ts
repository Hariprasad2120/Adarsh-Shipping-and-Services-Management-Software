import { describe, expect, it } from "vitest";

import {
  CHA_CUSTOMS_PHASE15_MASTER_FIXTURES,
  CHA_CUSTOMS_PHASE15_ROLE_FIXTURES,
} from "../cha-customs-phase15-fixtures";

describe("CHA customs Phase 15 fixtures", () => {
  it("covers every Phase 15 customs master with controlled source metadata", () => {
    expect(CHA_CUSTOMS_PHASE15_MASTER_FIXTURES).toHaveLength(13);
    for (const fixture of CHA_CUSTOMS_PHASE15_MASTER_FIXTURES) {
      expect(fixture.datasetVersion).toMatch(/^phase15-/);
      expect(fixture.sourceReference).toContain("#");
      expect(fixture.sourcePublicationDate).toBe("2026-07-31");
      expect(fixture.sourceEffectiveDate).toBe("2026-08-01");
      expect(fixture.rows.length).toBeGreaterThan(0);
      expect(fixture.sampleBusinessKeys.length).toBeGreaterThan(0);
    }
  });

  it("defines a role matrix for the controlled UAT paths", () => {
    expect(CHA_CUSTOMS_PHASE15_ROLE_FIXTURES.map((entry) => entry.roleName)).toEqual([
      "STAGING CHA Customs Data Entry",
      "STAGING CHA Customs Documentation",
      "STAGING CHA Customs Filing",
      "STAGING CHA Customs Manager",
      "STAGING CHA Customs Master Admin",
      "STAGING CHA Customs ICEGATE Submitter",
      "STAGING CHA Customs Read Only Audit",
    ]);
    for (const role of CHA_CUSTOMS_PHASE15_ROLE_FIXTURES) {
      expect(role.permissionKeys.length).toBeGreaterThan(0);
      expect(role.email.endsWith("@staging.example.com")).toBe(true);
    }
  });
});
