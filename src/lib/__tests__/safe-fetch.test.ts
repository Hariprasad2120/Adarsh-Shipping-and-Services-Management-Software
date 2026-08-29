import { describe, expect, it } from "vitest";
import { safeFetch, SsrfBlockedError } from "@/lib/safe-fetch";

describe("safeFetch SSRF guard", () => {
  it("rejects non-https by default", async () => {
    await expect(safeFetch("http://example.com")).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it("rejects unsupported protocols", async () => {
    await expect(safeFetch("ftp://example.com")).rejects.toBeInstanceOf(SsrfBlockedError);
    await expect(safeFetch("file:///etc/passwd")).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it("rejects credentials in the URL", async () => {
    await expect(safeFetch("https://user:pass@example.com")).rejects.toBeInstanceOf(
      SsrfBlockedError,
    );
  });

  it("blocks loopback / metadata / private literal addresses", async () => {
    for (const url of [
      "https://127.0.0.1/",
      "https://169.254.169.254/latest/meta-data/",
      "https://10.0.0.5/",
      "https://192.168.1.1/",
      "https://[::1]/",
      "http://localhost/",
      "https://100.64.0.1/", // CGNAT
    ]) {
      await expect(safeFetch(url, { allowHttp: true }), url).rejects.toBeInstanceOf(
        SsrfBlockedError,
      );
    }
  });

  it("blocks a public host that resolves to a private address (rebinding shape)", async () => {
    await expect(
      safeFetch("https://sneaky.example", {
        resolveHost: async () => ["10.1.2.3"],
      }),
    ).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it("enforces the host allowlist when provided", async () => {
    await expect(
      safeFetch("https://example.com", { allowHosts: ["good.example"] }),
    ).rejects.toBeInstanceOf(SsrfBlockedError);
  });
});
