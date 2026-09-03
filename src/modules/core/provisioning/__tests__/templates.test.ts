import { describe, expect, it } from "vitest";
import { BUILTIN_TEMPLATES, getTemplate, listTemplates } from "..";
import { resolveEnabledModules, isModuleId } from "@/modules/core/module-registry";
import { isResetPolicy } from "@/modules/core/numbering";

describe("built-in templates are well-formed", () => {
  it("every template has a unique id and a semver version", () => {
    const ids = BUILTIN_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of BUILTIN_TEMPLATES) {
      expect(t.version, t.id).toMatch(/^\d+\.\d+\.\d+$/);
      expect(t.name.length, t.id).toBeGreaterThan(0);
    }
  });

  it("every module id is real and resolves to a dependency-complete set", () => {
    for (const t of BUILTIN_TEMPLATES) {
      for (const m of t.modules) expect(isModuleId(m), `${t.id}:${m}`).toBe(true);
      const { enabled } = resolveEnabledModules(t.modules);
      // payroll implies hrms
      if (t.modules.includes("payroll")) expect(enabled).toContain("hrms");
    }
  });

  it("numbering sequences use a known reset policy and sane padding", () => {
    for (const t of BUILTIN_TEMPLATES) {
      for (const s of t.numberingSequences ?? []) {
        if (s.resetPolicy) expect(isResetPolicy(s.resetPolicy)).toBe(true);
        expect((s.padding ?? 1) >= 1).toBe(true);
      }
    }
  });

  it("approval policy steps are contiguous from level 1", () => {
    for (const t of BUILTIN_TEMPLATES) {
      for (const p of t.approvalPolicies ?? []) {
        const levels = p.steps.map((s) => s.level).sort((a, b) => a - b);
        levels.forEach((lvl, i) => expect(lvl).toBe(i + 1));
        for (const s of p.steps) {
          if (s.approverMode === "PERMISSION") expect(s.permissionKey).toBeTruthy();
        }
      }
    }
  });

  it("regional defaults are platform-neutral (not India)", () => {
    for (const t of BUILTIN_TEMPLATES) {
      expect(t.regional.baseCurrency).not.toBe("INR");
      expect(t.regional.timezone).not.toBe("Asia/Kolkata");
    }
  });
});

describe("template lookup", () => {
  it("getTemplate / listTemplates", () => {
    expect(listTemplates().length).toBe(BUILTIN_TEMPLATES.length);
    expect(getTemplate("generic-sme")?.name).toBe("Generic SME");
    expect(getTemplate("nope")).toBeUndefined();
  });
});
