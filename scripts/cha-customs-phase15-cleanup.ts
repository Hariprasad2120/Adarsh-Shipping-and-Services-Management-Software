import { db } from "@/lib/db";
import {
  DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS,
  getChaCustomsFeatureFlagsSettingKey,
} from "@/modules/cha/customs/feature-flags";
import {
  CHA_CUSTOMS_PHASE15_MASTER_FIXTURES,
  CHA_CUSTOMS_PHASE15_ROLE_FIXTURES,
  CHA_CUSTOMS_PHASE15_UAT_SCENARIOS,
} from "./cha-customs-phase15-fixtures";
import { verifyExactStagingDatabaseIdentity } from "./staging-target";

const STAGING_ORG_ID = "stg_org_monolith_accounting";
const MASTER_DELEGATES = {
  RITC_TARIFF: "chaRitcTariffMaster",
  CESS_RATE: "chaCessRateMaster",
  RODTEP: "chaRodtepRateMaster",
  RODTEP_EOU: "chaRodtepEouRateMaster",
  ROSCTL: "chaRosctlRateMaster",
  DRAWBACK: "chaDrawbackRateMaster",
  SCHEME_CODE: "chaSchemeCodeMaster",
  SINGLE_WINDOW_CTH: "chaSingleWindowCthMaster",
  AIDC: "chaAidcRateMaster",
  BCD: "chaBcdRateMaster",
  MASTER_NOTIFICATION: "chaCustomsNotificationMaster",
  SUPPORTING_DOCUMENT: "chaSupportingDocumentMaster",
  UOM: "chaUomMaster",
} as const;

async function main() {
  await verifyExactStagingDatabaseIdentity("Phase 15 customs cleanup");

  const jobNumbers = Object.values(CHA_CUSTOMS_PHASE15_UAT_SCENARIOS).filter((value) =>
    value.startsWith("STG-CHA-"),
  );
  const jobs = await db.chaJob.findMany({
    where: {
      orgId: STAGING_ORG_ID,
      jobNumber: { in: jobNumbers },
    },
    select: { id: true },
  });
  const jobIds = jobs.map((job) => job.id);

  if (jobIds.length > 0) {
    await db.chaCustomsExternalEvent.deleteMany({
      where: { submission: { profile: { jobId: { in: jobIds } } } },
    });
    await db.chaCustomsExternalSubmission.deleteMany({
      where: { profile: { jobId: { in: jobIds } } },
    });
    await db.chaCustomsChecklistGeneration.deleteMany({
      where: { profile: { jobId: { in: jobIds } } },
    });
    await db.chaCustomsFlatFileGeneration.deleteMany({
      where: { profile: { jobId: { in: jobIds } } },
    });
    await db.chaCustomsFilingProfile.deleteMany({
      where: { jobId: { in: jobIds } },
    });
    await db.chaAuditLog.deleteMany({
      where: { orgId: STAGING_ORG_ID, jobId: { in: jobIds } },
    });
    await db.chaJob.deleteMany({
      where: { id: { in: jobIds } },
    });
  }

  for (const fixture of CHA_CUSTOMS_PHASE15_MASTER_FIXTURES) {
    const delegateName = MASTER_DELEGATES[fixture.masterType];
    const delegate = db[delegateName] as {
      deleteMany(args: { where: { orgId: string; datasetVersion: string } }): Promise<{ count: number }>;
    };
    await delegate.deleteMany({
      where: {
        orgId: STAGING_ORG_ID,
        datasetVersion: fixture.datasetVersion,
      },
    });
  }
  await db.chaCustomsMasterValidationError.deleteMany({
    where: {
      orgId: STAGING_ORG_ID,
      importRun: {
        datasetVersion: { in: CHA_CUSTOMS_PHASE15_MASTER_FIXTURES.map((fixture) => fixture.datasetVersion) },
      },
    },
  });
  await db.chaCustomsMasterImportRun.deleteMany({
    where: {
      orgId: STAGING_ORG_ID,
      datasetVersion: { in: CHA_CUSTOMS_PHASE15_MASTER_FIXTURES.map((fixture) => fixture.datasetVersion) },
    },
  });

  const roleNames = CHA_CUSTOMS_PHASE15_ROLE_FIXTURES.map((entry) => entry.roleName);
  const userIds = CHA_CUSTOMS_PHASE15_ROLE_FIXTURES.map((entry) => entry.userId);
  const roles = await db.role.findMany({
    where: {
      orgId: STAGING_ORG_ID,
      name: { in: roleNames },
    },
    select: { id: true },
  });
  const roleIds = roles.map((role) => role.id);
  await db.userRole.deleteMany({
    where: { userId: { in: userIds } },
  });
  await db.user.deleteMany({
    where: { id: { in: userIds } },
  });
  await db.rolePermission.deleteMany({
    where: { roleId: { in: roleIds } },
  });
  await db.role.deleteMany({
    where: { id: { in: roleIds } },
  });

  await db.systemSetting.upsert({
    where: { key: getChaCustomsFeatureFlagsSettingKey(STAGING_ORG_ID) },
    update: { value: JSON.stringify(DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS) },
    create: {
      key: getChaCustomsFeatureFlagsSettingKey(STAGING_ORG_ID),
      value: JSON.stringify(DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS),
    },
  });

  console.log("Phase 15 customs staging fixtures, UAT jobs, roles, and feature flags were cleaned up.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await db.$disconnect();
});
