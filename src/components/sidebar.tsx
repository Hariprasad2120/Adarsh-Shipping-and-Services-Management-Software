"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { performLogout } from "@/lib/logout";
import { useMemo, useState, useEffect, useRef } from "react";
import type { Caps } from "@/lib/rbac";
import { useDashboardChrome } from "@/components/dashboard-chrome";
import { cn } from "@/lib/utils";
import { getActiveItemHref, getVisibleSections, matchesPath } from "@/lib/navigation";
import {
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";

type ThemeMode = "light" | "dark";

function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
  root.style.colorScheme = theme;
  window.localStorage.setItem("theme", theme);
}

function detectTheme(): ThemeMode {
  if (typeof document === "undefined") return "light";
  const root = document.documentElement;
  if (root.classList.contains("dark")) return "dark";
  if (root.classList.contains("light")) return "light";
  return "light";
}

function getIconColor(label: string, isActive: boolean) {
  if (isActive) return "text-[#00c4b6]";
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes("dashboard")) return "text-[#00c4b6]";
  if (lowerLabel.includes("catalogue") || lowerLabel.includes("catalog")) return "text-[#00cec4]";
  if (lowerLabel.includes("hrms")) return "text-[#818cf8]";
  if (lowerLabel.includes("attendance")) return "text-[#fbbf24]";
  if (lowerLabel.includes("to-do") || lowerLabel.includes("todo") || lowerLabel.includes("task")) return "text-[#22c55e]";
  if (lowerLabel.includes("ams")) return "text-[#c084fc]";
  if (lowerLabel.includes("admin")) return "text-[#8b5cf6]";
  if (lowerLabel.includes("employee")) return "text-[#60a5fa]";
  if (lowerLabel.includes("onboard")) return "text-[#22d3ee]";
  if (lowerLabel.includes("structure")) return "text-[#94a3b8]";
  if (lowerLabel.includes("roles")) return "text-[#60a5fa]";
  if (lowerLabel.includes("appraisals") || lowerLabel.includes("my-appraisal")) return "text-[#c084fc]";
  if (lowerLabel.includes("reviews")) return "text-[#f472b6]";
  if (lowerLabel.includes("cycles")) return "text-[#38bdf8]";
  if (lowerLabel.includes("criteria")) return "text-[#fb923c]";
  if (lowerLabel.includes("salary structure") || lowerLabel.includes("salary sheet") || lowerLabel.includes("revisions")) return "text-[#34d399]";
  if (lowerLabel.includes("punch")) return "text-[#fbbf24]";
  if (lowerLabel.includes("leaves")) return "text-[#fb923c]";
  if (lowerLabel.includes("reports") || lowerLabel.includes("kpi")) return "text-[#34d399]";
  if (lowerLabel.includes("crm") || lowerLabel.includes("overview")) return "text-[#34d399]";
  if (lowerLabel.includes("communication")) return "text-[#38bdf8]";
  if (lowerLabel.includes("expense")) return "text-[#fbbf24]";
  if (lowerLabel.includes("settings")) return "text-[#f59e0b]";
  if (lowerLabel.includes("simulation")) return "text-[#ec4899]";
  if (lowerLabel.includes("notifications")) return "text-[#8b5cf6]";
  return "text-slate-400";
}

const CRM_GROUP_MAPPING: Record<string, string> = {
  Dashboard: "Sales",
  Leads: "Sales",
  Contacts: "Sales",
  Accounts: "Sales",
  "Deals Pipeline": "Sales",
  Forecasts: "Sales",
  Documents: "Sales",
  Campaigns: "Sales",
  Tasks: "Activities",
  Events: "Activities",
  Calls: "Activities",
  "Products & Services": "Inventory",
  "Price Books": "Inventory",
  Quotes: "Inventory",
  Vendors: "Inventory",
  "Support Cases": "Support",
  Solutions: "Support",
  "Sales Inbox": "Integrations",
  "Social Log": "Integrations",
  Visits: "Integrations",
  "Lead Sources": "Integrations",
  Services: "Services & Projects",
  Projects: "Services & Projects",
  "Feedback (VoC)": "Services & Projects",
};

const CRM_GROUP_ORDER = ["Sales", "Activities", "Inventory", "Support", "Integrations", "Services & Projects"];

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("disabled"));
}

export function Sidebar({
  caps,
  userName,
  enabledModuleIds,
}: {
  caps: Caps;
  userName: string;
  enabledModuleIds?: Iterable<string>;
}) {
  const pathname = usePathname();
  const { closeMobileNav, isDesktop, mobileNavId, mobileNavOpen } = useDashboardChrome();
  const visibleSections = useMemo(
    () => getVisibleSections(caps, enabledModuleIds),
    [caps, enabledModuleIds],
  );
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, maxHeight: 400 });
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileDrawerRef = useRef<HTMLElement | null>(null);

  const activeSectionId =
    visibleSections.find((section) => matchesPath(pathname, section.href, section.matchPaths))?.id ??
    visibleSections[0]?.id ??
    "dashboard";

  const [crmExpandedGroups, setCrmExpandedGroups] = useState<Record<string, boolean>>({
    Sales: true,
    Activities: false,
    Inventory: false,
    Support: false,
    Integrations: false,
    "Services & Projects": false,
  });

  const toggleCrmGroup = (group: string) => {
    setCrmExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const activeCrmItem = visibleSections
    .find((s) => s.id === "crm")
    ?.items.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setMounted(true);
      const saved = localStorage.getItem("sidebar-collapsed");
      if (saved === "true") setIsCollapsed(true);
      setTheme(detectTheme());
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("sidebar-collapsed", String(isCollapsed));
    document.documentElement.setAttribute("data-sidebar-collapsed", String(isCollapsed));
  }, [isCollapsed, mounted]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const activeSection = visibleSections.find((s) => matchesPath(pathname, s.href, s.matchPaths));
    if (activeSection && activeSection.items.length > 0) {
      const frameId = window.requestAnimationFrame(() => {
        setExpandedSections((prev) => ({ ...prev, [activeSection.id]: true }));
      });

      return () => window.cancelAnimationFrame(frameId);
    }
  }, [pathname, visibleSections]);

  useEffect(() => {
    const activeGroup = activeCrmItem ? CRM_GROUP_MAPPING[activeCrmItem.label] : undefined;
    if (!activeGroup) return;

    const frameId = window.requestAnimationFrame(() => {
      setCrmExpandedGroups((prev) => (prev[activeGroup] ? prev : { ...prev, [activeGroup]: true }));
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeCrmItem]);

  useEffect(() => {
    if (isDesktop || !mobileNavOpen) return;
    const drawer = mobileDrawerRef.current;
    if (!drawer) return;

    const focusables = getFocusableElements(drawer);
    (focusables[0] ?? drawer).focus();

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;

      const currentFocusables = getFocusableElements(drawer);
      if (currentFocusables.length === 0) {
        event.preventDefault();
        drawer.focus();
        return;
      }

      const first = currentFocusables[0];
      const last = currentFocusables[currentFocusables.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    drawer.addEventListener("keydown", handleTabKey);
    return () => drawer.removeEventListener("keydown", handleTabKey);
  }, [isDesktop, mobileNavOpen]);

  const setDashboardTheme = (nextTheme: ThemeMode) => {
    applyTheme(nextTheme);
    setTheme(nextTheme);
  };

  const toggleTheme = () => {
    setDashboardTheme(theme === "dark" ? "light" : "dark");
  };

  const handleIconEnter = (sectionId: string, e: React.MouseEvent<HTMLElement>) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    const maxH = Math.min(480, window.innerHeight - rect.top - 16);
    setFlyoutPos({ top: rect.top, maxHeight: maxH });
    setHoveredSectionId(sectionId);
  };

  const handleIconLeave = () => {
    hoverTimerRef.current = setTimeout(() => setHoveredSectionId(null), 150);
  };

  const handleFlyoutEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  };

  const handleFlyoutLeave = () => {
    hoverTimerRef.current = setTimeout(() => setHoveredSectionId(null), 150);
  };

  const hoveredSection = hoveredSectionId
    ? visibleSections.find((s) => s.id === hoveredSectionId) ?? null
    : null;

  const renderSidebarContent = ({ mobile }: { mobile: boolean }) => {
    const collapsed = !mobile && isCollapsed;
    const shouldUseHoverFlyout = collapsed && !mobile;
    const handleNavigation = () => {
      setHoveredSectionId(null);
      if (mobile) {
        closeMobileNav();
      }
    };

    return (
      <>
        <div className="relative flex h-[68px] shrink-0 items-center overflow-hidden border-b border-outline-variant/30 px-4">
          {mobile ? (
            <>
              <Image
                src="/Logo.png"
                alt="Adarsh Shipping & Services"
                width={160}
                height={48}
                priority
                className="h-auto max-w-40 object-contain"
              />
              <button
                type="button"
                onClick={closeMobileNav}
                className="ml-auto inline-flex size-11 items-center justify-center rounded-xl border border-outline-variant/60 bg-surface text-on-surface transition-colors hover:bg-surface-container-low"
                aria-label="Close navigation menu"
              >
                <X className="size-5 text-[#00cec4]" />
              </button>
            </>
          ) : (
            <>
              <Image
                src="/logo alone.png"
                alt="Logo"
                width={56}
                height={56}
                className={cn(
                  "absolute inset-0 m-auto object-contain transition-opacity duration-300 ease-in-out",
                  isCollapsed ? "opacity-100" : "pointer-events-none opacity-0",
                )}
                style={{ width: 52, height: 52 }}
              />
              <Image
                src="/Logo.png"
                alt="Adarsh Shipping & Services"
                width={160}
                height={48}
                priority
                className={cn(
                  "absolute left-5 top-1/2 h-auto max-w-40 -translate-y-1/2 object-contain transition-opacity duration-300 ease-in-out",
                  isCollapsed ? "pointer-events-none opacity-0" : "opacity-100",
                )}
              />
            </>
          )}
        </div>

        <div className="flex w-full flex-1 flex-col gap-0 overflow-y-auto py-2 scrollbar-none [&::-webkit-scrollbar]:hidden">
          {visibleSections.map((section) => {
            const isActive = section.id === activeSectionId;
            const Icon = section.icon;
            const activeChildHref = getActiveItemHref(pathname, section.items);
            const isExpanded = !!expandedSections[section.id];

            const rowBase = cn(
              "group flex w-full items-center border-l-2 py-2.5 pl-[19px] pr-3 transition-colors duration-200",
              isActive
                ? "border-primary bg-primary/10 text-primary"
                : "border-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
            );

            const iconClass = cn(
              "shrink-0 transition-transform duration-200",
              isActive ? "scale-105 text-[#00c4b6]" : `${getIconColor(section.label, false)} group-hover:scale-105`,
            );

            const labelClass = mobile
              ? "flex flex-1 items-center justify-between"
              : cn(
                  "overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-in-out",
                  collapsed ? "max-w-0 opacity-0" : "max-w-52 opacity-100",
                );

            return (
              <div key={section.id} className="space-y-0.5">
                {section.items.length === 0 ? (
                  <Link
                    href={section.href}
                    onClick={handleNavigation}
                    onMouseEnter={shouldUseHoverFlyout ? (e) => handleIconEnter(section.id, e) : undefined}
                    onMouseLeave={shouldUseHoverFlyout ? handleIconLeave : undefined}
                    className={rowBase}
                  >
                    <Icon size={18} className={iconClass} />
                    <div className={labelClass}>
                      <span className="ml-3 truncate text-[12px] font-medium tracking-wide">{section.label}</span>
                    </div>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onMouseEnter={shouldUseHoverFlyout ? (e) => handleIconEnter(section.id, e) : undefined}
                    onMouseLeave={shouldUseHoverFlyout ? handleIconLeave : undefined}
                    onClick={() => {
                      if (!collapsed) toggleSection(section.id);
                    }}
                    className={rowBase}
                    aria-expanded={isExpanded}
                  >
                    <Icon size={18} className={iconClass} />
                    <div className={cn(labelClass, !mobile && "flex flex-1 items-center justify-between")}>
                      <span className="ml-3 truncate text-[12px] font-medium tracking-wide">{section.label}</span>
                      {isExpanded ? (
                        <ChevronDown size={14} className="mr-0 shrink-0 opacity-50" />
                      ) : (
                        <ChevronRight size={14} className="mr-0 shrink-0 opacity-50" />
                      )}
                    </div>
                  </button>
                )}

                {!collapsed && isExpanded && section.id === "crm" ? (
                  <div className="space-y-1">
                    {CRM_GROUP_ORDER.map((groupTitle) => {
                      const groupItems = section.items.filter(
                        (item) => (CRM_GROUP_MAPPING[item.label] || "Sales") === groupTitle,
                      );
                      if (groupItems.length === 0) return null;
                      const isGroupExpanded = !!crmExpandedGroups[groupTitle];
                      const hasActiveChild = groupItems.some((item) => activeChildHref === item.href);

                      return (
                        <div key={groupTitle} className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => toggleCrmGroup(groupTitle)}
                            className={cn(
                              "flex w-full cursor-pointer items-center justify-between px-2 py-1 text-[10px] font-bold tracking-wide transition-colors",
                              hasActiveChild
                                ? "text-primary"
                                : "text-on-surface-variant hover:text-on-surface",
                            )}
                          >
                            <span>{groupTitle}</span>
                            {isGroupExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                          </button>

                          {isGroupExpanded && (
                            <div className="space-y-0">
                              {groupItems.map((item) => {
                                const ItemIcon = item.icon;
                                const isChildActive = activeChildHref === item.href;
                                return (
                                  <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={handleNavigation}
                                    className={cn(
                                      "group relative flex items-center border-l-2 py-1.5 pl-10 pr-3 text-[12px] transition-all duration-200",
                                      isChildActive
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                                    )}
                                  >
                                    <ItemIcon
                                      size={13}
                                      className={cn(
                                        "mr-2 shrink-0",
                                        isChildActive ? "text-[#00c4b6]" : getIconColor(item.label, false),
                                      )}
                                    />
                                    <span className="truncate font-medium tracking-wide">{item.label}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  !collapsed &&
                  isExpanded &&
                  section.items.length > 0 && (
                    <div className="space-y-0">
                      {section.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isChildActive = activeChildHref === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={handleNavigation}
                            className={cn(
                              "group relative flex items-center border-l-2 py-2 pl-10 pr-3 text-[12px] transition-all duration-200",
                              isChildActive
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                            )}
                          >
                            <ItemIcon
                              size={14}
                              className={cn(
                                "mr-2.5 shrink-0",
                                isChildActive ? "text-[#00c4b6]" : getIconColor(item.label, false),
                              )}
                            />
                            <span className="font-medium tracking-wide">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center overflow-hidden border-t border-outline-variant/50 bg-surface-container-low px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00c4b6] text-sm font-bold text-white">
            {userName ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "SA"}
          </div>
          <div
            className={cn(
              "ml-2.5 flex min-w-0 flex-1 flex-col overflow-hidden transition-[max-width,opacity] duration-300 ease-in-out",
              collapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100",
            )}
          >
            <span className="truncate whitespace-nowrap text-[13px] font-bold leading-none text-on-surface">
              {userName || "Site Admin"}
            </span>
            <span className="mt-1 inline-block w-fit whitespace-nowrap rounded bg-[#fef3c7] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#d97706]">
              Admin
            </span>
          </div>
          <div
            className={cn(
              "flex shrink-0 items-center gap-1 overflow-hidden transition-[max-width,opacity] duration-300 ease-in-out",
              collapsed ? "max-w-0 opacity-0" : "max-w-16 opacity-100",
            )}
          >
            <button
              type="button"
              onClick={toggleTheme}
              className="cursor-pointer rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
              title={!mounted ? "Switch Theme" : theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            >
              {!mounted ? <div className="h-4 w-4" /> : theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              type="button"
              onClick={() => void performLogout()}
              className="cursor-pointer rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-outline-variant/50 bg-surface text-on-surface shadow-[0_12px_36px_-28px_rgba(15,23,42,0.28)] select-none transition-all duration-300 dark:shadow-[0_18px_42px_-30px_rgba(0,0,0,0.48)] lg:flex",
          isCollapsed ? "w-14" : "w-57.5",
        )}
      >
        {renderSidebarContent({ mobile: false })}
      </aside>

      <button
        type="button"
        onClick={() => setIsCollapsed((value) => !value)}
        className="fixed z-50 hidden h-8 w-4 items-center justify-center rounded-r-lg border border-l-0 border-outline-variant/50 bg-surface text-on-surface-variant shadow-sm transition-[left] duration-300 hover:text-on-surface lg:flex"
        style={{ left: isCollapsed ? "3.5rem" : "14.375rem", top: "5.5rem" }}
        title={isCollapsed ? "Expand" : "Collapse"}
      >
        {isCollapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </button>

      {isCollapsed && hoveredSection && (
        <div
          className="fixed z-50 ml-1 hidden min-w-45 rounded-xl border border-outline-variant/50 bg-surface shadow-[0_8px_32px_-8px_rgba(0,0,0,0.32)] dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.64)] lg:block"
          style={{ left: "3.5rem", top: flyoutPos.top }}
          onMouseEnter={handleFlyoutEnter}
          onMouseLeave={handleFlyoutLeave}
        >
          {hoveredSection.items.length === 0 ? (
            <Link
              href={hoveredSection.href}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12px] font-medium text-on-surface transition-colors hover:bg-surface-container"
            >
              {(() => {
                const Icon = hoveredSection.icon;
                return <Icon size={13} className={getIconColor(hoveredSection.label, hoveredSection.id === activeSectionId)} />;
              })()}
              {hoveredSection.label}
            </Link>
          ) : hoveredSection.id === "crm" ? (
            <div
              className="overflow-y-auto py-1 scrollbar-none [&::-webkit-scrollbar]:hidden"
              style={{ maxHeight: `${flyoutPos.maxHeight}px` }}
            >
              {CRM_GROUP_ORDER.map((groupTitle) => {
                const groupItems = hoveredSection.items.filter(
                  (item) => (CRM_GROUP_MAPPING[item.label] || "Sales") === groupTitle,
                );
                if (groupItems.length === 0) return null;
                const activeChildHref = getActiveItemHref(pathname, hoveredSection.items);
                return (
                  <div key={groupTitle}>
                    <div className="px-3 pb-0.5 pt-2 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                      {groupTitle}
                    </div>
                    {groupItems.map((item) => {
                      const ItemIcon = item.icon;
                      const isChildActive = activeChildHref === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 text-[12px] transition-colors",
                            isChildActive
                              ? "bg-primary/10 text-primary"
                              : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                          )}
                        >
                          <ItemIcon
                            size={12}
                            className={isChildActive ? "text-[#00c4b6]" : getIconColor(item.label, false)}
                          />
                          <span className="truncate font-medium">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="overflow-y-auto py-1 scrollbar-none [&::-webkit-scrollbar]:hidden"
              style={{ maxHeight: `${flyoutPos.maxHeight}px` }}
            >
              {hoveredSection.items.map((item) => {
                const ItemIcon = item.icon;
                const activeChildHref = getActiveItemHref(pathname, hoveredSection.items);
                const isChildActive = activeChildHref === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 text-[12px] transition-colors",
                      isChildActive
                        ? "bg-primary/10 text-primary"
                        : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                    )}
                  >
                    <ItemIcon
                      size={13}
                      className={isChildActive ? "text-[#00c4b6]" : getIconColor(item.label, false)}
                    />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/45 transition-opacity duration-200 lg:hidden",
          mobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeMobileNav}
        aria-hidden="true"
      />

      <aside
        id={mobileNavId}
        ref={mobileDrawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Primary navigation"
        aria-hidden={!mobileNavOpen}
        tabIndex={-1}
        className={cn(
          "fixed inset-y-2 left-2 z-[60] flex w-[min(22rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface text-on-surface shadow-2xl transition-transform duration-200 ease-out lg:hidden",
          mobileNavOpen ? "translate-x-0" : "-translate-x-[calc(100%+1rem)]",
        )}
      >
        {renderSidebarContent({ mobile: true })}
      </aside>
    </>
  );
}
