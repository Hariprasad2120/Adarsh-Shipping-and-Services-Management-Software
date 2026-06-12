"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useMemo, useState } from "react";
import type { Caps } from "@/lib/rbac";
import { getActiveItemHref, getVisibleSections, matchesPath } from "@/lib/navigation";
import { Moon, Sun, LogOut } from "lucide-react";

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

export function Sidebar({ caps, userName }: { caps: Caps; userName: string }) {
  const pathname = usePathname();
  const visibleSections = useMemo(() => getVisibleSections(caps), [caps]);

  const activeSectionId =
    visibleSections.find((section) => matchesPath(pathname, section.href, section.matchPaths))?.id ??
    visibleSections[0]?.id ??
    "dashboard";

  const [theme, setTheme] = useState<"light" | "dark">(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark") ? "dark" : "light"
  );

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    }
    setTheme(nextTheme);
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-hidden border-r border-[#1c212a]/50 bg-[#0f1319] select-none">
      <BrandLogo />

      <div className="flex w-full flex-1 flex-col gap-0.5 overflow-y-auto pl-0 pr-3 py-2">
        {visibleSections.map((section) => {
          const isActive = section.id === activeSectionId;
          const Icon = section.icon;
          const activeChildHref = getActiveItemHref(pathname, section.items);

          return (
            <div key={section.id} className="space-y-0.5">
              <Link
                href={section.href}
                title={section.label}
                className={`group relative flex w-full items-center rounded-r-md rounded-l-none pl-6 pr-4 py-2.5 transition-all duration-200 ${
                  isActive
                    ? "bg-[#161f28] text-[#00c4b6]"
                    : "text-[#848d97] hover:bg-[#161f28]/40 hover:text-[#c9d1d9]"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-[4px] rounded-r bg-[#00c4b6]" />
                )}

                <Icon
                  size={18}
                  className={`shrink-0 transition-transform duration-200 ${
                    isActive
                      ? "scale-105 text-[#00c4b6]"
                      : `${getIconColor(section.label, false)} group-hover:scale-105`
                  }`}
                />
                <span className="ml-3 text-[13.5px] font-medium tracking-wide">{section.label}</span>
              </Link>

              {isActive && section.items.length > 0 && (
                <div className="ml-[38px] space-y-0.5 border-l border-[#1f2530] pl-4">
                  {section.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isChildActive = activeChildHref === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        className={`group relative flex items-center rounded-r-md rounded-l-none pl-4 pr-3 py-2 text-[12px] transition-all duration-200 ${
                          isChildActive
                            ? "bg-[#161f28]/60 text-[#00c4b6]"
                            : "text-[#7d8590] hover:bg-[#161f28]/20 hover:text-[#c9d1d9]"
                        }`}
                      >
                        <div
                          className={`absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full transition-all duration-200 ${
                            isChildActive ? "bg-[#00c4b6] shadow-[0_0_0_3px_rgba(0,196,182,0.16)]" : "bg-white/10 group-hover:bg-white/30"
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
              )}
            </div>
          );
        })}
      </div>

      <div className="border-t border-[#1c212a] bg-[#0c0f14] px-4 py-3.5 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 bg-[#00c4b6] text-white flex items-center justify-center font-bold text-sm rounded-full shrink-0">
            {userName ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "SA"}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-bold text-white truncate leading-none">{userName || "Site Admin"}</span>
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
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800/20 transition-colors cursor-pointer"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800/20 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
