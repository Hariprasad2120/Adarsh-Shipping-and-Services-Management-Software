"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Video, Plus, Clock, User, Link as LinkIcon, BookOpen, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  listMeetings,
  createInstantMeeting,
  getMeeting,
  addMeetingNote,
} from "@/modules/communication/meeting.service";

export default function MeetingsPage() {
  const { data: session } = useSession();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [meetingDetails, setMeetingDetails] = useState<any>(null);
  const [noteContent, setNoteContent] = useState("");

  // Instant meeting form
  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (userId && orgId) {
      listMeetings(userId, orgId).then((res) => {
        setMeetings(res);
      });
    }
  }, [session, activeMeetingId]);

  useEffect(() => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (activeMeetingId && userId && orgId) {
      getMeeting(userId, orgId, activeMeetingId).then((details) => {
        setMeetingDetails(details);
      });
    } else {
      setMeetingDetails(null);
    }
  }, [activeMeetingId, session]);

  const handleCreateInstant = () => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (!title || !userId || !orgId) return;

    startTransition(async () => {
      try {
        const meeting = await createInstantMeeting(
          userId,
          orgId,
          title,
          agenda || undefined
        );
        setTitle("");
        setAgenda("");
        setActiveMeetingId(meeting.id);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleAddNote = () => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (!noteContent.trim() || !activeMeetingId || !userId || !orgId) return;

    addMeetingNote(
      userId,
      orgId,
      activeMeetingId,
      noteContent.trim()
    ).then((note) => {
      setNoteContent("");
      setMeetingDetails((prev: any) => ({
        ...prev,
        notes: [...(prev?.notes || []), note],
      }));
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] min-h-0">
      
      {/* 1. Instant Call Starter & History list */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-4 overflow-hidden min-h-0">
        
        {/* Instant call panel */}
        <div className="card-top-accent bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/60 p-4 rounded-xl space-y-3 shrink-0">
          <h3 className="ds-h3 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Video size={14} className="text-[#00cec4]" />
            Instant Call
          </h3>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Meeting Room Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs text-white"
            />
            <input
              type="text"
              placeholder="Agenda (Optional)"
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              className="w-full text-xs text-white"
            />
          </div>
          <button
            disabled={isPending}
            onClick={handleCreateInstant}
            className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] w-full py-2 rounded-xl text-xs uppercase tracking-widest font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            {isPending ? "Creating..." : "Start Call"}
          </button>
        </div>

        {/* Meeting index */}
        <div className="flex-1 flex flex-col min-h-0 mt-2">
          <span className="ds-label block mb-2 px-2">Rooms History</span>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {meetings.map((m) => {
              const isActive = m.id === activeMeetingId;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveMeetingId(m.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all border cursor-pointer flex justify-between items-start gap-2 ${
                    isActive
                      ? "bg-[#00cec4]/10 text-[#00cec4] border-[#00cec4]/30"
                      : "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-white border-[var(--color-outline-variant)]/60"
                  }`}
                >
                  <div className="min-w-0">
                    <h4 className="text-white text-xs font-bold truncate leading-snug font-sans uppercase">
                      {m.title}
                    </h4>
                    <span className="text-[9px] text-[var(--color-on-surface-variant)] block font-mono mt-0.5">
                      Host: {m.host.name}
                    </span>
                  </div>
                  <ChevronRightIcon size={12} className="shrink-0 mt-1" />
                </button>
              );
            })}
            {meetings.length === 0 && (
              <span className="text-[10px] text-[var(--color-on-surface-variant)] block px-2 italic uppercase">
                No past video call rooms
              </span>
            )}
          </div>
        </div>

      </div>

      {/* 2. Meeting Inspector / Minutes recorder */}
      <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl overflow-hidden flex flex-col min-h-0">
        {meetingDetails ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header info */}
            <div className="p-5 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-white text-sm font-bold font-sans uppercase">
                  {meetingDetails.title}
                </h3>
                {meetingDetails.agenda && (
                  <p className="text-xs text-[var(--color-on-surface-variant)] mt-1 font-sans">
                    Agenda: {meetingDetails.agenda}
                  </p>
                )}
              </div>
              <a
                href={meetingDetails.link}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2 rounded-xl text-xs uppercase tracking-widest font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Video size={13} />
                Join Call Room
              </a>
            </div>

            {/* Content view */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Meeting Meta details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[var(--color-surface-container-low)] rounded-xl space-y-2 border border-[var(--color-outline-variant)]/40">
                  <span className="ds-label block">Host Details</span>
                  <div className="flex items-center gap-2 text-white text-xs">
                    <User size={14} className="text-[#00cec4]" />
                    <span className="font-semibold">{meetingDetails.host.name}</span>
                    <span className="text-[10px] text-[var(--color-on-surface-variant)]">
                      ({meetingDetails.host.email})
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-[var(--color-surface-container-low)] rounded-xl space-y-2 border border-[var(--color-outline-variant)]/40">
                  <span className="ds-label block">Schedule Details</span>
                  <div className="flex items-center gap-2 text-white text-xs">
                    <Clock size={14} className="text-[#00cec4]" />
                    <span className="font-mono text-[10px] text-[var(--color-on-surface-variant)]">
                      {new Date(meetingDetails.startAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Call Minutes / Notes */}
              <div className="space-y-4 border-t border-[var(--color-outline-variant)]/40 pt-5">
                <h4 className="ds-h3 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen size={13} className="text-[#00cec4]" />
                  Meeting Minutes & Action Items
                </h4>

                <div className="space-y-3">
                  {meetingDetails.notes.map((note: any) => (
                    <div key={note.id} className="p-4 bg-[var(--color-surface-container-low)] rounded-xl border border-[var(--color-outline-variant)]/40 space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] text-[var(--color-on-surface-variant)]">
                        <span className="font-bold uppercase">{note.author.name}</span>
                        <span className="font-mono">{new Date(note.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-white text-xs whitespace-pre-wrap leading-relaxed">
                        {note.content}
                      </p>
                    </div>
                  ))}
                  {meetingDetails.notes.length === 0 && (
                    <div className="p-6 text-center text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider border border-dashed border-[var(--color-outline-variant)]/40 rounded-xl">
                      No minutes or notes logged for this call room
                    </div>
                  )}
                </div>

                {/* Log minutes input */}
                <div className="space-y-2">
                  <span className="ds-label block">Add Note / Action Task</span>
                  <textarea
                    rows={4}
                    placeholder="Enter discussion details, decisions, or follow-up action tasks..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="w-full text-xs text-white"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddNote}
                      className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-4 py-2 rounded-xl text-xs uppercase tracking-widest font-bold transition-all cursor-pointer"
                    >
                      Save Note
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Video size={48} className="text-[var(--color-outline)] mb-3" />
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">No Room Selected</h4>
            <p className="text-[var(--color-on-surface-variant)] text-xs mt-1">
              Select a meeting room from the sidebar history lists or create an instant call.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}

function ChevronRightIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={{ width: size, height: size }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}
