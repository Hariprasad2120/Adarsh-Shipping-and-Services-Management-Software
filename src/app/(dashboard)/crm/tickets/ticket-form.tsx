"use client";

import { CrmButton, CrmInput, CrmTextarea } from "@/modules/crm/components/workspace/crm-workspace";

import { NativeSelect } from "@/components/ui/native-select";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createTicketAction } from "./actions";
import { Plus, ChevronUp } from "lucide-react";

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
  { value: "LOW", label: "Low", color: "text-[var(--mnx-muted)]" },
  { value: "MEDIUM", label: "Medium", color: "text-[var(--mnx-warning)]" },
  { value: "HIGH", label: "High", color: "text-[var(--mnx-warning)]" },
  { value: "URGENT", label: "Urgent", color: "text-[var(--mnx-danger)]" },
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
      <CrmButton
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--mnx-accent)]/30 bg-[var(--mnx-accent)]/5 text-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)]/10 transition-colors text-sm font-semibold shadow-sm"
      >
        <Plus className="size-4" /> Raise a support ticket
      </CrmButton>
    );
  }

  return (
    <Card className="border-0 shadow-sm border-l-4 border-l-[var(--mnx-accent)] bg-[var(--mnx-surface)]">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-bold text-[var(--mnx-muted)] dark:text-[var(--mnx-muted)]">
          New Support Ticket
        </CardTitle>
        <CrmButton
          onClick={() => setOpen(false)}
          className="text-[var(--mnx-muted)] hover:text-[var(--mnx-muted)] transition"
        >
          <ChevronUp className="size-4" />
        </CrmButton>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--mnx-muted)]">
              Title
            </label>
            <CrmInput
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of the issue..."
              maxLength={200}
              className="w-full rounded-lg border border-[var(--mnx-border)]/60 bg-[var(--mnx-surface)] px-3 py-2 text-sm text-[var(--mnx-muted)] dark:text-[var(--mnx-text-strong)] placeholder:text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)] transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--mnx-muted)]">
                Category
              </label>
              <NativeSelect
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-[var(--mnx-border)]/60 bg-[var(--mnx-surface)] px-3 py-2.5 text-sm text-[var(--mnx-muted)] dark:text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)] transition"
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[var(--mnx-muted)]">
                Priority
              </label>
              <NativeSelect
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full rounded-lg border border-[var(--mnx-border)]/60 bg-[var(--mnx-surface)] px-3 py-2.5 text-sm text-[var(--mnx-muted)] dark:text-[var(--mnx-text-strong)] focus:outline-none focus:border-[var(--mnx-accent)] transition"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[var(--mnx-muted)]">
              Description
            </label>
            <CrmTextarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the issue in detail — what happened, what you expected, and steps to reproduce..."
              className="w-full rounded-lg border border-[var(--mnx-border)]/60 bg-[var(--mnx-surface)] px-3 py-2 text-sm text-[var(--mnx-muted)] dark:text-[var(--mnx-text-strong)] placeholder:text-[var(--mnx-muted)] focus:outline-none focus:border-[var(--mnx-accent)] transition resize-none"
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
