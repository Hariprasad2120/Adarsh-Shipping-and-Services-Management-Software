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
  if (t.includes("CREATED")) return <PlusCircle className="size-4 text-emerald-400" />;
  if (t.includes("CONVERTED") || t.includes("RESOLVED")) return <CheckCircle className="size-4 text-[#00c4b6]" />;
  if (t.includes("NOTE")) return <FileText className="size-4 text-amber-400" />;
  if (t.includes("UPDATED") || t.includes("STAGE")) return <RefreshCw className="size-4 text-blue-400" />;
  return <Activity className="size-4 text-slate-400" />;
}

export function TimelinePanel({ events }: TimelinePanelProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 border-b border-[#1c212a]/30 pb-3">
        <Clock className="size-4.5 text-[#00c4b6]" />
        <h3 className="font-bold text-sm text-white uppercase tracking-wider">Chronological Change Timeline</h3>
      </div>

      {events.length === 0 ? (
        <div className="p-6 text-center text-slate-500 text-sm border border-dashed border-[#1c212a]/50 rounded-lg">
          No audit history logged for this record.
        </div>
      ) : (
        <div className="relative border-l border-[#1c212a] ml-4 pl-6 space-y-5 py-2">
          {events.map((event) => (
            <div key={event.id} className="relative">
              {/* Bullet Icon */}
              <div className="absolute -left-[34px] top-0 bg-[#0c0f14] p-1.5 rounded-full border border-[#1c212a]">
                {getEventIcon(event.eventType)}
              </div>

              {/* Event Content */}
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white leading-tight">{event.description}</p>
                <div className="flex items-center gap-2 text-[10.5px] text-slate-400">
                  <User className="size-3 text-slate-500" />
                  <span className="font-medium text-slate-300">{event.createdBy.name}</span>
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
