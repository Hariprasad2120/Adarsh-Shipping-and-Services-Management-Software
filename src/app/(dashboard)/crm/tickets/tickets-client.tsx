"use client";

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
  OPEN: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900/30",
  IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900/30",
  RESOLVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/30",
  CLOSED: "bg-mono-soft text-mono-muted dark:bg-slate-800/40 dark:text-slate-400 border-mono-border dark:border-slate-700/30",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-mono-soft text-mono-muted dark:bg-slate-800/40 dark:text-slate-400",
  MEDIUM: "bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
  HIGH: "bg-orange-100 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400",
  URGENT: "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40",
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
          <input
            type="text"
            placeholder="Search tickets by title, category, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-mono-border/60 bg-mono-card px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#F9D972] transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-mono-card rounded-lg p-0.5 border border-mono-border/60">
            {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((s) => {
              const count = s === "ALL" ? tickets.length : tickets.filter((t) => t.status === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition ${
                    statusFilter === s
                      ? "bg-[#F9D972] text-white"
                      : "text-mono-muted hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {s.replace("_", " ")} ({count})
                </button>
              );
            })}
          </div>

          <NativeSelect
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-mono-border/60 bg-mono-card px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#F9D972] transition"
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
          <CardContent className="py-16 text-center text-slate-400/80 text-sm font-medium">
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
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {ticket.category}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {ticket.title}
                    </h3>

                    <p className="text-xs text-mono-muted dark:text-slate-400 line-clamp-1">
                      {ticket.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <User className="size-3.5" />
                        Raised by: <span className="text-mono-muted dark:text-slate-300 font-bold">{ticket.raisedBy.name}</span>
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
                        <span className="flex items-center gap-1 text-[#F9D972]">
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
                          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            Assignee
                          </label>
                          <NativeSelect
                            value={ticket.assignee?.id || ""}
                            onChange={(e) => handleAssigneeChange(ticket.id, e.target.value)}
                            disabled={assignPending}
                            className="w-full rounded border border-mono-border/60 bg-mono-card px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#F9D972]"
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
                          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            Status
                          </label>
                          <NativeSelect
                            value={ticket.status}
                            onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                            disabled={statusPending}
                            className="w-full rounded border border-mono-border/60 bg-mono-card px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-[#F9D972]"
                          >
                            <option value="OPEN">Open</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="CLOSED">Closed</option>
                          </NativeSelect>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 min-w-[130px] text-xs text-slate-400 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <Shield className="size-3.5 text-[#F9D972]" />
                          Assignee:
                        </span>
                        <span className="text-slate-700 dark:text-slate-300 font-bold ml-5">
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
