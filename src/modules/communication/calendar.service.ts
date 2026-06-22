"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { getNow } from "@/lib/clock";
import { notifyCalendarInvite } from "./communication-notification.service";
import { createCommunicationAuditLog } from "./communication-audit.service";

export async function listCalendars(userId: string, orgId: string) {
  await requirePermission(userId, "communication.calendar.access");

  // Fetch department user is in
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { departmentId: true },
  });

  return db.calendar.findMany({
    where: {
      orgId,
      OR: [
        { userId }, // personal
        { type: "COMPANY" },
        { departmentId: user?.departmentId || undefined },
      ],
    },
  });
}

export async function getOrCreatePersonalCalendar(userId: string, orgId: string) {
  await requirePermission(userId, "communication.calendar.access");

  let personal = await db.calendar.findFirst({
    where: { orgId, userId, type: "PERSONAL" },
  });

  if (!personal) {
    personal = await db.calendar.create({
      data: {
        orgId,
        userId,
        name: "My Calendar",
        type: "PERSONAL",
      },
    });
  }

  return personal;
}

export async function listEvents(
  userId: string,
  orgId: string,
  calendarId: string,
  startAt: Date,
  endAt: Date
) {
  await requirePermission(userId, "communication.calendar.access");

  return db.calendarEvent.findMany({
    where: {
      orgId,
      calendarId,
      startAt: { gte: startAt },
      endAt: { lte: endAt },
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      attendees: {
        include: {
          user: { select: { id: true, name: true, photo: true } },
        },
      },
      meeting: true,
    },
  });
}

export async function createEvent(
  userId: string,
  orgId: string,
  data: {
    calendarId: string;
    title: string;
    description?: string;
    startAt: Date;
    endAt: Date;
    isAllDay?: boolean;
    recurrence?: string;
    location?: string;
    resourceId?: string; // Meeting Room Id
    attendeeEmails?: string[];
    createMeetingLink?: boolean;
  }
) {
  await requirePermission(userId, "communication.calendar.access");

  const creator = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true },
  });

  // 1. Check for Room Resource booking conflicts
  if (data.resourceId) {
    const conflict = await db.calendarEvent.findFirst({
      where: {
        orgId,
        resourceId: data.resourceId,
        OR: [
          {
            startAt: { lt: data.endAt },
            endAt: { gt: data.startAt },
          },
        ],
      },
    });

    if (conflict) {
      throw new Error(`Conflict: Room resource is already booked for this timeframe by event: "${conflict.title}"`);
    }
  }

  const event = await db.$transaction(async (tx) => {
    const event = await tx.calendarEvent.create({
      data: {
        orgId,
        calendarId: data.calendarId,
        title: data.title,
        description: data.description,
        startAt: data.startAt,
        endAt: data.endAt,
        isAllDay: data.isAllDay ?? false,
        recurrence: data.recurrence,
        location: data.location,
        resourceId: data.resourceId,
        createdById: userId,
      },
    });

    // 2. Add Attendees
    const emails = data.attendeeEmails || [];
    if (emails.length > 0) {
      // Find matching users in org
      const matchedUsers = await tx.user.findMany({
        where: { orgId, email: { in: emails } },
        select: { id: true, email: true },
      });

      const userMap = new Map(matchedUsers.map((u) => [u.email, u.id]));

      await tx.calendarEventAttendee.createMany({
        data: emails.map((email) => ({
          orgId,
          eventId: event.id,
          email,
          userId: userMap.get(email) || null,
          status: email === creator.name ? "ACCEPTED" : "PENDING",
        })),
      });

      // Dispatch notifications to Monolith users
      const recipientIds = matchedUsers.filter((u) => u.id !== userId).map((u) => u.id);
      if (recipientIds.length > 0) {
        await notifyCalendarInvite(orgId, creator.name, recipientIds, data.title, event.id);
      }
    }

    // 3. Create Jitsi Meet link if checked
    if (data.createMeetingLink) {
      const roomName = `monolith-${event.id}`;
      const jitsiServer = "https://meet.jit.si";
      const link = `${jitsiServer}/${roomName}`;

      await tx.meeting.create({
        data: {
          orgId,
          eventId: event.id,
          title: data.title,
          link,
          hostId: userId,
          startAt: data.startAt,
          endAt: data.endAt,
        },
      });
    }

    return event;
  });

  // Google Calendar Integration Sync
  try {
    const googleAccount = await db.mailAccount.findFirst({
      where: { userId, orgId, provider: "GOOGLE", isActive: true },
    });

    if (googleAccount && googleAccount.accessToken) {
      const { refreshGoogleToken } = require("./gmail-sync.service");
      let token = googleAccount.accessToken;
      const now = await getNow();
      if (googleAccount.tokenExpiresAt && googleAccount.tokenExpiresAt.getTime() - now.getTime() < 120000) {
        const refreshedToken = await refreshGoogleToken(googleAccount.id, orgId);
        if (refreshedToken) token = refreshedToken;
      }

      console.log(`[Google Calendar] Syncing event: ${data.title}`);
      const gRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: data.title,
          description: data.description || "",
          location: data.location || "",
          start: { dateTime: data.startAt.toISOString() },
          end: { dateTime: data.endAt.toISOString() },
          attendees: data.attendeeEmails?.map((email) => ({ email })),
          conferenceData: data.createMeetingLink ? {
            createRequest: {
              requestId: `meet_${event.id}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          } : undefined,
        }),
      });

      if (gRes.ok) {
        const gEvent = await gRes.json();
        const meetEntryPoint = gEvent.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === "video");
        const hangoutLink = meetEntryPoint?.uri || gEvent.hangoutLink || gEvent.htmlLink;
        if (hangoutLink) {
          await db.meeting.upsert({
            where: { eventId: event.id },
            update: { link: hangoutLink },
            create: {
              orgId,
              eventId: event.id,
              title: data.title,
              link: hangoutLink,
              hostId: userId,
              startAt: data.startAt,
              endAt: data.endAt,
            },
          });
        }
      } else {
        const errJson = await gRes.json();
        console.error("[Google Calendar] API error response:", errJson);
      }
    }
  } catch (err: any) {
    console.error("[Google Calendar] Ingestion exception:", err.message);
  }

  await createCommunicationAuditLog(orgId, userId, "CREATE_CALENDAR_EVENT", {
    eventId: event.id,
    title: data.title,
  });

  return event;
}

export async function respondToEventInvite(
  userId: string,
  orgId: string,
  eventId: string,
  email: string,
  status: string
) {
  await requirePermission(userId, "communication.calendar.access");

  const attendee = await db.calendarEventAttendee.findFirst({
    where: { eventId, email, orgId },
  });

  if (!attendee) {
    throw new Error("Invitation not found");
  }

  return db.calendarEventAttendee.update({
    where: { id: attendee.id },
    data: { status },
  });
}

export async function deleteEvent(userId: string, orgId: string, eventId: string) {
  await requirePermission(userId, "communication.calendar.access");

  const event = await db.calendarEvent.findUniqueOrThrow({
    where: { id: eventId, orgId },
  });

  if (event.createdById !== userId) {
    throw new Error("Unauthorized to delete this event");
  }

  await db.calendarEvent.delete({
    where: { id: eventId },
  });

  await createCommunicationAuditLog(orgId, userId, "DELETE_CALENDAR_EVENT", { eventId });
  return { success: true };
}

export async function listCalendarResources(userId: string, orgId: string) {
  await requirePermission(userId, "communication.calendar.access");

  return db.calendarResource.findMany({
    where: { orgId, isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function createCalendarResource(
  userId: string,
  orgId: string,
  data: { name: string; type: string; capacity?: number }
) {
  await requirePermission(userId, "communication.calendar.manage_resources");

  return db.calendarResource.create({
    data: {
      orgId,
      name: data.name,
      type: data.type,
      capacity: data.capacity,
    },
  });
}
