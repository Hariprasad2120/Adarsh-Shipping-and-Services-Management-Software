"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  HelpCircle,
  LayoutGrid,
  type LucideIcon,
  LogOut,
  Mail,
  Monitor,
  RefreshCw,
  Search as SearchIcon,
  Settings2,
  UserRound,
} from "lucide-react";
import { NAV_SECTIONS } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type WorkspacePanelId = "workspaces" | "display" | "help" | null;

type SidebarPrimaryLink = {
  label: string;
  hint?: string;
  icon: LucideIcon;
  href: string;
  active?: boolean;
};

const sidebarPrimaryLinks: SidebarPrimaryLink[] = [
  { label: "Search", hint: "Ctrl+K", icon: SearchIcon, href: "#" },
  { label: "Notification", icon: Bell, href: "/notifications" },
  { label: "Dashboard", icon: Home, href: "/dashboard" },
  { label: "To-Do", icon: LayoutGrid, href: "/todo" },
  { label: "Admin", icon: Settings2, href: "/admin" },
  { label: "Roles & Permissions", icon: UserRound, href: "/admin/roles" },
  {
    label: "Design System",
    icon: LayoutGrid,
    href: "/admin/design-system",
    active: true,
  },
  { label: "Email Account", icon: Mail, href: "/communication/mail" },
];

type WorkspaceMenuEntry =
  | {
      label: string;
      icon: LucideIcon;
      panelId?: WorkspacePanelId;
      hint?: string;
      divider?: never;
    }
  | { divider: true; label?: never; icon?: never; panelId?: never; hint?: never };

const workspaceMenuItems: WorkspaceMenuEntry[] = [
  { label: "Desktop", icon: Home },
  { label: "Workspaces", icon: LayoutGrid, panelId: "workspaces" },
  { label: "Website", icon: SearchIcon },
  { divider: true },
  { label: "Display", icon: Monitor, panelId: "display" },
  { label: "Session Defaults", icon: Settings2 },
  { label: "Reload", icon: RefreshCw, hint: "Ctrl+R" },
  { label: "Help", icon: HelpCircle, panelId: "help" },
  { divider: true },
  { label: "Logout", icon: LogOut },
];

type FlyoutMenuEntry = { label: string; hint?: string };

const displayMenuItems: FlyoutMenuEntry[] = [
  { label: "Toggle Theme", hint: "Ctrl+G" },
  { label: "Toggle Full Width" },
  { label: "Toggle Sidebar", hint: "Ctrl+/" },
];

const helpMenuItems: FlyoutMenuEntry[] = [
  { label: "Documentation" },
  { label: "User Forum" },
  { label: "Report an Issue" },
  { label: "About" },
  { label: "Keyboard Shortcuts", hint: "Ctrl+/" },
];

const workspaceModules = NAV_SECTIONS.filter(
  (section) =>
    !["dashboard", "todo", "notifications", "admin"].includes(section.id),
).slice(0, 10);

const dummyParagraphs = [
  "This content area is a placeholder for page-level layouts. It lets us judge the sidebar width, panel spacing, and how the body sits next to the navigation frame.",
  "Modules stay inside the workspace menu instead of being rendered permanently in the sidebar. That keeps the left navigation focused on quick access links while still allowing access to the broader system.",
  "Once you approve this structure, we can refine the sidebar states one by one: spacing, row heights, dividers, hover states, workspace panel behavior, and the bottom profile block.",
] as const;

export function SidebarLayoutSpecimen() {
  const [menuOpen, setMenuOpen] = useState(true);
  const [activePanel, setActivePanel] = useState<WorkspacePanelId>("workspaces");
  const [activeModuleId, setActiveModuleId] = useState<string>(
    workspaceModules[0]?.id ?? "",
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarRef = useRef<HTMLElement | null>(null);

  const flyoutItems = useMemo(() => {
    if (activePanel === "display") return displayMenuItems;
    if (activePanel === "help") return helpMenuItems;
    return null;
  }, [activePanel]);

  const activeModule = useMemo(
    () => workspaceModules.find((section) => section.id === activeModuleId) ?? workspaceModules[0],
    [activeModuleId],
  );

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!sidebarRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
        setActivePanel(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function handleOrgToggle() {
    if (sidebarCollapsed) return;
    setMenuOpen((current) => !current);
    setActivePanel((current) => (current ?? "workspaces"));
  }

  function handleSidebarToggle() {
    setSidebarCollapsed((current) => {
      const next = !current;
      if (next) {
        setMenuOpen(false);
        setActivePanel(null);
      } else {
        setMenuOpen(false);
        setActivePanel(null);
      }
      return next;
    });
  }

  return (
    <section
      className={`ds-layout-specimen ${
        sidebarCollapsed ? "is-sidebar-collapsed" : ""
      }`}
      aria-label="Sidebar layout specimen"
    >
      <aside
        className={`ds-sidebar ${sidebarCollapsed ? "is-collapsed" : ""}`}
        ref={sidebarRef}
      >
        <Button
          mode="icon"
          className="ds-sidebar-toggle"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={handleSidebarToggle}
        >
          {sidebarCollapsed ? (
            <ChevronRight size={16} aria-hidden="true" />
          ) : (
            <ChevronLeft size={16} aria-hidden="true" />
          )}
        </Button>

        <button
          type="button"
          className="ds-sidebar-org"
          aria-expanded={menuOpen}
          onClick={handleOrgToggle}
          disabled={sidebarCollapsed}
        >
          <span className="ds-sidebar-org-mark">E-D</span>
          <span className="ds-sidebar-org-copy">
            <strong>Organization</strong>
            <span>ERPNext</span>
          </span>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={menuOpen ? "is-open" : ""}
          />
        </button>

        {menuOpen && !sidebarCollapsed ? (
          <div className="ds-workspace-anchor">
            <div className="ds-workspace-menu">
              {workspaceMenuItems.map((item, index) =>
                "divider" in item ? (
                  <div className="ds-workspace-divider" key={`divider-${index}`} />
                ) : (
                  <button
                    type="button"
                    className={`ds-workspace-item ${
                      item.panelId && activePanel === item.panelId ? "is-open" : ""
                    }`}
                    key={item.label}
                    onMouseEnter={() => {
                      if (!item.panelId) return;
                      setActivePanel(item.panelId);
                    }}
                  >
                    <span className="ds-workspace-item-copy">
                      <item.icon size={18} aria-hidden="true" />
                      <span>{item.label}</span>
                    </span>
                    {item.hint ? (
                      <span className="ds-workspace-hint">{item.hint}</span>
                    ) : null}
                    {item.panelId ? <ChevronRight size={16} aria-hidden="true" /> : null}
                  </button>
                ),
              )}
            </div>

            {activePanel === "workspaces" ? (
              <div
                className="ds-workspace-subpanel"
                onMouseEnter={() => setActivePanel("workspaces")}
              >
                {workspaceModules.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      type="button"
                      className={`ds-workspace-module ${
                        activeModule?.id === section.id ? "is-open" : ""
                      }`}
                      key={section.id}
                      onMouseEnter={() => setActiveModuleId(section.id)}
                    >
                      <span className="ds-workspace-module-icon">
                        <Icon size={16} />
                      </span>
                      <span>{section.label}</span>
                      <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            ) : null}

            {activePanel === "workspaces" && activeModule?.items.length ? (
              <div
                className="ds-workspace-detailpanel"
                onMouseEnter={() => setActivePanel("workspaces")}
              >
                {activeModule.items.map((item) => (
                  <Link className="ds-workspace-detail-link" href={item.href} key={item.href}>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            ) : null}

            {flyoutItems ? (
              <div
                className="ds-workspace-subpanel"
                onMouseEnter={() => {
                  if (activePanel === "display" || activePanel === "help") {
                    setActivePanel(activePanel);
                  }
                }}
              >
                {flyoutItems.map((item) => (
                  <button type="button" className="ds-workspace-flyout-item" key={item.label}>
                    <span>{item.label}</span>
                    {item.hint ? <span className="ds-workspace-hint">{item.hint}</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="ds-sidebar-scroll">
          <nav className="ds-sidebar-nav" aria-label="Sidebar links">
            {sidebarPrimaryLinks.map((item) => (
              <Link
                className={`ds-sidebar-link ${item.active ? "is-active" : ""}`}
                href={item.href}
                key={item.label}
              >
                <span className="ds-sidebar-link-copy">
                  <item.icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </span>
                {item.hint ? <span className="ds-sidebar-hint">{item.hint}</span> : null}
              </Link>
            ))}
          </nav>

          <div className="ds-sidebar-footer">
            <Link className="ds-sidebar-link" href="/dashboard">
              <span className="ds-sidebar-link-copy">
                <UserRound size={18} aria-hidden="true" />
                <span>Getting Started</span>
              </span>
            </Link>

            <div className="ds-sidebar-profile">
              <span className="ds-sidebar-profile-mark">A</span>
              <span className="ds-sidebar-profile-copy">
                <strong>Administrator</strong>
                <span>admin@example.com</span>
              </span>
            </div>
          </div>
        </div>
      </aside>

      <div className="ds-layout-main">
        <header className="ds-layout-topbar">
          <div className="ds-layout-breadcrumb">
            <Home size={16} aria-hidden="true" />
            <span>/</span>
            <strong>Role Permissions Manager</strong>
          </div>
        </header>

        <div className="ds-layout-content">
          <div className="ds-layout-toolbar">
            <div className="ds-layout-input">Document Type</div>
            <div className="ds-layout-input">Roles</div>
          </div>

          <div className="ds-layout-empty">Select Document Type or Role to start.</div>

          <Card className="ds-layout-card">
            <CardHeader>
              <CardTitle className="ds-type-heading">Dummy content</CardTitle>
            </CardHeader>
            <CardContent>
              {dummyParagraphs.map((paragraph) => (
                <p className="ds-type-body" key={paragraph}>
                  {paragraph}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
