import { describe, expect, it } from "vitest";
import { evaluateApplicability } from "../eligibility";

const baseUser = {
  id: "user-1",
  branchId: "branch-a",
  departmentId: "dept-eng",
  divisionId: null,
  designation: "Engineer",
  employmentType: "PERMANENT",
};

describe("evaluateApplicability", () => {
  it("applies to everyone when no rules exist", () => {
    expect(evaluateApplicability(baseUser, [])).toBe(true);
  });

  it("matches a single INCLUDE rule", () => {
    expect(
      evaluateApplicability(baseUser, [{ mode: "INCLUDE", dimension: "BRANCH", value: "branch-a" }]),
    ).toBe(true);
    expect(
      evaluateApplicability(baseUser, [{ mode: "INCLUDE", dimension: "BRANCH", value: "branch-b" }]),
    ).toBe(false);
  });

  it("ORs multiple INCLUDE rules within the same dimension", () => {
    const rules = [
      { mode: "INCLUDE" as const, dimension: "BRANCH" as const, value: "branch-x" },
      { mode: "INCLUDE" as const, dimension: "BRANCH" as const, value: "branch-a" },
    ];
    expect(evaluateApplicability(baseUser, rules)).toBe(true);
  });

  it("ANDs across different dimensions", () => {
    const rules = [
      { mode: "INCLUDE" as const, dimension: "BRANCH" as const, value: "branch-a" },
      { mode: "INCLUDE" as const, dimension: "DEPARTMENT" as const, value: "dept-sales" },
    ];
    // matches branch but not department -> must fail overall
    expect(evaluateApplicability(baseUser, rules)).toBe(false);
  });

  it("EXCLUDE overrides any INCLUDE match", () => {
    const rules = [
      { mode: "INCLUDE" as const, dimension: "BRANCH" as const, value: "branch-a" },
      { mode: "EXCLUDE" as const, dimension: "EMPLOYEE" as const, value: "user-1" },
    ];
    expect(evaluateApplicability(baseUser, rules)).toBe(false);
  });

  it("matches explicit named employee inclusion regardless of other dimensions", () => {
    const rules = [{ mode: "INCLUDE" as const, dimension: "EMPLOYEE" as const, value: "user-1" }];
    expect(evaluateApplicability(baseUser, rules)).toBe(true);
  });
});
