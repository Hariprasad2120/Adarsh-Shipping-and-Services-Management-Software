"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Bell,
  CheckSquare,
  Clock,
  FileText,
  LayoutDashboard,
  LogOut,
  Mail,
  Phone,
  Settings,
  ShieldAlert,
  Ship,
} from "lucide-react";
import { toast } from "sonner";
import {
  MonolithThemePicker,
  MonolithThemeProvider,
} from "@/components/monolith/app-shell";
import { Button } from "@/components/monolith/button";
import { Input } from "@/components/monolith/input";
import { WorkspaceDialog } from "@/components/monolith/workspace-dialog";
import type { PortalCoordinator } from "@/modules/customer-portal/types";

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
        <label className="mnx-portal-eyebrow block">Email</label>
        <Input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          required
        />
      </div>
      <div className="space-y-2">
        <label className="mnx-portal-eyebrow block">Password</label>
        <Input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing In..." : "Sign In"}
      </Button>
    </form>
  );
}

export function PortalActivationForm({
  token,
  reset = false,
}: {
  token: string;
  reset?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const response = await fetch(
            reset
              ? "/api/customer-portal/auth/forgot-password"
              : "/api/customer-portal/auth/activate",
            {
              method: reset ? "PATCH" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token, password }),
            },
          );
          const json = await response.json();
          if (!json.ok) {
            toast.error(json.error || "Request failed");
            return;
          }
          toast.success(
            reset ? "Password reset successful" : "Account activated",
          );
          router.push("/customer-portal/login");
        });
      }}
    >
      <div className="space-y-2">
        <label className="mnx-portal-eyebrow block">
          {reset ? "New Password" : "Create Password"}
        </label>
        <Input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          required
          minLength={12}
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending
          ? "Submitting..."
          : reset
            ? "Reset Password"
            : "Activate Account"}
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
        <label className="mnx-portal-eyebrow block">Email</label>
        <Input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending..." : "Send Reset Link"}
      </Button>
    </form>
  );
}

export function PortalMarkAllReadButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await fetch("/api/customer-portal/notifications/read-all", {
          method: "POST",
        });
        router.refresh();
      }}
    >
      Mark All Read
    </Button>
  );
}

// Portal shell layout

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

export function PortalShellClient({ ...props }: PortalShellClientProps) {
  return (
    <MonolithThemeProvider>
      <PortalShellClientBody {...props} />
    </MonolithThemeProvider>
  );
}

function PortalShellClientBody({
  children,
  portalUser,
  unreadNotificationsCount,
  pendingApprovalsCount,
  activeShipmentsCount,
  coordinator,
}: PortalShellClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [contactModalOpen, setContactModalOpen] = useState(false);

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
      badge:
        unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
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
    <div className="mnx-customer-portal-shell">
      <aside className="mnx-customer-portal-sidebar">
        <div className="mnx-customer-portal-brand">
          <div className="mnx-customer-portal-brand-mark" aria-hidden="true" />
          <div>
            <strong>MONOLITH</strong>
            <small>Customer Portal</small>
          </div>
        </div>

        <div>
          <div className="mnx-customer-portal-nav-title">Workspace</div>
          <nav className="mnx-customer-portal-nav">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mnx-customer-portal-nav-item ${active ? "is-active" : ""}`}
                >
                  <Icon />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="mnx-customer-portal-nav-badge">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <div className="mnx-customer-portal-nav-title">Account</div>
          <nav className="mnx-customer-portal-nav">
            <Link
              href="/customer-portal/profile"
              className={`mnx-customer-portal-nav-item ${
                pathname === "/customer-portal/profile" ||
                pathname === "/customer-portal/security"
                  ? "is-active"
                  : ""
              }`}
            >
              <Settings />
              <span>Settings</span>
            </Link>
            <button
              onClick={async () => {
                await fetch("/api/customer-portal/auth/logout", {
                  method: "POST",
                });
                router.push("/customer-portal/login");
                router.refresh();
              }}
              className="mnx-customer-portal-nav-item"
            >
              <LogOut />
              <span>Logout</span>
            </button>
          </nav>
        </div>

        {coordinator && (
          <div className="mnx-customer-portal-support">
            <strong>Need assistance?</strong>
            <p>
              Your assigned CHA coordinator is available for shipment or
              document queries.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setContactModalOpen(true)}
            >
              Contact coordinator
            </Button>
          </div>
        )}
      </aside>

      <main className="mnx-customer-portal-workspace">
        <header className="mnx-customer-portal-topbar">
          <div className="mnx-customer-portal-topbar-copy">
            <small>Customer Portal / {pathname.split("/").pop()}</small>
            <strong>{portalUser.customer.name}</strong>
          </div>

          <div className="mnx-customer-portal-topbar-actions">
            <MonolithThemePicker
              allowedThemes={["light", "night", "violet"]}
              ariaLabel="Customer portal theme"
            />
            <Link
              href="/customer-portal/notifications"
              className="mnx-icon-button"
              aria-label="Notifications"
            >
              <Bell />
              {unreadNotificationsCount > 0 ? (
                <span
                  className="mnx-notification-indicator"
                  aria-hidden="true"
                />
              ) : null}
            </Link>
            <button
              type="button"
              className="mnx-customer-portal-profile"
              onClick={() => router.push("/customer-portal/profile")}
            >
              <span className="mnx-customer-portal-avatar">
                {getInitials(portalUser.name)}
              </span>
              <span data-portal-designation>
                <strong>{portalUser.name}</strong>
                <span>{portalUser.designation ?? "Portal contact"}</span>
              </span>
            </button>
          </div>
        </header>

        <div className="mnx-customer-portal-content">{children}</div>
      </main>

      <nav
        className="mnx-customer-portal-mobile-nav"
        aria-label="Mobile customer portal navigation"
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "is-active" : ""}
            >
              <Icon />
              <span>{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>

      <WorkspaceDialog
        open={contactModalOpen && Boolean(coordinator)}
        onClose={() => setContactModalOpen(false)}
        eyebrow="Customer support"
        title="CHA Support Coordinator"
        description="Get directly in touch with your assigned operational manager."
        size="compact"
      >
        {coordinator ? (
          <div className="mnx-customer-portal-modal-copy">
            <div className="mnx-customer-portal-contact-card">
              <div className="flex items-center gap-3">
                <div className="mnx-portal-leading-icon">
                  <Settings size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-mono-text">
                    {coordinator.name}
                  </h4>
                  <p className="text-xs text-mono-muted">
                    {coordinator.designation ?? "Operations Executive"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <a
                  href={`mailto:${coordinator.email}`}
                  className="flex items-center gap-2.5 text-xs"
                >
                  <Mail size={14} />
                  <span>{coordinator.email}</span>
                </a>
                {coordinator.phone && (
                  <a
                    href={`tel:${coordinator.phone}`}
                    className="flex items-center gap-2.5 text-xs"
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
              <div className="mnx-customer-portal-escalation">
                <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
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
                    className="text-xs"
                  >
                    {coordinator.escalationEmail}
                  </a>
                )}
              </div>
            )}
          </div>
        ) : null}
      </WorkspaceDialog>
    </div>
  );
}
