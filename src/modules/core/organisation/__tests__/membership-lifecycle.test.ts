import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canTransition,
  isActiveMembership,
  isMembershipStatus,
  MEMBERSHIP_STATUSES,
  MembershipTransitionError,
} from "../membership-lifecycle";

describe("membership status set", () => {
  it("recognises the five lifecycle states", () => {
    expect(MEMBERSHIP_STATUSES).toEqual([
      "INVITED",
      "ACTIVE",
      "SUSPENDED",
      "DEACTIVATED",
      "ARCHIVED",
    ]);
    expect(isMembershipStatus("ACTIVE")).toBe(true);
    expect(isMembershipStatus("BANNED")).toBe(false);
  });

  it("only ACTIVE can act in the org", () => {
    expect(isActiveMembership("ACTIVE")).toBe(true);
    for (const s of ["INVITED", "SUSPENDED", "DEACTIVATED", "ARCHIVED"]) {
      expect(isActiveMembership(s)).toBe(false);
    }
  });
});

describe("canTransition", () => {
  it("allows the expected forward paths", () => {
    expect(canTransition("INVITED", "ACTIVE")).toBe(true);
    expect(canTransition("ACTIVE", "SUSPENDED")).toBe(true);
    expect(canTransition("SUSPENDED", "ACTIVE")).toBe(true);
    expect(canTransition("DEACTIVATED", "ACTIVE")).toBe(true);
    expect(canTransition("ACTIVE", "ARCHIVED")).toBe(true);
  });

  it("treats a no-op transition as allowed", () => {
    expect(canTransition("ACTIVE", "ACTIVE")).toBe(true);
  });

  it("rejects impossible transitions", () => {
    expect(canTransition("ARCHIVED", "ACTIVE")).toBe(false); // terminal
    expect(canTransition("INVITED", "SUSPENDED")).toBe(false);
    expect(canTransition("bogus", "ACTIVE")).toBe(false);
  });

  it("assertTransition throws on a bad move", () => {
    expect(() => assertTransition("ARCHIVED", "ACTIVE")).toThrow(MembershipTransitionError);
    expect(() => assertTransition("ACTIVE", "DEACTIVATED")).not.toThrow();
  });
});
