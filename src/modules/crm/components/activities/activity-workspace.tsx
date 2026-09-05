"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "@/modules/notifications/client";
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import {
  createActivityAction,
  updateActivityAction,
  deleteActivityAction,
} from "@/modules/crm/actions";

export type ActivityRow = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueAt: string | null;
  startAt: string | null;
  endAt: string | null;
  location: string | null;
  relatedToType: string | null;
  relatedToId: string | null;
  owner: { id: string; name: string } | null;
};

type Kind = "TASK" | "EVENT";

const PRIORITY_STYLE: Record<string, string> = {
  HIGH: "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]",
  NORMAL: "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent-text)]",
  LOW: "bg-[var(--mnx-surface)] text-[var(--mnx-muted)]",
};

const panelClass =
  "rounded-xl bg-[var(--mnx-surface)] border border-[var(--mnx-border)]/50";

// Map the polymorphic relatedToType values seen in the wild to a CRM route.
const RELATED_ROUTE: Record<string, string> = {
  LEAD: "leads",
  CRMLEAD: "leads",
  DEAL: "deals",
  CRMDEAL: "deals",
  CONTACT: "contacts",
  CRMCONTACT: "contacts",
  ACCOUNT: "customers",
  CUSTOMER: "customers",
  CRMACCOUNT: "customers",
  QUOTE: "quotes",
  TICKET: "tickets",
};

function relatedHref(type: string | null, id: string | null): string | null {
  if (!type || !id) return null;
  const seg = RELATED_ROUTE[type.toUpperCase()];
  return seg ? `/crm/${seg}/${id}` : null;
}

function relatedLabel(type: string | null): string {
  if (!type) return "record";
  return type.replace(/^crm/i, "").toLowerCase();
}

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ActivityWorkspace({
  kind,
  rows,
}: {
  kind: Kind;
  rows: ActivityRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "overdue" | "done">("open");
  // Snapshot "now" once per mount so overdue/soon calculations stay stable across re-renders.
  const [now] = useState(() => Date.now());
  const isEvent = kind === "EVENT";
  const label = isEvent ? "event" : "task";

  const decorated = useMemo(
    () =>
      rows.map((r) => {
        const done = r.status === "COMPLETED";
        const anchor = isEvent ? r.startAt : r.dueAt;
        const overdue = !done && !!anchor && new Date(anchor).getTime() < now;
        return { ...r, done, overdue, anchor };
      }),
    [rows, isEvent, now],
  );

  const counts = useMemo(() => {
    const open = decorated.filter((r) => !r.done).length;
    const overdue = decorated.filter((r) => r.overdue).length;
    const done = decorated.filter((r) => r.done).length;
    const soon = decorated.filter(
      (r) =>
        !r.done &&
        r.anchor &&
        new Date(r.anchor).getTime() >= now &&
        new Date(r.anchor).getTime() < now + 24 * 3600 * 1000,
    ).length;
    return { open, overdue, done, soon };
  }, [decorated, now]);

  const visible = useMemo(() => {
    const list = decorated.filter((r) => {
      if (filter === "open") return !r.done;
      if (filter === "overdue") return r.overdue;
      if (filter === "done") return r.done;
      return true;
    });
    return list.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const at = a.anchor ? new Date(a.anchor).getTime() : Infinity;
      const bt = b.anchor ? new Date(b.anchor).getTime() : Infinity;
      return at - bt;
    });
  }, [decorated, filter]);

  function toggleComplete(row: (typeof decorated)[number]) {
    setBusyId(row.id);
    const fd = new FormData();
    fd.set("status", row.done ? "IN_PROGRESS" : "COMPLETED");
    startTransition(async () => {
      const res = await updateActivityAction(row.id, fd);
      setBusyId(null);
      if (res.ok) {
        toast.success(row.done ? "Reopened" : "Marked complete");
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed");
      }
    });
  }

  function remove(id: string) {
    setBusyId(id);
    startTransition(async () => {
      const res = await deleteActivityAction(id);
      setBusyId(null);
      if (res.ok) {
        toast.success(`${label[0].toUpperCase()}${label.slice(1)} deleted`);
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed");
      }
    });
  }

  function submitNew(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("type", kind);
    if (!(fd.get("title") as string)?.trim()) {
      toast.error("Title is required");
      return;
    }
    startTransition(async () => {
      const res = await createActivityAction(fd);
      if (res.ok) {
        toast.success(`${label[0].toUpperCase()}${label.slice(1)} created`);
        form.reset();
        setShowForm(false);
        router.refresh();
      } else {
        toast.error(res.error ?? "Failed");
      }
    });
  }

  const statCards: { label: string; value: number; tone?: string }[] = [
    { label: `Open ${label}s`, value: counts.open },
    { label: "Overdue", value: counts.overdue, tone: "var(--mnx-danger)" },
    { label: isEvent ? "Starts within 24h" : "Due within 24h", value: counts.soon, tone: "var(--mnx-warning)" },
    { label: "Completed", value: counts.done, tone: "var(--mnx-success)" },
  ];

  return (
    <div className="space-y-6">
      {/* stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className={`${panelClass} p-4`}>
            <p
              className="text-2xl font-bold"
              style={s.tone ? { color: s.tone } : { color: "var(--mnx-text-strong)" }}
            >
              {s.value}
            </p>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-[var(--mnx-muted)] mt-1">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["open", "overdue", "done", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-lg border transition-colors ${
                filter === f
                  ? "border-[var(--mnx-accent)]/50 bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent-text)]"
                  : "border-[var(--mnx-border)]/50 text-[var(--mnx-muted)] hover:text-[var(--mnx-text-strong)]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-lg bg-[var(--mnx-accent)] text-[var(--mnx-text-strong)]"
        >
          {showForm ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
          {showForm ? "Cancel" : `New ${label}`}
        </button>
      </div>

      {/* create form */}
      {showForm && (
        <form onSubmit={submitNew} className={`${panelClass} p-5 space-y-4`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold text-[var(--mnx-muted)] uppercase tracking-wide">Title *</span>
              <input
                name="title"
                autoFocus
                required
                className="mt-1 w-full rounded-lg border border-[var(--mnx-border)]/60 bg-[var(--mnx-surface)] px-3 py-2 text-sm"
                placeholder={isEvent ? "Client meeting — rate discussion" : "Follow up on pending quote"}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="text-xs font-semibold text-[var(--mnx-muted)] uppercase tracking-wide">Description</span>
              <textarea
                name="description"
                rows={2}
                className="mt-1 w-full rounded-lg border border-[var(--mnx-border)]/60 bg-[var(--mnx-surface)] px-3 py-2 text-sm resize-y"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--mnx-muted)] uppercase tracking-wide">Priority</span>
              <select
                name="priority"
                defaultValue="NORMAL"
                className="mt-1 w-full rounded-lg border border-[var(--mnx-border)]/60 bg-[var(--mnx-surface)] px-3 py-2 text-sm"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
              </select>
            </label>
            {isEvent ? (
              <>
                <label className="block">
                  <span className="text-xs font-semibold text-[var(--mnx-muted)] uppercase tracking-wide">Starts</span>
                  <input
                    type="datetime-local"
                    name="startAt"
                    className="mt-1 w-full rounded-lg border border-[var(--mnx-border)]/60 bg-[var(--mnx-surface)] px-3 py-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[var(--mnx-muted)] uppercase tracking-wide">Ends</span>
                  <input
                    type="datetime-local"
                    name="endAt"
                    className="mt-1 w-full rounded-lg border border-[var(--mnx-border)]/60 bg-[var(--mnx-surface)] px-3 py-2 text-sm"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-xs font-semibold text-[var(--mnx-muted)] uppercase tracking-wide">Location</span>
                  <input
                    name="location"
                    className="mt-1 w-full rounded-lg border border-[var(--mnx-border)]/60 bg-[var(--mnx-surface)] px-3 py-2 text-sm"
                    placeholder="Office / customer site / video call"
                  />
                </label>
              </>
            ) : (
              <label className="block">
                <span className="text-xs font-semibold text-[var(--mnx-muted)] uppercase tracking-wide">Due date</span>
                <input
                  type="date"
                  name="dueAt"
                  className="mt-1 w-full rounded-lg border border-[var(--mnx-border)]/60 bg-[var(--mnx-surface)] px-3 py-2 text-sm"
                />
              </label>
            )}
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wide rounded-lg bg-[var(--mnx-accent)] text-[var(--mnx-text-strong)] disabled:opacity-50"
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Create {label}
            </button>
          </div>
        </form>
      )}

      {/* list */}
      <div className={`${panelClass} divide-y divide-[var(--mnx-border)]/30`}>
        {visible.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--mnx-muted)]">
            No {label}s in this view.
          </div>
        ) : (
          visible.map((row) => (
            <div key={row.id} className="flex items-start gap-3 p-4">
              <button
                onClick={() => toggleComplete(row)}
                disabled={isPending && busyId === row.id}
                className="mt-0.5 shrink-0 text-[var(--mnx-muted)] hover:text-[var(--mnx-success)] disabled:opacity-50"
                aria-label={row.done ? "Reopen" : "Mark complete"}
              >
                {isPending && busyId === row.id ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : row.done ? (
                  <CheckCircle2 className="size-5 text-[var(--mnx-success)]" />
                ) : (
                  <Circle className="size-5" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-sm font-semibold ${
                      row.done
                        ? "line-through text-[var(--mnx-muted)]"
                        : "text-[var(--mnx-text-strong)]"
                    }`}
                  >
                    {row.title}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${
                      PRIORITY_STYLE[row.priority] ?? PRIORITY_STYLE.NORMAL
                    }`}
                  >
                    {row.priority}
                  </span>
                  {row.overdue && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)]">
                      Overdue
                    </span>
                  )}
                </div>
                {row.description && (
                  <p className="mt-1 text-xs text-[var(--mnx-muted)] line-clamp-2">{row.description}</p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--mnx-muted)]">
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="size-3" />
                    {isEvent
                      ? `${fmtDateTime(row.startAt)}${row.endAt ? ` → ${fmtDateTime(row.endAt)}` : ""}`
                      : `Due ${fmtDate(row.dueAt)}`}
                  </span>
                  {isEvent && row.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      {row.location}
                    </span>
                  )}
                  {row.owner && <span>Owner: {row.owner.name}</span>}
                  {relatedHref(row.relatedToType, row.relatedToId) && (
                    <Link
                      href={relatedHref(row.relatedToType, row.relatedToId)!}
                      className="text-[var(--mnx-accent)] hover:underline"
                    >
                      {relatedLabel(row.relatedToType)} ↗
                    </Link>
                  )}
                </div>
              </div>

              <button
                onClick={() => remove(row.id)}
                disabled={isPending && busyId === row.id}
                className="shrink-0 text-[var(--mnx-muted)] hover:text-[var(--mnx-danger)] disabled:opacity-50"
                aria-label="Delete"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
