"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCaps } from "@/lib/caps-context";
import { toast } from "sonner";
import {
  LayoutDashboard,
  UserCheck,
  Users,
  Building2,
  Landmark,
  TrendingUp,
  Folder,
  Megaphone,
  CheckSquare,
  Calendar,
  Phone,
  Package,
  BookOpen,
  FileText,
  FileDigit,
  ClipboardList,
  Receipt,
  Truck,
  LifeBuoy,
  HelpCircle,
  Inbox,
  Share2,
  MapPin,
  ConciergeBell,
  FolderKanban,
  HeartHandshake,
  Grid,
  Search,
  Plus,
  Bell,
  Settings,
  X,
  Sparkles
} from "lucide-react";
import { globalCrmSearchAction } from "@/modules/crm/actions";

const CRM_GROUPS = [
  {
    title: "Sales",
    items: [
      { label: "Dashboard", href: "/crm/dashboard", icon: LayoutDashboard, permission: "crm.access" },
      { label: "Leads", href: "/crm/leads", icon: UserCheck, permission: "crm.lead.read" },
      { label: "Contacts", href: "/crm/contacts", icon: Users, permission: "crm.contact.manage" },
      { label: "Accounts", href: "/crm/accounts", icon: Building2, permission: "crm.account.manage" },
      { label: "Deals", href: "/crm/deals", icon: Landmark, permission: "crm.deal.manage" },
      { label: "Forecasts", href: "/crm/forecasts", icon: TrendingUp, permission: "crm.deal.manage" },
      { label: "Documents", href: "/crm/documents", icon: Folder, permission: "crm.access" },
      { label: "Campaigns", href: "/crm/campaigns", icon: Megaphone, permission: "crm.access" },
    ],
  },
  {
    title: "Activities",
    items: [
      { label: "Tasks", href: "/crm/tasks", icon: CheckSquare, permission: "crm.activity.manage" },
      { label: "Events", href: "/crm/events", icon: Calendar, permission: "crm.activity.manage" },
      { label: "Calls", href: "/crm/calls", icon: Phone, permission: "crm.activity.manage" },
    ],
  },
  {
    title: "Inventory",
    items: [
      { label: "Products", href: "/crm/products", icon: Package, permission: "crm.access" },
      { label: "Price Books", href: "/crm/price-books", icon: BookOpen, permission: "crm.access" },
      { label: "Quotes", href: "/crm/quotes", icon: FileText, permission: "crm.invoice.manage" },
      { label: "Sales Orders", href: "/crm/sales-orders", icon: FileDigit, permission: "crm.invoice.manage" },
      { label: "Purchase Orders", href: "/crm/purchase-orders", icon: ClipboardList, permission: "crm.invoice.manage" },
      { label: "Invoices", href: "/crm/invoices", icon: Receipt, permission: "crm.invoice.manage" },
      { label: "Vendors", href: "/crm/vendors", icon: Truck, permission: "crm.vendor.manage" },
    ],
  },
  {
    title: "Support",
    items: [
      { label: "Cases / Tickets", href: "/crm/tickets", icon: LifeBuoy, permission: "crm.access" },
      { label: "Solutions", href: "/crm/solutions", icon: HelpCircle, permission: "crm.access" },
    ],
  },
  {
    title: "Integrations",
    items: [
      { label: "Sales Inbox", href: "/crm/sales-inbox", icon: Inbox, permission: "crm.access" },
      { label: "Social", href: "/crm/social", icon: Share2, permission: "crm.access" },
      { label: "Visits", href: "/crm/visits", icon: MapPin, permission: "crm.access" },
    ],
  },
  {
    title: "Services & Projects",
    items: [
      { label: "Services", href: "/crm/services", icon: ConciergeBell, permission: "crm.access" },
      { label: "Projects", href: "/crm/projects", icon: FolderKanban, permission: "crm.project.manage" },
      { label: "Feedback (VoC)", href: "/crm/voc", icon: HeartHandshake, permission: "crm.access" },
    ],
  },
];

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const caps = useCaps();

  // Top bar search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Dropdown states
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [showAppLauncher, setShowAppLauncher] = useState(false);

  useEffect(() => {
    // Handle clicks outside of search/popovers
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search logic for global search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      const res = await globalCrmSearchAction(searchQuery);
      setIsSearching(false);
      if (res.ok) {
        setSearchResults(res.data || []);
        setShowSearchDropdown(true);
      } else {
        toast.error(res.error);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Dynamic Page Title
  const activeModuleTitle = useMemo(() => {
    for (const group of CRM_GROUPS) {
      for (const item of group.items) {
        if (pathname.startsWith(item.href)) {
          return item.label;
        }
      }
    }
    return "CRM Workspace";
  }, [pathname]);

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#0c0f14] text-slate-200">
      {/* ─── TOP UTILITY BAR ────────────────────────────────────────── */}
      <header className="h-14 border-b border-[#1c212a]/50 bg-[#0f1319] flex items-center justify-between px-6 shrink-0 z-20">
        
        {/* Left Area: Module Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAppLauncher(!showAppLauncher)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded transition-all cursor-pointer"
            title="App Launcher"
          >
            <Grid className="size-4.5" />
          </button>
          <h1 className="text-base font-bold text-white tracking-wide">{activeModuleTitle}</h1>
        </div>

        {/* Middle Area: Global Search */}
        <div ref={searchContainerRef} className="relative w-full max-w-md mx-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-500" />
            <input
              type="text"
              placeholder="Global CRM search (Leads, Deals, Accounts, Cases)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowSearchDropdown(true);
              }}
              className="w-full pl-9 pr-8 py-1.5 bg-[#0a0d12] border border-[#1c212a] rounded-md text-[13px] placeholder-slate-500 focus:outline-none focus:border-[#00c4b6]/80 text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Global Search Results Dropdown */}
          {showSearchDropdown && (
            <div className="absolute top-11 left-0 right-0 bg-[#0f1319] border border-[#1c212a] rounded-lg shadow-2xl overflow-hidden max-h-96 overflow-y-auto z-50">
              <div className="p-2 bg-[#0c0f14] border-b border-[#1c212a]/50 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Search Results</span>
                {isSearching && <span className="text-[10px] text-[#00c4b6]">Searching...</span>}
              </div>
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">No results match your query</div>
              ) : (
                <div className="divide-y divide-[#1c212a]/30">
                  {searchResults.map((item: any) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => {
                        router.push(item.href);
                        setShowSearchDropdown(false);
                        setSearchQuery("");
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#161f28] text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex-1 pr-4">
                        <span className="font-semibold text-sm text-white block truncate">{item.title}</span>
                        <span className="text-xs text-slate-400 block truncate">{item.subtitle}</span>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-800 text-slate-300 rounded uppercase tracking-wide shrink-0">
                        {item.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Area: Utility Shortcuts */}
        <div className="flex items-center gap-3.5">
          {/* Quick Create Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowQuickCreate(!showQuickCreate)}
              className="flex items-center gap-1 bg-[#00c4b6] hover:bg-[#00b0a3] text-white px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-sm shadow-[#00c4b6]/10 cursor-pointer"
            >
              <Plus className="size-3.5 shrink-0" />
              <span>QUICK CREATE</span>
            </button>
            {showQuickCreate && (
              <div className="absolute right-0 top-9 w-56 bg-[#0f1319] border border-[#1c212a] rounded-lg shadow-2xl py-1.5 overflow-hidden z-50">
                <div className="px-3 py-1 bg-[#0c0f14] border-b border-[#1c212a]/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Create New Record
                </div>
                <Link
                  href="/crm/leads/new"
                  onClick={() => setShowQuickCreate(false)}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-[#161f28] text-sm text-slate-200 transition-colors"
                >
                  <UserCheck className="size-4 text-[#818cf8]" />
                  <span>Lead</span>
                </Link>
                <Link
                  href="/crm/contacts"
                  onClick={() => setShowQuickCreate(false)}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-[#161f28] text-sm text-slate-200 transition-colors"
                >
                  <Users className="size-4 text-[#fbbf24]" />
                  <span>Contact</span>
                </Link>
                <Link
                  href="/crm/accounts"
                  onClick={() => setShowQuickCreate(false)}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-[#161f28] text-sm text-slate-200 transition-colors"
                >
                  <Building2 className="size-4 text-[#38bdf8]" />
                  <span>Account</span>
                </Link>
                <Link
                  href="/crm/deals"
                  onClick={() => setShowQuickCreate(false)}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-[#161f28] text-sm text-slate-200 transition-colors"
                >
                  <Landmark className="size-4 text-[#34d399]" />
                  <span>Deal / Opportunity</span>
                </Link>
                <Link
                  href="/crm/invoices"
                  onClick={() => setShowQuickCreate(false)}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-[#161f28] text-sm text-slate-200 transition-colors"
                >
                  <FileText className="size-4 text-[#fb923c]" />
                  <span>Quote / Invoice</span>
                </Link>
                <Link
                  href="/crm/tickets"
                  onClick={() => setShowQuickCreate(false)}
                  className="flex items-center gap-2 px-4 py-2 hover:bg-[#161f28] text-sm text-slate-200 transition-colors"
                >
                  <LifeBuoy className="size-4 text-[#f472b6]" />
                  <span>Support Ticket</span>
                </Link>
              </div>
            )}
          </div>

          {/* Signals / Notifications */}
          <button
            onClick={() => router.push("/notifications")}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-full transition-all cursor-pointer relative"
            title="CRM Signals"
          >
            <Bell className="size-4.5" />
            <span className="absolute top-1 right-1 size-2 bg-[#d97706] rounded-full ring-2 ring-[#0f1319]" />
          </button>

          {/* Calendar Shortcut */}
          <button
            onClick={() => router.push("/attendance/punch")}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-full transition-all cursor-pointer"
            title="Calendar & Scheduling"
          >
            <Calendar className="size-4.5" />
          </button>

          {/* Settings Setup */}
          <button
            onClick={() => router.push("/admin/settings")}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-full transition-all cursor-pointer"
            title="CRM Setup & Picklists"
          >
            <Settings className="size-4.5" />
          </button>
        </div>
      </header>

      {/* ─── APP LAUNCHER MODAL / POPUP ─── */}
      {showAppLauncher && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0f1319] border border-[#1c212a] rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#1c212a]/50 bg-[#0c0f14]">
              <span className="font-bold text-sm text-white uppercase tracking-wider">Monolith Engine App Launcher</span>
              <button
                onClick={() => setShowAppLauncher(false)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-3 gap-4">
              <Link
                href="/dashboard"
                onClick={() => setShowAppLauncher(false)}
                className="flex flex-col items-center text-center p-4 rounded-lg bg-[#161f28]/30 hover:bg-[#161f28]/80 border border-[#1c212a]/30 transition-all gap-2"
              >
                <div className="p-3 bg-[#00c4b6]/10 text-[#00c4b6] rounded-xl"><LayoutDashboard className="size-6" /></div>
                <span className="font-semibold text-sm text-white">Dashboard</span>
              </Link>
              <Link
                href="/hrms/employees"
                onClick={() => setShowAppLauncher(false)}
                className="flex flex-col items-center text-center p-4 rounded-lg bg-[#161f28]/30 hover:bg-[#161f28]/80 border border-[#1c212a]/30 transition-all gap-2"
              >
                <div className="p-3 bg-[#818cf8]/10 text-[#818cf8] rounded-xl"><Users className="size-6" /></div>
                <span className="font-semibold text-sm text-white">HRMS</span>
              </Link>
              <Link
                href="/attendance/punch"
                onClick={() => setShowAppLauncher(false)}
                className="flex flex-col items-center text-center p-4 rounded-lg bg-[#161f28]/30 hover:bg-[#161f28]/80 border border-[#1c212a]/30 transition-all gap-2"
              >
                <div className="p-3 bg-[#fbbf24]/10 text-[#fbbf24] rounded-xl"><Calendar className="size-6" /></div>
                <span className="font-semibold text-sm text-white">Attendance</span>
              </Link>
              <Link
                href="/ams/appraisals"
                onClick={() => setShowAppLauncher(false)}
                className="flex flex-col items-center text-center p-4 rounded-lg bg-[#161f28]/30 hover:bg-[#161f28]/80 border border-[#1c212a]/30 transition-all gap-2"
              >
                <div className="p-3 bg-[#c084fc]/10 text-[#c084fc] rounded-xl"><FolderKanban className="size-6" /></div>
                <span className="font-semibold text-sm text-white">AMS</span>
              </Link>
              <Link
                href="/todo"
                onClick={() => setShowAppLauncher(false)}
                className="flex flex-col items-center text-center p-4 rounded-lg bg-[#161f28]/30 hover:bg-[#161f28]/80 border border-[#1c212a]/30 transition-all gap-2"
              >
                <div className="p-3 bg-[#34d399]/10 text-[#34d399] rounded-xl"><CheckSquare className="size-6" /></div>
                <span className="font-semibold text-sm text-white">Tasks / To-Do</span>
              </Link>
              <Link
                href="/admin/org-structure"
                onClick={() => setShowAppLauncher(false)}
                className="flex flex-col items-center text-center p-4 rounded-lg bg-[#161f28]/30 hover:bg-[#161f28]/80 border border-[#1c212a]/30 transition-all gap-2"
              >
                <div className="p-3 bg-[#f472b6]/10 text-[#f472b6] rounded-xl"><Settings className="size-6" /></div>
                <span className="font-semibold text-sm text-white">System Admin</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── CRM MODULE PAGE CONTENT ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-[#0a0d12]">
        {children}
      </div>
    </div>
  );
}
