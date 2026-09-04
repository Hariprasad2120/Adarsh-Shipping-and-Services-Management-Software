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
import { MonolithAppSidebar } from "@/components/navigation/monolith-app-sidebar";
import { MonolithSearchCommand } from "@/components/navigation/monolith-search-command";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
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

export const monolithAccentThemes: {
  id: MonolithAccent;
  label: string;
}[] = [
  { id: "blue", label: "Blue" },
  { id: "green", label: "Green" },
  { id: "amber", label: "Amber" },
  { id: "violet", label: "Violet" },
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

  return (
    <div className="mnx-theme-picker" role="group" aria-label={ariaLabel}>
      {visibleThemes.map((item) => {
        const Icon = item.icon;
        return (
          // eslint-disable-next-line no-restricted-syntax -- custom segmented theme toggle group remains a shell-specific control.
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
        // eslint-disable-next-line no-restricted-syntax -- custom segmented accent toggle group remains a shell-specific control.
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
  const isMobile = useIsMobile();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
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
    markRouteChangeStart();
    if (caps["system.dev_console.access"]) recordRouteLoadPing(pathname);
    dispatchMonaPetRoute({ contextLabel, pathname });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only fire on pathname change
  }, [pathname]);

  return (
    <SidebarProvider
      defaultOpen={false}
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

      <SidebarInset className="mnx-dashboard-frame">
        <header className="mnx-topbar">
          <div className="mnx-topbar-context">
            {isMobile ? <SidebarTrigger className="mnx-mobile-menu" /> : null}
            <div>
              <span>Monolith</span>
              <i>/</i>
              <b>{contextLabel}</b>
            </div>
          </div>

          <div className="mnx-topbar-actions">
            <Button
              className="mnx-global-search"
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
      </SidebarInset>

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
    </SidebarProvider>
  );
}
