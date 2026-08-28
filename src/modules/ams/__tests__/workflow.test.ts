import { describe, expect, it } from "vitest";
import { canTransition, assertTransition } from "@/modules/ams/workflow";

describe("appraisal workflow transitions", () => {
  it("allows the core happy path", () => {
    expect(canTransition("REVIEWER_RATING", "MANAGEMENT_REVIEW")).toBe(true);
    expect(canTransition("MANAGEMENT_REVIEW", "MEETING_PENDING")).toBe(true);
    expect(canTransition("MEETING_LIVE", "HIKE_FINALISATION")).toBe(true);
    expect(canTransition("HIKE_FINALISATION", "CLOSED")).toBe(true);
  });

  it("allows the optional date-voting detour", () => {
    expect(canTransition("MANAGEMENT_REVIEW", "DATE_VOTING")).toBe(true);
    expect(canTransition("DATE_VOTING", "MEETING_PENDING")).toBe(true);
  });

  it("rejects skipping stages", () => {
    expect(canTransition("REVIEWERS_ASSIGNED", "MEETING_PENDING")).toBe(false);
    expect(canTransition("DATE_VOTING", "CLOSED")).toBe(false);
    expect(() => assertTransition("SELF_ASSESSMENT_OPEN", "CLOSED")).toThrow();
  });
});
