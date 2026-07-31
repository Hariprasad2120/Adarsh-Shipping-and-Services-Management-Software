import { describe, expect, it } from "vitest";

import {
  CHA_CUSTOMS_PERMISSIONS,
  CHA_CUSTOMS_UNASSIGNED_PERMISSION_KEYS,
} from "../permissions";

describe("CHA customs permissions", () => {
  it("registers the Phase 1 permission catalogue", () => {
    expect(CHA_CUSTOMS_PERMISSIONS.map((permission) => permission.key)).toEqual([
      "cha.customs.master.view",
      "cha.customs.master.manage",
      "cha.customs.master.bulk_import",
      "cha.customs.filing.view",
      "cha.customs.filing.edit_draft",
      "cha.customs.filing.generate_artifact",
      "cha.customs.icegate.submit",
      "cha.customs.icegate.response.view",
      "cha.customs.signing.register",
      "cha.customs.icegate.configure",
    ]);
  });

  it("keeps new customs permissions out of default system-role grants", () => {
    expect(CHA_CUSTOMS_UNASSIGNED_PERMISSION_KEYS).toHaveLength(CHA_CUSTOMS_PERMISSIONS.length);
    expect(new Set(CHA_CUSTOMS_UNASSIGNED_PERMISSION_KEYS).size).toBe(
      CHA_CUSTOMS_PERMISSIONS.length,
    );
  });

  it("uses admin UI compatible labels and CHA grouping", () => {
    for (const permission of CHA_CUSTOMS_PERMISSIONS) {
      expect(permission.group).toBe("CHA");
      expect(permission.label).not.toHaveLength(0);
    }
  });
});

