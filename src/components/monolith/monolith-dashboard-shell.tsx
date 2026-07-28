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
  Search,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Caps } from "@/lib/rbac";
import { performLogout } from "@/lib/logout";
import { getVisibleSections, matchesPath } from "@/lib/navigation";
import { MonaProvider, useMonaChat } from "@/components/mona/mona-provider";

const MonaChat = dynamic(
  () => import("@/components/mona/mona-chat").then((module) => module.MonaChat),
  { ssr: false },
);

type MonolithTheme = "light" | "night" | "violet";

interface MonolithDashboardShellProps {
  children: React.ReactNode;
  caps: Caps;
  enabledModuleIds: string[];
  userName: string;
}

const themes: { id: MonolithTheme; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "night", label: "Night", icon: Moon },
  { id: "violet", label: "Violet", icon: Sparkles },
];

function resolveTheme(): MonolithTheme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem("theme");
  return saved === "night" || saved === "violet" ? saved : "light";
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

export function MonolithDashboardShell(props: MonolithDashboardShellProps) {
  return (
    <MonaProvider>
      <MonolithDashboardShellBody {...props} />
      <MonaChat />
    </MonaProvider>
  );
}

function MonolithDashboardShellBody({
  children,
  caps,
  enabledModuleIds,
  userName,
}: MonolithDashboardShellProps) {
  const pathname = usePathname();
  const { toggleChat } = useMonaChat();
  const [theme, setTheme] = useState<MonolithTheme>("light");
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const documentStateRef = useRef<{
    colorScheme: string;
    dashboardShell?: string;
    dashboardTheme?: string;
    themeClasses: string[];
  } | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const visibleSections = useMemo(
    () => getVisibleSections(caps, enabledModuleIds),
    [caps, enabledModuleIds],
  );
  const activeLocation = useMemo(() => {
    const section = visibleSections
      .filter((item) => matchesPath(pathname, item.href, item.matchPaths))
      .sort((left, right) => right.href.length - left.href.length)[0];

    const item = section?.items
      .filter((entry) => matchesPath(pathname, entry.href, entry.matchPaths))
      .sort((left, right) => right.href.length - left.href.length)[0];

    const fallback = pathname
      .split("/")
      .filter(Boolean)
      .at(-1)
      ?.replaceAll("-", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

    return {
      section: section?.label ?? "Workspace",
      page: item?.label ?? section?.label ?? fallback ?? "Workspace",
    };
  }, [pathname, visibleSections]);

  const filteredSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return visibleSections.slice(0, 6);
    return visibleSections.filter((section) =>
      section.label.toLowerCase().includes(normalizedQuery)
      || section.items.some((item) => item.label.toLowerCase().includes(normalizedQuery)),
    ).slice(0, 8);
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
      themeClasses: ["theme-light", "theme-night", "theme-violet", "light", "night", "violet", "dark"]
        .filter((className) => root.classList.contains(className)),
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

      root.classList.remove("theme-light", "theme-night", "theme-violet", "light", "night", "violet", "dark");
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
    root.classList.remove("theme-light", "theme-night", "theme-violet", "light", "night", "violet", "dark");
    root.classList.add(`theme-${theme}`, theme);
    root.style.colorScheme = theme === "light" ? "light" : "dark";
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
        setSearchOpen(false);
        setMobileOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [toggleChat]);

  function selectTheme(nextTheme: MonolithTheme) {
    setTheme(nextTheme);
  }

  return (
    <div className="mnx-dashboard-shell" data-theme={theme}>
      <aside className={`mnx-sidebar ${mobileOpen ? "is-open" : ""}`} aria-label="Primary navigation">
        <div className="mnx-sidebar-brand">
          <Link href="/dashboard" aria-label="Monolith dashboard">
            <span className="mnx-brand-mark"><i /><i /></span>
            <span><b>MONOLITH</b><small>Adarsh Shipping & Services</small></span>
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
            const isActive = matchesPath(pathname, section.href, section.matchPaths);
            return (
              <Link
                href={section.href}
                key={section.id}
                className={isActive ? "is-active" : ""}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <span><Icon size={17} /></span>
                <b>{section.label}</b>
                {section.items.length > 0 ? <ChevronDown size={13} /> : null}
              </Link>
            );
          })}
        </nav>

        <button type="button" className="mnx-mona-card" onClick={toggleChat}>
          <span><Sparkles size={16} /></span>
          <span><b>Ask Mona</b><small>Open your workspace assistant</small></span>
          <kbd>⌘M</kbd>
        </button>

        <footer className="mnx-sidebar-user">
          <span>{initials(userName)}</span>
          <div><b>{userName}</b><small>Operations workspace</small></div>
          <button type="button" onClick={() => performLogout()} aria-label="Log out" title="Log out">
            <LogOut size={16} />
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
              <span>{activeLocation.section}</span>
              <i>/</i>
              <b>{activeLocation.page}</b>
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

            <Link className="mnx-topbar-icon" href="/notifications" aria-label="Notifications">
              <Bell size={17} />
              <i />
            </Link>

            <div className="mnx-theme-picker" role="group" aria-label="Dashboard theme">
              {themes.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={theme === item.id ? "is-active" : ""}
                    onClick={() => selectTheme(item.id)}
                    aria-pressed={theme === item.id}
                    title={`${item.label} theme`}
                  >
                    <Icon size={13} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <button type="button" className="mnx-topbar-avatar" aria-label="Open profile menu">
              {initials(userName)}
            </button>
          </div>
        </header>

        <main className="mnx-dashboard-main">
          <div className="mnx-dashboard-content">
            <div className="mnx-route-content" data-route={pathname}>
              {children}
            </div>
          </div>
        </main>
      </div>

      {searchOpen ? (
        <div className="mnx-command-layer" role="presentation" onMouseDown={() => setSearchOpen(false)}>
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
              <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search">
                <X size={16} />
              </button>
            </label>
            <p>QUICK NAVIGATION</p>
            <div>
              {filteredSections.map((section) => {
                const Icon = section.icon;
                return (
                  <Link href={section.href} key={section.id} onClick={() => setSearchOpen(false)}>
                    <span><Icon size={17} /></span>
                    <span><b>{section.label}</b><small>{section.items.length} linked pages</small></span>
                    <Command size={14} />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
