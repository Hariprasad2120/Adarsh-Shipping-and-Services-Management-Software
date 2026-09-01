"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Moon,
  Search,
  Sun,
} from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Caps } from "@/lib/rbac";
import {
  getSearchCommandEntries,
  rankSearchCommandEntries,
} from "@/lib/navigation";
import { getPathLabel, segmentToLabel } from "@/lib/route-labels";
import {
  MonolithAppSidebar,
  MonolithSidebarFrame,
  MonolithSidebarMobileTrigger,
  MonolithSidebarProvider,
} from "@/components/navigation/monolith-app-sidebar";
import { MonolithBreadcrumb } from "@/components/navigation/monolith-breadcrumb";
import { MonolithSearchCommand } from "@/components/navigation/monolith-search-command";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch-button";
import {
  MonaDesktopPet,
  MonaGuidanceOverlay,
  MonaProvider,
  useMonaChat,
} from "@/modules/mona/components";
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

/*
 * Each accent maps to a theme-scoped hue ramp defined in
 * frappe-ui-design-system.css. The values here are `var()` references, not
 * literal colors, so the SAME inline style resolves to the light ramp in light
 * mode and the brighter dark ramp under [data-theme="dark"].
 */
const ACCENT_HUE_STOPS: Record<
  MonolithAccent,
  {
    primary: string;
    hover: string;
    active: string;
    soft: string;
    softBorder: string;
    fg: string;
  }
> = {
  blue: {
    primary: "var(--mn-hue-blue)",
    hover: "var(--mn-hue-blue-hover)",
    active: "var(--mn-hue-blue-active)",
    soft: "var(--mn-hue-blue-soft)",
    softBorder: "var(--mn-hue-blue-soft-border)",
    fg: "var(--mn-hue-blue-fg)",
  },
  green: {
    primary: "var(--mn-hue-green)",
    hover: "var(--mn-hue-green-hover)",
    active: "var(--mn-hue-green-active)",
    soft: "var(--mn-hue-green-soft)",
    softBorder: "var(--mn-hue-green-soft-border)",
    fg: "var(--mn-hue-green-fg)",
  },
  amber: {
    primary: "var(--mn-hue-amber)",
    hover: "var(--mn-hue-amber-hover)",
    active: "var(--mn-hue-amber-active)",
    soft: "var(--mn-hue-amber-soft)",
    softBorder: "var(--mn-hue-amber-soft-border)",
    fg: "var(--mn-hue-amber-fg)",
  },
  violet: {
    primary: "var(--mn-hue-violet)",
    hover: "var(--mn-hue-violet-hover)",
    active: "var(--mn-hue-violet-active)",
    soft: "var(--mn-hue-violet-soft)",
    softBorder: "var(--mn-hue-violet-soft-border)",
    fg: "var(--mn-hue-violet-fg)",
  },
};

/** Writes accent colors as inline styles on <html> so they always win the cascade, regardless of [data-accent] selector specificity fights elsewhere. */
function applyAccentInlineStyles(root: HTMLElement, accent: MonolithAccent) {
  const stops = ACCENT_HUE_STOPS[accent];
  root.style.setProperty("--frappe-primary", stops.primary);
  root.style.setProperty("--frappe-primary-hover", stops.hover);
  root.style.setProperty("--frappe-primary-active", stops.active);
  root.style.setProperty("--frappe-primary-soft", stops.soft);
  root.style.setProperty("--frappe-primary-soft-border", stops.softBorder);
  // --mnx-accent-text / --mnx-accent-contrast (used app-wide for accent-colored
  // text and for text-on-solid-accent-fill) resolve through these two.
  root.style.setProperty("--frappe-primary-strong", stops.active);
  root.style.setProperty("--frappe-primary-foreground", stops.fg);
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
  const canToggle = visibleThemes.some((item) => item.id === "light") &&
    visibleThemes.some((item) => item.id === "dark");
  const nextTheme: MonolithTheme = themeContext.theme === "dark" ? "light" : "dark";

  if (!canToggle) return null;

  return (
    <span className="mnx-theme-toggle-wrap">
      <Switch
        className="mnx-theme-toggle"
        value={themeContext.theme === "dark"}
        onToggle={() => themeContext.selectTheme(nextTheme)}
        iconOn={<Moon size={13} />}
        iconOff={<Sun size={13} />}
        data-theme-state={themeContext.theme}
        aria-label={ariaLabel}
        title={`Switch to ${nextTheme} theme`}
      />
    </span>
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
        "light",
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
        "light",
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
      "light",
      "dark",
    );
    root.classList.add(theme);
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
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
        window.requestAnimationFrame(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        });
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "m") {
        event.preventDefault();
        toggleChat();
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
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
    if (!searchOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [searchOpen]);

  useEffect(() => {
    markRouteChangeStart();
    if (caps["system.dev_console.access"]) recordRouteLoadPing(pathname);
    dispatchMonaPetRoute({ contextLabel, pathname });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only fire on pathname change
  }, [pathname]);

  return (
    <MonolithSidebarProvider
      className="mnx-dashboard-shell"
      data-theme={theme}
    >
      <MonolithAppSidebar
        caps={caps}
        enabledFeatureIds={enabledFeatureIds}
        enabledModuleIds={enabledModuleIds}
        isPlatformAdmin={isPlatformAdmin}
        userEmail={userEmail}
        userId={userId}
        userName={userName}
      />

      <MonolithSidebarFrame className="mnx-dashboard-frame">
        <header className="mnx-topbar">
          <div className="mnx-topbar-context">
            <MonolithSidebarMobileTrigger className="mnx-mobile-menu" />
            <MonolithBreadcrumb pathname={pathname} />
          </div>

          <div className="mnx-global-search-wrap" ref={searchRef}>
            <label className="mnx-global-search" data-workpet-target="topbar-global-search">
              <Search size={15} />
              {/* eslint-disable-next-line no-restricted-syntax -- global command trigger is a compact shell-owned search input, not a form field. */}
              <input
                ref={searchInputRef}
                value={query}
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => {
                  setSearchOpen(true);
                  setQuery(event.target.value);
                }}
                placeholder="Search workspaces..."
              />
              <kbd>Ctrl K</kbd>
            </label>

            {searchOpen ? (
              <MonolithSearchCommand
                embedded
                entries={filteredSearchEntries}
                open={searchOpen}
                query={query}
                onClose={() => setSearchOpen(false)}
                onOpenChange={setSearchOpen}
                onQueryChange={setQuery}
              />
            ) : null}
          </div>

          <div className="mnx-topbar-actions">
            <Button
              className="mnx-global-search mnx-global-search--legacy"
              data-workpet-target="topbar-global-search"
              onClick={() => setSearchOpen(true)}
              variant="ghost"
            >
              <Search size={15} />
              <span>Search workspaces…</span>
              <kbd>⌘ K</kbd>
            </Button>

            <Link
              className="mnx-topbar-icon"
              href="/notifications"
              aria-label="Notifications"
            >
              <Bell size={17} />
              <i />
            </Link>

            <MonolithThemePicker />

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
      </MonolithSidebarFrame>

    </MonolithSidebarProvider>
  );
}
