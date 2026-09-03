/**
 * Stage 2 — enterprise platform: custom-field value validation (PURE).
 *
 * Coerces and checks a raw value against a field definition. Declarative rules
 * only — patterns are treated as anchored regex strings, never executed as code,
 * and there is no expression evaluation of any kind (spec §6).
 */

export const FIELD_TYPES = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "CURRENCY",
  "DATE",
  "DATETIME",
  "BOOLEAN",
  "SELECT",
  "MULTI_SELECT",
  "REFERENCE",
  "EMAIL",
  "URL",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export function isFieldType(v: string): v is FieldType {
  return (FIELD_TYPES as readonly string[]).includes(v);
}

export type FieldOption = { value: string; label?: string };

export type FieldValidation = {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
};

export type FieldDefinitionShape = {
  key: string;
  fieldType: string;
  required: boolean;
  options?: unknown;
  validation?: unknown;
};

export type ValidationOk = { ok: true; value: unknown };
export type ValidationErr = { ok: false; error: string };
export type ValidationResult = ValidationOk | ValidationErr;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function optionValues(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options
    .map((o) =>
      typeof o === "string"
        ? o
        : o && typeof o === "object" && "value" in o
          ? String((o as FieldOption).value)
          : null,
    )
    .filter((v): v is string => v !== null);
}

function asValidation(v: unknown): FieldValidation {
  return v && typeof v === "object" ? (v as FieldValidation) : {};
}

function isBlank(raw: unknown): boolean {
  return (
    raw === undefined ||
    raw === null ||
    (typeof raw === "string" && raw.trim() === "") ||
    (Array.isArray(raw) && raw.length === 0)
  );
}

/**
 * Validate + normalise one value. Returns the normalised value to persist
 * (JSON scalar / array) or an error message. A blank value for a non-required
 * field normalises to `null`.
 */
export function validateFieldValue(
  def: FieldDefinitionShape,
  raw: unknown,
): ValidationResult {
  const rules = asValidation(def.validation);

  if (isBlank(raw)) {
    if (def.required) return { ok: false, error: `${def.key} is required` };
    return { ok: true, value: null };
  }

  switch (def.fieldType) {
    case "TEXT":
    case "TEXTAREA": {
      const s = String(raw);
      if (rules.minLength != null && s.length < rules.minLength) {
        return { ok: false, error: `${def.key} must be at least ${rules.minLength} characters` };
      }
      if (rules.maxLength != null && s.length > rules.maxLength) {
        return { ok: false, error: `${def.key} must be at most ${rules.maxLength} characters` };
      }
      if (rules.pattern) {
        let re: RegExp;
        try {
          re = new RegExp(rules.pattern);
        } catch {
          return { ok: false, error: `${def.key} has an invalid pattern rule` };
        }
        if (!re.test(s)) return { ok: false, error: `${def.key} does not match the required format` };
      }
      return { ok: true, value: s };
    }

    case "NUMBER":
    case "CURRENCY": {
      const n = typeof raw === "number" ? raw : Number(String(raw).trim());
      if (!Number.isFinite(n)) return { ok: false, error: `${def.key} must be a number` };
      if (rules.min != null && n < rules.min) {
        return { ok: false, error: `${def.key} must be >= ${rules.min}` };
      }
      if (rules.max != null && n > rules.max) {
        return { ok: false, error: `${def.key} must be <= ${rules.max}` };
      }
      return { ok: true, value: n };
    }

    case "BOOLEAN": {
      if (typeof raw === "boolean") return { ok: true, value: raw };
      if (raw === "true" || raw === "1" || raw === 1) return { ok: true, value: true };
      if (raw === "false" || raw === "0" || raw === 0) return { ok: true, value: false };
      return { ok: false, error: `${def.key} must be true or false` };
    }

    case "DATE":
    case "DATETIME": {
      const d = new Date(String(raw));
      if (Number.isNaN(d.getTime())) return { ok: false, error: `${def.key} must be a valid date` };
      return {
        ok: true,
        value: def.fieldType === "DATE" ? d.toISOString().slice(0, 10) : d.toISOString(),
      };
    }

    case "EMAIL": {
      const s = String(raw).trim();
      if (!EMAIL_RE.test(s)) return { ok: false, error: `${def.key} must be a valid email` };
      return { ok: true, value: s };
    }

    case "URL": {
      const s = String(raw).trim();
      try {
        void new URL(s);
      } catch {
        return { ok: false, error: `${def.key} must be a valid URL` };
      }
      return { ok: true, value: s };
    }

    case "REFERENCE": {
      const s = String(raw).trim();
      if (!s) return { ok: false, error: `${def.key} must reference an id` };
      return { ok: true, value: s };
    }

    case "SELECT": {
      const s = String(raw);
      const allowed = optionValues(def.options);
      if (allowed.length > 0 && !allowed.includes(s)) {
        return { ok: false, error: `${def.key}: "${s}" is not an allowed option` };
      }
      return { ok: true, value: s };
    }

    case "MULTI_SELECT": {
      const arr = Array.isArray(raw) ? raw.map(String) : [String(raw)];
      const allowed = optionValues(def.options);
      if (allowed.length > 0) {
        const bad = arr.find((v) => !allowed.includes(v));
        if (bad) return { ok: false, error: `${def.key}: "${bad}" is not an allowed option` };
      }
      return { ok: true, value: Array.from(new Set(arr)) };
    }

    default:
      return { ok: false, error: `${def.key} has an unknown field type "${def.fieldType}"` };
  }
}

/**
 * Validate a patch (key → raw value) against a set of definitions. Unknown keys
 * are rejected. Returns normalised values or the list of errors.
 */
export function validateFieldPatch(
  defs: readonly FieldDefinitionShape[],
  patch: Record<string, unknown>,
): { ok: true; values: Record<string, unknown> } | { ok: false; errors: string[] } {
  const byKey = new Map(defs.map((d) => [d.key, d]));
  const values: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const [key, raw] of Object.entries(patch)) {
    const def = byKey.get(key);
    if (!def) {
      errors.push(`unknown custom field "${key}"`);
      continue;
    }
    const r = validateFieldValue(def, raw);
    if (r.ok) values[key] = r.value;
    else errors.push(r.error);
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, values };
}
