"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PortalHeaderNav({
  items,
}: {
  items: Array<{ href: string; label: string }>;
}) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== "/customer-portal/dashboard" && pathname.startsWith(`${href}/`));

  return (
    <nav className="min-w-0 flex-1 overflow-x-auto" aria-label="Customer portal navigation">
      <div className="flex min-w-max items-center justify-start gap-x-10 gap-y-2 lg:justify-center">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "ds-label inline-flex items-center justify-center whitespace-nowrap border-b border-indigo-600 px-1 pb-1 text-indigo-700"
                  : "ds-label inline-flex items-center justify-center whitespace-nowrap border-b border-transparent px-1 pb-1 text-on-surface-variant transition-colors hover:border-indigo-300 hover:text-indigo-700"
              }
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function PortalLoginForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const response = await fetch("/api/customer-portal/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const json = await response.json();
          if (!json.ok) {
            toast.error(json.error || "Login failed");
            return;
          }
          router.push("/customer-portal/dashboard");
          router.refresh();
        });
      }}
    >
      <div className="space-y-2">
        <label className="ds-label block">Email</label>
        <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
      </div>
      <div className="space-y-2">
        <label className="ds-label block">Password</label>
        <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing In..." : "Sign In"}
      </Button>
    </form>
  );
}

export function PortalActivationForm({ token, reset = false }: { token: string; reset?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const response = await fetch(reset ? "/api/customer-portal/auth/forgot-password" : "/api/customer-portal/auth/activate", {
            method: reset ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, password }),
          });
          const json = await response.json();
          if (!json.ok) {
            toast.error(json.error || "Request failed");
            return;
          }
          toast.success(reset ? "Password reset successful" : "Account activated");
          router.push("/customer-portal/login");
        });
      }}
    >
      <div className="space-y-2">
        <label className="ds-label block">{reset ? "New Password" : "Create Password"}</label>
        <Input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          required
          minLength={12}
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Submitting..." : reset ? "Reset Password" : "Activate Account"}
      </Button>
    </form>
  );
}

export function PortalForgotPasswordRequestForm() {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          await fetch("/api/customer-portal/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          toast.success("If that account exists, a reset link has been sent.");
        });
      }}
    >
      <div className="space-y-2">
        <label className="ds-label block">Email</label>
        <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending..." : "Send Reset Link"}
      </Button>
    </form>
  );
}

export function PortalLogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await fetch("/api/customer-portal/auth/logout", { method: "POST" });
        router.push("/customer-portal/login");
        router.refresh();
      }}
    >
      Logout
    </Button>
  );
}

export function PortalMarkAllReadButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await fetch("/api/customer-portal/notifications/read-all", { method: "POST" });
        router.refresh();
      }}
    >
      Mark All Read
    </Button>
  );
}

export function PortalDocumentUploadForm({ jobId, requirementId }: { jobId: string; requirementId: string }) {
  const router = useRouter();
  const inputId = useId();
  const [pending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  const [fileName, setFileName] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        formData.set("jobId", jobId);
        formData.set("requirementId", requirementId);
        formData.set("comment", comment);
        startTransition(async () => {
          const response = await fetch("/api/customer-portal/documents/upload", {
            method: "POST",
            body: formData,
          });
          const json = await response.json();
          if (!json.ok) {
            toast.error(json.error || "Upload failed");
            return;
          }
          toast.success("Document uploaded");
          form.reset();
          setComment("");
          setFileName("");
          router.refresh();
        });
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label
          htmlFor={inputId}
          className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-dashed border-indigo-300 bg-indigo-50/60 px-4 text-sm font-semibold text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-50"
        >
          {fileName || "Choose document"}
        </label>
        <input
          id={inputId}
          name="file"
          type="file"
          required
          className="sr-only"
          onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
        />
        <Input
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Upload remark (optional)"
          className="min-h-10 flex-1 rounded-xl"
        />
        <Button type="submit" size="sm" disabled={pending || !fileName} className="min-h-10 rounded-xl px-5">
          {pending ? "Uploading..." : "Upload"}
        </Button>
      </div>
      <p className="text-[11px] text-slate-500">Use the latest valid file. Existing versions remain available in the audit history.</p>
    </form>
  );
}

export function PortalChecklistActionForm({ jobId, checklistId }: { jobId: string; checklistId: string }) {
  const router = useRouter();
  const [remarks, setRemarks] = useState("");
  const [pending, startTransition] = useTransition();

  const submitDecision = (decision: "APPROVED" | "REJECTED") => {
    startTransition(async () => {
      const response = await fetch("/api/customer-portal/checklists/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, checklistId, decision, remarks }),
      });
      const json = await response.json();
      if (!json.ok) {
        toast.error(json.error || "Checklist response failed");
        return;
      }
      toast.success(decision === "APPROVED" ? "Checklist approved" : "Checklist sent back for correction");
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <Input value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Remarks" />
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => submitDecision("APPROVED")}>
          Approve
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => submitDecision("REJECTED")}>
          Request Correction
        </Button>
      </div>
    </div>
  );
}

export function PortalQueryReplyForm({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const response = await fetch("/api/customer-portal/queries/reply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ threadId, body }),
          });
          const json = await response.json();
          if (!json.ok) {
            toast.error(json.error || "Reply failed");
            return;
          }
          toast.success("Reply submitted");
          setBody("");
          router.refresh();
        });
      }}
    >
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Type your reply"
        required
        rows={3}
        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />
      <div className="flex justify-end">
        <Button size="sm" type="submit" disabled={pending || !body.trim()} className="rounded-xl px-5">
          {pending ? "Sending..." : "Send Reply"}
        </Button>
      </div>
    </form>
  );
}

export function PortalRatingForm({ jobId, categories }: { jobId: string; categories: Array<{ key: string; label: string }> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [overallRating, setOverallRating] = useState(5);
  const [remarks, setRemarks] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>(
    Object.fromEntries(categories.map((category) => [category.key, 5])),
  );
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const response = await fetch("/api/customer-portal/ratings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId, overallRating, remarks, categoryRatings: ratings }),
          });
          const json = await response.json();
          if (!json.ok) {
            toast.error(json.error || "Rating submission failed");
            return;
          }
          toast.success("Rating submitted");
          router.refresh();
        });
      }}
    >
      <div className="space-y-2">
        <label className="ds-label block">Overall Rating</label>
        <select value={overallRating} onChange={(event) => setOverallRating(Number(event.target.value))}>
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      {categories.map((category) => (
        <div key={category.key} className="space-y-2">
          <label className="ds-label block">{category.label}</label>
          <select
            value={ratings[category.key]}
            onChange={(event) =>
              setRatings((current) => ({ ...current, [category.key]: Number(event.target.value) }))
            }
          >
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      ))}
      <Input value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Remarks" />
      <Button type="submit" disabled={pending}>
        {pending ? "Submitting..." : "Submit Rating"}
      </Button>
    </form>
  );
}

export function PortalPreferenceForm({
  initial,
}: {
  initial: {
    shipmentUpdatesEmail: boolean;
    documentUpdatesEmail: boolean;
    checklistEmail: boolean;
    queryEmail: boolean;
    ratingEmail: boolean;
    pushEnabled: boolean;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState(initial);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const response = await fetch("/api/customer-portal/profile/preferences", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(state),
          });
          const json = await response.json();
          if (!json.ok) {
            toast.error(json.error || "Preference update failed");
            return;
          }
          toast.success("Preferences updated");
          router.refresh();
        });
      }}
    >
      {Object.entries(state).map(([key, value]) => (
        <label key={key} className="flex items-center gap-3 text-sm text-on-surface">
          <input
            type="checkbox"
            checked={value}
            onChange={(event) => setState((current) => ({ ...current, [key]: event.target.checked }))}
          />
          <span>{key}</span>
        </label>
      ))}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save Preferences"}
      </Button>
    </form>
  );
}

export function PortalSecurityForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const response = await fetch("/api/customer-portal/security/password", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ currentPassword, newPassword }),
            });
            const json = await response.json();
            if (!json.ok) {
              toast.error(json.error || "Password change failed");
              return;
            }
            toast.success("Password changed. Please sign in again on your other devices.");
            setCurrentPassword("");
            setNewPassword("");
            router.refresh();
          });
        }}
      >
        <div className="space-y-2">
          <label className="ds-label block">Current Password</label>
          <Input value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} type="password" required />
        </div>
        <div className="space-y-2">
          <label className="ds-label block">New Password</label>
          <Input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" required />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Updating..." : "Change Password"}
        </Button>
      </form>

      <Button
        variant="outline"
        onClick={async () => {
          await fetch("/api/customer-portal/security/logout-all", { method: "POST" });
          toast.success("Other active sessions have been revoked.");
          router.refresh();
        }}
      >
        Logout From Other Devices
      </Button>
    </div>
  );
}
