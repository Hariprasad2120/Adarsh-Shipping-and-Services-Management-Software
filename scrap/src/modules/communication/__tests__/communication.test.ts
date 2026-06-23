import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { getOrCreatePersonalCalendar, createEvent, createCalendarResource } from "../calendar.service";
import { listConversations, createConversation, sendMessage, listChatMessages } from "../chat.service";
import { saveMailAccount, listMailAccounts } from "../mail.service";

describe("Monolith Communication Hub Integration Tests", () => {
  let orgA: any;
  let orgB: any;
  let userA: any;
  let userB: any;
  let roleA: any;
  let roleB: any;

  beforeAll(async () => {
    // 1. Create two test organizations to check cross-org isolation
    orgA = await db.organisation.create({
      data: {
        name: "Test Comm Org A",
        slug: "test-comm-org-a-" + Date.now(),
      },
    });

    orgB = await db.organisation.create({
      data: {
        name: "Test Comm Org B",
        slug: "test-comm-org-b-" + Date.now(),
      },
    });

    // 2. Create users
    userA = await db.user.create({
      data: {
        orgId: orgA.id,
        email: `usera-${Date.now()}@example.com`,
        passwordHash: "dummy-hash",
        name: "User A",
      },
    });

    userB = await db.user.create({
      data: {
        orgId: orgB.id,
        email: `userb-${Date.now()}@example.com`,
        passwordHash: "dummy-hash",
        name: "User B",
      },
    });

    // 3. Create test roles and map all communication permissions
    roleA = await db.role.create({
      data: {
        orgId: orgA.id,
        name: "Comm Admin Role A",
      },
    });

    roleB = await db.role.create({
      data: {
        orgId: orgB.id,
        name: "Comm Admin Role B",
      },
    });

    // Link users to roles
    await db.userRole.createMany({
      data: [
        { userId: userA.id, roleId: roleA.id },
        { userId: userB.id, roleId: roleB.id },
      ],
    });

    // Ensure permissions exist and map them
    const permKeys = [
      "communication.chat.access",
      "communication.mail.access",
      "communication.mail.send",
      "communication.calendar.access",
      "communication.calendar.manage_resources",
      "communication.admin.manage"
    ];

    for (const key of permKeys) {
      let perm = await db.permission.findUnique({ where: { key } });
      if (!perm) {
        perm = await db.permission.create({
          data: { key, label: key.replace(/\./g, " "), group: "Communication" },
        });
      }

      await db.rolePermission.createMany({
        data: [
          { roleId: roleA.id, permissionId: perm.id },
          { roleId: roleB.id, permissionId: perm.id },
        ],
      });
    }
  });

  afterAll(async () => {
    // Cleanup records in reverse order
    const orgIds = [orgA.id, orgB.id];
    const userIds = [userA.id, userB.id];

    await db.chatReaction.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chatAttachment.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chatMessageRead.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chatMessage.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chatParticipant.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.chatConversation.deleteMany({ where: { orgId: { in: orgIds } } });

    await db.mailAttachment.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.mailMessage.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.mailThread.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.mailLabel.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.mailAccount.deleteMany({ where: { orgId: { in: orgIds } } });

    await db.meetingParticipant.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.meetingNote.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.meeting.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.calendarEventAttendee.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.calendarEvent.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.calendarResource.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.calendar.deleteMany({ where: { orgId: { in: orgIds } } });

    await db.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await db.rolePermission.deleteMany({
      where: {
        roleId: { in: [roleA.id, roleB.id] },
      },
    });
    await db.role.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.user.deleteMany({ where: { orgId: { in: orgIds } } });
    await db.organisation.deleteMany({ where: { id: { in: orgIds } } });
  });

  it("1. should enforce strict cross-org database isolation for chats", async () => {
    // UserA creates a private group conversation in Org A
    const convoA = await createConversation(userA.id, orgA.id, {
      name: "Secret Project Alpha Discussion",
      type: "GROUP",
      isPublic: false,
      participantUserIds: [userA.id],
    });

    expect(convoA).toBeDefined();
    expect(convoA.orgId).toBe(orgA.id);

    // UserA sends a message inside Org A's conversation
    const msgA = await sendMessage(userA.id, orgA.id, {
      conversationId: convoA.id,
      body: "Manifest reports release targets finalized.",
    });

    expect(msgA).toBeDefined();

    // UserB in Org B lists conversations, should not see convoA
    const convosB = await listConversations(userB.id, orgB.id);
    const hasConvoA = convosB.some((c) => c.id === convoA.id);
    expect(hasConvoA).toBe(false);

    // UserB tries to access messages of convoA directly, should throw participation error
    await expect(
      listChatMessages(userB.id, orgB.id, convoA.id)
    ).rejects.toThrow(/You are not a participant/i);
  });

  it("2. should allow registering inboxes and link sent messages correctly", async () => {
    const acc = await saveMailAccount(userA.id, orgA.id, {
      name: "Operations Team Box",
      email: "ops@testcomms.org",
      isShared: true,
    });

    expect(acc).toBeDefined();
    expect(acc.email).toBe("ops@testcomms.org");
    expect(acc.orgId).toBe(orgA.id);

    const accounts = await listMailAccounts(userA.id, orgA.id);
    expect(accounts.length).toBeGreaterThan(0);
    expect(accounts.some((a) => a.id === acc.id)).toBe(true);
  });

  it("3. should detect meeting resource booking conflicts", async () => {
    // Create a calendar for userA
    const cal = await getOrCreatePersonalCalendar(userA.id, orgA.id);
    expect(cal).toBeDefined();

    // Create a resource (Conference Room 102)
    const resource = await createCalendarResource(userA.id, orgA.id, {
      name: "Conference Room 102",
      type: "ROOM",
      capacity: 12,
    });

    expect(resource).toBeDefined();
    expect(resource.orgId).toBe(orgA.id);

    // Schedule meeting 1: 10:00 to 11:00 AM
    const dateStr = "2026-06-25";
    const event1 = await createEvent(userA.id, orgA.id, {
      calendarId: cal.id,
      title: "Custom Manifest Clearance Sync",
      startAt: new Date(`${dateStr}T10:00:00Z`),
      endAt: new Date(`${dateStr}T11:00:00Z`),
      resourceId: resource.id,
    });

    expect(event1).toBeDefined();

    // Schedule meeting 2: 10:30 to 11:30 AM (Conflicts with meeting 1)
    await expect(
      createEvent(userA.id, orgA.id, {
        calendarId: cal.id,
        title: "GST Invoicing Check",
        startAt: new Date(`${dateStr}T10:30:00Z`),
        endAt: new Date(`${dateStr}T11:30:00Z`),
        resourceId: resource.id,
      })
    ).rejects.toThrow(/Conflict: Room resource is already booked/i);
  });
});
