import { auth } from "@/lib/auth";
import { listUpcomingEvents } from "@/lib/google-calendar-client";
import { Calendar, Video, ExternalLink, Clock, Users } from "lucide-react";

export default async function CalendarSyncView() {
  const session = await auth();
  if (!session?.user) return null;

  let events: any[] = [];
  let errorMsg = null;

  try {
    events = await listUpcomingEvents({
      userId: session.user.id,
      maxResults: 25
    });
  } catch (err: any) {
    console.error("[CalendarPortal] Error:", err);
    errorMsg = err.message || "Failed to load Google Calendar events.";
  }

  return (
    <main className="space-y-6 text-left">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6 rounded-2xl border border-mono-border bg-mono-card shadow-sm text-left">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#F9D972]">Real-time Sync</span>
          <h1 className="text-xl font-bold text-mono-text mt-1">Calendar Schedule</h1>
          <p className="text-xs text-mono-muted mt-0.5">
            Synchronized timeline of corporate schedules, operational slots, and meetings.
          </p>
        </div>
      </div>

      {errorMsg ? (
        <div className="p-4 rounded-xl border border-[#D88700]/20 bg-[#D88700]/5 text-[#D88700] text-xs font-semibold">
          {errorMsg}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-mono-border bg-mono-card shadow-sm">
          <div className="overflow-x-auto text-left">
            <table className="monolith-table">
              <thead>
                <tr>
                  <th className="px-6 py-3">Event Title</th>
                  <th className="px-6 py-3">Timeline</th>
                  <th className="px-6 py-3">Attendees</th>
                  <th className="px-6 py-3">Meet Link</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-xs text-mono-muted">
                      No upcoming calendar events found.
                    </td>
                  </tr>
                ) : (
                  events.map((evt) => {
                    const start = new Date(evt.start.dateTime || evt.start.date);
                    const end = new Date(evt.end.dateTime || evt.end.date);
                    const isAllDay = !evt.start.dateTime;

                    return (
                      <tr key={evt.id} className="hover:bg-mono-soft transition-colors">
                        <td className="px-6 py-4 text-xs font-bold text-mono-text flex items-center space-x-2">
                          <Calendar className="size-4 text-[#F9D972] shrink-0" />
                          <span className="truncate max-w-[200px]">{evt.summary}</span>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-mono-muted monolith-numeric">
                          {isAllDay ? (
                            <span>{start.toLocaleDateString()} (All Day)</span>
                          ) : (
                            <div className="flex flex-col">
                              <span>
                                {start.toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short"
                                })}
                                ,{" "}
                                {start.toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                              <span className="text-[10px] text-mono-muted/75 font-normal">
                                Dur: {Math.round((end.getTime() - start.getTime()) / 60000)} mins
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {evt.attendees && evt.attendees.length > 0 ? (
                            <div className="flex items-center space-x-1.5 text-mono-muted">
                              <Users className="size-3.5" />
                              <span className="monolith-numeric font-semibold">{evt.attendees.length}</span>
                              <span className="text-[10px] font-normal">invited</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-mono-muted/60">No guests</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          {evt.meetLink ? (
                            <a
                              href={evt.meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-[#F9D972] hover:underline font-bold"
                            >
                              <Video className="size-4 shrink-0" />
                              <span>Join Meet</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-mono-muted/60">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-right">
                          {evt.htmlLink && (
                            <a
                              href={evt.htmlLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-[#D88700] hover:underline font-bold uppercase text-[10px] tracking-wide"
                            >
                              <span>View Calendar</span>
                              <ExternalLink className="size-3" />
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
