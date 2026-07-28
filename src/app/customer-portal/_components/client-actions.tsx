"use client";

import { NativeSelect } from "@/components/monolith/native-select";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useSyncExternalStore, useTransition } from "react";
import type { CSSProperties } from "react";
import {
  Bell,
  CheckSquare,
  Clock,
  Download,
  FileText,
  LayoutDashboard,
  LogOut,
  Mail,
  Moon,
  Palette,
  Phone,
  Search,
  Settings,
  ShieldAlert,
  Ship,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/monolith/badge";
import { Button } from "@/components/monolith/button";
import { Input } from "@/components/monolith/input";
import type {
  PortalAuditLogSummary,
  PortalCoordinator,
  PortalDocumentRequirementSummary,
  PortalRatingCategory,
  PortalShipmentDetailView,
  PortalShipmentSummary,
  PortalStageMapping,
} from "@/modules/customer-portal/types";

type PortalTheme = "night" | "violet" | "light" | "purple";

const portalThemeIcons: Record<PortalTheme, React.ReactNode> = {
  night: <Moon />,
  violet: <Sparkles />,
  light: <Sun />,
  purple: <Palette />,
};

type PortalShipmentAdditionalData = {
  assessedValue?: number | null;
  billOfLadingNo?: string | null;
  containerNumbers?: string | null;
  deliveryOrderValidity?: string | Date | null;
  dutyPaid?: boolean | null;
  exportGeneralManifest?: string | null;
  importGeneralManifest?: string | null;
  portOfLoading?: string | null;
  vesselInwardDate?: string | Date | null;
  vesselName?: string | null;
};

function subscribeToPortalTheme(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleThemeChange = () => callback();
  window.addEventListener("storage", handleThemeChange);
  window.addEventListener("themechange", handleThemeChange);

  return () => {
    window.removeEventListener("storage", handleThemeChange);
    window.removeEventListener("themechange", handleThemeChange);
  };
}

function getPortalThemeSnapshot(): PortalTheme {
  if (typeof document === "undefined") {
    return "night";
  }

  const root = document.documentElement;
  if (root.classList.contains("purple")) return "purple";
  if (root.classList.contains("violet")) return "violet";
  if (root.classList.contains("night")) return "night";
  return "light";
}

function getPortalThemeServerSnapshot(): PortalTheme {
  return "night";
}

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
                  ? "monolith-label inline-flex items-center justify-center whitespace-nowrap border-b border-[#F9D972] px-1 pb-1 text-[#F9D972]"
                  : "monolith-label inline-flex items-center justify-center whitespace-nowrap border-b border-transparent px-1 pb-1 text-mono-muted transition-colors hover:text-[#E8C85D] hover:border-[#F9D972]/60"
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
        <label className="monolith-label block">Email</label>
        <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
      </div>
      <div className="space-y-2">
        <label className="monolith-label block">Password</label>
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
        <label className="monolith-label block">{reset ? "New Password" : "Create Password"}</label>
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
        <label className="monolith-label block">Email</label>
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
  const [pending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
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
          setComment("");
          router.refresh();
        });
      }}
    >
      <input name="file" type="file" required className="block w-full text-sm text-mono-muted" />
      <Input
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Add an upload remark (optional)"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Uploading..." : "Upload"}
      </Button>
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
      <Input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Reply to this query" required />
      <Button size="sm" type="submit" disabled={pending}>
        {pending ? "Sending..." : "Send Reply"}
      </Button>
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
        <label className="monolith-label block">Overall Rating</label>
        <NativeSelect value={overallRating} onChange={(event) => setOverallRating(Number(event.target.value))}>
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </NativeSelect>
      </div>
      {categories.map((category) => (
        <div key={category.key} className="space-y-2">
          <label className="monolith-label block">{category.label}</label>
          <NativeSelect
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
          </NativeSelect>
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
        <label key={key} className="flex items-center gap-3 text-sm text-mono-text">
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
          <label className="monolith-label block">Current Password</label>
          <Input value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} type="password" required />
        </div>
        <div className="space-y-2">
          <label className="monolith-label block">New Password</label>
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

// ─── Portal Shell Layout Components ─────────────────────────────────────────

interface PortalShellClientProps {
  children: React.ReactNode;
  portalUser: {
    name: string;
    email: string;
    designation: string | null;
    customer: {
      id: string;
      name: string;
    };
  };
  unreadNotificationsCount: number;
  pendingApprovalsCount: number;
  activeShipmentsCount: number;
  coordinator: PortalCoordinator | null;
}

export function PortalShellClient({
  children,
  portalUser,
  unreadNotificationsCount,
  pendingApprovalsCount,
  activeShipmentsCount,
  coordinator,
}: PortalShellClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useSyncExternalStore(
    subscribeToPortalTheme,
    getPortalThemeSnapshot,
    getPortalThemeServerSnapshot,
  );
  const [contactModalOpen, setContactModalOpen] = useState(false);

  const toggleTheme = () => {
    const root = document.documentElement;
    const newTheme: PortalTheme =
      theme === "night" ? "violet" : theme === "violet" ? "light" : theme === "light" ? "purple" : "night";
    root.classList.remove("dark", "light", "night", "violet", "purple", "theme-light", "theme-night", "theme-violet", "theme-purple");
    root.classList.add(newTheme, `theme-${newTheme}`);
    root.style.colorScheme = newTheme === "light" || newTheme === "purple" ? "light" : "dark";
    localStorage.setItem("theme", newTheme);
    window.dispatchEvent(new Event("themechange"));
    toast.success(`${newTheme[0].toUpperCase()}${newTheme.slice(1)} theme enabled`);
  };

  const menuItems = [
    {
      href: "/customer-portal/dashboard",
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      href: "/customer-portal/shipments",
      label: "Shipments",
      icon: Ship,
      badge: activeShipmentsCount > 0 ? activeShipmentsCount : undefined,
    },
    {
      href: "/customer-portal/approvals",
      label: "Approvals",
      icon: CheckSquare,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
    },
    {
      href: "/customer-portal/kyc",
      label: "KYC & Documents",
      icon: FileText,
    },
    {
      href: "/customer-portal/notifications",
      label: "Notifications",
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
  ];

  const isActive = (href: string) => {
    if (href === "/customer-portal/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className="monolith-app-body">
      <div className="monolith-portal-shell">
        {/* Sidebar Desktop */}
        <aside className="monolith-sidebar">
          <div className="monolith-brand">
            <div className="monolith-brand-mark" aria-hidden="true" />
            <div>
              <strong className="block text-sm uppercase tracking-[0.12em] text-mono-text">Monolith</strong>
              <small className="monolith-label block">Customer Portal</small>
            </div>
          </div>

          <div>
            <div className="monolith-nav-group-title font-sans">Workspace</div>
            <nav className="monolith-nav-list font-sans">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`monolith-nav-item ${active ? "is-active" : ""}`}
                  >
                    <Icon />
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="monolith-nav-badge">{item.badge}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div>
            <div className="monolith-nav-group-title font-sans">Account</div>
            <nav className="monolith-nav-list font-sans">
              <Link
                href="/customer-portal/profile"
                className={`monolith-nav-item ${
                  pathname === "/customer-portal/profile" || pathname === "/customer-portal/security" ? "is-active" : ""
                }`}
              >
                <Settings />
                <span>Settings</span>
              </Link>
              <button
                onClick={async () => {
                  await fetch("/api/customer-portal/auth/logout", { method: "POST" });
                  router.push("/customer-portal/login");
                  router.refresh();
                }}
                className="monolith-nav-item w-full"
              >
                <LogOut />
                <span>Logout</span>
              </button>
            </nav>
          </div>

          <div className="flex-1"></div>

          {coordinator && (
            <div className="monolith-support-card font-sans space-y-3">
              <strong className="block text-sm text-mono-text">Need assistance?</strong>
              <p className="text-xs leading-5 text-mono-muted">Your assigned CHA coordinator is available for shipment or document queries.</p>
              <Button variant="outline" size="sm" className="w-full" onClick={() => setContactModalOpen(true)}>Contact coordinator</Button>
            </div>
          )}
        </aside>

        {/* Main Workspace */}
        <main className="flex min-w-0 flex-col">
          {/* Topbar */}
          <header className="monolith-topbar">
            <div className="font-sans">
              <small className="monolith-label block">Customer Portal / {pathname.split("/").pop()}</small>
              <strong className="block text-base text-mono-text">{portalUser.customer.name}</strong>
            </div>

            <div className="flex items-center gap-3 font-sans">
              <button
                className="monolith-icon-button"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {portalThemeIcons[theme]}
              </button>
              <Link
                href="/customer-portal/notifications"
                className="monolith-icon-button"
                aria-label="Notifications"
              >
                {unreadNotificationsCount > 0 && <span className="monolith-alert-dot"></span>}
                <Bell />
              </Link>
              <div
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-mono-border bg-mono-card px-2 py-1 transition hover:border-[#F9D972]/35"
                onClick={() => router.push("/customer-portal/profile")}
              >
                <div className="monolith-avatar">{getInitials(portalUser.name)}</div>
                <div data-portal-designation>
                  <strong className="block text-xs text-mono-text">{portalUser.name}</strong>
                  <span className="block text-[10px] text-mono-muted">{portalUser.designation ?? "Portal contact"}</span>
                </div>
              </div>
            </div>
          </header>

          {/* Children View */}
          <div className="monolith-portal-content">{children}</div>
        </main>
      </div>

      {/* Mobile bottom navigation bar */}
      <nav className="monolith-mobile-nav font-sans">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} className={active ? "is-active" : ""}>
              <Icon />
              <span>{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>

      {/* Coordinator Modal */}
      {contactModalOpen && coordinator && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setContactModalOpen(false)}
        >
          <div
            className="monolith-card monolith-accent w-full max-w-md rounded-xl border border-mono-border/60 bg-mono-card p-6 shadow-2xl relative overflow-hidden font-sans space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="monolith-h3 text-mono-text">
                  CHA Support Coordinator
                </h3>
                <p className="text-xs text-mono-muted mt-1">
                  Get directly in touch with your assigned operational manager.
                </p>
              </div>
              <button
                className="p-1.5 rounded-lg border border-mono-border/30 bg-mono-card hover:bg-mono-soft transition-colors"
                onClick={() => setContactModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="rounded-xl border border-mono-border/40 bg-mono-soft p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-[#F9D972]/10 text-[#F9D972]">
                  <Settings size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-mono-text">{coordinator.name}</h4>
                  <p className="text-xs text-mono-muted">{coordinator.designation ?? "Operations Executive"}</p>
                </div>
              </div>

              <div className="border-t border-mono-border/30 my-2 pt-2 space-y-2">
                <a
                  href={`mailto:${coordinator.email}`}
                  className="flex items-center gap-2.5 text-xs text-[#F9D972] hover:underline"
                >
                  <Mail size={14} />
                  <span>{coordinator.email}</span>
                </a>
                {coordinator.phone && (
                  <a
                    href={`tel:${coordinator.phone}`}
                    className="flex items-center gap-2.5 text-xs text-[#F9D972] hover:underline"
                  >
                    <Phone size={14} />
                    <span>{coordinator.phone}</span>
                  </a>
                )}
                {coordinator.officeHours && (
                  <div className="flex items-center gap-2.5 text-xs text-mono-muted">
                    <Clock size={14} />
                    <span>Office Hours: {coordinator.officeHours}</span>
                  </div>
                )}
              </div>
            </div>

            {coordinator.escalationName && (
              <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 space-y-2">
                <h5 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert size={14} />
                  <span>Escalation Contact</span>
                </h5>
                <p className="text-xs text-mono-muted">
                  If your issue is unresolved, escalate to:
                </p>
                <p className="text-xs font-semibold text-mono-text">
                  {coordinator.escalationName}
                </p>
                {coordinator.escalationEmail && (
                  <a
                    href={`mailto:${coordinator.escalationEmail}`}
                    className="block text-xs text-orange-400 hover:underline"
                  >
                    {coordinator.escalationEmail}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function PortalShipHeroCard({ shipment }: { shipment: PortalShipmentSummary | null }) {
  const router = useRouter();

  if (!shipment) {
    return (
      <article className="monolith-card monolith-accent flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-mono-border/60 bg-mono-card p-6 text-center shadow-sm">
        <div className="monolith-icon-badge mb-4">
          <Ship size={18} />
        </div>
        <p className="monolith-label">Priority Shipment</p>
        <p className="mt-3 text-sm text-mono-text">No active shipments in progress.</p>
        <p className="mt-1 text-xs text-mono-muted">When shipments are logged, they will appear here live.</p>
      </article>
    );
  }

  const progress = shipment.progressPercent || 0;
  const stage = shipment.currentStage || "Documents Awaited";
  const manifest = shipment.customerRef || shipment.title || "No Reference";

  return (
    <article
      className="monolith-card monolith-accent flex min-h-[260px] flex-col justify-between rounded-xl border border-mono-border/60 bg-mono-card p-6 shadow-sm transition hover:-translate-y-0.5 monolith-hover"
      onClick={() => router.push(`/customer-portal/shipments/${shipment.id}`)}
      style={{ cursor: "pointer" }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="monolith-label text-[#F9D972]">Priority shipment</div>
          <div className="monolith-h1 mt-2 text-mono-text">{shipment.jobNumber}</div>
          <div className="mt-2 text-xs text-mono-muted">
            {shipment.clearanceType} · {shipment.shipmentType} · Ref: {manifest}
          </div>
        </div>
        <Badge variant="default">{stage}</Badge>
      </div>

      <div className="my-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="monolith-card monolith-accent rounded-xl border border-mono-border/40 bg-mono-soft p-4">
          <p className="monolith-label">Origin</p>
          <p className="mt-2 text-sm text-mono-text">Export Hub</p>
        </div>
        <div className="monolith-card monolith-accent rounded-xl border border-mono-border/40 bg-mono-soft p-4">
          <p className="monolith-label">Destination</p>
          <p className="mt-2 text-sm text-mono-text">Customs Clearance</p>
        </div>
        <div className="monolith-card monolith-accent rounded-xl border border-mono-border/40 bg-mono-soft p-4">
          <p className="monolith-label">Progress</p>
          <p className="monolith-numeric mt-2 text-sm text-mono-text">{progress}%</p>
        </div>
      </div>

      <div className="font-sans">
        <div className="mb-2 flex items-center justify-between text-xs">
          <strong className="text-mono-text">{progress}% clearance completed</strong>
          <span className="text-mono-muted">Live Tracking</span>
        </div>
        <div className="monolith-progress-bar">
          <span style={{ width: `${progress}%` }}></span>
        </div>
      </div>
    </article>
  );
}

export function PortalShipmentsFilterPanel({
  initialSearch = "",
  initialScope = "all",
  initialMode = "all",
  initialTrade = "all",
}: {
  initialSearch?: string;
  initialScope?: string;
  initialMode?: string;
  initialTrade?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [scope, setScope] = useState(initialScope);
  const [mode, setMode] = useState(initialMode);
  const [trade, setTrade] = useState(initialTrade);

  const applyFilters = (updates: Record<string, string>) => {
    const params = new URLSearchParams(window.location.search);
    
    if (search) params.set("search", search);
    else params.delete("search");
    
    params.set("scope", updates.scope ?? scope);
    params.set("mode", updates.mode ?? mode);
    params.set("trade", updates.trade ?? trade);

    router.push(`/customer-portal/shipments?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({});
  };

  const handleScopeChange = (newScope: string) => {
    setScope(newScope);
    applyFilters({ scope: newScope });
  };

  return (
    <div className="space-y-5 font-sans">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-1">
          <p className="monolith-label text-[#F9D972]">Filter live shipments</p>
          <p className="text-sm text-mono-muted">
            Narrow the logbook by status, transit mode, and trade type without losing your current context.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#F9D972]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#008f89]">
            Smart filters
          </span>
          <span className="rounded-full bg-mono-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-mono-muted">
            Portal logbook
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-mono-border/30 pb-3">
        {[
          { key: "all", label: "All Shipments" },
          { key: "active", label: "Active" },
          { key: "action", label: "Action Required" },
          { key: "completed", label: "Completed" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleScopeChange(tab.key)}
            className={scope === tab.key ? "monolith-button" : "monolith-button-outline"}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl pl-10 text-xs"
            placeholder="Search by job number, reference, or shipment"
          />
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mono-muted" />
          <button
            type="submit"
            className="absolute right-3 top-2.5 text-mono-muted hover:text-mono-text"
          >
            <Search size={14} />
          </button>
        </div>

        <NativeSelect
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            applyFilters({ mode: e.target.value });
          }}
          className="w-full rounded-xl text-xs"
        >
          <option value="all">All Transit Modes</option>
          <option value="sea">Ocean Freight</option>
          <option value="air">Air Freight</option>
        </NativeSelect>

        <NativeSelect
          value={trade}
          onChange={(e) => {
            setTrade(e.target.value);
            applyFilters({ trade: e.target.value });
          }}
          className="w-full rounded-xl text-xs"
        >
          <option value="all">All Trade Types</option>
          <option value="import">Import Clearance</option>
          <option value="export">Export Clearance</option>
        </NativeSelect>

        <button
          type="button"
          onClick={() => {
            setSearch("");
            setScope("all");
            setMode("all");
            setTrade("all");
            router.push("/customer-portal/shipments");
          }}
          className="monolith-button-outline w-full"
        >
          Reset Filters
        </button>
      </form>
    </div>
  );
}

interface PortalShipmentWorkspaceProps {
  shipmentId: string;
  initialTab: string;
  detail: PortalShipmentDetailView;
  ratingCategories: PortalRatingCategory[];
  ratingSubmitted: boolean;
  coordinator: PortalCoordinator | null;
  kycUploadsAllowed: boolean;
}

type PortalSelectedDrawerStage = PortalStageMapping & {
  statusClass: string;
  index: number;
};

export function PortalShipmentWorkspace({
  shipmentId,
  initialTab,
  detail,
  ratingCategories,
  ratingSubmitted,
  coordinator,
  kycUploadsAllowed,
}: PortalShipmentWorkspaceProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedDrawerStage, setSelectedDrawerStage] = useState<PortalSelectedDrawerStage | null>(null);

  const setTab = (newTab: string) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(window.location.search);
    params.set("tab", newTab);
    router.push(`/customer-portal/shipments/${shipmentId}?${params.toString()}`);
  };

  const { job, stageMappings, currentStage } = detail;
  const additionalData = job.additionalData as PortalShipmentAdditionalData | null;

  // 1. Delivery Order Validity calculation
  const getDoValidityWarning = (additionalData: PortalShipmentAdditionalData | null) => {
    if (!additionalData || !additionalData.deliveryOrderValidity) return null;
    const validity = new Date(additionalData.deliveryOrderValidity);
    const now = new Date();
    const diffTime = validity.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { message: `Delivery Order Validity has expired! (${formatDate(validity)})`, severity: "danger" };
    } else if (diffDays <= 4) {
      return { message: `Delivery Order Validity expires in ${diffDays} day(s)! (${formatDate(validity)})`, severity: "warning" };
    }
    return null;
  };

  const doWarning = getDoValidityWarning(additionalData);

  function formatDate(value: string | Date | null | undefined) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  }

  // Visual Horizontal Timeline Calculation
  const DEFAULT_STAGES = [
    { key: "DOCUMENT_COLLECTION", label: "Documents" },
    { key: "ADDITIONAL_DATA", label: "Verification" },
    { key: "CHECKLIST_PREPARATION", label: "Checklist Prep" },
    { key: "CHECKLIST_APPROVAL", label: "Approvals" },
    { key: "FILING", label: "Filing" },
    { key: "COMPLETED", label: "Out of Charge" },
    { key: "FILED", label: "Delivered" },
  ];

  const internalStage = job.status === "FILED" || job.stage === "FILED" ? "FILED" : job.stage;
  const currentStageIdx = DEFAULT_STAGES.findIndex(s => s.key === internalStage || (currentStage?.label || "").toLowerCase().includes(s.label.toLowerCase()));
  const activeStageIndex = currentStageIdx !== -1 ? currentStageIdx : 3;
  const timelineProgress = `${Math.round((activeStageIndex / (DEFAULT_STAGES.length - 1)) * 100)}%`;
  const timelineStyle = { "--monolith-timeline-progress": timelineProgress } as CSSProperties;
  const ratingAvailable = job.status === "COMPLETED" || job.stage === "FILED";

  return (
    <div className="space-y-6 font-sans">
      {/* ─── Detail Header Panel ─── */}
      <div className="rounded-xl border border-mono-border/60 bg-mono-card p-6 shadow-sm space-y-6 relative overflow-hidden">
        <div className="monolith-card monolith-accent absolute inset-x-0 top-0 h-1 bg-[#F9D972]"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="monolith-label text-xs tracking-wider">{job.jobNumber}</span>
              <Badge
                variant={job.status === "ACTIVE" ? "default" : "success"}
                style={{
                  backgroundColor: job.status === "ACTIVE" ? "rgba(0,206,196,0.1)" : "rgba(34,197,94,0.1)",
                  color: job.status === "ACTIVE" ? "#F9D972" : "#22c55e",
                  border: "none",
                  fontSize: "10px",
                  padding: "2px 8px"
                }}
              >
                {job.status}
              </Badge>
            </div>
            <h2 className="monolith-h1 mt-1.5 text-mono-text">
              {job.customerRef || job.title || "CHA Shipment"}
            </h2>
            <p className="text-xs text-mono-muted font-semibold mt-1">
              Mode: {job.jobType?.name} · Trade: {job.shipmentType?.name} · Destination Port: {additionalData?.portOfLoading || "Customs Port"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/customer-portal/shipments")}
              className="monolith-button-outline"
            >
              Back to logbook
            </button>
          </div>
        </div>

        {/* Persistent DO Warning Banner */}
        {doWarning && (
          <div
            className={`rounded-xl border p-4 text-xs font-semibold flex items-center gap-3 ${
              doWarning.severity === "danger"
                ? "border-red-500/30 bg-red-500/5 text-red-500"
                : "border-orange-500/30 bg-orange-500/5 text-orange-500"
            }`}
          >
            <ShieldAlert size={16} />
            <span>{doWarning.message}</span>
          </div>
        )}

        {/* Horizontal Timeline Clearance steps */}
        <div className="border-t border-mono-border/20 pt-6">
          <div className="monolith-timeline" style={timelineStyle}>
            {DEFAULT_STAGES.map((stage, idx) => {
              let statusClass = "";
              if (idx < activeStageIndex) statusClass = "done";
              else if (idx === activeStageIndex) statusClass = "active";

              const mapping = stageMappings.find((m) => m.internalStageKey === stage.key) || {
                label: stage.label,
                description: `CHA Stage ${stage.label}`,
                sortOrder: idx + 1
              };

              return (
                <div
                  key={stage.key}
                  className={`monolith-stage ${statusClass} cursor-pointer`}
                  onClick={() => setSelectedDrawerStage({ ...mapping, statusClass, index: idx + 1 })}
                >
                  <div className="monolith-stage-dot">
                    {idx < activeStageIndex ? "✓" : idx + 1}
                  </div>
                  <strong>{stage.label}</strong>
                  <span>{idx === activeStageIndex ? "Live" : idx < activeStageIndex ? "Passed" : "Upcoming"}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Tabs Navigation Row ─── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-mono-border/30 pb-1">
        {[
          { key: "overview", label: "Overview" },
          { key: "documents", label: "Documents" },
          { key: "approvals", label: "Approvals" },
          { key: "queries", label: "Queries" },
          { key: "rating", label: "Service Rating" },
          { key: "activity", label: "Activity Logs" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setTab(tab.key)}
            className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${
              activeTab === tab.key
                ? "border-[#F9D972] text-[#F9D972]"
                : "border-transparent text-mono-muted hover:text-mono-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Tab Content Box ─── */}
      <div className="min-h-[300px]">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Meta Parameters */}
            <div className="md:col-span-2 rounded-xl border border-mono-border/60 bg-mono-card p-6 shadow-sm space-y-6">
              <div className="monolith-form-section">
                <h3 className="monolith-h3">Clearance parameters</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 text-xs font-sans">
                  <div>
                    <span className="text-mono-muted font-medium block">Vessel Inward Date</span>
                    <strong className="text-mono-text text-sm block mt-1">
                      {formatDate(additionalData?.vesselInwardDate)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-mono-muted font-medium block">Import General Manifest (IGM)</span>
                    <strong className="text-mono-text text-sm block mt-1">
                      {additionalData?.importGeneralManifest || "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-mono-muted font-medium block">Export General Manifest (EGM)</span>
                    <strong className="text-mono-text text-sm block mt-1">
                      {additionalData?.exportGeneralManifest || "—"}
                    </strong>
                  </div>
                  <div className="pt-2">
                    <span className="text-mono-muted font-medium block">Delivery Order Validity</span>
                    <strong className="text-mono-text text-sm block mt-1">
                      {formatDate(additionalData?.deliveryOrderValidity)}
                    </strong>
                  </div>
                  <div className="pt-2">
                    <span className="text-mono-muted font-medium block">Customs Assessed Value</span>
                    <strong className="text-mono-text text-sm block mt-1 monolith-numeric">
                      {additionalData?.assessedValue ? `₹${additionalData.assessedValue.toLocaleString()}` : "Pending"}
                    </strong>
                  </div>
                  <div className="pt-2">
                    <span className="text-mono-muted font-medium block">Duty Payment Status</span>
                    <strong className="text-mono-text text-sm block mt-1">
                      {additionalData?.dutyPaid ? "Paid" : "Awaiting assessment"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="monolith-form-section border-t border-mono-border/20 pt-6">
              <h3 className="monolith-h3">Shipment specifications</h3>
                <div className="grid grid-cols-2 gap-4 pt-4 text-xs font-sans">
                  <div>
                    <span className="text-mono-muted font-medium block">Vessel / Voyage</span>
                    <strong className="text-mono-text mt-1 block">{additionalData?.vesselName || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-mono-muted font-medium block">Port of Loading</span>
                    <strong className="text-mono-text mt-1 block">{additionalData?.portOfLoading || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-mono-muted font-medium block">Bill of Lading / Airway Bill</span>
                    <strong className="text-mono-text mt-1 block">{additionalData?.billOfLadingNo || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-mono-muted font-medium block">Container Numbers</span>
                    <strong className="text-mono-text mt-1 block">{additionalData?.containerNumbers || "—"}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Coordinator assigned contact details card */}
            <div className="rounded-xl border border-mono-border/60 bg-mono-card p-6 shadow-sm space-y-4 h-fit">
              <h3 className="monolith-h3 text-mono-text">
                Clearance Coordinator
              </h3>
              
              {coordinator ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-[#F9D972]/10 text-[#F9D972]">
                      <Settings size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-mono-text">{coordinator.name}</h4>
                      <p className="text-[10px] text-mono-muted">{coordinator.designation || "Operations Manager"}</p>
                    </div>
                  </div>

                  <div className="border-t border-mono-border/20 pt-4 space-y-2">
                    <a
                      href={`mailto:${coordinator.email}`}
                      className="flex items-center gap-2 text-xs text-[#F9D972] hover:underline"
                    >
                      <Mail size={12} />
                      <span>{coordinator.email}</span>
                    </a>
                    {coordinator.phone && (
                      <a
                        href={`tel:${coordinator.phone}`}
                        className="flex items-center gap-2 text-xs text-[#F9D972] hover:underline"
                      >
                        <Phone size={12} />
                        <span>{coordinator.phone}</span>
                      </a>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-mono-muted">
                      <Clock size={12} />
                      <span>Hours: {coordinator.officeHours || "9 AM - 6 PM"}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-mono-muted italic">No coordinator assigned yet.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "documents" && (
          <div className="rounded-xl border border-mono-border/60 bg-mono-card p-6 shadow-sm space-y-6">
            <div>
              <h3 className="monolith-h3">Clearance documents checklist</h3>
              <p className="text-xs text-mono-muted mt-1">
                Upload required KYC, manifest, or regulatory certificates. Pending uploads will block checklist approvals.
              </p>
            </div>

            <div className="space-y-4">
              {job.documentRequirements.map((requirement: PortalDocumentRequirementSummary) => {
                const submission = requirement.customerSubmissions[0];
                const latestVersion = submission?.versions?.[0];
                const status = submission?.status ?? "PENDING";
                
                const isApproved = status === "ACCEPTED";
                const isRejected = status === "REJECTED";

                return (
                  <div key={requirement.id} className="rounded-xl border border-mono-border/40 bg-mono-soft p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-mono-text uppercase tracking-wide">{requirement.name}</h4>
                        {submission?.reviewerComment && (
                          <p className="text-[11px] text-orange-400 mt-0.5">Comment: {submission.reviewerComment}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          variant={isApproved ? "success" : isRejected ? "destructive" : "default"}
                          style={{
                            backgroundColor: isApproved ? "rgba(34,197,94,0.1)" : isRejected ? "rgba(239,68,68,0.1)" : "rgba(251,146,60,0.1)",
                            color: isApproved ? "#22c55e" : isRejected ? "#ef4444" : "#D88700",
                            border: "none",
                            fontSize: "10px",
                          }}
                        >
                          {status}
                        </Badge>

                        {latestVersion && (
                          <a
                            href={`/api/customer-portal/document-versions/${latestVersion.id}`}
                            className="monolith-button-outline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download size={12} />
                            <span>Download</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Show upload form if allowed and document is not approved yet */}
                    {!isApproved && kycUploadsAllowed && (
                      <div className="border-t border-mono-border/20 pt-4">
                        <PortalDocumentUploadForm jobId={job.id} requirementId={requirement.id} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "approvals" && (
          <div className="rounded-xl border border-mono-border/60 bg-mono-card p-6 shadow-sm space-y-6">
            <div>
              <h3 className="monolith-h3">Draft checklist approval</h3>
              <p className="text-xs text-mono-muted mt-1">
                Confirm and approve the operational checklist draft. This is required before filing can be submitted to customs.
              </p>
            </div>

            {job.checklistWorkflow ? (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 rounded-xl border border-mono-border/40 bg-mono-soft p-4">
                  <div>
                    <h4 className="text-xs font-bold text-mono-text uppercase tracking-wide">
                      Checklist Reference
                    </h4>
                    <p className="text-xs text-mono-muted mt-1">
                      Status: <strong className="text-[#F9D972]">{job.checklistWorkflow.status}</strong>
                    </p>
                  </div>

                  {job.checklistWorkflow.currentFileVersion && (
                    <a
                      href={`/api/customer-portal/checklist-files/${job.checklistWorkflow.currentFileVersion.id}`}
                      className="monolith-button-outline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Download size={14} />
                      <span>Preview Draft PDF</span>
                    </a>
                  )}
                </div>

                {detail.actions.checklistPending ? (
                  <div className="rounded-xl border border-[#F9D972]/20 bg-[#F9D972]/5 p-6">
                    <PortalChecklistActionForm jobId={job.id} checklistId={job.checklistWorkflow.id} />
                  </div>
                ) : (
                  <div className="rounded-xl border border-mono-border/30 bg-mono-soft p-6 text-center text-xs text-mono-muted">
                    Checklist action is not active or has already been approved.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-mono-muted italic border border-mono-border/30 rounded-xl bg-mono-soft">
                No draft checklist has been generated for approval yet.
              </div>
            )}
          </div>
        )}

        {activeTab === "queries" && (
          <div className="rounded-xl border border-mono-border/60 bg-mono-card p-6 shadow-sm space-y-6">
            <div>
              <h3 className="monolith-h3">Secure communication threads</h3>
              <p className="text-xs text-mono-muted mt-1">
                Direct operational communication channel with the customs clearing team handling your file.
              </p>
            </div>

            <div className="space-y-6">
              {job.customerQueryThreads.length === 0 ? (
                <div className="text-center py-12 text-xs text-mono-muted italic border border-mono-border/30 rounded-xl bg-mono-soft">
                  No active queries raised on this shipment.
                </div>
              ) : (
                job.customerQueryThreads.map((thread) => (
                  <div key={thread.id} className="rounded-xl border border-mono-border/40 bg-mono-soft p-6 space-y-4">
                    <div className="flex justify-between items-start border-b border-mono-border/20 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-mono-text">{thread.title}</h4>
                        <p className="text-xs text-mono-muted mt-0.5">{thread.description}</p>
                      </div>
                      {thread.requiresCustomerAction && (
                        <Badge
                          variant="warning"
                          style={{
                            backgroundColor: "rgba(251,146,60,0.1)",
                            color: "#D88700",
                            border: "none",
                            fontSize: "10px",
                          }}
                        >
                          ACTION REQUIRED
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                      {thread.messages.map((message) => {
                        const isSystem = message.authorId === "system";
                        return (
                          <div
                            key={message.id}
                            className={`rounded-xl p-3 text-xs max-w-[85%] ${
                              isSystem
                                ? "bg-mono-card border border-mono-border/30 mr-auto"
                                : "bg-[#F9D972]/10 text-mono-text ml-auto text-right"
                            }`}
                          >
                            <p className="font-semibold text-[10px] text-mono-muted mb-1">
                              {isSystem ? "CHA Agent" : "You (Portal)"} · {formatDate(message.createdAt)}
                            </p>
                            <p className="whitespace-pre-line">{message.body}</p>
                          </div>
                        );
                      })}
                    </div>

                    {thread.requiresCustomerAction && (
                      <div className="border-t border-mono-border/20 pt-4">
                        <PortalQueryReplyForm threadId={thread.id} />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "rating" && (
          <div className="rounded-xl border border-mono-border/60 bg-mono-card p-6 shadow-sm space-y-6">
            <div>
              <h3 className="monolith-h3">Service rating</h3>
              <p className="text-xs text-mono-muted mt-1">
                Share your experience after the shipment is completed so the CHA team can improve service quality.
              </p>
            </div>

            {!ratingAvailable ? (
              <div className="rounded-xl border border-mono-border/30 bg-mono-soft p-6 text-center text-xs text-mono-muted">
                Ratings become available once the shipment reaches completion.
              </div>
            ) : ratingSubmitted ? (
              <div className="rounded-xl border border-[#22c55e]/20 bg-[#22c55e]/5 p-6 text-center">
                <p className="text-sm font-semibold text-mono-text">Your rating has already been submitted.</p>
                <p className="mt-2 text-xs text-mono-muted">
                  Thank you for sharing feedback on this clearance experience.
                </p>
              </div>
            ) : (
              <PortalRatingForm jobId={job.id} categories={ratingCategories} />
            )}
          </div>
        )}

        {activeTab === "activity" && (
          <div className="rounded-xl border border-mono-border/60 bg-mono-card p-6 shadow-sm space-y-6">
            <div>
              <h3 className="monolith-h3">Portal activity audit trail</h3>
              <p className="text-xs text-mono-muted mt-1">
                Cryptographic transaction and upload ledger logging portal user events.
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-mono-border/30 bg-mono-card">
              <table className="monolith-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action Event</th>
                    <th>Actor</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-xs text-mono-muted italic">
                        No activity logged yet.
                      </td>
                    </tr>
                  ) : (
                    detail.auditLogs.map((log: PortalAuditLogSummary) => (
                      <tr key={log.id}>
                        <td className="monolith-numeric text-mono-muted">{formatDate(log.createdAt)} {new Date(log.createdAt).toLocaleTimeString()}</td>
                        <td className="font-semibold text-mono-text">{log.event}</td>
                        <td className="text-mono-muted font-medium">{log.portalUserId ? "Customer Portal" : "Monolith Operator"}</td>
                        <td className="text-mono-muted">{log.remarks || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ─── Stage Detail Slide-out Overlay Drawer ─── */}
      {selectedDrawerStage && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedDrawerStage(null)}
        >
          <div
            className="w-full max-w-md h-full bg-mono-card border-l border-mono-border/60 p-6 shadow-2xl relative flex flex-col justify-between animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="monolith-card monolith-accent absolute inset-y-0 left-0 w-1 bg-[#F9D972]"></div>

            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="monolith-label text-xs tracking-wider">CHA Milestone {selectedDrawerStage.index}</span>
                  <h3 className="monolith-h3 mt-1 text-mono-text">
                    {selectedDrawerStage.label}
                  </h3>
                </div>
                <button
                  className="p-1.5 rounded-lg border border-mono-border/30 bg-mono-card hover:bg-mono-soft transition-colors"
                  onClick={() => setSelectedDrawerStage(null)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-mono-border/30 bg-mono-soft p-4">
                  <span className="text-[10px] text-mono-muted font-semibold uppercase tracking-wider block">
                    Current stage status
                  </span>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div
                      className={`size-2 rounded-full ${
                        selectedDrawerStage.statusClass === "done"
                          ? "bg-green-500"
                          : selectedDrawerStage.statusClass === "active"
                            ? "bg-[#F9D972] animate-pulse"
                            : "bg-outline-variant"
                      }`}
                    ></div>
                    <strong className="text-xs uppercase text-mono-text">
                      {selectedDrawerStage.statusClass === "done"
                        ? "Completed"
                        : selectedDrawerStage.statusClass === "active"
                          ? "Active In Progress"
                          : "Pending In Sequence"}
                    </strong>
                  </div>
                </div>

                <div className="space-y-2">
                  <strong className="text-xs uppercase text-mono-muted font-bold tracking-wider block">
                    Operational Description
                  </strong>
                  <p className="text-xs text-mono-text leading-relaxed">
                    {selectedDrawerStage.description || "Milestone description is currently unavailable."}
                  </p>
                </div>

                <div className="border-t border-mono-border/20 pt-4 space-y-3">
                  <strong className="text-xs uppercase text-mono-muted font-bold tracking-wider block">
                    Operations Lead Assigned
                  </strong>
                  {coordinator ? (
                    <div className="rounded-xl border border-mono-border/40 bg-mono-soft p-3 space-y-2">
                      <p className="text-xs font-semibold text-mono-text">{coordinator.name}</p>
                      <p className="text-[10px] text-mono-muted">{coordinator.designation}</p>
                      <div className="flex gap-4 pt-1">
                        <a href={`mailto:${coordinator.email}`} className="text-xs text-[#F9D972] hover:underline">
                          Email Coordinator
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-mono-muted italic">No lead assigned.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Escalation Section if stage is active/incomplete */}
            {selectedDrawerStage.statusClass !== "done" && coordinator && (
              <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 space-y-2 font-sans">
                <h5 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert size={14} />
                  <span>Escalation Protocol</span>
                </h5>
                <p className="text-[10px] text-mono-muted">
                  If this milestone is delayed beyond standard SLA expectations, escalate to:
                </p>
                <div className="text-xs">
                  <strong className="text-mono-text">{coordinator.escalationName || "Operations Director"}</strong>
                  {coordinator.escalationEmail && (
                    <a
                      href={`mailto:${coordinator.escalationEmail}?subject=Escalation request: Job ${job.jobNumber}`}
                      className="monolith-button-warning mt-3"
                    >
                      Raise SLA Escalation
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

