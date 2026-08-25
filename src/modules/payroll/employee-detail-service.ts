import { db } from "@/lib/db";
import { getSalaryRevisionSummaryForUser } from "@/modules/hrms/salary-revisions";

function asNumber(value: unknown) {
  if (value == null) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function maskSuffix(value: string | null | undefined, visibleDigits = 4) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length <= visibleDigits) return trimmed;
  return `${"*".repeat(Math.max(0, trimmed.length - visibleDigits))}${trimmed.slice(-visibleDigits)}`;
}

type PayrollBreakup = {
  employeePF?: number | null;
  employerPF?: number | null;
  esi?: number | null;
  esiEmployer?: number | null;
  professionalTax?: number | null;
  tax?: number | null;
};

type PayrollMeta = {
  paymentMode?: string | null;
  breakup?: PayrollBreakup | null;
};

// Phase 5: employee payroll profile — this is a payroll-side projection of
// the canonical HRMS User/EmploymentRecord. It never writes a duplicate
// employee record (docs/payroll/MONOLITH_PAYROLL_INTEGRATION_MAP.md, section 1).
export async function getPayrollEmployeeDetail(orgId: string, employeeId: string) {
  const employee = await db.user.findFirst({
    where: { id: employeeId, orgId },
    select: {
      id: true,
      name: true,
      email: true,
      personalPhone: true,
      employeeNumber: true,
      designation: true,
      active: true,
      dob: true,
      gender: true,
      pan: true,
      uan: true,
      aadhaar: true,
      bankName: true,
      bankAccount: true,
      ifsc: true,
      branch: { select: { name: true } },
      department: { select: { name: true } },
      employmentRecord: {
        select: {
          joinDate: true,
          exitDate: true,
          ctc: true,
          basic: true,
          hra: true,
          conveyance: true,
          transport: true,
          travelling: true,
          fixedAllowance: true,
          stipend: true,
          payrollMeta: true,
        },
      },
    },
  });

  if (!employee) return null;

  const payrollMeta = (employee.employmentRecord?.payrollMeta ?? {}) as PayrollMeta;
  const breakup = payrollMeta.breakup ?? {};

  const monthlyComponents = [
    { label: "Basic", monthly: asNumber(employee.employmentRecord?.basic) },
    { label: "House Rent Allowance", monthly: asNumber(employee.employmentRecord?.hra) },
    { label: "Conveyance Allowance", monthly: asNumber(employee.employmentRecord?.conveyance) },
    { label: "Transport Allowance", monthly: asNumber(employee.employmentRecord?.transport) },
    { label: "Travelling Allowance", monthly: asNumber(employee.employmentRecord?.travelling) },
    { label: "Fixed Allowance", monthly: asNumber(employee.employmentRecord?.fixedAllowance) },
    { label: "Stipend", monthly: asNumber(employee.employmentRecord?.stipend) },
  ].filter((component) => component.monthly > 0);

  const monthlyGross = monthlyComponents.reduce((sum, c) => sum + c.monthly, 0);
  const annualCtc = asNumber(employee.employmentRecord?.ctc) || monthlyGross * 12;

  const salaryRevision = await getSalaryRevisionSummaryForUser(employeeId);

  return {
    id: employee.id,
    employeeNumber: employee.employeeNumber == null ? "-" : String(employee.employeeNumber),
    name: employee.name,
    email: employee.email,
    personalPhone: employee.personalPhone,
    designation: employee.designation,
    departmentName: employee.department?.name ?? null,
    branchName: employee.branch?.name ?? null,
    active: employee.active,
    joinDate: employee.employmentRecord?.joinDate?.toISOString() ?? null,
    exitDate: employee.employmentRecord?.exitDate?.toISOString() ?? null,
    dob: employee.dob?.toISOString() ?? null,
    gender: employee.gender,
    pan: employee.pan,
    uan: employee.uan,
    aadhaarMasked: maskSuffix(employee.aadhaar),
    paymentMode: payrollMeta.paymentMode ?? null,
    bankName: employee.bankName,
    bankAccountMasked: maskSuffix(employee.bankAccount),
    ifsc: employee.ifsc,
    statutory: {
      epfEnabled: asNumber(breakup.employeePF) > 0,
      esiEnabled: asNumber(breakup.esi) > 0,
      professionalTaxEnabled: asNumber(breakup.professionalTax) > 0,
      tdsMonthly: asNumber(breakup.tax),
    },
    salary: {
      annualCtc,
      monthlyCtc: monthlyGross,
      components: monthlyComponents.map((c) => ({
        label: c.label,
        monthly: c.monthly,
        annual: c.monthly * 12,
      })),
    },
    salaryRevision,
  };
}

export type PayrollEmployeeDetail = NonNullable<
  Awaited<ReturnType<typeof getPayrollEmployeeDetail>>
>;
