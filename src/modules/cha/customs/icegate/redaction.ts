const SENSITIVE_KEYS = /password|token|accessToken|apiKey|secret|credential|certificate|data/i;

export function redactIcegateValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactIcegateValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, child]) => [
        key,
        SENSITIVE_KEYS.test(key) ? "[REDACTED]" : redactIcegateValue(child),
      ]),
    );
  }
  if (typeof value === "string" && value.length > 80) return `${value.slice(0, 12)}...[REDACTED]`;
  return value;
}

export function classifyIcegateError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") return "TIMEOUT";
  if (error instanceof Error && /timeout|network|fetch|ECONNRESET|ETIMEDOUT/i.test(error.message)) {
    return "TRANSIENT_FAILURE";
  }
  return "PERMANENT_FAILURE";
}
