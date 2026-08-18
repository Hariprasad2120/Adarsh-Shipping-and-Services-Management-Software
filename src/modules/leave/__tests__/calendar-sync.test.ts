import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  googleWorkspaceConnectionFindUnique: vi.fn(),
  leaveRequestUpdate: vi.fn(),
  leaveRequestFindUnique: vi.fn(),
  createEvent: vi.fn(),
  getValidAccessToken: vi.fn(),
  writeLeaveAudit: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    googleWorkspaceConnection: { findUnique: mocks.googleWorkspaceConnectionFindUnique },
    leaveRequest: { update: mocks.leaveRequestUpdate, findUnique: mocks.leaveRequestFindUnique },
  },
}));
vi.mock("@/modules/leave/audit", () => ({ writeLeaveAudit: mocks.writeLeaveAudit }));
vi.mock("@/lib/google-calendar-client", () => ({ createEvent: mocks.createEvent }));
vi.mock("@/lib/workspace-oauth", () => ({ getValidAccessToken: mocks.getValidAccessToken }));

import { syncLeaveRequestToExternalCalendar, removeLeaveRequestFromExternalCalendar } from "../calendar-sync";

describe("syncLeaveRequestToExternalCalendar (spec §37 outbound adapter)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mocks.fetch as unknown as typeof fetch;
  });

  it("silently no-ops when the employee has not connected Google Workspace", async () => {
    mocks.googleWorkspaceConnectionFindUnique.mockResolvedValue(null);

    await syncLeaveRequestToExternalCalendar({
      userId: "user-1",
      orgId: "org-1",
      leaveRequestId: "req-1",
      leaveTypeName: "Annual Leave",
      fromDate: new Date("2026-09-01"),
      toDate: new Date("2026-09-02"),
    });

    expect(mocks.createEvent).not.toHaveBeenCalled();
    expect(mocks.leaveRequestUpdate).not.toHaveBeenCalled();
    expect(mocks.writeLeaveAudit).not.toHaveBeenCalled(); // not connected is expected, not an error
  });

  it("creates a calendar event and persists the external event id when connected", async () => {
    mocks.googleWorkspaceConnectionFindUnique.mockResolvedValue({ userId: "user-1" });
    mocks.createEvent.mockResolvedValue({ id: "gcal-event-1", htmlLink: "https://calendar.google.com/event?eid=1" });

    await syncLeaveRequestToExternalCalendar({
      userId: "user-1",
      orgId: "org-1",
      leaveRequestId: "req-1",
      leaveTypeName: "Annual Leave",
      fromDate: new Date("2026-09-01"),
      toDate: new Date("2026-09-02"),
    });

    expect(mocks.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", summary: "On leave: Annual Leave" }),
    );
    expect(mocks.leaveRequestUpdate).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { externalCalendarProvider: "GOOGLE", externalCalendarEventId: "gcal-event-1" },
    });
  });

  it("never throws when the calendar API call fails — logs via audit instead, does not block approval", async () => {
    mocks.googleWorkspaceConnectionFindUnique.mockResolvedValue({ userId: "user-1" });
    mocks.createEvent.mockRejectedValue(new Error("Calendar createEvent failed: 403"));

    await expect(
      syncLeaveRequestToExternalCalendar({
        userId: "user-1",
        orgId: "org-1",
        leaveRequestId: "req-1",
        leaveTypeName: "Annual Leave",
        fromDate: new Date("2026-09-01"),
        toDate: new Date("2026-09-02"),
      }),
    ).resolves.toBeUndefined();

    expect(mocks.writeLeaveAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "LEAVE_CALENDAR_SYNC_FAILED" }),
    );
    expect(mocks.leaveRequestUpdate).not.toHaveBeenCalled();
  });
});

describe("removeLeaveRequestFromExternalCalendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mocks.fetch as unknown as typeof fetch;
  });

  it("is a no-op when the request was never synced", async () => {
    mocks.leaveRequestFindUnique.mockResolvedValue({ externalCalendarProvider: null, externalCalendarEventId: null });

    await removeLeaveRequestFromExternalCalendar({ userId: "user-1", orgId: "org-1", leaveRequestId: "req-1" });

    expect(mocks.getValidAccessToken).not.toHaveBeenCalled();
  });

  it("deletes the external event and clears the stored id when a sync record exists", async () => {
    mocks.leaveRequestFindUnique.mockResolvedValue({
      externalCalendarProvider: "GOOGLE",
      externalCalendarEventId: "gcal-event-1",
    });
    mocks.getValidAccessToken.mockResolvedValue("token-abc");
    mocks.fetch.mockResolvedValue({ ok: true, status: 200 });

    await removeLeaveRequestFromExternalCalendar({ userId: "user-1", orgId: "org-1", leaveRequestId: "req-1" });

    expect(mocks.fetch).toHaveBeenCalledWith(
      expect.stringContaining("gcal-event-1"),
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(mocks.leaveRequestUpdate).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { externalCalendarProvider: null, externalCalendarEventId: null },
    });
  });

  it("treats a 404 from the provider as already-deleted, not an error (idempotent)", async () => {
    mocks.leaveRequestFindUnique.mockResolvedValue({
      externalCalendarProvider: "GOOGLE",
      externalCalendarEventId: "gcal-event-1",
    });
    mocks.getValidAccessToken.mockResolvedValue("token-abc");
    mocks.fetch.mockResolvedValue({ ok: false, status: 404 });

    await removeLeaveRequestFromExternalCalendar({ userId: "user-1", orgId: "org-1", leaveRequestId: "req-1" });

    expect(mocks.leaveRequestUpdate).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { externalCalendarProvider: null, externalCalendarEventId: null },
    });
    expect(mocks.writeLeaveAudit).not.toHaveBeenCalled();
  });
});
