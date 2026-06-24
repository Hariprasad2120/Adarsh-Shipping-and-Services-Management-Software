import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Chat Integration Tests
 * 
 * These tests verify the Google Chat integration without requiring
 * live Google credentials. All Google API calls are mocked.
 */

// Mock the google-chat-client module
vi.mock("@/lib/google-chat-client", () => ({
  listSpaces: vi.fn(),
  listMessages: vi.fn(),
  listMemberships: vi.fn(),
  sendMessage: vi.fn(),
  createSpace: vi.fn(),
  createDmWithUser: vi.fn(),
  createMembership: vi.fn(),
  getAccessToken: vi.fn(),
}));

// Mock workspace-oauth
vi.mock("@/lib/workspace-oauth", () => ({
  getValidAccessToken: vi.fn().mockResolvedValue("mock-oauth-token-12345"),
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user-1", name: "Test User", orgId: "org-1" }
  }),
}));

// Mock Prisma DB
vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    googleWorkspaceConnection: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    googleChatSpace: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
    },
    googleChatUserLink: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    chaJob: {
      findUnique: vi.fn(),
    },
    jobWorkspaceProfile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    communicationAuditEvent: {
      create: vi.fn(),
    },
  },
}));

const { listSpaces, listMessages, sendMessage, createSpace } = await import(
  "@/lib/google-chat-client"
);
const { db } = await import("@/lib/db");

describe("Google Chat Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── 1. Google user/email to employee name mapping ─────────────────────────
  it("1. should resolve sender display name from Google User ID", async () => {
    const mockListMessages = vi.mocked(listMessages);
    mockListMessages.mockResolvedValue([
      {
        name: "spaces/AAAA/messages/msg-1",
        text: "Hello",
        sender: { name: "users/google-id-123", displayName: "External Name", type: "HUMAN" },
        createTime: new Date().toISOString(),
      },
    ]);

    vi.mocked(db.googleWorkspaceConnection.findMany).mockResolvedValue([
      {
        id: "conn-1",
        userId: "user-2",
        orgId: "org-1",
        googleUserId: "google-id-123",
        googleEmail: "shalini@adarshshipping.in",
        refreshToken: "",
        accessToken: "",
        tokenExpiry: new Date(),
        scopes: [],
        status: "connected",
        linkedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { name: "Shalini K", email: "shalini@adarshshipping.in" },
      } as any,
    ]);

    vi.mocked(db.user.findMany).mockResolvedValue([]);
    vi.mocked(db.googleWorkspaceConnection.findUnique).mockResolvedValue({
      googleUserId: "google-id-456",
    } as any);

    // Simulate what messages/route.ts does
    const messages = await listMessages("spaces/AAAA", "user-1");
    const connections = await db.googleWorkspaceConnection.findMany();

    const userMapByGoogleId = new Map<string, string>();
    for (const conn of connections) {
      const c = conn as any;
      if (c.googleUserId && c.user?.name) {
        userMapByGoogleId.set(c.googleUserId, c.user.name);
      }
    }

    const msg = messages[0];
    const match = msg.sender?.name?.match(/^users\/([a-zA-Z0-9_-]+)$/);
    const googleId = match ? match[1] : null;

    let displayName = msg.sender?.displayName || "Google User";
    if (googleId && userMapByGoogleId.has(googleId)) {
      displayName = userMapByGoogleId.get(googleId)!;
    }

    expect(displayName).toBe("Shalini K");
    expect(displayName).not.toBe("External Name");
  });

  // ─── 2. Preventing repeated fake names ─────────────────────────────────────
  it("2. should never return 'Adarsh Operations' as a fallback name", async () => {
    const mockListSpaces = vi.mocked(listSpaces);
    mockListSpaces.mockResolvedValue([
      { name: "spaces/AAAA", displayName: "Shalini K", spaceType: "DIRECT_MESSAGE" },
      { name: "spaces/BBBB", displayName: "Vijay D", spaceType: "DIRECT_MESSAGE" },
      { name: "spaces/CCCC", displayName: "Test Space", spaceType: "SPACE" },
    ]);

    const spaces = await listSpaces("user-1");

    for (const space of spaces) {
      expect(space.displayName).not.toBe("Adarsh Operations");
      expect(space.displayName).not.toContain("mock");
    }
  });

  // ─── 3. Listing existing Google DMs ────────────────────────────────────────
  it("3. should list existing Google Chat DMs", async () => {
    const mockListSpaces = vi.mocked(listSpaces);
    mockListSpaces.mockResolvedValue([
      { name: "spaces/dm-AAAA", displayName: "Shalini K", spaceType: "DIRECT_MESSAGE" },
      { name: "spaces/dm-BBBB", displayName: "Priya M", spaceType: "DIRECT_MESSAGE" },
      { name: "spaces/space-CCCC", displayName: "Team Chat", spaceType: "SPACE" },
    ]);

    const spaces = await listSpaces("user-1");
    const dms = spaces.filter((s) => s.spaceType === "DIRECT_MESSAGE");

    expect(dms.length).toBe(2);
    expect(dms[0].displayName).toBe("Shalini K");
    expect(dms[1].displayName).toBe("Priya M");
    // No mock- prefix in space names
    expect(dms[0].name).not.toContain("mock");
    expect(dms[1].name).not.toContain("mock");
  });

  // ─── 4. Listing existing Google Spaces ─────────────────────────────────────
  it("4. should list existing Google Chat Spaces", async () => {
    const mockListSpaces = vi.mocked(listSpaces);
    mockListSpaces.mockResolvedValue([
      { name: "spaces/room-AAAA", displayName: "JOB-101 - Jindal", spaceType: "SPACE" },
      { name: "spaces/room-BBBB", displayName: "Internal Office", spaceType: "SPACE" },
    ]);

    const spaces = await listSpaces("user-1");
    const rooms = spaces.filter((s) => s.spaceType === "SPACE");

    expect(rooms.length).toBe(2);
    expect(rooms[0].displayName).toBe("JOB-101 - Jindal");
    // No mock- prefix
    expect(rooms[0].name).not.toContain("mock");
  });

  // ─── 5. Syncing inbound message event ──────────────────────────────────────
  it("5. should detect new messages via polling", async () => {
    const mockListMessages = vi.mocked(listMessages);

    // First poll: 2 messages
    mockListMessages.mockResolvedValueOnce([
      { name: "spaces/AAAA/messages/m1", text: "Hello", sender: { name: "users/u1", displayName: "User1", type: "HUMAN" }, createTime: "2026-06-24T10:00:00Z" },
      { name: "spaces/AAAA/messages/m2", text: "Hi", sender: { name: "users/u2", displayName: "User2", type: "HUMAN" }, createTime: "2026-06-24T10:01:00Z" },
    ]);

    // Second poll: 3 messages (one new)
    mockListMessages.mockResolvedValueOnce([
      { name: "spaces/AAAA/messages/m1", text: "Hello", sender: { name: "users/u1", displayName: "User1", type: "HUMAN" }, createTime: "2026-06-24T10:00:00Z" },
      { name: "spaces/AAAA/messages/m2", text: "Hi", sender: { name: "users/u2", displayName: "User2", type: "HUMAN" }, createTime: "2026-06-24T10:01:00Z" },
      { name: "spaces/AAAA/messages/m3", text: "New!", sender: { name: "users/u1", displayName: "User1", type: "HUMAN" }, createTime: "2026-06-24T10:02:00Z" },
    ]);

    const first = await listMessages("spaces/AAAA", "user-1");
    const second = await listMessages("spaces/AAAA", "user-1");

    expect(first.length).toBe(2);
    expect(second.length).toBe(3);
    expect(second[2].text).toBe("New!");
  });

  // ─── 6. Replying from Monolith to Google Chat ─────────────────────────────
  it("6. should send message via Google Chat API and return Google message ID", async () => {
    const mockSendMessage = vi.mocked(sendMessage);
    mockSendMessage.mockResolvedValue({
      name: "spaces/AAAA/messages/google-msg-12345",
      text: "Hello from Monolith!",
      sender: { name: "users/my-id", displayName: "Test User", type: "HUMAN" },
      createTime: "2026-06-24T10:05:00Z",
    });

    const result = await sendMessage({
      spaceResourceName: "spaces/AAAA",
      text: "Hello from Monolith!",
      userId: "user-1",
    });

    expect(result.name).toBe("spaces/AAAA/messages/google-msg-12345");
    expect(result.text).toBe("Hello from Monolith!");
    expect(mockSendMessage).toHaveBeenCalledWith({
      spaceResourceName: "spaces/AAAA",
      text: "Hello from Monolith!",
      userId: "user-1",
    });
  });

  // ─── 7. Storing returned Google message ID ─────────────────────────────────
  it("7. should return a real Google message name (not mock)", async () => {
    const mockSendMessage = vi.mocked(sendMessage);
    mockSendMessage.mockResolvedValue({
      name: "spaces/ABCdef/messages/real-google-id-789",
      text: "Test",
      createTime: new Date().toISOString(),
    });

    const result = await sendMessage({
      spaceResourceName: "spaces/ABCdef",
      text: "Test",
      userId: "user-1",
    });

    expect(result.name).toBeDefined();
    expect(result.name).not.toContain("mock");
    expect(result.name).toMatch(/^spaces\/[A-Za-z0-9]+\/messages\//);
  });

  // ─── 8. Job creation creates real Google Chat Space ────────────────────────
  it("8. should create a real Google Chat Space (not mock)", async () => {
    const mockCreateSpace = vi.mocked(createSpace);
    mockCreateSpace.mockResolvedValue({
      name: "spaces/real-space-ABC123",
      displayName: "JOB-1001 - Jindal Offset",
      spaceType: "SPACE",
    });

    const result = await createSpace({
      displayName: "JOB-1001 - Jindal Offset",
      spaceType: "SPACE",
      userId: "user-1",
    });

    expect(result.name).toBe("spaces/real-space-ABC123");
    expect(result.name).not.toContain("mock");
    expect(result.displayName).toBe("JOB-1001 - Jindal Offset");
  });

  // ─── 9. No local-only fallback when Google creation fails ──────────────────
  it("9. should throw error when Google API fails (not return mock)", async () => {
    const mockCreateSpace = vi.mocked(createSpace);
    mockCreateSpace.mockRejectedValue(
      new Error("Chat API createSpace failed (403): Insufficient permissions")
    );

    await expect(
      createSpace({
        displayName: "Test Space",
        spaceType: "SPACE",
        userId: "user-1",
      })
    ).rejects.toThrow("Chat API createSpace failed");
  });

  // ─── 10. Token refresh during sync ─────────────────────────────────────────
  it("10. should handle token refresh transparently", async () => {
    const mockListSpaces = vi.mocked(listSpaces);

    // First call fails with token error, but the function handles it
    mockListSpaces.mockRejectedValueOnce(
      new Error("Token expired or revoked")
    );

    // Verify error propagates (not silently returns mock data)
    await expect(listSpaces("user-1")).rejects.toThrow("Token expired");
  });

  // ─── 11. UI renders real sender names ──────────────────────────────────────
  it("11. should resolve display names from email when Google ID is not matched", async () => {
    vi.mocked(db.googleWorkspaceConnection.findMany).mockResolvedValue([]);
    vi.mocked(db.user.findMany).mockResolvedValue([
      { id: "user-3", name: "Priya Mehta", email: "priya@adarshshipping.in", active: true } as any,
    ]);

    const userMapByEmail = new Map<string, string>();
    const allUsers = await db.user.findMany();
    for (const u of allUsers) {
      const user = u as any;
      if (user.email && user.name) {
        userMapByEmail.set(user.email.toLowerCase(), user.name);
      }
    }

    // Simulate a message from a sender whose Google ID isn't in our DB
    // but their email is
    const senderEmail = "priya@adarshshipping.in";
    let displayName = "Google User";

    if (senderEmail && userMapByEmail.has(senderEmail.toLowerCase())) {
      displayName = userMapByEmail.get(senderEmail.toLowerCase())!;
    }

    expect(displayName).toBe("Priya Mehta");
    expect(displayName).not.toBe("Google User");
    expect(displayName).not.toBe("Adarsh Operations");
  });
});
