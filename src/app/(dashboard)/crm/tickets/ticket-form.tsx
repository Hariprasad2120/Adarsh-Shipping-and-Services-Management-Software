"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createTicketAction } from "./actions";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";

const CATEGORIES = [
  "Self-Assessment Form",
  "Reviewer / Rating",
  "Availability Confirmation",
  "Extension Request",
  "Notifications",
  "Login / Access",
  "Salary / Increment",
  "Technical Issue",
  "Other",
];

const PRIORITIES = [
  { value: "LOW", label: "Low", color: "text-slate-500" },
  { value: "MEDIUM", label: "Medium", color: "text-amber-500" },
  { value: "HIGH", label: "High", color: "text-orange-500" },
  { value: "URGENT", label: "Urgent", color: "text-red-500" },
] as const;

export function TicketForm({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [pending, startTransition] = useTransition();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (title.trim().length < 5) { toast.error("Title too short (min 5 chars)"); return; }
    if (!description.trim() || description.trim().length < 10) { toast.error("Description too short (min 10 chars)"); return; }
    if (!category) { toast.error("Select a category"); return; }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("category", category);
      formData.append("priority", priority);

      const res = await createTicketAction(formData);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Ticket submitted successfully", {
        description: "The support team has been notified.",
      });
      setTitle("");
      setDescription("");
      setCategory("");
      setPriority("MEDIUM");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#00cec4]/30 bg-[#00cec4]/5 text-[#00cec4] hover:bg-[#00cec4]/10 transition-colors text-sm font-semibold shadow-sm"
      >
        <Plus className="size-4" /> Raise a support ticket
      </button>
    );
  }

  return (
    <Card className="border-0 shadow-sm border-l-4 border-l-[#00cec4] bg-surface">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">
          New Support Ticket
        </CardTitle>
        <button
          onClick={() => setOpen(false)}
          className="text-slate-400 hover:text-slate-600 transition"
        >
          <ChevronUp className="size-4" />
        </button>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of the issue..."
              maxLength={200}
              className="w-full rounded-lg border border-outline-variant/60 bg-surface px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#00cec4] transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-outline-variant/60 bg-surface px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#00cec4] transition"
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full rounded-lg border border-outline-variant/60 bg-surface px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#00cec4] transition"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the issue in detail — what happened, what you expected, and steps to reproduce..."
              className="w-full rounded-lg border border-outline-variant/60 bg-surface px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#00cec4] transition resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={pending} className="flex-1">
              {pending ? "Submitting..." : "Submit Ticket"}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
