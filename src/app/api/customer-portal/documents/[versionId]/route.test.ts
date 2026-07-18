import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/customer-portal/auth", () => ({
  getPortalSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    chaDocumentVersion: {
      findFirst: vi.fn(),
    },
    customerDocumentVersion: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/google-drive-client", () => ({
  downloadFile: vi.fn(),
}));

const { getPortalSession } = await import("@/modules/customer-portal/auth");
const { db } = await import("@/lib/db");
const driveClient = await import("@/lib/google-drive-client");
const { GET } = await import("./route");

const mockedGetPortalSession = vi.mocked(getPortalSession);
const mockedDb = vi.mocked(db);
const mockedDriveClient = vi.mocked(driveClient);

describe("GET /api/customer-portal/documents/[versionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetPortalSession.mockResolvedValue(null);
    mockedDb.chaDocumentVersion.findFirst.mockResolvedValue(null);
    mockedDb.customerDocumentVersion.findFirst.mockResolvedValue(null);
    mockedDriveClient.downloadFile.mockResolvedValue(Buffer.from("file-bytes"));
  });

  it("returns 401 when the portal session is missing", async () => {
    const response = await GET(
      new Request("http://localhost/api/customer-portal/documents/ver-1?download=true"),
      { params: Promise.resolve({ versionId: "ver-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when the requested version is outside the signed-in customer scope", async () => {
    mockedGetPortalSession.mockResolvedValue({
      orgId: "org-1",
      portalUser: {
        id: "portal-user-1",
        customerId: "cust-1",
      },
    } as never);

    const response = await GET(
      new Request("http://localhost/api/customer-portal/documents/ver-2?download=true"),
      { params: Promise.resolve({ versionId: "ver-2" }) },
    );

    expect(response.status).toBe(404);
    expect(mockedDb.chaDocumentVersion.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "ver-2",
          requirement: expect.objectContaining({
            job: expect.objectContaining({
              orgId: "org-1",
              customerId: "cust-1",
            }),
          }),
        }),
      }),
    );
    expect(mockedDb.customerDocumentVersion.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "ver-2",
          submission: expect.objectContaining({
            orgId: "org-1",
            customerId: "cust-1",
          }),
        }),
      }),
    );
  });

  it("streams a valid customer-owned Drive document through the portal route", async () => {
    mockedGetPortalSession.mockResolvedValue({
      orgId: "org-1",
      portalUser: {
        id: "portal-user-1",
        customerId: "cust-1",
      },
    } as never);
    mockedDb.customerDocumentVersion.findFirst.mockResolvedValue({
      id: "ver-1",
      fileKey: "https://drive.google.com/file/d/file-123/view",
      fileName: "invoice.pdf",
      mimeType: "application/pdf",
      sizeBytes: 2048,
      submission: {
        id: "sub-1",
        customerId: "cust-1",
        jobId: "job-1",
      },
    } as never);

    const response = await GET(
      new Request("http://localhost/api/customer-portal/documents/ver-1?download=true"),
      { params: Promise.resolve({ versionId: "ver-1" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="invoice.pdf"');
    expect(mockedDriveClient.downloadFile).toHaveBeenCalledWith("file-123");
  });

  it("streams a valid CHA shipment Drive document through the portal route", async () => {
    mockedGetPortalSession.mockResolvedValue({
      orgId: "org-1",
      portalUser: {
        id: "portal-user-1",
        customerId: "cust-1",
      },
    } as never);
    mockedDb.chaDocumentVersion.findFirst.mockResolvedValue({
      id: "ver-cha-1",
      fileKey: "https://drive.google.com/file/d/file-cha-123/view",
      fileName: "bill-of-lading.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4096,
    } as never);

    const response = await GET(
      new Request("http://localhost/api/customer-portal/documents/ver-cha-1?download=true"),
      { params: Promise.resolve({ versionId: "ver-cha-1" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="bill-of-lading.pdf"');
    expect(mockedDriveClient.downloadFile).toHaveBeenCalledWith("file-cha-123");
    expect(mockedDb.customerDocumentVersion.findFirst).not.toHaveBeenCalled();
  });
});
