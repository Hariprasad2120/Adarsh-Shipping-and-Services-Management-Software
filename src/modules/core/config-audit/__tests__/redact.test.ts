import { describe, expect, it } from "vitest";
import { diffKeys, redact, REDACTED, summarise } from "../redact";

describe("redact", () => {
  it("redacts sensitive-looking keys at any depth", () => {
    const out = redact({
      name: "Acme",
      apiKey: "sk-123",
      nested: { clientSecret: "abc", ok: 1 },
      list: [{ token: "t" }, { keep: "y" }],
    }) as Record<string, unknown>;
    expect(out.name).toBe("Acme");
    expect(out.apiKey).toBe(REDACTED);
    expect((out.nested as Record<string, unknown>).clientSecret).toBe(REDACTED);
    expect((out.nested as Record<string, unknown>).ok).toBe(1);
    expect((out.list as Record<string, unknown>[])[0].token).toBe(REDACTED);
    expect((out.list as Record<string, unknown>[])[1].keep).toBe("y");
  });

  it("honours extra key names", () => {
    const out = redact({ gstin: "22AAAAA0000A1Z5" }, ["gstin"]) as Record<string, unknown>;
    expect(out.gstin).toBe(REDACTED);
  });

  it("passes scalars through and stringifies dates", () => {
    expect(redact(42)).toBe(42);
    expect(redact("x")).toBe("x");
    expect(redact(null)).toBe(null);
    expect(redact(new Date("2026-01-02T03:04:05Z"))).toBe("2026-01-02T03:04:05.000Z");
  });

  it("caps recursion depth", () => {
    const deep: Record<string, unknown> = {};
    let cur = deep;
    for (let i = 0; i < 20; i++) {
      cur.next = {};
      cur = cur.next as Record<string, unknown>;
    }
    expect(() => redact(deep)).not.toThrow();
  });
});

describe("diffKeys", () => {
  it("lists only changed top-level keys, sorted", () => {
    expect(
      diffKeys(
        { a: 1, b: 2, c: [1, 2], d: { x: 1 } },
        { a: 1, b: 3, c: [1, 2], d: { x: 2 } },
      ),
    ).toEqual(["b", "d"]);
  });
  it("treats added / removed keys as changed", () => {
    expect(diffKeys({ a: 1 }, { a: 1, b: 2 })).toEqual(["b"]);
    expect(diffKeys({ a: 1, b: 2 }, { a: 1 })).toEqual(["b"]);
  });
  it("is order-insensitive for nested object keys", () => {
    expect(diffKeys({ d: { x: 1, y: 2 } }, { d: { y: 2, x: 1 } })).toEqual([]);
  });
  it("handles non-object inputs", () => {
    expect(diffKeys(null, { a: 1 })).toEqual(["a"]);
    expect(diffKeys(undefined, undefined)).toEqual([]);
  });
});

describe("summarise", () => {
  it("appends the changed keys when present", () => {
    expect(summarise("regional_settings.update", ["baseCurrency", "timezone"])).toBe(
      "regional_settings.update — baseCurrency, timezone",
    );
  });
  it("is just the action when nothing changed", () => {
    expect(summarise("module.enable", [])).toBe("module.enable");
  });
});
