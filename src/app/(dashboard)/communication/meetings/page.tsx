import { auth } from "@/lib/auth";
import { createEvent, listUpcomingEvents } from "@/lib/google-calendar-client";
import { revalidatePath } from "next/cache";
import { Video, Calendar, Users, ExternalLink, Plus, CheckCircle2 } from "lucide-react";

export default async function MeetingsPortal() {
  const session = await auth();
  if (!session?.user) return null;

  // Fetch upcoming meetings (last 10)
  let meetings: any[] = [];
  try {
    meetings = await listUpcomingEvents({
      userId: session.user.id,
      maxResults: 10
    });
  } catch (err) {
    console.error("[MeetingsPortal] Error loading events:", err);
  }

  // Server Action to schedule a new meeting
  async function scheduleMeetingAction(formData: FormData) {
    "use server";
    const session = await auth();
    if (!session?.user) return;

    const summary = formData.get("summary") as string;
    const description = formData.get("description") as string;
    const startStr = formData.get("startAt") as string;
    const endStr = formData.get("endAt") as string;
    const attendeesRaw = formData.get("attendeeEmails") as string;

    const attendeeEmails = attendeesRaw
      ? attendeesRaw.split(",").map(e => e.trim()).filter(Boolean)
      : [];

    if (!summary || !startStr || !endStr) return;

    try {
      await createEvent({
        userId: session.user.id,
        summary,
        description: description || undefined,
        startAt: new Date(startStr),
        endAt: new Date(endStr),
        attendeeEmails
      });
    } catch (err) {
      console.error("[MeetingsPortal] Failed to create event:", err);
    }

    revalidatePath("/communication/meetings");
  }

  return (
    <main className="space-y-6 text-left">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6 rounded-2xl border border-outline-variant bg-surface shadow-sm text-left">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#00cec4]">Scheduler & Conference</span>
          <h1 className="text-xl font-bold text-on-surface mt-1">Meetings Portal</h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Schedule custom events and instantly provision Google Meet rooms for client and team operations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
        {/* Left Column: Form Scheduler (Span 2) */}
        <div className="lg:col-span-2 rounded-xl border border-outline-variant bg-surface p-6 shadow-sm space-y-4">
          <h3 className="ds-h3 text-on-surface flex items-center gap-2">
            <Plus size={18} className="text-[#00cec4]" />
            <span>Schedule New Meeting</span>
          </h3>

          <form action={scheduleMeetingAction} className="space-y-4">
            <div>
              <label className="ds-label block mb-1">Meeting Summary / Title</label>
              <input
                type="text"
                name="summary"
                placeholder="Shipping status update with Madras Steel"
                className="w-full text-xs p-2.5 bg-surface border border-outline-variant rounded-xl focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="ds-label block mb-1">Description</label>
              <textarea
                name="description"
                placeholder="Outline agenda, shipment details, or document issues..."
                rows={3}
                className="w-full text-xs p-2.5 bg-surface border border-outline-variant rounded-xl focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="ds-label block mb-1">Start Time (Asia/Kolkata)</label>
                <input
                  type="datetime-local"
                  name="startAt"
                  className="w-full text-xs p-2.5 bg-surface border border-outline-variant rounded-xl focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="ds-label block mb-1">End Time (Asia/Kolkata)</label>
                <input
                  type="datetime-local"
                  name="endAt"
                  className="w-full text-xs p-2.5 bg-surface border border-outline-variant rounded-xl focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="ds-label block mb-1">Attendees (Comma-separated emails)</label>
              <input
                type="text"
                name="attendeeEmails"
                placeholder="client@steelworks.in, hr@adarshshipping.in"
                className="w-full text-xs p-2.5 bg-surface border border-outline-variant rounded-xl focus:outline-none"
              />
              <p className="text-[10px] text-on-surface-variant mt-1">
                Attendees will receive calendar invitations containing the auto-generated Google Meet room URL.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center space-x-1.5 bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-5 py-2.5 rounded-xl text-xs uppercase font-bold tracking-wider transition-all"
              >
                <Video size={14} />
                <span>Schedule & Create Meet</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Scheduled Meetings Lists */}
        <div className="rounded-xl border border-outline-variant bg-surface p-6 shadow-sm space-y-4">
          <h3 className="ds-h3 text-on-surface flex items-center gap-2">
            <Calendar size={18} className="text-[#00cec4]" />
            <span>Upcoming Rooms</span>
          </h3>

          <div className="space-y-3">
            {meetings.length === 0 ? (
              <div className="text-center py-8 text-xs text-on-surface-variant">No upcoming meetings.</div>
            ) : (
              meetings.map((meet) => (
                <div key={meet.id} className="card-left-accent p-3.5 rounded-xl border border-outline-variant bg-surface-container-low space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-on-surface truncate">{meet.summary}</h4>
                    {meet.meetLink && (
                      <a
                        href={meet.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-0.5 text-[9px] font-bold text-[#00cec4] uppercase hover:underline shrink-0"
                      >
                        <Video size={10} />
                        <span>Join</span>
                      </a>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-[10px] text-on-surface-variant">
                    <span className="ds-numeric font-semibold">
                      {new Date(meet.start.dateTime).toLocaleString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "short"
                      })}
                    </span>
                    <span className="flex items-center space-x-1 font-semibold">
                      <Users size={10} />
                      <span className="ds-numeric">{meet.attendees?.length || 0}</span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
