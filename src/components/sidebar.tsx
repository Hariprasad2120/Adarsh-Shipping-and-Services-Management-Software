"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useMemo, useState, useEffect, useRef } from "react";
import type { Caps } from "@/lib/rbac";
import { getActiveItemHref, getVisibleSections, matchesPath } from "@/lib/navigation";
import { Sun, Moon, LogOut, ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";

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
  if (lowerLabel.includes("settings")) return "text-[#f59e0b]";
  if (lowerLabel.includes("simulation")) return "text-[#ec4899]";
  if (lowerLabel.includes("notifications")) return "text-[#8b5cf6]";
  return "text-slate-400";
}

const CRM_GROUP_MAPPING: Record<string, string> = {
  "Dashboard": "Sales",
  "Leads": "Sales",
  "Contacts": "Sales",
  "Accounts": "Sales",
  "Deals Pipeline": "Sales",
  "Forecasts": "Sales",
  "Documents": "Sales",
  "Campaigns": "Sales",
  "Tasks": "Activities",
  "Events": "Activities",
  "Calls": "Activities",
  "Products & Services": "Inventory",
  "Price Books": "Inventory",
  "Quotes": "Inventory",
  "Sales Orders": "Inventory",
  "Purchase Orders": "Inventory",
  "Invoices & Sales": "Inventory",
  "Vendors": "Inventory",
  "Support Cases": "Support",
  "Solutions": "Support",
  "Sales Inbox": "Integrations",
  "Social Log": "Integrations",
  "Visits": "Integrations",
  "Lead Sources": "Integrations",
  "Services": "Services & Projects",
  "Projects": "Services & Projects",
  "Feedback (VoC)": "Services & Projects",
};

const CRM_GROUP_ORDER = ["Sales", "Activities", "Inventory", "Support", "Integrations", "Services & Projects"];

export function Sidebar({ caps, userName }: { caps: Caps; userName: string }) {
  const pathname = usePathname();
  const visibleSections = useMemo(() => getVisibleSections(caps), [caps]);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredSectionId, setHoveredSectionId] = useState<string | null>(null);
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, maxHeight: 400 });
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const effectiveCrmExpandedGroups = useMemo(() => {
    const group = activeCrmItem ? CRM_GROUP_MAPPING[activeCrmItem.label] : undefined;
    if (!group || crmExpandedGroups[group]) return crmExpandedGroups;
    return { ...crmExpandedGroups, [group]: true };
  }, [activeCrmItem, crmExpandedGroups]);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setIsCollapsed(true);
    setTheme(detectTheme());
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
      setExpandedSections((prev) => ({ ...prev, [activeSection.id]: true }));
    }
  }, [pathname, visibleSections]);

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

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-outline-variant/50 bg-surface text-on-surface shadow-[0_12px_36px_-28px_rgba(15,23,42,0.28)] select-none transition-all duration-300 dark:shadow-[0_18px_42px_-30px_rgba(0,0,0,0.48)] ${
          isCollapsed ? "w-14" : "w-57.5"
        }`}
      >
        {/* Logo — fixed-height container, both images absolutely positioned so height never shifts */}
        <div className="relative flex h-[68px] shrink-0 border-b border-outline-variant/30 overflow-hidden">
          {/* Collapsed logomark — centered, fills sidebar width */}
          <Image
            src="/logo alone.png"
            alt="Logo"
            width={56}
            height={56}
            className={`absolute inset-0 m-auto object-contain transition-opacity duration-300 ease-in-out ${
              isCollapsed ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            style={{ width: 52, height: 52 }}
          />
          {/* Full logo — left aligned */}
          <Image
            src="/Logo.png"
            alt="Adarsh Shipping & Services"
            width={160}
            height={48}
            className={`absolute left-5 top-1/2 -translate-y-1/2 h-auto max-w-40 object-contain transition-opacity duration-300 ease-in-out ${
              isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          />
        </div>

        {/* Nav */}
        <div className="flex w-full flex-1 flex-col gap-0 overflow-y-auto py-2 scrollbar-none [&::-webkit-scrollbar]:hidden">
          {visibleSections.map((section) => {
            const isActive = section.id === activeSectionId;
            const Icon = section.icon;
            const activeChildHref = getActiveItemHref(pathname, section.items);
            const isExpanded = !!expandedSections[section.id];

            const rowBase = `group flex w-full items-center pl-[19px] pr-3 py-2.5 border-l-2 transition-colors duration-200 ${
              isActive
                ? "bg-primary/10 text-primary border-primary"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface border-transparent"
            }`;

            const iconClass = `shrink-0 transition-transform duration-200 ${
              isActive ? "scale-105 text-[#00c4b6]" : `${getIconColor(section.label, false)} group-hover:scale-105`
            }`;

            // Label container — slides in/out on X axis, no icon movement
            const labelClass = `overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-in-out ${
              isCollapsed ? "max-w-0 opacity-0" : "max-w-52 opacity-100"
            }`;

            return (
              <div key={section.id} className="space-y-0.5">
                {section.items.length === 0 ? (
                  <Link
                    href={section.href}
                    onMouseEnter={isCollapsed ? (e) => handleIconEnter(section.id, e) : undefined}
                    onMouseLeave={isCollapsed ? handleIconLeave : undefined}
                    className={rowBase}
                  >
                    <Icon size={18} className={iconClass} />
                    <div className={labelClass}>
                      <span className="ml-3 text-[12px] font-medium tracking-wide">{section.label}</span>
                    </div>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onMouseEnter={isCollapsed ? (e) => handleIconEnter(section.id, e) : undefined}
                    onMouseLeave={isCollapsed ? handleIconLeave : undefined}
                    onClick={() => { if (!isCollapsed) toggleSection(section.id); }}
                    className={rowBase}
                  >
                    <Icon size={18} className={iconClass} />
                    <div className={`${labelClass} flex flex-1 items-center justify-between`}>
                      <span className="ml-3 text-[12px] font-medium tracking-wide">{section.label}</span>
                      {isExpanded ? (
                        <ChevronDown size={14} className="shrink-0 opacity-50 mr-0" />
                      ) : (
                        <ChevronRight size={14} className="shrink-0 opacity-50 mr-0" />
                      )}
                    </div>
                  </button>
                )}

                {/* Sub-items — only shown when expanded and not collapsed */}
                {!isCollapsed && isExpanded && section.id === "crm" ? (
                  <div className="space-y-1">
                    {CRM_GROUP_ORDER.map((groupTitle) => {
                      const groupItems = section.items.filter(
                        (item) => (CRM_GROUP_MAPPING[item.label] || "Sales") === groupTitle
                      );
                      if (groupItems.length === 0) return null;
                      const isGroupExpanded = !!effectiveCrmExpandedGroups[groupTitle];
                      const hasActiveChild = groupItems.some((item) => activeChildHref === item.href);

                      return (
                        <div key={groupTitle} className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => toggleCrmGroup(groupTitle)}
                            className={`flex w-full items-center justify-between px-2 py-1 text-[10px] font-bold tracking-wide transition-colors cursor-pointer ${
                              hasActiveChild ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
                            }`}
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
                                    className={`group relative flex items-center pl-10 pr-3 py-1.5 text-[12px] transition-all duration-200 ${
                                      isChildActive
                                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                                        : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface border-l-2 border-transparent"
                                    }`}
                                  >
                                    <ItemIcon
                                      size={13}
                                      className={`shrink-0 mr-2 ${isChildActive ? "text-[#00c4b6]" : getIconColor(item.label, false)}`}
                                    />
                                    <span className="font-medium tracking-wide truncate">{item.label}</span>
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
                  !isCollapsed && isExpanded && section.items.length > 0 && (
                    <div className="space-y-0">
                      {section.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isChildActive = activeChildHref === item.href;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`group relative flex items-center pl-10 pr-3 py-2 text-[12px] transition-all duration-200 ${
                              isChildActive
                                ? "bg-primary/10 text-primary border-l-2 border-primary"
                                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface border-l-2 border-transparent"
                            }`}
                          >
                            <ItemIcon
                              size={14}
                              className={`shrink-0 mr-2.5 ${isChildActive ? "text-[#00c4b6]" : getIconColor(item.label, false)}`}
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

        {/* Footer — unified, label fades with same max-width transition */}
        <div className="flex shrink-0 items-center border-t border-outline-variant/50 bg-surface-container-low px-3 py-3 overflow-hidden">
          <div className="h-9 w-9 shrink-0 bg-[#00c4b6] text-white flex items-center justify-center font-bold text-sm rounded-full">
            {userName ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "SA"}
          </div>
          <div className={`ml-2.5 flex min-w-0 flex-1 flex-col overflow-hidden transition-[max-width,opacity] duration-300 ease-in-out ${isCollapsed ? "max-w-0 opacity-0" : "max-w-40 opacity-100"}`}>
            <span className="truncate text-[13px] font-bold text-on-surface leading-none whitespace-nowrap">{userName || "Site Admin"}</span>
            <span className="mt-1 inline-block bg-[#fef3c7] text-[#d97706] text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap w-fit">
              Admin
            </span>
          </div>
          <div className={`flex items-center gap-1 shrink-0 overflow-hidden transition-[max-width,opacity] duration-300 ease-in-out ${isCollapsed ? "max-w-0 opacity-0" : "max-w-16 opacity-100"}`}>
            <button
              type="button"
              onClick={toggleTheme}
              className="cursor-pointer rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
              title={!mounted ? "Switch Theme" : theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            >
              {!mounted ? <div className="w-4 h-4" /> : theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="cursor-pointer rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Bookmark toggle tab — fixed at right edge of sidebar, moves only horizontally */}
      <button
        type="button"
        onClick={() => setIsCollapsed((v) => !v)}
        className="fixed z-50 flex h-8 w-4 items-center justify-center rounded-r-lg border border-l-0 border-outline-variant/50 bg-surface text-on-surface-variant shadow-sm transition-[left] duration-300 hover:text-on-surface"
        style={{ left: isCollapsed ? "3.5rem" : "14.375rem", top: "5.5rem" }}
        title={isCollapsed ? "Expand" : "Collapse"}
      >
        {isCollapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
      </button>

      {/* Flyout panel — renders to the right of collapsed sidebar on icon hover */}
      {isCollapsed && hoveredSection && (
        <div
          className="fixed z-50 ml-1 min-w-45 rounded-xl border border-outline-variant/50 bg-surface shadow-[0_8px_32px_-8px_rgba(0,0,0,0.32)] dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.64)]"
          style={{ left: "3.5rem", top: flyoutPos.top }}
          onMouseEnter={handleFlyoutEnter}
          onMouseLeave={handleFlyoutLeave}
        >
          {hoveredSection.items.length === 0 ? (
            <Link
              href={hoveredSection.href}
              className="flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-on-surface transition-colors hover:bg-surface-container rounded-xl"
            >
              {(() => { const Icon = hoveredSection.icon; return <Icon size={13} className={getIconColor(hoveredSection.label, hoveredSection.id === activeSectionId)} />; })()}
              {hoveredSection.label}
            </Link>
          ) : hoveredSection.id === "crm" ? (
            <div
              className="overflow-y-auto py-1 scrollbar-none [&::-webkit-scrollbar]:hidden"
              style={{ maxHeight: `${flyoutPos.maxHeight}px` }}
            >
              {CRM_GROUP_ORDER.map((groupTitle) => {
                const groupItems = hoveredSection.items.filter(
                  (item) => (CRM_GROUP_MAPPING[item.label] || "Sales") === groupTitle
                );
                if (groupItems.length === 0) return null;
                const activeChildHref = getActiveItemHref(pathname, hoveredSection.items);
                return (
                  <div key={groupTitle}>
                    <div className="px-3 pt-2 pb-0.5 text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                      {groupTitle}
                    </div>
                    {groupItems.map((item) => {
                      const ItemIcon = item.icon;
                      const isChildActive = activeChildHref === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-2 px-3 py-1.5 text-[12px] transition-colors ${
                            isChildActive
                              ? "bg-primary/10 text-primary"
                              : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                          }`}
                        >
                          <ItemIcon
                            size={12}
                            className={isChildActive ? "text-[#00c4b6]" : getIconColor(item.label, false)}
                          />
                          <span className="font-medium truncate">{item.label}</span>
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
                    className={`flex items-center gap-2.5 px-3 py-2 text-[12px] transition-colors ${
                      isChildActive
                        ? "bg-primary/10 text-primary"
                        : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                    }`}
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
    </>
  );
}
