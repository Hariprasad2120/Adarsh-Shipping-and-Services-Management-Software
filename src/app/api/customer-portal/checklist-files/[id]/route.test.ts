import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/customer-portal/auth", () => ({
  getPortalSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    chaChecklistFileVersion: {
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

describe("GET /api/customer-portal/checklist-files/[versionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetPortalSession.mockResolvedValue(null);
    mockedDb.chaChecklistFileVersion.findFirst.mockResolvedValue(null);
    mockedDriveClient.downloadFile.mockResolvedValue(Buffer.from("checklist-bytes"));
  });

  it("returns 401 when the portal session is missing", async () => {
    const response = await GET(
      new Request("http://localhost/api/customer-portal/checklist-files/file-ver-1?download=true"),
      { params: Promise.resolve({ versionId: "file-ver-1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 when the checklist version is outside the signed-in customer scope", async () => {
    mockedGetPortalSession.mockResolvedValue({
      orgId: "org-1",
      portalUser: {
        id: "portal-user-1",
        customerId: "cust-1",
      },
    } as never);

    const response = await GET(
      new Request("http://localhost/api/customer-portal/checklist-files/file-ver-2?download=true"),
      { params: Promise.resolve({ versionId: "file-ver-2" }) },
    );

    expect(response.status).toBe(404);
    expect(mockedDb.chaChecklistFileVersion.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "file-ver-2",
          checklist: expect.objectContaining({
            job: expect.objectContaining({
              orgId: "org-1",
              customerId: "cust-1",
            }),
          }),
        }),
      }),
    );
  });

  it("streams a valid checklist Drive file through the portal route", async () => {
    mockedGetPortalSession.mockResolvedValue({
      orgId: "org-1",
      portalUser: {
        id: "portal-user-1",
        customerId: "cust-1",
      },
    } as never);
    mockedDb.chaChecklistFileVersion.findFirst.mockResolvedValue({
      id: "file-ver-1",
      fileKey: "https://drive.google.com/file/d/checklist-123/view",
      originalFileName: "Checklist V3.pdf",
      mimeType: "application/pdf",
      fileSize: 4096,
    } as never);

    const response = await GET(
      new Request("http://localhost/api/customer-portal/checklist-files/file-ver-1?download=true"),
      { params: Promise.resolve({ versionId: "file-ver-1" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toContain('attachment; filename="Checklist V3.pdf"');
    expect(mockedDriveClient.downloadFile).toHaveBeenCalledWith("checklist-123");
  });
});
