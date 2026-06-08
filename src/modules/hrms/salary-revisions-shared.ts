import { toDisplayTitleCase } from "@/lib/text-case";

type SalaryRevisionRow = Record<string, unknown>;

export type PayrollMeta = {
  employeeNumber?: string | null;
  monthlyGross?: number | null;
  latestSalaryRevision?: SalaryRevisionRow | null;
  salaryRevisions?: SalaryRevisionRow[] | null;
};

export type RevisionUserRow = {
  id: string;
  name: string;
  designation: string | null;
  active: boolean;
  department: { name: string } | null;
  employmentRecord: {
    joinDate: Date;
    ctc: number | null;
    priorExperienceYears: number | null;
    payrollMeta: unknown;
  } | null;
};

export type SalaryRevisionRecord = {
  id: string;
  status: "APPROVED" | "PENDING" | "REJECTED" | "UNKNOWN";
  statusLabel: string;
  effectiveFrom: string | null;
  effectiveLabel: string;
  payoutMonth: string | null;
  payoutLabel: string;
  grossAnnual: number | null;
  revisedGrossAnnual: number | null;
  ctcAnnual: number | null;
  revisedCtcAnnual: number | null;
  revisionPercent: number | null;
  basicMonthly: number | null;
  hraMonthly: number | null;
  conveyanceMonthly: number | null;
  transportMonthly: number | null;
  travellingMonthly: number | null;
  fixedAllowanceMonthly: number | null;
  stipendMonthly: number | null;
  effectiveSort: number;
};

export type SalaryRevisionSummary = {
  userId: string;
  employeeNumber: string;
  employeeName: string;
  designation: string | null;
  departmentName: string | null;
  active: boolean;
  joinDate: string | null;
  joinDateLabel: string;
  tenureLabel: string;
  employeeTypeLabel: string;
  currentGrossAnnual: number | null;
  currentGrossMonthly: number | null;
  currentCtcAnnual: number | null;
  revisions: SalaryRevisionRecord[];
  latestRevision: SalaryRevisionRecord | null;
};

export type SalaryRevisionStats = {
  totalRevisions: number;
  employees: number;
  approved: number;
  pending: number;
  rejected: number;
};

function asString(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

function asNumber(value: unknown) {
  const raw = asString(value).replace(/,/g, "");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value: unknown) {
  const raw = asString(value);
  if (!raw) return null;

  const yyyyMm = raw.match(/^(\d{4})-(\d{2})$/);
  if (yyyyMm) {
    const [, year, month] = yyyyMm;
    return new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  }

  const yyyyMmDd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyyMmDd) {
    const [, year, month, day] = yyyyMmDd;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const ddMmYyyy = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddMmYyyy) {
    const [, day, month, year] = ddMmYyyy;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toMonthLabel(value: unknown) {
  const parsed = parseDate(value);
  if (!parsed) return "-";
  return new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "UTC" }).format(parsed);
}

function toIsoDate(value: unknown) {
  const parsed = parseDate(value);
  return parsed ? parsed.toISOString() : null;
}

function normalizeStatus(value: unknown): SalaryRevisionRecord["status"] {
  const normalized = asString(value).toUpperCase();
  if (normalized === "APPROVED") return "APPROVED";
  if (normalized === "PENDING") return "PENDING";
  if (normalized === "REJECTED") return "REJECTED";
  return "UNKNOWN";
}

function calculatePercent(currentValue: number | null, revisedValue: number | null, explicitPercent: number | null) {
  if (explicitPercent != null) return explicitPercent;
  if (currentValue == null || revisedValue == null || currentValue === 0) return null;
  return Number((((revisedValue - currentValue) / currentValue) * 100).toFixed(2));
}

function annualToMonthly(value: number | null) {
  return value == null ? null : Math.round(value / 12);
}

function formatJoinDate(value: Date | null | undefined) {
  if (!value) return "-";
  return value.toLocaleDateString("en-IN");
}

export function formatINR(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "-";
  return `₹${Number(value).toLocaleString("en-IN")}`;
}

export function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "-";
  const rounded = Number(value.toFixed(2));
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

export function buildTenureLabel(joinDate: Date | null | undefined, now = new Date()) {
  if (!joinDate) return "-";
  const totalMonths = Math.max(
    0,
    (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth()),
  );
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  return `${years}y ${months}m`;
}

export function normalizeRevision(row: SalaryRevisionRow): SalaryRevisionRecord {
  const effectiveFrom = toIsoDate(row["Effective From"]);
  const payoutMonth = toIsoDate(row["Payout Month"]);
  const grossAnnual = asNumber(row["Gross Amount (per annum)"]);
  const revisedGrossAnnual = asNumber(row["Revised Gross Amount (per annum)"]);
  const ctcAnnual = asNumber(row["CTC (per annum)"]);
  const revisedCtcAnnual = asNumber(row["Revised CTC (per annum)"]);
  const explicitPercent = asNumber(row["Revision Percentage"]);
  const revisionPercent = calculatePercent(ctcAnnual ?? grossAnnual, revisedCtcAnnual ?? revisedGrossAnnual, explicitPercent);
  const effectiveSort = parseDate(row["Effective From"])?.getTime() ?? 0;
  const status = normalizeStatus(row["Status"]);

  return {
    id: [
      asString(row["Employee Number"]),
      effectiveFrom ?? "unknown",
      revisedCtcAnnual ?? "",
      revisedGrossAnnual ?? "",
    ].join(":"),
    status,
    statusLabel: status.charAt(0) + status.slice(1).toLowerCase(),
    effectiveFrom,
    effectiveLabel: toMonthLabel(row["Effective From"]),
    payoutMonth,
    payoutLabel: toMonthLabel(row["Payout Month"]),
    grossAnnual,
    revisedGrossAnnual,
    ctcAnnual,
    revisedCtcAnnual,
    revisionPercent,
    basicMonthly: asNumber(row["Basic"]),
    hraMonthly: asNumber(row["House Rent Allowance"]),
    conveyanceMonthly: asNumber(row["Conveyance Allowance"]),
    transportMonthly: asNumber(row["Transport Allowance"]),
    travellingMonthly: asNumber(row["Travelling Allowance"]),
    fixedAllowanceMonthly: asNumber(row["Fixed Allowance"]),
    stipendMonthly: asNumber(row["Stipend"]),
    effectiveSort,
  };
}

export function buildSalaryRevisionSummary(user: RevisionUserRow, now = new Date()): SalaryRevisionSummary | null {
  const payrollMeta = (user.employmentRecord?.payrollMeta ?? null) as PayrollMeta | null;
  const revisionsSource = Array.isArray(payrollMeta?.salaryRevisions) ? payrollMeta.salaryRevisions : [];
  const revisions = revisionsSource
    .map((row) => normalizeRevision(row))
    .sort((left, right) => right.effectiveSort - left.effectiveSort);

  if (revisions.length === 0 && !payrollMeta?.latestSalaryRevision) {
    return null;
  }

  const latestRevision = revisions[0] ?? normalizeRevision(payrollMeta?.latestSalaryRevision ?? {});
  const currentGrossAnnual =
    latestRevision.revisedGrossAnnual ??
    (payrollMeta?.monthlyGross != null ? payrollMeta.monthlyGross * 12 : null) ??
    latestRevision.grossAnnual ??
    null;
  const currentGrossMonthly =
    payrollMeta?.monthlyGross ??
    annualToMonthly(latestRevision.revisedGrossAnnual ?? latestRevision.grossAnnual ?? null);
  const currentCtcAnnual =
    latestRevision.revisedCtcAnnual ??
    user.employmentRecord?.ctc ??
    latestRevision.ctcAnnual ??
    null;
  const joinDate = user.employmentRecord?.joinDate ?? null;
  const priorExperienceYears = user.employmentRecord?.priorExperienceYears ?? 0;
  const designation = toDisplayTitleCase(user.designation);
  const departmentName = toDisplayTitleCase(user.department?.name);

  return {
    userId: user.id,
    employeeNumber: asString(payrollMeta?.employeeNumber) || "-",
    employeeName: user.name,
    designation: designation === "-" ? null : designation,
    departmentName: departmentName === "-" ? null : departmentName,
    active: user.active,
    joinDate: joinDate ? joinDate.toISOString() : null,
    joinDateLabel: formatJoinDate(joinDate),
    tenureLabel: buildTenureLabel(joinDate, now),
    employeeTypeLabel: (priorExperienceYears ?? 0) > 0 ? "Experienced" : "Fresher",
    currentGrossAnnual,
    currentGrossMonthly,
    currentCtcAnnual,
    revisions,
    latestRevision,
  };
}

export function computeSalaryRevisionStats(summaries: SalaryRevisionSummary[]): SalaryRevisionStats {
  const allRevisions = summaries.flatMap((summary) => summary.revisions);
  return {
    totalRevisions: allRevisions.length,
    employees: summaries.length,
    approved: allRevisions.filter((revision) => revision.status === "APPROVED").length,
    pending: allRevisions.filter((revision) => revision.status === "PENDING").length,
    rejected: allRevisions.filter((revision) => revision.status === "REJECTED").length,
  };
}
