import { db } from "@/lib/db";
import { writeLeaveAudit } from "@/modules/leave/audit";

/**
 * Provider-neutral outbound calendar sync (spec §37 closure-pass finding):
 * internal team-calendar display already exists (Phase 9, team-calendar
 * page) and meets the spec's stated minimum bar. What was genuinely
 * missing is the OUTBOUND adapter — pushing an approved leave request into
 * the employee's own external calendar so it shows up next to their real
 * meetings. This interface is the leave-side contract; CalendarSyncAdapter
 * implementations are swappable per provider. Google is implemented here
 * because a working Google Calendar client + OAuth token flow already
 * exists in this codebase (src/lib/google-calendar-client.ts, used by the
 * Communication module's meetings feature) — this was NOT a case of "no
 * provider infrastructure exists", contrary to an earlier, incorrect
 * closure-pass finding. A Microsoft/O365 adapter implementing the same
 * interface is a real remaining gap — no O365 client or OAuth flow exists
 * anywhere in this codebase, which IS a genuine absent-infrastructure
 * block per spec §37's own carve-out, not glossed over.
 */
export interface CalendarSyncAdapter {
  readonly provider: string;
  isConnected(userId: string): Promise<boolean>;
  createLeaveEvent(input: {
    userId: string;
    leaveRequestId: string;
    summary: string;
    description: string;
    startAt: Date;
    endAt: Date;
  }): Promise<{ externalEventId: string; externalUrl?: string } | null>;
  deleteLeaveEvent(input: { userId: string; externalEventId: string }): Promise<void>;
}

class GoogleCalendarSyncAdapter implements CalendarSyncAdapter {
  readonly provider = "GOOGLE";

  async isConnected(userId: string): Promise<boolean> {
    const connection = await db.googleWorkspaceConnection.findUnique({ where: { userId } });
    return !!connection;
  }

  async createLeaveEvent(input: {
    userId: string;
    leaveRequestId: string;
    summary: string;
    description: string;
    startAt: Date;
    endAt: Date;
  }) {
    const { createEvent } = await import("@/lib/google-calendar-client");
    const event = await createEvent({
      userId: input.userId,
      summary: input.summary,
      description: input.description,
      startAt: input.startAt,
      endAt: input.endAt,
      attendeeEmails: [],
    });
    return { externalEventId: event.id, externalUrl: event.htmlLink };
  }

  async deleteLeaveEvent(input: { userId: string; externalEventId: string }): Promise<void> {
    const { getValidAccessToken } = await import("@/lib/workspace-oauth");
    const token = await getValidAccessToken(input.userId);
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${input.externalEventId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    // 404/410 = already gone (idempotent), 2xx = deleted. Anything else is real.
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      const body = await res.text();
      throw new Error(`Calendar deleteEvent failed: ${body}`);
    }
  }
}

const ADAPTERS: CalendarSyncAdapter[] = [new GoogleCalendarSyncAdapter()];

/**
 * Syncs an approved leave request to whichever external calendar provider
 * the employee has actually connected (checked per-adapter — if the
 * employee hasn't connected Google Workspace, isConnected() returns false
 * and this is a silent, expected no-op, not an error). Best-effort: never
 * throws into the caller, since a calendar-sync failure must never block
 * or roll back a leave approval. Stores the external event id so it can
 * be cleaned up on cancellation.
 */
export async function syncLeaveRequestToExternalCalendar(input: {
  userId: string;
  orgId: string;
  leaveRequestId: string;
  leaveTypeName: string;
  fromDate: Date;
  toDate: Date;
}): Promise<void> {
  for (const adapter of ADAPTERS) {
    try {
      const connected = await adapter.isConnected(input.userId);
      if (!connected) continue;

      const endAt = new Date(input.toDate);
      endAt.setUTCDate(endAt.getUTCDate() + 1); // all-day event convention: end is exclusive

      const event = await adapter.createLeaveEvent({
        userId: input.userId,
        leaveRequestId: input.leaveRequestId,
        summary: `On leave: ${input.leaveTypeName}`,
        description: `Approved leave request. Managed by Monolith Leave Management — do not edit dates here.`,
        startAt: input.fromDate,
        endAt,
      });
      if (!event) continue;

      await db.leaveRequest.update({
        where: { id: input.leaveRequestId },
        data: { externalCalendarProvider: adapter.provider, externalCalendarEventId: event.externalEventId },
      });
    } catch (error) {
      // Best-effort — log via audit, never surface to the approval flow.
      // try/catch rather than a .catch() chain, so this stays safe even if
      // writeLeaveAudit is mocked without an explicit resolved-promise
      // return value (its real signature is Promise<void>, but a bare
      // vi.fn() mock returns undefined synchronously by default).
      try {
        await writeLeaveAudit({
          orgId: input.orgId,
          userId: input.userId,
          action: "LEAVE_CALENDAR_SYNC_FAILED",
          details: {
            requestId: input.leaveRequestId,
            provider: adapter.provider,
            message: error instanceof Error ? error.message : String(error),
          },
        });
      } catch {
        // Audit logging itself failed — nothing more can be done here
        // without risking throwing out of a best-effort sync path.
      }
    }
  }
}

/** Reverses a prior sync when a leave request is cancelled/rejected after being synced. Best-effort, same reasoning as the forward path. */
export async function removeLeaveRequestFromExternalCalendar(input: {
  userId: string;
  orgId: string;
  leaveRequestId: string;
}): Promise<void> {
  const request = await db.leaveRequest.findUnique({
    where: { id: input.leaveRequestId },
    select: { externalCalendarProvider: true, externalCalendarEventId: true },
  });
  if (!request?.externalCalendarProvider || !request.externalCalendarEventId) return;

  const adapter = ADAPTERS.find((a) => a.provider === request.externalCalendarProvider);
  if (!adapter) return;

  try {
    await adapter.deleteLeaveEvent({ userId: input.userId, externalEventId: request.externalCalendarEventId });
    await db.leaveRequest.update({
      where: { id: input.leaveRequestId },
      data: { externalCalendarProvider: null, externalCalendarEventId: null },
    });
  } catch (error) {
    try {
      await writeLeaveAudit({
        orgId: input.orgId,
        userId: input.userId,
        action: "LEAVE_CALENDAR_SYNC_REMOVAL_FAILED",
        details: {
          requestId: input.leaveRequestId,
          provider: adapter.provider,
          message: error instanceof Error ? error.message : String(error),
        },
      });
    } catch {
      // Same reasoning as the forward path — never throw out of a
      // best-effort removal, even if audit logging itself fails.
    }
  }
}
