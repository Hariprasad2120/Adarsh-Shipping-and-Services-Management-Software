import { getSession } from "@/lib/auth";
import { listUpcomingEvents } from "@/lib/google-calendar-client";
import {
  Calendar,
  ExternalLink,
  Users,
  Video,
} from "lucide-react";
import {
  CommunicationBadge,
  CommunicationEmptyTableRow,
  CommunicationErrorState,
  CommunicationPanel,
  CommunicationPanelHeader,
  CommunicationTable,
} from "@/components/monolith";

type CalendarEvent = Awaited<
  ReturnType<typeof listUpcomingEvents>
>[number];

function calendarMoment(value: { dateTime: string }) {
  return (
    value.dateTime ||
    ("date" in value && typeof value.date === "string" ? value.date : "")
  );
}

export default async function CalendarSyncView() {
  const session = await getSession();
  if (!session?.user) return null;

  let events: CalendarEvent[] = [];
  let errorMessage: string | null = null;

  try {
    events = await listUpcomingEvents({
      userId: session.user.id,
      maxResults: 25,
    });
  } catch (error) {
    console.error("[CalendarPortal] Error:", error);
    errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to load Google Calendar events.";
  }

  if (errorMessage) {
    return <CommunicationErrorState description={errorMessage} />;
  }

  return (
    <CommunicationPanel>
      <CommunicationPanelHeader
        eyebrow="Real-time sync"
        title="Upcoming events"
        description="The next 25 corporate schedules, operational slots, and meetings from Google Calendar."
        actions={<Calendar aria-hidden="true" />}
      />
      <CommunicationTable>
        <thead>
          <tr>
            <th>Event</th>
            <th>Timeline</th>
            <th>Attendees</th>
            <th>Meet</th>
            <th>Calendar</th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <CommunicationEmptyTableRow colSpan={5}>
              No upcoming calendar events found.
            </CommunicationEmptyTableRow>
          ) : (
            events.map((event) => {
              const start = new Date(calendarMoment(event.start));
              const end = new Date(calendarMoment(event.end));
              const isAllDay = !event.start.dateTime;

              return (
                <tr key={event.id}>
                  <td>
                    <strong>{event.summary}</strong>
                  </td>
                  <td>
                    {isAllDay ? (
                      <CommunicationBadge>
                        {start.toLocaleDateString()} · All day
                      </CommunicationBadge>
                    ) : (
                      <>
                        <strong>
                          {start.toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                          })}
                          ,{" "}
                          {start.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </strong>
                        <small>
                          {Math.round((end.getTime() - start.getTime()) / 60000)}{" "}
                          minutes
                        </small>
                      </>
                    )}
                  </td>
                  <td>
                    <span>
                      <Users aria-hidden="true" />
                      {event.attendees?.length ?? 0} invited
                    </span>
                  </td>
                  <td>
                    {event.meetLink ? (
                      <a
                        href={event.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mnx-communication-record-link"
                      >
                        <Video aria-hidden="true" />
                        Join Meet
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {event.htmlLink ? (
                      <a
                        href={event.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mnx-communication-record-link"
                      >
                        Open
                        <ExternalLink aria-hidden="true" />
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </CommunicationTable>
    </CommunicationPanel>
  );
}
