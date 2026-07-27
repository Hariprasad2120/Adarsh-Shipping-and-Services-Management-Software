import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/clock", () => ({
  getNow: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    chaJob: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
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
  getCustomerPortalApprovalQueue,
  getCustomerPortalShipmentDetailData,
  getCustomerPortalShipmentsData,
  parseCustomerPortalShipmentFilters,
} = await import("../shipments");

const mockedDb = vi.mocked(db);
const mockedGetNow = vi.mocked(getNow);
type ShipmentsSession = Parameters<typeof getCustomerPortalShipmentsData>[0];
type ShipmentFilters = Parameters<typeof getCustomerPortalShipmentsData>[1];

describe("customer portal shipments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetNow.mockResolvedValue(new Date("2026-07-16T10:00:00.000Z"));
    mockedDb.chaJob.findMany.mockResolvedValue([]);
    mockedDb.chaJob.findFirst.mockResolvedValue(null);
    mockedDb.customerDocumentSubmission.findMany.mockResolvedValue([]);
    mockedDb.chaChecklist.findMany.mockResolvedValue([]);
    mockedDb.customerChecklistResponse.findMany.mockResolvedValue([]);
    mockedDb.customerQueryThread.findMany.mockResolvedValue([]);
    mockedDb.chaAuditLog.findMany.mockResolvedValue([]);
    mockedDb.customerVisibleStageMapping.findMany.mockResolvedValue([]);
  });

  it("parses shipment filters with safe defaults", () => {
    const filters = parseCustomerPortalShipmentFilters({
      q: "  CHA-001  ",
      attention: "needs_action",
      completion: "recent",
      sort: "eta_asc",
    });

    expect(filters).toEqual({
      q: "CHA-001",
      stage: null,
      status: null,
      priority: null,
      attention: "needs_action",
      completion: "recent",
      sort: "eta_asc",
    });
  });

  it("scopes shipment queries to the signed-in customer account", async () => {
    const session: ShipmentsSession = {
      orgId: "org-1",
      portalUser: {
        id: "portal-user-1",
        customerId: "cust-1",
        customer: { name: "Acme Imports" },
      },
    };
    const filters: ShipmentFilters = parseCustomerPortalShipmentFilters({});

    await getCustomerPortalShipmentsData(session, filters);

    expect(mockedDb.chaJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgId: "org-1",
          customerId: "cust-1",
          deletedAt: null,
        }),
      }),
    );
    expect(mockedDb.customerDocumentSubmission.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgId: "org-1",
          customerId: "cust-1",
        }),
      }),
    );
  });

  it("marks shipments as awaiting customer action when checklist work is pending", async () => {
    mockedDb.chaJob.findMany.mockResolvedValue([
      {
        id: "job-1",
        jobNumber: "CHA-001",
        title: "Shipment One",
        customerRef: "AC-100",
        stage: "DOCUMENT_COLLECTION",
        status: "ACTIVE",
        priority: "MEDIUM",
        estimatedClosureDate: null,
        createdAt: new Date("2026-07-01T10:00:00.000Z"),
        updatedAt: new Date("2026-07-15T10:00:00.000Z"),
        documentRequirements: [
          {
            id: "req-1",
            name: "Invoice Copy",
            category: "Core Documents",
            isMandatory: true,
            status: "PENDING",
          },
        ],
      },
    ]);
    mockedDb.chaChecklist.findMany.mockResolvedValue([
      {
        id: "check-1",
        jobId: "job-1",
        status: "ACTIVE",
        currentApprovalStage: "CUSTOMER",
        customerApprovalVisibleAt: new Date("2026-07-15T09:00:00.000Z"),
        updatedAt: new Date("2026-07-15T10:00:00.000Z"),
        currentFileVersion: {
          id: "file-ver-1",
          versionNumber: 2,
          originalFileName: "Checklist V2.pdf",
        },
        job: {
          id: "job-1",
          jobNumber: "CHA-001",
          title: "Shipment One",
          customerRef: "AC-100",
          stage: "CHECKLIST_APPROVAL",
        },
      },
    ] as never);

    const session: ShipmentsSession = {
      orgId: "org-1",
      portalUser: {
        id: "portal-user-1",
        customerId: "cust-1",
        customer: { name: "Acme Imports" },
      },
    };

    const result = await getCustomerPortalShipmentsData(session, parseCustomerPortalShipmentFilters({}));

    expect(result.summary.awaitingCustomerAction).toBe(1);
    expect(result.shipments[0]?.pendingDocumentCount).toBe(0);
    expect(result.shipments[0]?.pendingChecklistCount).toBe(1);
    expect(result.shipments[0]?.hasCustomerAction).toBe(true);
  });

  it("lists customer approvals immediately after internal approval before mail visibility is set", async () => {
    mockedDb.chaChecklist.findMany.mockResolvedValue([
      {
        id: "check-1",
        jobId: "job-1",
        status: "CUSTOMER_APPROVAL_PENDING",
        currentApprovalStage: "CUSTOMER",
        customerApprovalVisibleAt: null,
        updatedAt: new Date("2026-07-15T10:00:00.000Z"),
        currentFileVersion: {
          id: "file-ver-1",
          versionNumber: 2,
          originalFileName: "Checklist V2.pdf",
        },
        job: {
          id: "job-1",
          jobNumber: "CHA-001",
          title: "Shipment One",
          customerRef: "AC-100",
          stage: "CHECKLIST_APPROVAL",
        },
      },
    ] as never);

    const session: ShipmentsSession = {
      orgId: "org-1",
      portalUser: {
        id: "portal-user-1",
        customerId: "cust-1",
        customer: { name: "Acme Imports" },
      },
    };

    const approvals = await getCustomerPortalApprovalQueue(session);

    expect(approvals).toHaveLength(1);
    expect(approvals[0]).toMatchObject({
      id: "check-1",
      jobNumber: "CHA-001",
      visibleAt: "2026-07-15T10:00:00.000Z",
    });
  });

  it("returns null for shipment detail outside the signed-in customer scope", async () => {
    const session: ShipmentsSession = {
      orgId: "org-1",
      portalUser: {
        id: "portal-user-1",
        customerId: "cust-1",
        customer: { name: "Acme Imports" },
      },
    };

    const detail = await getCustomerPortalShipmentDetailData(session, "job-missing");

    expect(detail).toBeNull();
    expect(mockedDb.chaJob.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "job-missing",
          orgId: "org-1",
          customerId: "cust-1",
          deletedAt: null,
        }),
      }),
    );
  });

  it("includes download metadata for the latest active uploaded document version", async () => {
    mockedDb.chaJob.findFirst.mockResolvedValue({
      id: "job-1",
      jobNumber: "CHA-001",
      title: "Shipment One",
      customerRef: "AC-100",
      stage: "DOCUMENT_COLLECTION",
      status: "ACTIVE",
      priority: "MEDIUM",
      estimatedClosureDate: null,
      createdAt: new Date("2026-07-01T10:00:00.000Z"),
      updatedAt: new Date("2026-07-15T10:00:00.000Z"),
      documentRequirements: [
        {
          id: "req-1",
          name: "Invoice Copy",
          category: "Core Documents",
          isMandatory: true,
          status: "UPLOADED",
          versions: [
            {
              id: "ver-1",
              fileName: "invoice.pdf",
              mimeType: "application/pdf",
              fileKey: "https://drive.google.com/file/d/file-123/view",
              sizeBytes: 2048,
              uploadedAt: new Date("2026-07-15T10:00:00.000Z"),
              createdAt: new Date("2026-07-15T10:00:00.000Z"),
            },
          ],
        },
      ],
      additionalData: null,
      filing: null,
    });
    mockedDb.customerDocumentSubmission.findMany.mockResolvedValue([]);

    const session: ShipmentsSession = {
      orgId: "org-1",
      portalUser: {
        id: "portal-user-1",
        customerId: "cust-1",
        customer: { name: "Acme Imports" },
      },
    };

    const detail = await getCustomerPortalShipmentDetailData(session, "job-1");

    expect(detail?.documents[0]).toMatchObject({
      latestVersionId: "ver-1",
      latestFileName: "invoice.pdf",
      latestMimeType: "application/pdf",
      downloadHref: "/api/customer-portal/documents/ver-1?download=true",
      isDownloadable: true,
    });
  });

  it("includes checklist file download metadata for visible checklist versions", async () => {
    mockedDb.chaJob.findFirst.mockResolvedValue({
      id: "job-1",
      jobNumber: "CHA-001",
      title: "Shipment One",
      customerRef: "AC-100",
      stage: "CHECKLIST_APPROVAL",
      status: "ACTIVE",
      priority: "MEDIUM",
      estimatedClosureDate: null,
      createdAt: new Date("2026-07-01T10:00:00.000Z"),
      updatedAt: new Date("2026-07-15T10:00:00.000Z"),
      documentRequirements: [],
      additionalData: null,
      filing: null,
    } as never);
    mockedDb.chaChecklist.findMany.mockResolvedValue([
      {
        id: "check-1",
        jobId: "job-1",
        status: "ACTIVE",
        currentApprovalStage: "CUSTOMER",
        customerApprovalVisibleAt: new Date("2026-07-15T09:00:00.000Z"),
        updatedAt: new Date("2026-07-15T10:00:00.000Z"),
        currentFileVersion: {
          id: "file-ver-1",
          versionNumber: 3,
          originalFileName: "Checklist V3.pdf",
        },
        job: {
          id: "job-1",
          jobNumber: "CHA-001",
          title: "Shipment One",
          customerRef: "AC-100",
          stage: "CHECKLIST_APPROVAL",
        },
      },
    ] as never);

    const session: ShipmentsSession = {
      orgId: "org-1",
      portalUser: {
        id: "portal-user-1",
        customerId: "cust-1",
        customer: { name: "Acme Imports" },
      },
    };

    const detail = await getCustomerPortalShipmentDetailData(session, "job-1");

    expect(detail?.checklists[0]).toMatchObject({
      versionLabel: "v3",
      fileVersionId: "file-ver-1",
      fileName: "Checklist V3.pdf",
      downloadHref: "/api/customer-portal/checklist-files/file-ver-1?download=true",
      isDownloadable: true,
      canRespond: true,
      responseDecision: null,
    });
  });
});
