import { beforeEach, describe, expect, it, vi } from "vitest";

const { dbMock, notifyMock, calculateOtForPunchMock, fixedNow } = vi.hoisted(
  () => {
    const fixedNow = new Date("2026-07-29T12:00:00.000Z");
    const tx = {
      workReport: {
        create: vi.fn(),
        update: vi.fn(),
      },
      workReportApproval: {
        createMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        findFirst: vi.fn(),
      },
    };
    return {
      fixedNow,
      notifyMock: vi.fn(),
      calculateOtForPunchMock: vi.fn(),
      dbMock: {
        user: { findFirst: vi.fn() },
        workReportSettings: { upsert: vi.fn(), findUnique: vi.fn() },
        workReportField: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          deleteMany: vi.fn(),
        },
        workReport: { findMany: vi.fn() },
        workReportApproval: { findFirst: vi.fn() },
        $transaction: vi.fn(
          async (callback: (client: typeof tx) => Promise<unknown>) =>
            callback(tx),
        ),
        __tx: tx,
      },
    };
  },
);

vi.mock("@/lib/db", () => ({ db: dbMock }));
vi.mock("@/lib/notify", () => ({ notify: notifyMock }));
vi.mock("@/modules/notifications/service", () => ({
  notifyMany: vi.fn(),
  getUsersWithPermission: vi.fn(),
}));
vi.mock("@/lib/clock", () => ({ getNow: vi.fn(() => fixedNow) }));
vi.mock("@/lib/rbac", () => ({ loadUserPermissions: vi.fn() }));
vi.mock("@/lib/ot", () => ({
  appendAttendancePunchEvent: vi.fn(),
  calculateOtForPunch: calculateOtForPunchMock,
}));

import {
  createWorkReport,
  submitWorkReportApproval,
} from "@/modules/hrms/service";

const reportDate = new Date("2026-07-29T00:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  dbMock.workReportField.findMany.mockResolvedValue([]);
  dbMock.__tx.workReport.create.mockResolvedValue({
    id: "report-1",
    date: reportDate,
    status: "PENDING",
  });
  dbMock.__tx.workReportApproval.createMany.mockResolvedValue({ count: 2 });
  calculateOtForPunchMock.mockResolvedValue(true);
  notifyMock.mockResolvedValue(undefined);
});

describe("work report workflow", () => {
  it("creates sequential primary and secondary approval levels and notifies level one", async () => {
    dbMock.user.findFirst.mockResolvedValue({
      id: "employee-1",
      name: "Employee One",
      managerId: "manager-1",
      tlId: "manager-2",
    });
    dbMock.workReportSettings.upsert.mockResolvedValue({
      approvalLevels: 2,
      requireApprovedReportForOt: true,
    });

    await createWorkReport("employee-1", "org-1", {
      date: reportDate,
      workedOn: "Office",
      items: [
        {
          id: "line-1",
          jobNoName: "JOB-001",
          description: "Completed document review.",
        },
        {
          id: "line-2",
          jobNoName: "JOB-002",
          description: "Prepared clearance checklist.",
        },
      ],
      customValues: {},
      location: {
        latitude: 13.0827,
        longitude: 80.2707,
        accuracy: 12,
        address: "Chennai, Tamil Nadu",
      },
    });

    expect(dbMock.__tx.workReport.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({ jobNoName: "JOB-001" }),
            expect.objectContaining({ jobNoName: "JOB-002" }),
          ]),
          locationCapturedAt: fixedNow,
          status: "PENDING",
        }),
      }),
    );
    expect(dbMock.__tx.workReportApproval.createMany).toHaveBeenCalledWith({
      data: [
        {
          reportId: "report-1",
          approverId: "manager-1",
          level: 1,
          status: "PENDING",
        },
        {
          reportId: "report-1",
          approverId: "manager-2",
          level: 2,
          status: "WAITING",
        },
      ],
    });
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "manager-1",
        kind: "WORK_REPORT_APPROVAL_REQUIRED",
      }),
    );
    expect(calculateOtForPunchMock).toHaveBeenCalledWith(
      "employee-1",
      reportDate,
    );
  });

  it("requires both distinct managers when two-level approval is enabled", async () => {
    dbMock.user.findFirst.mockResolvedValue({
      id: "employee-1",
      name: "Employee One",
      managerId: "manager-1",
      tlId: null,
    });
    dbMock.workReportSettings.upsert.mockResolvedValue({
      approvalLevels: 2,
      requireApprovedReportForOt: false,
    });

    await expect(
      createWorkReport("employee-1", "org-1", {
        date: reportDate,
        workedOn: "Office",
        items: [
          {
            jobNoName: "JOB-001",
            description: "Completed document review.",
          },
        ],
        customValues: {},
        location: {
          latitude: 13.0827,
          longitude: 80.2707,
          address: "Chennai, Tamil Nadu",
        },
      }),
    ).rejects.toThrow(
      "both primary and secondary reporting managers are not configured",
    );
    expect(dbMock.$transaction).not.toHaveBeenCalled();
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("activates the secondary manager only after primary approval", async () => {
    dbMock.workReportApproval.findFirst.mockResolvedValue({
      id: "approval-1",
      level: 1,
      report: {
        id: "report-1",
        date: reportDate,
        user: { id: "employee-1", name: "Employee One" },
      },
      approver: { name: "Primary Manager" },
    });
    dbMock.__tx.workReportApproval.findFirst.mockResolvedValue({
      id: "approval-2",
      reportId: "report-1",
      approverId: "manager-2",
      level: 2,
      status: "WAITING",
    });
    dbMock.__tx.workReportApproval.update
      .mockResolvedValueOnce({ id: "approval-1", status: "APPROVED" })
      .mockResolvedValueOnce({
        id: "approval-2",
        approverId: "manager-2",
        level: 2,
        status: "PENDING",
      });
    dbMock.__tx.workReport.update.mockResolvedValue({
      id: "report-1",
      date: reportDate,
      status: "PENDING",
    });

    const result = await submitWorkReportApproval(
      "manager-1",
      "org-1",
      "report-1",
      "APPROVED",
      "Looks good",
    );

    expect(result.status).toBe("PENDING");
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "manager-2",
        kind: "WORK_REPORT_APPROVAL_REQUIRED",
      }),
    );
    expect(calculateOtForPunchMock).not.toHaveBeenCalled();
  });

  it("final approval notifies the employee and recalculates that day's OT", async () => {
    dbMock.workReportApproval.findFirst.mockResolvedValue({
      id: "approval-2",
      level: 2,
      report: {
        id: "report-1",
        date: reportDate,
        user: { id: "employee-1", name: "Employee One" },
      },
      approver: { name: "Secondary Manager" },
    });
    dbMock.__tx.workReportApproval.findFirst.mockResolvedValue(null);
    dbMock.__tx.workReportApproval.update.mockResolvedValue({
      id: "approval-2",
      status: "APPROVED",
    });
    dbMock.__tx.workReport.update.mockResolvedValue({
      id: "report-1",
      date: reportDate,
      status: "APPROVED",
    });

    const result = await submitWorkReportApproval(
      "manager-2",
      "org-1",
      "report-1",
      "APPROVED",
    );

    expect(result.status).toBe("APPROVED");
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "employee-1",
        kind: "WORK_REPORT_DECISION",
      }),
    );
    expect(calculateOtForPunchMock).toHaveBeenCalledWith(
      "employee-1",
      reportDate,
    );
  });

  it("closes later approval levels and recalculates OT after rejection", async () => {
    dbMock.workReportApproval.findFirst.mockResolvedValue({
      id: "approval-1",
      level: 1,
      report: {
        id: "report-1",
        date: reportDate,
        user: { id: "employee-1", name: "Employee One" },
      },
      approver: { name: "Primary Manager" },
    });
    dbMock.__tx.workReportApproval.update.mockResolvedValue({
      id: "approval-1",
      status: "REJECTED",
    });
    dbMock.__tx.workReportApproval.updateMany.mockResolvedValue({ count: 1 });
    dbMock.__tx.workReport.update.mockResolvedValue({
      id: "report-1",
      date: reportDate,
      status: "REJECTED",
    });

    const result = await submitWorkReportApproval(
      "manager-1",
      "org-1",
      "report-1",
      "REJECTED",
      "Please add the clearance result.",
    );

    expect(result.status).toBe("REJECTED");
    expect(dbMock.__tx.workReportApproval.updateMany).toHaveBeenCalledWith({
      where: {
        reportId: "report-1",
        level: { gt: 1 },
        status: "WAITING",
      },
      data: { status: "CANCELLED" },
    });
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "employee-1",
        kind: "WORK_REPORT_DECISION",
      }),
    );
    expect(calculateOtForPunchMock).toHaveBeenCalledWith(
      "employee-1",
      reportDate,
    );
  });
});
