import "server-only";
import { sha256Base64 } from "./crypto.server";
import type { IcegateCapability, IcegateClient, IcegateSubmitRequest, IcegateSubmitResult } from "./types";

export const ICEGATE_MOCK_FIXTURES = [
  "positive_be_acknowledgement",
  "negative_be_acknowledgement",
  "processed_be",
  "be_query",
  "positive_sb_acknowledgement",
  "negative_sb_acknowledgement",
  "sb_query",
  "processed_leo_status",
  "timeout",
  "transient_failure",
  "duplicate_request",
] as const;

export type IcegateMockFixture = (typeof ICEGATE_MOCK_FIXTURES)[number];

export class MockIcegateClient implements IcegateClient {
  private token = { accessToken: "mock-token-redacted", expiresAt: new Date(Date.now() + 15 * 60_000) };
  private seen = new Set<string>();

  constructor(private readonly fixture: IcegateMockFixture = "positive_be_acknowledgement") {}

  async validateConfiguration() {
    return {
      configured: true,
      environmentName: "mock",
      enabledCapabilities: ["configuration", "authentication", "token_renewal", "submit_be_file", "submit_sb_file", "acknowledgement_response"] as IcegateCapability[],
      certificateReadable: true,
      lastSafeHealthCheckAt: new Date(),
      safeErrorCategory: null,
    };
  }

  getCapabilities() {
    return {
      configuration: { supported: true as const },
      authentication: { supported: true as const },
      token_renewal: { supported: true as const },
      submit_be_file: { supported: true as const },
      submit_sb_file: { supported: true as const },
      acknowledgement_response: { supported: true as const },
      live_submission: { supported: false as const, reason: "Mock client never performs live submission." },
      status_retrieval: { supported: false as const, reason: "Mocked only as deterministic fixture state." },
      query_retrieval: { supported: false as const, reason: "Mocked only as deterministic fixture state." },
      igm_retrieval: { supported: false as const, reason: "Unsupported in BE/SB Open API contract." },
    };
  }

  async acquireToken() {
    return this.token;
  }

  async renewToken() {
    this.token = { accessToken: "mock-token-redacted", expiresAt: new Date(Date.now() + 15 * 60_000) };
    return this.token;
  }

  async submitBillOfEntryFile(request: IcegateSubmitRequest) {
    return this.submit(request, "BE");
  }

  async submitShippingBillFile(request: IcegateSubmitRequest) {
    return this.submit(request, "SB");
  }

  private async submit(request: IcegateSubmitRequest, documentType: "BE" | "SB"): Promise<IcegateSubmitResult> {
    const requestHash = sha256Base64(request.content);
    if (this.seen.has(request.idempotencyKey) || this.fixture === "duplicate_request") {
      return { validationStatus: "DUPLICATE", message: "Duplicate request", errorMessage: null, externalCode: "DUPLICATE", retryable: false, requestHash, responseHash: sha256Base64("duplicate") };
    }
    this.seen.add(request.idempotencyKey);
    if (this.fixture === "timeout") return { validationStatus: "TIMEOUT", message: null, errorMessage: "Timeout", externalCode: "TIMEOUT", retryable: true, requestHash, responseHash: null };
    if (this.fixture === "transient_failure") return { validationStatus: "TRANSIENT_FAILURE", message: null, errorMessage: "Transient failure", externalCode: "TRANSIENT", retryable: true, requestHash, responseHash: null };
    const negative = this.fixture.includes("negative");
    const query = this.fixture.includes("query");
    const processed = this.fixture.includes("processed");
    const status = negative ? "FAILED" : "SUCCESS";
    const message = processed
      ? `${documentType} processed`
      : query
        ? `${documentType} query raised`
        : `${documentType} file accepted`;
    return {
      validationStatus: status,
      message,
      errorMessage: negative ? `${documentType} acknowledgement failed` : null,
      externalCode: this.fixture,
      retryable: false,
      requestHash,
      responseHash: sha256Base64(`${status}:${message}`),
    };
  }
}
