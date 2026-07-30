import "server-only";

import { createHash } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

import { canonicalPayload, payloadHash } from "../request-integrity";
import {
  mappingConfigurationHash,
  resolveRecordMappings,
  validateMappings,
} from "./mapping";
import {
  deterministicMigrationKey,
  migrationManifestHash,
  normalizedSourceVersion,
  parseAccountingImportContract,
} from "./source-contract";
import { boundedSafeMessage } from "./security";
import type {
  AccountingMapping,
  CanonicalMigrationExecutor,
  MigrationPipelineResult,
  NormalizedMigrationRecord,
} from "./types";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(canonicalPayload(value)) as Prisma.InputJsonValue;
}

async function assertPermission(
  orgId: string,
  actorId: string,
  permission: string,
) {
  const count = await db.permission.count({
    where: {
      key: permission,
      roles: {
        some: {
          role: {
            orgId,
            userRoles: {
              some: { userId: actorId, user: { orgId, active: true } },
            },
          },
        },
      },
    },
  });
  if (count === 0) throw new Error(`MIGRATION_PERMISSION_REQUIRED:${permission}`);
}

async function assertExactSyntheticMigrationTarget(
  tx: Prisma.TransactionClient,
) {
  const rows = await tx.$queryRaw<Array<{ allowed: boolean }>>`
    SELECT (
      current_database() = 'monolith_accounting_staging'
      AND current_user = 'monolith_staging'
      AND COALESCE(host(inet_server_addr()), '') = '127.0.0.1'
      AND inet_server_port() = 56432
      AND COALESCE(
        shobj_description(
          (SELECT oid FROM pg_database WHERE datname = current_database()),
          'pg_database'
        ),
        ''
      ) = 'MONOLITH_ACCOUNTING_STAGING_ONLY'
    ) AS allowed
  `;
  if (rows[0]?.allowed !== true) {
    throw new Error("MIGRATION_SYNTHETIC_STAGING_REQUIRED");
  }
}

function assertSingleMutation(count: number, errorCode: string) {
  if (count !== 1) throw new Error(errorCode);
}

export async function persistMigrationDryRun(input: {
  orgId: string;
  legalEntityId: string;
  actorId: string;
  contract: unknown;
  mappings: readonly AccountingMapping[];
  result: MigrationPipelineResult;
  concurrency: number;
}) {
  await assertPermission(
    input.orgId,
    input.actorId,
    "accounting.migration.execute",
  );
  const contract = parseAccountingImportContract(input.contract);
  const manifestHash = migrationManifestHash(contract);
  if (!input.orgId.trim() || !input.legalEntityId.trim()) {
    throw new Error("MIGRATION_BATCH_SCOPE_REQUIRED");
  }
  validateMappings(input.mappings);
  for (const record of contract.records) {
    const scope = resolveRecordMappings({
      record,
      mappings: input.mappings,
    });
    if (
      scope.organizationId !== input.orgId ||
      scope.legalEntityId !== input.legalEntityId
    ) {
      throw new Error("MIGRATION_BATCH_MAPPING_SCOPE_MISMATCH");
    }
  }

  return db.$transaction(
    async (tx) => {
      await assertExactSyntheticMigrationTarget(tx);
      const legalEntity = await tx.accountingLegalEntity.findFirst({
        where: {
          id: input.legalEntityId,
          orgId: input.orgId,
          status: "ACTIVE",
        },
        select: { id: true },
      });
      if (!legalEntity) {
        throw new Error("MIGRATION_LEGAL_ENTITY_SCOPE_MISMATCH");
      }
      const conflicting = await tx.accountingMigrationBatch.findFirst({
        where: {
          orgId: input.orgId,
          sourceSystem: contract.sourceSystem,
          sourceBatchIdentifier: contract.sourceBatchIdentifier,
          sourceManifestHash: { not: manifestHash },
        },
      });
      if (conflicting) {
        throw new Error("MIGRATION_BATCH_MANIFEST_CONFLICT");
      }
      const existing = await tx.accountingMigrationBatch.findUnique({
        where: {
          orgId_sourceSystem_sourceBatchIdentifier_sourceManifestHash: {
            orgId: input.orgId,
            sourceSystem: contract.sourceSystem,
            sourceBatchIdentifier: contract.sourceBatchIdentifier,
            sourceManifestHash: manifestHash,
          },
        },
        include: { records: true },
      });
      if (existing) {
        if (existing.legalEntityId !== input.legalEntityId) {
          throw new Error("MIGRATION_BATCH_LEGAL_ENTITY_SCOPE_MISMATCH");
        }
        return existing;
      }

      const batch = await tx.accountingMigrationBatch.create({
        data: {
          orgId: input.orgId,
          legalEntityId: input.legalEntityId,
          contractVersion: contract.schemaVersion,
          sourceSystem: contract.sourceSystem,
          sourceBatchIdentifier: contract.sourceBatchIdentifier,
          sourceManifestHash: manifestHash,
          mode: "DRY_RUN",
          status:
            input.result.status === "DRY_RUN_READY"
              ? "DRY_RUN_READY"
              : "FAILED",
          actorId: input.actorId,
          correlationId: input.result.correlationId,
          concurrency: input.concurrency,
          sourceSummary: json({
            recordCount: contract.records.length,
            extractedAt: contract.extractedAt,
          }),
          policySnapshot: contract.openingHistoryPolicy
            ? json(contract.openingHistoryPolicy)
            : Prisma.JsonNull,
          reconciliation: json(input.result.reconciliation),
          checkpointStage: "DRY_RUN",
          records: {
            create: contract.records.map((record) => {
              const deterministicKey = deterministicMigrationKey(record);
              const outcome = input.result.outcomes.find(
                (entry) => entry.deterministicKey === deterministicKey,
              );
              return {
                orgId: input.orgId,
                legalEntityId: input.legalEntityId,
                sourceSystem: record.sourceSystem,
                sourceRecordType: record.sourceRecordType,
                sourceIdentifier: record.sourceIdentifier,
                sourceVersion: normalizedSourceVersion(record),
                deterministicKey,
                payloadHash: payloadHash(record.payload),
                normalizedPayload: json(record.payload),
                dependencyKeys: json(record.dependencies),
                status:
                  outcome?.status === "READY"
                    ? "READY"
                    : outcome?.status === "BLOCKED"
                      ? "BLOCKED"
                      : "INVALID",
                validationStatus: outcome?.validationStatus ?? "INVALID",
                reconciliationStatus:
                  outcome?.reconciliationStatus ?? "PENDING",
                errorClassification: outcome?.issue?.classification,
                errorCode: outcome?.issue?.code,
                attachments: {
                  create: record.attachments.map((attachment) => ({
                    orgId: input.orgId,
                    legalEntityId: input.legalEntityId,
                    sourceIdentifier: attachment.sourceIdentifier,
                    relativePath: attachment.relativePath,
                    mimeType: attachment.mimeType,
                    sizeBytes: attachment.sizeBytes,
                    sha256: attachment.sha256.toLowerCase(),
                  })),
                },
              };
            }),
          },
          checkpoints: {
            create: {
              stage: "DRY_RUN",
              sequence: 1,
              processedCount: input.result.outcomes.length,
              successCount: input.result.outcomes.filter(
                (entry) => entry.status === "READY",
              ).length,
              failedCount: input.result.outcomes.filter(
                (entry) => entry.status === "FAILED",
              ).length,
              blockedCount: input.result.outcomes.filter(
                (entry) => entry.status === "BLOCKED",
              ).length,
              stateHash: createHash("sha256")
                .update(canonicalPayload(input.result.outcomes))
                .digest("hex"),
            },
          },
          exceptions: {
            create: input.result.issues.map((issue) => ({
              orgId: input.orgId,
              legalEntityId: input.legalEntityId,
              stage: "DRY_RUN",
              errorClassification: issue.classification,
              errorCode: issue.code,
              safeMessage: issue.safeMessage,
              retryable: issue.retryable,
              manualReview: issue.manualReview,
            })),
          },
        },
        include: { records: true },
      });
      await tx.accountingAuditLog.create({
        data: {
          orgId: input.orgId,
          userId: input.actorId,
          action: "CREATE_ACCOUNTING_MIGRATION_DRY_RUN",
          entityType: "AccountingMigrationBatch",
          entityId: batch.id,
          afterValues: json({
            sourceSystem: contract.sourceSystem,
            sourceBatchIdentifier: contract.sourceBatchIdentifier,
            sourceManifestHash: manifestHash,
            status: batch.status,
            recordCount: contract.records.length,
          }),
        },
      });
      return batch;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

async function assertApprovedExecutionMappings(
  tx: Prisma.TransactionClient,
  input: {
    orgId: string;
    legalEntityId: string;
    record: NormalizedMigrationRecord;
  },
) {
  const mappings = await tx.accountingMigrationMapping.findMany({
    where: {
      orgId: input.orgId,
      sourceSystem: input.record.sourceSystem,
      status: "APPROVED",
      disabledAt: null,
      OR: [
        {
          mappingType: "ORGANIZATION",
          sourceValue: input.record.targetOrganizationRef,
          targetId: input.orgId,
        },
        {
          mappingType: "LEGAL_ENTITY",
          sourceValue: input.record.targetLegalEntityRef,
          targetId: input.legalEntityId,
          legalEntityId: input.legalEntityId,
        },
      ],
    },
  });
  const organizationMappings = mappings.filter(
    (mapping) => mapping.mappingType === "ORGANIZATION",
  );
  const legalEntityMappings = mappings.filter(
    (mapping) => mapping.mappingType === "LEGAL_ENTITY",
  );
  if (organizationMappings.length !== 1 || legalEntityMappings.length !== 1) {
    throw new Error("MIGRATION_APPROVED_MAPPING_SCOPE_REQUIRED");
  }
  for (const mapping of mappings) {
    if (
      !mapping.approvedById ||
      mapping.approvedById === mapping.createdById ||
      mapping.configurationHash !==
        mappingConfigurationHash({
          sourceSystem: mapping.sourceSystem,
          targetOrganizationId: mapping.orgId,
          targetLegalEntityId: mapping.legalEntityId ?? undefined,
          mappingType: mapping.mappingType as AccountingMapping["mappingType"],
          sourceValue: mapping.sourceValue,
          targetType: mapping.targetType,
          targetId: mapping.targetId,
          version: mapping.version,
          status: "APPROVED",
          decisionReference: mapping.decisionReference,
        })
    ) {
      throw new Error("MIGRATION_APPROVED_MAPPING_STALE_OR_INVALID");
    }
  }
}

export function checkpointingMigrationExecutor(input: {
  orgId: string;
  legalEntityId: string;
  actorId: string;
  batchId: string;
  delegate: CanonicalMigrationExecutor;
}): CanonicalMigrationExecutor {
  return {
    async execute(record: NormalizedMigrationRecord) {
      if (
        record.mappedOrganizationId !== input.orgId ||
        record.mappedLegalEntityId !== input.legalEntityId
      ) {
        throw new Error("MIGRATION_RECORD_SCOPE_MISMATCH");
      }
      await assertPermission(
        input.orgId,
        input.actorId,
        "accounting.migration.execute",
      );
      const rowState = await db.$transaction(async (tx) => {
        await assertExactSyntheticMigrationTarget(tx);
        const batch = await tx.accountingMigrationBatch.findFirst({
          where: {
            id: input.batchId,
            orgId: input.orgId,
            legalEntityId: input.legalEntityId,
            productionBlocked: true,
            targetEnvironment: "SYNTHETIC_STAGING",
            status: { in: ["DRY_RUN_READY", "EXECUTING", "FAILED"] },
          },
        });
        if (!batch) throw new Error("MIGRATION_BATCH_NOT_EXECUTABLE");
        await assertApprovedExecutionMappings(tx, {
          orgId: input.orgId,
          legalEntityId: input.legalEntityId,
          record,
        });
        const candidate = await tx.accountingMigrationRecord.findFirst({
          where: {
            batchId: batch.id,
            orgId: input.orgId,
            legalEntityId: input.legalEntityId,
            deterministicKey: record.deterministicKey,
          },
        });
        if (!candidate) throw new Error("MIGRATION_RECORD_SCOPE_MISMATCH");
        if (candidate.status === "SUCCEEDED") {
          return { record: candidate, claimed: false };
        }
        if (!["READY", "FAILED"].includes(candidate.status)) {
          throw new Error("MIGRATION_RECORD_NOT_CLAIMABLE");
        }
        const batchMutation = await tx.accountingMigrationBatch.updateMany({
          where: {
            id: batch.id,
            orgId: input.orgId,
            legalEntityId: input.legalEntityId,
            rowVersion: batch.rowVersion,
            status: { in: ["DRY_RUN_READY", "EXECUTING", "FAILED"] },
          },
          data: {
            mode: "EXECUTE",
            executeAuthorized: true,
            status: "EXECUTING",
            checkpointStage: "CANONICAL_SERVICE_EXECUTION",
            rowVersion: { increment: 1 },
          },
        });
        assertSingleMutation(
          batchMutation.count,
          "MIGRATION_BATCH_CONCURRENT_SCOPE_CONFLICT",
        );
        const recordMutation = await tx.accountingMigrationRecord.updateMany({
          where: {
            id: candidate.id,
            batchId: batch.id,
            orgId: input.orgId,
            legalEntityId: input.legalEntityId,
            rowVersion: candidate.rowVersion,
            status: { in: ["READY", "FAILED"] },
          },
          data: {
            status: "EXECUTING",
            lastAttemptAt: new Date(),
            retryCount: { increment: 1 },
            rowVersion: { increment: 1 },
          },
        });
        assertSingleMutation(
          recordMutation.count,
          "MIGRATION_RECORD_CONCURRENT_SCOPE_CONFLICT",
        );
        return {
          record: {
            ...candidate,
            status: "EXECUTING" as const,
            rowVersion: candidate.rowVersion + 1,
          },
          claimed: true,
        };
      });
      const row = rowState.record;
      try {
        const evidence = await input.delegate.execute(record);
        if (
          !rowState.claimed &&
          row.canonicalTargetIdentifier !== evidence.canonicalTargetIdentifier
        ) {
          throw new Error("MIGRATION_CANONICAL_TARGET_IDEMPOTENCY_CONFLICT");
        }
        if (!rowState.claimed) return evidence;
        await db.$transaction(async (tx) => {
          await assertExactSyntheticMigrationTarget(tx);
          const recordMutation =
            await tx.accountingMigrationRecord.updateMany({
            where: {
              id: row.id,
              batchId: input.batchId,
              orgId: input.orgId,
              legalEntityId: input.legalEntityId,
              status: "EXECUTING",
              rowVersion: row.rowVersion,
            },
            data: {
              status: "SUCCEEDED",
              validationStatus: "VALID",
              canonicalTargetType: record.sourceRecordType,
              canonicalTargetIdentifier: evidence.canonicalTargetIdentifier,
              migratedAt: new Date(),
              errorClassification: null,
              errorCode: null,
              rowVersion: { increment: 1 },
            },
          });
          assertSingleMutation(
            recordMutation.count,
            "MIGRATION_RECORD_SUCCESS_SCOPE_CONFLICT",
          );
          await tx.$queryRaw`
            SELECT pg_advisory_xact_lock(hashtext(${input.batchId}))
          `;
          const latestCheckpoint =
            await tx.accountingMigrationCheckpoint.findFirst({
              where: {
                batchId: input.batchId,
                stage: "CANONICAL_SERVICE_EXECUTION",
              },
              orderBy: { sequence: "desc" },
              select: { sequence: true },
            });
          await tx.accountingMigrationCheckpoint.create({
            data: {
              batchId: input.batchId,
              stage: "CANONICAL_SERVICE_EXECUTION",
              sequence: (latestCheckpoint?.sequence ?? 0) + 1,
              lastRecordKey: record.deterministicKey,
              processedCount: 1,
              successCount: 1,
              stateHash: createHash("sha256")
                .update(
                  canonicalPayload({
                    deterministicKey: record.deterministicKey,
                    canonicalTargetIdentifier:
                      evidence.canonicalTargetIdentifier,
                  }),
                )
                .digest("hex"),
            },
          });
        });
        return evidence;
      } catch (error) {
        if (rowState.claimed) {
          await db.$transaction(async (tx) => {
            await assertExactSyntheticMigrationTarget(tx);
            const recordMutation =
              await tx.accountingMigrationRecord.updateMany({
                where: {
                  id: row.id,
                  batchId: input.batchId,
                  orgId: input.orgId,
                  legalEntityId: input.legalEntityId,
                  status: "EXECUTING",
                  rowVersion: row.rowVersion,
                },
                data: {
                  status: "FAILED",
                  errorClassification: "CANONICAL_SERVICE_FAILURE",
                  errorCode: boundedSafeMessage(error)
                    .split(":")[0]
                    .slice(0, 64),
                  rowVersion: { increment: 1 },
                },
              });
            assertSingleMutation(
              recordMutation.count,
              "MIGRATION_RECORD_FAILURE_SCOPE_CONFLICT",
            );
          });
        }
        throw error;
      }
    },
  };
}

export async function finalizePersistentMigrationBatch(input: {
  orgId: string;
  legalEntityId: string;
  actorId: string;
  batchId: string;
  result: MigrationPipelineResult;
}) {
  await assertPermission(
    input.orgId,
    input.actorId,
    "accounting.migration.execute",
  );
  return db.$transaction(async (tx) => {
    await assertExactSyntheticMigrationTarget(tx);
    const current = await tx.accountingMigrationBatch.findFirst({
      where: {
        id: input.batchId,
        orgId: input.orgId,
        legalEntityId: input.legalEntityId,
        productionBlocked: true,
        targetEnvironment: "SYNTHETIC_STAGING",
        status: { in: ["DRY_RUN_READY", "EXECUTING", "FAILED"] },
      },
      include: {
        records: {
          select: {
            deterministicKey: true,
            status: true,
            canonicalTargetIdentifier: true,
          },
        },
      },
    });
    if (!current) throw new Error("MIGRATION_BATCH_FINALIZATION_SCOPE_MISMATCH");
    if (current.sourceBatchIdentifier !== input.result.batchIdentifier) {
      throw new Error("MIGRATION_BATCH_FINALIZATION_IDENTITY_MISMATCH");
    }
    const status =
      input.result.status === "COMPLETED"
        ? "COMPLETED"
        : input.result.status === "BLOCKED"
          ? "QUARANTINED"
          : "FAILED";
    if (status === "COMPLETED") {
      if (
        input.result.certification?.complete !== true ||
        !input.result.reconciliation.totalsComplete ||
        !input.result.reconciliation.totalsMatch ||
        !input.result.reconciliation.journalBalanced ||
        !input.result.reconciliation.lineageComplete
      ) {
        throw new Error("MIGRATION_BATCH_FINALIZATION_NOT_RECONCILED");
      }
      const outcomeByKey = new Map(
        input.result.outcomes.map((outcome) => [
          outcome.deterministicKey,
          outcome,
        ]),
      );
      if (
        current.records.length !== input.result.outcomes.length ||
        current.records.some((record) => {
          const outcome = outcomeByKey.get(record.deterministicKey);
          return (
            record.status !== "SUCCEEDED" ||
            !record.canonicalTargetIdentifier ||
            !outcome ||
            !["SUCCEEDED", "SKIPPED"].includes(outcome.status) ||
            outcome.canonicalTargetIdentifier !==
              record.canonicalTargetIdentifier
          );
        })
      ) {
        throw new Error("MIGRATION_BATCH_FINALIZATION_RECORD_MISMATCH");
      }
    }
    const batchMutation = await tx.accountingMigrationBatch.updateMany({
      where: {
        id: input.batchId,
        orgId: input.orgId,
        legalEntityId: input.legalEntityId,
        rowVersion: current.rowVersion,
        status: current.status,
        productionBlocked: true,
        targetEnvironment: "SYNTHETIC_STAGING",
      },
      data: {
        status,
        checkpointStage: "RECONCILIATION",
        reconciliation: json(input.result.reconciliation),
        certification: input.result.certification
          ? json(input.result.certification)
          : Prisma.JsonNull,
        quarantineReasonCode:
          status === "QUARANTINED" ? "UNRESOLVED_MIGRATION_ISSUES" : null,
        completedAt: status === "COMPLETED" ? new Date() : null,
        rowVersion: { increment: 1 },
      },
    });
    assertSingleMutation(
      batchMutation.count,
      "MIGRATION_BATCH_FINALIZATION_CONCURRENT_SCOPE_CONFLICT",
    );
    const batch = await tx.accountingMigrationBatch.findFirst({
      where: {
        id: input.batchId,
        orgId: input.orgId,
        legalEntityId: input.legalEntityId,
      },
    });
    if (!batch) throw new Error("MIGRATION_BATCH_FINALIZATION_SCOPE_MISMATCH");
    await tx.accountingAuditLog.create({
      data: {
        orgId: input.orgId,
        userId: input.actorId,
        action: "FINALIZE_ACCOUNTING_MIGRATION_BATCH",
        entityType: "AccountingMigrationBatch",
        entityId: batch.id,
        afterValues: json({ status, complete: input.result.status === "COMPLETED" }),
      },
    });
    return batch;
  });
}

export async function createAuditedMigrationMapping(input: {
  orgId: string;
  actorId: string;
  mapping: AccountingMapping;
}) {
  await assertPermission(
    input.orgId,
    input.actorId,
    "accounting.migration.mapping.manage",
  );
  if (input.mapping.targetOrganizationId !== input.orgId) {
    throw new Error("MAPPING_ORGANIZATION_SCOPE_VIOLATION");
  }
  if (input.mapping.status !== "APPROVED") {
    throw new Error("MAPPING_APPROVAL_INTENT_REQUIRED");
  }
  validateMappings([input.mapping]);
  if (
    input.mapping.mappingType === "LEGAL_ENTITY" &&
    input.mapping.targetLegalEntityId !== input.mapping.targetId
  ) {
    throw new Error("MAPPING_LEGAL_ENTITY_SCOPE_VIOLATION");
  }
  const scopeKey = createHash("sha256")
    .update(
      [
        input.mapping.sourceSystem,
        input.mapping.targetLegalEntityId ?? "*",
        input.mapping.mappingType,
        input.mapping.sourceValue,
      ].join("\u001f"),
    )
    .digest("hex");
  const configurationHash = mappingConfigurationHash(input.mapping);
  return db.$transaction(async (tx) => {
    await assertExactSyntheticMigrationTarget(tx);
    if (input.mapping.targetLegalEntityId) {
      const legalEntity = await tx.accountingLegalEntity.findFirst({
        where: {
          id: input.mapping.targetLegalEntityId,
          orgId: input.orgId,
          status: "ACTIVE",
        },
        select: { id: true },
      });
      if (!legalEntity) {
        throw new Error("MAPPING_LEGAL_ENTITY_SCOPE_VIOLATION");
      }
    }
    const mapping = await tx.accountingMigrationMapping.create({
      data: {
        orgId: input.orgId,
        legalEntityId: input.mapping.targetLegalEntityId,
        sourceSystem: input.mapping.sourceSystem,
        mappingType: input.mapping.mappingType,
        sourceValue: input.mapping.sourceValue,
        scopeKey,
        targetType: input.mapping.targetType,
        targetId: input.mapping.targetId,
        version: input.mapping.version,
        status: "DRAFT",
        configurationHash,
        decisionReference: input.mapping.decisionReference,
        createdById: input.actorId,
      },
    });
    await tx.accountingAuditLog.create({
      data: {
        orgId: input.orgId,
        userId: input.actorId,
        action: "CREATE_ACCOUNTING_MIGRATION_MAPPING",
        entityType: "AccountingMigrationMapping",
        entityId: mapping.id,
        afterValues: json({
          mappingType: mapping.mappingType,
          sourceValueHash: createHash("sha256")
            .update(mapping.sourceValue)
            .digest("hex"),
          targetType: mapping.targetType,
          targetId: mapping.targetId,
          version: mapping.version,
        }),
      },
    });
    return mapping;
  });
}

export async function approveMigrationMapping(input: {
  orgId: string;
  actorId: string;
  mappingId: string;
  expectedVersion: number;
}) {
  await assertPermission(
    input.orgId,
    input.actorId,
    "accounting.migration.mapping.manage",
  );
  return db.$transaction(
    async (tx) => {
      await assertExactSyntheticMigrationTarget(tx);
      const mapping = await tx.accountingMigrationMapping.findFirst({
        where: {
          id: input.mappingId,
          orgId: input.orgId,
          status: "DRAFT",
          rowVersion: input.expectedVersion,
        },
      });
      if (!mapping) throw new Error("MIGRATION_MAPPING_DRAFT_NOT_FOUND");
      if (mapping.createdById === input.actorId) {
        throw new Error("MIGRATION_MAPPING_SELF_APPROVAL_FORBIDDEN");
      }
      const expectedConfigurationHash = mappingConfigurationHash({
        sourceSystem: mapping.sourceSystem,
        targetOrganizationId: mapping.orgId,
        targetLegalEntityId: mapping.legalEntityId ?? undefined,
        mappingType: mapping.mappingType as AccountingMapping["mappingType"],
        sourceValue: mapping.sourceValue,
        targetType: mapping.targetType,
        targetId: mapping.targetId,
        version: mapping.version,
        status: "APPROVED",
        decisionReference: mapping.decisionReference,
      });
      if (mapping.configurationHash !== expectedConfigurationHash) {
        throw new Error("MIGRATION_MAPPING_CONFIGURATION_CONFLICT");
      }
      const mappingMutation =
        await tx.accountingMigrationMapping.updateMany({
        where: {
          id: mapping.id,
          orgId: input.orgId,
          legalEntityId: mapping.legalEntityId,
          status: "DRAFT",
          rowVersion: input.expectedVersion,
        },
        data: {
          status: "APPROVED",
          approvedById: input.actorId,
          approvedAt: new Date(),
          rowVersion: { increment: 1 },
        },
      });
      assertSingleMutation(
        mappingMutation.count,
        "MIGRATION_MAPPING_CONCURRENT_SCOPE_CONFLICT",
      );
      const updated = await tx.accountingMigrationMapping.findFirst({
        where: {
          id: mapping.id,
          orgId: input.orgId,
          legalEntityId: mapping.legalEntityId,
          status: "APPROVED",
        },
      });
      if (!updated) throw new Error("MIGRATION_MAPPING_SCOPE_MISMATCH");
      await tx.accountingAuditLog.create({
        data: {
          orgId: input.orgId,
          userId: input.actorId,
          action: "APPROVE_ACCOUNTING_MIGRATION_MAPPING",
          entityType: "AccountingMigrationMapping",
          entityId: updated.id,
          afterValues: json({
            status: updated.status,
            version: updated.version,
            configurationHash: updated.configurationHash,
          }),
        },
      });
      return updated;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function listApprovedMigrationMappings(input: {
  orgId: string;
  actorId: string;
  sourceSystem: string;
}) {
  await assertPermission(
    input.orgId,
    input.actorId,
    "accounting.migration.read",
  );
  return db.accountingMigrationMapping.findMany({
    where: {
      orgId: input.orgId,
      sourceSystem: input.sourceSystem,
      status: "APPROVED",
    },
    orderBy: [
      { legalEntityId: "asc" },
      { mappingType: "asc" },
      { sourceValue: "asc" },
      { version: "asc" },
    ],
    select: {
      sourceSystem: true,
      orgId: true,
      legalEntityId: true,
      mappingType: true,
      sourceValue: true,
      targetType: true,
      targetId: true,
      version: true,
      status: true,
      decisionReference: true,
    },
  });
}

export async function resolveMigrationException(input: {
  orgId: string;
  legalEntityId: string;
  actorId: string;
  exceptionId: string;
  resolution: "RETRY_REQUESTED" | "SKIPPED";
  reasonCode: string;
}) {
  await assertPermission(
    input.orgId,
    input.actorId,
    "accounting.migration.exception.manage",
  );
  if (!/^[A-Z][A-Z0-9_]{2,63}$/.test(input.reasonCode)) {
    throw new Error("MIGRATION_RESOLUTION_REASON_INVALID");
  }
  return db.$transaction(async (tx) => {
    await assertExactSyntheticMigrationTarget(tx);
    const exception = await tx.accountingMigrationException.findFirst({
      where: {
        id: input.exceptionId,
        orgId: input.orgId,
        legalEntityId: input.legalEntityId,
        status: "OPEN",
        batch: {
          orgId: input.orgId,
          legalEntityId: input.legalEntityId,
        },
      },
      include: { record: true },
    });
    if (!exception) throw new Error("MIGRATION_EXCEPTION_NOT_FOUND");
    if (input.resolution === "SKIPPED" && exception.record?.canonicalTargetIdentifier) {
      throw new Error("POSTED_OR_CREATED_EFFECT_CANNOT_BE_SKIPPED");
    }
    if (input.resolution === "SKIPPED" && !exception.record) {
      throw new Error("MIGRATION_RECORD_REQUIRED_FOR_SKIP");
    }
    if (input.resolution === "SKIPPED" && exception.record) {
      const recordMutation =
        await tx.accountingMigrationRecord.updateMany({
          where: {
            id: exception.record.id,
            batchId: exception.batchId,
            orgId: input.orgId,
            legalEntityId: input.legalEntityId,
            canonicalTargetIdentifier: null,
            status: { in: ["PENDING", "INVALID", "BLOCKED", "READY", "FAILED", "MANUAL_REVIEW"] },
          },
          data: {
            status: "SKIPPED",
            rowVersion: { increment: 1 },
          },
        });
      assertSingleMutation(
        recordMutation.count,
        "MIGRATION_RECORD_SKIP_SCOPE_CONFLICT",
      );
    }
    const exceptionMutation =
      await tx.accountingMigrationException.updateMany({
      where: {
        id: exception.id,
        batchId: exception.batchId,
        orgId: input.orgId,
        legalEntityId: input.legalEntityId,
        status: "OPEN",
      },
      data: {
        status: input.resolution,
        resolutionCode: input.reasonCode,
        resolutionReason: input.reasonCode,
        resolvedById: input.actorId,
        resolvedAt: new Date(),
      },
    });
    assertSingleMutation(
      exceptionMutation.count,
      "MIGRATION_EXCEPTION_CONCURRENT_SCOPE_CONFLICT",
    );
    const updated = await tx.accountingMigrationException.findFirst({
      where: {
        id: exception.id,
        batchId: exception.batchId,
        orgId: input.orgId,
        legalEntityId: input.legalEntityId,
        status: input.resolution,
      },
    });
    if (!updated) throw new Error("MIGRATION_EXCEPTION_SCOPE_MISMATCH");
    await tx.accountingAuditLog.create({
      data: {
        orgId: input.orgId,
        userId: input.actorId,
        action: "RESOLVE_ACCOUNTING_MIGRATION_EXCEPTION",
        entityType: "AccountingMigrationException",
        entityId: updated.id,
        afterValues: json({
          status: updated.status,
          resolutionCode: input.reasonCode,
        }),
      },
    });
    return updated;
  });
}
