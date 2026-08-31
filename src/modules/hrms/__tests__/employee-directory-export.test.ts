import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import {
  buildEmployeeDirectoryExportRows,
  createEmployeeDirectoryExport,
  type EmployeeDirectoryExportUser,
} from "../employee-directory-export";

const employee: EmployeeDirectoryExportUser = {
  active: true,
  branch: { name: "Chennai" },
  department: { name: "Operations" },
  designation: "Executive",
  division: { name: "Customs" },
  email: "sham@example.com",
  employeeNumber: 193,
  employeeInvitations: [],
  employeeProfile: {
    data: { onboardingStatus: "In progress" },
  },
  employmentRecord: {
    ctc: 720000,
    exitDate: null,
    joinDate: "2026-06-16T00:00:00.000Z",
    payrollMeta: null,
  },
  name: "Sham Christo C",
  roles: [{ role: { name: "Employee" } }],
};

describe("employee directory export", () => {
  it("maps the filtered directory fields into export rows", () => {
    expect(buildEmployeeDirectoryExportRows([employee])).toEqual([
      {
        "Employee ID": "193",
        Name: "Sham Christo C",
        Email: "sham@example.com",
        "Date of Joining": "16 Jun 2026",
        Roles: "Employee",
        Designation: "Executive",
        Department: "Operations",
        Division: "Customs",
        Location: "Chennai",
        "Employee Status": "Active",
        "Account Status": "Login Enabled",
        "Onboarding Status": "In progress",
        "Gross / Year": 720000,
      },
    ]);
  });

  it("protects spreadsheet exports from formula injection", () => {
    const rows = buildEmployeeDirectoryExportRows([
      { ...employee, name: "=HYPERLINK(\"https://invalid\")" },
    ]);

    expect(rows[0]?.Name).toBe("'=HYPERLINK(\"https://invalid\")");
  });

  it("labels pending and failed invitations in employee exports", () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    const invited = buildEmployeeDirectoryExportRows([
      {
        ...employee,
        active: false,
        employeeInvitations: [
          {
            consumedAt: null,
            revokedAt: null,
            expiresAt,
            deliveryStatus: "SENT",
          },
        ],
      },
    ]);
    const failed = buildEmployeeDirectoryExportRows([
      {
        ...employee,
        active: false,
        employeeInvitations: [
          {
            consumedAt: null,
            revokedAt: null,
            expiresAt,
            deliveryStatus: "FAILED",
          },
        ],
      },
    ]);

    expect(invited[0]?.["Account Status"]).toBe("Invited");
    expect(failed[0]?.["Account Status"]).toBe("Invite Delivery Failed");
  });

  it.each(["xlsx", "xls"] as const)(
    "creates a readable %s export",
    async (format) => {
      const file = await createEmployeeDirectoryExport([employee], format);

      if (format === "xls") {
        const content = file.body.toString("utf8");
        expect(content).toContain("Employee ID\tName");
        expect(content).toContain("193\tSham Christo C");
        return;
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.body);
      const worksheet = workbook.getWorksheet("Employee Profiles");
      const rows = worksheet?.getSheetValues().slice(2) ?? [];

      expect(rows).toHaveLength(1);
      expect((rows[0] as unknown[])[1]).toBe("193");
      expect((rows[0] as unknown[])[2]).toBe("Sham Christo C");
    },
  );

  it.each([
    ["csv", ","],
    ["tsv", "\t"],
  ] as const)("creates a UTF-8 %s file", async (format, separator) => {
    const file = await createEmployeeDirectoryExport([employee], format);
    const content = file.body.toString("utf8");

    expect(content.startsWith("\uFEFF")).toBe(true);
    expect(content).toContain(`Employee ID${separator}Name`);
    expect(content).toContain("Sham Christo C");
  });
});
