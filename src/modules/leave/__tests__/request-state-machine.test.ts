import { describe, expect, it } from "vitest";
import { assertValidTransition, normalizeStatus, InvalidTransitionError } from "../request";

describe("normalizeStatus", () => {
  it("maps legacy lowercase statuses to the new state machine", () => {
    expect(normalizeStatus("pending")).toBe("PENDING_APPROVAL");
    expect(normalizeStatus("approved")).toBe("APPROVED");
    expect(normalizeStatus("rejected")).toBe("REJECTED");
    expect(normalizeStatus("cancelled")).toBe("CANCELLED");
  });

  it("passes through already-normalized statuses unchanged", () => {
    expect(normalizeStatus("PENDING_APPROVAL")).toBe("PENDING_APPROVAL");
    expect(normalizeStatus("DRAFT")).toBe("DRAFT");
  });
});

describe("assertValidTransition", () => {
  it("allows the documented happy path", () => {
    expect(() => assertValidTransition("DRAFT", "SUBMITTED")).not.toThrow();
    expect(() => assertValidTransition("SUBMITTED", "PENDING_APPROVAL")).not.toThrow();
    expect(() => assertValidTransition("PENDING_APPROVAL", "APPROVED")).not.toThrow();
    expect(() => assertValidTransition("APPROVED", "CANCEL_PENDING")).not.toThrow();
    expect(() => assertValidTransition("CANCEL_PENDING", "CANCELLED")).not.toThrow();
  });

  it("allows extension flow", () => {
    expect(() => assertValidTransition("APPROVED", "EXTENSION_PENDING")).not.toThrow();
    expect(() => assertValidTransition("EXTENSION_PENDING", "APPROVED")).not.toThrow();
  });

  it("rejects transitions out of terminal states", () => {
    expect(() => assertValidTransition("REJECTED", "APPROVED")).toThrow(InvalidTransitionError);
    expect(() => assertValidTransition("CANCELLED", "APPROVED")).toThrow(InvalidTransitionError);
    expect(() => assertValidTransition("WITHDRAWN", "SUBMITTED")).toThrow(InvalidTransitionError);
  });

  it("rejects skipping straight from DRAFT to APPROVED", () => {
    expect(() => assertValidTransition("DRAFT", "APPROVED")).toThrow(InvalidTransitionError);
  });

  it("allows a rejected cancellation to revert to APPROVED", () => {
    expect(() => assertValidTransition("CANCEL_PENDING", "APPROVED")).not.toThrow();
  });
});
