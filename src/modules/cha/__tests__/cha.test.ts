import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import * as chaService from "../service";

describe("Customs House Agent (CHA) Module Integration Tests", () => {
  let org: any;
  let branch: any;
  let ownerUser: any;
  let managerUser: any;
  let otherManagerUser: any;
  let customer: any;
  let jobTypeImport: any;

  beforeAll(async () => {
    // 1. Create a unique Organisation
    org = await db.organisation.create({
      data: {
        name: "Test CHA Org Ltd",
        slug: "test-cha-org-" + Date.now(),
      },
    });

    // 2. Create a unique Branch
    branch = await db.branch.create({
      data: {
        orgId: org.id,
        name: "Test Branch Mundra",
        code: "MUN-" + Date.now().toString().slice(-4),
      },
    });

    // 3. Create Roles
    const employeeRole = await db.role.create({
      data: { orgId: org.id, name: "Employee", isSystem: true },
    });
    const managerRole = await db.role.create({
      data: { orgId: org.id, name: "Manager", isSystem: true },
    });

    const deletePermission = await db.permission.upsert({
      where: { key: "cha.job.delete" },
      update: { label: "Request/Delete CHA Jobs", group: "CHA" },
      create: { key: "cha.job.delete", label: "Request/Delete CHA Jobs", group: "CHA" },
    });
    const approveDeletePermission = await db.permission.upsert({
      where: { key: "cha.job.delete.approve" },
      update: { label: "Approve/Delete Assigned CHA Jobs", group: "CHA" },
      create: { key: "cha.job.delete.approve", label: "Approve/Delete Assigned CHA Jobs", group: "CHA" },
    });
    const internalChecklistApprovePermission = await db.permission.upsert({
      where: { key: "cha.checklist.internal_approve" },
      update: { label: "Internal Approve Checklist", group: "CHA" },
      create: { key: "cha.checklist.internal_approve", label: "Internal Approve Checklist", group: "CHA" },
    });
    const customerChecklistApprovePermission = await db.permission.upsert({
      where: { key: "cha.checklist.customer_approve" },
      update: { label: "Customer Approve Checklist", group: "CHA" },
      create: { key: "cha.checklist.customer_approve", label: "Customer Approve Checklist", group: "CHA" },
    });

    await db.rolePermission.createMany({
      data: [
        { roleId: employeeRole.id, permissionId: deletePermission.id },
        { roleId: managerRole.id, permissionId: deletePermission.id },
        { roleId: managerRole.id, permissionId: approveDeletePermission.id },
        { roleId: managerRole.id, permissionId: internalChecklistApprovePermission.id },
        { roleId: managerRole.id, permissionId: customerChecklistApprovePermission.id },
      ],
      skipDuplicates: true,
    });

    // 4. Create Users
    ownerUser = await db.user.create({
      data: {
        orgId: org.id,
        email: `cha-owner-${Date.now()}@example.com`,
        passwordHash: "dummy-hash",
        name: "Operations Owner",
        branchId: branch.id,
      },
    });

    managerUser = await db.user.create({
      data: {
        orgId: org.id,
        email: `cha-mgr-${Date.now()}@example.com`,
        passwordHash: "dummy-hash",
        name: "Manager Approver",
        branchId: branch.id,
      },
    });

    otherManagerUser = await db.user.create({
      data: {
        orgId: org.id,
        email: `cha-other-mgr-${Date.now()}@example.com`,
        passwordHash: "dummy-hash",
        name: "Other Manager",
        branchId: branch.id,
      },
    });

    // Assign roles to users
    await db.userRole.create({
      data: { userId: ownerUser.id, roleId: employeeRole.id },
    });
    await db.userRole.create({
      data: { userId: managerUser.id, roleId: managerRole.id },
    });
    await db.userRole.create({
      data: { userId: otherManagerUser.id, roleId: managerRole.id },
    });

    // 5. Create a Customer (CrmAccount)
    customer = await db.crmAccount.create({
      data: {
        orgId: org.id,
        ownerId: ownerUser.id,
        name: "Import Customer Corp",
        type: "Customer",
        createdById: ownerUser.id,
        updatedById: ownerUser.id,
      },
    });
  });

  afterAll(async () => {
    const orgId = org.id;

    // Cascade deletions for organization data
    await db.chaAuditLog.deleteMany({ where: { orgId } });
    await db.chaExpenseStatusHistory.deleteMany({ where: { request: { orgId } } });
    await db.chaExpenseQuery.deleteMany({ where: { request: { orgId } } });
    await db.chaExpensePayment.deleteMany({ where: { request: { orgId } } });
    await db.chaExpenseLine.deleteMany({ where: { request: { orgId } } });
    await db.chaExpenseRequest.deleteMany({ where: { orgId } });
    await db.chaJobDeletionRequest.deleteMany({ where: { orgId } });
    await db.chaCustomerAdvanceReceipt.deleteMany({ where: { advance: { job: { orgId } } } });
    await db.chaCustomerAdvance.deleteMany({ where: { job: { orgId } } });
    await db.chaFilingDateHistory.deleteMany({ where: { filing: { job: { orgId } } } });
    await db.chaFiling.deleteMany({ where: { job: { orgId } } });
    await db.chaChecklistItem.deleteMany({ where: { section: { checklistImport: { job: { orgId } } } } });
    await db.chaChecklistSection.deleteMany({ where: { checklistImport: { job: { orgId } } } });
    await db.chaChecklistReworkNote.deleteMany({ where: { checklistImport: { job: { orgId } } } });
    await db.chaChecklistApproval.deleteMany({ where: { checklistImport: { job: { orgId } } } });
    await db.chaChecklistImport.deleteMany({ where: { job: { orgId } } });
    await db.chaDocumentException.deleteMany({ where: { requirement: { job: { orgId } } } });
    await db.chaDocumentVersion.deleteMany({ where: { requirement: { job: { orgId } } } });
    await db.chaJobDocumentRequirement.deleteMany({ where: { job: { orgId } } });
    await db.chaJobAssignment.deleteMany({ where: { job: { orgId } } });
    await db.chaJob.deleteMany({ where: { orgId } });
    await db.chaDocumentDefinition.deleteMany({ where: { jobType: { orgId } } });
    await db.chaJobType.deleteMany({ where: { orgId } });
    await db.chaSettings.deleteMany({ where: { orgId } });
    await db.todoTask.deleteMany({ where: { orgId } });
    await db.crmAccount.deleteMany({ where: { orgId } });
    await db.userRole.deleteMany({ where: { role: { orgId } } });
    await db.role.deleteMany({ where: { orgId } });
    await db.user.deleteMany({ where: { orgId } });
    await db.branch.deleteMany({ where: { orgId } });
    await db.organisation.delete({ where: { id: orgId } });
  });

  it("1. should ensure settings and default types are created", async () => {
    const settings = await chaService.ensureSettingsAndDefaults(org.id);
    expect(settings).toBeDefined();
    expect(settings.orgId).toBe(org.id);

    const jobTypes = await db.chaJobType.findMany({ where: { orgId: org.id } });
    expect(jobTypes.length).toBe(2); // Import Clearance & Export Clearance

    const shipmentTypes = await db.chaShipmentType.findMany({ where: { orgId: org.id } });
    expect(shipmentTypes.map((shipmentType) => shipmentType.name)).toEqual(
      expect.arrayContaining(["Air", "Sea"]),
    );

    const numberingRule = await db.chaBranchNumberingRule.findUnique({
      where: { branchId: branch.id },
    });
    expect(numberingRule).toBeDefined();
    expect(numberingRule?.prefix).toContain(branch.code);

    jobTypeImport = jobTypes.find((jt) => jt.name === "Import Clearance");
    expect(jobTypeImport).toBeDefined();

    const docDefs = await db.chaDocumentDefinition.findMany({ where: { jobTypeId: jobTypeImport.id } });
    expect(docDefs.length).toBe(4); // BL, Invoice, Packing List, CO
  }, 30000);

  it("1.25. should generate branch-based job numbers with isolated sequences", async () => {
    const autoJob = await chaService.createJob(ownerUser.id, org.id, {
      title: "Auto-numbered CHA job",
      customerId: customer.id,
      jobTypeId: jobTypeImport.id,
      branchId: branch.id,
      shipmentTypeId: (await db.chaShipmentType.findFirstOrThrow({ where: { orgId: org.id, name: "Air" } })).id,
      priority: "LOW",
      primaryOwnerId: ownerUser.id,
      assignedManagerId: managerUser.id,
      assignments: [],
    });

    expect(autoJob.jobNumber).toContain(branch.code);

    const branchRule = await db.chaBranchNumberingRule.findUniqueOrThrow({
      where: { branchId: branch.id },
    });
    expect(branchRule.currentSequence).toBeGreaterThanOrEqual(branchRule.startingSequence);
  });

  it("1.5. should enforce specific employee job creator restrictions", async () => {
    const settings = await db.chaSettings.findUniqueOrThrow({
      where: { orgId: org.id },
    });

    // 1. Restrict to Manager role only, leaving users empty
    await db.chaSettings.update({
      where: { id: settings.id },
      data: {
        jobCreatorRoles: JSON.stringify(["Manager"]),
        jobCreatorUsers: JSON.stringify([]),
      },
    });

    // 2. ownerUser (who is Employee) should be rejected
    await expect(
      chaService.createJob(ownerUser.id, org.id, {
        jobNumber: "CHA-FAIL-101",
        title: "This should fail",
        customerId: customer.id,
        jobTypeId: jobTypeImport.id,
        branchId: branch.id,
        priority: "MEDIUM",
        primaryOwnerId: ownerUser.id,
        assignedManagerId: managerUser.id,
        assignments: [],
      })
    ).rejects.toThrow("You are not authorized to create jobs under this organisation's settings.");

    // 3. Add ownerUser directly to jobCreatorUsers list
    await db.chaSettings.update({
      where: { id: settings.id },
      data: {
        jobCreatorRoles: JSON.stringify(["Manager"]),
        jobCreatorUsers: JSON.stringify([ownerUser.id]),
      },
    });

    // 4. ownerUser should now succeed in creating the job
    const job = await chaService.createJob(ownerUser.id, org.id, {
      jobNumber: "CHA-SUCCESS-101",
      title: "This should succeed",
      customerId: customer.id,
      jobTypeId: jobTypeImport.id,
      branchId: branch.id,
      priority: "MEDIUM",
      primaryOwnerId: ownerUser.id,
      assignedManagerId: managerUser.id,
      assignments: [],
    });

    expect(job).toBeDefined();
    expect(job.jobNumber).toBe("CHA-SUCCESS-101");

    // Clean up created job and restore settings to default for other tests
    await db.chaJobDocumentRequirement.deleteMany({ where: { jobId: job.id } });
    await db.chaJob.delete({ where: { id: job.id } });
    await db.chaSettings.update({
      where: { id: settings.id },
      data: {
        jobCreatorRoles: JSON.stringify(["Admin", "HR", "Manager", "Employee"]),
        jobCreatorUsers: JSON.stringify([]),
      },
    });
  });

  it("2. should create a job, assignments and requirements", async () => {
    const job = await chaService.createJob(ownerUser.id, org.id, {
      jobNumber: "CHA-JOB-999",
      title: "Import clearance of electronics",
      customerId: customer.id,
      customerRef: "REF-ELEC-1",
      jobTypeId: jobTypeImport.id,
      branchId: branch.id,
      priority: "HIGH",
      primaryOwnerId: ownerUser.id,
      assignedManagerId: managerUser.id,
      assignments: [
        { userId: ownerUser.id, responsibility: "OPERATIONS" },
        { userId: managerUser.id, responsibility: "APPROVAL" },
      ],
      remarks: "Urgent shipment",
    });

    expect(job).toBeDefined();
    expect(job.jobNumber).toBe("CHA-JOB-999");
    expect(job.stage).toBe("DOCUMENT_COLLECTION");

    // Check assignments
    const assignments = await db.chaJobAssignment.findMany({ where: { jobId: job.id } });
    expect(assignments.length).toBe(2);

    // Check document requirements
    const reqs = await db.chaJobDocumentRequirement.findMany({ where: { jobId: job.id } });
    expect(reqs.length).toBe(16);
    const mandatory = reqs.filter((r) => r.isMandatory);
    expect(mandatory.length).toBe(6); // Bill of Lading, Invoice, Packing List, IEC, GST, AD Code
  });

  it("3. should handle document gates, uploads and exceptions", async () => {
    const job = await db.chaJob.findFirstOrThrow({ where: { orgId: org.id, jobNumber: "CHA-JOB-999" } });
    const reqs = await db.chaJobDocumentRequirement.findMany({ where: { jobId: job.id } });

    const blReq = reqs.find((r) => r.name === "Bill of Lading")!;
    const invReq = reqs.find((r) => r.name === "Invoice")!;
    const pkReq = reqs.find((r) => r.name === "Packing List")!;
    const iecReq = reqs.find((r) => r.name === "IEC")!;
    const gstReq = reqs.find((r) => r.name === "GST")!;
    const adReq = reqs.find((r) => r.name === "AD Code")!;

    // A. Verify document gate fails initially
    const gate1 = await chaService.verifyDocumentGate(job.id);
    expect(gate1.passed).toBe(false);
    expect(gate1.blockingRequirements.length).toBe(6);

    // B. Upload file for Bill of Lading
    await chaService.uploadDocumentVersion(ownerUser.id, org.id, job.id, blReq.id, {
      fileKey: "bl_copy_s3_key",
      fileName: "bill_of_lading.pdf",
      mimeType: "application/pdf",
      sizeBytes: 10240,
    });

    // C. Declare exception for Invoice (Not Available)
    await chaService.declareDocumentException(ownerUser.id, org.id, job.id, invReq.id, "Vendor delayed sending invoice, using custom declaration copy");

    // D. Upload Packing List
    await chaService.uploadDocumentVersion(ownerUser.id, org.id, job.id, pkReq.id, {
      fileKey: "packing_list_s3_key",
      fileName: "packing_list.pdf",
      mimeType: "application/pdf",
      sizeBytes: 8192,
    });

    // E. Upload IEC
    await chaService.uploadDocumentVersion(ownerUser.id, org.id, job.id, iecReq.id, {
      fileKey: "iec_copy_key",
      fileName: "iec.pdf",
      mimeType: "application/pdf",
      sizeBytes: 10240,
    });

    // F. Declare exception for GST
    await chaService.declareDocumentException(ownerUser.id, org.id, job.id, gstReq.id, "GST copy verified on portal, physical copy not required locally");

    // G. Upload AD Code
    await chaService.uploadDocumentVersion(ownerUser.id, org.id, job.id, adReq.id, {
      fileKey: "ad_code_key",
      fileName: "ad_code.pdf",
      mimeType: "application/pdf",
      sizeBytes: 8192,
    });

    // H. Verify document gate passes now
    const gate2 = await chaService.verifyDocumentGate(job.id);
    expect(gate2.passed).toBe(true);
    expect(gate2.blockingRequirements.length).toBe(0);

    // I. Stage should remain DOCUMENT_COLLECTION until manual proceed
    const jobBeforeProceed = await db.chaJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(jobBeforeProceed.stage).toBe("DOCUMENT_COLLECTION");

    // J. Proceed manually to Additional Data
    await chaService.proceedDocumentStage(ownerUser.id, org.id, job.id);

    const jobAfterGatePass = await db.chaJob.findUniqueOrThrow({
      where: { id: job.id },
      include: { additionalData: true },
    });
    expect(jobAfterGatePass.stage).toBe("ADDITIONAL_DATA");
    expect(jobAfterGatePass.additionalData?.status).toBe("PENDING");

    // K. Complete Additional Data before checklist preparation
    await chaService.upsertAdditionalData(ownerUser.id, org.id, job.id, {
      vesselInwardDate: new Date("2026-01-10"),
      importGeneralManifest: "12345",
      exportGeneralManifest: "67890",
      deliveryOrderValidity: new Date("2026-01-15"),
    });

    await chaService.proceedAdditionalDataStage(ownerUser.id, org.id, job.id);

    const jobAfterAdditionalData = await db.chaJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(jobAfterAdditionalData.stage).toBe("CHECKLIST_PREPARATION");
  });

  it("3.5. should delete a document version, update status, and revert stage if gate fails", async () => {
    const job = await db.chaJob.findFirstOrThrow({ where: { orgId: org.id, jobNumber: "CHA-JOB-999" } });
    const reqs = await db.chaJobDocumentRequirement.findMany({ where: { jobId: job.id }, include: { versions: true } });

    const pkReq = reqs.find((r) => r.name === "Packing List")!;
    const currentVersion = pkReq.versions.find((v) => v.isCurrent)!;

    // A. Unauthorized user deletion attempt should fail
    const randomUser = await db.user.create({
      data: {
        orgId: org.id,
        email: `random-user-${Date.now()}@example.com`,
        passwordHash: "dummy-hash",
        name: "Random Guy",
        branchId: branch.id,
      },
    });

    await expect(
      chaService.deleteDocumentVersion(randomUser.id, org.id, job.id, pkReq.id, currentVersion.id)
    ).rejects.toThrow("Access Denied");

    // B. Authorized owner deletion should succeed
    const result = await chaService.deleteDocumentVersion(ownerUser.id, org.id, job.id, pkReq.id, currentVersion.id);
    expect(result.newStatus).toBe("PENDING");
    expect(result.stageReverted).toBe(true);
    expect(result.prevStage).toBe("CHECKLIST_PREPARATION");

    // C. Check database updates
    const updatedJob = await db.chaJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(updatedJob.stage).toBe("DOCUMENT_COLLECTION");

    const updatedPkReq = await db.chaJobDocumentRequirement.findUniqueOrThrow({
      where: { id: pkReq.id },
      include: { versions: true },
    });
    expect(updatedPkReq.status).toBe("PENDING");
    expect(updatedPkReq.versions.length).toBe(0); // version deleted

    // D. Re-upload to restore stage for checklist test
    await chaService.uploadDocumentVersion(ownerUser.id, org.id, job.id, pkReq.id, {
      fileKey: "packing_list_s3_key",
      fileName: "packing_list.pdf",
      mimeType: "application/pdf",
      sizeBytes: 8192,
    });

    // E. Manually proceed and complete Additional Data to restore CHECKLIST_PREPARATION stage
    await chaService.proceedDocumentStage(ownerUser.id, org.id, job.id);
    await chaService.upsertAdditionalData(ownerUser.id, org.id, job.id, {
      vesselInwardDate: new Date("2026-01-10"),
      importGeneralManifest: "12345",
      exportGeneralManifest: "67890",
      deliveryOrderValidity: new Date("2026-01-15"),
    });
    await chaService.proceedAdditionalDataStage(ownerUser.id, org.id, job.id);

    const jobRestored = await db.chaJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(jobRestored.stage).toBe("CHECKLIST_PREPARATION");

    // Clean up random user
    await db.user.delete({ where: { id: randomUser.id } });
  });

  it("4. should upload checklist, route through internal and customer approvals, and then move to filing", async () => {
    const job = await db.chaJob.findFirstOrThrow({ where: { orgId: org.id, jobNumber: "CHA-JOB-999" } });

    const uploadResult = await chaService.uploadChecklistFile(
      ownerUser.id,
      org.id,
      job.id,
      {
        fileKey: "blob:checklist-v1",
        fileName: "customs-checklist-v1.pdf",
        mimeType: "application/pdf",
        sizeBytes: 4096,
      }
    );

    expect(uploadResult.checklist.status).toBe("INTERNAL_APPROVAL_PENDING");
    expect(uploadResult.fileVersion.versionNumber).toBe(1);

    const updatedJob1 = await db.chaJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(updatedJob1.stage).toBe("CHECKLIST_APPROVAL");

    const checklist = await db.chaChecklist.findUniqueOrThrow({ where: { jobId: job.id } });
    const internalApprovals = await db.chaChecklistDecision.findMany({
      where: { checklistId: checklist.id, stage: "INTERNAL", fileVersionId: uploadResult.fileVersion.id },
    });
    expect(internalApprovals.some((approval) => approval.assignedToId === managerUser.id)).toBe(true);

    await chaService.submitChecklistInternalDecision(
      managerUser.id,
      org.id,
      job.id,
      checklist.id,
      "REJECTED",
      "HSN code verification proof is missing. Please re-check Q2."
    );

    const checklistAfterRework = await db.chaChecklist.findUniqueOrThrow({ where: { id: checklist.id } });
    expect(checklistAfterRework.status).toBe("REWORK_REQUIRED");

    const jobAfterRework = await db.chaJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(jobAfterRework.stage).toBe("CHECKLIST_PREPARATION");

    const reuploadResult = await chaService.uploadChecklistFile(
      ownerUser.id,
      org.id,
      job.id,
      {
        fileKey: "blob:checklist-v2",
        fileName: "customs-checklist-v2.pdf",
        mimeType: "application/pdf",
        sizeBytes: 5120,
      }
    );
    expect(reuploadResult.fileVersion.versionNumber).toBe(2);

    await chaService.submitChecklistInternalDecision(
      managerUser.id,
      org.id,
      job.id,
      checklist.id,
      "APPROVED",
      "All checks pass."
    );

    const checklistPendingOwner = await db.chaChecklist.findUniqueOrThrow({ where: { id: checklist.id } });
    expect(checklistPendingOwner.status).toBe("JOB_OWNER_APPROVAL_PENDING");
    expect(checklistPendingOwner.currentApprovalStage).toBe("JOB_OWNER");

    // Rejection by owner
    await chaService.submitChecklistOwnerDecision(
      ownerUser.id,
      org.id,
      job.id,
      checklist.id,
      "REJECTED",
      "Owner rejected because details look incomplete."
    );

    const checklistOwnerRejected = await db.chaChecklist.findUniqueOrThrow({ where: { id: checklist.id } });
    expect(checklistOwnerRejected.status).toBe("JOB_OWNER_REJECTED");
    expect(checklistOwnerRejected.currentApprovalStage).toBe("UPLOAD");

    const jobOwnerRejected = await db.chaJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(jobOwnerRejected.stage).toBe("CHECKLIST_PREPARATION");

    // V3 Upload after owner rejection
    const reuploadResult3 = await chaService.uploadChecklistFile(
      ownerUser.id,
      org.id,
      job.id,
      {
        fileKey: "blob:checklist-v3",
        fileName: "customs-checklist-v3.pdf",
        mimeType: "application/pdf",
        sizeBytes: 5120,
      }
    );
    expect(reuploadResult3.fileVersion.versionNumber).toBe(3);

    // V3 Internal approval
    await chaService.submitChecklistInternalDecision(
      managerUser.id,
      org.id,
      job.id,
      checklist.id,
      "APPROVED",
      "All checks pass again."
    );

    // V3 Owner approval
    await chaService.submitChecklistOwnerDecision(
      ownerUser.id,
      org.id,
      job.id,
      checklist.id,
      "APPROVED",
      "Owner approved v3."
    );

    const checklistPendingCustomer = await db.chaChecklist.findUniqueOrThrow({ where: { id: checklist.id } });
    expect(checklistPendingCustomer.status).toBe("CUSTOMER_APPROVAL_PENDING");

    await chaService.submitChecklistCustomerDecision(
      otherManagerUser.id,
      org.id,
      job.id,
      checklist.id,
      "APPROVED",
      "Customer accepted the checklist."
    );

    const checklistApproved = await db.chaChecklist.findUniqueOrThrow({ where: { id: checklist.id } });
    expect(checklistApproved.status).toBe("CUSTOMER_APPROVED");

    const jobApproved = await db.chaJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(jobApproved.stage).toBe("FILING");
  }, 15000);

  it("5. should handle filing dates adjustments and mark job as filed", async () => {
    const job = await db.chaJob.findFirstOrThrow({ where: { orgId: org.id, jobNumber: "CHA-JOB-999" } });
    const filing = await db.chaFiling.findFirstOrThrow({ where: { jobId: job.id } });

    expect(filing.status).toBe("PENDING");
    expect(filing.estimatedFilingDate).not.toBeNull();

    // A. Adjust estimated date
    const newEstDate = new Date();
    newEstDate.setDate(newEstDate.getDate() + 5);
    await chaService.adjustEstimatedFilingDate(ownerUser.id, org.id, job.id, filing.id, newEstDate);

    const adjustedFiling = await db.chaFiling.findUniqueOrThrow({ where: { id: filing.id } });
    expect(adjustedFiling.estimatedFilingDate!.toDateString()).toBe(newEstDate.toDateString());

    // B. Mark as filed (on-time or with delay explanation if needed)
    // Let's set actual filing date to today (before the newEstDate, so no delay explanation required)
    const actualDate = new Date();
    await chaService.markAsFiled(ownerUser.id, org.id, job.id, filing.id, {
      filingRef: "BILL-OF-ENTRY-999812",
      actualFilingDate: actualDate,
      filedBillCopyKey: "filed_boe_s3_key",
      remarks: "Clearance filed successfully",
    });

    const finalFiling = await db.chaFiling.findUniqueOrThrow({ where: { id: filing.id } });
    expect(finalFiling.status).toBe("FILED");
    expect(finalFiling.filingRef).toBe("BILL-OF-ENTRY-999812");

    const finalJob = await db.chaJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(finalJob.stage).toBe("FILED");
  });

  it("6. should manage customer advances tracking", async () => {
    const job = await db.chaJob.findFirstOrThrow({ where: { orgId: org.id, jobNumber: "CHA-JOB-999" } });
    const advance = await db.chaCustomerAdvance.findFirstOrThrow({ where: { jobId: job.id } });

    expect(advance.status).toBe("PENDING");

    // A. Set expected terms
    await chaService.updateCustomerAdvanceExpected(ownerUser.id, org.id, job.id, advance.id, 50000, new Date(), ownerUser.id);
    const updatedAdv = await db.chaCustomerAdvance.findUniqueOrThrow({ where: { id: advance.id } });
    expect(Number(updatedAdv.expectedAmount)).toBe(50000);
    expect(updatedAdv.status).toBe("FOLLOW_UP");

    // B. Record partial receipt
    await chaService.recordCustomerAdvanceReceipt(ownerUser.id, org.id, job.id, advance.id, {
      amount: 20000,
      receivedDate: new Date(),
      paymentMethod: "NEFT",
      referenceNumber: "TXN123",
      receiptProofKey: "proof_key_1",
    });

    const partialAdv = await db.chaCustomerAdvance.findUniqueOrThrow({ where: { id: advance.id } });
    expect(partialAdv.status).toBe("PARTIALLY_RECEIVED");

    // C. Record remaining receipt
    await chaService.recordCustomerAdvanceReceipt(ownerUser.id, org.id, job.id, advance.id, {
      amount: 30000,
      receivedDate: new Date(),
      paymentMethod: "NEFT",
      referenceNumber: "TXN124",
      receiptProofKey: "proof_key_2",
    });

    const fullAdv = await db.chaCustomerAdvance.findUniqueOrThrow({ where: { id: advance.id } });
    expect(fullAdv.status).toBe("FULLY_RECEIVED");
  });

  it("7. should verify multi-line operational expenses lifecycle", async () => {
    const job = await db.chaJob.findFirstOrThrow({ where: { orgId: org.id, jobNumber: "CHA-JOB-999" } });

    // A. Create expense request
    const request = await chaService.createExpenseRequest(ownerUser.id, org.id, job.id, {
      isUrgent: false,
      lines: [
        { category: "Customs Duty", purpose: "Electronics customs clearing", amount: 15000, requiredDate: new Date() },
        { category: "Port Handling Charges", purpose: "Container handling", amount: 4500, requiredDate: new Date() },
      ],
    });

    expect(request).toBeDefined();
    expect(request.status).toBe("SUBMITTED");

    // Check lines
    const lines = await db.chaExpenseLine.findMany({ where: { requestId: request.id } });
    expect(lines.length).toBe(2);
    const sum = lines.reduce((total, l) => total + Number(l.amount), 0);
    expect(sum).toBe(19500);

    // B. Escalate to Urgent
    await chaService.triggerUrgentExpenseEscalation(ownerUser.id, org.id, request.id, "Immediate duty payment required to avoid demurrage");
    const urgentReq = await db.chaExpenseRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(urgentReq.isUrgent).toBe(true);
    expect(urgentReq.status).toBe("URGENT_PAYMENT_REQUIRED");

    // C. Update status (Under Review -> Approved)
    await chaService.setExpenseStatus(managerUser.id, org.id, request.id, "APPROVED", "Verified lines are correct");
    const approvedReq = await db.chaExpenseRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(approvedReq.status).toBe("APPROVED");

    // D. Raise Query & Resolution
    await chaService.raisePaymentQuery(ownerUser.id, org.id, request.id, "Verify if customs duty includes GST surcharge");
    const queriedReq = await db.chaExpenseRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(queriedReq.status).toBe("QUERY_RAISED");

    const query = await db.chaExpenseQuery.findFirstOrThrow({ where: { requestId: request.id } });
    await chaService.resolvePaymentQuery(managerUser.id, org.id, query.id, "Yes, GST surcharge is included under heading 3");
    const resolvedReq = await db.chaExpenseRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(resolvedReq.status).toBe("PAID"); // Resolving query sets status back to PAID, wait, check service impl

    // E. Post disbursement details (Normally from APPROVED or READY_FOR_DISBURSEMENT, but we test postExpensePayment)
    // First, let's reset status to APPROVED so it's a clean flow
    await chaService.setExpenseStatus(managerUser.id, org.id, request.id, "READY_FOR_DISBURSEMENT");
    const payment = await chaService.postExpensePayment(managerUser.id, org.id, request.id, {
      amountPaid: 19500,
      paymentDate: new Date(),
      paymentMethod: "BANK_TRANSFER",
      transactionReference: "TRANS-ELEC-9912",
      paymentProofKey: "disbursement_proof_s3",
    });

    expect(payment).toBeDefined();
    const paidReq = await db.chaExpenseRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(paidReq.status).toBe("PAID");

    // F. Acknowledge Receipt
    await chaService.acknowledgeExpenseReceipt(ownerUser.id, org.id, request.id);
    const finalReq = await db.chaExpenseRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(finalReq.status).toBe("RECEIPT_ACKNOWLEDGED");
  }, 15000);

  it("8. should create, reject, and audit deletion approval requests for non-managers", async () => {
    const job = await chaService.createJob(ownerUser.id, org.id, {
      jobNumber: "CHA-DELETE-REQ-001",
      title: "Deletion approval request job",
      customerId: customer.id,
      jobTypeId: jobTypeImport.id,
      branchId: branch.id,
      priority: "MEDIUM",
      primaryOwnerId: managerUser.id,
      assignedManagerId: managerUser.id,
      assignments: [
        { userId: ownerUser.id, responsibility: "OPERATIONS" },
        { userId: managerUser.id, responsibility: "APPROVAL" },
      ],
    });

    const pending = await chaService.submitJobDeletion(ownerUser.id, org.id, {
      jobId: job.id,
      confirmationJobNumber: "CHA-DELETE-REQ-001",
      confirmationPhrase: " delete job ",
      metadata: { source: "test" },
    });

    expect(pending.mode).toBe("pending");

    await expect(
      chaService.submitJobDeletion(ownerUser.id, org.id, {
        jobId: job.id,
        confirmationJobNumber: "CHA-DELETE-REQ-001",
        confirmationPhrase: "delete job",
      }),
    ).rejects.toThrow("An active deletion request already exists for this CHA job.");

    const pendingRequest = await db.chaJobDeletionRequest.findFirstOrThrow({
      where: { jobId: job.id, status: "PENDING" },
    });
    expect(pendingRequest.assignedManagerId).toBe(managerUser.id);

    await expect(
      chaService.decideJobDeletionRequest(otherManagerUser.id, org.id, {
        requestId: pendingRequest.id,
        decision: "APPROVED",
        remarks: "Attempted by wrong manager",
      }),
    ).rejects.toThrow("You are not the assigned manager for this deletion request.");

    await chaService.decideJobDeletionRequest(managerUser.id, org.id, {
      requestId: pendingRequest.id,
      decision: "REJECTED",
      remarks: "Supporting records still under review.",
    });

    const rejectedRequest = await db.chaJobDeletionRequest.findUniqueOrThrow({
      where: { id: pendingRequest.id },
    });
    expect(rejectedRequest.status).toBe("REJECTED");
    expect(rejectedRequest.rejectionRemarks).toContain("under review");

    const activeJob = await db.chaJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(activeJob.deletedAt).toBeNull();

    const jobAuditEvents = await db.chaAuditLog.findMany({
      where: {
        jobId: job.id,
        event: { in: ["JOB_DELETE_CONFIRMATION_INITIATED", "JOB_DELETE_APPROVAL_REQUESTED", "JOB_DELETE_APPROVAL_REJECTED"] },
      },
      orderBy: { timestamp: "asc" },
    });
    expect(jobAuditEvents.map((entry) => entry.event)).toEqual(
      expect.arrayContaining([
        "JOB_DELETE_CONFIRMATION_INITIATED",
        "JOB_DELETE_APPROVAL_REQUESTED",
        "JOB_DELETE_APPROVAL_REJECTED",
      ]),
    );

    const unauthorizedAttempt = await db.chaAuditLog.findFirst({
      where: {
        entityId: pendingRequest.id,
        actorId: otherManagerUser.id,
        event: "JOB_DELETE_UNAUTHORIZED_ATTEMPT",
      },
    });
    expect(unauthorizedAttempt).toBeTruthy();
  }, 15000);

  it("9. should allow the assigned manager to directly soft-delete a job", async () => {
    const job = await chaService.createJob(ownerUser.id, org.id, {
      jobNumber: "CHA-DELETE-DIRECT-001",
      title: "Direct deletion job",
      customerId: customer.id,
      jobTypeId: jobTypeImport.id,
      branchId: branch.id,
      priority: "LOW",
      primaryOwnerId: ownerUser.id,
      assignedManagerId: managerUser.id,
      assignments: [
        { userId: ownerUser.id, responsibility: "OPERATIONS" },
        { userId: managerUser.id, responsibility: "APPROVAL" },
      ],
    });

    await expect(
      chaService.submitJobDeletion(otherManagerUser.id, org.id, {
        jobId: job.id,
        confirmationJobNumber: "CHA-DELETE-DIRECT-001",
        confirmationPhrase: "delete job",
      }),
    ).rejects.toThrow("You are not authorized to delete or request deletion for this CHA job.");

    const directDelete = await chaService.submitJobDeletion(managerUser.id, org.id, {
      jobId: job.id,
      confirmationJobNumber: "CHA-DELETE-DIRECT-001",
      confirmationPhrase: "delete job",
      metadata: { source: "test" },
    });

    expect(directDelete.mode).toBe("deleted");

    const deletedJob = await db.chaJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(deletedJob.deletedAt).not.toBeNull();
    expect(deletedJob.deletedById).toBe(managerUser.id);
    expect(deletedJob.status).toBe("CANCELLED");

    const visibleJobs = await chaService.listJobs(ownerUser.id, org.id, { search: "CHA-DELETE-DIRECT-001" });
    expect(visibleJobs.total).toBe(0);

    const directAudit = await db.chaAuditLog.findMany({
      where: { jobId: job.id, event: { in: ["JOB_DELETED_DIRECT", "JOB_DELETE_EXECUTED"] } },
    });
    expect(directAudit.map((entry) => entry.event)).toEqual(
      expect.arrayContaining(["JOB_DELETED_DIRECT", "JOB_DELETE_EXECUTED"]),
    );

    await expect(
      chaService.submitJobDeletion(managerUser.id, org.id, {
        jobId: job.id,
        confirmationJobNumber: "CHA-DELETE-DIRECT-001",
        confirmationPhrase: "delete job",
      }),
    ).rejects.toThrow("CHA job not found.");
  }, 15000);

  it("10. should enforce confirmation rules, missing manager handling, and approved deletion execution", async () => {
    const noManagerJob = await chaService.createJob(ownerUser.id, org.id, {
      jobNumber: "CHA-DELETE-NOMGR-001",
      title: "Missing manager deletion job",
      customerId: customer.id,
      jobTypeId: jobTypeImport.id,
      branchId: branch.id,
      priority: "MEDIUM",
      primaryOwnerId: ownerUser.id,
      assignedManagerId: managerUser.id,
      assignments: [{ userId: ownerUser.id, responsibility: "OPERATIONS" }],
    });

    await db.chaJob.update({
      where: { id: noManagerJob.id },
      data: { assignedManagerId: null },
    });

    await expect(
      chaService.submitJobDeletion(ownerUser.id, org.id, {
        jobId: noManagerJob.id,
        confirmationJobNumber: "CHA-DELETE-NOMGR-001",
        confirmationPhrase: "erase job",
      }),
    ).rejects.toThrow("The confirmation phrase must exactly match 'delete job'.");

    await expect(
      chaService.submitJobDeletion(ownerUser.id, org.id, {
        jobId: noManagerJob.id,
        confirmationJobNumber: "WRONG-NUMBER",
        confirmationPhrase: "delete job",
      }),
    ).rejects.toThrow("The entered job number does not match this CHA job.");

    const directDeleteNoMgr = await chaService.submitJobDeletion(ownerUser.id, org.id, {
      jobId: noManagerJob.id,
      confirmationJobNumber: "CHA-DELETE-NOMGR-001",
      confirmationPhrase: "delete job",
    });
    expect(directDeleteNoMgr.mode).toBe("deleted");

    const noManagerDeletedJob = await db.chaJob.findUniqueOrThrow({ where: { id: noManagerJob.id } });
    expect(noManagerDeletedJob.deletedAt).not.toBeNull();
    expect(noManagerDeletedJob.deletedById).toBe(ownerUser.id);

    const noManagerRequestJob = await chaService.createJob(managerUser.id, org.id, {
      jobNumber: "CHA-DELETE-NOMGR-REQ",
      title: "Missing manager deletion request job",
      customerId: customer.id,
      jobTypeId: jobTypeImport.id,
      branchId: branch.id,
      priority: "MEDIUM",
      primaryOwnerId: managerUser.id,
      assignedManagerId: managerUser.id,
      assignments: [{ userId: ownerUser.id, responsibility: "OPERATIONS" }],
    });

    await db.chaJob.update({
      where: { id: noManagerRequestJob.id },
      data: { assignedManagerId: null },
    });

    await expect(
      chaService.submitJobDeletion(ownerUser.id, org.id, {
        jobId: noManagerRequestJob.id,
        confirmationJobNumber: "CHA-DELETE-NOMGR-REQ",
        confirmationPhrase: "delete job",
      }),
    ).rejects.toThrow("No approval manager is assigned to this CHA job. Assign a manager before requesting deletion.");

    const approvedJob = await chaService.createJob(ownerUser.id, org.id, {
      jobNumber: "CHA-DELETE-APPROVE-001",
      title: "Approved deletion execution job",
      customerId: customer.id,
      jobTypeId: jobTypeImport.id,
      branchId: branch.id,
      priority: "MEDIUM",
      primaryOwnerId: managerUser.id,
      assignedManagerId: managerUser.id,
      assignments: [
        { userId: ownerUser.id, responsibility: "OPERATIONS" },
        { userId: managerUser.id, responsibility: "APPROVAL" },
      ],
    });

    const requestResult = await chaService.submitJobDeletion(ownerUser.id, org.id, {
      jobId: approvedJob.id,
      confirmationJobNumber: "CHA-DELETE-APPROVE-001",
      confirmationPhrase: "delete job",
    });
    expect(requestResult.mode).toBe("pending");

    const request = await db.chaJobDeletionRequest.findFirstOrThrow({
      where: { jobId: approvedJob.id, status: "PENDING" },
    });

    await chaService.decideJobDeletionRequest(managerUser.id, org.id, {
      requestId: request.id,
      decision: "APPROVED",
      remarks: "Deletion approved by assigned manager.",
    });

    const executedRequest = await db.chaJobDeletionRequest.findUniqueOrThrow({
      where: { id: request.id },
    });
    expect(executedRequest.status).toBe("EXECUTED");
    expect(executedRequest.executedById).toBe(managerUser.id);

    const deletedJob = await db.chaJob.findUniqueOrThrow({ where: { id: approvedJob.id } });
    expect(deletedJob.deletedAt).not.toBeNull();
    expect(deletedJob.deletedById).toBe(managerUser.id);

    const approvalAudit = await db.chaAuditLog.findMany({
      where: { jobId: approvedJob.id, event: { in: ["JOB_DELETE_APPROVAL_APPROVED", "JOB_DELETE_EXECUTED"] } },
    });
    expect(approvalAudit.map((entry) => entry.event)).toEqual(
      expect.arrayContaining(["JOB_DELETE_APPROVAL_APPROVED", "JOB_DELETE_EXECUTED"]),
    );
  }, 60000);
});

