import { describe, expect, it } from "vitest";
import { checkRequestIntegrity } from "@/lib/request-integrity";

function req(headers: Record<string, string>) {
  return new Request("https://app.test/api/x", { method: "POST", headers });
}

describe("checkRequestIntegrity", () => {
  it("allows same-origin / same-site / direct navigation via Fetch Metadata", () => {
    expect(checkRequestIntegrity(req({ "sec-fetch-site": "same-origin" })).ok).toBe(true);
    expect(checkRequestIntegrity(req({ "sec-fetch-site": "same-site" })).ok).toBe(true);
    expect(checkRequestIntegrity(req({ "sec-fetch-site": "none" })).ok).toBe(true);
  });

  it("blocks cross-site via Fetch Metadata", () => {
    const r = checkRequestIntegrity(req({ "sec-fetch-site": "cross-site" }));
    expect(r.ok).toBe(false);
  });

  it("blocks a disallowed Origin when no Fetch Metadata", () => {
    expect(checkRequestIntegrity(req({ origin: "https://evil.example" })).ok).toBe(false);
  });

  it("allows a request with neither Origin nor Fetch Metadata (non-browser client)", () => {
    expect(checkRequestIntegrity(req({})).ok).toBe(true);
  });

  it("skips the check for bearer-authenticated requests", () => {
    expect(
      checkRequestIntegrity(req({ "sec-fetch-site": "cross-site" }), { bearer: true }).ok,
    ).toBe(true);
  });

  it("honours an explicit extra origin allowlist", () => {
    expect(
      checkRequestIntegrity(req({ origin: "https://partner.test" }), {
        allowOrigins: ["https://partner.test"],
      }).ok,
    ).toBe(true);
  });
});
