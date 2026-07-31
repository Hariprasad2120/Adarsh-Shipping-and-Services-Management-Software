import crypto from "node:crypto";

export type GstPortalAddress = {
  attention?: string;
  country?: string;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  fax?: string;
};

export type GstPortalLookupResult = {
  legalName: string;
  tradeName?: string;
  gstin: string;
  gstTreatment: string;
  placeOfSupply: string;
  billingAddress?: GstPortalAddress;
  raw: unknown;
};

type GstPortalConfig =
  | {
      mode: "static-token";
      baseUrl: string;
      gstinLookupPath: string;
      gstinLookupMethod: "GET" | "POST";
      username: string;
      requestGstin: string;
      clientId: string;
      clientSecret: string;
      authToken: string;
      timeoutMs: number;
      authTokenHeader: string;
      usernameHeader: string;
      requestGstinHeader: string;
      clientIdHeader: string;
      clientSecretHeader: string;
    }
  | {
      mode: "credentialed-auth";
      baseUrl: string;
      authPath: string;
      gstinLookupPath: string;
      gstinLookupMethod: "GET" | "POST";
      username: string;
      password: string;
      requestGstin: string;
      clientId: string;
      clientSecret: string;
      publicKey: string;
      timeoutMs: number;
      authTokenHeader: string;
      usernameHeader: string;
      requestGstinHeader: string;
      clientIdHeader: string;
      clientSecretHeader: string;
    };

type CachedToken = {
  cacheKey: string;
  token: string;
  expiresAt: number;
};

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_AUTH_PATH = "/eivital/v1.04/auth";
const DEFAULT_GSTIN_LOOKUP_PATH = "/eivital/v1.04/Master/gstin/{gstin}";
const DEFAULT_GSTIN_LOOKUP_METHOD = "POST";

let cachedToken: CachedToken | null = null;

export const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
};

export async function fetchGstPortalDetails(
  gstin: string,
): Promise<GstPortalLookupResult> {
  const cleanGstin = normalizeGstin(gstin);
  const config = readConfig();
  const token = await resolveAuthToken(config);
  const payload = await fetchLookupPayload(config, token, cleanGstin);
  const data = unwrapPortalPayload(payload);

  return normalizeLookupResult(cleanGstin, data, payload);
}

function normalizeGstin(gstin: string) {
  const cleanGstin = String(gstin || "").trim().toUpperCase();
  if (!/^[0-9A-Z]{15}$/.test(cleanGstin)) {
    throw new Error("GSTIN must be exactly 15 characters.");
  }
  return cleanGstin;
}

function readConfig(): GstPortalConfig {
  const baseUrl = requiredEnv("GST_PORTAL_BASE_URL");
  const username = requiredEnv("GST_PORTAL_USERNAME");
  const requestGstin = requiredEnv("GST_PORTAL_REQUEST_GSTIN");
  const clientId = requiredEnv("GST_PORTAL_CLIENT_ID");
  const clientSecret = requiredEnv("GST_PORTAL_CLIENT_SECRET");
  const authToken = optionalEnv("GST_PORTAL_AUTH_TOKEN");
  const timeoutMs = parseTimeout(optionalEnv("GST_PORTAL_TIMEOUT_MS"));
  const gstinLookupMethod = parseMethod(
    optionalEnv("GST_PORTAL_GSTIN_DETAILS_METHOD") ??
      DEFAULT_GSTIN_LOOKUP_METHOD,
  );
  const common = {
    baseUrl,
    gstinLookupPath:
      optionalEnv("GST_PORTAL_GSTIN_DETAILS_PATH") ??
      DEFAULT_GSTIN_LOOKUP_PATH,
    gstinLookupMethod,
    username,
    requestGstin,
    clientId,
    clientSecret,
    timeoutMs,
    authTokenHeader: optionalEnv("GST_PORTAL_AUTH_TOKEN_HEADER") ?? "AuthToken",
    usernameHeader: optionalEnv("GST_PORTAL_USERNAME_HEADER") ?? "user_name",
    requestGstinHeader:
      optionalEnv("GST_PORTAL_REQUEST_GSTIN_HEADER") ?? "gstin",
    clientIdHeader: optionalEnv("GST_PORTAL_CLIENT_ID_HEADER") ?? "client_id",
    clientSecretHeader:
      optionalEnv("GST_PORTAL_CLIENT_SECRET_HEADER") ?? "client_secret",
  } as const;

  if (authToken) {
    return {
      mode: "static-token",
      ...common,
      authToken,
    };
  }

  const password = requiredEnv("GST_PORTAL_PASSWORD");
  const publicKey = requiredEnv("GST_PORTAL_PUBLIC_KEY");

  return {
    mode: "credentialed-auth",
    ...common,
    authPath: optionalEnv("GST_PORTAL_AUTH_PATH") ?? DEFAULT_AUTH_PATH,
    password,
    publicKey,
  };
}

function parseTimeout(rawValue: string | null) {
  const parsed = Number(rawValue ?? DEFAULT_TIMEOUT_MS);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TIMEOUT_MS;
  }
  return parsed;
}

function parseMethod(method: string): "GET" | "POST" {
  return method.trim().toUpperCase() === "GET" ? "GET" : "POST";
}

function optionalEnv(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function requiredEnv(name: string) {
  const value = optionalEnv(name);
  if (!value) {
    throw new Error(
      `GST portal integration is not configured. Missing ${name} environment variable.`,
    );
  }
  return value;
}

function buildPath(template: string, gstin: string) {
  return template.includes("{gstin}")
    ? template.replace(/\{gstin\}/gi, gstin)
    : template.endsWith("/")
      ? `${template}${gstin}`
      : `${template}/${gstin}`;
}

function buildUrl(baseUrl: string, path: string) {
  return new URL(path.replace(/^\.\//, ""), ensureTrailingSlash(baseUrl)).toString();
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

async function resolveAuthToken(config: GstPortalConfig) {
  if (config.mode === "static-token") {
    return config.authToken;
  }

  const cacheKey = [
    config.baseUrl,
    config.username,
    config.requestGstin,
    config.clientId,
  ].join("|");

  if (cachedToken && cachedToken.cacheKey === cacheKey && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const publicKey = normalizePublicKey(config.publicKey);
  const appKey = crypto.randomBytes(32).toString("base64");

  const payload = await fetchJson({
    url: buildUrl(config.baseUrl, config.authPath),
    method: "POST",
    timeoutMs: config.timeoutMs,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      [config.clientIdHeader]: config.clientId,
      [config.clientSecretHeader]: config.clientSecret,
      [config.requestGstinHeader]: config.requestGstin,
      [config.usernameHeader]: config.username,
    },
    body: JSON.stringify({
      user_name: config.username,
      password: rsaEncrypt(config.password, publicKey),
      app_key: rsaEncrypt(appKey, publicKey),
    }),
  });

  const token =
    readString(
      payload,
      "AuthToken",
      "authToken",
      "auth_token",
      "Data.AuthToken",
      "data.AuthToken",
      "result.AuthToken",
    ) ?? "";

  if (!token) {
    throw new Error(extractPortalError(payload) ?? "GST portal auth token was not returned.");
  }

  const expiresAt = readExpiry(payload);
  cachedToken = { cacheKey, token, expiresAt };
  return token;
}

function normalizePublicKey(value: string) {
  const clean = value.replace(/\\n/g, "\n").trim();
  if (clean.includes("BEGIN PUBLIC KEY")) {
    return clean;
  }

  return [
    "-----BEGIN PUBLIC KEY-----",
    clean,
    "-----END PUBLIC KEY-----",
  ].join("\n");
}

function rsaEncrypt(value: string, publicKey: string) {
  return crypto
    .publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      Buffer.from(value, "utf8"),
    )
    .toString("base64");
}

async function fetchLookupPayload(
  config: GstPortalConfig,
  authToken: string,
  gstin: string,
) {
  const path = buildPath(config.gstinLookupPath, gstin);
  const primaryAttempt = await fetchJson({
    url: buildUrl(config.baseUrl, path),
    method: config.gstinLookupMethod,
    timeoutMs: config.timeoutMs,
    headers: {
      Accept: "application/json",
      ...(config.gstinLookupMethod === "POST"
        ? { "Content-Type": "application/json" }
        : {}),
      [config.clientIdHeader]: config.clientId,
      [config.clientSecretHeader]: config.clientSecret,
      [config.requestGstinHeader]: config.requestGstin,
      [config.usernameHeader]: config.username,
      [config.authTokenHeader]: authToken,
    },
    body: config.gstinLookupMethod === "POST" ? JSON.stringify({}) : undefined,
    tolerateStatus: [405],
  });

  if (
    primaryAttempt.__status === 405 &&
    config.gstinLookupMethod === "POST"
  ) {
    const fallbackHeaders = {
      Accept: "application/json",
      [config.clientIdHeader]: config.clientId,
      [config.clientSecretHeader]: config.clientSecret,
      [config.requestGstinHeader]: config.requestGstin,
      [config.usernameHeader]: config.username,
      [config.authTokenHeader]: authToken,
    };

    return fetchJson({
      url: buildUrl(config.baseUrl, path),
      method: "GET",
      timeoutMs: config.timeoutMs,
      headers: fallbackHeaders,
    });
  }

  return primaryAttempt;
}

async function fetchJson(input: {
  url: string;
  method: "GET" | "POST";
  headers: Record<string, string>;
  timeoutMs: number;
  body?: string;
  tolerateStatus?: number[];
}) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), input.timeoutMs);

  try {
    const response = await fetch(input.url, {
      method: input.method,
      headers: input.headers,
      body: input.body,
      cache: "no-store",
      signal: controller.signal,
    });

    const rawText = await response.text();
    const parsed = tryParseJson(rawText);
    const payload =
      parsed && typeof parsed === "object"
        ? ({ ...parsed, __status: response.status } as Record<string, unknown>)
        : ({ rawText, __status: response.status } as Record<string, unknown>);

    if (!response.ok && !input.tolerateStatus?.includes(response.status)) {
      throw new Error(
        extractPortalError(payload) ??
          `GST portal request failed with status ${response.status}.`,
      );
    }

    return payload;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("GST portal request timed out.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function tryParseJson(rawText: string) {
  if (!rawText) return null;
  try {
    return JSON.parse(rawText);
  } catch {
    return null;
  }
}

function readExpiry(payload: unknown) {
  const expiryValue =
    readString(
      payload,
      "TokenExpiry",
      "tokenExpiry",
      "Data.TokenExpiry",
      "data.TokenExpiry",
      "Expiry",
      "expiry",
    ) ?? "";

  if (expiryValue) {
    const asDate = Date.parse(expiryValue);
    if (!Number.isNaN(asDate)) {
      return asDate;
    }
  }

  return Date.now() + 355 * 60 * 1000;
}

function unwrapPortalPayload(payload: unknown) {
  const nested =
    readUnknown(payload, "Data") ??
    readUnknown(payload, "data") ??
    readUnknown(payload, "Result") ??
    readUnknown(payload, "result") ??
    payload;

  if (
    nested &&
    typeof nested === "object" &&
    !Array.isArray(nested) &&
    Object.keys(nested).length === 1
  ) {
    const firstValue = Object.values(nested)[0];
    if (firstValue && typeof firstValue === "object") {
      return firstValue;
    }
  }

  return nested;
}

function normalizeLookupResult(
  gstin: string,
  data: unknown,
  raw: unknown,
): GstPortalLookupResult {
  const legalName =
    readString(data, "legalName", "LegalName", "lgnm", "tradeName", "tradeNam") ??
    "";
  const tradeName =
    readString(data, "tradeName", "TradeName", "tradeNam", "tgname") ??
    undefined;

  if (!legalName) {
    throw new Error(
      extractPortalError(raw) ??
        "GST portal response did not include a legal or trade name.",
    );
  }

  const address = normalizeAddress(data, gstin);
  const placeOfSupply =
    address.state || GST_STATE_CODES[gstin.slice(0, 2)] || "Tamil Nadu";

  return {
    gstin,
    legalName,
    tradeName,
    gstTreatment: normalizeGstTreatment(data),
    placeOfSupply,
    billingAddress: address,
    raw,
  };
}

function normalizeAddress(data: unknown, gstin: string): GstPortalAddress {
  const directAddress =
    readUnknown(data, "billingAddress") ??
    readUnknown(data, "BillingAddress") ??
    readUnknown(data, "principalAddress") ??
    readUnknown(data, "PrincipalAddress") ??
    readUnknown(data, "pradr") ??
    readUnknown(data, "PrAdr");
  const nestedAddress =
    readUnknown(directAddress, "addr") ??
    readUnknown(directAddress, "Addr") ??
    directAddress;

  const stateCode =
    readString(nestedAddress, "stcd", "stateCode") ?? gstin.slice(0, 2);
  const state =
    readString(nestedAddress, "state", "State", "stcd") ??
    GST_STATE_CODES[stateCode] ??
    GST_STATE_CODES[gstin.slice(0, 2)] ??
    "Tamil Nadu";

  const street1 = joinParts([
    readString(nestedAddress, "street1", "Street1", "bno"),
    readString(nestedAddress, "street2", "Street2", "bnm", "flno"),
    readString(nestedAddress, "st", "street", "streetName"),
  ]);
  const street2 = joinParts([
    readString(nestedAddress, "loc", "location"),
    readString(nestedAddress, "dst", "district"),
  ]);

  return {
    attention: undefined,
    country:
      readString(nestedAddress, "country", "Country") ??
      readString(directAddress, "country", "Country") ??
      "India",
    street1: street1 || undefined,
    street2: street2 || undefined,
    city:
      readString(nestedAddress, "city", "City", "loc") ??
      readString(directAddress, "city", "City") ??
      undefined,
    state,
    pincode:
      readString(nestedAddress, "pincode", "Pincode", "pncd", "PinCode") ??
      undefined,
    phone:
      readString(nestedAddress, "phone", "Phone", "mobile", "Mobile") ??
      readString(directAddress, "phone", "Phone") ??
      undefined,
    fax:
      readString(nestedAddress, "fax", "Fax") ??
      readString(directAddress, "fax", "Fax") ??
      undefined,
  };
}

function normalizeGstTreatment(data: unknown) {
  const typeValue =
    readString(
      data,
      "gstTreatment",
      "GstTreatment",
      "taxpayerType",
      "TaxpayerType",
      "registrationType",
      "RegistrationType",
      "dty",
      "ctb",
      "sts",
    ) ?? "";
  const normalized = typeValue.trim().toLowerCase();

  if (normalized.includes("composition")) {
    return "Registered Business - Composition";
  }
  if (normalized.includes("sez")) {
    return "SEZ";
  }
  if (
    normalized.includes("overseas") ||
    normalized.includes("non resident") ||
    normalized.includes("non-resident")
  ) {
    return "Overseas";
  }
  if (normalized.includes("unregistered")) {
    return "Unregistered Business";
  }
  if (normalized.includes("consumer")) {
    return "Consumer";
  }

  return "Registered Business - Regular";
}

function joinParts(parts: Array<string | undefined>) {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");
}

function extractPortalError(payload: unknown) {
  const direct =
    readString(
      payload,
      "message",
      "Message",
      "error",
      "Error",
      "errorMessage",
      "ErrorMessage",
      "info",
      "InfoDtls",
      "rawText",
    ) ?? "";
  if (direct) {
    return direct;
  }

  const errorDetails =
    readUnknown(payload, "ErrorDetails") ??
    readUnknown(payload, "errorDetails") ??
    readUnknown(payload, "Errors") ??
    readUnknown(payload, "errors");
  if (Array.isArray(errorDetails) && errorDetails.length > 0) {
    const first = errorDetails[0];
    return (
      readString(first, "message", "Message", "error", "Error") ??
      String(first)
    );
  }

  return null;
}

function readUnknown(value: unknown, path: string) {
  if (!value || typeof value !== "object") return undefined;

  const keys = path.split(".");
  let current: unknown = value;

  for (const key of keys) {
    if (!current || typeof current !== "object" || !(key in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

function readString(value: unknown, ...paths: string[]) {
  for (const path of paths) {
    const candidate = readUnknown(value, path);
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return undefined;
}
