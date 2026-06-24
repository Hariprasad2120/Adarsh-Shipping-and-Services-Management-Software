import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import * as chaService from "@/modules/cha/service";
import * as gmailClient from "@/lib/google-gmail-client";
import * as chatClient from "@/lib/google-chat-client";
import * as driveClientMock from "@/lib/google-drive-client";

// Mock workspace-oauth token fetching
vi.mock("../workspace-oauth", () => ({
  getValidAccessToken: vi.fn().mockResolvedValue("dummy-access-token"),
  getAccessToken: vi.fn().mockResolvedValue("dummy-bot-token"),
}));

// Mock drive client uploadFile to return a specific webViewLink
vi.mock("@/lib/google-drive-client", () => {
  return {
    uploadFile: vi.fn().mockResolvedValue({
      id: "mock-google-drive-file-123",
      webViewLink: "https://drive.google.com/file/d/mock-google-drive-file-123/view",
    }),
  };
});

describe("Google Workspace Parity Tests", () => {
  let originalFetch: typeof global.fetch;
  let org: any;
  let branch: any;
  let ownerUser: any;
  let customer: any;
  let jobTypeImport: any;
  let job: any;
  let blReq: any;
  let profile: any;

  beforeAll(async () => {
    originalFetch = global.fetch;

    // Set mock env credentials to trigger Drive logic
    process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL = "test-service-account@adarshshipping.in";

    // Setup DB objects for integration testing
    org = await db.organisation.create({
      data: {
        name: "Test parity Org",
        slug: "test-parity-org-" + Date.now(),
      },
    });

    branch = await db.branch.create({
      data: {
        orgId: org.id,
        name: "Test Branch Mundra",
        code: "MUN-" + Date.now().toString().slice(-4),
      },
    });

    ownerUser = await db.user.create({
      data: {
        orgId: org.id,
        email: `parity-owner-${Date.now()}@example.com`,
        passwordHash: "dummy-hash",
        name: "Operations Owner",
        branchId: branch.id,
      },
    });

    const employeeRole = await db.role.create({
      data: { orgId: org.id, name: "Employee", isSystem: true },
    });

    await db.userRole.create({
      data: { userId: ownerUser.id, roleId: employeeRole.id },
    });

    await db.googleWorkspaceConnection.create({
      data: {
        orgId: org.id,
        userId: ownerUser.id,
        googleUserId: "google-user-123",
        googleEmail: ownerUser.email,
        accessToken: "dummy-access-token",
        refreshToken: "dummy-refresh-token",
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        scopes: [
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/chat.spaces.readonly",
          "https://www.googleapis.com/auth/drive.file"
        ],
      },
    });

    customer = await db.crmAccount.create({
      data: {
        orgId: org.id,
        ownerId: ownerUser.id,
        name: "Adarsh Cargo Services",
        type: "Customer",
        createdById: ownerUser.id,
        updatedById: ownerUser.id,
      },
    });

    jobTypeImport = await db.chaJobType.create({
      data: {
        orgId: org.id,
        name: "Import Clearance - Parity",
      },
    });

    // Create document definition
    await db.chaDocumentDefinition.create({
      data: {
        jobTypeId: jobTypeImport.id,
        name: "Bill of Lading",
        category: "Commercial",
        isMandatory: true,
      },
    });

    // Create a job
    const jobRes = await chaService.createJob(ownerUser.id, org.id, {
      title: "Import Cargo Mundra",
      customerId: customer.id,
      jobTypeId: jobTypeImport.id,
      branchId: branch.id,
      priority: "HIGH",
      primaryOwnerId: ownerUser.id,
      assignedManagerId: ownerUser.id,
      assignments: [],
    });
    job = jobRes;

    // Fetch the requirement
    const reqs = await db.chaJobDocumentRequirement.findMany({
      where: { jobId: job.id },
    });
    blReq = reqs.find((r) => r.name === "Bill of Lading")!;

    await db.chaJobDocumentRequirement.update({
      where: { id: blReq.id },
      data: { category: "Commercial" },
    });

    // Create job workspace profile with a non-mock category subfolder ID
    profile = await db.jobWorkspaceProfile.create({
      data: {
        orgId: org.id,
        jobId: job.id,
        provisioningStatus: "success",
        rootFolderId: "real-root-id",
        categoryFolders: {
          "02 Job Documents": "real-job-docs-folder-id",
        },
      },
    });
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL;

    // Cleanup DB
    await db.organisation.delete({ where: { id: org.id } }).catch(() => {});
  });

  it("1. Gmail listThreads should parse From/Subject/Date headers and not return Unknown/No Subject", async () => {
    // Mock the thread list request & metadata detail request
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/threads/thread-123")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              messages: [
                {
                  id: "msg-123",
                  labelIds: ["INBOX", "UNREAD"],
                  payload: {
                    headers: [
                      { name: "From", value: "John Doe <john@example.com>" },
                      { name: "Subject", value: "Shipment documents attached" },
                      { name: "Date", value: "Wed, 24 Jun 2026 12:00:00 GMT" },
                      { name: "To", value: "ops@adarshshipping.in" },
                    ],
                  },
                },
              ],
            }),
        });
      } else if (url.includes("/threads")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              threads: [
                {
                  id: "thread-123",
                  snippet: "Hello, please find attached...",
                  historyId: "9999",
                },
              ],
            }),
        });
      }
      return Promise.resolve({ ok: false });
    }) as any;

    const result = await gmailClient.listThreads({ userId: ownerUser.id });
    expect(result.threads.length).toBe(1);
    expect(result.threads[0].from).toBe("John Doe <john@example.com>");
    expect(result.threads[0].subject).toBe("Shipment documents attached");
    expect(result.threads[0].date).toBe("Wed, 24 Jun 2026 12:00:00 GMT");
  });

  it("2. Gmail sendEmail should construct a valid RFC 2822 payload including In-Reply-To/References", async () => {
    let sentPayload: any = null;
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/messages/send")) {
        sentPayload = JSON.parse(init?.body as string);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: "sent-msg-id" }),
        });
      }
      return Promise.resolve({ ok: false });
    }) as any;

    await gmailClient.sendEmail({
      userId: ownerUser.id,
      to: "client@example.com",
      subject: "RE: Cargo status",
      body: "<p>Status is updated.</p>",
      threadId: "parent-thread-id",
    });

    expect(sentPayload).not.toBeNull();
    expect(sentPayload.threadId).toBe("parent-thread-id");
    
    // Decode base64url message to verify contents
    const decoded = Buffer.from(sentPayload.raw, "base64url").toString("utf-8");
    expect(decoded).toContain("To: client@example.com");
    expect(decoded).toContain("Subject: RE: Cargo status");
    expect(decoded).toContain("In-Reply-To: parent-thread-id");
    expect(decoded).toContain("References: parent-thread-id");
  });

  it("3. Gmail getThread should fetch thread by id", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/threads/thread-123")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "thread-123",
              messages: [
                {
                  id: "msg-123",
                  threadId: "thread-123",
                  snippet: "Snippet text",
                  payload: {
                    headers: [
                      { name: "From", value: "John Doe" },
                      { name: "Subject", value: "Shipment update" },
                    ],
                    mimeType: "text/plain",
                    body: { data: Buffer.from("Cargo is ready.").toString("base64url") },
                  },
                },
              ],
            }),
        });
      }
      return Promise.resolve({ ok: false });
    }) as any;

    const thread = await gmailClient.getThread(ownerUser.id, "thread-123");
    expect(thread.id).toBe("thread-123");
    expect(thread.subject).toBe("Shipment update");
    expect(thread.messages[0].from).toBe("John Doe");
    expect(thread.messages[0].bodyText).toBe("Cargo is ready.");
  });

  it("4. Google Chat listSpaces should fetch list of user spaces and DMs", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/spaces")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              spaces: [
                { name: "spaces/room-abc", displayName: "Ops Space", type: "SPACE" },
                { name: "spaces/dm-xyz", singleUserBotDm: false, type: "DIRECT_MESSAGE" },
              ],
            }),
        });
      }
      return Promise.resolve({ ok: false });
    }) as any;

    const spaces = await chatClient.listSpaces(ownerUser.id);
    expect(spaces.length).toBe(2);
    expect(spaces[0].name).toBe("spaces/room-abc");
    expect(spaces[0].displayName).toBe("Ops Space");
  });

  it("5. CHA Document upload with buffer should resolve subfolder name and save Google Drive link", async () => {
    const fileBuffer = Buffer.from("mock PDF contents");
    const version = await chaService.uploadDocumentVersion(
      ownerUser.id,
      org.id,
      job.id,
      blReq.id,
      {
        fileName: "bill_of_lading.pdf",
        mimeType: "application/pdf",
        sizeBytes: fileBuffer.length,
      },
      fileBuffer
    );

    // Verify it called driveClient.uploadFile with parentFolderId mapping to '02 Job Documents'
    expect(driveClientMock.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "bill_of_lading.pdf",
        mimeType: "application/pdf",
        parentFolderId: "real-job-docs-folder-id",
        fileBuffer,
      })
    );

    // Verify database record has webViewLink saved as fileKey
    expect(version.fileKey).toBe("https://drive.google.com/file/d/mock-google-drive-file-123/view");

    const reqAfter = await db.chaJobDocumentRequirement.findUniqueOrThrow({
      where: { id: blReq.id },
      include: { versions: true },
    });
    expect(reqAfter.status).toBe("UPLOADED");
    const currentVer = reqAfter.versions.find((v) => v.isCurrent);
    expect(currentVer).toBeDefined();
    expect(currentVer?.fileKey).toBe("https://drive.google.com/file/d/mock-google-drive-file-123/view");
  });

  it("6. Gmail listLabels, createLabel, and deleteLabel should make correct API requests", async () => {
    let lastUrl = "";
    let lastMethod = "";
    let lastBody: any = null;

    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      lastUrl = url;
      lastMethod = init?.method || "GET";
      if (init?.body) lastBody = JSON.parse(init.body as string);

      if (url.includes("/labels")) {
        if (lastMethod === "GET") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ labels: [{ id: "INBOX", name: "Inbox", type: "system" }] })
          });
        } else if (lastMethod === "POST") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: "Label_Custom", name: "Custom", type: "user" })
          });
        } else if (lastMethod === "DELETE") {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve("")
          });
        }
      }
      return Promise.resolve({ ok: false });
    }) as any;

    // Test listLabels
    const listRes = await gmailClient.listLabels(ownerUser.id);
    expect(lastUrl).toContain("/labels");
    expect(lastMethod).toBe("GET");
    expect(listRes.labels.length).toBe(1);

    // Test createLabel
    const createRes = await gmailClient.createLabel(ownerUser.id, "Adarsh Customs");
    expect(lastUrl).toContain("/labels");
    expect(lastMethod).toBe("POST");
    expect(lastBody.name).toBe("Adarsh Customs");
    expect(createRes.id).toBe("Label_Custom");

    // Test deleteLabel
    const deleteRes = await gmailClient.deleteLabel(ownerUser.id, "Label_Custom");
    expect(lastUrl).toContain("/labels/Label_Custom");
    expect(lastMethod).toBe("DELETE");
    expect(deleteRes).toBe(true);
  });

  it("7. Gmail getThread should parse and extract List-Unsubscribe header correctly", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/threads/thread-123")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "thread-123",
              messages: [
                {
                  id: "msg-123",
                  threadId: "thread-123",
                  snippet: "Newsletter body snippet",
                  payload: {
                    headers: [
                      { name: "From", value: "newsletter@example.com" },
                      { name: "Subject", value: "Daily update" },
                      { name: "List-Unsubscribe", value: "<https://example.com/unsubscribe>, <mailto:unsubscribe@example.com>" }
                    ],
                    mimeType: "text/plain",
                    body: { data: Buffer.from("Promo content").toString("base64url") },
                  },
                },
              ],
            }),
        });
      }
      return Promise.resolve({ ok: false });
    }) as any;

    const thread = await gmailClient.getThread(ownerUser.id, "thread-123");
    expect(thread.messages[0].listUnsubscribe).toBe("<https://example.com/unsubscribe>, <mailto:unsubscribe@example.com>");
  });
});
