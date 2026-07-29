"use client";

import { CrmButton, CrmInput } from "@/components/monolith/crm-workspace";

import { NativeSelect } from "@/components/monolith/native-select";
import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/monolith/card";
import { Button } from "@/components/monolith/button";
import { updateTicketStatusAction, assignTicketAction } from "./actions";
import { MessageSquare, User, Calendar, AlertTriangle, ArrowRight, Shield } from "lucide-react";

type UserBasic = {
  id: string;
  name: string;
  email: string;
  designation?: string | null;
};

type Ticket = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  createdAt: Date | string;
  raisedBy: UserBasic;
  assignee?: { id: string; name: string } | null;
  comments: { id: string }[];
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent-text)] dark:bg-[var(--mnx-accent-soft)] dark:text-[var(--mnx-accent-text)] border-[var(--mnx-accent)] dark:border-[var(--mnx-accent)]",
  IN_PROGRESS: "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] dark:bg-[var(--mnx-warning-bg)] dark:text-[var(--mnx-warning)] border-[var(--mnx-warning)] dark:border-[var(--mnx-warning)]",
  RESOLVED: "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)] dark:bg-[var(--mnx-success-bg)] dark:text-[var(--mnx-success)] border-[var(--mnx-success)] dark:border-[var(--mnx-success)]",
  CLOSED: "bg-mono-soft text-mono-muted dark:bg-mono-soft dark:text-mono-muted border-mono-border dark:border-mono-border",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-mono-soft text-mono-muted dark:bg-mono-soft dark:text-mono-muted",
  MEDIUM: "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] dark:bg-[var(--mnx-warning-bg)] dark:text-[var(--mnx-warning)]",
  HIGH: "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] dark:bg-[var(--mnx-warning-bg)] dark:text-[var(--mnx-warning)]",
  URGENT: "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)] dark:bg-[var(--mnx-danger-bg)] dark:text-[var(--mnx-danger)] border border-[var(--mnx-danger)] dark:border-[var(--mnx-danger)]",
};

interface TicketsClientProps {
  initialTickets: Ticket[];
  admins: { id: string; name: string }[];
  currentUserId: string;
  isAdmin: boolean;
}

export function TicketsClient({
  initialTickets,
  admins,
  currentUserId,
  isAdmin,
}: TicketsClientProps) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusPending, startStatusTransition] = useTransition();
  const [assignPending, startAssignTransition] = useTransition();

  function handleStatusChange(ticketId: string, newStatus: string) {
    startStatusTransition(async () => {
      const formData = new FormData();
      formData.append("ticketId", ticketId);
      formData.append("status", newStatus);

      const res = await updateTicketStatusAction(formData);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Ticket status updated to ${newStatus.replace("_", " ")}`);
      // Update local state
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
      );
    });
  }

  function handleAssigneeChange(ticketId: string, newAssigneeId: string) {
    startAssignTransition(async () => {
      const formData = new FormData();
      formData.append("ticketId", ticketId);
      formData.append("assigneeId", newAssigneeId);

      const res = await assignTicketAction(formData);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(newAssigneeId ? "Ticket assigned successfully" : "Assignee cleared");
      const assignedUser = admins.find((u) => u.id === newAssigneeId) || null;
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                assignee: assignedUser ? { id: assignedUser.id, name: assignedUser.name } : null,
                status: newAssigneeId ? "IN_PROGRESS" : "OPEN",
              }
            : t
        )
      );
    });
  }

  // Filter & Search logic
  const filteredTickets = tickets.filter((ticket) => {
    const matchesStatus = statusFilter === "ALL" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "ALL" || ticket.priority === priorityFilter;
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.raisedBy.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesPriority && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-mono-soft dark:bg-mono-soft/50 p-4 rounded-xl border border-mono-border/40">
        <div className="flex-1 min-w-[280px]">
          <CrmInput
            type="text"
            placeholder="Search tickets by title, category, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-mono-border/60 bg-mono-card px-4 py-2 text-sm text-mono-muted dark:text-mono-text placeholder:text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)] transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-mono-card rounded-lg p-0.5 border border-mono-border/60">
            {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((s) => {
              const count = s === "ALL" ? tickets.length : tickets.filter((t) => t.status === s).length;
              return (
                <CrmButton
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition ${
                    statusFilter === s
                      ? "bg-[var(--mnx-accent)] text-mono-text"
                      : "text-mono-muted hover:text-mono-muted dark:hover:text-mono-text"
                  }`}
                >
                  {s.replace("_", " ")} ({count})
                </CrmButton>
              );
            })}
          </div>

          <NativeSelect
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-mono-border/60 bg-mono-card px-3 py-2 text-xs font-semibold text-mono-muted dark:text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)] transition"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </NativeSelect>
        </div>
      </div>

      {/* Ticket Cards List */}
      {filteredTickets.length === 0 ? (
        <Card className="border-0 shadow-sm bg-mono-card">
          <CardContent className="py-16 text-center text-mono-muted text-sm font-medium">
            No support tickets match the current filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => (
            <Card
              key={ticket.id}
              className={`border-0 shadow-sm border-l-4 bg-mono-card transition hover:shadow-md ${
                ticket.priority === "URGENT"
                  ? "border-l-rose-500"
                  : ticket.priority === "HIGH"
                  ? "border-l-orange-500"
                  : ticket.priority === "MEDIUM"
                  ? "border-l-amber-500"
                  : "border-l-slate-400"
              }`}
            >
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${PRIORITY_COLORS[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-bold uppercase ${STATUS_COLORS[ticket.status]}`}>
                        {ticket.status.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-mono-muted font-bold uppercase tracking-wider">
                        {ticket.category}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-mono-muted dark:text-mono-text truncate">
                      {ticket.title}
                    </h3>

                    <p className="text-xs text-mono-muted dark:text-mono-muted line-clamp-1">
                      {ticket.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-mono-muted font-semibold">
                      <span className="flex items-center gap-1">
                        <User className="size-3.5" />
                        Raised by: <span className="text-mono-muted dark:text-mono-muted font-bold">{ticket.raisedBy.name}</span>
                        {ticket.raisedBy.designation && ` (${ticket.raisedBy.designation})`}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5" />
                        <span suppressHydrationWarning>{new Date(ticket.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}</span>
                      </span>
                      {ticket.comments.length > 0 && (
                        <span className="flex items-center gap-1 text-[var(--mnx-accent)]">
                          <MessageSquare className="size-3.5" />
                          {ticket.comments.length} reply{ticket.comments.length > 1 ? "ies" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side actions */}
                  <div className="flex flex-wrap items-center gap-4 shrink-0 md:border-l md:border-mono-border/30 md:pl-5">
                    {/* Admin Status/Assign controls */}
                    {isAdmin ? (
                      <div className="flex flex-col gap-2 min-w-[140px]">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-mono-muted">
                            Assignee
                          </label>
                          <NativeSelect
                            value={ticket.assignee?.id || ""}
                            onChange={(e) => handleAssigneeChange(ticket.id, e.target.value)}
                            disabled={assignPending}
                            className="w-full rounded border border-mono-border/60 bg-mono-card px-2.5 py-1 text-xs text-mono-muted dark:text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
                          >
                            <option value="">Unassigned</option>
                            {admins.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                          </NativeSelect>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-mono-muted">
                            Status
                          </label>
                          <NativeSelect
                            value={ticket.status}
                            onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                            disabled={statusPending}
                            className="w-full rounded border border-mono-border/60 bg-mono-card px-2.5 py-1 text-xs text-mono-muted dark:text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
                          >
                            <option value="OPEN">Open</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="CLOSED">Closed</option>
                          </NativeSelect>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 min-w-[130px] text-xs text-mono-muted font-semibold">
                        <span className="flex items-center gap-1.5">
                          <Shield className="size-3.5 text-[var(--mnx-accent)]" />
                          Assignee:
                        </span>
                        <span className="text-mono-muted dark:text-mono-muted font-bold ml-5">
                          {ticket.assignee ? ticket.assignee.name : "Unassigned"}
                        </span>
                      </div>
                    )}

                    <Link href={`/crm/tickets/${ticket.id}`} passHref>
                      <Button size="sm" variant="outline" className="h-9 gap-1 text-xs">
                        View Thread <ArrowRight className="size-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
