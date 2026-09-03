import { describe, expect, it } from "vitest";
import {
  BASE_LOCALE,
  getCatalogue,
  hasMessage,
  plural,
  registerCatalogue,
  translate,
  translator,
} from "..";

describe("base catalogue is registered on import", () => {
  it("has the common keys", () => {
    expect(BASE_LOCALE).toBe("en");
    expect(translate("common.save")).toBe("Save");
    expect(getCatalogue("en")["state.empty"]).toBe("Nothing here yet");
  });
});

describe("translate", () => {
  it("interpolates named params", () => {
    expect(translate("form.required", { field: "Email" })).toBe("Email is required");
  });

  it("leaves an unmatched placeholder intact", () => {
    registerCatalogue("en", { "t.x": "Hi {name} and {other}" });
    expect(translate("t.x", { name: "Ann" })).toBe("Hi Ann and {other}");
  });

  it("falls back locale → base → key", () => {
    registerCatalogue("fr", { "t.only_fr": "Bonjour" });
    expect(translate("t.only_fr", undefined, "fr")).toBe("Bonjour");
    expect(translate("t.only_fr", undefined, "de")).toBe("t.only_fr"); // no de, no en → key
    expect(translate("common.save", undefined, "de")).toBe("Save"); // base fallback
  });

  it("regional locale falls back to its language (en-GB → en)", () => {
    expect(translate("common.cancel", undefined, "en-GB")).toBe("Cancel");
  });

  it("translator() binds a locale", () => {
    registerCatalogue("es", { "t.hi": "Hola {name}" });
    const t = translator("es");
    expect(t("t.hi", { name: "Ana" })).toBe("Hola Ana");
  });

  it("hasMessage checks locale then base", () => {
    expect(hasMessage("common.save", "de")).toBe(true);
    expect(hasMessage("nope.key")).toBe(false);
  });
});

describe("plural", () => {
  it("picks one / other with English rules", () => {
    const f = { one: "{count} item", other: "{count} items" };
    expect(plural(1, f)).toBe("{count} item");
    expect(plural(2, f)).toBe("{count} items");
    expect(plural(0, f)).toBe("{count} items");
  });
  it("uses zero when supplied", () => {
    expect(plural(0, { zero: "none", one: "one", other: "many" })).toBe("none");
  });
});
