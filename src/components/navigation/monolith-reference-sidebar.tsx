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
    </>
  );
}
