import { describe, expect, it } from "vitest";
import {
  buildEmployeeDriveFolderName,
  canReadHrDocument,
  canUploadHrDocument,
  isHrDocumentCategory,
} from "@/modules/hrms/document-drive";

describe("HR document drive access policy", () => {
  const employee = { id: "employee-1", isHrAdmin: false };
  const manager = { id: "manager-1", isHrAdmin: false };
  const teamLead = { id: "tl-1", isHrAdmin: false };
  const hr = { id: "hr-1", isHrAdmin: true };
  const colleague = { id: "employee-2", isHrAdmin: false };

  it("keeps My Space private even from HR and reporting managers", () => {
    expect(
      canReadHrDocument({
        actor: employee,
        category: "MY_SPACE",
        ownerId: employee.id,
      }),
    ).toBe(true);
    expect(
      canReadHrDocument({
        actor: manager,
        category: "MY_SPACE",
        ownerId: employee.id,
        ownerManagerId: manager.id,
      }),
    ).toBe(false);
    expect(
      canReadHrDocument({
        actor: hr,
        category: "MY_SPACE",
        ownerId: employee.id,
      }),
    ).toBe(false);
  });

  it("allows only the employee, reporting managers, and HR to read Employee Shared files", () => {
    const access = (actor: typeof employee) =>
      canReadHrDocument({
        actor,
        category: "EMPLOYEE_SHARED",
        ownerId: employee.id,
        ownerManagerId: manager.id,
        ownerTlId: teamLead.id,
      });

    expect(access(employee)).toBe(true);
    expect(access(manager)).toBe(true);
    expect(access(teamLead)).toBe(true);
    expect(access(hr)).toBe(true);
    expect(access(colleague)).toBe(false);
  });

  it("makes Company Files readable organisation-wide", () => {
    expect(
      canReadHrDocument({
        actor: colleague,
        category: "COMPANY_FILES",
        ownerId: null,
      }),
    ).toBe(true);
  });

  it("allows only HR to upload Company Files", () => {
    expect(
      canUploadHrDocument({
        actor: hr,
        category: "COMPANY_FILES",
        ownerId: null,
      }),
    ).toBe(true);
    expect(
      canUploadHrDocument({
        actor: employee,
        category: "COMPANY_FILES",
        ownerId: null,
      }),
    ).toBe(false);
  });

  it("prevents reporting managers from uploading on an employee's behalf", () => {
    expect(
      canUploadHrDocument({
        actor: employee,
        category: "EMPLOYEE_SHARED",
        ownerId: employee.id,
      }),
    ).toBe(true);
    expect(
      canUploadHrDocument({
        actor: manager,
        category: "EMPLOYEE_SHARED",
        ownerId: employee.id,
      }),
    ).toBe(false);
    expect(
      canUploadHrDocument({
        actor: hr,
        category: "EMPLOYEE_SHARED",
        ownerId: employee.id,
      }),
    ).toBe(true);
  });
});

describe("HR document drive hierarchy", () => {
  it("names employee folders with the employee name and ID", () => {
    expect(
      buildEmployeeDriveFolderName({
        id: "user-fallback",
        name: "Anita / Operations",
        employeeNumber: 1042,
      }),
    ).toBe("Anita Operations - ID 1042");
  });

  it("accepts only managed document categories", () => {
    expect(isHrDocumentCategory("MY_SPACE")).toBe(true);
    expect(isHrDocumentCategory("COMPANY_FILES")).toBe(true);
    expect(isHrDocumentCategory("EMPLOYEE_SHARED")).toBe(true);
    expect(isHrDocumentCategory("personal")).toBe(false);
  });
});
