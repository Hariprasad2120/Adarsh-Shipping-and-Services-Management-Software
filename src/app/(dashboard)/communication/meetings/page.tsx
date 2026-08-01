import { getSession } from "@/lib/auth";
import { createEvent, listUpcomingEvents } from "@/lib/google-calendar-client";
import { revalidatePath } from "next/cache";
import { Calendar, Users, Video } from "lucide-react";
import { CommunicationButton, CommunicationField, CommunicationInput, CommunicationPanel, CommunicationPanelHeader, CommunicationTextarea } from "@/modules/communication/components/workspace/communication-workspace";
import { WorkspaceState } from "@/components/layout/workspace";

type Meeting = Awaited<ReturnType<typeof listUpcomingEvents>>[number];

function calendarMoment(value: { dateTime: string }) {
  return (
    value.dateTime ||
    ("date" in value && typeof value.date === "string" ? value.date : "")
  );
}

export default async function MeetingsPortal() {
  const session = await getSession();
  if (!session?.user) return null;

  let meetings: Meeting[] = [];
  try {
    meetings = await listUpcomingEvents({
      userId: session.user.id,
      maxResults: 10,
    });
  } catch (error) {
    console.error("[MeetingsPortal] Error loading events:", error);
  }

  async function scheduleMeetingAction(formData: FormData) {
    "use server";
    const activeSession = await getSession();
    if (!activeSession?.user) return;

    const summary = formData.get("summary") as string;
    const description = formData.get("description") as string;
    const startValue = formData.get("startAt") as string;
    const endValue = formData.get("endAt") as string;
    const attendeesValue = formData.get("attendeeEmails") as string;
    const attendeeEmails = attendeesValue
      ? attendeesValue
          .split(",")
          .map((email) => email.trim())
          .filter(Boolean)
      : [];

    if (!summary || !startValue || !endValue) return;

    try {
      await createEvent({
        userId: activeSession.user.id,
        summary,
        description: description || undefined,
        startAt: new Date(startValue),
        endAt: new Date(endValue),
        attendeeEmails,
      });
    } catch (error) {
      console.error("[MeetingsPortal] Failed to create event:", error);
    }

    revalidatePath("/communication/meetings");
  }

  return (
    <div className="mnx-communication-split">
      <CommunicationPanel>
        <CommunicationPanelHeader
          eyebrow="Scheduler"
          title="Schedule a meeting"
          description="Create an event and provision a Google Meet room for client or team coordination."
          actions={<Video aria-hidden="true" />}
        />
        <form
          action={scheduleMeetingAction}
          className="mnx-communication-form"
        >
          <CommunicationField label="Meeting title" required>
            <CommunicationInput
              type="text"
              name="summary"
              placeholder="Shipping status update with Madras Steel"
              required
            />
          </CommunicationField>
          <CommunicationField label="Description">
            <CommunicationTextarea
              name="description"
              placeholder="Outline the agenda, shipment details, or document issues."
              rows={4}
            />
          </CommunicationField>
          <div className="mnx-communication-field-grid">
            <CommunicationField label="Start time (Asia/Kolkata)" required>
              <CommunicationInput
                type="datetime-local"
                name="startAt"
                required
              />
            </CommunicationField>
            <CommunicationField label="End time (Asia/Kolkata)" required>
              <CommunicationInput type="datetime-local" name="endAt" required />
            </CommunicationField>
          </div>
          <CommunicationField
            label="Attendees"
            hint="Use comma-separated email addresses. Invitees receive the generated Meet link."
          >
            <CommunicationInput
              type="text"
              name="attendeeEmails"
              placeholder="client@example.com, colleague@example.com"
            />
          </CommunicationField>
          <div className="mnx-communication-form-actions">
            <CommunicationButton type="submit" variant="primary">
              <Video aria-hidden="true" />
              Schedule and create Meet
            </CommunicationButton>
          </div>
        </form>
      </CommunicationPanel>

      <CommunicationPanel>
        <CommunicationPanelHeader
          eyebrow="Calendar"
          title="Upcoming rooms"
          description="The next ten connected meetings."
          actions={<Calendar aria-hidden="true" />}
        />
        {meetings.length === 0 ? (
          <WorkspaceState
            variant="empty"
            eyebrow="Meetings"
            title="No upcoming meetings"
            description="Scheduled rooms will appear here."
            icon={<Video aria-hidden="true" />}
          />
        ) : (
          <div className="mnx-communication-record-list">
            {meetings.map((meeting) => (
              <article key={meeting.id} className="mnx-communication-record">
                <div>
                  <strong>{meeting.summary}</strong>
                  <small>
                    {new Date(calendarMoment(meeting.start)).toLocaleString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "short",
                    })}
                  </small>
                </div>
                <span>
                  <Users aria-hidden="true" />
                  {meeting.attendees?.length ?? 0}
                </span>
                {meeting.meetLink ? (
                  <a
                    href={meeting.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mnx-communication-record-link"
                  >
                    Join
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </CommunicationPanel>
    </div>
  );
}
