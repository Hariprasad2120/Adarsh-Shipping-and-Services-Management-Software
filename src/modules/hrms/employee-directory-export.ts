import { rowsToDelimitedText, workbookBufferFromRows } from "@/lib/spreadsheet";

export type EmployeeDirectoryExportFormat = "xls" | "xlsx" | "csv" | "tsv";

type JsonObject = Record<string, unknown>;

export type EmployeeDirectoryExportUser = {
  active: boolean;
  branch: { name: string } | null;
  department: { name: string } | null;
  designation: string | null;
  division: { name: string } | null;
  email: string;
  employeeNumber: number | null;
  employeeInvitations: {
    consumedAt: Date | string | null;
    revokedAt: Date | string | null;
    expiresAt: Date | string;
    deliveryStatus: string;
  }[];
  employeeProfile: {
    data: unknown;
  } | null;
  employmentRecord: {
    ctc: number | null;
    exitDate: Date | string | null;
    joinDate: Date | string;
    payrollMeta: unknown;
  } | null;
  name: string;
  roles: { role: { name: string } }[];
};

const EXPORT_COLUMNS = [
  "Employee ID",
  "Name",
  "Email",
  "Date of Joining",
  "Roles",
  "Designation",
  "Department",
  "Division",
  "Location",
  "Employee Status",
  "Account Status",
  "Onboarding Status",
  "Gross / Year",
] as const;

function objectValue(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function nestedString(value: unknown, keys: string[]) {
  let current: unknown = value;

  for (const key of keys) {
    current = objectValue(current)?.[key];
  }

  return typeof current === "string" ? current.trim() : "";
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function spreadsheetSafe(value: string | number) {
  if (typeof value !== "string") return value;

  return /^(?:[\t\r\n]|[\s]*[=+\-@])/.test(value) ? `'${value}` : value;
}

function employeeNumberFor(user: EmployeeDirectoryExportUser) {
  return (
    user.employeeNumber?.toString() ||
    nestedString(user.employmentRecord?.payrollMeta, ["employeeNumber"])
  );
}

function employeeStatusFor(user: EmployeeDirectoryExportUser) {
  if (user.employmentRecord?.exitDate) return "Exited";

  return (
    nestedString(user.employmentRecord?.payrollMeta, [
      "rawSheets",
      "employee",
      "Employee Status",
    ]) || "Active"
  );
}

function accountStatusFor(user: EmployeeDirectoryExportUser) {
  if (user.active) return "Login Enabled";

  const invitation = user.employeeInvitations[0];
  if (!invitation) return "Login Disabled";
  if (invitation.deliveryStatus === "FAILED") return "Invite Delivery Failed";
  if (
    invitation.revokedAt ||
    (!invitation.consumedAt &&
      new Date(invitation.expiresAt).getTime() <= Date.now())
  ) {
    return "Invite Expired";
  }
  return "Invited";
}

export function buildEmployeeDirectoryExportRows(
  users: EmployeeDirectoryExportUser[],
) {
  return users.map((user) => {
    const data = objectValue(user.employeeProfile?.data);
    const row: Record<(typeof EXPORT_COLUMNS)[number], string | number> = {
      "Employee ID": employeeNumberFor(user),
      Name: user.name,
      Email: user.email,
      "Date of Joining": formatDate(user.employmentRecord?.joinDate),
      Roles: user.roles.map((entry) => entry.role.name).join(", "),
      Designation: user.designation ?? "",
      Department: user.department?.name ?? "",
      Division: user.division?.name ?? "",
      Location: user.branch?.name ?? "",
      "Employee Status": employeeStatusFor(user),
      "Account Status": accountStatusFor(user),
      "Onboarding Status":
        (typeof data?.onboardingStatus === "string"
          ? data.onboardingStatus.trim()
          : "") || "Not set",
      "Gross / Year": user.employmentRecord?.ctc ?? "",
    };

    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        spreadsheetSafe(value),
      ]),
    );
  });
}

export async function createEmployeeDirectoryExport(
  users: EmployeeDirectoryExportUser[],
  format: EmployeeDirectoryExportFormat,
) {
  const rows = buildEmployeeDirectoryExportRows(users);
  const widths = [14, 28, 34, 18, 22, 22, 26, 22, 18, 18, 18, 20, 16];

  if (format === "csv" || format === "tsv" || format === "xls") {
    const delimiter = format === "csv" ? "," : "\t";
    const text = rowsToDelimitedText(rows, EXPORT_COLUMNS, delimiter);

    return {
      body: Buffer.from(`\uFEFF${text}`, "utf8"),
      contentType:
        format === "csv"
          ? "text/csv; charset=utf-8"
          : format === "tsv"
            ? "text/tab-separated-values; charset=utf-8"
            : "application/vnd.ms-excel; charset=utf-8",
    };
  }

  return {
    body: await workbookBufferFromRows("Employee Profiles", EXPORT_COLUMNS, rows, widths),
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}
