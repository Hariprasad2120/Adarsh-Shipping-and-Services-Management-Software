"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Calendar, Plus, Clock, MapPin, Users, Video, Trash, AlertTriangle } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  listCalendars,
  getOrCreatePersonalCalendar,
  listEvents,
  createEvent,
  deleteEvent,
  listCalendarResources,
} from "@/modules/communication/calendar.service";

export default function CalendarPage() {
  const { data: session } = useSession();
  const [calendars, setCalendars] = useState<any[]>([]);
  const [activeCalId, setActiveCalId] = useState<string>("");
  const [events, setEvents] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // New Event Form
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [attendeeEmails, setAttendeeEmails] = useState("");
  const [createMeetingLink, setCreateMeetingLink] = useState(false);

  const [conflictError, setConflictError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Load Calendars and Rooms
  useEffect(() => {
    if (session?.user?.id && session?.user?.orgId) {
      getOrCreatePersonalCalendar(session.user.id, session.user.orgId).then((pc) => {
        setActiveCalId(pc.id);
      });
      listCalendars(session.user.id, session.user.orgId).then((cals) => {
        setCalendars(cals);
      });
      listCalendarResources(session.user.id, session.user.orgId).then((res) => {
        setResources(res);
      });
    }
  }, [session]);

  // Load Events
  const reloadEvents = () => {
    if (activeCalId && session?.user?.id && session?.user?.orgId) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);

      listEvents(session.user.id, session.user.orgId, activeCalId, start, end).then((evs) => {
        setEvents(evs);
      });
    }
  };

  useEffect(() => {
    reloadEvents();
  }, [activeCalId, session]);

  const handleCreateEvent = () => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (!title || !startAt || !endAt || !activeCalId || !userId || !orgId) return;

    setConflictError("");
    startTransition(async () => {
      try {
        await createEvent(userId, orgId, {
          calendarId: activeCalId,
          title,
          description,
          startAt: new Date(startAt),
          endAt: new Date(endAt),
          isAllDay,
          location,
          resourceId: resourceId || undefined,
          attendeeEmails: attendeeEmails ? attendeeEmails.split(",").map((e) => e.trim()) : [],
          createMeetingLink,
        });

        setIsCreatingEvent(false);
        setTitle("");
        setDescription("");
        setStartAt("");
        setEndAt("");
        setIsAllDay(false);
        setLocation("");
        setResourceId("");
        setAttendeeEmails("");
        setCreateMeetingLink(false);

        reloadEvents();
      } catch (err: any) {
        console.error(err);
        setConflictError(err.message || "Failed to create event. Checks details.");
      }
    });
  };

  const handleDeleteEvent = async (eventId: string) => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (!userId || !orgId) return;
    if (confirm("Are you sure you want to delete this event?")) {
      try {
        await deleteEvent(userId, orgId, eventId);
        setSelectedEvent(null);
        reloadEvents();
      } catch (err: any) {
        alert(err.message || "Could not delete event");
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] min-h-0">
      
      {/* 1. Calendars & Resources Left Panel */}
      <div className="w-full lg:w-60 shrink-0 flex flex-col gap-4 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-4">
        <div>
          <span className="ds-label block mb-1">Active Calendar</span>
          <select
            value={activeCalId}
            onChange={(e) => setActiveCalId(e.target.value)}
            className="w-full text-xs bg-[var(--color-surface-container)] text-white"
          >
            {calendars.map((cal) => (
              <option key={cal.id} value={cal.id}>
                {cal.name} ({cal.type})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setIsCreatingEvent(true)}
          className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] w-full py-2.5 rounded-xl text-xs uppercase tracking-widest font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus size={14} />
          Create Event
        </button>

        <div className="mt-2 space-y-1">
          <span className="ds-label block mb-2 px-2">Rooms / Resources</span>
          {resources.map((res) => (
            <div key={res.id} className="px-3 py-2 bg-[var(--color-surface-container)] text-white rounded-xl text-xs flex justify-between items-center font-medium">
              <span>{res.name}</span>
              <span className="text-[9px] text-[var(--color-on-surface-variant)] uppercase">
                {res.capacity ? `Cap: ${res.capacity}` : res.type}
              </span>
            </div>
          ))}
          {resources.length === 0 && (
            <span className="text-[10px] text-[var(--color-on-surface-variant)] block px-2 italic uppercase">
              No rooms set
            </span>
          )}
        </div>
      </div>

      {/* 2. Events List Grid */}
      <div className="flex-1 flex flex-col bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl overflow-hidden min-h-0">
        <div className="p-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)]">
          <h3 className="ds-h3 text-white text-xs font-bold uppercase tracking-wider">
            Calendar Events
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((ev) => (
            <div
              key={ev.id}
              onClick={() => setSelectedEvent(ev)}
              className="card-left-accent bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/60 hover:border-[#00cec4]/40 rounded-xl p-4 space-y-3 cursor-pointer transition-all"
            >
              <h4 className="text-white text-xs font-bold font-sans uppercase">
                {ev.title}
              </h4>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[10px] text-[var(--color-on-surface-variant)] font-semibold uppercase">
                  <Clock size={12} className="text-[#00cec4]" />
                  <span>
                    {new Date(ev.startAt).toLocaleString("en-IN")}
                  </span>
                </div>
                {ev.location && (
                  <div className="flex items-center gap-2 text-[10px] text-[var(--color-on-surface-variant)]">
                    <MapPin size={12} className="text-[#00cec4]" />
                    <span className="truncate">{ev.location}</span>
                  </div>
                )}
                {ev.meeting && (
                  <div className="flex items-center gap-2 text-[10px] text-[#00cec4] font-semibold">
                    <Video size={12} />
                    <span>Jitsi Room Connected</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {events.length === 0 && (
            <div className="col-span-full p-8 text-center text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider">
              No calendar events found for this timeframe
            </div>
          )}
        </div>
      </div>

      {/* 3. Event Detail Inspector / Creation Modal */}
      {selectedEvent && (
        <div className="w-full lg:w-96 shrink-0 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl overflow-hidden flex flex-col min-h-0">
          <div className="p-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] flex justify-between items-center shrink-0">
            <h3 className="text-white text-xs font-bold uppercase truncate font-sans">
              Event Details
            </h3>
            <button
              onClick={() => setSelectedEvent(null)}
              className="text-xs text-[var(--color-on-surface-variant)] hover:text-white uppercase font-bold cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-1">
              <span className="ds-label block">Title</span>
              <h2 className="text-white text-lg font-bold uppercase">{selectedEvent.title}</h2>
              {selectedEvent.description && (
                <p className="text-xs text-[var(--color-on-surface-variant)] mt-1.5 leading-relaxed">
                  {selectedEvent.description}
                </p>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t border-[var(--color-outline-variant)]/40">
              <div className="flex items-center gap-2 text-xs text-white">
                <Clock size={14} className="text-[#00cec4] shrink-0" />
                <div>
                  <span className="block font-semibold">Schedule Time</span>
                  <span className="text-[10px] text-[var(--color-on-surface-variant)] block font-mono">
                    Starts: {new Date(selectedEvent.startAt).toLocaleString("en-IN")}
                  </span>
                  <span className="text-[10px] text-[var(--color-on-surface-variant)] block font-mono">
                    Ends: {new Date(selectedEvent.endAt).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-xs text-white">
                  <MapPin size={14} className="text-[#00cec4] shrink-0" />
                  <div>
                    <span className="block font-semibold">Location / Address</span>
                    <span className="text-[10px] text-[var(--color-on-surface-variant)] block">
                      {selectedEvent.location}
                    </span>
                  </div>
                </div>
              )}

              {selectedEvent.meeting && (
                <div className="flex items-center gap-2 text-xs text-white">
                  <Video size={14} className="text-[#00cec4] shrink-0" />
                  <div>
                    <span className="block font-semibold">Video Conference</span>
                    <a
                      href={selectedEvent.meeting.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#00cec4] hover:underline block"
                    >
                      Join Meeting Room
                    </a>
                  </div>
                </div>
              )}
            </div>

            {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-[var(--color-outline-variant)]/40">
                <span className="ds-label block">Attendees ({selectedEvent.attendees.length})</span>
                <div className="space-y-1.5">
                  {selectedEvent.attendees.map((att: any) => (
                    <div key={att.id} className="flex justify-between items-center text-[10px] text-white">
                      <div className="flex items-center gap-1.5">
                        <Users size={12} className="text-[var(--color-on-surface-variant)]" />
                        <span>{att.email}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-wider ${
                        att.status === "ACCEPTED" ? "bg-green-950 text-green-400 border border-green-400/25" :
                        att.status === "DECLINED" ? "bg-red-950 text-red-400 border border-red-400/25" :
                        "bg-yellow-950 text-yellow-400 border border-yellow-400/25"
                      }`}>
                        {att.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedEvent.createdById === session?.user?.id && (
              <div className="pt-6 border-t border-[var(--color-outline-variant)]/40">
                <button
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                  className="w-full flex items-center justify-center gap-2 py-2 text-xs uppercase tracking-widest font-bold bg-red-950 border border-red-400/20 text-red-400 hover:bg-red-900 rounded-xl cursor-pointer"
                >
                  <Trash size={12} />
                  Delete Event
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Creation Modal Dialog */}
      {isCreatingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="ds-h3 text-white text-sm font-bold flex items-center gap-2">
              <Calendar size={16} className="text-[#00cec4]" />
              Schedule Event
            </h3>
            
            {conflictError && (
              <div className="p-3 bg-red-950/80 border border-red-400/30 text-red-400 text-xs rounded-xl flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>{conflictError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <span className="ds-label block mb-1">Event Title</span>
                <input
                  type="text"
                  placeholder="e.g. Operations Standup"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs text-white"
                />
              </div>

              <div>
                <span className="ds-label block mb-1">Start Date & Time</span>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full text-xs text-white"
                />
              </div>

              <div>
                <span className="ds-label block mb-1">End Date & Time</span>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full text-xs text-white"
                />
              </div>

              <div>
                <span className="ds-label block mb-1">Location (Optional)</span>
                <input
                  type="text"
                  placeholder="e.g. Headquarters / Chennai"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full text-xs text-white"
                />
              </div>

              <div>
                <span className="ds-label block mb-1">Book Meeting Room</span>
                <select
                  value={resourceId}
                  onChange={(e) => setResourceId(e.target.value)}
                  className="w-full text-xs bg-[var(--color-surface-container)] text-white"
                >
                  <option value="">No room requested</option>
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <span className="ds-label block mb-1">Attendees (comma separated emails)</span>
                <input
                  type="text"
                  placeholder="name@company.com, client@partner.com"
                  value={attendeeEmails}
                  onChange={(e) => setAttendeeEmails(e.target.value)}
                  className="w-full text-xs text-white"
                />
              </div>

              <div className="md:col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="jitsi"
                  checked={createMeetingLink}
                  onChange={(e) => setCreateMeetingLink(e.target.checked)}
                  className="rounded border-[#00cec4]"
                />
                <label htmlFor="jitsi" className="text-xs text-white cursor-pointer select-none">
                  Generate instant self-hosted Jitsi video call room
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-outline-variant)]/40">
              <button
                onClick={() => setIsCreatingEvent(false)}
                className="px-4 py-2 text-xs text-[var(--color-on-surface-variant)] hover:text-white uppercase tracking-wider font-bold cursor-pointer"
              >
                Close
              </button>
              <button
                disabled={isPending}
                onClick={handleCreateEvent}
                className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-5 py-2 rounded-xl text-xs uppercase tracking-widest font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Scheduling..." : "Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
