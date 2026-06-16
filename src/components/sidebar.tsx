"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useMemo, useState, useEffect } from "react";
import type { Caps } from "@/lib/rbac";
import { getActiveItemHref, getVisibleSections, matchesPath } from "@/lib/navigation";
import { Sun, Moon, LogOut, ChevronDown, ChevronRight } from "lucide-react";

type ThemeMode = "light" | "dark";

function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
  root.style.colorScheme = theme;
  window.localStorage.setItem("theme", theme);
}

function detectTheme(): ThemeMode {
  if (typeof document === "undefined") {
    return "light";
  }

  const root = document.documentElement;
  if (root.classList.contains("dark")) {
    return "dark";
  }

  if (root.classList.contains("light")) {
    return "light";
  }

  return "light";
}

function getIconColor(label: string, isActive: boolean) {
  if (isActive) return "text-[#00c4b6]";
  
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes("dashboard")) return "text-[#00c4b6]";
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

function BrandLogo() {
  return (
    <div className="flex w-full items-center justify-start px-6 py-5 select-none">
      <Image
        src="/Logo.png"
        alt="Adarsh Shipping & Services"
        width={160}
        height={48}
        className="h-auto w-full max-w-[160px] object-contain"
      />
    </div>
  );
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
  const [theme, setTheme] = useState<ThemeMode>(detectTheme);

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
    if (!group || crmExpandedGroups[group]) {
      return crmExpandedGroups;
    }

    return { ...crmExpandedGroups, [group]: true };
  }, [activeCrmItem, crmExpandedGroups]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setDashboardTheme = (nextTheme: ThemeMode) => {
    applyTheme(nextTheme);
    setTheme(nextTheme);
  };

  const toggleTheme = () => {
    setDashboardTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-57.5 flex-col overflow-hidden border-r border-outline-variant/50 bg-surface text-on-surface shadow-[0_12px_36px_-28px_rgba(15,23,42,0.28)] select-none dark:shadow-[0_18px_42px_-30px_rgba(0,0,0,0.48)]">
      <BrandLogo />

      <div className="flex w-full flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2 scrollbar-none [&::-webkit-scrollbar]:hidden">
        {visibleSections.map((section) => {
          const isActive = section.id === activeSectionId;
          const Icon = section.icon;
          const activeChildHref = getActiveItemHref(pathname, section.items);

          return (
            <div key={section.id} className="space-y-0.5">
              <Link
                href={section.href}
                title={section.label}
                className={`group relative flex w-full items-center rounded-md pl-4 pr-3 py-2 transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                <Icon
                  size={18}
                  className={`shrink-0 transition-transform duration-200 ${
                    isActive
                      ? "scale-105 text-[#00c4b6]"
                      : `${getIconColor(section.label, false)} group-hover:scale-105`
                  }`}
                />
                <span className="ml-3 text-[12px] font-medium tracking-wide">{section.label}</span>
              </Link>

              {isActive && section.id === "crm" ? (
                <div className="ml-2 space-y-2">
                  {CRM_GROUP_ORDER.map((groupTitle) => {
                    const groupItems = section.items.filter(
                      (item) => (CRM_GROUP_MAPPING[item.label] || "Sales") === groupTitle
                    );
                    if (groupItems.length === 0) return null;

                    const isGroupExpanded = !!crmExpandedGroups[groupTitle];
                    const hasActiveChild = groupItems.some((item) => activeChildHref === item.href);

                    return (
                      <div key={groupTitle} className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => toggleCrmGroup(groupTitle)}
                          className={`flex w-full items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                            hasActiveChild ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
                          }`}
                        >
                          <span>{groupTitle}</span>
                          {isGroupExpanded ? (
                            <ChevronDown className="size-3" />
                          ) : (
                            <ChevronRight className="size-3" />
                          )}
                        </button>

                        {isGroupExpanded && (
                          <div className="ml-1 space-y-0.5 pl-1">
                            {groupItems.map((item) => {
                              const ItemIcon = item.icon;
                              const isChildActive = activeChildHref === item.href;

                              return (
                                <Link
                                  key={item.href}
                                  href={item.href}
                                  title={item.label}
                                  className={`group relative flex items-center rounded-md pl-3 pr-2 py-1.5 text-[12px] transition-all duration-200 ${
                                    isChildActive
                                      ? "bg-primary/10 text-primary"
                                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                                  }`}
                                >
                                  <div
                                    className={`absolute left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full transition-all duration-200 ${
                                      isChildActive
                                        ? "bg-[#00c4b6] shadow-[0_0_0_3px_rgba(0,196,182,0.16)]"
                                        : "bg-outline-variant group-hover:bg-outline"
                                    }`}
                                  />
                                  <ItemIcon
                                    size={13}
                                    className={`shrink-0 transition-transform duration-200 ${
                                      isChildActive
                                        ? "text-[#00c4b6]"
                                        : `${getIconColor(item.label, false)} group-hover:scale-105`
                                    }`}
                                  />
                                  <span className="ml-2 pl-1 font-medium tracking-wide truncate">{item.label}</span>
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
                isActive && section.items.length > 0 && (
                  <div className="ml-2 space-y-0.5 pl-1">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isChildActive = activeChildHref === item.href;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          title={item.label}
                          className={`group relative flex items-center rounded-md pl-4 pr-3 py-2 text-[12px] transition-all duration-200 ${
                            isChildActive
                              ? "bg-primary/10 text-primary"
                              : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                          }`}
                        >
                          <div
                            className={`absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full transition-all duration-200 ${
                              isChildActive
                                ? "bg-[#00c4b6] shadow-[0_0_0_3px_rgba(0,196,182,0.16)]"
                                : "bg-outline-variant group-hover:bg-outline"
                            }`}
                          />
                          <ItemIcon
                            size={14}
                            className={`shrink-0 transition-transform duration-200 ${
                              isChildActive ? "text-[#00c4b6]" : `${getIconColor(item.label, false)} group-hover:scale-105`
                            }`}
                          />
                          <span className="ml-3 pl-2 font-medium tracking-wide">{item.label}</span>
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

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-outline-variant/50 bg-surface-container-low px-4 py-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 bg-[#00c4b6] text-white flex items-center justify-center font-bold text-sm rounded-full shrink-0">
            {userName ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "SA"}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate leading-none text-[13px] font-bold text-on-surface">{userName || "Site Admin"}</span>
            <div className="flex">
              <span className="bg-[#fef3c7] text-[#d97706] text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider scale-95 origin-left mt-1">
                Admin
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={toggleTheme}
            className="cursor-pointer rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
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
  );
}
