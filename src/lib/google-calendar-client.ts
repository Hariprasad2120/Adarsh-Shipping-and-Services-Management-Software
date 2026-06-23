import { getValidAccessToken } from "./workspace-oauth";

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

export type CalendarEvent = {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  htmlLink?: string;
  meetLink?: string;
  attendees?: { email: string; responseStatus?: string }[];
};

// List upcoming calendar events for the user
export async function listUpcomingEvents(params: {
  userId: string;
  maxResults?: number;
}): Promise<CalendarEvent[]> {
  const token = await getValidAccessToken(params.userId);

  const url = new URL(`${CALENDAR_API_BASE}/calendars/primary/events`);
  url.searchParams.set("timeMin", new Date().toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  if (params.maxResults) {
    url.searchParams.set("maxResults", String(params.maxResults));
  } else {
    url.searchParams.set("maxResults", "10");
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Calendar listEvents failed: ${err}`);
  }

  const data = (await res.json()) as { items?: any[] };
  const items = data.items || [];

  return items.map((item) => {
    // Extract Google Meet link if present in entry point
    let meetLink = undefined;
    const entryPoints = item.conferenceData?.entryPoints || [];
    const meetEntryPoint = entryPoints.find((ep: any) => ep.entryPointType === "video");
    if (meetEntryPoint) {
      meetLink = meetEntryPoint.uri;
    }

    return {
      id: item.id,
      summary: item.summary || "(No Title)",
      description: item.description,
      start: item.start,
      end: item.end,
      htmlLink: item.htmlLink,
      meetLink,
      attendees: (item.attendees || []).map((att: any) => ({
        email: att.email,
        responseStatus: att.responseStatus
      }))
    };
  });
}

// Create a new calendar event with an auto-provisioned Google Meet room
export async function createEvent(params: {
  userId: string;
  summary: string;
  description?: string;
  startAt: Date;
  endAt: Date;
  attendeeEmails: string[];
}): Promise<CalendarEvent> {
  const token = await getValidAccessToken(params.userId);

  const body = {
    summary: params.summary,
    description: params.description,
    start: {
      dateTime: params.startAt.toISOString(),
      timeZone: "Asia/Kolkata"
    },
    end: {
      dateTime: params.endAt.toISOString(),
      timeZone: "Asia/Kolkata"
    },
    attendees: params.attendeeEmails.map((email) => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: `meet-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        conferenceSolutionKey: {
          type: "hangoutsMeet"
        }
      }
    }
  };

  const url = new URL(`${CALENDAR_API_BASE}/calendars/primary/events`);
  url.searchParams.set("conferenceDataVersion", "1");

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Calendar createEvent failed: ${err}`);
  }

  const data = await res.json();
  
  let meetLink = undefined;
  const entryPoints = data.conferenceData?.entryPoints || [];
  const meetEntryPoint = entryPoints.find((ep: any) => ep.entryPointType === "video");
  if (meetEntryPoint) {
    meetLink = meetEntryPoint.uri;
  }

  return {
    id: data.id,
    summary: data.summary,
    description: data.description,
    start: data.start,
    end: data.end,
    htmlLink: data.htmlLink,
    meetLink,
    attendees: (data.attendees || []).map((att: any) => ({
      email: att.email,
      responseStatus: att.responseStatus
    }))
  };
}
