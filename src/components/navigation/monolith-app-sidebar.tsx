"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  LogOut,
  Menu,
  Settings2,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ComponentProps, ComponentType } from "react";
import type { PrimaryNavSection } from "@/lib/navigation";
import { getActiveItemHref, getVisibleSections, matchesPath } from "@/lib/navigation";
import type { Caps } from "@/lib/rbac";
import { performLogout } from "@/lib/logout";
import { cn } from "@/lib/utils";

const SIDEBAR_COOKIE_NAME = "mono_sidebar_open";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

type MonolithSidebarContextValue = {
  expanded: boolean;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  toggleExpanded: () => void;
};

type SidebarIcon = ComponentType<{
  size?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}>;

const MonolithSidebarContext = createContext<MonolithSidebarContextValue | null>(null);

function useMonolithSidebar() {
  const context = useContext(MonolithSidebarContext);
  if (!context) {
    throw new Error("useMonolithSidebar must be used within MonolithSidebarProvider.");
  }
  return context;
}

function readStoredExpandedState() {
  if (typeof document === "undefined") return true;
  return !document.cookie
    .split("; ")
    .some((cookie) => cookie === `${SIDEBAR_COOKIE_NAME}=false`);
}

function writeStoredExpandedState(expanded: boolean) {
  document.cookie = `${SIDEBAR_COOKIE_NAME}=${expanded}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; SameSite=Lax`;
}

function subscribeToSidebarPreference() {
  return () => undefined;
}

export function MonolithSidebarProvider({
  children,
  className,
  ...props
}: ComponentProps<"div">) {
  const storedExpanded = useSyncExternalStore(
    subscribeToSidebarPreference,
    readStoredExpandedState,
    () => true,
  );
  const [expandedOverride, setExpandedOverride] = useState<boolean | null>(null);
  const expanded = expandedOverride ?? storedExpanded;
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleExpanded = useCallback(() => {
    setExpandedOverride((current) => {
      const next = !(current ?? expanded);
      writeStoredExpandedState(next);
      return next;
    });
  }, [expanded]);

  const value = useMemo(
    () => ({ expanded, mobileOpen, setMobileOpen, toggleExpanded }),
    [expanded, mobileOpen, toggleExpanded],
  );

  return (
    <MonolithSidebarContext.Provider value={value}>
      <div
        className={cn("mnx-dashboard-shell mono-shell", className)}
        data-sidebar-state={expanded ? "expanded" : "collapsed"}
        {...props}
      >
        {children}
      </div>
    </MonolithSidebarContext.Provider>
  );
}

export function MonolithSidebarFrame({
  children,
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div className={cn("mono-app-frame", className)} {...props}>
      {children}
    </div>
  );
}

export function MonolithSidebarMobileTrigger({
  className,
  ...props
}: ComponentProps<"button">) {
  const { setMobileOpen } = useMonolithSidebar();

  return (
    <button
      type="button"
      className={cn("mono-mobile-nav-trigger", className)}
      aria-label="Open navigation"
      onClick={() => setMobileOpen(true)}
      {...props}
    >
      <Menu size={17} aria-hidden="true" />
    </button>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function MonolithSidebarTooltip({ label }: { label: string }) {
  return (
    <span className="mono-sidebar-tooltip" role="tooltip">
      {label}
    </span>
  );
}

function MonolithSidebarBrand() {
  return (
    <header className="mono-sidebar-header">
      <Link href="/dashboard" aria-label="Monolith dashboard" className="mono-sidebar-brand">
        <span className="mono-sidebar-logo" aria-hidden="true">
          <i />
        </span>
        <span className="mono-sidebar-brand-copy">
          <strong>Monolith</strong>
        </span>
      </Link>
    </header>
  );
}

function MonolithSidebarEdgeToggle() {
  const { expanded, toggleExpanded } = useMonolithSidebar();

  return (
      <button
        type="button"
        className="mono-sidebar-edge-toggle"
        aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        aria-pressed={!expanded}
        onClick={toggleExpanded}
      >
        {expanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>
  );
}

function MonolithSidebarItem({
  href,
  icon: Icon,
  isActive,
  label,
  onNavigate,
}: {
  href: string;
  icon: SidebarIcon;
  isActive: boolean;
  label: string;
  onNavigate: () => void;
}) {
  const { expanded } = useMonolithSidebar();

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn("mono-sidebar-item", isActive && "is-active")}
      title={!expanded ? label : undefined}
      onClick={onNavigate}
    >
      <span className="mono-sidebar-icon" aria-hidden="true">
        <Icon size={17} />
      </span>
      <span className="mono-sidebar-label">{label}</span>
      {!expanded ? <MonolithSidebarTooltip label={label} /> : null}
    </Link>
  );
}

function MonolithSidebarSection({
  section,
  onNavigate,
}: {
  section: PrimaryNavSection;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const { expanded } = useMonolithSidebar();
  const Icon = section.icon;
  const isActive = matchesPath(pathname, section.href, section.matchPaths);
  const activeItemHref = getActiveItemHref(pathname, section.items);
  const [open, setOpen] = useState(false);
  const [submenuReady, setSubmenuReady] = useState(false);
  const isVisible = expanded && submenuReady && (open || isActive);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setSubmenuReady(expanded));
    return () => cancelAnimationFrame(frame);
  }, [expanded]);

  if (section.items.length === 0) {
    return (
      <li>
        <MonolithSidebarItem
          href={section.href}
          icon={Icon}
          isActive={isActive}
          label={section.label}
          onNavigate={onNavigate}
        />
      </li>
    );
  }

  return (
    <li className={cn("mono-sidebar-section", isVisible && "is-open")}>
      <button
        type="button"
        className={cn("mono-sidebar-item", isActive && "is-active")}
        aria-expanded={isVisible}
        aria-label={`${section.label} navigation`}
        title={!expanded ? section.label : undefined}
        onClick={() => {
          if (!expanded) return;
          setOpen((current) => !current);
        }}
      >
        <span className="mono-sidebar-icon" aria-hidden="true">
          <Icon size={17} />
        </span>
        <span className="mono-sidebar-label">{section.label}</span>
        <ChevronRight className="mono-sidebar-chevron" size={14} aria-hidden="true" />
        {!expanded ? <MonolithSidebarTooltip label={section.label} /> : null}
      </button>
      <div className="mono-sidebar-subnav-wrap" aria-hidden={!isVisible}>
        <ul className="mono-sidebar-subnav">
          {section.items.map((item, index) => {
            const ItemIcon = item.icon;
            const previousSectionLabel = index > 0 ? section.items[index - 1]?.sectionLabel : undefined;
            const showSectionLabel =
              !!item.sectionLabel && item.sectionLabel !== previousSectionLabel;

            return (
              <li key={item.href}>
                {showSectionLabel ? (
                  <p className="mono-sidebar-subheading">{item.sectionLabel}</p>
                ) : null}
                <Link
                  href={item.href}
                  aria-current={activeItemHref === item.href ? "page" : undefined}
                  className={cn(
                    "mono-sidebar-subitem",
                    activeItemHref === item.href && "is-active",
                  )}
                  onClick={onNavigate}
                >
                  <ItemIcon size={14} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </li>
  );
}

function MonolithSidebarNavigation({
  sections,
  onNavigate,
}: {
  sections: PrimaryNavSection[];
  onNavigate: () => void;
}) {
  const primarySections = sections.map((section) => {
    if (section.id === "notifications") {
      return { ...section, items: [] };
    }
    return section;
  });

  return (
    <nav className="mono-sidebar-nav" aria-label="Primary navigation">
      <ul>
        {primarySections.map((section) => (
          <MonolithSidebarSection
            key={section.id}
            section={section}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </nav>
  );
}

function MonolithSidebarUtilityLinks({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="mono-sidebar-utilities" aria-label="Support navigation">
      <MonolithSidebarItem
        href="/admin/design-system"
        icon={HelpCircle}
        isActive={false}
        label="Help & Support"
        onNavigate={onNavigate}
      />
      <MonolithSidebarItem
        href="/admin/settings"
        icon={Settings2}
        isActive={false}
        label="Settings"
        onNavigate={onNavigate}
      />
    </div>
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
  const { expanded } = useMonolithSidebar();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div className="mono-sidebar-profile-wrap" ref={containerRef}>
      <button
        type="button"
        className="mono-sidebar-profile"
        aria-label="Open profile menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="mono-sidebar-avatar">{initials(userName)}</span>
        <span className="mono-sidebar-profile-copy">
          <strong>{userName}</strong>
          <small>Operations workspace</small>
        </span>
        <ChevronDown className="mono-sidebar-profile-chevron" size={14} aria-hidden="true" />
        {!expanded ? <MonolithSidebarTooltip label={userName} /> : null}
      </button>

      {open ? (
        <section className="mono-profile-popover" role="menu">
          <header>
            <span>{initials(userName)}</span>
            <div>
              <em>USER PROFILE</em>
              <b>{userName}</b>
              <small>{userEmail}</small>
            </div>
          </header>
          <div className="mono-profile-context">
            <UserRound size={14} aria-hidden="true" />
            <span>{isPlatformAdmin ? "Platform administrator" : "Workspace member"}</span>
          </div>
          <nav>
            {caps["hrms.employee.read"] ? (
              <Link href={`/hrms/employees/${userId}`} role="menuitem" onClick={() => setOpen(false)}>
                <UserRound size={15} aria-hidden="true" />
                <span>My employee profile</span>
              </Link>
            ) : null}
            <Link href="/account/security" role="menuitem" onClick={() => setOpen(false)}>
              <ShieldCheck size={15} aria-hidden="true" />
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
              <LogOut size={15} aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </nav>
        </section>
      ) : null}
    </div>
  );
}

function MonolithSidebarSurface({
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
  const { setMobileOpen } = useMonolithSidebar();
  const visibleSections = useMemo(
    () => getVisibleSections(caps, enabledModuleIds, enabledFeatureIds),
    [caps, enabledFeatureIds, enabledModuleIds],
  );
  const closeMobile = useCallback(() => setMobileOpen(false), [setMobileOpen]);

  return (
    <div className="mono-sidebar-surface">
      <MonolithSidebarBrand />
      <div className="mono-sidebar-scroll">
        <MonolithSidebarNavigation sections={visibleSections} onNavigate={closeMobile} />
      </div>
      <footer className="mono-sidebar-footer">
        <MonolithSidebarUtilityLinks onNavigate={closeMobile} />
        <MonolithSidebarEdgeToggle />
        <MonolithSidebarUserMenu
          caps={caps}
          isPlatformAdmin={isPlatformAdmin}
          userEmail={userEmail}
          userId={userId}
          userName={userName}
        />
      </footer>
    </div>
  );
}

export function MonolithAppSidebar(props: {
  caps: Caps;
  enabledFeatureIds: string[];
  enabledModuleIds: string[];
  isPlatformAdmin: boolean;
  userEmail: string;
  userId: string;
  userName: string;
}) {
  const { mobileOpen, setMobileOpen } = useMonolithSidebar();

  return (
    <>
      <aside className="mono-sidebar" aria-label="Primary navigation">
        <MonolithSidebarSurface {...props} />
      </aside>

      {mobileOpen ? (
        <div className="mono-mobile-sidebar-layer" role="presentation">
          <button
            type="button"
            className="mono-mobile-sidebar-backdrop"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="mono-mobile-sidebar"
            role="dialog"
            aria-label="Mobile navigation"
            aria-modal="true"
          >
            <button
              type="button"
              className="mono-mobile-sidebar-close"
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            >
              <X size={16} aria-hidden="true" />
            </button>
            <MonolithSidebarSurface {...props} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
