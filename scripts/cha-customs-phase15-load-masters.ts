import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { db } from "@/lib/db";
import {
  applyCustomsMasterImport,
  previewCustomsMasterImport,
  queryCustomsMasterGrid,
} from "@/modules/cha/customs/masters/service";
import {
  lookupAidcByCth,
  lookupBcdByCth,
  lookupByMasterKey,
  lookupCessByRitc,
  lookupNotification,
  lookupRitcOrCth,
  lookupSingleWindowAgency,
  lookupSupportingDocument,
  lookupUom,
} from "@/modules/cha/customs/masters/lookups";
import type { CustomsMasterKey } from "@/modules/cha/customs/masters/definitions";
import {
  CHA_CUSTOMS_PHASE15_MASTER_FIXTURES,
  encodeFixtureCsv,
} from "./cha-customs-phase15-fixtures";
import {
  STAGING_LOGIN_IDENTITY,
} from "./staging-login-policy";
import { verifyExactStagingDatabaseIdentity } from "./staging-target";

const STAGING_ORG_ID = "stg_org_monolith_accounting";
const OUTPUT_PATH = resolve(
  process.cwd(),
  "artifacts",
  "cha-customs",
  "phase15",
  "master-load-evidence.json",
);

type LookupEvidence =
  | { mode: "single"; validFound: boolean; invalidFound: boolean | null; datasetVersion: string | null }
  | { mode: "list"; validCount: number; invalidCount: number | null; datasetVersion: string | null };

async function writeJsonArtifact(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function assertStagingActor() {
  const actor = await db.user.findUnique({
    where: { id: STAGING_LOGIN_IDENTITY.id },
    select: { id: true, orgId: true, email: true },
  });
  if (!actor || actor.orgId !== STAGING_ORG_ID) {
    throw new Error("Phase 15 master load refused: staging maker user is unavailable.");
  }
  return actor;
}

async function verifyLookup(masterType: CustomsMasterKey, code: string, validOn: Date, invalidOn?: Date): Promise<LookupEvidence> {
  switch (masterType) {
    case "RITC_TARIFF": {
      const valid = await lookupRitcOrCth(STAGING_ORG_ID, code, validOn);
      const invalid = invalidOn ? await lookupRitcOrCth(STAGING_ORG_ID, code, invalidOn) : null;
      return {
        mode: "single",
        validFound: Boolean(valid.master),
        invalidFound: invalid === null ? null : Boolean(invalid.master),
        datasetVersion: valid.source?.datasetVersion ?? null,
      };
    }
    case "BCD": {
      const valid = await lookupBcdByCth(STAGING_ORG_ID, code, validOn);
      const invalid = invalidOn ? await lookupBcdByCth(STAGING_ORG_ID, code, invalidOn) : null;
      return {
        mode: "single",
        validFound: Boolean(valid.master),
        invalidFound: invalid === null ? null : Boolean(invalid.master),
        datasetVersion: valid.source?.datasetVersion ?? null,
      };
    }
    case "AIDC": {
      const valid = await lookupAidcByCth(STAGING_ORG_ID, code, validOn);
      const invalid = invalidOn ? await lookupAidcByCth(STAGING_ORG_ID, code, invalidOn) : null;
      return {
        mode: "single",
        validFound: Boolean(valid.master),
        invalidFound: invalid === null ? null : Boolean(invalid.master),
        datasetVersion: valid.source?.datasetVersion ?? null,
      };
    }
    case "CESS_RATE": {
      const valid = await lookupCessByRitc(STAGING_ORG_ID, code, validOn);
      const invalid = invalidOn ? await lookupCessByRitc(STAGING_ORG_ID, code, invalidOn) : null;
      return {
        mode: "single",
        validFound: Boolean(valid.master),
        invalidFound: invalid === null ? null : Boolean(invalid.master),
        datasetVersion: valid.source?.datasetVersion ?? null,
      };
    }
    case "MASTER_NOTIFICATION": {
      const valid = await lookupNotification(STAGING_ORG_ID, code, "1137", "", validOn);
      const invalid = invalidOn ? await lookupNotification(STAGING_ORG_ID, code, "1137", "", invalidOn) : null;
      return {
        mode: "single",
        validFound: Boolean(valid.master),
        invalidFound: invalid === null ? null : Boolean(invalid.master),
        datasetVersion: valid.source?.datasetVersion ?? null,
      };
    }
    case "SUPPORTING_DOCUMENT": {
      const valid = await lookupSupportingDocument(STAGING_ORG_ID, code, validOn);
      const invalid = invalidOn ? await lookupSupportingDocument(STAGING_ORG_ID, code, invalidOn) : null;
      return {
        mode: "single",
        validFound: Boolean(valid.master),
        invalidFound: invalid === null ? null : Boolean(invalid.master),
        datasetVersion: valid.source?.datasetVersion ?? null,
      };
    }
    case "UOM": {
      const valid = await lookupUom(STAGING_ORG_ID, code, validOn);
      const invalid = invalidOn ? await lookupUom(STAGING_ORG_ID, code, invalidOn) : null;
      return {
        mode: "single",
        validFound: Boolean(valid.master),
        invalidFound: invalid === null ? null : Boolean(invalid.master),
        datasetVersion: valid.source?.datasetVersion ?? null,
      };
    }
    case "SINGLE_WINDOW_CTH": {
      const valid = await lookupSingleWindowAgency(STAGING_ORG_ID, code, validOn);
      const invalid = invalidOn ? await lookupSingleWindowAgency(STAGING_ORG_ID, code, invalidOn) : null;
      return {
        mode: "list",
        validCount: valid.length,
        invalidCount: invalid === null ? null : invalid.length,
        datasetVersion: valid[0]?.source?.datasetVersion ?? null,
      };
    }
    default: {
      const valid = await lookupByMasterKey(STAGING_ORG_ID, masterType, code, validOn) as
        | { master: object | null; source: { datasetVersion: string } | null }
        | null;
      const invalid = invalidOn
        ? (await lookupByMasterKey(STAGING_ORG_ID, masterType, code, invalidOn) as
            | { master: object | null; source: { datasetVersion: string } | null }
            | null)
        : null;
      return {
        mode: "single",
        validFound: Boolean(valid?.master),
        invalidFound: invalid === null ? null : Boolean(invalid?.master),
        datasetVersion: valid?.source?.datasetVersion ?? null,
      };
    }
  }
}

async function runControlSafetyChecks(actorId: string) {
  const missingHeaderBytes = new TextEncoder().encode("wrongHeader,quantityDescription\nKGS,Kilograms\n");
  const invalidRatioBytes = new TextEncoder().encode(
    "quantityCode,quantityDescription\nBAG,Bags\nBAD,\nBAD2,\n",
  );

  const missingHeader = await previewCustomsMasterImport({
    orgId: STAGING_ORG_ID,
    actorId,
    options: {
      masterType: "UOM",
      fileName: "uom-missing-header.csv",
      mimeType: "text/csv",
      datasetVersion: "phase15-uom-missing-header-check",
      sourceType: "CONTROLLED_SEED_FIXTURE",
      sourceName: "Phase 15 missing-header control check",
      sourceReference: "phase15-control-check:missing-header",
      sourcePublicationDate: "2026-07-31",
      sourceEffectiveDate: "2026-08-01",
    },
    bytes: missingHeaderBytes,
  }).then(
    () => ({ passed: false, message: "Preview unexpectedly accepted a missing critical header." }),
    (error) => ({ passed: /Missing required headers/i.test(error instanceof Error ? error.message : ""), message: error instanceof Error ? error.message : "Unknown error" }),
  );

  const rejectRatio = await applyCustomsMasterImport({
    orgId: STAGING_ORG_ID,
    actorId,
    options: {
      masterType: "UOM",
      fileName: "uom-mostly-invalid.csv",
      mimeType: "text/csv",
      datasetVersion: "phase15-uom-mostly-invalid-check",
      sourceType: "CONTROLLED_SEED_FIXTURE",
      sourceName: "Phase 15 reject-ratio control check",
      sourceReference: "phase15-control-check:reject-ratio",
      sourcePublicationDate: "2026-07-31",
      sourceEffectiveDate: "2026-08-01",
    },
    bytes: invalidRatioBytes,
  }).then(
    () => ({ passed: false, message: "Apply unexpectedly accepted a mostly invalid dataset." }),
    (error) => ({ passed: /mostly invalid/i.test(error instanceof Error ? error.message : ""), message: error instanceof Error ? error.message : "Unknown error" }),
  );

  return { missingHeader, rejectRatio };
}

async function main() {
  await verifyExactStagingDatabaseIdentity("Phase 15 customs master load");
  const actor = await assertStagingActor();
  const evidence: {
    generatedAt: string;
    orgId: string;
    actorId: string;
    imports: unknown[];
    compatibilityChecks: unknown;
    controlChecks: unknown;
  } = {
    generatedAt: new Date().toISOString(),
    orgId: STAGING_ORG_ID,
    actorId: actor.id,
    imports: [],
    compatibilityChecks: {},
    controlChecks: {},
  };

  for (const fixture of CHA_CUSTOMS_PHASE15_MASTER_FIXTURES) {
    const bytes = encodeFixtureCsv(fixture.rows);
    const preview = await previewCustomsMasterImport({
      orgId: STAGING_ORG_ID,
      actorId: actor.id,
      options: {
        masterType: fixture.masterType,
        fileName: fixture.fileName,
        mimeType: "text/csv",
        datasetVersion: fixture.datasetVersion,
        sourceType: "CONTROLLED_SEED_FIXTURE",
        sourceName: fixture.sourceName,
        sourceReference: fixture.sourceReference,
        sourcePublicationDate: fixture.sourcePublicationDate,
        sourceEffectiveDate: fixture.sourceEffectiveDate,
      },
      bytes,
    });
    const applied = await applyCustomsMasterImport({
      orgId: STAGING_ORG_ID,
      actorId: actor.id,
      options: {
        masterType: fixture.masterType,
        fileName: fixture.fileName,
        mimeType: "text/csv",
        datasetVersion: fixture.datasetVersion,
        sourceType: "CONTROLLED_SEED_FIXTURE",
        sourceName: fixture.sourceName,
        sourceReference: fixture.sourceReference,
        sourcePublicationDate: fixture.sourcePublicationDate,
        sourceEffectiveDate: fixture.sourceEffectiveDate,
      },
      bytes,
    });
    const importRun = await db.chaCustomsMasterImportRun.findUniqueOrThrow({
      where: { id: applied.importRunId },
      include: { validationErrors: true },
    });
    const auditCount = await db.chaAuditLog.count({
      where: {
        orgId: STAGING_ORG_ID,
        entityId: applied.importRunId,
        event: "CUSTOMS_MASTER_IMPORT_APPLIED",
      },
    });
    const page = await queryCustomsMasterGrid({
      actorId: actor.id,
      orgId: STAGING_ORG_ID,
      masterType: fixture.masterType,
      query: {
        page: 1,
        pageSize: 50,
        datasetVersion: fixture.datasetVersion,
        exactCode: fixture.sampleExactCode,
      },
    });
    const lookupEvidence = await verifyLookup(
      fixture.masterType,
      fixture.sampleExactCode,
      new Date(`${fixture.sampleValidOn}T00:00:00.000Z`),
      fixture.sampleInvalidOn
        ? new Date(`${fixture.sampleInvalidOn}T00:00:00.000Z`)
        : undefined,
    );

    evidence.imports.push({
      masterType: fixture.masterType,
      sourceName: fixture.sourceName,
      sourceReference: fixture.sourceReference,
      sourcePublicationDate: fixture.sourcePublicationDate,
      sourceEffectiveDate: fixture.sourceEffectiveDate,
      datasetVersion: fixture.datasetVersion,
      preview: {
        received: preview.received,
        valid: preview.valid,
        insert: preview.insert,
        update: preview.update,
        unchanged: preview.unchanged,
        reject: preview.reject,
        checksum: preview.checksum,
      },
      apply: {
        importRunId: applied.importRunId,
        status: applied.status,
        inserted: importRun.insertedRowCount,
        updated: importRun.updatedRowCount,
        unchanged: importRun.unchangedRowCount,
        rejected: importRun.rejectedRowCount,
      },
      reconciliation: {
        gridTotal: page.total,
        gridRows: page.rows.length,
        sampleBusinessKeys: fixture.sampleBusinessKeys,
        lookupEvidence,
        validationErrors: importRun.validationErrors.length,
        auditCount,
      },
    });
  }

  const [compatBcd, compatUom, compatDocument] = await Promise.all([
    lookupBcdByCth(STAGING_ORG_ID, "01012100", new Date("2026-08-01T00:00:00.000Z")),
    lookupUom(STAGING_ORG_ID, "KGS", new Date("2026-08-01T00:00:00.000Z")),
    lookupSupportingDocument(STAGING_ORG_ID, "001002", new Date("2026-08-01T00:00:00.000Z")),
  ]);
  evidence.compatibilityChecks = {
    importMasterCompatibility: {
      bcd: compatBcd.source?.datasetVersion ?? null,
      uom: compatUom.source?.datasetVersion ?? null,
      supportingDocument: compatDocument.source?.datasetVersion ?? null,
    },
  };
  evidence.controlChecks = await runControlSafetyChecks(actor.id);

  await writeJsonArtifact(OUTPUT_PATH, evidence);
  console.log(`Phase 15 master-load evidence written to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await db.$disconnect();
});
