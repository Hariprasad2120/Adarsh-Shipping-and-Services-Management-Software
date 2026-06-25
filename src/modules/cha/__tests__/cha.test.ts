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
  let jobTypeExport: any;

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
    const readPermission = await db.permission.upsert({
      where: { key: "cha.job.read" },
      update: { label: "Read CHA Jobs", group: "CHA" },
      create: { key: "cha.job.read", label: "Read CHA Jobs", group: "CHA" },
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
        { roleId: employeeRole.id, permissionId: readPermission.id },
        { roleId: managerRole.id, permissionId: readPermission.id },
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
    await db.filingSection49Flag.deleteMany({ where: { job: { orgId } } });
    await db.filingAttachment.deleteMany({ where: { instance: { job: { orgId } } } });
    await db.filingChecklistResponse.deleteMany({ where: { instance: { job: { orgId } } } });
    await db.filingNodeRun.deleteMany({ where: { instance: { job: { orgId } } } });
    await db.filingWorkflowInstance.deleteMany({ where: { job: { orgId } } });
    await db.filingWorkflowTemplate.deleteMany({ where: { orgId } });

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
    expect(jobTypeImport.movementDirection).toBe("IMPORT");
    expect(jobTypeImport.manifestRequirement).toBe("IGM");
    expect(jobTypeImport.isManifestMandatory).toBe(true);

    jobTypeExport = jobTypes.find((jt) => jt.name === "Export Clearance");
    expect(jobTypeExport).toBeDefined();
    expect(jobTypeExport.movementDirection).toBe("EXPORT");
    expect(jobTypeExport.manifestRequirement).toBe("EGM");
    expect(jobTypeExport.isManifestMandatory).toBe(true);

    const docDefs = await db.chaDocumentDefinition.findMany({ where: { jobTypeId: jobTypeImport.id } });
    expect(docDefs.length).toBe(4); // BL, Invoice, Packing List, CO
  }, 30000);

  it("1.1. should block additional data when clearance type manifest configuration is missing", async () => {
    const customJobType = await db.chaJobType.create({
      data: {
        orgId: org.id,
        name: `Legacy Custom ${Date.now()}`,
        movementDirection: null,
        manifestRequirement: null,
        isManifestMandatory: false,
        isActive: true,
      },
    });

    const job = await chaService.createJob(ownerUser.id, org.id, {
      jobNumber: `CHA-LEGACY-${Date.now()}`,
      title: "Legacy custom manifest config check",
      customerId: customer.id,
      jobTypeId: customJobType.id,
      branchId: branch.id,
      priority: "LOW",
      primaryOwnerId: ownerUser.id,
      assignedManagerId: managerUser.id,
      assignments: [],
    });

    await db.chaJob.update({
      where: { id: job.id },
      data: { stage: "ADDITIONAL_DATA" },
    });

    await expect(
      chaService.upsertAdditionalData(ownerUser.id, org.id, job.id, {
        vesselInwardDate: new Date("2026-01-10"),
        deliveryOrderValidity: new Date("2026-01-15"),
      }),
    ).rejects.toThrow(/missing manifest configuration/i);
  });

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

  it("1.3. should grant assigned managers approval mapping and workspace access", async () => {
    const job = await chaService.createJob(ownerUser.id, org.id, {
      jobNumber: "CHA-MANAGER-ACCESS-001",
      title: "Assigned manager access job",
      customerId: customer.id,
      jobTypeId: jobTypeImport.id,
      branchId: branch.id,
      priority: "MEDIUM",
      primaryOwnerId: ownerUser.id,
      assignedManagerId: managerUser.id,
      assignments: [],
    });

    const approvalAssignment = await db.chaJobAssignment.findFirst({
      where: {
        jobId: job.id,
        userId: managerUser.id,
        responsibility: "APPROVAL",
      },
    });
    expect(approvalAssignment).toBeTruthy();

    const details = await chaService.getJobDetails(managerUser.id, org.id, job.id);
    expect(details.assignedManagerId).toBe(managerUser.id);
    expect((details.assignedManager as any)?.name).toBe(managerUser.name);

    await db.chaJob.update({
      where: { id: job.id },
      data: { assignedManagerId: null },
    });

    const repairedDetails = await chaService.getJobDetails(managerUser.id, org.id, job.id);
    expect(repairedDetails.assignedManagerId).toBe(managerUser.id);
    expect((repairedDetails.assignedManager as any)?.name).toBe(managerUser.name);

    const repairedJob = await db.chaJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(repairedJob.assignedManagerId).toBe(managerUser.id);
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

    const checklistPendingCustomer = await db.chaChecklist.findUniqueOrThrow({ where: { id: checklist.id } });
    expect(checklistPendingCustomer.status).toBe("CUSTOMER_APPROVAL_PENDING");
    expect(checklistPendingCustomer.currentApprovalStage).toBe("CUSTOMER");

    await expect(
      chaService.submitChecklistCustomerDecision(
        otherManagerUser.id,
        org.id,
        job.id,
        checklist.id,
        "APPROVED",
        "Outsider should not be able to customer-approve.",
      )
    ).rejects.toThrow(/Only a concerned job user can customer-approve/);

    await chaService.submitChecklistCustomerDecision(
      ownerUser.id,
      org.id,
      job.id,
      checklist.id,
      "REJECTED",
      "Customer requested one more correction."
    );

    const checklistCustomerRejected = await db.chaChecklist.findUniqueOrThrow({ where: { id: checklist.id } });
    expect(checklistCustomerRejected.status).toBe("CUSTOMER_REWORK_REQUIRED");
    expect(checklistCustomerRejected.currentApprovalStage).toBe("UPLOAD");

    const jobCustomerRejected = await db.chaJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(jobCustomerRejected.stage).toBe("CHECKLIST_PREPARATION");

    // V3 Upload after customer rejection
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

    const checklistApproved = await db.chaChecklist.findUniqueOrThrow({ where: { id: checklist.id } });
    expect(checklistApproved.status).toBe("FILING_READY");

    const jobApproved = await db.chaJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(jobApproved.stage).toBe("FILING");
  }, 60000);

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
  }, 60000);

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
  }, 60000);

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
    expect(deletedJob.jobNumber).toContain("CHA-DELETE-DIRECT-001__deleted__");

    const visibleJobs = await chaService.listJobs(ownerUser.id, org.id, { search: "CHA-DELETE-DIRECT-001" });
    expect(visibleJobs.total).toBe(0);

    const recreatedJob = await chaService.createJob(ownerUser.id, org.id, {
      jobNumber: "CHA-DELETE-DIRECT-001",
      title: "Recreated direct deletion job",
      customerId: customer.id,
      jobTypeId: jobTypeImport.id,
      branchId: branch.id,
      priority: "LOW",
      primaryOwnerId: ownerUser.id,
      assignedManagerId: managerUser.id,
      assignments: [{ userId: ownerUser.id, responsibility: "OPERATIONS" }],
    });
    expect(recreatedJob.jobNumber).toBe("CHA-DELETE-DIRECT-001");

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
  }, 60000);

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
    await db.chaJobAssignment.deleteMany({
      where: {
        jobId: noManagerRequestJob.id,
        responsibility: "APPROVAL",
      },
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
    expect(deletedJob.jobNumber).toContain("CHA-DELETE-APPROVE-001__deleted__");

    const recreatedApprovedJob = await chaService.createJob(ownerUser.id, org.id, {
      jobNumber: "CHA-DELETE-APPROVE-001",
      title: "Recreated approved deletion job",
      customerId: customer.id,
      jobTypeId: jobTypeImport.id,
      branchId: branch.id,
      priority: "MEDIUM",
      primaryOwnerId: ownerUser.id,
      assignedManagerId: managerUser.id,
      assignments: [{ userId: ownerUser.id, responsibility: "OPERATIONS" }],
    });
    expect(recreatedApprovedJob.jobNumber).toBe("CHA-DELETE-APPROVE-001");

    const approvalAudit = await db.chaAuditLog.findMany({
      where: { jobId: approvedJob.id, event: { in: ["JOB_DELETE_APPROVAL_APPROVED", "JOB_DELETE_EXECUTED"] } },
    });
    expect(approvalAudit.map((entry) => entry.event)).toEqual(
      expect.arrayContaining(["JOB_DELETE_APPROVAL_APPROVED", "JOB_DELETE_EXECUTED"]),
    );
  }, 60000);

  it("11. should verify visual filing workflow and Section 49 lifecycle", async () => {
    // Delete any default templates to ensure only the custom one is active
    await db.filingWorkflowTemplate.deleteMany({ where: { orgId: org.id } });

    // A. Create default filing workflow draft template
    const templateName = "Custom Test Filing Workflow " + Date.now();
    const saveRes = await chaService.saveFilingWorkflowDraft(ownerUser.id, org.id, null, {
      name: templateName,
      description: "Custom test blueprint",
      nodes: [
        {
          key: "node_start",
          name: "First Check Node",
          description: "Verify BL and custom document codes",
          category: "Operations",
          positionX: 100,
          positionY: 150,
          isStart: true,
          slaDuration: 1,
          slaUnit: "BUSINESS_DAYS",
          commentsRequired: true,
          canBeSkipped: false,
          canBeRevisited: true,
          requireAllMandatoryChecklistItems: true,
          requireMandatoryPhotos: true,
          allowedRoles: ["Employee", "Manager"],
          checklistItems: [
            { label: "Check BL copy authenticity", isMandatory: true, requiresRemarks: true, allowsUpload: true },
            { label: "Verify country of origin signature", isMandatory: false, requiresRemarks: false, allowsUpload: false },
          ],
          photoRequirements: [
            { label: "First Check Signed Sheet", isMandatory: true, minPhotos: 1, acceptedFileTypes: ["image/jpeg"] },
          ],
        },
        {
          key: "node_second",
          name: "Second Check Node",
          description: "Final manager verification",
          category: "Compliance",
          positionX: 300,
          positionY: 150,
          isStart: false,
          slaDuration: 2,
          slaUnit: "BUSINESS_DAYS",
          commentsRequired: false,
          canBeSkipped: false,
          canBeRevisited: true,
          requireAllMandatoryChecklistItems: false,
          requireMandatoryPhotos: false,
          allowedRoles: ["Manager"],
          checklistItems: [],
          photoRequirements: [],
        },
      ],
      edges: [
        { sourceKey: "node_start", targetKey: "node_second", label: "Start to Second" },
        { sourceKey: "node_second", targetKey: "node_start", label: "Double back loop" },
      ],
    });

    expect(saveRes).toBeDefined();
    expect(saveRes.isPublished).toBe(false);

    // B. Publish version
    const publishRes = await chaService.publishFilingWorkflow(ownerUser.id, org.id, saveRes.id);
    expect(publishRes.isPublished).toBe(true);
    expect(publishRes.isActive).toBe(true);

    // C. Create a Job and fast forward stage to FILING
    const job = await chaService.createJob(ownerUser.id, org.id, {
      jobNumber: "CHA-FILING-TEST-101",
      title: "Customs filing blueprint test run",
      customerId: customer.id,
      jobTypeId: jobTypeImport.id,
      branchId: branch.id,
      priority: "MEDIUM",
      primaryOwnerId: ownerUser.id,
      assignedManagerId: managerUser.id,
      assignments: [{ userId: ownerUser.id, responsibility: "OPERATIONS" }],
    });

    await db.chaJob.update({
      where: { id: job.id },
      data: { stage: "FILING" },
    });

    // D. Start visual filing workflow
    const instance = await chaService.startFilingWorkflow(ownerUser.id, org.id, job.id);
    if (!instance) throw new Error("instance is null");
    expect(instance).toBeDefined();
    expect(instance.status).toBe("ACTIVE");
    expect(instance.currentNodeKey).toBe("node_start");

    const activeRun = instance.nodeRuns.find((run) => run.status === "ACTIVE")!;
    expect(activeRun).toBeDefined();
    expect(activeRun.nodeKey).toBe("node_start");

    // E. Perform filing photo upload requirement validation check
    const checklistItemId = activeRun.node.checklistItems[0].id;
    const photoRequirementId = activeRun.node.photoRequirements[0].id;

    // Fail complete attempt since checklist item is unchecked and photo requirement is missing
    await expect(
      chaService.completeFilingNode(ownerUser.id, org.id, job.id, activeRun.id, {
        remarks: "Attempt with missing checks",
        checklistItemResponses: [],
        nextNodeKey: "node_second",
      })
    ).rejects.toThrow();

    // F. Upload photo requirement
    const photo = await chaService.uploadFilingAttachment(ownerUser.id, org.id, job.id, activeRun.id, photoRequirementId, null, {
      fileName: "first_check_scan.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1024,
    });
    expect(photo).toBeDefined();

    await db.filingChecklistResponse.updateMany({
      where: { instanceId: instance.id, nodeRunId: activeRun.id, checklistItemId },
      data: { dueAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    await expect(
      chaService.completeFilingNode(ownerUser.id, org.id, job.id, activeRun.id, {
        remarks: "Attempt without overdue delay note",
        checklistItemResponses: [
          { checklistItemId, isChecked: true, remarks: "BL verified" },
        ],
        nextNodeKey: "node_second",
      })
    ).rejects.toThrow(/Delay remarks are required/);

    // G. Complete node execution and transition to node_second
    await chaService.completeFilingNode(ownerUser.id, org.id, job.id, activeRun.id, {
      remarks: "Checked and signed off successfully",
      checklistItemResponses: [
        { checklistItemId, isChecked: true, remarks: "BL verified", delayRemarks: "Customs portal dependency delayed completion" },
      ],
      nextNodeKey: "node_second",
    });

    const instanceAfterFirstNode = await chaService.getFilingWorkflowInstance(org.id, job.id);
    expect(instanceAfterFirstNode?.currentNodeKey).toBe("node_second");
    const activeRun2 = instanceAfterFirstNode?.nodeRuns.find((run) => run.status === "ACTIVE")!;
    expect(activeRun2.nodeKey).toBe("node_second");

    // H. Test double-back transition: Move back from node_second to node_start
    // node_second allows Manager role only
    await expect(
      chaService.completeFilingNode(ownerUser.id, org.id, job.id, activeRun2.id, {
        remarks: "Attempt double-back as employee",
        checklistItemResponses: [],
        nextNodeKey: "node_start",
      })
    ).rejects.toThrow(/Forbidden: Only users with roles/);

    // Double-back transition as Manager User
    await chaService.completeFilingNode(managerUser.id, org.id, job.id, activeRun2.id, {
      remarks: "Returning to First Check for document amendment",
      checklistItemResponses: [],
      nextNodeKey: "node_start",
    });

    const instanceDoubleBack = await chaService.getFilingWorkflowInstance(org.id, job.id);
    expect(instanceDoubleBack?.currentNodeKey).toBe("node_start");
    const activeRun3 = instanceDoubleBack?.nodeRuns.find((run) => run.status === "ACTIVE")!;
    expect(activeRun3.nodeKey).toBe("node_start");

    // I. Test transition to complete (File bill copy)
    // First, upload the mandatory photo for the new run of the start node
    await chaService.uploadFilingAttachment(ownerUser.id, org.id, job.id, activeRun3.id, photoRequirementId, null, {
      fileName: "first_check_scan_v2.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1024,
    });

    // First, complete the start node run again
    await chaService.completeFilingNode(ownerUser.id, org.id, job.id, activeRun3.id, {
      remarks: "Amendment checked and approved",
      checklistItemResponses: [
        { checklistItemId, isChecked: true, remarks: "Amendment verified" },
      ],
      nextNodeKey: "node_second",
    });

    const instanceRestored = await chaService.getFilingWorkflowInstance(org.id, job.id);
    const activeRun4 = instanceRestored?.nodeRuns.find((run) => run.status === "ACTIVE")!;
    
    // Complete the workflow at node_second (pass nextNodeKey as null / undefined since no subsequent nodes)
    await chaService.completeFilingNode(managerUser.id, org.id, job.id, activeRun4.id, {
      remarks: "Final compliance verification completed",
      checklistItemResponses: [],
      nextNodeKey: null,
    });

    const finalInstance = await chaService.getFilingWorkflowInstance(org.id, job.id);
    expect(finalInstance?.status).toBe("COMPLETED");
    expect(finalInstance?.currentNodeKey).toBeNull();

    // Verify job stage transitioned to FILED
    const finalJob = await db.chaJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(finalJob.stage).toBe("FILED");

    const shipmentDetails = await chaService.upsertFilingShipmentDetails(ownerUser.id, org.id, job.id, {
      filingShipmentType: "IMPORT",
      billOfEntryNumber: "BE-7788",
      shippingBillNumber: null,
    });
    expect(shipmentDetails.filingShipmentType).toBe("IMPORT");
    expect(shipmentDetails.billOfEntryNumber).toBe("BE-7788");

    await expect(
      chaService.upsertFilingShipmentDetails(ownerUser.id, org.id, job.id, {
        filingShipmentType: "IMPORT",
        billOfEntryNumber: "BE-7788",
        shippingBillNumber: "SB-0099",
      }),
    ).rejects.toThrow(/cannot both be set/);

    // J. Verify Section 49 toggle, remarks, and audit trail
    const flag = await chaService.toggleFilingSection49(ownerUser.id, org.id, job.id, true, "Urgent port clearance bond filed");
    expect(flag.isEnabled).toBe(true);
    expect(flag.remarks).toBe("Urgent port clearance bond filed");

    const retrievedFlag = await chaService.getFilingSection49(org.id, job.id);
    expect(retrievedFlag?.isEnabled).toBe(true);

    const audit = await db.chaAuditLog.findFirst({
      where: { jobId: job.id, event: "FILING_SECTION49_TOGGLED" },
    });
    expect(audit).toBeDefined();
    expect(audit?.prevState).toBe("false");
    expect(audit?.newState).toBe("true");
    expect(audit?.remarks).toContain("Urgent port clearance bond filed");
  }, 30000);
});

