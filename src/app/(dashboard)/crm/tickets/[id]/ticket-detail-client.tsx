"use client";

import {
  CrmActionLink,
  CrmButton,
  CrmSection,
  CrmTextarea,
} from "@/modules/crm/components/workspace/crm-workspace";

import { NativeSelect } from "@/components/ui/native-select";
import { useState, useTransition, FormEvent } from "react";
import { toast } from "@/modules/notifications/client";
import { addTicketCommentAction, updateTicketStatusAction, assignTicketAction } from "../actions";
import { MessageSquare, User, Calendar, ArrowLeft, Send, Shield, Info, Clock } from "lucide-react";

type Comment = {
  id: string;
  message: string;
  createdAt: Date | string;
  author: {
    name: string;
    roles: { role: { name: string } }[];
  };
};

type Ticket = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  createdAt: Date | string;
  raisedBy: { id: string; name: string; email: string; designation?: string | null };
  assignee?: { id: string; name: string } | null;
  comments: Comment[];
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-[var(--mnx-accent-soft)] text-[var(--mnx-accent-text)] dark:bg-[var(--mnx-accent-soft)] dark:text-[var(--mnx-accent-text)] border border-[var(--mnx-accent)] dark:border-[var(--mnx-accent)]",
  IN_PROGRESS: "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] dark:bg-[var(--mnx-warning-bg)] dark:text-[var(--mnx-warning)] border border-[var(--mnx-warning)] dark:border-[var(--mnx-warning)]",
  RESOLVED: "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)] dark:bg-[var(--mnx-success-bg)] dark:text-[var(--mnx-success)] border border-[var(--mnx-success)] dark:border-[var(--mnx-success)]",
  CLOSED: "bg-[var(--mnx-soft)] text-[var(--mnx-muted)] dark:bg-[var(--mnx-soft)] dark:text-[var(--mnx-muted)] border border-[var(--mnx-border)] dark:border-[var(--mnx-border)]",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-[var(--mnx-soft)] text-[var(--mnx-muted)] dark:bg-[var(--mnx-soft)] dark:text-[var(--mnx-muted)]",
  MEDIUM: "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] dark:bg-[var(--mnx-warning-bg)] dark:text-[var(--mnx-warning)] border border-[var(--mnx-warning)] dark:border-[var(--mnx-warning)]",
  HIGH: "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] dark:bg-[var(--mnx-warning-bg)] dark:text-[var(--mnx-warning)] border border-[var(--mnx-warning)] dark:border-[var(--mnx-warning)]",
  URGENT: "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)] dark:bg-[var(--mnx-danger-bg)] dark:text-[var(--mnx-danger)] border border-[var(--mnx-danger)] dark:border-[var(--mnx-danger)]",
};

interface TicketDetailClientProps {
  initialTicket: Ticket;
  admins: { id: string; name: string }[];
  isAdmin: boolean;
  currentUserId: string;
}

export function TicketDetailClient({
  initialTicket,
  admins,
  isAdmin,
  currentUserId,
}: TicketDetailClientProps) {
  const [ticket, setTicket] = useState<Ticket>(initialTicket);
  const [replyMessage, setReplyMessage] = useState("");
  const [commentPending, startCommentTransition] = useTransition();
  const [statusPending, startStatusTransition] = useTransition();
  const [assignPending, startAssignTransition] = useTransition();

  // Submit comment
  function handleCommentSubmit(e: FormEvent) {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    startCommentTransition(async () => {
      const formData = new FormData();
      formData.append("ticketId", ticket.id);
      formData.append("message", replyMessage.trim());

      const res = await addTicketCommentAction(formData);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Comment added successfully");
      setReplyMessage("");
      // Real time updates via reloading/refreshing details would happen naturally,
      // but let's append it to local state for instant UX
      const newComment: Comment = {
        id: Math.random().toString(),
        message: replyMessage.trim(),
        createdAt: new Date().toISOString(),
        author: {
          name: "You",
          roles: isAdmin ? [{ role: { name: "Admin" } }] : [],
        },
      };
      setTicket((prev) => ({
        ...prev,
        comments: [...prev.comments, newComment],
      }));
    });
  }

  // Update Status
  function handleStatusChange(newStatus: string) {
    startStatusTransition(async () => {
      const formData = new FormData();
      formData.append("ticketId", ticket.id);
      formData.append("status", newStatus);

      const res = await updateTicketStatusAction(formData);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
      setTicket((prev) => ({ ...prev, status: newStatus }));
    });
  }

  // Update Assignee
  function handleAssigneeChange(newAssigneeId: string) {
    startAssignTransition(async () => {
      const formData = new FormData();
      formData.append("ticketId", ticket.id);
      formData.append("assigneeId", newAssigneeId);

      const res = await assignTicketAction(formData);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(newAssigneeId ? "Ticket assigned successfully" : "Assignee cleared");
      const assignedUser = admins.find((u) => u.id === newAssigneeId) || null;
      setTicket((prev) => ({
        ...prev,
        assignee: assignedUser ? { id: assignedUser.id, name: assignedUser.name } : null,
        status: newAssigneeId ? "IN_PROGRESS" : "OPEN",
      }));
    });
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <CrmActionLink
          href="/crm/tickets"
          className="flex items-center gap-2 text-sm font-semibold"
        >
          <ArrowLeft className="size-4" /> Back to Support Tickets
        </CrmActionLink>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Thread and comments column (Left) */}
        <div className="lg:col-span-2 space-y-6">
          <CrmSection
            title={ticket.title}
            eyebrow={ticket.category}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${PRIORITY_COLORS[ticket.priority]}`}>
                  {ticket.priority}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${STATUS_COLORS[ticket.status]}`}>
                  {ticket.status.replace("_", " ")}
                </span>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="bg-[var(--mnx-soft)] p-4 rounded-xl border border-[var(--mnx-border)]/40">
                <p className="text-sm text-[var(--mnx-muted)] whitespace-pre-wrap leading-relaxed">
                  {ticket.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--mnx-muted)] font-semibold border-t border-[var(--mnx-border)]/40 pt-4">
                <span className="flex items-center gap-1">
                  <User className="size-3.5" />
                  Raised by: <strong className="text-[var(--mnx-text-strong)]">{ticket.raisedBy.name}</strong>
                  {ticket.raisedBy.designation && ` (${ticket.raisedBy.designation})`}
                </span>
                <span className="flex items-center gap-1" suppressHydrationWarning>
                  <Calendar className="size-3.5" />
                  Opened: {new Date(ticket.createdAt).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </CrmSection>

          {/* Conversation card */}
          <CrmSection
            title={
              <span className="flex items-center gap-2">
                <MessageSquare className="size-4 text-[var(--mnx-accent)]" /> Conversation Thread
              </span>
            }
          >
            <div>
              {ticket.comments.length === 0 ? (
                <div className="text-center text-[var(--mnx-muted)] py-12 text-sm font-medium">
                  No replies on this ticket yet.
                </div>
              ) : (
                <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto divide-y divide-outline-variant/30">
                  {ticket.comments.map((comment, index) => {
                    const authorRoles = comment.author.roles?.map((r) => r.role?.name) || [];
                    const isAdminComment = authorRoles.some((role) =>
                      ["Admin", "HR", "Management", "Director"].includes(role)
                    ) || comment.author.name === "You" && isAdmin;

                    return (
                      <div
                        key={comment.id}
                        className={`pt-4 ${index === 0 ? "pt-0 border-t-0" : ""} flex flex-col gap-1.5`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[var(--mnx-muted)] dark:text-[var(--mnx-text-strong)]">
                              {comment.author.name}
                            </span>
                            {isAdminComment && (
                              <span className="inline-flex items-center gap-1 rounded bg-[var(--mnx-accent)]/10 px-1.5 py-0.5 text-[9px] font-bold text-[var(--mnx-accent)]">
                                <Shield className="size-2.5" /> Support Team
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[var(--mnx-muted)] font-semibold" suppressHydrationWarning>
                            {new Date(comment.createdAt).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--mnx-muted)] dark:text-[var(--mnx-muted)] bg-[var(--mnx-soft)] dark:bg-[var(--mnx-soft)]/40 p-3 rounded-lg border border-[var(--mnx-border)]/20">
                          {comment.message}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reply submission */}
              {ticket.status !== "CLOSED" ? (
                <form onSubmit={handleCommentSubmit} className="border-t border-[var(--mnx-border)]/60 p-5 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--mnx-muted)]">
                      Add Reply
                    </label>
                    <CrmTextarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      rows={3}
                      placeholder="Type your response here..."
                      className="w-full rounded-lg border border-[var(--mnx-border)]/60 bg-[var(--mnx-surface)] px-3 py-2 text-sm text-[var(--mnx-muted)] dark:text-[var(--mnx-text-strong)] placeholder:text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)] transition resize-none"
                    />
                  </div>
                  <div className="flex justify-end">
                    <CrmButton
                      type="submit"
                      disabled={commentPending || !replyMessage.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--mnx-accent)] px-4 py-2 text-sm font-semibold text-[var(--mnx-text-strong)]"
                    >
                      {commentPending ? "Sending..." : "Send Reply"} <Send className="size-3.5" />
                    </CrmButton>
                  </div>
                </form>
              ) : (
                <div className="border-t border-[var(--mnx-border)]/60 p-5 bg-[var(--mnx-soft)] text-center text-[var(--mnx-muted)] text-xs font-semibold flex items-center justify-center gap-1.5">
                  <Info className="size-4" /> This ticket is closed. No further replies can be added.
                </div>
              )}
            </div>
          </CrmSection>
        </div>

        {/* Management tools column (Right) */}
        <div className="space-y-6">
          <CrmSection
            title={
              <span className="flex items-center gap-2">
                <Clock className="size-4 text-[var(--mnx-accent)]" /> Ticket Status & Metadata
              </span>
            }
          >
            <div className="space-y-4">
              {isAdmin ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--mnx-muted)]">
                      Ticket Status
                    </label>
                    <NativeSelect
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={statusPending}
                      className="w-full rounded-lg border border-[var(--mnx-border)]/60 bg-[var(--mnx-surface)] px-3 py-2 text-sm text-[var(--mnx-muted)] dark:text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </NativeSelect>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[var(--mnx-muted)]">
                      Assign Ticket To
                    </label>
                    <NativeSelect
                      value={ticket.assignee?.id || ""}
                      onChange={(e) => handleAssigneeChange(e.target.value)}
                      disabled={assignPending}
                      className="w-full rounded-lg border border-[var(--mnx-border)]/60 bg-[var(--mnx-surface)] px-3 py-2 text-sm text-[var(--mnx-muted)] dark:text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)]"
                    >
                      <option value="">Unassigned</option>
                      {admins.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--mnx-muted)]">
                      Status
                    </span>
                    <span className={`inline-flex w-fit text-xs px-2.5 py-0.5 rounded-full border font-bold uppercase ${STATUS_COLORS[ticket.status]}`}>
                      {ticket.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--mnx-muted)]">
                      Assigned Agent
                    </span>
                    <span className="text-sm font-bold text-[var(--mnx-muted)]">
                      {ticket.assignee ? ticket.assignee.name : "Unassigned"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CrmSection>
        </div>
      </div>
    </div>
  );
}
