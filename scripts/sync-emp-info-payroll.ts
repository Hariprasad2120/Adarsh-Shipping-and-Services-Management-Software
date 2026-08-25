import "dotenv/config";
import path from "node:path";
import XLSX from "xlsx";
import { hash } from "bcryptjs";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const EMP_INFO_DIR =
  process.env.EMP_INFO_DIR ?? "C:\\Users\\SilverCloud\\Downloads\\EMP info";
const DEFAULT_PASSWORD = process.env.EMP_INFO_DEFAULT_PASSWORD ?? "password@123";
const ORG_SLUG = process.env.EMP_INFO_ORG_SLUG ?? "adarsh-shipping";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
} as ConstructorParameters<typeof PrismaClient>[0]);

type Row = Record<string, unknown>;

type EmployeeAggregate = {
  employeeNumber: string;
  basic: Row | null;
  employeeView: Row | null;
  salary: Row | null;
  statutory: Row | null;
  payment: Row | null;
};

type NormalizedOrgAssignment = {
  departmentName: string;
  divisionName: string | null;
};

function readRows(fileName: string, sheetName?: string) {
  const workbook = XLSX.readFile(path.join(EMP_INFO_DIR, fileName));
  const targetSheet = sheetName ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[targetSheet];
  if (!sheet) {
    throw new Error(`Sheet '${targetSheet}' not found in ${fileName}`);
  }
  return XLSX.utils.sheet_to_json<Row>(sheet, { defval: null, raw: false });
}

function asString(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

function asNullableString(value: unknown) {
  const normalized = asString(value);
  return normalized.length > 0 ? normalized : null;
}

function asNumber(value: unknown) {
  const normalized = asString(value).replace(/,/g, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function asBoolean(value: unknown) {
  const normalized = asString(value).toLowerCase();
  if (!normalized) return null;
  if (["yes", "enabled", "active", "true"].includes(normalized)) return true;
  if (["no", "disabled", "exited", "terminated", "false"].includes(normalized)) return false;
  return null;
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseDate(value: unknown) {
  const raw = asString(value);
  if (!raw) return null;

  const ddmmyyyy = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  }

  const ddMonYyyy = raw.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
  if (ddMonYyyy) {
    const parsed = new Date(`${ddMonYyyy[1]} ${ddMonYyyy[2]} ${ddMonYyyy[3]} UTC`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildFullName(firstName: string, middleName: string, lastName: string) {
  return titleCase([firstName, middleName, lastName].filter(Boolean).join(" "));
}

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
  const base =
    input
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

function paymentModeValue(paymentRow: Row | null, viewRow: Row | null) {
  return (
    asNullableString(paymentRow?.["Payment Mode"]) ??
    asNullableString(viewRow?.["Payment Mode"]) ??
    null
  );
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function monthlyFromAnnual(value: number | null) {
  return value != null ? roundMoney(value / 12) : null;
}

async function main() {
  const basicRows = readRows("Employee_Basic_Details.xlsx", "Employee Basic and Personal Det");
  const salaryRows = readRows("Employee_Salary_Details.xlsx", "Employee Salary Details");
  const statutoryRows = readRows(
    "Employee_Statutory_Information.xlsx",
    "Employee Statutory Details",
  );
  const paymentRows = readRows("Salary_Payment_Information.xlsx", "Employee Payment Info");
  const viewRows = readRows("Employee View.xlsx", "Sheet - 1");

  const byEmployeeNumber = new Map<string, EmployeeAggregate>();
  function touch(employeeNumber: string) {
    const existing = byEmployeeNumber.get(employeeNumber);
    if (existing) return existing;
    const created: EmployeeAggregate = {
      employeeNumber,
      basic: null,
      employeeView: null,
      salary: null,
      statutory: null,
      payment: null,
    };
    byEmployeeNumber.set(employeeNumber, created);
    return created;
  }

  for (const row of basicRows) {
    const employeeNumber = asString(row["Employee Number"]);
    if (!employeeNumber) continue;
    touch(employeeNumber).basic = row;
  }
  for (const row of salaryRows) {
    const employeeNumber = asString(row["Employee Number"]);
    if (!employeeNumber) continue;
    touch(employeeNumber).salary = row;
  }
  for (const row of statutoryRows) {
    const employeeNumber = asString(row["Employee Number"]);
    if (!employeeNumber) continue;
    touch(employeeNumber).statutory = row;
  }
  for (const row of paymentRows) {
    const employeeNumber = asString(row["Employee Number"]);
    if (!employeeNumber) continue;
    touch(employeeNumber).payment = row;
  }
  for (const row of viewRows) {
    const employeeNumber = asString(row["Employee ID"]);
    if (!employeeNumber) continue;
    touch(employeeNumber).employeeView = row;
  }

  const org = await db.organisation.findFirstOrThrow({
    where: { slug: ORG_SLUG },
    select: { id: true, name: true },
  });
  const employeeRole = await db.role.findFirstOrThrow({
    where: { orgId: org.id, name: "Employee" },
    select: { id: true },
  });

  const existingDepartments = await db.department.findMany({ where: { orgId: org.id } });
  const existingBranches = await db.branch.findMany({ where: { orgId: org.id } });
  const existingDivisions = await db.division.findMany({ where: { orgId: org.id } });

  const usedDepartmentCodes = new Set(existingDepartments.map((department) => department.code));
  const usedBranchCodes = new Set(existingBranches.map((branch) => branch.code));
  const departmentByName = new Map(
    existingDepartments.map((department) => [department.name.toLowerCase(), department]),
  );
  const branchByName = new Map(
    existingBranches.map((branch) => [branch.name.toLowerCase(), branch]),
  );
  const divisionByDepartmentAndName = new Map(
    existingDivisions.map((division) => [
      `${division.departmentId}:${division.name.toLowerCase()}`,
      division,
    ]),
  );

  const userIdByEmployeeNumber = new Map<string, string>();
  const pendingManagerUpdates: Array<{ employeeNumber: string; managerEmployeeNumber: string }> = [];
  let createdCount = 0;
  let updatedCount = 0;
  let activatedCount = 0;
  let deactivatedCount = 0;
  const createdEmployees: string[] = [];

  for (const aggregate of byEmployeeNumber.values()) {
    const sourceRow = aggregate.basic ?? aggregate.employeeView;
    if (!sourceRow) continue;

    const workEmail = (
      asNullableString(aggregate.basic?.["Work Email"]) ??
      asNullableString(aggregate.employeeView?.["Email address"])
    )?.toLowerCase();
    if (!workEmail) continue;

    const employeeStatus =
      asString(aggregate.basic?.["Employee Status"] ?? aggregate.employeeView?.["Employee Status"])
        .toLowerCase();
    const active = employeeStatus === "active";

    const firstName = asString(
      aggregate.basic?.["First Name"] ?? aggregate.employeeView?.["First Name"],
    );
    const middleName = asString(aggregate.basic?.["Middle Name"]);
    const lastName = asString(
      aggregate.basic?.["Last Name"] ?? aggregate.employeeView?.["Last Name"],
    );
    const name = buildFullName(firstName, middleName, lastName) || workEmail;
    const designation = asNullableString(
      aggregate.basic?.["Designation"] ?? aggregate.employeeView?.["Designation"],
    );
    const departmentSource = asString(
      aggregate.basic?.["Department"] ?? aggregate.employeeView?.["Department"],
    );
    const branchSource = asString(
      aggregate.basic?.["Worklocation Name"] ?? aggregate.employeeView?.["Location Name"],
    );
    const joinDate =
      parseDate(
        aggregate.basic?.["Date of Joining"] ?? aggregate.employeeView?.["Date of Joining"],
      ) ?? new Date();
    const exitDate =
      parseDate(
        aggregate.basic?.["Last Working Day"] ?? aggregate.employeeView?.["Date of Exit"],
      ) ?? null;

    const normalizedOrg = normalizeOrganisationAssignment(departmentSource);
    let department =
      normalizedOrg.departmentName.length > 0
        ? departmentByName.get(normalizedOrg.departmentName.toLowerCase()) ?? null
        : null;
    if (!department && normalizedOrg.departmentName) {
      department = await db.department.create({
        data: {
          orgId: org.id,
          name: normalizedOrg.departmentName,
          code: makeCode(normalizedOrg.departmentName, "DEPT", usedDepartmentCodes),
        },
      });
      departmentByName.set(normalizedOrg.departmentName.toLowerCase(), department);
    }

    let division =
      department && normalizedOrg.divisionName
        ? divisionByDepartmentAndName.get(
            `${department.id}:${normalizedOrg.divisionName.toLowerCase()}`,
          ) ?? null
        : null;
    if (!division && department && normalizedOrg.divisionName) {
      division = await db.division.create({
        data: {
          orgId: org.id,
          departmentId: department.id,
          name: normalizedOrg.divisionName,
        },
      });
      divisionByDepartmentAndName.set(
        `${department.id}:${normalizedOrg.divisionName.toLowerCase()}`,
        division,
      );
    }

    let branch =
      branchSource.length > 0 ? branchByName.get(branchSource.toLowerCase()) ?? null : null;
    if (!branch && branchSource) {
      branch = await db.branch.create({
        data: {
          orgId: org.id,
          name: branchSource,
          code: makeCode(branchSource, "BRANCH", usedBranchCodes),
        },
      });
      branchByName.set(branchSource.toLowerCase(), branch);
    }

    const basic = asNumber(aggregate.salary?.["Basic"]) ?? 0;
    const hra = asNumber(aggregate.salary?.["House Rent Allowance"]) ?? 0;
    const conveyance = asNumber(aggregate.salary?.["Conveyance Allowance"]) ?? 0;
    const transport = asNumber(aggregate.salary?.["Transport Allowance"]) ?? 0;
    const travelling = asNumber(aggregate.salary?.["Travelling Allowance"]) ?? 0;
    const fixedAllowance = asNumber(aggregate.salary?.["Fixed Allowance"]) ?? 0;
    const stipend = asNumber(aggregate.salary?.["Stipend"]) ?? 0;
    const sourceGrossAnnual =
      asNumber(aggregate.salary?.["Gross Amount (per annum)"]) ??
      asNumber(aggregate.salary?.["CTC (per annum)"]);
    const componentGrossMonthly = roundMoney(
      basic + hra + conveyance + transport + travelling + fixedAllowance + stipend,
    );
    const monthlyGross =
      componentGrossMonthly > 0
        ? componentGrossMonthly
        : monthlyFromAnnual(sourceGrossAnnual);

    const pfEligible = asBoolean(aggregate.statutory?.["Is Eligible For PF"]);
    const employeePfPercent = asNumber(aggregate.statutory?.["Employee EPF Percent"]);
    const employerPfPercent = asNumber(aggregate.statutory?.["Employer EPF Percent"]);
    const employeeRestrictedBasicAmount =
      asNumber(aggregate.statutory?.["Employee Restricted Basic Amount"]);
    const employerRestrictedBasicAmount =
      asNumber(aggregate.statutory?.["Employer Restricted Basic Amount"]);
    const employeePF =
      pfEligible && employeePfPercent != null
        ? roundMoney(((employeeRestrictedBasicAmount ?? basic) * employeePfPercent) / 100)
        : 0;
    const employerPF =
      pfEligible && employerPfPercent != null
        ? roundMoney(((employerRestrictedBasicAmount ?? basic) * employerPfPercent) / 100)
        : 0;
    const esiEligible = asBoolean(aggregate.statutory?.["Is Eligible For ESI"]) === true;
    const esiEmployer =
      esiEligible && monthlyGross != null && monthlyGross <= 21000
        ? roundMoney(monthlyGross * 0.0325)
        : 0;
    const gratuity =
      basic > 0 ? roundMoney(basic * 0.0481) : 0;
    const derivedAnnualCtc =
      monthlyGross != null
        ? roundMoney((monthlyGross + employerPF + esiEmployer + gratuity) * 12)
        : null;

    const topLevelPaymentMode = paymentModeValue(aggregate.payment, aggregate.employeeView);
    const accountNumber =
      asNullableString(aggregate.payment?.["Account Number"]) ??
      asNullableString(aggregate.basic?.["Account Number"]) ??
      asNullableString(aggregate.employeeView?.["Account Number"]) ??
      null;
    const bankName =
      asNullableString(aggregate.payment?.["Bank Name"]) ??
      asNullableString(aggregate.basic?.["Bank Name"]) ??
      asNullableString(aggregate.employeeView?.["Bank Name"]) ??
      null;
    const ifsc =
      asNullableString(aggregate.payment?.["IFSC Code"]) ??
      asNullableString(aggregate.basic?.["IFSC Code"]) ??
      asNullableString(aggregate.employeeView?.["IFSC Code"]) ??
      null;
    const stateCode =
      asNullableString(aggregate.basic?.["Worklocation StateCode"]) ??
      asNullableString(aggregate.employeeView?.["State Code"]) ??
      null;

    const payrollMeta = {
      source: "emp-info-sync-2026-08-24",
      importedAt: new Date().toISOString(),
      employeeNumber: aggregate.employeeNumber,
      monthlyGross,
      paymentMode: topLevelPaymentMode,
      grossAnnual: monthlyGross != null ? roundMoney(monthlyGross * 12) : null,
      sourceAnnualLabelCtc:
        asNumber(aggregate.salary?.["CTC (per annum)"]) ??
        null,
      sourceAnnualGross:
        asNumber(aggregate.salary?.["Gross Amount (per annum)"]) ??
        null,
      annualCTC: derivedAnnualCtc,
      bankName,
      accountNumber,
      ifscCode: ifsc,
      stateCode,
      breakup: {
        employeePF,
        employerPF,
        esiEmployer,
        gratuity,
      },
      bankDetails: {
        paymentMode: topLevelPaymentMode,
        holderName:
          asNullableString(aggregate.payment?.["Bank Holder Name"]) ??
          asNullableString(aggregate.basic?.["Bank Holder Name"]) ??
          asNullableString(aggregate.employeeView?.["Account Holder Name as per passbook"]) ??
          null,
        bankName,
        accountNumber,
        ifscCode: ifsc,
        accountType:
          asNullableString(aggregate.payment?.["Account Type"]) ??
          asNullableString(aggregate.basic?.["Account Type"]) ??
          asNullableString(aggregate.employeeView?.["Account Type"]) ??
          null,
        stateCode,
      },
      personalDetails: {
        gender: asNullableString(aggregate.basic?.["Gender"] ?? aggregate.employeeView?.["Gender"]),
        personalEmail:
          asNullableString(aggregate.basic?.["Personal Email"]) ??
          asNullableString(aggregate.employeeView?.["Personal Email Address"]) ??
          null,
        fatherName:
          asNullableString(aggregate.basic?.["Father Name"]) ??
          asNullableString(aggregate.employeeView?.["Father Name"]) ??
          null,
        mobileNumber:
          asNullableString(aggregate.basic?.["Mobile Number"]) ??
          asNullableString(aggregate.employeeView?.["Personal Mobile Number"]) ??
          null,
        dateOfBirth:
          parseDate(
            aggregate.basic?.["Date of Birth"] ?? aggregate.employeeView?.["Date of Birth"],
          )?.toISOString() ?? null,
        panNumber:
          asNullableString(aggregate.basic?.["PAN Number"]) ??
          asNullableString(aggregate.employeeView?.["PAN"]) ??
          null,
        aadhaarNumber: asNullableString(aggregate.employeeView?.["Aadhaar"]) ?? null,
      },
      statutory:
        aggregate.statutory == null
          ? null
          : {
              ...aggregate.statutory,
              parsed: {
                pfEligible,
                epsEligible: asBoolean(aggregate.statutory["Is Eligible For EPS"]),
                esiEligible: asBoolean(aggregate.statutory["Is Eligible For ESI"]),
                professionalTaxEligible: asBoolean(
                  aggregate.statutory["Is Eligible for Professional Tax"],
                ),
                lwfEligible: asBoolean(aggregate.statutory["Is Eligible For LWF"]),
                uanNumber: asNullableString(aggregate.statutory["UAN Number"]),
                esiNumber: asNullableString(aggregate.statutory["ESI Number"]),
              },
            },
      rawSheets: {
        basic: aggregate.basic,
        employeeView: aggregate.employeeView,
        salary: aggregate.salary,
        statutory: aggregate.statutory,
        payment: aggregate.payment,
      },
    } satisfies Prisma.InputJsonValue;

    const employeeNumberInt = Number.parseInt(aggregate.employeeNumber, 10);
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { employeeNumber: Number.isFinite(employeeNumberInt) ? employeeNumberInt : undefined },
          { email: { equals: workEmail, mode: "insensitive" } },
        ],
      },
      include: {
        roles: true,
        employmentRecord: true,
      },
    });

    const userData = {
      orgId: org.id,
      email: workEmail,
      name,
      firstName: firstName || null,
      lastName: lastName || null,
      employeeNumber: Number.isFinite(employeeNumberInt) ? employeeNumberInt : null,
      designation,
      branchId: branch?.id ?? null,
      departmentId: department?.id ?? null,
      divisionId: division?.id ?? null,
      active,
      personalPhone:
        asNullableString(aggregate.basic?.["Mobile Number"]) ??
        asNullableString(aggregate.employeeView?.["Personal Mobile Number"]) ??
        null,
      aadhaar: asNullableString(aggregate.employeeView?.["Aadhaar"]) ?? null,
      pan:
        asNullableString(aggregate.basic?.["PAN Number"]) ??
        asNullableString(aggregate.employeeView?.["PAN"]) ??
        null,
      uan:
        asNullableString(aggregate.statutory?.["UAN Number"]) ??
        asNullableString(aggregate.employeeView?.["UAN"]) ??
        null,
      bankName,
      bankAccount: accountNumber,
      ifsc,
    };

    const user = existingUser
      ? await db.user.update({
          where: { id: existingUser.id },
          data: userData,
        })
      : await db.user.create({
          data: {
            ...userData,
            passwordHash: await hash(DEFAULT_PASSWORD, 12),
          },
        });

    if (existingUser) {
      updatedCount += 1;
      if (!existingUser.active && active) activatedCount += 1;
      if (existingUser.active && !active) deactivatedCount += 1;
    } else {
      createdCount += 1;
      createdEmployees.push(`${aggregate.employeeNumber}:${workEmail}`);
      await db.userRole.create({
        data: {
          userId: user.id,
          roleId: employeeRole.id,
        },
      });
    }

    userIdByEmployeeNumber.set(aggregate.employeeNumber, user.id);

    await db.employmentRecord.upsert({
      where: { userId: user.id },
      update: {
        joinDate,
        exitDate,
        ctc: derivedAnnualCtc,
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
        ctc: derivedAnnualCtc,
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

    const managerText = asString(aggregate.employeeView?.["Reporting Manager"]);
    const managerMatch = managerText.match(/\b(\d+)\s*$/);
    if (managerMatch) {
      pendingManagerUpdates.push({
        employeeNumber: aggregate.employeeNumber,
        managerEmployeeNumber: managerMatch[1],
      });
    }
  }

  for (const relation of pendingManagerUpdates) {
    const userId = userIdByEmployeeNumber.get(relation.employeeNumber);
    const managerId = userIdByEmployeeNumber.get(relation.managerEmployeeNumber);
    if (!userId || !managerId || userId === managerId) continue;
    await db.user.update({
      where: { id: userId },
      data: { managerId },
    });
  }

  console.log(
    JSON.stringify(
      {
        organisation: org,
        sourceEmployees: byEmployeeNumber.size,
        createdCount,
        updatedCount,
        activatedCount,
        deactivatedCount,
        createdEmployees,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
