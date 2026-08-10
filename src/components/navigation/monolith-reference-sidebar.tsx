"use client";

import Link from "next/link";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  LogOut,
  Monitor,
  Moon,
  Settings2,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { CarbonIconType } from "@carbon/icons-react";
import type { Caps } from "@/lib/rbac";
import {
  getActiveItemHref,
  matchesPath,
  type PrimaryNavSection,
  type SecondaryNavItem,
} from "@/lib/navigation";
import { performLogout } from "@/lib/logout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type MonolithReferenceSidebarProps = {
  caps: Caps;
  currentTheme: "light" | "dark";
  isCollapsed: boolean;
  isPlatformAdmin: boolean;
  onToggleAccent: () => void;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
  orgName: string;
  pathname: string;
  userEmail: string;
  userId: string;
  userName: string;
  visibleSections: PrimaryNavSection[];
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function SidebarIcon({
  Icon,
  size = 14,
}: {
  Icon: CarbonIconType;
  size?: number;
}) {
  return <Icon size={size} aria-hidden="true" />;
}

function Hint({ label }: { label: string }) {
  return <span className="mnx-reference-tooltip">{label}</span>;
}

function SidebarRow({
  active: _active = false,
  collapsed,
  icon,
  label,
  meta,
}: {
  active?: boolean;
  collapsed: boolean;
  icon: React.ReactNode;
  label: string;
  meta?: React.ReactNode;
}) {
  void _active;

  return (
    <>
      <span className="mnx-reference-sidebar-icon">{icon}</span>
      <span className="mnx-reference-sidebar-copy" aria-hidden={collapsed}>
        <span className="mnx-reference-sidebar-label">{label}</span>
      </span>
      {meta ? (
        <span className="mnx-reference-sidebar-meta" aria-hidden="true">
          {meta}
        </span>
      ) : null}
      {collapsed ? <Hint label={label} /> : null}
    </>
  );
}

function ProfileMenu({
  caps,
  collapsed,
  isPlatformAdmin,
  userEmail,
  userId,
  userName,
}: Pick<
  MonolithReferenceSidebarProps,
  "caps" | "isPlatformAdmin" | "userEmail" | "userId" | "userName"
> & {
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mnx-reference-profile-menu">
      <button
        type="button"
        className="mnx-reference-profile-trigger"
        data-collapsed={collapsed ? "true" : "false"}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={collapsed ? userName : "Open user menu"}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="mnx-reference-profile-avatar">{initials(userName)}</span>
        <span className="mnx-reference-profile-copy" aria-hidden={collapsed}>
          <strong>{userName}</strong>
          <small>{userEmail}</small>
        </span>
        {collapsed ? <Hint label={userName} /> : null}
      </button>

      {open ? (
        <section className="mnx-reference-profile-popover" role="menu">
          <header>
            <span className="mnx-reference-profile-avatar">{initials(userName)}</span>
            <div>
              <strong>{userName}</strong>
              <small>{userEmail}</small>
            </div>
          </header>

          {caps["hrms.employee.read"] ? (
            <Link href={`/hrms/employees/${userId}`} role="menuitem" onClick={() => setOpen(false)}>
              <UserRound size={14} />
              <span>My employee profile</span>
            </Link>
          ) : null}

          <Link href="/account/security" role="menuitem" onClick={() => setOpen(false)}>
            <Settings2 size={14} />
            <span>Security &amp; sessions</span>
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              performLogout();
            }}
          >
            <LogOut size={14} />
            <span>{isPlatformAdmin ? "Sign out (admin)" : "Sign out"}</span>
          </button>
        </section>
      ) : null}
    </div>
  );
}

function collapsedLabel(orgName: string, workspaceLabel: string, isCollapsed: boolean) {
  return isCollapsed ? `${orgName} ${workspaceLabel}` : "Open organization menu";
}

export function MonolithReferenceSidebar({
  caps,
  currentTheme,
  isCollapsed,
  isPlatformAdmin,
  onToggleAccent,
  onToggleSidebar,
  onToggleTheme,
  orgName,
  pathname,
  userEmail,
  userId,
  userName,
  visibleSections,
}: MonolithReferenceSidebarProps) {
  const activeSection = useMemo(
    () =>
      visibleSections.find((section) =>
        matchesPath(pathname, section.href, section.matchPaths),
      ) ?? visibleSections[0] ?? null,
    [pathname, visibleSections],
  );

  const activeSectionItemHref = useMemo(
    () =>
      activeSection?.items.length
        ? getActiveItemHref(pathname, activeSection.items)
        : null,
    [activeSection, pathname],
  );

  const sidebarItems = useMemo(() => {
    const items: Array<
      | { kind: "action"; id: string; label: string; icon: React.ReactNode; onClick: () => void }
      | { kind: "link"; id: string; label: string; href: string; icon: React.ReactNode; active: boolean }
    > = [
      {
        kind: "link",
        id: "notifications",
        label: "Notification",
        href: "/notifications",
        icon: <Bell size={14} />,
        active: matchesPath(pathname, "/notifications"),
      },
    ];

    const sourceItems =
      activeSection && activeSection.items.length > 0
        ? activeSection.items
        : visibleSections.map(
            (section): SecondaryNavItem => ({
              href: section.href,
              label: section.label,
              icon: section.icon,
              matchPaths: section.matchPaths,
            }),
          );

    sourceItems.forEach((item) => {
      const isActive =
        activeSection?.items.length && activeSectionItemHref
          ? activeSectionItemHref === item.href
          : matchesPath(pathname, item.href, item.matchPaths);

      items.push({
        kind: "link",
        id: item.href,
        label: item.label,
        href: item.href,
        icon: <SidebarIcon Icon={item.icon} />,
        active: Boolean(isActive),
      });
    });

    return items;
  }, [activeSection, activeSectionItemHref, pathname, visibleSections]);

  const workspaceLabel = activeSection?.label ?? "Workspace";
  const isDashboardMenuActive = matchesPath(pathname, "/dashboard");
  const isDesignSystemMenuActive = matchesPath(pathname, "/admin/design-system");
  const isSecurityMenuActive = matchesPath(pathname, "/account/security");
  const isWorkspacesMenuActive = visibleSections.some((section) =>
    matchesPath(pathname, section.href, section.matchPaths),
  );
  const flyoutThemeClass = currentTheme === "light" ? "is-light" : "is-dark";

  return (
    <>
      <aside
        className="mnx-sidebar mnx-reference-sidebar-shell"
        data-collapsed={isCollapsed ? "true" : "false"}
        data-theme={currentTheme}
        aria-label="Primary navigation"
      >
        <div className="mnx-reference-sidebar-top">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="mnx-reference-org-trigger"
                data-collapsed={isCollapsed ? "true" : "false"}
                aria-label={collapsedLabel(orgName, workspaceLabel, isCollapsed)}
              >
                <span className="mnx-reference-org-mark">
                  <Monitor size={14} />
                </span>
                <span className="mnx-reference-org-copy" aria-hidden={isCollapsed}>
                  <strong>{orgName}</strong>
                  <small>{workspaceLabel}</small>
                </span>
                <ChevronDown
                  size={12}
                  className="mnx-reference-org-chevron"
                  aria-hidden="true"
                />
                {isCollapsed ? <Hint label={`${orgName} / ${workspaceLabel}`} /> : null}
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              sideOffset={6}
              align="start"
              className={cn("mnx-reference-menu-content", flyoutThemeClass)}
            >
              <DropdownMenuItem
                asChild
                className={cn(
                  "mnx-reference-sidebar-row",
                  isDashboardMenuActive && "is-active",
                )}
              >
                <Link href="/dashboard">
                  <SidebarRow
                    active={isDashboardMenuActive}
                    collapsed={false}
                    icon={<Home size={14} />}
                    label="Desktop"
                  />
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger
                  hideChevron
                  className={cn(
                    "mnx-reference-sidebar-row mnx-reference-menu-row",
                    isWorkspacesMenuActive && "is-active",
                  )}
                >
                  <SidebarRow
                    active={isWorkspacesMenuActive}
                    collapsed={false}
                    icon={<Monitor size={14} />}
                    label="Workspaces"
                    meta={<ChevronRight size={12} />}
                  />
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className={cn("mnx-reference-menu-content", flyoutThemeClass)}>
                  {visibleSections.map((section) =>
                    section.items.length > 0 ? (
                      <DropdownMenuSub key={section.id}>
                        <DropdownMenuSubTrigger
                          hideChevron
                          className={cn(
                            "mnx-reference-sidebar-row mnx-reference-menu-row",
                            matchesPath(pathname, section.href, section.matchPaths) && "is-active",
                          )}
                        >
                          <SidebarRow
                            active={matchesPath(pathname, section.href, section.matchPaths)}
                            collapsed={false}
                            icon={<SidebarIcon Icon={section.icon} size={14} />}
                            label={section.label}
                            meta={<ChevronRight size={12} />}
                          />
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent
                          className={cn("mnx-reference-menu-content", flyoutThemeClass)}
                        >
                          {section.items.map((item) => (
                            <DropdownMenuItem
                              asChild
                              className={cn(
                                "mnx-reference-sidebar-row",
                                matchesPath(pathname, item.href, item.matchPaths) && "is-active",
                              )}
                              key={item.href}
                            >
                              <Link href={item.href}>
                                <SidebarRow
                                  active={matchesPath(pathname, item.href, item.matchPaths)}
                                  collapsed={false}
                                  icon={<SidebarIcon Icon={item.icon} size={14} />}
                                  label={item.label}
                                />
                              </Link>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    ) : (
                      <DropdownMenuItem
                        asChild
                        className={cn(
                          "mnx-reference-sidebar-row",
                          matchesPath(pathname, section.href, section.matchPaths) && "is-active",
                        )}
                        key={section.id}
                      >
                        <Link href={section.href}>
                          <SidebarRow
                            active={matchesPath(pathname, section.href, section.matchPaths)}
                            collapsed={false}
                            icon={<SidebarIcon Icon={section.icon} size={14} />}
                            label={section.label}
                          />
                        </Link>
                      </DropdownMenuItem>
                    ),
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuItem
                asChild
                className={cn(
                  "mnx-reference-sidebar-row",
                  isDesignSystemMenuActive && "is-active",
                )}
              >
                <Link href="/admin/design-system">
                  <SidebarRow
                    active={isDesignSystemMenuActive}
                    collapsed={false}
                    icon={<Settings2 size={14} />}
                    label="Design System"
                  />
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSub>
                <DropdownMenuSubTrigger
                  hideChevron
                  className="mnx-reference-sidebar-row mnx-reference-menu-row"
                >
                  <SidebarRow
                    active={false}
                    collapsed={false}
                    icon={<Moon size={14} />}
                    label="Display"
                    meta={<ChevronRight size={12} />}
                  />
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className={cn("mnx-reference-menu-content", flyoutThemeClass)}>
                  <DropdownMenuItem
                    className="mnx-reference-sidebar-row mnx-reference-menu-row"
                    onClick={onToggleTheme}
                  >
                    <SidebarRow
                      active={false}
                      collapsed={false}
                      icon={<Moon size={14} />}
                      label={currentTheme === "light" ? "Switch to Night" : "Switch to Light"}
                      meta="Ctrl+J"
                    />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="mnx-reference-sidebar-row mnx-reference-menu-row"
                    onClick={onToggleAccent}
                  >
                    <SidebarRow
                      active={false}
                      collapsed={false}
                      icon={<Monitor size={14} />}
                      label="Toggle Accent"
                    />
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="mnx-reference-sidebar-row mnx-reference-menu-row"
                    onClick={onToggleSidebar}
                  >
                    <SidebarRow
                      active={false}
                      collapsed={false}
                      icon={<ChevronLeft size={14} />}
                      label="Toggle Sidebar"
                      meta="Ctrl+B"
                    />
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuItem
                className="mnx-reference-sidebar-row mnx-reference-menu-row"
                onClick={() => window.location.reload()}
              >
                <SidebarRow
                  active={false}
                  collapsed={false}
                  icon={<Monitor size={14} />}
                  label="Reload"
                  meta="Ctrl+R"
                />
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                asChild
                className={cn(
                  "mnx-reference-sidebar-row",
                  isSecurityMenuActive && "is-active",
                )}
              >
                <Link href="/account/security">
                  <SidebarRow
                    active={isSecurityMenuActive}
                    collapsed={false}
                    icon={<Settings2 size={14} />}
                    label="Session Defaults"
                  />
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="mnx-reference-sidebar-row mnx-reference-menu-row"
                onClick={performLogout}
              >
                <SidebarRow active={false} collapsed={false} icon={<LogOut size={14} />} label="Logout" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="mnx-reference-sidebar-nav">
          {sidebarItems.map((item) =>
            item.kind === "action" ? (
              <button
                key={item.id}
                type="button"
                className="mnx-reference-sidebar-row"
                data-collapsed={isCollapsed ? "true" : "false"}
                onClick={item.onClick}
                title={isCollapsed ? item.label : undefined}
                aria-label={item.label}
              >
                <SidebarRow
                  collapsed={isCollapsed}
                  icon={item.icon}
                  label={item.label}
                />
              </button>
            ) : (
              <Link
                key={item.id}
                href={item.href}
                className={`mnx-reference-sidebar-row ${item.active ? "is-active" : ""}`}
                data-collapsed={isCollapsed ? "true" : "false"}
                title={isCollapsed ? item.label : undefined}
                aria-current={item.active ? "page" : undefined}
                aria-label={item.label}
              >
                <SidebarRow
                  active={item.active}
                  collapsed={isCollapsed}
                  icon={item.icon}
                  label={item.label}
                />
              </Link>
            ),
          )}
        </nav>

        <div className="mnx-reference-sidebar-footer">
          <Link
            href="/dashboard"
            className="mnx-reference-getting-started"
            data-collapsed={isCollapsed ? "true" : "false"}
            title={isCollapsed ? "Getting Started" : undefined}
          >
            {!isCollapsed ? <span>Getting Started</span> : <span className="mnx-reference-footer-dot" aria-hidden="true" />}
            {isCollapsed ? <Hint label="Getting Started" /> : null}
          </Link>

          <ProfileMenu
            caps={caps}
            collapsed={isCollapsed}
            isPlatformAdmin={isPlatformAdmin}
            userEmail={userEmail}
            userId={userId}
            userName={userName}
          />
        </div>

        <button
          type="button"
          className="mnx-reference-sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      <style jsx global>{`
        .mnx-dashboard-shell[data-theme="light"] {
          --mnx-app-canvas: var(--ds-color-canvas, #ffffff);
          --mnx-app-surface: var(--ds-color-surface, #ffffff);
          --mnx-app-surface-muted: var(--ds-color-surface-muted, #f3f3f3);
          --mnx-app-border: var(--ds-color-border, #e7e7e7);
          --mnx-app-text: var(--ds-color-text, #3d3d3d);
          --mnx-app-text-muted: var(--ds-color-text-muted, #7c7c7c);
        }

        .mnx-dashboard-shell[data-theme="dark"] {
          --mnx-app-canvas: #171615;
          --mnx-app-surface: #1b1a19;
          --mnx-app-surface-muted: #262422;
          --mnx-app-border: #34312e;
          --mnx-app-text: #f5efe6;
          --mnx-app-text-muted: #b2a89d;
        }

        .mnx-reference-sidebar-shell[data-theme="light"] {
          --mnx-nav-shell-bg: var(--ds-color-sidebar, #f7f7f7);
          --mnx-nav-border: var(--ds-color-border, #e7e7e7);
          --mnx-nav-surface: var(--ds-color-control-surface, #f6f6f6);
          --mnx-nav-text: var(--ds-color-text, #3d3d3d);
          --mnx-nav-link: color-mix(in srgb, var(--ds-color-text, #3d3d3d) 88%, white);
          --mnx-nav-muted: var(--ds-color-text-muted, #7c7c7c);
          --mnx-nav-hover: var(--ds-color-control-surface-hover, #f1f1f1);
          --mnx-nav-active: var(--ds-color-surface, #ffffff);
          --mnx-nav-divider: rgba(18, 18, 18, 0.08);
          --mnx-nav-floating-bg: var(--ds-color-overlay-surface, #ffffff);
          --mnx-nav-floating-border: var(--ds-color-overlay-border, #d9d9d9);
          --mnx-nav-toggle-bg: var(--ds-color-surface, #ffffff);
          --mnx-nav-shadow: 0 12px 28px var(--ds-color-overlay-shadow, rgba(28, 28, 28, 0.12));
          --mnx-nav-tooltip-bg: var(--ds-color-overlay-surface, #ffffff);
        }

        .mnx-reference-sidebar-shell[data-theme="dark"] {
          --mnx-nav-shell-bg: #0f0f10;
          --mnx-nav-border: rgba(255, 255, 255, 0.08);
          --mnx-nav-surface: rgba(255, 255, 255, 0.055);
          --mnx-nav-text: rgba(236, 236, 238, 0.96);
          --mnx-nav-link: rgba(172, 172, 178, 0.88);
          --mnx-nav-muted: rgba(172, 172, 178, 0.88);
          --mnx-nav-hover: rgba(255, 255, 255, 0.08);
          --mnx-nav-active: rgba(77, 77, 82, 0.88);
          --mnx-nav-divider: rgba(255, 255, 255, 0.08);
          --mnx-nav-floating-bg: #1a1a1b;
          --mnx-nav-floating-border: rgba(255, 255, 255, 0.08);
          --mnx-nav-toggle-bg: #181819;
          --mnx-nav-shadow: 0 12px 28px rgba(0, 0, 0, 0.3);
          --mnx-nav-tooltip-bg: #1c1c1d;
        }

        .mnx-dashboard-shell {
          display: flex;
          height: 100dvh;
          min-height: 100dvh;
          background: var(--mnx-app-canvas, #171615);
          overflow: hidden;
        }

        .mnx-dashboard-frame {
          flex: 1 1 auto;
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background: var(--mnx-app-canvas, #171615);
          overflow: hidden;
        }

        .mnx-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          min-height: 2.875rem;
          padding: 0.5rem 0.875rem;
          border-bottom: 1px solid var(--mnx-app-border, #34312e);
          background: var(--mnx-app-surface, #1b1a19);
          color: var(--mnx-app-text, #f5efe6);
        }

        .mnx-topbar-context,
        .mnx-topbar-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 0;
        }

        .mnx-topbar-context > div {
          display: flex;
          align-items: center;
          gap: 0.3125rem;
          min-width: 0;
          color: var(--mnx-app-text-muted, #b2a89d);
          font-family: var(--ds-font-sans, var(--font-geist-sans), "Segoe UI", sans-serif);
          font-size: 0.875rem;
          line-height: 1.25;
        }

        .mnx-topbar-context b {
          color: var(--mnx-app-text, #f5efe6);
          font-weight: 600;
        }

        .mnx-topbar-context i {
          color: inherit;
          font-style: normal;
        }

        .mnx-topbar-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          padding: 0;
          border: 1px solid var(--mnx-app-border, #34312e);
          border-radius: 0.625rem;
          background: var(--mnx-app-surface-muted, #262422);
          color: var(--mnx-app-text-muted, #b2a89d);
          text-decoration: none;
          transition:
            background-color 160ms ease,
            border-color 160ms ease,
            color 160ms ease;
        }

        .mnx-topbar-icon:hover,
        .mnx-topbar-icon:focus-visible {
          border-color: var(--mnx-app-border, #34312e);
          background: var(--mnx-app-surface, #1b1a19);
          color: var(--mnx-app-text, #f5efe6);
          outline: none;
        }

        .mnx-dashboard-main {
          flex: 1 1 auto;
          min-width: 0;
          min-height: 0;
          background: var(--mnx-app-canvas, #171615);
          overflow-y: auto;
          overflow-x: hidden;
        }

        .mnx-reference-sidebar-shell {
          position: relative;
          align-self: stretch;
          width: 13.375rem;
          min-width: 13.375rem;
          height: 100%;
          min-height: 100%;
          display: flex;
          flex-direction: column;
          padding: 0.5rem;
          box-sizing: border-box;
          border-right: 1px solid var(--mnx-nav-border, rgba(255, 255, 255, 0.08));
          background: var(--mnx-nav-shell-bg, #0f0f10);
          transition:
            width 220ms cubic-bezier(0.22, 1, 0.36, 1),
            min-width 220ms cubic-bezier(0.22, 1, 0.36, 1),
            transform 160ms ease;
          overflow: visible;
          will-change: width;
          z-index: 5;
        }

        .mnx-reference-sidebar-shell[data-collapsed="true"] {
          width: 3rem;
          min-width: 3rem;
          padding-right: 0.25rem;
        }

        .mnx-reference-sidebar-top {
          margin-bottom: 0.75rem;
        }

        .mnx-reference-org-trigger {
          position: relative;
          width: 100%;
          min-height: 2.5rem;
          display: grid;
          grid-template-columns: 1.25rem minmax(0, 1fr) auto;
          align-items: center;
          gap: 0.625rem;
          padding: 0.625rem 0.75rem;
          border: 0;
          border-radius: var(--ds-radius-md, 0.75rem);
          background: var(--mnx-nav-surface, rgba(255, 255, 255, 0.055));
          color: var(--mnx-nav-text, rgba(236, 236, 238, 0.96));
          text-align: left;
          font-family: var(--ds-font-sans, var(--font-geist-sans), "Segoe UI", sans-serif);
          overflow: clip;
          transition:
            padding 220ms cubic-bezier(0.22, 1, 0.36, 1),
            background-color 160ms ease,
            gap 220ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .mnx-reference-org-trigger[data-collapsed="true"] {
          min-height: 2.5rem;
          gap: 0;
          padding-left: 0.75rem;
          padding-right: 0;
        }

        .mnx-reference-org-mark {
          width: 1.25rem;
          height: 1.25rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--ds-radius-sm, 0.5rem);
          background: linear-gradient(180deg, #2b9eff, #1277d8);
          color: #fff;
        }

        .mnx-reference-org-copy,
        .mnx-reference-profile-copy,
        .mnx-reference-sidebar-copy {
          display: grid;
          gap: 0.125rem;
          min-width: 0;
          overflow: hidden;
          white-space: nowrap;
          opacity: 1;
          max-width: 14rem;
          transform: translateX(0);
          transition:
            max-width 220ms cubic-bezier(0.22, 1, 0.36, 1),
            opacity 140ms ease,
            transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .mnx-reference-org-copy strong,
        .mnx-reference-profile-copy strong {
          color: var(--mnx-nav-text, rgba(236, 236, 238, 0.96));
          font-size: var(--ds-type-label-size, 0.875rem);
          font-weight: 600;
          line-height: 1.25;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mnx-reference-org-copy small,
        .mnx-reference-profile-copy small {
          color: var(--mnx-nav-muted, rgba(172, 172, 178, 0.88));
          font-size: 0.75rem;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mnx-reference-sidebar-nav {
          display: flex;
          flex: 1 1 auto;
          min-height: 0;
          flex-direction: column;
          gap: 0.125rem;
          align-content: start;
          overflow-y: auto;
          overflow-x: hidden;
          padding-right: 0;
          scrollbar-width: none;
        }

        .mnx-reference-sidebar-nav::-webkit-scrollbar {
          display: none;
        }

        .mnx-reference-sidebar-row,
        .mnx-reference-profile-trigger,
        .mnx-reference-getting-started {
          font-family: var(--ds-font-sans, var(--font-geist-sans), "Segoe UI", sans-serif);
          font-size: var(--ds-type-label-size, 0.875rem);
          font-weight: 400;
          line-height: 1.25;
          letter-spacing: 0;
          color: var(--mnx-nav-link, rgba(172, 172, 178, 0.88));
          box-sizing: border-box;
        }

        .mnx-reference-sidebar-row {
          position: relative;
          width: 100%;
          min-height: 2rem;
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.4375rem 0.75rem;
          border: 0;
          border-radius: var(--ds-radius-sm, 0.5rem);
          background: transparent;
          text-decoration: none;
          text-align: left;
          overflow: visible;
          transition:
            padding 220ms cubic-bezier(0.22, 1, 0.36, 1),
            gap 220ms cubic-bezier(0.22, 1, 0.36, 1),
            background-color 160ms ease,
            color 160ms ease;
        }

        .mnx-reference-sidebar-row[data-collapsed="true"] {
          gap: 0;
          justify-content: center;
          padding-left: 0.75rem;
          padding-right: 0.75rem;
        }

        .mnx-reference-sidebar-row:hover,
        .mnx-reference-sidebar-row:focus-visible,
        .mnx-reference-profile-trigger:hover,
        .mnx-reference-profile-trigger:focus-visible,
        .mnx-reference-getting-started:hover,
        .mnx-reference-getting-started:focus-visible,
        .mnx-reference-org-trigger:hover,
        .mnx-reference-org-trigger:focus-visible {
          background: var(--mnx-nav-hover, rgba(255, 255, 255, 0.08));
          color: var(--mnx-nav-text, rgba(236, 236, 238, 0.96));
          outline: none;
        }

        .mnx-reference-sidebar-row.is-active,
        .mnx-reference-menu-row[data-state="open"] {
          background: var(--mnx-nav-active, rgba(77, 77, 82, 0.88));
          color: var(--mnx-nav-text, rgba(236, 236, 238, 0.96));
        }

        .mnx-reference-sidebar-icon {
          color: currentColor;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1rem;
          min-width: 1rem;
          height: 1rem;
          flex: 0 0 1rem;
          opacity: 0.92;
          transition: color 160ms ease;
        }

        .mnx-reference-sidebar-copy {
          flex: 1 1 auto;
          min-width: 0;
        }

        .mnx-reference-sidebar-label,
        .mnx-reference-sidebar-meta {
          font-size: inherit;
          line-height: inherit;
        }

        .mnx-reference-sidebar-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .mnx-reference-sidebar-meta {
          margin-left: auto;
          display: inline-flex;
          min-width: fit-content;
          align-items: center;
          justify-content: flex-end;
          color: var(--mnx-nav-muted, rgba(172, 172, 178, 0.88));
          white-space: nowrap;
          flex: 0 0 auto;
        }

        .mnx-reference-sidebar-meta svg {
          width: 0.875rem;
          height: 0.875rem;
        }

        .mnx-reference-sidebar-footer {
          display: grid;
          gap: 0.5rem;
          margin-top: auto;
          flex: 0 0 auto;
          padding-top: 0.75rem;
          border-top: 1px solid var(--mnx-nav-divider, rgba(255, 255, 255, 0.08));
        }

        .mnx-reference-getting-started {
          position: relative;
          width: 100%;
          min-height: 2rem;
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          padding: 0.4375rem 0.75rem;
          text-decoration: none;
          border-radius: var(--ds-radius-sm, 0.5rem);
          overflow: clip;
          transition:
            padding 220ms cubic-bezier(0.22, 1, 0.36, 1),
            background-color 160ms ease,
            color 160ms ease;
        }

        .mnx-reference-getting-started[data-collapsed="true"] {
          justify-content: center;
          padding-left: 0.75rem;
          padding-right: 0.75rem;
        }

        .mnx-reference-footer-dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 999px;
          background: var(--mnx-nav-muted, rgba(172, 172, 178, 0.88));
          opacity: 0.55;
        }

        .mnx-reference-profile-menu {
          position: relative;
        }

        .mnx-reference-profile-trigger {
          position: relative;
          width: 100%;
          min-height: 2.5rem;
          display: flex;
          gap: 0.625rem;
          align-items: center;
          padding: 0.375rem 0.75rem;
          border: 0;
          border-radius: var(--ds-radius-md, 0.75rem);
          background: transparent;
          text-align: left;
          overflow: clip;
          transition:
            padding 220ms cubic-bezier(0.22, 1, 0.36, 1),
            gap 220ms cubic-bezier(0.22, 1, 0.36, 1),
            background-color 160ms ease;
        }

        .mnx-reference-profile-trigger[data-collapsed="true"] {
          gap: 0;
          justify-content: center;
          padding-left: 0.75rem;
          padding-right: 0.75rem;
        }

        .mnx-reference-profile-avatar {
          width: 24px;
          height: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #3aa76d;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          flex: 0 0 24px;
        }

        .mnx-reference-sidebar-shell[data-collapsed="true"] .mnx-reference-org-copy,
        .mnx-reference-sidebar-shell[data-collapsed="true"] .mnx-reference-profile-copy,
        .mnx-reference-sidebar-shell[data-collapsed="true"] .mnx-reference-sidebar-copy,
        .mnx-reference-sidebar-shell[data-collapsed="true"] .mnx-reference-sidebar-meta {
          max-width: 0;
          opacity: 0;
          transform: translateX(-4px);
          pointer-events: none;
        }

        .mnx-reference-sidebar-shell[data-collapsed="true"] .mnx-reference-org-chevron {
          opacity: 0;
          transform: translateX(-4px);
          pointer-events: none;
        }

        .mnx-reference-org-chevron {
          opacity: 1;
          color: var(--mnx-nav-muted, rgba(172, 172, 178, 0.88));
          transition:
            opacity 140ms ease,
            transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .mnx-reference-profile-popover {
          position: absolute;
          left: calc(100% + 0.75rem);
          bottom: 0;
          z-index: 20;
          width: 14rem;
          display: grid;
          gap: 0.25rem;
          padding: 0.5rem;
          border: 1px solid var(--mnx-nav-floating-border, rgba(255, 255, 255, 0.08));
          border-radius: var(--ds-radius-panel, 1rem);
          background: var(--mnx-nav-floating-bg, #1a1a1b);
          box-shadow: var(--mnx-nav-shadow, 0 12px 28px rgba(0, 0, 0, 0.3));
        }

        .mnx-reference-profile-popover header {
          display: grid;
          grid-template-columns: 1.5rem minmax(0, 1fr);
          gap: 0.5rem;
          align-items: center;
          padding: 0.25rem 0.25rem 0.5rem;
          border-bottom: 1px solid var(--mnx-nav-floating-border, rgba(255, 255, 255, 0.08));
          margin-bottom: 0.25rem;
        }

        .mnx-reference-profile-popover a,
        .mnx-reference-profile-popover button {
          display: grid;
          grid-template-columns: 1rem minmax(0, 1fr);
          gap: 0.625rem;
          align-items: center;
          padding: 0.625rem 0.75rem;
          border: 0;
          border-radius: var(--ds-radius-sm, 0.5rem);
          background: transparent;
          color: var(--mnx-nav-text, rgba(236, 236, 238, 0.96));
          text-decoration: none;
          text-align: left;
          font-family: var(--ds-font-sans, var(--font-geist-sans), "Segoe UI", sans-serif);
          font-size: var(--ds-type-label-size, 0.875rem);
          line-height: 1.25;
        }

        .mnx-reference-profile-popover a:hover,
        .mnx-reference-profile-popover button:hover {
          background: var(--mnx-nav-hover, rgba(255, 255, 255, 0.08));
        }

        .mnx-reference-sidebar-toggle {
          position: absolute;
          right: -0.625rem;
          bottom: 0.75rem;
          width: 1.5rem;
          height: 1.5rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--mnx-nav-floating-border, rgba(255, 255, 255, 0.08));
          border-radius: 999px;
          background: var(--mnx-nav-toggle-bg, #181819);
          color: var(--mnx-nav-muted, rgba(172, 172, 178, 0.88));
          box-shadow: var(--mnx-nav-shadow, 0 12px 28px rgba(0, 0, 0, 0.3));
          z-index: 2;
        }

        .mnx-reference-tooltip {
          position: absolute;
          left: calc(100% + 0.75rem);
          top: 50%;
          z-index: 20;
          transform: translateY(-50%);
          opacity: 0;
          pointer-events: none;
          white-space: nowrap;
          padding: 0.375rem 0.5rem;
          border: 1px solid var(--mnx-nav-floating-border, rgba(255, 255, 255, 0.08));
          border-radius: var(--ds-radius-sm, 0.5rem);
          background: var(--mnx-nav-tooltip-bg, #1c1c1d);
          color: var(--mnx-nav-text, rgba(236, 236, 238, 0.96));
          font-family: var(--ds-font-sans, var(--font-geist-sans), "Segoe UI", sans-serif);
          font-size: 0.75rem;
          line-height: 1.1;
          box-shadow: var(--mnx-nav-shadow, 0 12px 28px rgba(0, 0, 0, 0.3));
        }

        .mnx-reference-sidebar-row[data-collapsed="true"]:hover .mnx-reference-tooltip,
        .mnx-reference-org-trigger[data-collapsed="true"]:hover .mnx-reference-tooltip,
        .mnx-reference-profile-trigger[data-collapsed="true"]:hover .mnx-reference-tooltip,
        .mnx-reference-getting-started[data-collapsed="true"]:hover .mnx-reference-tooltip {
          opacity: 1;
        }

        .mnx-reference-menu-content {
          --mnx-nav-floating-bg: #1a1a1b;
          --mnx-nav-floating-border: rgba(255, 255, 255, 0.08);
          --mnx-nav-shadow: 0 12px 28px rgba(0, 0, 0, 0.3);
          --mnx-nav-divider: rgba(255, 255, 255, 0.08);
          --mnx-nav-link: rgba(172, 172, 178, 0.88);
          --mnx-nav-text: rgba(236, 236, 238, 0.96);
          --mnx-nav-muted: rgba(172, 172, 178, 0.88);
          --mnx-nav-hover: rgba(255, 255, 255, 0.08);
          --mnx-nav-active: rgba(77, 77, 82, 0.88);
          z-index: 20;
          width: 12.75rem;
          min-width: 12.75rem;
          max-width: min(12.75rem, calc(100vw - 1rem));
          display: grid;
          gap: 0.125rem;
          padding: 0.375rem;
          border-radius: var(--ds-radius-panel, 1rem);
          background: var(--mnx-nav-floating-bg, #1a1a1b);
          border: 1px solid var(--mnx-nav-floating-border, rgba(255, 255, 255, 0.08));
          box-shadow: var(--mnx-nav-shadow, 0 12px 28px rgba(0, 0, 0, 0.3));
          font-family: var(--ds-font-sans, var(--font-geist-sans), "Segoe UI", sans-serif);
          font-size: var(--ds-type-label-size, 0.875rem);
          line-height: 1.25;
          overflow: visible;
          box-sizing: border-box;
        }

        .mnx-reference-menu-content.is-light {
          --mnx-nav-floating-bg: var(--ds-color-overlay-surface, #ffffff);
          --mnx-nav-floating-border: var(--ds-color-overlay-border, #d9d9d9);
          --mnx-nav-shadow: 0 12px 28px var(--ds-color-overlay-shadow, rgba(28, 28, 28, 0.12));
          --mnx-nav-divider: rgba(18, 18, 18, 0.08);
          --mnx-nav-link: color-mix(in srgb, var(--ds-color-text, #3d3d3d) 88%, white);
          --mnx-nav-text: var(--ds-color-text, #3d3d3d);
          --mnx-nav-muted: var(--ds-color-text-muted, #7c7c7c);
          --mnx-nav-hover: var(--ds-color-control-surface-hover, #f1f1f1);
          --mnx-nav-active: var(--ds-color-surface, #ffffff);
        }

        .mnx-reference-menu-content[data-side="right"] {
          margin-left: 0.5rem;
        }

        .mnx-reference-menu-content .mnx-reference-sidebar-row {
          width: 100%;
          max-width: 100%;
        }

        .mnx-reference-menu-content [role="separator"] {
          margin: 0.25rem 0.75rem;
          background: var(--mnx-nav-divider, rgba(255, 255, 255, 0.08));
        }
      `}</style>
    </>
  );
}
