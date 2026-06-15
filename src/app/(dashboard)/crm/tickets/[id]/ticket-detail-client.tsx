"use client";

import { useState, useTransition, FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addTicketCommentAction, updateTicketStatusAction, assignTicketAction } from "../actions";
import { MessageSquare, User, Calendar, ArrowLeft, Send, Shield, Info, Tag, Clock } from "lucide-react";

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
  OPEN: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900/30",
  IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/30",
  RESOLVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/30",
  CLOSED: "bg-slate-100 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400 border border-slate-200 dark:border-slate-700/30",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400",
  MEDIUM: "bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30",
  HIGH: "bg-orange-100 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400 border border-orange-200 dark:border-orange-900/30",
  URGENT: "bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40",
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
        <Link href="/crm/tickets" passHref>
          <button className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition">
            <ArrowLeft className="size-4" /> Back to Support Tickets
          </button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Thread and comments column (Left) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-sm bg-surface">
            <CardHeader className="border-b border-outline-variant/60 pb-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${PRIORITY_COLORS[ticket.priority]}`}>
                  {ticket.priority}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${STATUS_COLORS[ticket.status]}`}>
                  {ticket.status.replace("_", " ")}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Tag className="size-3" /> {ticket.category}
                </span>
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                {ticket.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="bg-surface-container-low dark:bg-surface-container-lowest/30 p-4 rounded-xl border border-outline-variant/40">
                <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {ticket.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-semibold border-t border-outline-variant/40 pt-4">
                <span className="flex items-center gap-1">
                  <User className="size-3.5" />
                  Raised by: <strong className="text-slate-700 dark:text-slate-200">{ticket.raisedBy.name}</strong>
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
            </CardContent>
          </Card>

          {/* Conversation card */}
          <Card className="border-0 shadow-sm bg-surface">
            <CardHeader className="border-b border-outline-variant/60 pb-3">
              <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <MessageSquare className="size-4 text-[#00cec4]" /> Conversation Thread
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {ticket.comments.length === 0 ? (
                <div className="text-center text-slate-400/80 py-12 text-sm font-medium">
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
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {comment.author.name}
                            </span>
                            {isAdminComment && (
                              <span className="inline-flex items-center gap-1 rounded bg-[#00cec4]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#00cec4]">
                                <Shield className="size-2.5" /> Support Team
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold" suppressHydrationWarning>
                            {new Date(comment.createdAt).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 bg-surface-container-low dark:bg-surface-container-lowest/40 p-3 rounded-lg border border-outline-variant/20">
                          {comment.message}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reply submission */}
              {ticket.status !== "CLOSED" ? (
                <form onSubmit={handleCommentSubmit} className="border-t border-outline-variant/60 p-5 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Add Reply
                    </label>
                    <textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      rows={3}
                      placeholder="Type your response here..."
                      className="w-full rounded-lg border border-outline-variant/60 bg-surface px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#00cec4] transition resize-none"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={commentPending || !replyMessage.trim()}
                      className="gap-1.5"
                    >
                      {commentPending ? "Sending..." : "Send Reply"} <Send className="size-3.5" />
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="border-t border-outline-variant/60 p-5 bg-slate-50 dark:bg-slate-800/30 text-center text-slate-500 text-xs font-semibold flex items-center justify-center gap-1.5">
                  <Info className="size-4" /> This ticket is closed. No further replies can be added.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Management tools column (Right) */}
        <div className="space-y-6">
          <Card className="border-0 shadow-sm bg-surface">
            <CardHeader className="border-b border-outline-variant/60 pb-3">
              <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Clock className="size-4 text-[#00cec4]" /> Ticket Status & Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {isAdmin ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Ticket Status
                    </label>
                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={statusPending}
                      className="w-full rounded-lg border border-outline-variant/60 bg-surface px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#00cec4]"
                    >
                      <option value="OPEN">Open</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Assign Ticket To
                    </label>
                    <select
                      value={ticket.assignee?.id || ""}
                      onChange={(e) => handleAssigneeChange(e.target.value)}
                      disabled={assignPending}
                      className="w-full rounded-lg border border-outline-variant/60 bg-surface px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#00cec4]"
                    >
                      <option value="">Unassigned</option>
                      {admins.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </span>
                    <span className={`inline-flex w-fit text-xs px-2.5 py-0.5 rounded-full border font-bold uppercase ${STATUS_COLORS[ticket.status]}`}>
                      {ticket.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Assigned Agent
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {ticket.assignee ? ticket.assignee.name : "Unassigned"}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
