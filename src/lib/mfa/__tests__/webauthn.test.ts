import { afterEach, describe, expect, it } from "vitest";
import { expectedOrigin, rpID, RP_NAME } from "@/lib/mfa/webauthn";

const orig = process.env.APP_URL;
afterEach(() => {
  if (orig === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = orig;
});

describe("webauthn RP config", () => {
  it("derives the RP id (hostname) and origin from APP_URL", () => {
    process.env.APP_URL = "https://monolith.example.com";
    expect(rpID()).toBe("monolith.example.com");
    expect(expectedOrigin()).toBe("https://monolith.example.com");
  });

  it("strips the port from the RP id but keeps it in the origin", () => {
    process.env.APP_URL = "http://localhost:3000";
    expect(rpID()).toBe("localhost");
    expect(expectedOrigin()).toBe("http://localhost:3000");
  });

  it("has a stable RP name", () => {
    expect(RP_NAME).toBe("Monolith");
  });
});
