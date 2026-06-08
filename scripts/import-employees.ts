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

const DEFAULT_PASSWORD = "password123";
const DATA_DIR = "C:/Users/SilverCloud/Documents/Data Excel";
const OUTPUT_DIR = path.join(process.cwd(), "import-output");

function firstExistingFile(...candidates: string[]) {
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(`Missing source file. Checked: ${candidates.join(", ")}`);
  }
  return found;
}

const FILES = {
  employees: firstExistingFile(
    path.join(DATA_DIR, "Employee_corrected_emails.xlsx"),
    path.join(DATA_DIR, "Employee.xls"),
  ),
  salaryDetails: path.join(DATA_DIR, "Employee_Salary_Details.xls"),
  salaryRevisions: path.join(DATA_DIR, "Salary_Revision.xls"),
  statutory: path.join(DATA_DIR, "Employee_Statutory_Information.xls"),
} as const;

type Row = Record<string, unknown>;

type EmployeeAggregate = {
  employeeNumber: string;
  employee: Row | null;
  salaryDetails: Row | null;
  salaryRevisions: Row[];
  statutory: Row | null;
};

function readSheet(filePath: string) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
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

    await tx.document.deleteMany({ where: { userId: { in: userIds } } });
    await tx.employmentRecord.deleteMany({ where: { userId: { in: userIds } } });
    await tx.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await tx.user.deleteMany({ where: { id: { in: userIds } } });
  });

  return usersToDelete;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const [employeeRows, salaryRows, revisionRows, statutoryRows] = [
    readSheet(FILES.employees),
    readSheet(FILES.salaryDetails),
    readSheet(FILES.salaryRevisions),
    readSheet(FILES.statutory),
  ];

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
    const employeeNumber = asString(row["Employee Number"]);
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

  for (const row of statutoryRows) {
    const employeeNumber = asString(row["Employee Number"]);
    if (!employeeNumber) continue;
    touch(employeeNumber).statutory = row;
  }

  const workEmails = [...byEmployeeNumber.values()]
    .map((aggregate) => asString(aggregate.employee?.["Work Email"]).toLowerCase())
    .filter(Boolean);

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

  for (const aggregate of byEmployeeNumber.values()) {
    if (!aggregate.employee) {
      skipped.push({ employeeNumber: aggregate.employeeNumber, reason: "Missing Employee.xls row" });
      continue;
    }

    const employeeRow = aggregate.employee;
    const email = asString(employeeRow["Work Email"]).toLowerCase();
    if (!email) {
      skipped.push({ employeeNumber: aggregate.employeeNumber, reason: "Missing work email" });
      continue;
    }

    const normalizedOrg = normalizeOrganisationAssignment(asString(employeeRow["Department"]));
    const departmentName = normalizedOrg.departmentName;
    const branchName = asString(employeeRow["Worklocation Name"]);

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
          designation: asNullableString(employeeRow["Designation"]),
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
          passwordHash: createdPasswordHash!,
          designation: asNullableString(employeeRow["Designation"]),
          branchId: branch?.id ?? null,
          departmentId: department?.id ?? null,
          divisionId: division?.id ?? null,
          active,
        },
      });

    if (!existingUser || existingUser.roles.length === 0) {
      await db.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: employeeRole.id } },
        update: {},
        create: { userId: user.id, roleId: employeeRole.id },
      });
    }

    await db.employmentRecord.upsert({
      where: { userId: user.id },
      update: {
        joinDate,
        exitDate,
        ctc,
        payrollMeta,
      },
      create: {
        userId: user.id,
        joinDate,
        exitDate,
        ctc,
        priorExperienceYears: 0,
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
