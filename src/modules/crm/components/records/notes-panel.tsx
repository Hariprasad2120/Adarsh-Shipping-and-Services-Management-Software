"use client";

import { CrmButton, CrmTextarea } from "@/modules/crm/components/workspace/crm-workspace";

import React, { useState } from "react";
import { toast } from "sonner";
import { createNoteAction, deleteNoteAction } from "@/modules/crm/actions";
import { MessageSquare, Trash2, User, Clock } from "lucide-react";

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
      <div className="flex items-center gap-2 border-b border-[var(--mnx-border)]/30 pb-3">
        <MessageSquare className="size-4.5 text-[var(--mnx-accent)]" />
        <h3 className="font-bold text-sm text-[var(--mnx-text-strong)] uppercase tracking-wider">Notes & Annotations</h3>
      </div>

      {/* Add Note Form */}
      <form onSubmit={handleAddNote} className="space-y-3">
        <CrmTextarea
          placeholder="Add a new note for this record..."
          value={newNoteBody}
          onChange={(e) => setNewNoteBody(e.target.value)}
          rows={3}
          className="w-full p-3 bg-[var(--mnx-surface)] border border-[var(--mnx-border)] rounded-lg text-sm placeholder:text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)] text-[var(--mnx-text-strong)]"
        />
        <div className="flex justify-end">
          <CrmButton
            type="submit"
            disabled={isSubmitting || !newNoteBody.trim()}
            className="px-4 py-1.5 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] disabled:opacity-50 text-[var(--mnx-text-strong)] rounded text-xs font-bold transition-all cursor-pointer"
          >
            {isSubmitting ? "Adding..." : "Add Note"}
          </CrmButton>
        </div>
      </form>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="p-6 text-center text-[var(--mnx-muted)] text-sm border border-dashed border-[var(--mnx-border)]/50 rounded-lg">
          No notes logged yet.
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="p-4 bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/40 rounded-lg hover:border-[var(--mnx-border)] transition-all space-y-2">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2 text-xs text-[var(--mnx-muted)]">
                  <User className="size-3 text-[var(--mnx-muted)]" />
                  <span className="font-semibold text-[var(--mnx-text-strong)]">{note.createdBy.name}</span>
                  <span>•</span>
                  <Clock className="size-3 text-[var(--mnx-muted)]" />
                  <span>{new Date(note.createdAt).toLocaleString("en-IN")}</span>
                </div>
                <CrmButton
                  onClick={() => handleDeleteNote(note.id)}
                  className="p-1 text-[var(--mnx-muted)] hover:text-[var(--mnx-danger)] hover:bg-[var(--mnx-danger-bg)] rounded cursor-pointer"
                  title="Delete Note"
                >
                  <Trash2 className="size-3.5" />
                </CrmButton>
              </div>
              <p className="text-sm text-[var(--mnx-muted)] whitespace-pre-wrap leading-relaxed">{note.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
