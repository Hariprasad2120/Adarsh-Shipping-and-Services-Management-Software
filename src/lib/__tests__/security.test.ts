import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  contentDisposition,
  rateLimit,
  requireCronSecret,
  requireProductionSecret,
  resetSecurityRateLimitsForTests,
  resolveInside,
  sanitizeFilename,
  sanitizeText,
} from "@/lib/security";

const originalNodeEnv = process.env.NODE_ENV;
const originalCronSecret = process.env.CRON_SECRET;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  process.env.CRON_SECRET = originalCronSecret;
  resetSecurityRateLimitsForTests();
});

describe("shared security helpers", () => {
  it("requires real production secrets and rejects fallback values", () => {
    process.env.NODE_ENV = "production";

    expect(() => requireProductionSecret("AUTH_SECRET", undefined, "fallback")).toThrow(
      "AUTH_SECRET is required in production.",
    );
    expect(() => requireProductionSecret("AUTH_SECRET", "fallback", "fallback")).toThrow(
      "AUTH_SECRET is required in production.",
    );
    expect(requireProductionSecret("AUTH_SECRET", "real-secret", "fallback")).toBe("real-secret");
  });

  it("requires cron secret in production and accepts header/query/bearer tokens", async () => {
    process.env.NODE_ENV = "production";
    process.env.CRON_SECRET = "cron-secret";

    expect(requireCronSecret(new Request("https://app.test/api/cron?secret=cron-secret"))).toBeNull();
    expect(
      requireCronSecret(
        new Request("https://app.test/api/cron", {
          headers: { authorization: "Bearer cron-secret" },
        }),
      ),
    ).toBeNull();

    const blocked = requireCronSecret(new Request("https://app.test/api/cron"));
    expect(blocked?.status).toBe(401);

    process.env.CRON_SECRET = "";
    expect(requireCronSecret(new Request("https://app.test/api/cron"))?.status).toBe(503);
  });

  it("keeps file paths inside the approved root", () => {
    const root = path.resolve("storage", "uploads");

    expect(resolveInside(root, "org-1", "file.pdf")).toBe(path.join(root, "org-1", "file.pdf"));
    expect(() => resolveInside(root, "..", "..", "secret.env")).toThrow("Unsafe file path.");
  });

  it("sanitizes filenames and content disposition headers", () => {
    const filename = sanitizeFilename('../bad"\r\nfile<script>.pdf');

    expect(filename).toBe("bad___file_script_.pdf");
    expect(contentDisposition('../bad"\r\nfile<script>.pdf', "attachment")).toContain(
      'attachment; filename="bad___file_script_.pdf"',
    );
  });

  it("normalizes external text and strips control characters", () => {
    expect(sanitizeText(" \u0000hello\u0007\nworld ", 20)).toBe("hello\nworld");
    expect(sanitizeText("abcdef", 3)).toBe("abc");
  });

  it("returns 429 with Retry-After when a bucket is exhausted", () => {
    expect(rateLimit("ip:1", { limit: 1, windowMs: 60_000 }).ok).toBe(true);

    const limited = rateLimit("ip:1", { limit: 1, windowMs: 60_000 });
    expect(limited.ok).toBe(false);
    if (!limited.ok) {
      expect(limited.response.status).toBe(429);
      expect(limited.response.headers.get("Retry-After")).toBeTruthy();
    }
  });
});
