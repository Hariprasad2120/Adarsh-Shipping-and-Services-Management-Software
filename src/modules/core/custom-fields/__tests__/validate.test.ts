import { describe, expect, it } from "vitest";
import {
  isFieldType,
  validateFieldPatch,
  validateFieldValue,
  type FieldDefinitionShape,
} from "../validate";

const def = (over: Partial<FieldDefinitionShape>): FieldDefinitionShape => ({
  key: "f",
  fieldType: "TEXT",
  required: false,
  ...over,
});

describe("required / blank handling", () => {
  it("blank + required → error", () => {
    expect(validateFieldValue(def({ required: true }), "")).toEqual({
      ok: false,
      error: "f is required",
    });
  });
  it("blank + optional → null", () => {
    expect(validateFieldValue(def({}), "  ")).toEqual({ ok: true, value: null });
    expect(validateFieldValue(def({ fieldType: "MULTI_SELECT" }), [])).toEqual({
      ok: true,
      value: null,
    });
  });
});

describe("TEXT rules", () => {
  it("minLength / maxLength / pattern", () => {
    expect(validateFieldValue(def({ validation: { minLength: 3 } }), "ab").ok).toBe(false);
    expect(validateFieldValue(def({ validation: { maxLength: 2 } }), "abc").ok).toBe(false);
    expect(validateFieldValue(def({ validation: { pattern: "^[A-Z]{2}$" } }), "de").ok).toBe(false);
    expect(validateFieldValue(def({ validation: { pattern: "^[A-Z]{2}$" } }), "DE")).toEqual({
      ok: true,
      value: "DE",
    });
  });
  it("an invalid regex rule is reported, not thrown", () => {
    const r = validateFieldValue(def({ validation: { pattern: "(" } }), "x");
    expect(r.ok).toBe(false);
  });
});

describe("NUMBER / CURRENCY", () => {
  it("coerces strings and enforces min/max", () => {
    expect(validateFieldValue(def({ fieldType: "NUMBER" }), "42")).toEqual({ ok: true, value: 42 });
    expect(validateFieldValue(def({ fieldType: "NUMBER", validation: { min: 10 } }), 5).ok).toBe(false);
    expect(validateFieldValue(def({ fieldType: "CURRENCY", validation: { max: 100 } }), 250).ok).toBe(
      false,
    );
    expect(validateFieldValue(def({ fieldType: "NUMBER" }), "not-a-number").ok).toBe(false);
  });
});

describe("BOOLEAN / DATE", () => {
  it("boolean coercion", () => {
    expect(validateFieldValue(def({ fieldType: "BOOLEAN" }), "true")).toEqual({ ok: true, value: true });
    expect(validateFieldValue(def({ fieldType: "BOOLEAN" }), 0)).toEqual({ ok: true, value: false });
    expect(validateFieldValue(def({ fieldType: "BOOLEAN" }), "maybe").ok).toBe(false);
  });
  it("DATE normalises to yyyy-mm-dd", () => {
    expect(validateFieldValue(def({ fieldType: "DATE" }), "2026-06-15T10:00:00Z")).toEqual({
      ok: true,
      value: "2026-06-15",
    });
    expect(validateFieldValue(def({ fieldType: "DATE" }), "nope").ok).toBe(false);
  });
});

describe("SELECT / MULTI_SELECT / EMAIL / URL", () => {
  const opts = [{ value: "a" }, { value: "b" }];
  it("SELECT enforces options", () => {
    expect(validateFieldValue(def({ fieldType: "SELECT", options: opts }), "a").ok).toBe(true);
    expect(validateFieldValue(def({ fieldType: "SELECT", options: opts }), "z").ok).toBe(false);
  });
  it("MULTI_SELECT dedupes and enforces options", () => {
    expect(
      validateFieldValue(def({ fieldType: "MULTI_SELECT", options: opts }), ["a", "a", "b"]),
    ).toEqual({ ok: true, value: ["a", "b"] });
    expect(validateFieldValue(def({ fieldType: "MULTI_SELECT", options: opts }), ["a", "z"]).ok).toBe(
      false,
    );
  });
  it("EMAIL / URL format", () => {
    expect(validateFieldValue(def({ fieldType: "EMAIL" }), "x@y.com").ok).toBe(true);
    expect(validateFieldValue(def({ fieldType: "EMAIL" }), "x@y").ok).toBe(false);
    expect(validateFieldValue(def({ fieldType: "URL" }), "https://a.b/c").ok).toBe(true);
    expect(validateFieldValue(def({ fieldType: "URL" }), "not a url").ok).toBe(false);
  });
});

describe("validateFieldPatch", () => {
  const defs = [
    def({ key: "name", fieldType: "TEXT", required: true }),
    def({ key: "age", fieldType: "NUMBER" }),
  ];
  it("rejects unknown keys", () => {
    const r = validateFieldPatch(defs, { name: "Ann", nope: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/unknown custom field "nope"/);
  });
  it("returns normalised values on success", () => {
    const r = validateFieldPatch(defs, { name: "Ann", age: "30" });
    expect(r).toEqual({ ok: true, values: { name: "Ann", age: 30 } });
  });
  it("collects every error", () => {
    const r = validateFieldPatch(defs, { name: "", age: "x" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBe(2);
  });
});

describe("isFieldType", () => {
  it("guards the known set", () => {
    expect(isFieldType("CURRENCY")).toBe(true);
    expect(isFieldType("RICHTEXT")).toBe(false);
  });
});
