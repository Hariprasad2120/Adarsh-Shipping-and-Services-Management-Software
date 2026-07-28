import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { db } from "@/lib/db";
import * as chaService from "../service";
import * as driveClient from "@/lib/google-drive-client";
import * as googleChatClient from "@/lib/google-chat-client";
import * as gmailClient from "@/lib/google-gmail-client";
import * as workspaceOauth from "@/lib/workspace-oauth";

describe("Customs House Agent (CHA) Module Integration Tests", () => {
  let org: any;
  let branch: any;
  let ownerUser: any;
  let adminUser: any;
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
    const adminRole = await db.role.create({
      data: { orgId: org.id, name: "Admin", isSystem: true },
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
        { roleId: adminRole.id, permissionId: readPermission.id },
        { roleId: managerRole.id, permissionId: readPermission.id },
        { roleId: employeeRole.id, permissionId: deletePermission.id },
        { roleId: adminRole.id, permissionId: deletePermission.id },
        { roleId: adminRole.id, permissionId: approveDeletePermission.id },
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

    adminUser = await db.user.create({
      data: {
        orgId: org.id,
        email: `cha-admin-${Date.now()}@example.com`,
        passwordHash: "dummy-hash",
        name: "Admin Approver",
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
      data: { userId: adminUser.id, roleId: adminRole.id },
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

  it("1.26. should advance the branch sequence when a user submits the current generated number", async () => {
    await chaService.ensureSettingsAndDefaults(org.id);

    const branchRuleBefore = await db.chaBranchNumberingRule.findFirstOrThrow({
      where: { branchId: branch.id, orgId: org.id },
    });
    const localJobType = await db.chaJobType.findFirstOrThrow({
      where: { orgId: org.id, isActive: true },
    });
    const localShipmentType = await db.chaShipmentType.findFirstOrThrow({
      where: { orgId: org.id, name: "Air" },
    });

    const expectedGeneratedNumber = await chaService.getNextChaJobNumberPreview(org.id, branch.id);
    expect(expectedGeneratedNumber).toBeTruthy();

    const job = await chaService.createJob(ownerUser.id, org.id, {
      jobNumber: expectedGeneratedNumber!,
      title: "Client-generated number should still advance sequence",
      customerId: customer.id,
      jobTypeId: localJobType.id,
      branchId: branch.id,
      shipmentTypeId: localShipmentType.id,
      priority: "LOW",
      primaryOwnerId: ownerUser.id,
      assignedManagerId: managerUser.id,
      assignments: [],
    });

    expect(job.jobNumber).toBe(expectedGeneratedNumber);

    const branchRuleAfter = await db.chaBranchNumberingRule.findFirstOrThrow({
      where: { branchId: branch.id, orgId: org.id },
    });
    expect(branchRuleAfter.currentSequence).toBe(branchRuleBefore.currentSequence + 1);
  });

  it("1.27. should skip an already-existing generated number and advance to the next available sequence", async () => {
    await chaService.ensureSettingsAndDefaults(org.id);

    const localJobType = await db.chaJobType.findFirstOrThrow({
      where: { orgId: org.id, isActive: true },
    });
    const localShipmentType = await db.chaShipmentType.findFirstOrThrow({
      where: { orgId: org.id, name: "Air" },
    });

    await db.chaBranchNumberingRule.updateMany({
      where: { branchId: branch.id, orgId: org.id },
      data: {
        prefix: "CHA",
        suffix: null,
        startingSequence: 1,
        currentSequence: 0,
        numberPadding: 4,
        useFinancialYear: false,
        financialYearFormat: null,
        isActive: true,
      },
    });

    await chaService.createJob(ownerUser.id, org.id, {
      jobNumber: "CHA-0001",
      title: "Existing sequence anchor",
      customerId: customer.id,
      jobTypeId: localJobType.id,
      branchId: branch.id,
      shipmentTypeId: localShipmentType.id,
      priority: "LOW",
      primaryOwnerId: ownerUser.id,
      assignedManagerId: managerUser.id,
      assignments: [],
    });

    const preview = await chaService.getNextChaJobNumberPreview(org.id, branch.id);
    expect(preview).toBe("CHA-0002");

    const autoJob = await chaService.createJob(ownerUser.id, org.id, {
      jobNumber: "CHA-0001",
      title: "Stale generated number should be advanced",
      customerId: customer.id,
      jobTypeId: localJobType.id,
      branchId: branch.id,
      shipmentTypeId: localShipmentType.id,
      priority: "LOW",
      primaryOwnerId: ownerUser.id,
      assignedManagerId: managerUser.id,
      assignments: [],
    });

    expect(autoJob.jobNumber).toBe("CHA-0002");
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
    expect(reqs.length).toBe(18);
    const mandatory = reqs.filter((r) => r.isMandatory);
    expect(mandatory.length).toBe(6); // Bill of Lading, Invoice, Packing List, IEC, GST, AD Code
  });

  it("2.1. should not auto-upload customer KYC files into a newly created job", async () => {
    await chaService.ensureSettingsAndDefaults(org.id);
    await db.crmAccount.update({
      where: { id: customer.id },
      data: {
        remarks: JSON.stringify({
          kyc: {
            "Company Address Proof": {
              fileKey: "existing-customer-address-proof-key",
              fileName: "company-address-proof.pdf",
              fileSize: 12345,
              uploadedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
            },
          },
        }),
      },
    });
    const importJobType = await db.chaJobType.findFirstOrThrow({
      where: { orgId: org.id, name: "Import Clearance" },
    });

    const job = await chaService.createJob(ownerUser.id, org.id, {
      jobNumber: `CHA-KYC-NO-COPY-${Date.now()}`,
      title: "KYC copy prevention check",
      customerId: customer.id,
      jobTypeId: importJobType.id,
      branchId: branch.id,
      priority: "LOW",
      primaryOwnerId: ownerUser.id,
      assignedManagerId: managerUser.id,
      assignments: [],
    });

    const companyAddressProof = await db.chaJobDocumentRequirement.findFirstOrThrow({
      where: { jobId: job.id, name: "Company Address Proof" },
      include: { versions: true },
    });

    expect(companyAddressProof.status).toBe("PENDING");
    expect(companyAddressProof.versions).toHaveLength(0);
  });

  it("3. should handle document gates, uploads and exceptions", async () => {
    const job = await db.chaJob.findFirstOrThrow({ where: { orgId: org.id, jobNumber: "CHA-JOB-999" } });
    const reqs = await db.chaJobDocumentRequirement.findMany({ where: { jobId: job.id } });

    const blReq = reqs.find((r) => r.name === "Bill of Landing")!;
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
    const sendEmailSpy = vi.spyOn(gmailClient, "sendEmail").mockResolvedValue({ id: "gmail-message-1" });
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
    expect(internalApprovals.some((approval) => approval.assignedToId === ownerUser.id)).toBe(true);

    const managerApprovalQueue = await chaService.listManagerChecklistApprovals(managerUser.id, org.id);
    expect(managerApprovalQueue.some((approval) => approval.checklistImport.job.id === job.id)).toBe(true);

    const ownerApprovalQueue = await chaService.listManagerChecklistApprovals(ownerUser.id, org.id);
    expect(ownerApprovalQueue.some((approval) => approval.checklistImport.job.id === job.id)).toBe(true);

    await db.chaChecklistDecision.deleteMany({
      where: {
        checklistId: checklist.id,
        stage: "INTERNAL",
        fileVersionId: uploadResult.fileVersion.id,
        assignedToId: ownerUser.id,
      },
    });

    const ownerApprovalQueueWithoutPendingRow = await chaService.listManagerChecklistApprovals(ownerUser.id, org.id);
    expect(ownerApprovalQueueWithoutPendingRow.some((approval) => approval.checklistImport.job.id === job.id)).toBe(true);

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

    const firstCustomerApprovalResult = await chaService.submitChecklistInternalDecision(
      ownerUser.id,
      org.id,
      job.id,
      checklist.id,
      "APPROVED",
      "All checks pass.",
    );
    expect(firstCustomerApprovalResult.outcome).toBe("CUSTOMER_APPROVAL");

    const checklistPendingCustomer = await db.chaChecklist.findUniqueOrThrow({ where: { id: checklist.id } });
    expect(checklistPendingCustomer.status).toBe("CUSTOMER_APPROVAL_PENDING");
    expect(checklistPendingCustomer.currentApprovalStage).toBe("CUSTOMER");

    await db.crmAccount.update({
      where: { id: customer.id },
      data: { email: "customer-approval@example.com" },
    });

    const customerMail = await chaService.sendChecklistCustomerMail(ownerUser.id, org.id, job.id, checklist.id, {
      subject: `Checklist Approval Required - ${job.jobNumber}`,
      body: "Please review the attached approved checklist.",
      additionalAttachments: [
        {
          fileName: "supporting-note.txt",
          mimeType: "text/plain",
          content: Buffer.from("supporting details"),
        },
      ],
    });
    expect(customerMail.attachmentFileName).toBe("customs-checklist-v2.pdf");
    expect(customerMail.recipients.length).toBeGreaterThan(0);
    expect(customerMail.additionalAttachmentCount).toBe(1);
    expect(sendEmailSpy).toHaveBeenCalled();

    await db.chaChecklist.update({
      where: { id: checklist.id },
      data: { customerApprovalVisibleAt: new Date(Date.now() - 60_000) },
    });

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

    sendEmailSpy.mockRestore();
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
    await db.chaJobAssignment.create({
      data: { jobId: job.id, userId: managerUser.id, responsibility: "ACCOUNTS" },
    });

    // A. Create expense request
    const request = await chaService.createExpenseRequest(ownerUser.id, org.id, job.id, {
      isUrgent: false,
      upiNumber: "9876543210",
      upiId: "vendor@upi",
      lines: [
        { category: "Customs Duty", purpose: "Electronics customs clearing", amount: 15000, requiredDate: new Date() },
        { category: "Port Handling Charges", purpose: "Container handling", amount: 4500, requiredDate: new Date() },
      ],
    });

    expect(request).toBeDefined();
    expect(request.status).toBe("UNDER_REVIEW");
    expect(request.upiNumber).toBe("9876543210");
    expect(request.upiId).toBe("vendor@upi");

    // Check lines
    const lines = await db.chaExpenseLine.findMany({ where: { requestId: request.id } });
    expect(lines.length).toBe(2);
    const sum = lines.reduce((total, l) => total + Number(l.amount), 0);
    expect(sum).toBe(19500);

    // B. Escalate to Urgent
    await chaService.triggerUrgentExpenseEscalation(ownerUser.id, org.id, request.id, "Immediate duty payment required to avoid demurrage");
    const urgentReq = await db.chaExpenseRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(urgentReq.isUrgent).toBe(true);
    expect(urgentReq.status).toBe("UNDER_REVIEW");

    // C. Owner/manager review approves the request
    await chaService.reviewExpenseRequest(managerUser.id, org.id, request.id, "APPROVED", "Verified lines are correct");
    const approvedReq = await db.chaExpenseRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(approvedReq.status).toBe("APPROVED");

    // D. Accounts marks the approved request ready for payment
    await chaService.markExpenseReadyForDisbursement(managerUser.id, org.id, request.id);
    const readyReq = await db.chaExpenseRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(readyReq.status).toBe("READY_FOR_DISBURSEMENT");

    // E. Accounts posts disbursement with mandatory proof
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

  it("8. should create, reject, and audit deletion approval requests for non-admin users", async () => {
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
    expect(pendingRequest.assignedManagerId).toBe(adminUser.id);

    await expect(
      chaService.decideJobDeletionRequest(otherManagerUser.id, org.id, {
        requestId: pendingRequest.id,
        decision: "APPROVED",
        remarks: "Attempted by non-admin",
      }),
    ).rejects.toThrow("You are not authorized to approve CHA job deletions.");

    await chaService.decideJobDeletionRequest(adminUser.id, org.id, {
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

  it("9. should allow only an admin to directly soft-delete a job", async () => {
    const driveDeleteSpy = vi.spyOn(driveClient, "deleteFileOrFolder").mockResolvedValue("deleted");
    const chatDeleteSpy = vi.spyOn(googleChatClient, "deleteGoogleChatSpace").mockResolvedValue({
      authMode: "app_auth",
      status: "deleted",
      useAdminAccess: false,
    });
    const accessTokenSpy = vi.spyOn(workspaceOauth, "getValidAccessToken").mockResolvedValue("test-drive-token");

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

    await db.googleWorkspaceConnection.upsert({
      where: { userId: adminUser.id },
      update: {
        status: "connected",
        scopes: ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/chat.admin.delete"],
      },
      create: {
        orgId: org.id,
        userId: adminUser.id,
        googleEmail: adminUser.email,
        googleUserId: `admin-${adminUser.id}`,
        accessToken: "token",
        refreshToken: "refresh",
        tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        scopes: ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/chat.admin.delete"],
        status: "connected",
      },
    });
    await db.jobWorkspaceProfile.create({
      data: {
        orgId: org.id,
        jobId: job.id,
        rootFolderId: "drive-folder-direct-delete-test",
        googleSpaceId: "spaces/AAA_DIRECT_DELETE",
        googleSpaceUrl: "https://chat.google.com/room/AAA_DIRECT_DELETE",
        provisioningStatus: "success",
      },
    });

    await expect(
      chaService.submitJobDeletion(otherManagerUser.id, org.id, {
        jobId: job.id,
        confirmationJobNumber: "CHA-DELETE-DIRECT-001",
        confirmationPhrase: "delete job",
      }),
    ).rejects.toThrow("You are not authorized to delete or request deletion for this CHA job.");

    const managerRequest = await chaService.submitJobDeletion(managerUser.id, org.id, {
      jobId: job.id,
      confirmationJobNumber: "CHA-DELETE-DIRECT-001",
      confirmationPhrase: "delete job",
      metadata: { source: "test" },
    });
    expect(managerRequest.mode).toBe("pending");

    const request = await db.chaJobDeletionRequest.findFirstOrThrow({
      where: { jobId: job.id, status: "PENDING" },
    });

    await chaService.decideJobDeletionRequest(adminUser.id, org.id, {
      requestId: request.id,
      decision: "APPROVED",
      remarks: "Admin approved direct deletion execution.",
    });

    expect(accessTokenSpy).toHaveBeenCalled();
    expect(driveDeleteSpy).toHaveBeenCalledWith("drive-folder-direct-delete-test", "test-drive-token");
    expect(chatDeleteSpy).toHaveBeenCalledWith("spaces/AAA_DIRECT_DELETE", { userId: adminUser.id });

    const deletedWorkspace = await db.jobWorkspaceProfile.findUniqueOrThrow({ where: { jobId: job.id } });
    expect(deletedWorkspace.rootFolderId).toBeNull();
    expect(deletedWorkspace.googleSpaceId).toBeNull();
    expect(deletedWorkspace.chatSpaceName).toBe("spaces/AAA_DIRECT_DELETE");
    expect(deletedWorkspace.chatSpaceDeleteStatus).toBe("SUCCESS");
    expect(deletedWorkspace.chatSpaceDeletedAt).not.toBeNull();
    expect(deletedWorkspace.googleSpaceUrl).toBeNull();
    expect(deletedWorkspace.categoryFolders).toBeNull();

    const deletedJob = await db.chaJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(deletedJob.deletedAt).not.toBeNull();
    expect(deletedJob.deletedById).toBe(adminUser.id);
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

    driveDeleteSpy.mockRestore();
    chatDeleteSpy.mockRestore();
    accessTokenSpy.mockRestore();
  }, 60000);

  it("10. should enforce confirmation rules, missing manager handling, and approved deletion execution", async () => {
    const driveDeleteSpy = vi.spyOn(driveClient, "deleteFileOrFolder").mockResolvedValue("deleted");
    const chatDeleteSpy = vi.spyOn(googleChatClient, "deleteGoogleChatSpace").mockResolvedValue({
      authMode: "app_auth",
      status: "deleted",
      useAdminAccess: false,
    });
    const accessTokenSpy = vi.spyOn(workspaceOauth, "getValidAccessToken").mockResolvedValue("test-drive-token");

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
    expect(directDeleteNoMgr.mode).toBe("pending");

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

    const noMgrRequest = await chaService.submitJobDeletion(ownerUser.id, org.id, {
      jobId: noManagerRequestJob.id,
      confirmationJobNumber: "CHA-DELETE-NOMGR-REQ",
      confirmationPhrase: "delete job",
    });
    expect(noMgrRequest.mode).toBe("pending");

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

    await db.googleWorkspaceConnection.upsert({
      where: { userId: adminUser.id },
      update: {
        status: "connected",
        scopes: ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/chat.admin.delete"],
      },
      create: {
        orgId: org.id,
        userId: adminUser.id,
        googleEmail: adminUser.email,
        googleUserId: `admin-${adminUser.id}`,
        accessToken: "token",
        refreshToken: "refresh",
        tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        scopes: ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/chat.admin.delete"],
        status: "connected",
      },
    });
    await db.jobWorkspaceProfile.create({
      data: {
        orgId: org.id,
        jobId: approvedJob.id,
        rootFolderId: "drive-folder-approved-delete-test",
        googleSpaceId: "spaces/AAA_APPROVED_DELETE",
        googleSpaceUrl: "https://chat.google.com/room/AAA_APPROVED_DELETE",
        provisioningStatus: "success",
      },
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

    expect(request.assignedManagerId).toBe(adminUser.id);

    await chaService.decideJobDeletionRequest(adminUser.id, org.id, {
      requestId: request.id,
      decision: "APPROVED",
      remarks: "Deletion approved by admin.",
    });
    expect(accessTokenSpy).toHaveBeenCalled();
    expect(driveDeleteSpy).toHaveBeenCalledWith("drive-folder-approved-delete-test", "test-drive-token");
    expect(chatDeleteSpy).toHaveBeenCalledWith("spaces/AAA_APPROVED_DELETE", { userId: adminUser.id });

    const executedRequest = await db.chaJobDeletionRequest.findUniqueOrThrow({
      where: { id: request.id },
    });
    expect(executedRequest.status).toBe("EXECUTED");
    expect(executedRequest.executedById).toBe(adminUser.id);

    const deletedJob = await db.chaJob.findUniqueOrThrow({ where: { id: approvedJob.id } });
    expect(deletedJob.deletedAt).not.toBeNull();
    expect(deletedJob.deletedById).toBe(adminUser.id);
    expect(deletedJob.jobNumber).toContain("CHA-DELETE-APPROVE-001__deleted__");

    const deletedWorkspace = await db.jobWorkspaceProfile.findUniqueOrThrow({ where: { jobId: approvedJob.id } });
    expect(deletedWorkspace.rootFolderId).toBeNull();
    expect(deletedWorkspace.googleSpaceId).toBeNull();
    expect(deletedWorkspace.chatSpaceName).toBe("spaces/AAA_APPROVED_DELETE");
    expect(deletedWorkspace.chatSpaceDeleteStatus).toBe("SUCCESS");
    expect(deletedWorkspace.chatSpaceDeletedAt).not.toBeNull();
    expect(deletedWorkspace.googleSpaceUrl).toBeNull();
    expect(deletedWorkspace.categoryFolders).toBeNull();

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

    driveDeleteSpy.mockRestore();
    chatDeleteSpy.mockRestore();
    accessTokenSpy.mockRestore();
  }, 60000);

  it("11. should keep the stored chat space name when cleanup fails and allow admin retry", async () => {
    const driveDeleteSpy = vi.spyOn(driveClient, "deleteFileOrFolder").mockResolvedValue("deleted");
    const chatDeleteSpy = vi
      .spyOn(googleChatClient, "deleteGoogleChatSpace")
      .mockRejectedValueOnce(
        new googleChatClient.GoogleChatDeleteError({
          authMode: "app_auth",
          status: 403,
          message: "The Chat app is not allowed to delete this space.",
          googleCode: 403,
          googleMessage: "The Chat app is not allowed to delete this space.",
        }),
      )
      .mockResolvedValueOnce({
        authMode: "app_auth",
        status: "deleted",
        useAdminAccess: false,
      });
    const accessTokenSpy = vi.spyOn(workspaceOauth, "getValidAccessToken").mockResolvedValue("test-drive-token");

    const job = await chaService.createJob(ownerUser.id, org.id, {
      jobNumber: "CHA-DELETE-RETRY-001",
      title: "Retry chat cleanup job",
      customerId: customer.id,
      jobTypeId: jobTypeImport.id,
      branchId: branch.id,
      priority: "LOW",
      primaryOwnerId: ownerUser.id,
      assignedManagerId: managerUser.id,
      assignments: [{ userId: ownerUser.id, responsibility: "OPERATIONS" }],
    });

    await db.jobWorkspaceProfile.create({
      data: {
        orgId: org.id,
        jobId: job.id,
        rootFolderId: "drive-folder-retry-delete-test",
        googleSpaceId: "spaces/AAA_RETRY_DELETE",
        chatSpaceName: "spaces/AAA_RETRY_DELETE",
        googleSpaceUrl: "https://chat.google.com/room/AAA_RETRY_DELETE",
        provisioningStatus: "success",
        chatSpaceDeleteStatus: "PENDING",
      },
    });

    const requestResult = await chaService.submitJobDeletion(ownerUser.id, org.id, {
      jobId: job.id,
      confirmationJobNumber: "CHA-DELETE-RETRY-001",
      confirmationPhrase: "delete job",
    });
    expect(requestResult.mode).toBe("pending");

    const request = await db.chaJobDeletionRequest.findFirstOrThrow({
      where: { jobId: job.id, status: "PENDING" },
    });

    await chaService.decideJobDeletionRequest(adminUser.id, org.id, {
      requestId: request.id,
      decision: "APPROVED",
      remarks: "Delete the job even if chat cleanup needs retry.",
    });

    const failedCleanupWorkspace = await db.jobWorkspaceProfile.findUniqueOrThrow({
      where: { jobId: job.id },
    });
    expect(failedCleanupWorkspace.googleSpaceId).toBe("spaces/AAA_RETRY_DELETE");
    expect(failedCleanupWorkspace.chatSpaceName).toBe("spaces/AAA_RETRY_DELETE");
    expect(failedCleanupWorkspace.chatSpaceDeleteStatus).toBe("FAILED");
    expect(failedCleanupWorkspace.chatSpaceDeleteError).toContain("insufficient permissions");

    const deletedJob = await db.chaJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(deletedJob.deletedAt).not.toBeNull();

    const retryResult = await chaService.retryJobChatCleanup(adminUser.id, org.id, job.id);
    expect(retryResult.outcome).toBe("deleted");
    expect(chatDeleteSpy).toHaveBeenNthCalledWith(2, "spaces/AAA_RETRY_DELETE", { userId: adminUser.id });

    const retriedWorkspace = await db.jobWorkspaceProfile.findUniqueOrThrow({
      where: { jobId: job.id },
    });
    expect(retriedWorkspace.googleSpaceId).toBeNull();
    expect(retriedWorkspace.chatSpaceName).toBe("spaces/AAA_RETRY_DELETE");
    expect(retriedWorkspace.chatSpaceDeleteStatus).toBe("SUCCESS");
    expect(retriedWorkspace.chatSpaceDeleteError).toBeNull();
    expect(retriedWorkspace.chatSpaceDeletedAt).not.toBeNull();

    driveDeleteSpy.mockRestore();
    chatDeleteSpy.mockRestore();
    accessTokenSpy.mockRestore();
  }, 60000);

  it("11. should seed the configurable default filing workflow with vertical first-check and branch paths", async () => {
    await db.filingWorkflowTemplate.deleteMany({ where: { orgId: org.id } });

    await chaService.ensureDefaultFilingWorkflows(org.id);

    const workflows = await chaService.listFilingWorkflows(org.id);
    expect(workflows).toHaveLength(1);

    // listFilingWorkflows returns summary only; fetch full details for node/edge assertions
    const details = await chaService.getFilingWorkflowDetails("system", org.id, workflows[0].id);
    const activeVersion = details.versions.find((version: any) => version.isActive);
    expect(activeVersion).toBeDefined();
    if (!activeVersion) {
      throw new Error("Active filing workflow version was not created.");
    }

    const nodeNames = activeVersion.nodes.map((node: any) => node.name);
    expect(nodeNames).toEqual(expect.arrayContaining([
      "Choose Filing Flow",
      "Bill Filing",
      "Shipping Bill Filing",
      "Choose Import BE Check Type",
      "Choose Export SB Check Type",
      "BE Copy Generation",
      "SB Copy Generation",
      "Amendment Decision",
      "Amendment",
      "Workflow Complete",
    ]));

    const importStart = activeVersion.nodes.find((node: any) => node.key === "bill_filing");
    expect(importStart?.isStart).toBe(false);
    expect(importStart?.fieldDefinitionsJson).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "bill_number", label: "Bill Filing Number" }),
        expect.objectContaining({ key: "bill_filing_date", label: "Bill Filing Date" }),
      ]),
    );

    const exportStart = activeVersion.nodes.find((node: any) => node.key === "shipping_bill_filing");
    expect(exportStart?.checklistItems).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "Checklist Item" })]),
    );
    expect(exportStart?.fieldDefinitionsJson).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "shipping_bill_number", label: "Shipping Bill Number" }),
        expect.objectContaining({ key: "shipping_bill_date", label: "Shipping Bill Date" }),
      ]),
    );

    const importFirstCheckNodes = activeVersion.nodes.filter((node: any) => node.sectionKey === "import_be_first_check" && node.key !== "import_be_first_check");
    const exportFirstCheckNodes = activeVersion.nodes.filter((node: any) => node.sectionKey === "export_sb_first_check" && node.key !== "export_sb_first_check");
    expect(importFirstCheckNodes).toHaveLength(8);
    expect(exportFirstCheckNodes).toHaveLength(8);
    expect(importFirstCheckNodes.some((node: any) => node.name === "Duty" && node.canBeSkipped)).toBe(true);
    expect(exportFirstCheckNodes.some((node: any) => node.name === "Duty" && node.canBeSkipped)).toBe(true);

    const rmsNodes = activeVersion.nodes.filter((node: any) => node.branchKey === "rms");
    const openBillNodes = activeVersion.nodes.filter((node: any) => node.branchKey === "open_bill");
    expect(rmsNodes).toHaveLength(8);
    expect(openBillNodes).toHaveLength(14);

    expect(activeVersion.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceKey: "choose_filing_flow",
          targetKey: "shipping_bill_filing",
          label: "Export / Shipping Bill",
        }),
        expect.objectContaining({
          sourceKey: "shipping_bill_filing",
          targetKey: "export_sb_choose_check_type",
          label: "Choose Check Type",
        }),
        expect.objectContaining({
          sourceKey: "export_sb_choose_second_check_category",
          targetKey: "export_sb_second_check_rms",
          label: "RMS",
        }),
        expect.objectContaining({
          sourceKey: "export_sb_choose_second_check_category",
          targetKey: "export_sb_second_check_open_bill",
          label: "Open Bill",
        }),
        expect.objectContaining({
          sourceKey: "amendment_decision",
          targetKey: "workflow_complete",
          label: "Skip Amendment",
        }),
        expect.objectContaining({
          sourceKey: "import_be_second_check_rms_delivery",
          targetKey: "amendment_decision",
        }),
        expect.objectContaining({
          sourceKey: "export_sb_second_check_open_bill_delivery",
          targetKey: "amendment_decision",
        }),
      ]),
    );
  }, 30000);

  it("12. should verify visual filing workflow and Section 49 lifecycle", async () => {
    // Delete any default templates to ensure only the custom one is active
    await db.filingWorkflowTemplate.deleteMany({ where: { orgId: org.id } });
    await chaService.ensureSettingsAndDefaults(org.id);
    const importJobType = await db.chaJobType.findFirstOrThrow({
      where: { orgId: org.id, name: "Import Clearance" },
    });

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
          nodeType: "END",
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
    const savedDraftVersion = saveRes.versions?.[0];
    expect(savedDraftVersion?.isPublished).toBe(false);

    // B. Publish version
    const publishRes = await chaService.publishFilingWorkflow(ownerUser.id, org.id, savedDraftVersion!.id);
    expect(publishRes.isPublished).toBe(true);
    expect(publishRes.isActive).toBe(true);

    // C. Create a Job and fast forward stage to FILING
    const job = await chaService.createJob(ownerUser.id, org.id, {
      jobNumber: "CHA-FILING-TEST-101",
      title: "Customs filing blueprint test run",
      customerId: customer.id,
      jobTypeId: importJobType.id,
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

    const expandedStartKey = "node_start";

    // D. Start visual filing workflow
    const instance = await chaService.startFilingWorkflow(ownerUser.id, org.id, job.id);
    if (!instance) throw new Error("instance is null");
    expect(instance).toBeDefined();
    expect(instance.status).toBe("ACTIVE");
    expect(instance.currentNodeKey).toBe(expandedStartKey);

    const activeRun = instance.nodeRuns.find((run: any) => run.status === "ACTIVE")!;
    expect(activeRun).toBeDefined();
    expect(activeRun.nodeKey).toBe(expandedStartKey);

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
    const photo = await chaService.uploadFilingAttachment(ownerUser.id, org.id, job.id, activeRun.id, photoRequirementId, null, null, {
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
    const activeRun2 = instanceAfterFirstNode?.nodeRuns.find((run: any) => run.status === "ACTIVE")!;
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
    expect(instanceDoubleBack?.currentNodeKey).toBe(expandedStartKey);
    const activeRun3 = instanceDoubleBack?.nodeRuns.find((run: any) => run.status === "ACTIVE")!;
    expect(activeRun3.nodeKey).toBe(expandedStartKey);

    // I. Test transition to complete (File bill copy)
    // First, upload the mandatory photo for the new run of the start node
    await chaService.uploadFilingAttachment(ownerUser.id, org.id, job.id, activeRun3.id, photoRequirementId, null, null, {
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
    const activeRun4 = instanceRestored?.nodeRuns.find((run: any) => run.status === "ACTIVE")!;
    
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

  it("12b. should keep prerequisite stages blocked until mandatory checklist items are checked", async () => {
    await db.filingWorkflowInstance.deleteMany({ where: { job: { orgId: org.id } } });
    await db.filingWorkflowTemplate.deleteMany({ where: { orgId: org.id } });
    await chaService.ensureSettingsAndDefaults(org.id);
    const importJobType = await db.chaJobType.findFirstOrThrow({
      where: { orgId: org.id, name: "Import Clearance" },
    });

    const workflowDraft = await chaService.saveFilingWorkflowDraft(ownerUser.id, org.id, null, {
      name: `Prerequisite Checklist Gate ${Date.now()}`,
      description: "Validates that completed prerequisite stages still need checked mandatory items.",
      nodes: [
        {
          key: "duty",
          name: "Duty",
          description: "Pay and verify duty.",
          category: "Operations",
          positionX: 100,
          positionY: 100,
          isStart: true,
          slaDuration: 1,
          slaUnit: "BUSINESS_DAYS",
          commentsRequired: false,
          canBeSkipped: true,
          canBeRevisited: true,
          requireAllMandatoryChecklistItems: false,
          requireMandatoryPhotos: false,
          allowedRoles: ["Employee", "Manager"],
          checklistItems: [{ label: "Duty paid", isMandatory: false }],
          photoRequirements: [],
        },
        {
          key: "delivery",
          name: "Delivery",
          description: "Delivery can proceed only after duty is really done.",
          category: "Operations",
          nodeType: "END",
          positionX: 320,
          positionY: 100,
          isStart: false,
          slaDuration: 1,
          slaUnit: "BUSINESS_DAYS",
          commentsRequired: false,
          canBeSkipped: false,
          canBeRevisited: true,
          requireAllMandatoryChecklistItems: false,
          requireMandatoryPhotos: false,
          allowedRoles: ["Employee", "Manager"],
          checklistItems: [],
          photoRequirements: [],
          actionConfig: {
            prerequisiteGate: {
              enabled: true,
              mode: "ALL",
              requiredNodeKeys: ["duty"],
            },
          },
        },
      ],
      edges: [{ sourceKey: "duty", targetKey: "delivery", label: "Next" }],
    });

    await chaService.publishFilingWorkflow(ownerUser.id, org.id, workflowDraft.versions?.[0]?.id!);

    const job = await chaService.createJob(ownerUser.id, org.id, {
      jobNumber: `CHA-PREREQ-${Date.now()}`,
      title: "Prerequisite checklist gate test",
      customerId: customer.id,
      jobTypeId: importJobType.id,
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

    const startedInstance = await chaService.startFilingWorkflow(ownerUser.id, org.id, job.id);
    const dutyRun = startedInstance.nodeRuns.find((run: any) => run.status === "ACTIVE");
    const dutyChecklistItemId = dutyRun.node.checklistItems[0].id;

    await chaService.completeFilingNode(ownerUser.id, org.id, job.id, dutyRun.id, {
      remarks: "Duty stage was advanced without ticking duty paid.",
      checklistItemResponses: [{ checklistItemId: dutyChecklistItemId, isChecked: false }],
      nextNodeKey: "delivery",
    });

    const deliveryInstance = await chaService.getFilingWorkflowInstance(org.id, job.id);
    const skippedDutyRun = deliveryInstance.nodeRuns.find((run: any) => run.id === dutyRun.id);
    expect(skippedDutyRun?.status).toBe("SKIPPED");
    expect(deliveryInstance.currentNodeKey).toBe("delivery");
    expect(deliveryInstance.activeNodePrerequisiteStatus?.isBlocked).toBe(true);
    expect(deliveryInstance.activeNodePrerequisiteStatus?.missingNodeKeys).toContain("duty");

    const deliveryRun = deliveryInstance.nodeRuns.find((run: any) => run.status === "ACTIVE");
    await expect(
      chaService.completeFilingNode(ownerUser.id, org.id, job.id, deliveryRun.id, {
        remarks: "Trying to complete delivery before duty is checked.",
        checklistItemResponses: [],
        nextNodeKey: null,
      }),
    ).rejects.toThrow(/blocked until prerequisite stages are completed: Duty/);

    await chaService.redirectBlockedFilingWorkflowStage(ownerUser.id, org.id, job.id, deliveryRun.id, "duty");

    const redirectedInstance = await chaService.getFilingWorkflowInstance(org.id, job.id);
    const reopenedDutyRun = redirectedInstance.nodeRuns.find((run: any) => run.status === "ACTIVE");
    expect(reopenedDutyRun.nodeKey).toBe("duty");

    await chaService.completeFilingNode(ownerUser.id, org.id, job.id, reopenedDutyRun.id, {
      remarks: "Duty is now completed for delivery.",
      checklistItemResponses: [{ checklistItemId: reopenedDutyRun.node.checklistItems[0].id, isChecked: true }],
      nextNodeKey: "delivery",
    });

    const resumedInstance = await chaService.getFilingWorkflowInstance(org.id, job.id);
    expect(resumedInstance.currentNodeKey).toBe("delivery");
    expect(resumedInstance.activeNodeRun?.nodeKey).toBe("delivery");
    expect(resumedInstance.pendingBlockedStage).toBeNull();
    expect(resumedInstance.activeNodePrerequisiteStatus?.isBlocked).toBe(false);
  }, 30000);

  it("12.1. should sync filing uploads into the job documents registry with validity metadata", async () => {
    await db.filingWorkflowInstance.deleteMany({ where: { job: { orgId: org.id } } });
    await db.filingWorkflowTemplate.deleteMany({ where: { orgId: org.id } });

    const workflowDraft = await chaService.saveFilingWorkflowDraft(ownerUser.id, org.id, null, {
      name: `Workflow Upload Sync ${Date.now()}`,
      description: "Verifies filing uploads sync to documents",
      nodes: [
        {
          key: "start_upload",
          name: "Upload Step",
          description: "Upload a workflow document with validity tracking",
          category: "CHECKLIST_ITEM",
          positionX: 100,
          positionY: 100,
          isStart: true,
          checklistItems: [
            {
              label: "Upload E-Way Bill",
              isMandatory: true,
              allowsUpload: true,
              minUploads: 1,
              acceptedFileTypes: ["application/pdf"],
              documentType: "E-Way Bill",
              requiresValidity: true,
              warningBeforeDuration: 1,
              warningBeforeUnit: "CALENDAR_DAYS",
              notifyBeforeExpiry: true,
            },
          ],
          photoRequirements: [],
        },
      ],
      edges: [],
    });

    await chaService.publishFilingWorkflow(ownerUser.id, org.id, workflowDraft.versions?.[0]?.id!);

    const job = await chaService.createJob(ownerUser.id, org.id, {
      jobNumber: `CHA-FILING-DOCSYNC-${Date.now()}`,
      title: "Filing upload sync job",
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

    const started = await chaService.startFilingWorkflow(ownerUser.id, org.id, job.id);
    const activeRun = started.nodeRuns.find((run: any) => run.status === "ACTIVE");
    expect(activeRun).toBeDefined();

    const validityDate = new Date("2026-08-10T00:00:00.000Z");
    await chaService.uploadFilingAttachment(
      ownerUser.id,
      org.id,
      job.id,
      activeRun.id,
      null,
      activeRun.node.checklistItems[0].id,
      null,
      {
        fileName: "eway-bill.pdf",
        mimeType: "application/pdf",
        sizeBytes: 2048,
      },
      undefined,
      validityDate,
    );

    const syncedRequirement = await db.chaJobDocumentRequirement.findFirst({
      where: {
        jobId: job.id,
        name: "E-Way Bill",
      },
      include: {
        versions: {
          where: { isCurrent: true },
        },
      },
    });

    expect(syncedRequirement).toBeDefined();
    expect(syncedRequirement?.status).toBe("UPLOADED");
    expect(syncedRequirement?.versions[0]?.source).toBe("FILING_WORKFLOW");
    expect(syncedRequirement?.versions[0]?.validityDate?.toISOString()).toBe(validityDate.toISOString());
  }, 30000);

  it("13. should switch active filing templates by scope while preserving existing job versions", async () => {
    await chaService.ensureSettingsAndDefaults(org.id);
    const importJobType = await db.chaJobType.findFirstOrThrow({
      where: { orgId: org.id, name: "Import Clearance" },
    });

    await db.filingWorkflowInstance.deleteMany({ where: { job: { orgId: org.id } } });
    await db.filingWorkflowTemplate.deleteMany({ where: { orgId: org.id } });

    const legacyDraft = await chaService.saveFilingWorkflowDraft(ownerUser.id, org.id, null, {
      name: `Legacy Filing Workflow ${Date.now()}`,
      description: "Legacy workflow",
      nodes: [
        {
          key: "legacy_start",
          name: "Legacy Start",
          description: "Old starting stage",
          category: "Operations",
          positionX: 100,
          positionY: 100,
          isStart: true,
          slaDuration: 1,
          slaUnit: "BUSINESS_DAYS",
          commentsRequired: false,
          canBeSkipped: false,
          canBeRevisited: true,
          requireAllMandatoryChecklistItems: true,
          requireMandatoryPhotos: false,
          allowedRoles: ["Employee"],
          checklistItems: [
            { label: "Legacy checklist", isMandatory: true, requiresRemarks: false, allowsUpload: false },
          ],
          photoRequirements: [],
        },
        {
          key: "legacy_finish",
          name: "Legacy Finish",
          description: "Old final stage",
          category: "Operations",
          nodeType: "END",
          positionX: 300,
          positionY: 100,
          isStart: false,
          slaDuration: 1,
          slaUnit: "BUSINESS_DAYS",
          commentsRequired: false,
          canBeSkipped: false,
          canBeRevisited: true,
          requireAllMandatoryChecklistItems: true,
          requireMandatoryPhotos: false,
          allowedRoles: ["Employee"],
          checklistItems: [],
          photoRequirements: [],
        },
      ],
      edges: [{ sourceKey: "legacy_start", targetKey: "legacy_finish", label: "Next" }],
    });
    const legacyPublished = await chaService.publishFilingWorkflow(ownerUser.id, org.id, legacyDraft.versions?.[0]?.id!);

    const existingJob = await chaService.createJob(ownerUser.id, org.id, {
      jobNumber: `CHA-FILING-LEGACY-${Date.now()}`,
      title: "Legacy workflow job",
      customerId: customer.id,
      jobTypeId: importJobType.id,
      branchId: branch.id,
      priority: "MEDIUM",
      primaryOwnerId: ownerUser.id,
      assignedManagerId: managerUser.id,
      assignments: [{ userId: ownerUser.id, responsibility: "OPERATIONS" }],
    });

    await db.chaJob.update({
      where: { id: existingJob.id },
      data: { stage: "FILING" },
    });

    const startedLegacyInstance = await chaService.startFilingWorkflow(ownerUser.id, org.id, existingJob.id);
    expect(startedLegacyInstance.versionId).toBe(legacyPublished.id);
    expect(startedLegacyInstance.currentNodeKey).toBe("legacy_start");

    const replacementDraft = await chaService.saveFilingWorkflowDraft(ownerUser.id, org.id, null, {
      name: `Replacement Filing Workflow ${Date.now()}`,
      description: "Replacement workflow",
      nodes: [
        {
          key: "replacement_start",
          name: "Replacement Start",
          description: "New starting stage",
          category: "Compliance",
          positionX: 100,
          positionY: 100,
          isStart: true,
          slaDuration: 2,
          slaUnit: "BUSINESS_DAYS",
          commentsRequired: false,
          canBeSkipped: false,
          canBeRevisited: true,
          requireAllMandatoryChecklistItems: true,
          requireMandatoryPhotos: false,
          allowedRoles: ["Employee"],
          checklistItems: [
            { label: "Replacement checklist", isMandatory: true, requiresRemarks: false, allowsUpload: false },
          ],
          photoRequirements: [],
        },
        {
          key: "replacement_finish",
          name: "Replacement Finish",
          description: "New final stage",
          category: "Compliance",
          nodeType: "END",
          positionX: 320,
          positionY: 100,
          isStart: false,
          slaDuration: 2,
          slaUnit: "BUSINESS_DAYS",
          commentsRequired: false,
          canBeSkipped: false,
          canBeRevisited: true,
          requireAllMandatoryChecklistItems: true,
          requireMandatoryPhotos: false,
          allowedRoles: ["Employee"],
          checklistItems: [],
          photoRequirements: [],
        },
      ],
      edges: [{ sourceKey: "replacement_start", targetKey: "replacement_finish", label: "Continue" }],
    });
    const replacementPublished = await chaService.publishFilingWorkflow(ownerUser.id, org.id, replacementDraft.versions?.[0]?.id!);

    const workflows = await chaService.listFilingWorkflows(org.id);
    const legacyTemplate = workflows.find((workflow: any) => workflow.id === legacyPublished.templateId);
    const replacementTemplate = workflows.find((workflow: any) => workflow.id === replacementPublished.templateId);
    expect(legacyTemplate?.isActive).toBe(false);
    expect(replacementTemplate?.isActive).toBe(true);

    const preservedInstance = await chaService.getFilingWorkflowInstance(org.id, existingJob.id);
    expect(preservedInstance.versionId).toBe(legacyPublished.id);
    expect(preservedInstance.currentNodeKey).toBe("legacy_start");
    expect(preservedInstance.activeNodeRun?.node?.name).toBe("Legacy Start");

    const newJob = await chaService.createJob(ownerUser.id, org.id, {
      jobNumber: `CHA-FILING-NEW-${Date.now()}`,
      title: "Replacement workflow job",
      customerId: customer.id,
      jobTypeId: importJobType.id,
      branchId: branch.id,
      priority: "MEDIUM",
      primaryOwnerId: ownerUser.id,
      assignedManagerId: managerUser.id,
      assignments: [{ userId: ownerUser.id, responsibility: "OPERATIONS" }],
    });

    await db.chaJob.update({
      where: { id: newJob.id },
      data: { stage: "FILING" },
    });

    const startedReplacementInstance = await chaService.startFilingWorkflow(ownerUser.id, org.id, newJob.id);
    expect(startedReplacementInstance.versionId).toBe(replacementPublished.id);
    expect(startedReplacementInstance.currentNodeKey).toBe("replacement_start");
  }, 30000);

  it("13.1. should persist bill_filing deletion and start new jobs from the replacement start node", async () => {
    await db.filingWorkflowInstance.deleteMany({ where: { job: { orgId: org.id } } });
    await db.filingWorkflowTemplate.deleteMany({ where: { orgId: org.id } });
    const importJobType = await db.chaJobType.findFirstOrThrow({
      where: { orgId: org.id, name: "Import Clearance" },
    });

    const initialDraft = await chaService.saveFilingWorkflowDraft(ownerUser.id, org.id, null, {
      name: `Bill Filing Delete ${Date.now()}`,
      description: "Delete bill filing and keep replacement node as the only start node",
      nodes: [
        {
          key: "bill_filing",
          name: "Bill Filing",
          description: "Original bill filing node",
          category: "Operations",
          positionX: 100,
          positionY: 100,
          isStart: true,
          checklistItems: [],
          fieldDefinitionsJson: [
            { key: "bill_number", label: "Bill Filing Number", type: "TEXT", required: true },
          ],
          documentRequirementsJson: [
            { key: "bill_document", label: "Bill Document", required: true },
          ],
          conditionalSectionsJson: [],
          photoRequirements: [],
        },
        {
          key: "replacement_start",
          name: "Replacement Start",
          description: "Replacement start node",
          category: "Operations",
          positionX: 340,
          positionY: 100,
          isStart: false,
          checklistItems: [{ label: "Replacement checklist", isMandatory: true, allowsUpload: false }],
          photoRequirements: [],
        },
      ],
      edges: [{ sourceKey: "bill_filing", targetKey: "replacement_start", label: "Next" }],
    });

    const updatedDraft = await chaService.saveFilingWorkflowDraft(ownerUser.id, org.id, initialDraft.id, {
      name: initialDraft.name,
      description: initialDraft.description || "",
      nodes: [
        {
          key: "replacement_start",
          name: "Replacement Start",
          description: "Replacement start node",
          category: "Operations",
          positionX: 340,
          positionY: 100,
          isStart: true,
          checklistItems: [{ label: "Replacement checklist", isMandatory: true, allowsUpload: false }],
          photoRequirements: [],
        },
      ],
      edges: [],
    });

    const reloadedDraft = await chaService.getFilingWorkflowDetails(ownerUser.id, org.id, updatedDraft.id);
    expect(reloadedDraft.versions[0]?.nodes.map((node: any) => node.key)).toEqual(["replacement_start"]);
    expect(reloadedDraft.versions[0]?.edges).toHaveLength(0);

    const published = await chaService.publishFilingWorkflow(ownerUser.id, org.id, updatedDraft.versions?.[0]?.id!);
    const publishedDetails = await chaService.getFilingWorkflowDetails(ownerUser.id, org.id, published.templateId);
    expect(publishedDetails.versions[0]?.nodes.some((node: any) => node.key === "bill_filing")).toBe(false);

    const job = await chaService.createJob(ownerUser.id, org.id, {
      jobNumber: `CHA-FILING-DELETE-${Date.now()}`,
      title: "Bill filing deletion regression",
      customerId: customer.id,
      jobTypeId: importJobType.id,
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

    const instance = await chaService.startFilingWorkflow(ownerUser.id, org.id, job.id);
    expect(instance.currentNodeKey).toBe("replacement_start");
    expect(instance.activeNodeRun?.node?.key).toBe("replacement_start");
  }, 30000);

  it("13.2. should save and reload an empty filing workflow draft without restoring starter nodes", async () => {
    await db.filingWorkflowInstance.deleteMany({ where: { job: { orgId: org.id } } });
    await db.filingWorkflowTemplate.deleteMany({ where: { orgId: org.id } });

    const emptyDraft = await chaService.saveFilingWorkflowDraft(ownerUser.id, org.id, null, {
      name: `Empty Filing Draft ${Date.now()}`,
      description: "Empty draft regression",
      nodes: [],
      edges: [],
    });

    const details = await chaService.getFilingWorkflowDetails(ownerUser.id, org.id, emptyDraft.id);
    expect(details.versions[0]?.nodes).toHaveLength(0);
    expect(details.versions[0]?.edges).toHaveLength(0);

    await expect(
      chaService.publishFilingWorkflow(ownerUser.id, org.id, emptyDraft.versions?.[0]?.id!),
    ).rejects.toThrow(/Validation Failed/);
  }, 30000);

  it("14. should auto-send notifications from notification nodes and advance to the next stage", async () => {
    await chaService.ensureSettingsAndDefaults(org.id);
    const importJobType = await db.chaJobType.findFirstOrThrow({
      where: { orgId: org.id, name: "Import Clearance" },
    });

    await db.filingWorkflowInstance.deleteMany({ where: { job: { orgId: org.id } } });
    await db.filingWorkflowTemplate.deleteMany({ where: { orgId: org.id } });

    const workflowDraft = await chaService.saveFilingWorkflowDraft(ownerUser.id, org.id, null, {
      name: `Notification Filing Workflow ${Date.now()}`,
      description: "Workflow with an automatic notification step",
      nodes: [
        {
          key: "start_check",
          name: "Start Check",
          description: "Initial filing review",
          category: "CHECKLIST_ITEM",
          positionX: 100,
          positionY: 100,
          isStart: true,
          slaDuration: 1,
          slaUnit: "BUSINESS_DAYS",
          commentsRequired: false,
          canBeSkipped: false,
          canBeRevisited: true,
          requireAllMandatoryChecklistItems: true,
          requireMandatoryPhotos: false,
          allowedRoles: ["Employee", "Manager"],
          checklistItems: [
            { label: "Review filing packet", isMandatory: true, requiresRemarks: false, allowsUpload: false },
          ],
          photoRequirements: [],
        },
        {
          key: "notify_team",
          name: "Notify Filing Team",
          description: "The filing workflow has reached the stakeholder alert point.",
          category: "NOTIFICATION",
          nodeType: "NOTIFICATION",
          positionX: 100,
          positionY: 280,
          isStart: false,
          slaDuration: 1,
          slaUnit: "BUSINESS_DAYS",
          commentsRequired: false,
          canBeSkipped: false,
          canBeRevisited: true,
          requireAllMandatoryChecklistItems: false,
          requireMandatoryPhotos: false,
          allowedRoles: [],
          checklistItems: [],
          photoRequirements: [],
        },
        {
          key: "final_check",
          name: "Final Check",
          description: "Continue after notification",
          category: "CHECKLIST_ITEM",
          positionX: 100,
          positionY: 460,
          isStart: false,
          slaDuration: 1,
          slaUnit: "BUSINESS_DAYS",
          commentsRequired: false,
          canBeSkipped: false,
          canBeRevisited: true,
          requireAllMandatoryChecklistItems: true,
          requireMandatoryPhotos: false,
          allowedRoles: ["Employee", "Manager"],
          checklistItems: [
            { label: "Finalize customs step", isMandatory: true, requiresRemarks: false, allowsUpload: false },
          ],
          photoRequirements: [],
        },
      ],
      edges: [
        { sourceKey: "start_check", targetKey: "notify_team", label: "Notify stakeholders" },
        { sourceKey: "notify_team", targetKey: "final_check", label: "Continue filing" },
      ],
    });

    await chaService.publishFilingWorkflow(ownerUser.id, org.id, workflowDraft.versions?.[0]?.id!);

    const job = await chaService.createJob(ownerUser.id, org.id, {
      jobNumber: `CHA-FILING-NOTIFY-${Date.now()}`,
      title: "Notification node workflow job",
      customerId: customer.id,
      jobTypeId: importJobType.id,
      branchId: branch.id,
      priority: "MEDIUM",
      primaryOwnerId: ownerUser.id,
      assignedManagerId: managerUser.id,
      assignments: [
        { userId: ownerUser.id, responsibility: "OPERATIONS" },
        { userId: otherManagerUser.id, responsibility: "DOCUMENTATION" },
      ],
    });

    await db.chaJob.update({
      where: { id: job.id },
      data: { stage: "FILING" },
    });

    const startedInstance = await chaService.startFilingWorkflow(ownerUser.id, org.id, job.id);
    const startRun = startedInstance.nodeRuns.find((run: any) => run.status === "ACTIVE");
    expect(startRun?.nodeKey).toBe("start_check");

    await chaService.completeFilingNode(ownerUser.id, org.id, job.id, startRun.id, {
      remarks: "Initial filing review done",
      checklistItemResponses: [
        { checklistItemId: startRun.node.checklistItems[0].id, isChecked: true },
      ],
      nextNodeKey: "notify_team",
    });

    const progressedInstance = await chaService.getFilingWorkflowInstance(org.id, job.id);
    expect(progressedInstance.currentNodeKey).toBe("final_check");
    expect(progressedInstance.activeNodeRun?.nodeKey).toBe("final_check");

    const notifications = await db.notification.findMany({
      where: {
        orgId: org.id,
        kind: "CHA_FILING_WORKFLOW_NODE",
        link: `/cha/jobs/${job.id}`,
      },
      orderBy: { createdAt: "asc" },
    });

    expect(notifications.map((notification) => notification.userId).sort()).toEqual(
      [ownerUser.id, managerUser.id, otherManagerUser.id].sort(),
    );
    expect(notifications.every((notification) => notification.title === "Notify Filing Team")).toBe(true);
  }, 30000);
});

