import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";

export const ICEGATE_ENV_NAMES = [
  "ICEGATE_API_KEY",
  "ICEGATE_ENVIRONMENT",
  "ICEGATE_BASE_URL",
  "ICEGATE_ID",
  "ICEGATE_PASSWORD",
  "ICEGATE_PUBLIC_CERT_PATH",
  "ICEGATE_PUBLIC_CERT_PEM",
  "ICEGATE_REQUEST_TIMEOUT_MS",
  "ICEGATE_RETRY_LIMIT",
  "ICEGATE_MOCK_MODE",
  "ICEGATE_LIVE_SUBMISSION_ENABLED",
] as const;

const configSchema = z.object({
  apiKey: z.string().optional(),
  environmentName: z.string().default("production"),
  baseUrl: z.string().url().default("https://cisapi.icegate.gov.in"),
  icegateId: z.string().optional(),
  password: z.string().optional(),
  publicCertificatePath: z.string().optional(),
  publicCertificatePem: z.string().optional(),
  requestTimeoutMs: z.coerce.number().int().min(1000).max(120_000).default(30_000),
  retryLimit: z.coerce.number().int().min(0).max(5).default(2),
  mockMode: z.coerce.boolean().default(false),
  liveSubmissionEnvEnabled: z.coerce.boolean().default(false),
});

export type IcegateConfig = z.output<typeof configSchema> & {
  authenticationUrl: string;
  fileSubmitUrl: string;
  publicCertificate: string | null;
  missing: string[];
  configured: boolean;
  certificateReadable: boolean;
};

export function loadIcegateConfig(env: NodeJS.ProcessEnv = process.env): IcegateConfig {
  const parsed = configSchema.parse({
    apiKey: env.ICEGATE_API_KEY,
    environmentName: env.ICEGATE_ENVIRONMENT,
    baseUrl: env.ICEGATE_BASE_URL,
    icegateId: env.ICEGATE_ID,
    password: env.ICEGATE_PASSWORD,
    publicCertificatePath: env.ICEGATE_PUBLIC_CERT_PATH,
    publicCertificatePem: env.ICEGATE_PUBLIC_CERT_PEM,
    requestTimeoutMs: env.ICEGATE_REQUEST_TIMEOUT_MS,
    retryLimit: env.ICEGATE_RETRY_LIMIT,
    mockMode: env.ICEGATE_MOCK_MODE,
    liveSubmissionEnvEnabled: env.ICEGATE_LIVE_SUBMISSION_ENABLED,
  });

  let publicCertificate = parsed.publicCertificatePem ?? null;
  let certificateReadable = Boolean(publicCertificate);
  if (!publicCertificate && parsed.publicCertificatePath) {
    try {
      if (existsSync(parsed.publicCertificatePath)) {
        publicCertificate = readFileSync(parsed.publicCertificatePath, "utf8");
        certificateReadable = true;
      }
    } catch {
      certificateReadable = false;
    }
  }

  const missing = [
    ["ICEGATE_ID", parsed.icegateId],
    ["ICEGATE_PASSWORD", parsed.password],
    ["ICEGATE_PUBLIC_CERT_PATH or ICEGATE_PUBLIC_CERT_PEM", publicCertificate],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => String(name));

  return {
    ...parsed,
    publicCertificate,
    certificateReadable,
    missing,
    configured: missing.length === 0,
    authenticationUrl: `${parsed.baseUrl.replace(/\/$/, "")}/authentication/v1.0/api/authenticate`,
    fileSubmitUrl: `${parsed.baseUrl.replace(/\/$/, "")}/jsonfiling/v1.0/api/fileSubmit`,
  };
}

export function getSafeIcegateConfigStatus(env: NodeJS.ProcessEnv = process.env) {
  const config = loadIcegateConfig(env);
  return {
    configured: config.configured,
    environmentName: config.environmentName,
    certificateReadable: config.certificateReadable,
    missing: config.missing,
    variableNames: ICEGATE_ENV_NAMES,
  };
}
