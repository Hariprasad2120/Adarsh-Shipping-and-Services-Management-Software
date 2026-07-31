import type { ChaCustomsFeatureFlags } from "../feature-flags";

export type IcegateDocumentType = "BE" | "SB";

export type IcegateCapability =
  | "configuration"
  | "authentication"
  | "token_renewal"
  | "submit_be_file"
  | "submit_sb_file"
  | "acknowledgement_response"
  | "status_retrieval"
  | "query_retrieval"
  | "igm_retrieval"
  | "live_submission";

export type IcegateCapabilityStatus =
  | { supported: true; reason?: undefined }
  | { supported: false; reason: string };

export type IcegateAuthToken = {
  accessToken: string;
  expiresAt: Date;
};

export type IcegateSubmitRequest = {
  documentType: IcegateDocumentType;
  fileName: string;
  content: Uint8Array;
  idempotencyKey: string;
  metadata?: Record<string, string | number | boolean | null>;
};

export type IcegateSubmitResult = {
  validationStatus: "SUCCESS" | "FAILED" | "TIMEOUT" | "TRANSIENT_FAILURE" | "DUPLICATE";
  message: string | null;
  errorMessage: string | null;
  externalCode?: string | null;
  retryable: boolean;
  requestHash: string;
  responseHash: string | null;
};

export type IcegateHealthResult = {
  configured: boolean;
  environmentName: string;
  enabledCapabilities: IcegateCapability[];
  certificateReadable: boolean;
  lastSafeHealthCheckAt: Date | null;
  safeErrorCategory: string | null;
};

export interface IcegateClient {
  validateConfiguration(): Promise<IcegateHealthResult>;
  getCapabilities(): Record<IcegateCapability, IcegateCapabilityStatus>;
  acquireToken(): Promise<IcegateAuthToken>;
  renewToken(): Promise<IcegateAuthToken>;
  submitBillOfEntryFile(request: IcegateSubmitRequest): Promise<IcegateSubmitResult>;
  submitShippingBillFile(request: IcegateSubmitRequest): Promise<IcegateSubmitResult>;
  retrieveAcknowledgementStatus?(reference: string): Promise<unknown>;
  retrieveQueryOrProcessedEvents?(reference: string): Promise<unknown>;
  fetchIgm?(reference: string): Promise<unknown>;
}

export type IcegateFeatureCapabilityState =
  | { status: "disabled"; reason: "FEATURE_FLAG_DISABLED" }
  | { status: "not_configured"; reason: "ICEGATE_CONFIGURATION_MISSING" }
  | { status: "enabled"; reason: null };

export function evaluateIcegateCapability(
  flags: ChaCustomsFeatureFlags,
  capability: "test_submission" | "live_submission" | IcegateCapability,
): IcegateFeatureCapabilityState {
  void capability;

  if (!flags.CHA_ICEGATE_INTEGRATION) {
    return { status: "disabled", reason: "FEATURE_FLAG_DISABLED" };
  }

  return { status: "not_configured", reason: "ICEGATE_CONFIGURATION_MISSING" };
}
