"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { createNoteAction, deleteNoteAction } from "@/modules/crm/actions";
import { MessageSquare, Trash2, Pin, User, Clock } from "lucide-react";

interface Note {
  id: string;
  body: string;
  isPinned: boolean;
  createdAt: Date;
  createdBy: { id: string; name: string };
}

interface NotesPanelProps {
  relatedToType: string;
  relatedToId: string;
  initialNotes: Note[];
}

export function NotesPanel({ relatedToType, relatedToId, initialNotes }: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [newNoteBody, setNewNoteBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteBody.trim()) return;

    setIsSubmitting(true);
    const res = await createNoteAction(relatedToType, relatedToId, newNoteBody);
    setIsSubmitting(false);

    if (res.ok) {
      toast.success("Note added successfully");
      setNotes((prev) => [res.data, ...prev]);
      setNewNoteBody("");
    } else {
      toast.error(res.error);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    const res = await deleteNoteAction(noteId, relatedToType, relatedToId);
    if (res.ok) {
      toast.success("Note deleted");
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 border-b border-[#1c212a]/30 pb-3">
        <MessageSquare className="size-4.5 text-[#00c4b6]" />
        <h3 className="font-bold text-sm text-white uppercase tracking-wider">Notes & Annotations</h3>
      </div>

      {/* Add Note Form */}
      <form onSubmit={handleAddNote} className="space-y-3">
        <textarea
          placeholder="Add a new note for this record..."
          value={newNoteBody}
          onChange={(e) => setNewNoteBody(e.target.value)}
          rows={3}
          className="w-full p-3 bg-[#0a0d12] border border-[#1c212a] rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:border-[#00c4b6] text-white"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !newNoteBody.trim()}
            className="px-4 py-1.5 bg-[#00c4b6] hover:bg-[#00b0a3] disabled:opacity-50 text-white rounded text-xs font-bold transition-all cursor-pointer"
          >
            {isSubmitting ? "Adding..." : "Add Note"}
          </button>
        </div>
      </form>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="p-6 text-center text-slate-500 text-sm border border-dashed border-[#1c212a]/50 rounded-lg">
          No notes logged yet.
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="p-4 bg-[#0f1319] border border-[#1c212a]/40 rounded-lg hover:border-[#1c212a] transition-all space-y-2">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <User className="size-3 text-slate-500" />
                  <span className="font-semibold text-white">{note.createdBy.name}</span>
                  <span>•</span>
                  <Clock className="size-3 text-slate-500" />
                  <span>{new Date(note.createdAt).toLocaleString("en-IN")}</span>
                </div>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded cursor-pointer"
                  title="Delete Note"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{note.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
