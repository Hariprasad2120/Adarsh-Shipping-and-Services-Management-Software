import "server-only";
import { setTimeout as sleep } from "node:timers/promises";
import { loadIcegateConfig, type IcegateConfig } from "./config.server";
import { encryptIcegateCredentials, sha256Base64 } from "./crypto.server";
import { classifyIcegateError, redactIcegateValue } from "./redaction";
import type { IcegateCapability, IcegateClient, IcegateHealthResult, IcegateSubmitRequest, IcegateSubmitResult, IcegateAuthToken } from "./types";

type FetchLike = typeof fetch;

export class RealIcegateClient implements IcegateClient {
  private token: IcegateAuthToken | null = null;
  private lastSafeHealthCheckAt: Date | null = null;

  constructor(
    private readonly config: IcegateConfig = loadIcegateConfig(),
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async validateConfiguration(): Promise<IcegateHealthResult> {
    const configured = this.config.configured;
    this.lastSafeHealthCheckAt = new Date();
    return {
      configured,
      environmentName: this.config.environmentName,
      enabledCapabilities: configured ? ["configuration", "authentication", "token_renewal", "submit_be_file", "submit_sb_file", "acknowledgement_response"] : ["configuration"],
      certificateReadable: this.config.certificateReadable,
      lastSafeHealthCheckAt: this.lastSafeHealthCheckAt,
      safeErrorCategory: configured ? null : "CONFIGURATION_INCOMPLETE",
    };
  }

  getCapabilities() {
    const configured = this.config.configured;
    const enabled = (reason = "Configuration incomplete") => configured ? { supported: true as const } : { supported: false as const, reason };
    return {
      configuration: { supported: true as const },
      authentication: enabled(),
      token_renewal: enabled(),
      submit_be_file: enabled(),
      submit_sb_file: enabled(),
      acknowledgement_response: enabled(),
      live_submission: enabled(),
      status_retrieval: { supported: false as const, reason: "No status retrieval endpoint is documented in the BE/SB Open API contract." },
      query_retrieval: { supported: false as const, reason: "No query/rejection event retrieval endpoint is documented in the BE/SB Open API contract." },
      igm_retrieval: { supported: false as const, reason: "IGM retrieval is not documented in the BE/SB Open API contract." },
    } satisfies Record<IcegateCapability, { supported: boolean; reason?: string }>;
  }

  async acquireToken(): Promise<IcegateAuthToken> {
    if (this.token && this.token.expiresAt.getTime() - Date.now() > 30_000) {
      return this.token;
    }
    return this.renewToken();
  }

  async renewToken(): Promise<IcegateAuthToken> {
    if (!this.config.configured || !this.config.icegateId || !this.config.password || !this.config.publicCertificate) {
      throw new Error("ICEGATE configuration is incomplete.");
    }
    const encrypted = encryptIcegateCredentials({
      icegateId: this.config.icegateId,
      password: this.config.password,
      publicCertificate: this.config.publicCertificate,
    });
    const response = await this.fetchWithTimeout(this.config.authenticationUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(encrypted),
    });
    const body = await response.json() as { status?: string; accessToken?: string; tokenExpiresIn?: string; message?: string };
    if (!response.ok || body.status !== "SUCCESS" || !body.accessToken) {
      throw new Error(`ICEGATE authentication failed: ${body.message ?? response.status}`);
    }
    const expiresAt = parseIcegateTokenExpiry(body.tokenExpiresIn) ?? new Date(Date.now() + 15 * 60_000);
    this.token = { accessToken: body.accessToken, expiresAt };
    return this.token;
  }

  async submitBillOfEntryFile(request: IcegateSubmitRequest) {
    return this.submitFile({ ...request, documentType: "BE" });
  }

  async submitShippingBillFile(request: IcegateSubmitRequest) {
    return this.submitFile({ ...request, documentType: "SB" });
  }

  private async submitFile(request: IcegateSubmitRequest): Promise<IcegateSubmitResult> {
    const requestHash = sha256Base64(request.content);
    const token = await this.acquireToken();
    const form = new FormData();
    const fileBytes = request.content.buffer.slice(
      request.content.byteOffset,
      request.content.byteOffset + request.content.byteLength,
    ) as ArrayBuffer;
    form.append("file", new Blob([fileBytes], { type: "application/json" }), request.fileName);

    for (let attempt = 0; attempt <= this.config.retryLimit; attempt += 1) {
      try {
        const response = await this.fetchWithTimeout(this.config.fileSubmitUrl, {
          method: "POST",
          headers: { token: token.accessToken },
          body: form,
        });
        const body = await response.json() as { validationStatus?: string; message?: string | null; errorMessage?: string | null };
        const safeBody = redactIcegateValue(body);
        return {
          validationStatus: body.validationStatus === "SUCCESS" ? "SUCCESS" : "FAILED",
          message: body.message ?? null,
          errorMessage: body.errorMessage ?? null,
          externalCode: body.validationStatus ?? null,
          retryable: false,
          requestHash,
          responseHash: sha256Base64(JSON.stringify(safeBody)),
        };
      } catch (error) {
        const category = classifyIcegateError(error);
        if (category !== "TRANSIENT_FAILURE" && category !== "TIMEOUT") throw error;
        if (attempt >= this.config.retryLimit) {
          return {
            validationStatus: category,
            message: null,
            errorMessage: category,
            externalCode: category,
            retryable: true,
            requestHash,
            responseHash: null,
          };
        }
        await sleep(250 * 2 ** attempt);
      }
    }
    throw new Error("ICEGATE submission failed after retries.");
  }

  private async fetchWithTimeout(input: string, init: RequestInit) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
    try {
      return await this.fetchImpl(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
}

function parseIcegateTokenExpiry(value: string | undefined) {
  if (!value) return null;
  const normalized = value.replace(/(\d{4})\.(\d{2})\.(\d{2})/, "$1-$2-$3");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}
