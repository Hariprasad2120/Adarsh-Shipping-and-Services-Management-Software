import { describe, expect, it } from "vitest";
import {
  MODULE_REGISTRY,
  getModule,
  getModuleForPath,
  listBusinessModuleIds,
  listCoreModuleIds,
  resolveEnabledModules,
  validateRegistry,
} from "..";
import {
  ALWAYS_ENABLED_SECTION_IDS,
  MANAGED_FEATURE_IDS,
  MODULE_CONTROL_ITEMS,
  TOGGLEABLE_MODULE_SECTION_IDS,
} from "@/modules/core/organisation/module-config";

describe("module registry — structure", () => {
  it("passes structural validation (no unknown deps, no cycles)", () => {
    expect(() => validateRegistry()).not.toThrow();
  });

  it("every manifest has a version and a non-empty label", () => {
    for (const m of MODULE_REGISTRY) {
      expect(m.version, m.id).toMatch(/^\d+\.\d+\.\d+$/);
      expect(m.label.length, m.id).toBeGreaterThan(0);
    }
  });
});

describe("module registry — parity with legacy module-config", () => {
  it("core module ids === ALWAYS_ENABLED_SECTION_IDS", () => {
    expect(new Set(listCoreModuleIds())).toEqual(new Set(ALWAYS_ENABLED_SECTION_IDS));
  });

  it("business module ids === TOGGLEABLE_MODULE_SECTION_IDS", () => {
    expect(new Set(listBusinessModuleIds())).toEqual(new Set(TOGGLEABLE_MODULE_SECTION_IDS));
  });

  it("labels & descriptions match MODULE_CONTROL_ITEMS", () => {
    for (const item of MODULE_CONTROL_ITEMS) {
      const m = getModule(item.id);
      expect(m, item.id).toBeDefined();
      expect(m!.label, item.id).toBe(item.label);
      expect(m!.description, item.id).toBe(item.description);
    }
  });

  it("declared feature ids match MANAGED_FEATURE_IDS", () => {
    const registryFeatureIds = MODULE_REGISTRY.flatMap((m) =>
      (m.features ?? []).map((f) => f.id),
    );
    expect(new Set(registryFeatureIds)).toEqual(new Set(MANAGED_FEATURE_IDS));
  });
});

describe("resolveEnabledModules — dependency closure", () => {
  it("always includes every core module", () => {
    const { enabled } = resolveEnabledModules([]);
    for (const id of listCoreModuleIds()) expect(enabled).toContain(id);
  });

  it("enabling payroll pulls in hrms and reports it as auto-added", () => {
    const { enabled, autoAdded } = resolveEnabledModules(["payroll"]);
    expect(enabled).toContain("payroll");
    expect(enabled).toContain("hrms");
    expect(autoAdded).toContain("hrms");
  });

  it("does not report an explicitly requested dependency as auto-added", () => {
    const { autoAdded } = resolveEnabledModules(["payroll", "hrms"]);
    expect(autoAdded).not.toContain("hrms");
  });

  it("ignores unknown ids", () => {
    const { enabled } = resolveEnabledModules(["not-a-module", "crm"]);
    expect(enabled).toContain("crm");
    expect(enabled).not.toContain("not-a-module" as never);
  });

  it("output is in registry order", () => {
    const { enabled } = resolveEnabledModules(["accounting", "crm", "cha"]);
    const order = MODULE_REGISTRY.map((m) => m.id).filter((id) => enabled.includes(id));
    expect(enabled).toEqual(order);
  });
});

describe("getModuleForPath — longest prefix wins", () => {
  it("maps a nested route to its module", () => {
    expect(getModuleForPath("/accounting/journal-entries/new")?.id).toBe("accounting");
  });

  it("resolves /hrms/recruit to recruit, not hrms", () => {
    expect(getModuleForPath("/hrms/recruit/jobs")?.id).toBe("recruit");
    expect(getModuleForPath("/hrms/employees")?.id).toBe("hrms");
  });

  it("returns undefined for an unowned path", () => {
    expect(getModuleForPath("/account/security")).toBeUndefined();
  });
});
