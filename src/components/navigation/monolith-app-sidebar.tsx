"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PrimaryNavSection } from "@/lib/navigation";
import { getActiveItemHref, getVisibleSections, matchesPath } from "@/lib/navigation";
import type { Caps } from "@/lib/rbac";
import { performLogout } from "@/lib/logout";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  useSidebar,
  sidebarMenuButtonVariants,
  sidebarMenuSubButtonClassName,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function MonolithSidebarBrand() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Link
      href="/dashboard"
      aria-label="Monolith dashboard"
      className={cn(
        "group flex min-h-12 min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-xl px-2 py-1.5 transition-colors hover:bg-sidebar-accent/50",
      )}
    >
      <span className="mnx-brand-mark flex size-8 shrink-0 items-center justify-center">
        <i />
        <i />
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-opacity duration-150 ease-linear",
          collapsed ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
        <b className="block truncate text-[0.86rem] tracking-[0.22em] text-sidebar-foreground">
          MONOLITH
        </b>
        <small className="block truncate text-[0.72rem] text-sidebar-foreground/65">
          Adarsh Shipping &amp; Services
        </small>
      </span>
    </Link>
  );
}

function MonolithSidebarLink({
  href,
  label,
  icon: Icon,
  isActive,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: PrimaryNavSection["icon"];
  isActive: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        sidebarMenuButtonVariants(),
        "text-sidebar-foreground visited:text-sidebar-foreground [&_svg]:text-sidebar-foreground [&>span]:text-sidebar-foreground",
        isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
      )}
      title={label}
    >
      <Icon size={16} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Link>
  );
}

function MonolithSidebarTree({
  sections,
  onNavigate,
}: {
  sections: PrimaryNavSection[];
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const sidebarCollapsed = state === "collapsed";

  const activeSectionId = useMemo(() => {
    const active = sections.find(
      (section) =>
        section.items.length > 0 &&
        matchesPath(pathname, section.href, section.matchPaths),
    );
    return active?.id ?? null;
  }, [pathname, sections]);

  // Accordion: only one section open at a time.
  const [openSectionId, setOpenSectionId] = useState<string | null>(
    activeSectionId,
  );

  // Collapsing the rail closes every section so nothing animates while the
  // width shrinks and nothing pops back open on re-expand.
  useEffect(() => {
    if (sidebarCollapsed) setOpenSectionId(null);
  }, [sidebarCollapsed]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Workspaces</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = matchesPath(pathname, section.href, section.matchPaths);
            const activeItemHref = getActiveItemHref(pathname, section.items);

            if (section.items.length === 0) {
              return (
                <SidebarMenuItem key={section.id}>
                  <MonolithSidebarLink
                    href={section.href}
                    icon={Icon}
                    isActive={isActive}
                    label={section.label}
                    onNavigate={onNavigate}
                  />
                </SidebarMenuItem>
              );
            }

            const isOpen = !sidebarCollapsed && openSectionId === section.id;

            return (
              <Collapsible
                key={section.id}
                isExpanded={isOpen}
                onExpandedChange={(expanded) =>
                  setOpenSectionId(expanded ? section.id : null)
                }
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger
                    aria-label={`${section.label} navigation`}
                    className={cn(
                      sidebarMenuButtonVariants(),
                      "text-sidebar-foreground visited:text-sidebar-foreground [&_svg]:text-sidebar-foreground [&>span]:text-sidebar-foreground",
                      isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon size={16} />
                    <span className="min-w-0 flex-1 truncate">{section.label}</span>
                    <ChevronRight
                      className="ml-auto size-3.5 shrink-0 transition-transform duration-200 group-data-[expanded=true]/collapsible:rotate-90"
                      aria-hidden="true"
                    />
                  </CollapsibleTrigger>
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows,opacity] duration-200 ease-linear",
                      isOpen && !sidebarCollapsed
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0",
                    )}
                    aria-hidden={!isOpen || sidebarCollapsed}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <SidebarMenuSub
                        className={cn(
                          "transition-[opacity,transform] duration-200 ease-linear",
                          isOpen && !sidebarCollapsed
                            ? "translate-y-0 opacity-100"
                            : "-translate-y-1 opacity-0",
                        )}
                      >
                      {section.items.map((item, index) => {
                        const ItemIcon = item.icon;
                        const previousSectionLabel =
                          index > 0 ? section.items[index - 1]?.sectionLabel : undefined;
                        const showSectionLabel =
                          !!item.sectionLabel &&
                          item.sectionLabel !== previousSectionLabel;

                        return (
                          <SidebarMenuSubItem key={item.href}>
                            {showSectionLabel ? (
                              <p className="px-2 pb-1 pt-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
                                {item.sectionLabel}
                              </p>
                            ) : null}
                            <Link
                              href={item.href}
                              aria-current={activeItemHref === item.href ? "page" : undefined}
                              onClick={onNavigate}
                              className={cn(
                                sidebarMenuSubButtonClassName,
                                "text-xs text-sidebar-foreground visited:text-sidebar-foreground [&_svg]:text-sidebar-foreground [&>span]:text-sidebar-foreground",
                                activeItemHref === item.href &&
                                  "bg-sidebar-accent text-sidebar-accent-foreground",
                              )}
                              title={item.label}
                            >
                              <ItemIcon size={14} />
                              <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            </Link>
                          </SidebarMenuSubItem>
                        );
                      })}
                      </SidebarMenuSub>
                    </div>
                  </div>
                </SidebarMenuItem>
              </Collapsible>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function MonolithSidebarUserMenu({
  caps,
  isPlatformAdmin,
  userEmail,
  userId,
  userName,
}: {
  caps: Caps;
  isPlatformAdmin: boolean;
  userEmail: string;
  userId: string;
  userName: string;
}) {
  const { state } = useSidebar();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{
    bottom: number;
    left: number;
    width: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const collapsed = state === "collapsed";

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  // Close the menu whenever the rail collapses/expands so it never renders
  // against a stale anchor.
  useEffect(() => {
    setOpen(false);
  }, [collapsed]);

  // The popover is position: fixed so it escapes the sidebar's overflow
  // clipping — anchor it to the trigger and keep it in sync on scroll/resize.
  useEffect(() => {
    if (!open) return;

    const update = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const viewportPadding = 16;
      const width = Math.min(320, window.innerWidth - viewportPadding * 2);
      const preferredLeft = collapsed ? rect.right + 12 : rect.left;
      const left = Math.max(
        viewportPadding,
        Math.min(preferredLeft, window.innerWidth - width - viewportPadding),
      );
      const preferredBottom = collapsed
        ? window.innerHeight - rect.bottom
        : window.innerHeight - rect.top + 10;
      const bottom = Math.max(
        viewportPadding,
        Math.min(preferredBottom, window.innerHeight - viewportPadding),
      );

      setPosition({ bottom, left, width });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [collapsed, open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open profile menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          sidebarMenuButtonVariants({ size: "lg" }),
          "min-h-12 border border-sidebar-border/80 bg-sidebar/40 text-sidebar-foreground visited:text-sidebar-foreground [&_svg]:text-sidebar-foreground [&>span]:text-sidebar-foreground",
          "justify-start px-2",
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
          {initials(userName)}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 overflow-hidden whitespace-nowrap text-left transition-opacity duration-150 ease-linear",
            collapsed ? "pointer-events-none opacity-0" : "opacity-100",
          )}
        >
          <span className="block truncate font-medium">{userName}</span>
          <span className="block truncate text-xs text-sidebar-foreground/60">
            Operations workspace
          </span>
        </span>
        <ChevronRight
          className={cn(
            "size-4 shrink-0 transition-transform duration-200",
            open ? "rotate-90" : "",
            collapsed ? "hidden" : "",
          )}
        />
      </button>

      {open && position ? (
        <section
          className="mnx-sidebar-account-menu"
          role="menu"
          style={{
            bottom: position.bottom,
            boxSizing: "border-box",
            left: position.left,
            maxHeight: "min(32rem, calc(100dvh - 2rem))",
            maxWidth: "calc(100vw - 2rem)",
            minWidth: 0,
            overflowY: "auto",
            position: "fixed",
            right: "auto",
            top: "auto",
            width: position.width,
            zIndex: 70,
          }}
        >
          <header>
            <span>{initials(userName)}</span>
            <div>
              <em>USER PROFILE</em>
              <b>{userName}</b>
              <small>{userEmail}</small>
            </div>
          </header>
          <div className="mnx-sidebar-account-context">
            <span>
              <UserRound size={14} />
            </span>
            <div>
              <b>{isPlatformAdmin ? "Platform administrator" : "Workspace member"}</b>
              <small>Adarsh Shipping &amp; Services</small>
            </div>
          </div>
          <nav>
            {caps["hrms.employee.read"] ? (
              <Link
                href={`/hrms/employees/${userId}`}
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                <UserRound size={16} />
                <span>
                  <b>My employee profile</b>
                  <small>Complete personal and KYC details</small>
                </span>
              </Link>
            ) : null}
            <Link
              href="/account/security"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <ShieldCheck size={16} />
              <span>
                <b>Security &amp; sessions</b>
                <small>Review signed-in devices</small>
              </span>
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                performLogout();
              }}
            >
              <LogOut size={16} />
              <span>
                <b>Sign out</b>
                <small>End this workspace session</small>
              </span>
            </button>
          </nav>
        </section>
      ) : null}
    </div>
  );
}

export function MonolithAppSidebar({
  caps,
  enabledFeatureIds,
  enabledModuleIds,
  isPlatformAdmin,
  userEmail,
  userId,
  userName,
}: {
  caps: Caps;
  enabledFeatureIds: string[];
  enabledModuleIds: string[];
  isPlatformAdmin: boolean;
  userEmail: string;
  userId: string;
  userName: string;
}) {
  const { isMobile, setOpen, setOpenMobile, state } = useSidebar();
  const collapsed = state === "collapsed";
  const [pinned, setPinned] = useState(false);

  // Restore the pinned preference once on mount.
  useEffect(() => {
    setPinned(window.localStorage.getItem("sidebarPinned") === "true");
  }, []);

  // Pinned keeps the sidebar expanded; unpinning drops it back to the icon rail.
  // Only react to `pinned` changing — depending on `setOpen` (whose identity
  // changes on every open/close) would fight the hover handlers below.
  useEffect(() => {
    window.localStorage.setItem("sidebarPinned", String(pinned));
    setOpen(pinned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinned]);

  // Auto-collapse: unless pinned, the sidebar rests as an icon rail and expands
  // only while hovered.
  const autoCollapseHandlers =
    isMobile || pinned
      ? undefined
      : {
          onMouseEnter: () => setOpen(true),
          onMouseLeave: () => setOpen(false),
        };
  const visibleSections = useMemo(
    () => getVisibleSections(caps, enabledModuleIds, enabledFeatureIds),
    [caps, enabledFeatureIds, enabledModuleIds],
  );

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0"
      aria-label="Primary navigation"
      {...autoCollapseHandlers}
    >
      <SidebarHeader className="flex-row items-center gap-1 overflow-hidden border-b border-sidebar-border/90 px-2.5 py-3">
        <MonolithSidebarBrand />
        {!isMobile ? (
          <button
            type="button"
            onClick={() => setPinned((current) => !current)}
            aria-pressed={pinned}
            aria-label={pinned ? "Unpin sidebar" : "Pin sidebar open"}
            title={pinned ? "Unpin sidebar" : "Pin sidebar open"}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-opacity duration-150 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              pinned && "bg-sidebar-accent/50 text-sidebar-foreground",
              collapsed && "pointer-events-none w-0 opacity-0",
            )}
          >
            {pinned ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
        ) : null}
      </SidebarHeader>
      <SidebarContent className="px-1 py-2">
        <MonolithSidebarTree
          sections={visibleSections}
          onNavigate={() => setOpenMobile(false)}
        />
      </SidebarContent>
      <SidebarFooter
        className={cn(
          "border-t border-sidebar-border/90 py-3",
          collapsed ? "px-2.5" : "px-2.5",
        )}
      >
        <SidebarMenu>
          <SidebarMenuItem>
            <MonolithSidebarUserMenu
              caps={caps}
              isPlatformAdmin={isPlatformAdmin}
              userEmail={userEmail}
              userId={userId}
              userName={userName}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
