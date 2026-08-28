"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Caps } from "@/lib/rbac";
import { performLogout } from "@/lib/logout";
import {
  getActiveItemHref,
  getSearchCommandEntries,
  getVisibleSections,
  matchesPath,
  rankSearchCommandEntries,
} from "@/lib/navigation";
import { getPathLabel, segmentToLabel } from "@/lib/route-labels";
import { MonolithSearchCommand } from "@/components/navigation/monolith-search-command";
import { MonaProvider, useMonaChat } from "@/modules/mona/components";
import { MonaDesktopPet } from "@/modules/mona/components/mona-desktop-pet";
import { MonaGuidanceOverlay } from "@/modules/mona/components/mona-guidance-overlay";
import {
  MONA_PET_OPEN_SEARCH_EVENT,
  dispatchMonaPetRoute,
} from "@/modules/mona/pet-events";
import { DevConsoleErrorBoundary } from "@/components/dev-console/dev-console-error-boundary";
import { DevConsoleProfiler } from "@/components/dev-console/dev-console-profiler";
import { markRouteChangeStart, recordRouteLoadPing } from "@/components/dev-console/dev-console-perf-tracker";

const MonaChat = dynamic(
  () => import("@/modules/mona/components").then((module) => module.MonaChat),
  { ssr: false },
);

const DevConsole = dynamic(
  () => import("@/components/dev-console/dev-console").then((module) => module.DevConsole),
  { ssr: false },
);

export type MonolithTheme = "light" | "dark";
export type MonolithAccent = "blue" | "green" | "amber" | "violet";

export interface MonolithAppShellProps {
  children: React.ReactNode;
  caps: Caps;
  enabledFeatureIds: string[];
  enabledModuleIds: string[];
  isPlatformAdmin: boolean;
  userId: string;
  userEmail: string;
  userName: string;
}

export const monolithThemes: {
  id: MonolithTheme;
  label: string;
  icon: typeof Sun;
}[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
];

export const monolithAccentThemes: {
  id: MonolithAccent;
  label: string;
}[] = [
  { id: "blue", label: "Blue" },
  { id: "green", label: "Green" },
  { id: "amber", label: "Amber" },
  { id: "violet", label: "Violet" },
];

const ACCENT_HUE_STOPS: Record<
  MonolithAccent,
  { primary: string; hover: string; active: string; softLight: string; softBorderLight: string }
> = {
  blue: {
    primary: "var(--frappe-blue-500)",
    hover: "var(--frappe-blue-600)",
    active: "var(--frappe-blue-700)",
    softLight: "var(--frappe-blue-50)",
    softBorderLight: "var(--frappe-blue-200)",
  },
  green: {
    primary: "var(--frappe-green-500)",
    hover: "var(--frappe-green-600)",
    active: "var(--frappe-green-700)",
    softLight: "var(--frappe-green-50)",
    softBorderLight: "var(--frappe-green-200)",
  },
  amber: {
    primary: "var(--frappe-amber-500)",
    hover: "var(--frappe-amber-600)",
    active: "var(--frappe-amber-700)",
    softLight: "var(--frappe-amber-50)",
    softBorderLight: "var(--frappe-amber-200)",
  },
  violet: {
    primary: "var(--frappe-violet-500)",
    hover: "var(--frappe-violet-600)",
    active: "var(--frappe-violet-700)",
    softLight: "var(--frappe-violet-50)",
    softBorderLight: "var(--frappe-violet-200)",
  },
};

/** Writes accent colors as inline styles on <html> so they always win the cascade, regardless of [data-accent] selector specificity fights elsewhere. */
function applyAccentInlineStyles(root: HTMLElement, accent: MonolithAccent) {
  const stops = ACCENT_HUE_STOPS[accent];
  root.style.setProperty("--frappe-primary", stops.primary);
  root.style.setProperty("--frappe-primary-hover", stops.hover);
  root.style.setProperty("--frappe-primary-active", stops.active);
  root.style.setProperty("--frappe-primary-soft", stops.softLight);
  root.style.setProperty("--frappe-primary-soft-border", stops.softBorderLight);
  // --mnx-accent-text / --mnx-accent-contrast (used app-wide for accent-colored
  // text and for text-on-solid-accent-fill) resolve through these two — they
  // were never set here, so every such usage silently computed to nothing
  // (invisible text/fills). `active` (700-weight) reads well as text on light
  // backgrounds; white reads well as text on any of the four accent hues.
  root.style.setProperty("--frappe-primary-strong", stops.active);
  root.style.setProperty("--frappe-primary-foreground", "#ffffff");
}

const MonolithThemeContext = createContext<{
  accent: MonolithAccent;
  selectAccent: (accent: MonolithAccent) => void;
  selectTheme: (theme: MonolithTheme) => void;
  theme: MonolithTheme;
} | null>(null);

export function MonolithThemePicker({
  allowedThemes,
  ariaLabel = "Dashboard theme",
}: {
  allowedThemes?: readonly MonolithTheme[];
  ariaLabel?: string;
}) {
  const themeContext = useContext(MonolithThemeContext);
  if (!themeContext) return null;

  const visibleThemes = allowedThemes
    ? monolithThemes.filter((item) => allowedThemes.includes(item.id))
    : monolithThemes;

  return (
    <div className="mnx-theme-picker" role="group" aria-label={ariaLabel}>
      {visibleThemes.map((item) => {
        const Icon = item.icon;
        return (
          <button
            type="button"
            key={item.id}
            className={themeContext.theme === item.id ? "is-active" : ""}
            onClick={() => themeContext.selectTheme(item.id)}
            aria-pressed={themeContext.theme === item.id}
            title={`${item.label} theme`}
          >
            <Icon size={13} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function MonolithAccentPicker({
  ariaLabel = "Dashboard accent theme",
}: {
  ariaLabel?: string;
}) {
  const themeContext = useContext(MonolithThemeContext);
  if (!themeContext) return null;

  return (
    <div className="mnx-accent-picker" role="group" aria-label={ariaLabel}>
      {monolithAccentThemes.map((item) => (
        <button
          type="button"
          key={item.id}
          className={themeContext.accent === item.id ? "is-active" : ""}
          onClick={() => themeContext.selectAccent(item.id)}
          aria-pressed={themeContext.accent === item.id}
          title={`${item.label} accent`}
        >
          <span className={`mnx-accent-swatch is-${item.id}`} aria-hidden="true" />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function resolveThemeState(): {
  accent: MonolithAccent;
  theme: MonolithTheme;
} {
  if (typeof window === "undefined") {
    return { accent: "blue", theme: "light" };
  }

  const saved = window.localStorage.getItem("theme");
  const savedAccent = window.localStorage.getItem("themeAccent");

  const theme: MonolithTheme =
    saved === "light" || saved === "dark"
      ? saved
      : saved === "night" || saved === "violet"
        ? "dark"
        : "light";

  const accent: MonolithAccent =
    savedAccent === "blue" ||
    savedAccent === "green" ||
    savedAccent === "amber" ||
    savedAccent === "violet"
      ? savedAccent
      : saved === "violet"
        ? "violet"
        : "blue";

  return { accent, theme };
}

export function MonolithThemeProvider({
  children,
  dashboardShell = false,
}: {
  children: React.ReactNode;
  dashboardShell?: boolean;
}) {
  const [theme, setTheme] = useState<MonolithTheme>("light");
  const [accent, setAccent] = useState<MonolithAccent>("blue");
  const [themeLoaded, setThemeLoaded] = useState(false);
  const documentStateRef = useRef<{
    colorScheme: string;
    dashboardShell?: string;
    dashboardTheme?: string;
    themeClasses: string[];
  } | null>(null);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const resolvedState = resolveThemeState();
      setTheme(resolvedState.theme);
      setAccent(resolvedState.accent);
      setThemeLoaded(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!themeLoaded) return;
    window.localStorage.setItem("theme", theme);
    window.localStorage.setItem("themeAccent", accent);
    window.dispatchEvent(new Event("themechange"));
  }, [accent, theme, themeLoaded]);

  useEffect(() => {
    const root = document.documentElement;
    documentStateRef.current = {
      colorScheme: root.style.colorScheme,
      dashboardShell: root.dataset.dashboardShell,
      dashboardTheme: root.dataset.dashboardTheme,
      themeClasses: [
        "theme-light",
        "theme-night",
        "theme-violet",
        "light",
        "night",
        "violet",
        "dark",
      ].filter((className) => root.classList.contains(className)),
    };

    return () => {
      const previousState = documentStateRef.current;
      if (!previousState) return;

      if (previousState.dashboardShell) {
        root.dataset.dashboardShell = previousState.dashboardShell;
      } else {
        delete root.dataset.dashboardShell;
      }
      if (previousState.dashboardTheme) {
        root.dataset.dashboardTheme = previousState.dashboardTheme;
      } else {
        delete root.dataset.dashboardTheme;
      }

      root.classList.remove(
        "theme-light",
        "theme-night",
        "theme-violet",
        "light",
        "night",
        "violet",
        "dark",
      );
      if (previousState.themeClasses.length > 0) {
        root.classList.add(...previousState.themeClasses);
      }
      root.style.colorScheme = previousState.colorScheme;
      documentStateRef.current = null;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (dashboardShell) {
      root.dataset.dashboardShell = "true";
    } else {
      delete root.dataset.dashboardShell;
    }
    root.dataset.dashboardTheme = theme;
    root.dataset.theme = theme;
    root.dataset.accent = accent;
    applyAccentInlineStyles(root, accent);
    root.classList.remove(
      "theme-light",
      "theme-night",
      "theme-violet",
      "light",
      "night",
      "violet",
      "dark",
    );
    root.classList.add(
      theme,
      theme === "light"
        ? "theme-light"
        : accent === "violet"
          ? "theme-violet"
          : "theme-night",
    );
    root.style.colorScheme = theme === "light" ? "light" : "dark";
  }, [accent, dashboardShell, theme]);

  return (
    <MonolithThemeContext.Provider
      value={{
        accent,
        selectAccent: setAccent,
        selectTheme: setTheme,
        theme,
      }}
    >
      {children}
    </MonolithThemeContext.Provider>
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

export function MonolithAppShell(props: MonolithAppShellProps) {
  return (
    <MonaProvider>
      <MonolithThemeProvider dashboardShell>
        <MonolithAppShellBody {...props} />
      </MonolithThemeProvider>
      <MonaDesktopPet />
      <MonaChat />
      <MonaGuidanceOverlay />
      {props.caps["system.dev_console.access"] ? (
        <DevConsole
          userEmail={props.userEmail}
          userRole={props.isPlatformAdmin ? "Platform admin" : undefined}
        />
      ) : null}
    </MonaProvider>
  );
}

function MonolithAppShellBody({
  children,
  caps,
  enabledFeatureIds,
  enabledModuleIds,
  isPlatformAdmin,
  userId,
  userEmail,
  userName,
}: MonolithAppShellProps) {
  const pathname = usePathname();
  const contextLabel =
    getPathLabel(pathname) ??
    segmentToLabel(pathname.split("/").filter(Boolean).at(-1) ?? "dashboard");
  const { toggleChat } = useMonaChat();
  const themeContext = useContext(MonolithThemeContext);
  if (!themeContext) {
    throw new Error("MonolithAppShellBody requires MonolithThemeProvider.");
  }
  const { theme } = themeContext;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(
    null,
  );
  const profileRef = useRef<HTMLDivElement | null>(null);
  const sidebarIsExpanded = sidebarPinned || sidebarExpanded || profileOpen;
  const visibleSections = useMemo(
    () => getVisibleSections(caps, enabledModuleIds, enabledFeatureIds),
    [caps, enabledFeatureIds, enabledModuleIds],
  );
  const searchEntries = useMemo(
    () => getSearchCommandEntries(caps, enabledModuleIds, enabledFeatureIds),
    [caps, enabledFeatureIds, enabledModuleIds],
  );

  const filteredSearchEntries = useMemo(
    () => rankSearchCommandEntries(searchEntries, query),
    [query, searchEntries],
  );

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "m") {
        event.preventDefault();
        toggleChat();
      }
      if (event.key === "Escape") {
        setProfileOpen(false);
        setSearchOpen(false);
        setMobileOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [toggleChat]);

  useEffect(() => {
    function handleOpenSearch() {
      setSearchOpen(true);
    }

    window.addEventListener(MONA_PET_OPEN_SEARCH_EVENT, handleOpenSearch);
    return () => window.removeEventListener(MONA_PET_OPEN_SEARCH_EVENT, handleOpenSearch);
  }, []);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setSidebarPinned(window.localStorage.getItem("sidebarPinned") === "true");
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("sidebarPinned", String(sidebarPinned));
  }, [sidebarPinned]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    markRouteChangeStart();
    if (caps["system.dev_console.access"]) recordRouteLoadPing(pathname);
    dispatchMonaPetRoute({ contextLabel, pathname });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only fire on pathname change
  }, [pathname]);

  useEffect(() => {
    const activeSection = visibleSections.find(
      (section) =>
        section.items.length > 0 &&
        matchesPath(pathname, section.href, section.matchPaths),
    );
    if (!activeSection) return;

    const frameId = window.requestAnimationFrame(() => {
      setExpandedSectionId((current) =>
        current === activeSection.id ? current : activeSection.id,
      );
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [pathname, visibleSections]);

  return (
    <div
      className="mnx-dashboard-shell"
      data-theme={theme}
      data-sidebar-expanded={sidebarIsExpanded}
      data-sidebar-pinned={sidebarPinned}
    >
      <aside
        className={`mnx-sidebar ${mobileOpen ? "is-open" : ""}`}
        aria-label="Primary navigation"
        onMouseEnter={() => {
          if (!sidebarPinned) setSidebarExpanded(true);
        }}
        onMouseLeave={() => {
          setProfileOpen(false);
          if (!sidebarPinned) setSidebarExpanded(false);
        }}
        onFocusCapture={() => {
          if (!sidebarPinned) setSidebarExpanded(true);
        }}
        onBlurCapture={(event) => {
          if (
            !sidebarPinned &&
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            setProfileOpen(false);
            setSidebarExpanded(false);
          }
        }}
      >
        <div className="mnx-sidebar-brand">
          <Link href="/dashboard" aria-label="Monolith dashboard">
            <span className="mnx-brand-mark">
              <i />
              <i />
            </span>
            <span>
              <b>MONOLITH</b>
              <small>Adarsh Shipping & Services</small>
            </span>
          </Link>
          <button
            type="button"
            className="mnx-sidebar-pin-toggle"
            onClick={() => {
              setSidebarPinned((current) => {
                const next = !current;
                setSidebarExpanded(next);
                if (!next && !profileOpen) {
                  setSidebarExpanded(false);
                }
                return next;
              });
            }}
            aria-label={sidebarPinned ? "Unpin sidebar" : "Pin sidebar open"}
            title={sidebarPinned ? "Unpin sidebar" : "Pin sidebar open"}
            aria-pressed={sidebarPinned}
          >
            {sidebarPinned ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
          <button
            type="button"
            className="mnx-sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="mnx-sidebar-nav">
          <p>WORKSPACES</p>
          {visibleSections.map((section) => {
            const Icon = section.icon;
            const isActive = matchesPath(
              pathname,
              section.href,
              section.matchPaths,
            );
            const hasItems = section.items.length > 0;
            const isExpanded = hasItems && expandedSectionId === section.id;
            const isSubnavVisible = isExpanded && sidebarIsExpanded;
            const activeItemHref = getActiveItemHref(pathname, section.items);

            if (!hasItems) {
              return (
                <Link
                  href={section.href}
                  key={section.id}
                  className={`mnx-sidebar-entry ${isActive ? "is-active" : ""}`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  <span>
                    <Icon size={15} strokeWidth={1.9} />
                  </span>
                  <b>{section.label}</b>
                </Link>
              );
            }

            return (
              <div
                key={section.id}
                className={`mnx-sidebar-section ${isExpanded ? "is-expanded" : ""}`}
              >
                <button
                  type="button"
                  className={`mnx-sidebar-entry ${isActive ? "is-active" : ""}`}
                  aria-expanded={isExpanded}
                  aria-controls={`mnx-sidebar-items-${section.id}`}
                  onClick={() => {
                    if (!sidebarPinned) setSidebarExpanded(true);
                    setExpandedSectionId((current) =>
                      current === section.id ? null : section.id,
                    );
                  }}
                >
                  <span>
                    <Icon size={15} strokeWidth={1.9} />
                  </span>
                  <b>{section.label}</b>
                  <ChevronDown
                    size={11}
                    className="mnx-sidebar-chevron"
                    aria-hidden="true"
                  />
                </button>

                {isSubnavVisible ? (
                  <div
                    id={`mnx-sidebar-items-${section.id}`}
                    className="mnx-sidebar-subnav"
                    role="group"
                    aria-label={`${section.label} navigation`}
                  >
                    {section.items.map((item, index) => {
                      const ItemIcon = item.icon;
                      const isItemActive = activeItemHref === item.href;
                      const previousSectionLabel =
                        index > 0 ? section.items[index - 1]?.sectionLabel : undefined;
                      const showSectionLabel =
                        !!item.sectionLabel &&
                        item.sectionLabel !== previousSectionLabel;

                      return (
                        <div className="mnx-sidebar-subnav-item" key={item.href}>
                          {showSectionLabel ? (
                            <p className="mnx-sidebar-subnav-heading">
                              {item.sectionLabel}
                            </p>
                          ) : null}
                          <Link
                            href={item.href}
                            className={isItemActive ? "is-active" : ""}
                            aria-current={isItemActive ? "page" : undefined}
                            title={item.label}
                            onClick={() => setMobileOpen(false)}
                          >
                            <span>
                              <ItemIcon size={13} strokeWidth={1.9} />
                            </span>
                            <b>{item.label}</b>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="mnx-sidebar-footer">
          <div className="mnx-profile-menu mnx-sidebar-profile-menu" ref={profileRef}>
          <button
            type="button"
            className="mnx-sidebar-user"
            aria-label="Open profile menu"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            onClick={() =>
              setProfileOpen((current) => {
                const next = !current;
                if (next) {
                  setSidebarExpanded(true);
                } else if (!sidebarPinned) {
                  setSidebarExpanded(false);
                }
                return next;
              })
            }
          >
            <span>{initials(userName)}</span>
            <div>
              <b>{userName}</b>
              <small>Operations workspace</small>
            </div>
            <ChevronDown
              size={14}
              strokeWidth={2}
              className={`mnx-sidebar-user-chevron ${profileOpen ? "is-open" : ""}`}
              aria-hidden="true"
            />
          </button>
          {profileOpen ? (
            <MonolithProfilePopover
              caps={caps}
              isPlatformAdmin={isPlatformAdmin}
              onNavigate={() => setProfileOpen(false)}
              userEmail={userEmail}
              userId={userId}
              userName={userName}
            />
          ) : null}
          </div>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="mnx-sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      ) : null}

      <div className="mnx-dashboard-frame">
        <header className="mnx-topbar">
          <div className="mnx-topbar-context">
            <button
              type="button"
              className="mnx-mobile-menu"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={19} />
            </button>
            <div>
              <span>Monolith</span>
              <i>/</i>
              <b>{contextLabel}</b>
            </div>
          </div>

          <div className="mnx-topbar-actions">
            <button
              type="button"
              className="mnx-global-search"
              data-workpet-target="topbar-global-search"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={15} />
              <span>Search workspaces…</span>
              <kbd>⌘ K</kbd>
            </button>

            <Link
              className="mnx-topbar-icon"
              href="/notifications"
              aria-label="Notifications"
            >
              <Bell size={17} />
              <i />
            </Link>

            <MonolithThemePicker />
            <MonolithAccentPicker />

          </div>
        </header>

        <main className="mnx-dashboard-main">
          {caps["system.dev_console.access"] ? (
            <DevConsoleErrorBoundary>
              <DevConsoleProfiler id={contextLabel}>{children}</DevConsoleProfiler>
            </DevConsoleErrorBoundary>
          ) : (
            children
          )}
        </main>
      </div>

      {searchOpen ? (
        <MonolithSearchCommand
          entries={filteredSearchEntries}
          open={searchOpen}
          query={query}
          onClose={() => setSearchOpen(false)}
          onOpenChange={setSearchOpen}
          onQueryChange={setQuery}
        />
      ) : null}
    </div>
  );
}

function MonolithProfileLabel() {
  return <em>USER PROFILE</em>;
}

function MonolithProfilePopover({
  caps,
  isPlatformAdmin,
  onNavigate,
  userEmail,
  userId,
  userName,
}: {
  caps: Caps;
  isPlatformAdmin: boolean;
  onNavigate: () => void;
  userEmail: string;
  userId: string;
  userName: string;
}) {
  return (
    <section className="mnx-profile-popover" role="menu">
      <header>
        <span>{initials(userName)}</span>
        <div>
          <MonolithProfileLabel />
          <b>{userName}</b>
          <small>{userEmail}</small>
        </div>
      </header>
      <div className="mnx-profile-context">
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
          <Link href={`/hrms/employees/${userId}`} role="menuitem" onClick={onNavigate}>
            <UserRound size={16} />
            <span>
              <b>My employee profile</b>
              <small>Complete personal and KYC details</small>
            </span>
          </Link>
        ) : null}
        <Link href="/account/security" role="menuitem" onClick={onNavigate}>
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
            onNavigate();
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
  );
}
