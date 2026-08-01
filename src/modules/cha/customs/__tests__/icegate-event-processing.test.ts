import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { processIcegateExternalEvent } from "../icegate/event-processing.server";

vi.mock("server-only", () => ({}));

const runId = Date.now().toString(36);

describe("ICEGATE event processing", () => {
  let orgId: string;
  let actorId: string;
  let assigneeId: string;
  let branchId: string;
  let customerId: string;
  let importJobTypeId: string;
  let exportJobTypeId: string;
  let importJobId: string;
  let exportJobId: string;
  let importSubmissionId: string;
  let exportSubmissionId: string;

  beforeAll(async () => {
    const org = await db.organisation.create({
      data: { name: `ICEGATE Events ${runId}`, slug: `icegate-events-${runId}` },
    });
    orgId = org.id;

    const branch = await db.branch.create({
      data: { orgId, name: "Events Branch", code: `EV${runId}` },
    });
    branchId = branch.id;

    const [owner, assignee] = await Promise.all([
      db.user.create({
        data: {
          orgId,
          email: `icegate-events-owner-${runId}@test.local`,
          passwordHash: "test",
          name: "ICEGATE Events Owner",
          active: true,
        },
      }),
      db.user.create({
        data: {
          orgId,
          email: `icegate-events-assignee-${runId}@test.local`,
          passwordHash: "test",
          name: "ICEGATE Events Assignee",
          active: true,
        },
      }),
    ]);
    actorId = owner.id;
    assigneeId = assignee.id;

    const customer = await db.crmAccount.create({
      data: {
        orgId,
        ownerId: actorId,
        createdById: actorId,
        updatedById: actorId,
        name: "ICEGATE Events Customer",
        type: "Customer",
      },
    });
    customerId = customer.id;

    const [importJobType, exportJobType] = await Promise.all([
      db.chaJobType.create({
        data: {
          orgId,
          name: `Import Events ${runId}`,
          movementDirection: "IMPORT",
          filingFlowCategory: "IMPORT_BE",
        },
      }),
      db.chaJobType.create({
        data: {
          orgId,
          name: `Export Events ${runId}`,
          movementDirection: "EXPORT",
          filingFlowCategory: "EXPORT_SB",
        },
      }),
    ]);
    importJobTypeId = importJobType.id;
    exportJobTypeId = exportJobType.id;

    const importJob = await db.chaJob.create({
      data: {
        orgId,
        jobNumber: `IG-EVT-IMP-${runId}`,
        title: "ICEGATE Import Event",
        customerId,
        branchId,
        jobTypeId: importJobTypeId,
        primaryOwnerId: actorId,
        assignments: {
          create: [{ userId: assigneeId, responsibility: "FILING" }],
        },
      },
    });
    importJobId = importJob.id;

    const exportJob = await db.chaJob.create({
      data: {
        orgId,
        jobNumber: `IG-EVT-EXP-${runId}`,
        title: "ICEGATE Export Event",
        customerId,
        branchId,
        jobTypeId: exportJobTypeId,
        primaryOwnerId: actorId,
      },
    });
    exportJobId = exportJob.id;

    const importProfile = await db.chaCustomsFilingProfile.create({
      data: {
        jobId: importJob.id,
        movementDirection: "IMPORT",
        importHeader: {
          create: {
            beType: "HOME_CONSUMPTION",
          },
        },
      },
      include: { importHeader: true },
    });
    const exportProfile = await db.chaCustomsFilingProfile.create({
      data: {
        jobId: exportJob.id,
        movementDirection: "EXPORT",
        exportHeader: {
          create: {
            sbType: "NORMAL",
            leoDate: new Date("2026-07-31T00:00:00.000Z"),
          },
        },
      },
      include: { exportHeader: true },
    });

    const [importSubmission, exportSubmission] = await Promise.all([
      db.chaCustomsExternalSubmission.create({
        data: {
          profileId: importProfile.id,
          idempotencyKey: `import-event-${runId}`,
          submissionMode: "LIVE",
          status: "PENDING",
          submittedById: actorId,
        },
      }),
      db.chaCustomsExternalSubmission.create({
        data: {
          profileId: exportProfile.id,
          idempotencyKey: `export-event-${runId}`,
          submissionMode: "LIVE",
          status: "ACKNOWLEDGED",
          submittedById: actorId,
        },
      }),
    ]);
    importSubmissionId = importSubmission.id;
    exportSubmissionId = exportSubmission.id;
  });

  afterAll(async () => {
    await db.notificationActivity.deleteMany({
      where: { notification: { orgId } },
    });
    await db.notification.deleteMany({ where: { orgId } });
    await db.chaCustomsExternalEvent.deleteMany({
      where: { submission: { profile: { job: { orgId } } } },
    });
    await db.chaCustomsExternalSubmission.deleteMany({
      where: { profile: { job: { orgId } } },
    });
    await db.chaCustomsFilingProfile.deleteMany({
      where: { job: { orgId } },
    });
    await db.chaJob.deleteMany({ where: { orgId } });
    await db.crmAccount.deleteMany({ where: { id: customerId } });
    await db.chaJobType.deleteMany({ where: { id: { in: [importJobTypeId, exportJobTypeId] } } });
    await db.user.deleteMany({ where: { id: { in: [actorId, assigneeId] } } });
    await db.branch.deleteMany({ where: { id: branchId } });
    await db.organisation.deleteMany({ where: { id: orgId } });
  });

  it("deduplicates repeated external events and notifies concerned users once", async () => {
    const payload = {
      submissionId: importSubmissionId,
      eventKind: "QUERY_RECEIVED" as const,
      status: "QUERY" as const,
      externalStatus: "BE_QUERY",
      safeMessage: "ICEGATE raised a query.",
      actorId,
      metadata: {
        messageId: "MSG-QUERY-1",
        responseHash: "hash-query-1",
      },
    };

    const first = await processIcegateExternalEvent(payload);
    const second = await processIcegateExternalEvent(payload);

    const events = await db.chaCustomsExternalEvent.findMany({
      where: { submissionId: importSubmissionId },
      orderBy: { sequenceNo: "asc" },
    });
    const notifications = await db.notification.findMany({
      where: { orgId, kind: "CHA_CUSTOMS_ICEGATE_QUERY" },
      orderBy: { createdAt: "asc" },
    });

    expect(first.deduplicated).toBe(false);
    expect(second.deduplicated).toBe(true);
    expect(events).toHaveLength(1);
    expect(notifications.map((notification) => notification.userId).sort()).toEqual(
      [actorId, assigneeId].sort(),
    );
  });

  it("updates the import read model for processed OOC events", async () => {
    await processIcegateExternalEvent({
      submissionId: importSubmissionId,
      eventKind: "PROCESSED",
      status: "PROCESSED",
      externalStatus: "BE_OOC_PROCESSED",
      safeMessage: "Out of charge received.",
      actorId,
      occurredAt: new Date("2026-08-01T05:30:00.000Z"),
      metadata: {
        messageId: "MSG-OOC-1",
        responseHash: "hash-ooc-1",
      },
    });

    const header = await db.chaImportFilingHeader.findFirstOrThrow({
      where: { profile: { jobId: importJobId } },
      select: { outOfChargeDate: true },
    });
    const submission = await db.chaCustomsExternalSubmission.findUniqueOrThrow({
      where: { id: importSubmissionId },
      select: { status: true, processedAt: true },
    });

    expect(header.outOfChargeDate?.toISOString()).toBe("2026-08-01T05:30:00.000Z");
    expect(submission.status).toBe("PROCESSED");
    expect(submission.processedAt?.toISOString()).toBe("2026-08-01T05:30:00.000Z");
  });

  it("does not overwrite a conflicting manual LEO date on export processed events", async () => {
    await processIcegateExternalEvent({
      submissionId: exportSubmissionId,
      eventKind: "PROCESSED",
      status: "PROCESSED",
      externalStatus: "SB_LEO_PROCESSED",
      safeMessage: "LEO status processed.",
      actorId,
      occurredAt: new Date("2026-08-01T06:00:00.000Z"),
      metadata: {
        messageId: "MSG-LEO-1",
        responseHash: "hash-leo-1",
      },
    });

    const header = await db.chaExportFilingHeader.findFirstOrThrow({
      where: { profile: { jobId: exportJobId } },
      select: { leoDate: true },
    });

    expect(header.leoDate?.toISOString()).toBe("2026-07-31T00:00:00.000Z");
  });
});
