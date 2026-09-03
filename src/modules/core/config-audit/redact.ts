/**
 * Stage 2 — enterprise platform: config-audit redaction + diff (PURE).
 */

const SENSITIVE_KEY_RE =
  /pass(word|phrase)?|secret|token|api[-_]?key|private[-_]?key|client[-_]?secret|credential|salt|otp|totp|mfa|seed|signature|bearer|authorization|cookie|session/i;

export const REDACTED = "[redacted]";

/**
 * Deep-copy a value with the values of sensitive-looking keys replaced by
 * `[redacted]`. Non-plain values (Dates, etc.) are converted to strings. Guards
 * against cycles and caps recursion depth.
 */
export function redact(value: unknown, extraKeys: readonly string[] = [], depth = 0): unknown {
  if (depth > 8) return "[truncated]";
  if (value === null || value === undefined) return value ?? null;

  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return value;
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((v) => redact(v, extraKeys, depth + 1));
  }

  if (t === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_RE.test(k) || extraKeys.includes(k)) {
        out[k] = REDACTED;
      } else {
        out[k] = redact(v, extraKeys, depth + 1);
      }
    }
    return out;
  }

  return String(value);
}

function stableStringify(v: unknown): string {
  return JSON.stringify(v, (_k, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.keys(val as object)
          .sort()
          .reduce<Record<string, unknown>>((acc, key) => {
            acc[key] = (val as Record<string, unknown>)[key];
            return acc;
          }, {})
      : val,
  );
}

/** Top-level keys whose value differs between `before` and `after`. */
export function diffKeys(before: unknown, after: unknown): string[] {
  const a = (before && typeof before === "object" ? before : {}) as Record<string, unknown>;
  const b = (after && typeof after === "object" ? after : {}) as Record<string, unknown>;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const changed: string[] = [];
  for (const k of keys) {
    if (stableStringify(a[k]) !== stableStringify(b[k])) changed.push(k);
  }
  return changed.sort();
}

/** Short human summary like `regional_settings.update — baseCurrency, timezone`. */
export function summarise(action: string, changedKeys: readonly string[]): string {
  return changedKeys.length > 0 ? `${action} — ${changedKeys.join(", ")}` : action;
}
