import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { createNotification } from "@/modules/notifications/service";
import * as XLSX from "xlsx";
import { Prisma } from "@/generated/prisma/client";
import { can } from "@/lib/rbac";

// Ensure settings and defaults are created for the organisation
export async function ensureSettingsAndDefaults(orgId: string) {
  let settings = await db.chaSettings.findUnique({
    where: { orgId },
  });

  if (!settings) {
    settings = await db.chaSettings.create({
      data: {
        orgId,
        jobCreatorRoles: JSON.stringify(["Admin", "HR", "Manager", "Employee"]),
        jobCreatorUsers: JSON.stringify([]),
        selfApprovalAllowed: true,
        managerApprovalPolicy: "ANY", // ANY | ALL
        expenseCategories: JSON.stringify([
          "Customs Duty",
          "Port Handling Charges",
          "Transportation",
          "Documentation charges",
          "Agent Commission",
          "Storage Fees",
          "Miscellaneous"
        ]),
        jobNumberPrefix: "CHA",
        jobNumberNextNum: 1,
      },
    });

    // Create default Job Types
    const importType = await db.chaJobType.create({
      data: {
        orgId,
        name: "Import Clearance",
      },
    });

    const exportType = await db.chaJobType.create({
      data: {
        orgId,
        name: "Export Clearance",
      },
    });

    // Create default document definitions for Import
    await db.chaDocumentDefinition.createMany({
      data: [
        { jobTypeId: importType.id, name: "Bill of Lading", category: "Commercial", isMandatory: true },
        { jobTypeId: importType.id, name: "Commercial Invoice", category: "Financial", isMandatory: true },
        { jobTypeId: importType.id, name: "Packing List", category: "Logistics", isMandatory: true },
        { jobTypeId: importType.id, name: "Certificate of Origin", category: "Compliance", isMandatory: false },
      ],
    });

    // Create default document definitions for Export
    await db.chaDocumentDefinition.createMany({
      data: [
        { jobTypeId: exportType.id, name: "Shipping Bill", category: "Commercial", isMandatory: true },
        { jobTypeId: exportType.id, name: "Commercial Invoice", category: "Financial", isMandatory: true },
        { jobTypeId: exportType.id, name: "Packing List", category: "Logistics", isMandatory: true },
        { jobTypeId: exportType.id, name: "Export License", category: "Compliance", isMandatory: false },
      ],
    });
  }

  return settings;
}

// Log a CHA audit event helper
export async function logChaAudit(params: {
  orgId: string;
  jobId?: string;
  entityType: string;
  entityId: string;
  event: string;
  actorId: string;
  prevState?: string;
  newState?: string;
  remarks?: string;
  metadata?: any;
}) {
  return db.chaAuditLog.create({
    data: {
      orgId: params.orgId,
      jobId: params.jobId,
      entityType: params.entityType,
      entityId: params.entityId,
      event: params.event,
      actorId: params.actorId,
      prevState: params.prevState,
      newState: params.newState,
      remarks: params.remarks,
      metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
    },
  });
}

// Create a CHA Job
export async function createJob(
  actorId: string,
  orgId: string,
  data: {
    jobNumber?: string;
    title: string;
    customerId: string;
    customerRef?: string;
    jobTypeId: string;
    branchId: string;
    priority: string;
    remarks?: string;
    primaryOwnerId: string;
    assignments: { userId: string; responsibility: string }[];
    estimatedClosureDate?: Date | string;
  }
) {
  const settings = await ensureSettingsAndDefaults(orgId);

  // Validate creator authorization from settings
  const creatorRoles = await db.userRole.findMany({
    where: { userId: actorId },
    include: { role: true },
  });
  const creatorRoleNames = creatorRoles.map((ur) => ur.role.name);

  const allowedRoles: string[] = settings.jobCreatorRoles
    ? JSON.parse(settings.jobCreatorRoles as string)
    : [];
  const allowedUsers: string[] = settings.jobCreatorUsers
    ? JSON.parse(settings.jobCreatorUsers as string)
    : [];

  const isRoleAllowed = creatorRoleNames.some((r) => allowedRoles.includes(r));
  const isUserAllowed = allowedUsers.includes(actorId);

  if (!isRoleAllowed && !isUserAllowed) {
    throw new Error("You are not authorized to create jobs under this organisation's settings.");
  }

  // Auto numbering logic:
  let finalJobNumber = data.jobNumber?.trim();
  if (!finalJobNumber) {
    const nextNum = settings.jobNumberNextNum || 1;
    const prefix = settings.jobNumberPrefix || "CHA";
    const paddedNum = String(nextNum).padStart(4, "0");
    finalJobNumber = `${prefix}-${paddedNum}`;

    // Increment next serial number in settings
    await db.chaSettings.update({
      where: { orgId },
      data: { jobNumberNextNum: nextNum + 1 },
    });
  } else {
    // If the manually entered job number matches the auto-number pattern, increment nextNum
    const prefix = settings.jobNumberPrefix || "CHA";
    const prefixPattern = new RegExp(`^${prefix}-(\\d+)$`);
    const match = finalJobNumber.match(prefixPattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= settings.jobNumberNextNum) {
        await db.chaSettings.update({
          where: { orgId },
          data: { jobNumberNextNum: num + 1 },
        });
      }
    }
  }

  // Validate uniqueness of finalJobNumber
  const existingJob = await db.chaJob.findFirst({
    where: { orgId, jobNumber: finalJobNumber },
  });
  if (existingJob) {
    throw new Error(`Job number '${finalJobNumber}' already exists inside the organisation.`);
  }

  const result = await db.$transaction(async (tx) => {
    // 1. Create Job
    const job = await tx.chaJob.create({
      data: {
        orgId,
        jobNumber: finalJobNumber,
        title: data.title,
        customerId: data.customerId,
        customerRef: data.customerRef,
        jobTypeId: data.jobTypeId,
        branchId: data.branchId,
        priority: data.priority,
        stage: "DOCUMENT_COLLECTION",
        status: "ACTIVE",
        primaryOwnerId: data.primaryOwnerId,
        remarks: data.remarks,
        estimatedClosureDate: data.estimatedClosureDate ? new Date(data.estimatedClosureDate) : null,
      },
    });

    // 2. Create assignments (primary owner is implicitly operations/owner)
    // Add primary owner assignment if not present
    const ownerAssignmentPresent = data.assignments.some(
      (a) => a.userId === data.primaryOwnerId && a.responsibility === "OPERATIONS"
    );
    const assignmentsToCreate = [...data.assignments];
    if (!ownerAssignmentPresent) {
      assignmentsToCreate.push({ userId: data.primaryOwnerId, responsibility: "OPERATIONS" });
    }

    await tx.chaJobAssignment.createMany({
      data: assignmentsToCreate.map((a) => ({
        jobId: job.id,
        userId: a.userId,
        responsibility: a.responsibility,
      })),
    });

    // 3. Fetch Document Definitions for this Job Type and initialize requirements
    const defs = await tx.chaDocumentDefinition.findMany({
      where: { jobTypeId: data.jobTypeId },
    });

    await tx.chaJobDocumentRequirement.createMany({
      data: defs.map((d) => ({
        jobId: job.id,
        name: d.name,
        category: d.category,
        isMandatory: d.isMandatory,
        status: "PENDING",
      })),
    });

    // 4. Initialize Filing
    await tx.chaFiling.create({
      data: {
        jobId: job.id,
        status: "PENDING",
      },
    });

    // 5. Initialize Customer Advance
    await tx.chaCustomerAdvance.create({
      data: {
        jobId: job.id,
        status: "PENDING",
      },
    });

    return { job, assignmentsToCreate };
  });

  // Log Audit trail & trigger notifications (out of transaction for speed, but logged)
  const now = await getNow();
  await logChaAudit({
    orgId,
    jobId: result.job.id,
    entityType: "ChaJob",
    entityId: result.job.id,
    event: "JOB_CREATED",
    actorId,
    newState: "DOCUMENT_COLLECTION",
    remarks: `Job created with ${result.assignmentsToCreate.length} assignments`,
  });

  // Notify concerned users
  const uniqueUserIds = Array.from(new Set(result.assignmentsToCreate.map((a) => a.userId)));
  for (const userId of uniqueUserIds) {
    await createNotification({
      userId,
      orgId,
      kind: "CHA_JOB_ASSIGNED",
      title: `New Job Assigned: ${finalJobNumber}`,
      body: `You are assigned to the new customs clearance job ${finalJobNumber} (${data.title}).`,
      link: `/cha/jobs/${result.job.id}`,
      priority: "important",
    });

    // Create Todo task for document collection
    await db.todoTask.create({
      data: {
        userId,
        orgId,
        title: `Collect documents for Job ${finalJobNumber}`,
        description: `Check the required document slots and upload file copies for job ${finalJobNumber}.`,
        status: "PENDING",
      },
    });
  }

  // Trigger Google Workspace background provisioning
  if (process.env.NODE_ENV !== "test") {
    const { provisionJobWorkspace } = await import("@/lib/workspace-provisioning");
    provisionJobWorkspace(result.job.id).catch((err: any) => {
      console.error(`Workspace background provisioning failed for job ${result.job.id}:`, err);
    });
  }

  return result.job;
}

// Clearance Job Types management helpers
export async function createJobType(orgId: string, name: string) {
  const existing = await db.chaJobType.findFirst({
    where: { orgId, name: { equals: name, mode: "insensitive" } },
  });
  if (existing) {
    throw new Error(`Clearance job type '${name}' already exists.`);
  }
  return db.chaJobType.create({
    data: {
      orgId,
      name,
    },
  });
}

export async function deleteJobType(orgId: string, id: string) {
  const count = await db.chaJob.count({
    where: { orgId, jobTypeId: id },
  });
  if (count > 0) {
    throw new Error("Cannot delete job type as it is currently associated with active clearance jobs.");
  }
  // Delete document definitions cascade
  await db.chaDocumentDefinition.deleteMany({
    where: { jobTypeId: id },
  });
  return db.chaJobType.delete({
    where: { id },
  });
}

// Team Groups management helpers
export async function createTeamGroup(orgId: string, name: string, memberIds: string[]) {
  const existing = await db.chaTeamGroup.findFirst({
    where: { orgId, name: { equals: name, mode: "insensitive" } },
  });
  if (existing) {
    throw new Error(`Team group '${name}' already exists.`);
  }
  return db.chaTeamGroup.create({
    data: {
      orgId,
      name,
      memberIds: JSON.stringify(memberIds),
    },
  });
}

export async function deleteTeamGroup(orgId: string, id: string) {
  return db.chaTeamGroup.delete({
    where: { id, orgId },
  });
}

// Get Job Details with access policies
export async function getJobDetails(userId: string, orgId: string, jobId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { roles: { include: { role: true } } },
  });
  if (!user) throw new Error("User not found");

  const job = await db.chaJob.findFirst({
    where: { id: jobId, orgId },
    include: {
      customer: true,
      jobType: true,
      branch: true,
      primaryOwner: { select: { id: true, name: true, email: true, designation: true } },
      assignments: { include: { user: { select: { id: true, name: true, email: true, designation: true } } } },
      documentRequirements: { include: { versions: { include: { uploadedBy: { select: { name: true } } } }, exception: { include: { user: { select: { name: true } } } } } },
      checklistImports: { include: { uploadedBy: { select: { name: true } }, approvals: { include: { manager: { select: { name: true } } } }, reworkNotes: { include: { author: { select: { name: true } } } }, sections: { include: { items: true } } } },
      filing: { include: { dateHistory: { include: { setBy: { select: { name: true } } } } } },
      customerAdvance: { include: { receipts: true } },
      expenseRequests: { include: { requestedBy: { select: { name: true } }, lines: true, payments: { include: { paidBy: { select: { name: true } } } }, queries: { include: { author: { select: { name: true } } } }, statusHistory: true } },
      auditLogs: { orderBy: { timestamp: "desc" } },
    },
  });

  if (!job) {
    throw new Error("Job not found.");
  }

  // Gated Gearing check:
  const isPlatformAdmin = user.isPlatformAdmin;
  const isOrgAdmin = user.roles.some((r) => r.role.name === "Admin" || r.role.name === "Management" || r.role.name === "Director");
  const isAssigned = job.assignments.some((a) => a.userId === userId);
  const isManagerApprover = job.assignments.some((a) => a.userId === userId && a.responsibility === "APPROVAL");
  const hasViewAll = await can(userId, "cha.job.view_all");

  if (!isPlatformAdmin && !isOrgAdmin && !isAssigned && !isManagerApprover && !hasViewAll) {
    throw new Error("Access Denied: You are not assigned to this job, nor do you have organization-wide viewing rights.");
  }

  // Resolve actor names manually to avoid db-level relation constraints
  const actorIds = Array.from(new Set(job.auditLogs.map((l) => l.actorId)));
  const actors = await db.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true },
  });
  const actorMap = new Map(actors.map((a) => [a.id, { name: a.name }]));

  const auditLogsWithActor = job.auditLogs.map((log) => ({
    ...log,
    actor: actorMap.get(log.actorId) || { name: "System" },
  }));

  return {
    ...job,
    auditLogs: auditLogsWithActor,
  };
}

// Search & List Jobs
export async function listJobs(
  userId: string,
  orgId: string,
  filters: {
    search?: string;
    stage?: string;
    status?: string;
    priority?: string;
    branchId?: string;
    jobTypeId?: string;
    assignedToMe?: boolean;
    page?: number;
    pageSize?: number;
  }
) {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 10;
  const skip = (page - 1) * pageSize;

  const where: any = { orgId };

  if (filters.search) {
    where.OR = [
      { jobNumber: { contains: filters.search, mode: "insensitive" } },
      { title: { contains: filters.search, mode: "insensitive" } },
      { customer: { name: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  if (filters.stage) where.stage = filters.stage;
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.jobTypeId) where.jobTypeId = filters.jobTypeId;

  if (filters.assignedToMe) {
    where.assignments = { some: { userId } };
  }

  const [total, items] = await Promise.all([
    db.chaJob.count({ where }),
    db.chaJob.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        jobType: true,
        branch: true,
        primaryOwner: { select: { name: true } },
        assignments: { include: { user: { select: { name: true } } } },
      },
    }),
  ]);

  return { total, items, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// Upload a version for a document requirement
export async function uploadDocumentVersion(
  actorId: string,
  orgId: string,
  jobId: string,
  requirementId: string,
  fileData: {
    fileKey: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    checksum?: string;
  }
) {
  const req = await db.chaJobDocumentRequirement.findFirstOrThrow({
    where: { id: requirementId, jobId },
  });

  const result = await db.$transaction(async (tx) => {
    // Mark previous current versions as not current
    await tx.chaDocumentVersion.updateMany({
      where: { requirementId, isCurrent: true },
      data: { isCurrent: false },
    });

    // Save version
    const version = await tx.chaDocumentVersion.create({
      data: {
        requirementId,
        fileKey: fileData.fileKey,
        fileName: fileData.fileName,
        mimeType: fileData.mimeType,
        sizeBytes: fileData.sizeBytes,
        checksum: fileData.checksum,
        uploadedById: actorId,
      },
    });

    // Update status to uploaded
    await tx.chaJobDocumentRequirement.update({
      where: { id: requirementId },
      data: { status: "UPLOADED" },
    });

    // Clear any previous exception
    await tx.chaDocumentException.deleteMany({
      where: { requirementId },
    });

    return version;
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaJobDocumentRequirement",
    entityId: requirementId,
    event: "DOCUMENT_UPLOADED",
    actorId,
    newState: "UPLOADED",
    remarks: `Uploaded document: ${fileData.fileName}`,
  });

  // If a document changes after checklist approval, flag alert
  const job = await db.chaJob.findUniqueOrThrow({
    where: { id: jobId },
    include: { checklistImports: { where: { status: "APPROVED" } }, assignments: { where: { responsibility: "APPROVAL" } } },
  });

  if (job.stage === "FILING" || job.stage === "FILED") {
    // Notify checklist approvers and owner
    const approverIds = job.assignments.map((a) => a.userId);
    const notificationRecipients = Array.from(new Set([job.primaryOwnerId, ...approverIds]));

    for (const recipientId of notificationRecipients) {
      await createNotification({
        userId: recipientId,
        orgId,
        kind: "CHA_JOB_ASSIGNED",
        title: `Material Doc Changed: ${job.jobNumber}`,
        body: `A document requirement (${req.name}) was updated after checklist approval. Review if re-approval is required.`,
        link: `/cha/jobs/${jobId}`,
        priority: "important",
      });
    }
  }

  return result;
}

// Declare document "Not Available" with a reason
export async function declareDocumentException(
  actorId: string,
  orgId: string,
  jobId: string,
  requirementId: string,
  reason: string,
  attachmentKey?: string
) {
  if (!reason.trim()) {
    throw new Error("A clear reason is required to declare a document unavailable.");
  }

  const result = await db.$transaction(async (tx) => {
    // Save exception
    const exception = await tx.chaDocumentException.upsert({
      where: { requirementId },
      update: { reason, userId: actorId, createdAt: new Date(), attachmentKey },
      create: { requirementId, reason, userId: actorId, attachmentKey },
    });

    // Update status to not available
    await tx.chaJobDocumentRequirement.update({
      where: { id: requirementId },
      data: { status: "NOT_AVAILABLE" },
    });

    return exception;
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaJobDocumentRequirement",
    entityId: requirementId,
    event: "DOCUMENT_EXCEPTION_DECLARED",
    actorId,
    newState: "NOT_AVAILABLE",
    remarks: `Declared unavailable: ${reason}`,
  });

  return result;
}

// Gate check: opens Checklist Preparation only when every mandatory document is actioned
export async function verifyDocumentGate(jobId: string) {
  const reqs = await db.chaJobDocumentRequirement.findMany({
    where: { jobId },
  });

  const blocking = reqs.filter(
    (r) => r.isMandatory && r.status !== "UPLOADED" && r.status !== "NOT_AVAILABLE"
  );

  return {
    passed: blocking.length === 0,
    blockingRequirements: blocking.map((b) => ({ id: b.id, name: b.name })),
  };
}

// Parse and validate Excel checklist
export async function importChecklistExcel(
  actorId: string,
  orgId: string,
  jobId: string,
  fileBuffer: Buffer,
  fileName: string,
  fileSize: number
) {
  // Check doc gate first
  const gate = await verifyDocumentGate(jobId);
  if (!gate.passed) {
    throw new Error(
      `Cannot import checklist. The following mandatory documents are pending upload/exception: ${gate.blockingRequirements
        .map((r) => r.name)
        .join(", ")}`
    );
  }

  const workbook = XLSX.read(fileBuffer, { type: "buffer" });
  if (workbook.SheetNames.length === 0) {
    throw new Error("Invalid Excel file: No sheets found.");
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet);

  if (rows.length === 0) {
    throw new Error("Excel sheet is empty.");
  }

  // Schema format validation
  // Expecting columns: "Section", "Question Identifier", "Question", "Response Type", "Value", "Remarks"
  const expectedHeaders = ["Section", "Question Identifier", "Question", "Response Type", "Value"];
  const headerKeys = Object.keys(rows[0]);

  for (const header of expectedHeaders) {
    if (!headerKeys.some((h) => h.toLowerCase() === header.toLowerCase())) {
      throw new Error(`Missing required column: "${header}" in checklist workbook.`);
    }
  }

  const templateVersion = "v1.0.0"; // Simulated template detection

  const result = await db.$transaction(async (tx) => {
    // 1. Create Checklist Import record
    const checklistImport = await tx.chaChecklistImport.create({
      data: {
        jobId,
        fileName,
        fileSize,
        templateVersion,
        status: "READY",
        uploadedById: actorId,
      },
    });

    // 2. Parse rows and group by section
    const sectionsMap = new Map<string, any[]>();
    for (const row of rows) {
      const secName = (row.Section || row.section || "General Details").trim();
      const questionId = (row["Question Identifier"] || row.questionIdentifier || row.id || "").trim();
      const questionText = (row.Question || row.question || "").trim();
      const respType = (row["Response Type"] || row.responseType || "TEXT").trim().toUpperCase();
      const val = row.Value !== undefined ? String(row.Value).trim() : null;
      const rem = row.Remarks !== undefined ? String(row.Remarks).trim() : null;

      if (!questionText) continue;

      if (!sectionsMap.has(secName)) {
        sectionsMap.set(secName, []);
      }

      sectionsMap.get(secName)!.push({
        identifier: questionId,
        question: questionText,
        responseType: respType,
        value: val,
        remarks: rem,
      });
    }

    // 3. Save sections and items
    let secOrder = 1;
    for (const [secName, items] of sectionsMap.entries()) {
      const section = await tx.chaChecklistSection.create({
        data: {
          importId: checklistImport.id,
          name: secName,
          order: secOrder++,
        },
      });

      let itemOrder = 1;
      await tx.chaChecklistItem.createMany({
        data: items.map((item) => ({
          sectionId: section.id,
          order: itemOrder++,
          identifier: item.identifier,
          question: item.question,
          responseType: item.responseType,
          value: item.value,
          remarks: item.remarks,
        })),
      });
    }

    // 4. Update Job Stage
    await tx.chaJob.update({
      where: { id: jobId },
      data: { stage: "CHECKLIST_PREPARATION" },
    });

    return checklistImport;
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaChecklistImport",
    entityId: result.id,
    event: "CHECKLIST_IMPORTED",
    actorId,
    newState: "CHECKLIST_PREPARATION",
    remarks: `Uploaded Excel checklist: ${fileName} (${rows.length} items)`,
  });

  return result;
}

// Submit checklist for Manager Approval
export async function submitChecklistForApproval(
  actorId: string,
  orgId: string,
  jobId: string,
  importId: string
) {
  const job = await db.chaJob.findUniqueOrThrow({
    where: { id: jobId },
    include: { assignments: { where: { responsibility: "APPROVAL" } } },
  });

  const managers = job.assignments.filter((a) => a.responsibility === "APPROVAL");
  if (managers.length === 0) {
    throw new Error("Cannot submit: No approval manager is assigned to this job. Assign an approval manager first.");
  }

  const result = await db.$transaction(async (tx) => {
    // 1. Freeze the imported checklist status
    const checklist = await tx.chaChecklistImport.update({
      where: { id: importId },
      data: { status: "PENDING_APPROVAL" },
    });

    // 2. Clear any pending approval entries
    await tx.chaChecklistApproval.deleteMany({
      where: { importId },
    });

    // 3. Create fresh approval records for managers
    await tx.chaChecklistApproval.createMany({
      data: managers.map((m) => ({
        importId,
        managerId: m.userId,
        decision: "PENDING",
      })),
    });

    // 4. Advance workflow stage to Checklist Approval
    await tx.chaJob.update({
      where: { id: jobId },
      data: { stage: "CHECKLIST_APPROVAL" },
    });

    return checklist;
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaChecklistImport",
    entityId: importId,
    event: "CHECKLIST_SUBMITTED",
    actorId,
    newState: "CHECKLIST_APPROVAL",
    remarks: `Submitted checklist for approval to ${managers.length} manager(s)`,
  });

  // Notify managers and create Todo tasks
  for (const manager of managers) {
    await createNotification({
      userId: manager.userId,
      orgId,
      kind: "CHA_CHECKLIST_SUBMITTED",
      title: `Checklist Awaiting Approval: ${job.jobNumber}`,
      body: `A checklist for job ${job.jobNumber} has been submitted for your review.`,
      link: `/cha/approvals`,
      priority: "important",
    });

    // Create Todo task
    await db.todoTask.create({
      data: {
        userId: manager.userId,
        orgId,
        title: `Approve checklist for Job ${job.jobNumber}`,
        description: `Review the imported questionnaire values and approve/send for rework for job ${job.jobNumber}.`,
        status: "PENDING",
      },
    });
  }

  return result;
}

// Manager action: Approve or Send for Rework
export async function checklistManagerAction(
  actorId: string,
  orgId: string,
  jobId: string,
  importId: string,
  approvalId: string,
  decision: "APPROVED" | "REWORK",
  remarks?: string
) {
  const result = await db.$transaction(async (tx) => {
    // 1. Update manager's approval record
    const approval = await tx.chaChecklistApproval.update({
      where: { id: approvalId },
      data: {
        decision,
        remarks,
        actionedAt: new Date(),
      },
    });

    const job = await tx.chaJob.findUniqueOrThrow({
      where: { id: jobId },
      include: {
        assignments: { where: { responsibility: "APPROVAL" } },
        primaryOwner: true,
      },
    });

    const settings = await tx.chaSettings.findUniqueOrThrow({ where: { orgId } });

    if (decision === "REWORK") {
      // Return checklist import to rework status
      await tx.chaChecklistImport.update({
        where: { id: importId },
        data: { status: "REWORK" },
      });

      // Insert rework note
      if (remarks) {
        await tx.chaChecklistReworkNote.create({
          data: {
            importId,
            authorId: actorId,
            note: remarks,
          },
        });
      }

      // Drop stage back to PREPARATION
      await tx.chaJob.update({
        where: { id: jobId },
        data: { stage: "CHECKLIST_PREPARATION" },
      });

      return { outcome: "REWORK", job, approval };
    } else {
      // Fetch all approvals to verify policy
      const allApprovals = await tx.chaChecklistApproval.findMany({
        where: { importId },
      });

      let policySatisfied = false;
      if (settings.managerApprovalPolicy === "ANY") {
        policySatisfied = allApprovals.some((a) => a.decision === "APPROVED");
      } else {
        // ALL policy
        policySatisfied = allApprovals.every((a) => a.decision === "APPROVED");
      }

      if (policySatisfied) {
        // Approve import
        await tx.chaChecklistImport.update({
          where: { id: importId },
          data: { status: "APPROVED" },
        });

        // Move to Filing stage
        await tx.chaJob.update({
          where: { id: jobId },
          data: { stage: "FILING" },
        });

        // Set default estimated filing date to +3 days from now
        const estDate = new Date();
        estDate.setDate(estDate.getDate() + 3);

        await tx.chaFiling.update({
          where: { jobId },
          data: {
            estimatedFilingDate: estDate,
          },
        });

        await tx.chaFilingDateHistory.create({
          data: {
            filingId: (await tx.chaFiling.findUniqueOrThrow({ where: { jobId } })).id,
            estimatedFilingDate: estDate,
            setById: actorId,
          },
        });

        return { outcome: "APPROVED_STAGE_ADVANCED", job, approval };
      }

      return { outcome: "APPROVED_PENDING_OTHERS", job, approval };
    }
  });

  // Log audit
  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaChecklistApproval",
    entityId: approvalId,
    event: decision === "APPROVED" ? "CHECKLIST_APPROVED" : "CHECKLIST_REWORK_REQUESTED",
    actorId,
    newState: result.outcome === "APPROVED_STAGE_ADVANCED" ? "FILING" : "CHECKLIST_APPROVAL",
    remarks: remarks || `Manager marked as ${decision}`,
  });

  // Send notifications
  if (result.outcome === "REWORK") {
    await createNotification({
      userId: result.job.primaryOwnerId,
      orgId,
      kind: "CHA_REWORK_REQUESTED",
      title: `Checklist Rework Required: ${result.job.jobNumber}`,
      body: `Your checklist for job ${result.job.jobNumber} was returned for rework. Manager Note: "${remarks || ""}"`,
      link: `/cha/jobs/${jobId}`,
      priority: "important",
    });

    // Create Todo for rework
    await db.todoTask.create({
      data: {
        userId: result.job.primaryOwnerId,
        orgId,
        title: `Rework checklist for Job ${result.job.jobNumber}`,
        description: `Correction details: ${remarks || ""}. Re-upload and submit checklist once completed.`,
        status: "PENDING",
      },
    });
  } else if (result.outcome === "APPROVED_STAGE_ADVANCED") {
    await createNotification({
      userId: result.job.primaryOwnerId,
      orgId,
      kind: "CHA_CHECKLIST_APPROVED",
      title: `Checklist Approved: ${result.job.jobNumber}`,
      body: `Your checklist for job ${result.job.jobNumber} has been approved. The workflow has advanced to the Filing stage.`,
      link: `/cha/jobs/${jobId}`,
      priority: "normal",
    });

    // Create Todo for filing
    const filingUser = result.job.assignments.find((a) => a.responsibility === "FILING") || result.job.assignments.find((a) => a.responsibility === "OPERATIONS");
    if (filingUser) {
      await db.todoTask.create({
        data: {
          userId: filingUser.userId,
          orgId,
          title: `File custom bill for Job ${result.job.jobNumber}`,
          description: `Submit filing, upload the bill copy, and enter the registration reference number.`,
          status: "PENDING",
        },
      });
    }
  }

  return result.approval;
}

// Self approval workflow
export async function selfApproveChecklist(
  actorId: string,
  orgId: string,
  jobId: string,
  importId: string,
  remarks?: string
) {
  const settings = await db.chaSettings.findUniqueOrThrow({ where: { orgId } });
  if (!settings.selfApprovalAllowed) {
    throw new Error("Self-approval is disabled by organization settings policy.");
  }

  const result = await db.$transaction(async (tx) => {
    const job = await tx.chaJob.findUniqueOrThrow({
      where: { id: jobId },
      include: { assignments: true },
    });

    // Update checklist status to approved
    await tx.chaChecklistImport.update({
      where: { id: importId },
      data: { status: "APPROVED" },
    });

    // Move to filing
    await tx.chaJob.update({
      where: { id: jobId },
      data: { stage: "FILING" },
    });

    // Set estimated filing date (+3 days)
    const estDate = new Date();
    estDate.setDate(estDate.getDate() + 3);

    const filing = await tx.chaFiling.update({
      where: { jobId },
      data: {
        estimatedFilingDate: estDate,
      },
    });

    await tx.chaFilingDateHistory.create({
      data: {
        filingId: filing.id,
        estimatedFilingDate: estDate,
        setById: actorId,
      },
    });

    return job;
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaChecklistImport",
    entityId: importId,
    event: "CHECKLIST_SELF_APPROVED",
    actorId,
    newState: "FILING",
    remarks: remarks || "Self-approved checklist",
  });

  // Notify concerned managers and filing users
  const uniqueRecipients = Array.from(new Set(result.assignments.map((a) => a.userId).filter((id) => id !== actorId)));
  for (const userId of uniqueRecipients) {
    await createNotification({
      userId,
      orgId,
      kind: "CHA_CHECKLIST_APPROVED",
      title: `Job Self-Approved: ${result.jobNumber}`,
      body: `Checklist self-approved by ${result.primaryOwnerId}. Stage is now Filing.`,
      link: `/cha/jobs/${jobId}`,
      priority: "normal",
    });
  }

  return result;
}

// Adjust estimated filing date
export async function adjustEstimatedFilingDate(
  actorId: string,
  orgId: string,
  jobId: string,
  filingId: string,
  newDate: Date
) {
  const result = await db.$transaction(async (tx) => {
    const filing = await tx.chaFiling.update({
      where: { id: filingId, jobId },
      data: { estimatedFilingDate: newDate },
    });

    await tx.chaFilingDateHistory.create({
      data: {
        filingId,
        estimatedFilingDate: newDate,
        setById: actorId,
      },
    });

    return filing;
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaFiling",
    entityId: filingId,
    event: "ESTIMATED_FILING_DATE_CHANGED",
    actorId,
    newState: newDate.toISOString(),
    remarks: "Adjusted committed timeline",
  });

  return result;
}

// Complete Filing stage (Mark as Filed)
export async function markAsFiled(
  actorId: string,
  orgId: string,
  jobId: string,
  filingId: string,
  data: {
    filingRef: string;
    actualFilingDate: Date;
    filedBillCopyKey: string;
    remarks?: string;
    delayReason?: string;
  }
) {
  if (!data.filedBillCopyKey.trim()) {
    throw new Error("Uploading the filed bill copy is mandatory to mark as filed.");
  }

  const result = await db.$transaction(async (tx) => {
    const filing = await tx.chaFiling.findUniqueOrThrow({
      where: { id: filingId },
    });

    // Calculate delay duration in days
    let isDelayed = false;
    let delayDays = 0;
    if (filing.estimatedFilingDate) {
      const est = new Date(filing.estimatedFilingDate);
      const act = new Date(data.actualFilingDate);
      if (act.getTime() > est.getTime()) {
        isDelayed = true;
        delayDays = Math.ceil((act.getTime() - est.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    if (isDelayed && !data.delayReason?.trim()) {
      throw new Error(`The actual filing date exceeds the committed date by ${delayDays} day(s). A delay reason is mandatory.`);
    }

    const updatedFiling = await tx.chaFiling.update({
      where: { id: filingId },
      data: {
        actualFilingDate: data.actualFilingDate,
        filingRef: data.filingRef,
        filedBillCopyKey: data.filedBillCopyKey,
        status: "FILED",
        delayReason: isDelayed ? data.delayReason : undefined,
      },
    });

    // Move job to next operational stages / complete
    const job = await tx.chaJob.update({
      where: { id: jobId },
      data: { stage: "FILED" },
      include: { assignments: true },
    });

    return { job, updatedFiling, isDelayed, delayDays };
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaFiling",
    entityId: filingId,
    event: "JOB_FILED",
    actorId,
    newState: "FILED",
    remarks: `Filing reference: ${data.filingRef}. ${result.isDelayed ? "Delayed: " + data.delayReason : "On-Time"}`,
  });

  // Notify Accounts members to collect customer advance
  const accountsAssignees = result.job.assignments.filter((a) => a.responsibility === "ACCOUNTS");
  const notificationRecipients = accountsAssignees.map((a) => a.userId);

  // If no specific accounts assignee is on the job, grab general users with permission
  if (notificationRecipients.length === 0) {
    const fallbackIds = await db.userRole.findMany({
      where: { role: { orgId, permissions: { some: { permission: { key: "cha.advance.manage" } } } } },
      select: { userId: true },
    });
    notificationRecipients.push(...fallbackIds.map((f) => f.userId));
  }

  for (const userId of Array.from(new Set(notificationRecipients))) {
    await createNotification({
      userId,
      orgId,
      kind: "CHA_JOB_ASSIGNED",
      title: `Advance Collection Due: ${result.job.jobNumber}`,
      body: `Job ${result.job.jobNumber} has been filed. Accounts team should verify and collect the customer advance payment.`,
      link: `/cha/jobs/${jobId}`,
      priority: "important",
    });

    // Create Todo task
    await db.todoTask.create({
      data: {
        userId,
        orgId,
        title: `Collect customer advance for Job ${result.job.jobNumber}`,
        description: `Check customer ledger / payment confirmation and update advance receipts.`,
        status: "PENDING",
      },
    });
  }

  return result.updatedFiling;
}

// Adjust Customer Advance Expected terms
export async function updateCustomerAdvanceExpected(
  actorId: string,
  orgId: string,
  jobId: string,
  advanceId: string,
  expectedAmount: number,
  dueDate?: Date,
  assignedUserId?: string
) {
  const result = await db.chaCustomerAdvance.update({
    where: { id: advanceId, jobId },
    data: {
      expectedAmount: new Prisma.Decimal(expectedAmount),
      dueDate,
      assignedUserId,
      status: "FOLLOW_UP",
    },
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaCustomerAdvance",
    entityId: advanceId,
    event: "ADVANCE_EXPECTED_UPDATED",
    actorId,
    newState: "FOLLOW_UP",
    remarks: `Expected amount set to INR ${expectedAmount}`,
  });

  return result;
}

// Record Customer Advance Receipt Payment
export async function recordCustomerAdvanceReceipt(
  actorId: string,
  orgId: string,
  jobId: string,
  advanceId: string,
  receiptData: {
    amount: number;
    receivedDate: Date;
    paymentMethod: string;
    referenceNumber?: string;
    receiptProofKey?: string;
    remarks?: string;
  }
) {
  const result = await db.$transaction(async (tx) => {
    const advance = await tx.chaCustomerAdvance.findUniqueOrThrow({
      where: { id: advanceId },
      include: { receipts: true },
    });

    // Create Receipt
    const receipt = await tx.chaCustomerAdvanceReceipt.create({
      data: {
        advanceId,
        amount: new Prisma.Decimal(receiptData.amount),
        receivedDate: receiptData.receivedDate,
        paymentMethod: receiptData.paymentMethod,
        referenceNumber: receiptData.referenceNumber,
        receiptProofKey: receiptData.receiptProofKey,
        remarks: receiptData.remarks,
        recordedById: actorId,
      },
    });

    // Sum receipts
    const totalReceived = advance.receipts
      .reduce((sum, r) => sum.add(r.amount), new Prisma.Decimal(0))
      .add(receipt.amount);

    let nextStatus = "PARTIALLY_RECEIVED";
    if (totalReceived.greaterThanOrEqualTo(advance.expectedAmount)) {
      nextStatus = "FULLY_RECEIVED";
    }

    await tx.chaCustomerAdvance.update({
      where: { id: advanceId },
      data: { status: nextStatus },
    });

    return { receipt, totalReceived, nextStatus };
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaCustomerAdvance",
    entityId: advanceId,
    event: "ADVANCE_RECEIPT_RECORDED",
    actorId,
    newState: result.nextStatus,
    remarks: `Received payment: INR ${receiptData.amount} via ${receiptData.paymentMethod}`,
  });

  return result.receipt;
}

// Set customer advance collection exception
export async function declareAdvanceNotRequired(
  actorId: string,
  orgId: string,
  jobId: string,
  advanceId: string,
  reason: string
) {
  if (!reason.trim()) {
    throw new Error("Reason is required to declare customer advance not required.");
  }

  const result = await db.chaCustomerAdvance.update({
    where: { id: advanceId, jobId },
    data: { status: "NOT_REQUIRED", notRequiredReason: reason },
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaCustomerAdvance",
    entityId: advanceId,
    event: "ADVANCE_EXEMPTED",
    actorId,
    newState: "NOT_REQUIRED",
    remarks: reason,
  });

  return result;
}

// Create Expense Request with multiple lines
export async function createExpenseRequest(
  actorId: string,
  orgId: string,
  jobId: string,
  data: {
    isUrgent: boolean;
    urgencyReason?: string;
    lines: {
      category: string;
      purpose: string;
      amount: number;
      requiredDate: Date;
      supportingDocumentKey?: string;
      remarks?: string;
    }[];
  }
) {
  if (data.lines.length === 0) {
    throw new Error("An expense request must contain at least one line item.");
  }

  // Verify requester is not accounts-only
  const user = await db.user.findUnique({
    where: { id: actorId },
    include: { roles: { include: { role: true } } },
  });

  const isOnlyAccounts =
    user?.roles &&
    user.roles.length > 0 &&
    user.roles.every((r) => r.role.name === "Accounts") &&
    !user.isPlatformAdmin;
  if (isOnlyAccounts) {
    throw new Error("Authorization Denied: Users acting in an Accounts capacity cannot submit operational expense requests.");
  }

  const result = await db.$transaction(async (tx) => {
    // 1. Create Request
    const request = await tx.chaExpenseRequest.create({
      data: {
        jobId,
        orgId,
        status: data.isUrgent ? "URGENT_PAYMENT_REQUIRED" : "SUBMITTED",
        requestedById: actorId,
        isUrgent: data.isUrgent,
        urgencyReason: data.isUrgent ? data.urgencyReason : undefined,
        urgentRequestedAt: data.isUrgent ? new Date() : undefined,
        urgentRequestedById: data.isUrgent ? actorId : undefined,
      },
    });

    // 2. Create lines
    await tx.chaExpenseLine.createMany({
      data: data.lines.map((l) => ({
        requestId: request.id,
        category: l.category,
        purpose: l.purpose,
        amount: new Prisma.Decimal(l.amount),
        requiredDate: l.requiredDate,
        supportingDocumentKey: l.supportingDocumentKey,
        remarks: l.remarks,
      })),
    });

    // 3. Create status history
    await tx.chaExpenseStatusHistory.create({
      data: {
        requestId: request.id,
        status: request.status,
        actionedById: actorId,
        remarks: data.isUrgent ? `Submitted urgent: ${data.urgencyReason}` : "Submitted request",
      },
    });

    return request;
  });

  const job = await db.chaJob.findUniqueOrThrow({
    where: { id: jobId },
  });

  await logChaAudit({
    orgId,
    jobId,
    entityType: "ChaExpenseRequest",
    entityId: result.id,
    event: "EXPENSE_SUBMITTED",
    actorId,
    newState: result.status,
    remarks: `Created request with ${data.lines.length} items. Urgent: ${data.isUrgent}`,
  });

  // Notify Accounts members
  const accountsPeople = await db.userRole.findMany({
    where: { role: { orgId, permissions: { some: { permission: { key: "cha.expense.manage" } } } } },
    select: { userId: true },
  });

  for (const acc of accountsPeople) {
    await createNotification({
      userId: acc.userId,
      orgId,
      kind: "CHA_EXPENSE_SUBMITTED",
      title: data.isUrgent ? `URGENT Expense Request: ${job.jobNumber}` : `New Expense Request: ${job.jobNumber}`,
      body: `Expense request for job ${job.jobNumber} is awaiting verification. Urgency: ${data.isUrgent ? "High" : "Standard"}.`,
      link: `/cha/expenses`,
      priority: data.isUrgent ? "important" : "normal",
    });

    // Create Todo task
    await db.todoTask.create({
      data: {
        userId: acc.userId,
        orgId,
        title: data.isUrgent ? `URGENT Pay Expense for Job ${job.jobNumber}` : `Verify Expense for Job ${job.jobNumber}`,
        description: `Review line items and post payment disbursement details.`,
        status: "PENDING",
      },
    });
  }

  return result;
}

// Request urgency escalation on an existing expense
export async function triggerUrgentExpenseEscalation(
  actorId: string,
  orgId: string,
  requestId: string,
  urgencyReason: string
) {
  if (!urgencyReason.trim()) {
    throw new Error("Urgency reason is required for escalation.");
  }

  const result = await db.$transaction(async (tx) => {
    const request = await tx.chaExpenseRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { job: true },
    });

    if (request.status === "PAID" || request.status === "RECEIPT_ACKNOWLEDGED") {
      throw new Error("Cannot escalate: payment has already been disbursed.");
    }

    const updated = await tx.chaExpenseRequest.update({
      where: { id: requestId },
      data: {
        status: "URGENT_PAYMENT_REQUIRED",
        isUrgent: true,
        urgencyReason,
        urgentRequestedAt: new Date(),
        urgentRequestedById: actorId,
      },
    });

    await tx.chaExpenseStatusHistory.create({
      data: {
        requestId,
        status: "URGENT_PAYMENT_REQUIRED",
        actionedById: actorId,
        remarks: `Escalated to Urgent: ${urgencyReason}`,
      },
    });

    return updated;
  });

  await logChaAudit({
    orgId,
    entityType: "ChaExpenseRequest",
    entityId: requestId,
    event: "EXPENSE_ESCALATED",
    actorId,
    newState: "URGENT_PAYMENT_REQUIRED",
    remarks: urgencyReason,
  });

  // Notify Accounts members of immediate escalation
  const accountsPeople = await db.userRole.findMany({
    where: { role: { orgId, permissions: { some: { permission: { key: "cha.expense.manage" } } } } },
    select: { userId: true },
  });

  for (const acc of accountsPeople) {
    await createNotification({
      userId: acc.userId,
      orgId,
      kind: "CHA_EXPENSE_SUBMITTED",
      title: `URGENT ESCALATION: Expense Request`,
      body: `Immediate payment has been requested for expense reference ${requestId}. Reason: "${urgencyReason}"`,
      link: `/cha/expenses`,
      priority: "important",
    });
  }

  return result;
}

// Review action on Expense Request (Mark status update)
export async function setExpenseStatus(
  actorId: string,
  orgId: string,
  requestId: string,
  status: "UNDER_REVIEW" | "CLARIFICATION_REQUIRED" | "APPROVED" | "READY_FOR_DISBURSEMENT" | "REJECTED",
  remarks?: string
) {
  if (status === "CLARIFICATION_REQUIRED" && !remarks?.trim()) {
    throw new Error("Clarification requests require a specific query note.");
  }
  if (status === "REJECTED" && !remarks?.trim()) {
    throw new Error("Expense rejections require an administrative rejection reason.");
  }

  const result = await db.$transaction(async (tx) => {
    const updated = await tx.chaExpenseRequest.update({
      where: { id: requestId },
      data: { status },
    });

    await tx.chaExpenseStatusHistory.create({
      data: {
        requestId,
        status,
        actionedById: actorId,
        remarks: remarks || `Status set to ${status}`,
      },
    });

    return updated;
  });

  await logChaAudit({
    orgId,
    entityType: "ChaExpenseRequest",
    entityId: requestId,
    event: `EXPENSE_STATUS_${status}`,
    actorId,
    newState: status,
    remarks,
  });

  // Notify requester
  await createNotification({
    userId: result.requestedById,
    orgId,
    kind: "CHA_EXPENSE_APPROVED",
    title: `Expense Status Update: ${status.replace(/_/g, " ")}`,
    body: `Your expense request status has been updated to ${status.replace(/_/g, " ")}. Details: "${remarks || ""}"`,
    link: `/cha/jobs/${result.jobId}`,
    priority: status === "CLARIFICATION_REQUIRED" || status === "REJECTED" ? "important" : "normal",
  });

  return result;
}

// Post payment disbursement details
export async function postExpensePayment(
  actorId: string,
  orgId: string,
  requestId: string,
  paymentData: {
    amountPaid: number;
    paymentDate: Date;
    paymentMethod: string;
    transactionReference: string;
    paymentProofKey: string;
    remarks?: string;
  }
) {
  if (!paymentData.paymentProofKey.trim()) {
    throw new Error("Payment proof screenshot upload is mandatory to post an expense payment.");
  }

  const result = await db.$transaction(async (tx) => {
    const request = await tx.chaExpenseRequest.findUniqueOrThrow({
      where: { id: requestId },
    });

    // Create payment entry
    const payment = await tx.chaExpensePayment.create({
      data: {
        requestId,
        amountPaid: new Prisma.Decimal(paymentData.amountPaid),
        paymentDate: paymentData.paymentDate,
        paymentMethod: paymentData.paymentMethod,
        transactionReference: paymentData.transactionReference,
        paymentProofKey: paymentData.paymentProofKey,
        remarks: paymentData.remarks,
        paidById: actorId,
      },
    });

    // Update status to Paid
    await tx.chaExpenseRequest.update({
      where: { id: requestId },
      data: { status: "PAID" },
    });

    await tx.chaExpenseStatusHistory.create({
      data: {
        requestId,
        status: "PAID",
        actionedById: actorId,
        remarks: `Payment posted. Amount: INR ${paymentData.amountPaid}. Ref: ${paymentData.transactionReference}`,
      },
    });

    return { payment, request };
  });

  await logChaAudit({
    orgId,
    jobId: result.request.jobId,
    entityType: "ChaExpenseRequest",
    entityId: requestId,
    event: "EXPENSE_PAID",
    actorId,
    newState: "PAID",
    remarks: `Paid INR ${paymentData.amountPaid} via ${paymentData.paymentMethod}. Ref: ${paymentData.transactionReference}`,
  });

  // Notify requester
  await createNotification({
    userId: result.request.requestedById,
    orgId,
    kind: "CHA_EXPENSE_PAID",
    title: `Payment Disbursed: Expense Request`,
    body: `Accounts has processed and paid INR ${paymentData.amountPaid} for your request. Proof uploaded. Acknowledge receipt.`,
    link: `/cha/jobs/${result.request.jobId}`,
    priority: "important",
  });

  return result.payment;
}

// Acknowledge expense receipt
export async function acknowledgeExpenseReceipt(
  actorId: string,
  orgId: string,
  requestId: string
) {
  const result = await db.$transaction(async (tx) => {
    const updated = await tx.chaExpenseRequest.update({
      where: { id: requestId },
      data: { status: "RECEIPT_ACKNOWLEDGED" },
    });

    await tx.chaExpenseStatusHistory.create({
      data: {
        requestId,
        status: "RECEIPT_ACKNOWLEDGED",
        actionedById: actorId,
        remarks: "Requester acknowledged receipt of payment",
      },
    });

    return updated;
  });

  await logChaAudit({
    orgId,
    jobId: result.jobId,
    entityType: "ChaExpenseRequest",
    entityId: requestId,
    event: "EXPENSE_RECEIPT_ACKNOWLEDGED",
    actorId,
    newState: "RECEIPT_ACKNOWLEDGED",
  });

  return result;
}

// Raise written query about payment details
export async function raisePaymentQuery(
  actorId: string,
  orgId: string,
  requestId: string,
  queryText: string
) {
  if (!queryText.trim()) {
    throw new Error("Written query text is required.");
  }

  const result = await db.$transaction(async (tx) => {
    // Create query
    const query = await tx.chaExpenseQuery.create({
      data: {
        requestId,
        authorId: actorId,
        queryText,
      },
    });

    // Set request status to QUERY_RAISED
    const request = await tx.chaExpenseRequest.update({
      where: { id: requestId },
      data: { status: "QUERY_RAISED" },
    });

    await tx.chaExpenseStatusHistory.create({
      data: {
        requestId,
        status: "QUERY_RAISED",
        actionedById: actorId,
        remarks: `Query raised: "${queryText}"`,
      },
    });

    return { query, request };
  });

  await logChaAudit({
    orgId,
    jobId: result.request.jobId,
    entityType: "ChaExpenseRequest",
    entityId: requestId,
    event: "EXPENSE_QUERY_RAISED",
    actorId,
    newState: "QUERY_RAISED",
    remarks: queryText,
  });

  // Notify Accounts members
  const accountsPeople = await db.userRole.findMany({
    where: { role: { orgId, permissions: { some: { permission: { key: "cha.expense.pay" } } } } },
    select: { userId: true },
  });

  for (const acc of accountsPeople) {
    await createNotification({
      userId: acc.userId,
      orgId,
      kind: "CHA_EXPENSE_SUBMITTED",
      title: `Payment Query Raised: Request Reference ${requestId}`,
      body: `Requester has raised a query: "${queryText}"`,
      link: `/cha/expenses`,
      priority: "important",
    });
  }

  return result.query;
}

// Resolve payment query
export async function resolvePaymentQuery(
  actorId: string,
  orgId: string,
  queryId: string,
  resolutionText: string
) {
  if (!resolutionText.trim()) {
    throw new Error("Resolution note is required.");
  }

  const result = await db.$transaction(async (tx) => {
    // Update query
    const query = await tx.chaExpenseQuery.update({
      where: { id: queryId },
      data: {
        resolved: true,
        resolutionText,
        resolvedById: actorId,
        resolvedAt: new Date(),
      },
    });

    // Set request back to PAID (requester must acknowledge resolution)
    const request = await tx.chaExpenseRequest.update({
      where: { id: query.requestId },
      data: { status: "PAID" },
    });

    await tx.chaExpenseStatusHistory.create({
      data: {
        requestId: query.requestId,
        status: "PAID",
        actionedById: actorId,
        remarks: `Query resolved: "${resolutionText}"`,
      },
    });

    return { query, request };
  });

  await logChaAudit({
    orgId,
    jobId: result.request.jobId,
    entityType: "ChaExpenseRequest",
    entityId: result.query.requestId,
    event: "EXPENSE_QUERY_RESOLVED",
    actorId,
    newState: "PAID",
    remarks: resolutionText,
  });

  // Notify requester
  await createNotification({
    userId: result.request.requestedById,
    orgId,
    kind: "CHA_EXPENSE_PAID",
    title: `Payment Query Resolved`,
    body: `Accounts has resolved your query: "${resolutionText}". Please acknowledge receipt.`,
    link: `/cha/jobs/${result.request.jobId}`,
    priority: "important",
  });

  return result.query;
}

// Fetch aggregate CHA expenses queue for Accounts users
export async function listAllExpenses(
  orgId: string,
  filters: {
    status?: string;
    search?: string;
    isUrgent?: boolean;
  }
) {
  const where: any = { orgId };

  if (filters.status) where.status = filters.status;
  if (filters.isUrgent !== undefined) where.isUrgent = filters.isUrgent;
  if (filters.search) {
    where.OR = [
      { job: { jobNumber: { contains: filters.search, mode: "insensitive" } } },
      { job: { customer: { name: { contains: filters.search, mode: "insensitive" } } } },
      { requestedBy: { name: { contains: filters.search, mode: "insensitive" } } },
    ];
  }

  return db.chaExpenseRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      job: { include: { customer: true } },
      requestedBy: { select: { id: true, name: true, email: true } },
      lines: true,
      payments: true,
      queries: true,
    },
  });
}

// Fetch all checklist approvals queue for a manager
export async function listManagerChecklistApprovals(
  userId: string,
  orgId: string
) {
  return db.chaChecklistApproval.findMany({
    where: {
      managerId: userId,
      decision: "PENDING",
      checklistImport: { job: { orgId } },
    },
    include: {
      checklistImport: {
        include: {
          job: { include: { customer: true, primaryOwner: true } },
          uploadedBy: { select: { name: true } },
        },
      },
    },
  });
}
