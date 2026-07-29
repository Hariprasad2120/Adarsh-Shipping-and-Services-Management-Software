"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  Command,
  LogOut,
  Menu,
  Moon,
  Palette,
  Search,
  ShieldCheck,
  Sparkles,
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
  getVisibleSections,
  matchesPath,
} from "@/lib/navigation";
import { getPathLabel, segmentToLabel } from "@/lib/route-labels";
import { MonaProvider, useMonaChat } from "@/components/mona/mona-provider";

const MonaChat = dynamic(
  () => import("@/components/mona/mona-chat").then((module) => module.MonaChat),
  { ssr: false },
);

export type MonolithTheme = "night" | "violet" | "light" | "purple";

export interface MonolithAppShellProps {
  children: React.ReactNode;
  caps: Caps;
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
  { id: "night", label: "Night", icon: Moon },
  { id: "violet", label: "Violet", icon: Sparkles },
  { id: "light", label: "Light", icon: Sun },
  { id: "purple", label: "Purple", icon: Palette },
];

const MonolithThemeContext = createContext<{
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

function resolveTheme(): MonolithTheme {
  if (typeof window === "undefined") return "night";
  const saved = window.localStorage.getItem("theme");
  return saved === "night" || saved === "violet" || saved === "light" || saved === "purple"
    ? saved
    : "night";
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
      <MonolithAppShellBody {...props} />
      <MonaChat />
    </MonaProvider>
  );
}

function MonolithAppShellBody({
  children,
  caps,
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
  const [theme, setTheme] = useState<MonolithTheme>("night");
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const documentStateRef = useRef<{
    colorScheme: string;
    dashboardShell?: string;
    dashboardTheme?: string;
    themeClasses: string[];
  } | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const visibleSections = useMemo(
    () => getVisibleSections(caps, enabledModuleIds),
    [caps, enabledModuleIds],
  );

  const filteredSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return visibleSections.slice(0, 6);
    return visibleSections
      .filter(
        (section) =>
          section.label.toLowerCase().includes(normalizedQuery) ||
          section.items.some((item) =>
            item.label.toLowerCase().includes(normalizedQuery),
          ),
      )
      .slice(0, 8);
  }, [query, visibleSections]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setTheme(resolveTheme());
      setThemeLoaded(true);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!themeLoaded) return;
    window.localStorage.setItem("theme", theme);
  }, [theme, themeLoaded]);

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
        "theme-purple",
        "light",
        "night",
        "violet",
        "purple",
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
        "theme-purple",
        "light",
        "night",
        "violet",
        "purple",
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
    root.dataset.dashboardShell = "true";
    root.dataset.dashboardTheme = theme;
    root.classList.remove(
      "theme-light",
      "theme-night",
      "theme-violet",
      "theme-purple",
      "light",
      "night",
      "violet",
      "purple",
      "dark",
    );
    root.classList.add(`theme-${theme}`, theme);
    root.style.colorScheme = theme === "light" || theme === "purple" ? "light" : "dark";
  }, [theme]);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        window.requestAnimationFrame(() => searchRef.current?.focus());
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
    const activeSection = visibleSections.find(
      (section) =>
        section.items.length > 0 &&
        matchesPath(pathname, section.href, section.matchPaths),
    );
    if (!activeSection) return;

    const frameId = window.requestAnimationFrame(() => {
      setExpandedSections((current) =>
        current[activeSection.id]
          ? current
          : { ...current, [activeSection.id]: true },
      );
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [pathname, visibleSections]);

  return (
    <MonolithThemeContext.Provider value={{ selectTheme: setTheme, theme }}>
      <div className="mnx-dashboard-shell" data-theme={theme}>
      <aside
        className={`mnx-sidebar ${mobileOpen ? "is-open" : ""}`}
        aria-label="Primary navigation"
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
            const isExpanded = hasItems && !!expandedSections[section.id];
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
                  onClick={() =>
                    setExpandedSections((current) => ({
                      ...current,
                      [section.id]: !current[section.id],
                    }))
                  }
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

                <div
                  id={`mnx-sidebar-items-${section.id}`}
                  className="mnx-sidebar-subnav"
                  role="group"
                  aria-label={`${section.label} navigation`}
                  hidden={!isExpanded}
                >
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isItemActive = activeItemHref === item.href;

                    return (
                      <Link
                        href={item.href}
                        key={item.href}
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
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <button type="button" className="mnx-mona-card" onClick={toggleChat}>
          <span>
            <Sparkles size={14} strokeWidth={2} />
          </span>
          <span>
            <b>Ask Mona</b>
            <small>Open your workspace assistant</small>
          </span>
          <kbd>⌘M</kbd>
        </button>

        <footer className="mnx-sidebar-user">
          <span>{initials(userName)}</span>
          <div>
            <b>{userName}</b>
            <small>Operations workspace</small>
          </div>
          <button
            type="button"
            onClick={() => performLogout()}
            aria-label="Log out"
            title="Log out"
          >
            <LogOut size={14} strokeWidth={2} />
          </button>
        </footer>
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
              onClick={() => {
                setSearchOpen(true);
                window.requestAnimationFrame(() => searchRef.current?.focus());
              }}
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

            <div className="mnx-profile-menu" ref={profileRef}>
              <button
                type="button"
                className="mnx-topbar-avatar"
                aria-label="Open profile menu"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                onClick={() => setProfileOpen((current) => !current)}
              >
                {initials(userName)}
              </button>
              {profileOpen ? (
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
                      <b>
                        {isPlatformAdmin
                          ? "Platform administrator"
                          : "Workspace member"}
                      </b>
                      <small>Adarsh Shipping &amp; Services</small>
                    </div>
                  </div>
                  <nav>
                    {caps["hrms.employee.read"] ? (
                      <Link
                        href={`/hrms/employees/${userId}`}
                        role="menuitem"
                        onClick={() => setProfileOpen(false)}
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
                      onClick={() => setProfileOpen(false)}
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
                      onClick={() => performLogout()}
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
          </div>
        </header>

        <main className="mnx-dashboard-main">{children}</main>
      </div>

      {searchOpen ? (
        <div
          className="mnx-command-layer"
          role="presentation"
          onMouseDown={() => setSearchOpen(false)}
        >
          <section
            className="mnx-command-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Search workspaces"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <label>
              <Search size={18} />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search workspaces and modules"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
              >
                <X size={16} />
              </button>
            </label>
            <p>QUICK NAVIGATION</p>
            <div>
              {filteredSections.map((section) => {
                const Icon = section.icon;
                return (
                  <Link
                    href={section.href}
                    key={section.id}
                    onClick={() => setSearchOpen(false)}
                  >
                    <span>
                      <Icon size={17} />
                    </span>
                    <span>
                      <b>{section.label}</b>
                      <small>{section.items.length} linked pages</small>
                    </span>
                    <Command size={14} />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
      </div>
    </MonolithThemeContext.Provider>
  );
}

function MonolithProfileLabel() {
  return <em>USER PROFILE</em>;
}
