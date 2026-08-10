"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Moon, Sparkles, Sun } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Caps } from "@/lib/rbac";
import { getVisibleSections } from "@/lib/navigation";
import { getPathLabel, segmentToLabel } from "@/lib/route-labels";
import { MonolithReferenceSidebar } from "@/components/navigation/monolith-reference-sidebar";
import { MonaProvider, useMonaChat } from "@/modules/mona/components";
import { DevConsoleErrorBoundary } from "@/components/dev-console/dev-console-error-boundary";

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
  orgName: string;
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

function applyAccentInlineStyles(root: HTMLElement, accent: MonolithAccent) {
  const stops = ACCENT_HUE_STOPS[accent];
  root.style.setProperty("--frappe-primary", stops.primary);
  root.style.setProperty("--frappe-primary-hover", stops.hover);
  root.style.setProperty("--frappe-primary-active", stops.active);
  root.style.setProperty("--frappe-primary-soft", stops.softLight);
  root.style.setProperty("--frappe-primary-soft-border", stops.softBorderLight);
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
      <MonaChat />
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
  orgName,
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

  const { accent, selectAccent, selectTheme, theme } = themeContext;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const visibleSections = useMemo(
    () => getVisibleSections(caps, enabledModuleIds, enabledFeatureIds),
    [caps, enabledFeatureIds, enabledModuleIds],
  );

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "m") {
        event.preventDefault();
        toggleChat();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setSidebarCollapsed((current) => !current);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") {
        event.preventDefault();
        selectTheme(theme === "light" ? "dark" : "light");
      }
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [selectTheme, theme, toggleChat]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setSidebarCollapsed(window.localStorage.getItem("monolith.sidebar.collapsed") === "true");
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("monolith.sidebar.collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div className="mnx-dashboard-shell" data-theme={theme}>
      <MonolithReferenceSidebar
        caps={caps}
        currentTheme={theme}
        isCollapsed={sidebarCollapsed}
        isPlatformAdmin={isPlatformAdmin}
        onToggleAccent={() => selectAccent(accent === "blue" ? "violet" : "blue")}
        onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
        onToggleTheme={() => selectTheme(theme === "light" ? "dark" : "light")}
        orgName={orgName}
        pathname={pathname}
        userEmail={userEmail}
        userId={userId}
        userName={userName}
        visibleSections={visibleSections}
      />

      <div className="mnx-dashboard-frame">
        <header className="mnx-topbar">
          <div className="mnx-topbar-context">
            <div>
              <span>Monolith</span>
              <i>/</i>
              <b>{contextLabel}</b>
            </div>
          </div>

          <div className="mnx-topbar-actions">
            <Link className="mnx-topbar-icon" href="/notifications" aria-label="Notifications">
              <Bell size={17} />
            </Link>

            <button type="button" className="mnx-topbar-icon" onClick={toggleChat} aria-label="Ask Mona">
              <Sparkles size={16} />
            </button>
          </div>
        </header>

        <main className="mnx-dashboard-main">
          {caps["system.dev_console.access"] ? (
            <DevConsoleErrorBoundary>{children}</DevConsoleErrorBoundary>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
