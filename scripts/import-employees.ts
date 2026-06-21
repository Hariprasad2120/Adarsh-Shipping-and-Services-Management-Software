import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import { hash } from "bcryptjs";
import { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
} as ConstructorParameters<typeof PrismaClient>[0]);

const DEFAULT_PASSWORD = "password@123";
const OUTPUT_DIR = path.join(process.cwd(), "import-output");

type Row = Record<string, unknown>;

type EmployeeAggregate = {
  employeeNumber: string;
  employee: Row | null;
  salaryDetails: Row | null;
  salaryRevisions: Row[];
  statutory: Row | null;
};

function readSheet(workbook: XLSX.WorkBook, sheetName: string): Row[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Row>(sheet, { defval: null, raw: false });
}

function asString(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

function asNullableString(value: unknown) {
  const normalized = asString(value);
  return normalized ? normalized : null;
}

function asNumber(value: unknown) {
  const raw = asString(value).replace(/,/g, "");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function asBoolean(value: unknown) {
  const normalized = asString(value).toLowerCase();
  if (!normalized) return null;
  if (["yes", "enabled", "active", "true"].includes(normalized)) return true;
  if (["no", "disabled", "exited", "terminated", "false"].includes(normalized)) return false;
  return null;
}

function parseDate(value: unknown) {
  const raw = asString(value);
  if (!raw) return null;

  const ddmmyyyy = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  }

  const yyyyMm = raw.match(/^(\d{4})-(\d{2})$/);
  if (yyyyMm) {
    const [, yyyy, mm] = yyyyMm;
    return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, 1));
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildFullName(row: Row) {
  const parts = [
    asString(row["First Name"]),
    asString(row["Middle Name"]),
    asString(row["Last Name"]),
  ].filter(Boolean);
  return titleCase(parts.join(" "));
}

type NormalizedOrgAssignment = {
  departmentName: string;
  divisionName: string | null;
};

function normalizeOrganisationAssignment(rawDepartmentName: string): NormalizedOrgAssignment {
  const departmentName = rawDepartmentName.trim();

  const exactMappings = new Map<string, NormalizedOrgAssignment>([
    ["Accounts Payable", { departmentName: "Accounts", divisionName: "Payable" }],
    ["Accounts Receivable", { departmentName: "Accounts", divisionName: "Receivable" }],
    ["Custom Broker Documentation", { departmentName: "Custom broker", divisionName: "Documentation" }],
    ["Custom Broker Operations", { departmentName: "Custom broker", divisionName: "Operations" }],
    ["Customs Broker Delivery Order", { departmentName: "Custom broker", divisionName: "Delivery Order" }],
    ["Customer Support", { departmentName: "Freight Forwarding", divisionName: "Customer Support" }],
    ["Delivery Order Documentation", { departmentName: "Delivery Order", divisionName: "Documentation" }],
    ["Delivery Order Operations", { departmentName: "Delivery Order", divisionName: "Operations" }],
    ["Freight Forwarding Business Development", { departmentName: "Freight Forwarding", divisionName: "Business Development" }],
    ["Freight Forwarding Customer Support", { departmentName: "Freight Forwarding", divisionName: "Customer Support" }],
    ["Freight Forwarding Sales", { departmentName: "Freight Forwarding", divisionName: "Sales" }],
    ["Human Resource Operation", { departmentName: "Human Resource", divisionName: "Operation" }],
    ["Head of Accounts", { departmentName: "Accounts", divisionName: null }],
    ["Head of Custom Broker's", { departmentName: "Custom broker", divisionName: null }],
    ["Head of Freight Forwarding", { departmentName: "Freight Forwarding", divisionName: null }],
    ["Head of HR", { departmentName: "Human Resource", divisionName: null }],
  ]);

  return exactMappings.get(departmentName) ?? { departmentName, divisionName: null };
}

function makeCode(input: string, fallbackPrefix: string, usedCodes: Set<string>) {
  const base = input
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 20) || fallbackPrefix;

  let code = base;
  let index = 2;
  while (usedCodes.has(code)) {
    code = `${base.slice(0, Math.max(1, 20 - String(index).length))}${index}`;
    index += 1;
  }
  usedCodes.add(code);
  return code;
}

function latestRevision(revisions: Row[]) {
  return [...revisions].sort((a, b) => {
    const left = parseDate(a["Effective From"])?.getTime() ?? 0;
    const right = parseDate(b["Effective From"])?.getTime() ?? 0;
    return right - left;
  })[0] ?? null;
}

async function purgeUsersOutsideSource(orgId: string, allowedEmails: string[]) {
  const usersToDelete = await db.user.findMany({
    where: {
      orgId,
      isPlatformAdmin: false,
      email: { notIn: allowedEmails },
    },
    select: { id: true, name: true, email: true },
  });

  if (usersToDelete.length === 0) return [];

  const userIds = usersToDelete.map((user) => user.id);
  const appraisalReviewerIds = await db.appraisalReviewer.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const appraisalIds = await db.appraisal.findMany({
    where: { employeeId: { in: userIds } },
    select: { id: true },
  });

  await db.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: {
        OR: [
          { managerId: { in: userIds } },
          { tlId: { in: userIds } },
        ],
      },
      data: {
        managerId: null,
        tlId: null,
      },
    });

    await tx.notificationActivity.deleteMany({ where: { actorId: { in: userIds } } });
    await tx.notification.deleteMany({ where: { userId: { in: userIds } } });
    await tx.leaveRequest.deleteMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          { approverId: { in: userIds } },
        ],
      },
    });
    await tx.oTEntry.deleteMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          { approverId: { in: userIds } },
        ],
      },
    });
    await tx.attendancePunch.deleteMany({ where: { userId: { in: userIds } } });
    await tx.leaveBalance.deleteMany({ where: { userId: { in: userIds } } });
    await tx.managementReview.deleteMany({ where: { reviewerId: { in: userIds } } });
    await tx.hikeDecision.deleteMany({ where: { decidedById: { in: userIds } } });
    await tx.meetingMinute.deleteMany({ where: { authorId: { in: userIds } } });

    if (appraisalReviewerIds.length > 0) {
      await tx.reviewerRating.deleteMany({
        where: { reviewerId: { in: appraisalReviewerIds.map((reviewer) => reviewer.id) } },
      });
      await tx.appraisalReviewer.deleteMany({
        where: { id: { in: appraisalReviewerIds.map((reviewer) => reviewer.id) } },
      });
    }

    if (appraisalIds.length > 0) {
      await tx.appraisal.deleteMany({
        where: { id: { in: appraisalIds.map((appraisal) => appraisal.id) } },
      });
    }

    // Clean up CRM references to avoid foreign key violations on purge
    await tx.crmLeadReminder.deleteMany({ where: { userId: { in: userIds } } });
    await tx.crmExternalLeadSnapshot.deleteMany({ where: { assignedToUserId: { in: userIds } } });
    await tx.crmLeadSourceJustdialConfig.deleteMany({ where: { defaultOwnerId: { in: userIds } } });
    await tx.crmTimelineEvent.deleteMany({ where: { createdById: { in: userIds } } });
    await tx.crmAttachment.deleteMany({ where: { createdById: { in: userIds } } });
    await tx.crmNote.deleteMany({ where: { createdById: { in: userIds } } });
    await tx.crmProject.deleteMany({ where: { ownerId: { in: userIds } } });
    await tx.crmApprovalLog.deleteMany({ where: { actorId: { in: userIds } } });
    await tx.crmInvoice.deleteMany({ where: { OR: [{ ownerId: { in: userIds } }, { approvedById: { in: userIds } }] } });
    await tx.crmVendor.deleteMany({ where: { ownerId: { in: userIds } } });
    await tx.crmActivity.deleteMany({ where: { ownerId: { in: userIds } } });
    await tx.crmDeal.deleteMany({ where: { ownerId: { in: userIds } } });
    await tx.crmAccount.deleteMany({ where: { ownerId: { in: userIds } } });
    await tx.crmContact.deleteMany({ where: { ownerId: { in: userIds } } });
    await tx.crmLead.deleteMany({ where: { ownerId: { in: userIds } } });
    await tx.crmWorkTimeLog.deleteMany({ where: { userId: { in: userIds } } });

    await tx.document.deleteMany({ where: { userId: { in: userIds } } });
    await tx.employmentRecord.deleteMany({ where: { userId: { in: userIds } } });
    await tx.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await tx.user.deleteMany({ where: { id: { in: userIds } } });
  });

  return usersToDelete;
}

const MANUAL_MATCHES: Record<string, string> = {
  "admin@adarshshipping.in": "133",
  "amirthavarshini@adarshshipping.in": "130",
  "arun.kumar@adarshshipping.in": "128",
  "bala.m@adarshshipping.in": "162",
  "goswami.kolkata@adarshshipping.in": "106",
  "hariharan@adarshshipping.in": "174",
  "ravi.mumbai@adarshshipping.in": "125",
  "sathya.m@adarshshipping.in": "108",
  "shalini.k@adarshshipping.in": "160",
  "sriram@adarshshipping.in": "186",
  "sujatha.kolkata@adarshshipping.in": "105",
};

const normalizeName = (s: string) => String(s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

function matchLoginEmail(
  dashRow: Row,
  mailRows: Row[]
): string | null {
  const empId = String(dashRow['Employee ID']);
  
  // 1. Manual override
  for (const [mailEmail, manualId] of Object.entries(MANUAL_MATCHES)) {
    if (manualId === empId) {
      return mailEmail.toLowerCase();
    }
  }

  // 2. Email exact match
  const dashEmail = String(dashRow['Email address'] || "").trim().toLowerCase();
  const dashPersonal = String(dashRow['Personal Email Address'] || "").trim().toLowerCase();
  
  const emailMatch = mailRows.find(mr => {
    const mrEmail = String(mr['Email Address [Required]'] || "").trim().toLowerCase();
    return mrEmail === dashEmail || mrEmail === dashPersonal;
  });
  if (emailMatch) {
    return String(emailMatch['Email Address [Required]']).toLowerCase();
  }

  // 3. Name match
  const dashFull = normalizeName(String(dashRow['First Name'] || "") + " " + String(dashRow['Last Name'] || ""));
  const nameMatch = mailRows.find(mr => {
    const mrFirst = normalizeName(String(mr['First Name [Required]'] || ""));
    const mrLast = normalizeName(String(mr['Last Name [Required]'] || ""));
    const mrFull = normalizeName(String(mr['First Name [Required]'] || "") + " " + String(mr['Last Name [Required]'] || ""));
    
    return mrFull === dashFull ||
           (mrFirst === normalizeName(String(dashRow['First Name'] || "")) && mrLast === normalizeName(String(dashRow['Last Name'] || ""))) ||
           (mrFirst === normalizeName(String(dashRow['First Name'] || "")) && mrLast.startsWith(normalizeName(String(dashRow['Last Name'] || "")))) ||
           (normalizeName(String(dashRow['First Name'] || "")) === mrFirst && normalizeName(String(dashRow['Last Name'] || "")).startsWith(mrLast));
  });
  
  if (nameMatch) {
    return String(nameMatch['Email Address [Required]']).toLowerCase();
  }

  return null;
}

function getRoleForUser(email: string, departmentName: string, designation: string): string {
  const emailLower = email.toLowerCase();
  const deptLower = departmentName.toLowerCase();
  const desgLower = designation.toLowerCase();

  if (emailLower === "hr@adarshshipping.in") {
    return "Admin";
  }
  if (deptLower.includes("human resource") || desgLower.includes("hr")) {
    return "HR";
  }
  if (desgLower.includes("manager") || desgLower.includes("assistant manager")) {
    return "Manager";
  }
  if (desgLower.includes("team leader")) {
    return "TL";
  }
  if (desgLower.includes("management") || deptLower.includes("management") || deptLower.includes("directors") || desgLower.includes("consultant")) {
    return "Director";
  }
  return "Employee";
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const workbook = XLSX.readFile(path.join(process.cwd(), "docs/Employee_View_Sentence_Case.xlsx"));
  const employeeRows = readSheet(workbook, 'Employee Dasboard Info');
  const salaryRows = readSheet(workbook, 'Employee salary details');
  const revisionRows = readSheet(workbook, 'Salary Revision Details');
  const mailRows = readSheet(workbook, 'Official Mail ID for Logins');

  const byEmployeeNumber = new Map<string, EmployeeAggregate>();

  function touch(employeeNumber: string) {
    const existing = byEmployeeNumber.get(employeeNumber);
    if (existing) return existing;
    const created: EmployeeAggregate = {
      employeeNumber,
      employee: null,
      salaryDetails: null,
      salaryRevisions: [],
      statutory: null,
    };
    byEmployeeNumber.set(employeeNumber, created);
    return created;
  }

  for (const row of employeeRows) {
    const employeeNumber = asString(row["Employee ID"]);
    if (!employeeNumber) continue;
    touch(employeeNumber).employee = row;
  }

  for (const row of salaryRows) {
    const employeeNumber = asString(row["Employee Number"]);
    if (!employeeNumber) continue;
    touch(employeeNumber).salaryDetails = row;
  }

  for (const row of revisionRows) {
    const employeeNumber = asString(row["Employee Number"]);
    if (!employeeNumber) continue;
    touch(employeeNumber).salaryRevisions.push(row);
  }

  // Work emails map for only active users
  const activeAggregates = [...byEmployeeNumber.values()].filter(aggregate => {
    if (!aggregate.employee) return false;
    const status = asString(aggregate.employee["Employee Status"]).toLowerCase();
    return status === "active";
  });

  const workEmails = activeAggregates
    .map((aggregate) => {
      const emailMatch = matchLoginEmail(aggregate.employee!, mailRows);
      const email = (emailMatch || asString(aggregate.employee!["Email address"]) || asString(aggregate.employee!["Personal Email Address"])).toLowerCase().trim();
      return email;
    })
    .filter(Boolean);

  // Add the default HR Administrator email to make sure they aren't deleted
  if (!workEmails.includes("hr@adarshshipping.in")) {
    workEmails.push("hr@adarshshipping.in");
  }

  const org = await db.organisation.findFirstOrThrow();
  const employeeRole = await db.role.findFirstOrThrow({
    where: { orgId: org.id, name: "Employee" },
  });
  const deletedUsers = await purgeUsersOutsideSource(org.id, workEmails);

  const usedDepartmentCodes = new Set<string>();
  const usedBranchCodes = new Set<string>();
  const existingDivisions = await db.division.findMany({ where: { orgId: org.id } });

  const existingDepartments = await db.department.findMany({ where: { orgId: org.id } });
  const existingBranches = await db.branch.findMany({ where: { orgId: org.id } });

  for (const department of existingDepartments) usedDepartmentCodes.add(department.code);
  for (const branch of existingBranches) usedBranchCodes.add(branch.code);

  const departmentByName = new Map(
    existingDepartments.map((department) => [department.name.toLowerCase(), department]),
  );
  const divisionByDepartmentAndName = new Map(
    existingDivisions.map((division) => [`${division.departmentId}:${division.name.toLowerCase()}`, division]),
  );
  const branchByName = new Map(
    existingBranches.map((branch) => [branch.name.toLowerCase(), branch]),
  );

  const credentials: Array<{ employeeNumber: string; name: string; email: string; password: string }> = [];
  const skipped: Array<{ employeeNumber: string; reason: string }> = [];
  const userMap = new Map<string, string>();

  for (const aggregate of byEmployeeNumber.values()) {
    if (!aggregate.employee) {
      skipped.push({ employeeNumber: aggregate.employeeNumber, reason: "Missing dashboard row" });
      continue;
    }

    const employeeRow = aggregate.employee;
    const status = asString(employeeRow["Employee Status"]).toLowerCase();
    if (status !== "active") {
      skipped.push({ employeeNumber: aggregate.employeeNumber, reason: "Not an active employee" });
      continue;
    }

    const emailMatch = matchLoginEmail(employeeRow, mailRows);
    const email = (emailMatch || asString(employeeRow["Email address"]) || asString(aggregate.employee!["Personal Email Address"])).toLowerCase().trim();
    if (!email) {
      skipped.push({ employeeNumber: aggregate.employeeNumber, reason: "Missing email address" });
      continue;
    }

    const normalizedOrg = normalizeOrganisationAssignment(asString(employeeRow["Department"]));
    const departmentName = normalizedOrg.departmentName;
    const branchName = asString(employeeRow["Location Name"] || employeeRow["Worklocation Name"]);

    let department = departmentName ? departmentByName.get(departmentName.toLowerCase()) ?? null : null;
    if (!department && departmentName) {
      department = await db.department.create({
        data: {
          orgId: org.id,
          name: departmentName,
          code: makeCode(departmentName, "DEPT", usedDepartmentCodes),
        },
      });
      departmentByName.set(departmentName.toLowerCase(), department);
    }

    let division = department && normalizedOrg.divisionName
      ? divisionByDepartmentAndName.get(`${department.id}:${normalizedOrg.divisionName.toLowerCase()}`) ?? null
      : null;

    if (!division && department && normalizedOrg.divisionName) {
      division = await db.division.create({
        data: {
          orgId: org.id,
          departmentId: department.id,
          name: normalizedOrg.divisionName,
        },
      });
      divisionByDepartmentAndName.set(`${department.id}:${normalizedOrg.divisionName.toLowerCase()}`, division);
    }

    let branch = branchName ? branchByName.get(branchName.toLowerCase()) ?? null : null;
    if (!branch && branchName) {
      branch = await db.branch.create({
        data: {
          orgId: org.id,
          name: branchName,
          code: makeCode(branchName, "BRANCH", usedBranchCodes),
        },
      });
      branchByName.set(branchName.toLowerCase(), branch);
    }

    const revision = latestRevision(aggregate.salaryRevisions);
    const ctc =
      asNumber(revision?.["Revised CTC (per annum)"]) ??
      asNumber(aggregate.salaryDetails?.["CTC Per Annum"]);

    const monthlyGross =
      asNumber(revision?.["Revised Gross Amount (per annum)"]) != null
        ? Math.round((asNumber(revision?.["Revised Gross Amount (per annum)"]) ?? 0) / 12)
        : asNumber(aggregate.salaryDetails?.["Gross Amount (per annum)_1"]) != null
          ? Math.round((asNumber(aggregate.salaryDetails?.["Gross Amount (per annum)_1"]) ?? 0) / 12)
          : null;

    const active = (asString(employeeRow["Employee Status"]).toLowerCase() !== "exited");
    const name = buildFullName(employeeRow) || asString(aggregate.salaryDetails?.["Employee Name"]) || email;
    const joinDate = parseDate(employeeRow["Date of Joining"]) ?? new Date();
    const exitDate = parseDate(employeeRow["Last Working Day"]);
    const designation = asNullableString(employeeRow["Designation"]);

    const payrollMeta = {
      employeeNumber: aggregate.employeeNumber,
      source: "excel-import-2026-06-06",
      monthlyGross,
      importedAt: new Date().toISOString(),
      bankDetails: {
        holderName: asNullableString(employeeRow["Bank Holder Name"]),
        bankName: asNullableString(employeeRow["Bank Name"]),
        accountNumber: asNullableString(employeeRow["Account Number"]),
        ifscCode: asNullableString(employeeRow["IFSC Code"]),
        accountType: asNullableString(employeeRow["Account Type"]),
        paymentMode: asNullableString(employeeRow["Payment Mode"]),
        stateCode: asNullableString(employeeRow["Worklocation StateCode"]),
      },
      personalDetails: {
        gender: asNullableString(employeeRow["Gender"]),
        personalEmail: asNullableString(employeeRow["Personal Email"]),
        fatherName: asNullableString(employeeRow["Father Name"]),
        mobileNumber: asNullableString(employeeRow["Mobile Number"]),
        dateOfBirth: parseDate(employeeRow["Date of Birth"])?.toISOString() ?? null,
        panNumber: asNullableString(employeeRow["PAN Number"]),
        differentlyAbledType: asNullableString(employeeRow["Differently Abled Type"]),
      },
      workLocation: {
        name: asNullableString(employeeRow["Worklocation Name"]),
        addressLine1: asNullableString(employeeRow["Worklocation AddressLine1"]),
        addressLine2: asNullableString(employeeRow["Worklocation AddressLine2"]),
        city: asNullableString(employeeRow["Worklocation City"]),
        stateCode: asNullableString(employeeRow["Worklocation StateCode"]),
        country: asNullableString(employeeRow["Worklocation Country"]),
        postalCode: asNullableString(employeeRow["Worklocation PostalCode"]),
      },
      personalAddress: {
        addressLine1: asNullableString(employeeRow["Personal AddressLine1"]),
        addressLine2: asNullableString(employeeRow["Personal AddressLine2"]),
        city: asNullableString(employeeRow["Personal City"]),
        stateCode: asNullableString(employeeRow["Personal StateCode"]),
        postalCode: asNullableString(employeeRow["Personal PostalCode"]),
        country: asNullableString(employeeRow["Personal Country"]),
      },
      salaryDetails: aggregate.salaryDetails,
      latestSalaryRevision: revision,
      salaryRevisions: aggregate.salaryRevisions,
      statutory: aggregate.statutory
        ? {
          ...aggregate.statutory,
          parsed: {
            pfEligible: asBoolean(aggregate.statutory["Is Eligible For PF"]),
            epsEligible: asBoolean(aggregate.statutory["Is Eligible For EPS"]),
            esiEligible: asBoolean(aggregate.statutory["Is Eligible For ESI"]),
            professionalTaxEligible: asBoolean(aggregate.statutory["Is Eligible for Professional Tax"]),
            lwfEligible: asBoolean(aggregate.statutory["Is Eligible For LWF"]),
            fullIncomeTaxExemption: asBoolean(aggregate.statutory["Is Eligible For Full Income Tax Exemption"]),
            uanNumber: asNullableString(aggregate.statutory["UAN Number"]),
            esiNumber: asNullableString(aggregate.statutory["ESI Number"]),
          },
        }
        : null,
      rawSheets: {
        employee: aggregate.employee,
        salaryDetails: aggregate.salaryDetails,
        salaryRevisions: aggregate.salaryRevisions,
        statutory: aggregate.statutory,
      },
    } as unknown as Prisma.InputJsonValue;

    const existingUser = await db.user.findUnique({
      where: { email },
      include: { roles: true, employmentRecord: true },
    });

    const createdPasswordHash = !existingUser ? await hash(DEFAULT_PASSWORD, 12) : null;

    const user = existingUser
      ? await db.user.update({
        where: { email },
        data: {
          orgId: existingUser.orgId ?? org.id,
          email,
          name,
          employeeNumber: parseInt(aggregate.employeeNumber, 10),
          designation,
          branchId: branch?.id ?? null,
          departmentId: department?.id ?? null,
          divisionId: division?.id ?? null,
          active,
        },
      })
      : await db.user.create({
        data: {
          orgId: org.id,
          email,
          name,
          employeeNumber: parseInt(aggregate.employeeNumber, 10),
          passwordHash: createdPasswordHash!,
          designation,
          branchId: branch?.id ?? null,
          departmentId: department?.id ?? null,
          divisionId: division?.id ?? null,
          active,
        },
      });

    userMap.set(aggregate.employeeNumber, user.id);
    userMap.set(email, user.id);

    const mappedRoleName = getRoleForUser(email, departmentName || "", designation || "");
    const userRoleObj = await db.role.findFirstOrThrow({ where: { orgId: org.id, name: mappedRoleName } });
    await db.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: userRoleObj.id } },
      update: {},
      create: { userId: user.id, roleId: userRoleObj.id },
    });

    const basic = asNumber(revision?.["Basic"]) ?? asNumber(aggregate.salaryDetails?.["Basic"]) ?? 0;
    const hra = asNumber(revision?.["House Rent Allowance"]) ?? asNumber(aggregate.salaryDetails?.["House Rent Allowance"]) ?? 0;
    const conveyance = asNumber(revision?.["Conveyance Allowance"]) ?? asNumber(aggregate.salaryDetails?.["Conveyance Allowance"]) ?? 0;
    const transport = asNumber(revision?.["Transport Allowance"]) ?? asNumber(aggregate.salaryDetails?.["Transport Allowance"]) ?? 0;
    const travelling = asNumber(revision?.["Travelling Allowance"]) ?? asNumber(aggregate.salaryDetails?.["Travelling Allowance"]) ?? 0;
    const fixedAllowance = asNumber(revision?.["Fixed Allowance"]) ?? asNumber(aggregate.salaryDetails?.["Fixed Allowance"]) ?? 0;
    const stipend = asNumber(revision?.["Stipend"]) ?? asNumber(aggregate.salaryDetails?.["Stipend"]) ?? 0;

    await db.employmentRecord.upsert({
      where: { userId: user.id },
      update: {
        joinDate,
        exitDate,
        ctc,
        basic,
        hra,
        conveyance,
        transport,
        travelling,
        fixedAllowance,
        stipend,
        payrollMeta,
      },
      create: {
        userId: user.id,
        joinDate,
        exitDate,
        ctc,
        priorExperienceYears: 0,
        basic,
        hra,
        conveyance,
        transport,
        travelling,
        fixedAllowance,
        stipend,
        payrollMeta,
      },
    });

    credentials.push({
      employeeNumber: aggregate.employeeNumber,
      name,
      email,
      password: existingUser ? "" : DEFAULT_PASSWORD,
    });
  }

  // Set Manager relationships (Second pass)
  for (const aggregate of activeAggregates) {
    const employeeRow = aggregate.employee!;
    const mgrStr = asString(employeeRow["Reporting Manager"]);
    if (mgrStr) {
      const match = mgrStr.match(/\b(\d+)$/);
      const managerEmpNum = match ? match[1] : null;
      if (managerEmpNum) {
        const userId = userMap.get(aggregate.employeeNumber);
        const managerId = userMap.get(managerEmpNum);
        if (userId && managerId) {
          await db.user.update({
            where: { id: userId },
            data: { managerId },
          });
        }
      }
    }
  }

  const sortedCredentials = credentials.sort((a, b) => a.name.localeCompare(b.name));
  const credentialsCsv = [
    "employeeNumber,name,email,password",
    ...sortedCredentials.map((row) =>
      [row.employeeNumber, row.name, row.email, row.password]
        .map((value) => `"${String(value).replace(/"/g, "\"\"")}"`)
        .join(","),
    ),
  ].join("\n");

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "employee-login-credentials.csv"),
    credentialsCsv,
    "utf8",
  );
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "employee-import-summary.json"),
    JSON.stringify({
      org: { id: org.id, name: org.name },
      importedCount: sortedCredentials.length,
      deletedCount: deletedUsers.length,
      deletedUsers,
      skippedCount: skipped.length,
      skipped,
      credentials: sortedCredentials,
    }, null, 2),
    "utf8",
  );

  console.log(JSON.stringify({
    org: { id: org.id, name: org.name },
    importedCount: sortedCredentials.length,
    deletedCount: deletedUsers.length,
    deletedUsers,
    skippedCount: skipped.length,
    skipped,
    credentials: sortedCredentials,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
