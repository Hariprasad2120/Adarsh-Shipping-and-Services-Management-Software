import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/customer-portal/auth", () => ({
  getPortalSession: vi.fn(),
}));

vi.mock("@/modules/customer-portal/checklists", () => ({
  submitPortalChecklistDecision: vi.fn(),
}));

const { getPortalSession } = await import("@/modules/customer-portal/auth");
const { submitPortalChecklistDecision } = await import("@/modules/customer-portal/checklists");
const { POST } = await import("./route");

const mockedGetPortalSession = vi.mocked(getPortalSession);
const mockedSubmitPortalChecklistDecision = vi.mocked(submitPortalChecklistDecision);

describe("POST /api/customer-portal/checklists/[checklistId]/decision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetPortalSession.mockResolvedValue(null);
    mockedSubmitPortalChecklistDecision.mockResolvedValue({
      outcome: "APPROVED",
      checklistId: "check-1",
      jobId: "job-1",
      jobNumber: "CHA-001",
    });
  });

  it("returns 401 when the portal session is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/customer-portal/checklists/check-1/decision", {
        method: "POST",
        body: JSON.stringify({ decision: "APPROVED" }),
      }),
      { params: Promise.resolve({ checklistId: "check-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("submits a customer-scoped checklist approval", async () => {
    mockedGetPortalSession.mockResolvedValue({
      orgId: "org-1",
      portalUser: {
        id: "portal-user-1",
        customerId: "cust-1",
      },
    } as never);

    const response = await POST(
      new Request("http://localhost/api/customer-portal/checklists/check-1/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "APPROVED" }),
      }),
      { params: Promise.resolve({ checklistId: "check-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockedSubmitPortalChecklistDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-1",
        portalUser: expect.objectContaining({
          id: "portal-user-1",
          customerId: "cust-1",
        }),
      }),
      "check-1",
      "APPROVED",
      undefined,
    );
  });

  it("returns 404 when the checklist is outside the signed-in customer scope", async () => {
    mockedGetPortalSession.mockResolvedValue({
      orgId: "org-1",
      portalUser: {
        id: "portal-user-1",
        customerId: "cust-1",
      },
    } as never);
    mockedSubmitPortalChecklistDecision.mockRejectedValue(new Error("Checklist not found."));

    const response = await POST(
      new Request("http://localhost/api/customer-portal/checklists/check-2/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "REJECTED" }),
      }),
      { params: Promise.resolve({ checklistId: "check-2" }) },
    );

    expect(response.status).toBe(404);
  });
});
