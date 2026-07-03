import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import {
  setDeliveryOrderUploadToggle,
  setDeliveryOrderExtensionToggle,
  applyDeliveryOrderExtension,
  listDeliveryOrderExtensions,
} from "../service";

describe("CHA Delivery Order upload toggle & extension flow", () => {
  let orgId: string;
  let userId: string;
  let jobId: string;
  let additionalDataId: string;

  const daysFromNow = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(12, 0, 0, 0);
    return d;
  };

  beforeAll(async () => {
    const org = await db.organisation.create({
      data: { name: "Test DO Ext Org", slug: "test-do-ext-" + Date.now() },
    });
    orgId = org.id;

    const branch = await db.branch.create({
      data: { orgId, name: "DO Test Branch", code: "DOX-" + Date.now().toString().slice(-4) },
    });
    const user = await db.user.create({
      data: {
        orgId,
        email: `do-ext-${Date.now()}@test.local`,
        passwordHash: "x",
        name: "DO Ext Tester",
        active: true,
      },
    });
    userId = user.id;

    const jobType = await db.chaJobType.create({
      data: { orgId, name: "Import DO Test " + Date.now() },
    });
    const customer = await db.crmAccount.create({
      data: { orgId, ownerId: userId, createdById: userId, updatedById: userId, name: "DO Test Customer" },
    });
    const job = await db.chaJob.create({
      data: {
        orgId,
        jobNumber: "DOX-" + Date.now(),
        title: "DO Extension Test Job",
        customerId: customer.id,
        jobTypeId: jobType.id,
        branchId: branch.id,
        primaryOwnerId: userId,
        stage: "ADDITIONAL_DATA",
      },
    });
    jobId = job.id;

    const additionalData = await db.chaJobAdditionalData.create({
      data: {
        jobId,
        vesselInwardDate: daysFromNow(-10),
        deliveryOrderValidity: daysFromNow(2), // inside the warning window
        status: "COMPLETED",
        createdById: userId,
      },
    });
    additionalDataId = additionalData.id;
  });

  afterAll(async () => {
    await db.chaAuditLog.deleteMany({ where: { jobId } });
    await db.notification.deleteMany({ where: { orgId } });
    await db.chaDoExtension.deleteMany({ where: { jobId } });
    await db.chaJobAdditionalData.deleteMany({ where: { jobId } });
    await db.chaJob.deleteMany({ where: { orgId } });
    await db.crmAccount.deleteMany({ where: { orgId } });
    await db.chaJobType.deleteMany({ where: { orgId } });
    await db.user.deleteMany({ where: { orgId } });
    await db.branch.deleteMany({ where: { orgId } });
    await db.organisation.delete({ where: { id: orgId } });
  });

  it("toggles DO upload and extension flags with audit entries", async () => {
    const upload = await setDeliveryOrderUploadToggle(userId, orgId, jobId, true);
    expect(upload.doUploadEnabled).toBe(true);

    const extension = await setDeliveryOrderExtensionToggle(userId, orgId, jobId, true);
    expect(extension.doExtensionEnabled).toBe(true);

    const audits = await db.chaAuditLog.findMany({
      where: { jobId, event: { in: ["DO_UPLOAD_TOGGLED", "DO_EXTENSION_TOGGLED"] } },
    });
    expect(audits).toHaveLength(2);
  });

  it("rejects extension when the toggle is off", async () => {
    await setDeliveryOrderExtensionToggle(userId, orgId, jobId, false);
    await expect(
      applyDeliveryOrderExtension(userId, orgId, jobId, { extensionDate: daysFromNow(30) })
    ).rejects.toThrow(/extension toggle/i);
    await setDeliveryOrderExtensionToggle(userId, orgId, jobId, true);
  });

  it("rejects an extension date not after the current validity", async () => {
    await expect(
      applyDeliveryOrderExtension(userId, orgId, jobId, { extensionDate: daysFromNow(1) })
    ).rejects.toThrow(/must be after/i);
  });

  it("applies extension: updates validity, records history, dismisses DO notifications, audits", async () => {
    // Simulate an active DO validity notification
    const notification = await db.notification.create({
      data: {
        userId,
        orgId,
        kind: "CHA_DO_VALIDITY_EXPIRING",
        title: "DO validity expiring",
        body: "test",
        link: `/cha/jobs/${jobId}`,
      },
    });

    const newDate = daysFromNow(30);
    const extension = await applyDeliveryOrderExtension(userId, orgId, jobId, {
      extensionDate: newDate,
    });
    expect(extension.extensionDate.toDateString()).toBe(newDate.toDateString());

    // Validity column reflects the extension
    const additionalData = await db.chaJobAdditionalData.findUniqueOrThrow({
      where: { id: additionalDataId },
    });
    expect(additionalData.deliveryOrderValidity!.toDateString()).toBe(newDate.toDateString());

    // Existing notification disappeared
    const refreshed = await db.notification.findUniqueOrThrow({ where: { id: notification.id } });
    expect(refreshed.dismissedAt).not.toBeNull();

    // History listed
    const history = await listDeliveryOrderExtensions(orgId, jobId);
    expect(history).toHaveLength(1);
    expect(history[0].previousValidity).not.toBeNull();

    // Audit trail
    const audit = await db.chaAuditLog.findFirst({
      where: { jobId, event: "DO_EXTENSION_APPLIED" },
    });
    expect(audit).toBeTruthy();
  });

  it("rejects a second extension while no warning is active (validity now far out)", async () => {
    await expect(
      applyDeliveryOrderExtension(userId, orgId, jobId, { extensionDate: daysFromNow(60) })
    ).rejects.toThrow(/warning is active/i);
  });
});
