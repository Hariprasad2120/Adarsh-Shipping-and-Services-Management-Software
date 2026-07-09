import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import * as emailLib from "@/lib/email";
import { flushEmailQueue } from "@/modules/notifications/service";
import { finalizeChecklistMainCustomerEmail, queueChecklistMainCustomerEmail } from "../checklist-email-automation";

const createdOrgIds: string[] = [];

async function cleanupOrg(orgId: string) {
  await db.chaChecklistMailLog.deleteMany({ where: { checklist: { job: { orgId } } } });
  await db.chaChecklistDecision.deleteMany({ where: { checklist: { job: { orgId } } } });
  await db.chaChecklistFileVersion.deleteMany({ where: { checklist: { job: { orgId } } } });
  await db.chaChecklist.deleteMany({ where: { job: { orgId } } });
  await db.chaJobAssignment.deleteMany({ where: { job: { orgId } } });
  await db.chaJob.deleteMany({ where: { orgId } });
  await db.chaJobType.deleteMany({ where: { orgId } });
  await db.crmContact.deleteMany({ where: { account: { orgId } } });
  await db.crmAccount.deleteMany({ where: { orgId } });
  await db.user.deleteMany({ where: { orgId } });
  await db.branch.deleteMany({ where: { orgId } });
  await db.organisation.deleteMany({ where: { id: orgId } });
}

async function createFixture(customerEmail = "customer@example.com") {
  const nowSeed = Date.now().toString();
  const org = await db.organisation.create({
    data: {
      name: `Checklist Email Org ${nowSeed}`,
      slug: `checklist-email-org-${nowSeed}`,
    },
  });
  createdOrgIds.push(org.id);

  const branch = await db.branch.create({
    data: {
      orgId: org.id,
      name: "Mundra",
      code: `MUN-${nowSeed.slice(-4)}`,
    },
  });

  const user = await db.user.create({
    data: {
      orgId: org.id,
      email: `owner-${nowSeed}@example.com`,
      passwordHash: "dummy-hash",
      name: "Checklist Owner",
      branchId: branch.id,
    },
  });

  const customer = await db.crmAccount.create({
    data: {
      orgId: org.id,
      ownerId: user.id,
      name: "Automation Customer",
      type: "Customer",
      email: customerEmail,
      createdById: user.id,
      updatedById: user.id,
    },
  });

  const jobType = await db.chaJobType.create({
    data: {
      orgId: org.id,
      name: `Import Clearance ${nowSeed}`,
    },
  });

  const job = await db.chaJob.create({
    data: {
      orgId: org.id,
      jobNumber: `CHA-AUTO-${nowSeed.slice(-6)}`,
      title: "Checklist automation job",
      customerId: customer.id,
      customerRef: "CUST-REF-01",
      jobTypeId: jobType.id,
      branchId: branch.id,
      primaryOwnerId: user.id,
      stage: "CHECKLIST_APPROVAL",
    },
  });

  const checklist = await db.chaChecklist.create({
    data: {
      jobId: job.id,
      status: "CUSTOMER_APPROVAL_PENDING",
      currentApprovalStage: "CUSTOMER",
      createdById: user.id,
      updatedById: user.id,
    },
  });

  const fileVersion = await db.chaChecklistFileVersion.create({
    data: {
      checklistId: checklist.id,
      fileKey: "blob:checklist-main",
      originalFileName: "checklist-main.pdf",
      mimeType: "application/pdf",
      fileSize: 4096,
      uploadedById: user.id,
      versionNumber: 1,
      remarks: "Ready for customer review",
    },
  });

  await db.chaChecklist.update({
    where: { id: checklist.id },
    data: { currentFileVersionId: fileVersion.id },
  });

  return { org, user, customer, job, checklist, fileVersion };
}

afterEach(async () => {
  vi.restoreAllMocks();
  await db.emailQueue.deleteMany({});
  while (createdOrgIds.length > 0) {
    const orgId = createdOrgIds.pop();
    if (orgId) {
      await cleanupOrg(orgId);
    }
  }
});

describe("CHA checklist email automation", () => {
  it("queues Checklist Main email successfully with CHA metadata", async () => {
    const fixture = await createFixture();
    const approvalVisibleAt = new Date(Date.now() + 60_000);

    const result = await queueChecklistMainCustomerEmail({
      actorId: fixture.user.id,
      jobId: fixture.job.id,
      jobNumber: fixture.job.jobNumber,
      checklistId: fixture.checklist.id,
      fileVersionId: fixture.fileVersion.id,
      customerId: fixture.customer.id,
      customerName: fixture.customer.name,
      customerReference: fixture.job.customerRef,
      recipientEmail: fixture.customer.email!,
      recipientName: fixture.customer.name,
      approvalVisibleAt,
      checklistFileName: fixture.fileVersion.originalFileName,
      checklistVersionLabel: "Version 1",
      checklistSummary: ["Reference number: test", "Checklist title: Checklist Main"],
      checklistUrl: "https://example.com/cha/jobs/test",
    });

    expect(result.queued).toBe(true);
    expect(result.duplicate).toBe(false);

    const queuedEmail = await db.emailQueue.findUniqueOrThrow({
      where: { automationKey: result.automationKey },
    });
    const metadata = queuedEmail.metadata as Record<string, unknown>;

    expect(queuedEmail.to).toBe("customer@example.com");
    expect(queuedEmail.text).toContain("Checklist Main");
    expect(metadata.module).toBe("CHA");
    expect(metadata.emailType).toBe("CHECKLIST_MAIN");
    expect(metadata.checklistId).toBe(fixture.checklist.id);
  });

  it("does not queue duplicate Checklist Main automation events", async () => {
    const fixture = await createFixture();
    const approvalVisibleAt = new Date(Date.now() + 60_000);

    const first = await queueChecklistMainCustomerEmail({
      actorId: fixture.user.id,
      jobId: fixture.job.id,
      jobNumber: fixture.job.jobNumber,
      checklistId: fixture.checklist.id,
      fileVersionId: fixture.fileVersion.id,
      customerId: fixture.customer.id,
      customerName: fixture.customer.name,
      customerReference: fixture.job.customerRef,
      recipientEmail: fixture.customer.email!,
      recipientName: fixture.customer.name,
      approvalVisibleAt,
      checklistFileName: fixture.fileVersion.originalFileName,
      checklistVersionLabel: "Version 1",
      checklistSummary: ["Checklist title: Checklist Main"],
      checklistUrl: null,
    });
    const second = await queueChecklistMainCustomerEmail({
      actorId: fixture.user.id,
      jobId: fixture.job.id,
      jobNumber: fixture.job.jobNumber,
      checklistId: fixture.checklist.id,
      fileVersionId: fixture.fileVersion.id,
      customerId: fixture.customer.id,
      customerName: fixture.customer.name,
      customerReference: fixture.job.customerRef,
      recipientEmail: fixture.customer.email!,
      recipientName: fixture.customer.name,
      approvalVisibleAt,
      checklistFileName: fixture.fileVersion.originalFileName,
      checklistVersionLabel: "Version 1",
      checklistSummary: ["Checklist title: Checklist Main"],
      checklistUrl: null,
    });

    expect(first.queued).toBe(true);
    expect(second.queued).toBe(false);
    expect(second.duplicate).toBe(true);
  });

  it("flushes queued Checklist Main email and unlocks customer approval after send", async () => {
    const fixture = await createFixture();
    const approvalVisibleAt = new Date(Date.now() + 60_000);

    const queued = await queueChecklistMainCustomerEmail({
      actorId: fixture.user.id,
      jobId: fixture.job.id,
      jobNumber: fixture.job.jobNumber,
      checklistId: fixture.checklist.id,
      fileVersionId: fixture.fileVersion.id,
      customerId: fixture.customer.id,
      customerName: fixture.customer.name,
      customerReference: fixture.job.customerRef,
      recipientEmail: fixture.customer.email!,
      recipientName: fixture.customer.name,
      approvalVisibleAt,
      checklistFileName: fixture.fileVersion.originalFileName,
      checklistVersionLabel: "Version 1",
      checklistSummary: ["Checklist title: Checklist Main"],
      checklistUrl: null,
    });

    expect(queued.queued).toBe(true);

    vi.spyOn(emailLib, "sendEmail").mockResolvedValue(undefined);

    const sent = await flushEmailQueue(10);
    expect(sent).toBe(1);

    const refreshedChecklist = await db.chaChecklist.findUniqueOrThrow({
      where: { id: fixture.checklist.id },
    });
    const queueRow = await db.emailQueue.findUniqueOrThrow({
      where: { automationKey: queued.automationKey },
    });
    const mailLog = await db.chaChecklistMailLog.findFirst({
      where: {
        checklistId: fixture.checklist.id,
        fileVersionId: fixture.fileVersion.id,
      },
    });

    expect(queueRow.status).toBe("sent");
    expect(queueRow.error).toBeNull();
    expect(refreshedChecklist.customerApprovalVisibleAt).not.toBeNull();
    expect(mailLog?.source).toContain("CHA_CHECKLIST_AUTOMATION:");
  });

  it("ignores non-CHA email metadata during finalization", async () => {
    const fixture = await createFixture();

    const queueItem = await db.emailQueue.create({
      data: {
        to: "someone@example.com",
        subject: "Generic email",
        html: "<p>Hello</p>",
        text: "Hello",
        metadata: {
          module: "HRMS",
          emailType: "CHECKLIST_MAIN",
          checklistId: fixture.checklist.id,
        },
      },
    });

    const finalized = await finalizeChecklistMainCustomerEmail(queueItem);
    const mailLogCount = await db.chaChecklistMailLog.count({
      where: { checklistId: fixture.checklist.id },
    });

    expect(finalized).toBe(false);
    expect(mailLogCount).toBe(0);
  });

  it("records delivery failure details without crashing the flush worker", async () => {
    await db.emailQueue.create({
      data: {
        to: "failed@example.com",
        subject: "Failure case",
        html: "<p>Failure</p>",
        text: "Failure",
        attempts: 2,
      },
    });

    vi.spyOn(emailLib, "sendEmail").mockRejectedValue(new Error("Resend outage"));

    const sent = await flushEmailQueue(10);
    expect(sent).toBe(0);

    const failedQueueRow = await db.emailQueue.findFirstOrThrow({
      where: { to: "failed@example.com" },
      orderBy: { createdAt: "desc" },
    });

    expect(failedQueueRow.status).toBe("failed");
    expect(failedQueueRow.error).toContain("Resend outage");

    await db.emailQueue.delete({ where: { id: failedQueueRow.id } });
  });
});
