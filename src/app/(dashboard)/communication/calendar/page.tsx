import { getSession } from "@/lib/auth";
import { listUpcomingEvents } from "@/lib/google-calendar-client";
import { Calendar } from "lucide-react";
import {
  CommunicationErrorState,
  CommunicationPanel,
  CommunicationPanelHeader,
} from "@/modules/communication/components/workspace/communication-workspace";
import {
  CalendarMonthView,
  type CalendarViewEvent,
} from "@/modules/communication/components/calendar-month-view";

export default async function CalendarSyncView() {
  const session = await getSession();
  if (!session?.user) return null;

  let events: CalendarViewEvent[] = [];
  let errorMessage: string | null = null;

  try {
    const raw = await listUpcomingEvents({
      userId: session.user.id,
      maxResults: 100,
    });
    events = raw.map((event) => ({
      id: event.id,
      summary: event.summary,
      start: event.start,
      end: event.end,
      htmlLink: event.htmlLink,
      meetLink: event.meetLink,
      attendeeCount: event.attendees?.length ?? 0,
    }));
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
        title="Workspace calendar"
        description="Upcoming Google Calendar events, meetings, and operational slots on a month view. Select a day to see its schedule."
        actions={<Calendar aria-hidden="true" />}
      />
      <CalendarMonthView events={events} />
    </CommunicationPanel>
  );
}
