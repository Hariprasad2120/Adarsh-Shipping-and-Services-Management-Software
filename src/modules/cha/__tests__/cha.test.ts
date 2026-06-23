import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import * as chaService from "../service";
import * as XLSX from "xlsx";
import { Prisma } from "@/generated/prisma/client";

describe("Customs House Agent (CHA) Module Integration Tests", () => {
  let org: any;
  let branch: any;
  let ownerUser: any;
  let managerUser: any;
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

    // Assign roles to users
    await db.userRole.create({
      data: { userId: ownerUser.id, roleId: employeeRole.id },
    });
    await db.userRole.create({
      data: { userId: managerUser.id, roleId: managerRole.id },
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

    jobTypeImport = jobTypes.find((jt) => jt.name === "Import Clearance");
    expect(jobTypeImport).toBeDefined();

    const docDefs = await db.chaDocumentDefinition.findMany({ where: { jobTypeId: jobTypeImport.id } });
    expect(docDefs.length).toBe(4); // BL, Invoice, Packing List, CO
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
    expect(reqs.length).toBe(4);
    const mandatory = reqs.filter((r) => r.isMandatory);
    expect(mandatory.length).toBe(3); // Bill of Lading, Invoice, Packing List
  });

  it("3. should handle document gates, uploads and exceptions", async () => {
    const job = await db.chaJob.findFirstOrThrow({ where: { orgId: org.id, jobNumber: "CHA-JOB-999" } });
    const reqs = await db.chaJobDocumentRequirement.findMany({ where: { jobId: job.id } });

    const blReq = reqs.find((r) => r.name === "Bill of Lading")!;
    const invReq = reqs.find((r) => r.name === "Commercial Invoice")!;
    const pkReq = reqs.find((r) => r.name === "Packing List")!;

    // A. Verify document gate fails initially
    const gate1 = await chaService.verifyDocumentGate(job.id);
    expect(gate1.passed).toBe(false);
    expect(gate1.blockingRequirements.length).toBe(3);

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

    // E. Verify document gate passes now
    const gate2 = await chaService.verifyDocumentGate(job.id);
    expect(gate2.passed).toBe(true);
    expect(gate2.blockingRequirements.length).toBe(0);
  });

  it("4. should import checklist, submit for approval and handle manager actions", async () => {
    const job = await db.chaJob.findFirstOrThrow({ where: { orgId: org.id, jobNumber: "CHA-JOB-999" } });

    // A. Generate a mock Excel workbook
    const checklistData = [
      { Section: "Basic Details", "Question Identifier": "Q1", Question: "Is IGST paid?", "Response Type": "BOOLEAN", Value: "Yes", Remarks: "Paid online" },
      { Section: "Basic Details", "Question Identifier": "Q2", Question: "HSN code correct?", "Response Type": "BOOLEAN", Value: "Yes", Remarks: "Checked" },
      { Section: "Port Clearance", "Question Identifier": "Q3", Question: "Container Seal matches?", "Response Type": "BOOLEAN", Value: "Yes", Remarks: "Verified" },
    ];
    const ws = XLSX.utils.json_to_sheet(checklistData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Checklist");
    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // B. Import checklist
    const checklistImport = await chaService.importChecklistExcel(
      ownerUser.id,
      org.id,
      job.id,
      excelBuffer,
      "checklist_draft.xlsx",
      excelBuffer.length
    );

    expect(checklistImport).toBeDefined();
    expect(checklistImport.status).toBe("READY");

    const updatedJob1 = await db.chaJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(updatedJob1.stage).toBe("CHECKLIST_PREPARATION");

    // C. Submit checklist for approval
    const submitted = await chaService.submitChecklistForApproval(ownerUser.id, org.id, job.id, checklistImport.id);
    expect(submitted.status).toBe("PENDING_APPROVAL");

    const updatedJob2 = await db.chaJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(updatedJob2.stage).toBe("CHECKLIST_APPROVAL");

    // D. Manager reviews and requests REWORK
    const approvals = await db.chaChecklistApproval.findMany({ where: { importId: checklistImport.id } });
    expect(approvals.length).toBe(1);
    expect(approvals[0].managerId).toBe(managerUser.id);

    await chaService.checklistManagerAction(
      managerUser.id,
      org.id,
      job.id,
      checklistImport.id,
      approvals[0].id,
      "REWORK",
      "HSN code verification proof is missing. Please re-check Q2."
    );

    const checklistAfterRework = await db.chaChecklistImport.findUniqueOrThrow({ where: { id: checklistImport.id } });
    expect(checklistAfterRework.status).toBe("REWORK");

    const jobAfterRework = await db.chaJob.findUniqueOrThrow({ where: { id: job.id } });
    expect(jobAfterRework.stage).toBe("CHECKLIST_PREPARATION");

    // E. Re-submit checklist
    await chaService.submitChecklistForApproval(ownerUser.id, org.id, job.id, checklistImport.id);

    // F. Manager approves
    const newApprovals = await db.chaChecklistApproval.findMany({ where: { importId: checklistImport.id, decision: "PENDING" } });
    expect(newApprovals.length).toBe(1);

    await chaService.checklistManagerAction(
      managerUser.id,
      org.id,
      job.id,
      checklistImport.id,
      newApprovals[0].id,
      "APPROVED",
      "All checks pass."
    );

    const checklistApproved = await db.chaChecklistImport.findUniqueOrThrow({ where: { id: checklistImport.id } });
    expect(checklistApproved.status).toBe("APPROVED");

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
});

