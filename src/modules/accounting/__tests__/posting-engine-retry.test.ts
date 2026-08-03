import { describe, expect, it } from "vitest";

import { canRetryDeterministicInboxRequest } from "../posting-engine";

describe("canonical posting retry policy", () => {
  it("allows retry after business-rule rejections once prerequisites are fixed", () => {
    expect(
      canRetryDeterministicInboxRequest({
        status: "REJECTED",
        retryClassification: "BUSINESS_REJECTION",
      }),
    ).toBe(true);
    expect(
      canRetryDeterministicInboxRequest({
        status: "MANUAL_REVIEW",
        retryClassification: "MANUAL_REVIEW",
      }),
    ).toBe(true);
  });

  it("keeps idempotency conflicts terminal", () => {
    expect(
      canRetryDeterministicInboxRequest({
        status: "REJECTED",
        retryClassification: "IDEMPOTENCY_CONFLICT",
      }),
    ).toBe(false);
  });

  it("does not retry active or already-processed requests", () => {
    expect(
      canRetryDeterministicInboxRequest({
        status: "PROCESSING",
        retryClassification: "RETRYABLE",
      }),
    ).toBe(false);
    expect(
      canRetryDeterministicInboxRequest({
        status: "PROCESSED",
        retryClassification: null,
      }),
    ).toBe(false);
  });
});
