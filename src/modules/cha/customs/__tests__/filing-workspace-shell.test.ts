import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS,
  type ChaCustomsFeatureFlags,
} from "../feature-flags";
import {
  getGroupedChaCustomsRouteMetadata,
  getVisibleChaCustomsRouteMetadata,
} from "../routes";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("CHA customs filing workspace shell", () => {
  it("keeps import and export job routes hidden while flags are disabled", () => {
    const caps = { "cha.customs.filing.view": true };

    expect(getVisibleChaCustomsRouteMetadata(DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS, caps)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ href: "/cha/jobs/import" }),
        expect.objectContaining({ href: "/cha/jobs/export" }),
      ]),
    );
  });

  it("registers import and export saved views only with matching flags and permission", () => {
    const flags: ChaCustomsFeatureFlags = {
      ...DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS,
      CHA_IMPORT_FILING_WORKSPACE: true,
      CHA_EXPORT_FILING_WORKSPACE: true,
    };
    const grouped = getGroupedChaCustomsRouteMetadata(flags, {
      "cha.customs.filing.view": true,
    });

    expect(grouped.Import.map((route) => route.href)).toContain("/cha/jobs/import");
    expect(grouped.Export.map((route) => route.href)).toContain("/cha/jobs/export");
  });

  it("uses the canonical job query with movement direction instead of a second job system", () => {
    const listAdapter = source("src/modules/cha/customs/filing/job-list.ts");
    const jobQuery = source("src/modules/cha/jobs/queries.ts");

    expect(listAdapter).toContain("listJobs(params.actorId");
    expect(listAdapter).toContain("movementDirection: params.direction");
    expect(jobQuery).toContain("movementDirection?:");
    expect(jobQuery).toContain("where.jobType = { movementDirection: filters.movementDirection }");
  });

  it("loads customs profile projections for visible rows in one bounded batch", () => {
    const listAdapter = source("src/modules/cha/customs/filing/job-list.ts");

    expect(listAdapter).toContain("jobIds = jobs.items.map");
    expect(listAdapter).toContain("jobId: { in: jobIds }");
    expect(listAdapter).toContain("_count");
    expect(listAdapter).not.toContain("for await");
  });

  it("preserves the existing create-job flow and opens customs jobs into the workspace tab", () => {
    const actionSource = source("src/modules/cha/actions.ts");
    const dialogSource = source("src/components/cha/create-job-dialog.tsx");

    expect(actionSource).toContain("chaService.createJob(userId, orgId, data)");
    expect(actionSource).toContain("ensureCustomsFilingProfileForJob");
    expect(dialogSource).toContain("customsDirection");
    expect(dialogSource).toContain("?tab=customsFiling");
  });

  it("adds Customs Filing Data without removing existing job workspace tabs", () => {
    const workspaceSource = source("src/app/(dashboard)/cha/jobs/[jobId]/job-workspace-client.tsx");

    expect(workspaceSource).toContain('"docs"');
    expect(workspaceSource).toContain('"additionalData"');
    expect(workspaceSource).toContain('"checklist"');
    expect(workspaceSource).toContain('"filing"');
    expect(workspaceSource).toContain('"customsFiling"');
    expect(workspaceSource).toContain("Customs Filing Data");
    expect(workspaceSource).toContain("customsSubtab");
    expect(workspaceSource).toContain("CustomsFilingTabs");
  });
});
