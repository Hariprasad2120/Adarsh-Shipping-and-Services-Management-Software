import { describe, expect, it } from "vitest";
import {
  ApprovalRuleError,
  assertMayDecide,
  foldChain,
  levelStatus,
  type DecisionShape,
  type PolicyStepShape,
} from "../decision";

const steps2: PolicyStepShape[] = [
  { level: 1, requiredApprovals: 1 },
  { level: 2, requiredApprovals: 2 },
];

describe("levelStatus", () => {
  it("PENDING until the quorum of distinct approvers is met", () => {
    const d: DecisionShape[] = [{ level: 2, actorUserId: "a", action: "APPROVE" }];
    expect(levelStatus(steps2[1], d)).toBe("PENDING");
  });
  it("APPROVED at quorum", () => {
    const d: DecisionShape[] = [
      { level: 2, actorUserId: "a", action: "APPROVE" },
      { level: 2, actorUserId: "b", action: "APPROVE" },
    ];
    expect(levelStatus(steps2[1], d)).toBe("APPROVED");
  });
  it("duplicate approver does not count twice", () => {
    const d: DecisionShape[] = [
      { level: 2, actorUserId: "a", action: "APPROVE" },
      { level: 2, actorUserId: "a", action: "APPROVE" },
    ];
    expect(levelStatus(steps2[1], d)).toBe("PENDING");
  });
  it("any REJECT fails the level", () => {
    const d: DecisionShape[] = [
      { level: 1, actorUserId: "a", action: "APPROVE" },
      { level: 1, actorUserId: "b", action: "REJECT" },
    ];
    expect(levelStatus(steps2[0], d)).toBe("REJECTED");
  });
});

describe("foldChain", () => {
  it("no steps → APPROVED", () => {
    expect(foldChain([], [])).toEqual({ status: "APPROVED", currentLevel: 1 });
  });
  it("stops at the first unsatisfied level", () => {
    expect(foldChain(steps2, [])).toEqual({ status: "PENDING", currentLevel: 1 });
  });
  it("advances to level 2 once level 1 is cleared", () => {
    const d: DecisionShape[] = [{ level: 1, actorUserId: "x", action: "APPROVE" }];
    expect(foldChain(steps2, d)).toEqual({ status: "PENDING", currentLevel: 2 });
  });
  it("APPROVED only when the final level's quorum is met", () => {
    const d: DecisionShape[] = [
      { level: 1, actorUserId: "x", action: "APPROVE" },
      { level: 2, actorUserId: "a", action: "APPROVE" },
      { level: 2, actorUserId: "b", action: "APPROVE" },
    ];
    expect(foldChain(steps2, d)).toEqual({ status: "APPROVED", currentLevel: 2 });
  });
  it("a rejection at level 1 short-circuits", () => {
    const d: DecisionShape[] = [{ level: 1, actorUserId: "x", action: "REJECT" }];
    expect(foldChain(steps2, d)).toEqual({ status: "REJECTED", currentLevel: 1 });
  });
});

describe("assertMayDecide — segregation of duties", () => {
  const base = {
    requireDistinctApprover: true,
    requesterUserId: "maker",
    priorDecisionsThisRequest: [] as DecisionShape[],
    level: 1,
  };

  it("blocks the requester from approving their own request", () => {
    expect(() => assertMayDecide({ ...base, actorUserId: "maker" })).toThrow(ApprovalRuleError);
  });
  it("blocks an approver acting twice on the same request", () => {
    expect(() =>
      assertMayDecide({
        ...base,
        actorUserId: "checker",
        priorDecisionsThisRequest: [{ level: 1, actorUserId: "checker", action: "APPROVE" }],
      }),
    ).toThrow(/already/i);
  });
  it("allows an independent checker", () => {
    expect(() => assertMayDecide({ ...base, actorUserId: "checker" })).not.toThrow();
  });
  it("permits self-approval when the policy allows it", () => {
    expect(() =>
      assertMayDecide({ ...base, requireDistinctApprover: false, actorUserId: "maker" }),
    ).not.toThrow();
  });
});
