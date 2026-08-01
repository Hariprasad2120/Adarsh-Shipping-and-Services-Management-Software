"use client";

import React from "react";
import { Activity, Clock, User, PlusCircle, CheckCircle, RefreshCw, FileText } from "lucide-react";

interface TimelineEvent {
  id: string;
  eventType: string; // e.g. LEAD_CREATED, LEAD_UPDATED, LEAD_CONVERTED, etc.
  description: string;
  createdAt: Date;
  createdBy: { id: string; name: string };
}

interface TimelinePanelProps {
  events: TimelineEvent[];
}

function getEventIcon(type: string) {
  const t = type.toUpperCase();
  if (t.includes("CREATED")) return <PlusCircle className="size-4 text-[var(--mnx-success)]" />;
  if (t.includes("CONVERTED") || t.includes("RESOLVED")) return <CheckCircle className="size-4 text-[var(--mnx-accent)]" />;
  if (t.includes("NOTE")) return <FileText className="size-4 text-[var(--mnx-warning)]" />;
  if (t.includes("UPDATED") || t.includes("STAGE")) return <RefreshCw className="size-4 text-[var(--mnx-accent-text)]" />;
  return <Activity className="size-4 text-mono-muted" />;
}

export function TimelinePanel({ events }: TimelinePanelProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 border-b border-[var(--mnx-border)]/30 pb-3">
        <Clock className="size-4.5 text-[var(--mnx-accent)]" />
        <h3 className="font-bold text-sm text-mono-text uppercase tracking-wider">Chronological Change Timeline</h3>
      </div>

      {events.length === 0 ? (
        <div className="p-6 text-center text-mono-muted text-sm border border-dashed border-[var(--mnx-border)]/50 rounded-lg">
          No audit history logged for this record.
        </div>
      ) : (
        <div className="relative border-l border-[var(--mnx-border)] ml-4 pl-6 space-y-5 py-2">
          {events.map((event) => (
            <div key={event.id} className="relative">
              {/* Bullet Icon */}
              <div className="absolute -left-[34px] top-0 bg-[var(--mnx-surface)] p-1.5 rounded-full border border-[var(--mnx-border)]">
                {getEventIcon(event.eventType)}
              </div>

              {/* Event Content */}
              <div className="space-y-1">
                <p className="text-sm font-semibold text-mono-text leading-tight">{event.description}</p>
                <div className="flex items-center gap-2 text-[10.5px] text-mono-muted">
                  <User className="size-3 text-mono-muted" />
                  <span className="font-medium text-mono-muted">{event.createdBy.name}</span>
                  <span>•</span>
                  <span>{new Date(event.createdAt).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
