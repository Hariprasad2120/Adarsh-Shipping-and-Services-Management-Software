import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/clock", () => ({
  getNow: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    chaJob: {
      findMany: vi.fn(),
    },
    customerDocumentSubmission: {
      findMany: vi.fn(),
    },
    chaChecklist: {
      findMany: vi.fn(),
    },
    customerChecklistResponse: {
      findMany: vi.fn(),
    },
    customerQueryThread: {
      findMany: vi.fn(),
    },
    customerPortalNotification: {
      findMany: vi.fn(),
    },
    shipmentServiceRating: {
      findMany: vi.fn(),
    },
    chaAuditLog: {
      findMany: vi.fn(),
    },
    customerVisibleStageMapping: {
      findMany: vi.fn(),
    },
  },
}));

const { db } = await import("@/lib/db");
const { getNow } = await import("@/lib/clock");
const {
  buildDocumentStatusSummary,
  buildPendingChecklistDecisions,
  buildServiceFeedback,
  getCustomerPortalDashboardData,
} = await import("../dashboard");

const mockedDb = vi.mocked(db);
const mockedGetNow = vi.mocked(getNow);
type DashboardSession = Parameters<typeof getCustomerPortalDashboardData>[0];
type DocumentSummaryInput = NonNullable<Parameters<typeof buildDocumentStatusSummary>[0]>;
type PendingChecklistInput = NonNullable<Parameters<typeof buildPendingChecklistDecisions>[0]>;
type PendingChecklistResponseInput = NonNullable<Parameters<typeof buildPendingChecklistDecisions>[1]>;
type ServiceFeedbackJobsInput = NonNullable<Parameters<typeof buildServiceFeedback>[0]>;
type ServiceFeedbackRatingsInput = NonNullable<Parameters<typeof buildServiceFeedback>[1]>;

describe("customer portal dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetNow.mockResolvedValue(new Date("2026-07-16T10:00:00.000Z"));
    mockedDb.chaJob.findMany.mockResolvedValue([]);
    mockedDb.customerDocumentSubmission.findMany.mockResolvedValue([]);
    mockedDb.chaChecklist.findMany.mockResolvedValue([]);
    mockedDb.customerChecklistResponse.findMany.mockResolvedValue([]);
    mockedDb.customerQueryThread.findMany.mockResolvedValue([]);
    mockedDb.customerPortalNotification.findMany.mockResolvedValue([]);
    mockedDb.shipmentServiceRating.findMany.mockResolvedValue([]);
    mockedDb.chaAuditLog.findMany.mockResolvedValue([]);
    mockedDb.customerVisibleStageMapping.findMany.mockResolvedValue([]);
  });

  it("scopes shipment and portal-user queries to the signed-in customer session", async () => {
    const session: DashboardSession = {
      orgId: "org-1",
      customerId: "cust-session",
      portalUser: {
        id: "portal-user-1",
        customerId: "cust-1",
        customer: { name: "Acme Imports" },
      },
    };

    await getCustomerPortalDashboardData(session);

    expect(mockedDb.chaJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgId: "org-1",
          customerId: "cust-1",
          deletedAt: null,
        }),
      }),
    );
    expect(mockedDb.customerPortalNotification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { portalUserId: "portal-user-1" },
      }),
    );
    expect(mockedDb.shipmentServiceRating.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          portalUserId: "portal-user-1",
        }),
      }),
    );
  });

  it("builds document status from the latest non-superseded submission per requirement", () => {
    const summary = buildDocumentStatusSummary([
      {
        id: "sub-old",
        jobId: "job-1",
        requirementId: "req-1",
        status: "SUPERSEDED",
        customerComment: null,
        reviewerComment: null,
        createdAt: new Date("2026-07-10T09:00:00.000Z"),
        updatedAt: new Date("2026-07-10T09:00:00.000Z"),
        job: { id: "job-1", jobNumber: "CHA-1", title: "Shipment 1", customerRef: null, stage: "DOCUMENT_COLLECTION" },
        requirement: { id: "req-1", name: "Supplier Clarification", category: "Customer Uploads", isMandatory: true, status: "PENDING" },
      },
      {
        id: "sub-new",
        jobId: "job-1",
        requirementId: "req-1",
        status: "REUPLOAD_REQUIRED",
        customerComment: null,
        reviewerComment: "Please upload a clearer copy.",
        createdAt: new Date("2026-07-12T09:00:00.000Z"),
        updatedAt: new Date("2026-07-12T09:00:00.000Z"),
        job: { id: "job-1", jobNumber: "CHA-1", title: "Shipment 1", customerRef: null, stage: "DOCUMENT_COLLECTION" },
        requirement: { id: "req-1", name: "Supplier Clarification", category: "Customer Uploads", isMandatory: true, status: "PENDING" },
      },
      {
        id: "sub-accepted",
        jobId: "job-2",
        requirementId: "req-2",
        status: "ACCEPTED",
        customerComment: null,
        reviewerComment: null,
        createdAt: new Date("2026-07-13T09:00:00.000Z"),
        updatedAt: new Date("2026-07-13T09:00:00.000Z"),
        job: { id: "job-2", jobNumber: "CHA-2", title: "Shipment 2", customerRef: null, stage: "FILING" },
        requirement: { id: "req-2", name: "Clarification Note", category: "Customer Uploads", isMandatory: true, status: "UPLOADED" },
      },
    ] satisfies DocumentSummaryInput);

    expect(summary.counts.reuploadRequired).toBe(1);
    expect(summary.counts.accepted).toBe(1);
    expect(summary.recentItems).toHaveLength(2);
    expect(summary.recentItems[0]?.status).toBe("ACCEPTED");
    expect(summary.recentItems[1]?.status).toBe("REUPLOAD REQUIRED");
  });

  it("treats a checklist as resolved once any account-level response exists", () => {
    const pending = buildPendingChecklistDecisions(
      [
        {
          id: "check-1",
          jobId: "job-1",
          status: "PENDING_UPLOAD",
          currentApprovalStage: "CUSTOMER",
          customerApprovalVisibleAt: new Date("2026-07-15T10:00:00.000Z"),
          updatedAt: new Date("2026-07-15T10:00:00.000Z"),
          currentFileVersion: { versionNumber: 3, originalFileName: "checklist-v3.pdf" },
          job: { id: "job-1", jobNumber: "CHA-1", title: "Shipment 1", customerRef: null, stage: "CHECKLIST_APPROVAL" },
        },
      ] satisfies PendingChecklistInput,
      [
        {
          checklistId: "check-1",
          portalUserId: "portal-user-2",
          submittedAt: new Date("2026-07-15T13:00:00.000Z"),
          decision: "APPROVED",
        },
      ] satisfies PendingChecklistResponseInput,
      [],
      {},
      new Date("2026-07-16T10:00:00.000Z"),
    );

    expect(pending).toHaveLength(0);
  });

  it("shows pending checklist decisions immediately after internal approval before mail visibility is set", () => {
    const pending = buildPendingChecklistDecisions(
      [
        {
          id: "check-1",
          jobId: "job-1",
          status: "CUSTOMER_APPROVAL_PENDING",
          currentApprovalStage: "CUSTOMER",
          customerApprovalVisibleAt: null,
          updatedAt: new Date("2026-07-15T10:00:00.000Z"),
          currentFileVersion: { versionNumber: 3, originalFileName: "checklist-v3.pdf" },
          job: { id: "job-1", jobNumber: "CHA-1", title: "Shipment 1", customerRef: null, stage: "CHECKLIST_APPROVAL" },
        },
      ] satisfies PendingChecklistInput,
      [],
      [],
      {},
      new Date("2026-07-16T10:00:00.000Z"),
    );

    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      id: "check-1",
      visibleAt: "2026-07-15T10:00:00.000Z",
    });
  });

  it("shows only completed shipments without a rating in pending service feedback", () => {
    const feedback = buildServiceFeedback(
      [
        {
          id: "job-1",
          jobNumber: "CHA-1",
          title: "Shipment 1",
          customerRef: null,
          stage: "FILED",
          status: "ACTIVE",
          priority: "MEDIUM",
          estimatedClosureDate: null,
          createdAt: new Date("2026-07-01T10:00:00.000Z"),
          updatedAt: new Date("2026-07-15T10:00:00.000Z"),
          documentRequirements: [],
        },
        {
          id: "job-2",
          jobNumber: "CHA-2",
          title: "Shipment 2",
          customerRef: null,
          stage: "DOCUMENT_COLLECTION",
          status: "ACTIVE",
          priority: "MEDIUM",
          estimatedClosureDate: null,
          createdAt: new Date("2026-07-01T10:00:00.000Z"),
          updatedAt: new Date("2026-07-15T10:00:00.000Z"),
          documentRequirements: [],
        },
      ] satisfies ServiceFeedbackJobsInput,
      [
        {
          id: "rating-1",
          jobId: "job-3",
          overallRating: 4,
          followUpStatus: "OPEN",
          submittedAt: new Date("2026-07-14T12:00:00.000Z"),
          category: { label: "Speed" },
          job: { id: "job-3", jobNumber: "CHA-3", title: "Shipment 3", customerRef: null, stage: "FILED" },
        },
      ] satisfies ServiceFeedbackRatingsInput,
      [],
      new Date("2026-07-16T10:00:00.000Z"),
    );

    expect(feedback.pending).toHaveLength(1);
    expect(feedback.pending[0]?.jobId).toBe("job-1");
    expect(feedback.recentSubmitted).toHaveLength(1);
  });
});
