import { describe, expect, it } from "vitest";
import { getVisibleSections } from "@/lib/navigation";
import { getManagedModuleSectionIdForPath } from "@/modules/core/organisation/module-config";

describe("module visibility helpers", () => {
  it("maps protected paths to their managed module ids", () => {
    expect(getManagedModuleSectionIdForPath("/crm/leads")).toBe("crm");
    expect(getManagedModuleSectionIdForPath("/product-catalogue")).toBe("product-catalogue");
    expect(getManagedModuleSectionIdForPath("/hrms/recruit/employer")).toBe("recruit");
    expect(getManagedModuleSectionIdForPath("/dashboard")).toBeNull();
  });

  it("filters nav sections using enabled module ids", () => {
    const caps = {
      "crm.access": true,
      "admin.org.manage": true,
    };

    const sections = getVisibleSections(caps, ["product-catalogue"]);
    const ids = sections.map((section) => section.id);

    expect(ids).toContain("dashboard");
    expect(ids).toContain("product-catalogue");
    expect(ids).toContain("admin");
    expect(ids).not.toContain("crm");
  });
});
