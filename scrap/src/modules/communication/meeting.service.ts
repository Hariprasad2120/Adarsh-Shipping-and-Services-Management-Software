"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { getNow } from "@/lib/clock";
import { createCommunicationAuditLog } from "./communication-audit.service";

export async function listMeetings(userId: string, orgId: string) {
  await requirePermission(userId, "communication.calendar.access");

  return db.meeting.findMany({
    where: { orgId },
    include: {
      host: { select: { id: true, name: true, photo: true } },
      participants: true,
    },
    orderBy: { startAt: "desc" },
  });
}

export async function createInstantMeeting(
  userId: string,
  orgId: string,
  title: string,
  agenda?: string,
  linkedRecordType?: string,
  linkedRecordId?: string
) {
  await requirePermission(userId, "communication.calendar.access");

  const startAt = await getNow();
  const endAt = new Date(startAt.getTime() + 60 * 60 * 1000); // 1 hour duration default
  const roomName = `monolith-instant-${Math.random().toString(36).substring(2, 15)}`;
  const link = `https://meet.jit.si/${roomName}`;

  const meeting = await db.meeting.create({
    data: {
      orgId,
      title,
      agenda,
      link,
      hostId: userId,
      startAt,
      endAt,
      linkedRecordType,
      linkedRecordId,
    },
    include: {
      host: { select: { id: true, name: true, photo: true } },
    },
  });

  await createCommunicationAuditLog(orgId, userId, "CREATE_INSTANT_MEETING", {
    meetingId: meeting.id,
    title,
  });

  return meeting;
}

export async function getMeeting(userId: string, orgId: string, meetingId: string) {
  await requirePermission(userId, "communication.calendar.access");

  return db.meeting.findUniqueOrThrow({
    where: { id: meetingId, orgId },
    include: {
      host: { select: { id: true, name: true, photo: true } },
      participants: {
        include: {
          user: { select: { id: true, name: true, photo: true } },
        },
      },
      notes: {
        include: {
          author: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function addParticipantToMeeting(
  userId: string | null,
  orgId: string,
  meetingId: string,
  name: string
) {
  const joinedAt = await getNow();

  // Check if participant is already logged
  const existing = await db.meetingParticipant.findFirst({
    where: {
      meetingId,
      orgId,
      OR: [
        userId ? { userId } : undefined,
        { name },
      ].filter(Boolean) as any,
    },
  });

  if (existing) {
    return db.meetingParticipant.update({
      where: { id: existing.id },
      data: {
        joinedAt,
        attended: true,
      },
    });
  }

  return db.meetingParticipant.create({
    data: {
      orgId,
      meetingId,
      userId,
      name,
      joinedAt,
      attended: true,
    },
  });
}

export async function logParticipantLeave(
  orgId: string,
  meetingId: string,
  participantId: string
) {
  const leftAt = await getNow();
  return db.meetingParticipant.update({
    where: { id: participantId, orgId },
    data: { leftAt },
  });
}

export async function addMeetingNote(
  userId: string,
  orgId: string,
  meetingId: string,
  content: string
) {
  await requirePermission(userId, "communication.calendar.access");

  const note = await db.meetingNote.create({
    data: {
      orgId,
      meetingId,
      authorId: userId,
      content,
    },
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  await createCommunicationAuditLog(orgId, userId, "ADD_MEETING_NOTE", {
    meetingId,
    noteId: note.id,
  });

  return note;
}
