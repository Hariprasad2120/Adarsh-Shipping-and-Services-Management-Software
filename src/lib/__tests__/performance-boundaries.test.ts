import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function tracked(pattern: string) {
  return execFileSync("git", ["ls-files", pattern], {
    cwd: root,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean);
}

describe("performance architecture boundaries", () => {
  it("deduplicates authentication throughout React server render trees", () => {
    const renderFiles = [
      ...tracked("src/app/**/page.tsx"),
      ...tracked("src/app/**/layout.tsx"),
    ];
    const directAuth = renderFiles.filter((file) => /\bauth\s*\(\s*\)/.test(read(file)));

    expect(directAuth).toEqual([]);
    expect(read("src/lib/auth.ts")).toContain("export const getSession = cache(auth)");
    expect(read("src/lib/api-helpers.ts")).toContain("await auth()");
  });

  it("keeps immediate revocation, disabled-user rejection, and RBAC enforcement", () => {
    const auth = read("src/lib/auth.ts");
    const sessions = read("src/lib/session-service.ts");
    const rbac = read("src/lib/rbac.ts");

    expect(auth).toContain("await validateSession(nonce");
    expect(sessions).toContain('reason: "USER_DISABLED"');
    expect(sessions).toContain('status: "REVOKED"');
    expect(rbac).toContain("throw new ForbiddenError(permissionKey)");
  });

  it("keeps CHA list/query modules observational and integration-free", () => {
    const queryFiles = tracked("src/modules/**/queries.ts");
    const forbidden = queryFiles.flatMap((file) => {
      const source = read(file);
      return /from\s+["'][^"']*\/(?:actions|commands|integrations)(?:\/|["'])/.test(
        source,
      )
        ? [file]
        : [];
    });
    const jobsPage = read("src/app/(dashboard)/cha/jobs/page.tsx");

    expect(forbidden).toEqual([]);
    expect(jobsPage).not.toContain("@/modules/cha/service");
    expect(jobsPage).not.toContain("ensureSettingsAndDefaults");
    expect(jobsPage).not.toMatch(/\b(?:create|update|upsert|delete)\s*\(/);
  });

  it("keeps dashboard and CHA initial reads bounded", () => {
    const dashboardPage = read("src/app/(dashboard)/dashboard/page.tsx");
    const dashboardService = read("src/modules/dashboard/service.ts");
    const dashboardClient = read("src/app/(dashboard)/dashboard/portal-client.tsx");
    const chaPage = read("src/app/(dashboard)/cha/page.tsx");
    const database = read("src/lib/db.ts");

    expect(dashboardPage).not.toContain("getTeamReportees");
    expect(dashboardClient).toContain('fetch("/api/hrms/team/reportees")');
    expect(dashboardService).toContain("readAggregatedCounts");
    expect(dashboardService).toContain("METRIC_SNAPSHOT_TTL_MS = 8_000");
    expect(chaPage).not.toContain("getCachedCustomers");
    expect(chaPage).not.toContain("getEligibleManagers");
    expect(chaPage).toContain("createNotifications: false");
    expect(database).not.toContain("Starting local background scheduler");
  });
});
